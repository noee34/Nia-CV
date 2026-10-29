-- =============================================================================
-- Nia CV — citas médicas (pestaña Medicina)
-- =============================================================================
-- CÓMO USARLO: Supabase → SQL Editor (editor de SQL) → New query (nueva
-- consulta) → pega este archivo DESPUÉS de schema.sql y familia.sql → Run.
--
-- Una fila por cita: vacuna, pediatra, revisión o receta (sección Médico) y
-- citas con la especialista (sección Especialista). "avisos" guarda los minutos
-- de antelación de cada aviso (por ejemplo {1440, 60} = 1 día y 1 hora antes).
-- Mismas reglas que el resto: cada cuenta ve sus citas y las de su familia.
-- =============================================================================

create table if not exists public.citas (
  id             uuid primary key,
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha_hora     bigint not null,                                   -- momento de la cita (ms desde 1970)
  seccion        text not null check (seccion in ('medico', 'especialista')),
  tipo           text not null check (tipo in ('vacuna', 'pediatra', 'revision', 'receta', 'especialista')),
  titulo         text not null default '' check (char_length(titulo) <= 80),
  profesional    text not null default '' check (char_length(profesional) <= 80),
  lugar          text not null default '' check (char_length(lugar) <= 120),
  observaciones  text not null default '' check (char_length(observaciones) <= 500),
  avisos         integer[] not null default '{}',                   -- minutos antes de la cita
  hecha          boolean not null default false,
  creado         bigint not null,
  modificado     bigint not null
);
create index if not exists citas_usuario_fecha on public.citas (usuario_id, fecha_hora);

alter table public.citas enable row level security;

create policy "solo sus citas" on public.citas for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "su familia: citas" on public.citas for all to authenticated
  using (usuario_id = (select privado.mi_familia()))
  with check (usuario_id = (select privado.mi_familia()));

alter publication supabase_realtime add table public.citas;
