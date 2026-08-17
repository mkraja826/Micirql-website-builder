import { createHmac, timingSafeEqual } from "node:crypto";
import { addPurchasedCredits } from "../supabase-credit-runtime";

export async function POST(request:Request){
 try{
  const secret=process.env.MICIRQL_CREDIT_SETTLEMENT_SECRET?.trim();
  if(!secret)return Response.json({error:"Credit settlement is not configured."},{status:503});
  const raw=await request.text();
  const signature=request.headers.get("x-micirql-signature")?.trim()??"";
  if(!validSignature(raw,signature,secret))return Response.json({error:"INVALID_SIGNATURE"},{status:401});
  const body=JSON.parse(raw) as{workspaceId?:string;credits?:number;paymentId?:string;provider?:string;amountMinor?:number;currency?:string;packageId?:string};
  if(!body.workspaceId||!body.paymentId||!Number.isInteger(body.credits)||Number(body.credits)<=0)return Response.json({error:"Invalid settlement payload."},{status:400});
  const operationKey=`purchase:${body.provider??"payment"}:${body.paymentId}`;
  const balance=await addPurchasedCredits({workspaceId:body.workspaceId,credits:Number(body.credits),operationKey,description:"Purchased MiCirql credits",metadata:{paymentId:body.paymentId,provider:body.provider??null,amountMinor:body.amountMinor??null,currency:body.currency??null,packageId:body.packageId??null}});
  return Response.json({ok:true,balance,creditsAdded:Number(body.credits),operationKey});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Credit settlement failed."},{status:500});}
}

function validSignature(payload:string,signature:string,secret:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac("sha256",secret).update(payload).digest("hex");
 const a=Buffer.from(expected,"hex"),b=Buffer.from(signature,"hex");
 return a.length===b.length&&timingSafeEqual(a,b);
}
