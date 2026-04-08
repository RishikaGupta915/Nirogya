-- Phase C: secure doctor share links

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  assessment_id uuid not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  constraint share_links_uid_fkey
    foreign key (uid) references public.profiles(uid) on delete cascade,
  constraint share_links_assessment_id_fkey
    foreign key (assessment_id) references public.assessments(id) on delete cascade
);

create index if not exists idx_share_links_uid_created_at
  on public.share_links (uid, created_at desc);

create index if not exists idx_share_links_assessment_id
  on public.share_links (assessment_id);

create index if not exists idx_share_links_expires_at
  on public.share_links (expires_at);

grant select, insert, update on public.share_links to anon, authenticated;

alter table public.share_links enable row level security;

drop policy if exists "share_links_select_own" on public.share_links;
drop policy if exists "share_links_insert_own" on public.share_links;
drop policy if exists "share_links_update_own" on public.share_links;

create policy "share_links_select_own" on public.share_links
  for select using (uid = auth.uid());

create policy "share_links_insert_own" on public.share_links
  for insert with check (uid = auth.uid());

create policy "share_links_update_own" on public.share_links
  for update using (uid = auth.uid()) with check (uid = auth.uid());
