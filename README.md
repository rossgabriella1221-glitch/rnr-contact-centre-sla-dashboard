# Connect Centre SLA Dashboard

Private Next.js dashboard for reviewing Connect Centre SLA performance from operational Excel workbooks.

## Excel input and scoring

- Agent Name: Column A
- Total Calls: Column B
- Complain: Column C
- Compliment: Column D
- Attendance: Column E (`Pass` or `Fail`)
- Rows where Total Calls equals `0` are excluded completely
- Agents are sorted A–Z
- Default SLA benchmark is 80%

The SLA score is the sum of three components:

- Total Calls: 20% for 500 or more, otherwise 10%
- Feedback: 30% when compliments are at least three times complaints; 20% when both are zero; otherwise 0%
- Attendance: 50% for Pass, 20% for Fail

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
SUPABASE_SERVICE_ROLE_KEY
```

Set all three for Development, Preview, and Production in Vercel. Never commit `.env.local`, passwords, service-role keys, Supabase secrets, or operational Excel files.

## Security model

There is no signup page or public signup action. The Next.js proxy and dashboard Server Component both require a fresh, server-validated Supabase user. The `ADMIN_EMAIL` account creates usernames through a server action backed by `SUPABASE_SERVICE_ROLE_KEY`; usernames are converted server-side to internal Supabase identifiers. The service key is server-only and must never use a `NEXT_PUBLIC_` prefix. Regular users may upload, view, export, and print. Only the administrator can change the SLA target or use Broadcast Mode.

## Checks

```bash
npm run lint
npm run build
```
