import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { applyComposition } from "../apps/builder/app/apply-composition";
import { applyPremiumQualityCorrection } from "../apps/builder/app/premium-quality-correction";
import { applyFinalGenerationCorrection } from "../apps/builder/app/final-generation-correction";
import { evaluateFinalGenerationAcceptance } from "../apps/builder/app/final-generation-acceptance";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

export const PEARL_SERVICES = ["Dental implants","Root canal treatment","Cosmetic dentistry","Crowns and bridges","Preventive dentistry"];
export const pearlProfile: OnboardingProfile = {
  industry:"dental clinic", subindustry:"general dentistry",
  goals:["book appointments","build trust","explain treatments clearly"],
  style_tags:["quiet luxury","premium","editorial","warm neutral","restrained teal"],
  required_capabilities:["contact","appointment enquiries","team","treatment process"],
  services:PEARL_SERVICES,
  notes:"Pearl Dental should feel like quiet luxury healthcare: spacious, image-led, editorial, calm and clinically trustworthy without fabricated claims.",
};

export function buildAcceptedPearlSite() {
  const composition = composeWebsite(pearlProfile);
  const quality = inferGenerationQuality(pearlProfile, composition);
  let site = applyComposition(buildPearlSourceDraft(), composition, quality);
  site = applyDeterministicMediaStage(site);
  site = applyPremiumQualityCorrection(site).site;
  let acceptance = evaluateFinalGenerationAcceptance(site);
  if (!acceptance.ready) {
    site = applyFinalGenerationCorrection(site).site;
    site = applyPremiumQualityCorrection(site).site;
    acceptance = evaluateFinalGenerationAcceptance(site);
  }
  return { site, composition, acceptance };
}

