"use client";

import { useMemo, useState } from "react";
import { SCHEMA_VERSION, type Site } from "@micirql/schema";
import {
  createEditorHistory,
  createEditorState,
  executeEditorCommand,
  redoEditor,
  setEditorSelection,
  setEditorViewport,
  undoEditor,
  type EditorHistory,
  type EditorViewport,
} from "@micirql/workspace";

type Mode = "content" | "images" | "design" | "pages" | "seo" | "functions" | "domain";

const initialSite: Site = {
  schemaVersion: SCHEMA_VERSION,
  siteId: "workspace-preview",
  workspaceId: "workspace-demo",
  name: "Your website",
  domain: "landing-page",
  theme: {
    family: "minimalist",
    modifiers: ["light"],
    brand: {
      colors: {
        primary: "#6d5dfc",
        secondary: "#171717",
        accent: "#8b7fff",
        background: "#ffffff",
        surface: "#f5f5f7",
        textPrimary: "#111111",
        textSecondary: "#65656b",
        border: "#ddddE3",
        success: "#168a4a",
        warning: "#ad6a00",
        error: "#c93636"
      },
      typography: { display: "Arial", body: "Arial", ui: "Arial" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle"
    }
  },
  seoBlueprint: {
    primaryGoal: "Present the business clearly and convert visitors",
    targetLocations: [],
    priorityTopics: [],
    audiences: [],
    languages: ["en"],
    localSeo: false,
    servicePages: true,
    locationPages: false,
    blog: false
  },
  pages: [
    {
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        {
          id: "hero-1",
          component: { componentId: "hero.placeholder", version: "1.0.0" },
          props: {
            eyebrow: "Built with MiCirql",
            heading: "A website your business can grow into.",
            body: "Select any section to edit its content, images, design and actions without touching code."
          },
          bindings: {},
          hidden: false
        },
        {
          id: "features-1",
          component: { componentId: "features.placeholder", version: "1.0.0" },
          props: {
            heading: "Everything stays editable",
            body: "The live draft is a validated Site Schema. Changes update the preview immediately and remain safe to publish."
          },
          bindings: {},
          hidden: false
        }
      ],
      seo: {
        title: "Your website",
        description: "A website created with MiCirql.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: []
      }
    }
  ],
  navigation: [{ label: "Home", href: "/" }],
  integrations: [],
  domains: []
};

