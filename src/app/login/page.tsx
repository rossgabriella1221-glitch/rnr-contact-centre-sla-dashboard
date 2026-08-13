import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <main className="login-shell"><section className="login-card"><div className="brand-mark">CC</div><p className="eyebrow">Secure operations portal</p><h1>Connect Centre<br />SLA Dashboard</h1><p className="muted">Sign in with an account created by your administrator.</p><LoginForm /><p className="security-note">Private access · No public registration</p></section></main>;
}
