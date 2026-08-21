"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { apiCall, Company, Contact, Project, ProjectDocument, Task } from "../../../lib/api";
import { dueLabel, dueState } from "../../../lib/format";
import { AppShell, useCurrentUser, useDateFormat, useTimeZone } from "../../components/app-shell";
import { ProjectDocuments } from "../../components/projects/project-documents";
import { ProjectFormData } from "../../components/projects/project-form-data";
import { ProjectOverview } from "../../components/projects/project-overview";
import { ProjectTasks } from "../../components/projects/project-tasks";
import "../../components/projects/projects.css";
import "../../app-pages.css";

type Tab = "overview" | "tasks" | "documents" | "form-data";
type FormDataSummary = { missingFields: unknown[] };

function WorkspaceContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const showDate = useDateFormat();
  const timeZone = useTimeZone();
  const requested = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(requested === "tasks" || requested === "documents" || requested === "form-data" ? requested : "overview");
  const [project, setProject] = useState<Project | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [nextProject, nextContacts, nextCompanies, nextTasks, nextDocuments, formData] = await Promise.all([
        apiCall<Project>(`/projects/${id}`), apiCall<Contact[]>("/contacts"), apiCall<Company[]>("/companies"), apiCall<Task[]>(`/projects/${id}/tasks`), apiCall<ProjectDocument[]>(`/projects/${id}/documents`), apiCall<FormDataSummary>(`/projects/${id}/form-data`),
      ]);
      setProject(nextProject); setContacts(nextContacts); setCompanies(nextCompanies); setTasks(nextTasks); setDocuments(nextDocuments); setMissingCount(formData.missingFields.length);
    } catch (reason) {
      if (reason instanceof Error && (reason as Error & { status?: number }).status === 404) setNotFound(true);
      else setError(reason instanceof Error ? reason.message : "Workspace failed");
    } finally { setLoading(false); }
  };
  // Reload every resource when a direct Project route changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [id]);
  if (loading) return <p className="empty-panel">Loading Project workspace…</p>;
  if (notFound || !project) return <section className="empty-panel"><h1>Project not found</h1><Link href="/projects">Back to Projects</Link></section>;
  const contact = contacts.find((item) => item.id === project.contactId) ?? null;
  const company = companies.find((item) => item.id === project.companyId) ?? null;
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); void apiCall<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ title: form.get("title"), description: form.get("description") || undefined, dueDate: form.get("dueDate") || undefined, contactId: form.get("contactId") || undefined, companyId: form.get("companyId") || undefined, status: form.get("status") }) }).then((next) => { setProject(next); setEditing(false); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Save failed")).finally(() => setSaving(false)); };
  const remove = () => { setSaving(true); void apiCall(`/projects/${id}`, { method: "DELETE", body: JSON.stringify({ deletedById: user.id }) }).then(() => router.replace("/projects")).catch((reason) => setError(reason instanceof Error ? reason.message : "Delete failed")).finally(() => setSaving(false)); };

  return <>
    <header className="workspace-header"><Link href="/projects" className="back-link">← Back to Projects</Link><div className="workspace-title"><div><p className="eyebrow">PROJECT WORKSPACE</p><h1>{project.title}</h1><div className="workspace-meta"><span className="status-badge" data-status={project.status}>{project.status}</span><span>Contact: {contact?.name || "Not linked"}</span><span>Company: {company?.legalNameEn || company?.legalNameTh || "Not linked"}</span><span className="due-cell" data-due={project.status === "DONE" || project.status === "CANCELLED" ? "none" : dueState(project.dueDate, timeZone)}>Due: {showDate(project.dueDate, "Not set")}{dueLabel(project.dueDate, timeZone) && project.status !== "DONE" && project.status !== "CANCELLED" ? ` · ${dueLabel(project.dueDate, timeZone)}` : ""}</span></div></div><div className="button-row"><button className="btn" onClick={() => setEditing(true)}>Edit</button><button className="btn danger" onClick={() => setDeleting(true)}>Delete</button></div></div></header>
    {error && <p className="error">{error}</p>}
    <nav className="workspace-tabs" aria-label="Project workspace tabs">{(["overview", "tasks", "documents", "form-data"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); router.replace(`/projects/${id}?tab=${item}`, { scroll: false }); }}>{item === "form-data" ? "Form Data" : item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</nav>
    <div className="workspace-body">{tab === "overview" && <ProjectOverview project={project} contact={contact} company={company} tasks={tasks} documents={documents} missingCount={missingCount} />}{tab === "tasks" && <ProjectTasks projectId={id} user={user} onChanged={setTasks} />}{tab === "documents" && <ProjectDocuments projectId={id} user={user} onChanged={setDocuments} />}{tab === "form-data" && <ProjectFormData project={project} onProjectUpdated={load} />}</div>
    {editing && <div className="dialog-backdrop" role="dialog" aria-modal="true"><form className="dialog-card" onSubmit={save}><h2>Edit Project</h2><div className="form-grid"><label className="field full">Project name<input name="title" defaultValue={project.title} required autoFocus /></label><label className="field full">Description<textarea name="description" defaultValue={project.description ?? ""} /></label><label className="field">Contact<select name="contactId" defaultValue={project.contactId ?? ""}><option value="">No contact</option>{contacts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field">Company<select name="companyId" defaultValue={project.companyId ?? ""}><option value="">No company</option>{companies.map((item) => <option value={item.id} key={item.id}>{item.legalNameEn || item.legalNameTh || "Unnamed"}</option>)}</select></label><label className="field">Due date<input name="dueDate" type="date" defaultValue={project.dueDate ?? ""} /></label><label className="field">Status<select name="status" defaultValue={project.status}><option>TODO</option><option>DOING</option><option>DONE</option><option>CANCELLED</option></select></label></div><div className="dialog-actions"><button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button></div></form></div>}
    {deleting && <div className="dialog-backdrop" role="dialog" aria-modal="true"><div className="dialog-card"><h2>Delete {project.title}?</h2><p className="muted">This is a soft delete.</p><div className="dialog-actions"><button className="btn" onClick={() => setDeleting(false)}>Cancel</button><button className="btn danger" onClick={remove} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button></div></div></div>}
  </>;
}

export default function ProjectWorkspacePage() { return <AppShell><Suspense fallback={<p>Loading…</p>}><WorkspaceContent /></Suspense></AppShell>; }
