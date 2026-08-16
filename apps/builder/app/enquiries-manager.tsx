"use client";

import { useEffect, useMemo, useState } from "react";

type SubmissionStatus = "received" | "queued" | "processing" | "completed" | "failed" | "spam";
type Submission = {
  id: string;
  workspace_id: string;
  site_id: string;
  action_id: string;
  action_version: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
};

type Props = { siteId: string };

const STATUS_TABS: Array<{ key: "all" | SubmissionStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "received", label: "New" },
  { key: "processing", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export function EnquiriesManager({ siteId }: Props) {
  const [items, setItems] = useState<Submission[]>([]);
  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [updating, setUpdating] = useState<string>();

  useEffect(() => { void load(); }, [siteId]);

  async function load() {
    setLoading(true); setError(undefined);
    try {
      const response = await fetch(`/api/submissions?siteId=${encodeURIComponent(siteId)}&limit=200`, { cache: "no-store" });
      const body = await response.json() as { submissions?: Submission[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? `Unable to load enquiries (${response.status}).`);
      const next = body.submissions ?? [];
      setItems(next);
      setSelectedId(current => current && next.some(item => item.id === current) ? current : next[0]?.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load enquiries."); }
    finally { setLoading(false); }
  }

  async function updateStatus(item: Submission, status: SubmissionStatus) {
    setUpdating(item.id); setError(undefined);
    try {
      const response = await fetch("/api/submissions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, siteId, status }) });
      const body = await response.json() as { submission?: { id: string; status: SubmissionStatus; updated_at: string }; error?: string };
      if (!response.ok || !body.submission) throw new Error(body.error ?? `Unable to update enquiry (${response.status}).`);
      setItems(current => current.map(row => row.id === item.id ? { ...row, status: body.submission!.status, updated_at: body.submission!.updated_at } : row));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update enquiry."); }
    finally { setUpdating(undefined); }
  }

  const filtered = useMemo(() => items.filter(item => {
    if (activeStatus !== "all" && item.status !== activeStatus) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const haystack = [item.contact_name, item.contact_email, item.contact_phone, actionLabel(item.action_id), ...Object.values(item.payload).map(value => String(value ?? ""))].join(" ").toLowerCase();
    return haystack.includes(needle);
  }), [items, activeStatus, query]);

  const selected = items.find(item => item.id === selectedId);
  const counts = useMemo(() => ({
    all: items.length,
    received: items.filter(item => item.status === "received").length,
    processing: items.filter(item => item.status === "processing").length,
    completed: items.filter(item => item.status === "completed").length,
  }), [items]);

  return <section className="enquiries-manager">
    <div className="enquiries-toolbar">
      <div><span>Website enquiries</span><strong>{counts.received ? `${counts.received} new` : "Inbox clear"}</strong></div>
      <button type="button" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
    </div>
    <div className="enquiries-tabs" role="tablist">{STATUS_TABS.map(tab => <button type="button" key={tab.key} className={activeStatus === tab.key ? "is-active" : ""} onClick={() => setActiveStatus(tab.key)}>{tab.label}<span>{counts[tab.key as keyof typeof counts] ?? items.filter(item => item.status === tab.key).length}</span></button>)}</div>
    <label className="enquiries-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, phone or request" /></label>
    {error ? <div className="enquiries-error" role="alert">{error}</div> : null}
    {loading ? <div className="enquiries-empty">Loading enquiries…</div> : !filtered.length ? <div className="enquiries-empty">No enquiries in this view yet.</div> : <div className="enquiries-layout">
      <div className="enquiries-list">{filtered.map(item => <button type="button" key={item.id} className={`enquiry-row${selectedId === item.id ? " is-active" : ""}`} onClick={() => setSelectedId(item.id)}>
        <div><strong>{item.contact_name || fallbackContact(item)}</strong><span>{actionLabel(item.action_id)}</span></div>
        <small>{formatDate(item.created_at)}</small>
        <span className={`enquiry-status status-${item.status}`}>{statusLabel(item.status)}</span>
      </button>)}</div>
      {selected ? <article className="enquiry-detail">
        <header><div><span>{actionLabel(selected.action_id)}</span><h3>{selected.contact_name || fallbackContact(selected)}</h3><small>{formatDate(selected.created_at)}</small></div><span className={`enquiry-status status-${selected.status}`}>{statusLabel(selected.status)}</span></header>
        <div className="enquiry-contact-actions">
          {selected.contact_phone ? <a href={`tel:${cleanPhone(selected.contact_phone)}`}>Call</a> : null}
          {selected.contact_email ? <a href={`mailto:${selected.contact_email}`}>Email</a> : null}
        </div>
        <dl className="enquiry-contact-grid">
          {selected.contact_phone ? <><dt>Phone</dt><dd>{selected.contact_phone}</dd></> : null}
          {selected.contact_email ? <><dt>Email</dt><dd>{selected.contact_email}</dd></> : null}
        </dl>
        <div className="enquiry-request"><strong>Request details</strong><dl>{payloadEntries(selected.payload).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{value}</dd></div>)}</dl></div>
        <div className="enquiry-workflow">
          {selected.status !== "processing" && selected.status !== "completed" ? <button type="button" onClick={() => void updateStatus(selected, "processing")} disabled={updating === selected.id}>Start follow-up</button> : null}
          {selected.status !== "completed" ? <button type="button" className="is-primary" onClick={() => void updateStatus(selected, "completed")} disabled={updating === selected.id}>Mark completed</button> : <button type="button" onClick={() => void updateStatus(selected, "processing")} disabled={updating === selected.id}>Reopen</button>}
        </div>
      </article> : null}
    </div>}
  </section>;
}

function actionLabel(actionId: string) {
  const labels: Record<string,string> = { "lead.create":"Website enquiry", "appointment.request":"Appointment request", "reservation.request":"Reservation request", "quote.request":"Quote request", "property.enquiry":"Property enquiry", "demo.request":"Demo request", "booking.request":"Booking request", "enrollment.enquiry":"Enrollment enquiry", "newsletter.subscribe":"Newsletter signup" };
  return labels[actionId] ?? "Website submission";
}
function statusLabel(status: SubmissionStatus) { return status === "received" ? "New" : status === "processing" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1); }
function formatDate(value: string) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; } }
function fieldLabel(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase()); }
function payloadEntries(payload: Record<string, unknown>) { return Object.entries(payload).filter(([key, value]) => !["website", "consent", "sourcePage", "name", "email", "phone"].includes(key) && value !== undefined && value !== null && String(value).trim()).map(([key,value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)] as const); }
function fallbackContact(item: Submission) { return item.contact_email || item.contact_phone || "Website visitor"; }
function cleanPhone(value: string) { return value.replace(/[^+\d]/g, ""); }
