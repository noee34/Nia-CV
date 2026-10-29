-- =============================================================================
-- Nia CV — diario compartido en familia
-- =============================================================================
--
-- QUÉ HACE
--   La persona que creó el diario (la "propietaria") puede invitar a su pareja
--   con un código de 6 letras válido 48 horas. Su pareja entra con SU PROPIA
--   cuenta (su correo y su contraseña) y ve y registra en el mismo diario.
--
-- CÓMO USARLO
--   Supabase → SQL Editor (editor de SQL) → New query (nueva consulta) →
--   pega este archivo DESPUÉS de schema.sql → Run (ejecutar).
--
-- DISEÑO SIN BORRADOS
--   Nada de este archivo borra datos ni reglas:
--   · Se mantienen las reglas "solo sus filas" de schema.sql y se AÑADEN las de
--     familia. Las reglas de Supabase se suman, así que cada cuenta ve sus
--     filas y, si pertenece a una familia, las del diario de esa familia.
--   · Quitar a alguien o salir de la familia marca su fila como inactiva
--     (activo = false): pierde el acceso al momento y queda constancia.
--   · Las invitaciones antiguas se caducan en lugar de borrarse.
--
-- SEGURIDAD
--   · Las tablas de familia e invitaciones no se pueden leer ni escribir
--     directamente: solo a través de las funciones de abajo, que comprueban
--     quién llama.
--   · La función auxiliar vive en el esquema "privado", que no se publica en la API.
-- =============================================================================


-- Miembros de cada familia ------------------------------------------------------
create table if not exists public.familia_miembros (
  miembro      uuid primary key references auth.users (id) on delete cascade,  -- la pareja invitada
  propietario  uuid not null references auth.users (id) on delete cascade,     -- quien creó el diario
  activo       boolean not null default true,                                   -- false = ya no comparte
  creado       timestamptz not null default now(),
  constraint no_a_si_mismo check (miembro <> propietario)
);
alter table public.familia_miembros enable row level security;

-- Invitaciones (códigos de 6 letras, válidos 48 horas, de un solo uso) -----------
create table if not exists public.invitaciones (
  codigo       text primary key,
  propietario  uuid not null references auth.users (id) on delete cascade,
  caduca       timestamptz not null,
  usada_por    uuid references auth.users (id) on delete set null,
  creado       timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
-- Sin reglas de acceso directo: solo se usan desde las funciones de abajo.


-- Función auxiliar (no expuesta en la API) ---------------------------------------
create schema if not exists privado;
grant usage on schema privado to authenticated;

-- Diario que ve quien llama: el de su familia si es miembro activo; si no, el suyo.
create or replace function privado.mi_familia()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select m.propietario from public.familia_miembros m where m.miembro = auth.uid() and m.activo),
    auth.uid()
  );
$$;
revoke all on function privado.mi_familia() from public, anon;
grant execute on function privado.mi_familia() to authenticated;


-- Reglas de familia (se suman a las de "solo sus filas" de schema.sql) ------------
create policy "su familia: biberones" on public.biberones for all to authenticated
  using (usuario_id = (select privado.mi_familia()))
  with check (usuario_id = (select privado.mi_familia()));

create policy "su familia: deposiciones" on public.deposiciones for all to authenticated
  using (usuario_id = (select privado.mi_familia()))
  with check (usuario_id = (select privado.mi_familia()));

create policy "su familia: ajustes" on public.ajustes for all to authenticated
  using (usuario_id = (select privado.mi_familia()))
  with check (usuario_id = (select privado.mi_familia()));

create policy "su familia: album" on public.album for all to authenticated
  using (usuario_id = (select privado.mi_familia()))
  with check (usuario_id = (select privado.mi_familia()));


-- Funciones que usa la app ----------------------------------------------------------

