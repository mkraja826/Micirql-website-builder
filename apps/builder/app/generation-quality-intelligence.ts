import type { OnboardingProfile } from "./preset-ranking";
import type { WebsiteComposition } from "./composition-intelligence";

export type ContentDensity="compact"|"balanced"|"rich";
export type ImageDensity="low"|"balanced"|"high";
export type CtaStrength="soft"|"standard"|"strong";
export type MobileStrategy="conversion-first"|"visual-first"|"trust-first"|"product-first";
export type GenerationQualityProfile={
 heroEmphasis:"message"|"visual"|"product"|"authority";
 contentDensity:ContentDensity;
 imageDensity:ImageDensity;
 ctaStrength:CtaStrength;
 mobileStrategy:MobileStrategy;
 trustWeight:number;
 visualWeight:number;
 sectionRhythm:"tight"|"balanced"|"cinematic";
 maxPrimarySections:number;
 reasons:string[];
};
const VISUAL=new Set(["artist","photographer","creative-studio","musician","fashion-brand","jewellery","furniture-interiors","beauty-brand","hotel-resort","events-wedding","restaurant","real-estate"]);
const TRUST=new Set(["medical-clinic","dental-clinic","premium-implant-clinic","legal","finance-accounting","insurance","mental-wellness","veterinary","enterprise-corporate","global-corporate","holding-group"]);
const PRODUCT=new Set(["saas","ai-startup","fintech-startup","healthtech-startup","edtech-startup","marketplace-startup","consumer-app-startup","developer-api-startup","cybersecurity-startup","deeptech-startup","climate-startup","launch-startup"]);
export function inferGenerationQuality(profile:OnboardingProfile,composition:WebsiteComposition):GenerationQualityProfile{
 const id=composition.preset.id;const text=[profile.industry,profile.subindustry,...(profile.goals||[]),...(profile.style_tags||[]),...(profile.services||[])].filter(Boolean).join(" ").toLowerCase();
 const visual=VISUAL.has(id)||/portfolio|gallery|showcase|luxury|visual|photograph|fashion|design/.test(text);
 const trust=TRUST.has(id)||/trust|credible|professional|enterprise|medical|legal|finance/.test(text);
 const product=PRODUCT.has(id)||composition.intent==="product";
 const fastConversion=/book|appointment|call|quote|enquir|lead|reserve|order|buy|waitlist|demo|trial/.test(text);
 let heroEmphasis:GenerationQualityProfile["heroEmphasis"]="message";if(product)heroEmphasis="product";else if(visual)heroEmphasis="visual";else if(trust||composition.intent==="institutional")heroEmphasis="authority";
 let contentDensity:ContentDensity="balanced";if(composition.intent==="institutional"||/technical|engineering|industrial|education/.test(text))contentDensity="rich";if(fastConversion&&!trust&&!product)contentDensity="compact";
 let imageDensity:ImageDensity="balanced";if(visual)imageDensity="high";else if(product||/api|developer|accounting|insurance/.test(text))imageDensity="low";
 const ctaStrength:CtaStrength=fastConversion||product?"strong":trust?"standard":"soft";
 let mobileStrategy:MobileStrategy="conversion-first";if(product)mobileStrategy="product-first";else if(visual)mobileStrategy="visual-first";else if(trust)mobileStrategy="trust-first";
 const trustWeight=Math.min(100,(trust?75:45)+(composition.intent==="institutional"?15:0));
 const visualWeight=Math.min(100,(visual?80:40)+(composition.intent==="showcase"?15:0));
 const sectionRhythm=visual?"cinematic":contentDensity==="compact"?"tight":"balanced";
 const maxPrimarySections=contentDensity==="rich"?9:contentDensity==="compact"?6:8;
 return{heroEmphasis,contentDensity,imageDensity,ctaStrength,mobileStrategy,trustWeight,visualWeight,sectionRhythm,maxPrimarySections,reasons:[`${composition.preset.name} quality profile`,`Hero emphasizes ${heroEmphasis}`,`${contentDensity} content with ${imageDensity} imagery`,`${mobileStrategy} mobile hierarchy`,`${ctaStrength} conversion pressure`]};
}
