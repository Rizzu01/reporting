# Worklog cloud sync setup

The app now stores tasks in Supabase so the same account can access them from different devices. OpenAI is not used by the app.

## 1. Create a Supabase project

Create a project at Supabase and open its SQL Editor.

## 2. Create the database tables

Copy and run the complete SQL from `supabase/schema.sql`.

This creates:

- `tasks` — date-based work entries
- `work_reports` — saved ChatGPT-generated reports
- Row Level Security policies so users only access their own records

## 3. Enable email/password authentication

In Supabase, open Authentication settings and keep Email enabled. If you want users to sign in immediately after signup, you can disable email confirmation; otherwise the user must confirm the signup email first.

## 4. Add Vercel environment variables

In the Vercel project, add these variables for Production, Preview and Development:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the project URL and the browser-safe publishable/anon key from Supabase. Never put a `service_role` key in the browser or in these variables.

## 5. Redeploy

Redeploy the Vercel project after adding the variables.

## 6. Sign in on each device

Use the same Worklog email/password on your desktop, laptop and phone. Tasks are then stored in the cloud and synchronized back into the app.

The app keeps the existing localStorage cache for fast UI loading and first-time migration, but Supabase is the shared source across devices.
