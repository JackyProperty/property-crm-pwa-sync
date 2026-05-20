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
