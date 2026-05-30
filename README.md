# Property Wanted CRM V4 - Contact Database Upgrade

This is a safe upgrade over V3.

## New in V4

- Contact Database / Marketing List
- Save Owner contact into Contact Database
- Archive Buyer Request + Save Contact
- Duplicate phone indicator
- Marketing Consent / Opt Out tracking
- Contact tags and notes
- Contact follow up date
- WhatsApp shortcut from contacts
- Excel Export now includes Contacts

## Existing V3 features kept

- Owner Listings
- Buyer Requests
- New Project Listings
- Other Agent Listings
- Agent Sharing Group
- Buyer Matching
- Appointment Calendar
- Reminder + Push Notification
- Excel Export
- Report Dashboard

## Database upgrade

Run this file in Supabase SQL Editor:

```text
supabase/migration_v4.sql
```

This migration creates a new `contacts` table and adds optional `contact_id` columns.

It does not drop tables and does not delete existing data.

## Upgrade order

1. Backup Supabase database.
2. Run `supabase/migration_v4.sql` in Supabase SQL Editor.
3. Upload this V4 project to GitHub, replacing the old project files.
4. Wait for Vercel redeploy.
5. Open the app and clear site data/service worker if the old PWA cache appears.
6. Login and test Contact Database.

## Push Notification note

This package includes the latest `send-test-push` Edge Function code with CORS and stable token verification.

For `send-test-push`:
- Verify JWT with legacy secret: OFF

For `send-due-reminders`:
- Verify JWT with legacy secret: OFF
- Protect with CRON_SECRET


## V4.1 owner listing save fix

This package fixes an Owner Listing save issue where agent-only fields were accidentally sent to the `owner_properties` table, causing Supabase to return HTTP 400.
No database migration is needed for this fix if you already ran `migration_v3.sql` and `migration_v4.sql`.


## V5 Edit Feature Upgrade

This version adds Edit buttons and an Edit Record modal for:

- Owner Listings
- Other Agent / Shared Listings
- Buyer Requests
- New Project Listings
- Appointment Calendar records
- Reminder records
- Contact Database records
- Co-Agent Members

No new Supabase migration is required if `migration_v3.sql` and `migration_v4.sql` were already executed.
Upload this package to GitHub, wait for Vercel redeploy, then clear old PWA cache if needed.


## V6 Area Units Upgrade

This version adds area unit support.

Supported units:
- sqft
- sqm
- acre
- hectare

Added to:
- Owner Listings: built-up unit, land size unit
- Other Agent / Shared Listings: built-up unit, land size unit
- New Project Listings: built-up unit, land size unit
- Buyer Requests: minimum built-up unit
- Edit modal: all unit fields can be edited
- Buyer Matching: built-up matching converts units to square feet before comparing

Database migration required:
```text
supabase/migration_v6_units.sql
```

Run this migration in Supabase SQL Editor before using the new version.


## V7 Added
- PropertyGuru-style dropdowns for owner/agent listings
- Property sub type / unit type
- Facilities and unit features
- Title type, direction, availability, lease term
- Area units and dimension units
- Condition, electricity and lift fields
- Migration file: supabase/migration_v7_propertyguru.sql
