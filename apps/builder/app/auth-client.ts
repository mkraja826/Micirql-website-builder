"use client";

const STORAGE_KEY = "micirql.supabase.session";

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string };
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase configuration is missing.");
  return { url, anon };
}

export function readStoredSession(): SupabaseSession | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try { return normalizeSession(JSON.parse(raw)); } catch { window.localStorage.removeItem(STORAGE_KEY); return undefined; }
}

export function storeSession(session: SupabaseSession | undefined) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
}

async function authRequest(path: string, init: RequestInit) {
  const { url, anon } = config();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { apikey: anon, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.msg ?? payload?.message ?? payload?.error_description ?? payload?.error ?? `Authentication failed (${response.status}).`);
  return payload;
}

export async function signIn(email: string, password: string): Promise<SupabaseSession> {
  const payload = await authRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const session = normalizeSession(payload);
  storeSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<SupabaseSession | undefined> {
  const payload = await authRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!payload.access_token) return undefined;
  const session = normalizeSession(payload);
  storeSession(session);
  return session;
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const payload = await authRequest("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
  const fresh = normalizeSession(payload);
  storeSession(fresh);
  return fresh;
}

export async function ensureFreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt > Math.floor(Date.now() / 1000) + 60) {
    storeSession(session);
    return session;
  }
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
  const email = payload.user?.email ? String(payload.user.email) : undefined;
  return {
    access_token: String(payload.access_token),
    refresh_token: String(payload.refresh_token),
    expires_in: expiresIn,
    expires_at: Number(payload.expires_at ?? Math.floor(Date.now() / 1000) + expiresIn),
    token_type: String(payload.token_type ?? "bearer"),
    user: { id: String(payload.user?.id ?? ""), ...(email === undefined ? {} : { email }) },
  };
}