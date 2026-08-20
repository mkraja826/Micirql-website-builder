import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function text(path: string) {
  return readFile(`${root}/${path}`, "utf8");
}

test("dental visual certification runs interaction, multi-page identity and implant treatment rendering before emitting runtime allowlist", async () => {
  const pkg = JSON.parse(await text("package.json"));
  const command = String(pkg.scripts?.["qa:dental-visual"] ?? "");
  const interactionSpec = "qa/dental-rendered-interaction-certification.spec.ts";
  const liveInteractionSpec = "qa/live-rendered-interaction-parity.spec.ts";
  const liveFunctionalSpec = "qa/live-functional-interaction-certification.spec.ts";
  const gallerySpec = "qa/gallery-lightbox-certification.spec.ts";
  const faqSpec = "qa/faq-accordion-certification.spec.ts";
  const faqGenerationSpec = "qa/dental-faq-generation-intelligence.spec.ts";
  const faqStructuredDataSpec = "qa/faq-structured-data-parity.spec.ts";
  const multipageSpecs = [
    "qa/dental-multipage-architecture.spec.ts",
    "qa/dental-multipage-media-safety.spec.ts",
    "qa/dental-multipage-layout-identity.spec.ts",
    "qa/dental-breadcrumb-structured-data.spec.ts",
    "qa/dental-multipage-live-routing.spec.ts",
  ];
  const implantTreatmentVisualSpec = "qa/dental-top20-implant-treatment-visual-evidence.spec.ts";
  const interactionMaterializer = "node qa/certify-dental-interactions.mjs";
  const liveInteractionMaterializer = "node qa/certify-dental-live-interactions.mjs";
  const multipageMaterializer = "node qa/certify-dental-multipage.mjs";
  const implantTreatmentVisualMaterializer = "node qa/certify-dental-implant-treatment-visual.mjs";
  const allowlistCertifier = "node qa/certify-dental-top20-visual.mjs";

  for (const spec of [interactionSpec, liveInteractionSpec, liveFunctionalSpec, gallerySpec, faqSpec, faqGenerationSpec, faqStructuredDataSpec, ...multipageSpecs, implantTreatmentVisualSpec]) {
    expect(command).toContain(spec);
  }
  expect(command).toContain(interactionMaterializer);
  expect(command).toContain(liveInteractionMaterializer);
  expect(command).toContain(multipageMaterializer);
  expect(command).toContain(implantTreatmentVisualMaterializer);
  expect(command).toContain(allowlistCertifier);
  expect(command.indexOf(interactionSpec)).toBeLessThan(command.indexOf(interactionMaterializer));
  expect(command.indexOf(liveInteractionSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(liveFunctionalSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(gallerySpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(faqSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(faqStructuredDataSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  for (const spec of multipageSpecs) expect(command.indexOf(spec)).toBeLessThan(command.indexOf(multipageMaterializer));
  expect(command.indexOf(implantTreatmentVisualSpec)).toBeLessThan(command.indexOf(implantTreatmentVisualMaterializer));
  expect(command.indexOf(interactionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(liveInteractionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(multipageMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(implantTreatmentVisualMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
});

test("runtime allowlist certifier fails closed without same-commit interaction, blueprint identity and implant treatment visual evidence", async () => {
  const source = await text("qa/certify-dental-top20-visual.mjs");

  expect(source).toContain("interaction-certification.json");
  expect(source).toContain("live-interaction-certification.json");
  expect(source).toContain("multipage-certification.json");
  expect(source).toContain("implant-treatment-visual-certification.json");
  expect(source).toContain("shared-dental-rendered-interaction-v1");
  expect(source).toContain("published-live-functional-gallery-faq-structured-data-v5");
  expect(source).toContain("dental-multipage-architecture-v1");
  expect(source).toContain("dental-top20-implant-treatment-six-viewport-v1");
  expect(source).toContain("qa/live-functional-interaction-certification.spec.ts");
  expect(source).toContain("qa/gallery-lightbox-certification.spec.ts");
  expect(source).toContain("qa/faq-accordion-certification.spec.ts");
  expect(source).toContain("qa/faq-structured-data-parity.spec.ts");
  expect(source).toContain("qa/dental-multipage-architecture.spec.ts");
  expect(source).toContain("qa/dental-multipage-media-safety.spec.ts");
  expect(source).toContain("qa/dental-multipage-layout-identity.spec.ts");
  expect(source).toContain("qa/dental-breadcrumb-structured-data.spec.ts");
  expect(source).toContain("qa/dental-multipage-live-routing.spec.ts");
  expect(source).toContain("interactionCertification.sourceCommit !== currentSha");
  expect(source).toContain("liveInteractionCertification.sourceCommit !== currentSha");
  expect(source).toContain("multipageCertification.sourceCommit !== currentSha");
  expect(source).toContain("multipageCertification.schemaVersion !== 2");
  expect(source).toContain("multipageCertification.requiredChecks.length < 14");
  expect(source).toContain("implantTreatmentVisualCertification.sourceCommit !== currentSha");
  expect(source).toContain("Dental multi-page architecture certification is missing; runtime allowlist cannot be emitted.");
  expect(source).toContain("Dental Implants six-viewport treatment visual certification is missing; runtime allowlist cannot be emitted.");
  expect(source).toContain("interactionCertified: true");
  expect(source).toContain("liveInteractionCertified: true");
  expect(source).toContain("liveFunctionalInteractionCertified: true");
  expect(source).toContain("galleryInteractionCertified: true");
  expect(source).toContain("faqInteractionCertified: true");
  expect(source).toContain("faqStructuredDataCertified: true");
  expect(source).toContain("multipageCertified: true");
  expect(source).toContain("implantTreatmentVisualCertified: true");
  expect(source).toContain("schemaVersion: 10");
  expect(source.indexOf("if (failures.length)")).toBeLessThan(source.indexOf("const runtimeAllowlist"));
});

test("published FAQ and breadcrumb structured data derive from the same visible renderer content", async () => {
  const faqStructuredDataSpec = await text("qa/faq-structured-data-parity.spec.ts");
  const breadcrumbSpec = await text("qa/dental-breadcrumb-structured-data.spec.ts");
  const rendererSeo = await text("packages/renderer/src/seo.ts");
  const sections = await text("packages/sections/src/sections.tsx");

  expect(faqStructuredDataSpec).toContain("exact trimmed visible questions and answers");
  expect(rendererSeo).toContain("visibleFaqStructuredData(page)");
  expect(rendererSeo).toContain('"@type": "FAQPage"');
  expect(rendererSeo).toContain("section.hidden || !isFaqComponent");
  expect(breadcrumbSpec).toContain("exact visible hero breadcrumb order");
  expect(rendererSeo).toContain("visibleBreadcrumbStructuredData(page, canonicalOrigin)");
  expect(rendererSeo).toContain('"@type": "BreadcrumbList"');
  expect(sections).toContain('className="mi-breadcrumbs"');
  expect(sections).toContain('aria-label="Breadcrumb"');
});

test("published gallery and FAQ interactions use shared runtimes", async () => {
  const interactionSpec = await text("qa/live-rendered-interaction-parity.spec.ts");
  const functionalSpec = await text("qa/live-functional-interaction-certification.spec.ts");
  const gallerySpec = await text("qa/gallery-lightbox-certification.spec.ts");
  const faqSpec = await text("qa/faq-accordion-certification.spec.ts");
  const galleryRuntime = await text("packages/sections/src/gallery-lightbox-runtime.ts");
  const faqRuntime = await text("packages/sections/src/faq-accordion-runtime.ts");
  const liveRuntime = await text("packages/live-runtime/src/index.ts");
  const preview = await text("apps/builder/app/renderer-preview.tsx");
  const generator = await text("apps/live/scripts/build-runtime-css.mjs");
  const route = await text("apps/live/app/__micirql/runtime.css/route.ts");

  expect(interactionSpec).toContain("@micirql/live");
  expect(interactionSpec).toContain("generate:runtime-css");
  expect(functionalSpec).toContain("packages/live-runtime/src/index.ts");
  expect(functionalSpec).toContain("publishedFormFeedbackScript");
  expect(functionalSpec).toContain("appointment.request");
  expect(functionalSpec).toContain("data-mi-form-status");
  expect(gallerySpec).toContain("galleryLightboxRuntimeScript");
  expect(gallerySpec).toContain("ArrowRight");
  expect(gallerySpec).toContain("Escape");
  expect(gallerySpec).toContain("new Touch");
  expect(galleryRuntime).toContain("installGalleryLightboxes");
  expect(galleryRuntime).toContain("Math.abs(dx) < 48");
  expect(faqSpec).toContain("faqAccordionRuntimeScript");
  expect(faqSpec).toContain("ArrowDown");
  expect(faqSpec).toContain("deep links open the addressed answer");
  expect(faqRuntime).toContain("installFaqAccordions");
  expect(faqRuntime).toContain("aria-expanded");
  expect(faqRuntime).toContain("hashchange");
  expect(liveRuntime).toContain("galleryLightboxRuntimeScript()");
  expect(liveRuntime).toContain("faqAccordionRuntimeScript()");
  expect(preview).toContain("installGalleryLightboxes(root)");
  expect(preview).toContain("installFaqAccordions(root)");
  expect(generator).toContain('"packages/sections/src/gallery-lightbox.css"');
  expect(generator).toContain('"packages/sections/src/faq-accordion.css"');
  expect(route).toContain("MICIRQL_RUNTIME_CSS");
});

test("production deployment verifies all 20 layouts include implant treatment visual certification before secret upload", async () => {
  const workflow = await text(".github/workflows/deploy-builder.yml");

  expect(workflow).toContain("certification.requiredInteractionContract !== 'shared-dental-rendered-interaction-v1'");
  expect(workflow).toContain("certification.requiredLiveInteractionContract !== 'published-live-functional-gallery-faq-structured-data-v5'");
  expect(workflow).toContain("certification.requiredMultipageContract !== 'dental-multipage-architecture-v1'");
  expect(workflow).toContain("certification.requiredTreatmentVisualContract !== 'dental-top20-implant-treatment-six-viewport-v1'");
  expect(workflow).toContain("entry.interactionCertified !== true");
  expect(workflow).toContain("entry.liveInteractionCertified !== true");
  expect(workflow).toContain("entry.liveFunctionalInteractionCertified !== true");
  expect(workflow).toContain("entry.galleryInteractionCertified !== true");
  expect(workflow).toContain("entry.faqInteractionCertified !== true");
  expect(workflow).toContain("entry.faqStructuredDataCertified !== true");
  expect(workflow).toContain("entry.multipageCertified !== true");
  expect(workflow).toContain("entry.implantTreatmentVisualCertified !== true");
  expect(workflow).toContain("All 20 runtime Dental layouts are homepage + published-live + multi-page + six-viewport Dental Implants certified for this commit.");

  const verifyIndex = workflow.indexOf("Verify runtime Dental certification allowlist");
  const uploadIndex = workflow.indexOf("Upload rendered Dental certification allowlist to Builder Worker");
  expect(verifyIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(verifyIndex);
});

test("live Cloudflare deployment cannot run before FAQ, breadcrumb and multi-page routing parity checks", async () => {
  const workflow = await text(".github/workflows/deploy-live.yml");
  expect(workflow).toContain("qa/live-rendered-interaction-parity.spec.ts");
  expect(workflow).toContain("qa/live-functional-interaction-certification.spec.ts");
  expect(workflow).toContain("qa/gallery-lightbox-certification.spec.ts");
  expect(workflow).toContain("qa/faq-accordion-certification.spec.ts");
  expect(workflow).toContain("qa/faq-structured-data-parity.spec.ts");
  expect(workflow).toContain("qa/dental-breadcrumb-structured-data.spec.ts");
  expect(workflow).toContain("qa/dental-multipage-live-routing.spec.ts");
  const certifyIndex = workflow.indexOf("Certify published live interaction, FAQ semantics, breadcrumbs and multi-page routing");
  const deployIndex = workflow.indexOf("Deploy micirql-live");
  expect(certifyIndex).toBeGreaterThanOrEqual(0);
  expect(deployIndex).toBeGreaterThan(certifyIndex);
});

test("Playwright config cannot silently filter the implant treatment and blueprint identity evidence files named by Dental QA", async () => {
  const visualConfig = await text("playwright.dental-visual.config.ts");
  const blueprintConfig = await text("playwright.dental-blueprint.config.ts");

  for (const stem of [
    "dental-top20-implant-treatment-visual-evidence",
    "dental-rendered-interaction-certification",
    "live-rendered-interaction-parity",
    "live-functional-interaction-certification",
    "gallery-lightbox-certification",
    "faq-accordion-certification",
    "dental-faq-generation-intelligence",
    "faq-structured-data-parity",
    "dental-multipage-architecture",
    "dental-multipage-media-safety",
    "dental-multipage-layout-identity",
    "dental-breadcrumb-structured-data",
    "dental-multipage-live-routing",
    "dental-interaction-allowlist-gate",
  ]) expect(visualConfig).toContain(stem);

  expect(blueprintConfig).toContain("testMatch: /.*\\.spec\\.ts/");
});
