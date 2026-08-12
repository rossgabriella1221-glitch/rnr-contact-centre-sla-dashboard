export function getAppConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    adminEmail: process.env.ADMIN_EMAIL!.trim().toLowerCase(),
  };
}
