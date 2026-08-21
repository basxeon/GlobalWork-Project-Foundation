"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { authenticatedFetch } from "../lib/auth";
import "./document-workspace.css";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";
type WorkspaceDocument = { id: string; originalFilename: string; mediaType: string; currentVersion: number };
type Extraction = Record<string, string | number | null | undefined> & { status?: string; errorMessage?: string | null; expiryWarning?: string | null };
type Props = { documents: WorkspaceDocument[]; initialDocument: WorkspaceDocument; onClose: () => void; embedded?: boolean };
const fields = [
  ["surname", "Surname"], ["givenNames", "Given names"], ["passportNumber", "Passport number"],
  ["nationality", "Nationality"], ["dateOfBirth", "Date of birth"], ["sex", "Sex"],
  ["dateOfIssue", "Date of issue"], ["dateOfExpiry", "Date of expiry"], ["issuingCountry", "Issuing country"],
] as const;
const supported = (type: string) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(type);

async function request(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${api}/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(typeof body?.message === "string" ? body.message : `Request failed (${response.status})`) as Error & { status?: number; code?: string; fields?: string[] };
    error.status = response.status; error.code = body?.code ?? body?.message?.code; error.fields = body?.fields ?? body?.message?.fields;
    throw error;
  }
  return body;
}

