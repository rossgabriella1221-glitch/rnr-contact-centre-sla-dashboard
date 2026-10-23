"use client";

import { useMemo, useRef, useState } from "react";
import { AgentPhoto } from "./agent-photo";
import * as XLSX from "xlsx";
import { signOut } from "../login/actions";
import { UserAdmin } from "./user-admin";
import { ExecutiveOverview } from "./executive-overview";
import { replaceDashboardData } from "./data-actions";

import { type Agent, demoData, scoreProductivity, refreshSavedAgent, rankingSort, isNightShift, scoreText, escapeCsv, parseKpiWorkbook } from "@/lib/agent-kpi";

export type { Agent } from "@/lib/agent-kpi";

export function Dashboard({ username, isAdmin, initialAgents, initialFileName, initialUploadedAt }: { username: string; isAdmin: boolean; initialAgents?: Agent[]; initialFileName?: string; initialUploadedAt?: string }) {
  const savedAgents = useMemo(() => scoreProductivity(initialAgents?.map(refreshSavedAgent) ?? []), [initialAgents]);
  const hasSavedData = savedAgents.length > 0;
  const [agents, setAgents] = useState<Agent[]>(hasSavedData ? savedAgents : scoreProductivity(demoData));
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [broadcast, setBroadcast] = useState(false);
  const [fileName, setFileName] = useState(initialFileName ?? "Sample KPI overview");
  const [message, setMessage] = useState(hasSavedData ? `${initialAgents!.length} saved agents loaded${initialUploadedAt ? ` · Last upload ${new Date(initialUploadedAt).toLocaleString()}` : ""}.` : "Upload KPI.xlsx to replace the sample agent data.");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => [...agents].sort(rankingSort), [agents]);
  const establishedAgents = ranked.filter((item) => !item.isNewAgent && item.finalKpi !== null);
  const topThree = establishedAgents.slice(0, 3);
  const topNewAgents = ranked.filter((item) => item.isNewAgent && item.finalKpi !== null).slice(0, 3);
  const topCompliments = [...agents]
    .filter((item) => item.compliments > 0)
    .sort((a, b) => b.compliments - a.compliments || rankingSort(a, b))
    .slice(0, 2);
  const topAgent = establishedAgents[0];
  const scoredAgents = agents.filter((item) => item.finalKpi !== null);
  const averageScore = scoredAgents.length ? scoredAgents.reduce((sum, item) => sum + (item.finalKpi ?? 0), 0) / scoredAgents.length : 0;
  const averageQa = scoredAgents.length ? scoredAgents.reduce((sum, item) => sum + (item.qaRate ?? 0), 0) / scoredAgents.length : 0;
  const averageAway = agents.length ? agents.reduce((sum, item) => sum + item.awayRate, 0) / agents.length : 0;
  const passed = agents.filter((item) => item.status === "PASS").length;
  const failed = agents.filter((item) => item.status === "FAIL").length;
  const newAgents = agents.filter((item) => item.isNewAgent).length;
  const nightShiftScored = scoredAgents.filter(isNightShift);
  const dayShiftScored = scoredAgents.filter((item) => !isNightShift(item));
  const nightShiftSla = nightShiftScored.length ? nightShiftScored.reduce((sum, item) => sum + (item.finalKpi ?? 0), 0) / nightShiftScored.length : null;
  const dayShiftSla = dayShiftScored.length ? dayShiftScored.reduce((sum, item) => sum + (item.finalKpi ?? 0), 0) / dayShiftScored.length : null;
  const shiftWinner = nightShiftSla === null || dayShiftSla === null ? "Awaiting complete data" : nightShiftSla === dayShiftSla ? "Tie" : nightShiftSla > dayShiftSla ? "Night Shift" : "Day Shift";

  async function upload(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellStyles: true });
      const next = parseKpiWorkbook(workbook);
      if (!next.length) throw new Error("No agent rows found");
      setSaving(true);
      const result = await replaceDashboardData(next, file.name);
      if (result.error) throw new Error(result.error);
      setAgents(next);
      setFileName(file.name);
      setMessage(`${next.length} agents saved and ranked. ${next.filter((agent) => agent.productivityRate !== null).length} have matched call details. Missing call details require review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this workbook.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function exportCsv() {
    const lines: (string | number)[][] = [["Rank", "Agent Name", "New Agent", "Other Non Voice", "Total Calls", "Complaints", "Compliments", "Late", "Working Days", "Days Attended", "Non Working Days", "Away %", "QA %", "Feedback Score", "Attendance Score", "Late Score", "Away Score", "QA Score", "Inbound Answered", "Outbound Connected", "Inbound Handling Hours", "Outbound Handling Hours", "Logged-in Hours", "Away Hours", "Calls Per Hour", "Productivity %", "Productivity Points", "Base KPI", "Final KPI", "Status", "Reason"], ...ranked.map((a, i) => [i + 1, a.name, a.isNewAgent ? "Yes" : "No", a.otherNonVoice ? "Yes" : "No", a.totalCalls, a.complaints, a.compliments, a.late, a.workingDays, a.daysAttended, a.nonWorkingDays, a.awayRate, a.qaRate ?? "", a.feedbackScore, a.attendanceScore, a.lateScore, a.awayScore, a.qaScore ?? "", a.inboundAnswered ?? "", a.outboundConnected ?? "", a.inboundHandlingMinutes == null ? "" : a.inboundHandlingMinutes / 60, a.outboundHandlingMinutes == null ? "" : a.outboundHandlingMinutes / 60, a.loggedInMinutes / 60, a.awayMinutes / 60, a.callsPerHour ?? "", a.productivityRate ?? "", a.productivityScore ?? "", a.baseKpi, a.finalKpi ?? "", a.status, a.statusReason])];
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

    <nav className="no-print" aria-label="Dashboard sections" style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>{[["overview","Executive Overview"],["leaders","Top Performers"],["compliments","Compliments"],["shifts","Shift Comparison"],["scoring","KPI Scoring"],["agents","All Agents"],...(isAdmin ? [["admin","Admin"]] : [])].map(([key,label]) => <button type="button" key={key} aria-current={activeTab===key?"page":undefined} onClick={()=>setActiveTab(key)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #456182",background:activeTab===key?"#215da7":"#162842",color:"#fff",fontWeight:activeTab===key?700:400,cursor:"pointer"}}>{label}</button>)}</nav>
    {activeTab === "overview" && <ExecutiveOverview agents={agents} fileName={fileName} />}

    {activeTab === "admin" && isAdmin && <UserAdmin />}
    {activeTab === "agents" && agents.some((a) => a.productivityRate == null) && <p className="status-copy" role="status">Call details are missing for some agents. Upload the workbook containing both KPI and call details to calculate their new scores. Existing records are retained.</p>}

    {activeTab === "leaders" &&     <section className="top-three-card"><div className="section-heading"><div><p className="eyebrow">Best overall performance</p><h2>Top 3 Overall Agents</h2><p>One overall score out of 100: Productivity 20 + Feedback 20 + Attendance 20 + Lateness 10 + Away 10 + QA 20. Excludes new agents. Ties: lowest Away %, highest QA, fewest complaints, then fewest late.</p></div></div><div className="top-three-grid">{topThree.length ? topThree.map((agent, index) => <article key={agent.name}><span className="top-three-rank">#{index + 1}</span><AgentPhoto name={agent.name} size={62}/><strong>{agent.name}</strong><p>{scoreText(agent.finalKpi ?? 0)}/100 Overall</p><small>{agent.totalCalls} calls handled · {scoreText(agent.productivityRate ?? 0)}% productivity · {scoreText(agent.productivityScore ?? 0)}/20 productivity points</small><small>{scoreText(agent.qaRate ?? 0)}% QA · {scoreText(agent.awayRate)}% away · {agent.status}</small></article>) : <p className="muted">No established agents have complete scoring data.</p>}</div></section>}

    {activeTab === "leaders" &&     <section className="top-three-card new-agent-panel"><div className="section-heading"><div><p className="eyebrow">Yellow-highlighted agents</p><h2>Top 3 New Agents</h2><p>Uses the same ranking rules and only includes yellow-highlighted Excel rows.</p></div></div><div className="top-three-grid">{topNewAgents.length ? topNewAgents.map((agent, index) => <article key={agent.name}><span className="top-three-rank">#{index + 1}</span><AgentPhoto name={agent.name} size={62}/><strong>{agent.name}</strong><span className="new-agent-badge">NEW AGENT</span><p>{scoreText(agent.finalKpi ?? 0)}% KPI</p><small>{scoreText(agent.qaRate ?? 0)}% QA · {scoreText(agent.awayRate)}% away · {agent.status}</small></article>) : <p className="muted">No new agents have complete scoring data.</p>}</div></section>}

    {activeTab === "compliments" && <section className="top-three-card"><div className="section-heading"><div><p className="eyebrow">Customer recognition</p><h2>Top Compliments</h2><p>Highest compliment count. KPI ranking rules break any ties.</p></div></div><div className="top-three-grid">{topCompliments.length ? topCompliments.map((agent, index) => <article key={agent.name}><span className="top-three-rank">{index === 0 ? "1st Place" : "1st Runner-Up"}</span><AgentPhoto name={agent.name} size={62}/><strong>{agent.name}</strong><p>{agent.compliments} {agent.compliments === 1 ? "compliment" : "compliments"}</p><small>{scoreText(agent.finalKpi ?? 0)}% KPI · {agent.status}</small></article>) : <p className="muted">No compliments were recorded.</p>}</div></section>}

    {activeTab === "shifts" &&     <section className="shift-comparison-card"><div className="section-heading"><div><p className="eyebrow">Shift performance</p><h2>Night Shift vs Day Shift</h2><p>Overall SLA is the average Final KPI of agents with a QA score in each shift.</p></div><span className="benchmark">Top SLA: {shiftWinner}</span></div><div className="shift-comparison-grid"><article className={shiftWinner === "Night Shift" ? "shift-winner" : ""}><span>Night Shift</span><strong>{nightShiftSla === null ? "—" : `${nightShiftSla.toFixed(1)}%`}</strong><small>{nightShiftScored.length} scored agents</small></article><article className={shiftWinner === "Day Shift" ? "shift-winner" : ""}><span>Day Shift</span><strong>{dayShiftSla === null ? "—" : `${dayShiftSla.toFixed(1)}%`}</strong><small>{dayShiftScored.length} scored agents</small></article></div></section>}

    {activeTab === "overview" &&     <section className="metrics-grid kpi-seven"><article><p>Top Agent</p><div style={{display:"flex",alignItems:"center",gap:8}}>{topAgent && <AgentPhoto name={topAgent.name} size={48}/>}<strong className="top-agent-name">{topAgent?.name ?? "—"}</strong></div><span>{topAgent ? `${scoreText(topAgent.finalKpi ?? 0)}% KPI` : "No data"}</span></article><article><p>Overall KPI</p><strong>{averageScore.toFixed(1)}%</strong></article><article><p>QA</p><strong>{averageQa.toFixed(1)}%</strong></article><article><p>Away</p><strong>{averageAway.toFixed(1)}%</strong></article><article><p>Passed</p><strong className="positive">{passed}</strong></article><article><p>Failed</p><strong className="negative">{failed}</strong></article><article><p>New Agents</p><strong>{newAgents}</strong></article></section>}

    {activeTab === "scoring" &&     <section className="scoring-card"><div className="section-heading"><div><p className="eyebrow">100-point framework</p><h2>KPI scoring rules</h2></div><span className="benchmark">Final KPI pass mark: 85%</span></div><div className="score-rules six"><div><strong>20</strong><span>Productivity</span><small>Agent handling % ÷ highest handling % in this upload × 20</small></div><div><strong>20</strong><span>Feedback</span><small>3 compliments offset each complaint</small></div><div><strong>20</strong><span>Attendance</span><small>8h: ≤5 days · 12h: ≤3 days</small></div><div><strong>10</strong><span>Late</span><small>≤3 = 10 · above 3 = 0</small></div><div><strong>10</strong><span>Away</span><small>Non Voice Yes: fixed 6/10; No: 10 × (1 − min(Away %, 20%)/20%)</small></div><div><strong>20</strong><span>QA</span><small>QA % contributes up to 20 points</small></div></div><p className="muted">Total calls = inbound answered + outbound connected. Productivity uses all logged-in time; away is not deducted. Points are relative to this upload and may change when the comparison group changes. Call totals and calls/hour provide context; they add no separate points. Missing call data requires review and re-upload. QA remains proportional, with no automatic failure below 85% QA.</p></section>}

    {activeTab === "agents" &&     <section className="detail-card"><div className="section-heading"><div><p className="eyebrow">Full scoring breakdown</p><h2>Every Agent</h2></div></div><div className="table-wrap"><table className="kpi-table"><thead><tr><th>Rank</th><th>Agent</th><th>Non Voice</th><th>Inbound answered</th><th>Outbound connected</th><th>Total handled</th><th>Inbound handling (hours)</th><th>Outbound handling (hours)</th><th>Logged-in (hours)</th><th>Away (hours)</th><th>Calls/hour</th><th>Productivity %</th><th>Productivity Pts</th><th>Complaints</th><th>Compliments</th><th>Late</th><th>Attendance</th><th>Away %</th><th>QA %</th><th>Feedback Pts</th><th>Attendance Pts</th><th>Late Pts</th><th>Away Pts</th><th>QA Pts</th><th>Subtotal</th><th>Final KPI</th><th>Status</th></tr></thead><tbody>{ranked.map((a, i) => <tr key={a.name} className={a.isNewAgent ? "new-agent-row" : ""}><td>#{i + 1}</td><td><span style={{display:"inline-flex",alignItems:"center",gap:8}}><AgentPhoto name={a.name} size={36}/><strong>{a.name}</strong></span>{a.isNewAgent && <span className="new-agent-badge">NEW AGENT</span>}</td><td>{a.otherNonVoice ? "Yes · Fixed 6 pts" : "No"}</td><td>{a.inboundAnswered ?? "—"}</td><td>{a.outboundConnected ?? "—"}</td><td>{a.totalCalls}</td><td>{a.inboundHandlingMinutes == null ? "—" : scoreText(a.inboundHandlingMinutes / 60)}</td><td>{a.outboundHandlingMinutes == null ? "—" : scoreText(a.outboundHandlingMinutes / 60)}</td><td>{scoreText(a.loggedInMinutes / 60)}</td><td>{scoreText(a.awayMinutes / 60)}</td><td>{a.callsPerHour == null ? "—" : scoreText(a.callsPerHour)}</td><td>{a.productivityRate == null ? "—" : `${scoreText(a.productivityRate)}%`}</td><td>{a.productivityScore == null ? "—" : `${scoreText(a.productivityScore)}/20`}</td><td>{a.complaints}</td><td>{a.compliments}</td><td>{a.late}</td><td>{a.daysAttended}/{a.workingDays} · {a.nonWorkingDays} non-work</td><td>{scoreText(a.awayRate)}%</td><td>{a.qaRate === null ? "—" : `${scoreText(a.qaRate)}%`}</td><td>{a.feedbackScore}/20</td><td>{a.attendanceScore}/20</td><td>{a.lateScore}/10</td><td>{scoreText(a.awayScore)}/10</td><td>{a.qaScore === null ? "—" : `${scoreText(a.qaScore)}/20`}</td><td>{scoreText(a.baseKpi)}/80</td><td><strong>{a.finalKpi === null ? "—" : `${scoreText(a.finalKpi)}%`}</strong></td><td><span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span><small className="status-reason">{a.statusReason}</small></td></tr>)}</tbody></table></div></section>}

    <footer><span>Signed in as {username} · {isAdmin ? "Administrator" : "User"}</span><span>Column B retained in Excel but excluded from all scoring</span></footer>
  </main>;
}
