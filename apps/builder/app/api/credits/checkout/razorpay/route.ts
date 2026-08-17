import { assertWorkspaceAccess } from "../../../assets/supabase-assets";
import { creditPackageById } from "../../packages/config";

function razorpayConfig(){const keyId=process.env.RAZORPAY_KEY_ID?.trim(),keySecret=process.env.RAZORPAY_KEY_SECRET?.trim();if(!keyId||!keySecret)throw statusError(503,"RAZORPAY_NOT_CONFIGURED");return{keyId,keySecret};}
function supabaseConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error("Server payment configuration is missing.");return{url,key};}
function serviceHeaders(){const{key}=supabaseConfig();return{apikey:key,authorization:`Bearer ${key}`,"content-type":"application/json"};}

export async function POST(request:Request){
 try{
  const body=await request.json() as{workspaceId?:string;packageId?:string};
  const workspaceId=body.workspaceId?.trim(),packageId=body.packageId?.trim();if(!workspaceId||!packageId)return Response.json({error:"workspaceId and packageId are required."},{status:400});
  await assertWorkspaceAccess(request,workspaceId);
  const pkg=creditPackageById(packageId);if(!pkg)return Response.json({error:"Unknown credit package."},{status:400});
  const auth=request.headers.get("authorization")!;const{url}=supabaseConfig();const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{...serviceHeaders(),authorization:auth},cache:"no-store"});if(!userResponse.ok)throw statusError(401,"AUTH_REQUIRED");const user=await userResponse.json() as{id?:string};if(!user.id)throw statusError(401,"AUTH_REQUIRED");
  const{keyId,keySecret}=razorpayConfig();const receipt=`micirql-${crypto.randomUUID().replaceAll("-","").slice(0,24)}`;
  const orderResponse=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{authorization:`Basic ${btoa(`${keyId}:${keySecret}`)}`,"content-type":"application/json"},body:JSON.stringify({amount:pkg.priceInr*100,currency:"INR",receipt,notes:{workspace_id:workspaceId,package_id:pkg.id,credits:String(pkg.credits)}})});
  const order=await orderResponse.json() as{id?:string;amount?:number;currency?:string;status?:string;error?:{description?:string}};if(!orderResponse.ok||!order.id)throw statusError(502,order.error?.description??"Razorpay order creation failed.");
  const row={workspace_id:workspaceId,created_by:user.id,provider:"razorpay",provider_order_id:order.id,package_id:pkg.id,credits:pkg.credits,amount_inr:pkg.priceInr,currency:"INR",status:"created"};
  const save=await fetch(`${url}/rest/v1/credit_payment_orders`,{method:"POST",headers:{...serviceHeaders(),Prefer:"return=minimal"},body:JSON.stringify(row)});if(!save.ok)throw statusError(500,await save.text());
  return Response.json({provider:"razorpay",keyId,orderId:order.id,amount:pkg.priceInr*100,currency:"INR",package:{id:pkg.id,name:pkg.name,credits:pkg.credits,priceInr:pkg.priceInr}} ,{status:201});
 }catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Checkout order creation failed."},{status});}
}
function statusError(status:number,message:string){const error=new Error(message) as Error&{status?:number};error.status=status;return error;}
