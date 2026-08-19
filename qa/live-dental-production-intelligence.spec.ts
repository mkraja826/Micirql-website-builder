import { expect, test } from "@playwright/test";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { executeMediaPlan, type MediaAsset } from "../apps/builder/app/media-execution";
import { fetchPexelsImage } from "../apps/builder/app/pexels-stock-image";
import { planVisualMedia } from "../apps/builder/app/visual-media-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const profiles:OnboardingProfile[]=[
 {business_name:"Harbor Dental Care",industry:"dental clinic",subindustry:"general dentistry",location:"Hyderabad",goals:["book appointments","build trust"],style_tags:["clean","professional"],required_capabilities:["appointment booking"],services:["Preventive dentistry","Root canal treatment","Crowns and bridges"]},
 {business_name:"Apex Implant Centre",industry:"dental clinic",subindustry:"implant dentistry",location:"Hyderabad",goals:["book implant consultations","build trust"],style_tags:["premium","luxury"],required_capabilities:["appointment booking"],services:["Dental implants","Full-arch rehabilitation","Implant-supported crowns"]},
 {business_name:"Ivory Smile Studio",industry:"dental clinic",subindustry:"cosmetic dentistry",location:"Bengaluru",goals:["showcase smile design","book consultations"],style_tags:["premium","editorial"],required_capabilities:["gallery","appointment booking"],services:["Smile design","Veneers","Teeth whitening"]},
];

async function livePexelsAssets(profile:OnboardingProfile,plan:ReturnType<typeof planVisualMedia>){
 const excluded:number[]=[];const assets:MediaAsset[]=[];
 for(const decision of plan.sections.filter(item=>item.role!=="none"&&item.family!=="team").slice(0,3)){
  const image=await fetchPexelsImage({query:decision.subject,domain:"dental clinic",family:decision.family,excludedPhotoIds:excluded});excluded.push(image.photoId);
  assets.push({id:`pexels-${image.photoId}`,name:`Pexels ${decision.family}`,url:image.sourceUrl,source:"licensed",tags:["dental","dentistry",decision.family,decision.role,...(decision.preferredTags??[])],alt:image.alt,aspect:decision.aspect,verified:true});
 }
 return assets;
}

test("real Dental onboarding intelligence drives safe media execution",async()=>{
 test.skip(!process.env.PEXELS_API_KEY,"PEXELS_API_KEY is required for live Dental production-intelligence QA.");
 for(const profile of profiles){
  const composition=composeWebsite(profile);
  expect(["dental-clinic","premium-implant-clinic"]).toContain(composition.preset.id);
  expect(composition.sections[0]?.family).toBe("hero");
  const quality=inferGenerationQuality(profile,composition);
  const visualPlan=planVisualMedia(profile,composition,quality);
  const hero=visualPlan.sections.find(item=>item.family==="hero");
  const team=visualPlan.sections.find(item=>item.family==="team");
  expect(hero?.role).toBe("hero-photo");
  if(team){expect(team.role).toBe("people");expect(team.subject.toLowerCase()).toContain("verified");}

  const stock=await livePexelsAssets(profile,visualPlan);
  expect(new Set(stock.map(item=>item.id)).size).toBe(stock.length);
  const execution=executeMediaPlan({plan:visualPlan,licensedAssets:stock,allowGeneration:false});
  const heroRequest=execution.requests.find(item=>item.family==="hero");
  expect(heroRequest?.source).toBe("licensed");
  if(team){
   const teamRequest=execution.requests.find(item=>item.family==="team");
   expect(teamRequest?.source).toBe("none");
   expect(teamRequest?.reason.toLowerCase()).toContain("customer-supplied");
  }
  expect(execution.rules.some(rule=>rule.includes("Team and leadership portraits"))).toBe(true);
 }
});
