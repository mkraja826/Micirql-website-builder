import { expect, test } from "@playwright/test";
import { findWebsiteLayout } from "@micirql/design-engine";
import { planVisualMedia } from "../apps/builder/app/visual-media-intelligence";
import type { WebsiteComposition } from "../apps/builder/app/composition-intelligence";
import type { GenerationQualityProfile } from "../apps/builder/app/generation-quality-intelligence";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { selectIndustryPack } from "../apps/builder/app/industry-pack-intelligence";

const ids=["dental-01-clinical-authority","dental-02-implant-luxury","dental-03-smile-studio","dental-05-digital-dentistry","dental-08-boutique-cosmetic"] as const;
const quality:GenerationQualityProfile={heroEmphasis:"visual",contentDensity:"balanced",imageDensity:"balanced",ctaStrength:"standard",mobileStrategy:"visual-first",trustWeight:75,visualWeight:80,sectionRhythm:"cinematic",maxPrimarySections:8,reasons:[]};

for(const id of ids){
 test(`${id} owns a distinct certified imagery direction`,()=>{
  const layout=findWebsiteLayout(id);expect(layout).toBeTruthy();
  const preset=INDUSTRY_DESIGN_PRESETS.find(item=>item.id===(id==="dental-02-implant-luxury"?"premium-implant-clinic":"dental-clinic"));expect(preset).toBeTruthy();
  const subindustry=id==="dental-02-implant-luxury"||id==="dental-05-digital-dentistry"?"implant-dentistry":id==="dental-03-smile-studio"||id==="dental-08-boutique-cosmetic"?"cosmetic-dentistry":"general-dentistry";
  const composition:WebsiteComposition={preset:preset!,intent:"showcase",sections:layout!.sections.filter(section=>["hero","services","features","process","team","gallery","testimonials","cta"].includes(section.family)).map(section=>({family:section.family as any,variant:1,purpose:section.purpose,priority:section.required?"required":"recommended"})),reasoning:[],industryPack:selectIndustryPack({industry:"dental",subindustry}),layoutCandidate:{layout:layout!,score:100,reasons:["qa lock"]}};
  const plan=planVisualMedia({industry:"dental",subindustry,services:[],goals:[],style_tags:layout!.styleTags,required_capabilities:[]},composition,quality);
  const hero=plan.sections.find(section=>section.family==="hero");expect(hero).toBeTruthy();
  expect(hero!.preferredTags).toContain(id);
  expect(plan.rules).toContain(`Certified imagery direction locked to ${id}`);
 });
}

test("flagship hero art directions do not collapse to one stock-photo brief",()=>{
 const fingerprints=ids.map(id=>{
  const layout=findWebsiteLayout(id)!;
  const preset=INDUSTRY_DESIGN_PRESETS.find(item=>item.id===(id==="dental-02-implant-luxury"?"premium-implant-clinic":"dental-clinic"))!;
  const subindustry=id==="dental-02-implant-luxury"||id==="dental-05-digital-dentistry"?"implant-dentistry":id==="dental-03-smile-studio"||id==="dental-08-boutique-cosmetic"?"cosmetic-dentistry":"general-dentistry";
  const composition:WebsiteComposition={preset,intent:"showcase",sections:[{family:"hero",variant:1,purpose:"hero",priority:"required"}],reasoning:[],industryPack:selectIndustryPack({industry:"dental",subindustry}),layoutCandidate:{layout,score:100,reasons:[]}};
  const hero=planVisualMedia({industry:"dental",subindustry,style_tags:layout.styleTags},composition,quality).sections[0]!;
  return `${hero.role}|${hero.aspect}|${hero.prominence}|${hero.subject}`;
 });
 expect(new Set(fingerprints).size).toBe(ids.length);
});
