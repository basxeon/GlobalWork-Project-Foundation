import { authenticatedFetch } from "./auth";

export const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
};

export type WorkspaceGeneral = {
  applicationName: string;
  companyDisplayName?: string | null;
  timeZone: string;
  dateFormat: string;
};

export type Project = {
  id: string;
  title: string;
  description?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dueDate?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  passportNumber?: string | null;
  dateOfExpiry?: string | null;
};

export type Company = {
  id: string;
  legalNameTh?: string | null;
  legalNameEn?: string | null;
  registrationNumber?: string | null;
  registeredAddress?: string | null;
  phone?: string | null;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: string;
  status: string;
};

export type ProjectDocument = {
  id: string;
  originalFilename: string;
  displayName?: string;
  category?: string;
  mediaType: string;
  currentVersion: number;
  createdAt?: string;
};

export async function apiCall<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await authenticatedFetch(`${apiBase}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
