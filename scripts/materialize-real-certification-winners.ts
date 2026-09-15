import fs from "node:fs";
import { generateMultiIndustryBenchmarkFixture } from "../src/benchmarks/multi-industry";
import { planCapabilitiesFromBrief } from "../src/core/capabilities/planner";
import { directContent } from "../src/core/content/director";
import { composePublishableDraft } from "../src/core/publish/planner";
import { materializeCertifiedWinner } from "../src/core/certification/selector";
import type { CandidateCertificationEvidence } from "../src/core/certification/schema";
import type { CandidateRepairPlan } from "../src/core/repair/schema";
import type { RepairAcceptanceResult } from "../src/core/certification/evidence";

const finalRanking=JSON.parse(fs.readFileSync("artifacts/real-certification-final-ranking/report.json","utf8"));
const repairs=JSON.parse(fs.readFileSync("artifacts/real-certification-repair-plans/report.json","utf8"));
const postRepair=JSON.parse(fs.readFileSync("artifacts/real-certification-post-repair-audit/report.json","utf8"));
if(finalRanking.evidenceState!=="post-repair"||postRepair.evidenceState!=="post-repair")throw new Error("Winner materialization requires post-repair certification evidence.");
const output:{generatedAt:string;fixtures:Array<Record<string,unknown>>;summary?:Record<string,unknown>}={generatedAt:new Date().toISOString(),fixtures:[]};
for(const rankedFixture of finalRanking.fixtures){
 const fixtureId=String(rankedFixture.fixture);const brief=String(rankedFixture.certificationBrief??"");if(!brief)throw new Error(`Missing certification brief ${fixtureId}`);
 const entry=generateMultiIndustryBenchmarkFixture(fixtureId,20,brief);if(!entry)throw new Error(`Unknown certification fixture ${fixtureId}`);
 const repairFixture=repairs.fixtures.find((item:any)=>item.fixture===fixtureId);const postFixture=postRepair.fixtures.find((item:any)=>item.fixture===fixtureId);if(!repairFixture||!postFixture)throw new Error(`Missing repair evidence ${fixtureId}`);
 const drafts=await Promise.all(entry.candidates.map(async(candidate)=>{const content=await directContent({brief:entry.brief,knowledge:entry.knowledge,artDirection:candidate.direction});const capabilityPlan=planCapabilitiesFromBrief(entry.brief,candidate.direction);return composePublishableDraft({candidate,content,capabilityPlan});}));
 const evidence:CandidateCertificationEvidence[]=rankedFixture.ranking.map((item:any)=>({candidateId:String(item.candidateId),rank:Number(item.rank),finalScore:Number(item.finalScore),hardFailures:[],repairAccepted:item.repairAccepted===true&&item.repairEvidenceState==="post-repair"}));
 const repairPlans:CandidateRepairPlan[]=repairFixture.candidates;const repairAcceptance:RepairAcceptanceResult[]=postFixture.candidates.map((item:any)=>({candidateId:String(item.id),evidenceState:"post-repair",accepted:item.repairAccepted===true}));
 const certified=materializeCertifiedWinner({sourceKey:`real-certification:${fixtureId}`,drafts,evidence,repairPlans,repairAcceptance});
 const winnerPlan=repairPlans.find((item)=>item.candidateId===certified.winner.candidateId);const winnerPost=postFixture.candidates.find((item:any)=>item.id===certified.winner.candidateId);if(!winnerPlan||!winnerPost)throw new Error(`Winner repair evidence missing ${fixtureId}`);
 const css=certified.site.snapshot.certifiedRepairCss??"";if(winnerPlan.instructions.length>0&&!css)throw new Error(`Winner ${fixtureId}/${certified.winner.candidateId} lost certified repair CSS.`);if(winnerPost.repairAccepted!==true)throw new Error(`Winner ${fixtureId}/${certified.winner.candidateId} was not accepted post-repair.`);
 output.fixtures.push({fixture:fixtureId,certificationBrief:brief,candidateCount:entry.candidates.length,winner:certified.winner,site:certified.site,repair:{evidenceState:"post-repair",instructionCount:winnerPlan.instructions.length,accepted:true,certifiedRepairCssPresent:Boolean(css),certifiedRepairCssLength:css.length}});
}
output.summary={fixtureCount:output.fixtures.length,candidateCount:output.fixtures.reduce((sum,item:any)=>sum+item.candidateCount,0),materializedWinners:output.fixtures.map((item:any)=>({fixture:item.fixture,candidateId:item.winner.candidateId,siteId:item.site.siteId,fingerprint:item.site.fingerprint,repairCssPresent:item.repair.certifiedRepairCssPresent}))};
if(output.fixtures.length!==4||output.fixtures.some((item:any)=>item.candidateCount!==20))throw new Error("Real certification winner materialization requires four exact 20-candidate fixtures.");
fs.mkdirSync("artifacts/real-certification-materialized-winners",{recursive:true});fs.writeFileSync("artifacts/real-certification-materialized-winners/report.json",JSON.stringify(output,null,2));console.log(JSON.stringify(output.summary,null,2));
