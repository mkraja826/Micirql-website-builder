import type { Site } from "@micirql/schema";

export type SiteVisualQualityIssueCode=
  |"LOW_SECTION_VARIETY"
  |"REPETITIVE_COMPONENT_RUN"
  |"LOW_IMAGE_DIVERSITY"
  |"REPEATED_IMAGE_URL"
  |"LOW_IMAGE_ASPECT_VARIETY"
  |"WEAK_VISUAL_COVERAGE";

export type SiteVisualQualityIssue={code:SiteVisualQualityIssueCode;message:string;penalty:number;pagePath?:string};
export type SiteVisualQualityResult={score:number;ready:boolean;threshold:number;issues:SiteVisualQualityIssue[];metrics:{sections:number;componentFamilies:number;images:number;uniqueImages:number;imageAspects:number;visualCoverage:number}};

const READY_THRESHOLD=82;

export function evaluateSiteVisualQuality(site:Site):SiteVisualQualityResult{
 const issues:SiteVisualQualityIssue[]=[];
 let totalSections=0,totalImages=0;
 const allFamilies=new Set<string>(),allImageUrls:string[]=[],allAspects=new Set<string>();

 for(const page of site.pages){
  const sections=page.sections??[];totalSections+=sections.length;
  const families=sections.map(section=>family(section.component.componentId));
  families.forEach(value=>allFamilies.add(value));
  const uniqueFamilies=new Set(families);
  if(sections.length>=6&&uniqueFamilies.size/sections.length<0.58)issues.push({code:"LOW_SECTION_VARIETY",message:`${page.path} relies on too few section families for its length.`,penalty:10,pagePath:page.path});
  let run=1;
  for(let i=1;i<families.length;i++){
   run=families[i]===families[i-1]?run+1:1;
   if(run===3)issues.push({code:"REPETITIVE_COMPONENT_RUN",message:`${page.path} repeats the same section family three times in sequence.`,penalty:12,pagePath:page.path});
  }
  for(const section of sections){
   const props=section.props as Record<string,unknown>;
   const urls=collectImages(props);totalImages+=urls.length;allImageUrls.push(...urls);
   const ratio=stringValue(props.imageRatio);if(ratio)allAspects.add(ratio);
  }
 }

 const uniqueImages=new Set(allImageUrls);
 const duplicateCount=Math.max(0,allImageUrls.length-uniqueImages.size);
 if(duplicateCount>0)issues.push({code:"REPEATED_IMAGE_URL",message:`${duplicateCount} rendered image placement${duplicateCount===1?"":"s"} reuse an already-used image URL.`,penalty:Math.min(18,duplicateCount*6)});
 if(totalImages>=4&&uniqueImages.size/totalImages<0.72)issues.push({code:"LOW_IMAGE_DIVERSITY",message:"Too many visual placements reuse the same small image set.",penalty:12});
 if(totalImages>=5&&allAspects.size<2)issues.push({code:"LOW_IMAGE_ASPECT_VARIETY",message:"The site uses nearly one image geometry throughout, creating visual monotony.",penalty:8});
 const visualCoverage=totalSections?totalImages/totalSections:0;
 if(totalSections>=6&&visualCoverage<0.28)issues.push({code:"WEAK_VISUAL_COVERAGE",message:"The completed site has too little visual support for its section count.",penalty:10});

 const rawPenalty=issues.reduce((sum,item)=>sum+item.penalty,0);
 const score=Math.max(0,Math.min(100,100-rawPenalty));
 return{score,ready:score>=READY_THRESHOLD,threshold:READY_THRESHOLD,issues,metrics:{sections:totalSections,componentFamilies:allFamilies.size,images:totalImages,uniqueImages:uniqueImages.size,imageAspects:allAspects.size,visualCoverage:Number(visualCoverage.toFixed(2))}};
}

function collectImages(props:Record<string,unknown>){
 const urls:string[]=[];
 const image=props.image;
 if(typeof image==="string"&&image.trim())urls.push(image.trim());
 else if(image&&typeof image==="object"){
  const src=stringValue((image as Record<string,unknown>).src);if(src)urls.push(src);
 }
 if(Array.isArray(props.items))for(const item of props.items){if(!item||typeof item!=="object")continue;const value=(item as Record<string,unknown>).image;if(typeof value==="string"&&value.trim())urls.push(value.trim());else if(value&&typeof value==="object"){const src=stringValue((value as Record<string,unknown>).src);if(src)urls.push(src);}}
 return urls;
}
function family(componentId:string){
 const normalized=componentId.toUpperCase();
 const match=normalized.match(/-(NAV|HERO|TRUST|SERV|ABOUT|TEAM|FEAT|PROC|GALL|TEST|FAQ|CTA|CONT|FOOT)-/);
 return match?.[1]??normalized.replace(/\d+/g,"").replace(/[^A-Z]+/g,"-").slice(0,32);
}
function stringValue(value:unknown){return typeof value==="string"&&value.trim()?value.trim():undefined;}
