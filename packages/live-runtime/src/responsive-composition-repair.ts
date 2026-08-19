import type { Site } from "@micirql/schema";

export type LiveResponsiveCompositionRepair = {
  css: string;
  enabled: boolean;
  mobile: string;
  tablet: string;
  desktop: string;
};

/**
 * Resolve the exact responsive-composition CSS persisted on a generated Site.
 * The live runtime never recomputes or broadens a certified repair; it only
 * replays the viewport-specific CSS that already passed Design Review.
 */
export function liveResponsiveCompositionRepair(site: Site, path: string): LiveResponsiveCompositionRepair {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const raw = hero?.props?.responsiveCompositionRepairs;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty();

  const repairs = raw as Record<string, unknown>;
  const cssFor = (viewport: "mobile" | "tablet" | "desktop") => {
    const entry = repairs[viewport];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
    const css = (entry as Record<string, unknown>).css;
    return typeof css === "string" ? css.trim() : "";
  };

  const mobile = cssFor("mobile");
  const tablet = cssFor("tablet");
  const desktop = cssFor("desktop");
  const blocks = [
    mobile ? `@media (max-width:430px){${mobile}}` : "",
    tablet ? `@media (min-width:431px) and (max-width:1024px){${tablet}}` : "",
    desktop ? `@media (min-width:1025px){${desktop}}` : "",
  ].filter(Boolean);

  return { css: blocks.join("\n"), enabled: blocks.length > 0, mobile, tablet, desktop };
}

function empty(): LiveResponsiveCompositionRepair {
  return { css: "", enabled: false, mobile: "", tablet: "", desktop: "" };
}
