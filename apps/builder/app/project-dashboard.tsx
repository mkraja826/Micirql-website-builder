"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { OnboardingGate } from "./onboarding-gate";
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
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  async function load() {
    setLoading(true);
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
      setLoading(false);
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
    setNameDialog({ mode: "create" });
  }

  function requestRename(project: Project) {
    rememberDialogTrigger();
    setArchiveTarget(null);
    setNameValue(project.name);
    setNameError("");
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
      else setNameDialog(null);
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
      setError(payload.error ?? "Duplicate failed.");
      return;
    }
    await load();
  }

  async function confirmArchive() {
    if (!archiveTarget || archivePending) return;
    setArchivePending(true);
    setArchiveError("");
    const mutationError = await mutate({
      siteId: archiveTarget.id,
      archived: true,
    });
    setArchivePending(false);
    if (mutationError) setArchiveError(mutationError);
    else setArchiveTarget(null);
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
      await load();
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
        <header className={styles.header}>
          <div>
            <span>MiCirql</span>
            <h1>Your websites</h1>
            <p>Create, manage and publish every site from one workspace.</p>
          </div>
          <button onClick={requestCreate} ref={createButtonRef}>
            + New website
          </button>
        </header>

        {error ? <div className={styles.error}>{error}</div> : null}

        {loading ? (
          <div className={styles.empty}>Loading projects…</div>
        ) : projects.length ? (
          <section className={styles.grid}>
            {projects.map((project) => (
              <article className={styles.card} key={project.id}>
                <div className={styles.preview}>
                  <span>{project.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <div className={styles.body}>
                  <div className={styles.top}>
                    <h2>{project.name}</h2>
                    <span
                      className={
                        project.published_version_id
                          ? styles.live
                          : styles.draft
                      }
                    >
                      {project.published_version_id ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p>
                    {project.hostname?.hostname ?? "No custom domain"}
                    {project.hostname ? ` · ${project.hostname.status}` : ""}
                  </p>
                  <small>
                    Updated {new Date(project.updated_at).toLocaleDateString()}{" "}
                    · rev {project.draft?.revision ?? 0}
                  </small>
                  <div className={styles.actions}>
                    <button onClick={() => setOpen(project)}>
                      Open editor
                    </button>
                    <button onClick={() => requestRename(project)}>
                      Rename
                    </button>
                    <button onClick={() => void duplicate(project)}>
                      Duplicate
                    </button>
                    <button onClick={() => requestArchive(project)}>
                      Archive
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className={styles.empty}>
            <h2>No websites yet</h2>
            <p>
              Create your first website to start the business discovery flow.
            </p>
            <button onClick={requestCreate}>Create website</button>
          </div>
        )}
      </main>

      {nameDialog ? (
        <div
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
              <button disabled={namePending} type="submit">
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
