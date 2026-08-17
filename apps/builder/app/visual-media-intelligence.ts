import type { SectionFamily } from "@micirql/sections";
import type { OnboardingProfile } from "./preset-ranking";
import type { WebsiteComposition } from "./composition-intelligence";
import type { GenerationQualityProfile } from "./generation-quality-intelligence";

export type VisualRole="none"|"hero-photo"|"people"|"product-ui"|"portfolio"|"place"|"process"|"illustration"|"abstract"|"texture";
export type VisualProminence="supporting"|"balanced"|"dominant";
export type VisualAspect="1:1"|"4:3"|"3:2"|"16:9"|"portrait"|"wide";
export type SectionVisualDecision={family:SectionFamily;role:VisualRole;prominence:VisualProminence;aspect:VisualAspect;subject:string;avoid:string[]};
export type VisualMediaPlan={style:"photographic"|"editorial"|"product"|"illustrative"|"mixed";sections:SectionVisualDecision[];rules:string[]};

const PHOTO_IDS=new Set(["medical-clinic","dental-clinic","premium-implant-clinic","physiotherapy","dermatology","fitness","yoga-spa","veterinary","salon-beauty","hotel-resort","bakery-catering","events-wedding","travel-tourism","restaurant","real-estate","construction","fashion-brand","jewellery","furniture-interiors","beauty-brand","photographer","artist"]);
const PRODUCT_IDS=new Set(["saas","ai-startup","fintech-startup","healthtech-startup","edtech-startup","marketplace-startup","consumer-app-startup","developer-api-startup","cybersecurity-startup","deeptech-startup"]);

export function planVisualMedia(profile:OnboardingProfile,composition:WebsiteComposition,quality:GenerationQualityProfile):VisualMediaPlan{
 const id=composition.preset.id;
 const text=[profile.industry,profile.subindustry,...(profile.services||[]),...(profile.style_tags||[])].filter(Boolean).join(" ").toLowerCase();
 const photographic=PHOTO_IDS.has(id)||/clinic|hotel|restaurant|fashion|property|construction|artist|photo|wedding|travel|salon/.test(text);
 const product=PRODUCT_IDS.has(id)||quality.heroEmphasis==="product";
 const editorial=quality.sectionRhythm==="cinematic"||/luxury|editorial|premium/.test(text);
 const style:VisualMediaPlan["style"]=product&&!photographic?"product":editorial&&photographic?"editorial":photographic?"photographic":product?"product":"mixed";
 const pack=composition.industryPack;
 const dental=pack?.pack.id==="dental"?{subindustry:pack.subindustry?.id??null,imagery:pack.subindustry?.imageryProfile??[]}:null;
 const sections=composition.sections.map((s,index)=>dental?decideDental(s.family,index,style,quality,dental.subindustry,dental.imagery):decide(s.family,index,style,quality,text));
 // Avoid monotonous pages: adjacent sections should not both demand dominant imagery.
 for(let i=1;i<sections.length;i++){const prev=sections[i-1],cur=sections[i];if(prev&&cur&&prev.prominence==="dominant"&&cur.prominence==="dominant")cur.prominence="balanced";}
 const industryRules=dental?[
  "Dental imagery must match the selected dental sub-industry rather than generic healthcare imagery",
  "Doctor and team portraits must come from customer-supplied or verified reusable assets",
  "Before-and-after dental evidence may only be shown when supplied and verified; never synthesize treatment outcomes",
  "Do not depict equipment, facilities, credentials or procedures as belonging to the clinic unless that fact is grounded in supplied business information",
 ]:[];
 return{style,sections,rules:["Use supplied business media before generated or stock media","Never invent certificates, staff, facilities, projects or product screenshots","Do not repeat the same image in multiple primary sections","Keep text readable over imagery and provide useful alt text","Prefer no image over an irrelevant decorative image",...industryRules]};
}

