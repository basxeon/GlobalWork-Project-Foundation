"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiCall, Project } from "../../lib/api";
import { dueState, hourInTimeZone } from "../../lib/format";
import { AppShell, useCurrentUser, useDateFormat, useTimeZone } from "../components/app-shell";
import { AttentionData, DashboardAttention } from "../dashboard-attention";
import "../app-pages.css";

const greeting = (timeZone: string) => {
  const hour = hourInTimeZone(timeZone);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

function DashboardContent() {
  const router = useRouter();
  const user = useCurrentUser();
  const showDate = useDateFormat();
  const timeZone = useTimeZone();
  const [projects, setProjects] = useState<Project[]>([]);
  const [attention, setAttention] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      apiCall<Project[]>("/projects"),
      apiCall<AttentionData>("/dashboard/attention"),
    ])
      .then(([nextProjects, nextAttention]) => {
        setProjects(nextProjects);
        setAttention(nextAttention);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Dashboard failed"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1>{greeting(timeZone)}, {user.name.split(" ")[0]}</h1>
          <p>Here is what needs your attention today.</p>
        </div>
        <button className="btn primary" onClick={() => router.push("/projects?new=1")}>+ New Project</button>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="dashboard-metrics">
        <Metric label="Active projects" value={projects.filter((item) => item.status !== "DONE").length} />
        <Metric label="Overdue tasks" value={attention?.summary.overdueTasks ?? 0} />
        <Metric label="Due this week" value={attention?.summary.dueSoonTasks ?? 0} />
        <Metric label="Passport attention" value={(attention?.summary.expiredPassports ?? 0) + (attention?.summary.passportsUrgent ?? 0)} />
      </div>
      <DashboardAttention
        attention={attention}
        loading={loading}
        onContact={() => router.push("/contacts")}
        onProject={(id) => router.push(`/projects/${id}`)}
        onTask={(projectId, taskId) => router.push(`/projects/${projectId}?tab=tasks&task=${taskId}`)}
      />
      <div className="dashboard-grid">
        <section className="dashboard-section">
          <h2>Recent Projects</h2>
          {projects.length ? <div className="recent-list">{projects.slice(0, 5).map((project) => <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)}><span>{project.title}</span><small className="recent-meta">{project.dueDate && <em className="due-cell" data-due={project.status === "DONE" || project.status === "CANCELLED" ? "none" : dueState(project.dueDate, timeZone)}>{showDate(project.dueDate)}</em>}<span className="status-badge" data-status={project.status}>{project.status}</span></small></button>)}</div> : <p className="muted">No recent projects.</p>}
        </section>
        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          {/* Creating a Project already has the primary button in the header,
              and Projects is one click away in the sidebar, so this panel only
              offers the records that have no other shortcut. */}
          <div className="quick-actions">
            <button className="btn" onClick={() => router.push("/contacts?new=1")}>New Contact</button>
            <button className="btn" onClick={() => router.push("/companies?new=1")}>New Company</button>
            <button className="btn" onClick={() => router.push("/tasks")}>Open Tasks</button>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="dashboard-metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default function DashboardPage() {
  return <AppShell><DashboardContent /></AppShell>;
}
