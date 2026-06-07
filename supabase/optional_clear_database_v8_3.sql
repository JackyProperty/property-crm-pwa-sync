-- Property Wanted CRM V8.3 OPTIONAL CLEAR DATABASE SCRIPT
-- WARNING: This deletes CRM records. It does NOT delete Supabase Auth users.
-- Run only if you are 100% sure you want to empty current CRM data.
-- Recommended: export/backup first.

begin;

delete from public.audit_logs;
delete from public.push_subscriptions;
delete from public.reminders;
delete from public.appointments;
delete from public.follow_ups;

delete from public.contacts;
delete from public.client_requests;
delete from public.owner_properties;
delete from public.agent_listings;
delete from public.new_project_listings;

delete from public.agent_group_members;
delete from public.team_members;
delete from public.teams;

commit;

-- After clearing, login to the App once.
-- The App will recreate a Default Team for your account.
