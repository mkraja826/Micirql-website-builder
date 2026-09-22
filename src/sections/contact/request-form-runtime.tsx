"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { submitRegisteredSiteAction, type RequestCapabilityId } from "../../core/capabilities/action-registry";
import { resolvePublicSiteAction, type PublicSiteAction } from "../../core/capabilities/public-action";

export type GeneratedRequestAction = {
  siteId: string;
  capabilityKey: RequestCapabilityId;
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
  const [state, setState] = useState<"idle" | "resolving" | "submitting" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resolvedAction, setResolvedAction] = useState<PublicSiteAction | null>(null);

  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey || !action) return null;
    return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }, [action]);

  useEffect(() => {
    let cancelled = false;

    setResolvedAction(null);
    setMessage("");

    if (!action || !client) {
      setState("idle");
      return () => { cancelled = true; };
    }

    setState("resolving");
    resolvePublicSiteAction(client, action.siteId, action.capabilityKey)
      .then((resolved) => {
        if (cancelled) return;
        setResolvedAction(resolved);
        setState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedAction(null);
        setState("error");
        setMessage("This request form is not currently available. Please use another verified contact method.");
      });

    return () => { cancelled = true; };
  }, [action, client]);

  const active = Boolean(resolvedAction && client);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolvedAction || !client || state === "submitting") return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const enquiry = String(form.get("message") ?? "").trim();
    const consent = form.get("consent") === "on";
    const website = String(form.get("_website") ?? "");

    if (!name || (!email && !phone) || !consent) {
      setState("error");
      setMessage("Please add your name, a contact method, and consent before sending your request.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      await submitRegisteredSiteAction(client, {
        siteId: resolvedAction.siteId,
        actionId: resolvedAction.actionId,
        actionVersion: resolvedAction.actionVersion,
        requestId: requestId(),
        name,
        email: email || undefined,
        phone: phone || undefined,
        message: enquiry || undefined,
        fields: { capabilityKey: resolvedAction.capabilityKey, _website: website },
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
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}><label>Leave this field empty<input name="_website" type="text" tabIndex={-1} autoComplete="off" /></label></div>
      <label>Name<input name="name" placeholder="Your name" required maxLength={120} /></label>
      {contactMode === "email"
        ? <label>Email<input name="email" type="email" placeholder="you@example.com" required maxLength={254} /></label>
        : <label>Phone<input name="phone" inputMode="tel" placeholder="Your phone number" required maxLength={32} /></label>}
      <label>{messageLabel}<textarea name="message" rows={contactMode === "email" ? 5 : 4} placeholder={messagePlaceholder} maxLength={4000} /></label>
      <label style={{ display: "flex", gap: ".6rem", alignItems: "flex-start" }}>
        <input name="consent" type="checkbox" required />
        <span>I agree that the business may use these details to respond to this request.</span>
      </label>
      <button className="button" type="submit" disabled={!active || state === "submitting" || state === "resolving"} aria-disabled={!active || state === "submitting" || state === "resolving"}>
        {state === "submitting" ? "Sending…" : state === "resolving" ? "Checking availability…" : submitLabel}
      </button>
      <small>{active ? "This form sends a request only. It does not confirm a booking, reservation, appointment, admission, or outcome." : note}</small>
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
    </form>
  );
}
