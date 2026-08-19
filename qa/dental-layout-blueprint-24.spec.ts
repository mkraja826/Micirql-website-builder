import { expect, test } from "@playwright/test";
import { canGenerate } from "../apps/builder/app/media-execution";
import type { SectionVisualDecision } from "../apps/builder/app/visual-media-intelligence";

function decision(input:Partial<SectionVisualDecision>&Pick<SectionVisualDecision,"family"|"role"|"subject">):SectionVisualDecision{
 return {
  family:input.family,
  role:input.role,
  subject:input.subject,
  prominence:input.prominence??"supporting",
  aspect:input.aspect??"4:3",
  avoid:input.avoid??[],
  ...(input.pagePath?{pagePath:input.pagePath}:{}),
  ...(input.preferredTags?{preferredTags:input.preferredTags}:{}),
 };
}

test("digital dentistry technology support may use safe generic generated media",()=>{
 expect(canGenerate(decision({
  family:"features",
  role:"illustration",
  subject:"Generic digital dentistry scanner and 3D treatment-planning concept without implying ownership of specific equipment",
  preferredTags:["dental","digital-dentistry","technology","scanner","precision"],
 }))).toBeTruthy();
});

test("dental process support may use safe non-graphic generated context",()=>{
 expect(canGenerate(decision({
  family:"process",
  role:"process",
  subject:"A calm non-graphic dental consultation and treatment-planning journey without unsupported promises",
  preferredTags:["dental","consultation","journey"],
 }))).toBeTruthy();
});

test("team portraits remain customer-only identity media",()=>{
 expect(canGenerate(decision({
  family:"team",
  role:"people",
  subject:"Verified portraits of the clinic's real dentist or dental team, supplied by the business",
  preferredTags:["dental","verified-team"],
 }))).toBeFalsy();
});

test("synthetic before-and-after outcome imagery remains blocked",()=>{
 expect(canGenerate(decision({
  family:"gallery",
  role:"portfolio",
  subject:"Before and after cosmetic dentistry treatment result for a real patient outcome",
  preferredTags:["dental","cosmetic","before-after","case-context"],
 }))).toBeFalsy();
});

test("fabricated clinic interior imagery remains blocked",()=>{
 expect(canGenerate(decision({
  family:"about",
  role:"place",
  subject:"Clinic interior treatment room and reception presented as the actual clinic",
  preferredTags:["dental","clinic-environment"],
 }))).toBeFalsy();
});
