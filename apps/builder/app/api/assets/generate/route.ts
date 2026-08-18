import type { AssetRecord } from "@micirql/assets";
import { imageExecutorFromEnvironment, imageProviderConfigFromEnvironment, type AiUsageRecord } from "@micirql/ai";
import { generateWithWorkersAi, getWorkersAiBinding } from "../../../cloudflare-workers-ai-image";
import { assertWorkspaceAccess, insertAsset, uploadAssetBinary } from "../supabase-assets";
import { createSupabaseAiUsageStore, creditsForTask, grantTrialCredits, refundCredits, reserveCredits } from "../../credits/supabase-credit-runtime";

export async function POST(request: Request) {
  let reservation:{workspaceId:string;credits:number;operationKey:string}|null=null;
  try{
    const body = await request.json() as {workspaceId?:string;siteId?:string;sectionId?:string;pagePath?:string;family?:string;domain?:string;prompt?:string};
    if (!body.workspaceId || !body.siteId || !body.sectionId || !body.pagePath || !body.prompt) return Response.json({ error: "Generation request is incomplete." }, { status: 400 });
    await assertWorkspaceAccess(request,body.workspaceId);

    let externalProvider:ReturnType<typeof imageProviderConfigFromEnvironment>;
    let externalExecutor:ReturnType<typeof imageExecutorFromEnvironment>;
    try{
      externalProvider=imageProviderConfigFromEnvironment(process.env);
      externalExecutor=imageExecutorFromEnvironment(process.env);
    }catch(error){
      externalProvider=undefined;
      externalExecutor=undefined;
      console.warn("Configured external image provider is invalid; Workers AI fallback will be attempted.",error);
    }
    const workersAiReady=Boolean(getWorkersAiBinding());
    if((!externalProvider||!externalExecutor)&&!workersAiReady)return Response.json({error:"Image generation provider is not configured for the builder runtime yet.",code:"IMAGE_EXECUTOR_NOT_CONFIGURED",routedTask:"generate-image"},{status:503});

    await grantTrialCredits(body.workspaceId);
    const credits=creditsForTask("generate-image"),operationKey=`generate-image:${body.siteId}:${body.sectionId}:${crypto.randomUUID()}`;
    await reserveCredits({workspaceId:body.workspaceId,credits,operationKey,description:"AI image generation",metadata:{siteId:body.siteId,sectionId:body.sectionId,pagePath:body.pagePath,family:body.family??null}});reservation={workspaceId:body.workspaceId,credits,operationKey};

    const purpose=`${body.family??"website"} visual`,domain=body.domain??"general";
    let bytes:Uint8Array,contentType="image/png",alt=purpose,tags=[domain,purpose,"ai-generated"].filter(Boolean),sizeValue:string,profileId:string,providerName:string,model:string,costMicrousd:number,sourceReference:string;

    if(externalProvider&&externalExecutor){
      const result=await externalExecutor.run({prompt:body.prompt,purpose,domain,...(body.family?{sectionFamily:body.family}:{})});
      bytes=result.output.bytes;
      contentType=result.output.contentType;
      alt=result.output.alt??purpose;
      tags=[...(result.output.tags??[]),"ai-generated"];
      sizeValue=externalProvider.size;
      profileId=externalProvider.id;
      providerName=new URL(externalProvider.endpoint).hostname;
      model=externalProvider.model;
      costMicrousd=result.usage.costMicrousd;
      sourceReference=`${providerName}:${model}`;
    }else{
      const result=await generateWithWorkersAi(body.prompt);
      bytes=result.bytes;
      contentType=result.contentType;
      sizeValue=result.size;
      profileId=result.profileId;
      providerName="workers-ai.cloudflare.com";
      model=result.model;
      costMicrousd=result.costMicrousd;
      sourceReference=`workers-ai:${model}`;
      tags=[domain,purpose,"cloudflare-workers-ai","ai-generated"].filter(Boolean);
    }

    const id=`generated-${crypto.randomUUID()}`,stored=await uploadAssetBinary(body.workspaceId,id,bytes,contentType);
    const size=parseProviderSize(sizeValue),ratio=size.width/size.height;
    const orientation:AssetRecord["orientation"]=ratio>2?"panoramic":ratio>1.08?"landscape":ratio<.92?"portrait":"square";
    const asset:AssetRecord={id,workspaceId:body.workspaceId,source:"ai-generated",kind:"image",name:`AI generated ${body.family??"website"} image`,alt,width:size.width,height:size.height,orientation,aspectRatio:ratio,focalPoint:{x:.5,y:.5},domains:[],subtypes:[],sectionFamilies:body.family?[body.family]:[],themes:[],tags,license:"generated",sourceReference,originalUrl:stored.url,variants:[],active:true,createdAt:new Date().toISOString()};
    const persisted=await insertAsset(asset,stored.key);
    const usage:AiUsageRecord={id:crypto.randomUUID(),workspaceId:body.workspaceId,siteId:body.siteId,task:"generate-image",profileId,provider:providerName,model,images:1,costMicrousd,createdAt:new Date().toISOString()};
    await createSupabaseAiUsageStore().append(usage);reservation=null;
    return Response.json({asset:persisted,creditsCharged:credits,usage:{images:usage.images,costMicrousd:usage.costMicrousd},provider:{profileId,model,provider:providerName}},{status:201});
  }catch(error){
    if(reservation){try{await refundCredits({workspaceId:reservation.workspaceId,credits:reservation.credits,operationKey:`refund:${reservation.operationKey}`,description:"Refund failed AI image generation",metadata:{reservation:reservation.operationKey}});}catch(refundError){console.error("MiCirql image credit refund failed",refundError);}}
    const status=(error as Error&{status?:number}).status??500,message=error instanceof Error?error.message:"Image generation failed.";return Response.json({error:message,code:message==="INSUFFICIENT_CREDITS"?"INSUFFICIENT_CREDITS":undefined},{status});
  }
}
function parseProviderSize(value:string){const match=/^(\d+)x(\d+)$/.exec(value);if(!match)throw new Error("Invalid image provider size.");const width=Number(match[1]),height=Number(match[2]);if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error("Invalid image provider dimensions.");return{width,height};}
