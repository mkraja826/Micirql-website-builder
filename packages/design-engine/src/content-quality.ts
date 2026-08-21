import type { Site } from "@micirql/schema";

export type ContentQualityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  pageId?: string;
  sectionId?: string;
  path?: string;
};

export type ContentQualityResult = {
  score: number;
  issues: ContentQualityIssue[];
};

const LIMITS = { heroTitleWords: 12, sectionTitleWords: 10, descriptionWords: 42, itemTitleWords: 7, itemDescriptionWords: 24, ctaLabelWords: 4, seoTitleChars: 60, seoDescriptionChars: 160 } as const;
const ITEM_FAMILIES = new Set(["services", "features", "testimonials", "gallery", "team", "process"]);
const SINGLETON_FAMILIES = new Set(["hero", "services", "testimonials", "gallery", "team", "cta", "contact"]);
const PLACEHOLDER_PATTERNS = [/\bprimary offering\b/i,/\bsupporting offering\b/i,/\badditional offering\b/i,/\bpoint (one|two|three|four|five)\b/i,/\bteam member\b/i,/\bverified proof\b/i,/\bimage slot\b/i,/\badd (a|an|the|another|real|verified)\b/i,/\bready to discuss (home|contact|doctor|cases|services|treatments)\??$/i,/\ba clear overview of (home|contact|doctor|cases|services|treatments)\.?$/i,/\bexplore (home|contact|doctor|cases) and find the right next step\.?$/i];
const GENERIC_AI_PATTERNS: Array<{pattern:RegExp;label:string}> = [
  {pattern:/\belevate your\b/i,label:"elevate your"},{pattern:/\btransform your\b/i,label:"transform your"},{pattern:/\bunlock (the|your)\b/i,label:"unlock"},{pattern:/\bseamless(ly)?\b/i,label:"seamless"},{pattern:/\bcutting[- ]edge\b/i,label:"cutting-edge"},{pattern:/\bstate[- ]of[- ]the[- ]art\b/i,label:"state-of-the-art"},{pattern:/\bworld[- ]class\b/i,label:"world-class"},{pattern:/\bexceptional (care|service|results|experience)\b/i,label:"exceptional"},{pattern:/\bpersonalized solutions?\b/i,label:"personalized solutions"},{pattern:/\btailored to (your|you)\b/i,label:"tailored to you"},{pattern:/\bjourney to (a|your)\b/i,label:"journey to"},{pattern:/\bwhere .{0,35} meets .{0,35}\b/i,label:"where X meets Y"},{pattern:/\bdiscover the difference\b/i,label:"discover the difference"},{pattern:/\bexperience the difference\b/i,label:"experience the difference"},{pattern:/\byour (trusted|premier|leading) (partner|choice|destination)\b/i,label:"trusted partner"},
];
const WEAK_CTA_PATTERNS = [/^(learn more|read more|click here|submit|continue|next|get started|explore|discover|find out more)$/i,/^(contact us|reach out)$/i];
const STOP_WORDS = new Set(["a","an","and","are","as","at","be","by","for","from","in","is","it","of","on","or","our","that","the","their","this","to","we","with","you","your"]);

type SemanticEntry = { text:string; pageId:string; sectionId:string; path:string; family?:string|undefined };

export function normalizeWebsiteContent(site: Site): Site {
  const next = structuredClone(site);
  for (const page of next.pages) {
    page.seo.title = clipChars(cleanText(page.seo.title), LIMITS.seoTitleChars);
    page.seo.description = clipChars(cleanText(page.seo.description), LIMITS.seoDescriptionChars);
    for (const section of page.sections) {
      const props = section.props ?? {};
      const family = familyFromComponentId(section.component.componentId);
      const titleLimit = family === "hero" ? LIMITS.heroTitleWords : LIMITS.sectionTitleWords;
      if (typeof props.title === "string") props.title = clipWords(cleanText(props.title), titleLimit);
      if (typeof props.eyebrow === "string") props.eyebrow = clipWords(cleanText(props.eyebrow), 6);
      if (typeof props.description === "string") props.description = clipWords(cleanText(props.description), LIMITS.descriptionWords);
      for (const actionKey of ["primaryAction","secondaryAction"] as const) {
        const value = props[actionKey];
        if (value && typeof value === "object") { const action=value as Record<string,unknown>; if(typeof action.label==="string") action.label=clipWords(cleanText(action.label),LIMITS.ctaLabelWords); }
      }
      if (Array.isArray(props.items)) props.items=props.items.map((raw)=>{ if(!raw||typeof raw!=="object") return raw; const item={...(raw as Record<string,unknown>)}; if(typeof item.title==="string") item.title=clipWords(cleanText(item.title),LIMITS.itemTitleWords); if(typeof item.description==="string") item.description=clipWords(cleanText(item.description),LIMITS.itemDescriptionWords); return item; });
      section.props=props;
    }
  }
  return next;
}

