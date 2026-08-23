"use client";

import { useEffect, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import type { OnboardingProfile } from "./recommended-presets";
import { OnboardingProfileProvider } from "./onboarding-profile-context";
import { FirstBuildReview } from "./first-build-review";
import { GuidedOnboarding, type GuidedOnboardingValue } from "./guided-onboarding";
import WorkspaceClient from "./workspace-client";

type DraftContext = { workspaceId: string; siteId: string; snapshot?: { name?: string } };
type BuildStage = "planning" | "designing" | "writing" | "checking" | "finalizing" | "recovering";
type ArchitectPayload = {
  ok?: boolean;
  content?: { fallbackUsed?: boolean; recovery?: { attemptedProviders?: number; failedProviders?: number } } | null;
  contentWarning?: string | null;
  mediaWarning?: string | null;
  generatedMediaCount?: number;
  exactPlacement?: { placed?: number };
  functionalBindings?: { bound?: string[] };
};

export function OnboardingGate({ session, initialWorkspaceId, initialSiteId, onBack }: { session: SupabaseSession; initialWorkspaceId?: string; initialSiteId?: string; onBack?: () => void }) {
  const [context, setContext] = useState<DraftContext>();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewSessionActive, setReviewSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [buildStage, setBuildStage] = useState<BuildStage>("planning");
  const [recoveryNotice, setRecoveryNotice] = useState("");
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
    setBuildStage("planning");
    setRecoveryNotice("");
    setError("");
    try {
      const structuredBrief = {
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
        selectedLayoutId: value.selectedLayoutId,
      };
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify(structuredBrief),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Website build failed.");
      const reviewedLayoutMismatch = Boolean(value.selectedLayoutId && payload?.selectedLayout?.id !== value.selectedLayoutId);
      if (reviewedLayoutMismatch) {
        setRecoveryNotice("MiCirql generated the website successfully but the planner returned a different certified design direction. The build was preserved instead of forcing you to restart; you can choose the preferred certified direction in the design review.");
        console.warn("MiCirql reviewed layout drift recovered", { requested: value.selectedLayoutId, returned: payload?.selectedLayout?.id ?? null });
      }

      setBuildStage("designing");
      try {
        const architectureResponse = await fetch("/api/onboarding/architect", {
          method: "POST",
          headers: { ...authHeaders, "content-type": "application/json" },
          body: JSON.stringify(structuredBrief),
        });
        const architectPayload = await architectureResponse.json().catch(() => ({})) as ArchitectPayload;
        if (!architectureResponse.ok) {
          setBuildStage("recovering");
          setRecoveryNotice("MiCirql kept the safe base website because advanced page enrichment did not complete. Nothing was lost.");
          console.error("MiCirql page architecture enrichment failed", architectPayload);
        } else {
          setBuildStage("writing");
          const fallback = Boolean(architectPayload.content?.fallbackUsed);
          const failedProviders = architectPayload.content?.recovery?.failedProviders ?? 0;
          const warnings = [architectPayload.contentWarning, architectPayload.mediaWarning].filter(Boolean) as string[];
          if (fallback || failedProviders > 0 || warnings.length) {
            setBuildStage("recovering");
            const providerText = fallback || failedProviders > 0 ? ` Content generation recovered after ${Math.max(1, failedProviders)} provider failure${failedProviders === 1 ? "" : "s"}.` : "";
            const enrichmentText = warnings.length ? " A non-critical enrichment step was skipped and the last safe result was preserved." : "";
            setRecoveryNotice(`MiCirql recovered the build safely.${providerText}${enrichmentText}`.trim());
          }
        }
      } catch (architectureError) {
        setBuildStage("recovering");
        setRecoveryNotice("MiCirql kept the safe base website because advanced enrichment was interrupted. Nothing was lost.");
        console.error("MiCirql page architecture enrichment failed; keeping base build.", architectureError);
      }

      setBuildStage("checking");
      const nextProfile = (payload.profile ?? null) as OnboardingProfile | null;
      setProfile(nextProfile);
      setBuildStage("finalizing");
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
  if (building) return <BuildProgress stage={buildStage} recoveryNotice={recoveryNotice} />;

  if (profile && reviewSessionActive) {
    return <OnboardingProfileProvider profile={profile}>
      {recoveryNotice ? <div style={recoveryBannerStyle} role="status"><strong>Build recovered safely</strong><span>{recoveryNotice}</span></div> : null}
      {ready ? <div className="mi-review-editor-session">
        <style>{`.mi-review-editor-session .editor-back-button{display:none!important}`}</style>
        <button style={backStyle} onClick={() => setReady(false)}>← Designs</button>
        <WorkspaceClient session={session} workspaceId={context.workspaceId} siteId={context.siteId} />
      </div> : <FirstBuildReview
        session={session}
        workspaceId={context.workspaceId}
        siteId={context.siteId}
        profile={profile}
        onComplete={() => setReady(true)}
      />}
    </OnboardingProfileProvider>;
  }

  if (ready) return <OnboardingProfileProvider profile={profile}><WorkspaceClient session={session} workspaceId={context.workspaceId} siteId={context.siteId} /></OnboardingProfileProvider>;

  return <GuidedOnboarding session={session} workspaceId={context.workspaceId} siteId={context.siteId} building={building} error={error} {...(onBack ? { onBack } : {})} onSubmit={submit} />;
}

function BuildProgress({ stage, recoveryNotice }: { stage: BuildStage; recoveryNotice: string }) {
  const stages: Array<{ id: BuildStage; label: string }> = [
    { id: "planning", label: "Planning" },
    { id: "designing", label: "Designing pages" },
    { id: "writing", label: "Writing content" },
    { id: "checking", label: "Checking quality" },
    { id: "finalizing", label: "Finalizing" },
  ];
  const activeIndex = Math.max(0, stages.findIndex((item) => item.id === stage));
  const recovering = stage === "recovering";
  return <main style={shellStyle}><section style={progressCardStyle} aria-live="polite">
    <span style={progressEyebrowStyle}>MiCirql build intelligence</span>
    <h1 style={progressHeadingStyle}>{recovering ? "Recovering safely…" : stages[activeIndex]?.label ?? "Building your website…"}</h1>
    <p style={progressCopyStyle}>{recovering ? recoveryNotice || "A build step failed, so MiCirql is preserving the last safe result." : "MiCirql is building through guarded stages. Failed providers and incomplete results are rejected before they can replace your website."}</p>
    <div style={stageListStyle}>{stages.map((item, index) => {
      const done = !recovering && index < activeIndex;
      const active = !recovering && index === activeIndex;
      return <div key={item.id} style={{ ...stageRowStyle, ...(active ? stageActiveStyle : {}), ...(done ? stageDoneStyle : {}) }}><b>{done ? "✓" : active ? "●" : "○"}</b><span>{item.label}</span></div>;
    })}</div>
    {recovering ? <div style={recoveryInlineStyle}><strong>Protection active</strong><span>The previous safe build remains intact while MiCirql recovers.</span></div> : null}
  </section></main>;
}

function commaList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }

const shellStyle: React.CSSProperties = { minHeight: "100vh", padding: "24px 16px 56px", background: "#09090b", color: "#f7f7fb", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const loadingStyle: React.CSSProperties = { maxWidth: 560, margin: "15vh auto 0", padding: 28, border: "1px solid #292933", borderRadius: 20, background: "#111115", textAlign: "center", color: "#b7b7c1" };
const backStyle: React.CSSProperties = { position: "fixed", zIndex: 80, top: 14, left: 14, border: "1px solid #34343f", borderRadius: 10, background: "rgba(18,18,22,.94)", color: "#f4f4f7", padding: "9px 12px", fontWeight: 800, cursor: "pointer", backdropFilter: "blur(10px)" };
const progressCardStyle: React.CSSProperties = { maxWidth: 620, margin: "11vh auto 0", padding: 32, border: "1px solid #292933", borderRadius: 24, background: "#111115", boxShadow: "0 24px 80px rgba(0,0,0,.35)" };
const progressEyebrowStyle: React.CSSProperties = { display: "block", color: "#9b8cff", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 };
const progressHeadingStyle: React.CSSProperties = { margin: 0, fontSize: 32, lineHeight: 1.1 };
const progressCopyStyle: React.CSSProperties = { color: "#b7b7c1", lineHeight: 1.65, margin: "14px 0 24px" };
const stageListStyle: React.CSSProperties = { display: "grid", gap: 8 };
const stageRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, minHeight: 46, padding: "0 14px", border: "1px solid #24242c", borderRadius: 12, color: "#777781", background: "#0d0d11" };
const stageActiveStyle: React.CSSProperties = { color: "#f7f7fb", borderColor: "#5a4dd6", background: "#171522" };
const stageDoneStyle: React.CSSProperties = { color: "#b9f4cf", borderColor: "#244b34" };
const recoveryInlineStyle: React.CSSProperties = { display: "grid", gap: 5, marginTop: 18, padding: 14, borderRadius: 12, border: "1px solid #5b4822", background: "#1b160c", color: "#f2d58a" };
const recoveryBannerStyle: React.CSSProperties = { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 120, width: "min(680px, calc(100vw - 32px))", display: "grid", gap: 4, padding: "12px 16px", borderRadius: 12, border: "1px solid #4b4030", background: "rgba(25,20,12,.96)", color: "#f5dda1", boxShadow: "0 14px 40px rgba(0,0,0,.35)" };