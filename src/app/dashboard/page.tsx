import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "./dashboard";
import { getAppConfig } from "@/lib/config";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { adminEmail } = getAppConfig();
  if (!user) redirect("/login");
  const isAdmin = user.email?.toLowerCase() === adminEmail;
  return <Dashboard userEmail={user.email ?? "User"} isAdmin={isAdmin} />;
}
