"use client";

import { useSearchParams } from "next/navigation";
import { AuthGate } from "../auth-gate";
import { EnquiriesManager } from "../enquiries-manager";
import "./enquiries.css";

export default function EnquiriesPage() {
  const params = useSearchParams();
  const siteId = params.get("siteId")?.trim() ?? "";
  const name = params.get("name")?.trim() ?? "Website";
  return <AuthGate>{() => <main className="enquiries-page">
    <header className="enquiries-page__header"><div><button type="button" onClick={() => { window.location.href = "/"; }}>← Websites</button><span>MiCirql</span><h1>{name} enquiries</h1><p>Review and follow up on requests sent from your website.</p></div></header>
    {siteId ? <EnquiriesManager siteId={siteId} /> : <div className="enquiries-empty">No website selected.</div>}
  </main>}</AuthGate>;
}
