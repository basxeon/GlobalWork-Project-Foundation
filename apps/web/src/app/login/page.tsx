"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAccessToken } from "../../lib/auth";
import "./login.css";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";

export default function LoginPage() {
  return <Suspense fallback={<main className="login-shell"><section className="login-card">Loading…</section></main>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sessionExpired = searchParams.get("reason") === "expired";

  const login = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    void fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (response) => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "Unable to sign in.");
      setAccessToken(body.accessToken);
      setPassword("");
      router.replace("/dashboard");
    }).catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : "Unable to sign in.";
      setError(message === "INVALID_CREDENTIALS" ? "Email or password is incorrect." : message === "USER_INACTIVE" ? "This user account is inactive." : message);
    }).finally(() => setSaving(false));
  };

  return <main className="login-shell"><section className="login-card"><p className="eyebrow">GLOBALWORK OS</p><h1>Welcome back</h1><p>Sign in to continue managing your projects, documents, and tasks.</p>{sessionExpired && <p className="error">Your session expired. Please sign in again.</p>}{error && <p className="error">{error}</p>}<form className="login-form" onSubmit={login}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={saving} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={saving} /></label><button disabled={saving}>{saving ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
