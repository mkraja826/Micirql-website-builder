import { expect, test } from "@playwright/test";
import { createProductionSectionRendererRegistry } from "@micirql/live-runtime/production-section-registry";
import { seedSectionCatalog } from "@micirql/sections";

test("published built-in registry resolves catalog sections as renderable production components", async () => {
  const registry = createProductionSectionRendererRegistry();
  for (const seed of [seedSectionCatalog[0], seedSectionCatalog[Math.floor(seedSectionCatalog.length / 2)], seedSectionCatalog.at(-1)]) {
    expect(seed).toBeTruthy();
    if (!seed) continue;
    const resolved = await registry.resolve(seed.id, seed.version);
    expect(resolved, `${seed.id} must resolve at the published runtime boundary`).toBeTruthy();
    expect(resolved?.registry.id).toBe(seed.id);
    expect(resolved?.registry.version).toBe(seed.version);
    expect(resolved?.registry.status).toBe("production");
    expect(resolved?.registry.protocol.passed).toBe(true);
    expect(typeof resolved?.Component).toBe("function");
  }
});

test("published built-in registry fails closed for unknown IDs and versions", async () => {
  const registry = createProductionSectionRendererRegistry();
  const known = seedSectionCatalog[0]!;
  expect(await registry.resolve("CUSTOM-HERO-999", "1.0.0")).toBeUndefined();
  expect(await registry.resolve(known.id, "99.0.0")).toBeUndefined();
});

test("live host uses configured registry first and built-in catalog only as fallback", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile("apps/live/live-runtime.ts", "utf8"));
  expect(source).toContain("configured.registry.resolve(componentId, version)");
  expect(source).toContain("?? builtInRegistry.resolve(componentId, version)");
  expect(source).toContain("createProductionSectionRendererRegistry");
});
