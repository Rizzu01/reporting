-- Run this once in Supabase SQL Editor.
-- It adds one optional Drive link per saved task/day.

alter table public.tasks
add column if not exists drive_link text;
