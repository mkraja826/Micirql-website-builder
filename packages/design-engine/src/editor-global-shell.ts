import type { Site, SiteSection } from "@micirql/schema";

type ShellFamily = "navbar" | "footer";

/**
 * Promotes a Navbar/Footer edited on any page into the canonical global shell,
 * then propagates it to every page while preserving page-local section IDs.
 * `previous` is optional so this also acts as a normal shell synchronizer.
 */
export function propagateEditedGlobalShell(incoming: Site, previous?: Site): Site {
  const next = structuredClone(incoming);
  if (!next.pages.length) return next;

  for (const family of ["navbar", "footer"] as const) {
    const edited = previous ? findChangedShell(next, previous, family) : undefined;
    const canonical = edited ?? findShell(next.pages.find((page) => page.path === "/") ?? next.pages[0]!, family) ?? findFirstShell(next, family);
    if (!canonical) continue;

    for (const page of next.pages) {
      const existing = page.sections.filter((section) => shellFamily(section) === family);
      const body = page.sections.filter((section) => shellFamily(section) !== family);
      const cloned: SiteSection = {
        ...structuredClone(canonical),
        id: existing[0]?.id ?? `global-${family}-${slug(page.id)}`,
      };
      page.sections = family === "navbar" ? [cloned, ...body] : [...body, cloned];
    }
  }

  return next;
}

export function isGlobalShellSection(section: SiteSection): boolean {
  return shellFamily(section) !== undefined;
}

function findChangedShell(incoming: Site, previous: Site, family: ShellFamily): SiteSection | undefined {
  for (const page of incoming.pages) {
    const current = findShell(page, family);
    if (!current) continue;
    const oldPage = previous.pages.find((candidate) => candidate.id === page.id || candidate.path === page.path);
    const old = oldPage ? findShell(oldPage, family) : undefined;
    if (!old || signature(current) !== signature(old)) return current;
  }
  return undefined;
}

function findFirstShell(site: Site, family: ShellFamily): SiteSection | undefined {
  for (const page of site.pages) {
    const section = findShell(page, family);
    if (section) return section;
  }
  return undefined;
}

function findShell(page: Site["pages"][number], family: ShellFamily): SiteSection | undefined {
  return page.sections.find((section) => shellFamily(section) === family);
}

function shellFamily(section: SiteSection): ShellFamily | undefined {
  const value = section.component.componentId.toLowerCase();
  if (value.startsWith("navbar.") || value.includes("-nav-")) return "navbar";
  if (value.startsWith("footer.") || value.includes("-footer-") || value.includes("-foot-")) return "footer";
  return undefined;
}

function signature(section: SiteSection): string {
  return JSON.stringify({ component: section.component, props: section.props, bindings: section.bindings, hidden: section.hidden });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}
