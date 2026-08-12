import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/config";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { adminEmail } = getAppConfig();
  redirect(user?.email?.toLowerCase() === adminEmail ? "/dashboard" : "/login");
}
