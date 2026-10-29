// Conexión con Supabase (base de datos Postgres + usuarios con contraseña).
// Las reglas de seguridad (Row Level Security, ver supabase/schema.sql) hacen
// que cada cuenta solo pueda leer y escribir sus propias filas.
//
// En la base de datos todo tiene nombres en castellano (tablas `biberones`,
// `deposiciones`, `ajustes`); aquí se traducen a los nombres que usa la app.

const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por petición
const CHUNK = 500;

/** Tabla de Supabase para cada tipo de registro de la app. */
export const TABLE = { bottles: 'biberones', poops: 'deposiciones', album: 'album' };

const MAP = {
  album: {
    to: (r) => ({ id: r.id, mes: r.month, foto: r.photo || '', nota: r.notes || '', fecha_hora: r.at, creado: r.createdAt, modificado: r.updatedAt }),
    from: (x) => ({ id: x.id, month: x.mes, photo: x.foto || '', notes: x.nota || '', at: Number(x.fecha_hora), createdAt: Number(x.creado), updatedAt: Number(x.modificado) }),
  },
  bottles: {
    to: (r) => ({ id: r.id, fecha_hora: r.at, preparado_ml: r.prepared, tomado_ml: r.taken, observaciones: r.notes || '', creado: r.createdAt, modificado: r.updatedAt }),
    from: (x) => ({ id: x.id, at: Number(x.fecha_hora), prepared: x.preparado_ml, taken: x.tomado_ml, notes: x.observaciones || '', createdAt: Number(x.creado), updatedAt: Number(x.modificado) }),
  },
  poops: {
    to: (r) => ({ id: r.id, fecha_hora: r.at, consistencia: r.consistency, observaciones: r.notes || '', creado: r.createdAt, modificado: r.updatedAt }),
    from: (x) => ({ id: x.id, at: Number(x.fecha_hora), consistency: x.consistencia, notes: x.observaciones || '', createdAt: Number(x.creado), updatedAt: Number(x.modificado) }),
  },
};

const check = ({ data, error }) => {
  if (error) throw new Error(error.message || 'Error de Supabase');
  return data;
};

export class SupabaseRemote {
  constructor(client, userId) {
    this.client = client;
    this.userId = userId;
  }

  async fetchAll(type) {
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const rows = check(await this.client.from(TABLE[type]).select('*')
        .order('fecha_hora', { ascending: true }).order('id').range(from, from + PAGE - 1));
      out.push(...rows.map(MAP[type].from));
      if (rows.length < PAGE) return out;
    }
  }

  async upsert(type, recs) {
    for (let i = 0; i < recs.length; i += CHUNK) {
      const rows = recs.slice(i, i + CHUNK).map((r) => ({ ...MAP[type].to(r), usuario_id: this.userId }));
      check(await this.client.from(TABLE[type]).upsert(rows));
    }
  }

  async remove(type, id) {
    check(await this.client.from(TABLE[type]).delete().eq('id', id));
  }

  async clear(type) {
    check(await this.client.from(TABLE[type]).delete().eq('usuario_id', this.userId));
  }

  async getSettings() {
    const row = check(await this.client.from('ajustes').select('valor').eq('usuario_id', this.userId).maybeSingle());
    return row?.valor ?? null;
  }

  async setSettings(value) {
    check(await this.client.from('ajustes').upsert({ usuario_id: this.userId, valor: value }));
  }

  /** Avisa cuando cambia algo desde otro dispositivo (Supabase Realtime). */
  onChange(cb) {
    const filter = `usuario_id=eq.${this.userId}`;
    const ch = this.client.channel(`nia-${this.userId}`);
    for (const table of ['biberones', 'deposiciones', 'album', 'ajustes']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, cb);
    }
    ch.subscribe();
    return () => this.client.removeChannel(ch);
  }
}
