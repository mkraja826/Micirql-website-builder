import fs from "node:fs";
import { hydrateMaterializedSite, materializeSiteDraft, materializeSiteRevision, serializeMaterializedSite } from "../src/core/materialization/materializer";
import type { PublishableDraft } from "../src/core/publish/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const draftV1: PublishableDraft = {
  version: "1.0",
  candidateId: "candidate-01",
  readiness: "ready",
  pages: [{ slug: "home", title: "Lifecycle Fixture", sectionOrder: ["hero"], contentSectionTypes: ["hero"] }],
  content: {
    version: "1.0",
    pages: [{
      slug: "home",
      title: "Lifecycle Fixture",
      purpose: "Certify immutable materialized revision behavior.",
      sections: [{ sectionType: "hero", eyebrow: "Certified", headline: "Version one", body: "Original persisted content.", claims: [] }],
    }],
    seo: { title: "Lifecycle Fixture", description: "Immutable revision lifecycle fixture." },
    imageIntents: [],
    warnings: [],
  },
  media: [],
  selectedSections: { hero: "hero-lifecycle" },
  theme: {
    version: "1.0",
    typography: { displayFamily: "Arial, Helvetica, sans-serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 700, bodyWeight: 400, headingTracking: "-0.04em", bodyTracking: "0em", headingScale: "balanced" },
    color: { background: "#ffffff", surface: "#f7f7f7", surfaceStrong: "#eeeeee", text: "#111111", textMuted: "#666666", accent: "#2455a6", accentContrast: "#ffffff", border: "#dddddd" },
    spacing: { base: 8, sectionY: 80, contentGap: 24, compactGap: 12, maxWidth: 1200 },
    shape: { radius: "subtle", borderWeight: 1 },
    surface: { treatment: "quiet", shadow: "subtle" },
    density: "medium",
    motion: { intensity: "subtle", durationMs: 200, easing: "ease-out" },
  },
  cssVariables: { "--background": "#ffffff", "--foreground": "#111111" },
  primaryCapability: "contact",
  capabilities: [{ id: "contact", label: "Contact", state: "active", href: "#contact", reason: "Certified fixture" }],
  blockers: [],
  warnings: [],
  source: { contentVersion: "1.0" },
};

const v1 = materializeSiteDraft({ sourceKey: "revision-lifecycle", draft: draftV1 });
const serializedV1Before = serializeMaterializedSite(v1);
const fingerprintV1 = v1.fingerprint;

const draftV2 = structuredClone(draftV1);
draftV2.content.pages[0]!.sections[0] = { ...draftV2.content.pages[0]!.sections[0], headline: "Version two", body: "Edited persisted content." };

const v2 = materializeSiteRevision({ previous: v1, draft: draftV2 });
const hydratedV1 = hydrateMaterializedSite(serializedV1Before);
const hydratedV2 = hydrateMaterializedSite(serializeMaterializedSite(v2));

assert(v1.revision === 1, "V1 must remain revision 1.");
assert(v2.revision === 2, "V2 must be revision 2.");
assert(v2.siteId === v1.siteId, "V2 must preserve logical site identity.");
assert(v2.fingerprint !== fingerprintV1, "Edited V2 must have an independent fingerprint.");
assert(hydratedV1.fingerprint === fingerprintV1, "Hydrated V1 fingerprint changed after V2 creation.");
assert(serializeMaterializedSite(v1) === serializedV1Before, "V1 mutated while deriving V2.");
assert(hydratedV2.fingerprint === v2.fingerprint, "V2 did not survive serialization/hydration exactly.");

let published = hydratedV1;
assert(published.fingerprint === fingerprintV1, "Initial V1 publication mismatch.");
published = hydratedV2;
assert(published.revision === 2 && published.fingerprint === v2.fingerprint, "V2 publication mismatch.");
published = hydratedV1;
assert(published.revision === 1, "Rollback did not restore revision 1.");
assert(published.fingerprint === fingerprintV1, "Rollback did not restore the exact V1 fingerprint.");
assert(serializeMaterializedSite(published) === serializedV1Before, "Rollback V1 bytes differ from the original immutable snapshot.");

const report = {
  contract: "materialized-revision-lifecycle-v1",
  siteId: v1.siteId,
  v1: { revision: v1.revision, fingerprint: v1.fingerprint },
  v2: { revision: v2.revision, fingerprint: v2.fingerprint },
  rollback: { revision: published.revision, fingerprint: published.fingerprint, exactSerializedRestore: true },
  assertions: { sameSiteIdentity: true, independentV2Fingerprint: true, immutableV1: true, exactHydration: true, exactRollback: true },
};
fs.mkdirSync("artifacts/materialized-revision-lifecycle", { recursive: true });
fs.writeFileSync("artifacts/materialized-revision-lifecycle/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
