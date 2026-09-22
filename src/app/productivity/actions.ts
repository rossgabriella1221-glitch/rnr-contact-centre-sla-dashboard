'use server';
import { createClient } from '@/lib/supabase/server';
import { emptySettings, validAgents, validSettings } from '@/lib/productivity/model';
import { parseCallWorkbook, TimeUnit } from '@/lib/productivity/import';
import { revalidatePath } from 'next/cache';

export async function previewUpload(form: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const file = form.get('file');
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name) || file.size === 0 || file.size > 5*1024*1024) return { error: 'Choose an .xlsx file up to 5 MB.' };
  try { return { ...parseCallWorkbook(await file.arrayBuffer(), String(form.get('unit')) as TimeUnit), fileName: file.name.slice(0,255) }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'The workbook could not be read.' }; }
}

export async function saveReport(input: { month: string; fileName: string; agents: unknown; unit: string; replaceId?: string; expectedUpdatedAt?: string }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || !validAgents(input.agents) || !input.fileName || input.fileName.length>255 || !['seconds','minutes','excel-days'].includes(input.unit)) return { error: 'The report is invalid.' };
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const payload = { owner_id: user.id, report_month: `${input.month}-01`, file_name: input.fileName, agents: input.agents, time_unit: input.unit, updated_at: new Date().toISOString() };
  let result;
  if (input.replaceId) {
    const { data: current, error } = await sb.from('agent_productivity_reports').select('settings').eq('id',input.replaceId).eq('owner_id',user.id).eq('report_month',payload.report_month).eq('updated_at',input.expectedUpdatedAt ?? '').maybeSingle();
    if (error || !current) return { error: 'The saved report changed. Refresh before replacing it.' };
    const previous = current.settings ?? emptySettings();
    const allowed = new Set(input.agents.map(a=>a.id));
    const settings = { ...previous, work: Object.fromEntries(Object.entries(previous.work ?? {}).filter(([id])=>allowed.has(id))) };
    result = await sb.from('agent_productivity_reports').update({ ...payload, settings }).eq('id',input.replaceId).eq('owner_id',user.id).eq('updated_at',input.expectedUpdatedAt ?? '').select('id').maybeSingle();
  } else {
    result = await sb.from('agent_productivity_reports').insert({ ...payload, settings: emptySettings() }).select('id').single();
  }
  if (result.error) return { error: result.error.code==='23505' ? 'This month already has a report. Refresh and use Replace month.' : 'Report not saved. Check your connection and try again.' };
  if (!result.data) return { error: 'The report changed in another window. Refresh and try again.' };
  revalidatePath('/productivity');
  return { id: result.data.id };
}

export async function saveWorkInputs(id: string, settings: unknown, expectedUpdatedAt: string) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const { data: report } = await sb.from('agent_productivity_reports').select('agents').eq('id',id).eq('owner_id',user.id).single();
  if (!report || !validAgents(report.agents) || !validSettings(settings,report.agents)) return { error: 'Check the productivity inputs. Hours and standards must be positive; QA must be 0–100.' };
  const updatedAt = new Date().toISOString();
  const { data, error } = await sb.from('agent_productivity_reports').update({settings,updated_at:updatedAt}).eq('id',id).eq('owner_id',user.id).eq('updated_at',expectedUpdatedAt).select('id').maybeSingle();
  if (error || !data) return { error: 'Inputs were not saved. Refresh if another window updated this report.' };
  revalidatePath('/productivity');
  return { updatedAt };
}
