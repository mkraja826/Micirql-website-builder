import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  generateGuardedSiteContent,
  plannerModelFromEnvironment,
  type ModelProfile,
} from "@micirql/ai";
import { evaluatePremiumQualityGate, validateWebsite } from "@micirql/design-engine";
import { SCHEMA_VERSION, siteSchema, type Site, type ThemeFamily } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { fetchPexelsImage } from "../apps/builder/app/pexels-stock-image";

type Scenario = { id:string; name:string; focus:string; location:string; services:string[]; theme:ThemeFamily };
const scenarios:Scenario[]=[
  {id:"general",name:"Harbor Dental Care",focus:"Complete family dental care",location:"Hyderabad",services:["Preventive dentistry","Root canal treatment","Crowns and bridges"],theme:"minimalist"},
  {id:"implants",name:"Apex Implant Centre",focus:"Dental implant consultations",location:"Hyderabad",services:["Dental implants","Full-arch rehabilitation","Implant-supported crowns"],theme:"luxury"},
  {id:"cosmetic",name:"Ivory Smile Studio",focus:"Cosmetic smile consultations",location:"Bengaluru",services:["Smile design","Veneers","Teeth whitening"],theme:"luxury"},
  {id:"orthodontic",name:"Align Dental Studio",focus:"Orthodontic consultations",location:"Chennai",services:["Clear aligners","Braces","Retention care"],theme:"corporate"},
  {id:"emergency",name:"Rapid Relief Dental",focus:"Urgent dental enquiries",location:"Pune",services:["Dental pain assessment","Emergency dental care","Broken tooth care"],theme:"corporate"},
  {id:"family",name:"Greenleaf Family Dental",focus:"Family dentistry appointments",location:"Kochi",services:["Routine check-ups","Restorative dentistry","Gum care"],theme:"minimalist"},
];
const viewports=[
  {id:"mobile-360",mode:"mobile" as const,width:360,height:800},
  {id:"mobile-390",mode:"mobile" as const,width:390,height:844},
  {id:"mobile-430",mode:"mobile" as const,width:430,height:932},
  {id:"tablet-768",mode:"tablet" as const,width:768,height:1024},
  {id:"desktop-1024",mode:"desktop" as const,width:1024,height:768},
  {id:"desktop-1440",mode:"desktop" as const,width:1440,height:900},
];
const requested=Math.max(1,Math.min(Number(process.env.MI_LIVE_SAMPLE_COUNT??3)||3,scenarios.length));
const selected=scenarios.slice(0,requested);
const now=new Date().toISOString();

function section(theme:ThemeFamily,id:string,family:SectionFamily,variant:1|2|3|4|5,props:Record<string,unknown>={}){return{id,component:{componentId:sectionDesignId(theme,family,variant),version:"1.0.0"},props,bindings:{},hidden:false};}
function buildBaseSite(s:Scenario):Site{
 const action={label:"Request appointment",href:"#contact"};
 return siteSchema.parse({schemaVersion:SCHEMA_VERSION,siteId:`live-generated-${s.id}`,workspaceId:"live-generated-dental",name:s.name,domain:"clinic",subtype:"dental",theme:{family:s.theme,modifiers:["light"],brand:{colors:{primary:"#315E62",secondary:"#173B40",accent:"#C49A64",background:"#FFFFFF",surface:"#F3F7F6",textPrimary:"#102427",textSecondary:"#526568",border:"#D8E2E0",success:"#167A55",warning:"#9A6500",error:"#B42318"},typography:{display:"Manrope",body:"Inter",ui:"Inter"},density:"comfortable",shape:"balanced",motion:"subtle"}},seoBlueprint:{primaryGoal:s.focus,targetLocations:[s.location],priorityTopics:s.services,audiences:["Dental patients"],languages:["en"],localSeo:true,servicePages:true,locationPages:false,blog:false},pages:[{id:"home",path:"/",name:"Home",sections:[
  section(s.theme,"global-navbar","navbar",1,{title:s.name,primaryAction:action}),
  section(s.theme,"hero","hero",2,{eyebrow:`Dental care in ${s.location}`,title:s.focus,description:`Learn about ${s.focus.toLowerCase()} and request an appointment with ${s.name}.`,primaryAction:action}),
  section(s.theme,"treatments","services",3,{title:"Dental treatments",description:"Review treatment options and discuss suitable next steps with the clinic.",items:s.services.map(title=>({title,description:`Ask the clinic about ${title.toLowerCase()} and whether it may suit your needs.`}))}),
  section(s.theme,"technology","features",2,{title:"Clear treatment planning",description:"Understand the consultation, planning and follow-up process before deciding on care.",items:[{title:"Consultation",description:"Discuss your concerns and treatment priorities."},{title:"Planning",description:"Review suitable options and practical next steps."},{title:"Follow-up",description:"Understand what happens after treatment."}]}),
  section(s.theme,"doctor","team",2,{title:"Meet the dental team",description:"Verified clinician names, qualifications and biographies appear only when provided by the clinic."}),
  section(s.theme,"proof","testimonials",2,{title:"Patient confidence",description:"Verified feedback can be published when supplied by the clinic."}),
  section(s.theme,"appointment","cta",2,{title:"Discuss your dental care",description:"Contact the clinic to request an appointment and confirm availability.",primaryAction:action}),
  section(s.theme,"contact","contact",1,{title:"Contact the clinic",description:`Request an appointment with ${s.name} in ${s.location}.`,primaryAction:{label:"Send enquiry",href:"#contact-form"}}),
  section(s.theme,"global-footer","footer",1,{title:s.name,description:`Dental care information for ${s.location}.`}),
 ],seo:{title:`${s.name} | Dental Care in ${s.location}`,description:`${s.focus} in ${s.location}. Explore services and contact the clinic to request an appointment.`,canonicalPath:"/",indexable:true,primaryKeyword:`${s.services[0]} ${s.location}`,structuredDataTypes:["Dentist","MedicalClinic"]}}],navigation:[{label:"Home",href:"/"}],integrations:[],domains:[]});
}

