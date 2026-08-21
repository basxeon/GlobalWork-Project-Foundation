"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { apiCall, Company, Contact, Project, Task } from "../../lib/api";
import { dueLabel, dueState } from "../../lib/format";
import { AppShell, useCurrentUser, useDateFormat, useTimeZone } from "../components/app-shell";
import { RowMenu } from "../components/row-menu";
import { SortHeader, useSort } from "../components/sortable";
import "../app-pages.css";

type ProjectRow = Project & { taskDone: number; taskTotal: number };

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const showDate = useDateFormat();
  const timeZone = useTimeZone();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<Project | "new" | null>(
    searchParams.get("new") === "1" ? "new" : null,
  );
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [nextProjects, nextContacts, nextCompanies] = await Promise.all([
        apiCall<Project[]>("/projects"),
        apiCall<Contact[]>("/contacts"),
        apiCall<Company[]>("/companies"),
      ]);
      const rows = await Promise.all(
        nextProjects.map(async (project) => {
          const tasks = await apiCall<Task[]>(`/projects/${project.id}/tasks`);
          return {
            ...project,
            taskDone: tasks.filter((task) => task.status === "COMPLETED").length,
            taskTotal: tasks.length,
          };
        }),
      );
      setProjects(rows);
      setContacts(nextContacts);
      setCompanies(nextCompanies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Projects failed");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (status === "ALL" || project.status === status) &&
          project.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [projects, search, status],
  );
  const contactName = (id?: string | null) =>
    contacts.find((item) => item.id === id)?.name ?? "—";
  const companyName = (id?: string | null) => {
    const company = companies.find((item) => item.id === id);
    return company?.legalNameEn || company?.legalNameTh || "—";
  };
  // Default view is the one a tracker is actually used for: what is due next.
  const { sort, toggle, sorted } = useSort(
    filtered,
    {
      title: (project) => project.title,
      contact: (project) => contactName(project.contactId),
      company: (project) => companyName(project.companyId),
      status: (project) => project.status,
      tasks: (project) => project.taskTotal,
      dueDate: (project) => project.dueDate,
      updatedAt: (project) => project.updatedAt,
    },
    { key: "dueDate", direction: "asc" },
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const body = {
      title: form.get("title"),
      description: form.get("description") || undefined,
      contactId: form.get("contactId") || undefined,
      companyId: form.get("companyId") || undefined,
      dueDate: form.get("dueDate") || undefined,
      ...(editing === "new" ? { createdById: user.id } : { status: form.get("status") }),
    };
    void apiCall<Project>(editing === "new" ? "/projects" : `/projects/${editing.id}`, {
      method: editing === "new" ? "POST" : "PATCH",
      body: JSON.stringify(body),
    })
      .then(async () => {
        setEditing(null);
        setNotice(editing === "new" ? "Project created" : "Project updated");
        await load();
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Save failed"))
      .finally(() => setSaving(false));
  };
  const remove = () => {
    if (!deleting || saving) return;
    setSaving(true);
    void apiCall(`/projects/${deleting.id}`, { method: "DELETE", body: JSON.stringify({ deletedById: user.id }) })
      .then(async () => { setDeleting(null); setNotice("Project deleted"); await load(); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Delete failed"))
      .finally(() => setSaving(false));
  };

  return <>
    <header className="page-header"><div><p className="eyebrow">PROJECTS</p><h1>Projects</h1><p>Search, review and manage every active project.</p></div><button className="btn primary" onClick={() => setEditing("new")}>+ New Project</button></header>
    <div className="feedback" aria-live="polite">{notice && <p className="success">{notice}</p>}{error && <p className="error">{error}</p>}</div>
    <div className="page-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects…" aria-label="Search projects" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filter"><option value="ALL">All statuses</option><option>TODO</option><option>DOING</option><option>DONE</option><option>CANCELLED</option></select></div>
    <p className="result-count" aria-live="polite">{loading ? "" : `${filtered.length} of ${projects.length} project${projects.length === 1 ? "" : "s"}`}</p>
    <section className="data-panel table-scroll">{loading ? <p className="empty-panel">Loading projects…</p> : filtered.length === 0 ? <p className="empty-panel">No projects match this view.</p> : <table className="data-table"><thead><tr><SortHeader label="Project" column="title" sort={sort} onSort={toggle}/><SortHeader label="Contact" column="contact" sort={sort} onSort={toggle}/><SortHeader label="Company" column="company" sort={sort} onSort={toggle}/><SortHeader label="Status" column="status" sort={sort} onSort={toggle}/><SortHeader label="Tasks" column="tasks" sort={sort} onSort={toggle}/><SortHeader label="Due" column="dueDate" sort={sort} onSort={toggle}/><SortHeader label="Updated" column="updatedAt" sort={sort} onSort={toggle}/><th>Actions</th></tr></thead><tbody>{sorted.map((project) => <tr key={project.id} className="clickable" onClick={() => router.push(`/projects/${project.id}`)}><td><Link href={`/projects/${project.id}`} className="row-link" onClick={(event) => event.stopPropagation()}>{project.title}</Link></td><td>{contactName(project.contactId)}</td><td>{companyName(project.companyId)}</td><td><span className="status-badge" data-status={project.status}>{project.status}</span></td><td>{project.taskDone}/{project.taskTotal}</td><td className="due-cell" data-due={project.status === "DONE" || project.status === "CANCELLED" ? "none" : dueState(project.dueDate, timeZone)}>{showDate(project.dueDate)}{project.status !== "DONE" && project.status !== "CANCELLED" && dueLabel(project.dueDate, timeZone) && <small>{dueLabel(project.dueDate, timeZone)}</small>}</td><td>{showDate(project.updatedAt)}</td><td><RowMenu label={`Actions for ${project.title}`} items={[{ label: "Delete Project", tone: "danger", onSelect: () => setDeleting(project) }]}><button className="btn" onClick={(event) => { event.stopPropagation(); setEditing(project); }}>Edit</button></RowMenu></td></tr>)}</tbody></table>}</section>
    {editing && <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={editing === "new" ? "New Project" : "Edit Project"}><form className="dialog-card" onSubmit={submit}><h2>{editing === "new" ? "New Project" : "Edit Project"}</h2><div className="form-grid"><label className="field full">Project name<input name="title" defaultValue={editing === "new" ? "" : editing.title} required autoFocus disabled={saving} /></label><label className="field full">Description<textarea name="description" defaultValue={editing === "new" ? "" : editing.description ?? ""} disabled={saving} /></label><label className="field">Contact<select name="contactId" defaultValue={editing === "new" ? "" : editing.contactId ?? ""} disabled={saving}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label><label className="field">Company<select name="companyId" defaultValue={editing === "new" ? "" : editing.companyId ?? ""} disabled={saving}><option value="">No company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.legalNameEn || company.legalNameTh || "Unnamed company"}</option>)}</select></label><label className="field">Due date<input name="dueDate" type="date" defaultValue={editing === "new" ? "" : editing.dueDate ?? ""} disabled={saving} /></label>{editing !== "new" && <label className="field">Status<select name="status" defaultValue={editing.status} disabled={saving}><option>TODO</option><option>DOING</option><option>DONE</option><option>CANCELLED</option></select></label>}</div><div className="dialog-actions"><button type="button" className="btn" onClick={() => setEditing(null)} disabled={saving}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save Project"}</button></div></form></div>}
    {deleting && <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Delete Project"><div className="dialog-card"><h2>Delete {deleting.title}?</h2><p className="muted">This soft delete keeps the project available for audit.</p><div className="dialog-actions"><button className="btn" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button><button className="btn danger" onClick={remove} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button></div></div></div>}
  </>;
}

export default function ProjectsPage() {
  return <AppShell><Suspense fallback={<p>Loading…</p>}><ProjectsContent /></Suspense></AppShell>;
}
