import type { AssetRecord } from "@micirql/assets";

function publicSupabaseConfig(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");
 const apiKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!apiKey)throw new Error("Server Supabase public configuration is missing.");
 return{url,apiKey};
}
export function assetConfig(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");
 const serviceKey=process.env.MICIRQL_SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
 if(!url||!serviceKey)throw new Error("Server asset storage configuration is missing.");
 return{url,serviceKey,bucket:process.env.SUPABASE_ASSET_BUCKET||"site-assets"};
}
export function serverHeaders(){const{serviceKey}=assetConfig();return{apikey:serviceKey,authorization:`Bearer ${serviceKey}`};}
export async function assertWorkspaceAccess(request:Request,workspaceId:string){
 const auth=request.headers.get("authorization");if(!auth?.startsWith("Bearer "))throw statusError(401,"AUTH_REQUIRED");
 const{url,apiKey}=publicSupabaseConfig();const user=await fetch(`${url}/auth/v1/user`,{headers:{apikey:apiKey,authorization:auth},cache:"no-store"});if(!user.ok)throw statusError(401,"AUTH_REQUIRED");
 const memberships=await fetch(`${url}/rest/v1/workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id&limit=1`,{headers:{apikey:apiKey,authorization:auth},cache:"no-store"});
 if(!memberships.ok)throw statusError(memberships.status,"Workspace access check failed.");const rows=await memberships.json() as unknown[];if(!rows.length)throw statusError(403,"WORKSPACE_FORBIDDEN");
}
export async function listAssets(workspaceId:string){
 const{url}=assetConfig();
 const query=new URLSearchParams({select:"*",active:"eq.true",deleted_at:"is.null",order:"created_at.desc"});
 if(workspaceId==="_library")query.set("workspace_id","is.null");
 else query.set("or",`(workspace_id.is.null,workspace_id.eq.${workspaceId})`);
 const response=await fetch(`${url}/rest/v1/assets?${query}`,{headers:serverHeaders(),cache:"no-store"});if(!response.ok)throw statusError(response.status,await response.text());return(await response.json() as DbAsset[]).map(fromDb);
}
export async function insertAsset(asset:AssetRecord,storageKey:string){
 const{url}=assetConfig();const row={id:asset.id,workspace_id:asset.workspaceId??null,source:asset.source,kind:asset.kind,name:asset.name,alt:asset.alt,width:asset.width,height:asset.height,orientation:asset.orientation,aspect_ratio:asset.aspectRatio,focal_x:asset.focalPoint.x,focal_y:asset.focalPoint.y,dominant_tone:asset.dominantTone??null,domains:asset.domains,subtypes:asset.subtypes,section_families:asset.sectionFamilies,themes:asset.themes,tags:asset.tags,license:asset.license,source_reference:asset.sourceReference??null,original_url:asset.originalUrl,variants:asset.variants,active:true,storage_provider:"supabase",original_storage_key:storageKey,variant_storage_keys:[]};
 const response=await fetch(`${url}/rest/v1/assets`,{method:"POST",headers:{...serverHeaders(),"content-type":"application/json",Prefer:"return=representation"},body:JSON.stringify(row)});if(!response.ok)throw statusError(response.status,await response.text());return fromDb((await response.json() as DbAsset[])[0]!);
}
export async function uploadAssetObject(workspaceId:string,id:string,dataUrl:string){
 const match=dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);if(!match)throw statusError(415,"Only base64 image uploads are supported.");const mime=match[1]!,bytes=Uint8Array.from(atob(match[2]!),c=>c.charCodeAt(0));return uploadAssetBinary(workspaceId,id,bytes,mime);
}
export async function uploadAssetBinary(workspaceId:string,id:string,bytes:Uint8Array,mime:string){
 const ext=mime.split("/")[1]?.replace("jpeg","jpg")||"bin";const key=`${workspaceId}/${id}/original.${ext}`;const{url,bucket}=assetConfig();const body=new Blob([bytes.slice().buffer],{type:mime});const response=await fetch(`${url}/storage/v1/object/${bucket}/${key}`,{method:"POST",headers:{...serverHeaders(),"content-type":mime,"x-upsert":"false"},body});if(!response.ok)throw statusError(response.status,await response.text());return{key,url:`${url}/storage/v1/object/public/${bucket}/${key}`};
}
type DbAsset=Record<string,any>;
function fromDb(row:DbAsset):AssetRecord{return{id:row.id,workspaceId:row.workspace_id??undefined,source:row.source,kind:row.kind,name:row.name,alt:row.alt,width:row.width,height:row.height,orientation:row.orientation,aspectRatio:Number(row.aspect_ratio),focalPoint:{x:Number(row.focal_x),y:Number(row.focal_y)},dominantTone:row.dominant_tone??undefined,domains:row.domains??[],subtypes:row.subtypes??[],sectionFamilies:row.section_families??[],themes:row.themes??[],tags:row.tags??[],license:row.license,sourceReference:row.source_reference??undefined,originalUrl:row.original_url,variants:row.variants??[],active:row.active,createdAt:row.created_at};}
function statusError(status:number,message:string){const e=new Error(message) as Error&{status?:number};e.status=status;return e;}
