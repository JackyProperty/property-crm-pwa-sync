-- Property Wanted CRM Route A V8 Migration
-- Safe migration: Team CRM permissions + audit log.
-- This does not delete existing data.
-- Run after V7 migrations.

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default Team',
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  phone text,
  whatsapp text,
  role text default 'Agent',
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists teams_owner_idx on public.teams(owner_user_id);
create index if not exists team_members_team_idx on public.team_members(team_id);
create index if not exists team_members_email_idx on public.team_members(lower(email));
create index if not exists audit_logs_team_created_idx on public.audit_logs(team_id, created_at desc);

-- Team columns for core CRM tables.
alter table public.owner_properties
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.agent_listings
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.new_project_listings
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.client_requests
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.contacts
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.appointments
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

alter table public.reminders
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text default 'Team';

-- Helper functions for RLS.
create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tm.team_id
  from public.team_members tm
  where tm.status='active'
    and (tm.user_id=auth.uid() or lower(tm.email)=lower(coalesce(auth.jwt()->>'email','')))
  order by tm.created_at asc
  limit 1;
$$;

create or replace function public.current_team_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.status='active'
    and (tm.user_id=auth.uid() or lower(tm.email)=lower(coalesce(auth.jwt()->>'email','')))
  order by tm.created_at asc
  limit 1;
$$;

create or replace function public.can_manage_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role() in ('Owner','Manager'), false);
$$;

create or replace function public.can_view_team_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role() in ('Owner','Manager','Senior Agent','Admin Staff'), false);
$$;

-- Backfill existing data into a default team for each current user_id.
insert into public.teams (owner_user_id, name)
select distinct user_id, 'Default Team'
from (
  select user_id from public.owner_properties where user_id is not null
  union select user_id from public.agent_listings where user_id is not null
  union select user_id from public.client_requests where user_id is not null
  union select user_id from public.contacts where user_id is not null
  union select user_id from public.new_project_listings where user_id is not null
) s
where not exists (select 1 from public.teams t where t.owner_user_id=s.user_id);

insert into public.team_members (team_id, user_id, email, name, role, status)
select t.id, t.owner_user_id, coalesce(u.email, 'unknown-'||t.owner_user_id::text||'@local'), coalesce(u.email,'Owner'), 'Owner', 'active'
from public.teams t
left join auth.users u on u.id=t.owner_user_id
where not exists (select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=t.owner_user_id);

update public.owner_properties op
set team_id=t.id, created_by=coalesce(op.created_by,op.user_id), assigned_to=coalesce(op.assigned_to,op.user_id), visibility=coalesce(op.visibility,'Team')
from public.teams t
where op.team_id is null and op.user_id=t.owner_user_id;

update public.agent_listings al
set team_id=t.id, created_by=coalesce(al.created_by,al.user_id), assigned_to=coalesce(al.assigned_to,al.user_id), visibility=coalesce(al.visibility,'Team')
from public.teams t
where al.team_id is null and al.user_id=t.owner_user_id;

update public.new_project_listings np
set team_id=t.id, created_by=coalesce(np.created_by,np.user_id), assigned_to=coalesce(np.assigned_to,np.user_id), visibility=coalesce(np.visibility,'Team')
from public.teams t
where np.team_id is null and np.user_id=t.owner_user_id;

update public.client_requests cr
set team_id=t.id, created_by=coalesce(cr.created_by,cr.user_id), assigned_to=coalesce(cr.assigned_to,cr.user_id), visibility=coalesce(cr.visibility,'Team')
from public.teams t
where cr.team_id is null and cr.user_id=t.owner_user_id;

update public.contacts c
set team_id=t.id, created_by=coalesce(c.created_by,c.user_id), assigned_to=coalesce(c.assigned_to,c.user_id), visibility=coalesce(c.visibility,'Team')
from public.teams t
where c.team_id is null and c.user_id=t.owner_user_id;

update public.appointments a
set team_id=t.id, created_by=coalesce(a.created_by,a.user_id), assigned_to=coalesce(a.assigned_to,a.user_id), visibility=coalesce(a.visibility,'Team')
from public.teams t
where a.team_id is null and a.user_id=t.owner_user_id;

update public.reminders r
set team_id=t.id, created_by=coalesce(r.created_by,r.user_id), assigned_to=coalesce(r.assigned_to,r.user_id), visibility=coalesce(r.visibility,'Team')
from public.teams t
where r.team_id is null and r.user_id=t.owner_user_id;

