import type { Locator, Page } from "@playwright/test";
import { planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";

const REPAIR_STYLE_ID = "mi-first-screen-repair-style";

export type RenderMetrics = {
  cssViewportWidth: number;
  clientWidth: number;
  scrollWidth: number;
  overflowingSections: number;
  overflowingControls: number;
  overflowingControlDetails: Array<{ tag: string; className: string; text: string; ariaLabel: string }>;
  clippedMedia: number;
  firstScreen: {
    foldHeight: number;
    h1FontPx: number;
    h1LineHeightPx: number;
    h1Lines: number;
    headlineTop: number | null;
    navHeight: number | null;
    heroTop: number | null;
    heroHeight: number | null;
    ctaTop: number | null;
    ctaBottom: number | null;
    ctaInFirstScreen: boolean;
    mediaPresent: boolean;
    mediaTop: number | null;
    mediaHeight: number | null;
    mediaObjectFit: string | null;
    failures: string[];
    passed: boolean;
  };
};

export function firstScreenFoldHeight(width: number) {
  return width <= 430 ? 844 : 900;
}

export async function clearRenderedFirstScreenRepair(page: Page, root: Locator) {
  await root.evaluate((element) => {
    element.removeAttribute("data-mi-first-screen-repair");
    element.removeAttribute("data-mi-first-screen-repair-attempt");
  });
  await page.evaluate((id) => document.getElementById(id)?.remove(), REPAIR_STYLE_ID);
}

export async function measureRenderedFirstScreen(rootLocator: Locator, width: number): Promise<RenderMetrics> {
  return rootLocator.evaluate((element, input) => {
    const root = element as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const relativeRect = (node: Element | null) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top, left: rect.left - rootRect.left, right: rect.right - rootRect.left, width: rect.width, height: rect.height };
    };
    const outside = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
    };
    const isEditorControl = (node: Element) => Boolean(node.closest("[data-mi-canvas-action], .mi-editor-insert-zone, .mi-editor-canvas-toolbar"));
    const hidden = (node: Element) => {
      if (node.matches("input[type='hidden'], .mi-form-honeypot, [hidden], [aria-hidden='true']")) return true;
      const closedDetails = node.closest("details:not([open])");
      if (closedDetails) {
        const summary = closedDetails.querySelector(":scope > summary");
        if (!summary || !summary.contains(node)) return true;
      }
      const style = getComputedStyle(node);
      return style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0;
    };
    const visible = (node: Element) => {
      if (hidden(node)) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const controls = [...root.querySelectorAll("a,button,input,textarea,select")].filter((node) => !isEditorControl(node) && !hidden(node));
    const overflowingControlNodes = controls.filter(outside);
    const h1 = [...root.querySelectorAll("h1")].find(visible) ?? null;
    const hero = h1?.closest("section") ?? h1?.closest(".mi-editor-section") ?? [...root.querySelectorAll("section")].find((node) => /hero/i.test(node.className)) ?? null;
    const nav = [...root.querySelectorAll("header,nav")].find(visible) ?? null;
    const heroActions = hero ? [...hero.querySelectorAll("a,button")].filter((node) => {
      if (!visible(node) || isEditorControl(node)) return false;
      const label = `${node.textContent ?? ""} ${node.getAttribute("aria-label") ?? ""}`.trim().toLowerCase();
      return Boolean(label) && !/menu|navigation|close|previous|next/.test(label);
    }) : [];
    const primaryCta = heroActions[0] ?? null;
    const heroImage = hero ? [...hero.querySelectorAll("img,video,picture img")].find(visible) ?? null : null;
    const backgroundMedia = hero ? [...hero.querySelectorAll("div,figure,section")].find((node) => visible(node) && getComputedStyle(node).backgroundImage !== "none") ?? null : null;
    const mediaNode = heroImage ?? backgroundMedia;

    const h1Style = h1 ? getComputedStyle(h1) : null;
    const h1FontPx = h1Style ? Number.parseFloat(h1Style.fontSize) || 0 : 0;
    const parsedLineHeight = h1Style ? Number.parseFloat(h1Style.lineHeight) : Number.NaN;
    const h1LineHeightPx = Number.isFinite(parsedLineHeight) ? parsedLineHeight : h1FontPx * 1.2;
    const h1Rect = relativeRect(h1);
    const heroRect = relativeRect(hero);
    const navRect = relativeRect(nav);
    const ctaRect = relativeRect(primaryCta);
    const mediaRect = relativeRect(mediaNode);
    const h1Lines = h1Rect && h1LineHeightPx > 0 ? Math.max(1, Math.round(h1Rect.height / h1LineHeightPx)) : 0;
    const failures: string[] = [];
    const mobile = input.width <= 430;
    const desktop = input.width >= 1024;
    const minH1Px = mobile ? 28 : desktop ? 40 : 34;
    const maxH1Lines = mobile ? 4 : desktop ? 3 : 4;
    const maxNavHeight = mobile ? 96 : 116;

    if (!h1 || !h1Rect) failures.push("missing-visible-h1");
    else {
      if (h1FontPx < minH1Px) failures.push(`headline-too-small:${h1FontPx.toFixed(1)}px<${minH1Px}px`);
      if (h1Lines > maxH1Lines) failures.push(`headline-wraps-too-many-lines:${h1Lines}>${maxH1Lines}`);
      if (h1Rect.top > input.foldHeight * 0.62) failures.push(`headline-too-low:${Math.round(h1Rect.top)}px`);
    }
    if (navRect && navRect.height > maxNavHeight) failures.push(`navbar-too-tall:${Math.round(navRect.height)}px>${maxNavHeight}px`);
    if (!primaryCta || !ctaRect) failures.push("missing-visible-hero-cta");
    else {
      if (ctaRect.top > input.foldHeight * 0.94) failures.push(`cta-below-conversion-fold:${Math.round(ctaRect.top)}px`);
      if (ctaRect.bottom > input.foldHeight * 1.04) failures.push(`cta-not-visible-in-first-screen:${Math.round(ctaRect.bottom)}px`);
    }
    if (heroRect && heroRect.top > Math.max(180, input.foldHeight * 0.24)) failures.push(`hero-starts-too-low:${Math.round(heroRect.top)}px`);
    if (navRect && h1Rect && h1Rect.top - navRect.bottom > (mobile ? 260 : 320)) failures.push(`excess-space-before-headline:${Math.round(h1Rect.top - navRect.bottom)}px`);

    return {
      cssViewportWidth: window.innerWidth,
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      overflowingSections: [...root.querySelectorAll("section,header,footer")].filter(outside).length,
      overflowingControls: overflowingControlNodes.length,
      overflowingControlDetails: overflowingControlNodes.slice(0, 8).map((node) => ({ tag: node.tagName.toLowerCase(), className: node.getAttribute("class") ?? "", text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120), ariaLabel: node.getAttribute("aria-label") ?? "" })),
      clippedMedia: [...root.querySelectorAll("img,video,iframe")].filter(outside).length,
      firstScreen: {
        foldHeight: input.foldHeight,
        h1FontPx: Number(h1FontPx.toFixed(1)),
        h1LineHeightPx: Number(h1LineHeightPx.toFixed(1)),
        h1Lines,
        headlineTop: h1Rect ? Math.round(h1Rect.top) : null,
        navHeight: navRect ? Math.round(navRect.height) : null,
        heroTop: heroRect ? Math.round(heroRect.top) : null,
        heroHeight: heroRect ? Math.round(heroRect.height) : null,
        ctaTop: ctaRect ? Math.round(ctaRect.top) : null,
        ctaBottom: ctaRect ? Math.round(ctaRect.bottom) : null,
        ctaInFirstScreen: Boolean(ctaRect && ctaRect.top <= input.foldHeight * 0.94 && ctaRect.bottom <= input.foldHeight * 1.04),
        mediaPresent: Boolean(mediaNode),
        mediaTop: mediaRect ? Math.round(mediaRect.top) : null,
        mediaHeight: mediaRect ? Math.round(mediaRect.height) : null,
        mediaObjectFit: heroImage ? getComputedStyle(heroImage).objectFit : null,
        failures,
        passed: failures.length === 0,
      },
    };
  }, { width, foldHeight: firstScreenFoldHeight(width) });
}

export async function runRenderedFirstScreenRepairCycle(page: Page, root: Locator, width: number) {
  const before = await measureRenderedFirstScreen(root, width);
  const plan = planRenderedFirstScreenRepair({ width, failures: before.firstScreen.failures, attempt: 0 });

  if (!plan.required || !plan.css) {
    return { metrics: before, plan, attempted: false, repaired: false, rejectedAfterRepair: !before.firstScreen.passed, before: before.firstScreen, after: before.firstScreen };
  }

  await root.evaluate((element) => {
    element.setAttribute("data-mi-first-screen-repair", "1");
    element.setAttribute("data-mi-first-screen-repair-attempt", "1");
  });
  await page.evaluate(({ id, css }) => {
    document.getElementById(id)?.remove();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, { id: REPAIR_STYLE_ID, css: plan.css });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const afterMetrics = await measureRenderedFirstScreen(root, width);
  return {
    metrics: afterMetrics,
    plan,
    attempted: true,
    repaired: !before.firstScreen.passed && afterMetrics.firstScreen.passed,
    rejectedAfterRepair: !afterMetrics.firstScreen.passed,
    before: before.firstScreen,
    after: afterMetrics.firstScreen,
  };
}
