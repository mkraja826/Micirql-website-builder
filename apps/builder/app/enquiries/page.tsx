"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "../auth-gate";
import { EnquiriesManager } from "../enquiries-manager";
import { NotificationSettingsCard } from "../notification-settings-card";
import "./enquiries.css";

export default function EnquiriesPage() {
  return <Suspense fallback={<main className="enquiries-page"><div className="enquiries-empty">Loading enquiries…</div></main>}><EnquiriesContent /></Suspense>;
}

function EnquiriesContent() {
  const params = useSearchParams();
  const siteId = params.get("siteId")?.trim() ?? "";
  const recordId = params.get("recordId")?.trim() ?? "";
  const name = params.get("name")?.trim() ?? "Website";
  return <AuthGate>{() => <main className="enquiries-page">
    <header className="enquiries-page__header"><div><button type="button" onClick={() => { window.location.href = "/"; }}>← Websites</button><span>MiCirql</span><h1>{name} enquiries</h1><p>Review and follow up on requests sent from your website.</p></div></header>
    {siteId ? <><NotificationSettingsCard siteId={siteId}/><EnquiriesManager siteId={siteId} initialSelectedId={recordId || undefined} /></> : <div className="enquiries-empty">No website selected.</div>}
  </main>}</AuthGate>;
}
