import { findWebsiteLayout, isProductionLayoutCertified, normalizeLayoutIndustry, recommendWebsiteLayouts, type LayoutSelectionInput, type RankedLayout } from "@micirql/design-engine";
import { resolvePremiumCertifiedVariant, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { IndustryDesignPreset } from "./industry-design-preset-data";
import { selectIndustryPack, type IndustryPackSelection } from "./industry-pack-intelligence";
import { rankPresets, type OnboardingProfile } from "./preset-ranking";

export type CompositionIntent="conversion"|"trust"|"showcase"|"education"|"product"|"institutional";
export type CompositionSection={family:SectionFamily;variant:SectionVariant;purpose:string;priority:"required"|"recommended"};
export type WebsiteComposition={preset:IndustryDesignPreset;intent:CompositionIntent;sections:CompositionSection[];reasoning:string[];industryPack:IndustryPackSelection|null;layoutCandidate?:RankedLayout|null};
export type CompositionOptions={selectedLayoutId?:string|null;selectedLayoutScore?:number|null;selectedLayoutReasons?:string[]};

const PURPOSE:Partial<Record<SectionFamily,string>>={hero:"Communicate the primary promise and next action",about:"Establish identity, story and credibility",services:"Explain the core offer",features:"Show differentiators, outcomes or capabilities",process:"Reduce uncertainty by explaining how it works",team:"Build human and leadership trust",gallery:"Provide visual evidence and proof",testimonials:"Add social proof",cta:"Create a focused conversion moment",contact:"Make the final action easy"};
const FLOWS:Record<CompositionIntent,SectionFamily[]>={conversion:["hero","services","features","process","testimonials","cta","contact"],trust:["hero","about","services","team","features","testimonials","cta","contact"],showcase:["hero","about","gallery","services","testimonials","cta","contact"],education:["hero","features","services","process","team","testimonials","cta","contact"],product:["hero","features","services","process","gallery","testimonials","cta","contact"],institutional:["hero","about","features","services","team","gallery","cta","contact"]};
const PRODUCT_IDS=new Set(["saas","ai-startup","fintech-startup","healthtech-startup","edtech-startup","marketplace-startup","consumer-app-startup","developer-api-startup","cybersecurity-startup","deeptech-startup","climate-startup","launch-startup"]);
const INSTITUTIONAL_IDS=new Set(["enterprise-corporate","technology-corporate","industrial-manufacturing","engineering-corporate","holding-group","global-corporate","corporate"]);
const SHOWCASE_IDS=new Set(["artist","photographer","creative-studio","musician","fashion-brand","jewellery","furniture-interiors","beauty-brand","hotel-resort","events-wedding","real-estate","construction"]);
const EDUCATION_IDS=new Set(["school-education","coaching-training","online-course","edtech-startup"]);
const TRUST_IDS=new Set(["medical-clinic","dental-clinic","premium-implant-clinic","legal","finance-accounting","insurance","mental-wellness","veterinary"]);
const DENTAL_IDS=new Set(["dental-clinic","premium-implant-clinic"]);
const COMPOSITION_FAMILIES=new Set<SectionFamily>(["hero","about","services","features","process","team","gallery","testimonials","cta","contact"]);
const INTENT_VARIANTS:Record<CompositionIntent,Partial<Record<SectionFamily,SectionVariant>>>={conversion:{hero:2,services:3,features:3,process:2,testimonials:2,cta:4,contact:1},trust:{hero:2,about:2,services:3,team:3,features:2,testimonials:2,cta:2,contact:2},showcase:{hero:5,about:4,gallery:5,services:4,testimonials:4,cta:3,contact:2},education:{hero:3,features:3,services:3,process:4,team:2,testimonials:3,cta:2,contact:2},product:{hero:5,features:3,services:4,process:3,gallery:4,testimonials:2,cta:5,contact:2},institutional:{hero:4,about:3,features:2,services:2,team:3,gallery:4,cta:3,contact:1}};

export function composeWebsite(profile:OnboardingProfile,options:CompositionOptions={}):WebsiteComposition{
 const ranked=rankPresets(profile),top=ranked[0];if(!top)throw new Error("No design presets are available for composition.");
 const preset=top.preset,intent=inferIntent(profile,preset.id),industryPack=selectIndustryPack({industry:profile.industry,subindustry:profile.subindustry,goals:profile.goals,services:profile.required_capabilities});
 const notes=profile.notes?.trim()||"";
 const priorities=[...(profile.services??[]),...(profile.required_capabilities??[]),...(notes?[notes]:[])];
 const styleTags=[...(profile.style_tags??[]),...(notes?[notes]:[])];
 const layoutInput:LayoutSelectionInput={
  industry:profile.industry?.trim()||preset.id,
  ...(profile.subindustry?.trim()?{subindustryId:profile.subindustry.trim()}:{}),
  ...(profile.goals?.length?{goals:profile.goals}:{}),
  ...(priorities.length?{priorities}:{}),
  ...(styleTags.length?{styleTags}:{}),
 };
 const layoutCandidate=options.selectedLayoutId?plannerLockedLayout(profile,options):recommendWebsiteLayouts(layoutInput,1)[0]??null;
 const available=preset.variants;
 let sections:CompositionSection[];
 if(options.selectedLayoutId&&layoutCandidate){
  sections=layoutCandidate.layout.sections
   .filter(section=>COMPOSITION_FAMILIES.has(section.family as SectionFamily))
   .map(section=>{
    const family=section.family as SectionFamily;
    return{family,variant:variantFor(profile,preset,intent,family),purpose:section.purpose||PURPOSE[family]||"Support the page narrative",priority:(section.required?"required":"recommended") as "required"|"recommended"};
   });
 }else{
  const recipeFamilies=industryPack?industryPack.recipe.sections.map(recipeFamily).filter((f):f is SectionFamily=>Boolean(f&&available[f]!=null)):[];
  const base=recipeFamilies.length>=3?recipeFamilies:FLOWS[intent];
  const families=dedupe(base.filter(f=>available[f]!=null));
  for(const f of Object.keys(available) as SectionFamily[]){if(!families.includes(f)&&available[f]!=null&&families.length<9)families.splice(Math.max(1,families.length-2),0,f);}
  const heroIndex=families.indexOf("hero");if(heroIndex>0){families.splice(heroIndex,1);families.unshift("hero");}
  const contactIndex=families.indexOf("contact");if(contactIndex>=0&&contactIndex!==families.length-1){families.splice(contactIndex,1);families.push("contact");}
  const ctaIndex=families.indexOf("cta");if(ctaIndex>=0&&families.includes("contact")&&ctaIndex!==families.length-2){families.splice(ctaIndex,1);families.splice(families.length-1,0,"cta");}
  sections=families.slice(0,9).map((family,i)=>({family,variant:variantFor(profile,preset,intent,family),purpose:PURPOSE[family]||"Support the page narrative",priority:(i===0||family==="cta"||family==="contact"?"required":"recommended") as "required"|"recommended"}));
 }
 const changed=sections.filter(section=>section.variant!==available[section.family]);
 return{preset,intent,sections,industryPack,layoutCandidate,reasoning:[`Selected ${preset.name} from the business description`,`Optimized the narrative for ${intent}`,...(notes?["Applied free-text business brief to preset, layout, intent and section selection"]:[]),...(industryPack?industryPack.reasons:[]),...(layoutCandidate?[options.selectedLayoutId?`Planner-locked certified layout ${layoutCandidate.layout.id} is the single source of truth`:`Certified layout ${layoutCandidate.layout.id} ranked ${layoutCandidate.score}/100; applies after full section coverage`]:[]),`Composed ${sections.length} certified section families`,`Restricted automatic generation to premium-certified section variants`,...(changed.length?[`Adapted ${changed.length} section layouts to the ${intent} intent`]:[]),...top.reasons]};
}

function plannerLockedLayout(profile:OnboardingProfile,options:CompositionOptions):RankedLayout{
 const id=options.selectedLayoutId?.trim();if(!id)throw new Error("Planner-selected layout ID is required.");
 const layout=findWebsiteLayout(id);if(!layout)throw new Error(`Planner-selected layout ${id} does not exist in the website layout library.`);
 if(layout.status!=="certified")throw new Error(`Planner-selected layout ${id} is not certified.`);
 if(!isProductionLayoutCertified(layout))throw new Error(`Planner-selected layout ${id} does not have current rendered production certification.`);
 const requestedIndustry=normalizeLayoutIndustry(profile.industry?.trim()||"");
 if(layout.industry!==requestedIndustry)throw new Error(`Planner-selected layout ${id} does not match industry ${requestedIndustry}.`);
 const score=Number.isFinite(options.selectedLayoutScore)?Math.max(0,Math.min(100,Number(options.selectedLayoutScore))):100;
 const reasons=options.selectedLayoutReasons?.filter(Boolean).length?[...new Set(options.selectedLayoutReasons.filter(Boolean))]:["selected by production planner"];
 return{layout,score,reasons:[...reasons,"planner-locked rendered-certified layout"]};
}

function recipeFamily(value:string):SectionFamily|undefined{
 const v=value.toLowerCase();
 const direct=(['hero','about','services','features','process','team','gallery','testimonials','cta','contact'] as SectionFamily[]).find(f=>f===v);if(direct)return direct;
 if(/doctor|agent|leadership|faculty/.test(v))return"team";
 if(/appointment-cta|enquiry-cta|lead-cta/.test(v))return"cta";
 if(/before-after|properties|projects|portfolio/.test(v))return"gallery";
 if(/trust|technology|amenities|proof|financing|location/.test(v))return"features";
 if(/treatment|property-category|offerings/.test(v))return"services";
 return undefined;
}
function variantFor(profile:OnboardingProfile,preset:IndustryDesignPreset,intent:CompositionIntent,family:SectionFamily):SectionVariant{const requested=requestedVariant(profile,preset,intent,family);return resolvePremiumCertifiedVariant(family,requested);}
function requestedVariant(profile:OnboardingProfile,preset:IndustryDesignPreset,intent:CompositionIntent,family:SectionFamily):SectionVariant{const fallback=preset.variants[family]??1,preferred=INTENT_VARIANTS[intent][family];if(!preferred)return fallback;const text=[profile.industry,profile.subindustry,...(profile.goals||[]),...(profile.required_capabilities||[]),...(profile.services||[]),profile.notes].filter(Boolean).join(" ").toLowerCase();if(family==="hero"){if(/luxury|premium|portfolio|gallery|visual|hotel|resort|fashion|jewel|property|real estate|elegant|sophisticated/.test(text))return 5;if(/doctor|clinic|dental|medical|legal|finance|insurance|trust/.test(text))return 2;}if(family==="gallery"&&/before.?after|portfolio|property|project|hotel|food|fashion|jewel|interior|visual|results|transformation/.test(text))return 5;if(family==="cta"&&/book|appointment|buy|signup|trial|demo|download|quote|enquir|consultation|whatsapp|phone/.test(text))return intent==="product"?5:4;if(family==="contact"&&/clinic|local|service|legal|finance|insurance|whatsapp|phone/.test(text))return 1;return preferred;}
function inferIntent(profile:OnboardingProfile,id:string):CompositionIntent{
 const primaryText=[profile.industry,profile.subindustry,...(profile.goals||[]),...(profile.required_capabilities||[]),profile.notes].filter(Boolean).join(" ").toLowerCase();
 const serviceText=(profile.services||[]).filter(Boolean).join(" ").toLowerCase();
 const text=`${primaryText} ${serviceText}`.trim();
 const isDental=DENTAL_IDS.has(id)||/dental|dentist|dentistry|orthodont|endodont|implant|smile design|root canal|tooth|oral care/.test(text);
 if(isDental){
  if(/emergency|urgent|tooth pain|broken tooth|same.?day|contact clinic|call clinic/.test(text))return"conversion";
  if(/learn|education|educational|explain treatment|treatment process|how it works/.test(primaryText))return"education";
  if(/portfolio|gallery|showcase|before.?after|smile design|veneers|whitening|cosmetic|full mouth rehabilitation|smile makeover|transformation|results/.test(primaryText))return"showcase";
 }
 if(/demo|trial|waitlist|download|product|platform|api/.test(text)||PRODUCT_IDS.has(id))return"product";
 if(/admission|enrol|learn|course|training/.test(primaryText)||EDUCATION_IDS.has(id))return"education";
 if(/portfolio|gallery|showcase|projects|collection/.test(primaryText)||SHOWCASE_IDS.has(id))return"showcase";
 if(/enterprise|institution|global|manufactur|infrastructure|group company/.test(text)||INSTITUTIONAL_IDS.has(id))return"institutional";
 if(/trust|credib|doctor|clinic|law|finance|insurance/.test(text)||TRUST_IDS.has(id))return"trust";
 return"conversion";
}
function dedupe<T>(xs:T[]):T[]{return[...new Set(xs)];}
