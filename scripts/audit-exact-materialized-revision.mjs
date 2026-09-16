import fs from "node:fs";
import { chromium } from "playwright";

const preparedPath=process.env.MICIRQL_PREPARED_REVISION_PATH?.trim()||"artifacts/persisted-publication-certification/prepared.json";
const baseUrl=(process.env.MICIRQL_CERTIFICATION_BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const prepared=JSON.parse(fs.readFileSync(preparedPath,"utf8"));
const site=prepared.pendingV2;
if(!site||site.revision!==2||!site.fingerprint)throw new Error("Pending V2 materialized snapshot is missing.");

// The exact-snapshot renderer route is intentionally separate from candidate generation.
// It must consume prepared persisted JSON only; no regeneration/provider lookup is allowed.
const encoded=Buffer.from(JSON.stringify(site),"utf8").toString("base64url");
if(encoded.length>60000)throw new Error("Pending revision is too large for the certification probe transport.");
const url=`${baseUrl}/generated/revision-certification?snapshot=${encoded}`;
const browser=await chromium.launch({headless:true});
const failures=[];let rendered=false;let functional=false;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on("pageerror",e=>failures.push(`pageerror:${e.message}`));
 page.on("response",r=>{if(r.status()>=400)failures.push(`http:${r.status()}:${r.url()}`)});
 const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
 if(!response||!response.ok())failures.push(`navigation:${response?.status()??"no-response"}`);
 const root=page.locator('main[data-repair-scope="candidate"]');
 rendered=await root.count()===1;
 if(!rendered)failures.push("published-render-root-missing");
 const fingerprint=await page.locator("[data-revision-certification-fingerprint]").getAttribute("data-revision-certification-fingerprint");
 if(fingerprint!==site.fingerprint)failures.push("rendered-fingerprint-mismatch");
 const bodyText=(await page.locator("body").innerText()).trim();if(bodyText.length<40)failures.push("rendered-content-empty");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);if(overflow)failures.push("horizontal-overflow");
 functional=rendered&&failures.length===0;
}finally{await browser.close();}
const evidence={version:"1.0",fingerprint:site.fingerprint,candidateId:site.source.candidateId,evidenceState:"post-repair",rendered,functional,hardFailures:failures,repairAccepted:failures.length===0,finalScore:failures.length===0?100:0};
fs.mkdirSync("artifacts/persisted-publication-certification",{recursive:true});fs.writeFileSync("artifacts/persisted-publication-certification/revision-evidence.json",JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));if(failures.length)process.exit(1);
