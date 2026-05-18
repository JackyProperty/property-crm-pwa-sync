-- Property Wanted CRM Supabase Schema
-- Run this in Supabase SQL Editor.
-- This schema enables per-user data isolation using Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.owner_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_name text not null,
  owner_phone text,
  owner_whatsapp text,
  title text not null,
  listing_type text not null check (listing_type in ('Sell', 'Rent')),
  property_type text not null,
  area text not null,
  city text default 'Ipoh',
  state text default 'Perak',
  price numeric default 0,
  min_price numeric default 0,
  bedrooms integer default 0,
  bathrooms integer default 0,
  built_up numeric default 0,
  land_size numeric default 0,
  furnishing text,
  tenure text,
  status text default 'Active',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.agent_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null,
  agent_phone text,
  agent_whatsapp text,
  agency text,
  title text not null,
  listing_type text not null check (listing_type in ('Sell', 'Rent')),
  property_type text not null,
  area text not null,
  city text default 'Ipoh',
  state text default 'Perak',
  price numeric default 0,
  min_price numeric default 0,
  bedrooms integer default 0,
  bathrooms integer default 0,
  built_up numeric default 0,
  land_size numeric default 0,
  furnishing text,
  tenure text,
  commission_sharing text,
  status text default 'Active',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_phone text,
  client_whatsapp text,
  request_type text not null check (request_type in ('Buy', 'Rent')),
  property_type text not null,
  preferred_area text not null,
  city text default 'Ipoh',
  state text default 'Perak',
  min_budget numeric default 0,
  max_budget numeric default 0,
  min_bedrooms integer default 0,
  min_bathrooms integer default 0,
  min_built_up numeric default 0,
  purpose text,
  financing text,
  urgency text,
  status text default 'New',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  property_title text,
  type text default 'Call',
  follow_up_date date default current_date,
  status text default 'Pending',
  notes text,
  created_at timestamptz default now()
);

alter table public.owner_properties enable row level security;
alter table public.agent_listings enable row level security;
alter table public.client_requests enable row level security;
alter table public.follow_ups enable row level security;

drop policy if exists "Users can read own owner properties" on public.owner_properties;
drop policy if exists "Users can insert own owner properties" on public.owner_properties;
drop policy if exists "Users can update own owner properties" on public.owner_properties;
drop policy if exists "Users can delete own owner properties" on public.owner_properties;

create policy "Users can read own owner properties"
on public.owner_properties for select
using (auth.uid() = user_id);

create policy "Users can insert own owner properties"
on public.owner_properties for insert
with check (auth.uid() = user_id);

create policy "Users can update own owner properties"
on public.owner_properties for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own owner properties"
on public.owner_properties for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own agent listings" on public.agent_listings;
drop policy if exists "Users can insert own agent listings" on public.agent_listings;
drop policy if exists "Users can update own agent listings" on public.agent_listings;
drop policy if exists "Users can delete own agent listings" on public.agent_listings;

create policy "Users can read own agent listings"
on public.agent_listings for select
using (auth.uid() = user_id);

create policy "Users can insert own agent listings"
on public.agent_listings for insert
with check (auth.uid() = user_id);

create policy "Users can update own agent listings"
on public.agent_listings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own agent listings"
on public.agent_listings for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own client requests" on public.client_requests;
drop policy if exists "Users can insert own client requests" on public.client_requests;
drop policy if exists "Users can update own client requests" on public.client_requests;
drop policy if exists "Users can delete own client requests" on public.client_requests;

create policy "Users can read own client requests"
on public.client_requests for select
using (auth.uid() = user_id);

create policy "Users can insert own client requests"
on public.client_requests for insert
with check (auth.uid() = user_id);

create policy "Users can update own client requests"
on public.client_requests for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own client requests"
on public.client_requests for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own follow ups" on public.follow_ups;
drop policy if exists "Users can insert own follow ups" on public.follow_ups;
drop policy if exists "Users can update own follow ups" on public.follow_ups;
drop policy if exists "Users can delete own follow ups" on public.follow_ups;

create policy "Users can read own follow ups"
on public.follow_ups for select
using (auth.uid() = user_id);

create policy "Users can insert own follow ups"
on public.follow_ups for insert
with check (auth.uid() = user_id);

create policy "Users can update own follow ups"
on public.follow_ups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own follow ups"
on public.follow_ups for delete
using (auth.uid() = user_id);

create index if not exists owner_properties_user_created_idx on public.owner_properties(user_id, created_at desc);
create index if not exists agent_listings_user_created_idx on public.agent_listings(user_id, created_at desc);
create index if not exists client_requests_user_created_idx on public.client_requests(user_id, created_at desc);
create index if not exists follow_ups_user_created_idx on public.follow_ups(user_id, created_at desc);
