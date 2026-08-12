"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { signOut } from "../login/actions";

type Campaign = { name: string; totalCalls: number; sla: number };
const demoData: Campaign[] = [
  { name: "Customer Care", totalCalls: 1842, sla: 88.4 },
  { name: "Retention", totalCalls: 964, sla: 82.1 },
  { name: "Sales Inbound", totalCalls: 2310, sla: 79.3 },
  { name: "Technical Support", totalCalls: 1576, sla: 72.8 },
];

function normalizeSla(value: unknown) {
  const raw = typeof value === "string" ? Number(value.replace("%", "").trim()) : Number(value);
  if (!Number.isFinite(raw)) return Number.NaN;
  return raw > 0 && raw <= 1 ? raw * 100 : raw;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Dashboard({ adminEmail }: { adminEmail: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(demoData);
  const [target, setTarget] = useState(80);
  const [dark, setDark] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [fileName, setFileName] = useState("Sample overview");
  const [message, setMessage] = useState("Upload the current operational workbook to replace sample data.");
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = useMemo(() => [...campaigns].sort((a, b) => a.name.localeCompare(b.name)), [campaigns]);
  const passed = sorted.filter((item) => item.sla >= target);
  const failed = sorted.filter((item) => item.sla < target);
  const totalCalls = sorted.reduce((sum, item) => sum + item.totalCalls, 0);
  const weightedSla = totalCalls ? sorted.reduce((sum, item) => sum + item.sla * item.totalCalls, 0) / totalCalls : 0;

  async function upload(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      const aggregate = new Map<string, { calls: number; weighted: number }>();
      rows.slice(1).forEach((row) => {
        const cells = row as unknown[];
        const name = String(cells[0] ?? "").trim();
        const calls = Number(cells[2]);
        const sla = normalizeSla(cells[16]);
        if (!name || !Number.isFinite(calls) || calls === 0 || !Number.isFinite(sla)) return;
        const current = aggregate.get(name) ?? { calls: 0, weighted: 0 };
        aggregate.set(name, { calls: current.calls + calls, weighted: current.weighted + sla * calls });
      });
      const next = [...aggregate.entries()].map(([name, value]) => ({ name, totalCalls: value.calls, sla: value.weighted / value.calls }));
      if (!next.length) throw new Error("No eligible campaign rows found");
      setCampaigns(next);
      setFileName(file.name);
      setMessage(`${next.length} campaigns loaded. Rows where Column C Total Calls = 0 were excluded.`);
    } catch {
      setMessage("Could not read this workbook. Check campaign in Column A, Total Calls in C, and % SLA in Q.");
    }
  }

  function exportCsv() {
    const lines: (string | number)[][] = [["Campaign", "Total Calls", "% SLA", "Result"], ...sorted.map((c) => [c.name, c.totalCalls, c.sla.toFixed(2), c.sla >= target ? "Passed" : "Failed"])];
    const blob = new Blob([lines.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "rnr-sla-report.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <main className={`${dark ? "theme-dark" : ""} ${broadcast ? "broadcast" : ""} dashboard-shell`}>
    <header className="topbar"><div><div className="brand-mark small">RNR</div><div><p className="eyebrow">Operations intelligence</p><h1>Contact Centre SLA</h1></div></div><div className="toolbar no-print"><button onClick={() => setDark((v) => !v)}>{dark ? "Light Mode" : "Dark Mode"}</button><button onClick={() => setBroadcast((v) => !v)}>{broadcast ? "Exit Broadcast" : "Broadcast Mode"}</button><form action={signOut}><button>Sign out</button></form></div></header>
    <section className="control-strip no-print"><div className="source"><p className="label">Data source</p><strong>{fileName}</strong><p className="status-copy">{message}</p></div><input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(e) => upload(e.target.files?.[0])} /><button className="primary-button" onClick={() => fileRef.current?.click()}>Upload Excel</button><label className="target-control">SLA target <span><input aria-label="SLA target" type="number" min="1" max="100" value={target} onChange={(e) => setTarget(Math.min(100, Math.max(1, Number(e.target.value))))} />%</span></label><button onClick={exportCsv}>Export CSV</button><button onClick={() => window.print()}>Print</button></section>
    <section className="metrics-grid"><article><p>Total Calls</p><strong>{totalCalls.toLocaleString()}</strong><span>Eligible campaign volume</span></article><article><p>Weighted SLA</p><strong>{weightedSla.toFixed(1)}%</strong><span className={weightedSla >= target ? "positive" : "negative"}>{weightedSla >= target ? "Above" : "Below"} {target}% target</span></article><article><p>Passed</p><strong>{passed.length}</strong><span className="positive">Meeting benchmark</span></article><article><p>Failed</p><strong>{failed.length}</strong><span className="negative">Needs attention</span></article></section>
    <section className="chart-card"><div className="section-heading"><div><p className="eyebrow">Campaign performance</p><h2>SLA by Campaign</h2></div><span className="benchmark">Benchmark {target}%</span></div><div className="campaign-chart">{sorted.map((item) => <div className="chart-row" key={item.name}><div className="campaign-label"><span>{item.name}</span><strong>{item.totalCalls.toLocaleString()} calls · {item.sla.toFixed(1)}% SLA</strong></div><div className="track"><div className={item.sla >= target ? "bar pass" : "bar fail"} style={{ width: `${Math.min(100, item.sla)}%` }} /></div></div>)}</div></section>
    <section className="result-grid"><ResultSection title="Passed SLA" subtitle={`At or above ${target}%`} items={passed} type="pass" /><ResultSection title="Failed SLA" subtitle={`Below ${target}%`} items={failed} type="fail" /></section>
    <footer><span>Signed in as {adminEmail}</span><span>Column Q is the SLA source · Zero-call rows excluded</span></footer>
  </main>;
}

function ResultSection({ title, subtitle, items, type }: { title: string; subtitle: string; items: Campaign[]; type: "pass" | "fail" }) {
  return <article className="result-card"><div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className={`count ${type}`}>{items.length}</span></div><div className="result-list">{items.length ? items.map((item) => <div key={item.name}><span><i className={type} />{item.name}</span><strong>{item.sla.toFixed(1)}%</strong></div>) : <p className="empty">No campaigns in this section.</p>}</div></article>;
}
