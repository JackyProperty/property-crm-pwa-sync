-- Lists Manager V9 Invite Accept Fix
-- Safe migration: fixes invite accept flow so invited users join the inviter's team
-- with the invited role instead of becoming Owner of their own default team.
-- This does not delete listing data.

create extension if not exists pgcrypto;

alter table public.team_invites enable row level security;
alter table public.team_members enable row level security;

alter table public.team_members
  add column if not exists invite_token text;

create or replace function public.accept_team_invite(invite_token text)
returns table (
  member_id uuid,
  team_id uuid,
  role text,
  email text,
  name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_inv public.team_invites%rowtype;
  v_member public.team_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if invite_token is null or length(invite_token) = 0 then
    raise exception 'This invite link is invalid or expired.';
  end if;

  select *
  into v_inv
  from public.team_invites
  where token = invite_token
    and status = 'active'
  limit 1;

  if not found then
    raise exception 'This invite link is invalid or expired.';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'This invite link is invalid or expired.';
  end if;

  if v_inv.email is not null and lower(v_inv.email) <> v_email then
    raise exception 'This invite link is for a different email address.';
  end if;

  update public.team_members
  set status = 'inactive'
  where (user_id = v_user_id or lower(email) = v_email)
    and team_id <> v_inv.team_id;

  update public.team_members
  set
    user_id = v_user_id,
    email = v_email,
    name = coalesce(nullif(v_inv.name,''), name, v_email),
    phone = coalesce(v_inv.phone, phone),
    whatsapp = coalesce(v_inv.whatsapp, whatsapp),
    role = coalesce(nullif(v_inv.role,''), 'Co-Agent'),
    status = 'active',
    invite_token = v_inv.token
  where team_id = v_inv.team_id
    and (user_id = v_user_id or lower(email) = v_email)
  returning * into v_member;

  if not found then
    insert into public.team_members (
      team_id,
      user_id,
      email,
      name,
      phone,
      whatsapp,
      role,
      status,
      invite_token
    )
    values (
      v_inv.team_id,
      v_user_id,
      v_email,
      coalesce(nullif(v_inv.name,''), v_email),
      coalesce(v_inv.phone, ''),
      coalesce(v_inv.whatsapp, ''),
      coalesce(nullif(v_inv.role,''), 'Co-Agent'),
      'active',
      v_inv.token
    )
    returning * into v_member;
  end if;

  update public.team_invites
  set
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = now()
  where id = v_inv.id;

  return query
  select
    v_member.id,
    v_member.team_id,
    v_member.role,
    v_member.email,
    v_member.name,
    v_member.status;
end;
$$;

revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.accept_team_invite(text) to authenticated;

drop policy if exists "team invites select" on public.team_invites;
create policy "team invites select"
on public.team_invites
for select
using (
  status = 'active'
  or exists (
    select 1
    from public.teams t
    where t.id = team_invites.team_id
      and t.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('Owner','Manager')
  )
);

drop policy if exists "team invites insert" on public.team_invites;
create policy "team invites insert"
on public.team_invites
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.teams t
      where t.id = team_invites.team_id
        and t.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_invites.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
        and tm.role in ('Owner','Manager')
    )
  )
);

drop policy if exists "team members select" on public.team_members;
create policy "team members select"
on public.team_members
for select
using (
  team_id = public.current_team_id()
  or user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
);

notify pgrst, 'reload schema';
