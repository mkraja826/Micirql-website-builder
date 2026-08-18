import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const binder = fs.readFileSync(path.join(root, "apps/builder/app/functional-binding-intelligence.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/architect/route.ts"), "utf8");

test("functional bindings only derive destinations from locked brief text", () => {
  expect(binder).toContain("extractDestinations(text)");
  expect(binder).toContain("https://wa.me/");
  expect(binder).toContain("tel:");
  expect(binder).toContain("mailto:");
  expect(binder).not.toContain("example.com");
  expect(binder).not.toContain("0000000000");
});

test("cta and contact actions support whatsapp phone email booking maps and forms", () => {
  for (const token of ["whatsapp", "phone", "email", "maps", "booking", "form"]) expect(binder).toContain(token);
  expect(binder).toContain('family === "hero" || family === "cta" || family === "contact"');
  expect(binder).toContain("props.formAction = form");
});

test("functional binding is the final architecture enrichment pass", () => {
  expect(route).toContain("applyFunctionalBindings");
  expect(route.indexOf("applyFunctionalBindings")).toBeGreaterThan(route.indexOf("applyExactAssetPlacement"));
  expect(route).toContain("functionalBindings");
});
