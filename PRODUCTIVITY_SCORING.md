# Call productivity scoring

The overall KPI remains out of 100: Productivity 20, Feedback 20, Attendance 20,
Lateness 10, Away 10, and QA 20.

Productivity % = (inbound handling time + outbound handling time) / logged-in time × 100.
Productivity points = agent productivity % / highest productivity % among matched
agents on the KPI roster in the current upload × 20, rounded to two decimals.
All-zero activity earns zero points. Missing call details or zero logged-in time
leaves the final KPI unscored and requires review. The benchmark is recalculated
when the roster changes, so this is a relative score rather than a fixed target.

Calls handled = inbound answered + outbound connected. Calls/hour divides that
total by logged-in hours. Both are visible for context and do not add points.
The combined Top 3 Overall Agents panel ranks by final KPI and shows calls
handled, productivity %, productivity points, QA and Away alongside one overall
score out of 100. Productivity is already included in that score. The existing
overall/new-agent ranking rules are retained.

Feedback awards 20 points when there are no complaints or at least three
compliments per complaint; otherwise zero, and the existing complaint failure
rule applies. Attendance remains 20 points under the existing attendance rule.
Lateness remains 10 points for three or fewer late occurrences, otherwise zero.
Away for Non Voice Yes remains a fixed 8 points, now out of 10. For Non Voice No,
Away points = 10 × (1 − min(Away %, 20%) / 20%). QA contributes QA % × 20 / 100;
there is no separate QA-below-85 automatic failure. The overall pass mark is 85.

Upload a workbook containing a KPI worksheet (identified by Working Days) and
call details with Agent, Total Inbound Calls Answered, Total Outbound Calls
Connected, both Total Calls Handling Time columns, Total Away Time and Total
Logged-In Time. Numeric durations in the telephony export are seconds; text
HH:MM:SS is supported. The call export supplies the matching time values used by
both productivity and away calculations. Join by case-insensitive, trimmed
agent name, preserving internal word boundaries. Column B is not used for joins
or scoring. Unnamed totals and agents outside the KPI roster are excluded.
Duplicate call-detail names and invalid numeric durations stop the import.
Existing saved rows are retained; rows without the new activity inputs need a
fresh upload before they can receive a new final score.

This measure captures time spent handling calls. Longer calls increase it; it
does not establish call quality or account for unrecorded non-voice work.

Validation: `npm run lint`, `npm run build`, and
`node scripts/verify-productivity.cjs /absolute/path/to/Test_Sept.xlsx`.
The September fixture has 36 KPI agents and 40 call-detail agents. Expected
productivity leaders: Sariza, Norah, Wang Delona. Sariza has 712 handled calls,
24.2442099387% productivity, 20 productivity points and 88.33 final KPI points.
