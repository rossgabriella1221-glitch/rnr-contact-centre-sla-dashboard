import * as XLSX from "xlsx";
import { readCallActivities, normalizeName, normalizeAgentName } from "./call-productivity";

export type Agent = {
  name: string;
  totalCalls: number;
  inboundAnswered?: number | null;
  outboundConnected?: number | null;
  inboundHandlingMinutes?: number | null;
  outboundHandlingMinutes?: number | null;
  productivityRate?: number | null;
  productivityScore?: number | null;
  callsPerHour?: number | null;
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
  qaScore: number | null;
  otherNonVoice: boolean;
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

export type StyledCell = XLSX.CellObject & {
  s?: {
    patternType?: string;
    fgColor?: { rgb?: string; indexed?: number };
    bgColor?: { rgb?: string; indexed?: number };
    fill?: {
      fgColor?: { rgb?: string; indexed?: number };
      bgColor?: { rgb?: string; indexed?: number };
    };
  };
};

export const demoData: Agent[] = [
  scoreAgent({ name: "Agent A", totalCalls: 620, workHours: 8, complaints: 0, compliments: 2, late: 1, workingDays: 22, daysAttended: 21, nonWorkingDays: 1, awayMinutes: 18, loggedInMinutes: 480, qaRate: 94, otherNonVoice: false, isNewAgent: false }),
  scoreAgent({ name: "Agent B", totalCalls: 540, workHours: 12, complaints: 1, compliments: 3, late: 2, workingDays: 18, daysAttended: 17, nonWorkingDays: 1, awayMinutes: 30, loggedInMinutes: 650, qaRate: 91, otherNonVoice: true, isNewAgent: true }),
];

export function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const NIGHT_SHIFT_AGENTS = new Set([
  "Cindy", "Clyde", "Edmund", "Julia", "Kelvin", "Mariyam", "Rose", "Roslinda", "Shaera", "Sue", "Michelle",
].map(normalized));

export function isNightShift(agent: Agent) {
  return NIGHT_SHIFT_AGENTS.has(normalized(agent.name));
}

export function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function qaValue(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = numberValue(String(value).replace("%", ""));
  return Math.max(0, Math.min(100, parsed > 0 && parsed <= 1 ? parsed * 100 : parsed));
}

export function durationMinutes(value: unknown) {
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

export function scoreAgent(input: Omit<Agent, "qaScore" | "feedbackScore" | "attendanceRate" | "attendanceScore" | "awayRate" | "awayScore" | "lateScore" | "callsScore" | "baseKpi" | "finalKpi" | "status" | "statusReason" | "feedbackPass" | "attendancePass" | "latePass">): Agent {
  const callsScore = 0;
  const feedbackPass = input.complaints === 0 || input.compliments >= input.complaints * 3;
  const feedbackScore = feedbackPass ? 20 : 0;
  const attendanceRate = input.workingDays > 0 ? Math.min(100, Math.round((input.daysAttended / input.workingDays) * 10000) / 100) : 0;
  const attendancePass = input.workHours >= 12 ? input.nonWorkingDays <= 3 : input.nonWorkingDays <= 5;
  const attendanceScore = attendancePass ? 20 : 0;
  const rawAwayRate = input.loggedInMinutes > 0 ? Math.min(100, Math.round((input.awayMinutes / input.loggedInMinutes) * 10000) / 100) : 0;
  const awayRate = input.otherNonVoice ? Math.round((rawAwayRate / 2) * 100) / 100 : rawAwayRate;
  const awayScore = input.otherNonVoice ? 6 : Math.round(Math.max(0, 10 * (1 - Math.min(awayRate, 20) / 20)) * 100) / 100;
  const latePass = input.late <= 3;
  const lateScore = latePass ? 10 : 0;
  const baseKpi = Math.round((callsScore + feedbackScore + attendanceScore + lateScore + awayScore) * 100) / 100;
  const qaScore = input.qaRate === null ? null : Math.round(input.qaRate * 20) / 100;
  const finalKpi = qaScore === null ? null : Math.round((baseKpi + qaScore) * 100) / 100;
  const status = !feedbackPass ? "FAIL" : input.qaRate === null ? "REVIEW" : (finalKpi ?? 0) < 85 ? "FAIL" : "PASS";
  const statusReason = !feedbackPass ? "Complaint not offset by 3 compliments" : input.qaRate === null ? "QA missing" : (finalKpi ?? 0) < 85 ? "Final KPI below 85%" : "Targets achieved";
  return {
    ...input,
    qaScore,
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

export function isYellow(cell?: StyledCell) {
  const style = cell?.s;
  const foreground = style?.fgColor ?? style?.fill?.fgColor;
  const background = style?.bgColor ?? style?.fill?.bgColor;
  const indexedYellow = foreground?.indexed === 5 || foreground?.indexed === 6 || foreground?.indexed === 13;
  if (indexedYellow) return true;
  const rawRgb = (foreground?.rgb ?? background?.rgb ?? "").toUpperCase();
  const rgb = rawRgb.length === 8 ? rawRgb.slice(2) : rawRgb;
  if (!rgb || rgb.length !== 6) return false;
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  return r >= 200 && g >= 180 && b <= 170;
}

export function makeHeaderMap(headers: unknown[]): HeaderMap {
  const map: HeaderMap = {};
  headers.forEach((header, index) => { map[normalized(header)] = index; });
  return map;
}

export function findHeader(map: HeaderMap, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalized(alias);
    if (key in map) return map[key];
  }
  return -1;
}

export function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function scoreText(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function rankingSort(a: Agent, b: Agent) {
  return (b.finalKpi ?? -1) - (a.finalKpi ?? -1) || a.awayRate - b.awayRate || (b.qaRate ?? -1) - (a.qaRate ?? -1) || a.complaints - b.complaints || a.late - b.late || a.name.localeCompare(b.name);
}

export function refreshSavedAgent(agent: Agent): Agent {
  return scoreAgent({
    name: agent.name,
    totalCalls: Number(agent.totalCalls ?? 0),
    inboundAnswered: agent.inboundAnswered ?? null,
    outboundConnected: agent.outboundConnected ?? null,
    inboundHandlingMinutes: agent.inboundHandlingMinutes ?? null,
    outboundHandlingMinutes: agent.outboundHandlingMinutes ?? null,
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
    otherNonVoice: Boolean(agent.otherNonVoice),
    isNewAgent: Boolean(agent.isNewAgent),
  });
}

export function scoreProductivity(agents: Agent[]): Agent[] {
  const rates = agents.map((a) => a.inboundHandlingMinutes != null && a.outboundHandlingMinutes != null && a.inboundAnswered != null && a.outboundConnected != null && a.loggedInMinutes > 0
    ? (a.inboundHandlingMinutes + a.outboundHandlingMinutes) / a.loggedInMinutes * 100 : null);
  const benchmark = Math.max(0, ...rates.map((rate) => rate ?? 0));
  return agents.map((a, i) => {
    const productivityRate = rates[i];
    const productivityScore = productivityRate === null ? null : benchmark > 0 ? Math.round(productivityRate / benchmark * 2000) / 100 : 0;
    const baseKpi = Math.round((a.feedbackScore + a.attendanceScore + a.lateScore + a.awayScore + (productivityScore ?? 0)) * 100) / 100;
    const finalKpi = productivityScore === null || a.qaScore === null ? null : Math.round((baseKpi + a.qaScore) * 100) / 100;
    const missing = productivityScore === null ? "Call details missing or logged-in time is zero; re-upload KPI and call details" : a.qaScore === null ? "QA missing" : null;
    const status = !a.feedbackPass ? "FAIL" : missing ? "REVIEW" : (finalKpi ?? 0) < 85 ? "FAIL" : "PASS";
    const statusReason = !a.feedbackPass ? "Complaint not offset by 3 compliments" : missing ?? ((finalKpi ?? 0) < 85 ? "Final KPI below 85%" : "Targets achieved");
    return { ...a, productivityRate, productivityScore, callsScore: productivityScore ?? 0, callsPerHour: productivityRate === null ? null : a.totalCalls / (a.loggedInMinutes / 60), baseKpi, finalKpi, status, statusReason };
  });
}

export function parseKpiWorkbook(workbook: XLSX.WorkBook): Agent[] {
const activities = readCallActivities(workbook);
const kpiSheetName = workbook.SheetNames.find((name) => {
  const headers = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: "" })[0] ?? [];
  return headers.some((header) => normalizeName(header) === "workingdays");
});
if (!kpiSheetName) throw new Error("No KPI worksheet with Working Days was found.");
const sheet = workbook.Sheets[kpiSheetName];
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
  otherNonVoice: findHeader(headerMap, ["Other non Voice (Yes/No)", "Other Non Voice", "Non Voice", "Non-Voice"]),
};
const requiredIndexes = Object.entries(index).filter(([key]) => key !== "otherNonVoice").map(([, value]) => value);
if (requiredIndexes.some((i) => i < 0)) {
  throw new Error("Required KPI headers are missing");
}

const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
const imported = rows.slice(1).flatMap((rawRow, rowOffset) => {
  const row = rawRow as unknown[];
  const name = String(row[index.name] ?? "").trim();
  if (!name) return [];
  const excelRow = range.s.r + rowOffset + 2;
  let isNewAgent = false;
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
    if (isYellow(sheet[address] as StyledCell | undefined)) { isNewAgent = true; break; }
  }
  const activity = activities.get(normalizeAgentName(name));
  return [scoreAgent({
    name,
    inboundAnswered: activity?.inboundAnswered ?? null,
    outboundConnected: activity?.outboundConnected ?? null,
    inboundHandlingMinutes: activity?.inboundHandlingMinutes ?? null,
    outboundHandlingMinutes: activity?.outboundHandlingMinutes ?? null,
    totalCalls: activity ? activity.inboundAnswered + activity.outboundConnected : Math.max(0, numberValue(row[index.totalCalls])),
    workHours: numberValue(row[index.workHours]),
    complaints: Math.max(0, numberValue(row[index.complaints])),
    compliments: Math.max(0, numberValue(row[index.compliments])),
    late: Math.max(0, numberValue(row[index.late])),
    workingDays: Math.max(0, numberValue(row[index.workingDays])),
    daysAttended: Math.max(0, numberValue(row[index.daysAttended])),
    nonWorkingDays: Math.max(0, numberValue(row[index.nonWorkingDays])),
    awayMinutes: activity?.awayMinutes ?? durationMinutes(row[index.awayTime]),
    loggedInMinutes: activity?.loggedInMinutes ?? durationMinutes(row[index.loggedInTime]),
    qaRate: qaValue(row[index.qa]),
    otherNonVoice: index.otherNonVoice >= 0 && ["yes", "y", "true", "1"].includes(String(row[index.otherNonVoice] ?? "").trim().toLowerCase()),
    isNewAgent,
  })];
});

const next = scoreProductivity(imported);
  return next;
}
