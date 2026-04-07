-- Enable extension (usually already on in Supabase)
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  uid uuid unique not null,
  name text,
  email text,
  language text,
  city text,
  age_group text,
  life_stage text,
  activity_level text,
  diet_type text,
  conditions text[],
  family_history text[],
  medications text,
  allergies text[],
  sleep_hours numeric(4,1),
  sleep_quality text[],
  stress_level text,
  mood_swings boolean,
  anxiety boolean,
  low_motivation boolean,
  updated_at timestamptz default now()
);

-- Assessments table
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  symptom text,
  answers jsonb,
  diagnosis text,
  risk_score int,
  risk_level text,
  next_steps text[],
  raw_ai_text text,
  created_at timestamptz default now(),
  constraint assessments_uid_fkey foreign key (uid) references public.profiles(uid) on delete cascade
);

create index if not exists idx_assessments_uid_created_at on public.assessments (uid, created_at desc);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.assessments enable row level security;

-- Drop existing policies to avoid duplicates
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "assessments_select_own" on public.assessments;
drop policy if exists "assessments_insert_own" on public.assessments;
drop policy if exists "assessments_update_own" on public.assessments;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
  for select using (uid = auth.uid());

create policy "profiles_upsert_own" on public.profiles
  for all
  using (uid = auth.uid())
  with check (uid = auth.uid());

-- Assessments policies
create policy "assessments_select_own" on public.assessments
  for select using (uid = auth.uid());

create policy "assessments_insert_own" on public.assessments
  for insert with check (uid = auth.uid());

create policy "assessments_update_own" on public.assessments
  for update using (uid = auth.uid()) with check (uid = auth.uid());

-- Grant minimal privileges for anon (needed for RLS-protected access via supabase client)
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update on public.assessments to anon, authenticated;
