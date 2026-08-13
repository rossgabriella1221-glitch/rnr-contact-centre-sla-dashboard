"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { signOut } from "../login/actions";
import { UserAdmin } from "./user-admin";

type Campaign = { name: string; totalCalls: number; complaints: number; compliments: number; attendance: "Pass" | "Fail"; callsScore: number; feedbackScore: number; attendanceScore: number; sla: number };
const demoData: Campaign[] = [
  { name: "Agent A", totalCalls: 620, complaints: 1, compliments: 4, attendance: "Pass", callsScore: 20, feedbackScore: 30, attendanceScore: 50, sla: 100 },
  { name: "Agent B", totalCalls: 480, complaints: 0, compliments: 0, attendance: "Pass", callsScore: 10, feedbackScore: 20, attendanceScore: 50, sla: 80 },
  { name: "Agent C", totalCalls: 540, complaints: 2, compliments: 3, attendance: "Pass", callsScore: 20, feedbackScore: 0, attendanceScore: 50, sla: 70 },
  { name: "Agent D", totalCalls: 710, complaints: 0, compliments: 2, attendance: "Fail", callsScore: 20, feedbackScore: 30, attendanceScore: 20, sla: 70 },
];

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Dashboard({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(demoData);
  const [target, setTarget] = useState(80);
  const [dark, setDark] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [fileName, setFileName] = useState("Sample overview");
  const [message, setMessage] = useState("Upload the agent SLA workbook to replace sample data.");
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = useMemo(() => [...campaigns].sort((a, b) => a.name.localeCompare(b.name)), [campaigns]);
  const passed = sorted.filter((item) => item.sla >= target);
  const failed = sorted.filter((item) => item.sla < target);
  const totalCalls = sorted.reduce((sum, item) => sum + item.totalCalls, 0);
  const weightedSla = sorted.length ? sorted.reduce((sum, item) => sum + item.sla, 0) / sorted.length : 0;

  async function upload(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      const next = rows.slice(1).flatMap((row) => {
        const cells = row as unknown[];
        const name = String(cells[0] ?? "").trim();
        const totalCalls = Number(cells[1]);
        const complaints = Math.max(0, Number(cells[2]) || 0);
        const compliments = Math.max(0, Number(cells[3]) || 0);
        const attendanceRaw = String(cells[4] ?? "").trim().toLowerCase();
        if (!name || !Number.isFinite(totalCalls) || totalCalls === 0) return [];
        const attendance: "Pass" | "Fail" = attendanceRaw === "pass" || attendanceRaw === "passed" || attendanceRaw === "yes" ? "Pass" : "Fail";
        const callsScore = totalCalls >= 500 ? 20 : 10;
        const feedbackScore = complaints === 0 && compliments === 0 ? 20 : complaints === 0 || compliments >= complaints * 3 ? 30 : 0;
        const attendanceScore = attendance === "Pass" ? 50 : 20;
        return [{ name, totalCalls, complaints, compliments, attendance, callsScore, feedbackScore, attendanceScore, sla: callsScore + feedbackScore + attendanceScore }];
      });
      if (!next.length) throw new Error("No eligible agent rows found");
      setCampaigns(next);
      setFileName(file.name);
      setMessage(`${next.length} agents loaded. Rows where Column B Total Calls = 0 were excluded.`);
    } catch {
      setMessage("Could not read this workbook. Check Agent Name in A, Total Calls in B, Complain in C, Compliment in D, and Attendance in E.");
    }
  }

  function exportCsv() {
    const lines: (string | number)[][] = [["Agent Name", "Total Calls", "Complain", "Compliment", "Attendance", "Calls Score", "Feedback Score", "Attendance Score", "% SLA", "Result"], ...sorted.map((c) => [c.name, c.totalCalls, c.complaints, c.compliments, c.attendance, c.callsScore, c.feedbackScore, c.attendanceScore, c.sla.toFixed(0), c.sla >= target ? "Passed" : "Failed"])];
    const blob = new Blob([lines.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "connect-centre-sla-report.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <main className={`${dark ? "theme-dark" : ""} ${broadcast ? "broadcast" : ""} dashboard-shell`}>
    <header className="topbar"><div><div className="brand-mark small">CC</div><div><p className="eyebrow">Operations intelligence</p><h1>Connect Centre SLA</h1></div></div><div className="toolbar no-print"><button onClick={() => setDark((v) => !v)}>{dark ? "Light Mode" : "Dark Mode"}</button>{isAdmin && <button onClick={() => setBroadcast((v) => !v)}>{broadcast ? "Exit Broadcast" : "Broadcast Mode"}</button>}<form action={signOut}><button>Sign out</button></form></div></header>
    <section className="control-strip no-print"><div className="source"><p className="label">Data source</p><strong>{fileName}</strong><p className="status-copy">{message}</p></div><input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(e) => upload(e.target.files?.[0])} /><button className="primary-button" onClick={() => fileRef.current?.click()}>Upload Excel</button><label className="target-control">SLA target <span><input aria-label="SLA target" type="number" min="1" max="100" value={target} disabled={!isAdmin} title={isAdmin ? "" : "Only administrators can change the target"} onChange={(e) => setTarget(Math.min(100, Math.max(1, Number(e.target.value))))} />%</span></label><button onClick={exportCsv}>Export CSV</button><button onClick={() => window.print()}>Print</button></section>
    {isAdmin && <UserAdmin />}
    <section className="metrics-grid"><article><p>Total Calls</p><strong>{totalCalls.toLocaleString()}</strong><span>Eligible agent volume</span></article><article><p>Average SLA</p><strong>{weightedSla.toFixed(1)}%</strong><span className={weightedSla >= target ? "positive" : "negative"}>{weightedSla >= target ? "Above" : "Below"} {target}% target</span></article><article><p>Passed</p><strong>{passed.length}</strong><span className="positive">Meeting benchmark</span></article><article><p>Failed</p><strong>{failed.length}</strong><span className="negative">Needs attention</span></article></section>
    <section className="chart-card"><div className="section-heading"><div><p className="eyebrow">Agent performance</p><h2>SLA by Agent</h2></div><span className="benchmark">Benchmark {target}%</span></div><div className="campaign-chart">{sorted.map((item) => <div className="chart-row" key={item.name}><div className="campaign-label"><span>{item.name}</span><strong>{item.totalCalls.toLocaleString()} calls · {item.sla.toFixed(0)}% SLA</strong></div><div className="track"><div className={item.sla >= target ? "bar pass" : "bar fail"} style={{ width: `${Math.min(100, item.sla)}%` }} /></div></div>)}</div></section>
    <section className="result-grid"><ResultSection title="Passed SLA" subtitle={`At or above ${target}%`} items={passed} type="pass" /><ResultSection title="Failed SLA" subtitle={`Below ${target}%`} items={failed} type="fail" /></section>
    <footer><span>Signed in as {username} · {isAdmin ? "Administrator" : "User"}</span><span>Calls 20% · Feedback 30% · Attendance 50% · Zero-call rows excluded</span></footer>
  </main>;
}

function ResultSection({ title, subtitle, items, type }: { title: string; subtitle: string; items: Campaign[]; type: "pass" | "fail" }) {
  return <article className="result-card"><div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className={`count ${type}`}>{items.length}</span></div><div className="result-list">{items.length ? items.map((item) => <div key={item.name}><span><i className={type} />{item.name}</span><strong>{item.sla.toFixed(1)}%</strong></div>) : <p className="empty">No campaigns in this section.</p>}</div></article>;
}
