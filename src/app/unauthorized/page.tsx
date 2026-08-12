import Link from "next/link";
import { signOut } from "../login/actions";

export default function UnauthorizedPage() {
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">Access denied</p><h1>Not authorized</h1><p className="muted">Your account is not approved to view this dashboard.</p><form action={signOut}><button className="primary-button">Sign out</button></form><Link className="text-link" href="/login">Return to sign in</Link></section></main>;
}
