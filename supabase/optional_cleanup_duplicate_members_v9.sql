-- Optional: clean duplicated memberships after V9.
-- Edit the emails before running if needed.
-- This does not delete listing data.

with main_team as (
  select tm.team_id
  from public.team_members tm
  where lower(tm.email) = 'tingsook7401@gmail.com'
    and exists (
      select 1
      from public.team_members owner_tm
      where owner_tm.team_id = tm.team_id
        and lower(owner_tm.email) = 'negjacky@gmail.com'
    )
  order by tm.created_at desc
  limit 1
)
update public.team_members
set status = 'inactive'
where lower(email) = 'tingsook7401@gmail.com'
  and team_id <> (select team_id from main_team);

with main_team as (
  select tm.team_id
  from public.team_members tm
  where lower(tm.email) = 'tingsook7401@gmail.com'
    and exists (
      select 1
      from public.team_members owner_tm
      where owner_tm.team_id = tm.team_id
        and lower(owner_tm.email) = 'negjacky@gmail.com'
    )
  order by tm.created_at desc
  limit 1
)
update public.team_members
set role = 'Co-Agent', status = 'active'
where lower(email) = 'tingsook7401@gmail.com'
  and team_id = (select team_id from main_team);

notify pgrst, 'reload schema';
