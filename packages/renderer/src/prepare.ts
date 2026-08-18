import { siteSchema, type Site } from "@micirql/schema";
import { resolveTheme } from "@micirql/themes";
import type {
  FunctionBindingResolver,
  PrepareResult,
  PreparedSection,
  RendererIssue,
  RendererMode,
  RendererRegistry,
} from "./types";
import { buildRenderedSeo } from "./seo";

export async function preparePage(args: {
  site: Site;
  path: string;
  origin: string;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  mode?: RendererMode;
}): Promise<PrepareResult> {
  const parsedSite = siteSchema.safeParse(args.site);
  if (!parsedSite.success) {
    return { ok: false, issues: [{ code: "INVALID_SITE", message: "The site snapshot failed schema validation." }] };
  }
  const site = parsedSite.data;
  const page = site.pages.find((candidate) => candidate.path === normalizePath(args.path));
  if (!page) return { ok: false, issues: [{ code: "PAGE_NOT_FOUND", message: `No page is registered for ${normalizePath(args.path)}.` }] };

  const issues: RendererIssue[] = [];
  const sections: PreparedSection[] = [];
  const mode = args.mode ?? "production";

  for (const section of page.sections) {
    if (section.hidden) continue;
    const resolved = await args.registry.resolve(section.component.componentId, section.component.version);
    if (!resolved) { issues.push({ code: "COMPONENT_NOT_FOUND", message: `Component ${section.component.componentId}@${section.component.version} is unavailable.`, sectionId: section.id }); continue; }
    if (mode === "production" && resolved.registry.status !== "production") issues.push({ code: "COMPONENT_NOT_PRODUCTION", message: `Component ${resolved.registry.id} is not production approved.`, sectionId: section.id });
    if (!resolved.registry.protocol.passed) issues.push({ code: "COMPONENT_PROTOCOL_FAILED", message: `Component ${resolved.registry.id} has not passed the MiCirql Protocol.`, sectionId: section.id });
    if (resolved.registry.theme !== site.theme.family) issues.push({ code: "THEME_MISMATCH", message: `Component ${resolved.registry.id} belongs to ${resolved.registry.theme}, not ${site.theme.family}.`, sectionId: section.id });

    const props: Record<string, unknown> = { ...section.props };
    injectBrandLogo(site, section.component.componentId, props);
    let primaryAction: { id: string; endpoint: string } | undefined;
    for (const [bindingName, binding] of Object.entries(section.bindings)) {
      const registered = await args.functions.isRegistered(binding.actionId);
      if (!registered) { issues.push({ code: "ACTION_NOT_REGISTERED", message: `Action ${binding.actionId} is not registered.`, sectionId: section.id }); continue; }
      const endpoint = args.functions.endpointFor({ siteId: site.siteId, actionId: binding.actionId });
      props[`${bindingName}ActionId`] = binding.actionId;
      props[`${bindingName}ActionEndpoint`] = endpoint;
      if (!primaryAction) primaryAction = { id: binding.actionId, endpoint };
      if (bindingName === "submit") props.formAction = endpoint;
    }
    if (primaryAction) {
      props.formAction ??= primaryAction.endpoint;
      props.formActionId ??= primaryAction.id;
      props.formSourcePage ??= page.path;
    }
    sections.push({ section, component: resolved, props });
  }

  if (issues.length > 0) return { ok: false, issues };
  const safe = premiumPalette(site.theme.brand.colors);
  const theme = resolveTheme({
    family: site.theme.family,
    modifiers: site.theme.modifiers,
    colors: {
      primary: safe.primary, primaryContrast: contrastFor(safe.primary),
      secondary: safe.secondary, secondaryContrast: contrastFor(safe.secondary),
      accent: safe.accent, accentContrast: contrastFor(safe.accent),
      surface: safe.surface, surfaceElevated: safe.background,
      text: safe.textPrimary, textMuted: safe.textSecondary,
      border: safe.border, danger: safe.error,
      success: safe.success, warning: safe.warning,
    },
    typography: { display: site.theme.brand.typography.display, body: site.theme.brand.typography.body },
    density: site.theme.brand.density, shape: site.theme.brand.shape,
  });
  return {
    ok: true,
    value: {
      site,
      page,
      sections,
      themeStyle: { ...theme.cssVariables, ...brandRuntimeTokens(site) },
      seo: buildRenderedSeo(site, page, args.origin),
    },
  };
}

function brandRuntimeTokens(site: Site): Record<string, string> {
  const intelligence = site.theme.brand.intelligence;
  return {
    "--mi-brand-density": site.theme.brand.density,
    "--mi-brand-shape": site.theme.brand.shape,
    "--mi-brand-motion": site.theme.brand.motion,
    ...(intelligence ? {
      "--mi-brand-tone": intelligence.tone,
      "--mi-brand-typography-mood": intelligence.typographyMood,
      "--mi-brand-button-style": intelligence.buttonStyle,
      "--mi-brand-imagery-style": intelligence.imageryStyle,
    } : {}),
  };
}

