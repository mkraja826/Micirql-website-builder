"use client";

import { FormEvent, useEffect, useState } from "react";
import { ensureFreshSession, readStoredSession, signIn, signOut, signUp, type SupabaseSession } from "./auth-client";

export function AuthGate({ children }: { children(session: SupabaseSession): React.ReactNode }) {
  const [session, setSession] = useState<SupabaseSession>();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readStoredSession();
      if (!stored) { if (!cancelled) setChecking(false); return; }
      try {
        const fresh = await ensureFreshSession(stored);
        if (!cancelled) setSession(fresh);
      } catch {
        // Expired/invalid sessions are cleared by the auth client.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signin") {
        setSession(await signIn(email.trim(), password));
      } else {
        const created = await signUp(email.trim(), password);
        if (created) setSession(created);
        else setMessage("Account created. Check your email to confirm it, then sign in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return <main className="auth-shell"><div className="auth-card">Checking session…</div></main>;
  if (session) {
    return <>{children(session)}<button className="auth-signout" onClick={() => void signOut(session).then(() => setSession(undefined))}>Sign out</button></>;
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <div><strong>MiCirql</strong><h1>{mode === "signin" ? "Sign in to your builder" : "Create your MiCirql account"}</h1></div>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        <button type="button" className="auth-link" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signin" ? "Create an account" : "Already have an account? Sign in"}</button>
      </form>
    </main>
  );
}
