"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <form action={action} className="login-form"><label>Username<input name="username" type="text" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>;
}
