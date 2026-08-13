"use client";

import { useActionState } from "react";
import { createUser } from "./admin-actions";

export function UserAdmin() {
  const [state, action, pending] = useActionState(createUser, { error: "", success: "" });
  return <section className="admin-card no-print"><div><p className="eyebrow">Administrator</p><h2>Create user account</h2><p>Only accounts created here can sign in. There is no public signup.</p></div><form action={action}><input name="email" type="email" placeholder="user@example.com" aria-label="New user email" required /><input name="password" type="password" minLength={8} placeholder="Temporary password" aria-label="Temporary password" required /><button className="primary-button" disabled={pending}>{pending ? "Creating…" : "Create user"}</button></form>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}</section>;
}
