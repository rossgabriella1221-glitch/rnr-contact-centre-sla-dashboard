"use server";

import { createClient } from "@/lib/supabase/server";

type DashboardAgent = {
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
  qaScore: number | null;
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

function validAgent(value: unknown): value is DashboardAgent {
  if (!value || typeof value !== "object") return false;
  const agent = value as Record<string, unknown>;
  const numberFields = ["totalCalls", "workHours", "complaints", "compliments", "late", "workingDays", "daysAttended", "nonWorkingDays", "awayMinutes", "loggedInMinutes", "feedbackScore", "attendanceRate", "attendanceScore", "awayRate", "awayScore", "lateScore", "callsScore", "baseKpi"];
  return typeof agent.name === "string"
    && agent.name.trim().length > 0
    && agent.name.length <= 200
    && numberFields.every((field) => typeof agent[field] === "number" && Number.isFinite(agent[field]))
    && (agent.qaRate === null || typeof agent.qaRate === "number" && Number.isFinite(agent.qaRate))
    && (agent.qaScore === null || typeof agent.qaScore === "number" && Number.isFinite(agent.qaScore))
    && (agent.finalKpi === null || typeof agent.finalKpi === "number" && Number.isFinite(agent.finalKpi))
    && (agent.status === "PASS" || agent.status === "FAIL" || agent.status === "REVIEW")
    && typeof agent.statusReason === "string"
    && typeof agent.isNewAgent === "boolean"
    && typeof agent.feedbackPass === "boolean"
    && typeof agent.attendancePass === "boolean"
    && typeof agent.latePass === "boolean";
}

export async function replaceDashboardData(agents: unknown[], fileName: string) {
  if (!Array.isArray(agents) || agents.length === 0 || agents.length > 2000 || !agents.every(validAgent)) {
    return { error: "The dashboard data could not be saved." };
  }

  const safeFileName = fileName.trim().slice(0, 255);
  if (!safeFileName) return { error: "The Excel filename is missing." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your login session has expired. Please sign in again." };

  const { error } = await supabase.from("agent_kpi_dashboard").upsert({
    id: 1,
    file_name: safeFileName,
    agents,
    uploaded_by: user.id,
    uploaded_at: new Date().toISOString(),
  }, { onConflict: "id" });

  return error ? { error: `The new Excel data was not saved: ${error.message}` } : { error: null };
}
