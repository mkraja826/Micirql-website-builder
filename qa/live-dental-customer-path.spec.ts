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
import { SCHEMA_VERSION, siteSchema, type Site, type ThemeFamily } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { interpretOnboardingBrief } from "../apps/builder/app/onboarding-brief-intelligence";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { planVisualMedia } from "../apps/builder/app/visual-media-intelligence";
import { executeMediaPlan, type MediaAsset } from "../apps/builder/app/media-execution";
import { applyMediaExecution } from "../apps/builder/app/apply-media-execution";
import { applyComposition } from "../apps/builder/app/apply-composition";
import { applyPremiumQualityCorrection } from "../apps/builder/app/premium-quality-correction";
import { applyFinalGenerationCorrection } from "../apps/builder/app/final-generation-correction";
import { evaluateFinalGenerationAcceptance } from "../apps/builder/app/final-generation-acceptance";
import { fetchPexelsImage } from "../apps/builder/app/pexels-stock-image";

const briefs = [
  `My dental clinic is called Harbor Dental Care in Hyderabad. We provide preventive dentistry, root canal treatment and crowns and bridges. Dr. Ananya Rao, BDS, MDS is our dentist. We have 12 years of experience. Clinic hours are Monday-Saturday 9 AM-8 PM. I want a clean professional website that builds trust and gets appointment enquiries.`,
  `Build a premium website for Apex Implant Centre in Hyderabad. We focus on dental implants, full-arch rehabilitation and implant-supported crowns. Dr. Kiran Mehta, MDS runs the clinic. Implant consultation is ₹1,000. We want appointment bookings, strong trust and a luxury but clinical look.`,
  `Ivory Smile Studio is a cosmetic dental clinic in Bengaluru offering smile design, veneers and teeth whitening. We want a premium editorial website to showcase services and book consultations. Do not invent doctors, reviews, ratings or before-and-after results.`,
];
const requested = Math.max(1, Math.min(Number(process.env.MI_LIVE_SAMPLE_COUNT ?? 3) || 3, briefs.length));
const selected = briefs.slice(0, requested);
const viewports = [
  { id:"mobile-360", mode:"mobile" as const, width:360, height:800 },
  { id:"mobile-390", mode:"mobile" as const, width:390, height:844 },
  { id:"mobile-430", mode:"mobile" as const, width:430, height:932 },
  { id:"tablet-768", mode:"tablet" as const, width:768, height:1024 },
  { id:"desktop-1024", mode:"desktop" as const, width:1024, height:768 },
  { id:"desktop-1440", mode:"desktop" as const, width:1440, height:900 },
];
const now = new Date().toISOString();

