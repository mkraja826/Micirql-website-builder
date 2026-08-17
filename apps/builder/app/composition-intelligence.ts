import type { SectionFamily, SectionVariant } from "@micirql/sections";
import type { IndustryDesignPreset } from "./industry-design-preset-data";
import { rankPresets, type OnboardingProfile } from "./preset-ranking";

export type CompositionIntent="conversion"|"trust"|"showcase"|"education"|"product"|"institutional";
export type CompositionSection={family:SectionFamily;variant:SectionVariant;purpose:string;priority:"required"|"recommended"};
export type WebsiteComposition={preset:IndustryDesignPreset;intent:CompositionIntent;sections:CompositionSection[];reasoning:string[]};

const PURPOSE:Partial<Record<SectionFamily,string>>={hero:"Communicate the primary promise and next action",about:"Establish identity, story and credibility",services:"Explain the core offer",features:"Show differentiators, outcomes or capabilities",process:"Reduce uncertainty by explaining how it works",team:"Build human and leadership trust",gallery:"Provide visual evidence and proof",testimonials:"Add social proof",cta:"Create a focused conversion moment",contact:"Make the final action easy"};
const FLOWS:Record<CompositionIntent,SectionFamily[]>={
conversion:["hero","services","features","process","testimonials","cta","contact"],
trust:["hero","about","services","team","features","testimonials","cta","contact"],
showcase:["hero","about","gallery","services","testimonials","cta","contact"],
education:["hero","features","services","process","team","testimonials","cta","contact"],
product:["hero","features","services","process","gallery","testimonials","cta","contact"],
institutional:["hero","about","features","services","team","gallery","cta","contact"]
};
const PRODUCT_IDS=new Set(["saas","ai-startup","fintech-startup","healthtech-startup","edtech-startup","marketplace-startup","consumer-app-startup","developer-api-startup","cybersecurity-startup","deeptech-startup","climate-startup","launch-startup"]);
const INSTITUTIONAL_IDS=new Set(["enterprise-corporate","technology-corporate","industrial-manufacturing","engineering-corporate","holding-group","global-corporate","corporate"]);
const SHOWCASE_IDS=new Set(["artist","photographer","creative-studio","musician","fashion-brand","jewellery","furniture-interiors","beauty-brand","hotel-resort","events-wedding","real-estate","construction"]);
const EDUCATION_IDS=new Set(["school-education","coaching-training","online-course","edtech-startup"]);
const TRUST_IDS=new Set(["medical-clinic","dental-clinic","premium-implant-clinic","legal","finance-accounting","insurance","mental-wellness","veterinary"]);

export function composeWebsite(profile:OnboardingProfile):WebsiteComposition{
 const ranked=rankPresets(profile);const preset=ranked[0].preset;const intent=inferIntent(profile,preset.id);const base=FLOWS[intent];const available=preset.variants;const families=dedupe(base.filter(f=>available[f]!=null));
 // Preserve valuable preset-specific sections that the generic flow did not include.
 for(const f of Object.keys(available) as SectionFamily[]){if(!families.includes(f)&&available[f]!=null&&families.length<9)families.splice(Math.max(1,families.length-2),0,f);}
 // Hero and CTA/contact hierarchy are protected regardless of additions.
 const heroIndex=families.indexOf("hero");if(heroIndex>0){families.splice(heroIndex,1);families.unshift("hero");}
 const contactIndex=families.indexOf("contact");if(contactIndex>=0&&contactIndex!==families.length-1){families.splice(contactIndex,1);families.push("contact");}
 const ctaIndex=families.indexOf("cta");if(ctaIndex>=0&&families.includes("contact")&&ctaIndex!==families.length-2){families.splice(ctaIndex,1);families.splice(families.length-1,0,"cta");}
 const sections=families.slice(0,9).map((family,i)=>({family,variant:available[family] as SectionVariant,purpose:PURPOSE[family]||"Support the page narrative",priority:(i===0||family==="cta"||family==="contact"?"required":"recommended") as "required"|"recommended"}));
 return{preset,intent,sections,reasoning:[`Selected ${preset.name} from the business description`,`Optimized the narrative for ${intent}`,`Composed ${sections.length} certified section families instead of using a fixed template`,...ranked[0].reasons]};
}
function inferIntent(profile:OnboardingProfile,id:string):CompositionIntent{const text=[profile.industry,profile.subindustry,...(profile.goals||[]),...(profile.required_capabilities||[])].filter(Boolean).join(" ").toLowerCase();if(/demo|trial|waitlist|download|product|platform|api/.test(text)||PRODUCT_IDS.has(id))return"product";if(/admission|enrol|learn|course|training/.test(text)||EDUCATION_IDS.has(id))return"education";if(/portfolio|gallery|showcase|projects|collection/.test(text)||SHOWCASE_IDS.has(id))return"showcase";if(/enterprise|institution|global|manufactur|infrastructure|group company/.test(text)||INSTITUTIONAL_IDS.has(id))return"institutional";if(/trust|credib|doctor|clinic|law|finance|insurance/.test(text)||TRUST_IDS.has(id))return"trust";return"conversion";}
function dedupe<T>(xs:T[]):T[]{return[...new Set(xs)];}