-- RLS for team tables.
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "teams select" on public.teams;
drop policy if exists "teams insert" on public.teams;
drop policy if exists "teams update" on public.teams;
drop policy if exists "teams delete" on public.teams;

create policy "teams select" on public.teams for select
using (id=public.current_team_id() or owner_user_id=auth.uid());
create policy "teams insert" on public.teams for insert
with check (owner_user_id=auth.uid());
create policy "teams update" on public.teams for update
using (owner_user_id=auth.uid() or public.can_manage_team())
with check (owner_user_id=auth.uid() or public.can_manage_team());
create policy "teams delete" on public.teams for delete
using (owner_user_id=auth.uid());

drop policy if exists "team members select" on public.team_members;
drop policy if exists "team members insert" on public.team_members;
drop policy if exists "team members update" on public.team_members;
drop policy if exists "team members delete" on public.team_members;

create policy "team members select" on public.team_members for select
using (team_id=public.current_team_id() or lower(email)=lower(coalesce(auth.jwt()->>'email','')));
create policy "team members insert" on public.team_members for insert
with check (team_id=public.current_team_id() and public.can_manage_team());
create policy "team members update" on public.team_members for update
using (team_id=public.current_team_id() and public.can_manage_team())
with check (team_id=public.current_team_id() and public.can_manage_team());
create policy "team members delete" on public.team_members for delete
using (team_id=public.current_team_id() and public.can_manage_team());

drop policy if exists "audit select" on public.audit_logs;
drop policy if exists "audit insert" on public.audit_logs;
create policy "audit select" on public.audit_logs for select
using (team_id=public.current_team_id() and public.can_manage_team());
create policy "audit insert" on public.audit_logs for insert
with check (team_id=public.current_team_id() or team_id is null);

-- Team-aware policies for core tables.
-- Existing policies are left in place for compatibility. These add team access.
drop policy if exists "team owner properties select" on public.owner_properties;
drop policy if exists "team owner properties insert" on public.owner_properties;
drop policy if exists "team owner properties update" on public.owner_properties;
drop policy if exists "team owner properties delete" on public.owner_properties;
create policy "team owner properties select" on public.owner_properties for select
using (team_id=public.current_team_id() and (public.can_view_team_all() or assigned_to=auth.uid() or created_by=auth.uid() or visibility in ('Team','Company')));
create policy "team owner properties insert" on public.owner_properties for insert
with check (team_id=public.current_team_id());
create policy "team owner properties update" on public.owner_properties for update
using (team_id=public.current_team_id() and (public.can_manage_team() or assigned_to=auth.uid() or created_by=auth.uid()))
with check (team_id=public.current_team_id());
create policy "team owner properties delete" on public.owner_properties for delete
using (team_id=public.current_team_id() and public.can_manage_team());

drop policy if exists "team client requests select" on public.client_requests;
drop policy if exists "team client requests insert" on public.client_requests;
drop policy if exists "team client requests update" on public.client_requests;
drop policy if exists "team client requests delete" on public.client_requests;
create policy "team client requests select" on public.client_requests for select
using (team_id=public.current_team_id() and (public.can_view_team_all() or assigned_to=auth.uid() or created_by=auth.uid() or visibility in ('Team','Company')));
create policy "team client requests insert" on public.client_requests for insert
with check (team_id=public.current_team_id());
create policy "team client requests update" on public.client_requests for update
using (team_id=public.current_team_id() and (public.can_manage_team() or assigned_to=auth.uid() or created_by=auth.uid()))
with check (team_id=public.current_team_id());
create policy "team client requests delete" on public.client_requests for delete
using (team_id=public.current_team_id() and public.can_manage_team());

drop policy if exists "team contacts select" on public.contacts;
drop policy if exists "team contacts insert" on public.contacts;
drop policy if exists "team contacts update" on public.contacts;
drop policy if exists "team contacts delete" on public.contacts;
create policy "team contacts select" on public.contacts for select
using (team_id=public.current_team_id() and (public.can_view_team_all() or assigned_to=auth.uid() or created_by=auth.uid() or visibility in ('Team','Company')));
create policy "team contacts insert" on public.contacts for insert
with check (team_id=public.current_team_id());
create policy "team contacts update" on public.contacts for update
using (team_id=public.current_team_id() and (public.can_manage_team() or assigned_to=auth.uid() or created_by=auth.uid()))
with check (team_id=public.current_team_id());
create policy "team contacts delete" on public.contacts for delete
using (team_id=public.current_team_id() and public.can_manage_team());
