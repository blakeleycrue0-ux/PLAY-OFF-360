-- ============================================================================
-- PLAYOFF30 — esquema inicial
--
-- Ya aplicada al proyecto. Se conserva tal cual se ejecutó: las migraciones
-- no se reescriben, se corrigen con una nueva (ver 0002).
--
-- Modelo de seguridad: la clave anon es pública, así que TODA la protección
-- vive aquí. Cada tabla tiene RLS activado y solo deja ver y tocar filas del
-- club al que pertenece el usuario autenticado. El rol anon no accede a nada.
-- ============================================================================

-- gen_random_uuid() viene en el núcleo de Postgres desde la 13, así que no
-- hace falta instalar pgcrypto ni ensuciar el esquema public con extensiones.

-- ---------------------------------------------------------------- tipos ----
do $$ begin
  create type public.member_role as enum ('owner', 'coach', 'delegate', 'coordinator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.player_position as enum ('PT', 'DF', 'MC', 'DL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability as enum ('yes', 'no', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.call_up_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_kind as enum ('convocatoria', 'aviso', 'cambio', 'recordatorio');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- tablas ----
create table if not exists public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  category    text,
  season      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.member_role not null default 'coach',
  display_name text,
  created_at   timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  full_name     text not null check (char_length(btrim(full_name)) between 2 and 80),
  shirt_number  int check (shirt_number between 1 and 99),
  position      public.player_position,
  birth_date    date,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.guardians (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 80),
  relation    text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.player_guardians (
  player_id   uuid not null references public.players (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  primary key (player_id, guardian_id)
);

create table if not exists public.trainings (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  starts_at   timestamptz not null,
  pitch       text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  opponent     text not null check (char_length(btrim(opponent)) between 2 and 80),
  is_home      boolean not null default true,
  kickoff_at   timestamptz not null,
  venue        text,
  competition  text,
  meeting_at   timestamptz,
  kit          text,
  created_at   timestamptz not null default now()
);

create table if not exists public.training_attendance (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  status      public.availability not null default 'pending',
  note        text,
  updated_at  timestamptz not null default now(),
  unique (training_id, player_id)
);

create table if not exists public.match_availability (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  status      public.availability not null default 'pending',
  note        text,
  updated_at  timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.call_ups (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null unique references public.matches (id) on delete cascade,
  team_id       uuid not null references public.teams (id) on delete cascade,
  status        public.call_up_status not null default 'draft',
  message       text,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.call_up_players (
  call_up_id  uuid not null references public.call_ups (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  primary key (call_up_id, player_id)
);

-- Registro de lo comunicado. El envío real a WhatsApp o email todavía no
-- existe: aquí solo queda constancia de qué se redactó, para quién y cuándo.
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete cascade,
  kind              public.message_kind not null default 'aviso',
  subject           text not null check (char_length(btrim(subject)) between 2 and 140),
  body              text not null,
  audience          text not null default 'Familias',
  recipients_count  int not null default 0,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

-- --------------------------------------------------------------- índices ---
create index if not exists idx_teams_club        on public.teams (club_id);
create index if not exists idx_memberships_user  on public.memberships (user_id);
create index if not exists idx_players_team      on public.players (team_id);
create index if not exists idx_guardians_team    on public.guardians (team_id);
create index if not exists idx_trainings_team    on public.trainings (team_id, starts_at desc);
create index if not exists idx_matches_team      on public.matches (team_id, kickoff_at desc);
create index if not exists idx_tatt_training     on public.training_attendance (training_id);
create index if not exists idx_mavail_match      on public.match_availability (match_id);
create index if not exists idx_messages_team     on public.messages (team_id, created_at desc);

-- -------------------------------------------------------- updated_at ------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_tatt_touch on public.training_attendance;
create trigger trg_tatt_touch before update on public.training_attendance
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_mavail_touch on public.match_availability;
create trigger trg_mavail_touch before update on public.match_availability
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------ helpers de pertenencia ---
-- SECURITY DEFINER a propósito: si estas consultas pasaran por RLS, las
-- políticas que las usan se llamarían a sí mismas y Postgres abortaría por
-- recursión infinita.
create or replace function public.is_club_member(cid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.memberships m
    where m.club_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_member(tid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.teams t
    join public.memberships m on m.club_id = t.club_id
    where t.id = tid and m.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------ onboarding ---
-- Crea club, pertenencia y primer equipo en una sola transacción. Evita el
-- problema del huevo y la gallina: sin pertenencia no se puede escribir nada,
-- pero la pertenencia necesita un club que todavía no existe.
create or replace function public.create_club_with_team(
  p_club_name text,
  p_team_name text,
  p_category  text default null,
  p_season    text default null
) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_club uuid;
  v_team uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión para crear un club';
  end if;

  insert into public.clubs (name, created_by)
  values (btrim(p_club_name), v_uid)
  returning id into v_club;

  insert into public.memberships (club_id, user_id, role)
  values (v_club, v_uid, 'owner');

  insert into public.teams (club_id, name, category, season)
  values (v_club, btrim(p_team_name), nullif(btrim(coalesce(p_category, '')), ''), nullif(btrim(coalesce(p_season, '')), ''))
  returning id into v_team;

  return json_build_object('club_id', v_club, 'team_id', v_team);
end $$;

-- ------------------------------------------------------------------ RLS ---
alter table public.clubs               enable row level security;
alter table public.teams               enable row level security;
alter table public.memberships         enable row level security;
alter table public.players             enable row level security;
alter table public.guardians           enable row level security;
alter table public.player_guardians    enable row level security;
alter table public.trainings           enable row level security;
alter table public.matches             enable row level security;
alter table public.training_attendance enable row level security;
alter table public.match_availability  enable row level security;
alter table public.call_ups            enable row level security;
alter table public.call_up_players     enable row level security;
alter table public.messages            enable row level security;

-- ------------------------------------------------------------ políticas ---
-- Un club se ve si eres miembro. Se crea libremente (cualquiera puede fundar
-- el suyo), pero solo a nombre propio.
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select to authenticated
  using (public.is_club_member(id));

drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update to authenticated
  using (public.is_club_member(id)) with check (public.is_club_member(id));

drop policy if exists clubs_delete on public.clubs;
create policy clubs_delete on public.clubs for delete to authenticated
  using (created_by = auth.uid());

-- Equipos: acceso por pertenencia al club.
drop policy if exists teams_all on public.teams;
create policy teams_all on public.teams for all to authenticated
  using (public.is_club_member(club_id)) with check (public.is_club_member(club_id));

-- Pertenencias: cada cual ve las de sus clubes. Alta propia al fundar el club.
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_club_member(club_id));

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships for insert to authenticated
  with check (
    public.is_club_member(club_id)
    or exists (select 1 from public.clubs c where c.id = club_id and c.created_by = auth.uid())
  );

drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_club_member(club_id));

-- Tablas con team_id: una sola política por tabla cubre las cuatro acciones.
drop policy if exists players_all on public.players;
create policy players_all on public.players for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists guardians_all on public.guardians;
create policy guardians_all on public.guardians for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists trainings_all on public.trainings;
create policy trainings_all on public.trainings for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists matches_all on public.matches;
create policy matches_all on public.matches for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists call_ups_all on public.call_ups;
create policy call_ups_all on public.call_ups for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages for all to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

-- Tablas de unión: heredan el permiso de su fila padre.
drop policy if exists player_guardians_all on public.player_guardians;
create policy player_guardians_all on public.player_guardians for all to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and public.is_team_member(p.team_id)))
  with check (exists (select 1 from public.players p where p.id = player_id and public.is_team_member(p.team_id)));

drop policy if exists training_attendance_all on public.training_attendance;
create policy training_attendance_all on public.training_attendance for all to authenticated
  using (exists (select 1 from public.trainings t where t.id = training_id and public.is_team_member(t.team_id)))
  with check (exists (select 1 from public.trainings t where t.id = training_id and public.is_team_member(t.team_id)));

drop policy if exists match_availability_all on public.match_availability;
create policy match_availability_all on public.match_availability for all to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and public.is_team_member(m.team_id)))
  with check (exists (select 1 from public.matches m where m.id = match_id and public.is_team_member(m.team_id)));

drop policy if exists call_up_players_all on public.call_up_players;
create policy call_up_players_all on public.call_up_players for all to authenticated
  using (exists (select 1 from public.call_ups c where c.id = call_up_id and public.is_team_member(c.team_id)))
  with check (exists (select 1 from public.call_ups c where c.id = call_up_id and public.is_team_member(c.team_id)));

-- --------------------------------------------------------------- permisos --
-- El rol anon no toca nada: solo sirve para iniciar sesión y registrarse.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_club_with_team(text, text, text, text) to authenticated;
grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