export function evaluateWebsiteContent(site: Site): ContentQualityResult {
  const issues:ContentQualityIssue[]=[];
  const seenPhrases=new Map<string,{pageId:string;sectionId:string}>();
  const semanticCopy:SemanticEntry[]=[];
  const openingCounts=new Map<string,Array<{pageId:string;sectionId:string}>>();
  for(const page of site.pages){
    const seenFamilies=new Map<string,string>();
    const pageSemantic:SemanticEntry[]=[];
    if(page.seo.title.length>LIMITS.seoTitleChars) issues.push(issue("SEO_TITLE_LONG","warning","SEO title is longer than the recommended limit.",page.id));
    if(page.seo.description.length>LIMITS.seoDescriptionChars) issues.push(issue("SEO_DESCRIPTION_LONG","warning","SEO description is longer than the recommended limit.",page.id));
    for(const section of page.sections){
      if(section.hidden) continue;
      const props=section.props??{}; const family=familyFromComponentId(section.component.componentId); const title=text(props.title); const description=text(props.description);
      if(family&&SINGLETON_FAMILIES.has(family)){const prior=seenFamilies.get(family); if(prior) issues.push(issue("DUPLICATE_SECTION_FAMILY","error",`Page contains more than one visible ${family} section.`,page.id,section.id)); else seenFamilies.set(family,section.id);}
      if(!title) issues.push(issue("MISSING_SECTION_TITLE","error","Visible sections need a clear title.",page.id,section.id,"title"));
      if(title){const max=family==="hero"?LIMITS.heroTitleWords:LIMITS.sectionTitleWords; if(wordCount(title)>max) issues.push(issue("TITLE_TOO_LONG","warning",`${family??"Section"} title is too long for its layout.`,page.id,section.id,"title")); detectDuplicate(title,page.id,section.id,seenPhrases,issues); detectPlaceholder(title,page.id,section.id,"title",issues); detectGenericAiCopy(title,page.id,section.id,"title",issues); const entry={text:title,pageId:page.id,sectionId:section.id,path:"title",family}; semanticCopy.push(entry); pageSemantic.push(entry);}
      if(description){if(wordCount(description)>LIMITS.descriptionWords) issues.push(issue("DESCRIPTION_TOO_LONG","warning","Section paragraph is too dense.",page.id,section.id,"description")); detectPlaceholder(description,page.id,section.id,"description",issues); detectGenericAiCopy(description,page.id,section.id,"description",issues); collectOpening(description,page.id,section.id,openingCounts); const entry={text:description,pageId:page.id,sectionId:section.id,path:"description",family}; semanticCopy.push(entry); pageSemantic.push(entry);}
      for(const key of ["primaryAction","secondaryAction"] as const){const action=props[key]; if(action&&typeof action==="object"){const label=text((action as Record<string,unknown>).label); if(label&&wordCount(label)>LIMITS.ctaLabelWords) issues.push(issue("CTA_TOO_LONG","warning","CTA label should stay short and actionable.",page.id,section.id,`${key}.label`)); if(label){detectPlaceholder(label,page.id,section.id,`${key}.label`,issues); detectWeakCta(label,page.id,section.id,`${key}.label`,issues);}}}
      if(family&&ITEM_FAMILIES.has(family)&&(!Array.isArray(props.items)||props.items.length===0)) issues.push(issue("EMPTY_CONTENT_SECTION","error",`${family} section cannot be empty in a generated website.`,page.id,section.id,"items"));
      if(Array.isArray(props.items)) props.items.forEach((raw,index)=>{if(!raw||typeof raw!=="object") return; const item=raw as Record<string,unknown>; const itemTitle=text(item.title); const itemDescription=text(item.description); if(itemTitle&&wordCount(itemTitle)>LIMITS.itemTitleWords) issues.push(issue("ITEM_TITLE_LONG","warning","Card/item title is too long.",page.id,section.id,`items.${index}.title`)); if(itemDescription&&wordCount(itemDescription)>LIMITS.itemDescriptionWords) issues.push(issue("ITEM_COPY_DENSE","warning","Card/item copy is too dense.",page.id,section.id,`items.${index}.description`)); if(itemTitle){detectDuplicate(itemTitle,page.id,section.id,seenPhrases,issues);detectPlaceholder(itemTitle,page.id,section.id,`items.${index}.title`,issues);detectGenericAiCopy(itemTitle,page.id,section.id,`items.${index}.title`,issues);semanticCopy.push({text:itemTitle,pageId:page.id,sectionId:section.id,path:`items.${index}.title`,family});} if(itemDescription){detectPlaceholder(itemDescription,page.id,section.id,`items.${index}.description`,issues);detectGenericAiCopy(itemDescription,page.id,section.id,`items.${index}.description`,issues);collectOpening(itemDescription,page.id,section.id,openingCounts);}});
    }
    detectRoleCollisions(pageSemantic,issues);
  }
  detectSemanticDuplicates(semanticCopy,issues); detectRepeatedOpenings(openingCounts,issues);
  const uniqueIssues=dedupeIssues(issues); const score=Math.max(0,100-uniqueIssues.filter(x=>x.severity==="error").length*15-uniqueIssues.filter(x=>x.severity==="warning").length*3); return {score,issues:uniqueIssues};
}

