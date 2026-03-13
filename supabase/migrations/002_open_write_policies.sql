-- ============================================================
-- College Cricket Hub – Open Write Policies (Migration 002)
-- ============================================================
-- Replaces the auth-gated INSERT/UPDATE/DELETE policies on all
-- public-facing tables with open policies (no auth required).
--
-- ⚠️  This is suitable for development / demo use.
--     When you add proper admin authentication, replace the
--     `using (true)` / `with check (true)` clauses with
--     `using (auth.role() = 'authenticated')` etc.
-- ============================================================


-- ============================================================
-- TOURNAMENTS
-- ============================================================

drop policy if exists "tournaments_insert_auth" on public.tournaments;
drop policy if exists "tournaments_update_auth" on public.tournaments;
drop policy if exists "tournaments_delete_auth" on public.tournaments;

create policy "tournaments_insert_open"
  on public.tournaments for insert with check (true);

create policy "tournaments_update_open"
  on public.tournaments for update using (true);

create policy "tournaments_delete_open"
  on public.tournaments for delete using (true);


-- ============================================================
-- TEAMS
-- ============================================================

drop policy if exists "teams_insert_auth" on public.teams;
drop policy if exists "teams_update_auth" on public.teams;
drop policy if exists "teams_delete_auth"  on public.teams;

create policy "teams_insert_open"
  on public.teams for insert with check (true);

create policy "teams_update_open"
  on public.teams for update using (true);

create policy "teams_delete_open"
  on public.teams for delete using (true);


-- ============================================================
-- MATCHES
-- ============================================================

drop policy if exists "matches_insert_auth" on public.matches;
drop policy if exists "matches_update_auth" on public.matches;
drop policy if exists "matches_delete_auth" on public.matches;

create policy "matches_insert_open"
  on public.matches for insert with check (true);

create policy "matches_update_open"
  on public.matches for update using (true);

create policy "matches_delete_open"
  on public.matches for delete using (true);


-- ============================================================
-- PLAYERS
-- ============================================================

drop policy if exists "players_insert_auth" on public.players;
drop policy if exists "players_update_auth" on public.players
