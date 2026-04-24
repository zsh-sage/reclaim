"use server";

// ─── Auth Server Actions ──────────────────────────────────────────────────────
// Handles login, logout, and session verification.
// JWT tokens are stored as HttpOnly cookies — never exposed to client JS.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { apiGet, apiPostForm, API_PREFIX } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Authenticate with email + password.
 * Sets an HttpOnly session cookie and returns the user profile.
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    // 1. Exchange credentials for token
    const form = new URLSearchParams({ username: email, password });
    const tokenResult = await apiPostForm<{ access_token: string }>(`${API_PREFIX}/auth/login`, form);
    
    if (tokenResult.error || !tokenResult.data) {
      return { user: null, error: tokenResult.error ?? "Login failed" };
    }

    const { access_token } = tokenResult.data;

    // 2. Set HttpOnly session cookie (only possible in Server Actions — Next.js 16)
    const cookieStore = await cookies();
    cookieStore.set("session", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    // 3. Fetch user profile with the new token
    // (apiGet automatically reads the token we just set in the cookies)
    const userResult = await apiGet<any>(`${API_PREFIX}/auth/me`);

    if (userResult.error || !userResult.data) {
      return { user: null, error: userResult.error ?? "Failed to fetch user profile" };
    }

    const raw = userResult.data;
    if (!raw.user_id) return { user: null, error: "Malformed user profile response" };
    const user: User = {
      id:              raw.user_id,
      email:           raw.email,
      name:            raw.name,
      role:            raw.role,
      department:      raw.department,
      user_code:       raw.user_code   ?? null,
      rank:            raw.rank        ?? 0,
      privilege_level: raw.privilege_level,
    };
    return { user, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { user: null, error: message };
  }
}

/**
 * Clear the session cookie, effectively logging the user out.
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

/**
 * Verify the current session and return the authenticated user, or null.
 * Called on app initialisation to restore session state.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) return null;

    const result = await apiGet<any>(`${API_PREFIX}/auth/me`);
    if (result.error || !result.data) return null;

    const raw = result.data;
    if (!raw.user_id) return null;
    return {
      id:              raw.user_id,
      email:           raw.email,
      name:            raw.name,
      role:            raw.role,
      department:      raw.department,
      user_code:       raw.user_code   ?? null,
      rank:            raw.rank        ?? 0,
      privilege_level: raw.privilege_level,
    };
  } catch {
    return null;
  }
}
