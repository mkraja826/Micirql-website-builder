import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { plannerModelFromEnvironment } from "@micirql/ai";
import { evaluatePremiumQualityGate, validateWebsite } from "@micirql/design-engine";

type Scenario = { id:string; name:string; focus:string; location:string; services:string[]; theme:"minimalist"|"corporate"|"luxury" };
type LiveCopy = { heroHeading:string; heroBody:string; servicesHeading:string; trustHeading:string; trustBody:string; ctaHeading:string; ctaBody:string; primaryCta:string };

const scenarios: Scenario[] = [
  { id:"general", name:"Harbor Dental Care", focus:"Complete family dental care", location:"Hyderabad", services:["Preventive dentistry","Root canal treatment","Crowns and bridges"], theme:"minimalist" },
  { id:"implants", name:"Apex Implant Centre", focus:"Dental implant consultations", location:"Hyderabad", services:["Dental implants","Full-arch rehabilitation","Implant-supported crowns"], theme:"luxury" },
  { id:"cosmetic", name:"Ivory Smile Studio", focus:"Cosmetic smile consultations", location:"Bengaluru", services:["Smile design","Veneers","Teeth whitening"], theme:"luxury" },
  { id:"orthodontic", name:"Align Dental Studio", focus:"Orthodontic consultations", location:"Chennai", services:["Clear aligners","Braces","Retention care"], theme:"corporate" },
  { id:"emergency", name:"Rapid Relief Dental", focus:"Urgent dental enquiries", location:"Pune", services:["Dental pain assessment","Emergency dental care","Broken tooth care"], theme:"corporate" },
  { id:"family", name:"Greenleaf Family Dental", focus:"Family dentistry appointments", location:"Kochi", services:["Routine check-ups","Restorative dentistry","Gum care"], theme:"minimalist" },
];

const requested = Math.max(1, Math.min(Number(process.env.MI_LIVE_SAMPLE_COUNT ?? 3) || 3, scenarios.length));
const selected = scenarios.slice(0, requested);

function section(id:string, family:string, paletteRole:string, props:Record<string,unknown>={}) { return { id, component:{ componentId:`${family}.benchmark-v1`, version:"1.0.0" }, props:{ paletteRole, ...props }, bindings:{}, hidden:false }; }
function words(value:string){ return value.trim().split(/\s+/).filter(Boolean).length; }
function copyIssues(copy:LiveCopy, scenario:Scenario) {
  const issues:string[]=[];
  if(words(copy.heroHeading)>12) issues.push("HERO_TOO_LONG");
  if(words(copy.heroBody)>42) issues.push("HERO_BODY_TOO_LONG");
  if(words(copy.ctaHeading)>12) issues.push("CTA_HEADING_TOO_LONG");
  if(words(copy.ctaBody)>35) issues.push("CTA_BODY_TOO_LONG");
  if(words(copy.primaryCta)>5) issues.push("CTA_LABEL_TOO_LONG");
  const all=Object.values(copy).join(" ").toLowerCase();
  for(const phrase of ["world-class","best-in-class","guaranteed","pain-free","100%","no. 1","number one","unmatched","revolutionary"]) if(all.includes(phrase)) issues.push(`UNVERIFIED_CLAIM:${phrase}`);
  const allowed=[scenario.name,scenario.location,scenario.focus,...scenario.services].join(" ").toLowerCase();
  if(/\b\d{2,}\+?\s*(years|patients|implants|smiles|cases)\b/i.test(all) && !/\b\d{2,}\+?\s*(years|patients|implants|smiles|cases)\b/i.test(allowed)) issues.push("INVENTED_METRIC");
  return [...new Set(issues)];
}

function normalizeCopy(value:unknown):LiveCopy {
  const input=(value && typeof value==="object" ? value : {}) as Record<string,unknown>;
  const required=["heroHeading","heroBody","servicesHeading","trustHeading","trustBody","ctaHeading","ctaBody","primaryCta"] as const;
  const output={} as LiveCopy;
  for(const key of required){ const text=typeof input[key]==="string" ? input[key].trim() : ""; if(!text) throw new Error(`Model omitted ${key}`); output[key]=text; }
  return output;
}

