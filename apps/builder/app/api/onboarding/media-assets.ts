import type { AssetRecord } from "@micirql/assets";
import type { MediaAsset } from "../../media-execution";
import { listAssets } from "../assets/supabase-assets";

export async function loadMediaPools(workspaceId:string){
 const assets=await listAssets(workspaceId);
 return{
  customerAssets:assets.filter(a=>a.workspaceId===workspaceId&&a.source==="user-upload").map(toMediaAsset),
  libraryAssets:assets.filter(a=>!a.workspaceId&&a.license==="micirql-owned").map(toMediaAsset),
  licensedAssets:assets.filter(a=>!a.workspaceId&&a.license==="licensed").map(toMediaAsset)
 };
}
function toMediaAsset(asset:AssetRecord):MediaAsset{
 const source:MediaAsset["source"]=asset.source==="user-upload"?"customer":asset.license==="licensed"?"licensed":"library";
 return{id:asset.id,name:asset.name,url:asset.originalUrl,source,tags:[...asset.tags,...asset.sectionFamilies,...asset.domains,...asset.subtypes],alt:asset.alt,aspect:aspect(asset.aspectRatio),verified:asset.license==="user-owned"||asset.license==="micirql-owned"||asset.license==="licensed"||asset.license==="generated",...(asset.perceptualHash?{perceptualHash:asset.perceptualHash}:{})};
}
function aspect(ratio:number){if(ratio>=2)return"wide";if(ratio>=1.65)return"16:9";if(ratio>=1.42)return"3:2";if(ratio>=1.2)return"4:3";if(ratio<=.82)return"portrait";return"1:1";}
