"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { signOut } from "../login/actions";
import { UserAdmin } from "./user-admin";
import { replaceDashboardData } from "./data-actions";

export type Agent = {
  name: string;
  totalCalls: number;
  workHours: number;
  complaints: number;
  compliments: number;
  late: number;
  workingDays: number;
  daysAttended: number;
  nonWorkingDays: number;
  awayMinutes: number;
  loggedInMinutes: number;
  qaRate: number | null;
  isNewAgent: boolean;
  feedbackScore: number;
  attendanceRate: number;
  attendanceScore: number;
  awayRate: number;
  awayScore: number;
  lateScore: number;
  callsScore: number;
  baseKpi: number;
  finalKpi: number | null;
  status: "PASS" | "FAIL" | "REVIEW";
  statusReason: string;
  feedbackPass: boolean;
  attendancePass: boolean;
  latePass: boolean;
};

type HeaderMap = Record<string, number>;

type StyledCell = XLSX.CellObject & {
  s?: {
    fill?: {
      fgColor?: { rgb?: string };
      bgColor?: { rgb?: string };
    };
  };
};

const demoData: Agent[] = [
  scoreAgent({ name: "Agent A", totalCalls: 620, workHours: 8, complaints: 0, compliments: 2, late: 1, workingDays: 22, daysAttended: 21, nonWorkingDays: 1, awayMinutes: 18, loggedInMinutes: 480, qaRate: 94, isNewAgent: false }),
  scoreAgent({ name: "Agent B", totalCalls: 540, workHours: 12, complaints: 1, compliments: 3, late: 2, workingDays: 18, daysAttended: 17, nonWorkingDays: 1, awayMinutes: 30, loggedInMinutes: 650, qaRate: 91, isNewAgent: true }),
];

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function qaValue(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = numberValue(String(value).replace("%", ""));
  return Math.max(0, Math.min(100, parsed > 0 && parsed <= 1 ? parsed * 100 : parsed));
}

function durationMinutes(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value / 60);
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const seconds = Number(text);
  if (Number.isFinite(seconds)) return Math.max(0, seconds / 60);
  const parts = text.split(":").map(Number);
  if (parts.every(Number.isFinite) && parts.length >= 2 && parts.length <= 3) {
    const [hours, minutes, seconds = 0] = parts.length === 2 ? [parts[0], parts[1], 0] : parts;
    return Math.max(0, hours * 60 + minutes + seconds / 60);
  }
  return 0;
}

function scoreAgent(input: Omit<Agent, "feedbackScore" | "attendanceRate" | "attendanceScore" | "awayRate" | "awayScore" | "lateScore" | "callsScore" | "baseKpi" | "finalKpi" | "status" | "statusReason" | "feedbackPass" | "attendancePass" | "latePass">): Agent {
  const callsScore = input.totalCalls >= 500 ? 20 : 10;
  const feedbackPass = input.complaints === 0 || input.compliments >= input.complaints * 3;
  const feedbackScore = feedbackPass ? 30 : 0;
  const attendanceRate = input.workingDays > 0 ? Math.min(100, Math.round((input.daysAttended / input.workingDays) * 10000) / 100) : 0;
  const attendancePass = input.workHours >= 12 ? input.nonWorkingDays <= 3 : input.nonWorkingDays <= 5;
  const attendanceScore = attendancePass ? 20 : 0;
  const awayRate = input.loggedInMinutes > 0 ? Math.min(100, Math.round((input.awayMinutes / input.loggedInMinutes) * 10000) / 100) : 0;
  const awayScore = Math.round(Math.max(0, 10 * (1 - Math.min(awayRate, 20) / 20)) * 100) / 100;
  const latePass = input.late <= 3;
  const lateScore = latePass ? 20 : 0;
  const baseKpi = Math.round((callsScore + feedbackScore + attendanceScore + lateScore + awayScore) * 100) / 100;
  const finalKpi = input.qaRate === null ? null : Math.round(baseKpi * input.qaRate) / 100;
  const status = input.qaRate === null ? "REVIEW" : input.qaRate < 85 || (finalKpi ?? 0) < 85 ? "FAIL" : "PASS";
  const statusReason = input.qaRate === null ? "QA missing" : input.qaRate < 85 ? "QA below 85%" : (finalKpi ?? 0) < 85 ? "Final KPI below 85%" : "Targets achieved";
  return {
    ...input,
    feedbackScore,
    attendanceRate,
    attendanceScore,
    awayRate,
    awayScore,
    lateScore,
    callsScore,
    baseKpi,
    finalKpi,
    status,
    statusReason,
    feedbackPass,
    attendancePass,
    latePass,
  };
}

