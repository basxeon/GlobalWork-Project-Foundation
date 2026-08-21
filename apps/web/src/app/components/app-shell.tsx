"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { apiCall, CurrentUser, WorkspaceGeneral } from "../../lib/api";
import {
  DateFormat,
  defaultDateFormat,
  defaultTimeZone,
  formatDate,
  normalizeTimeZone,
} from "../../lib/format";
import "./app-shell.css";

const UserContext = createContext<CurrentUser | null>(null);

const defaultWorkspace: WorkspaceGeneral = {
  applicationName: "GlobalWork OS",
  companyDisplayName: null,
  timeZone: defaultTimeZone,
  dateFormat: defaultDateFormat,
};

const WorkspaceContext = createContext<WorkspaceGeneral>(defaultWorkspace);

const navigation = [
  ["Dashboard", "/dashboard", "⌂"],
  ["Projects", "/projects", "▣"],
  ["Contacts", "/contacts", "♙"],
  ["Companies", "/companies", "▦"],
  ["Tasks", "/tasks", "✓"],
  ["Documents", "/documents", "▤"],
  ["Settings", "/settings", "⚙"],
] as const;

export function useCurrentUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Authenticated user is unavailable");
  return user;
}

/** Workspace-wide General settings. Falls back to defaults until they load. */
export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/** Validated workspace timezone used by all calendar-day calculations. */
export function useTimeZone() {
  return normalizeTimeZone(useWorkspace().timeZone);
}

/**
 * Date formatter bound to the workspace date format, so every screen renders
 * stored dates the same way.
 */
export function useDateFormat() {
  const { dateFormat, timeZone } = useWorkspace();
  return (value: string | null | undefined, fallback = "—") =>
    formatDate(value, dateFormat as DateFormat, fallback, timeZone);
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [workspace, setWorkspace] =
    useState<WorkspaceGeneral>(defaultWorkspace);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const expired = () => router.replace("/login?reason=expired");
    window.addEventListener("homebase-session-expired", expired);
    const reloadWorkspace = () => {
      void apiCall<WorkspaceGeneral>("/settings/general")
        .then(setWorkspace)
        .catch(() => undefined);
    };
    window.addEventListener("homebase-settings-changed", reloadWorkspace);
    void apiCall<CurrentUser>("/auth/me")
      .then(setUser)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Session failed"),
      );
    // General settings are presentation-only, so a failure here must not block
    // the shell — the defaults above stay in place.
    void apiCall<WorkspaceGeneral>("/settings/general")
      .then(setWorkspace)
      .catch(() => undefined);
    return () => {
      window.removeEventListener("homebase-session-expired", expired);
      window.removeEventListener("homebase-settings-changed", reloadWorkspace);
    };
  }, [router]);

  const logout = () => {
    clearAccessToken();
    router.replace("/login");
  };

  if (error)
    return (
      <main className="shell-state">
        <p className="error">{error}</p>
        <button onClick={logout}>Return to sign in</button>
      </main>
    );
  if (!user)
    return (
      <main className="shell-state">
        <div className="shell-spinner" />
        <p>Loading workspace…</p>
      </main>
    );

  const brand = workspace.applicationName || defaultWorkspace.applicationName;
  // Prefer the capitals already in the name ("GlobalWork OS" -> "GW") and fall
  // back to the opening letters for names written in lower case.
  const capitals = brand.replace(/[^A-Z]/g, "");
  const initials = (
    capitals.length >= 2 ? capitals : brand.replace(/\s/g, "").toUpperCase()
  ).slice(0, 2);

  return (
    <UserContext.Provider value={user}>
      <WorkspaceContext.Provider value={workspace}>
      <div className="app-shell">
        <aside className="app-sidebar">
          <Link href="/dashboard" className="app-brand">
            <span>{initials}</span>
            <strong>{brand}</strong>
          </Link>
          <nav aria-label="Primary navigation">
            {navigation.map(([label, href, icon]) => (
              <Link
                href={href}
                key={href}
                className={
                  pathname === href ||
                  (href === "/projects" && pathname.startsWith("/projects/"))
                    ? "active"
                    : ""
                }
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/users"
                className={pathname === "/users" ? "active" : ""}
              >
                <span>♚</span>Users
              </Link>
            )}
          </nav>
          <div className="app-user">
            <span className="user-avatar">{user.name.charAt(0)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button onClick={logout} aria-label="Log out">
              ↪
            </button>
          </div>
        </aside>
        <main className="app-main">{children}</main>
      </div>
      </WorkspaceContext.Provider>
    </UserContext.Provider>
  );
}
