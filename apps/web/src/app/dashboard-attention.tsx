"use client";

import { useDateFormat } from "./components/app-shell";
import "./dashboard-attention.css";

export type AttentionData = {
  summary: {
    expiredPassports: number;
    passportsUrgent: number;
    passportsUpcoming: number;
    overdueTasks: number;
    dueSoonTasks: number;
    projectsWithOverdueTasks: number;
  };
  expiredPassports: PassportItem[];
  expiringPassports: PassportItem[];
  overdueTasks: TaskItem[];
  dueSoonTasks: TaskItem[];
  projectsWithOverdueTasks: {
    id: string;
    title: string;
    overdueTaskCount: number;
  }[];
};
type PassportItem = {
  contactId: string;
  contactName: string;
  passportNumber?: string | null;
  dateOfExpiry: string | null;
  status: "EXPIRED" | "URGENT" | "UPCOMING";
};
type TaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  projectId: string;
  projectTitle: string;
  status: "OVERDUE" | "DUE_SOON";
};
type Props = {
  attention: AttentionData | null;
  loading: boolean;
  onContact: (id: string) => void;
  onProject: (id: string) => void;
  onTask: (projectId: string, taskId: string) => void;
};

function PassportList({
  items,
  onContact,
}: {
  items: PassportItem[];
  onContact: Props["onContact"];
}) {
  const showDate = useDateFormat();
  return (
    <ul className="attention-list">
      {items.map((item) => (
        <li key={item.contactId}>
          <button onClick={() => onContact(item.contactId)}>
            <b>{item.contactName}</b>
            <span>
              {item.passportNumber || "Passport number not recorded"} ·{" "}
              {showDate(item.dateOfExpiry, "No expiry date")}
            </span>
          </button>
          <em className={`attention-status ${item.status.toLowerCase()}`}>
            {item.status === "URGENT"
              ? "Due within 30 days"
              : item.status === "UPCOMING"
                ? "Due within 90 days"
                : "Expired"}
          </em>
        </li>
      ))}
    </ul>
  );
}

function TaskList({
  items,
  onTask,
}: {
  items: TaskItem[];
  onTask: Props["onTask"];
}) {
  const showDate = useDateFormat();
  return (
    <ul className="attention-list">
      {items.map((item) => (
        <li key={item.id}>
          <button onClick={() => onTask(item.projectId, item.id)}>
            <b>{item.title}</b>
            <span>
              {item.projectTitle} · due {showDate(item.dueDate)}
            </span>
          </button>
          <em className={`attention-status ${item.status.toLowerCase()}`}>
            {item.status === "OVERDUE" ? "Overdue" : "Due this week"}
          </em>
        </li>
      ))}
    </ul>
  );
}

export function DashboardAttention({
  attention,
  loading,
  onContact,
  onProject,
  onTask,
}: Props) {
  if (loading)
    return (
      <section className="attention">
        <h2>Need Attention</h2>
        <p className="attention-empty">Loading attention items…</p>
      </section>
    );
  if (!attention)
    return (
      <section className="attention">
        <h2>Need Attention</h2>
        <p className="attention-empty">
          Attention items are unavailable right now.
        </p>
      </section>
    );
  const { summary } = attention;
  const total =
    summary.expiredPassports +
    summary.passportsUrgent +
    summary.passportsUpcoming +
    summary.overdueTasks +
    summary.dueSoonTasks;

  // Only groups that actually have something to act on are rendered. An
  // all-clear day used to spend most of the screen restating "No ..." five
  // times; the counts already live in the metric row above.
  return (
    <section className="attention">
      <div className="attention-heading">
        <div>
          <p className="eyebrow">CURRENT PRIORITIES</p>
          <h2>Need Attention</h2>
        </div>
        <span>{total} item(s)</span>
      </div>
      {total === 0 && attention.projectsWithOverdueTasks.length === 0 ? (
        <p className="attention-empty">
          Nothing needs attention today — no expiring passports and no tasks due
          this week.
        </p>
      ) : (
        <div className="attention-groups">
          {attention.expiredPassports.length > 0 && (
            <article>
              <h3>Expired passports</h3>
              <PassportList
                items={attention.expiredPassports}
                onContact={onContact}
              />
            </article>
          )}
          {attention.expiringPassports.length > 0 && (
            <article>
              <h3>Passport expiry</h3>
              <PassportList
                items={attention.expiringPassports}
                onContact={onContact}
              />
            </article>
          )}
          {attention.overdueTasks.length > 0 && (
            <article>
              <h3>Overdue tasks</h3>
              <TaskList
                items={attention.overdueTasks}
                onTask={onTask}
              />
            </article>
          )}
          {attention.dueSoonTasks.length > 0 && (
            <article>
              <h3>Due this week</h3>
              <TaskList
                items={attention.dueSoonTasks}
                onTask={onTask}
              />
            </article>
          )}
          {attention.projectsWithOverdueTasks.length > 0 && (
            <article>
              <h3>Projects with overdue tasks</h3>
              <ul className="attention-list">
                {attention.projectsWithOverdueTasks.map((project) => (
                  <li key={project.id}>
                    <button onClick={() => onProject(project.id)}>
                      <b>{project.title}</b>
                      <span>{project.overdueTaskCount} overdue task(s)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
