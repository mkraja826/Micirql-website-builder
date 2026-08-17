import type { AssetRecord } from "@micirql/assets";
import { imageExecutorFromEnvironment, imageProviderConfigFromEnvironment } from "@micirql/ai";
import { DENTAL_MEDIA_LIBRARY_V1_SEEDS } from "../../../../dental-media-library-seeds";
import { insertAsset, listAssets, uploadAssetBinary } from "../../../assets/supabase-assets";

export async function POST(request:Request){
 try{
  assertLibraryAdmin(request);
  const body=await request.json().catch(()=>({})) as {ids?:string[];limit?:number;dryRun?:boolean};
  const selectedIds=new Set((body.ids??[]).map(id=>id.trim()).filter(Boolean));
  const limit=Math.max(1,Math.min(body.limit??3,5));
  const all=await listAssets("_library");
  const existingSeeds=new Set(all.filter(a=>!a.workspaceId).flatMap(a=>a.tags.filter(t=>t.startsWith("library-seed:")).map(t=>t.slice("library-seed:".length))));
  const pending=DENTAL_MEDIA_LIBRARY_V1_SEEDS.filter(seed=>(!selectedIds.size||selectedIds.has(seed.id))&&!existingSeeds.has(seed.id));
  if(body.dryRun)return Response.json({ok:true,total:DENTAL_MEDIA_LIBRARY_V1_SEEDS.length,existing:[...existingSeeds],pending:pending.map(seed=>seed.id),willGenerate:pending.slice(0,limit).map(seed=>seed.id)});
  const provider=imageProviderConfigFromEnvironment(process.env),executor=imageExecutorFromEnvironment(process.env);
  if(!provider||!executor)return Response.json({error:"Image generation provider is not configured for the builder runtime yet.",code:"IMAGE_EXECUTOR_NOT_CONFIGURED"},{status:503});
  const generated:AssetRecord[]=[];const failures:Array<{id:string;error:string}>=[];
  for(const seed of pending.slice(0,limit)){
   try{
    const result=await executor.run({prompt:`${seed.prompt} Preferred composition: ${seed.aspect}.`,purpose:`certified Dental media library ${seed.role}`,domain:"clinic",sectionFamily:seed.sectionFamily});
    const id=`library-dental-${seed.id}-${crypto.randomUUID()}`;
    const stored=await uploadAssetBinary("_library/dental",id,result.output.bytes,result.output.contentType);
    const size=parseProviderSize(provider.size),ratio=size.width/size.height;
    const orientation:AssetRecord["orientation"]=ratio>2?"panoramic":ratio>1.08?"landscape":ratio<.92?"portrait":"square";
    const asset:AssetRecord={id,source:"ai-generated",kind:"image",name:`Dental library: ${seed.id}`,alt:result.output.alt??seed.alt,width:size.width,height:size.height,orientation,aspectRatio:ratio,focalPoint:result.output.focalPoint??{x:.5,y:.5},domains:["clinic"],subtypes:[seed.subindustry],sectionFamilies:[seed.sectionFamily],themes:[],tags:[...new Set([...(result.output.tags??[]),...seed.tags,seed.certificationId,`library-seed:${seed.id}`,`preferred-aspect:${seed.aspect}`,"certified-dental-media"])],license:"micirql-owned",sourceReference:`generated:${new URL(provider.endpoint).hostname}:${provider.model}:${seed.id}`,originalUrl:stored.url,variants:[],active:true,createdAt:new Date().toISOString()};
    generated.push(await insertAsset(asset,stored.key));
   }catch(error){failures.push({id:seed.id,error:error instanceof Error?error.message:"Generation failed."});}
  }
  return Response.json({ok:failures.length===0,generated:generated.map(a=>({id:a.id,name:a.name,url:a.originalUrl,tags:a.tags})),failures,remaining:Math.max(0,pending.length-generated.length)});
 }catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Dental media library population failed."},{status});}
}

function assertLibraryAdmin(request:Request){const expected=process.env.MICIRQL_LIBRARY_ADMIN_TOKEN;if(!expected){const error=new Error("Dental media library admin token is not configured.") as Error&{status?:number};error.status=503;throw error;}const provided=request.headers.get("x-micirql-library-token");if(!provided||provided!==expected){const error=new Error("FORBIDDEN") as Error&{status?:number};error.status=403;throw error;}}
function parseProviderSize(value:string){const match=/^(\d+)x(\d+)$/.exec(value);if(!match)throw new Error("Invalid image provider size.");const width=Number(match[1]),height=Number(match[2]);if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error("Invalid image provider dimensions.");return{width,height};}