function buildPearlSourceDraft(): Site {
  const themeFamily="minimalist" as const;
  const sections=[
    section("global-navbar","navbar",themeFamily,{title:"Pearl Dental",brandName:"Pearl Dental",items:[{title:"Treatments"},{title:"About"},{title:"Contact"}],primaryAction:{label:"Book appointment",href:"#contact"}}),
    section("hero","hero",themeFamily,{eyebrow:"Dental care in Hyderabad",heading:"Thoughtful dentistry, planned around you",body:"Explore treatment options with clear consultation, careful planning and a calm path to the next step.",primaryAction:{label:"Book appointment",href:"#contact"},secondaryAction:{label:"View treatments",href:"#treatments"}}),
    section("about","about",themeFamily,{heading:"A considered approach to dental care",body:"Pearl Dental brings treatment information, consultation and planning into a clear patient journey."}),
    section("treatments","services",themeFamily,{heading:"Treatments",body:"Understand the purpose of each treatment and discuss the options that may suit your needs.",items:PEARL_SERVICES.map(title=>({title,description:`Learn what to discuss with the clinic when considering ${title.toLowerCase()}.`}))}),
    section("care-philosophy","features",themeFamily,{heading:"Care built around clarity",body:"A good dental experience should make the consultation, treatment sequence and follow-up easier to understand.",items:[{title:"Clear consultation",description:"Discuss your concerns and the available next steps before deciding on treatment."},{title:"Structured planning",description:"Review the treatment sequence and practical follow-up with the clinic."},{title:"Patient communication",description:"Know what to ask before, during and after an appointment."}]}),
    section("process","process",themeFamily,{heading:"Your care journey",body:"A simple sequence keeps the next step understandable from first enquiry through treatment planning.",items:[{title:"01 — Enquire",description:"Tell the clinic what you would like to discuss."},{title:"02 — Consult",description:"Review your concerns, options and any recommended assessment."},{title:"03 — Plan",description:"Discuss the proposed sequence and follow-up before proceeding."}]}),
    section("team","team",themeFamily,{heading:"Meet the dental team",body:"Clinician biographies and qualifications are published only after Pearl Dental supplies verified details.",items:[{title:"Clinical team",description:"Verified clinician details can be added here when supplied by the clinic."}]}),
    section("patient-feedback","testimonials",themeFamily,{heading:"Patient feedback",body:"Verified patient reviews can be published here when Pearl Dental supplies approved feedback.",items:[{title:"Verified reviews only",description:"No testimonial is shown until the clinic supplies approved patient feedback."}]}),
    section("cta","cta",themeFamily,{heading:"Ready to discuss your dental care?",body:"Contact Pearl Dental to request an appointment and confirm availability.",primaryAction:{label:"Request appointment",href:"#contact"}}),
    section("contact","contact",themeFamily,{heading:"Contact Pearl Dental",body:"Send an enquiry to discuss an appointment in Hyderabad.",primaryAction:{label:"Contact clinic",href:"#contact-form"}}),
    section("global-footer","footer",themeFamily,{title:"Pearl Dental",brandName:"Pearl Dental",description:"Dental care information and appointment enquiries in Hyderabad."}),
  ];
  return siteSchema.parse({schemaVersion:SCHEMA_VERSION,siteId:"00000000-0000-4000-8000-000000000147",workspaceId:"pearl-flagship-workspace",name:"Pearl Dental",domain:"clinic",subtype:"dental",theme:{family:themeFamily,modifiers:["light"],brand:{colors:{primary:"#24494A",secondary:"#172D33",accent:"#5D8D89",background:"#FBFAF7",surface:"#F2F0EA",textPrimary:"#182426",textSecondary:"#5A6768",border:"#D8D5CD",success:"#167A55",warning:"#9A6500",error:"#B42318"},typography:{display:'Georgia, "Times New Roman", serif',body:'Inter, ui-sans-serif, system-ui, sans-serif',ui:'Inter, ui-sans-serif, system-ui, sans-serif'},density:"spacious",shape:"balanced",motion:"subtle"}},seoBlueprint:{primaryGoal:"Dental appointment enquiries",targetLocations:["Hyderabad"],priorityTopics:PEARL_SERVICES,audiences:["Dental patients"],languages:["en"],localSeo:true,servicePages:true,locationPages:false,blog:false},pages:[{id:"home",path:"/",name:"Home",sections,seo:{title:"Pearl Dental | Dental Care in Hyderabad",description:"Explore dental treatments and contact Pearl Dental in Hyderabad to request an appointment.",canonicalPath:"/",indexable:true,primaryKeyword:"dental care Hyderabad",structuredDataTypes:["Dentist","MedicalClinic"]}}],navigation:[{label:"Home",href:"/"}],integrations:[],domains:[]});
}

function applyDeterministicMediaStage(site:Site):Site{const next=structuredClone(site),home=next.pages.find(page=>page.path==="/")??next.pages[0];if(!home)return next;const mediaByFamily:Record<string,string>={hero:"https://media.micirql.test/pearl-dental/hero-clinic.webp",services:"https://media.micirql.test/pearl-dental/treatment-room.webp",team:"https://media.micirql.test/pearl-dental/clinical-team.webp",features:"https://media.micirql.test/pearl-dental/care-detail.webp",testimonials:"https://media.micirql.test/pearl-dental/patient-space.webp"};let applied=0;for(const current of home.sections){const family=familyFromId(current.component.componentId),imageUrl=family?mediaByFamily[family]:undefined;if(!imageUrl||applied>=3)continue;current.props={...current.props,imageUrl};applied+=1;}return siteSchema.parse(next);}
function section(id:string,family:SectionFamily,theme:Site["theme"]["family"],props:Record<string,unknown>){return{id,component:{componentId:sectionDesignId(theme,family,1),version:"1.0.0"},props,bindings:{},hidden:false};}
export function familyFromId(componentId:string):string|undefined{const value=componentId.toLowerCase(),names=["navbar","hero","about","services","features","process","testimonials","gallery","team","cta","contact","footer"];for(const name of names)if(value.startsWith(`${name}.`))return name;const codes:Record<string,string>={nav:"navbar",hero:"hero",about:"about",serv:"services",feat:"features",proc:"process",test:"testimonials",gallery:"gallery",team:"team",cta:"cta",cont:"contact",foot:"footer"};for(const [code,name] of Object.entries(codes))if(value.includes(`-${code}-`))return name;return undefined;}
