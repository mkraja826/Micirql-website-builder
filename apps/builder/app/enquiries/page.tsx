"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "../auth-gate";
import { LeadsInbox } from "../leads-inbox";
import { NotificationSettingsCard } from "../notification-settings-card";
import "./enquiries.css";

export default function EnquiriesPage() {
  return <Suspense fallback={<main className="enquiries-page"><div className="enquiries-empty">Loading leads…</div></main>}><EnquiriesContent /></Suspense>;
}

function EnquiriesContent() {
  const params = useSearchParams();
  const siteId = params.get("siteId")?.trim() ?? "";
  const workspaceId = params.get("workspaceId")?.trim() ?? "";
  const name = params.get("name")?.trim() ?? "Website";
  return <AuthGate>{(session) => <main className="enquiries-page">
    <header className="enquiries-page__header"><div><button type="button" onClick={() => { window.location.href = "/"; }}>← Websites</button><span>MiCirql</span><h1>{name} leads</h1><p>Review, contact and qualify enquiries submitted from your website.</p></div></header>
    {siteId && workspaceId ? <><NotificationSettingsCard siteId={siteId}/><LeadsInbox session={session} workspaceId={workspaceId} siteId={siteId}/></> : <div className="enquiries-empty">No website selected.</div>}
  </main>}</AuthGate>;
}
