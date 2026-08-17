import { workspaceAssetPickerSources } from "@micirql/assets";
import { assertWorkspaceAccess, listAssets } from "./supabase-assets";

export async function GET(request:Request){try{
 const url=new URL(request.url);const workspaceId=url.searchParams.get("workspaceId")??"";if(!workspaceId)return Response.json({error:"workspaceId is required."},{status:400});await assertWorkspaceAccess(request,workspaceId);
 const domain=url.searchParams.get("domain")??"",theme=url.searchParams.get("theme")??"",family=url.searchParams.get("family")??"",source=url.searchParams.get("source")??"",query=(url.searchParams.get("q")??"").trim().toLowerCase();
 const assets=(await listAssets(workspaceId)).filter(a=>!source||a.source===source).filter(a=>!query||[a.name,a.alt,...a.tags].join(" ").toLowerCase().includes(query)).map(asset=>({...asset,recommendationScore:(family&&asset.sectionFamilies.includes(family)?40:0)+(domain&&asset.domains.includes(domain as never)?30:0)+(theme&&asset.themes.includes(theme as never)?20:0)+(asset.source==="user-upload"?10:0)})).sort((a,b)=>b.recommendationScore-a.recommendationScore);
 return Response.json({sources:workspaceAssetPickerSources(),assets});
}catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Asset lookup failed."},{status});}}