function buildSite(s:Scenario,c:LiveCopy):Site {
  const primaryAction={ label:c.primaryCta, href:"#contact" };
  return siteSchema.parse({
    schemaVersion:SCHEMA_VERSION, siteId:`live-${s.id}`, workspaceId:"live-model-benchmark", name:s.name, domain:"clinic", subtype:"dental",
    theme:{ family:s.theme, modifiers:["light"], brand:{ colors:{ primary:"#315E62",secondary:"#173B40",accent:"#C49A64",background:"#FFFFFF",surface:"#F3F7F6",textPrimary:"#102427",textSecondary:"#526568",border:"#D8E2E0",success:"#167A55",warning:"#9A6500",error:"#B42318" }, typography:{display:"Inter",body:"Inter",ui:"Inter"}, density:"comfortable",shape:"balanced",motion:"subtle" } },
    seoBlueprint:{ primaryGoal:s.focus,targetLocations:[s.location],priorityTopics:s.services,audiences:["Dental patients"],languages:["en"],localSeo:true,servicePages:true,locationPages:false,blog:false },
    pages:[{ id:"home",path:"/",name:"Home",sections:[
      section("global-navbar","navbar","background",{brandName:s.name}),
      section("hero","hero","background",{eyebrow:`Dental care in ${s.location}`,heading:c.heroHeading,body:c.heroBody,primaryAction}),
      section("treatments","services","surface",{heading:c.servicesHeading,items:s.services.map(title=>({title,description:`Discuss ${title.toLowerCase()} with the clinic and understand suitable next steps.`}))}),
      section("technology","features","background",{heading:"Care designed around clarity",items:[{title:"Clear consultation",description:"Understand suitable next steps before deciding on treatment."},{title:"Treatment planning",description:"Discuss the sequence, options and follow-up for your care."},{title:"Patient communication",description:"Get practical guidance for appointments and after-care."}]}),
      section("proof","testimonials","surface",{heading:c.trustHeading,body:c.trustBody}),
      section("doctor","team","background",{heading:"Meet the dental team",body:"Clinician credentials and biographies are published only after the clinic provides verified details."}),
      section("appointment","cta","accent",{heading:c.ctaHeading,body:c.ctaBody,primaryAction}),
      section("contact","contact","surface",{heading:"Contact the clinic",body:`Request an appointment with ${s.name} in ${s.location}.`,primaryAction:{label:"Call clinic",href:"tel:+914000000000"}}),
      section("global-footer","footer","background",{brandName:s.name}),
    ],seo:{title:`${s.name} | Dental Care in ${s.location}`.slice(0,70),description:`${s.focus} in ${s.location}. Explore dental services and contact the clinic to request an appointment.`.slice(0,180),canonicalPath:"/",indexable:true,primaryKeyword:`${s.services[0]} ${s.location}`,structuredDataTypes:["Dentist","MedicalClinic"]}}],
    navigation:[{label:"Home",href:"/"}],integrations:[],domains:[]
  });
}

test("live text model produces grounded premium dental samples", async()=>{
  const model=plannerModelFromEnvironment(process.env);
  test.skip(!model,"No live text provider configured. Set MICIRQL_TEXT_MODEL_* or GEMINI_API_KEY.");
  const results=[] as Array<Record<string,unknown>>;
  for(const scenario of selected){
    const started=Date.now();
    let error:string|undefined; let copy:LiveCopy|undefined; let site:Site|undefined;
    try{
      copy=normalizeCopy(await model!.generate({ responseFormat:"json", system:[
        "You write concise premium dental-clinic website copy. Return JSON only.",
        "Use only the supplied facts. Never invent doctors, credentials, reviews, awards, statistics, prices, outcomes, guarantees or availability.",
        "Avoid generic superlatives and medical outcome claims. Hero heading <=12 words. Hero body <=42 words. CTA heading <=12 words. CTA body <=35 words. CTA label <=5 words.",
        "Return exactly these string keys: heroHeading, heroBody, servicesHeading, trustHeading, trustBody, ctaHeading, ctaBody, primaryCta."
      ].join("\n"), input:scenario }));
      site=buildSite(scenario,copy);
    }catch(e){ error=e instanceof Error?e.message:String(e); }
    const contentIssues=copy?copyIssues(copy,scenario):["MODEL_OUTPUT_INVALID"];
    const structural=site?validateWebsite(site,"healthcare-clinic"):undefined;
    const premium=site?evaluatePremiumQualityGate(site):undefined;
    const passed=!error && contentIssues.length===0 && Boolean(structural?.ready) && (structural?.score??0)>=90 && Boolean(premium?.premiumReady) && (premium?.score??0)>=85;
    results.push({scenario:scenario.id,name:scenario.name,passed,latencyMs:Date.now()-started,error,contentIssues,structuralScore:structural?.score??0,premiumScore:premium?.score??0,copy});
  }
  const passed=results.filter(r=>r.passed).length;
  const summary={generatedAt:new Date().toISOString(),benchmark:"live-dental-text-v1",model:model!.id,samples:results.length,passed,passRate:passed/results.length,results};
  const dir=path.join(process.cwd(),"test-results","live-model-dental"); await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,"report.json"),JSON.stringify(summary,null,2),"utf8");
  await writeFile(path.join(dir,"summary.md"),["# MiCirql Live Dental Model Sampling","",`- Model profile: **${model!.id}**`,`- Pass rate: **${Math.round((passed/results.length)*100)}%** (${passed}/${results.length})`,`- Samples: **${results.length}**`,"","| Scenario | Result | Structural | Premium | Content issues |","| --- | --- | ---: | ---: | --- |",...results.map(r=>`| ${r.scenario} | ${r.passed?"PASS":"FAIL"} | ${r.structuralScore} | ${r.premiumScore} | ${((r.contentIssues as string[])||[]).join(", ")||"—"} |`),""].join("\n"),"utf8");
  expect(results.length).toBe(selected.length);
});