export default function WorkspaceClient() {
  const [history, setHistory] = useState<EditorHistory>(() => createEditorHistory(createEditorState(initialSite)));
  const [mode, setMode] = useState<Mode>("content");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving">("saved");

  const state = history.present;
  const activePage = useMemo(() => {
    if (state.selected.kind === "page" || state.selected.kind === "section") {
      return state.site.pages.find((page) => page.id === state.selected.pageId) ?? state.site.pages[0]!;
    }
    return state.site.pages[0]!;
  }, [state]);
  const activeSection = state.selected.kind === "section"
    ? activePage.sections.find((section) => section.id === state.selected.sectionId)
    : undefined;

  function commit(command: Parameters<typeof executeEditorCommand>[1]) {
    try {
      setHistory((current) => executeEditorCommand(current, command));
      setSaveState("unsaved");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "This change is not allowed.");
    }
  }

  function selectPage(pageId: string) {
    setHistory((current) => ({ ...current, present: setEditorSelection(current.present, { kind: "page", pageId }) }));
  }

  function selectSection(pageId: string, sectionId: string) {
    setHistory((current) => ({ ...current, present: setEditorSelection(current.present, { kind: "section", pageId, sectionId }) }));
  }

  function setViewport(viewport: EditorViewport) {
    setHistory((current) => ({ ...current, present: setEditorViewport(current.present, viewport) }));
  }

  function save() {
    setSaveState("saving");
    window.setTimeout(() => setSaveState("saved"), 250);
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="brand-lockup"><strong>MiCirql</strong><span>{state.site.name}</span></div>
        <div className="page-switcher">
          {state.site.pages.map((page) => (
            <button key={page.id} className={page.id === activePage.id ? "is-active" : ""} onClick={() => selectPage(page.id)}>{page.name}</button>
          ))}
        </div>
        <div className="workspace-actions">
          <span className={`save-state ${saveState}`}>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}</span>
          <button onClick={() => setHistory((current) => undoEditor(current))} disabled={!history.past.length}>Undo</button>
          <button onClick={() => setHistory((current) => redoEditor(current))} disabled={!history.future.length}>Redo</button>
          <button onClick={save}>Save</button>
          <button className="publish-button">Publish</button>
        </div>
      </header>

      <aside className="workspace-rail" aria-label="Editing tools">
        {(["content", "images", "design", "pages", "seo", "functions", "domain"] as Mode[]).map((item) => (
          <button key={item} className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>{item}</button>
        ))}
      </aside>

      <section className="workspace-canvas">
        <div className="viewport-switcher">
          {(["mobile", "tablet", "desktop"] as EditorViewport[]).map((viewport) => (
            <button key={viewport} className={state.viewport === viewport ? "is-active" : ""} onClick={() => setViewport(viewport)}>{viewport}</button>
          ))}
        </div>
        <div className={`site-preview viewport-${state.viewport}`} style={{ background: state.site.theme.brand.colors.background, color: state.site.theme.brand.colors.textPrimary }}>
          {activePage.sections.filter((section) => !section.hidden).map((section) => {
            const heading = String(section.props.heading ?? section.props.title ?? section.component.componentId);
            const eyebrow = section.props.eyebrow ? String(section.props.eyebrow) : undefined;
            const body = section.props.body ? String(section.props.body) : undefined;
            const selected = activeSection?.id === section.id;
            return (
              <button key={section.id} className={`preview-section ${selected ? "is-selected" : ""}`} onClick={() => selectSection(activePage.id, section.id)}>
                {eyebrow ? <span className="preview-eyebrow">{eyebrow}</span> : null}
                <h2>{heading}</h2>
                {body ? <p>{body}</p> : null}
                <small>{section.component.componentId}</small>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="workspace-inspector">
        <div className="inspector-heading"><span>{mode}</span><strong>{activeSection ? activeSection.id : activePage.name}</strong></div>
        {mode === "content" && activeSection ? (
          <div className="inspector-form">
            <label>Heading<input value={String(activeSection.props.heading ?? "")} onChange={(event) => commit({ type: "content.set", pageId: activePage.id, sectionId: activeSection.id, propPath: "heading", value: event.target.value })} /></label>
            <label>Body<textarea value={String(activeSection.props.body ?? "")} onChange={(event) => commit({ type: "content.set", pageId: activePage.id, sectionId: activeSection.id, propPath: "body", value: event.target.value })} /></label>
          </div>
        ) : mode === "seo" ? (
          <div className="inspector-form">
            <label>SEO title<input value={activePage.seo.title} onChange={(event) => commit({ type: "page.seo.patch", pageId: activePage.id, patch: { title: event.target.value } })} /></label>
            <label>Description<textarea value={activePage.seo.description} onChange={(event) => commit({ type: "page.seo.patch", pageId: activePage.id, patch: { description: event.target.value } })} /></label>
          </div>
        ) : mode === "design" ? (
          <div className="inspector-form">
            <label>Primary color<input type="color" value={state.site.theme.brand.colors.primary} onChange={(event) => commit({ type: "brand.patch", patch: { colors: { ...state.site.theme.brand.colors, primary: event.target.value } } })} /></label>
            <label>Background<input type="color" value={state.site.theme.brand.colors.background} onChange={(event) => commit({ type: "brand.patch", patch: { colors: { ...state.site.theme.brand.colors, background: event.target.value } } })} /></label>
          </div>
        ) : (
          <div className="inspector-empty"><p>{activeSection ? "This section is selected." : "Select a section in the preview."}</p><span>{mode} controls will connect to their dedicated registry/API in the next slice.</span></div>
        )}
      </aside>

      <nav className="mobile-editor-bar" aria-label="Editing tools">
        {(["content", "images", "design", "pages", "seo"] as Mode[]).map((item) => (
          <button key={item} className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>{item}</button>
        ))}
      </nav>
    </main>
  );
}
