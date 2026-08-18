import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
 try{
  const workspaceId=request.nextUrl.searchParams.get("workspaceId")?.trim()??"";
  const siteId=request.nextUrl.searchParams.get("siteId")?.trim()??"";
  if(!workspaceId||!siteId)return NextResponse.json({error:"workspaceId and siteId are required"},{status:400});
  const authorization=request.headers.get("authorization");
  if(!authorization?.startsWith("Bearer "))return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const cfg=config();
  const user=await fetch(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.publicKey,authorization},cache:"no-store"});
  if(!user.ok)return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const membership=await fetch(`${cfg.url}/rest/v1/workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id&limit=1`,{headers:{apikey:cfg.publicKey,authorization},cache:"no-store"});
  if(!membership.ok||!(await membership.json() as unknown[]).length)return NextResponse.json({error:"WORKSPACE_FORBIDDEN"},{status:403});
  const query=new URLSearchParams({workspace_id:`eq.${workspaceId}`,site_id:`eq.${siteId}`,select:"id,action_id,source_page,name,email,phone,message,fields,status,created_at",order:"created_at.desc",limit:"100"});
  const response=await fetch(`${cfg.url}/rest/v1/site_leads?${query}`,{headers:serviceHeaders(cfg),cache:"no-store"});
  if(!response.ok)throw new Error(await response.text());
  const leads=await response.json();
  return NextResponse.json({ok:true,leads});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load leads"},{status:500});}
}

export async function PATCH(request:NextRequest){
 try{
  const authorization=request.headers.get("authorization");if(!authorization?.startsWith("Bearer "))return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const body=await request.json() as Record<string,unknown>,workspaceId=text(body.workspaceId),siteId=text(body.siteId),leadId=text(body.leadId),status=text(body.status);
  if(!workspaceId||!siteId||!leadId||!["new","contacted","qualified","closed","spam"].includes(status))return NextResponse.json({error:"Invalid lead update"},{status:400});
  const cfg=config();
  const membership=await fetch(`${cfg.url}/rest/v1/workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id&limit=1`,{headers:{apikey:cfg.publicKey,authorization},cache:"no-store"});
  if(!membership.ok||!(await membership.json() as unknown[]).length)return NextResponse.json({error:"WORKSPACE_FORBIDDEN"},{status:403});
  const query=new URLSearchParams({id:`eq.${leadId}`,workspace_id:`eq.${workspaceId}`,site_id:`eq.${siteId}`});
  const response=await fetch(`${cfg.url}/rest/v1/site_leads?${query}`,{method:"PATCH",headers:{...serviceHeaders(cfg),"content-type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
  if(!response.ok)throw new Error(await response.text());
  return NextResponse.json({ok:true,lead:(await response.json() as unknown[])[0]??null});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update lead"},{status:500});}
}
function text(v:unknown){return typeof v==="string"?v.trim():"";}
function config(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;const serviceKey=process.env.MICIRQL_SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;if(!url||!publicKey||!serviceKey)throw new Error("Supabase configuration is missing");return{url,publicKey,serviceKey};}
function serviceHeaders(cfg:ReturnType<typeof config>){return{apikey:cfg.serviceKey,authorization:`Bearer ${cfg.serviceKey}`};}
