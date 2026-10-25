import { siteSchema, type Site, type SiteSection } from "@micirql/schema";
import { resolveTheme } from "@micirql/themes";
import type {
  FunctionBindingResolver,
  PrepareResult,
  PreparedSection,
  ResolvedBrandMark,
  RendererIssue,
  RendererMode,
  RendererRegistry,
} from "./types";
import { buildRenderedSeo } from "./seo";

const PUBLIC_FORM_ACTION_IDS = new Set([
  "lead.create",
  "appointment.request",
  "reservation.request",
  "quote.request",
  "newsletter.subscribe",
  "property.enquiry",
  "demo.request",
  "booking.request",
  "enrollment.enquiry",
]);

export function selectPublicFormBinding(
  bindings: SiteSection["bindings"],
  preferredBindingName?: string,
):
  | {
      bindingName: string;
      binding: SiteSection["bindings"][string];
    }
  | undefined {
  const preferred = preferredBindingName
    ? bindings[preferredBindingName]
    : undefined;
  const selected =
    preferred && PUBLIC_FORM_ACTION_IDS.has(preferred.actionId)
      ? ([preferredBindingName!, preferred] as const)
      : Object.entries(bindings).find(([, binding]) =>
          PUBLIC_FORM_ACTION_IDS.has(binding.actionId),
        );
  return selected
    ? { bindingName: selected[0], binding: selected[1] }
    : undefined;
}