export function DocumentWorkspace({ documents, initialDocument, onClose, embedded = false }: Props) {
  const [selected, setSelected] = useState(initialDocument);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsOverwrite, setNeedsOverwrite] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState<"width" | "page">("width");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setMessage(""); setPreviewUrl(""); setExtraction(null); setNeedsOverwrite(false);
    try {
      if (supported(selected.mediaType)) {
        const response = await authenticatedFetch(`${api}/api/documents/${selected.id}/preview`);
        if (!response.ok) throw new Error("The document preview is unavailable.");
        setPreviewUrl(URL.createObjectURL(await response.blob()));
      }
      try { setExtraction(await request(`/documents/${selected.id}/passport-extraction`)); }
      catch (reason) { if (!(reason instanceof Error && (reason as Error & { status?: number }).status === 404)) throw reason; }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load the document."); }
    finally { setLoading(false); }
  }, [selected.id, selected.mediaType]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => { window.clearTimeout(timer); };
  }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const act = (operation: () => Promise<void>) => {
    if (saving) return;
    setSaving(true); setError(""); setMessage(""); setNeedsOverwrite(false);
    void operation().catch((reason) => { setError(reason instanceof Error ? reason.message : "Request failed."); if (reason instanceof Error && (reason as Error & { code?: string }).code === "CONTACT_FIELD_CONFLICT") setNeedsOverwrite(true); }).finally(() => setSaving(false));
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    act(async () => { const body = Object.fromEntries(fields.map(([key]) => [key, form.get(key) || undefined])); setExtraction(await request(`/documents/${selected.id}/passport-extraction`, { method: "PATCH", body: JSON.stringify(body) })); setMessage("Passport fields saved for review."); });
  };
  const download = () => act(async () => {
    const response = await authenticatedFetch(`${api}/api/documents/${selected.id}/download`);
    if (!response.ok) throw new Error("Document download failed.");
    const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = selected.originalFilename; anchor.click(); URL.revokeObjectURL(url);
  });
  const apply = (overwrite: boolean) => act(async () => { const result = await request(`/documents/${selected.id}/passport-extraction/apply`, { method: "POST", body: JSON.stringify({ overwrite }) }); setMessage(`Applied ${result.appliedFields?.length ?? 0} field(s) to the linked contact.`); setNeedsOverwrite(false); });
  const typeIsImage = selected.mediaType.startsWith("image/");
  const selectedIndex = documents.findIndex((document) => document.id === selected.id);
  const selectRelative = (offset: number) => {
    const next = documents[selectedIndex + offset];
    if (!next || saving) return;
    setSelected(next);
    setZoom(100);
    setFit("width");
  };

  return <div className={`workspace-backdrop ${embedded ? "embedded" : ""}`} role={embedded ? undefined : "dialog"} aria-modal={embedded ? undefined : "true"} aria-label="Document workspace"><section className="workspace">
    <header><div><p className="eyebrow">DOCUMENT WORKSPACE</p><h2>{selected.originalFilename}</h2></div><button onClick={onClose} disabled={saving}>Close</button></header>
    {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
    <div className="workspace-grid">
      <nav className="workspace-docs"><h3>Project documents</h3>{documents.length === 0 ? <p className="muted">No documents.</p> : documents.map((document) => <button key={document.id} className={document.id === selected.id ? "active" : ""} onClick={() => setSelected(document)} disabled={saving}>{document.originalFilename}</button>)}</nav>
      <section className="workspace-preview"><div className="workspace-actions"><button onClick={() => selectRelative(-1)} disabled={saving || selectedIndex <= 0}>Previous</button><button onClick={() => selectRelative(1)} disabled={saving || selectedIndex < 0 || selectedIndex >= documents.length - 1}>Next</button><span className="workspace-divider" /><button onClick={() => setZoom((value) => Math.max(50, value - 25))} disabled={saving || zoom <= 50}>−</button><span className="zoom-label">{zoom}%</span><button onClick={() => setZoom((value) => Math.min(200, value + 25))} disabled={saving || zoom >= 200}>+</button><button className={fit === "width" ? "active-control" : ""} onClick={() => setFit("width")} disabled={saving}>Fit width</button><button className={fit === "page" ? "active-control" : ""} onClick={() => setFit("page")} disabled={saving}>Fit page</button><span className="workspace-divider" /><button onClick={download} disabled={saving}>Download</button></div>{loading ? <p className="empty">Loading document…</p> : !supported(selected.mediaType) ? <p className="empty">This file type cannot be previewed. You can still download it.</p> : <div className={`workspace-preview-frame ${fit}`} style={{ "--preview-zoom": `${zoom / 100}` } as CSSProperties}>{typeIsImage ? <Image src={previewUrl} alt={selected.originalFilename} width={1200} height={900} unoptimized /> : <iframe src={previewUrl} title={selected.originalFilename} />}</div>}</section>
      <section className="workspace-review"><h3>Passport review</h3>{loading ? <p className="muted">Loading extraction…</p> : <>{extraction?.errorMessage && <p className="error">{String(extraction.errorMessage)}</p>}{extraction?.expiryWarning && <p className="warning">Passport {String(extraction.expiryWarning).replace("_", " ").toLowerCase()}.</p>}<button onClick={() => act(async () => { setExtraction(await request(`/documents/${selected.id}/passport-extraction`, { method: "POST" })); setMessage("Extraction attempted. Review and enter values manually if needed."); })} disabled={saving}>{saving ? "Working…" : "Run passport extraction"}</button><form className="workspace-form" onSubmit={save}>{fields.map(([key, label]) => <label key={key}>{label}<input name={key} type={key.startsWith("date") ? "date" : "text"} defaultValue={String(extraction?.[key] ?? "")} key={`${selected.id}-${key}-${String(extraction?.[key] ?? "")}`} disabled={saving} /></label>)}<button disabled={saving}>{saving ? "Saving…" : "Save corrections"}</button></form><div className="workspace-confirm"><button disabled={saving || extraction?.status !== "REVIEW_REQUIRED"} onClick={() => act(async () => { setExtraction(await request(`/documents/${selected.id}/passport-extraction/confirm`, { method: "POST" })); setMessage("Passport data confirmed. It can now be applied to the linked contact."); })}>Confirm reviewed data</button><button disabled={saving || extraction?.status !== "CONFIRMED"} onClick={() => apply(false)}>Apply to linked contact</button>{needsOverwrite && <><p className="warning">Existing contact values will be replaced only after this explicit confirmation.</p><button className="danger" disabled={saving} onClick={() => apply(true)}>Allow overwrite and apply</button></>}</div></>}</section>
    </div>
  </section></div>;
}