async function installRoutes(page:Page,site:Site){
 const project={id:site.siteId,workspace_id:site.workspaceId,name:site.name,status:"draft",published_version_id:null,updated_at:now,draft:{revision:4,updated_at:now},hostname:null};
 await page.route("**/api/projects**",async route=>route.fulfill({json:{projects:[project]}}));
 await page.route("**/api/onboarding**",async route=>route.fulfill({json:{completed:true,profile:{industry:"dental clinic",subindustry:"general dentistry",goals:["book appointments"],services:site.seoBlueprint.priorityTopics}}}));
 await page.route("**/api/drafts**",async route=>route.fulfill({json:{draft:{workspaceId:site.workspaceId,siteId:site.siteId,revision:4,snapshot:site,updatedAt:now,updatedBy:"live-generated-qa"}}}));
 await page.route("**/api/credits**",async route=>route.fulfill({json:{balance:100}}));
}
async function selectViewport(page:Page,mode:"mobile"|"tablet"|"desktop",width:number){
 const control=page.locator(".viewport-switcher button").filter({hasText:new RegExp(`^${mode}$`,"i")}); await expect(control).toHaveCount(1); await control.evaluate(el=>(el as HTMLButtonElement).click());
 const frame=page.locator(`.site-preview.viewport-${mode}`); await expect(frame).toBeVisible(); await frame.evaluate((el,w)=>{const node=el as HTMLElement;node.style.setProperty("width",`${w}px`,"important");node.style.setProperty("max-width",`${w}px`,"important");},width); return frame;
}
async function metrics(preview:Locator){return preview.evaluate(element=>{const root=element as HTMLElement;const rect=root.getBoundingClientRect();const all=[...root.querySelectorAll<HTMLElement>("*")];const overflow=all.filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&(r.left<rect.left-1||r.right>rect.right+1);}).length;const clipped=[...root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,a,button,span")].filter(node=>{const s=getComputedStyle(node);if(!node.textContent?.trim())return false;return(["hidden","clip"].includes(s.overflowX)&&node.scrollWidth>node.clientWidth+1)||(["hidden","clip"].includes(s.overflowY)&&node.scrollHeight>node.clientHeight+1);}).length;const small=all.filter(node=>/^(A|BUTTON)$/.test(node.tagName)).map(node=>node.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.height<44).length;const wrapped=[...root.querySelectorAll<HTMLElement>("a,button")].filter(node=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);const line=parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.2;return r.width>0&&r.height>line*1.75&&Boolean(node.textContent?.trim());}).length;return{scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,overflow,clipped,small,wrapped};});}

async function pexelsEvidence(s:Scenario){const excluded:number[]=[];const result=[] as Array<Record<string,unknown>>;for(const family of ["hero","team","services"] as const){const image=await fetchPexelsImage({query:`${s.focus} ${s.location}`,domain:"dental clinic",family,excludedPhotoIds:excluded});excluded.push(image.photoId);result.push({family,photoId:image.photoId,photoUrl:image.photoUrl,sourceUrl:image.sourceUrl,photographer:image.photographer,query:image.query,width:image.width,height:image.height,aspectRatio:image.aspectRatio,bytes:image.bytes.byteLength});}return result;}

test("real guarded Dental generation with Pexels survives six rendered widths",async({page})=>{
 const model=plannerModelFromEnvironment(process.env); test.skip(!model,"No live text provider configured."); test.skip(!process.env.PEXELS_API_KEY,"PEXELS_API_KEY is required for live generated visual QA.");
 const profile:ModelProfile={id:model!.id,provider:"live-qa",model:model!.id,capabilities:["content-generation"],enabled:true,qualityScore:90,latencyClass:"low",costClass:"medium",maxOutputTokens:8000};
 const executors=createModelExecutorRegistry([createJsonContentExecutor(model!)]); const results=[] as Array<Record<string,unknown>>; const output=path.join(process.cwd(),"test-results","live-generated-dental-visual"); await mkdir(output,{recursive:true});
 for(const scenario of selected){
  const started=Date.now(); let error:string|undefined; let contentScore=0; let premiumScore=0; let structuralScore=0; let media:Array<Record<string,unknown>>=[]; const viewportResults:Record<string,unknown>={};
  try{
   const generated=await generateGuardedSiteContent({site:buildBaseSite(scenario),facts:{businessName:scenario.name,industry:"dental clinic",subindustry:"dental",location:scenario.location,services:scenario.services,goals:[scenario.focus],notes:null,people:[],credentials:[],proofClaims:[],prices:[]},profiles:[profile],executors});
   contentScore=generated.contentQuality.score; const structural=validateWebsite(generated.site,"healthcare-clinic"); structuralScore=structural.score; const premium=evaluatePremiumQualityGate(generated.site); premiumScore=premium.score; media=await pexelsEvidence(scenario);
   expect(new Set(media.map(item=>item.photoId)).size,`${scenario.id}: duplicate Pexels photo IDs`).toBe(media.length); expect(media.every(item=>String(item.sourceUrl).includes("pexels")),`${scenario.id}: non-Pexels image source`).toBe(true);
   await page.unrouteAll({behavior:"wait"}); await page.setViewportSize({width:1800,height:1100}); await installRoutes(page,generated.site); await page.addInitScript(()=>localStorage.setItem("micirql.supabase.session",JSON.stringify({access_token:"live-generated-token",refresh_token:"refresh",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user:{id:"live-generated-user",email:"visual@micirql.test"}}))); await page.goto("/"); await page.getByRole("button",{name:"Open editor"}).first().click(); await expect(page.getByText(generated.site.name).first()).toBeVisible(); const preview=page.locator(".renderer-preview-document"); await expect(preview).toBeVisible();
   for(const viewport of viewports){await page.setViewportSize({width:viewport.width,height:viewport.height});const frame=await selectViewport(page,viewport.mode,viewport.width);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const measured=await metrics(preview);expect(measured.scrollWidth,`${scenario.id} overflow ${viewport.id}`).toBeLessThanOrEqual(measured.clientWidth+1);expect(measured.overflow,`${scenario.id} child overflow ${viewport.id}`).toBe(0);expect(measured.clipped,`${scenario.id} clipped copy ${viewport.id}`).toBe(0);expect(measured.wrapped,`${scenario.id} wrapped action ${viewport.id}`).toBe(0);if(viewport.width<=430)expect(measured.small,`${scenario.id} small touch target ${viewport.id}`).toBe(0);await frame.screenshot({path:path.join(output,`${scenario.id}--${viewport.id}.png`)});viewportResults[viewport.id]=measured;}
   expect(contentScore,`${scenario.id}: content quality`).toBeGreaterThanOrEqual(82);expect(structural.ready,`${scenario.id}: structural readiness`).toBe(true);expect(premium.premiumReady,`${scenario.id}: premium readiness`).toBe(true);expect(premiumScore,`${scenario.id}: premium score`).toBeGreaterThanOrEqual(85);
  }catch(e){error=e instanceof Error?e.message:String(e);}
  results.push({scenario:scenario.id,name:scenario.name,passed:!error,error,latencyMs:Date.now()-started,contentScore,structuralScore,premiumScore,media,viewports:viewportResults});
 }
 const passed=results.filter(item=>item.passed).length; const report={generatedAt:new Date().toISOString(),benchmark:"live-generated-dental-visual-v1",model:model!.id,samples:results.length,passed,passRate:passed/results.length,viewports:viewports.map(v=>v.id),results}; await writeFile(path.join(output,"report.json"),JSON.stringify(report,null,2),"utf8"); await writeFile(path.join(output,"summary.md"),["# MiCirql Live Generated Dental Visual QA","",`- Model: **${model!.id}**`,`- Scenarios: **${results.length}**`,`- Pass rate: **${Math.round(report.passRate*100)}%** (${passed}/${results.length})`,`- Rendered widths: **${viewports.map(v=>v.width).join(", ")}**`,`- Pexels selections per scenario: **3**, duplicate IDs forbidden`,"",...results.map(item=>`- ${item.scenario}: ${item.passed?"PASS":"FAIL"}${item.error?` — ${item.error}`:""}`),""].join("\n"),"utf8"); expect(passed,"Every sampled generated Dental website must pass live content + Pexels + rendered geometry QA").toBe(results.length);
});