export async function preparePage(args: {
  site: Site;
  path: string;
  origin: string;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  mode?: RendererMode;
  /** The exact logo asset named by site.theme.brand.logoAssetId, if supplied. */
  brandMark?: ResolvedBrandMark;
}): Promise<PrepareResult> {
  const parsedSite = siteSchema.safeParse(args.site);
  if (!parsedSite.success) {
    return {
      ok: false,
      issues: [
        {
          code: "INVALID_SITE",
          message: "The site snapshot failed schema validation.",
        },
      ],
    };
  }

  const site = parsedSite.data;
  const page = site.pages.find(
    (candidate) => candidate.path === normalizePath(args.path),
  );
  if (!page) {
    return {
      ok: false,
      issues: [
        {
          code: "PAGE_NOT_FOUND",
          message: `No page is registered for ${normalizePath(args.path)}.`,
        },
      ],
    };
  }
  const rawLogoAssetId = site.theme.brand.logoAssetId;
  const logoAssetId = rawLogoAssetId?.trim() ? rawLogoAssetId : undefined;
  const brandMark = logoAssetId
    ? normalizeBrandMark(args.brandMark, logoAssetId, site.name)
    : undefined;
  if (logoAssetId && !brandMark) {
    return {
      ok: false,
      issues: [
        {
          code: "BRAND_LOGO_UNRESOLVED",
          message: `Logo asset ${logoAssetId} could not be resolved for rendering.`,
        },
      ],
    };
  }

  const issues: RendererIssue[] = [];
  const sections: PreparedSection[] = [];
  const mode = args.mode ?? "production";

  for (const section of page.sections) {
    if (section.hidden) continue;

    const resolved = await args.registry.resolve(
      section.component.componentId,
      section.component.version,
    );
    if (!resolved) {
      issues.push({
        code: "COMPONENT_NOT_FOUND",
        message: `Component ${section.component.componentId}@${section.component.version} is unavailable.`,
        sectionId: section.id,
      });
      continue;
    }

    if (mode === "production" && resolved.registry.status !== "production") {
      issues.push({
        code: "COMPONENT_NOT_PRODUCTION",
        message: `Component ${resolved.registry.id} is not production approved.`,
        sectionId: section.id,
      });
    }

    if (!resolved.registry.protocol.passed) {
      issues.push({
        code: "COMPONENT_PROTOCOL_FAILED",
        message: `Component ${resolved.registry.id} has not passed the MiCirql Protocol.`,
        sectionId: section.id,
      });
    }

    if (resolved.registry.theme !== site.theme.family) {
      issues.push({
        code: "THEME_MISMATCH",
        message: `Component ${resolved.registry.id} belongs to ${resolved.registry.theme}, not ${site.theme.family}.`,
        sectionId: section.id,
      });
    }

    const props: Record<string, unknown> = { ...section.props };
    // Brand identity comes from the canonical theme asset, never from stale or
    // generated section content. Text-only sites therefore keep their existing
    // title treatment, while a supplied logo is shared by header and footer.
    delete props.brandMark;
    if (
      brandMark &&
      (resolved.registry.family === "navbar" ||
        resolved.registry.family === "footer")
    ) {
      props.brandMark = brandMark;
    }
    const selectedFormBinding = selectPublicFormBinding(
      section.bindings,
      typeof section.props.formBindingKey === "string"
        ? section.props.formBindingKey
        : undefined,
    );
    for (const [bindingName, binding] of Object.entries(section.bindings)) {
      const registered = await args.functions.isRegistered(binding.actionId);
      if (!registered) {
        issues.push({
          code: "ACTION_NOT_REGISTERED",
          message: `Action ${binding.actionId} is not registered.`,
          sectionId: section.id,
        });
        continue;
      }
      props[`${bindingName}ActionId`] = binding.actionId;
      props[`${bindingName}ActionEndpoint`] = args.functions.endpointFor({
        siteId: site.siteId,
        actionId: binding.actionId,
      });
      if (selectedFormBinding?.bindingName === bindingName) {
        props.formAction = args.functions.endpointFor({
          siteId: site.siteId,
          actionId: binding.actionId,
        });
        props.formActionId = binding.actionId;
      }
    }

    sections.push({ section, component: resolved, props });
  }

  if (issues.length > 0) return { ok: false, issues };

  const theme = resolveTheme({
    family: site.theme.family,
    modifiers: site.theme.modifiers,
    density: site.theme.brand.density,
    shape: site.theme.brand.shape,
    motion: site.theme.brand.motion,
    colors: {
      primary: site.theme.brand.colors.primary,
      primaryContrast: contrastFor(site.theme.brand.colors.primary),
      secondary: site.theme.brand.colors.secondary,
      secondaryContrast: contrastFor(site.theme.brand.colors.secondary),
      accent: site.theme.brand.colors.accent,
      surface: site.theme.brand.colors.background,
      surfaceElevated: site.theme.brand.colors.surface,
      text: site.theme.brand.colors.textPrimary,
      textMuted: site.theme.brand.colors.textSecondary,
      border: site.theme.brand.colors.border,
      danger: site.theme.brand.colors.error,
      success: site.theme.brand.colors.success,
      warning: site.theme.brand.colors.warning,
    },
    typography: {
      display: site.theme.brand.typography.display,
      body: site.theme.brand.typography.body,
      ui: site.theme.brand.typography.ui,
    },
  });

  return {
    ok: true,
    value: {
      site,
      page,
      sections,
      themeStyle: theme.cssVariables,
      seo: buildRenderedSeo(site, page, args.origin),
    },
  };
}

function normalizePath(value: string): string {
  const clean = value.split("?")[0]?.split("#")[0] ?? "/";
  if (!clean.startsWith("/")) return `/${clean}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}

function contrastFor(color: string): string {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#111111" : "#ffffff";
}

function normalizeBrandMark(
  value: ResolvedBrandMark | undefined,
  expectedAssetId: string,
  siteName: string,
): ResolvedBrandMark | undefined {
  if (
    !value ||
    value.assetId !== expectedAssetId ||
    typeof value.src !== "string" ||
    !value.src.trim() ||
    !Number.isFinite(value.width) ||
    value.width <= 0 ||
    !Number.isFinite(value.height) ||
    value.height <= 0
  ) {
    return undefined;
  }
  return {
    assetId: value.assetId,
    src: value.src.trim(),
    alt:
      (typeof value.alt === "string" ? value.alt.trim() : "") ||
      `${siteName} logo`,
    width: value.width,
    height: value.height,
    ...(typeof value.aspectRatio === "number" &&
    Number.isFinite(value.aspectRatio) &&
    value.aspectRatio > 0
      ? { aspectRatio: value.aspectRatio }
      : {}),
  };
}
