-- Lists Manager V8.7 Invite Link RLS Fix
-- Run this if Generate Invite Link says RLS blocked.
-- It does not delete data.

alter table public.team_invites enable row level security;

drop policy if exists "team invites insert" on public.team_invites;

create policy "team invites insert"
on public.team_invites
for insert
with check (
  (
    team_id = public.current_team_id()
    and public.can_manage_team()
  )
  or
  exists (
    select 1
    from public.teams t
    where t.id = team_invites.team_id
      and t.owner_user_id = auth.uid()
  )
);

drop policy if exists "team invites select" on public.team_invites;

create policy "team invites select"
on public.team_invites
for select
using (
  team_id = public.current_team_id()
  or status = 'active'
);
