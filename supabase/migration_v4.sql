-- Property Wanted CRM Route A V4 Migration
-- Safe migration: adds Contact Database / Marketing List.
-- It does not drop existing tables or delete existing data.
-- Run this after migration_v2.sql and migration_v3.sql.

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  phone text,
  whatsapp text,
  email text,

  contact_type text default 'Buyer',
  source text default 'Manual',
  status text default 'Active',

  marketing_consent boolean default false,
  opt_out boolean default false,
  consent_date date,

  interested_area text,
  interested_property_type text,
  property_category text,
  budget_min numeric default 0,
  budget_max numeric default 0,

  tags text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,

  related_request_id uuid,
  related_owner_listing_id uuid,
  related_agent_listing_id uuid,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.client_requests
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

alter table public.owner_properties
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

alter table public.agent_listings
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

create index if not exists contacts_user_created_idx on public.contacts(user_id, created_at desc);
create index if not exists contacts_user_phone_idx on public.contacts(user_id, phone);
create index if not exists contacts_user_whatsapp_idx on public.contacts(user_id, whatsapp);
create index if not exists contacts_user_type_status_idx on public.contacts(user_id, contact_type, status);
create index if not exists contacts_user_next_followup_idx on public.contacts(user_id, next_follow_up_at);

alter table public.contacts enable row level security;

drop policy if exists "contacts select" on public.contacts;
drop policy if exists "contacts insert" on public.contacts;
drop policy if exists "contacts update" on public.contacts;
drop policy if exists "contacts delete" on public.contacts;

create policy "contacts select"
on public.contacts for select
using (auth.uid() = user_id and not public.is_co_agent_user());

create policy "contacts insert"
on public.contacts for insert
with check (auth.uid() = user_id and not public.is_co_agent_user());

create policy "contacts update"
on public.contacts for update
using (auth.uid() = user_id and not public.is_co_agent_user())
with check (auth.uid() = user_id and not public.is_co_agent_user());

create policy "contacts delete"
on public.contacts for delete
using (auth.uid() = user_id and not public.is_co_agent_user());
