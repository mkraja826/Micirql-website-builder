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
  const theme = resolveTheme({
    family: site.theme.family,
    modifiers: site.theme.modifiers,
    colors: {
      primary: site.theme.brand.colors.primary, primaryContrast: contrastFor(site.theme.brand.colors.primary),
      secondary: site.theme.brand.colors.secondary, secondaryContrast: contrastFor(site.theme.brand.colors.secondary),
      accent: site.theme.brand.colors.accent, accentContrast: contrastFor(site.theme.brand.colors.accent),
      surface: site.theme.brand.colors.surface, surfaceElevated: site.theme.brand.colors.background,
      text: site.theme.brand.colors.textPrimary, textMuted: site.theme.brand.colors.textSecondary,
      border: site.theme.brand.colors.border, danger: site.theme.brand.colors.error,
      success: site.theme.brand.colors.success, warning: site.theme.brand.colors.warning,
    },
    typography: { display: site.theme.brand.typography.display, body: site.theme.brand.typography.body },
    density: site.theme.brand.density, shape: site.theme.brand.shape,
  });
  return { ok: true, value: { site, page, sections, themeStyle: theme.cssVariables, seo: buildRenderedSeo(site, page, args.origin) } };
}

function normalizePath(value: string): string { const clean = value.split("?")[0]?.split("#")[0] ?? "/"; if (!clean.startsWith("/")) return `/${clean}`; return clean.length > 1 ? clean.replace(/\/+$/, "") : clean; }
function contrastFor(color: string): string { const hex = color.trim().replace(/^#/, ""); if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff"; const r = Number.parseInt(hex.slice(0,2),16), g = Number.parseInt(hex.slice(2,4),16), b = Number.parseInt(hex.slice(4,6),16); return (0.2126*r+0.7152*g+0.0722*b)/255 > .55 ? "#111111" : "#ffffff"; }
