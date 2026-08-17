import { creditPackages } from "./config";

export async function GET(){return Response.json({currency:"INR",packages:creditPackages()});}
