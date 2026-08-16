"use client";

import { useEffect, useState } from "react";

type Settings = { site_id:string; workspace_id:string; email_address:string|null; email_enabled:boolean };

export function NotificationSettingsCard({ siteId }: { siteId: string }) {
  const [email,setEmail]=useState("");
  const [enabled,setEnabled]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{let cancelled=false;(async()=>{try{const r=await fetch(`/api/notification-settings?siteId=${encodeURIComponent(siteId)}`,{cache:"no-store"});const p=await r.json() as {settings?:Settings|null;error?:string};if(!r.ok)throw new Error(p.error??"Could not load notification settings.");if(cancelled)return;setEmail(p.settings?.email_address??"");setEnabled(Boolean(p.settings?.email_enabled));}catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Could not load notification settings.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[siteId]);

  async function save(){setSaving(true);setMessage("");try{const r=await fetch("/api/notification-settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({siteId,email,enabled})});const p=await r.json() as {settings?:Settings;error?:string};if(!r.ok||!p.settings)throw new Error(p.error??"Could not save notification settings.");setEmail(p.settings.email_address??"");setEnabled(Boolean(p.settings.email_enabled));setMessage("Notification settings saved.");}catch(e){setMessage(e instanceof Error?e.message:"Could not save notification settings.")}finally{setSaving(false)}}

  return <section className="notification-settings-card"><div><span>Owner notifications</span><strong>Email new enquiries</strong><p>Send a notification when a visitor submits a website request. Provider credentials remain managed by MiCirql.</p></div>{loading?<small>Loading settings…</small>:<><label><span>Notification email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@business.com" /></label><label className="notification-toggle"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /><span>Enable email notifications</span></label><button type="button" onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save notifications"}</button>{message?<small role="status">{message}</small>:null}</>}</section>;
}
