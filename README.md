# Property Wanted CRM V2 - Route A PWA Upgrade

This is the improved Route A PWA version. It keeps your Supabase database and upgrades the app without deleting existing data.

## New features included

1. Appointment Calendar
2. Client Status Pipeline
3. Agent Sharing Group
4. Reminder Notification
5. Search Filter
6. Excel Export
7. Report Dashboard
8. Web Push Notification
9. Co-agent restricted permission: co-agents can only submit/manage their own shared listings

## Important database safety

Run `supabase/migration_v2.sql` in Supabase SQL Editor. It only adds new tables/columns and replaces RLS policies. It does not drop existing tables and does not delete existing data.

Recommended before upgrading:

1. Backup Supabase database.
2. Run `supabase/migration_v2.sql`.
3. Upload this project to GitHub.
4. Redeploy Vercel.

## Vercel environment variables

Add these in Vercel Project > Settings > Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-or-publishable-key
VITE_VAPID_PUBLIC_KEY=your-web-push-vapid-public-key
```

## Generate VAPID keys for push notification

Run:

```bash
npx web-push generate-vapid-keys
```

Copy the Public Key to Vercel as:

```env
VITE_VAPID_PUBLIC_KEY=PUBLIC_KEY_HERE
```

## Supabase Edge Function secrets

Set these in Supabase:

```bash
supabase secrets set VAPID_PUBLIC_KEY="your public key"
supabase secrets set VAPID_PRIVATE_KEY="your private key"
supabase secrets set VAPID_SUBJECT="mailto:your-email@example.com"
supabase secrets set CRON_SECRET="choose-a-long-random-secret"
```

Supabase provides these automatically to Edge Functions:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Deploy Edge Functions

```bash
supabase functions deploy send-due-reminders
supabase functions deploy send-test-push
```

## Schedule push reminders

Call the due-reminder function every 5 minutes using Supabase scheduled functions, GitHub Actions, EasyCron, or any cron service.

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-due-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Co-agent permission flow

1. Admin logs in.
2. Open Agent Sharing Group.
3. Add co-agent name and email.
4. Co-agent signs up or logs in using the same email.
5. Co-agent will only see Submit Listing and Install.
6. Co-agent cannot see owner listings, buyer requests, dashboard, calendar, reminders, matches, or export.

## iPhone PWA push notification

1. Deploy to HTTPS with Vercel.
2. Open the app URL in Safari.
3. Add to Home Screen.
4. Open the app from the Home Screen icon.
5. Login.
6. Go to Reminders + Push.
7. Tap Enable Push.
8. Tap Send Test Push.

## Vercel build settings

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

After changing Vercel environment variables, redeploy the project.
