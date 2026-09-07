# Agent KPI Dashboard - QA + New Agent Update

Update the existing `rossgabriella1221-glitch/rnr-contact-centre-sla-dashboard` project from SLA terminology to Agent KPI terminology and support the revised KPI workbook.

## Excel columns
Use the uploaded workbook structure:
A Agent Name
B Call Details Name - KEEP, DISPLAY IF NEEDED, BUT IGNORE IN ALL SCORING
C Work Hours (1 day)
D Total Calls
E Complain
F Compliment
G Late
H Working Days
I Days Attended
J Non Working Days
K Total Away Time
L Total Logged-In Time
M QA Score

K and L are in the same unit. Calculate Away % = K / L.

## New Agent detection
A yellow-highlighted agent row or Agent Name cell in the uploaded Excel means the agent is a NEW AGENT.
The import parser must read XLSX cell fill/style information and classify these records as `isNewAgent = true`.
Do not require the user to type a New Agent flag manually.
If the currently used XLSX package cannot reliably read cell fill colors, replace/add an Excel parser library that does (for example ExcelJS) while preserving the rest of the app.
Treat common yellow fills such as RGB FFFF00, FFF2CC, FFE699, FFD966 and other clearly yellow solid fills as new-agent highlights.

## Operational KPI score - maximum 100 points
1. Calls: max 20
   - Total Calls >= 500: 20
   - Total Calls < 500: 10
2. Complaint / Compliment: max 30
   - No complaints and no compliments: 30
   - No complaints and one or more compliments: 30
   - Otherwise require 3 compliments for every 1 complaint: 30
   - If ratio is not achieved: 0
3. Attendance: max 20
   - 8-hour agent: Non Working Days <= 5: 20, otherwise 0
   - 12-hour agent: Non Working Days <= 3: 20, otherwise 0
4. Late: max 20
   - Late <= 3: 20
   - Late > 3: 0
5. Away: max 10
   - Away % = Total Away Time / Total Logged-In Time
   - Use progressive score: `max(0, 10 * (1 - min(Away%, 20%) / 20%))`
   - 0% away = 10 points; 20%+ away = 0 points

Base KPI = Calls + Feedback + Attendance + Late + Away. Maximum = 100.

## QA adjustment and mandatory QA gate
Normalize QA so both 95 and 95% are interpreted as 95%.
Final Overall KPI % = Base KPI * QA percentage.
Example: Base KPI 90 and QA 95% => Final Overall KPI 85.5.

QA below 85% is an AUTOMATIC OVERALL FAIL regardless of the numeric final score.
Overall PASS requires BOTH:
- QA >= 85%, AND
- Final Overall KPI >= 85.
If QA is missing, show Review / QA Missing and do not rank as a valid pass.

## Rankings
Create overall ranking:
1. Highest Final Overall KPI first.
2. If tied, lower Away % ranks higher.
3. If still tied, higher QA score ranks higher.

Show Top 3 Overall Agents prominently.

Create a separate Top 3 New Agents section using only `isNewAgent = true`, with the same ranking and tie-break rules.
Use a yellow NEW AGENT badge/card treatment so new agents are visually clear.

## Dashboard columns/details
For each agent show:
- Rank
- Agent Name
- New Agent badge if applicable
- Total Calls
- Complaints
- Compliments
- Attendance / Non Working Days
- Late
- Away %
- QA %
- Calls Score
- Feedback Score
- Attendance Score
- Late Score
- Away Score
- Base KPI
- Final Overall KPI
- PASS / FAIL status and reason

## Dashboard summary cards
- Total Agents
- Average Final Overall KPI
- Average QA
- Average Away %
- Passed Agents
- Failed QA
- New Agents

## Top Agent panels
Meeting-ready Top 3 Overall Agents and Top 3 New Agents with:
- rank medal
- name
- final overall KPI
- QA
- Away %

Retain admin login, Excel upload, CSV export, print, dark mode, and Broadcast Mode.
Update wording from SLA to KPI throughout.
Run lint and production build, fix errors, then commit the changes.
