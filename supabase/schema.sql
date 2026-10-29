-- Nia CV — esquema de base de datos para Supabase
-- Cómo usarlo: supabase.com → tu proyecto → SQL Editor → New query →
-- pega TODO este archivo → Run. Se puede ejecutar más de una vez sin problema.
--
-- Seguridad: Row Level Security (RLS) activado en todas las tablas. Cada
-- usuario solo puede leer, crear, modificar y borrar SUS filas
-- (user_id = auth.uid()). La clave pública "anon" de la web no permite nada más.

-- Biberones -------------------------------------------------------------------
create table if not exists public.bottles (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at          bigint not null,                       -- instante de la toma (ms desde 1970, UTC)
  prepared    integer not null check (prepared > 0 and prepared <= 1000),
  taken       integer not null check (taken >= 0 and taken <= 1000),
  notes       text not null default '' check (char_length(notes) <= 500),
  created_at  bigint not null,
  updated_at  bigint not null,
  constraint taken_not_above_prepared check (taken <= prepared)
);
create index if not exists bottles_user_at on public.bottles (user_id, at);

-- Deposiciones ----------------------------------------------------------------
create table if not exists public.poops (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at          bigint not null,
  consistency text not null check (consistency in ('liquida', 'blanda', 'normal', 'dura')),
  notes       text not null default '' check (char_length(notes) <= 500),
  created_at  bigint not null,
  updated_at  bigint not null
);
create index if not exists poops_user_at on public.poops (user_id, at);

-- Ajustes (nombre del bebé, cantidades rápidas…) -------------------------------
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  value   jsonb not null default '{}'::jsonb
);

-- Reglas de acceso: cada cuenta solo ve y toca lo suyo --------------------------
alter table public.bottles  enable row level security;
alter table public.poops    enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own bottles"  on public.bottles;
drop policy if exists "own poops"    on public.poops;
drop policy if exists "own settings" on public.settings;

create policy "own bottles" on public.bottles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own poops" on public.poops
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Cambios en vivo entre dispositivos (Realtime) -------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bottles') then
    alter publication supabase_realtime add table public.bottles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'poops') then
    alter publication supabase_realtime add table public.poops;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'settings') then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;