function detectRoleCollisions(entries:SemanticEntry[],issues:ContentQualityIssue[]){
  const byFamily=new Map<string,SemanticEntry[]>();
  for(const entry of entries){if(!entry.family) continue; const list=byFamily.get(entry.family)??[]; list.push(entry); byFamily.set(entry.family,list);}
  const pairs:Array<[string,string,string]>=[
    ["hero","about","About repeats the Hero promise instead of adding factual context or positioning."],
    ["hero","cta","CTA repeats the Hero pitch instead of focusing on the next action."],
    ["services","process","Process repeats service choices instead of explaining what happens next."],
    ["services","features","Features repeat service descriptions instead of giving distinct reasons to believe."],
    ["about","team","Team repeats company positioning instead of establishing verified human authority."],
    ["features","testimonials","Proof/testimonial messaging repeats feature claims instead of supporting them with verified evidence."],
  ];
  for(const [leftFamily,rightFamily,message] of pairs){
    const left=byFamily.get(leftFamily)??[]; const right=byFamily.get(rightFamily)??[]; if(!left.length||!right.length) continue;
    const leftTokens=mergeTokens(left.map(x=>x.text)); const rightTokens=mergeTokens(right.map(x=>x.text));
    if(leftTokens.size<4||rightTokens.size<4) continue;
    const overlap=jaccard(leftTokens,rightTokens);
    if(overlap>=0.5){const target=right[0]!; issues.push(issue("SECTION_ROLE_COLLISION","warning",message,target.pageId,target.sectionId,target.path));}
  }
}

