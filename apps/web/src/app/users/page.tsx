"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getAccessToken } from "../../lib/auth";
import { AppShell } from "../components/app-shell";
import "./users.css";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";
type User = { id: string; name: string; email: string; role: "ADMIN" | "STAFF"; active: boolean };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${api}/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? "Request failed"); }
  return response.json();
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const fail = (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : "Request failed";
    setError(message === "EMAIL_IN_USE" ? "That email address is already in use." : message === "CANNOT_DEACTIVATE_SELF" ? "You cannot deactivate your own account." : message);
    setNotice("");
  };
  const load = async () => { const nextUsers = await request<User[]>("/users"); setUsers(nextUsers); };
  useEffect(() => {
    if (!getAccessToken()) { router.replace("/login"); return; }
    const expired = () => router.replace("/login?reason=expired");
    window.addEventListener("homebase-session-expired", expired);
    void request<User>("/auth/me").then(async (current) => {
      if (current.role !== "ADMIN") { router.replace("/"); return; }
      await load();
    }).catch((reason) => fail(reason)).finally(() => setLoading(false));
    return () => window.removeEventListener("homebase-session-expired", expired);
  }, [router]);
  const submit = (action: () => Promise<void>) => {
    if (saving) return;
    setSaving(true); setError("");
    void action().then(() => setNotice("Saved")).catch((reason) => fail(reason)).finally(() => setSaving(false));
  };
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    submit(async () => { await request<User>("/users", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") }) }); formElement.reset(); await load(); });
  };
  const update = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    submit(async () => { await request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), role: form.get("role") }) }); setEditing(null); await load(); });
  };
  const resetPassword = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    submit(async () => { await request<User>(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password: form.get("password") }) }); setEditing(null); await load(); });
  };
  const setActive = (user: User, active: boolean) => submit(async () => { await request<User>(`/users/${user.id}/${active ? "activate" : "deactivate"}`, { method: "POST" }); await load(); });

  return <AppShell><main className="users-shell"><header className="users-header"><div><p className="eyebrow">ADMINISTRATION</p><h1>Users</h1></div><button onClick={() => router.push("/dashboard")}>Back to dashboard</button></header>{notice && <p className="success">{notice}</p>}{error && <p className="error">{error}</p>}<section className="users-card"><h2>Add user</h2><form className="user-form" onSubmit={create}><label>Name<input name="name" autoComplete="off" required disabled={saving} /></label><label>Email<input name="email" type="email" autoComplete="off" required disabled={saving} /></label><label>Role<select name="role" defaultValue="STAFF" disabled={saving}><option>STAFF</option><option>ADMIN</option></select></label><label>Temporary password<input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={saving} /></label><button disabled={saving}>{saving ? "Saving…" : "Create"}</button></form></section><section className="users-card"><h2>People</h2>{loading ? <p className="muted">Loading users…</p> : users.length === 0 ? <p className="empty">No users yet.</p> : users.map((user) => <article className="user-row" key={user.id}><div><strong>{user.name}</strong><small>{user.active ? "Active" : "Inactive"}</small></div><span>{user.email}</span><span>{user.role}</span><span>{user.active ? "Active" : "Inactive"}</span><div className="user-actions"><button disabled={saving} onClick={() => setEditing(editing === user.id ? null : user.id)}>Edit</button><button disabled={saving} onClick={() => setActive(user, !user.active)}>{user.active ? "Deactivate" : "Activate"}</button></div>{editing === user.id && <><form className="user-edit" onSubmit={(event) => update(event, user.id)}><input name="name" defaultValue={user.name} required disabled={saving} /><input name="email" type="email" defaultValue={user.email} required disabled={saving} /><select name="role" defaultValue={user.role} disabled={saving}><option>STAFF</option><option>ADMIN</option></select><button disabled={saving}>Save</button><button type="button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button></form><form className="user-edit" onSubmit={(event) => resetPassword(event, user.id)}><input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="New temporary password" required disabled={saving} /><button disabled={saving}>Set password</button></form></>}</article>)}</section></main></AppShell>;
}
