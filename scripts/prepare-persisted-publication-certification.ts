import fs from "node:fs";
import { hydrateMaterializedSite, materializeSiteRevision } from "../src/core/materialization/materializer";
import type { CertifiedMaterializedSite } from "../src/core/certification/schema";
import type { PublishableDraft } from "../src/core/publish/schema";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const sourcePath = process.env.MICIRQL_MATERIALIZED_WINNERS_PATH?.trim() || "artifacts/real-certification-materialized-winners/report.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as { fixtures: Array<{ fixture: string; winner: CertifiedMaterializedSite["winner"]; site: CertifiedMaterializedSite["site"]; repair: { evidenceState: string; accepted: boolean } }> };
const requestedFixture = process.env.MICIRQL_PERSISTENCE_FIXTURE?.trim();
const fixture = requestedFixture ? source.fixtures.find((item) => item.fixture === requestedFixture) : source.fixtures[0];
assert(fixture, `Certified materialized fixture not found${requestedFixture ? `: ${requestedFixture}` : ""}.`);
assert(fixture.repair.evidenceState === "post-repair" && fixture.repair.accepted === true, "Persistence certification requires accepted post-repair evidence.");
assert(fixture.winner.rank === 1 && fixture.winner.certification.hardFailureCount === 0 && fixture.winner.certification.repairAccepted, "Source winner is not fully certified.");

const v1Site = hydrateMaterializedSite(JSON.stringify(fixture.site));
assert(v1Site.revision === 1, "Source certified winner must be immutable V1.");
const v1: CertifiedMaterializedSite = { version: "1.0", site: v1Site, winner: fixture.winner, certifiedFingerprint: v1Site.fingerprint };

// Prepare the deterministic V2 snapshot, but never label it certified here. Any mutation,
// including a content-only edit, changes the immutable fingerprint and invalidates V1 evidence.
// A separate exact-snapshot revision certification stage must render/audit V2 and return a
// certification envelope whose certifiedFingerprint equals v2Site.fingerprint.
const draftV2: PublishableDraft = {
  version: v1Site.source.draftVersion,
  candidateId: v1Site.source.candidateId,
  readiness: "ready",
  pages: structuredClone(v1Site.snapshot.pages),
  content: structuredClone(v1Site.snapshot.content),
  media: structuredClone(v1Site.snapshot.media),
  selectedSections: structuredClone(v1Site.snapshot.selectedSections),
  theme: structuredClone(v1Site.snapshot.theme),
  cssVariables: structuredClone(v1Site.snapshot.cssVariables),
  ...(v1Site.snapshot.certifiedRepairCss ? { certifiedRepairCss: v1Site.snapshot.certifiedRepairCss } : {}),
  primaryCapability: structuredClone(v1Site.snapshot.primaryCapability),
  capabilities: structuredClone(v1Site.snapshot.capabilities),
  blockers: [],
  warnings: [...v1Site.snapshot.warnings],
  source: { contentVersion: v1Site.snapshot.content.version },
};
const editableKeys = ["heading", "body", "title", "eyebrow"];
const editableSection = draftV2.content.pages
  .flatMap((page) => page.sections ?? [])
  .map((section) => section as Record<string, unknown>)
  .find((section) => editableKeys.some((key) => typeof section[key] === "string" && String(section[key]).trim()));
if (!editableSection) {
  throw new Error("Certified winner has no deterministic text field for V2 lifecycle edit.");
}
const editableKey = editableKeys.find((key) => typeof editableSection[key] === "string" && String(editableSection[key]).trim());
if (!editableKey) {
  throw new Error("Certified winner has no deterministic text field for V2 lifecycle edit.");
}
editableSection[editableKey] = `${String(editableSection[editableKey])} · revision 2`;
const v2Site = materializeSiteRevision({ previous: v1Site, draft: draftV2 });
assert(v2Site.siteId === v1Site.siteId && v2Site.revision === 2, "Controlled V2 did not preserve site identity/revision sequence.");
assert(v2Site.fingerprint !== v1Site.fingerprint, "Controlled V2 did not produce an independent fingerprint.");

const output = { name: `MiCirql persistence certification — ${fixture.fixture}`, fixture: fixture.fixture, sourceEvidenceState: "post-repair", mutation: { layer: "content", field: editableKey, deterministic: true }, v1, pendingV2: v2Site, requiredNextStage: "exact-snapshot-revision-certification" };
fs.mkdirSync("artifacts/persisted-publication-certification", { recursive: true });
fs.writeFileSync("artifacts/persisted-publication-certification/prepared.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify({ fixture: fixture.fixture, siteId: v1Site.siteId, v1: v1Site.fingerprint, pendingV2: v2Site.fingerprint, mutationField: editableKey, persistenceInputReady: false }, null, 2));