function mergeTokens(values:string[]):Set<string>{const out=new Set<string>(); for(const value of values) for(const token of contentTokens(value)) out.add(token); return out;}
function detectDuplicate(value:string,pageId:string,sectionId:string,seen:Map<string,{pageId:string;sectionId:string}>,issues:ContentQualityIssue[]){const key=normalizePhrase(value);if(key.length<16)return;const prior=seen.get(key);if(prior)issues.push(issue("DUPLICATE_COPY","warning","Repeated headline/card wording detected.",pageId,sectionId));else seen.set(key,{pageId,sectionId});}
function detectSemanticDuplicates(entries:SemanticEntry[],issues:ContentQualityIssue[]){for(let i=0;i<entries.length;i++){const current=entries[i]!;const currentTokens=contentTokens(current.text);if(currentTokens.size<4)continue;for(let j=0;j<i;j++){const prior=entries[j]!;if(prior.sectionId===current.sectionId)continue;const score=jaccard(currentTokens,contentTokens(prior.text));if(score>=.72){issues.push(issue("DUPLICATE_MESSAGE","warning","Two sections communicate nearly the same message. Give each section a distinct role.",current.pageId,current.sectionId,current.path));break;}}}}
function detectPlaceholder(value:string,pageId:string,sectionId:string,path:string,issues:ContentQualityIssue[]){if(PLACEHOLDER_PATTERNS.some(p=>p.test(value.trim())))issues.push(issue("PLACEHOLDER_COPY","error","Generated website contains placeholder or scaffolding copy.",pageId,sectionId,path));}
function detectGenericAiCopy(value:string,pageId:string,sectionId:string,path:string,issues:ContentQualityIssue[]){const match=GENERIC_AI_PATTERNS.find(({pattern})=>pattern.test(value));if(match)issues.push(issue("GENERIC_AI_COPY","warning",`Generic AI-style wording detected (${match.label}). Prefer specific, evidence-led language.`,pageId,sectionId,path));}
function detectWeakCta(value:string,pageId:string,sectionId:string,path:string,issues:ContentQualityIssue[]){if(WEAK_CTA_PATTERNS.some(p=>p.test(value.trim())))issues.push(issue("WEAK_CTA","warning","CTA is vague. Use a specific next step such as Book a consultation, View treatments, Check availability or Call the clinic.",pageId,sectionId,path));}
function collectOpening(value:string,pageId:string,sectionId:string,openings:Map<string,Array<{pageId:string;sectionId:string}>>){const words=normalizePhrase(value).split(" ").filter(Boolean).slice(0,3);if(words.length<3)return;const key=words.join(" ");const entries=openings.get(key)??[];entries.push({pageId,sectionId});openings.set(key,entries);}
function detectRepeatedOpenings(openings:Map<string,Array<{pageId:string;sectionId:string}>>,issues:ContentQualityIssue[]){for(const [opening,entries] of openings){const sectionIds=new Set(entries.map(e=>e.sectionId));if(sectionIds.size<3)continue;const last=entries.at(-1)!;issues.push(issue("REPETITIVE_SENTENCE_OPENING","warning",`Multiple content blocks begin with “${opening}…”. Vary sentence rhythm.`,last.pageId,last.sectionId));}}
function familyFromComponentId(componentId:string):string|undefined{const value=componentId.toLowerCase();const codes:Record<string,string>={nav:"navbar",hero:"hero",about:"about",serv:"services",feat:"features",proc:"process",test:"testimonials",gall:"gallery",team:"team",cta:"cta",cont:"contact",foot:"footer"};for(const family of Object.values(codes))if(value.startsWith(`${family}.`))return family;for(const [code,family] of Object.entries(codes))if(value.includes(`-${code}-`))return family;return undefined;}
function cleanText(value:string){return value.replace(/\s+/g," ").replace(/\s+([,.!?;:])/g,"$1").trim();}
function clipWords(value:string,max:number){const words=value.split(/\s+/).filter(Boolean);if(words.length<=max)return value;return `${words.slice(0,max).join(" ").replace(/[,:;.!?]+$/," ").trim()}…`;}
function clipChars(value:string,max:number){if(value.length<=max)return value;return `${value.slice(0,Math.max(1,max-1)).trim().replace(/[,:;.!?]+$/," ").trim()}…`;}
function wordCount(value:string){return value.trim().split(/\s+/).filter(Boolean).length;}
function text(value:unknown){return typeof value==="string"?value.trim():"";}
function normalizePhrase(value:string){return value.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();}
function contentTokens(value:string):Set<string>{return new Set(normalizePhrase(value).split(" ").filter(token=>token.length>=3&&!STOP_WORDS.has(token)));}
function jaccard(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let intersection=0;for(const token of a)if(b.has(token))intersection++;const union=a.size+b.size-intersection;return union?intersection/union:0;}
function dedupeIssues(issues:ContentQualityIssue[]){const seen=new Set<string>();return issues.filter(entry=>{const key=[entry.code,entry.pageId,entry.sectionId,entry.path,entry.message].join("|");if(seen.has(key))return false;seen.add(key);return true;});}
function issue(code:string,severity:"error"|"warning",message:string,pageId?:string,sectionId?:string,path?:string):ContentQualityIssue{return{code,severity,message,...(pageId?{pageId}:{}),...(sectionId?{sectionId}:{}),...(path?{path}:{})};}