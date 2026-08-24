import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "./dashboard";
import { getAppConfig } from "@/lib/config";
import { emailToUsername } from "@/lib/username";
import type { Agent } from "./dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { adminEmail } = getAppConfig();
  if (!user) redirect("/login");
  const isAdmin = user.email?.toLowerCase() === adminEmail;
  const { data: saved } = await supabase
    .from("agent_kpi_dashboard")
    .select("file_name, agents, uploaded_at")
    .eq("id", 1)
    .maybeSingle();
  return <Dashboard
    username={emailToUsername(user.email ?? "User")}
    isAdmin={isAdmin}
    initialAgents={(saved?.agents as Agent[] | undefined) ?? undefined}
    initialFileName={saved?.file_name}
    initialUploadedAt={saved?.uploaded_at}
  />;
}
