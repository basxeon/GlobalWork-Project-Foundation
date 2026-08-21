"use client";

import { Company, Contact, Project, ProjectDocument, Task } from "../../../lib/api";
import { dueState } from "../../../lib/format";
import { useDateFormat, useTimeZone } from "../app-shell";

export function ProjectOverview({ project, contact, company, tasks, documents, missingCount }: { project: Project; contact: Contact | null; company: Company | null; tasks: Task[]; documents: ProjectDocument[]; missingCount: number }) {
  const showDate = useDateFormat();
  const timeZone = useTimeZone();
  const done = tasks.filter((task) => task.status === "COMPLETED").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return <div className="overview-grid">
    <section className="overview-card"><h2>Project information</h2><dl className="overview-list"><dt>Status</dt><dd><span className="status-badge" data-status={project.status}>{project.status}</span></dd><dt>Due date</dt><dd className="due-cell" data-due={project.status === "DONE" || project.status === "CANCELLED" ? "none" : dueState(project.dueDate, timeZone)}>{showDate(project.dueDate, "Not set")}</dd><dt>Description</dt><dd>{project.description || "No description"}</dd></dl></section>
    <section className="overview-card"><h2>Contact & Company</h2><dl className="overview-list"><dt>Contact</dt><dd>{contact?.name || "Not linked"}</dd><dt>Email</dt><dd>{contact?.email || "—"}</dd><dt>Company</dt><dd>{company?.legalNameEn || company?.legalNameTh || "Not linked"}</dd><dt>Registration</dt><dd>{company?.registrationNumber || "—"}</dd></dl></section>
    <section className="overview-card"><h2>Task progress</h2><p>{done} of {tasks.length} completed</p><div className="progress-track"><span style={{ width: `${percent}%` }} /></div></section>
    <section className="overview-card"><h2>Form Data attention</h2><p className={missingCount ? "warning" : "success"}>{missingCount ? `${missingCount} required value(s) missing` : "Required data is complete"}</p></section>
    <section className="overview-card"><h2>Recent Documents</h2>{documents.length ? <ul>{documents.slice(0, 4).map((document) => <li key={document.id}>{document.displayName || document.originalFilename}</li>)}</ul> : <p className="muted">No documents uploaded.</p>}</section>
    <section className="overview-card"><h2>Need Attention</h2>{tasks.some((task) => task.status !== "COMPLETED" && dueState(task.dueDate, timeZone) === "overdue") ? <p className="error">This project contains overdue tasks.</p> : <p className="success">No overdue tasks in this project.</p>}</section>
  </div>;
}
