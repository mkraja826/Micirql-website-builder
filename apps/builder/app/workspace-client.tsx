"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
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
import { SectionControls } from "./section-controls";
import { SectionContentEditor } from "./section-content-editor";
import { FooterEditor } from "./footer-editor";
import { ThemeStudio } from "./theme-studio";
import { IndustryDesignPresets } from "./industry-design-presets";
import { AssetPicker } from "./asset-picker";
import { PagesManager } from "./pages-manager";
import { FunctionsManager } from "./functions-manager";
import { PublishReadinessManager, publishReadiness } from "./publish-readiness";
import { PublishController } from "./publish-controller";
import { resolveCertifiedIndustryPackRuntimeForSite } from "./industry-packs";
import { ProductBrand } from "./product-brand";

type Mode =
  "content" | "images" | "design" | "pages" | "seo" | "functions" | "domain";
type SaveState =
  "loading" | "saved" | "unsaved" | "saving" | "conflict" | "error";

const EDITOR_MODES: ReadonlyArray<{
  id: Mode;
  label: string;
  shortLabel: string;
}> = [
  { id: "content", label: "Content", shortLabel: "Content" },
  { id: "images", label: "Images", shortLabel: "Images" },
  { id: "design", label: "Design", shortLabel: "Design" },
  { id: "pages", label: "Pages", shortLabel: "Pages" },
  { id: "seo", label: "Search & SEO", shortLabel: "SEO" },
  { id: "functions", label: "Functions", shortLabel: "Functions" },
  { id: "domain", label: "Domain & publish", shortLabel: "Domain" },
];

const PRIMARY_MOBILE_MODES = EDITOR_MODES.slice(0, 3);
const MORE_MOBILE_MODES = EDITOR_MODES.slice(3);
type DraftApiRecord = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};
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
        border: "#dddde3",
        success: "#168a4a",
        warning: "#ad6a00",
        error: "#c93636",
      },
      typography: { display: "Arial", body: "Arial", ui: "Arial" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle",
    },
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
    blog: false,
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
            body: "Select any section to edit its content, images, design and actions without touching code.",
          },
          bindings: {},
          hidden: false,
        },
        {
          id: "features-1",
          component: { componentId: "features.placeholder", version: "1.0.0" },
          props: {
            heading: "Everything stays editable",
            body: "The live draft is a validated Site Schema. Changes update the preview immediately and remain safe to publish.",
            items: [
              {
                title: "Mobile first",
                description: "Every layout begins with the smallest screen.",
              },
              {
                title: "Fast by default",
                description:
                  "Approved components stay within the MiCirql performance protocol.",
              },
              {
                title: "Fully editable",
                description:
                  "Content, assets, design and functionality remain workspace-controlled.",
              },
            ],
          },
          bindings: {},
          hidden: false,
        },
      ],
      seo: {
        title: "Your website",
        description: "A website created with MiCirql.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: [],
      },
    },
  ],
  navigation: [{ label: "Home", href: "/" }],
  integrations: [],
  domains: [],
};

