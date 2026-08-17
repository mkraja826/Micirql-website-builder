"use client";

import { useEffect, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import type { OnboardingProfile } from "./recommended-presets";
import { OnboardingProfileProvider } from "./onboarding-profile-context";
import { FirstBuildReview } from "./first-build-review";
import { GuidedOnboarding, type GuidedOnboardingValue } from "./guided-onboarding";
import WorkspaceClient from "./workspace-client";

type DraftContext = { workspaceId: string; siteId: string; snapshot?: { name?: string } };

export function OnboardingGate({ session, initialWorkspaceId, initialSiteId, onBack }: { session: SupabaseSession; initialWorkspaceId?: string; initialSiteId?: string; onBack?: () => void }) {
  const [context, setContext] = useState<DraftContext>();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewSessionActive, setReviewSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workspaceId = initialWorkspaceId ?? "workspace-demo";
        const siteId = initialSiteId ?? "workspace-preview";
        if (initialWorkspaceId && initialSiteId) localStorage.setItem("micirql_active_project", JSON.stringify({ workspaceId: initialWorkspaceId, siteId: initialSiteId }));
        const draftResponse = await fetch(`/api/drafts?workspaceId=${encodeURIComponent(workspaceId)}&siteId=${encodeURIComponent(siteId)}`, { headers: authHeaders, cache: "no-store" });
        const draftPayload = await draftResponse.json();
        if (!draftResponse.ok || !draftPayload?.draft) throw new Error(draftPayload?.error ?? "Could not open your workspace.");
        const nextContext = { workspaceId: String(draftPayload.draft.workspaceId), siteId: String(draftPayload.draft.siteId), snapshot: draftPayload.draft.snapshot };
        if (cancelled) return;
        setContext(nextContext);
        localStorage.setItem("micirql_active_project", JSON.stringify({ workspaceId: nextContext.workspaceId, siteId: nextContext.siteId }));
        const statusResponse = await fetch(`/api/onboarding?workspaceId=${encodeURIComponent(nextContext.workspaceId)}&siteId=${encodeURIComponent(nextContext.siteId)}`, { headers: authHeaders, cache: "no-store" });
        const statusPayload = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusPayload?.error ?? "Could not load onboarding status.");
        if (!cancelled) {
          setProfile((statusPayload.profile ?? null) as OnboardingProfile | null);
          setReady(Boolean(statusPayload.completed));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not start the builder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.access_token, initialWorkspaceId, initialSiteId]);

  async function submit(value: GuidedOnboardingValue) {
    if (!context) return;
    setBuilding(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: context.workspaceId,
          siteId: context.siteId,
          businessName: value.businessName,
          industry: value.industry,
          subindustry: value.subindustry,
          location: value.location,
          services: commaList(value.services),
          goals: value.goals,
          styleTags: value.styleTags,
          requiredCapabilities: value.requiredCapabilities,
          languages: commaList(value.languages),
          notes: value.notes,
          logoUrl: value.logoUrl,
          brandColors: value.brandColors,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Website build failed.");
      const nextProfile = (payload.profile ?? null) as OnboardingProfile | null;
      setProfile(nextProfile);
      if (nextProfile) {
        setReviewSessionActive(true);
        setReady(false);
      } else setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website build failed.");
    } finally {
      setBuilding(false);
    }
  }

  if (loading) return <main style={shellStyle}><div style={loadingStyle}>Preparing your MiCirql workspace…</div></main>;
  if (!context) return <main style={shellStyle}><div style={loadingStyle}>{error || "Workspace is unavailable."}</div></main>;

  if (profile && reviewSessionActive) {
    return <OnboardingProfileProvider profile={profile}>
      <>
        <div style={{ display: ready ? "none" : "block" }}>
          <FirstBuildReview
            session={session}
            workspaceId={context.workspaceId}
            siteId={context.siteId}
            profile={profile}
            onComplete={() => setReady(true)}
          />
        </div>
        {ready ? <div className="mi-review-editor-session">
          <style>{`.mi-review-editor-session .editor-back-button{display:none!important}`}</style>
          <button style={backStyle} onClick={() => setReady(false)}>← Designs</button>
          <WorkspaceClient session={session} workspaceId={context.workspaceId} siteId={context.siteId} />
        </div> : null}
      </>
    </OnboardingProfileProvider>;
  }

  if (ready) return <OnboardingProfileProvider profile={profile}><>{onBack ? <button style={backStyle} onClick={onBack}>← Projects</button> : null}<WorkspaceClient session={session} workspaceId={context.workspaceId} siteId={context.siteId} /></></OnboardingProfileProvider>;

  return <GuidedOnboarding session={session} workspaceId={context.workspaceId} siteId={context.siteId} building={building} error={error} {...(onBack ? { onBack } : {})} onSubmit={submit} />;
}

function commaList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }

const shellStyle: React.CSSProperties = { minHeight: "100vh", padding: "24px 16px 56px", background: "#09090b", color: "#f7f7fb", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const loadingStyle: React.CSSProperties = { maxWidth: 560, margin: "15vh auto 0", padding: 28, border: "1px solid #292933", borderRadius: 20, background: "#111115", textAlign: "center", color: "#b7b7c1" };
const backStyle: React.CSSProperties = { position: "fixed", zIndex: 80, top: 14, left: 14, border: "1px solid #34343f", borderRadius: 10, background: "rgba(18,18,22,.94)", color: "#f4f4f7", padding: "9px 12px", fontWeight: 800, cursor: "pointer", backdropFilter: "blur(10px)" };
