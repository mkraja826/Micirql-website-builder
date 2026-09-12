import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data'];
const candidateIds = Array.from({ length:4 }, (_,index)=>`candidate-${String(index+1).padStart(2,'0')}`);
const majorTypes = new Set(['hero','services','about','cta']);
fs.mkdirSync('artifacts/multi-industry-diversity-audit',{recursive:true});

function tokenize(value){
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter((token)=>token.length>2));
}
function jaccard(a,b){
  const left=tokenize(a); const right=tokenize(b); const union=new Set([...left,...right]);
  if(!union.size)return 1;
  let intersection=0; for(const token of left)if(right.has(token))intersection++;
  return intersection/union.size;
}
function pairwise(items){
  const pairs=[]; for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)pairs.push([items[i],items[j]]); return pairs;
}
function architectureDistance(a,b){
  const keys=new Set([...Object.keys(a.archetypes),...Object.keys(b.archetypes)]);
  let total=0; let major=0;
  for(const key of keys){ if(a.archetypes[key]!==b.archetypes[key]){ total++; if(majorTypes.has(key))major++; } }
  return { total, major, orderDifferent:a.order.join('|')!==b.order.join('|') };
}

const browser=await chromium.launch({headless:true});
const report={generatedAt:new Date().toISOString(),fixtures:[],summary:{}};
for(const fixture of fixtures){
  const candidates=[];
  for(const id of candidateIds){
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const response=await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}`,{waitUntil:'networkidle'});
    if(!response||response.status()>=400)throw new Error(`${fixture}/${id} rendered page HTTP ${response?.status()??0}`);
    const rendered=await page.evaluate(()=>{
      const main=document.querySelector('main');
      const wrappers=[...document.querySelectorAll('main > [data-section-tone]')];
      const order=wrappers.map((node)=>node.getAttribute('data-section-tone')??'');
      const archetypes=Object.fromEntries(wrappers.map((node)=>[node.getAttribute('data-section-tone')??'',node.getAttribute('data-section-archetype')??'']));
      return { artDirection:main?.getAttribute('data-art-direction')??'', order, archetypes, bodyText:document.body.innerText };
    });
    await page.close();

    const contentPage=await browser.newPage({viewport:{width:1000,height:800}});
    const contentResponse=await contentPage.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}/content`,{waitUntil:'networkidle'});
    if(!contentResponse||contentResponse.status()>=400)throw new Error(`${fixture}/${id} content page HTTP ${contentResponse?.status()??0}`);
    const narrative=await contentPage.evaluate(()=>{
      const main=document.querySelector('main');
      const headlines=[...document.querySelectorAll('main h1, main h2')].map((node)=>(node.textContent??'').trim()).filter(Boolean);
      const ctas=[...document.querySelectorAll('[data-content-primary-cta]')].map((node)=>(node.textContent??'').trim()).filter(Boolean);
      return { headlines, ctas, text:[...headlines,...ctas].join(' | '), sectionCount:Number(main?.getAttribute('data-content-section-count')??0) };
    });
    await contentPage.close();
    candidates.push({id,...rendered,narrative});
  }

  const comparisons=[]; const failures=[];
  for(const [a,b] of pairwise(candidates)){
    const architecture=architectureDistance(a,b);
    const narrativeSimilarity=jaccard(a.narrative.text,b.narrative.text);
    const artDirectionDifferent=a.artDirection!==b.artDirection;
    const pairFailures=[];
    if(!artDirectionDifferent)pairFailures.push('same art direction');
    if(architecture.major<2)pairFailures.push(`major archetype distance ${architecture.major} < 2`);
    if(architecture.total<3&&!architecture.orderDifferent)pairFailures.push(`architecture too similar: total distance ${architecture.total} and identical order`);
    if(narrativeSimilarity>0.92)pairFailures.push(`narrative similarity ${narrativeSimilarity.toFixed(3)} > 0.92`);
    comparisons.push({a:a.id,b:b.id,artDirectionDifferent,architecture,narrativeSimilarity:Number(narrativeSimilarity.toFixed(3)),failures:pairFailures});
    failures.push(...pairFailures.map((failure)=>`${a.id} vs ${b.id}: ${failure}`));
  }
  const uniqueArchitectureSignatures=new Set(candidates.map((candidate)=>candidate.order.map((type)=>`${type}:${candidate.archetypes[type]??''}`).join('|'))).size;
  const uniqueNarrativeSignatures=new Set(candidates.map((candidate)=>candidate.narrative.text)).size;
  if(uniqueArchitectureSignatures!==candidateIds.length)failures.push(`only ${uniqueArchitectureSignatures}/${candidateIds.length} unique architecture signatures`);
  if(uniqueNarrativeSignatures!==candidateIds.length)failures.push(`only ${uniqueNarrativeSignatures}/${candidateIds.length} unique narrative signatures`);
  report.fixtures.push({fixture,candidates,comparisons,uniqueArchitectureSignatures,uniqueNarrativeSignatures,failures});
}
await browser.close();
const failedFixtures=report.fixtures.filter((fixture)=>fixture.failures.length).map((fixture)=>fixture.fixture);
const allComparisons=report.fixtures.flatMap((fixture)=>fixture.comparisons);
report.summary={fixtureCount:report.fixtures.length,candidateCount:report.fixtures.length*candidateIds.length,pairComparisonCount:allComparisons.length,failedFixtures,minMajorArchitectureDistance:Math.min(...allComparisons.map((pair)=>pair.architecture.major)),maxNarrativeSimilarity:Math.max(...allComparisons.map((pair)=>pair.narrativeSimilarity))};
fs.writeFileSync('artifacts/multi-industry-diversity-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(failedFixtures.length)process.exit(1);
