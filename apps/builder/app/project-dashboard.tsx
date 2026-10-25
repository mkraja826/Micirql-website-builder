"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { OnboardingGate } from "./onboarding-gate";
import { ProductBrand } from "./product-brand";
import styles from "./project-dashboard.module.css";

type Project = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  published_version_id: string | null;
  updated_at: string;
  draft?: { revision: number; updated_at: string } | null;
  hostname?: { hostname: string; status: string; ssl_status: string } | null;
};

type NameDialog = { mode: "create" } | { mode: "rename"; project: Project };

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatProjectDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : dateFormatter.format(date);
}

function projectDomain(project: Project) {
  if (!project.hostname) return "Domain not connected";
  return project.hostname.status === "active"
    ? project.hostname.hostname
    : `${project.hostname.hostname} · setup pending`;
}

function projectInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");

  return initials.toLocaleUpperCase("en") || "M";
}

export function ProjectDashboard({ session }: { session: SupabaseSession }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Project | null>(null);
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [namePending, setNamePending] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [actionPending, setActionPending] = useState("");
  const [notice, setNotice] = useState("");
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  async function load(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load projects.");
      }
      setProjects(payload.projects ?? []);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load projects.",
      );
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!nameDialog) return;
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [nameDialog]);

  useEffect(() => {
    if (!nameDialog && !archiveTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [archiveTarget, nameDialog]);

  useEffect(() => {
    if (nameDialog || archiveTarget || open) return;
    const trigger = returnFocusRef.current;
    if (!trigger) return;
    if (trigger?.isConnected) trigger.focus();
    else createButtonRef.current?.focus();
    returnFocusRef.current = null;
  }, [archiveTarget, nameDialog, open]);

  function rememberDialogTrigger() {
    if (document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
  }

  function keepFocusInDialog(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])",
      ),
    );
    const first = controls.at(0);
    const last = controls.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function requestCreate() {
    rememberDialogTrigger();
    setArchiveTarget(null);
    setNameValue("Untitled website");
    setNameError("");
    setNotice("");
    setNameDialog({ mode: "create" });
  }

  function requestRename(project: Project) {
    rememberDialogTrigger();
    setArchiveTarget(null);
    setNameValue(project.name);
    setNameError("");
    setNotice("");
    setNameDialog({ mode: "rename", project });
  }

  function closeNameDialog() {
    if (!namePending) {
      setNameDialog(null);
      setNameError("");
    }
  }

  async function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameDialog || namePending) return;

    const name = nameValue.trim();
    if (!name) {
      setNameError("Enter a website name.");
      return;
    }

    if (nameDialog.mode === "rename" && name === nameDialog.project.name) {
      closeNameDialog();
      return;
    }

    setNamePending(true);
    setNameError("");
    try {
      if (nameDialog.mode === "create") {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "create", name }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.project) {
          throw new Error(payload.error ?? "Could not create site.");
        }
        setNameDialog(null);
        setOpen({
          ...payload.project,
          status: "draft",
          published_version_id: null,
          updated_at: new Date().toISOString(),
        });
        return;
      }

      const mutationError = await mutate({
        siteId: nameDialog.project.id,
        name,
      });
      if (mutationError) setNameError(mutationError);
      else {
        setNameDialog(null);
        setNotice(`Renamed website to ${name}.`);
      }
    } catch (submitError) {
      setNameError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update the website name.",
      );
    } finally {
      setNamePending(false);
    }
  }

  async function duplicate(project: Project) {
    const pendingKey = `duplicate:${project.id}`;
    if (actionPending) return;
    setActionPending(pendingKey);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          workspaceId: project.workspace_id,
          siteId: project.id,
          name: `${project.name} Copy`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not duplicate this website.");
      }
      await load({ silent: true });
      setNotice(`${project.name} was duplicated.`);
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Could not duplicate this website.",
      );
    } finally {
      setActionPending("");
    }
  }

  async function confirmArchive() {
    if (!archiveTarget || archivePending) return;
    const archivedName = archiveTarget.name;
    setArchivePending(true);
    setArchiveError("");
    const mutationError = await mutate({
      siteId: archiveTarget.id,
      archived: true,
    });
    setArchivePending(false);
    if (mutationError) setArchiveError(mutationError);
    else {
      setArchiveTarget(null);
      setNotice(`${archivedName} was archived.`);
    }
  }

  async function mutate(body: Record<string, unknown>) {
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        const message = payload.error ?? "Update failed.";
        setError(message);
        return message;
      }
      await load({ silent: true });
      return null;
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Update failed.";
      setError(message);
      return message;
    }
  }

  function requestArchive(project: Project) {
    rememberDialogTrigger();
    setNameDialog(null);
    setArchiveError("");
    setNotice("");
    setArchiveTarget(project);
  }

  if (open) {
    return (
      <OnboardingGate
        session={session}
        initialWorkspaceId={open.workspace_id}
        initialSiteId={open.id}
        onBack={() => {
          setOpen(null);
          void load();
        }}
      />
    );
  }

  return (
    <>
      <main
        aria-hidden={nameDialog || archiveTarget ? true : undefined}
        className={styles.shell}
        inert={nameDialog || archiveTarget ? true : undefined}
      >
        <div className={styles.frame}>
          <header className={styles.productHeader}>
            <ProductBrand />
            <span className={styles.productArea}>Project home</span>
          </header>

          <section className={styles.intro} aria-labelledby="dashboard-title">
            <div className={styles.introCopy}>
              <span className={styles.eyebrow}>Project dashboard</span>
              <h1 id="dashboard-title">Build and manage your websites.</h1>
              <p>
                Continue an existing project or start a new business website.
                Every project keeps its own brief, design direction and draft.
              </p>
            </div>
            <button
              className={styles.createButton}
              onClick={requestCreate}
              ref={createButtonRef}
              type="button"
            >
              <span aria-hidden="true">+</span> New website
            </button>
            <dl className={styles.summary} aria-label="Workspace summary">
              <div>
                <dt>Websites</dt>
                <dd>{loading ? "—" : projects.length}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>
                  {loading
                    ? "—"
                    : projects.filter((project) =>
                        Boolean(project.published_version_id),
                      ).length}
                </dd>
              </div>
              <div>
                <dt>In progress</dt>
                <dd>
                  {loading
                    ? "—"
                    : projects.filter(
                        (project) => !project.published_version_id,
                      ).length}
                </dd>
              </div>
            </dl>
          </section>

          <div className={styles.dashboardBody}>
            <div className={styles.announcements} aria-live="polite">
              {error ? (
                <div className={styles.error} role="alert">
                  <div>
                    <strong>We couldn’t update your projects.</strong>
                    <span>{error}</span>
                  </div>
                  <button onClick={() => void load()} type="button">
                    Try again
                  </button>
                </div>
              ) : null}
              {notice ? (
                <div className={styles.notice} role="status">
                  {notice}
                </div>
              ) : null}
            </div>

            {loading ? (
              <section
                aria-label="Loading websites"
                className={styles.loadingState}
                role="status"
              >
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionEyebrow}>
                      Your workspace
                    </span>
                    <h2>Loading websites…</h2>
                  </div>
                </div>
                <div className={styles.grid} aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <div className={styles.skeletonCard} key={item}>
                      <div className={styles.skeletonPreview} />
                      <div className={styles.skeletonLines}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : error && !projects.length ? (
              <section className={styles.loadFailure}>
                <div className={styles.stateMark} aria-hidden="true">
                  !
                </div>
                <span className={styles.sectionEyebrow}>
                  Projects unavailable
                </span>
                <h2>Your websites could not be loaded.</h2>
                <p>
                  Your projects are still safe. Check your connection and try
                  loading this workspace again.
                </p>
                <button onClick={() => void load()} type="button">
                  Reload projects
                </button>
              </section>
            ) : projects.length ? (
              <section aria-labelledby="project-list-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionEyebrow}>
                      Your workspace
                    </span>
                    <h2 id="project-list-title">All websites</h2>
                  </div>
                  <p>
                    {projects.length} active{" "}
                    {projects.length === 1 ? "project" : "projects"}
                  </p>
                </div>
                <div className={styles.grid}>
                  {projects.map((project) => {
                    const duplicatePending =
                      actionPending === `duplicate:${project.id}`;
                    const cardBusy = Boolean(actionPending);
                    const titleId = `project-${project.id}-title`;
                    const published = Boolean(project.published_version_id);
                    return (
                      <article
                        aria-labelledby={titleId}
                        className={styles.card}
                        key={project.id}
                      >
                        <div
                          aria-label={`${project.name} project facts`}
                          className={`${styles.projectCover} ${published ? styles.projectCoverPublished : styles.projectCoverDraft}`}
                          role="group"
                        >
                          <div className={styles.coverTopline}>
                            <span>MiCirql website project</span>
                          </div>
                          <div className={styles.coverIdentity}>
                            <span
                              aria-hidden="true"
                              className={styles.coverMonogram}
                            >
                              {projectInitials(project.name)}
                            </span>
                            <div>
                              <strong>{project.name}</strong>
                              <span>{projectDomain(project)}</span>
                            </div>
                          </div>
                          <div className={styles.coverFooter}>
                            <span>
                              {project.draft
                                ? `Saved draft · Revision ${project.draft.revision}`
                                : "No saved draft yet"}
                            </span>
                            <span className={styles.coverPreviewNote}>
                              Real preview in editor
                            </span>
                          </div>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardHeading}>
                            <div>
                              <span
                                className={
                                  published ? styles.live : styles.draft
                                }
                              >
                                {published ? "Published" : "Draft"}
                              </span>
                              <h3 id={titleId}>{project.name}</h3>
                            </div>
                          </div>
                          <p className={styles.domain}>
                            {projectDomain(project)}
                          </p>
                          <dl className={styles.projectMeta}>
                            <div>
                              <dt>Last edited</dt>
                              <dd>
                                <time dateTime={project.updated_at}>
                                  {formatProjectDate(project.updated_at)}
                                </time>
                              </dd>
                            </div>
                            <div>
                              <dt>Draft revision</dt>
                              <dd>{project.draft?.revision ?? 0}</dd>
                            </div>
                          </dl>
                          <div className={styles.actions}>
                            <button
                              aria-label={`Open ${project.name} in editor`}
                              className={styles.openButton}
                              disabled={cardBusy}
                              onClick={() => setOpen(project)}
                              type="button"
                            >
                              Open editor <span aria-hidden="true">→</span>
                            </button>
                            <div className={styles.secondaryActions}>
                              <button
                                aria-label={`Rename ${project.name}`}
                                disabled={cardBusy}
                                onClick={() => requestRename(project)}
                                type="button"
                              >
                                Rename
                              </button>
                              <button
                                aria-label={`Duplicate ${project.name}`}
                                disabled={cardBusy}
                                onClick={() => void duplicate(project)}
                                type="button"
                              >
                                {duplicatePending
                                  ? "Duplicating…"
                                  : "Duplicate"}
                              </button>
                              <button
                                aria-label={`Archive ${project.name}`}
                                disabled={cardBusy}
                                onClick={() => requestArchive(project)}
                                type="button"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className={styles.empty}>
                <div className={styles.emptyVisual} aria-hidden="true">
                  <div className={styles.emptyBrowserBar}>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className={styles.emptyCanvas}>
                    <span />
                    <strong />
                    <strong />
                    <i />
                  </div>
                </div>
                <div className={styles.emptyCopy}>
                  <span className={styles.sectionEyebrow}>Start here</span>
                  <h2>Create your first business website.</h2>
                  <p>
                    Begin with a focused business brief, compare certified
                    design directions and continue in the visual editor.
                  </p>
                  <button onClick={requestCreate} type="button">
                    Create your first website
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {nameDialog ? (
        <div
          aria-label="Website dialog"
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNameDialog();
          }}
        >
          <form
            aria-describedby="website-name-description"
            aria-labelledby="website-name-title"
            aria-modal="true"
            className={styles.modal}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeNameDialog();
              keepFocusInDialog(event);
            }}
            onSubmit={(event) => void submitName(event)}
            role="dialog"
          >
            <span className={styles.modalEyebrow}>
              {nameDialog.mode === "create"
                ? "New project"
                : "Project settings"}
            </span>
            <h2 id="website-name-title">
              {nameDialog.mode === "create"
                ? "Create a website"
                : "Rename website"}
            </h2>
            <p id="website-name-description">
              {nameDialog.mode === "create"
                ? "Give this project a clear name. You can change it later."
                : "Choose the name shown in your project dashboard."}
            </p>
            <label htmlFor="website-name">Website name</label>
            <input
              id="website-name"
              maxLength={120}
              onChange={(event) => {
                setNameValue(event.target.value);
                if (nameError) setNameError("");
              }}
              required
              ref={nameInputRef}
              value={nameValue}
            />
            {nameError ? (
              <div className={styles.modalError} role="alert">
                {nameError}
              </div>
            ) : null}
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                disabled={namePending}
                onClick={closeNameDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                disabled={namePending}
                type="submit"
              >
                {namePending
                  ? nameDialog.mode === "create"
                    ? "Creating…"
                    : "Saving…"
                  : nameDialog.mode === "create"
                    ? "Create website"
                    : "Save name"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {archiveTarget ? (
        <div
          aria-label="Archive confirmation"
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !archivePending) {
              setArchiveTarget(null);
            }
          }}
        >
          <section
            aria-describedby="archive-description"
            aria-labelledby="archive-title"
            aria-modal="true"
            className={styles.modal}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !archivePending) {
                setArchiveTarget(null);
              }
              keepFocusInDialog(event);
            }}
            role="dialog"
          >
            <span className={styles.modalEyebrow}>Project settings</span>
            <h2 id="archive-title">Archive {archiveTarget.name}?</h2>
            <p id="archive-description">
              This website will be removed from your active project list.
            </p>
            {archiveError ? (
              <div className={styles.modalError} role="alert">
                {archiveError}
              </div>
            ) : null}
            <div className={styles.modalActions}>
              <button
                autoFocus
                className={styles.secondaryButton}
                disabled={archivePending}
                onClick={() => setArchiveTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                disabled={archivePending}
                onClick={() => void confirmArchive()}
                type="button"
              >
                {archivePending ? "Archiving…" : "Archive website"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
