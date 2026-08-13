"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/config";

export type CreateUserState = { error: string; success: string };

export async function createUser(_state: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const config = getAppConfig();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== config.adminEmail) return { error: "Administrator access required.", success: "" };
  if (!config.serviceRoleKey) return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel.", success: "" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) return { error: "Enter a valid email and a temporary password of at least 8 characters.", success: "" };

  const admin = createAdminClient(config.supabaseUrl, config.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "user" } });
  if (error) return { error: error.message, success: "" };
  return { error: "", success: `Account created for ${email}. Share the temporary password securely.` };
}
