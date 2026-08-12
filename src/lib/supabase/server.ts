import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAppConfig } from "@/lib/config";

export async function createClient() {
  const cookieStore = await cookies();
  const config = getAppConfig();
  return createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* proxy.ts refreshes cookies when Server Components cannot. */ }
      },
    },
  });
}
