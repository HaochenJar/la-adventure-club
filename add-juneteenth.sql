-- ============================================================================
--  Add the Juneteenth Point Vicente Beach Walk to the events table.
--  Paste into the Supabase SQL Editor → Run.  Safe to re-run (it updates).
-- ============================================================================
insert into public.events
  (slug, title, activity, difficulty, description, location, event_date, start_time, capacity)
values
  ('juneteenth-point-vicente',
   'Juneteenth Point Vicente Beach Walk',
   'walk',
   'Beginner',
   'An easy sunset stroll along the Palos Verdes coast — clifftop ocean views, a Pacific sunset, sea breeze, and good company. Beginner-friendly, about 1 hour. Come solo or bring friends! 海边日落散步，欢迎一个人来。',
   'Point Vicente Lighthouse & Coastal Trail, Palos Verdes',
   date '2026-06-19',
   '6:00 PM',
   30)
on conflict (slug) do update set
  title       = excluded.title,
  activity    = excluded.activity,
  difficulty  = excluded.difficulty,
  description = excluded.description,
  location    = excluded.location,
  event_date  = excluded.event_date,
  start_time  = excluded.start_time,
  capacity    = excluded.capacity;
