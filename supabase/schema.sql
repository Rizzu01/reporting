-- Run this once in Supabase SQL Editor.
-- The app uses Supabase Auth + Row Level Security so each user only sees their own work.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  description text not null,
  assigned_to text not null default 'Designer',
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_date_idx on public.tasks(user_id, work_date, created_at);
grant select, insert, update, delete on public.tasks to authenticated;
alter table public.tasks enable row level security;

drop policy if exists "Users can read their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

create policy "Users can read their own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own tasks" on public.tasks for delete using (auth.uid() = user_id);

create table if not exists public.work_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id, period_start, period_end)
);

grant select, insert, update, delete on public.work_reports to authenticated;
alter table public.work_reports enable row level security;

drop policy if exists "Users can read their own reports" on public.work_reports;
drop policy if exists "Users can insert their own reports" on public.work_reports;
drop policy if exists "Users can update their own reports" on public.work_reports;
drop policy if exists "Users can delete their own reports" on public.work_reports;

create policy "Users can read their own reports" on public.work_reports for select using (auth.uid() = user_id);
create policy "Users can insert their own reports" on public.work_reports for insert with check (auth.uid() = user_id);
create policy "Users can update their own reports" on public.work_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own reports" on public.work_reports for delete using (auth.uid() = user_id);