function decideDental(family:SectionFamily,index:number,style:VisualMediaPlan["style"],q:GenerationQualityProfile,subindustry:string|null,imagery:string[]):SectionVisualDecision{
 const profile=dentalProfile(subindustry,imagery);
 let role:VisualRole="none",prominence:VisualProminence="supporting",aspect:VisualAspect="4:3",subject="";
 if(family==="hero"){
  role="hero-photo";prominence=q.imageDensity==="low"?"balanced":"dominant";aspect="wide";subject=profile.hero;
 } else if(family==="services"){
  role=q.imageDensity==="low"?"none":"hero-photo";prominence="supporting";aspect="4:3";subject=profile.services;
 } else if(family==="features"){
  role=q.imageDensity==="high"?"illustration":"none";prominence="supporting";aspect="4:3";subject=profile.technology;
 } else if(family==="process"){
  role="process";prominence="supporting";aspect="16:9";subject=profile.process;
 } else if(family==="team"){
  role="people";prominence="balanced";aspect="portrait";subject="Verified portraits of the clinic's real dentist or dental team, supplied by the business";
 } else if(family==="about"){
  role="place";prominence=q.visualWeight>70?"balanced":"supporting";aspect="3:2";subject="Verified clinic interior, reception, treatment room or real team environment supplied by the business";
 } else if(family==="gallery"){
  if(subindustry==="cosmetic-dentistry"){
   role="portfolio";prominence="dominant";aspect="3:2";subject="Verified cosmetic dentistry case photography or before-and-after outcomes supplied by the clinic; otherwise use truthful smile-design or consultation context";
  } else {
   role="portfolio";prominence="balanced";aspect="3:2";subject=profile.gallery;
  }
 } else if(family==="testimonials"){
  role="none";subject="Use review text or verified review-source branding; do not fabricate patient portraits";
 } else if(family==="cta"){
  role=style==="editorial"?"texture":"none";prominence="supporting";aspect="wide";subject="Subtle abstract dental brand atmosphere using the selected palette, with no clinical claims";
 }
 const avoid=["generic handshake stock photography","generic corporate office imagery","fake doctors or patient identities","fabricated clinic interiors","fabricated equipment or credentials","synthetic before-and-after treatment results","graphic or distressing procedure imagery",...(index>0?["repeating the hero visual"]:[])];
 return{family,role,prominence,aspect,subject,avoid};
}

function dentalProfile(subindustry:string|null,imagery:string[]){
 const hints=imagery.length?` Preferred visual cues: ${imagery.join(", ")}.`:"";
 switch(subindustry){
  case "implant-dentistry":return{
   hero:`Premium implant consultation or digital treatment-planning context focused on confidence, precision and adult care; use a generic non-identifying care scene unless real clinic media is supplied.${hints}`,
   services:"Clear non-graphic visual context for implant consultation, restorative planning and smile rehabilitation; avoid implying a specific patient's outcome",
   technology:"Generic digital implant-planning, scan or 3D dental-technology concept unless the clinic has supplied evidence of specific equipment",
   process:"A calm consultation-to-planning dental implant journey shown without surgical detail or unsupported promises",
   gallery:"Verified implant case media when supplied; otherwise premium consultation, planning or restorative-care context without fabricated outcomes",
  };
  case "cosmetic-dentistry":return{
   hero:`Natural smile-confidence or smile-design consultation context with premium, warm presentation; no synthetic before-and-after result.${hints}`,
   services:"Tasteful, non-graphic visual context for veneers, whitening or smile-design services without promising a result",
   technology:"Generic digital smile-design or scanning concept unless specific clinic technology is supplied and verified",
   process:"Consultation, smile planning and review journey presented as process rather than a guaranteed transformation",
   gallery:"Verified before-and-after or case photography supplied by the clinic; otherwise natural smile portraits and consultation context only",
  };
  case "orthodontics":return{
   hero:`Friendly orthodontic consultation with aligner, braces or digital-scanning context suitable for teen and adult care; avoid identifiable real staff unless supplied.${hints}`,
   services:"Clean visual explanations of braces, clear aligners and orthodontic consultation without fabricated patient outcomes",
   technology:"Generic intraoral-scanning or orthodontic planning visual unless the clinic has supplied the exact technology",
   process:"A clear consultation, records, treatment-plan and review journey without promising treatment duration or result",
   gallery:"Verified orthodontic case media when supplied; otherwise aligner, braces, scanning or consultation context",
  };
  case "endodontics":return{
   hero:`Calm specialist dental consultation or precision endodontic-care context focused on reassurance and pain relief without dramatic procedure imagery.${hints}`,
   services:"Non-graphic root-canal consultation and tooth-preservation visual context",
   technology:"Generic precision dentistry or magnification concept unless microscope or equipment ownership is supplied by the clinic",
   process:"Assessment, diagnosis, treatment and follow-up journey expressed calmly and without graphic imagery",
   gallery:"Verified clinic or technology media when supplied; otherwise calm precision-dentistry context",
  };
  default:return{
   hero:`Welcoming general dental-care environment, natural smile or dentist-patient consultation context with a bright, trustworthy feel; use generic non-identifying context unless real clinic media is supplied.${hints}`,
   services:"Treatment-specific but non-graphic dental care imagery covering the services actually supplied in the business brief",
   technology:"Generic modern dental-care or scanning concept only when useful; never imply equipment the clinic did not report",
   process:"A reassuring appointment, assessment, treatment-plan and follow-up journey",
   gallery:"Verified clinic, treatment-room or care-environment media when supplied; otherwise truthful general dental context",
  };
 }
}

