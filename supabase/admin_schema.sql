-- Worklog admin access
-- Run once in Supabase SQL Editor AFTER schema.sql.
-- This migration uses a profiles table for roles and keeps admin access
-- enforced by PostgreSQL/RLS rather than client-side flags.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.profiles to authenticated;
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Admins can read all profiles"
on public.profiles for select
using (public.is_admin());

-- Admins can read all tasks; normal users remain restricted to their own tasks.
drop policy if exists "Admins can read all tasks" on public.tasks;
create policy "Admins can read all tasks"
on public.tasks for select
using (public.is_admin());

-- Admins can read all saved reports.
drop policy if exists "Admins can read all reports" on public.work_reports;
create policy "Admins can read all reports"
on public.work_reports for select
using (public.is_admin());

-- Automatically create a normal profile for every newly registered user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- IMPORTANT: after running this migration, promote your chosen admin account
-- manually in Supabase SQL Editor, for example:
-- update public.profiles set role = 'admin' where email = 'YOUR-ADMIN-EMAIL';
