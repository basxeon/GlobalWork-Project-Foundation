"use client";

import { AppShell } from "./app-shell";
import "../app-pages.css";

export function GlobalPreviewPage({ title, description, columns }: { title: string; description: string; columns: string[] }) {
  return <AppShell><header className="page-header"><div><p className="eyebrow">GLOBAL VIEW</p><h1>{title}</h1><p>{description}</p></div></header><p className="warning">This global view is a UI preview. Project-scoped {title.toLowerCase()} remain fully available inside each Project Workspace.</p><section className="data-panel"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead></table><p className="empty-panel">Open a Project Workspace to manage {title.toLowerCase()}.</p></section></AppShell>;
}
