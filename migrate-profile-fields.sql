-- ============================================================================
--  Migration: profiles — age(int) → age_range, sex → gender, + waiver_accepted
--  Run once in the Supabase SQL Editor on your EXISTING project.
--  Idempotent: safe to run more than once.
-- ============================================================================

-- 1. Replace numeric age with an age-range bucket
alter table public.profiles drop column if exists age;
alter table public.profiles add column if not exists age_range text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_age_range_check'
  ) then
    alter table public.profiles
      add constraint profiles_age_range_check
      check (age_range in ('18-20','21-25','26-30','30+'));
  end if;
end $$;

-- 2. Rename sex → gender (only if it hasn't been renamed already)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='sex')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='gender')
  then
    alter table public.profiles rename column sex to gender;
  end if;
end $$;
-- make sure the gender column exists even on a fresh-ish DB
alter table public.profiles add column if not exists gender text;

-- 3. Add the waiver acknowledgement flag
alter table public.profiles add column if not exists waiver_accepted boolean not null default false;

-- Done. The member portal now writes age_range / gender / waiver_accepted.
