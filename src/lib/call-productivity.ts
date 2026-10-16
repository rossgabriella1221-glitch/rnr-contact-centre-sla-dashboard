import * as XLSX from "xlsx";

export type CallActivity = {
  inboundAnswered: number;
  outboundConnected: number;
  inboundHandlingMinutes: number;
  outboundHandlingMinutes: number;
  loggedInMinutes: number;
  awayMinutes: number;
};

export function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Keep internal spaces: "Nurhidayah" and "Nur Hidayah" are different agents.
export function normalizeAgentName(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function durationMinutes(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric >= 0 ? numeric / 60 : null;
  const parts = String(value).trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const [hours, minutes, seconds = 0] = parts;
  return minutes < 60 && seconds < 60 ? hours * 60 + minutes + seconds / 60 : null;
}

// Numeric durations in the supplied telephony export are seconds, not Excel days.
export function readCallActivities(workbook: XLSX.WorkBook) {
  const activities = new Map<string, CallActivity>();
  const aliases = [
    ["Agent", "Agent Name"],
    ["Total Inbound Calls Answered", "Inbound Answered"],
    ["Total Outbound Calls Connected", "Outbound Connected"],
    ["Total Inbound Calls Handling Time", "Inbound Handling Time"],
    ["Total Outbound Calls Handling Time", "Outbound Handling Time"],
    ["Total Logged-In Time", "Logged-In Time"],
    ["Total Away Time", "Away Time"],
  ];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const headers = (rows[0] ?? []).map(normalizeName);
    const columns = aliases.map((names) => names.map((name) => headers.indexOf(normalizeName(name))).find((i) => i >= 0) ?? -1);
    if (columns.some((i) => i < 0)) continue;
    for (const row of rows.slice(1)) {
      const key = normalizeAgentName(row[columns[0]]);
      if (!key) continue; // Exclude the export's unnamed totals row.
      if (activities.has(key)) throw new Error(`Duplicate call details for ${String(row[columns[0]])}. Use one summary row per agent.`);
      const counts = columns.slice(1, 3).map((i) => row[i] === "" ? NaN : Number(row[i]));
      const times = columns.slice(3).map((i) => durationMinutes(row[i]));
      if (counts.some((n) => !Number.isInteger(n) || n < 0) || times.some((n) => n === null)) {
        throw new Error(`Missing or invalid call data for ${String(row[columns[0]])}.`);
      }
      const [inboundHandlingMinutes, outboundHandlingMinutes, loggedInMinutes, awayMinutes] = times as number[];
      if (awayMinutes > loggedInMinutes || inboundHandlingMinutes + outboundHandlingMinutes > loggedInMinutes) {
        throw new Error(`Call or away time exceeds logged-in time for ${String(row[columns[0]])}.`);
      }
      activities.set(key, { inboundAnswered: counts[0], outboundConnected: counts[1], inboundHandlingMinutes, outboundHandlingMinutes, loggedInMinutes, awayMinutes });
    }
  }
  return activities;
}
