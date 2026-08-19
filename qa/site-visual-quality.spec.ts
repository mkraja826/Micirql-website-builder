import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { evaluateSiteVisualQuality } from "../apps/builder/app/site-visual-quality";

function section(componentId:string,image?:string,ratio?:string){return{component:{componentId},props:{...(image?{image:{src:image,alt:"Dental supporting visual"}}:{}),...(ratio?{imageRatio:ratio}:{})}};}

function siteWith(sections:ReturnType<typeof section>[]):Site{return{version:"1",pages:[{path:"/",title:"Home",sections}]} as unknown as Site;}

test("completed-site visual gate rejects monotonous repeated composition",()=>{
 const site=siteWith([
  section("ORG-SERV-001","https://img.test/a.jpg","16:9"),
  section("ORG-SERV-002","https://img.test/a.jpg","16:9"),
  section("ORG-SERV-003","https://img.test/a.jpg","16:9"),
  section("ORG-SERV-004","https://img.test/b.jpg","16:9"),
  section("ORG-SERV-005","https://img.test/b.jpg","16:9"),
  section("ORG-SERV-006",undefined,"16:9"),
 ]);
 const result=evaluateSiteVisualQuality(site);
 expect(result.ready).toBe(false);
 expect(result.score).toBeLessThan(result.threshold);
 expect(result.issues.map(item=>item.code)).toEqual(expect.arrayContaining(["LOW_SECTION_VARIETY","REPETITIVE_COMPONENT_RUN","REPEATED_IMAGE_URL","LOW_IMAGE_DIVERSITY","LOW_IMAGE_ASPECT_VARIETY"]));
});

test("completed-site visual gate accepts a varied premium page rhythm",()=>{
 const site=siteWith([
  section("ORG-HERO-002","https://img.test/hero.jpg","portrait"),
  section("ORG-TRUST-001"),
  section("ORG-SERV-004","https://img.test/treatment.jpg","3:2"),
  section("ORG-ABOUT-002","https://img.test/clinic.jpg","16:9"),
  section("ORG-TEAM-004","https://img.test/doctor.jpg","4:3"),
  section("ORG-PROC-002","https://img.test/process.jpg","3:2"),
  section("ORG-TEST-002"),
  section("ORG-CTA-003"),
 ]);
 const result=evaluateSiteVisualQuality(site);
 expect(result.ready).toBe(true);
 expect(result.score).toBeGreaterThanOrEqual(result.threshold);
 expect(result.metrics.componentFamilies).toBeGreaterThanOrEqual(7);
 expect(result.metrics.uniqueImages).toBe(5);
 expect(result.metrics.imageAspects).toBeGreaterThanOrEqual(3);
});
