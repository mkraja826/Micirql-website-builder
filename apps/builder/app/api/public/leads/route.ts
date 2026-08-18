import { NextRequest, NextResponse } from "next/server";

const MAX_FIELD=2000;
const ALLOWED_ACTIONS=new Set(["lead.create","appointment.request","reservation.request","quote.request","property.enquiry","demo.request","booking.request","enrollment.enquiry"]);

export async function POST(request:NextRequest){
 try{
  const body=await formBody(request);
  if(text(body.website))return NextResponse.json({ok:true},{status:202});
  const workspaceId=text(body.workspaceId),siteId=text(body.siteId),name=text(body.name),actionId=ALLOWED_ACTIONS.has(text(body.actionId))?text(body.actionId):"lead.create";
  if(!workspaceId||!siteId||!name)return NextResponse.json({error:"workspaceId, siteId and name are required"},{status:400});
  if(!truthy(body.consent))return NextResponse.json({error:"Consent is required"},{status:400});
  const cfg=serviceConfig();
  const valid=await fetch(`${cfg.url}/rest/v1/workspace_drafts?workspace_id=eq.${encodeURIComponent(workspaceId)}&site_id=eq.${encodeURIComponent(siteId)}&select=site_id&limit=1`,{headers:serviceHeaders(cfg),cache:"no-store"});
  if(!valid.ok||!(await valid.json() as unknown[]).length)return NextResponse.json({error:"Unknown site"},{status:404});
  const requestId=crypto.randomUUID();
  const fields=sanitizeFields(body);
  const row={workspace_id:workspaceId,site_id:siteId,action_id:actionId,source_page:nullable(body.sourcePage),name:name.slice(0,240),email:nullable(body.email),phone:nullable(body.phone),message:nullable(body.message),fields,consent:true,status:"new",request_id:requestId,user_agent:(request.headers.get("user-agent")??"").slice(0,500)};
  const inserted=await fetch(`${cfg.url}/rest/v1/site_leads`,{method:"POST",headers:{...serviceHeaders(cfg),"content-type":"application/json",Prefer:"return=representation"},body:JSON.stringify(row)});
  if(!inserted.ok)throw new Error(await inserted.text());
  const lead=(await inserted.json() as any[])[0];
  await queueNotifications(cfg,{workspaceId,siteId,actionId,requestId});
  const ownerEmail=await deliverOwnerEmail(cfg,{workspaceId,siteId,actionId,requestId,lead:lead??row});
  return NextResponse.json({ok:true,id:lead?.id??null,requestId,ownerEmail},{status:201,headers:cors(request)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Lead submission failed"},{status:500,headers:cors(request)});}
}

export async function OPTIONS(request:NextRequest){return new NextResponse(null,{status:204,headers:{...cors(request),"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type"}});}

async function deliverOwnerEmail(cfg:ReturnType<typeof serviceConfig>,input:{workspaceId:string;siteId:string;actionId:string;requestId:string;lead:Record<string,unknown>}){
 const prefs=await fetch(`${cfg.url}/rest/v1/site_notification_preferences?workspace_id=eq.${encodeURIComponent(input.workspaceId)}&site_id=eq.${encodeURIComponent(input.siteId)}&email_enabled=eq.true&select=email_address&limit=1`,{headers:serviceHeaders(cfg),cache:"no-store"});
 if(!prefs.ok)return "settings-unavailable";
 const row=(await prefs.json() as Array<{email_address:string|null}>)[0];
 const to=row?.email_address?.trim(); if(!to)return "disabled";
 const apiKey=process.env.RESEND_API_KEY?.trim();
 const from=(process.env.MICIRQL_NOTIFICATION_FROM_EMAIL??process.env.RESEND_FROM_EMAIL)?.trim();
 if(!apiKey||!from){await logOwnerEmail(cfg,input,"skipped",undefined);return "provider-not-configured";}
 const lead=input.lead;
 const details=[lead.phone?`Phone: ${escapeHtml(String(lead.phone))}`:"",lead.email?`Email: ${escapeHtml(String(lead.email))}`:"",lead.message?`Message: ${escapeHtml(String(lead.message))}`:"",...Object.entries((lead.fields??{}) as Record<string,unknown>).map(([key,value])=>`${escapeHtml(label(key))}: ${escapeHtml(String(value??""))}`)].filter(Boolean);
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify({from,to:[to],subject:`New ${actionLabel(input.actionId)} from ${String(lead.name??"website visitor")}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>New ${escapeHtml(actionLabel(input.actionId))}</h2><p><strong>${escapeHtml(String(lead.name??"Website visitor"))}</strong> submitted a request on your MiCirql website.</p>${details.map(item=>`<p>${item}</p>`).join("")}<p>Open MiCirql → Enquiries to follow up and update the lead status.</p></div>`})});
 if(!response.ok){await logOwnerEmail(cfg,input,"failed",undefined);console.error("MiCirql owner email delivery failed",response.status,await response.text());return "failed";}
 const result=await response.json().catch(()=>({})) as {id?:string};
 await logOwnerEmail(cfg,input,"sent",result.id); return "sent";
}

async function logOwnerEmail(cfg:ReturnType<typeof serviceConfig>,input:{workspaceId:string;siteId:string;actionId:string;requestId:string},status:"sent"|"skipped"|"failed",providerMessageId?:string){
 const log={workspace_id:input.workspaceId,site_id:input.siteId,destination_id:null,event_id:`lead:${input.requestId}`,action_id:input.actionId,request_id:input.requestId,channel:"email",provider:"resend",provider_message_id:providerMessageId??null,status,occurred_at:new Date().toISOString()};
 await fetch(`${cfg.url}/rest/v1/notification_delivery_log`,{method:"POST",headers:{...serviceHeaders(cfg),"content-type":"application/json"},body:JSON.stringify(log)}).catch(()=>undefined);
}

async function queueNotifications(cfg:ReturnType<typeof serviceConfig>,input:{workspaceId:string;siteId:string;actionId:string;requestId:string}){
 const destinations=await fetch(`${cfg.url}/rest/v1/site_notification_destinations?workspace_id=eq.${encodeURIComponent(input.workspaceId)}&site_id=eq.${encodeURIComponent(input.siteId)}&enabled=eq.true&select=id,channel,provider,action_ids`,{headers:serviceHeaders(cfg),cache:"no-store"});
 if(!destinations.ok)return;
 const rows=await destinations.json() as Array<{id:string;channel:string;provider:string;action_ids?:string[]}>;
 const eligible=rows.filter(row=>!row.action_ids?.length||row.action_ids.includes(input.actionId));
 if(!eligible.length)return;
 const logs=eligible.map(row=>({workspace_id:input.workspaceId,site_id:input.siteId,destination_id:row.id,event_id:`lead:${input.requestId}`,action_id:input.actionId,request_id:input.requestId,channel:row.channel,provider:row.provider,status:"queued",occurred_at:new Date().toISOString()}));
 await fetch(`${cfg.url}/rest/v1/notification_delivery_log`,{method:"POST",headers:{...serviceHeaders(cfg),"content-type":"application/json"},body:JSON.stringify(logs)});
}

async function formBody(request:NextRequest){const type=request.headers.get("content-type")??"";if(type.includes("application/json"))return await request.json() as Record<string,unknown>;const fd=await request.formData();return Object.fromEntries(fd.entries()) as Record<string,unknown>;}
function sanitizeFields(body:Record<string,unknown>){const excluded=new Set(["workspaceId","siteId","actionId","sourcePage","name","email","phone","message","consent","website"]);const out:Record<string,string>={};for(const[key,value]of Object.entries(body)){if(excluded.has(key)||typeof value!=="string")continue;const clean=value.trim().slice(0,MAX_FIELD);if(clean)out[key]=clean;}return out;}
function actionLabel(id:string){return id==="appointment.request"?"appointment request":id==="quote.request"?"quote request":id==="reservation.request"?"reservation request":id==="booking.request"?"booking request":id==="demo.request"?"demo request":id==="property.enquiry"?"property enquiry":id==="enrollment.enquiry"?"enrollment enquiry":"website enquiry";}
function label(value:string){return value.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/^./,char=>char.toUpperCase());}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]??char));}
function text(v:unknown){return typeof v==="string"?v.trim():"";}
function nullable(v:unknown){const x=text(v).slice(0,MAX_FIELD);return x||null;}
function truthy(v:unknown){return v===true||v==="true"||v==="on"||v==="1";}
function serviceConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");const key=process.env.MICIRQL_SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error("Server Supabase configuration is missing");return{url,key};}
function serviceHeaders(cfg:ReturnType<typeof serviceConfig>){return{apikey:cfg.key,authorization:`Bearer ${cfg.key}`};}
function cors(request:NextRequest){const origin=request.headers.get("origin")??"*";return{"Access-Control-Allow-Origin":origin,"Vary":"Origin"};}
