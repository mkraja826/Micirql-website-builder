"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseSession } from "./auth-client";

type LeadStatus = "new" | "contacted" | "qualified" | "closed" | "spam";
type Lead = {
  id: string;
  action_id: string;
  source_page?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  fields?: Record<string, unknown> | null;
  status: LeadStatus;
  created_at: string;
};

const TABS: Array<{ key: "all" | LeadStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "closed", label: "Closed" },
];

export function LeadsInbox({ session, workspaceId, siteId }: { session: SupabaseSession; workspaceId: string; siteId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => { void load(); }, [workspaceId, siteId, session.access_token]);

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ workspaceId, siteId });
      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json() as { leads?: Lead[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not load leads.");
      const next = body.leads ?? [];
      setLeads(next);
      setSelectedId(current => current && next.some(item => item.id === current) ? current : next[0]?.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load leads."); }
    finally { setLoading(false); }
  }

  async function setStatus(lead: Lead, status: LeadStatus) {
    setBusy(lead.id); setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, siteId, leadId: lead.id, status }),
      });
      const body = await response.json() as { lead?: Lead; error?: string };
      if (!response.ok || !body.lead) throw new Error(body.error ?? "Could not update lead.");
      setLeads(current => current.map(item => item.id === lead.id ? { ...item, ...body.lead } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update lead."); }
    finally { setBusy(undefined); }
  }

  const filtered = useMemo(() => leads.filter(lead => {
    if (tab !== "all" && lead.status !== tab) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const haystack = [lead.name, lead.email, lead.phone, lead.message, lead.action_id, lead.source_page, ...Object.values(lead.fields ?? {})].join(" ").toLowerCase();
    return haystack.includes(needle);
  }), [leads, query, tab]);
  const selected = leads.find(item => item.id === selectedId);
  const counts = useMemo(() => Object.fromEntries(["new","contacted","qualified","closed","spam"].map(status => [status, leads.filter(item => item.status === status).length])) as Record<LeadStatus, number>, [leads]);

  return <section className="enquiries-manager">
    <div className="enquiries-toolbar"><div><span>Website leads</span><strong>{counts.new ? `${counts.new} new` : "Inbox clear"}</strong></div><button type="button" onClick={() => void load()} disabled={loading}>↻ Refresh</button></div>
    <div className="enquiries-tabs" role="tablist">{TABS.map(item => <button key={item.key} type="button" className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}>{item.label}<span>{item.key === "all" ? leads.length : counts[item.key]}</span></button>)}</div>
    <label className="enquiries-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, phone, email, treatment or message" /></label>
    {error ? <div className="enquiries-error" role="alert">{error}</div> : null}
    {loading ? <div className="enquiries-empty">Loading leads…</div> : !filtered.length ? <div className="enquiries-empty">No leads in this view yet.</div> : <div className="enquiries-layout">
      <div className="enquiries-list">{filtered.map(lead => <button type="button" key={lead.id} className={`enquiry-row${selectedId === lead.id ? " is-active" : ""}`} onClick={() => setSelectedId(lead.id)}><div><strong>{lead.name || lead.email || lead.phone || "Website visitor"}</strong><span>{actionLabel(lead.action_id)}</span></div><small>{formatDate(lead.created_at)}</small><span className={`enquiry-status status-${lead.status}`}>{statusLabel(lead.status)}</span></button>)}</div>
      {selected ? <article className="enquiry-detail">
        <header><div><span>{actionLabel(selected.action_id)}</span><h3>{selected.name || selected.email || selected.phone || "Website visitor"}</h3><small>{formatDate(selected.created_at)}{selected.source_page ? ` · ${selected.source_page}` : ""}</small></div><span className={`enquiry-status status-${selected.status}`}>{statusLabel(selected.status)}</span></header>
        <div className="enquiry-contact-actions">{selected.phone ? <><a href={`tel:${cleanPhone(selected.phone)}`}>Call</a><a href={`https://wa.me/${cleanPhone(selected.phone).replace(/^\+/, "")}`} target="_blank" rel="noreferrer">WhatsApp</a></> : null}{selected.email ? <a href={`mailto:${selected.email}`}>Email</a> : null}</div>
        <dl className="enquiry-contact-grid">{selected.phone ? <><dt>Phone</dt><dd>{selected.phone}</dd></> : null}{selected.email ? <><dt>Email</dt><dd>{selected.email}</dd></> : null}</dl>
        {selected.message ? <div className="enquiry-request"><strong>Message</strong><p>{selected.message}</p></div> : null}
        <div className="enquiry-request"><strong>Request details</strong><dl>{fieldEntries(selected.fields ?? {}).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{value}</dd></div>)}</dl></div>
        <div className="enquiry-workflow">
          {selected.status === "new" ? <button type="button" onClick={() => void setStatus(selected, "contacted")} disabled={busy === selected.id}>Mark contacted</button> : null}
          {selected.status !== "qualified" && selected.status !== "closed" ? <button type="button" onClick={() => void setStatus(selected, "qualified")} disabled={busy === selected.id}>Mark qualified</button> : null}
          {selected.status !== "closed" ? <button type="button" className="is-primary" onClick={() => void setStatus(selected, "closed")} disabled={busy === selected.id}>Close lead</button> : <button type="button" onClick={() => void setStatus(selected, "contacted")} disabled={busy === selected.id}>Reopen</button>}
          {selected.status !== "spam" ? <button type="button" onClick={() => void setStatus(selected, "spam")} disabled={busy === selected.id}>Spam</button> : null}
        </div>
      </article> : null}
    </div>}
  </section>;
}

function actionLabel(value: string) { const labels: Record<string,string> = { "lead.create":"Website enquiry", "appointment.request":"Appointment request", "reservation.request":"Reservation request", "quote.request":"Quote request", "property.enquiry":"Property enquiry", "demo.request":"Demo request", "booking.request":"Booking request", "enrollment.enquiry":"Enrollment enquiry" }; return labels[value] ?? "Website lead"; }
function statusLabel(value: LeadStatus) { return value === "new" ? "New" : value.charAt(0).toUpperCase() + value.slice(1); }
function formatDate(value: string) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; } }
function cleanPhone(value: string) { return value.replace(/[^+\d]/g, ""); }
function fieldLabel(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase()); }
function fieldEntries(fields: Record<string, unknown>) { return Object.entries(fields).filter(([key, value]) => !["name","email","phone","message","consent","website","workspaceId","siteId","actionId","sourcePage"].includes(key) && value !== undefined && value !== null && String(value).trim()).map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)] as const); }
