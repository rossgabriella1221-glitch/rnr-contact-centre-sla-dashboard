import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "./dashboard";
import { getAppConfig } from "@/lib/config";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { adminEmail } = getAppConfig();
  if (!user) redirect("/login");
  if (user.email?.toLowerCase() !== adminEmail) redirect("/unauthorized");
  return <Dashboard adminEmail={user.email ?? "Administrator"} />;
}
