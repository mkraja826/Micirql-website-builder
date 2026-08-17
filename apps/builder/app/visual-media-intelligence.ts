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
 const id=composition.preset.id;const text=[profile.industry,profile.subindustry,...(profile.services||[]),...(profile.style_tags||[])].filter(Boolean).join(" ").toLowerCase();
 const photographic=PHOTO_IDS.has(id)||/clinic|hotel|restaurant|fashion|property|construction|artist|photo|wedding|travel|salon/.test(text);
 const product=PRODUCT_IDS.has(id)||quality.heroEmphasis==="product";
 const editorial=quality.sectionRhythm==="cinematic"||/luxury|editorial|premium/.test(text);
 const style:VisualMediaPlan["style"]=product&&!photographic?"product":editorial&&photographic?"editorial":photographic?"photographic":product?"product":"mixed";
 const sections=composition.sections.map((s,index)=>decide(s.family,index,style,quality,text));
 // Avoid monotonous pages: adjacent sections should not both demand dominant imagery.
 for(let i=1;i<sections.length;i++){const prev=sections[i-1],cur=sections[i];if(prev&&cur&&prev.prominence==="dominant"&&cur.prominence==="dominant")cur.prominence="balanced";}
 return{style,sections,rules:["Use supplied business media before generated or stock media","Never invent certificates, staff, facilities, projects or product screenshots","Do not repeat the same image in multiple primary sections","Keep text readable over imagery and provide useful alt text","Prefer no image over an irrelevant decorative image"]};
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
