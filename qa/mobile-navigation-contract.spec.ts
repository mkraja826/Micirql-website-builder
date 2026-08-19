import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shell = fs.readFileSync(path.join(root, "packages/sections/src/shell-sections.tsx"), "utf8");
const shellCss = fs.readFileSync(path.join(root, "packages/sections/src/shell-styles.css"), "utf8");
const premiumMobile = fs.readFileSync(path.join(root, "packages/sections/src/premium-mobile.css"), "utf8");

test("structural navbar always includes an accessible mobile menu trigger", () => {
  expect(shell).toContain('className="mi-mobile-nav"');
  expect(shell).toContain('className="mi-burger"');
  expect(shell).toContain('aria-label="Open navigation menu"');
  expect(shell).toContain('aria-label="Mobile navigation"');
});

test("mobile CSS makes the burger visible and touch-safe", () => {
  expect(shellCss).toContain("@media(max-width:47.99rem)");
  expect(shellCss).toContain(".mi-mobile-nav{display:block");
  expect(shellCss).toContain(".mi-burger{display:flex");
  expect(premiumMobile).toContain(".mi-shell-navbar .mi-mobile-nav{display:block!important");
  expect(premiumMobile).toContain(".mi-shell-navbar .mi-burger{display:flex!important");
  expect(premiumMobile).toContain("width:44px!important;height:44px!important");
});
