-- =============================================================================
-- Nia CV — estructura de la base de datos en Supabase
-- =============================================================================
--
-- CÓMO USARLO
--   1. Entra en supabase.com y abre tu proyecto.
--   2. Menú de la izquierda → "SQL Editor" (editor de SQL) → "New query" (nueva consulta).
--   3. Copia TODO este archivo, pégalo y pulsa "Run" (ejecutar).
--   4. Debe aparecer "Success. No rows returned" (correcto, sin filas que mostrar).
--   Puedes ejecutarlo más de una vez sin problema: no borra nada.
--
-- QUÉ CREA
--   · biberones     → una fila por cada toma
--   · deposiciones  → una fila por cada caca
--   · ajustes       → una fila por cuenta (nombre del bebé, cantidades rápidas…)
--
-- SEGURIDAD
--   Se activa la "seguridad por filas" (Row Level Security). Cada cuenta solo
--   puede leer, crear, cambiar y borrar SUS propias filas. La clave pública de
--   la web no permite nada más que eso.
--
-- Nota: las palabras en inglés que quedan (create table, integer, check…) son
-- el propio lenguaje SQL y no se pueden traducir.
-- =============================================================================


-- Biberones -------------------------------------------------------------------
create table if not exists public.biberones (
  id             uuid primary key,                       -- identificador único del registro
  usuario_id     uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,  -- cuenta a la que pertenece
  fecha_hora     bigint not null,                        -- momento de la toma (milisegundos desde 1970)
  preparado_ml   integer not null check (preparado_ml > 0 and preparado_ml <= 1000),
  tomado_ml      integer not null check (tomado_ml >= 0 and tomado_ml <= 1000),
  observaciones  text not null default '' check (char_length(observaciones) <= 500),
  creado         bigint not null,                        -- cuándo se creó el registro
  modificado     bigint not null,                        -- última modificación
  constraint tomado_no_supera_preparado check (tomado_ml <= preparado_ml)
);
create index if not exists biberones_usuario_fecha on public.biberones (usuario_id, fecha_hora);


-- Deposiciones ----------------------------------------------------------------
create table if not exists public.deposiciones (
  id             uuid primary key,
  usuario_id     uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  fecha_hora     bigint not null,
  consistencia   text not null check (consistencia in ('liquida', 'blanda', 'normal', 'dura')),
  observaciones  text not null default '' check (char_length(observaciones) <= 500),
  creado         bigint not null,
  modificado     bigint not null
);
create index if not exists deposiciones_usuario_fecha on public.deposiciones (usuario_id, fecha_hora);


-- Ajustes (nombre del bebé, cantidades rápidas…) -------------------------------
create table if not exists public.ajustes (
  usuario_id  uuid primary key default auth.uid()
              references auth.users (id) on delete cascade,
  valor       jsonb not null default '{}'::jsonb
);


-- Reglas de acceso: cada cuenta solo ve y toca lo suyo --------------------------
alter table public.biberones    enable row level security;
alter table public.deposiciones enable row level security;
alter table public.ajustes      enable row level security;

drop policy if exists "solo sus biberones"    on public.biberones;
drop policy if exists "solo sus deposiciones" on public.deposiciones;
drop policy if exists "solo sus ajustes"      on public.ajustes;

create policy "solo sus biberones" on public.biberones
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "solo sus deposiciones" on public.deposiciones
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "solo sus ajustes" on public.ajustes
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));


-- Cambios en vivo entre dispositivos (lo que se apunta en el móvil aparece en
-- la tablet sin recargar) -------------------------------------------------------
do $$
declare
  tabla text;
begin
  foreach tabla in array array['biberones', 'deposiciones', 'ajustes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tabla
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tabla);
    end if;
  end loop;
end $$;
