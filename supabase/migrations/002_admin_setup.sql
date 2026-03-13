-- ============================================================
-- College Cricket Hub – Migration 002
-- Admin Setup: fix write policies + admin promotion helper
-- ============================================================
-- Run this in your Supabase SQL Editor AFTER migration 001.
-- ============================================================


-- ============================================================
-- 1. TOURNAMENTS – allow any authenticated user to write
-- ============================================================
drop policy if exists "tournaments_insert_auth" on public.tournaments;
drop policy if exists "tournaments_update_auth" on public.tournaments;
drop policy if exists "tournaments_delete_auth" on public.tournaments;

create policy "tournaments_insert_auth"
  on public.tournaments for insert
  with check (auth.role() = 'authenticated');

create policy "tournaments_update_auth"
  on public.tournaments for update
  using (auth.role() = 'authenticated');

create policy "tournaments_delete_auth"
  on public.tournaments for delete
  using (auth.role() = 'authenticated');


-- ============================================================
-- 2. TEAMS – allow any authenticated user to write
-- ============================================================
drop policy if exists "teams_insert_auth" on public.teams;
drop policy if exists "teams_update_auth" on public.teams;
drop policy if exists "teams_delete_auth"  on public.teams;

create policy "teams_insert_auth"
  on public.teams for insert
  with check (auth.role() = 'authenticated');

create policy "teams_update_auth"
  on public.teams for update
  using (auth.role() = 'authenticated');

create policy "teams_delete_auth"
  on public.teams for delete
  using (auth.role() = 'authenticated');


-- ============================================================
-- 3. MATCHES – allow any authenticated user to write
-- ============================================================
drop policy if exists "matches_insert_auth" on public.matches;
drop policy if exists "matches_update_auth" on public.matches;
drop policy if exists "matches_delete_auth" on public.matches;

create policy "matches_insert_auth"
  on public.matches for insert
  with check (auth.role() = 'authenticated');

create policy "matches_update_auth"
  on public.matches for update
  using (auth.role() = 'authenticated');

create policy "matches_delete_auth"
  on public.matches for delete
  using (auth.role() = 'authenticated');


-- ============================================================
-- 4. PLAYERS – allow any authenticated user to write
-- ============================================================
drop policy if exists "players_insert_auth" on public.players;
drop policy if exists "players_update_auth" on public.players;
drop policy if exists "players_delete_auth" on public.players;

create policy "players_insert_auth"
  on public.players for insert
  with check (auth.role() = 'authenticated');

create policy "players_update_auth"
  on public.players for update
  using (auth.role() = 'authenticated');

create policy "players_delete_auth"
  on public.players for delete
  using (auth.role() = 'authenticated');


-- ============================================================
-- 5. BALL EVENTS – allow any authenticated user to write
-- ============================================================
drop policy if exists "ball_events_insert_auth" on public.ball_events;
drop policy if exists "ball_events_delete_auth" on public.ball_events;

create policy "ball_events_insert_auth"
  on public.ball_events for insert
  with check (auth.role() = 'authenticated');

create policy "ball_events_delete_auth"
  on public.ball_events for delete
  using (auth.role() = 'authenticated');


-- ============================================================
-- 6. PROFILES – allow admins to update any profile
--    (needed to grant/revoke admin & scorer roles)
-- ============================================================
drop policy if exists "profiles_update_own" on public.profiles;

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can update any profile (to grant roles)
create policy "profiles_update_admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );


-- ============================================================
-- 7. FUNCTION: promote a user to admin by email
--
-- Usage (run in SQL editor):
--   select public.make_admin('your@email.com');
-- ============================================================
create or replace function public.make_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Look up the user in auth.users by email
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return 'ERROR: No user found with email ' || p_email;
  end if;

  -- Upsert the profile row with is_admin = true
  insert into public.profiles (id, username, is_admin)
  values (
    v_user_id,
    split_part(lower(trim(p_email)), '@', 1),
    true
  )
  on conflict (id) do update
    set is_admin = true;

  return 'OK: ' || p_email || ' is now an admin.';
end;
$$;


-- ============================================================
-- 8. FUNCTION: promote a user to scorer by email
--
-- Usage (run in SQL editor):
--   select public.make_scorer('scorer@email.com');
-- ============================================================
create or replace function public.make_scorer(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return 'ERROR: No user found with email ' || p_email;
  end if;

  insert into public.profiles (id, username, is_scorer)
  values (
    v_user_id,
    split_part(lower(trim(p_email)), '@', 1),
    true
  )
  on conflict (id) do update
    set is_scorer = true;

  return 'OK: ' || p_email || ' is now a scorer.';
end;
$$;


-- ============================================================
-- 9. FUNCTION: revoke admin from a user by email
-- ============================================================
create or replace function public.revoke_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return 'ERROR: No user found with email ' || p_email;
  end if;

  update public.profiles
  set is_admin = false
  where id = v_user_id;

  return 'OK: Admin revoked from ' || p_email;
end;
$$;


-- ============================================================
-- HOW TO BECOME THE FIRST ADMIN
-- ============================================================
-- 1. Sign up through the app at /login
-- 2. Go to Supabase → SQL Editor and run:
--
--      select public.make_admin('your@email.com');
--
-- 3. Sign out and sign back in — you will now have admin access.
-- ============================================================
