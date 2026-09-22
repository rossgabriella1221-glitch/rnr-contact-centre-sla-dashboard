export type CallAgent = {
  id: string; name: string; offered: number; inbound: number; attempts: number;
  outbound: number; consult: number; inTalk: number; outTalk: number;
  inHandle: number; outHandle: number; speed: number; ready: number; away: number;
  breakTime: number; busy: number; wrap: number; loggedIn: number;
};
export type WorkInput = { availableHours: number | null; nonVoiceMinutes: number | null; qa: number | null };
export type ProductivitySettings = { inboundMinutes: number | null; outboundMinutes: number | null; work: Record<string, WorkInput> };
export type Report = { id: string; report_month: string; file_name: string; agents: CallAgent[]; settings: ProductivitySettings; time_unit: string; updated_at: string };
export const emptySettings = (): ProductivitySettings => ({ inboundMinutes: null, outboundMinutes: null, work: {} });
export const numericFields = ['offered','inbound','attempts','outbound','consult','inTalk','outTalk','inHandle','outHandle','speed','ready','away','breakTime','busy','wrap','loggedIn'] as const;
export const calls = (a: CallAgent) => a.inbound + a.outbound;
export const ratio = (n: number, d: number) => d > 0 ? n / d * 100 : null;
export const inboundAht = (a: CallAgent) => a.inbound > 0 ? a.inHandle / a.inbound : null;
export function totals(agents: CallAgent[]) {
  const result = Object.fromEntries(numericFields.map(k => [k, 0])) as Record<typeof numericFields[number], number>;
  agents.forEach(a => numericFields.forEach(k => { result[k] += a[k]; }));
  return result;
}
export function productivity(a: CallAgent, s: ProductivitySettings) {
  const w = s.work[a.id];
  if (!w || !w.availableHours || w.nonVoiceMinutes === null || (a.inbound > 0 && s.inboundMinutes === null) || (a.outbound > 0 && s.outboundMinutes === null)) return null;
  return ((a.inbound * (s.inboundMinutes ?? 0)) + (a.outbound * (s.outboundMinutes ?? 0)) + w.nonVoiceMinutes) / (w.availableHours * 60) * 100;
}
export function validAgents(value: unknown): value is CallAgent[] {
  if (!Array.isArray(value) || !value.length || value.length > 2000) return false;
  const ids = new Set<string>();
  return value.every(a => {
    if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !a.id || a.id.length > 240 || ids.has(a.id) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 200) return false;
    ids.add(a.id);
    return numericFields.every(k => typeof a[k] === 'number' && Number.isFinite(a[k]) && a[k] >= 0 && a[k] <= 1e10) && ['offered','inbound','attempts','outbound','consult'].every(k => Number.isInteger(a[k])) && a.inbound <= a.offered && a.outbound <= a.attempts;
  });
}
export function validSettings(value: unknown, agents: CallAgent[]): value is ProductivitySettings {
  if (!value || typeof value !== 'object') return false;
  const s = value as ProductivitySettings;
  const valid = (v: unknown, max: number, min = 0) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max);
  if (!valid(s.inboundMinutes, 120, 0.01) || !valid(s.outboundMinutes, 120, 0.01) || !s.work || typeof s.work !== 'object' || Array.isArray(s.work)) return false;
  const ids = new Set(agents.map(a => a.id));
  return Object.entries(s.work).every(([id,w]) => ids.has(id) && w && valid(w.availableHours,744,0.01) && valid(w.nonVoiceMinutes,100000) && valid(w.qa,100));
}
