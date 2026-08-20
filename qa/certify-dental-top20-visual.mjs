import { appendFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const evidenceDirectory = path.join(root, "test-results", "dental-top20-visual-evidence");
const evidencePath = path.join(evidenceDirectory, "report.json");
const certificationPath = path.join(evidenceDirectory, "certification.json");
const interactionCertificationPath = path.join(evidenceDirectory, "interaction-certification.json");
const liveInteractionCertificationPath = path.join(evidenceDirectory, "live-interaction-certification.json");
const multipageCertificationPath = path.join(evidenceDirectory, "multipage-certification.json");
const implantTreatmentVisualCertificationPath = path.join(evidenceDirectory, "implant-treatment-visual-certification.json");
const runtimeEnvPath = path.join(evidenceDirectory, "runtime-certification.env");
const requiredViewports = ["mobile-360", "mobile-390", "mobile-430", "tablet-768", "desktop-1024", "desktop-1440"];
const requiredInteractionContract = "shared-dental-rendered-interaction-v1";
const requiredLiveInteractionContract = "published-live-functional-gallery-faq-implant-render-v6";
const requiredMultipageContract = "dental-multipage-architecture-v1";
const requiredTreatmentVisualContract = "dental-top20-implant-treatment-six-viewport-v1";
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const failures = [];
let interactionCertification = null;
let liveInteractionCertification = null;
let multipageCertification = null;
let implantTreatmentVisualCertification = null;

try {
  interactionCertification = JSON.parse(await readFile(interactionCertificationPath, "utf8"));
} catch {
  failures.push("Rendered Dental interaction certification is missing; runtime allowlist cannot be emitted.");
}

if (interactionCertification) {
  if (interactionCertification.certified !== true) failures.push("Rendered Dental interaction certification did not pass.");
  if (interactionCertification.sourceCommit !== currentSha) {
    failures.push(`Rendered Dental interaction certification is stale (${interactionCertification.sourceCommit ?? "unknown"}); expected ${currentSha}.`);
  }
  if (interactionCertification.contract !== requiredInteractionContract) {
    failures.push(`Unexpected rendered interaction contract ${interactionCertification.contract ?? "missing"}.`);
  }
  if (!Array.isArray(interactionCertification.requiredChecks) || interactionCertification.requiredChecks.length < 8) {
    failures.push("Rendered Dental interaction certification is incomplete.");
  }
}

try {
  liveInteractionCertification = JSON.parse(await readFile(liveInteractionCertificationPath, "utf8"));
} catch {
  failures.push("Published live Dental interaction certification is missing; runtime allowlist cannot be emitted.");
}

if (liveInteractionCertification) {
  if (liveInteractionCertification.schemaVersion !== 6) failures.push(`Unexpected published live certification schema ${liveInteractionCertification.schemaVersion ?? "missing"}.`);
  if (liveInteractionCertification.certified !== true) failures.push("Published live Dental interaction certification did not pass.");
  if (liveInteractionCertification.sourceCommit !== currentSha) {
    failures.push(`Published live Dental interaction certification is stale (${liveInteractionCertification.sourceCommit ?? "unknown"}); expected ${currentSha}.`);
  }
  if (liveInteractionCertification.contract !== requiredLiveInteractionContract) {
    failures.push(`Unexpected published live interaction contract ${liveInteractionCertification.contract ?? "missing"}.`);
  }
  if (liveInteractionCertification.surface !== "published-live-runtime") {
    failures.push(`Unexpected published interaction surface ${liveInteractionCertification.surface ?? "missing"}.`);
  }
  const requiredLiveTests = [
    "qa/live-functional-interaction-certification.spec.ts",
    "qa/live-production-section-registry.spec.ts",
    "qa/live-implant-treatment-render-parity.spec.ts",
    "qa/gallery-lightbox-certification.spec.ts",
    "qa/faq-accordion-certification.spec.ts",
    "qa/faq-structured-data-parity.spec.ts",
  ];
  for (const sourceTest of requiredLiveTests) {
    if (!Array.isArray(liveInteractionCertification.sourceTests) || !liveInteractionCertification.sourceTests.includes(sourceTest)) {
      failures.push(`Published live Dental test evidence is missing: ${sourceTest}.`);
    }
  }
  if (!Array.isArray(liveInteractionCertification.requiredChecks) || liveInteractionCertification.requiredChecks.length < 34) {
    failures.push("Published live Dental functional/gallery/FAQ/structured-data/registry/implant-render certification is incomplete.");
  }
}

try {
  multipageCertification = JSON.parse(await readFile(multipageCertificationPath, "utf8"));
} catch {
  failures.push("Dental multi-page architecture certification is missing; runtime allowlist cannot be emitted.");
}

if (multipageCertification) {
  if (multipageCertification.schemaVersion !== 2) failures.push(`Unexpected Dental multi-page certification schema ${multipageCertification.schemaVersion ?? "missing"}.`);
  if (multipageCertification.certified !== true) failures.push("Dental multi-page architecture certification did not pass.");
  if (multipageCertification.sourceCommit !== currentSha) {
    failures.push(`Dental multi-page architecture certification is stale (${multipageCertification.sourceCommit ?? "unknown"}); expected ${currentSha}.`);
  }
  if (multipageCertification.contract !== requiredMultipageContract) {
    failures.push(`Unexpected Dental multi-page contract ${multipageCertification.contract ?? "missing"}.`);
  }
  if (multipageCertification.surface !== "generated-site-architecture") {
    failures.push(`Unexpected Dental multi-page certification surface ${multipageCertification.surface ?? "missing"}.`);
  }
  const requiredMultipageTests = [
    "qa/dental-multipage-architecture.spec.ts",
    "qa/dental-multipage-media-safety.spec.ts",
    "qa/dental-multipage-layout-identity.spec.ts",
    "qa/dental-breadcrumb-structured-data.spec.ts",
    "qa/dental-multipage-live-routing.spec.ts",
  ];
  for (const sourceTest of requiredMultipageTests) {
    if (!Array.isArray(multipageCertification.sourceTests) || !multipageCertification.sourceTests.includes(sourceTest)) {
      failures.push(`Dental multi-page test evidence is missing: ${sourceTest}.`);
    }
  }
  if (!Array.isArray(multipageCertification.requiredChecks) || multipageCertification.requiredChecks.length < 14) {
    failures.push("Dental multi-page architecture/blueprint-identity certification is incomplete.");
  }
}

try {
  implantTreatmentVisualCertification = JSON.parse(await readFile(implantTreatmentVisualCertificationPath, "utf8"));
} catch {
  failures.push("Dental Implants six-viewport treatment visual certification is missing; runtime allowlist cannot be emitted.");
}

if (implantTreatmentVisualCertification) {
  if (implantTreatmentVisualCertification.schemaVersion !== 2) {
    failures.push(`Unexpected Dental Implants treatment visual certification schema ${implantTreatmentVisualCertification.schemaVersion ?? "missing"}.`);
  }
  if (implantTreatmentVisualCertification.certified !== true) failures.push("Dental Implants treatment visual certification did not pass.");
  if (implantTreatmentVisualCertification.sourceCommit !== currentSha) {
    failures.push(`Dental Implants treatment visual certification is stale (${implantTreatmentVisualCertification.sourceCommit ?? "unknown"}); expected ${currentSha}.`);
  }
  if (implantTreatmentVisualCertification.contract !== requiredTreatmentVisualContract) {
    failures.push(`Unexpected Dental Implants treatment visual contract ${implantTreatmentVisualCertification.contract ?? "missing"}.`);
  }
  if (implantTreatmentVisualCertification.surface !== "builder-preview-treatment-page") {
    failures.push(`Unexpected Dental Implants visual certification surface ${implantTreatmentVisualCertification.surface ?? "missing"}.`);
  }
  if (implantTreatmentVisualCertification.treatmentPath !== "/treatments/dental-implants") {
    failures.push(`Unexpected certified Dental treatment path ${implantTreatmentVisualCertification.treatmentPath ?? "missing"}.`);
  }
  if (implantTreatmentVisualCertification.sourceTest !== "qa/dental-top20-implant-treatment-visual-evidence.spec.ts") {
    failures.push(`Unexpected Dental Implants visual source test ${implantTreatmentVisualCertification.sourceTest ?? "missing"}.`);
  }
  if (!Array.isArray(implantTreatmentVisualCertification.requiredViewports) || requiredViewports.some((viewport) => !implantTreatmentVisualCertification.requiredViewports.includes(viewport))) {
    failures.push("Dental Implants treatment visual certification does not cover all six required viewports.");
  }
  if (!Array.isArray(implantTreatmentVisualCertification.certifiedLayoutIds) || implantTreatmentVisualCertification.certifiedLayoutIds.length !== 20) {
    failures.push("Dental Implants treatment visual certification does not contain all 20 layouts.");
  }
  if (!Array.isArray(implantTreatmentVisualCertification.requiredChecks) || implantTreatmentVisualCertification.requiredChecks.length < 15) {
    failures.push("Dental Implants treatment visual certification is incomplete.");
  }
}

if (evidence.layouts !== 20 || !Array.isArray(evidence.report) || evidence.report.length !== 20) {
  failures.push(`Expected 20 rendered Dental layouts, received ${evidence.report?.length ?? 0}.`);
}

for (const layout of evidence.report ?? []) {
  const viewports = layout.viewports ?? {};
  for (const viewportId of requiredViewports) {
    const metrics = viewports[viewportId];
    if (!metrics) {
      failures.push(`${layout.layoutId}: missing rendered evidence for ${viewportId}.`);
      continue;
    }
    const hardMetrics = [
      ["overflowCount", metrics.overflowCount],
      ["clippedTextCount", metrics.clippedTextCount],
      ["distortedImageCount", metrics.distortedImageCount],
      ["malformedControlCount", metrics.malformedControlCount],
      ["collisionCount", metrics.collisionCount],
      ["wrappedActionCount", metrics.wrappedActionCount],
    ];
    if (viewportId.startsWith("mobile-")) {
      hardMetrics.push(["tooSmallActions", metrics.tooSmallActions], ["oversizedSectionCount", metrics.oversizedSectionCount]);
    }
    for (const [name, value] of hardMetrics) {
      if (value !== 0) failures.push(`${layout.layoutId}/${viewportId}: ${name}=${String(value)}.`);
    }
    if (typeof metrics.scrollWidth !== "number" || typeof metrics.clientWidth !== "number" || metrics.scrollWidth > metrics.clientWidth + 1) {
      failures.push(`${layout.layoutId}/${viewportId}: document overflow ${metrics.scrollWidth}/${metrics.clientWidth}.`);
    }
  }
}

const uniqueIds = new Set((evidence.report ?? []).map((entry) => entry.layoutId));
if (uniqueIds.size !== 20) failures.push(`Expected 20 unique rendered layout IDs, received ${uniqueIds.size}.`);
if (implantTreatmentVisualCertification?.certifiedLayoutIds) {
  const implantIds = new Set(implantTreatmentVisualCertification.certifiedLayoutIds);
  for (const layoutId of uniqueIds) if (!implantIds.has(layoutId)) failures.push(`${layoutId}: missing Dental Implants treatment visual certification.`);
}

if (failures.length) {
  console.error("Dental Top-20 rendered certification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const certifiedLayoutIds = (evidence.report ?? []).map((entry) => entry.layoutId).sort();
const runtimeAllowlist = certifiedLayoutIds.join(",");
const certification = {
  schemaVersion: 11,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  evidenceFile: "test-results/dental-top20-visual-evidence/report.json",
  interactionEvidenceFile: "test-results/dental-top20-visual-evidence/interaction-certification.json",
  liveInteractionEvidenceFile: "test-results/dental-top20-visual-evidence/live-interaction-certification.json",
  multipageEvidenceFile: "test-results/dental-top20-visual-evidence/multipage-certification.json",
  treatmentVisualEvidenceFile: "test-results/dental-top20-visual-evidence/implant-treatment-visual-certification.json",
  requiredViewports,
  requiredInteractionContract,
  requiredLiveInteractionContract,
  requiredMultipageContract,
  requiredTreatmentVisualContract,
  runtimeEnvironmentKey: "MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS",
  certifiedLayoutIds,
  layouts: certifiedLayoutIds.map((layoutId) => ({
    layoutId,
    passed: true,
    interactionCertified: true,
    liveInteractionCertified: true,
    liveFunctionalInteractionCertified: true,
    liveImplantRenderCertified: true,
    galleryInteractionCertified: true,
    faqInteractionCertified: true,
    faqStructuredDataCertified: true,
    multipageCertified: true,
    implantTreatmentVisualCertified: true,
  })),
  hardGates: [
    "no document overflow",
    "no child escape",
    "no clipped text",
    "no distorted images",
    "no malformed controls",
    "no text/control collisions",
    "no wrapped CTA labels",
    "mobile touch targets >= 44px",
    "no abnormally tall mobile sections",
    "rendered interaction contract certified for the same source commit",
    "published live functional/gallery/FAQ/structured-data/registry/implant-render contract certified for the same source commit",
    "published live host resolves built-in generated section components instead of failing COMPONENT_NOT_FOUND",
    "published live built-in registry remains fail-closed for unknown IDs and unsupported versions",
    "published Dental Implants runtime retains blueprint identity section identity canonical SEO breadcrumbs FAQ and conversion routes",
    "Dental multi-page architecture contract certified for the same source commit",
    "certified homepage blueprint identity remains authoritative across generated treatment and contact pages",
    "Builder Preview exposes the same layout identity root used by published rendering",
    "Dental Implants treatment page rendered across all 20 layouts and six required viewports for the same source commit",
    "Dental Implants treatment page has no overflow, clipped copy, section overlap or malformed controls",
    "Dental Implants treatment page has safe imagery and no empty hero media placeholder",
    "Dental Implants visible breadcrumb, FAQ and consultation routes survive rendered output",
    "only explicitly requested Dental treatments create dedicated pages",
    "general-only Dental briefs remain single-page",
    "treatment routes and contact route are unique and idempotent",
    "treatment pages have canonical indexable treatment-specific SEO metadata",
    "homepage service cards and global navigation link to generated treatment pages",
    "treatment pages link to the consultation page and stable homepage treatment anchor",
    "visible treatment breadcrumbs mirror BreadcrumbList structured data",
    "mobile treatment breadcrumbs remain genuine touch targets",
    "empty treatment hero media slots cannot reach production",
    "published runtime resolves generated page paths without homepage fallback",
    "published sitemap includes every indexable generated Site page",
    "visible keyboard focus treatment",
    "restrained pointer feedback without layout-jank transitions",
    "operable viewport-contained mobile navigation",
    "keyboard-operable desktop dropdown navigation with safe destinations",
    "appointment forms enforce required fields before POST",
    "valid appointment forms submit the required action payload",
    "success and validation-error responses are announced via aria-live status",
    "gallery lightboxes are keyboard operable with ArrowLeft/ArrowRight and Escape",
    "gallery close restores focus to the invoking image trigger",
    "gallery controls are mobile-sized and viewport-contained",
    "gallery swipe navigation requires deliberate horizontal intent",
    "FAQ disclosures keep native open state and aria-expanded synchronized",
    "FAQ single/multi disclosure modes are deterministic",
    "FAQ summaries support ArrowUp/ArrowDown/Home/End focus navigation",
    "FAQ deep links open the addressed answer",
    "FAQ summaries remain touch-sized, overflow-safe and reduced-motion compliant",
    "FAQPage JSON-LD exactly mirrors valid visible FAQ questions and answers",
    "hidden malformed and duplicate FAQ entries cannot create misleading structured data",
    "prefers-reduced-motion removes meaningful movement in preview and published runtime",
  ],
};

await writeFile(certificationPath, JSON.stringify(certification, null, 2), "utf8");
await writeFile(runtimeEnvPath, `MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS=${runtimeAllowlist}\n`, "utf8");
if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS=${runtimeAllowlist}\n`, "utf8");
console.log(`Certified ${certifiedLayoutIds.length} Dental layouts against homepage and Dental Implants six-viewport rendering plus Builder, published-live registry/implant rendering and cross-page blueprint-identity contracts for ${currentSha}.`);