function isYellow(cell?: StyledCell) {
  const rgb = (cell?.s?.fill?.fgColor?.rgb ?? cell?.s?.fill?.bgColor?.rgb ?? "").toUpperCase().replace(/^FF/, "");
  if (!rgb || rgb.length !== 6) return false;
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  return r >= 200 && g >= 180 && b <= 170;
}

function makeHeaderMap(headers: unknown[]): HeaderMap {
  const map: HeaderMap = {};
  headers.forEach((header, index) => { map[normalized(header)] = index; });
  return map;
}

function findHeader(map: HeaderMap, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalized(alias);
    if (key in map) return map[key];
  }
  return -1;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function scoreText(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function rankingSort(a: Agent, b: Agent) {
  return (b.finalKpi ?? -1) - (a.finalKpi ?? -1) || a.awayRate - b.awayRate || (b.qaRate ?? -1) - (a.qaRate ?? -1) || a.complaints - b.complaints || a.late - b.late || a.name.localeCompare(b.name);
}

function refreshSavedAgent(agent: Agent): Agent {
  return scoreAgent({
    name: agent.name,
    totalCalls: Number(agent.totalCalls ?? 0),
    workHours: Number(agent.workHours ?? 8),
    complaints: Number(agent.complaints ?? 0),
    compliments: Number(agent.compliments ?? 0),
    late: Number(agent.late ?? 0),
    workingDays: Number(agent.workingDays ?? 0),
    daysAttended: Number(agent.daysAttended ?? 0),
    nonWorkingDays: Number(agent.nonWorkingDays ?? 0),
    awayMinutes: Number(agent.awayMinutes ?? 0),
    loggedInMinutes: Number(agent.loggedInMinutes ?? 0),
    qaRate: agent.qaRate ?? null,
    isNewAgent: Boolean(agent.isNewAgent),
  });
}

export function Dashboard({ username, isAdmin, initialAgents, initialFileName, initialUploadedAt }: { username: string; isAdmin: boolean; initialAgents?: Agent[]; initialFileName?: string; initialUploadedAt?: string }) {
  const savedAgents = useMemo(() => initialAgents?.map(refreshSavedAgent) ?? [], [initialAgents]);
  const hasSavedData = savedAgents.length > 0;
  const [agents, setAgents] = useState<Agent[]>(hasSavedData ? savedAgents : demoData);
  const [dark, setDark] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [fileName, setFileName] = useState(initialFileName ?? "Sample KPI overview");
  const [message, setMessage] = useState(hasSavedData ? `${initialAgents!.length} saved agents loaded${initialUploadedAt ? ` · Last upload ${new Date(initialUploadedAt).toLocaleString()}` : ""}.` : "Upload KPI.xlsx to replace the sample agent data.");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => [...agents].sort(rankingSort), [agents]);
  const topThree = ranked.slice(0, 3);
  const topNewAgents = ranked.filter((item) => item.isNewAgent).slice(0, 3);
  const topAgent = ranked[0];
  const scoredAgents = agents.filter((item) => item.finalKpi !== null);
  const averageScore = scoredAgents.length ? scoredAgents.reduce((sum, item) => sum + (item.finalKpi ?? 0), 0) / scoredAgents.length : 0;
  const averageQa = scoredAgents.length ? scoredAgents.reduce((sum, item) => sum + (item.qaRate ?? 0), 0) / scoredAgents.length : 0;
  const averageAway = agents.length ? agents.reduce((sum, item) => sum + item.awayRate, 0) / agents.length : 0;
  const passed = agents.filter((item) => item.status === "PASS").length;
  const failed = agents.filter((item) => item.status === "FAIL").length;
  const newAgents = agents.filter((item) => item.isNewAgent).length;

  async function upload(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellStyles: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
      if (!rows.length) throw new Error("Workbook is empty");

      const headers = rows[0];
      const headerMap = makeHeaderMap(headers);
      const index = {
        name: findHeader(headerMap, ["Agent Name", "Agent"]),
        totalCalls: findHeader(headerMap, ["Total Calls", "Calls"]),
        workHours: findHeader(headerMap, ["Work Hours (1 day)", "Work Hours", "Hours"]),
        complaints: findHeader(headerMap, ["Complain", "Complaint", "Complaints"]),
        compliments: findHeader(headerMap, ["Compliment", "Compliments"]),
        late: findHeader(headerMap, ["Late", "Lateness"]),
        workingDays: findHeader(headerMap, ["Working Days"]),
        daysAttended: findHeader(headerMap, ["Days Attended", "Attended Days"]),
        nonWorkingDays: findHeader(headerMap, ["Non Working Days", "Non-Working Days"]),
        awayTime: findHeader(headerMap, ["Total Away Time", "Away Time"]),
        loggedInTime: findHeader(headerMap, ["Total Logged-In Time", "Total Logged In Time", "Logged-In Time", "Logged In Time"]),
        qa: findHeader(headerMap, ["QA", "QA Score", "QA %", "QA Percentage", "Quality Score"]),
      };
      if (Object.values(index).some((i) => i < 0)) {
        throw new Error("Required KPI headers are missing");
      }

      const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
      const next = rows.slice(1).flatMap((rawRow, rowOffset) => {
        const row = rawRow as unknown[];
        const name = String(row[index.name] ?? "").trim();
        if (!name) return [];
        const excelRow = range.s.r + rowOffset + 2;
        let isNewAgent = false;
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
          if (isYellow(sheet[address] as StyledCell | undefined)) { isNewAgent = true; break; }
        }
        return [scoreAgent({
          name,
          totalCalls: Math.max(0, numberValue(row[index.totalCalls])),
          workHours: numberValue(row[index.workHours]),
          complaints: Math.max(0, numberValue(row[index.complaints])),
          compliments: Math.max(0, numberValue(row[index.compliments])),
          late: Math.max(0, numberValue(row[index.late])),
          workingDays: Math.max(0, numberValue(row[index.workingDays])),
          daysAttended: Math.max(0, numberValue(row[index.daysAttended])),
          nonWorkingDays: Math.max(0, numberValue(row[index.nonWorkingDays])),
          awayMinutes: durationMinutes(row[index.awayTime]),
          loggedInMinutes: durationMinutes(row[index.loggedInTime]),
          qaRate: qaValue(row[index.qa]),
          isNewAgent,
        })];
      });

      if (!next.length) throw new Error("No agent rows found");
      setSaving(true);
      const result = await replaceDashboardData(next, file.name);
      if (result.error) throw new Error(result.error);
      setAgents(next);
      setFileName(file.name);
      setMessage(`${next.length} agents saved and ranked. This upload replaced the previous Excel data.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this workbook.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function exportCsv() {
    const lines: (string | number)[][] = [["Rank", "Agent Name", "New Agent", "Total Calls", "Complaints", "Compliments", "Late", "Working Days", "Days Attended", "Non Working Days", "Away %", "QA %", "Calls Score", "Feedback Score", "Attendance Score", "Late Score", "Away Score", "Base KPI", "Final KPI", "Status", "Reason"], ...ranked.map((a, i) => [i + 1, a.name, a.isNewAgent ? "Yes" : "No", a.totalCalls, a.complaints, a.compliments, a.late, a.workingDays, a.daysAttended, a.nonWorkingDays, a.awayRate, a.qaRate ?? "", a.callsScore, a.feedbackScore, a.attendanceScore, a.lateScore, a.awayScore, a.baseKpi, a.finalKpi ?? "", a.status, a.statusReason])];
    const blob = new Blob([lines.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agent-kpi-performance-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className={`${dark ? "theme-dark" : ""} ${broadcast ? "broadcast" : ""} dashboard-shell`}>
    {broadcast && isAdmin && <button className="broadcast-exit" onClick={() => setBroadcast(false)}>Exit Broadcast</button>}
    <header className="topbar"><div><div className="brand-mark small">KPI</div><div><p className="eyebrow">Operations intelligence</p><h1>Agent KPI Performance Dashboard</h1></div></div><div className="toolbar no-print"><button onClick={() => setDark((v) => !v)}>{dark ? "Light Mode" : "Dark Mode"}</button>{isAdmin && <button onClick={() => setBroadcast((v) => !v)}>{broadcast ? "Exit Broadcast" : "Broadcast Mode"}</button>}<form action={signOut}><button>Sign out</button></form></div></header>

    <section className="control-strip no-print"><div className="source"><p className="label">Data source</p><strong>{fileName}</strong><p className="status-copy">{message}</p></div><input ref={fileRef} hidden type="file" accept=".xlsx" onChange={(e) => upload(e.target.files?.[0])} /><button className="primary-button" disabled={saving} onClick={() => fileRef.current?.click()}>{saving ? "Saving…" : "Upload KPI Excel"}</button><button onClick={exportCsv}>Export CSV</button><button onClick={() => window.print()}>Print</button></section>

    {isAdmin && <UserAdmin />}

    <section className="top-three-card"><div className="section-heading"><div><p className="eyebrow">Best overall performance</p><h2>Top 3 Overall Agents</h2><p>Final KPI → lowest Away % → highest QA → fewest complaints → fewest late.</p></div></div><div className="top-three-grid">{topThree.map((agent, index) => <article key={agent.name}><span className="top-three-rank">#{index + 1}</span><strong>{agent.name}</strong><p>{scoreText(agent.finalKpi ?? 0)}% KPI</p><small>{scoreText(agent.qaRate ?? 0)}% QA · {scoreText(agent.awayRate)}% away · {agent.status}</small></article>)}</div></section>

    <section className="top-three-card new-agent-panel"><div className="section-heading"><div><p className="eyebrow">Yellow-highlighted agents</p><h2>Top 3 New Agents</h2><p>Uses the same ranking rules and only includes yellow-highlighted Excel rows.</p></div></div><div className="top-three-grid">{topNewAgents.length ? topNewAgents.map((agent, index) => <article key={agent.name}><span className="top-three-rank">#{index + 1}</span><strong>{agent.name}</strong><span className="new-agent-badge">NEW AGENT</span><p>{scoreText(agent.finalKpi ?? 0)}% KPI</p><small>{scoreText(agent.qaRate ?? 0)}% QA · {scoreText(agent.awayRate)}% away · {agent.status}</small></article>) : <p className="muted">No yellow-highlighted new agents were found.</p>}</div></section>

    <section className="metrics-grid kpi-seven"><article><p>Top Agent</p><strong className="top-agent-name">{topAgent?.name ?? "—"}</strong><span>{topAgent ? `${scoreText(topAgent.finalKpi ?? 0)}% KPI` : "No data"}</span></article><article><p>Overall KPI</p><strong>{averageScore.toFixed(1)}%</strong></article><article><p>QA</p><strong>{averageQa.toFixed(1)}%</strong></article><article><p>Away</p><strong>{averageAway.toFixed(1)}%</strong></article><article><p>Passed</p><strong className="positive">{passed}</strong></article><article><p>Failed</p><strong className="negative">{failed}</strong></article><article><p>New Agents</p><strong>{newAgents}</strong></article></section>

    <section className="scoring-card"><div className="section-heading"><div><p className="eyebrow">100-point framework + QA</p><h2>KPI scoring rules</h2></div><span className="benchmark">QA must be 85%+</span></div><div className="score-rules five"><div><strong>20</strong><span>Calls</span><small>500+ = 20 · below 500 = 10</small></div><div><strong>30</strong><span>Feedback</span><small>3 compliments per complaint</small></div><div><strong>20</strong><span>Attendance</span><small>8h: ≤5 days · 12h: ≤3 days</small></div><div><strong>20</strong><span>Late</span><small>≤3 = 20 · above 3 = 0</small></div><div><strong>10</strong><span>Away</span><small>Progressive to 0 at 20% away</small></div></div></section>

    <section className="detail-card"><div className="section-heading"><div><p className="eyebrow">Full scoring breakdown</p><h2>Every Agent</h2></div></div><div className="table-wrap"><table className="kpi-table"><thead><tr><th>Rank</th><th>Agent</th><th>Calls</th><th>Complaints</th><th>Compliments</th><th>Late</th><th>Attendance</th><th>Away %</th><th>QA %</th><th>Calls Pts</th><th>Feedback Pts</th><th>Attendance Pts</th><th>Late Pts</th><th>Away Pts</th><th>Base KPI</th><th>Final KPI</th><th>Status</th></tr></thead><tbody>{ranked.map((a, i) => <tr key={a.name} className={a.isNewAgent ? "new-agent-row" : ""}><td>#{i + 1}</td><td><strong>{a.name}</strong>{a.isNewAgent && <span className="new-agent-badge">NEW AGENT</span>}</td><td>{a.totalCalls}</td><td>{a.complaints}</td><td>{a.compliments}</td><td>{a.late}</td><td>{a.daysAttended}/{a.workingDays} · {a.nonWorkingDays} non-work</td><td>{scoreText(a.awayRate)}%</td><td className={(a.qaRate ?? 0) < 85 ? "negative" : "positive"}>{a.qaRate === null ? "—" : `${scoreText(a.qaRate)}%`}</td><td>{a.callsScore}/20</td><td>{a.feedbackScore}/30</td><td>{a.attendanceScore}/20</td><td>{a.lateScore}/20</td><td>{scoreText(a.awayScore)}/10</td><td>{scoreText(a.baseKpi)}%</td><td><strong>{a.finalKpi === null ? "—" : `${scoreText(a.finalKpi)}%`}</strong></td><td><span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span><small className="status-reason">{a.statusReason}</small></td></tr>)}</tbody></table></div></section>

    <footer><span>Signed in as {username} · {isAdmin ? "Administrator" : "User"}</span><span>Column B retained in Excel but excluded from all scoring</span></footer>
  </main>;
}
