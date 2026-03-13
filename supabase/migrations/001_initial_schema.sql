-- ============================================================
-- College Cricket Hub – Initial Schema (no seed data)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table if not exists public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  teams       integer not null default 0,
  matches     integer not null default 0,
  status      text not null default 'upcoming'
                check (status in ('upcoming', 'ongoing', 'completed')),
  created_at  timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "tournaments_select_all"
  on public.tournaments for select using (true);

create policy "tournaments_insert_auth"
  on public.tournaments for insert with check (auth.role() = 'authenticated');

create policy "tournaments_update_auth"
  on public.tournaments for update using (auth.role() = 'authenticated');

create policy "tournaments_delete_auth"
  on public.tournaments for delete using (auth.role() = 'authenticated');

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists public.teams (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  tournament_id  uuid references public.tournaments (id) on delete cascade,
  created_at     timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams_select_all"
  on public.teams for select using (true);

create policy "teams_insert_auth"
  on public.teams for insert with check (auth.role() = 'authenticated');

create policy "teams_update_auth"
  on public.teams for update using (auth.role() = 'authenticated');

create policy "teams_delete_auth"
  on public.teams for delete using (auth.role() = 'authenticated');

-- ============================================================
-- MATCHES
-- ============================================================
create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid references public.tournaments (id) on delete cascade,
  tournament_name text not null default '',
  team1           text not null,
  team2           text not null,
  date            date not null,
  time            time not null,
  venue           text not null,
  status          text not null default 'upcoming'
                    check (status in ('upcoming', 'live', 'completed')),
  team1_score     text,
  team2_score     text,
  result          text,
  created_at      timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "matches_select_all"
  on public.matches for select using (true);

create policy "matches_insert_auth"
  on public.matches for insert with check (auth.role() = 'authenticated');

create policy "matches_update_auth"
  on public.matches for update using (auth.role() = 'authenticated');

create policy "matches_delete_auth"
  on public.matches for delete using (auth.role() = 'authenticated');

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  team            text not null,
  role            text not null
                    check (role in ('Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper')),
  match_id        uuid references public.matches (id) on delete set null,
  batting_runs    integer,
  balls_faced     integer,
  fours           integer,
  sixes           integer,
  wickets         integer,
  overs_bowled    numeric(5, 1),
  runs_conceded   integer,
  catches         integer,
  fantasy_points  integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "players_select_all"
  on public.players for select using (true);

create policy "players_insert_auth"
  on public.players for insert with check (auth.role() = 'authenticated');

create policy "players_update_auth"
  on public.players for update using (auth.role() = 'authenticated');

create policy "players_delete_auth"
  on public.players for delete using (auth.role() = 'authenticated');

-- ============================================================
-- BALL EVENTS  (ball-by-ball scorer)
-- ============================================================
create table if not exists public.ball_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches (id) on delete cascade,
  innings      integer not null default 1 check (innings in (1, 2)),
  over_number  integer not null,
  ball_number  integer not null,
  runs         integer not null default 0,
  extras       text check (extras in ('wide', 'noball', 'bye', 'legbye', null)),
  wicket       text check (wicket in ('Bowled', 'Caught', 'Run Out', 'LBW', 'Stumped', null)),
  description  text not null,
  created_at   timestamptz not null default now()
);

alter table public.ball_events enable row level security;

-- Anyone can read ball events (live score feed)
create policy "ball_events_select_all"
  on public.ball_events for select using (true);

create policy "ball_events_insert_auth"
  on public.ball_events for insert with check (auth.role() = 'authenticated');

create policy "ball_events_delete_auth"
  on public.ball_events for delete using (auth.role() = 'authenticated');

-- ============================================================
-- USER PROFILES  (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  is_admin    boolean not null default false,
  is_scorer   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FANTASY TEAMS
-- ============================================================
create table if not exists public.fantasy_teams (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  match_id         uuid not null references public.matches (id) on delete cascade,
  player_ids       uuid[] not null,
  captain_id       uuid not null,
  vice_captain_id  uuid not null,
  total_points     integer not null default 0,
  created_at       timestamptz not null default now(),

  -- One entry per user per match
  unique (user_id, match_id)
);

alter table public.fantasy_teams enable row level security;

create policy "fantasy_teams_select_all"
  on public.fantasy_teams for select using (true);

create policy "fantasy_teams_insert_own"
  on public.fantasy_teams for insert with check (auth.uid() = user_id);

create policy "fantasy_teams_update_own"
  on public.fantasy_teams for update using (auth.uid() = user_id);

create policy "fantasy_teams_delete_own"
  on public.fantasy_teams for delete using (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
create or replace view public.leaderboard as
select
  row_number() over (order by sum(ft.total_points) desc) as rank,
  p.username                                             as name,
  sum(ft.total_points)                                   as points,
  count(ft.id)                                           as matches_played,
  ft.user_id
from public.fantasy_teams ft
join public.profiles p on p.id = ft.user_id
group by ft.user_id, p.username
order by points desc;

-- ============================================================
-- FUNCTION: recalculate fantasy points for all teams in a match
-- Called after admin updates player stats for a completed match.
-- ============================================================
create or replace function public.recalculate_fantasy_points(p_match_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  ft  record;
  pts integer;
begin
  for ft in
    select * from public.fantasy_teams where match_id = p_match_id
  loop
    select coalesce(sum(
      case
        when pl.id = ft.captain_id      then pl.fantasy_points * 2
        when pl.id = ft.vice_captain_id then (pl.fantasy_points * 3) / 2
        else pl.fantasy_points
      end
    ), 0)
    into pts
    from public.players pl
    where pl.id = any(ft.player_ids)
      and pl.match_id = p_match_id;

    update public.fantasy_teams
    set total_points = pts
    where id = ft.id;
  end loop;
end;
$$;

-- ============================================================
-- INDEXES for common queries
-- ============================================================
create index if not exists idx_matches_status       on public.matches (status);
create index if not exists idx_matches_tournament    on public.matches (tournament_id);
create index if not exists idx_players_match         on public.players (match_id);
create index if not exists idx_players_team          on public.players (team);
create index if not exists idx_ball_events_match     on public.ball_events (match_id, innings, over_number, ball_number);
create index if not exists idx_fantasy_teams_user    on public.fantasy_teams (user_id);
create index if not exists idx_fantasy_teams_match   on public.fantasy_teams (match_id);
