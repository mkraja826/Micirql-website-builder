import { notFound } from "next/navigation";
import { hydrateMaterializedSite } from "../../../src/core/materialization/materializer";
import { renderPublishedSnapshot } from "../../../src/core/publish/renderer";
import type { PublishedSiteRuntime } from "../../../src/core/publish/runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RevisionCertificationProbe({ searchParams }:{ searchParams:Promise<{snapshot?:string}> }){
 const {snapshot:encoded}=await searchParams;if(!encoded)notFound();
 let snapshot;try{const json=Buffer.from(encoded,"base64url").toString("utf8");snapshot=hydrateMaterializedSite(json);}catch{notFound();}
 if(snapshot.revision<2)notFound();
 const pageSlug=snapshot.snapshot.pages[0]?.slug;if(!pageSlug)notFound();
 const versionId=`revision-certification:${snapshot.siteId}:${snapshot.revision}`;
 const runtime:PublishedSiteRuntime={dbSiteId:snapshot.siteId,status:"published",publishedVersionId:versionId,renderedVersionId:versionId,capabilities:snapshot.snapshot.capabilities.map((item)=>({id:item.id,state:item.state}))};
 const rendered=renderPublishedSnapshot({snapshot,runtime,pageSlug});if(!rendered)notFound();
 return <div data-revision-certification-fingerprint={snapshot.fingerprint} data-revision-certification-revision={snapshot.revision} data-revision-certification-candidate={snapshot.source.candidateId}>{rendered}</div>;
}
