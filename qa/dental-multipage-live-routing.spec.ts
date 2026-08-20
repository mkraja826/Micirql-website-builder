import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("published live runtime resolves the requested Site page path instead of falling back to home", async () => {
  const [runtime, route] = await Promise.all([
    source("packages/live-runtime/src/index.ts"),
    source("apps/live/app/[[...path]]/route.ts"),
  ]);

  expect(route).toContain('serveLiveRequest(request)');
  expect(runtime).toContain('const path = normalizePath(url.pathname);');
  expect(runtime).toContain('preparePage({ site, path, origin');
  expect(runtime).toContain('const cacheKey = `${hostname}:${published.versionId}:${path}`');
  expect(runtime).toContain('PAGE_NOT_FOUND');
});

test("published sitemap enumerates every indexable generated page by its canonical Site path", async () => {
  const runtime = await source("packages/live-runtime/src/index.ts");
  expect(runtime).toContain('if (url.pathname === "/sitemap.xml") return sitemapResponse(site, origin);');
  expect(runtime).toContain('site.pages.filter((page) => page.seo.indexable)');
  expect(runtime).toContain('`${origin}${page.path}`');
  expect(runtime).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
});

test("robots advertises the same published sitemap endpoint", async () => {
  const runtime = await source("packages/live-runtime/src/index.ts");
  expect(runtime).toContain('Sitemap: ${origin}/sitemap.xml');
});
