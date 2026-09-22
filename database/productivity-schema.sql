-- Additive, independent storage. No operational records belong in Git.
create table if not exists public.agent_productivity_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_month date not null check (extract(day from report_month) = 1),
  file_name text not null check (char_length(file_name) between 1 and 255),
  agents jsonb not null check (jsonb_typeof(agents) = 'array' and jsonb_array_length(agents) between 1 and 2000),
  settings jsonb not null default '{"inboundMinutes":null,"outboundMinutes":null,"work":{}}'::jsonb check (jsonb_typeof(settings) = 'object'),
  time_unit text not null check (time_unit in ('seconds','minutes','excel-days')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,report_month)
);
alter table public.agent_productivity_reports enable row level security;
revoke all on public.agent_productivity_reports from anon, authenticated;
grant select, insert, update on public.agent_productivity_reports to authenticated;
create policy productivity_read_own on public.agent_productivity_reports for select to authenticated using ((select auth.uid()) = owner_id);
create policy productivity_insert_own on public.agent_productivity_reports for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy productivity_update_own on public.agent_productivity_reports for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