function section(theme:ThemeFamily,id:string,family:SectionFamily,variant:1|2|3|4|5,props:Record<string,unknown>={}){return{id,component:{componentId:sectionDesignId(theme,family,variant),version:"1.0.0"},props,bindings:{},hidden:false};}
function baseSite(input:{name:string;location:string;services:string[]}):Site{
 const theme:ThemeFamily="corporate"; const action={label:"Request appointment",href:"#contact"};
 const items=input.services.length?input.services:["Dental consultation","Preventive care","Restorative care"];
 return siteSchema.parse({schemaVersion:SCHEMA_VERSION,siteId:`customer-${slug(input.name)}`,workspaceId:"live-customer-path",name:input.name,domain:"clinic",subtype:"dental",theme:{family:theme,modifiers:["light"],brand:{colors:{primary:"#315E62",secondary:"#173B40",accent:"#C49A64",background:"#FFFFFF",surface:"#F3F7F6",textPrimary:"#102427",textSecondary:"#526568",border:"#D8E2E0",success:"#167A55",warning:"#9A6500",error:"#B42318"},typography:{display:"Manrope",body:"Inter",ui:"Inter"},density:"comfortable",shape:"balanced",motion:"subtle"}},seoBlueprint:{primaryGoal:"Book dental appointments",targetLocations:[input.location||"India"],priorityTopics:items,audiences:["Dental patients"],languages:["en"],localSeo:true,servicePages:true,locationPages:false,blog:false},pages:[{id:"home",path:"/",name:"Home",sections:[
  section(theme,"global-navbar","navbar",1,{title:input.name,primaryAction:action}),
  section(theme,"hero","hero",2,{eyebrow:`Dental care in ${input.location||"your area"}`,title:"Dental care with clear next steps",description:"Explore services, understand your options and contact the clinic to request an appointment.",primaryAction:action}),
  section(theme,"about","about",2,{title:"About the clinic",description:"Clinic details and positioning are based only on supplied business information.",items:[{title:"Clear information",description:"Services and practical next steps are presented without invented claims."}]}),
  section(theme,"services","services",3,{title:"Dental services",description:"Review the clinic's supplied services.",items:items.map(title=>({title,description:`Ask the clinic about ${title.toLowerCase()} and suitable next steps.`}))}),
  section(theme,"features","features",2,{title:"Care designed for clarity",description:"Understand consultation, planning and follow-up before deciding on treatment.",items:[{title:"Consultation",description:"Discuss concerns and priorities."},{title:"Planning",description:"Review suitable treatment options."},{title:"Follow-up",description:"Understand what happens next."}]}),
  section(theme,"process","process",2,{title:"What happens next",description:"A simple consultation-to-follow-up process.",items:[{title:"Contact",description:"Request an appointment."},{title:"Consult",description:"Discuss your needs."},{title:"Plan",description:"Review next steps."}]}),
  section(theme,"team","team",2,{title:"Meet the dental team",description:"Names and qualifications appear only when supplied by the clinic.",items:[{title:"Clinic dentist",description:"Verified details will appear when provided."}]}),
  section(theme,"testimonials","testimonials",2,{title:"Patient confidence",description:"Verified reviews can be published when supplied by the clinic.",items:[{title:"Verified feedback only",description:"No review is invented during generation."}]}),
  section(theme,"gallery","gallery",2,{title:"Clinic and care",description:"Use truthful clinic or editorial dental context only.",items:[{title:"Care environment",description:"Relevant supporting imagery."}]}),
  section(theme,"cta","cta",2,{title:"Discuss your dental care",description:"Contact the clinic to request an appointment.",primaryAction:action}),
  section(theme,"contact","contact",1,{title:"Contact the clinic",description:`Request an appointment with ${input.name}.`,primaryAction:{label:"Send enquiry",href:"#contact-form"}}),
  section(theme,"global-footer","footer",1,{title:input.name}),
 ],seo:{title:`${input.name} | Dental Care`,description:`Dental care information and appointment enquiries for ${input.name}.`,canonicalPath:"/",indexable:true,primaryKeyword:"dental clinic",structuredDataTypes:["Dentist","MedicalClinic"]}}],navigation:[{label:"Home",href:"/"}],integrations:[],domains:[]});
}

async function stockForPlan(plan:ReturnType<typeof planVisualMedia>){const excluded:number[]=[];const assets:MediaAsset[]=[];const evidence:Array<Record<string,unknown>>=[];for(const decision of plan.sections.filter(d=>d.role!=="none"&&d.family!=="team"&&d.family!=="about"&&d.family!=="gallery").slice(0,4)){const image=await fetchPexelsImage({query:decision.subject,domain:"dental clinic",family:decision.family,excludedPhotoIds:excluded});excluded.push(image.photoId);assets.push({id:`pexels-${image.photoId}`,name:`Pexels ${decision.family}`,url:image.sourceUrl,source:"licensed",tags:["dental","dentistry",decision.family,decision.role,...(decision.preferredTags??[])],alt:image.alt,aspect:decision.aspect,verified:true});evidence.push({family:decision.family,photoId:image.photoId,photographer:image.photographer,sourceUrl:image.sourceUrl,query:image.query,width:image.width,height:image.height});}return{assets,evidence};}

