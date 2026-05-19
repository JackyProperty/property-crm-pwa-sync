-- Property Wanted CRM Route A V2 Migration
-- Safe migration: does not drop existing tables or delete existing data.
-- Run this in Supabase SQL Editor after backing up your database.

create extension if not exists pgcrypto;

alter table public.agent_listings add column if not exists shared_to_user_id uuid references auth.users(id) on delete cascade, add column if not exists agent_email text;
alter table public.client_requests add column if not exists last_contacted_at timestamptz, add column if not exists source_channel text default 'Manual';

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  property_title text,
  appointment_date date not null default current_date,
  appointment_time time not null default '10:00',
  type text default 'Viewing',
  status text default 'Scheduled',
  location text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  client_name text,
  related_name text,
  reminder_type text default 'Client Follow Up',
  remind_at timestamptz not null,
  status text default 'Pending',
  notes text,
  notification_sent boolean default false,
  local_notified boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agent_group_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  member_name text,
  member_email text not null,
  member_phone text,
  member_whatsapp text,
  agency text,
  area_focus text,
  status text default 'active',
  created_at timestamptz default now()
);

create index if not exists appointments_user_date_idx on public.appointments(user_id, appointment_date);
create index if not exists reminders_user_due_idx on public.reminders(user_id, remind_at, status);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists agent_group_owner_idx on public.agent_group_members(owner_user_id);
create index if not exists agent_group_email_idx on public.agent_group_members(lower(member_email));
create index if not exists agent_listings_shared_to_idx on public.agent_listings(shared_to_user_id);

create or replace function public.is_co_agent_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agent_group_members m
    where m.status = 'active'
      and (m.member_user_id = auth.uid() or lower(m.member_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

alter table public.owner_properties enable row level security;
alter table public.agent_listings enable row level security;
alter table public.client_requests enable row level security;
alter table public.follow_ups enable row level security;
alter table public.appointments enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.agent_group_members enable row level security;

-- Owner properties: admin only, co-agents cannot access.
drop policy if exists "Users can read own owner properties" on public.owner_properties;
drop policy if exists "Users can insert own owner properties" on public.owner_properties;
drop policy if exists "Users can update own owner properties" on public.owner_properties;
drop policy if exists "Users can delete own owner properties" on public.owner_properties;
drop policy if exists "admin owner properties select" on public.owner_properties;
drop policy if exists "admin owner properties insert" on public.owner_properties;
drop policy if exists "admin owner properties update" on public.owner_properties;
drop policy if exists "admin owner properties delete" on public.owner_properties;
create policy "admin owner properties select" on public.owner_properties for select using (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin owner properties insert" on public.owner_properties for insert with check (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin owner properties update" on public.owner_properties for update using (auth.uid() = user_id and not public.is_co_agent_user()) with check (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin owner properties delete" on public.owner_properties for delete using (auth.uid() = user_id and not public.is_co_agent_user());

-- Agent listings: admin sees own + shared_to_user_id; co-agent can only insert/select/update/delete own listing shared to the inviting admin.
drop policy if exists "Users can read own agent listings" on public.agent_listings;
drop policy if exists "Users can insert own agent listings" on public.agent_listings;
drop policy if exists "Users can update own agent listings" on public.agent_listings;
drop policy if exists "Users can delete own agent listings" on public.agent_listings;
drop policy if exists "agent listings select v2" on public.agent_listings;
drop policy if exists "agent listings insert v2" on public.agent_listings;
drop policy if exists "agent listings update v2" on public.agent_listings;
drop policy if exists "agent listings delete v2" on public.agent_listings;
create policy "agent listings select v2" on public.agent_listings for select using (user_id = auth.uid() or shared_to_user_id = auth.uid());
create policy "agent listings insert v2" on public.agent_listings for insert with check (
  user_id = auth.uid() and (
    (not public.is_co_agent_user()) or exists (
      select 1 from public.agent_group_members m
      where m.status = 'active' and m.owner_user_id = shared_to_user_id
      and (m.member_user_id = auth.uid() or lower(m.member_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  )
);
create policy "agent listings update v2" on public.agent_listings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "agent listings delete v2" on public.agent_listings for delete using (user_id = auth.uid());

-- Admin-only tables for client data.
do $$
begin
  execute 'drop policy if exists "Users can read own client requests" on public.client_requests';
  execute 'drop policy if exists "Users can insert own client requests" on public.client_requests';
  execute 'drop policy if exists "Users can update own client requests" on public.client_requests';
  execute 'drop policy if exists "Users can delete own client requests" on public.client_requests';
end $$;
drop policy if exists "admin client requests select" on public.client_requests;
drop policy if exists "admin client requests insert" on public.client_requests;
drop policy if exists "admin client requests update" on public.client_requests;
drop policy if exists "admin client requests delete" on public.client_requests;
create policy "admin client requests select" on public.client_requests for select using (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin client requests insert" on public.client_requests for insert with check (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin client requests update" on public.client_requests for update using (auth.uid() = user_id and not public.is_co_agent_user()) with check (auth.uid() = user_id and not public.is_co_agent_user());
create policy "admin client requests delete" on public.client_requests for delete using (auth.uid() = user_id and not public.is_co_agent_user());

-- Follow ups, appointments, reminders: admin only.
drop policy if exists "appointments select" on public.appointments;
create policy "appointments select" on public.appointments for select using (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "appointments insert" on public.appointments;
create policy "appointments insert" on public.appointments for insert with check (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "appointments update" on public.appointments;
create policy "appointments update" on public.appointments for update using (auth.uid() = user_id and not public.is_co_agent_user()) with check (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "appointments delete" on public.appointments;
create policy "appointments delete" on public.appointments for delete using (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "reminders select" on public.reminders;
create policy "reminders select" on public.reminders for select using (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "reminders insert" on public.reminders;
create policy "reminders insert" on public.reminders for insert with check (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "reminders update" on public.reminders;
create policy "reminders update" on public.reminders for update using (auth.uid() = user_id and not public.is_co_agent_user()) with check (auth.uid() = user_id and not public.is_co_agent_user());
drop policy if exists "reminders delete" on public.reminders;
create policy "reminders delete" on public.reminders for delete using (auth.uid() = user_id and not public.is_co_agent_user());

-- Push subscriptions: each user owns their device subscription.
drop policy if exists "push subscriptions select" on public.push_subscriptions;
create policy "push subscriptions select" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push subscriptions insert" on public.push_subscriptions;
create policy "push subscriptions insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push subscriptions update" on public.push_subscriptions;
create policy "push subscriptions update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push subscriptions delete" on public.push_subscriptions;
create policy "push subscriptions delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- Agent group members: admin manages, invited agent can read own invitation.
drop policy if exists "agent members owner select" on public.agent_group_members;
drop policy if exists "agent members owner insert" on public.agent_group_members;
drop policy if exists "agent members owner update" on public.agent_group_members;
drop policy if exists "agent members owner delete" on public.agent_group_members;
create policy "agent members owner select" on public.agent_group_members for select using (owner_user_id = auth.uid() or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "agent members owner insert" on public.agent_group_members for insert with check (owner_user_id = auth.uid() and not public.is_co_agent_user());
create policy "agent members owner update" on public.agent_group_members for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "agent members owner delete" on public.agent_group_members for delete using (owner_user_id = auth.uid());
