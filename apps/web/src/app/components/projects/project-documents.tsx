"use client";

import { FormEvent, useEffect, useState } from "react";
import { authenticatedFetch } from "../../../lib/auth";
import { apiBase, CurrentUser, ProjectDocument, apiCall } from "../../../lib/api";
import { DocumentWorkspace } from "../../document-workspace";

export function ProjectDocuments({ projectId, user, onChanged }: { projectId: string; user: CurrentUser; onChanged: (documents: ProjectDocument[]) => void }) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [selected, setSelected] = useState<ProjectDocument | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { const next = await apiCall<ProjectDocument[]>(`/projects/${projectId}/documents`); setDocuments(next); onChanged(next); setSelected((current) => current && next.some((item) => item.id === current.id) ? current : next[0] ?? null); };
  // Reload when the route changes; load intentionally owns the local tab state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Documents failed")), 0); return () => window.clearTimeout(timer); }, [projectId]);
  const upload = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!file || saving) return; const body = new FormData(); body.append("file", file); body.append("uploadedById", user.id); setSaving(true); void authenticatedFetch(`${apiBase}/api/projects/${projectId}/documents`, { method: "POST", body }).then(async (response) => { if (!response.ok) throw new Error("Document upload failed"); setFile(null); await load(); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Upload failed")).finally(() => setSaving(false)); };
  const remove = () => { if (!selected) return; setSaving(true); void apiCall(`/documents/${selected.id}`, { method: "DELETE", body: JSON.stringify({ deletedById: user.id }) }).then(async () => { setDeleting(false); await load(); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Delete failed")).finally(() => setSaving(false)); };
  return <section className="workspace-document-tab"><div className="document-tab-actions"><div><h2>Documents</h2>{error && <p className="error">{error}</p>}</div><div className="button-row"><form className="document-upload" onSubmit={upload}><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={saving} /><button className="btn primary" disabled={saving || !file}>{saving ? "Uploading…" : "Upload"}</button></form>{selected && <button className="btn danger" onClick={() => setDeleting(true)} disabled={saving}>Delete selected</button>}</div></div>{selected ? <DocumentWorkspace documents={documents} initialDocument={selected} onClose={() => undefined} embedded /> : <div className="document-empty">No documents yet. Upload the first project document above.</div>}{deleting && selected && <div className="dialog-backdrop" role="dialog" aria-modal="true"><div className="dialog-card"><h2>Delete {selected.originalFilename}?</h2><p className="muted">This is a soft delete. The stored file remains available for audit.</p><div className="dialog-actions"><button className="btn" onClick={() => setDeleting(false)}>Cancel</button><button className="btn danger" onClick={remove} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button></div></div></div>}</section>;
}