async function installRoutes(page:Page,site:Site){const project={id:site.siteId,workspace_id:site.workspaceId,name:site.name,status:"draft",published_version_id:null,updated_at:now,draft:{revision:5,updated_at:now},hostname:null};await page.route("**/api/projects**",async route=>route.fulfill({json:{projects:[project]}}));await page.route("**/api/onboarding**",async route=>route.fulfill({json:{completed:true,profile:{industry:"dental",subindustry:"dental",goals:["book appointments"],services:site.seoBlueprint.priorityTopics}}}));await page.route("**/api/drafts**",async route=>route.fulfill({json:{draft:{workspaceId:site.workspaceId,siteId:site.siteId,revision:5,snapshot:site,updatedAt:now,updatedBy:"customer-path-qa"}}}));await page.route("**/api/credits**",async route=>route.fulfill({json:{balance:100}}));}
async function selectViewport(page:Page,mode:"mobile"|"tablet"|"desktop",width:number){const control=page.locator(".viewport-switcher button").filter({hasText:new RegExp(`^${mode}$`,"i")});await control.evaluate(el=>(el as HTMLButtonElement).click());const frame=page.locator(`.site-preview.viewport-${mode}`);await expect(frame).toBeVisible();await frame.evaluate((el,w)=>{const node=el as HTMLElement;node.style.setProperty("width",`${w}px`,"important");node.style.setProperty("max-width",`${w}px`,"important");},width);return frame;}
async function metrics(preview:Locator){return preview.evaluate(element=>{const root=element as HTMLElement;const rect=root.getBoundingClientRect();const all=[...root.querySelectorAll<HTMLElement>("*")];const overflow=all.filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&(r.left<rect.left-1||r.right>rect.right+1);}).length;const clipped=[...root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,a,button,span")].filter(node=>{const s=getComputedStyle(node);if(!node.textContent?.trim())return false;return(["hidden","clip"].includes(s.overflowX)&&node.scrollWidth>node.clientWidth+1)||(["hidden","clip"].includes(s.overflowY)&&node.scrollHeight>node.clientHeight+1);}).length;const wrapped=[...root.querySelectorAll<HTMLElement>("a,button")].filter(node=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);const line=parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.2;return r.width>0&&r.height>line*1.75&&Boolean(node.textContent?.trim());}).length;const small=all.filter(node=>/^(A|BUTTON)$/.test(node.tagName)).map(node=>node.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.height<44).length;return{scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,overflow,clipped,wrapped,small};});}

function groundingFacts(profile:Awaited<ReturnType<typeof interpretOnboardingBrief>>){return{businessName:profile.businessName,industry:profile.industry,subindustry:profile.subindustry||null,location:profile.location||null,services:profile.services,goals:profile.goals,notes:profile.notes,people:profile.lockedFacts.people,credentials:profile.lockedFacts.credentials,proofClaims:profile.lockedFacts.claims,prices:profile.lockedFacts.prices};}
function slug(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"dental";}

test("free-text Dental brief survives the full customer generation path",async({page})=>{
 const model=plannerModelFromEnvironment(process.env);test.skip(!model,"No live text provider configured.");test.skip(!process.env.PEXELS_API_KEY,"PEXELS_API_KEY is required for the customer-path benchmark.");
 const modelProfile:ModelProfile={id:model!.id,provider:"live-customer-path",model:model!.id,capabilities:["content-generation"],enabled:true,qualityScore:90,latencyClass:"low",costClass:"medium",maxOutputTokens:8000};const executors=createModelExecutorRegistry([createJsonContentExecutor(model!)]);
 const out=path.join(process.cwd(),"test-results","live-dental-customer-path");await mkdir(out,{recursive:true});const results:Array<Record<string,unknown>>=[];
 for(const brief of selected){const started=Date.now();let error:string|undefined;const viewportResults:Record<string,unknown>={};let reportData:Record<string,unknown>={};try{
   const interpreted=await interpretOnboardingBrief(brief);expect(interpreted.industry.toLowerCase()).toContain("dental");expect(interpreted.businessName).not.toBe("My Business");
   const onboarding={business_name:interpreted.businessName,industry:interpreted.industry,subindustry:interpreted.subindustry,location:interpreted.location,goals:interpreted.goals,style_tags:interpreted.styleTags,required_capabilities:interpreted.requiredCapabilities,services:interpreted.services,notes:interpreted.notes};
   const composition=composeWebsite(onboarding);expect(composition.layoutCandidate?.layout.status,"No certified layout candidate selected").toBe("certified");const quality=inferGenerationQuality(onboarding,composition);const visual=planVisualMedia(onboarding,composition,quality);
   let site=applyComposition(baseSite({name:interpreted.businessName,location:interpreted.location,services:interpreted.services}),composition,quality);
   const generated=await generateGuardedSiteContent({site,facts:groundingFacts(interpreted),profiles:[modelProfile],executors});site=generated.site;
   const stock=await stockForPlan(visual);expect(new Set(stock.evidence.map(item=>item.photoId)).size).toBe(stock.evidence.length);const execution=executeMediaPlan({plan:visual,licensedAssets:stock.assets,allowGeneration:false});site=applyMediaExecution(site,execution);
   const teamRequest=execution.requests.find(r=>r.family==="team");if(teamRequest)expect(teamRequest.source,"Stock must never become clinic staff").toBe("none");
   site=applyPremiumQualityCorrection(site).site;let acceptance=evaluateFinalGenerationAcceptance(site);let correction:string[]=[];if(!acceptance.ready){const repaired=applyFinalGenerationCorrection(site);site=repaired.site;acceptance=repaired.final;correction=repaired.repairs;}
   expect(acceptance.ready,acceptance.blockers.join(" | ")).toBe(true);expect(acceptance.score).toBeGreaterThanOrEqual(82);
   await page.unrouteAll({behavior:"wait"});await page.setViewportSize({width:1800,height:1100});await installRoutes(page,site);await page.addInitScript(()=>localStorage.setItem("micirql.supabase.session",JSON.stringify({access_token:"customer-path-token",refresh_token:"refresh",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user:{id:"customer-path-user",email:"qa@micirql.test"}})));await page.goto("/");await page.getByRole("button",{name:"Open editor"}).first().click();const preview=page.locator(".renderer-preview-document");await expect(preview).toBeVisible();
   for(const viewport of viewports){await page.setViewportSize({width:viewport.width,height:viewport.height});const frame=await selectViewport(page,viewport.mode,viewport.width);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const measured=await metrics(preview);expect(measured.scrollWidth,`${interpreted.businessName} overflow ${viewport.id}`).toBeLessThanOrEqual(measured.clientWidth+1);expect(measured.overflow,`${interpreted.businessName} child overflow ${viewport.id}`).toBe(0);expect(measured.clipped,`${interpreted.businessName} clipped copy ${viewport.id}`).toBe(0);expect(measured.wrapped,`${interpreted.businessName} wrapped CTA ${viewport.id}`).toBe(0);if(viewport.width<=430)expect(measured.small,`${interpreted.businessName} small touch target ${viewport.id}`).toBe(0);await frame.screenshot({path:path.join(out,`${slug(interpreted.businessName)}--${viewport.id}.png`)});viewportResults[viewport.id]=measured;}
   reportData={businessName:interpreted.businessName,interpreterSource:interpreted.source,lockedFacts:interpreted.lockedFacts,layoutId:composition.layoutCandidate?.layout.id,intent:composition.intent,preset:composition.preset.id,contentScore:generated.contentQuality.score,qualityRewriteApplied:generated.qualityRewriteApplied,media:stock.evidence,mediaExecution:execution.requests.map(r=>({family:r.family,source:r.source,assetId:r.asset?.id})),acceptanceScore:acceptance.score,dimensions:acceptance.dimensions.map(d=>({id:d.id,ready:d.ready,score:d.score})),correction,viewports:viewportResults};
  }catch(e){error=e instanceof Error?e.message:String(e);}results.push({passed:!error,error,latencyMs:Date.now()-started,...reportData});}
 const passed=results.filter(r=>r.passed).length;const summary={generatedAt:new Date().toISOString(),benchmark:"live-dental-customer-path-v1",model:model!.id,samples:results.length,passed,passRate:passed/results.length,viewports:viewports.map(v=>v.id),results};await writeFile(path.join(out,"report.json"),JSON.stringify(summary,null,2),"utf8");await writeFile(path.join(out,"summary.md"),["# MiCirql Dental Customer-Path Benchmark","",`- Model: **${model!.id}**`,`- Pass rate: **${Math.round(summary.passRate*100)}%** (${passed}/${results.length})`,`- Path: **free-text brief → interpreter → composition → certified layout → guarded AI content → visual plan → Pexels/media execution → premium acceptance → six-width renderer**`,`- Widths: **${viewports.map(v=>v.width).join(", ")}**`,"",...results.map(r=>`- ${r.businessName??"Scenario"}: ${r.passed?"PASS":"FAIL"}${r.error?` — ${r.error}`:""}`),""].join("\n"),"utf8");expect(passed,"Every sampled free-text Dental customer path must pass end-to-end").toBe(results.length);
});
