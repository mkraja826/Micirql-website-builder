import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['restaurant','real-estate','construction','saas'];
const candidateIds = Array.from({ length:20 },(_,index)=>`candidate-${String(index+1).padStart(2,'0')}`);
const targets=[{name:'desktop',width:1440,height:1200},{name:'mobile',width:390,height:844}];
const forbidden=['Pearl Dental','patient-friendly','the clinic','award-winning','5-star','guaranteed results','years of experience','decades of experience'];

function score(metrics,target,fixture){
  let value=100; const failures=[]; const cautions=[];
  if(metrics.fixture!==fixture){value-=40;failures.push(`fixture mismatch ${metrics.fixture||'missing'}`);}
  if(metrics.horizontalOverflow>1){value-=35;failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);}
  if(metrics.h1Count!==1){value-=15;failures.push(`expected exactly one h1, found ${metrics.h1Count}`);}
  if(metrics.sectionCount<5){value-=20;failures.push(`only ${metrics.sectionCount} major sections`);}
  if(metrics.forbiddenMatches.length){value-=40;failures.push(`unsafe/cross-industry content: ${metrics.forbiddenMatches.join(', ')}`);}
  if(!metrics.primaryCapability){value-=30;failures.push('missing primary capability');}
  if(metrics.primaryCapabilityStatus!=='preview'){value-=30;failures.push(`primary capability must fail closed in preview, found ${metrics.primaryCapabilityStatus||'missing'}`);}
  if(metrics.contentSource!=='deterministic-safe'){value-=40;failures.push(`unexpected content source ${metrics.contentSource||'missing'}`);}
  if(metrics.contentWarnings<1){value-=25;failures.push('missing safe-fallback warning telemetry');}
  if(metrics.contentSections<5){value-=25;failures.push(`content section count ${metrics.contentSections} < 5`);}
  if(!['provider','fallback'].includes(metrics.mediaSource)){value-=30;failures.push(`unexpected media state ${metrics.mediaSource||'missing'}`);}
  if(metrics.elementsOutsideViewport>0){value-=Math.min(20,metrics.elementsOutsideViewport*4);cautions.push(`${metrics.elementsOutsideViewport} visible element(s) outside viewport`);}
  if(target.name==='mobile'&&metrics.smallTapTargetCount>0){value-=Math.min(15,metrics.smallTapTargetCount*2);cautions.push(`${metrics.smallTapTargetCount} small tap target(s)`);}
  if(metrics.tinyTextCount>0){value-=Math.min(10,metrics.tinyTextCount*2);cautions.push(`${metrics.tinyTextCount} tiny text element(s)`);}
  return {score:Math.max(0,value),failures,cautions};
}

async function collect(page){
  return page.evaluate((blocked)=>{const root=document.documentElement;const body=document.body;const main=document.querySelector('main');const visible=[...document.querySelectorAll('body *')].filter((element)=>{const style=getComputedStyle(element);const rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0;});const interactive=visible.filter((element)=>['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(element.tagName)||element.getAttribute('role')==='button');const textElements=visible.filter((element)=>element.childElementCount===0&&(element.textContent??'').trim());const text=body.innerText;return{fixture:main?.getAttribute('data-benchmark-fixture')??'',candidateId:main?.getAttribute('data-candidate-id')??'',primaryCapability:main?.getAttribute('data-primary-capability')??'',primaryCapabilityStatus:main?.getAttribute('data-primary-capability-status')??'',contentSource:main?.getAttribute('data-content-source')??'',contentWarnings:Number(main?.getAttribute('data-content-warning-count')??-1),contentSections:Number(main?.getAttribute('data-content-section-count')??-1),mediaSource:main?.getAttribute('data-media-source')??'',horizontalOverflow:Math.max(0,root.scrollWidth-window.innerWidth,body.scrollWidth-window.innerWidth),elementsOutsideViewport:visible.filter((element)=>{const r=element.getBoundingClientRect();return r.left< -1||r.right>window.innerWidth+1;}).length,smallTapTargetCount:interactive.filter((element)=>{const r=element.getBoundingClientRect();return r.width<40&&r.height<40;}).length,tinyTextCount:textElements.filter((element)=>parseFloat(getComputedStyle(element).fontSize)<11).length,h1Count:document.querySelectorAll('h1').length,sectionCount:document.querySelectorAll('main section').length,forbiddenMatches:blocked.filter((term)=>text.toLowerCase().includes(term.toLowerCase()))};},forbidden);
}

fs.mkdirSync('artifacts/real-certification-render-audit',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={generatedAt:new Date().toISOString(),evidenceState:'initial-render',fixtures:[],summary:{}};
for(const fixture of fixtures){
  const fixtureReport={fixture,candidates:[]};
  for(const id of candidateIds){
    const candidate={id,targets:{},failures:[],renderedScore:0};
    for(const target of targets){
      const page=await browser.newPage({viewport:{width:target.width,height:target.height},deviceScaleFactor:1});
      const response=await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}`,{waitUntil:'networkidle'});
      const metrics=await collect(page); await page.close();
      const scored=score(metrics,target,fixture); if(!response||response.status()>=400)scored.failures.push(`HTTP ${response?.status()??0}`);
      if(metrics.candidateId!==id)scored.failures.push(`candidate identity mismatch ${metrics.candidateId||'missing'}`);
      candidate.targets[target.name]={...metrics,...scored}; candidate.failures.push(...scored.failures.map((failure)=>`${target.name}: ${failure}`));
    }
    candidate.renderedScore=Math.round(candidate.targets.desktop.score*0.45+candidate.targets.mobile.score*0.55);
    fixtureReport.candidates.push(candidate);
  }
  report.fixtures.push(fixtureReport);
}
await browser.close();
const all=report.fixtures.flatMap((entry)=>entry.candidates.map((candidate)=>({fixture:entry.fixture,...candidate})));
report.summary={fixtureCount:report.fixtures.length,candidateCount:all.length,minScore:Math.min(...all.map((candidate)=>candidate.renderedScore)),candidatesWithFailures:all.filter((candidate)=>candidate.failures.length).map((candidate)=>`${candidate.fixture}/${candidate.id}`)};
fs.writeFileSync('artifacts/real-certification-render-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(report.summary.fixtureCount!==4||report.summary.candidateCount!==80)process.exit(1);
if(report.summary.candidatesWithFailures.length)process.exit(1);
