"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "../lib/auth";
import "./form-data-workspace.css";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";
type Project = { id: string; title: string };
type Data = {
  contact: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  missingFields: { section: string; field: string; label: string }[];
};
const applicant = [
  ["title", "Title"],
  ["givenNames", "First name"],
  ["middleName", "Middle name"],
  ["surname", "Last name"],
  ["nationality", "Nationality"],
  ["dateOfBirth", "Date of birth"],
  ["sex", "Sex"],
  ["passportNumber", "Passport number"],
  ["dateOfIssue", "Passport issue date"],
  ["dateOfExpiry", "Passport expiry date"],
  ["issuingCountry", "Passport issued by"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["addressInThailand", "Address in Thailand"],
  ["position", "Position"],
  ["monthlySalary", "Monthly salary (THB)"],
  ["employmentStartDate", "Employment start date"],
] as const;
const company = [
  ["legalNameTh", "Legal name (Thai)"],
  ["legalNameEn", "Legal name (English)"],
  ["registrationNumber", "Registration number"],
  ["taxId", "Tax ID"],
  ["registeredAddress", "Registered address"],
  ["workplaceAddress", "Workplace address"],
  ["phone", "Phone"],
  ["authorizedDirector", "Authorized director"],
  ["businessType", "Business type"],
] as const;
const text = (source: Record<string, unknown> | null, key: string) =>
  String(source?.[key] ?? "");
const date = (key: string) => key.includes("Date") || key.endsWith("Date");

async function call(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${api}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? "Request failed");
  return body;
}

function Values({
  fields,
  source,
  missing,
  saving,
  onCopy,
}: {
  fields: readonly (readonly [string, string])[];
  source: Record<string, unknown> | null;
  missing: Data["missingFields"];
  saving: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <>
      {fields.map(([key, label]) => (
        <label
          key={key}
          className={
            missing.some(
              (item) =>
                item.field === key ||
                (item.field === "legalName" && key === "legalNameEn"),
            )
              ? "missing"
              : ""
          }
        >
          {label}
          <div>
            <input
              name={key}
              type={
                date(key)
                  ? "date"
                  : key === "email"
                    ? "email"
                    : key === "monthlySalary"
                      ? "number"
                      : "text"
              }
              step={key === "monthlySalary" ? "0.01" : undefined}
              defaultValue={text(source, key)}
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => onCopy(text(source, key))}
              disabled={!text(source, key)}
            >
              Copy
            </button>
          </div>
        </label>
      ))}
    </>
  );
}

export function FormDataWorkspace({
  project,
  onClose,
  onProjectUpdated,
  embedded = false,
}: {
  project: Project;
  onClose: () => void;
  onProjectUpdated: () => Promise<void>;
  embedded?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await call(`/projects/${project.id}/form-data`));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load form data.",
      );
    } finally {
      setLoading(false);
    }
  }, [project.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied to clipboard.");
      setError("");
    } catch {
      setError("Clipboard access is unavailable.");
    }
  };
  const block = (
    heading: string,
    fields: readonly (readonly [string, string])[],
    source: Record<string, unknown> | null,
  ) =>
    `${heading}\n${fields.map(([key, label]) => `${label}: ${text(source, key) || "-"}`).join("\n")}`;
  const save = (
    event: FormEvent<HTMLFormElement>,
    kind: "applicant" | "company",
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = kind === "applicant" ? applicant : company;
    const body = Object.fromEntries(
      fields.map(([key]) => [key, form.get(key) || undefined]),
    );
    if (kind === "applicant" && !data?.contact) return;
    setSaving(true);
    void (async () => {
      if (kind === "applicant")
        await call(`/contacts/${data?.contact?.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else if (data?.company?.id)
        await call(`/companies/${data.company.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else {
        const created = await call("/companies", {
          method: "POST",
          body: JSON.stringify(body),
        });
        await call(`/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify({ companyId: created.id }),
        });
        await onProjectUpdated();
      }
      setMessage(
        `${kind === "applicant" ? "Applicant" : "Company"} form data saved.`,
      );
      await load();
    })()
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Save failed."),
      )
      .finally(() => setSaving(false));
  };
  if (loading)
    return (
      <div className={`formdata-backdrop ${embedded ? "embedded" : ""}`}>
        <section className="formdata">
          <p>Loading form data…</p>
        </section>
      </div>
    );
  const missing = data?.missingFields ?? [];
  return (
    <div
      className={`formdata-backdrop ${embedded ? "embedded" : ""}`}
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : "true"}
      aria-label="Form Data workspace"
    >
      <section className="formdata">
        <header>
          <div>
            <p className="eyebrow">FORM PREPARATION</p>
            <h2>{project.title}</h2>
          </div>
          <button onClick={onClose} disabled={saving}>
            Close
          </button>
        </header>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <div className="formdata-actions">
          <button
            onClick={() =>
              void copy(
                [
                  block(
                    "Applicant",
                    applicant.slice(0, 14),
                    data?.contact ?? null,
                  ),
                  block(
                    "Employment",
                    applicant.slice(14),
                    data?.contact ?? null,
                  ),
                  block("Company", company, data?.company ?? null),
                ].join("\n\n"),
              )
            }
          >
            Copy all form data
          </button>
          <strong>
            {missing.length
              ? `${missing.length} required value(s) missing`
              : "Required form data is complete"}
          </strong>
        </div>
        <div className="formdata-grid">
          <section>
            <h3>Applicant, passport & employment</h3>
            {!data?.contact ? (
              <p className="empty">
                Link a Contact to this Project before preparing applicant data.
              </p>
            ) : (
              <form onSubmit={(event) => save(event, "applicant")}>
                <Values
                  fields={applicant}
                  source={data.contact}
                  missing={missing}
                  saving={saving}
                  onCopy={(item) => void copy(item)}
                />
                <div className="section-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void copy(block("Applicant", applicant, data.contact))
                    }
                  >
                    Copy applicant section
                  </button>
                  <button disabled={saving}>
                    {saving ? "Saving…" : "Save applicant"}
                  </button>
                </div>
              </form>
            )}
          </section>
          <section>
            <h3>Company</h3>
            <form onSubmit={(event) => save(event, "company")}>
              <Values
                fields={company}
                source={data?.company ?? null}
                missing={missing}
                saving={saving}
                onCopy={(item) => void copy(item)}
              />
              <div className="section-actions">
                <button
                  type="button"
                  onClick={() =>
                    void copy(block("Company", company, data?.company ?? null))
                  }
                >
                  Copy company section
                </button>
                <button disabled={saving}>
                  {saving ? "Saving…" : "Save company"}
                </button>
              </div>
            </form>
          </section>
          <aside>
            <h3>Missing data</h3>
            {missing.length ? (
              <ul>
                {missing.map((item) => (
                  <li key={`${item.section}-${item.field}`}>
                    <b>{item.section}</b>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="success">No required values are missing.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
