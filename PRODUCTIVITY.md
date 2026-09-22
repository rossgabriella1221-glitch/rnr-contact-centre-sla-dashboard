# Agent productivity system

Open `/productivity` and sign in using the existing account. The SLA dashboard also links to Agent Productivity.

## Workflow

1. Upload the monthly Agent Call Summary `.xlsx` (maximum 5 MB).
2. Select the numeric duration unit. The supplied sample appears to use seconds.
3. Review the account count, call totals, warnings and report month.
4. Save. Replacing an existing month requires an explicit Replace month action. Existing workload inputs are retained for matching account identifiers; removed accounts lose their inputs.
5. Select any agent for a detailed breakdown. Add available working hours, credited non-voice minutes and optional QA.
6. Enter agreed standard minutes per inbound/outbound call for that monthly report to enable productivity calculations. Use comparable campaigns/work when applying shared standards.

The first visit starts empty: operational data is never shipped in the JavaScript bundle or repository. Upload the source file after signing in.

## Calculation

Productivity = (answered inbound × inbound standard minutes + connected outbound × outbound standard minutes + credited non-voice minutes) / (available hours × 60) × 100.

Available hours exclude approved leave, breaks, training and meetings. Non-voice work must stay in the denominator when credited in the numerator. Unknown inputs remain null; explicit zero non-voice minutes is allowed. QA is separate. Standards are not automatically inferred from observed handling time. Team productivity uses total earned workload / total available hours for accounts with complete inputs. Scores above 100% are allowed and no arbitrary pass/fail threshold is applied.

Inbound answer rate is answered / offered, not SLA within a threshold. Consultations are separate. Time states may overlap and are not summed as logged-in time. Team percentages and handling averages use matching aggregate numerators and denominators.

## Storage and access

`database/productivity-schema.sql` creates only `public.agent_productivity_reports`. RLS and every server query limit records to the current authenticated user's ID. Anonymous roles have no table privileges. There is no public signup added. This feature requires no service-role key. Files are parsed server-side; normalized data is saved in Supabase, not the original workbook.

The existing Supabase configuration is reused. Apply the schema in the project configured by `NEXT_PUBLIC_SUPABASE_URL`. Each user sees their own report history. No existing KPI or QA table is changed. Concurrent updates use `updated_at` to prevent silent overwrites; duplicate month inserts are constrained by `(owner_id, report_month)`.

## Verification

`npm run lint`, `npm run build`, `node tests/productivity.mjs`.

For reconciliation against the supplied workbook, run `node tests/productivity.mjs /absolute/path/to/AgentCallSummaryMonthly.xlsx`. The test contains no private agent data. Operational Excel files, local environment variables and Vercel linkage files are gitignored.
