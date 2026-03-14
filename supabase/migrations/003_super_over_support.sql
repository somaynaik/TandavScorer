alter table public.ball_events
  drop constraint if exists ball_events_innings_check;

alter table public.ball_events
  add constraint ball_events_innings_check
  check (innings in (1, 2, 3, 4));