-- Información de la familia de quien llama: propietaria y miembros activos (con su correo).
create or replace function public.mi_familia_info()
returns json
language sql stable security definer set search_path = ''
as $$
  with f as (select privado.mi_familia() as dueno)
  select json_build_object(
    'propietario', f.dueno,
    'propietario_correo', (select u.email from auth.users u where u.id = f.dueno),
    'miembros', coalesce((
      select json_agg(json_build_object('id', m.miembro, 'correo', u.email) order by m.creado)
      from public.familia_miembros m join auth.users u on u.id = m.miembro
      where m.propietario = f.dueno and m.activo), '[]'::json)
  )
  from f
  where auth.uid() is not null;
$$;

-- Crea un código de invitación (solo la propietaria del diario).
create or replace function public.crear_invitacion()
returns json
language plpgsql volatile security definer set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- sin 0/O ni 1/I/L para no confundirse
  azar bytea;
  c text;
  hasta timestamptz := now() + interval '48 hours';
begin
  if yo is null then raise exception 'Hace falta iniciar sesión.'; end if;
  if exists (select 1 from public.familia_miembros where miembro = yo and activo) then
    raise exception 'Solo la persona que creó el diario puede invitar.';
  end if;
  -- Un código nuevo deja sin efecto los anteriores que no se usaron.
  update public.invitaciones set caduca = now()
    where propietario = yo and usada_por is null and caduca > now();
  loop
    azar := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    c := '';
    for i in 0..5 loop
      c := c || substr(letras, 1 + (get_byte(azar, i) % length(letras)), 1);
    end loop;
    exit when not exists (select 1 from public.invitaciones where codigo = c);
  end loop;
  insert into public.invitaciones (codigo, propietario, caduca) values (c, yo, hasta);
  return json_build_object('codigo', c, 'caduca', hasta);
end $$;

-- Unirse al diario de otra persona con su código.
create or replace function public.unirse_a_familia(p_codigo text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  inv public.invitaciones;
begin
  if yo is null then raise exception 'Hace falta iniciar sesión.'; end if;
  select * into inv from public.invitaciones where codigo = upper(trim(p_codigo)) for update;
  if not found or inv.usada_por is not null or inv.caduca < now() then
    raise exception 'El código no es válido o ha caducado. Pide uno nuevo.';
  end if;
  if inv.propietario = yo then
    raise exception 'Ese código es tuyo: compártelo con tu pareja.';
  end if;
  if exists (select 1 from public.familia_miembros where propietario = yo and activo) then
    raise exception 'Tu cuenta ya comparte su propio diario con otra persona.';
  end if;
  insert into public.familia_miembros (miembro, propietario, activo) values (yo, inv.propietario, true)
    on conflict (miembro) do update set propietario = excluded.propietario, activo = true, creado = now();
  update public.invitaciones set usada_por = yo where codigo = inv.codigo;
  return inv.propietario;
end $$;

-- Dejar de compartir (la pareja sale del diario).
create or replace function public.salir_de_familia()
returns void
language sql volatile security definer set search_path = ''
as $$
  update public.familia_miembros set activo = false where miembro = auth.uid();
$$;

-- Quitar a alguien del diario (solo la propietaria).
create or replace function public.quitar_de_familia(p_miembro uuid)
returns void
language sql volatile security definer set search_path = ''
as $$
  update public.familia_miembros set activo = false
    where miembro = p_miembro and propietario = auth.uid();
$$;

revoke all on function public.mi_familia_info() from public, anon;
revoke all on function public.crear_invitacion() from public, anon;
revoke all on function public.unirse_a_familia(text) from public, anon;
revoke all on function public.salir_de_familia() from public, anon;
revoke all on function public.quitar_de_familia(uuid) from public, anon;
grant execute on function public.mi_familia_info() to authenticated;
grant execute on function public.crear_invitacion() to authenticated;
grant execute on function public.unirse_a_familia(text) to authenticated;
grant execute on function public.salir_de_familia() to authenticated;
grant execute on function public.quitar_de_familia(uuid) to authenticated;
