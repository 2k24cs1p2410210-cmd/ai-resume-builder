-- Migration: Create Resumes Table & Configure Row-Level Security with Clerk
-- Paste this script directly into the Supabase SQL Editor.

-- 1. Create resumes table
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default 'Untitled Resume',
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create index on user_id for fast queries
create index if not exists idx_resumes_user_id on resumes(user_id);

-- 3. Create set_config RPC helper function.
-- Since the built-in Postgres set_config function is not exposed as a public RPC in Supabase,
-- we define a custom RPC function wrapper that sets session variables.
create or replace function set_config(setting text, value text)
returns text
language plpgsql
security definer
as $$
begin
  perform set_config(setting, value, false);
  return value;
end;
$$;

-- 4. Enable Row-Level Security (RLS)
alter table resumes enable row level security;

-- 5. Create RLS Policy checking the app.current_user_id session configuration variable
drop policy if exists "Users can only access their own resumes" on resumes;
create policy "Users can only access their own resumes"
on resumes for all
using (user_id = current_setting('app.current_user_id', true));
