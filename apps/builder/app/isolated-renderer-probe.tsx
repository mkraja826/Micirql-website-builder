"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Site } from "@micirql/schema";
import { RendererPreview } from "./renderer-preview";

export type IsolatedRendererProbeHandle = {
  getDocumentRoot(): HTMLElement | null;
};

type ProbeViewport = "mobile" | "tablet" | "desktop";

const FRAME_DOCUMENT = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="mi-isolated-renderer-root"></div></body></html>`;

/**
 * Runs RendererPreview inside a real nested browsing context. A wide div inside
 * a phone browser is not a desktop viewport: media queries and vw/vh still use
 * the phone window. The iframe gives rendered QA a truthful viewport while
 * keeping the probe off-screen and same-origin.
 */
export const IsolatedRendererProbe = forwardRef<IsolatedRendererProbeHandle, {
  site: Site;
  path: string;
  viewport: ProbeViewport;
  width: number;
  height: number;
  onReadyChange?(ready: boolean): void;
}>(function IsolatedRendererProbe({ site, path, viewport, width, height, onReadyChange }, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useImperativeHandle(ref, () => ({
    getDocumentRoot() {
      return frameRef.current?.contentDocument?.querySelector<HTMLElement>(".renderer-preview-document") ?? null;
    },
  }), []);

  useEffect(() => {
    onReadyChange?.(Boolean(mountNode));
  }, [mountNode, onReadyChange]);

  async function prepareFrame() {
    const frame = frameRef.current;
    const frameDocument = frame?.contentDocument;
    if (!frameDocument) return;

    setMountNode(null);
    onReadyChange?.(false);
    await copyParentStyles(frameDocument);

    const root = frameDocument.getElementById("mi-isolated-renderer-root");
    if (!root) return;
    root.style.width = "100%";
    root.style.minWidth = "0";
    root.style.margin = "0";
    setMountNode(root);
  }

  return <>
    <iframe
      ref={frameRef}
      title="MiCirql isolated rendered certification viewport"
      aria-hidden="true"
      tabIndex={-1}
      srcDoc={FRAME_DOCUMENT}
      onLoad={() => { void prepareFrame(); }}
      data-mi-isolated-renderer-probe
      style={{
        position: "fixed",
        left: "-20000px",
        top: 0,
        width,
        height,
        border: 0,
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
    {mountNode ? createPortal(
      <RendererPreview
        site={site}
        path={path}
        viewport={viewport}
        onSelectSection={() => {}}
      />,
      mountNode,
    ) : null}
  </>;
});

async function copyParentStyles(targetDocument: Document) {
  const head = targetDocument.head;
  const inherited = [...document.head.querySelectorAll<HTMLStyleElement | HTMLLinkElement>("style,link[rel='stylesheet']")];
  const pending: Promise<void>[] = [];

  const base = targetDocument.createElement("base");
  base.href = window.location.href;
  head.appendChild(base);

  for (const source of inherited) {
    if (source instanceof HTMLStyleElement) {
      const style = targetDocument.createElement("style");
      for (const attribute of [...source.attributes]) style.setAttribute(attribute.name, attribute.value);
      style.textContent = source.textContent;
      head.appendChild(style);
      continue;
    }

    const link = targetDocument.createElement("link");
    link.rel = "stylesheet";
    link.href = source.href;
    if (source.media) link.media = source.media;
    if (source.crossOrigin) link.crossOrigin = source.crossOrigin;
    if (source.referrerPolicy) link.referrerPolicy = source.referrerPolicy;
    pending.push(new Promise((resolve) => {
      const settle = () => resolve();
      link.addEventListener("load", settle, { once: true });
      link.addEventListener("error", settle, { once: true });
    }));
    head.appendChild(link);
  }

  const reset = targetDocument.createElement("style");
  reset.textContent = "html,body,#mi-isolated-renderer-root{margin:0;min-width:0;width:100%;}body{overflow-x:hidden;}";
  head.appendChild(reset);

  if (pending.length) {
    await Promise.race([
      Promise.all(pending).then(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
    ]);
  }
}
