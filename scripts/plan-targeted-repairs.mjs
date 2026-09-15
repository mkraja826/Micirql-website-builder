import fs from 'node:fs';

const rendered = JSON.parse(fs.readFileSync('artifacts/pearl-render-audit/report.json','utf8'));
const perceptual = JSON.parse(fs.readFileSync('artifacts/pearl-perceptual-ranking/report.json','utf8'));
const perceptualById = new Map(perceptual.candidates.map((candidate)=>[candidate.id,candidate]));

// Only classify cautions that the deterministic repair executor can actually
// apply and that the post-repair browser audit can verify. Media presence and
// media-variety remain perceptual ranking cautions; they must not be relabelled
// as completed repairs or silently promoted to regeneration requests here.
const supported = [
  ['tap-target', /tap target|small interactive/i, 'increase-interactive-hit-area'],
  ['text-measure', /wide body copy|text measure/i, 'constrain-readable-width'],
  ['heading-scale', /heading scale/i, 'normalize-heading-scale'],
  ['hero-proportion', /hero scale|hero proportion/i, 'normalize-hero-height'],
  ['viewport-overflow', /viewport|horizontal overflow|outside mobile/i, 'contain-horizontal-layout'],
];
function classify(reason, source, target='both') {
  const match=supported.find(([,pattern])=>pattern.test(reason));
  return match ? {kind:match[0],target,reason,source,boundedAction:match[2]} : undefined;
}
const candidates=rendered.candidates.map((candidate)=>{
  const p=perceptualById.get(candidate.id);
  const instructions=[];
  for(const target of ['desktop','mobile']) for(const caution of candidate.targets?.[target]?.cautions??[]) {
    const item=classify(caution,'rendered-audit',target); if(item) instructions.push(item);
  }
  for(const caution of p?.cautions??[]) {
    const target=caution.toLowerCase().startsWith('mobile:')?'mobile':caution.toLowerCase().startsWith('desktop:')?'desktop':'both';
    const item=classify(caution,'perceptual-audit',target); if(item) instructions.push(item);
  }
  const unique=Array.from(new Map(instructions.map((item)=>[`${item.kind}:${item.target}:${item.boundedAction}`,item])).values());
  return {candidateId:candidate.id,version:'1.0',instructions:unique,requiresRegeneration:false,allowsArbitraryCodeRewrite:false};
});
const report={generatedAt:new Date().toISOString(),candidates,summary:{candidateCount:candidates.length,candidatesNeedingRepair:candidates.filter((c)=>c.instructions.length).length,totalInstructions:candidates.reduce((sum,c)=>sum+c.instructions.length,0),unsupportedArbitraryRewrites:candidates.filter((c)=>c.allowsArbitraryCodeRewrite!==false).length}};
fs.mkdirSync('artifacts/targeted-repair-plans',{recursive:true});
fs.writeFileSync('artifacts/targeted-repair-plans/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(report.summary.unsupportedArbitraryRewrites) process.exit(1);
