-- =============================================================================
-- Nia CV — comidas sólidas (pestaña Comidas → Sólidos)
-- =============================================================================
-- CÓMO USARLO: Supabase → SQL Editor (editor de SQL) → New query (nueva
-- consulta) → pega este archivo DESPUÉS de schema.sql y familia.sql → Run.
-- No borra nada. Mismas reglas que el resto: cada cuenta ve lo suyo y lo de
-- su familia. Una fila por comida: qué comió, cuánto, si le gustó y cómo le sentó.
-- =============================================================================

create table if not exists public.solidos (
  id             uuid primary key,
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha_hora     bigint not null,                                    -- momento de la comida (ms desde 1970)
  alimento       text not null check (char_length(alimento) between 1 and 60),
  primera_vez    boolean not null default false,
  textura        text not null default '' check (textura in ('', 'pure', 'triturado', 'chafado', 'trozos')),
  cantidad       text not null check (cantidad in ('nada', 'poco', 'mitad', 'casi', 'todo')),
  le_gusto       text not null default '' check (le_gusto in ('', 'encanto', 'gusto', 'regular', 'no')),
  tolerancia     text not null check (tolerancia in ('bien', 'regular', 'mal')),
  sintomas       text[] not null default '{}',                       -- gases, vómito, ronchas…
  observaciones  text not null default '' check (char_length(observaciones) <= 500),
  creado         bigint not null,
  modificado     bigint not null
);
create index if not exists solidos_usuario_fecha on public.solidos (usuario_id, fecha_hora);

alter table public.solidos enable row level security;

create policy "solo sus solidos" on public.solidos for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy "su familia: solidos" on public.solidos for all to authenticated
  using (usuario_id = (select privado.mi_familia())) with check (usuario_id = (select privado.mi_familia()));

alter publication supabase_realtime add table public.solidos;
