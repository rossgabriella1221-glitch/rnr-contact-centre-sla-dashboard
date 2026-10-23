"use client";

import { useMemo, useState } from "react";
import { AgentPhoto } from "./agent-photo";
import { type Agent, isNightShift, rankingSort, scoreText } from "@/lib/agent-kpi";

export function ExecutiveOverview({ agents, fileName }: { agents: Agent[]; fileName: string }) {
  const [shift, setShift] = useState<"All" | "Day" | "Night">("All");
  const [query, setQuery] = useState("");
  const scoped = useMemo(() => agents.filter(a => shift === "All" || (isNightShift(a) ? "Night" : "Day") === shift), [agents, shift]);
  const scored = scoped.filter(a => a.finalKpi !== null);
  const avg = (get: (a: Agent) => number | null) => {
    const values = scored.map(get).filter((n): n is number => n !== null && Number.isFinite(n));
    return values.length ? scoreText(values.reduce((s, n) => s + n, 0) / values.length) + "%" : "—";
  };
  const ranked = [...scored].sort(rankingSort);
  const established = ranked.filter(a => !a.isNewAgent);
  const top = established.slice(0, 3);
  const newTop = ranked.filter(a => a.isNewAgent).slice(0, 3);
  const statuses = [
    { label: "Excellent", count: scored.filter(a => (a.finalKpi ?? 0) >= 90).length, color: "#39d6a2" },
    { label: "Good", count: scored.filter(a => (a.finalKpi ?? 0) >= 85 && (a.finalKpi ?? 0) < 90).length, color: "#60a5fa" },
    { label: "Needs improvement", count: scored.filter(a => (a.finalKpi ?? 0) < 85).length, color: "#fbbf24" }
  ];
  const leaders = [
    { label: "Best QA", agent: [...scored].filter(a => a.qaRate !== null).sort((a,b) => (b.qaRate ?? 0) - (a.qaRate ?? 0))[0], metric: (a: Agent) => scoreText(a.qaRate ?? 0) + "% QA" },
    { label: "Most Compliments", agent: [...scoped].filter(a => a.compliments > 0).sort((a,b) => b.compliments-a.compliments)[0], metric: (a: Agent) => a.compliments + " compliments" },
    { label: "Most Productive", agent: [...scored].filter(a => a.productivityRate !== null).sort((a,b) => (b.productivityRate ?? 0)-(a.productivityRate ?? 0))[0], metric: (a: Agent) => scoreText(a.productivityRate ?? 0) + "% productivity" }
  ];
  return <section className="executive-overview" aria-label="Executive performance overview">
    <style>{`
      .executive-overview{background:linear-gradient(140deg,#101f39,#0b1427);color:#eaf2ff;border:1px solid #2a3e5e;border-radius:22px;padding:26px;margin:20px 0 28px;box-shadow:0 18px 40px #07102224}
      .executive-overview *{box-sizing:border-box}.executive-overview h2,.executive-overview h3,.executive-overview p{color:inherit}
      .exec-head{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.exec-head h2{font-size:1.65rem;margin:4px 0}.exec-sub{color:#a8bddb!important;font-size:.85rem}
      .exec-filters{display:flex;gap:8px;flex-wrap:wrap}.exec-filters button{background:#172c4a;border:1px solid #3a5375;border-radius:10px;padding:8px 14px;color:#eaf2ff;cursor:pointer}.exec-filters button[aria-pressed=true]{background:#2363b9;border-color:#69a4fa}
      .exec-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0}.exec-stat,.exec-panel{background:#162842;border:1px solid #2c4262;border-radius:15px;padding:18px}.exec-stat span{display:block;color:#afc3df;font-size:.83rem}.exec-stat strong{display:block;font-size:1.75rem;margin-top:8px}
      .exec-columns{display:grid;grid-template-columns:1.3fr 1fr;gap:14px}.exec-panel h3{margin:0 0 14px;font-size:1.04rem}.exec-leader{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #2c4262}.exec-leader:first-of-type{border-top:0}.exec-rank{font-size:1.35rem}.exec-leader-name{flex:1;min-width:0}.exec-leader-name strong,.exec-leader-name small{display:block}.exec-leader-name small{color:#a8bddb}.exec-value{font-weight:700;color:#6ce4bb}.exec-status{display:flex;align-items:center;gap:10px;margin:12px 0}.exec-status-label{min-width:128px;font-size:.82rem}.exec-bar{height:10px;flex:1;background:#263a55;border-radius:10px;overflow:hidden}.exec-fill{height:100%;border-radius:10px}.exec-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.exec-mini strong,.exec-mini span{display:block}.exec-mini span{color:#afc3df;font-size:.8rem;margin-bottom:7px}.exec-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:.86rem}.exec-table th,.exec-table td{text-align:left;padding:10px;border-bottom:1px solid #2c4262}.exec-table th{color:#a8bddb}.exec-search{background:#0f1d33;color:white;border:1px solid #3a5375;border-radius:9px;padding:9px;width:100%;max-width:260px}.exec-table-wrap{overflow-x:auto}
      @media(max-width:900px){.exec-stats{grid-template-columns:repeat(2,1fr)}.exec-columns,.exec-mini{grid-template-columns:1fr}}@media(max-width:480px){.executive-overview{padding:14px}.exec-stats{gap:8px}.exec-stat{padding:12px}.exec-stat strong{font-size:1.35rem}}
      @media print{.executive-overview{background:white!important;color:#17243a!important}.exec-filters,.exec-search{display:none}.exec-stat,.exec-panel{background:white!important;color:#17243a!important}}
    `}</style>
    <div className="exec-head"><div><p className="exec-sub">OPERATIONS INTELLIGENCE / EXECUTIVE VIEW</p><h2>Agent Performance Overview</h2><p className="exec-sub">Source: {fileName} · {scored.length} agents with complete KPI scores</p></div><div className="exec-filters" aria-label="Filter by shift">{(["All","Day","Night"] as const).map(s => <button type="button" key={s} aria-pressed={shift===s} onClick={() => setShift(s)}>{s === "All" ? "All Shifts" : s + " Shift"}</button>)}</div></div>
    <div className="exec-stats"><div className="exec-stat"><span>Overall KPI</span><strong>{avg(a=>a.finalKpi)}</strong></div><div className="exec-stat"><span>QA Average</span><strong>{avg(a=>a.qaRate)}</strong></div><div className="exec-stat"><span>Average Away</span><strong>{scoped.length ? scoreText(scoped.reduce((s,a)=>s+a.awayRate,0)/scoped.length)+"%" : "—"}</strong></div><div className="exec-stat"><span>Agents / Scored</span><strong>{scoped.length} / {scored.length}</strong></div></div>
    <div className="exec-columns"><div className="exec-panel"><h3>🏆 Top 3 Overall Agents</h3>{top.length ? top.map((a,i)=><div className="exec-leader" key={a.name}><span className="exec-rank">{["🥇","🥈","🥉"][i]}</span><AgentPhoto name={a.name} size={46}/><div className="exec-leader-name"><strong>{a.name}</strong><small>{scoreText(a.qaRate ?? 0)}% QA · {scoreText(a.awayRate)}% away</small></div><span className="exec-value">{scoreText(a.finalKpi ?? 0)}%</span></div>):<p className="exec-sub">No eligible established agents</p>}</div><div className="exec-panel"><h3>Performance Status</h3>{statuses.map(s=><div className="exec-status" key={s.label}><span className="exec-status-label">{s.label} ({s.count})</span><div className="exec-bar"><div className="exec-fill" style={{width:(scored.length?s.count/scored.length*100:0)+"%",background:s.color}}/></div></div>)}<p className="exec-sub">Display bands: Excellent ≥90%, Good 85–89.99%, Needs improvement &lt;85%. Existing PASS/FAIL calculation remains unchanged.</p></div></div>
    <div className="exec-mini">{leaders.map(item=><div className="exec-panel" key={item.label}><span>{item.label}</span><div style={{display:"flex",alignItems:"center",gap:9}}>{item.agent && <AgentPhoto name={item.agent.name} size={38}/>}<strong>{item.agent?.name ?? "—"}</strong></div><p className="exec-sub">{item.agent ? item.metric(item.agent) : "No data"}</p></div>)}</div>
    <div className="exec-columns" style={{marginTop:14}}><div className="exec-panel"><h3>Top 3 New Agents</h3>{newTop.length ? newTop.map((a,i)=><div className="exec-leader" key={a.name}><span className="exec-rank">#{i+1}</span><AgentPhoto name={a.name} size={46}/><div className="exec-leader-name"><strong>{a.name}</strong><small>NEW AGENT</small></div><span className="exec-value">{scoreText(a.finalKpi ?? 0)}%</span></div>):<p className="exec-sub">No scored new agents</p>}</div><div className="exec-panel"><h3>Shift Comparison</h3>{(["Day","Night"] as const).map(s=>{const members=agents.filter(a=>(isNightShift(a)?"Night":"Day")===s&&a.finalKpi!==null);return <div className="exec-leader" key={s}><div className="exec-leader-name"><strong>{s} Shift</strong><small>{members.length} scored agents</small></div><span className="exec-value">{members.length?scoreText(members.reduce((t,a)=>t+(a.finalKpi??0),0)/members.length)+"%":"—"}</span></div>})}</div></div>
    <div className="exec-panel" style={{marginTop:14}}><div className="exec-head"><h3>Agent Rankings</h3><input className="exec-search" aria-label="Search agent name" placeholder="Search agents..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="exec-table-wrap"><table className="exec-table"><thead><tr><th>Rank</th><th>Agent</th><th>KPI</th><th>QA</th><th>Away</th><th>Status</th></tr></thead><tbody>{ranked.filter(a=>a.name.toLowerCase().includes(query.toLowerCase())).map(a=><tr key={a.name}><td>#{ranked.indexOf(a)+1}</td><td><span style={{display:"inline-flex",alignItems:"center",gap:9}}><AgentPhoto name={a.name} size={34}/>{a.name}{a.isNewAgent?" · New":""}</span></td><td>{scoreText(a.finalKpi??0)}%</td><td>{a.qaRate===null?"—":scoreText(a.qaRate)+"%"}</td><td>{scoreText(a.awayRate)}%</td><td>{a.status}</td></tr>)}</tbody></table></div></div>
  </section>;
}
