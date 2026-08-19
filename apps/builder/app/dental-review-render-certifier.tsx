"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewDirection } from "./review-directions";
import { RendererPreview } from "./renderer-preview";
import { planRenderedFirstScreenRepair } from "./rendered-first-screen-repair";
import { persistFirstScreenRepair } from "./persisted-first-screen-repair";
import { planRenderedPageTypographyRepair } from "./rendered-page-typography-repair";
import { persistRenderedTypographyRepair } from "./persisted-rendered-typography-repair";
import { measureResponsiveCompositionIssues } from "./rendered-responsive-composition-quality";

const TARGETS = [
  { viewport: "mobile" as const, width: 390, foldHeight: 844 },
  { viewport: "tablet" as const, width: 768, foldHeight: 1024 },
  { viewport: "desktop" as const, width: 1440, foldHeight: 900 },
];

type CertificationResult = {
  direction: ReviewDirection;
  passed: boolean;
  repaired: boolean;
  failures: string[];
};

type TypographyIssue = { code: string; severity: "warning" | "error" };

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
  const [firstScreenAttempt, setFirstScreenAttempt] = useState<0 | 1>(0);
  const [typographyAttempt, setTypographyAttempt] = useState<0 | 1>(0);
  const [results, setResults] = useState<CertificationResult[]>([]);
  const probeRef = useRef<HTMLDivElement>(null);
  const completedSignature = useRef("");

  useEffect(() => {
    setCandidateIndex(0);
    setTargetIndex(0);
    setFirstScreenAttempt(0);
    setTypographyAttempt(0);
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
      const firstScreenFailures = measureFirstScreen(documentRoot, target.width, target.foldHeight);

      if (firstScreenFailures.length) {
        const plan = planRenderedFirstScreenRepair({ width: target.width, failures: firstScreenFailures, attempt: firstScreenAttempt });
        if (firstScreenAttempt === 0 && plan.required) {
          setWorking((current) => current ? { ...current, site: persistFirstScreenRepair(current.site, plan) } : current);
          setFirstScreenAttempt(1);
          return;
        }
        finishCandidate({ direction: working, passed: false, repaired: hasAnyRepair(working), failures: firstScreenFailures });
        return;
      }

      const typographyIssues = measureRenderedTypographyIssues(documentRoot, target.width);
      const typographyFailed = typographyIssues.some((issue) => issue.severity === "error") || typographyIssues.filter((issue) => issue.severity === "warning").length > (target.width <= 430 ? 4 : target.width <= 1024 ? 4 : 5);
      if (typographyFailed) {
        const plan = planRenderedPageTypographyRepair({ width: target.width, issues: typographyIssues, attempt: typographyAttempt });
        if (typographyAttempt === 0 && plan.required) {
          setWorking((current) => current ? { ...current, site: persistRenderedTypographyRepair(current.site, plan) } : current);
          setTypographyAttempt(1);
          return;
        }
        finishCandidate({
          direction: working,
          passed: false,
          repaired: hasAnyRepair(working),
          failures: typographyIssues.map((issue) => `typography:${issue.code}`),
        });
        return;
      }

      const compositionIssues = measureResponsiveCompositionIssues(documentRoot, target.width);
      const compositionWarningLimit = target.width <= 430 ? 3 : target.width <= 1024 ? 4 : 5;
      const compositionFailed = compositionIssues.some((issue) => issue.severity === "error") || compositionIssues.filter((issue) => issue.severity === "warning").length > compositionWarningLimit;
      if (compositionFailed) {
        finishCandidate({
          direction: working,
          passed: false,
          repaired: hasAnyRepair(working),
          failures: compositionIssues.map((issue) => `composition:${issue.code}:${issue.detail}`),
        });
        return;
      }

      if (targetIndex < TARGETS.length - 1) {
        setTargetIndex((value) => value + 1);
        setFirstScreenAttempt(0);
        setTypographyAttempt(0);
        return;
      }
      finishCandidate({ direction: working, passed: true, repaired: hasAnyRepair(working), failures: [] });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [candidateIndex, directions.length, firstScreenAttempt, targetIndex, typographyAttempt, working]);

  function finishCandidate(result: CertificationResult) {
    const nextResults = [...results, result];
    const nextIndex = candidateIndex + 1;
    setResults(nextResults);
    setCandidateIndex(nextIndex);
    setTargetIndex(0);
    setFirstScreenAttempt(0);
    setTypographyAttempt(0);
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
    style={{ position: "fixed", left: "-20000px", top: 0, width: target.width, maxWidth: target.width, opacity: 0, pointerEvents: "none" }}
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
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
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
  const tablet = width > 430 && width <= 1024;
  const minH1 = mobile ? 28 : tablet ? 34 : 40;
  const maxLines = mobile ? 4 : tablet ? 4 : 3;
  const maxNav = mobile ? 96 : tablet ? 108 : 116;
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
  if (heroRect && heroRect.top > Math.max(tablet ? 200 : 180, foldHeight * 0.24)) failures.push(`hero-starts-too-low:${Math.round(heroRect.top)}px`);
  if (navRect && h1Rect && h1Rect.top - navRect.bottom > (mobile ? 260 : tablet ? 290 : 320)) failures.push(`excess-space-before-headline:${Math.round(h1Rect.top - navRect.bottom)}px`);
  return failures;
}

function measureRenderedTypographyIssues(root: HTMLElement, width: number): TypographyIssue[] {
  const editor = "[data-mi-canvas-action],.mi-editor-insert-zone,.mi-editor-canvas-toolbar";
  const visible = (node: Element) => {
    if (node.closest(editor)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const lineHeight = (node: Element) => {
    const style = getComputedStyle(node);
    const explicit = Number.parseFloat(style.lineHeight);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    return Number.isFinite(explicit) ? explicit : fontSize * 1.2;
  };
  const lines = (node: Element) => Math.max(1, Math.round(node.getBoundingClientRect().height / Math.max(1, lineHeight(node))));
  const mobile = width <= 430;
  const tablet = width > 430 && width <= 1024;
  const issues: TypographyIssue[] = [];

  for (const heading of [...root.querySelectorAll("h1,h2,h3")].filter(visible)) {
    const count = lines(heading);
    const limit = heading.tagName.toLowerCase() === "h1" ? (mobile || tablet ? 4 : 3) : (mobile ? 4 : 3);
    if (count > limit) issues.push({ code: "HEADING_TOO_MANY_RENDERED_LINES", severity: "error" });
  }
  for (const action of [...root.querySelectorAll("a,button")].filter(visible)) {
    if (action.scrollWidth > action.clientWidth + 1) issues.push({ code: "ACTION_TEXT_OVERFLOW", severity: "error" });
    if (lines(action) > 2) issues.push({ code: "ACTION_WRAP_EXCESSIVE", severity: "error" });
  }
  for (const paragraph of [...root.querySelectorAll("p,.mi-type--body,.mi-type--body-sm")].filter(visible)) {
    const text = (paragraph.textContent ?? "").trim();
    if (text.length < 90) continue;
    const count = lines(paragraph);
    const limit = mobile ? 9 : tablet ? 8 : 7;
    if (count > limit) issues.push({ code: "PARAGRAPH_RENDERED_TOO_DENSE", severity: count > limit + 2 ? "error" : "warning" });
  }
  const cardTitles = [...root.querySelectorAll(".mi-card h3,.mi-service-item h3,[class*='card'] h3,[class*='item'] h3")].filter(visible);
  if (cardTitles.length >= 2) {
    const heights = cardTitles.map((title) => title.getBoundingClientRect().height);
    if (Math.max(...heights) - Math.min(...heights) > 32) issues.push({ code: "CARD_TITLE_HEIGHT_VARIANCE", severity: "warning" });
  }
  return issues;
}

function hasAnyRepair(direction: ReviewDirection): boolean {
  const home = direction.site.pages.find((page) => page.path === "/") ?? direction.site.pages[0];
  const hero = home?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const firstScreen = hero?.props?.renderedFirstScreenRepairs;
  const typography = hero?.props?.renderedTypographyRepairs;
  const populated = (value: unknown) => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
  return populated(firstScreen) || populated(typography);
}
