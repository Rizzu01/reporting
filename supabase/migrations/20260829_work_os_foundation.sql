-- Work OS foundation. Additive migration: existing tasks/reports remain intact.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.workspaces to authenticated;
alter table public.workspaces enable row level security;
drop policy if exists "Workspace members can read workspaces" on public.workspaces;
drop policy if exists "Owners can create workspaces" on public.workspaces;
drop policy if exists "Owners can update workspaces" on public.workspaces;
drop policy if exists "Owners can delete workspaces" on public.workspaces;
create policy "Workspace members can read workspaces" on public.workspaces for select using (
  owner_id = auth.uid() or exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid())
);
create policy "Owners can create workspaces" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "Owners can update workspaces" on public.workspaces for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners can delete workspaces" on public.workspaces for delete using (owner_id = auth.uid());

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer','guest')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

grant select, insert, update, delete on public.workspace_members to authenticated;
alter table public.workspace_members enable row level security;
drop policy if exists "Members can read membership" on public.workspace_members;
drop policy if exists "Owners can manage membership" on public.workspace_members;
create policy "Members can read membership" on public.workspace_members for select using (
  user_id = auth.uid() or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);
create policy "Owners can manage membership" on public.workspace_members for all using (
  exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
) with check (
  exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teams to authenticated;
alter table public.teams enable row level security;
create policy "Workspace members can manage teams" on public.teams for all using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'Active' check (status in ('Active','On hold','Completed','Archived')),
  health text not null default 'Good' check (health in ('Good','At risk','Blocked')),
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
alter table public.projects enable row level security;
create policy "Workspace members can manage projects" on public.projects for all using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.boards to authenticated;
alter table public.boards enable row level security;
create policy "Workspace members can manage boards" on public.boards for all using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
);

create table if not exists public.board_groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.board_groups to authenticated;
alter table public.board_groups enable row level security;
create policy "Workspace members can manage board groups" on public.board_groups for all using (
  exists (select 1 from public.boards b join public.workspace_members wm on wm.workspace_id = b.workspace_id where b.id = board_id and wm.user_id = auth.uid())
) with check (
  exists (select 1 from public.boards b join public.workspace_members wm on wm.workspace_id = b.workspace_id where b.id = board_id and wm.user_id = auth.uid())
);

alter table public.tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.tasks add column if not exists board_id uuid references public.boards(id) on delete set null;
alter table public.tasks add column if not exists group_id uuid references public.board_groups(id) on delete set null;
alter table public.tasks add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.tasks add column if not exists parent_task_id uuid references public.tasks(id) on delete set null;
alter table public.tasks add column if not exists status text not null default 'Not started';
alter table public.tasks add column if not exists priority text not null default 'Medium';
alter table public.tasks add column if not exists start_date date;
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists progress integer not null default 0;
create index if not exists tasks_workspace_idx on public.tasks(workspace_id, project_id, board_id, work_date);

-- Keep existing ownership behavior while allowing workspace members to work with workspace tasks.
drop policy if exists "Workspace members can read workspace tasks" on public.tasks;
drop policy if exists "Workspace members can insert workspace tasks" on public.tasks;
drop policy if exists "Workspace members can update workspace tasks" on public.tasks;
drop policy if exists "Workspace members can delete workspace tasks" on public.tasks;
create policy "Workspace members can read workspace tasks" on public.tasks for select using (
  user_id = auth.uid() or (workspace_id is not null and exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.user_id = auth.uid()))
);
create policy "Workspace members can insert workspace tasks" on public.tasks for insert with check (
  user_id = auth.uid() and (workspace_id is null or exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.user_id = auth.uid()))
);
create policy "Workspace members can update workspace tasks" on public.tasks for update using (
  user_id = auth.uid() or (workspace_id is not null and exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.user_id = auth.uid()))
) with check (
  user_id = auth.uid() or (workspace_id is not null and exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.user_id = auth.uid()))
);
create policy "Workspace members can delete workspace tasks" on public.tasks for delete using (
  user_id = auth.uid() or (workspace_id is not null and exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.user_id = auth.uid()))
);