function decide(family:SectionFamily,index:number,style:VisualMediaPlan["style"],q:GenerationQualityProfile,text:string):SectionVisualDecision{
 let role:VisualRole="none",prominence:VisualProminence="supporting",aspect:VisualAspect="4:3",subject="";
 if(family==="hero"){role=style==="product"?"product-ui":style==="photographic"||style==="editorial"?"hero-photo":"abstract";prominence=q.imageDensity==="low"?"balanced":"dominant";aspect="wide";subject=heroSubject(text,role);}
 else if(family==="gallery"){role=style==="product"?"product-ui":"portfolio";prominence="dominant";aspect="3:2";subject="Authentic examples of the business, work, product or environment";}
 else if(family==="team"){role="people";prominence="balanced";aspect="portrait";subject="Real team or leadership portraits when supplied";}
 else if(family==="process"){role=style==="product"?"product-ui":"process";prominence="supporting";aspect="16:9";subject="A real workflow, product state or service process";}
 else if(family==="about"){role=style==="product"?"illustration":"place";prominence=q.visualWeight>70?"balanced":"supporting";aspect="3:2";subject="Founder, team, workspace, facility or brand story evidence";}
 else if(family==="features"){role=style==="product"?"product-ui":q.imageDensity==="high"?"illustration":"none";prominence="supporting";aspect="4:3";subject="Visual evidence that directly explains the feature";}
 else if(family==="services"){role=q.imageDensity==="high"?"hero-photo":"none";prominence="supporting";aspect="4:3";subject="Service-specific authentic imagery";}
 else if(family==="testimonials"){role="none";subject="Avoid fake customer portraits";}
 else if(family==="cta"){role=q.sectionRhythm==="cinematic"?"texture":"none";prominence="supporting";aspect="wide";subject="Subtle brand atmosphere only";}
 return{family,role,prominence,aspect,subject,avoid:["generic handshake stock photography","unrelated decorative imagery","fake logos or awards",...(index>0?["repeating the hero visual"]:[])]};
}
function heroSubject(text:string,role:VisualRole){if(role==="product-ui")return"A truthful product interface or product-focused visual derived from supplied product context";if(/clinic|medical|dental/.test(text))return"Authentic care environment, clinician or treatment context without fabricated claims";if(/hotel|travel|restaurant|property|construction/.test(text))return"A strong real-world environment or destination establishing the offer immediately";if(/artist|fashion|photo|jewellery|beauty/.test(text))return"Signature work or product imagery representing the creator or brand";return"A distinctive business-relevant visual supporting the primary promise";}
