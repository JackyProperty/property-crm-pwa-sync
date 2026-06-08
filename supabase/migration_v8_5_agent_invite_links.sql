-- Lists Manager V8.5 Agent Invite Link Migration
-- Safe migration: adds invite-link registration for agents.
-- Does not delete existing data.

create extension if not exists pgcrypto;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  token text not null unique,
  name text,
  email text,
  phone text,
  whatsapp text,
  role text default 'Co-Agent',
  status text default 'active',
  expires_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.team_members
  add column if not exists invite_token text;

create index if not exists team_invites_token_idx on public.team_invites(token);
create index if not exists team_invites_team_idx on public.team_invites(team_id, created_at desc);

alter table public.team_invites enable row level security;

drop policy if exists "team invites select" on public.team_invites;
drop policy if exists "team invites insert" on public.team_invites;
drop policy if exists "team invites update" on public.team_invites;
drop policy if exists "team invites delete" on public.team_invites;

-- Managers can see their team invites. Invited users can read the invite by token after login.
create policy "team invites select"
on public.team_invites for select
using (
  team_id = public.current_team_id()
  or status = 'active'
);

create policy "team invites insert"
on public.team_invites for insert
with check (
  team_id = public.current_team_id()
  and public.can_manage_team()
);

create policy "team invites update"
on public.team_invites for update
using (
  (team_id = public.current_team_id() and public.can_manage_team())
  or (
    status='active'
    and (email is null or lower(email)=lower(coalesce(auth.jwt()->>'email','')))
  )
)
with check (true);

create policy "team invites delete"
on public.team_invites for delete
using (team_id = public.current_team_id() and public.can_manage_team());

-- Allow invited agent to insert their own team_members row by matching invite_token.
drop policy if exists "team members invite accept insert" on public.team_members;
create policy "team members invite accept insert"
on public.team_members for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.team_invites ti
    where ti.token = team_members.invite_token
      and ti.team_id = team_members.team_id
      and ti.status = 'active'
      and (ti.expires_at is null or ti.expires_at > now())
      and (ti.email is null or lower(ti.email)=lower(coalesce(auth.jwt()->>'email','')))
  )
);