function injectBrandLogo(site:Site, componentId:string, props:Record<string,unknown>) {
  const src = site.theme.brand.logoAssetId;
  if (!src || !isShellBrandComponent(componentId)) return;
  const presentation = site.theme.brand.logoPresentation;
  props.logo = {
    src,
    alt: `${site.name} logo`,
    ...(presentation ? {
      treatment: presentation.treatment,
      shape: presentation.shape,
      navbarMaxHeight: presentation.navbarMaxHeight,
      footerMaxHeight: presentation.footerMaxHeight,
      paddingScale: presentation.paddingScale,
      ...(typeof presentation.hasTransparency === "boolean" ? { hasTransparency: presentation.hasTransparency } : {}),
      ...(presentation.backgroundSignal ? { backgroundSignal: presentation.backgroundSignal } : {}),
      ...(presentation.edgeColor ? { edgeColor: presentation.edgeColor } : {}),
    } : {}),
  };
}

function isShellBrandComponent(componentId:string) {
  const normalized = componentId.toLowerCase();
  const upper = componentId.toUpperCase();
  return normalized.startsWith("navbar.") || normalized.startsWith("footer.") || upper.includes("-NAV-") || upper.includes("-FOOT-");
}
function normalizePath(value: string): string { const clean = value.split("?")[0]?.split("#")[0] ?? "/"; if (!clean.startsWith("/")) return `/${clean}`; return clean.length > 1 ? clean.replace(/\/+$/, "") : clean; }

type BrandColors = Site["theme"]["brand"]["colors"];

function premiumPalette(colors: BrandColors): BrandColors {
  const surface = safeHex(colors.surface, "#ffffff");
  const background = safeHex(colors.background, surface);
  const preferredText = safeHex(colors.textPrimary, "#111827");
  const textPrimary = ensureContrast(preferredText, surface, 7, bestText(surface));
  const preferredMuted = safeHex(colors.textSecondary, mixHex(textPrimary, surface, .38));
  const textSecondary = ensureContrast(preferredMuted, surface, 4.5, mixHex(textPrimary, surface, .18));
  const preferredBorder = safeHex(colors.border, mixHex(textPrimary, surface, .84));
  const border = contrastRatio(preferredBorder, surface) >= 1.35 ? preferredBorder : mixHex(textPrimary, surface, .82);

  return {
    primary: safeHex(colors.primary, "#111827"),
    secondary: safeHex(colors.secondary, "#f3f4f6"),
    accent: safeHex(colors.accent, "#6d28d9"),
    background,
    surface,
    textPrimary,
    textSecondary,
    border,
    success: safeHex(colors.success, "#15803d"),
    warning: safeHex(colors.warning, "#a16207"),
    error: safeHex(colors.error, "#b91c1c"),
  };
}

function contrastFor(color: string): string {
  const bg = safeHex(color, "#000000");
  const black = "#111111";
  const white = "#ffffff";
  return contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
}

function ensureContrast(foreground: string, background: string, target: number, fallback: string): string {
  if (contrastRatio(foreground, background) >= target) return foreground;
  if (contrastRatio(fallback, background) >= target) return fallback;
  const candidate = bestText(background);
  return contrastRatio(candidate, background) >= target ? candidate : fallback;
}

function bestText(background: string): string {
  return contrastRatio("#111111", background) >= contrastRatio("#ffffff", background) ? "#111111" : "#ffffff";
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + .05) / (lo + .05);
}

function relativeLuminance(color: string): number {
  const { r, g, b } = hexRgb(safeHex(color, "#000000"));
  const linear = (value: number) => {
    const c = value / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  };
  return .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
}

function safeHex(value: string, fallback: string): string {
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.slice(1).split("").map((c) => `${c}${c}`).join("")}`.toLowerCase();
  return fallback;
}

function hexRgb(hex: string) {
  const value = safeHex(hex, "#000000").slice(1);
  return { r: Number.parseInt(value.slice(0,2),16), g: Number.parseInt(value.slice(2,4),16), b: Number.parseInt(value.slice(4,6),16) };
}

function mixHex(foreground: string, background: string, backgroundWeight: number): string {
  const a = hexRgb(foreground), b = hexRgb(background);
  const t = Math.max(0, Math.min(1, backgroundWeight));
  const channel = (x:number,y:number) => Math.round(x*(1-t)+y*t).toString(16).padStart(2,"0");
  return `#${channel(a.r,b.r)}${channel(a.g,b.g)}${channel(a.b,b.b)}`;
}
