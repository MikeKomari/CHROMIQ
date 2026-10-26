/**
 * Client wrapper around the account and sync routes.
 *
 * Every call returns a discriminated result rather than throwing, because the
 * workspace must keep working from localStorage when the server is unreachable
 * or when accounts are not enabled on a deployment.
 */

export type SyncUser = { id: string; email: string };

export type SyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export type SyncedProject = {
  id: string;
  name: string;
  data: unknown;
  revision: number;
  created_at: string;
  updated_at: string;
};

async function request<T>(
  path: string,
  // `body` is widened to unknown and serialized here; intersecting with
  // RequestInit would keep the narrower BodyInit type instead of replacing it.
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<SyncResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers:
        init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* an empty or non-JSON body is handled by the status check below */
    }

    if (!response.ok) {
      const message =
        (payload as { error?: string } | null)?.error ??
        `Request failed (${response.status}).`;
      return { ok: false, error: message, status: response.status };
    }
    return { ok: true, data: payload as T };
  } catch {
    // Offline, DNS failure, or the request was blocked. Not a server error.
    return { ok: false, error: "Could not reach the server.", status: 0 };
  }
}

export function fetchAccount() {
  return request<{ user: SyncUser | null; accountsEnabled: boolean }>("/api/auth/me");
}

export function signUp(email: string, password: string) {
  return request<{ user: SyncUser }>("/api/auth/signup", {
    method: "POST",
    body: { email, password },
  });
}

export function signIn(email: string, password: string) {
  return request<{ user: SyncUser }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function signOut() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

/**
 * Permanently deletes the account, along with every synced project and short
 * link belonging to it. Work held only in localStorage is untouched.
 */
export function deleteAccount() {
  return request<{ ok: true }>("/api/auth/me", { method: "DELETE" });
}

export function listProjects() {
  return request<{ projects: SyncedProject[] }>("/api/projects");
}

export function createProject(name: string, data: unknown) {
  return request<{ project: SyncedProject }>("/api/projects", {
    method: "POST",
    body: { name, data },
  });
}

/** A 409 means someone else saved first; the caller must reconcile, not retry. */
export function updateProject(
  id: string,
  name: string,
  data: unknown,
  revision: number,
) {
  return request<{ project: SyncedProject }>(`/api/projects/${id}`, {
    method: "PUT",
    body: { name, data, revision },
  });
}

export function deleteProject(id: string) {
  return request<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" });
}

export function createShare(data: unknown) {
  return request<{ share: { slug: string; created_at: string } }>("/api/shares", {
    method: "POST",
    body: { data },
  });
}

/** Revokes a short link. Only the account that created it may do this. */
export function deleteShare(slug: string) {
  return request<{ ok: true }>(`/api/shares/${slug}`, { method: "DELETE" });
}

export function resolveShare(slug: string) {
  return request<{ data: unknown; createdAt: string }>(
    `/api/shares/${encodeURIComponent(slug)}`,
  );
}
