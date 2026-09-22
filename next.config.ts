import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's file-based deployment builder loads these at build time. Mapping
  // them keeps Proxy (Middleware) and Node server functions on the same config.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  },
};

export default nextConfig;
