# Property Wanted CRM - PWA + Cloud Sync Version

This version can be installed on mobile and desktop as a PWA, and can sync data across devices using Supabase.

## Features

- Owner / Property Database
- Other Agent Listing Details
- Buyer / Client Request Database
- Buyer Matching for both owner listings and other agent listings
- Follow Up CRM
- WhatsApp quick contact
- Email/password login
- Supabase cloud sync
- Row Level Security so each logged-in user only sees their own data
- PWA install support for mobile and desktop

## 1. Create Supabase project

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Project Settings > API.
5. Copy:
   - Project URL
   - anon public key

## 2. Setup environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## 4. Build for production

```bash
npm run build
npm run preview
```

## 5. Deploy

Recommended simple hosting:

- Vercel
- Netlify
- Cloudflare Pages

Add the same environment variables in your hosting provider:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 6. Install on phone

After deploying to HTTPS:

### Android

1. Open the app URL in Chrome.
2. Tap the three-dot menu.
3. Tap "Install app" or "Add to Home screen".

### iPhone

1. Open the app URL in Safari.
2. Tap the Share button.
3. Tap "Add to Home Screen".

## 7. Install on computer

1. Open the app URL in Chrome or Microsoft Edge.
2. Click the install icon in the address bar.
3. Confirm install.

## Important

If Supabase environment variables are not set, the app will run in local demo mode only. Local demo mode does not sync across devices.
