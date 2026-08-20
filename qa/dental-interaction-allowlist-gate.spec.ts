import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function text(path: string) {
  return readFile(`${root}/${path}`, "utf8");
}

test("dental visual certification runs interaction, live registry, multi-page identity and implant rendering before emitting runtime allowlist", async () => {
  const pkg = JSON.parse(await text("package.json"));
  const command = String(pkg.scripts?.["qa:dental-visual"] ?? "");
  const interactionSpec = "qa/dental-rendered-interaction-certification.spec.ts";
  const liveInteractionSpec = "qa/live-rendered-interaction-parity.spec.ts";
  const liveFunctionalSpec = "qa/live-functional-interaction-certification.spec.ts";
  const liveRegistrySpec = "qa/live-production-section-registry.spec.ts";
  const liveImplantSpec = "qa/live-implant-treatment-render-parity.spec.ts";
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
  const implantEvidenceContractSpec = "qa/dental-top20-implant-treatment-visual-evidence-contract.spec.ts";
  const interactionMaterializer = "node qa/certify-dental-interactions.mjs";
  const liveInteractionMaterializer = "node qa/certify-dental-live-interactions.mjs";
  const multipageMaterializer = "node qa/certify-dental-multipage.mjs";
  const implantTreatmentVisualMaterializer = "node qa/certify-dental-implant-treatment-visual.mjs";
  const allowlistCertifier = "node qa/certify-dental-top20-visual.mjs";

  for (const spec of [
    interactionSpec,
    liveInteractionSpec,
    liveFunctionalSpec,
    liveRegistrySpec,
    liveImplantSpec,
    gallerySpec,
    faqSpec,
    faqGenerationSpec,
    faqStructuredDataSpec,
    ...multipageSpecs,
    implantTreatmentVisualSpec,
    implantEvidenceContractSpec,
  ]) expect(command).toContain(spec);

  expect(command).toContain(interactionMaterializer);
  expect(command).toContain(liveInteractionMaterializer);
  expect(command).toContain(multipageMaterializer);
  expect(command).toContain(implantTreatmentVisualMaterializer);
  expect(command).toContain(allowlistCertifier);
  expect(command.indexOf(interactionSpec)).toBeLessThan(command.indexOf(interactionMaterializer));
  for (const spec of [liveInteractionSpec, liveFunctionalSpec, liveRegistrySpec, liveImplantSpec, gallerySpec, faqSpec, faqStructuredDataSpec]) {
    expect(command.indexOf(spec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  }
  for (const spec of multipageSpecs) expect(command.indexOf(spec)).toBeLessThan(command.indexOf(multipageMaterializer));
  expect(command.indexOf(implantTreatmentVisualSpec)).toBeLessThan(command.indexOf(implantTreatmentVisualMaterializer));
  expect(command.indexOf(implantEvidenceContractSpec)).toBeLessThan(command.indexOf(implantTreatmentVisualMaterializer));
  expect(command.indexOf(interactionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(liveInteractionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(multipageMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(implantTreatmentVisualMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
});

test("runtime allowlist certifier fails closed without same-commit live registry, blueprint identity and implant visual evidence", async () => {
  const source = await text("qa/certify-dental-top20-visual.mjs");

  expect(source).toContain("interaction-certification.json");
  expect(source).toContain("live-interaction-certification.json");
  expect(source).toContain("multipage-certification.json");
  expect(source).toContain("implant-treatment-visual-certification.json");
  expect(source).toContain("shared-dental-rendered-interaction-v1");
  expect(source).toContain("published-live-functional-gallery-faq-implant-render-v6");
  expect(source).toContain("dental-multipage-architecture-v1");
  expect(source).toContain("dental-top20-implant-treatment-six-viewport-v1");
  expect(source).toContain("liveInteractionCertification.schemaVersion !== 6");
  expect(source).toContain("qa/live-production-section-registry.spec.ts");
  expect(source).toContain("qa/live-implant-treatment-render-parity.spec.ts");
  expect(source).toContain("liveInteractionCertification.requiredChecks.length < 34");
  expect(source).toContain("qa/dental-multipage-layout-identity.spec.ts");
  expect(source).toContain("multipageCertification.schemaVersion !== 2");
  expect(source).toContain("multipageCertification.requiredChecks.length < 14");
  expect(source).toContain("implantTreatmentVisualCertification.schemaVersion !== 2");
  expect(source).toContain("implantTreatmentVisualCertification.sourceCommit !== currentSha");
  expect(source).toContain('implantTreatmentVisualCertification.sourceTest !== "qa/dental-top20-implant-treatment-visual-evidence.spec.ts"');
  expect(source).toContain("implantTreatmentVisualCertification.requiredChecks.length < 15");
  expect(source).toContain("interactionCertified: true");
  expect(source).toContain("liveInteractionCertified: true");
  expect(source).toContain("liveFunctionalInteractionCertified: true");
  expect(source).toContain("liveImplantRenderCertified: true");
  expect(source).toContain("multipageCertified: true");
  expect(source).toContain("implantTreatmentVisualCertified: true");
  expect(source).toContain("schemaVersion: 11");
  expect(source.indexOf("if (failures.length)")).toBeLessThan(source.indexOf("const runtimeAllowlist"));
});

test("the 120-render implant evidence has a bounded CI budget and records exact blueprint identity", async () => {
  const source = await text("qa/dental-top20-implant-treatment-visual-evidence.spec.ts");
  expect(source).toContain("test.setTimeout(1_200_000)");
  expect(source).toContain("20 layouts x 6 viewports");
  expect(source).toContain('layoutBlueprintId: root.dataset.miLayoutBlueprint ?? ""');
  expect(source).toContain('layoutArchetype: root.dataset.miLayoutArchetype ?? ""');
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

test("published live runtime uses shared gallery FAQ and fail-closed built-in section registries", async () => {
  const galleryRuntime = await text("packages/sections/src/gallery-lightbox-runtime.ts");
  const faqRuntime = await text("packages/sections/src/faq-accordion-runtime.ts");
  const liveRuntime = await text("packages/live-runtime/src/index.ts");
  const hostRuntime = await text("apps/live/live-runtime.ts");
  const productionRegistry = await text("packages/live-runtime/src/production-section-registry.ts");
  const preview = await text("apps/builder/app/renderer-preview.tsx");

  expect(galleryRuntime).toContain("installGalleryLightboxes");
  expect(faqRuntime).toContain("installFaqAccordions");
  expect(liveRuntime).toContain("galleryLightboxRuntimeScript()");
  expect(liveRuntime).toContain("faqAccordionRuntimeScript()");
  expect(preview).toContain("installGalleryLightboxes(root)");
  expect(preview).toContain("installFaqAccordions(root)");
  expect(hostRuntime).toContain("configured.registry.resolve(componentId, version)");
  expect(hostRuntime).toContain("?? builtInRegistry.resolve(componentId, version)");
  expect(productionRegistry).toContain('status: "production" as const');
  expect(productionRegistry).toContain('"data-mi-live-section": "built-in"');
});

test("production deployment verifies all 20 layouts include published implant rendering before secret upload", async () => {
  const workflow = await text(".github/workflows/deploy-builder.yml");

  expect(workflow).toContain("certification.schemaVersion !== 11");
  expect(workflow).toContain("certification.requiredInteractionContract !== 'shared-dental-rendered-interaction-v1'");
  expect(workflow).toContain("certification.requiredLiveInteractionContract !== 'published-live-functional-gallery-faq-implant-render-v6'");
  expect(workflow).toContain("certification.requiredMultipageContract !== 'dental-multipage-architecture-v1'");
  expect(workflow).toContain("certification.requiredTreatmentVisualContract !== 'dental-top20-implant-treatment-six-viewport-v1'");
  expect(workflow).toContain("entry.liveImplantRenderCertified !== true");
  expect(workflow).toContain("entry.multipageCertified !== true");
  expect(workflow).toContain("entry.implantTreatmentVisualCertified !== true");
  expect(workflow).toContain("All 20 runtime Dental layouts are homepage + published-live implant render + multi-page + six-viewport Dental Implants certified for this commit.");

  const verifyIndex = workflow.indexOf("Verify runtime Dental certification allowlist");
  const uploadIndex = workflow.indexOf("Upload rendered Dental certification allowlist to Builder Worker");
  expect(verifyIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(verifyIndex);
});

test("live Cloudflare deployment cannot run before registry and generated implant runtime parity checks", async () => {
  const workflow = await text(".github/workflows/deploy-live.yml");
  expect(workflow).toContain("qa/live-production-section-registry.spec.ts");
  expect(workflow).toContain("qa/live-implant-treatment-render-parity.spec.ts");
  expect(workflow).toContain("pnpm --filter @micirql/live-runtime typecheck");
  expect(workflow).toContain("pnpm --filter @micirql/live typecheck");
  const certifyIndex = workflow.indexOf("Certify published live registry, interaction, generated implant rendering, FAQ semantics, breadcrumbs and multi-page routing");
  const deployIndex = workflow.indexOf("Deploy micirql-live");
  expect(certifyIndex).toBeGreaterThanOrEqual(0);
  expect(deployIndex).toBeGreaterThan(certifyIndex);
});

test("Playwright config cannot silently filter implant, live registry or blueprint identity evidence named by Dental QA", async () => {
  const visualConfig = await text("playwright.dental-visual.config.ts");
  const blueprintConfig = await text("playwright.dental-blueprint.config.ts");

  for (const stem of [
    "dental-top20-implant-treatment-visual-evidence",
    "live-production-section-registry",
    "live-implant-treatment-render-parity",
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
