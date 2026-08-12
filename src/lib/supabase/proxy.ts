import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig } from "@/lib/config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getAppConfig();
  const supabase = createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.email?.toLowerCase() === config.adminEmail;
  if (request.nextUrl.pathname.startsWith("/dashboard") && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/unauthorized" : "/login";
    return NextResponse.redirect(url);
  }
  if (request.nextUrl.pathname === "/login" && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return response;
}
