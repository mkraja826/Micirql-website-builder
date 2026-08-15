"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import {
  createEditorHistory,
  createEditorState,
  executeEditorCommand,
  markEditorSaved,
  redoEditor,
  setEditorSelection,
  setEditorViewport,
  undoEditor,
  type EditorHistory,
  type EditorViewport,
} from "@micirql/workspace";
import { RendererPreview } from "./renderer-preview";
import { SectionDesignSwitcher } from "./section-design-switcher";
import { AssetPicker } from "./asset-picker";

type Mode = "content" | "images" | "design" | "pages" | "seo" | "functions" | "domain";
type SaveState = "loading" | "saved" | "unsaved" | "saving" | "conflict" | "error";
type DraftApiRecord = { workspaceId: string; siteId: string; revision: number; snapshot: Site; updatedAt: string; updatedBy: string };

const initialSite: Site = {
  schemaVersion: SCHEMA_VERSION,
  siteId: "workspace-preview",
  workspaceId: "workspace-demo",
  name: "Your website",
  domain: "landing-page",
  theme: { family: "minimalist", modifiers: ["light"], brand: { colors: { primary: "#6d5dfc", secondary: "#171717", accent: "#8b7fff", background: "#ffffff", surface: "#f5f5f7", textPrimary: "#111111", textSecondary: "#65656b", border: "#dddde3", success: "#168a4a", warning: "#ad6a00", error: "#c93636" }, typography: { display: "Arial", body: "Arial", ui: "Arial" }, density: "comfortable", shape: "balanced", motion: "subtle" } },
  seoBlueprint: { primaryGoal: "Present the business clearly and convert visitors", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: true, locationPages: false, blog: false },
  pages: [{ id: "home", path: "/", name: "Home", sections: [
    { id: "hero-1", component: { componentId: "hero.placeholder", version: "1.0.0" }, props: { eyebrow: "Built with MiCirql", heading: "A website your business can grow into.", body: "Select any section to edit its content, images, design and actions without touching code." }, bindings: {}, hidden: false },
    { id: "features-1", component: { componentId: "features.placeholder", version: "1.0.0" }, props: { heading: "Everything stays editable", body: "The live draft is a validated Site Schema. Changes update the preview immediately and remain safe to publish.", items: [{ title: "Mobile first", description: "Every layout begins with the smallest screen." }, { title: "Fast by default", description: "Approved components stay within the MiCirql performance protocol." }, { title: "Fully editable", description: "Content, assets, design and functionality remain workspace-controlled." }] }, bindings: {}, hidden: false }
  ], seo: { title: "Your website", description: "A website created with MiCirql.", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
  navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
};

export default function WorkspaceClient() {
  const [history, setHistory] = useState<EditorHistory>(() => createEditorHistory(createEditorState(initialSite)));
  const [mode, setMode] = useState<Mode>("content");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [persistedRevision, setPersistedRevision] = useState(0);
  const [conflictDraft, setConflictDraft] = useState<DraftApiRecord | undefined>();
  const loaded = useRef(false);

  const state = history.present;
  const activePage = useMemo(() => (state.selected.kind === "page" || state.selected.kind === "section") ? state.site.pages.find((page) => page.id === state.selected.pageId) ?? state.site.pages[0]! : state.site.pages[0]!, [state]);
  const activeSection = state.selected.kind === "section" ? activePage.sections.find((section) => section.id === state.selected.sectionId) : undefined;
  const activeSectionFamily = activeSection ? sectionFamilyFromComponentId(activeSection.component.componentId) : undefined;

  useEffect(() => {
    let cancelled = false;
    async function loadDraft() {
      try {
        const query = new URLSearchParams({ workspaceId: initialSite.workspaceId, siteId: initialSite.siteId });
        const response = await fetch(`/api/drafts?${query.toString()}`, { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 404) { setSaveState("saved"); loaded.current = true; return; }
        if (!response.ok) throw new Error(`Draft load failed (${response.status}).`);
        const payload = await response.json() as { draft: DraftApiRecord };
        const site = siteSchema.parse(payload.draft.snapshot);
        const editor = createEditorState(site); editor.revision = payload.draft.revision;
        setHistory(createEditorHistory(editor)); setPersistedRevision(payload.draft.revision); setSaveState("saved"); loaded.current = true;
      } catch (error) { if (!cancelled) { console.error(error); setSaveState("error"); loaded.current = true; } }
    }
    void loadDraft(); return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded.current || !state.dirty || saveState === "saving" || saveState === "conflict") return;
    const timer = window.setTimeout(() => { void persist(state.site, state.revision); }, 700);
    return () => window.clearTimeout(timer);
  }, [state.site, state.revision, state.dirty, persistedRevision, saveState]);

  function commit(command: Parameters<typeof executeEditorCommand>[1]) {
    try { setHistory((current) => executeEditorCommand(current, command)); setSaveState("unsaved"); }
    catch (error) { window.alert(error instanceof Error ? error.message : "This change is not allowed."); }
  }
  function selectPage(pageId: string) { setHistory((current) => ({ ...current, present: setEditorSelection(current.present, { kind: "page", pageId }) })); }
  function selectSection(pageId: string, sectionId: string) { setHistory((current) => ({ ...current, present: setEditorSelection(current.present, { kind: "section", pageId, sectionId }) })); }
  function setViewport(viewport: EditorViewport) { setHistory((current) => ({ ...current, present: setEditorViewport(current.present, viewport) })); }

  async function persist(snapshot: Site, sentEditorRevision: number) {
    if (saveState === "saving" || saveState === "conflict") return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/drafts", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot, expectedRevision: persistedRevision, updatedBy: "workspace-user" }) });
      const payload = await response.json() as { draft?: DraftApiRecord; error?: string };
      if (response.status === 409) { setConflictDraft(payload.draft); setSaveState("conflict"); return; }
      if (!response.ok || !payload.draft) throw new Error(payload.error ?? `Draft save failed (${response.status}).`);
      setPersistedRevision(payload.draft.revision);
      setHistory((current) => ({ ...current, present: current.present.revision === sentEditorRevision ? markEditorSaved(current.present) : current.present }));
      setSaveState((current) => current === "conflict" ? current : "saved");
    } catch (error) { console.error(error); setSaveState("error"); }
  }

  function loadServerVersion() {
    if (!conflictDraft) return;
    const site = siteSchema.parse(conflictDraft.snapshot); const editor = createEditorState(site); editor.revision = conflictDraft.revision;
    setHistory(createEditorHistory(editor)); setPersistedRevision(conflictDraft.revision); setConflictDraft(undefined); setSaveState("saved");
  }

  return <main className="workspace-shell">
    <header className="workspace-topbar"><div className="brand-lockup"><strong>MiCirql</strong><span>{state.site.name}</span></div><div className="page-switcher">{state.site.pages.map((page) => <button key={page.id} className={page.id === activePage.id ? "is-active" : ""} onClick={() => selectPage(page.id)}>{page.name}</button>)}</div><div className="workspace-actions"><span className={`save-state ${saveState}`}>{saveLabel(saveState)}</span><button onClick={() => { setHistory((current) => undoEditor(current)); setSaveState("unsaved"); }} disabled={!history.past.length}>Undo</button><button onClick={() => { setHistory((current) => redoEditor(current)); setSaveState("unsaved"); }} disabled={!history.future.length}>Redo</button><button onClick={() => void persist(state.site, state.revision)} disabled={saveState === "saving" || saveState === "loading"}>Save</button><button className="publish-button">Publish</button></div></header>
    {saveState === "conflict" ? <section className="draft-conflict" role="alert"><div><strong>This draft changed elsewhere.</strong><span>Your local edits were not overwritten.</span></div><button type="button" onClick={loadServerVersion}>Load latest saved version</button></section> : null}
    <aside className="workspace-rail" aria-label="Editing tools">{(["content", "images", "design", "pages", "seo", "functions", "domain"] as Mode[]).map((item) => <button key={item} className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>{item}</button>)}</aside>
    <section className="workspace-canvas"><div className="viewport-switcher">{(["mobile", "tablet", "desktop"] as EditorViewport[]).map((viewport) => <button key={viewport} className={state.viewport === viewport ? "is-active" : ""} onClick={() => setViewport(viewport)}>{viewport}</button>)}</div><RendererPreview site={state.site} path={activePage.path} viewport={state.viewport} selectedSectionId={activeSection?.id} onSelectSection={(sectionId) => selectSection(activePage.id, sectionId)} /></section>
    <aside className="workspace-inspector"><div className="inspector-heading"><span>{mode}</span><strong>{activeSection ? activeSection.id : activePage.name}</strong></div>
      {mode === "content" && activeSection ? <div className="inspector-form"><label>Heading<input value={String(activeSection.props.heading ?? activeSection.props.title ?? "")} onChange={(event) => commit({ type: "content.set", pageId: activePage.id, sectionId: activeSection.id, propPath: activeSection.props.title !== undefined ? "title" : "heading", value: event.target.value })} /></label><label>Body<textarea value={String(activeSection.props.body ?? activeSection.props.description ?? "")} onChange={(event) => commit({ type: "content.set", pageId: activePage.id, sectionId: activeSection.id, propPath: activeSection.props.description !== undefined ? "description" : "body", value: event.target.value })} /></label></div>
      : mode === "images" && activeSection && activeSectionFamily ? <AssetPicker workspaceId={state.site.workspaceId} domain={state.site.domain} theme={state.site.theme.family} family={activeSectionFamily} onSelect={(asset) => commit({ type: "asset.set", pageId: activePage.id, sectionId: activeSection.id, propPath: "image", asset: { assetId: asset.id, alt: asset.alt, focalPoint: asset.focalPoint } })} />
      : mode === "seo" ? <div className="inspector-form"><label>SEO title<input value={activePage.seo.title} onChange={(event) => commit({ type: "page.seo.patch", pageId: activePage.id, patch: { title: event.target.value } })} /></label><label>Description<textarea value={activePage.seo.description} onChange={(event) => commit({ type: "page.seo.patch", pageId: activePage.id, patch: { description: event.target.value } })} /></label></div>
      : mode === "design" ? <div className="inspector-form"><label>Primary color<input type="color" value={state.site.theme.brand.colors.primary} onChange={(event) => commit({ type: "brand.patch", patch: { colors: { ...state.site.theme.brand.colors, primary: event.target.value } } })} /></label><label>Background<input type="color" value={state.site.theme.brand.colors.background} onChange={(event) => commit({ type: "brand.patch", patch: { colors: { ...state.site.theme.brand.colors, background: event.target.value } } })} /></label>{activeSection && activeSectionFamily ? <SectionDesignSwitcher family={activeSectionFamily} theme={state.site.theme.family} currentComponentId={activeSection.component.componentId} onSelect={(componentId, version) => commit({ type: "section.component.set", pageId: activePage.id, sectionId: activeSection.id, componentId, version })} /> : <div className="inspector-empty"><p>Select a section to change its design.</p></div>}</div>
      : <div className="inspector-empty"><p>{activeSection ? "This section is selected." : "Select a section in the preview."}</p><span>{mode} controls will connect to their dedicated registry/API in the next slice.</span></div>}
    </aside>
    <nav className="mobile-editor-bar" aria-label="Editing tools">{(["content", "images", "design", "pages", "seo"] as Mode[]).map((item) => <button key={item} className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>{item}</button>)}</nav>
  </main>;
}

function sectionFamilyFromComponentId(componentId: string): SectionFamily | undefined { const normalized = componentId.toLowerCase(); const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`)); if (legacy) return legacy; const upper = componentId.toUpperCase(); return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`)); }
function saveLabel(state: SaveState) { if (state === "loading") return "Loading…"; if (state === "saving") return "Saving…"; if (state === "unsaved") return "Unsaved"; if (state === "conflict") return "Conflict"; if (state === "error") return "Save error"; return "Saved"; }
