-- Overall summary doctor share links

create table if not exists public.overall_share_links (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  token_hash text not null unique,
  report jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  constraint overall_share_links_uid_fkey
    foreign key (uid) references public.profiles(uid) on delete cascade
);

create index if not exists idx_overall_share_links_uid_created_at
  on public.overall_share_links (uid, created_at desc);

create index if not exists idx_overall_share_links_expires_at
  on public.overall_share_links (expires_at);

grant select, insert, update on public.overall_share_links to anon, authenticated;

alter table public.overall_share_links enable row level security;

drop policy if exists "overall_share_links_select_own" on public.overall_share_links;
drop policy if exists "overall_share_links_insert_own" on public.overall_share_links;
drop policy if exists "overall_share_links_update_own" on public.overall_share_links;

create policy "overall_share_links_select_own" on public.overall_share_links
  for select using (uid = auth.uid());

create policy "overall_share_links_insert_own" on public.overall_share_links
  for insert with check (uid = auth.uid());

create policy "overall_share_links_update_own" on public.overall_share_links
  for update using (uid = auth.uid()) with check (uid = auth.uid());
