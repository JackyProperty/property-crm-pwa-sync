-- Property Wanted CRM Route A V6 Migration
-- Safe migration: adds area/size unit columns.
-- Run this after migration_v3.sql, migration_v4.sql, and before using V6 area units.
-- It does not drop tables and does not delete existing data.

alter table public.owner_properties
  add column if not exists built_up_unit text default 'sqft',
  add column if not exists land_size_unit text default 'sqft';

alter table public.agent_listings
  add column if not exists built_up_unit text default 'sqft',
  add column if not exists land_size_unit text default 'sqft';

alter table public.new_project_listings
  add column if not exists built_up_unit text default 'sqft',
  add column if not exists land_size_unit text default 'sqft';

alter table public.client_requests
  add column if not exists min_built_up_unit text default 'sqft';

-- Optional backfill for older records
update public.owner_properties set built_up_unit = coalesce(built_up_unit, 'sqft'), land_size_unit = coalesce(land_size_unit, 'sqft');
update public.agent_listings set built_up_unit = coalesce(built_up_unit, 'sqft'), land_size_unit = coalesce(land_size_unit, 'sqft');
update public.new_project_listings set built_up_unit = coalesce(built_up_unit, 'sqft'), land_size_unit = coalesce(land_size_unit, 'sqft');
update public.client_requests set min_built_up_unit = coalesce(min_built_up_unit, 'sqft');
