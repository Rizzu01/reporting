-- Extend existing task access without removing personal ownership semantics.
drop policy if exists "Users can read their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can read their own tasks" on public.tasks for select using (auth.uid() = user_id or (workspace_id is not null and exists(select 1 from public.workspace_members wm where wm.workspace_id=tasks.workspace_id and wm.user_id=auth.uid())));
create policy "Users can insert their own tasks" on public.tasks for insert with check (auth.uid() = user_id and (workspace_id is null or exists(select 1 from public.workspace_members wm where wm.workspace_id=tasks.workspace_id and wm.user_id=auth.uid())));
create policy "Users can update their own tasks" on public.tasks for update using (auth.uid() = user_id or (workspace_id is not null and exists(select 1 from public.workspace_members wm where wm.workspace_id=tasks.workspace_id and wm.user_id=auth.uid()))) with check (auth.uid() = user_id or (workspace_id is not null and exists(select 1 from public.workspace_members wm where wm.workspace_id=tasks.workspace_id and wm.user_id=auth.uid())));
create policy "Users can delete their own tasks" on public.tasks for delete using (auth.uid() = user_id or (workspace_id is not null and exists(select 1 from public.workspace_members wm where wm.workspace_id=tasks.workspace_id and wm.user_id=auth.uid())));
