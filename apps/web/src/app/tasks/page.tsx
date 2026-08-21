"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiCall, Project } from "../../lib/api";
import { addCalendarDays, calendarDayInTimeZone, dueLabel, dueState } from "../../lib/format";
import { AppShell, useCurrentUser, useDateFormat, useTimeZone } from "../components/app-shell";
import { RowMenu } from "../components/row-menu";
import { SortHeader, useSort } from "../components/sortable";
import "../app-pages.css";
import "./tasks.css";

type GlobalTask = {
  id: string; projectId: string; projectTitle: string; title: string;
  description?: string | null; dueDate?: string | null; priority: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED"; updatedAt: string;
  checklistTotal: number; checklistCompleted: number;
};
type View = "ALL" | "OPEN" | "IN_PROGRESS" | "TODAY" | "WEEK" | "OVERDUE" | "COMPLETED";

function TasksContent() {
  const user = useCurrentUser();
  const showDate = useDateFormat();
  const timeZone = useTimeZone();
  const [tasks, setTasks] = useState<GlobalTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [view, setView] = useState<View>("ALL");
  const [editing, setEditing] = useState<GlobalTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<GlobalTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const [nextTasks, nextProjects] = await Promise.all([apiCall<GlobalTask[]>("/tasks"), apiCall<Project[]>("/projects")]);
    setTasks(nextTasks); setProjects(nextProjects);
  };
  useEffect(() => { const timer=window.setTimeout(()=>{void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Tasks failed")).finally(() => setLoading(false));},0);return()=>window.clearTimeout(timer); }, []);
  const today = calendarDayInTimeZone(new Date(), timeZone);
  const week = addCalendarDays(today, 7);
  const filtered = useMemo(() => tasks.filter((task) => {
    const keyword = `${task.title} ${task.projectTitle}`.toLowerCase();
    const active = task.status !== "COMPLETED";
    const viewMatch = view === "ALL" || task.status === view || (view === "TODAY" && active && task.dueDate === today) || (view === "WEEK" && active && !!task.dueDate && task.dueDate >= today && task.dueDate <= week) || (view === "OVERDUE" && active && !!task.dueDate && task.dueDate < today);
    return keyword.includes(search.toLowerCase()) && (projectId === "ALL" || task.projectId === projectId) && viewMatch;
  }), [tasks, search, projectId, view, today, week]);
  const { sort, toggle, sorted } = useSort(
    filtered,
    {
      title: (task) => task.title,
      projectTitle: (task) => task.projectTitle,
      dueDate: (task) => task.dueDate,
      status: (task) => task.status,
      checklist: (task) => task.checklistTotal,
      updatedAt: (task) => task.updatedAt,
    },
    { key: "dueDate", direction: "asc" },
  );
  const transition = async (task: GlobalTask, targetStatus: string) => {
    if (saving || task.status === targetStatus) return;
    setSaving(true); setError("");
    try { await apiCall(`/tasks/${task.id}/transition`, { method: "POST", body: JSON.stringify({ targetStatus, changedById: user.id }) }); setNotice("Task status updated"); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Status update failed"); }
    finally { setSaving(false); }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing || saving) return;
    const form = new FormData(event.currentTarget); const selectedProject = String(form.get("projectId"));
    setSaving(true); setError("");
    try {
      await apiCall(editing === "new" ? `/projects/${selectedProject}/tasks` : `/tasks/${editing.id}`, { method: editing === "new" ? "POST" : "PATCH", body: JSON.stringify({ title: form.get("title"), description: form.get("description") || undefined, dueDate: form.get("dueDate") || undefined, priority: form.get("priority"), ...(editing === "new" ? { createdById: user.id } : {}) }) });
      setEditing(null); setNotice(editing === "new" ? "Task created" : "Task updated"); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || saving) return; setSaving(true); setError("");
    try { await apiCall(`/tasks/${deleting.id}`, { method: "DELETE", body: JSON.stringify({ deletedById: user.id }) }); setDeleting(null); setNotice("Task deleted"); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed"); }
    finally { setSaving(false); }
  };
  const rowTone = (task: GlobalTask) => task.status === "COMPLETED" ? "task-completed" : task.dueDate && task.dueDate < today ? "task-overdue" : task.dueDate === today ? "task-today" : "";
  return <>
    <header className="page-header"><div><p className="eyebrow">DAILY WORK</p><h1>Tasks</h1><p>Find, update, and complete work across every Project.</p></div><button className="btn primary" onClick={() => setEditing("new")}>+ New Task</button></header>
    <div className="feedback" aria-live="polite">{notice && <p className="success">{notice}</p>}{error && <p className="error">{error}</p>}</div>
    <div className="task-view-tabs" role="tablist">{(["ALL","OPEN","IN_PROGRESS","TODAY","WEEK","OVERDUE","COMPLETED"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "IN_PROGRESS" ? "In Progress" : item === "TODAY" ? "Due Today" : item === "WEEK" ? "Due This Week" : item.charAt(0) + item.slice(1).toLowerCase()}</button>)}</div>
    <div className="page-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or Projects…" aria-label="Search tasks"/><select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Project filter"><option value="ALL">All Projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div>
    <p className="result-count" aria-live="polite">{loading ? "" : `${filtered.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`}</p>
    <section className="data-panel table-scroll">{loading ? <p className="empty-panel">Loading tasks…</p> : filtered.length === 0 ? <p className="empty-panel">No tasks match this view.</p> : <table className="data-table task-table"><thead><tr><SortHeader label="Task" column="title" sort={sort} onSort={toggle}/><SortHeader label="Project" column="projectTitle" sort={sort} onSort={toggle}/><SortHeader label="Due" column="dueDate" sort={sort} onSort={toggle}/><SortHeader label="Status" column="status" sort={sort} onSort={toggle}/><SortHeader label="Checklist" column="checklist" sort={sort} onSort={toggle}/><SortHeader label="Updated" column="updatedAt" sort={sort} onSort={toggle}/><th>Actions</th></tr></thead><tbody>{sorted.map((task) => <tr key={task.id} className={rowTone(task)}><td><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</td><td><Link href={`/projects/${task.projectId}?tab=tasks&task=${task.id}`}>{task.projectTitle}</Link></td><td className="due-cell" data-due={task.status === "COMPLETED" ? "none" : dueState(task.dueDate, timeZone)}>{showDate(task.dueDate)}{task.status !== "COMPLETED" && dueLabel(task.dueDate, timeZone) && <small>{dueLabel(task.dueDate, timeZone)}</small>}</td><td><select value={task.status} disabled={saving || task.status === "COMPLETED"} onChange={(event) => void transition(task, event.target.value)}><option>OPEN</option><option>IN_PROGRESS</option><option>COMPLETED</option></select></td><td>{task.checklistCompleted}/{task.checklistTotal}</td><td>{showDate(task.updatedAt)}</td><td><RowMenu label={`Actions for ${task.title}`} items={[{ label: "Delete Task", tone: "danger", onSelect: () => setDeleting(task) }]}><button className="btn" onClick={() => setEditing(task)}>Edit</button>{task.status === "IN_PROGRESS" && <button className="btn primary" onClick={() => void transition(task, "COMPLETED")}>Complete</button>}</RowMenu></td></tr>)}</tbody></table>}</section>
    {editing && <div className="dialog-backdrop" role="dialog" aria-modal="true"><form className="dialog-card" onSubmit={(event) => void save(event)}><h2>{editing === "new" ? "New Task" : "Edit Task"}</h2><div className="form-grid">{editing === "new" && <label className="field full">Project<select name="projectId" required><option value="">Select Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}<label className="field full">Title<input name="title" required autoFocus defaultValue={editing === "new" ? "" : editing.title}/></label><label className="field full">Description<textarea name="description" defaultValue={editing === "new" ? "" : editing.description ?? ""}/></label><label className="field">Due date<input name="dueDate" type="date" defaultValue={editing === "new" ? "" : editing.dueDate ?? ""}/></label><label className="field">Priority<select name="priority" defaultValue={editing === "new" ? "MEDIUM" : editing.priority}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label></div><div className="dialog-actions"><button type="button" className="btn" onClick={() => setEditing(null)} disabled={saving}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save Task"}</button></div></form></div>}
    {deleting && <div className="dialog-backdrop" role="dialog" aria-modal="true"><div className="dialog-card"><h2>Delete {deleting.title}?</h2><p>This soft delete keeps the audit record.</p><div className="dialog-actions"><button className="btn" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button><button className="btn danger" onClick={() => void remove()} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button></div></div></div>}
  </>;
}

export default function TasksPage() { return <AppShell><TasksContent/></AppShell>; }
