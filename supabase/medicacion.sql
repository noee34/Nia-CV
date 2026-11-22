-- =============================================================================
-- Nia CV — medicación y vitaminas (apartado Medicación de la pestaña Medicina)
-- =============================================================================
-- CÓMO USARLO: Supabase → SQL Editor (editor de SQL) → New query (nueva
-- consulta) → pega este archivo DESPUÉS de schema.sql y familia.sql → Run.
-- No borra nada. Mismas reglas que el resto: cada cuenta ve lo suyo y lo de
-- su familia.
--
--   · medicacion        → una fila por medicamento o vitamina (horas de toma,
--                          desde/hasta, pausada)
--   · medicacion_tomas  → una fila por cada toma marcada como "dada"
-- =============================================================================

create table if not exists public.medicacion (
  id             uuid primary key,
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre         text not null check (char_length(nombre) between 1 and 60),
  tipo           text not null check (tipo in ('medicamento', 'vitamina')),
  dosis          text not null default '' check (char_length(dosis) <= 60),
  horas          text[] not null default '{}',                      -- ej. {09:00,21:00}
  desde          date not null,
  hasta          date,                                              -- vacío = sin fecha de fin
  pausada        boolean not null default false,
  observaciones  text not null default '' check (char_length(observaciones) <= 500),
  fecha_hora     bigint not null,
  creado         bigint not null,
  modificado     bigint not null
);
create index if not exists medicacion_usuario on public.medicacion (usuario_id);

create table if not exists public.medicacion_tomas (
  id             uuid primary key,
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medicacion_id  uuid not null,
  toma           text not null check (char_length(toma) <= 120),    -- medicación|día|hora
  fecha_hora     bigint not null,                                   -- hora programada
  dada_a_las     bigint not null,                                   -- cuándo se marcó como dada
  dada_por       text not null default '' check (char_length(dada_por) <= 80),
  creado         bigint not null,
  modificado     bigint not null
);
create index if not exists medicacion_tomas_usuario_fecha on public.medicacion_tomas (usuario_id, fecha_hora);

alter table public.medicacion       enable row level security;
alter table public.medicacion_tomas enable row level security;

create policy "solo su medicacion" on public.medicacion for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy "su familia: medicacion" on public.medicacion for all to authenticated
  using (usuario_id = (select privado.mi_familia())) with check (usuario_id = (select privado.mi_familia()));

create policy "solo sus tomas" on public.medicacion_tomas for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy "su familia: tomas" on public.medicacion_tomas for all to authenticated
  using (usuario_id = (select privado.mi_familia())) with check (usuario_id = (select privado.mi_familia()));

alter publication supabase_realtime add table public.medicacion, public.medicacion_tomas;
