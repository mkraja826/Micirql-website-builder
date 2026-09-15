import { chromium } from "@playwright/test";

function normalizeSlug(value) {
  return String(value ?? "").trim().replace(/^\/+|\/+$/g, "") || "home";
}

function publicUrl(baseUrl, siteId, slug) {
  const base = baseUrl.replace(/\/$/, "");
  const normalized = normalizeSlug(slug);
  return normalized === "home"
    ? `${base}/published/${encodeURIComponent(siteId)}`
    : `${base}/published/${encodeURIComponent(siteId)}/${normalized}`;
}

export async function probePublishedSite({ baseUrl, siteId, pageSlugs, expectedVersionId, width, height }) {
  if (!baseUrl || !siteId || !expectedVersionId) throw new Error("Published browser probe requires base URL, site ID, and expected version ID.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const pages = [];

  try {
    for (const slug of pageSlugs) {
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) => failedRequests.push(request.url()));

      const response = await page.goto(publicUrl(baseUrl, siteId, slug), {
        waitUntil: "networkidle",
        timeout: 30_000,
      });

      const observation = await page.evaluate(() => {
        const root = document.documentElement;
        const navigationTargets = Array.from(document.querySelectorAll("a[href]"))
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.startsWith("/published/"))
          .map((href) => href.split("?")[0].split("#")[0].split("/").filter(Boolean).slice(2).join("/") || "home");
        const versionId =
          root.getAttribute("data-published-version-id") ??
          document.body.getAttribute("data-published-version-id") ??
          document.querySelector("[data-published-version-id]")?.getAttribute("data-published-version-id") ??
          null;

        return {
          url: location.href,
          versionId,
          horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
          navigationTargets,
        };
      });

      pages.push({
        ...observation,
        status: response?.status() ?? 0,
        consoleErrors,
        failedRequests,
      });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return { width, height, pages };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [baseUrl, siteId, expectedVersionId, width, height, ...pageSlugs] = process.argv.slice(2);
  const result = await probePublishedSite({
    baseUrl,
    siteId,
    expectedVersionId,
    width: Number(width),
    height: Number(height),
    pageSlugs: pageSlugs.length ? pageSlugs : ["home"],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
