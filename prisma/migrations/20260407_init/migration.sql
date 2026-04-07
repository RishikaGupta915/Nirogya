-- Initial schema + enhancements
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
  last_active_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now(),
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
  deleted_at timestamptz,
  constraint assessments_uid_fkey foreign key (uid) references public.profiles(uid) on delete cascade
);

create index if not exists idx_assessments_uid_created_at on public.assessments (uid, created_at desc);
create index if not exists idx_profiles_uid on public.profiles(uid);

-- Full-text search generated column & index
alter table public.assessments
  add column if not exists search_vector tsvector generated always as (
    to_tsvector('english', coalesce(symptom,'') || ' ' || coalesce(diagnosis,''))
  ) stored;
create index if not exists idx_assessments_search_vector on public.assessments using gin (search_vector);

-- Materialized view for recent assessments per user
create materialized view if not exists public.recent_assessments_mv as
select distinct on (uid) uid, id, created_at, diagnosis, risk_level, symptom
from public.assessments
where deleted_at is null
order by uid, created_at desc;

-- Audit table
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  uid uuid,
  action text,
  table_name text,
  row_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

-- Audit function
create or replace function public.log_audit() returns trigger as $$
begin
  insert into public.audit_events(uid, action, table_name, row_id, payload)
  values (
    coalesce((new).uid, (old).uid),
    tg_op,
    tg_table_name,
    coalesce((new).id, (old).id),
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return null;
end;
$$ language plpgsql security definer;

-- Triggers
create trigger trg_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute procedure public.log_audit();

create trigger trg_audit_assessments
  after insert or update or delete on public.assessments
  for each row execute procedure public.log_audit();

-- Soft delete policies: handled via queries; RLS filters by uid only
alter table public.profiles enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "assessments_select_own" on public.assessments;
drop policy if exists "assessments_insert_own" on public.assessments;
drop policy if exists "assessments_update_own" on public.assessments;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update on public.assessments to anon, authenticated;

create policy "profiles_select_own" on public.profiles
  for select using (uid = auth.uid() and deleted_at is null);

create policy "profiles_upsert_own" on public.profiles
  for all
  using (uid = auth.uid())
  with check (uid = auth.uid());

create policy "assessments_select_own" on public.assessments
  for select using (uid = auth.uid() and deleted_at is null);

create policy "assessments_insert_own" on public.assessments
  for insert with check (uid = auth.uid());

create policy "assessments_update_own" on public.assessments
  for update using (uid = auth.uid()) with check (uid = auth.uid());
