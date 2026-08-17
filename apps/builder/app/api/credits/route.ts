import { assertWorkspaceAccess } from "../assets/supabase-assets";

function config(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");
 const apiKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!apiKey)throw new Error("Server Supabase public configuration is missing.");
 return{url,apiKey};
}
function userHeaders(request:Request){const auth=request.headers.get("authorization");if(!auth?.startsWith("Bearer "))throw statusError(401,"AUTH_REQUIRED");const{apiKey}=config();return{apikey:apiKey,authorization:auth};}

export async function GET(request:Request){
 try{
  const url=new URL(request.url);const workspaceId=url.searchParams.get("workspaceId")?.trim();if(!workspaceId)return Response.json({error:"workspaceId is required."},{status:400});
  await assertWorkspaceAccess(request,workspaceId);
  const{url:base}=config();const headers=userHeaders(request);
  const walletQuery=new URLSearchParams({workspace_id:`eq.${workspaceId}`,select:"balance",limit:"1"});
  const txQuery=new URLSearchParams({workspace_id:`eq.${workspaceId}`,select:"id,kind,credits,description,metadata,created_at",order:"created_at.desc",limit:"50"});
  const[walletResponse,transactionsResponse]=await Promise.all([
   fetch(`${base}/rest/v1/credit_wallets?${walletQuery}`,{headers,cache:"no-store"}),
   fetch(`${base}/rest/v1/credit_transactions?${txQuery}`,{headers,cache:"no-store"})
  ]);
  if(!walletResponse.ok)throw statusError(walletResponse.status,await walletResponse.text());
  if(!transactionsResponse.ok)throw statusError(transactionsResponse.status,await transactionsResponse.text());
  const walletRows=await walletResponse.json() as Array<{balance:number}>;
  const transactions=await transactionsResponse.json();
  return Response.json({workspaceId,balance:Number(walletRows[0]?.balance??0),transactions});
 }catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Credit lookup failed."},{status});}
}
function statusError(status:number,message:string){const error=new Error(message) as Error&{status?:number};error.status=status;return error;}
