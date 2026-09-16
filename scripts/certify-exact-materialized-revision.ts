import fs from "node:fs";
import type { CertifiedMaterializedSite, CertifiedWinner } from "../src/core/certification/schema";
import { hydrateMaterializedSite } from "../src/core/materialization/materializer";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const preparedPath = process.env.MICIRQL_PREPARED_REVISION_PATH?.trim() || "artifacts/persisted-publication-certification/prepared.json";
const evidencePath = process.env.MICIRQL_REVISION_CERTIFICATION_EVIDENCE_PATH?.trim() || "artifacts/persisted-publication-certification/revision-evidence.json";
const prepared = JSON.parse(fs.readFileSync(preparedPath, "utf8")) as { name:string; fixture:string; v1:CertifiedMaterializedSite; pendingV2:unknown };
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as { version:string; fingerprint:string; candidateId:string; evidenceState:string; rendered:boolean; functional:boolean; hardFailures:string[]; repairAccepted:boolean; finalScore:number };
const v2Site = hydrateMaterializedSite(JSON.stringify(prepared.pendingV2));
assert(v2Site.revision === 2, "Exact revision certification requires revision 2.");
assert(prepared.v1.certifiedFingerprint === prepared.v1.site.fingerprint, "V1 certification fingerprint is stale.");
assert(evidence.version === "1.0" && evidence.evidenceState === "post-repair", "Revision evidence must be genuine post-repair evidence.");
assert(evidence.fingerprint === v2Site.fingerprint, "Revision evidence does not cover the exact V2 fingerprint.");
assert(evidence.candidateId === v2Site.source.candidateId, "Revision evidence candidate provenance mismatch.");
assert(evidence.rendered === true && evidence.functional === true, "Revision must pass rendered and functional certification.");
assert(Array.isArray(evidence.hardFailures) && evidence.hardFailures.length === 0, "Revision certification has hard failures.");
assert(evidence.repairAccepted === true, "Revision post-repair acceptance failed.");
assert(Number.isFinite(evidence.finalScore), "Revision certification score is invalid.");
const winner:CertifiedWinner={version:"1.0",candidateId:v2Site.source.candidateId,rank:1,finalScore:evidence.finalScore,certification:{hardFailureCount:0,repairAccepted:true}};
const v2:CertifiedMaterializedSite={version:"1.0",winner,certifiedFingerprint:v2Site.fingerprint,site:v2Site};
const output={name:prepared.name,fixture:prepared.fixture,v1:prepared.v1,v2,revisionCertification:{evidenceState:evidence.evidenceState,exactFingerprint:true,rendered:true,functional:true}};
fs.writeFileSync("artifacts/persisted-publication-certification/input.json",JSON.stringify(output,null,2));
console.log(JSON.stringify({fixture:prepared.fixture,v1:prepared.v1.site.fingerprint,v2:v2Site.fingerprint,exactFingerprint:true,persistenceInputReady:true},null,2));
