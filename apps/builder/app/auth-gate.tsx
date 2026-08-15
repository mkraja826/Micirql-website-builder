"use client";

import { FormEvent, useEffect, useState } from "react";
import { ensureFreshSession, readStoredSession, signIn, signOut, signUp, type SupabaseSession } from "./auth-client";

const authStyles = `
.auth-shell{min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 10%,rgba(124,58,237,.18),transparent 34rem),radial-gradient(circle at 85% 85%,rgba(99,102,241,.10),transparent 28rem),#0a0a0c}
.auth-card{width:min(100%,440px);display:grid;gap:18px;padding:28px;border:1px solid #292930;border-radius:22px;background:rgba(20,20,24,.94);box-shadow:0 24px 80px rgba(0,0,0,.38);backdrop-filter:blur(18px)}
.auth-card>div:first-child{display:grid;gap:10px}.auth-card strong{width:max-content;color:#9b8cff;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}.auth-card h1{margin:0;max-width:12ch;font-size:clamp(2rem,8vw,3rem);line-height:1;letter-spacing:-.045em}
.auth-card label{display:grid;gap:8px;color:#c6c6ce;font-size:.84rem;font-weight:650}.auth-card input{width:100%;min-height:50px;padding:0 14px;border:1px solid #34343c;border-radius:12px;outline:none;background:#111115;color:#f7f7f9}.auth-card input:focus{border-color:#7c3aed;background:#15151a;box-shadow:0 0 0 4px rgba(124,58,237,.16)}
.auth-card button[type=submit]{min-height:50px;border:0;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6657e8);color:white;font-weight:750;cursor:pointer;box-shadow:0 10px 26px rgba(124,58,237,.24)}.auth-card button[type=submit]:disabled{opacity:.6;cursor:wait}.auth-link{border:0;padding:4px;background:transparent;color:#aaa4e8;cursor:pointer;text-align:center}.auth-error{margin:0;padding:11px 12px;border:1px solid #6e2f37;border-radius:10px;background:#2a1519;color:#ffb6bd;font-size:.84rem;line-height:1.45}.auth-card>p:not(.auth-error){margin:0;padding:11px 12px;border:1px solid #394a40;border-radius:10px;background:#152119;color:#b7dfc3;font-size:.84rem;line-height:1.45}
.auth-signout{position:fixed;top:12px;right:12px;z-index:60;min-height:38px;padding:0 12px;border:1px solid #303038;border-radius:10px;background:rgba(20,20,24,.88);color:#d7d7de;cursor:pointer;backdrop-filter:blur(14px)}
@media(max-width:520px){.auth-shell{place-items:start stretch;padding:max(20px,env(safe-area-inset-top)) 16px 24px}.auth-card{margin-top:7svh;width:100%;padding:22px;border-radius:18px}.auth-card h1{max-width:10ch;font-size:clamp(2.15rem,11vw,3rem)}}
`;

export function AuthGate({ children }: { children(session: SupabaseSession): React.ReactNode }) {
  const [session, setSession] = useState<SupabaseSession>();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { let cancelled=false;(async()=>{const stored=readStoredSession();if(!stored){if(!cancelled)setChecking(false);return}try{const fresh=await ensureFreshSession(stored);if(!cancelled)setSession(fresh)}catch{}finally{if(!cancelled)setChecking(false)}})();return()=>{cancelled=true}},[]);

  useEffect(() => {
    if (!session?.access_token) return;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const isBuilderApi = target.startsWith("/api/") || target.startsWith(`${window.location.origin}/api/`);
      if (!isBuilderApi) return nativeFetch(input, init);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${session.access_token}`);
      try { const active=JSON.parse(localStorage.getItem("micirql_active_project")??"null") as {workspaceId?:string;siteId?:string}|null; if(active?.workspaceId)headers.set("x-micirql-workspace-id",active.workspaceId);if(active?.siteId)headers.set("x-micirql-site-id",active.siteId); } catch {}
      return nativeFetch(input, { ...init, headers });
    };
    return () => { window.fetch = nativeFetch; };
  }, [session?.access_token]);

  async function submit(event: FormEvent) { event.preventDefault();setSubmitting(true);setError("");setMessage("");try{if(mode==="signin")setSession(await signIn(email.trim(),password));else{const created=await signUp(email.trim(),password);if(created)setSession(created);else setMessage("Account created. Check your email to confirm it, then sign in.")}}catch(caught){setError(caught instanceof Error?caught.message:"Authentication failed.")}finally{setSubmitting(false)}}

  const styles = <style dangerouslySetInnerHTML={{ __html: authStyles }} />;
  if(checking)return <>{styles}<main className="auth-shell"><div className="auth-card">Checking session…</div></main></>;
  if(session)return <>{styles}{children(session)}<button className="auth-signout" onClick={()=>void signOut(session).then(()=>setSession(undefined))}>Sign out</button></>;
  return <>{styles}<main className="auth-shell"><form className="auth-card" onSubmit={submit}><div><strong>MiCirql</strong><h1>{mode==="signin"?"Sign in to your builder":"Create your MiCirql account"}</h1></div><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete={mode==="signin"?"current-password":"new-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error?<p className="auth-error">{error}</p>:null}{message?<p>{message}</p>:null}<button type="submit" disabled={submitting}>{submitting?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button><button type="button" className="auth-link" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setMessage("")}}>{mode==="signin"?"Create an account":"Already have an account? Sign in"}</button></form></main></>;
}