export default function WorkspaceClient({
  workspaceId = initialSite.workspaceId,
  siteId = initialSite.siteId,
  accessToken,
}: {
  workspaceId?: string;
  siteId?: string;
  accessToken?: string;
}) {
  const [history, setHistory] = useState<EditorHistory>(() =>
    createEditorHistory(
      createEditorState({ ...initialSite, workspaceId, siteId }),
    ),
  );
  const [mode, setMode] = useState<Mode>("content");
  const [imagePropPath, setImagePropPath] = useState("image");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [persistedRevision, setPersistedRevision] = useState(0);
  const [conflictDraft, setConflictDraft] = useState<DraftApiRecord>();
  const [compactShell, setCompactShell] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const loaded = useRef(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const mobileMoreButtonRef = useRef<HTMLButtonElement>(null);
  const mobileModeButtonRefs = useRef<
    Partial<Record<Mode, HTMLButtonElement | null>>
  >({});
  const state = history.present;
  const selection = state.selected;
  const selectedPageId =
    selection.kind === "page" || selection.kind === "section"
      ? selection.pageId
      : undefined;
  const selectedSectionId =
    selection.kind === "section" ? selection.sectionId : undefined;
  const activePage = useMemo(
    () =>
      selectedPageId
        ? (state.site.pages.find((p) => p.id === selectedPageId) ??
          state.site.pages[0]!)
        : state.site.pages[0]!,
    [state.site.pages, selectedPageId],
  );
  const activeSection = selectedSectionId
    ? activePage.sections.find((s) => s.id === selectedSectionId)
    : undefined;
  const activeSectionFamily = activeSection
    ? sectionFamilyFromComponentId(activeSection.component.componentId)
    : undefined;
  const readiness = publishReadiness(state.site);
  const selectedImage = activeSection
    ? valueAtPath(activeSection.props, imagePropPath)
    : undefined;
  const currentAssetId =
    selectedImage &&
    typeof selectedImage === "object" &&
    !Array.isArray(selectedImage)
      ? String((selectedImage as Record<string, unknown>).assetId ?? "") ||
        undefined
      : undefined;
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1179px)");
    const update = () => setCompactShell(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!compactShell || !mobilePanelOpen) return;
    const frame = window.requestAnimationFrame(() => {
      inspectorRef.current?.focus();
      if (mode === "content" && selectedSectionId) {
        inspectorRef.current?.scrollTo({ top: 0 });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compactShell, mobilePanelOpen, mode, selectedSectionId]);
  useEffect(() => {
    if (
      !compactShell ||
      (!mobilePanelOpen && !mobileMoreOpen && !commandMenuOpen)
    )
      return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (commandMenuOpen) {
        setCommandMenuOpen(false);
        return;
      }
      if (mobileMoreOpen) {
        setMobileMoreOpen(false);
        mobileMoreButtonRef.current?.focus();
        return;
      }
      closeMobilePanel();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [compactShell, mobilePanelOpen, mobileMoreOpen, commandMenuOpen, mode]);
  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    (async () => {
      try {
        const q = new URLSearchParams({ workspaceId, siteId });
        const r = await fetch(`/api/drafts?${q}`, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
          cache: "no-store",
        });
        if (cancelled) return;
        if (r.status === 404) {
          setSaveState("saved");
          loaded.current = true;
          return;
        }
        if (!r.ok) throw new Error(`Draft load failed (${r.status}).`);
        const p = (await r.json()) as { draft: DraftApiRecord };
        const site = siteSchema.parse(p.draft.snapshot);
        const editor = createEditorState(site);
        editor.revision = p.draft.revision;
        setHistory(createEditorHistory(editor));
        setPersistedRevision(p.draft.revision);
        setSaveState("saved");
        loaded.current = true;
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setSaveState("error");
          loaded.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, siteId, accessToken]);
  useEffect(() => {
    if (
      !loaded.current ||
      !state.dirty ||
      saveState === "saving" ||
      saveState === "conflict"
    )
      return;
    const t = window.setTimeout(
      () => void persist(state.site, state.revision),
      700,
    );
    return () => window.clearTimeout(t);
  }, [state.site, state.revision, state.dirty, persistedRevision, saveState]);
  function commit(command: Parameters<typeof executeEditorCommand>[1]) {
    try {
      setHistory((c) => executeEditorCommand(c, command));
      setSaveState("unsaved");
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "This change is not allowed.",
      );
    }
  }
  function selectPage(pageId: string) {
    setImagePropPath("image");
    setHistory((c) => ({
      ...c,
      present: setEditorSelection(c.present, { kind: "page", pageId }),
    }));
  }
  function selectSection(pageId: string, sectionId: string) {
    setImagePropPath("image");
    setHistory((c) => ({
      ...c,
      present: setEditorSelection(c.present, {
        kind: "section",
        pageId,
        sectionId,
      }),
    }));
    setMode("content");
    setMobileMoreOpen(false);
    setMobilePanelOpen(true);
  }
  function setViewport(viewport: EditorViewport) {
    setHistory((c) => ({
      ...c,
      present: setEditorViewport(c.present, viewport),
    }));
  }
  async function persist(
    snapshot: Site,
    sentEditorRevision: number,
  ): Promise<boolean> {
    if (saveState === "conflict") return false;
    if (saveState === "saving") return false;
    setSaveState("saving");
    try {
      const r = await fetch("/api/drafts", {
        method: "PUT",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          snapshot,
          expectedRevision: persistedRevision,
          updatedBy: "workspace-user",
        }),
      });
      const p = (await r.json()) as { draft?: DraftApiRecord; error?: string };
      if (r.status === 409) {
        setConflictDraft(p.draft);
        setSaveState("conflict");
        return false;
      }
      if (!r.ok || !p.draft)
        throw new Error(p.error ?? `Draft save failed (${r.status}).`);
      setPersistedRevision(p.draft.revision);
      setHistory((c) => ({
        ...c,
        present:
          c.present.revision === sentEditorRevision
            ? markEditorSaved(c.present)
            : c.present,
      }));
      setSaveState((c) => (c === "conflict" ? c : "saved"));
      return true;
    } catch (e) {
      console.error(e);
      setSaveState("error");
      return false;
    }
  }
  async function ensureSaved() {
    if (!state.dirty && saveState === "saved") return true;
    return persist(state.site, state.revision);
  }
  function loadServerVersion() {
    if (!conflictDraft) return;
    const site = siteSchema.parse(conflictDraft.snapshot);
    const editor = createEditorState(site);
    editor.revision = conflictDraft.revision;
    setHistory(createEditorHistory(editor));
    setPersistedRevision(conflictDraft.revision);
    setConflictDraft(undefined);
    setSaveState("saved");
  }
  function openMobileMode(nextMode: Mode) {
    setMode(nextMode);
    setMobileMoreOpen(false);
    setMobilePanelOpen(true);
  }
  function closeMobilePanel() {
    setMobilePanelOpen(false);
    const target = PRIMARY_MOBILE_MODES.some(({ id }) => id === mode)
      ? mobileModeButtonRefs.current[mode]
      : mobileMoreButtonRef.current;
    window.requestAnimationFrame(() => target?.focus());
  }
  const saveStatus = saveStateDetails(saveState);
  const activeMode = EDITOR_MODES.find(({ id }) => id === mode)!;
  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <ProductBrand className="editor-product-brand" label="Builder" />
          <span title={state.site.name}>{state.site.name}</span>
        </div>
        <nav className="page-switcher" aria-label="Website pages">
          {state.site.pages.map((p) => (
            <button
              type="button"
              key={p.id}
              className={p.id === activePage.id ? "is-active" : ""}
              onClick={() => selectPage(p.id)}
              aria-current={p.id === activePage.id ? "page" : undefined}
            >
              {p.name}
            </button>
          ))}
        </nav>
        <div className="workspace-header-meta">
          <span
            className={`save-state ${saveState}`}
            role="status"
            aria-live="polite"
            title={saveStatus.detail}
          >
            <span className="save-state-dot" aria-hidden="true" />
            {saveStatus.label}
          </span>
          <div className="workspace-actions workspace-actions-desktop">
            <EditorCommandButtons
              history={history}
              saveState={saveState}
              site={state.site}
              publishReady={readiness.ready}
              onUndo={() => {
                setHistory((current) => undoEditor(current));
                setSaveState("unsaved");
              }}
              onRedo={() => {
                setHistory((current) => redoEditor(current));
                setSaveState("unsaved");
              }}
              onSave={() => void persist(state.site, state.revision)}
              ensureSaved={ensureSaved}
            />
          </div>
          <div className="workspace-actions-mobile">
            <button
              className="workspace-command-toggle"
              type="button"
              aria-expanded={commandMenuOpen}
              aria-controls="workspace-command-menu"
              onClick={() => setCommandMenuOpen((current) => !current)}
            >
              Actions <span aria-hidden="true">⌄</span>
            </button>
            <div
              id="workspace-command-menu"
              className={`workspace-command-menu${commandMenuOpen ? " is-open" : ""}`}
            >
              <EditorCommandButtons
                history={history}
                saveState={saveState}
                site={state.site}
                publishReady={readiness.ready}
                onUndo={() => {
                  setHistory((current) => undoEditor(current));
                  setSaveState("unsaved");
                }}
                onRedo={() => {
                  setHistory((current) => redoEditor(current));
                  setSaveState("unsaved");
                }}
                onSave={() => void persist(state.site, state.revision)}
                ensureSaved={ensureSaved}
              />
            </div>
          </div>
        </div>
      </header>
      {saveState === "conflict" ? (
        <section className="draft-conflict" role="alert">
          <div>
            <strong>A newer saved version is available.</strong>
            <span>
              Your edits are still here. Load the latest version when you are
              ready to replace them.
            </span>
          </div>
          <button type="button" onClick={loadServerVersion}>
            Load latest version
          </button>
        </section>
      ) : null}
      <aside className="workspace-rail">
        <div className="workspace-rail-heading">
          <strong>Edit website</strong>
          <span>Choose what to edit</span>
        </div>
        {EDITOR_MODES.map((item) => (
          <button
            type="button"
            key={item.id}
            className={mode === item.id ? "is-active" : ""}
            onClick={() => setMode(item.id)}
            aria-pressed={mode === item.id}
          >
            {item.label}
          </button>
        ))}
      </aside>
      <section className="workspace-canvas">
        <div className="workspace-contextbar">
          <label className="mobile-page-picker">
            <span>Page</span>
            <select
              aria-label="Current website page"
              value={activePage.id}
              onChange={(event) => selectPage(event.target.value)}
            >
              {state.site.pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </label>
          <div
            className="viewport-switcher"
            role="group"
            aria-label="Preview size"
          >
            {(["mobile", "tablet", "desktop"] as EditorViewport[]).map((v) => (
              <button
                type="button"
                key={v}
                className={state.viewport === v ? "is-active" : ""}
                onClick={() => setViewport(v)}
                aria-pressed={state.viewport === v}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {saveState === "loading" ? (
          <div className="renderer-preview-state" role="status">
            Loading the selected website…
          </div>
        ) : (
          <RendererPreview
            site={state.site}
            path={activePage.path}
            viewport={state.viewport}
            {...(activeSection ? { selectedSectionId: activeSection.id } : {})}
            onSelectSection={(id) => selectSection(activePage.id, id)}
            onInlineTextChange={(sectionId, propPath, value) =>
              commit({
                type: "content.set",
                pageId: activePage.id,
                sectionId,
                propPath,
                value,
              })
            }
            onRequestImageChange={(sectionId, propPath) => {
              selectSection(activePage.id, sectionId);
              setImagePropPath(propPath);
              setMode("images");
              setMobilePanelOpen(true);
            }}
            onReorderSection={(sectionId, toIndex) =>
              commit({
                type: "section.reorder",
                pageId: activePage.id,
                sectionId,
                toIndex,
              })
            }
          />
        )}
      </section>
      <aside
        ref={inspectorRef}
        className={`workspace-inspector${mobilePanelOpen ? " is-mobile-open" : ""}`}
        aria-label={`${activeMode.label} editor`}
        tabIndex={-1}
      >
        <div className="inspector-mobile-heading">
          <div>
            <span>Editing</span>
            <strong>{activeMode.label}</strong>
          </div>
          <button
            type="button"
            aria-label="Close editor panel"
            onClick={closeMobilePanel}
          >
            Done
          </button>
        </div>
        <div className="inspector-heading">
          <span>{activeMode.label}</span>
          <strong>
            {activeSectionFamily
              ? sectionFamilyLabel(activeSectionFamily)
              : activePage.name}
          </strong>
        </div>
        {mode === "content" ? (
          <>
            {activeSection && activeSectionFamily ? (
              activeSectionFamily === "footer" ? (
                <FooterEditor
                  section={activeSection}
                  onTextChange={(propPath, value) =>
                    commit({
                      type: "content.set",
                      pageId: activePage.id,
                      sectionId: activeSection.id,
                      propPath,
                      value,
                    })
                  }
                  onLinksChange={(value) =>
                    commit({
                      type: "content.collection.set",
                      pageId: activePage.id,
                      sectionId: activeSection.id,
                      propPath: "footerLinks",
                      value,
                    })
                  }
                />
              ) : (
                <SectionContentEditor
                  section={activeSection}
                  family={activeSectionFamily}
                  onTextChange={(propPath, value) =>
                    commit({
                      type: "content.set",
                      pageId: activePage.id,
                      sectionId: activeSection.id,
                      propPath,
                      value,
                    })
                  }
                  onItemsChange={(value) =>
                    commit({
                      type: "content.collection.set",
                      pageId: activePage.id,
                      sectionId: activeSection.id,
                      propPath: "items",
                      value,
                    })
                  }
                  onChooseImage={(propPath) => {
                    setImagePropPath(propPath);
                    setMode("images");
                    setMobilePanelOpen(true);
                  }}
                />
              )
            ) : (
              <div className="inspector-empty inspector-empty--section">
                <p>
                  Select a section below or directly in the preview to edit it.
                </p>
              </div>
            )}
            <SectionControls
              page={activePage}
              themeFamily={state.site.theme.family}
              siteName={state.site.name}
              navigation={state.site.navigation}
              {...(activeSection
                ? { selectedSectionId: activeSection.id }
                : {})}
              onSelect={(id) => selectSection(activePage.id, id)}
              onAdd={(section) => {
                commit({ type: "section.add", pageId: activePage.id, section });
                selectSection(activePage.id, section.id);
              }}
              onMove={(sectionId, toIndex) =>
                commit({
                  type: "section.reorder",
                  pageId: activePage.id,
                  sectionId,
                  toIndex,
                })
              }
              onToggleHidden={(sectionId, hidden) =>
                commit({
                  type: "section.hidden.set",
                  pageId: activePage.id,
                  sectionId,
                  hidden,
                })
              }
              onRemove={(sectionId) => {
                commit({
                  type: "section.remove",
                  pageId: activePage.id,
                  sectionId,
                });
                selectPage(activePage.id);
              }}
            />
          </>
        ) : mode === "images" && activeSection && activeSectionFamily ? (
          <AssetPicker
            workspaceId={state.site.workspaceId}
            siteId={state.site.siteId}
            pagePath={activePage.path}
            sectionId={activeSection.id}
            domain={state.site.domain}
            theme={state.site.theme.family}
            family={activeSectionFamily}
            {...(currentAssetId ? { currentAssetId } : {})}
            onSelect={(asset, o) =>
              commit({
                type: "asset.set",
                pageId: activePage.id,
                sectionId: activeSection.id,
                propPath: imagePropPath,
                asset: {
                  assetId: asset.id,
                  alt: o?.alt ?? asset.alt,
                  focalPoint: o?.focalPoint ?? asset.focalPoint,
                },
              })
            }
          />
        ) : mode === "pages" ? (
          <PagesManager
            site={state.site}
            themeFamily={state.site.theme.family}
            activePageId={activePage.id}
            onSelect={selectPage}
            onAdd={(p) => {
              commit({ type: "page.add", page: p });
              selectPage(p.id);
            }}
            onPopulate={(pageId, sections) =>
              sections.forEach((section) =>
                commit({ type: "section.add", pageId, section }),
              )
            }
            onRemove={(id) => {
              commit({ type: "page.remove", pageId: id });
              if (id === activePage.id) selectPage(state.site.pages[0]!.id);
            }}
            onDuplicate={(p) => {
              commit({ type: "page.add", page: p });
              selectPage(p.id);
            }}
            onPathChange={(id, path) =>
              commit({ type: "page.path.set", pageId: id, path })
            }
            onReorder={(id, toIndex) =>
              commit({ type: "page.reorder", pageId: id, toIndex })
            }
          />
        ) : mode === "functions" && activeSection ? (
          <FunctionsManager
            site={state.site}
            section={activeSection}
            onBind={(bindingKey, actionId) =>
              commit({
                type: "binding.set",
                pageId: activePage.id,
                sectionId: activeSection.id,
                bindingKey,
                actionId,
              })
            }
            onRemove={(bindingKey) =>
              commit({
                type: "binding.remove",
                pageId: activePage.id,
                sectionId: activeSection.id,
                bindingKey,
              })
            }
          />
        ) : mode === "domain" ? (
          <PublishReadinessManager site={state.site} />
        ) : mode === "seo" ? (
          <div className="seo-quality-stack">
            <section
              className="seo-editor-card"
              aria-label="Page search settings"
            >
              <div className="seo-editor-heading">
                <span>Page search settings</span>
                <p>
                  Shape how this page is described to people and search engines.
                  The preview updates as you type.
                </p>
              </div>
              <div className="inspector-form seo-editor-fields">
                <label>
                  <span className="seo-field-label">
                    SEO title
                    <small aria-live="polite">
                      {activePage.seo.title.length}/70
                    </small>
                  </span>
                  <input
                    aria-label="SEO title"
                    maxLength={70}
                    value={activePage.seo.title}
                    onChange={(e) =>
                      commit({
                        type: "page.seo.patch",
                        pageId: activePage.id,
                        patch: { title: e.target.value },
                      })
                    }
                  />
                  <small className="seo-field-hint">
                    Keep the business and page purpose clear. Aim for 50–60
                    characters.
                  </small>
                </label>
                <label>
                  <span className="seo-field-label">
                    Search description
                    <small aria-live="polite">
                      {activePage.seo.description.length}/180
                    </small>
                  </span>
                  <textarea
                    aria-label="Search description"
                    maxLength={180}
                    value={activePage.seo.description}
                    onChange={(e) =>
                      commit({
                        type: "page.seo.patch",
                        pageId: activePage.id,
                        patch: { description: e.target.value },
                      })
                    }
                  />
                  <small className="seo-field-hint">
                    Summarise the page benefit in plain language. Aim for
                    140–160 characters.
                  </small>
                </label>
                <label>
                  Page path
                  <input
                    aria-label="Page path"
                    inputMode="url"
                    value={activePage.path}
                    onChange={(event) =>
                      commit({
                        type: "page.path.set",
                        pageId: activePage.id,
                        path: normalizeSeoPath(event.target.value),
                      })
                    }
                  />
                  <small className="seo-field-hint">
                    This also keeps the canonical path and navigation links in
                    sync.
                  </small>
                </label>
                <label>
                  Primary keyword <span className="seo-optional">Optional</span>
                  <input
                    aria-label="Primary keyword"
                    maxLength={80}
                    placeholder="e.g. dental implants Hyderabad"
                    value={activePage.seo.primaryKeyword ?? ""}
                    onChange={(event) =>
                      commit({
                        type: "page.seo.patch",
                        pageId: activePage.id,
                        patch: { primaryKeyword: event.target.value },
                      })
                    }
                  />
                </label>
                <label className="seo-index-control">
                  <input
                    aria-label="Allow search engines to index this page"
                    type="checkbox"
                    checked={activePage.seo.indexable}
                    onChange={(event) =>
                      commit({
                        type: "page.seo.patch",
                        pageId: activePage.id,
                        patch: { indexable: event.target.checked },
                      })
                    }
                  />
                  <span>
                    <b>Allow search engines to index this page</b>
                    <small>
                      Turn this off for private, temporary, or duplicate pages.
                    </small>
                  </span>
                </label>
              </div>
            </section>
            <section
              className="seo-search-preview"
              aria-label="Search result preview"
            >
              <div className="seo-search-preview-heading">
                <span>Search preview</span>
                <small>Approximate appearance</small>
              </div>
              <div className="seo-search-result">
                <span className="seo-search-url">
                  your-domain.com
                  {activePage.path === "/" ? "" : activePage.path}
                </span>
                <h3>{activePage.seo.title || activePage.name}</h3>
                <p>
                  {activePage.seo.description ||
                    "Add a helpful search description for this page."}
                </p>
              </div>
              {!activePage.seo.indexable ? (
                <p className="seo-index-warning">
                  This page is currently excluded from search indexing.
                </p>
              ) : null}
            </section>
            <section className="editor-tools-panel" aria-label="MiCirql Tools">
              <div className="editor-tools-heading">
                <span>MiCirql Tools · Beta</span>
                <h3>Audit a published website with evidence.</h3>
                <p>
                  Open a focused inspector in a new tab, then provide its public
                  URL. Tools cannot access or change this unpublished draft.
                </p>
              </div>
              <div className="editor-tool-links">
                <a
                  href="https://tools.micirql.com/tools/seo/"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    SEO HTML Inspector <b>Beta</b>
                  </span>
                  <small>
                    Metadata, headings, canonical and indexing signals · opens
                    in a new tab
                  </small>
                </a>
                <a
                  href="https://tools.micirql.com/tools/qa/"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    QA Testing Lab <b>Beta</b>
                  </span>
                  <small>
                    Forms, links, navigation and key user journeys · opens in a
                    new tab
                  </small>
                </a>
                <a
                  href="https://tools.micirql.com/tools/ui-ux/"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    UI/UX Inspector <b>Beta</b>
                  </span>
                  <small>
                    Typography, spacing, contrast and hierarchy · opens in a new
                    tab
                  </small>
                </a>
              </div>
              <a
                aria-label="View Tools workspace and roadmap (opens in a new tab)"
                className="editor-tools-home"
                href="https://tools.micirql.com/tools/"
                rel="noreferrer"
                target="_blank"
              >
                View Tools workspace and roadmap{" "}
                <span aria-hidden="true">↗</span>
              </a>
            </section>
          </div>
        ) : mode === "design" ? (
          <div className="inspector-form">
            <IndustryDesignPresets
              site={state.site}
              onApply={(preset) => {
                const industryRuntime =
                  resolveCertifiedIndustryPackRuntimeForSite({
                    domain: state.site.domain,
                    subtype: state.site.subtype ?? null,
                  });
                if (!industryRuntime)
                  throw new Error("This industry pack is not certified.");
                const next = industryRuntime.applyCandidate(
                  state.site,
                  preset.id,
                );
                if (next.generation)
                  next.generation.selectedCandidateId = preset.id;
                commit({ type: "design.preset.apply", site: next });
              }}
            />
            <ThemeStudio
              theme={state.site.theme}
              onChange={(theme) => commit({ type: "theme.set", theme })}
            />
            {activeSection && activeSectionFamily ? (
              <SectionDesignSwitcher
                family={activeSectionFamily}
                theme={state.site.theme.family}
                currentComponentId={activeSection.component.componentId}
                onSelect={(componentId, version) =>
                  commit({
                    type: "section.component.set",
                    pageId: activePage.id,
                    sectionId: activeSection.id,
                    componentId,
                    version,
                  })
                }
              />
            ) : null}
          </div>
        ) : (
          <div className="inspector-empty">
            <p>Select a section to configure this area.</p>
          </div>
        )}
      </aside>
      {mobileMoreOpen ? (
        <div
          id="mobile-more-tools"
          className="mobile-more-menu"
          role="menu"
          aria-label="More editor tools"
        >
          <span>More tools</span>
          {MORE_MOBILE_MODES.map((item) => (
            <button
              type="button"
              role="menuitem"
              key={item.id}
              onClick={() => openMobileMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <nav className="mobile-editor-bar" aria-label="Editor tools">
        <button
          type="button"
          className={!mobilePanelOpen ? "is-active" : ""}
          aria-pressed={!mobilePanelOpen}
          onClick={() => {
            setMobileMoreOpen(false);
            setMobilePanelOpen(false);
          }}
        >
          <span className="mobile-nav-icon" aria-hidden="true">
            ▣
          </span>
          Preview
        </button>
        {PRIMARY_MOBILE_MODES.map((item) => (
          <button
            type="button"
            key={item.id}
            ref={(element) => {
              mobileModeButtonRefs.current[item.id] = element;
            }}
            className={mobilePanelOpen && mode === item.id ? "is-active" : ""}
            aria-pressed={mobilePanelOpen && mode === item.id}
            onClick={() => openMobileMode(item.id)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {item.id === "content" ? "T" : item.id === "images" ? "◇" : "✦"}
            </span>
            {item.shortLabel}
          </button>
        ))}
        <button
          ref={mobileMoreButtonRef}
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="mobile-more-tools"
          className={mobileMoreOpen ? "is-active" : ""}
          onClick={() => {
            setMobilePanelOpen(false);
            setMobileMoreOpen((current) => !current);
          }}
        >
          <span className="mobile-nav-icon" aria-hidden="true">
            •••
          </span>
          More
        </button>
      </nav>
    </main>
  );
}
function sectionFamilyFromComponentId(
  componentId: string,
): SectionFamily | undefined {
  const n = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (f) => n === `${f}.placeholder` || n.startsWith(`${f}.`),
  );
  if (legacy) return legacy;
  const u = componentId.toUpperCase();
  return SECTION_FAMILIES.find((f) => u.includes(`-${FAMILY_CODES[f]}-`));
}
function sectionFamilyLabel(family: SectionFamily): string {
  if (family === "cta") return "Call to action";
  return family
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    if (current && typeof current === "object")
      return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}
function normalizeSeoPath(value: string) {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/_-]/g, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
function saveStateDetails(state: SaveState) {
  if (state === "loading")
    return { label: "Loading", detail: "Opening the selected website" };
  if (state === "saving")
    return { label: "Saving", detail: "Saving your latest changes" };
  if (state === "unsaved")
    return {
      label: "Not saved",
      detail: "Your latest changes are not saved yet",
    };
  if (state === "conflict")
    return {
      label: "Save conflict",
      detail: "A newer saved version is available",
    };
  if (state === "error")
    return {
      label: "Save failed",
      detail: "The latest changes could not be saved",
    };
  return { label: "Saved", detail: "All changes are saved" };
}

function EditorCommandButtons({
  history,
  saveState,
  site,
  publishReady,
  onUndo,
  onRedo,
  onSave,
  ensureSaved,
}: {
  history: EditorHistory;
  saveState: SaveState;
  site: Site;
  publishReady: boolean;
  onUndo(): void;
  onRedo(): void;
  onSave(): void;
  ensureSaved(): Promise<boolean>;
}) {
  return (
    <>
      <button type="button" onClick={onUndo} disabled={!history.past.length}>
        Undo
      </button>
      <button type="button" onClick={onRedo} disabled={!history.future.length}>
        Redo
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveState === "saving" || saveState === "loading"}
      >
        Save now
      </button>
      <PublishController
        site={site}
        disabled={
          !publishReady || saveState === "loading" || saveState === "conflict"
        }
        ensureSaved={ensureSaved}
      />
    </>
  );
}
