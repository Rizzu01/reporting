# Worklog — Daily Reporting

A lightweight Next.js MVP for recording daily work and turning saved entries into weekly/monthly manager reports.

## MVP

- Date-based work entry with title, details, status and tags
- Local-first persistence with browser storage
- Daily activity view and weekly/monthly counts
- CSV export for weekly or monthly mailing
- Print-to-PDF workflow for polished reports
- Optional AI-generated daily remarks
- Optional AI-generated weekly summary

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### AI setup

Copy `.env.example` to `.env.local` and add an OpenAI API key. AI calls are server-side through `/api/ai`; the key is never exposed to the browser.

## Next production step

The MVP intentionally uses localStorage so the workflow can be tested immediately. For multi-device reliability, replace the storage layer with PostgreSQL + Prisma (or Supabase) and add authentication. Keep the UI contract the same: entries are keyed by date, reports query a date range, and AI receives only the selected entries.
