"use client";

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string };
};

const STORAGE_KEY = "micirql.supabase.session";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase browser configuration is missing.");
  return { url, anon };
}

export function readStoredSession(): SupabaseSession | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SupabaseSession) : undefined;
  } catch {
    return undefined;
  }
}

export function storeSession(session?: SupabaseSession) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function signIn(email: string, password: string): Promise<SupabaseSession> {
  const { url, anon } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.msg ?? payload?.error_description ?? "Sign in failed.");
  const session = normalizeSession(payload);
  storeSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<SupabaseSession | undefined> {
  const { url, anon } = config();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.msg ?? payload?.error_description ?? "Sign up failed.");
  if (!payload?.access_token) return undefined;
  const session = normalizeSession(payload);
  storeSession(session);
  return session;
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const { url, anon } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const payload = await response.json();
  if (!response.ok) {
    storeSession(undefined);
    throw new Error("Your session expired. Please sign in again.");
  }
  const next = normalizeSession(payload);
  storeSession(next);
  return next;
}

export async function ensureFreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt > Math.floor(Date.now() / 1000) + 60) return session;
  return refreshSession(session);
}

export async function signOut(session?: SupabaseSession) {
  try {
    if (session?.access_token) {
      const { url, anon } = config();
      await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` } });
    }
  } finally {
    storeSession(undefined);
  }
}

function normalizeSession(payload: any): SupabaseSession {
  const expiresIn = Number(payload.expires_in ?? 3600);
  return {
    access_token: String(payload.access_token),
    refresh_token: String(payload.refresh_token),
    expires_in: expiresIn,
    expires_at: Number(payload.expires_at ?? Math.floor(Date.now() / 1000) + expiresIn),
    token_type: String(payload.token_type ?? "bearer"),
    user: { id: String(payload.user?.id ?? ""), email: payload.user?.email ? String(payload.user.email) : undefined },
  };
}
