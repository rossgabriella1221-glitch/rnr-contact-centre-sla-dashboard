"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/username";

export async function signIn(_previousState: { error: string }, formData: FormData) {
  const login = String(formData.get("username") ?? "");
  const email = usernameToEmail(login);
  const password = String(formData.get("password") ?? "");
  if (!login.trim()) return { error: "Enter your username." };
  if (!password) return { error: "Enter your password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
