import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { generatedMediaBudget } from "../apps/builder/app/materialize-media-execution";

function siteFor(layoutId:string):Site{
 return siteSchema.parse({
  schemaVersion:SCHEMA_VERSION,
  siteId:`qa-${layoutId}`,
  workspaceId:"qa-media-budget",
  name:"QA Dental",
  domain:"clinic",
  subtype:"dental",
  theme:{family:"minimalist",modifiers:["light"],brand:{colors:{primary:"#315E62",secondary:"#173B40",accent:"#C49A64",background:"#FFFFFF",surface:"#F3F7F6",textPrimary:"#173B40",textSecondary:"#64797D",border:"#D8E2E0",success:"#167A55",warning:"#9A6500",error:"#B42318"},typography:{display:"Inter",body:"Inter",ui:"Inter"},density:"comfortable",shape:"balanced",motion:"subtle"}},
  seoBlueprint:{primaryGoal:"Book appointments",targetLocations:["Hyderabad"],priorityTopics:["Dental care"],audiences:["Patients"],languages:["en"],localSeo:true,servicePages:true,locationPages:false,blog:false},
  pages:[{id:"home",path:"/",name:"Home",sections:[{id:"hero",component:{componentId:"hero.placeholder",version:"1.0.0"},props:{heading:"Dental care",layoutVisualLock:true,layoutBlueprintId:layoutId},bindings:{},hidden:false}],seo:{title:"QA Dental",description:"QA",canonicalPath:"/",indexable:true,structuredDataTypes:["Dentist"]}}],
  navigation:[{label:"Home",href:"/"}],integrations:[],domains:[]
 });
}

const expected:Record<string,number>={
 "dental-01-clinical-authority":2,
 "dental-02-implant-luxury":2,
 "dental-03-smile-studio":3,
 "dental-05-digital-dentistry":3,
 "dental-08-boutique-cosmetic":2,
};

for(const [layoutId,budget] of Object.entries(expected)){
 test(`${layoutId} keeps its controlled generated-media budget`,()=>{
  expect(generatedMediaBudget(siteFor(layoutId))).toBe(budget);
 });
}
