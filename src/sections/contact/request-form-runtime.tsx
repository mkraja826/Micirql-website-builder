"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useMemo, useState } from "react";
import { submitRegisteredSiteAction, type RequestCapabilityId } from "../../core/capabilities/action-registry";

export type GeneratedRequestAction = {
  siteId: string;
  capabilityKey: RequestCapabilityId;
  actionId: string;
  actionVersion: string;
};

type RequestFormRuntimeProps = {
  action?: GeneratedRequestAction;
  submitLabel: string;
  note: string;
  contactMode: "email" | "phone";
  messageLabel: string;
  messagePlaceholder: string;
};

function requestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RequestFormRuntime({
  action,
  submitLabel,
  note,
  contactMode,
  messageLabel,
  messagePlaceholder,
}: RequestFormRuntimeProps) {
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey || !action) return null;
    return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }, [action]);

  const active = Boolean(action && client);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || !client || state === "submitting") return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const enquiry = String(form.get("message") ?? "").trim();
    const consent = form.get("consent") === "on";

    if (!name || (!email && !phone) || !consent) {
      setState("error");
      setMessage("Please add your name, a contact method, and consent before sending your request.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      await submitRegisteredSiteAction(client, {
        siteId: action.siteId,
        actionId: action.actionId,
        actionVersion: action.actionVersion,
        requestId: requestId(),
        name,
        email: email || undefined,
        phone: phone || undefined,
        message: enquiry || undefined,
        fields: { capabilityKey: action.capabilityKey },
        consent: true,
        sourcePage: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      event.currentTarget.reset();
      setState("sent");
      setMessage("Request sent. The business can review your enquiry and follow up using the contact details you provided.");
    } catch {
      setState("error");
      setMessage("We could not send your request right now. Please try again later or use another verified contact method.");
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }} data-request-capability={action?.capabilityKey ?? "preview"}>
      <label>Name<input name="name" placeholder="Your name" required /></label>
      {contactMode === "email"
        ? <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
        : <label>Phone<input name="phone" inputMode="tel" placeholder="Your phone number" required /></label>}
      <label>{messageLabel}<textarea name="message" rows={contactMode === "email" ? 5 : 4} placeholder={messagePlaceholder} /></label>
      <label style={{ display: "flex", gap: ".6rem", alignItems: "flex-start" }}>
        <input name="consent" type="checkbox" required />
        <span>I agree that the business may use these details to respond to this request.</span>
      </label>
      <button className="button" type="submit" disabled={!active || state === "submitting"} aria-disabled={!active || state === "submitting"}>
        {state === "submitting" ? "Sending…" : submitLabel}
      </button>
      <small>{active ? "This form sends a request only. It does not confirm a booking, reservation, appointment, admission, or outcome." : note}</small>
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
    </form>
  );
}
