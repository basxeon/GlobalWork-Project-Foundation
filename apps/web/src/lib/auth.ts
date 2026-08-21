const tokenKey = "homebase.access-token";

export function getAccessToken() {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(tokenKey);
}

export function setAccessToken(token: string) {
  window.sessionStorage.setItem(tokenKey, token);
}

export function clearAccessToken() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(tokenKey);
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    const body = await response.clone().json().catch(() => null);
    if (body?.message === "UNAUTHORIZED") {
      clearAccessToken();
      window.dispatchEvent(new Event("homebase-session-expired"));
    }
  }
  return response;
}
