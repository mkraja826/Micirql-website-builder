import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data'];
const candidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const majorTypes = new Set(['hero','services','about','cta']);
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const tokens = (value) => new Set(normalize(value).split(' ').filter((word) => word.length > 2));
function jaccard(a,b){ const left=tokens(a), right=tokens(b); const union=new Set([...left,...right]); if(!union.size)return 1; let shared=0; for(const item of left)if(right.has(item))shared++; return shared/union.size; }
function majorDistance(a,b){ const keys=new Set([...Object.keys(a),...Object.keys(b)].filter((key)=>majorTypes.has(key))); let distance=0; for(const key of keys)if(a[key]!==b[key])distance++; return distance; }
function orderDistance(a,b){ return a.join('|')===b.join('|') ? 0 : 1; }

fs.mkdirSync('artifacts/candidate-diversity-audit',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={generatedAt:new Date().toISOString(),fixtures:[],summary:{}};
for(const fixture of fixtures){
  const candidates=[];
  for(const id of candidateIds){
    const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
    const response=await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${id}`,{waitUntil:'networkidle'});
    if(!response || response.status()<200 || response.status()>=400) throw new Error(`${fixture}/${id} returned HTTP ${response?.status() ?? 0}`);
    const data=await page.evaluate(()=>{
      const main=document.querySelector('main');
      const wrappers=[...document.querySelectorAll('main > [data-section-tone]')];
      const archetypes=Object.fromEntries(wrappers.map((element)=>[element.getAttribute('data-section-tone')??'',element.getAttribute('data-section-archetype')??'']));
      const sectionOrder=wrappers.map((element)=>element.getAttribute('data-section-tone')??'').filter(Boolean);
      const hero=document.querySelector('h1')?.textContent??'';
      const offer=document.querySelector('#offer')?.textContent??'';
      const approach=document.querySelector('#approach')?.textContent??'';
      const cta=wrappers.find((element)=>element.getAttribute('data-section-tone')==='cta')?.textContent??'';
      return { artDirection:main?.getAttribute('data-art-direction')??'', archetypes, sectionOrder, hero, narrative:[hero,offer,approach,cta].join(' ') };
    });
    candidates.push({id,...data}); await page.close();
  }
  const pairs=[]; const failures=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const a=candidates[i], b=candidates[j];
    const architectureDistance=majorDistance(a.archetypes,b.archetypes);
    const differentOrder=orderDistance(a.sectionOrder,b.sectionOrder);
    const narrativeSimilarity=jaccard(a.narrative,b.narrative);
    const heroSimilarity=jaccard(a.hero,b.hero);
    const pairFailures=[];
    if(!a.artDirection || !b.artDirection || a.artDirection===b.artDirection)pairFailures.push('art direction is not distinct');
    if(architectureDistance<2)pairFailures.push(`major archetype distance ${architectureDistance} < 2`);
    if(!differentOrder && architectureDistance<3)pairFailures.push('same section order without strong archetype separation');
    if(heroSimilarity>0.88)pairFailures.push(`hero narrative similarity ${heroSimilarity.toFixed(2)} > 0.88`);
    if(narrativeSimilarity>0.86)pairFailures.push(`overall narrative similarity ${narrativeSimilarity.toFixed(2)} > 0.86`);
    const pair={a:a.id,b:b.id,architectureDistance,differentOrder:Boolean(differentOrder),heroSimilarity:Number(heroSimilarity.toFixed(3)),narrativeSimilarity:Number(narrativeSimilarity.toFixed(3)),failures:pairFailures};
    pairs.push(pair); failures.push(...pairFailures.map((failure)=>`${a.id}/${b.id}: ${failure}`));
  }
  report.fixtures.push({fixture,candidates,pairs,failures});
}
await browser.close();
const allPairs=report.fixtures.flatMap((fixture)=>fixture.pairs);
const failures=report.fixtures.flatMap((fixture)=>fixture.failures.map((failure)=>`${fixture.fixture}: ${failure}`));
report.summary={fixtureCount:report.fixtures.length,candidateCount:report.fixtures.reduce((sum,fixture)=>sum+fixture.candidates.length,0),pairCount:allPairs.length,minMajorArchetypeDistance:Math.min(...allPairs.map((pair)=>pair.architectureDistance)),maxNarrativeSimilarity:Math.max(...allPairs.map((pair)=>pair.narrativeSimilarity)),maxHeroSimilarity:Math.max(...allPairs.map((pair)=>pair.heroSimilarity)),failureCount:failures.length,failures};
fs.writeFileSync('artifacts/candidate-diversity-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(failures.length)process.exit(1);
