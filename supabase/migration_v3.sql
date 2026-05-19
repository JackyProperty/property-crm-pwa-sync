-- Property Wanted CRM Route A V3 Migration
-- Safe migration: adds property title/category/lot type/tenure fields and new project listings.
-- Does not drop existing tables or delete existing data.

create extension if not exists pgcrypto;

alter table public.owner_properties
  add column if not exists property_category text default 'Residential',
  add column if not exists lot_type text default 'Intermediate';

alter table public.agent_listings
  add column if not exists property_category text default 'Residential',
  add column if not exists lot_type text default 'Intermediate';

alter table public.client_requests
  add column if not exists property_title text,
  add column if not exists property_category text default 'Residential',
  add column if not exists tenure text,
  add column if not exists lot_type text default 'Not Applicable';

create table if not exists public.new_project_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  developer_name text,
  project_name text not null,
  title text not null,
  listing_type text default 'Sell',
  property_category text default 'Residential',
  property_type text default 'New Project',
  lot_type text default 'Not Applicable',
  area text not null,
  city text default 'Ipoh',
  state text default 'Perak',
  price_from numeric default 0,
  price_to numeric default 0,
  bedrooms integer default 0,
  bathrooms integer default 0,
  built_up numeric default 0,
  land_size numeric default 0,
  tenure text default 'Freehold',
  completion_year text,
  package_details text,
  status text default 'Active',
  notes text,
  created_at timestamptz default now()
);

create index if not exists new_project_user_created_idx on public.new_project_listings(user_id, created_at desc);
create index if not exists new_project_area_idx on public.new_project_listings(user_id, area);

alter table public.new_project_listings enable row level security;

drop policy if exists "new project select" on public.new_project_listings;
drop policy if exists "new project insert" on public.new_project_listings;
drop policy if exists "new project update" on public.new_project_listings;
drop policy if exists "new project delete" on public.new_project_listings;

create policy "new project select"
on public.new_project_listings for select
using (auth.uid() = user_id and not public.is_co_agent_user());

create policy "new project insert"
on public.new_project_listings for insert
with check (auth.uid() = user_id and not public.is_co_agent_user());

create policy "new project update"
on public.new_project_listings for update
using (auth.uid() = user_id and not public.is_co_agent_user())
with check (auth.uid() = user_id and not public.is_co_agent_user());

create policy "new project delete"
on public.new_project_listings for delete
using (auth.uid() = user_id and not public.is_co_agent_user());
