"use client";

import { useActionState } from "react";
import { createUser } from "./admin-actions";

export function UserAdmin() {
  const [state, action, pending] = useActionState(createUser, { error: "", success: "" });
  return <section className="admin-card no-print"><div><p className="eyebrow">Administrator</p><h2>Create user account</h2><p>Create a unique username. There is no public signup.</p></div><form action={action}><input name="username" type="text" minLength={3} maxLength={32} placeholder="Username" aria-label="New username" required /><input name="password" type="password" minLength={8} placeholder="Temporary password" aria-label="Temporary password" required /><button className="primary-button" disabled={pending}>{pending ? "Creating…" : "Create user"}</button></form>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}</section>;
}
