import fs from "node:fs";
import { deflateRawSync } from "node:zlib";
import { chromium } from "playwright";

const preparedPath = process.env.MICIRQL_PREPARED_REVISION_PATH?.trim() || "artifacts/persisted-publication-certification/prepared.json";
const baseUrl = (process.env.MICIRQL_CERTIFICATION_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const prepared = JSON.parse(fs.readFileSync(preparedPath, "utf8"));
const site = prepared.pendingV2;
if (!site || site.revision !== 2 || !site.fingerprint) throw new Error("Pending V2 materialized snapshot is missing.");
const encoded = deflateRawSync(Buffer.from(JSON.stringify(site), "utf8")).toString("base64url");
if (encoded.length > 60000) throw new Error("Pending revision is too large for the certification probe transport.");
const url = baseUrl + "/generated/revision-certification?snapshot=" + encoded;
const browser = await chromium.launch({ headless: true });
const failures = [];
let rendered = false;
let functional = false;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }});
  page.on("pageerror", (error) => failures.push("pageerror:" + error.message));
  page.on("response", (response) => { if (response.status() >= 400) failures.push("http:" + response.status() + ":" + response.url()); });
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) failures.push("navigation:" + (response?.status() ?? "no-response"));
  const root = page.locator("main[data-repair-scope="candidate"]");
  rendered = await root.count() === 1;
  if (!rendered) failures.push("published-render-root-missing");
  const fingerprintLocator = page.locator("[data-revision-certification-fingerprint]");
  const fingerprint = await fingerprintLocator.getAttribute("data-revision-certification-fingerprint", { timeout: 30000 });
  if (fingerprint !== site.fingerprint) failures.push("rendered-fingerprint-mismatch");
  const bodyText = (await page.locator("body").innerText()).trim();
  if (bodyText.length < 40) failures.push("rendered-content-empty");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  if (overflow) failures.push("horizontal-overflow");
  functional = rendered && failures.length === 0;
} finally { await browser.close(); }
if (!functional) throw new Error("Exact pending V2 revision audit failed: " + failures.join("; "));
console.log(JSON.stringify({ revision: site.revision, fingerprint: site.fingerprint, rendered, functional, transport: "deflate-raw-base64url" }, null, 2));
