/**
 * Centralized API client that includes credentials (cookies) with every request.
 * This ensures NextAuth session cookies are sent for authenticated endpoints.
 */

const API_BASE = '';

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : options?.headers),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as Record<string, unknown>)?.error
        ? typeof (data as Record<string, unknown>).error === 'string'
          ? ((data as Record<string, unknown>).error as string)
          : ((data as Record<string, { message?: string }>).error?.message as string) || `Request failed: ${res.status}`
        : `Request failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export function apiGet<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url);
}

export function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}
