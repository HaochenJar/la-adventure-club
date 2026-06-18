-- ============================================================================
--  LA Adventure Club — Supabase / Postgres schema
--  Paste this whole file into the Supabase SQL Editor and click "Run".
--  Safe to re-run: it uses "if not exists" / "create or replace" throughout.
--
--  What it sets up:
--    profiles       — one row per signed-in user (the questionnaire answers)
--    events         — upcoming trips the captain publishes
--    registrations  — who signed up for which event
--  + Row-Level Security so each member can only see/edit their own data
--  + a trigger that auto-creates a profile when someone signs in with Google
--  + helper functions the website calls (list events, register, cancel)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (the questionnaire — name / age / sex / emergency contact …)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  email                    text,
  full_name                text,
  age_range                text check (age_range in ('18-20','21-25','26-30','30+')),
  gender                   text check (gender in ('female','male','nonbinary','prefer_not_to_say')),
  phone                    text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  experience_level         text check (experience_level in ('first_timer','some','experienced')),
  waiver_accepted          boolean not null default false,
  profile_complete         boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. EVENTS  (upcoming trips — the captain manages these)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  title         text not null,
  activity      text,                 -- e.g. 'hiking', 'paddle'
  difficulty    text,                 -- e.g. 'Easy', 'Moderate'
  description   text,
  location      text,
  event_date    date,
  start_time    text,                 -- free text e.g. '4:30 PM'
  capacity      int,                  -- NULL = unlimited
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. REGISTRATIONS  (which member is going to which event)
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  guests      int  not null default 0 check (guests between 0 and 10),
  notes       text,
  status      text not null default 'confirmed' check (status in ('confirmed','waitlist','cancelled')),
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)          -- one registration per person per event
);

-- ---------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY
--    Members can only ever touch their own rows. Events are world-readable.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using  (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using  (auth.uid() = id);

drop policy if exists "events_select_published" on public.events;
create policy "events_select_published" on public.events for select using (is_published = true);

drop policy if exists "regs_select_own" on public.registrations;
create policy "regs_select_own" on public.registrations for select using (auth.uid() = user_id);
-- (inserts/updates happen through the SECURITY DEFINER functions below)

-- ---------------------------------------------------------------------------
-- 5. AUTO-CREATE A PROFILE ON SIGN-UP
--    When Supabase creates the auth user (first Google sign-in), make a
--    matching profiles row and pre-fill name/email from the Google account.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh on profile edits
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. HELPER FUNCTIONS the website calls
-- ---------------------------------------------------------------------------

-- List published events + availability + whether *I* am registered.
-- (SECURITY DEFINER so it can count everyone's signups for "spots left"
--  without exposing individual registrations to other members.)
create or replace function public.events_with_status()
returns table (
  id uuid, slug text, title text, activity text, difficulty text,
  description text, location text, event_date date, start_time text,
  capacity int, taken int, spots_left int, i_registered boolean,
  my_status text, my_guests int
)
language sql
security definer set search_path = public
as $$
  select
    e.id, e.slug, e.title, e.activity, e.difficulty, e.description,
    e.location, e.event_date, e.start_time, e.capacity,
    coalesce(t.taken, 0)::int as taken,
    case when e.capacity is null then null
         else greatest(e.capacity - coalesce(t.taken, 0), 0) end as spots_left,
    (mine.user_id is not null) as i_registered,
    mine.status as my_status,
    coalesce(mine.guests, 0) as my_guests
  from public.events e
  left join (
    select event_id, sum(1 + guests) as taken
    from public.registrations
    where status = 'confirmed'
    group by event_id
  ) t on t.event_id = e.id
  left join public.registrations mine
    on mine.event_id = e.id
   and mine.user_id  = auth.uid()
   and mine.status <> 'cancelled'
  where e.is_published = true
  order by e.event_date asc nulls last;
$$;

-- Register the current user for an event (capacity-aware: overflow -> waitlist).
create or replace function public.register_for_event(
  p_event uuid, p_guests int default 0, p_notes text default null
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  cap int;
  taken int;
  party int := 1 + greatest(coalesce(p_guests, 0), 0);
  new_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to register.';
  end if;

  if not exists (select 1 from public.profiles
                 where id = auth.uid() and profile_complete) then
    raise exception 'Please complete your profile before registering.';
  end if;

  select capacity into cap from public.events
   where id = p_event and is_published;
  if not found then
    raise exception 'That event is not available.';
  end if;

  select coalesce(sum(1 + guests), 0) into taken
    from public.registrations
   where event_id = p_event and status = 'confirmed';

  if cap is not null and taken + party > cap then
    new_status := 'waitlist';
  else
    new_status := 'confirmed';
  end if;

  insert into public.registrations (user_id, event_id, guests, notes, status)
  values (auth.uid(), p_event, greatest(coalesce(p_guests, 0), 0), p_notes, new_status)
  on conflict (user_id, event_id)
    do update set guests = excluded.guests,
                  notes  = excluded.notes,
                  status = new_status;

  return new_status;
end;
$$;

-- Cancel the current user's registration for an event.
create or replace function public.cancel_registration(p_event uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.registrations
     set status = 'cancelled'
   where user_id = auth.uid() and event_id = p_event;
$$;

-- Let signed-in members execute the helpers.
grant execute on function public.events_with_status()             to authenticated;
grant execute on function public.register_for_event(uuid,int,text) to authenticated;
grant execute on function public.cancel_registration(uuid)         to authenticated;

-- ---------------------------------------------------------------------------
-- 7. SEED THE UPCOMING EVENTS (edit / add your own anytime)
-- ---------------------------------------------------------------------------
insert into public.events (slug, title, activity, difficulty, description, location, event_date, start_time, capacity)
values
  ('juneteenth-point-vicente', 'Juneteenth Point Vicente Beach Walk', 'walk', 'Beginner',
   'An easy sunset stroll along the Palos Verdes coast — clifftop ocean views, a Pacific sunset, sea breeze, and good company. Beginner-friendly, about 1 hour. Come solo or bring friends!',
   'Point Vicente Lighthouse & Coastal Trail, Palos Verdes', date '2026-06-19', '6:00 PM', 30),
  ('solstice-canyon-hike', 'Solstice Canyon Sunset Hike', 'hiking', 'Easy',
   '3 mi loop past a waterfall and old ruins, finishing with ocean views at golden hour.',
   'Malibu', date '2026-06-27', '4:30 PM', 15),
  ('marina-del-rey-sup', 'Marina del Rey SUP & Picnic', 'paddle', 'Beginner',
   'Calm-water stand-up paddle followed by a picnic on the grass. Loaner boards available.',
   'Marina del Rey', date '2026-07-11', '10:00 AM', 12),
  ('griffith-night-hike', 'Griffith Observatory Night Hike', 'hiking', 'Moderate',
   'Golden-hour climb to the Observatory with city lights on the way back down.',
   'Griffith Park', date '2026-07-25', '6:00 PM', 20)
on conflict (slug) do nothing;

-- Done!  Next: enable the Google auth provider (see SETUP-database.md).
