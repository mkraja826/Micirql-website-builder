"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Site, SiteSection } from "@micirql/schema";
import { SeedSection, seedSectionCatalog } from "@micirql/sections";
import { readStoredSession } from "./auth-client";
import type { AiEditorSectionFamily } from "./ai-edit-types";

type Candidate = {
  componentId: string;
  version: string;
  displayName: string;
  score: number;
  reasons: string[];
  previewOnly: boolean;
  theme: string;
  modifiers: string[];
};

type SeedProps = Parameters<typeof SeedSection>[0]["props"];
type PreviewViewport = "desktop" | "mobile";

export function SectionCompositionPicker({ site, pageId, family, afterSectionId, currentSection, mode = "insert", onChoose, onCancel }: {
  site: Site;
  pageId: string;
  family: AiEditorSectionFamily;
  afterSectionId?: string;
  currentSection?: SiteSection;
  mode?: "insert" | "replace";
  onChoose(candidate: Candidate): void;
  onCancel(): void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Candidate>();
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [preferenceProfile, setPreferenceProfile] = useState<unknown>();
  const [seenIds, setSeenIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadInitial();
    return () => { cancelled = true; };

    async function loadInitial() {
      setBusy(true);
      setError("");
      try {
        const session = readStoredSession();
        if (!session?.access_token) throw new Error("Sign in again to load section directions.");
        const query = new URLSearchParams({ workspaceId: site.workspaceId, siteId: site.siteId });
        const preferenceResponse = await fetch(`/api/design-preferences?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const preferences = preferenceResponse.ok ? await preferenceResponse.json() as { profile?: unknown } : null;
        if (cancelled) return;
        setPreferenceProfile(preferences?.profile);
        const next = await fetchCandidates({ token: session.access_token, preferences: preferences?.profile, excludeComponentIds: currentSection ? [currentSection.component.componentId] : [] });
        if (cancelled) return;
        setCandidates(next);
        setSelected(next[0]);
        setSeenIds([...(currentSection ? [currentSection.component.componentId] : []), ...next.map((item) => item.componentId)]);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not rank section directions.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
  }, [site, pageId, family, afterSectionId, currentSection]);

  async function explore(exploreMode: "similar" | "fresh") {
    const session = readStoredSession();
    if (!session?.access_token) { setError("Sign in again to load section directions."); return; }
    setBusy(true);
    setError("");
    try {
      const next = await fetchCandidates({
        token: session.access_token,
        preferences: preferenceProfile,
        ...(exploreMode === "similar" && selected ? { anchorComponentId: selected.componentId } : {}),
        excludeComponentIds: exploreMode === "fresh" ? seenIds : selected ? [selected.componentId, ...(currentSection ? [currentSection.component.componentId] : [])] : [],
      });
      if (!next.length) {
        setError(exploreMode === "fresh" ? "You have explored the available section directions for this family." : "No additional similar directions are available yet.");
        return;
      }
      setCandidates(next);
      setSelected(next[0]);
      setSeenIds((current) => [...new Set([...current, ...next.map((item) => item.componentId)])]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load more section directions.");
    } finally {
      setBusy(false);
    }
  }

  async function fetchCandidates({ token, preferences, anchorComponentId, excludeComponentIds = [] }: { token: string; preferences?: unknown; anchorComponentId?: string; excludeComponentIds?: string[] }) {
    const response = await fetch("/api/section-candidates", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ site, pageId, family, afterSectionId, preferenceProfile: preferences ?? null, anchorComponentId, excludeComponentIds }),
    });
    const payload = await response.json() as { candidates?: Candidate[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Could not rank section directions.");
    return payload.candidates ?? [];
  }

  const selectedSeed = useMemo(() => selected ? seedSectionCatalog.find((item) => item.id === selected.componentId) : undefined, [selected]);
  const renderedProps = useMemo(() => currentSection ? normalizeExistingProps(currentSection.props, family, site.name) : previewProps(family, site.name), [currentSection, family, site.name]);
  const themeStyle = useMemo(() => ({
    "--mi-color-primary": site.theme.brand.colors.primary,
    "--mi-color-secondary": site.theme.brand.colors.secondary,
    "--mi-color-accent": site.theme.brand.colors.accent,
    "--mi-color-background": site.theme.brand.colors.background,
    "--mi-color-surface": site.theme.brand.colors.surface,
    "--mi-color-text-primary": site.theme.brand.colors.textPrimary,
    "--mi-color-text-secondary": site.theme.brand.colors.textSecondary,
    "--mi-color-border": site.theme.brand.colors.border,
  } as CSSProperties), [site.theme.brand.colors]);

  return <section className="section-composition-picker">
    <div className="section-composition-head"><div><span>{mode === "replace" ? "Replace design" : "Choose a direction"}</span><strong>{label(family)} section</strong><small>{mode === "replace" ? "Your existing content, images and connected actions stay unchanged. Preview the new layout before switching." : "Ranked from your page context and learned design taste. Preview the real component before inserting it."}</small></div><button type="button" onClick={onCancel}>×</button></div>
    {error ? <div className="section-composition-state is-error">{error}</div> : null}
    {selected ? <div className="section-composition-stage">
      <div className="section-composition-stage-bar">
        <div><strong>{selected.displayName}</strong><span>{selected.previewOnly ? "Preview library" : "Certified"} · {selected.score.toFixed(1)} · {label(selected.theme)}</span></div>
        <div className="section-composition-stage-actions">
          <div className="section-composition-viewport" aria-label="Section preview size"><button type="button" className={viewport === "desktop" ? "is-active" : ""} onClick={() => setViewport("desktop")}>Desktop</button><button type="button" className={viewport === "mobile" ? "is-active" : ""} onClick={() => setViewport("mobile")}>Mobile</button></div>
          <button type="button" className="is-secondary" onClick={() => void explore("similar")} disabled={busy}>More like this</button>
          <button type="button" onClick={() => onChoose(selected)} disabled={busy}>{mode === "replace" ? "Use this design" : "Use this section"}</button>
        </div>
      </div>
      <div className={`section-composition-preview-shell is-${viewport}`}><div className="section-composition-live-preview" style={themeStyle}>{selectedSeed ? <SeedSection family={selectedSeed.family} variant={selectedSeed.variant} props={renderedProps} /> : <div className="section-composition-state is-error">Renderer unavailable for {selected.componentId}</div>}</div></div>
    </div> : null}
    {busy ? <div className="section-composition-state">Finding more compatible directions…</div> : null}
    {!busy ? <div className="section-composition-grid">{candidates.map((candidate, index) => <article key={`${candidate.componentId}@${candidate.version}`} className={`section-composition-card${selected?.componentId === candidate.componentId ? " is-selected" : ""}`}><button type="button" className="section-composition-card-select" onClick={() => setSelected(candidate)} aria-label={`Preview ${candidate.displayName}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{candidate.displayName}</b></button><div className="section-composition-copy"><div><strong>{candidate.displayName}</strong><span>{candidate.previewOnly ? "Preview library" : "Certified"} · {candidate.score.toFixed(1)}</span></div><ul>{candidate.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></div><button type="button" onClick={() => setSelected(candidate)}>{selected?.componentId === candidate.componentId ? "Viewing" : "Preview"}</button></article>)}</div> : null}
    {!busy && !candidates.length && !error ? <div className="section-composition-state">No compatible directions are available yet.</div> : null}
    <div className="section-composition-footer-actions"><button type="button" onClick={() => void explore("fresh")} disabled={busy}>Regenerate 5 more</button><span>{seenIds.length} direction{seenIds.length === 1 ? "" : "s"} explored</span></div>
    <p className="section-composition-note">Preview-library choices are clearly marked and are never treated as certified production components.</p>
  </section>;
}

function label(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function normalizeExistingProps(props: SiteSection["props"], family: AiEditorSectionFamily, siteName: string): SeedProps {
  const source = props as Record<string, unknown>;
  const fallback = previewProps(family, siteName);
  const title = stringValue(source.title) || stringValue(source.heading) || fallback.title;
  const description = stringValue(source.description) || stringValue(source.body) || fallback.description;
  const eyebrow = stringValue(source.eyebrow) || fallback.eyebrow;
  const items = Array.isArray(source.items) ? source.items.map((item) => normalizeItem(item)).filter((item): item is NonNullable<ReturnType<typeof normalizeItem>> => Boolean(item)) : fallback.items;
  const primaryAction = normalizeAction(source.primaryAction) ?? normalizeAction(source.primaryCta) ?? fallback.primaryAction;
  const secondaryAction = normalizeAction(source.secondaryAction) ?? normalizeAction(source.secondaryCta) ?? fallback.secondaryAction;
  const image = normalizeImage(source.image) ?? fallback.image;
  return { title, ...(eyebrow ? { eyebrow } : {}), ...(description ? { description } : {}), ...(items?.length ? { items } : {}), ...(primaryAction ? { primaryAction } : {}), ...(secondaryAction ? { secondaryAction } : {}), ...(image ? { image } : {}) };
}
function normalizeItem(value: unknown): { title: string; description?: string; image?: string } | undefined { if (!value || typeof value !== "object") return undefined; const item = value as Record<string, unknown>; const title = stringValue(item.title) || stringValue(item.name) || stringValue(item.quote); if (!title) return undefined; const description = stringValue(item.description) || stringValue(item.role) || stringValue(item.body); const image = typeof item.image === "string" ? item.image : undefined; return { title, ...(description ? { description } : {}), ...(image ? { image } : {}) }; }
function normalizeAction(value: unknown) { if (!value || typeof value !== "object") return undefined; const action = value as Record<string, unknown>; const label = stringValue(action.label); const href = stringValue(action.href); return label && href ? { label, href } : undefined; }
function normalizeImage(value: unknown) { if (!value || typeof value !== "object") return undefined; const image = value as Record<string, unknown>; const src = stringValue(image.src) || stringValue(image.url); const alt = stringValue(image.alt); return src ? { src, alt } : undefined; }
function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function previewProps(family: AiEditorSectionFamily, siteName: string): SeedProps {
  if (family === "about") return { eyebrow: "Our story", title: `About ${siteName}`, description: "A clear introduction to the business, its approach and what makes it worth choosing." };
  if (family === "services") return { eyebrow: "What we do", title: "Services", description: "Explore the services designed around what customers need most.", items: [{ title: "Primary service", description: "A concise explanation of the core offer." }, { title: "Specialist service", description: "A second service with a clear customer benefit." }, { title: "Supporting service", description: "Another useful option for visitors to explore." }] };
  if (family === "features") return { eyebrow: "Why choose us", title: "Built around better outcomes", items: [{ title: "Clear benefit", description: "A meaningful reason customers choose this business." }, { title: "Trusted approach", description: "A second proof point that supports confidence." }, { title: "Easy experience", description: "A practical benefit visitors can understand quickly." }] };
  if (family === "process") return { eyebrow: "How it works", title: "A simple path forward", items: [{ title: "Discover", description: "Understand the customer requirement." }, { title: "Plan", description: "Recommend the right next step." }, { title: "Deliver", description: "Complete the service with clear communication." }] };
  if (family === "testimonials") return { eyebrow: "Customer stories", title: "What customers say", items: [{ title: "Clear and professional", description: "The experience felt easy from start to finish." }, { title: "A result worth recommending", description: "Everything was explained clearly and handled with care." }] };
  if (family === "gallery") return { eyebrow: "Selected work", title: "Gallery", description: "A visual selection of work, spaces or results.", items: [{ title: "Selected work" }, { title: "Recent project" }, { title: "Featured result" }] };
  if (family === "team") return { eyebrow: "Our people", title: "Meet the team", items: [{ title: "Team member", description: "Specialist" }, { title: "Team member", description: "Specialist" }, { title: "Team member", description: "Specialist" }] };
  if (family === "cta") return { eyebrow: "Next step", title: "Ready to get started?", description: "Take the next step with a clear, low-friction action.", primaryAction: { label: "Get started", href: "#contact" } };
  return { eyebrow: "Contact", title: "Let’s talk", description: "Tell us what you need and we’ll help you choose the right next step.", primaryAction: { label: "Send enquiry", href: "#contact" } };
}
