import { addPurchasedCredits } from "../../../supabase-credit-runtime";
import { assertWorkspaceAccess } from "../../../../assets/supabase-assets";

function razorpayConfig(){const keyId=process.env.RAZORPAY_KEY_ID?.trim(),keySecret=process.env.RAZORPAY_KEY_SECRET?.trim();if(!keyId||!keySecret)throw statusError(503,"RAZORPAY_NOT_CONFIGURED");return{keyId,keySecret};}
function supabaseConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error("Server payment configuration is missing.");return{url,key};}
function serviceHeaders(){const{key}=supabaseConfig();return{apikey:key,authorization:`Bearer ${key}`,"content-type":"application/json"};}

export async function POST(request:Request){
 try{
  const body=await request.json() as{workspaceId?:string;razorpay_order_id?:string;razorpay_payment_id?:string;razorpay_signature?:string};
  const workspaceId=body.workspaceId?.trim(),orderId=body.razorpay_order_id?.trim(),paymentId=body.razorpay_payment_id?.trim(),signature=body.razorpay_signature?.trim();
  if(!workspaceId||!orderId||!paymentId||!signature)return Response.json({error:"Payment verification data is incomplete."},{status:400});
  await assertWorkspaceAccess(request,workspaceId);
  const{url}=supabaseConfig();const q=new URLSearchParams({workspace_id:`eq.${workspaceId}`,provider_order_id:`eq.${orderId}`,select:"*",limit:"1"});const orderLookup=await fetch(`${url}/rest/v1/credit_payment_orders?${q}`,{headers:serviceHeaders(),cache:"no-store"});if(!orderLookup.ok)throw statusError(500,await orderLookup.text());const rows=await orderLookup.json() as PaymentOrder[];const stored=rows[0];if(!stored)throw statusError(404,"PAYMENT_ORDER_NOT_FOUND");
  if(stored.status==="paid")return Response.json({ok:true,balance:null,creditsAdded:stored.credits,alreadySettled:true});
  const{keyId,keySecret}=razorpayConfig();const expected=await hmacHex(keySecret,`${stored.provider_order_id}|${paymentId}`);if(!safeEqual(expected,signature))throw statusError(400,"INVALID_PAYMENT_SIGNATURE");
  const auth=`Basic ${btoa(`${keyId}:${keySecret}`)}`;const[paymentResponse,providerOrderResponse]=await Promise.all([fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{authorization:auth},cache:"no-store"}),fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(stored.provider_order_id)}`,{headers:{authorization:auth},cache:"no-store"})]);
  const payment=await paymentResponse.json() as{id?:string;order_id?:string;status?:string;amount?:number;currency?:string;error_description?:string};const providerOrder=await providerOrderResponse.json() as{id?:string;status?:string;amount?:number;currency?:string;error?:{description?:string}};if(!paymentResponse.ok)throw statusError(502,payment.error_description??"Could not verify Razorpay payment status.");if(!providerOrderResponse.ok)throw statusError(502,providerOrder.error?.description??"Could not verify Razorpay order status.");
  if(payment.order_id!==stored.provider_order_id||payment.status!=="captured"||providerOrder.status!=="paid"||payment.amount!==stored.amount_inr*100||providerOrder.amount!==stored.amount_inr*100||payment.currency!==stored.currency||providerOrder.currency!==stored.currency)throw statusError(409,"PAYMENT_NOT_CAPTURED_OR_MISMATCHED");
  const balance=await addPurchasedCredits({workspaceId,credits:stored.credits,operationKey:`razorpay:${paymentId}`,description:`${stored.package_id} credit recharge`,metadata:{provider:"razorpay",providerOrderId:stored.provider_order_id,providerPaymentId:paymentId,packageId:stored.package_id,amountInr:stored.amount_inr}});
  const patch=await fetch(`${url}/rest/v1/credit_payment_orders?id=eq.${stored.id}`,{method:"PATCH",headers:{...serviceHeaders(),Prefer:"return=minimal"},body:JSON.stringify({status:"paid",provider_payment_id:paymentId,settled_at:new Date().toISOString(),updated_at:new Date().toISOString()})});if(!patch.ok)console.error("MiCirql Razorpay payment order status update failed",await patch.text());
  return Response.json({ok:true,balance,creditsAdded:stored.credits,alreadySettled:false});
 }catch(error){const status=(error as Error&{status?:number}).status??500;return Response.json({error:error instanceof Error?error.message:"Payment verification failed."},{status});}
}
async function hmacHex(secret:string,message:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));return Array.from(new Uint8Array(signature),byte=>byte.toString(16).padStart(2,"0")).join("");}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function statusError(status:number,message:string){const error=new Error(message) as Error&{status?:number};error.status=status;return error;}
type PaymentOrder={id:string;workspace_id:string;provider_order_id:string;package_id:string;credits:number;amount_inr:number;currency:string;status:string};
