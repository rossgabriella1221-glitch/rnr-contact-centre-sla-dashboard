import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailToUsername } from '@/lib/username';
import { Report } from '@/lib/productivity/model';
import { ProductivityDashboard } from './productivity-dashboard';
import './productivity.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agent Productivity | Connect Centre' };
export default async function ProductivityPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/productivity');
  const { report } = await searchParams;
  const { data: history, error } = await sb.from('agent_productivity_reports').select('id,report_month,file_name,updated_at').eq('owner_id',user.id).order('report_month',{ascending:false}).limit(120);
  const selected = history?.find(r=>r.id===report)?.id ?? history?.[0]?.id;
  const { data: saved, error: reportError } = selected ? await sb.from('agent_productivity_reports').select('*').eq('id',selected).eq('owner_id',user.id).single() : { data:null,error:null };
  return <ProductivityDashboard key={`${saved?.id ?? 'empty'}:${saved?.updated_at ?? ''}`} report={saved as Report | null} history={history ?? []} username={emailToUsername(user.email ?? '')} loadError={error || reportError ? 'Saved reports could not be loaded. Please retry; no report has been replaced.' : null}/>;
}
