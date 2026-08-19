"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewDirection } from "./review-directions";
import { RendererPreview } from "./renderer-preview";
import { planRenderedFirstScreenRepair } from "./rendered-first-screen-repair";
import { persistFirstScreenRepair } from "./persisted-first-screen-repair";

const TARGETS = [
  { viewport: "mobile" as const, width: 390, foldHeight: 844 },
  { viewport: "desktop" as const, width: 1440, foldHeight: 900 },
];

type CertificationResult = {
  direction: ReviewDirection;
  passed: boolean;
  repaired: boolean;
  failures: string[];
};

export function DentalReviewRenderCertifier({
  directions,
  onComplete,
}: {
  directions: ReviewDirection[];
  onComplete(results: CertificationResult[]): void;
}) {
  const signature = useMemo(() => directions.map((item) => item.id).join("|"), [directions]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [working, setWorking] = useState<ReviewDirection>();
  const [attempt, setAttempt] = useState<0 | 1>(0);
  const [results, setResults] = useState<CertificationResult[]>([]);
  const probeRef = useRef<HTMLDivElement>(null);
  const completedSignature = useRef("");

  useEffect(() => {
    setCandidateIndex(0);
    setTargetIndex(0);
    setAttempt(0);
    setResults([]);
    setWorking(directions[0]);
    completedSignature.current = "";
  }, [signature]);

  useEffect(() => {
    if (!directions.length || candidateIndex >= directions.length) {
      if (directions.length && completedSignature.current !== signature) {
        completedSignature.current = signature;
        onComplete(results);
      }
      return;
    }
    if (!working) setWorking(directions[candidateIndex]);
  }, [candidateIndex, directions, onComplete, results, signature, working]);

  useEffect(() => {
    if (!working || candidateIndex >= directions.length) return;
    const timer = window.setTimeout(() => {
      const documentRoot = probeRef.current?.querySelector<HTMLElement>(".renderer-preview-document");
      if (!documentRoot) return;
      const target = TARGETS[targetIndex]!;
      const failures = measureFirstScreen(documentRoot, target.width, target.foldHeight);

      if (!failures.length) {
        if (targetIndex < TARGETS.length - 1) {
          setTargetIndex((value) => value + 1);
          setAttempt(0);
          return;
        }
        finishCandidate({ direction: working, passed: true, repaired: hasAnyRepair(working), failures: [] });
        return;
      }

      const plan = planRenderedFirstScreenRepair({ width: target.width, failures, attempt });
      if (attempt === 0 && plan.required) {
        setWorking((current) => current ? { ...current, site: persistFirstScreenRepair(current.site, plan) } : current);
        setAttempt(1);
        return;
      }

      finishCandidate({ direction: working, passed: false, repaired: hasAnyRepair(working), failures });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [attempt, candidateIndex, directions.length, targetIndex, working]);

  function finishCandidate(result: CertificationResult) {
    const nextResults = [...results, result];
    const nextIndex = candidateIndex + 1;
    setResults(nextResults);
    setCandidateIndex(nextIndex);
    setTargetIndex(0);
    setAttempt(0);
    setWorking(directions[nextIndex]);
    if (nextIndex >= directions.length && completedSignature.current !== signature) {
      completedSignature.current = signature;
      queueMicrotask(() => onComplete(nextResults));
    }
  }

  if (!working || candidateIndex >= directions.length) return null;
  const target = TARGETS[targetIndex]!;
  return <div
    ref={probeRef}
    aria-hidden="true"
    data-mi-dental-review-certifier
    style={{ position: "fixed", left: "-20000px", top: 0, width: target.width, maxWidth: target.width, visibility: "hidden", pointerEvents: "none" }}
  >
    <RendererPreview
      site={working.site}
      path={working.site.pages[0]?.path ?? "/"}
      viewport={target.viewport}
      onSelectSection={() => {}}
    />
  </div>;
}

function measureFirstScreen(root: HTMLElement, width: number, foldHeight: number): string[] {
  const rootRect = root.getBoundingClientRect();
  const visible = (node: Element) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") !== 0 && rect.width > 0 && rect.height > 0;
  };
  const relative = (node: Element | null) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top, height: rect.height };
  };
  const h1 = [...root.querySelectorAll("h1")].find(visible) ?? null;
  const hero = h1?.closest("section") ?? h1?.closest(".mi-editor-section") ?? null;
  const nav = [...root.querySelectorAll("header,nav")].find(visible) ?? null;
  const actions = hero ? [...hero.querySelectorAll("a,button")].filter((node) => {
    if (!visible(node)) return false;
    const label = `${node.textContent ?? ""} ${node.getAttribute("aria-label") ?? ""}`.trim().toLowerCase();
    return Boolean(label) && !/menu|navigation|close|previous|next/.test(label);
  }) : [];
  const cta = actions[0] ?? null;
  const h1Style = h1 ? getComputedStyle(h1) : null;
  const fontPx = h1Style ? Number.parseFloat(h1Style.fontSize) || 0 : 0;
  const parsedLineHeight = h1Style ? Number.parseFloat(h1Style.lineHeight) : Number.NaN;
  const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontPx * 1.2;
  const h1Rect = relative(h1);
  const navRect = relative(nav);
  const heroRect = relative(hero);
  const ctaRect = relative(cta);
  const lines = h1Rect && lineHeight > 0 ? Math.max(1, Math.round(h1Rect.height / lineHeight)) : 0;
  const mobile = width <= 430;
  const minH1 = mobile ? 28 : 40;
  const maxLines = mobile ? 4 : 3;
  const maxNav = mobile ? 96 : 116;
  const failures: string[] = [];

  if (!h1 || !h1Rect) failures.push("missing-visible-h1");
  else {
    if (fontPx < minH1) failures.push(`headline-too-small:${fontPx.toFixed(1)}px<${minH1}px`);
    if (lines > maxLines) failures.push(`headline-wraps-too-many-lines:${lines}>${maxLines}`);
    if (h1Rect.top > foldHeight * 0.62) failures.push(`headline-too-low:${Math.round(h1Rect.top)}px`);
  }
  if (navRect && navRect.height > maxNav) failures.push(`navbar-too-tall:${Math.round(navRect.height)}px>${maxNav}px`);
  if (!cta || !ctaRect) failures.push("missing-visible-hero-cta");
  else {
    if (ctaRect.top > foldHeight * 0.94) failures.push(`cta-below-conversion-fold:${Math.round(ctaRect.top)}px`);
    if (ctaRect.bottom > foldHeight * 1.04) failures.push(`cta-not-visible-in-first-screen:${Math.round(ctaRect.bottom)}px`);
  }
  if (heroRect && heroRect.top > Math.max(180, foldHeight * 0.24)) failures.push(`hero-starts-too-low:${Math.round(heroRect.top)}px`);
  if (navRect && h1Rect && h1Rect.top - navRect.bottom > (mobile ? 260 : 320)) failures.push(`excess-space-before-headline:${Math.round(h1Rect.top - navRect.bottom)}px`);
  return failures;
}

function hasAnyRepair(direction: ReviewDirection): boolean {
  const home = direction.site.pages.find((page) => page.path === "/") ?? direction.site.pages[0];
  const hero = home?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const value = hero?.props?.renderedFirstScreenRepairs;
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
}
