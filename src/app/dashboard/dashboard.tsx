"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { signOut } from "../login/actions";
import { UserAdmin } from "./user-admin";

type Agent = {
  name: string;
  workHours: number;
  complaints: number;
  compliments: number;
  late: number;
  workingDays: number;
  daysAttended: number;
  nonWorkingDays: number;
  isNewAgent: boolean;
  feedbackScore: number;
  attendanceScore: number;
  lateScore: number;
  totalScore: number;
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
  scoreAgent({ name: "Agent A", workHours: 8, complaints: 1, compliments: 3, late: 1, workingDays: 22, daysAttended: 20, nonWorkingDays: 2, isNewAgent: false }),
  scoreAgent({ name: "Agent B", workHours: 12, complaints: 0, compliments: 0, late: 2, workingDays: 18, daysAttended: 16, nonWorkingDays: 2, isNewAgent: true }),
  scoreAgent({ name: "Agent C", workHours: 8, complaints: 2, compliments: 4, late: 4, workingDays: 22, daysAttended: 18, nonWorkingDays: 4, isNewAgent: false }),
  scoreAgent({ name: "Agent D", workHours: 12, complaints: 0, compliments: 2, late: 0, workingDays: 18, daysAttended: 14, nonWorkingDays: 4, isNewAgent: false }),
];

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function scoreAgent(input: Omit<Agent, "feedbackScore" | "attendanceScore" | "lateScore" | "totalScore" | "feedbackPass" | "attendancePass" | "latePass">): Agent {
  const feedbackPass = input.complaints === 0 || input.compliments >= input.complaints * 3;
  const feedbackScore = feedbackPass ? 30 : 0;
  const allowedNonWorkingDays = input.workHours >= 12 ? 3 : 5;
  const attendancePass = input.nonWorkingDays <= allowedNonWorkingDays;
  const attendanceScore = attendancePass ? 45 : 0;
  const latePass = input.late <= 3;
  const lateScore = latePass ? 25 : 0;
  return {
    ...input,
    feedbackScore,
    attendanceScore,
    lateScore,
    totalScore: feedbackScore + attendanceScore + lateScore,
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

function rankingSort(a: Agent, b: Agent) {
  return b.totalScore - a.totalScore || a.complaints - b.complaints || b.compliments - a.compliments || a.late - b.late || a.name.localeCompare(b.name);
}

export function Dashboard({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const [agents, setAgents] = useState<Agent[]>(demoData);
  const [dark, setDark] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [fileName, setFileName] = useState("Sample KPI overview");
  const [message, setMessage] = useState("Upload KPI.xlsx to replace the sample agent data.");
  const fileRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => [...agents].sort(rankingSort), [agents]);
  const alphabetical = useMemo(() => [...agents].sort((a, b) => a.name.localeCompare(b.name)), [agents]);
  const topAgent = ranked[0];
  const averageScore = agents.length ? agents.reduce((sum, item) => sum + item.totalScore, 0) / agents.length : 0;
  const fullScore = agents.filter((item) => item.totalScore === 100).length;
  const needsAttention = agents.filter((item) => !item.feedbackPass || !item.attendancePass || !item.latePass).length;
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
        workHours: findHeader(headerMap, ["Work Hours (1 day)", "Work Hours", "Hours"]),
        complaints: findHeader(headerMap, ["Complain", "Complaint", "Complaints"]),
        compliments: findHeader(headerMap, ["Compliment", "Compliments"]),
        late: findHeader(headerMap, ["Late", "Lateness"]),
        workingDays: findHeader(headerMap, ["Working Days"]),
        daysAttended: findHeader(headerMap, ["Days Attended", "Attended Days"]),
        nonWorkingDays: findHeader(headerMap, ["Non Working Days", "Non-Working Days"]),
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
          workHours: numberValue(row[index.workHours]),
          complaints: Math.max(0, numberValue(row[index.complaints])),
          compliments: Math.max(0, numberValue(row[index.compliments])),
          late: Math.max(0, numberValue(row[index.late])),
          workingDays: Math.max(0, numberValue(row[index.workingDays])),
          daysAttended: Math.max(0, numberValue(row[index.daysAttended])),
          nonWorkingDays: Math.max(0, numberValue(row[index.nonWorkingDays])),
          isNewAgent,
        })];
      });

      if (!next.length) throw new Error("No agent rows found");
      setAgents(next);
      setFileName(file.name);
      setMessage(`${next.length} agents loaded and ranked. Yellow-highlighted rows are marked New Agent.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this workbook.");
    }
  }

  function exportCsv() {
    const lines: (string | number)[][] = [["Rank", "Agent Name", "New Agent", "Work Hours", "Complain", "Compliment", "Late", "Working Days", "Days Attended", "Non Working Days", "Feedback Score", "Attendance Score", "Late Score", "Total KPI Score"], ...ranked.map((a, i) => [i + 1, a.name, a.isNewAgent ? "Yes" : "No", a.workHours, a.complaints, a.compliments, a.late, a.workingDays, a.daysAttended, a.nonWorkingDays, a.feedbackScore, a.attendanceScore, a.lateScore, a.totalScore])];
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

    <section className="control-strip no-print"><div className="source"><p className="label">Data source</p><strong>{fileName}</strong><p className="status-copy">{message}</p></div><input ref={fileRef} hidden type="file" accept=".xlsx" onChange={(e) => upload(e.target.files?.[0])} /><button className="primary-button" onClick={() => fileRef.current?.click()}>Upload KPI Excel</button><button onClick={exportCsv}>Export CSV</button><button onClick={() => window.print()}>Print</button></section>

    {isAdmin && <UserAdmin />}

    <section className="metrics-grid kpi-five"><article><p>Top Agent</p><strong className="top-agent-name">{topAgent?.name ?? "—"}</strong><span>{topAgent ? `${topAgent.totalScore}% KPI` : "No data"}</span></article><article><p>Average KPI</p><strong>{averageScore.toFixed(1)}%</strong><span>Across {agents.length} agents</span></article><article><p>100% KPI</p><strong>{fullScore}</strong><span className="positive">Full-score agents</span></article><article><p>Needs Attention</p><strong>{needsAttention}</strong><span className={needsAttention ? "negative" : "positive"}>Feedback, attendance or late failed</span></article><article><p>New Agents</p><strong>{newAgents}</strong><span className="new-agent-text">Yellow-highlighted in Excel</span></article></section>

    <section className="scoring-card"><div className="section-heading"><div><p className="eyebrow">100-point framework</p><h2>KPI scoring rules</h2></div><span className="benchmark">Maximum 100%</span></div><div className="score-rules"><div><strong>30%</strong><span>Compliment / Complaint</span><small>3 compliments per complaint · no feedback = 30</small></div><div><strong>45%</strong><span>Attendance</span><small>8hr ≤5 non-working · 12hr ≤3</small></div><div><strong>25%</strong><span>Late</span><small>≤3 = 25 · above 3 = 0</small></div></div></section>

    <section className="chart-card"><div className="section-heading"><div><p className="eyebrow">Leaderboard</p><h2>Top Agent Ranking</h2><p>Ranked by KPI score, then complaints, compliments, lateness and name.</p></div></div><div className="leaderboard">{ranked.map((agent, index) => <div className={`leader-row ${index < 3 ? `podium podium-${index + 1}` : ""}`} key={agent.name}><span className="rank">#{index + 1}</span><div className="leader-name"><strong>{agent.name}</strong>{agent.isNewAgent && <span className="new-agent-badge">NEW AGENT</span>}</div><span>{agent.complaints} complaint{agent.complaints === 1 ? "" : "s"}</span><span>{agent.compliments} compliment{agent.compliments === 1 ? "" : "s"}</span><strong className="leader-score">{agent.totalScore}%</strong></div>)}</div></section>

    <section className="chart-card"><div className="section-heading"><div><p className="eyebrow">Agent performance</p><h2>KPI Score by Agent</h2><p>Agents are arranged A–Z by total KPI score.</p></div></div><div className="campaign-chart">{alphabetical.map((agent) => <div className="chart-row" key={agent.name}><div className="campaign-label"><span>{agent.name}{agent.isNewAgent && <em className="new-agent-dot">New</em>}</span><strong>{agent.totalScore}% KPI</strong></div><div className="track"><div className={`bar ${agent.totalScore >= 90 ? "pass" : agent.totalScore >= 70 ? "warn" : "fail"}`} style={{ width: `${Math.min(100, agent.totalScore)}%` }} /></div></div>)}</div></section>

    <section className="detail-card"><div className="section-heading"><div><p className="eyebrow">Score breakdown</p><h2>Agent KPI Detail</h2></div></div><div className="table-wrap"><table className="kpi-table"><thead><tr><th>Rank</th><th>Agent</th><th>Hours</th><th>Complaints</th><th>Compliments</th><th>Late</th><th>Non Working</th><th>Feedback</th><th>Attendance</th><th>Late KPI</th><th>Total</th></tr></thead><tbody>{ranked.map((a, i) => <tr key={a.name} className={a.isNewAgent ? "new-agent-row" : ""}><td>#{i + 1}</td><td><strong>{a.name}</strong>{a.isNewAgent && <span className="new-agent-badge">NEW</span>}</td><td>{a.workHours}h</td><td>{a.complaints}</td><td>{a.compliments}</td><td className={a.latePass ? "positive" : "negative"}>{a.late}</td><td className={a.attendancePass ? "positive" : "negative"}>{a.nonWorkingDays}</td><td className={a.feedbackPass ? "positive" : "negative"}>{a.feedbackScore}/30</td><td className={a.attendancePass ? "positive" : "negative"}>{a.attendanceScore}/45</td><td className={a.latePass ? "positive" : "negative"}>{a.lateScore}/25</td><td><strong>{a.totalScore}%</strong></td></tr>)}</tbody></table></div></section>

    <footer><span>Signed in as {username} · {isAdmin ? "Administrator" : "User"}</span><span>Feedback 30% · Attendance 45% · Late 25%</span></footer>
  </main>;
}
