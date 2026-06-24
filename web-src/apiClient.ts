const ADMIN_TOKEN_KEY = "ai-shop-admin-token";
const pendingGets = new Map<string, Promise<Response>>();

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  if (token.trim()) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const token = getAdminToken();
  if (token) {
    headers.set("x-admin-token", token);
  }
  const method = init.method?.toUpperCase() ?? "GET";
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const key = `${method}:${url}:${token}`;
  if (method === "GET") {
    const existing = pendingGets.get(key);
    if (existing) return existing.then((response) => response.clone());
  }

  const request = fetch(input, {
    ...init,
    headers
  });
  if (method !== "GET") return request;
  const tracked = request.finally(() => pendingGets.delete(key));
  pendingGets.set(key, tracked);
  return tracked.then((response) => response.clone());
}
