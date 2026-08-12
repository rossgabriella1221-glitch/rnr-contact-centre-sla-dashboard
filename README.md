# RNR Contact Centre SLA Dashboard

Private Next.js dashboard for reviewing contact-centre SLA performance from operational Excel workbooks.

## Data rules

- Campaign: Column A
- Total Calls: Column C
- SLA source: Column Q (`% SLA`)
- Rows where Total Calls equals `0` are excluded completely
- Campaigns are sorted A–Z
- Default SLA benchmark is 80%

Duplicate campaign rows are combined. Total Calls are summed and SLA is calculated as a call-weighted average from Column Q.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL, anon/publishable key, and approved administrator email.
3. In Supabase Authentication, disable new-user signup and create the administrator user manually.
4. Run `npm install` and `npm run dev`.

## Required environment variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_EMAIL
```

Set all three for Development, Preview, and Production in Vercel. Never commit `.env.local`, passwords, service-role keys, Supabase secrets, or operational Excel files.

## Security model

There is no signup page or signup action. The Next.js proxy protects `/dashboard` before rendering, and the dashboard Server Component independently validates the current Supabase user and exact `ADMIN_EMAIL` allowlist. Unauthorized authenticated users are redirected to an access-denied page.

## Checks

```bash
npm run lint
npm run build
```
