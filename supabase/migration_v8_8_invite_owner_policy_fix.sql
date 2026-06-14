-- Lists Manager V8.8 Invite Owner Policy Fix
-- Use this if Generate Invite Link is still blocked after V8.5/V8.7.
-- Safe: does not delete data.

alter table public.team_invites enable row level security;

-- Remove older invite policies so they do not confuse testing.
drop policy if exists "team invites insert" on public.team_invites;
drop policy if exists "team invites select" on public.team_invites;
drop policy if exists "team invites update" on public.team_invites;
drop policy if exists "team invites delete" on public.team_invites;

-- Owner / Manager can create invite links.
-- This checks the teams table directly, so it still works even when current_team_id() is not ready.
create policy "team invites insert"
on public.team_invites
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1 from public.teams t
      where t.id = team_invites.team_id
        and t.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_invites.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
        and tm.role in ('Owner','Manager')
    )
  )
);

-- Team managers can see their invites. Active invites are also readable for invite acceptance.
create policy "team invites select"
on public.team_invites
for select
using (
  status = 'active'
  or exists (
    select 1 from public.teams t
    where t.id = team_invites.team_id
      and t.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('Owner','Manager')
  )
);

create policy "team invites update"
on public.team_invites
for update
using (
  exists (
    select 1 from public.teams t
    where t.id = team_invites.team_id
      and t.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('Owner','Manager')
  )
)
with check (true);

create policy "team invites delete"
on public.team_invites
for delete
using (
  exists (
    select 1 from public.teams t
    where t.id = team_invites.team_id
      and t.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('Owner','Manager')
  )
);

notify pgrst, 'reload schema';
