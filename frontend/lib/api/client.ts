// ─── Core API Client (Server-Side Only) ───────────────────────────────────────
// This module is the ONLY bridge between the Next.js server and the FastAPI
// backend. It uses Node 22's stable native fetch — no Axios dependency.
//
// Rules:
//   1. This file runs exclusively on the server (imported by server actions).
//   2. JWT tokens are read from HttpOnly cookies via next/headers.
//   3. The backend URL is a server-only env var (API_URL, no NEXT_PUBLIC_ prefix).
//   4. All responses are wrapped in ApiResult<T> for standardised error handling.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import type { ApiResult } from "./types";

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Configurable API version prefix. Change this to update all endpoints at once. */
export const API_PREFIX = process.env.API_PREFIX || "/api/v1";

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Build auth + content headers, reading the session cookie (async, Next.js 16). */
async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Convert a fetch Response into an ApiResult. */
async function handleResponse<T>(res: Response): Promise<ApiResult<T>> {
  if (!res.ok) {
    let message = `${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      // FastAPI errors use `detail`; slowapi rate limit errors use `error`
      if (body?.detail) message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      else if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON — keep the status text
    }
    return { data: null, error: message, status: res.status };
  }

  if (res.status === 204) {
    return { data: null as unknown as T, error: null };
  }

  const data: T = await res.json();
  return { data, error: null };
}

/** Execute fetch and handle both network errors and API errors. */
async function safeFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    return await handleResponse<T>(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: `Network request failed: ${msg}` };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const headers = await getAuthHeaders();
  return safeFetch<T>(`${API_URL}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
    ...init,
  });
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<ApiResult<T>> {
  const headers = await getAuthHeaders();
  return safeFetch<T>(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    ...init,
  });
}

export async function apiPostForm<T>(path: string, formBody: URLSearchParams, init?: RequestInit): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return safeFetch<T>(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formBody.toString(),
    cache: "no-store",
    ...init,
  });
}

export async function apiPut<T>(path: string, body: unknown, init?: RequestInit): Promise<ApiResult<T>> {
  const headers = await getAuthHeaders();
  return safeFetch<T>(`${API_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const headers = await getAuthHeaders();
  return safeFetch<T>(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
    ...init,
  });
}

export async function apiPatch<T>(path: string, body: unknown, init?: RequestInit): Promise<ApiResult<T>> {
  const headers = await getAuthHeaders();
  return safeFetch<T>(`${API_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
}

export async function apiPostMultipart<T>(path: string, formData: FormData, init?: RequestInit): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return safeFetch<T>(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
    ...init,
  });
}
