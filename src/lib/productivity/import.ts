import * as XLSX from 'xlsx';
import { CallAgent, validAgents } from './model';
export type TimeUnit = 'seconds' | 'minutes' | 'excel-days';
const normalized = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fields = {
  offered: 'Total Inbound Calls', inbound: 'Total Inbound Calls Answered', attempts: 'Total Outbound Calls',
  outbound: 'Total Outbound Calls Connected', consult: 'Total Consultation Calls Connected',
  inTalk: 'Total Inbound Calls Talk Time', outTalk: 'Total Outbound Calls Talk Time',
  inHandle: 'Total Inbound Calls Handling Time', outHandle: 'Total Outbound Calls Handling Time',
  speed: 'Total Speed of Answer', ready: 'Total Ready Time', away: 'Total Away Time',
  breakTime: 'Total Break Time', busy: 'Total Busy Time', wrap: 'Total Wrap-Up Time', loggedIn: 'Total Logged-In Time',
} as const;
export function parseCallWorkbook(buffer: ArrayBuffer, unit: TimeUnit) {
  if (!['seconds','minutes','excel-days'].includes(unit)) throw new Error('Choose the duration unit used in the report.');
  const book = XLSX.read(buffer, { type: 'array', cellDates: true, sheetRows: 2010 });
  let rows: unknown[][] = [], headerIndex = -1;
  for (const name of book.SheetNames) {
    const candidate = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, defval: '', raw: true });
    const idx = candidate.findIndex(r => r.some(v => normalized(v) === 'agent') && r.some(v => normalized(v) === 'totalinboundcallsanswered'));
    if (idx >= 0) { rows = candidate; headerIndex = idx; break; }
  }
  if (headerIndex < 0) throw new Error('This is not an Agent Call Summary report. The Agent and Total Inbound Calls Answered headers are required.');
  const headers = rows[headerIndex].map(normalized);
  for (const h of Object.values(fields)) if (!headers.includes(normalized(h))) throw new Error(`Missing column: ${h}`);
  const nameIndex = headers.indexOf('agent'), refIndex = headers.indexOf('referenceid'), dateIndex = headers.indexOf('daterange');
  const agents: CallAgent[] = [];
  let suggestedMonth = '', endFound = false;
  const countFields = new Set(['offered','inbound','attempts','outbound','consult']);
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i], name = String(row[nameIndex] ?? '').trim();
    if (normalized(name) === 'endofreport') { endFound = true; break; }
    if (!name) continue;
    if (['total','grandtotal'].includes(normalized(name))) continue;
    const reference = String(row[refIndex] ?? '').trim();
    const agent = { id: reference ? `ref:${reference.toLowerCase()}` : `name:${name.toLowerCase()}`, name } as CallAgent;
    for (const [field, header] of Object.entries(fields)) {
      const raw = row[headers.indexOf(normalized(header))];
      if (raw === '' || raw === null || raw === undefined) throw new Error(`${name}: ${header} is blank. Supply zero only if confirmed.`);
      let n: number;
      if (typeof raw === 'string' && raw.includes(':') && !countFields.has(field)) {
        if (!/^\d+:\d{2}:\d{2}(\.\d+)?$/.test(raw.trim())) throw new Error(`${name}: invalid duration in ${header}`);
        const [h,m,s] = raw.split(':').map(Number);
        if (m >= 60 || s >= 60) throw new Error(`${name}: invalid duration in ${header}`);
        n = h*3600+m*60+s;
      } else {
        n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g,''));
        if (!countFields.has(field)) n *= unit === 'minutes' ? 60 : unit === 'excel-days' ? 86400 : 1;
      }
      if (!Number.isFinite(n) || n < 0) throw new Error(`${name}: invalid value in ${header}`);
      (agent as unknown as Record<string, unknown>)[field] = n;
    }
    agents.push(agent);
    const date = row[dateIndex];
    if (!suggestedMonth && date instanceof Date && !Number.isNaN(date.getTime())) suggestedMonth = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  }
  if (rows.length >= 2010 && !endFound) throw new Error('Report is too large. Maximum 2,000 agent rows.');
  if (!validAgents(agents)) throw new Error('Check duplicate agent identifiers, invalid counts, or answered/connected counts exceeding offered/attempted calls.');
  const warnings = [
    ...(agents.every(a=>a.loggedIn===0) ? ['Logged-in time is zero for every account. Working-hour productivity requires separate inputs.'] : []),
    'Confirm the report month; the Date Range column does not establish an end date.',
    'Away, break, busy and wrap-up time may overlap. These are not added to reconstruct logged-in time.',
  ];
  return { agents, suggestedMonth, warnings };
}
