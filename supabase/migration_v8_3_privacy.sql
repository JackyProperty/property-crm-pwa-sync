-- Property Wanted CRM V8.3 Privacy Columns Safe Migration
-- This makes owner contact fields nullable in case old schema had NOT NULL.
-- It does not delete data.

alter table public.owner_properties
  alter column owner_name drop not null;

-- client phone/whatsapp are kept as columns for compatibility, but the App no longer shows/saves them.
