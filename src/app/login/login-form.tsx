"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <form action={action} className="login-form"><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>;
}
