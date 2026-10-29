// Conexión con Supabase (base de datos Postgres + usuarios con contraseña).
// Las reglas de seguridad (Row Level Security, ver supabase/schema.sql) hacen
// que cada cuenta solo pueda leer y escribir sus propias filas.

const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por petición
const CHUNK = 500;

const MAP = {
  bottles: {
    to: (r) => ({ id: r.id, at: r.at, prepared: r.prepared, taken: r.taken, notes: r.notes || '', created_at: r.createdAt, updated_at: r.updatedAt }),
    from: (x) => ({ id: x.id, at: Number(x.at), prepared: x.prepared, taken: x.taken, notes: x.notes || '', createdAt: Number(x.created_at), updatedAt: Number(x.updated_at) }),
  },
  poops: {
    to: (r) => ({ id: r.id, at: r.at, consistency: r.consistency, notes: r.notes || '', created_at: r.createdAt, updated_at: r.updatedAt }),
    from: (x) => ({ id: x.id, at: Number(x.at), consistency: x.consistency, notes: x.notes || '', createdAt: Number(x.created_at), updatedAt: Number(x.updated_at) }),
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
      const rows = check(await this.client.from(type).select('*').order('at', { ascending: true }).order('id').range(from, from + PAGE - 1));
      out.push(...rows.map(MAP[type].from));
      if (rows.length < PAGE) return out;
    }
  }

  async upsert(type, recs) {
    for (let i = 0; i < recs.length; i += CHUNK) {
      const rows = recs.slice(i, i + CHUNK).map((r) => ({ ...MAP[type].to(r), user_id: this.userId }));
      check(await this.client.from(type).upsert(rows));
    }
  }

  async remove(type, id) {
    check(await this.client.from(type).delete().eq('id', id));
  }

  async clear(type) {
    check(await this.client.from(type).delete().eq('user_id', this.userId));
  }

  async getSettings() {
    const row = check(await this.client.from('settings').select('value').eq('user_id', this.userId).maybeSingle());
    return row?.value ?? null;
  }

  async setSettings(value) {
    check(await this.client.from('settings').upsert({ user_id: this.userId, value }));
  }

  /** Avisa cuando cambia algo desde otro dispositivo (Supabase Realtime). */
  onChange(cb) {
    const filter = `user_id=eq.${this.userId}`;
    const ch = this.client.channel(`nia-${this.userId}`);
    for (const table of ['bottles', 'poops', 'settings']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, cb);
    }
    ch.subscribe();
    return () => this.client.removeChannel(ch);
  }
}
