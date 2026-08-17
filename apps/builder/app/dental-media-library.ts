import type { SectionFamily } from "@micirql/sections";

export type DentalMediaSubindustry="general-dentistry"|"implant-dentistry"|"cosmetic-dentistry"|"orthodontics"|"endodontics";
export type DentalMediaRole="hero"|"services"|"technology"|"process"|"about"|"gallery"|"cta";
export type DentalMediaAspect="wide"|"16:9"|"3:2"|"4:3"|"portrait"|"1:1";

export type DentalMediaCertification={
 id:string;
 subindustries:DentalMediaSubindustry[];
 roles:DentalMediaRole[];
 sectionFamilies:SectionFamily[];
 subjects:string[];
 moods:string[];
 aspects:DentalMediaAspect[];
 requiredTags:string[];
 optionalTags:string[];
 forbiddenUses:string[];
 factualEvidence:boolean;
};

const SHARED_FORBIDDEN=[
 "fake doctor identity",
 "fake clinic identity",
 "fabricated equipment ownership",
 "fabricated credentials or awards",
 "synthetic before-and-after treatment outcome",
 "graphic or distressing procedure imagery",
];

export const DENTAL_MEDIA_CERTIFICATIONS:DentalMediaCertification[]=[
 {id:"dental-general-care",subindustries:["general-dentistry"],roles:["hero","services","process","about"],sectionFamilies:["hero","services","process","about"],subjects:["welcoming dental consultation","general dental care","natural smile","bright care environment"],moods:["trustworthy","calm","bright","welcoming"],aspects:["wide","3:2","4:3"],requiredTags:["dental","general-dentistry"],optionalTags:["consultation","smile","care","clinic-context"],forbiddenUses:SHARED_FORBIDDEN,factualEvidence:false},
 {id:"dental-implant-authority",subindustries:["implant-dentistry"],roles:["hero","services","technology","process"],sectionFamilies:["hero","services","features","process"],subjects:["implant consultation","digital treatment planning","restorative planning","precision dentistry"],moods:["premium","confident","precise","reassuring"],aspects:["wide","16:9","3:2","4:3"],requiredTags:["dental","implant-dentistry"],optionalTags:["implant-consultation","digital-planning","restorative-care","precision"],forbiddenUses:SHARED_FORBIDDEN,factualEvidence:false},
 {id:"dental-cosmetic-smile",subindustries:["cosmetic-dentistry"],roles:["hero","services","process","gallery"],sectionFamilies:["hero","services","process","gallery"],subjects:["smile design consultation","natural smile confidence","cosmetic dentistry","premium smile care"],moods:["warm","premium","natural","aspirational"],aspects:["wide","3:2","4:3","portrait"],requiredTags:["dental","cosmetic-dentistry"],optionalTags:["smile-design","natural-smile","veneers-context","whitening-context"],forbiddenUses:SHARED_FORBIDDEN,factualEvidence:false},
 {id:"dental-orthodontic-journey",subindustries:["orthodontics"],roles:["hero","services","technology","process"],sectionFamilies:["hero","services","features","process"],subjects:["orthodontic consultation","clear aligner context","braces consultation","digital scanning"],moods:["friendly","modern","clear","progressive"],aspects:["wide","16:9","3:2","4:3"],requiredTags:["dental","orthodontics"],optionalTags:["aligners","braces","digital-scan","teen-care","adult-care"],forbiddenUses:SHARED_FORBIDDEN,factualEvidence:false},
 {id:"dental-endodontic-precision",subindustries:["endodontics"],roles:["hero","services","technology","process"],sectionFamilies:["hero","services","features","process"],subjects:["endodontic consultation","tooth preservation","precision dental care","calm specialist context"],moods:["calm","specialist","precise","reassuring"],aspects:["wide","16:9","3:2","4:3"],requiredTags:["dental","endodontics"],optionalTags:["root-canal-context","tooth-preservation","precision-care"],forbiddenUses:SHARED_FORBIDDEN,factualEvidence:false},
 {id:"dental-verified-practice-evidence",subindustries:["general-dentistry","implant-dentistry","cosmetic-dentistry","orthodontics","endodontics"],roles:["about","gallery","technology"],sectionFamilies:["about","gallery","features"],subjects:["real clinic interior","real treatment room","real equipment","real case photography"],moods:["authentic","credible"],aspects:["wide","3:2","4:3","portrait"],requiredTags:["dental","verified-practice-evidence"],optionalTags:["clinic-interior","equipment","case-media"],forbiddenUses:[],factualEvidence:true}
];

export function dentalMediaCertificationFor(subindustry:string|undefined,family:SectionFamily){
 const normalized=(subindustry||"general-dentistry") as DentalMediaSubindustry;
 return DENTAL_MEDIA_CERTIFICATIONS.filter(item=>item.subindustries.includes(normalized)&&item.sectionFamilies.includes(family));
}

export function dentalMediaScoreTags(subindustry:string|undefined,family:SectionFamily){
 const matches=dentalMediaCertificationFor(subindustry,family);
 return [...new Set(matches.flatMap(item=>[...item.requiredTags,...item.optionalTags]))];
}
