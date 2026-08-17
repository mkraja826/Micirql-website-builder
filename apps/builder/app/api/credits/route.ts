import { assertWorkspaceAccess } from "../assets/supabase-assets";
import { getCreditBalance } from "./supabase-credit-runtime";

function config(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Server credit configuration is missing.");return{url,key};}
function headers(){const{key}=config();return{apikey:key,authorization:`Bearer ${key}`};}

export async function GET(request:Request){
 try{
  const url=new URL(request.url);const workspaceId=url.searchParams.get("workspaceId")?.trim();if(!workspaceId)return Response.json({error:"workspaceId is required."},{status:400});
  await assertWorkspaceAccess(request,workspaceId);
  const balance=await getCreditBalance(workspaceId);
  const{url:base}=config();const q=new URLSearchParams({workspace_id:`eq.${workspaceId}`,select:"id,kind,credits,description,metadata,created_at",order:"created_at.desc",limit:"50"});
  const response=await fetch(`${base}/rest/v1/credit_transactions?${q}`,{headers:headers(),cache:"no-store"});if(!response.ok)throw new Error(await response.text());
  const transactions=await response.json();
  return Response.json({workspaceId,balance,transactions});
 }catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Credit lookup failed."},{status});}
}
