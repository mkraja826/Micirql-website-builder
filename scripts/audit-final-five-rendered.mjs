import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['ecommerce','consultancy','travel-agency','home-services','events'];
const candidateIds = Array.from({ length:4 },(_,index)=>`candidate-${String(index+1).padStart(2,'0')}`);
const expected = {
  ecommerce:{industry:'ecommerce', capabilities:new Set(['product_enquiry','contact']), hero:'products'},
  consultancy:{industry:'consulting', capabilities:new Set(['lead_capture','contact']), hero:'professional context'},
  'travel-agency':{industry:'travel', capabilities:new Set(['booking_enquiry','contact']), hero:'destinations'},
  'home-services':{industry:'home-services', capabilities:new Set(['appointment','contact']), hero:'service work'},
  events:{industry:'events', capabilities:new Set(['lead_capture','contact']), hero:'events'},
};
const forbidden = ['Pearl Dental','patient-friendly','the clinic','award-winning','5-star','guaranteed results','years of experience','decades of experience'];
const targets=[{name:'desktop',width:1440,height:1200},{name:'mobile',width:390,height:844}];
fs.mkdirSync('artifacts/final-five-render-audit',{recursive:true});

const browser=await chromium.launch({headless:true});
const report={generatedAt:new Date().toISOString(),fixtures:[],summary:{}};
for(const fixture of fixtures){
  const fixtureReport={fixture,candidates:[]};
  for(const id of candidateIds){
    const failures=[];
    const mediaPage=await browser.newPage({viewport:{width:1200,height:900}});
    const mediaResponse=await mediaPage.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}/media`,{waitUntil:'networkidle'});
    const media=await mediaPage.evaluate(()=>{const main=document.querySelector('main');const intents=[...document.querySelectorAll('[data-media-role]')];const hero=intents.find((item)=>item.getAttribute('data-media-role')==='hero');return{fixture:main?.getAttribute('data-benchmark-fixture')??'',industry:main?.getAttribute('data-media-industry')??'',intentCount:Number(main?.getAttribute('data-media-intent-count')??0),roles:intents.map((item)=>item.getAttribute('data-media-role')??''),sourceIntents:intents.map((item)=>item.getAttribute('data-media-source-intent')??''),verification:intents.map((item)=>item.getAttribute('data-media-verification')??''),heroSubject:hero?.getAttribute('data-media-subject')??''};});
    await mediaPage.close();
    if(!mediaResponse||mediaResponse.status()>=400)failures.push(`media probe HTTP ${mediaResponse?.status()??0}`);
    if(media.fixture!==fixture)failures.push(`media fixture mismatch ${media.fixture||'missing'}`);
    if(media.industry!==expected[fixture].industry)failures.push(`media industry expected ${expected[fixture].industry}, found ${media.industry||'missing'}`);
    if(media.intentCount!==3)failures.push(`expected 3 media intents, found ${media.intentCount}`);
    for(const role of ['hero','services','about'])if(!media.roles.includes(role))failures.push(`missing ${role} media intent`);
    if(media.sourceIntents.some((value)=>value!=='curated'))failures.push('unexpected media source intent');
    if(media.verification.some((value)=>value!=='generic-safe'))failures.push('unsafe media verification state');
    if(!media.heroSubject.toLowerCase().includes(expected[fixture].hero))failures.push(`hero media subject expected ${expected[fixture].hero}, found ${media.heroSubject||'missing'}`);

    const targetReports={};
    for(const target of targets){
      const page=await browser.newPage({viewport:{width:target.width,height:target.height}});
      const response=await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}`,{waitUntil:'networkidle'});
      const metrics=await page.evaluate((blocked)=>{const main=document.querySelector('main');const root=document.documentElement;const body=document.body;const text=body.innerText;return{fixture:main?.getAttribute('data-benchmark-fixture')??'',primaryCapability:main?.getAttribute('data-primary-capability')??'',primaryCapabilityStatus:main?.getAttribute('data-primary-capability-status')??'',contentSource:main?.getAttribute('data-content-source')??'',contentWarnings:Number(main?.getAttribute('data-content-warning-count')??-1),contentSections:Number(main?.getAttribute('data-content-section-count')??-1),mediaSource:main?.getAttribute('data-media-source')??'',horizontalOverflow:Math.max(0,root.scrollWidth-window.innerWidth,body.scrollWidth-window.innerWidth),h1Count:document.querySelectorAll('h1').length,majorSections:document.querySelectorAll('main section').length,hero:(document.querySelector('h1')?.textContent??'').trim(),offer:(document.querySelector('#offer')?.textContent??'').trim(),approach:(document.querySelector('#approach')?.textContent??'').trim(),contact:(document.querySelector('#contact')?.textContent??'').trim(),forbiddenMatches:blocked.filter((term)=>text.toLowerCase().includes(term.toLowerCase()))};},forbidden);
      await page.close();
      const targetFailures=[];
      if(!response||response.status()>=400)targetFailures.push(`HTTP ${response?.status()??0}`);
      if(metrics.fixture!==fixture)targetFailures.push(`fixture mismatch ${metrics.fixture||'missing'}`);
      if(!expected[fixture].capabilities.has(metrics.primaryCapability))targetFailures.push(`unexpected primary capability ${metrics.primaryCapability||'missing'}`);
      if(metrics.primaryCapabilityStatus!=='preview')targetFailures.push(`primary capability must fail closed in preview, found ${metrics.primaryCapabilityStatus||'missing'}`);
      if(metrics.contentSource!=='deterministic-safe')targetFailures.push(`unexpected content source ${metrics.contentSource||'missing'}`);
      if(metrics.contentWarnings<1)targetFailures.push('missing safe-fallback warning telemetry');
      if(metrics.contentSections<7)targetFailures.push(`content section count ${metrics.contentSections} < 7`);
      if(!['provider','fallback'].includes(metrics.mediaSource))targetFailures.push(`unexpected media state ${metrics.mediaSource||'missing'}`);
      if(metrics.horizontalOverflow>1)targetFailures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
      if(metrics.h1Count!==1)targetFailures.push(`expected one h1, found ${metrics.h1Count}`);
      if(metrics.majorSections<5)targetFailures.push(`only ${metrics.majorSections} major sections`);
      if(!metrics.hero||!metrics.offer||!metrics.approach||!metrics.contact)targetFailures.push('required rendered content is empty');
      if(metrics.forbiddenMatches.length)targetFailures.push(`unsafe/cross-industry content: ${metrics.forbiddenMatches.join(', ')}`);
      failures.push(...targetFailures.map((item)=>`${target.name}: ${item}`));
      targetReports[target.name]={...metrics,failures:targetFailures};
    }
    fixtureReport.candidates.push({id,media,targets:targetReports,failures});
  }
  report.fixtures.push(fixtureReport);
}
await browser.close();
const all=report.fixtures.flatMap((fixture)=>fixture.candidates.map((candidate)=>({fixture:fixture.fixture,...candidate})));
const failed=all.filter((candidate)=>candidate.failures.length);
report.summary={fixtureCount:report.fixtures.length,candidateCount:all.length,candidatesWithFailures:failed.map((candidate)=>`${candidate.fixture}/${candidate.id}`)};
fs.writeFileSync('artifacts/final-five-render-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(failed.length)process.exit(1);
