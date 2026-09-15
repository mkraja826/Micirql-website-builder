import fs from 'node:fs';

const rendered=JSON.parse(fs.readFileSync('artifacts/real-certification-render-audit/report.json','utf8'));
if(rendered.evidenceState!=='initial-render') throw new Error('Repair planning requires initial rendered evidence');
const supported=[
 ['tap-target',/tap target|small tap/i,'increase-interactive-hit-area'],
 ['text-measure',/wide body copy|text measure/i,'constrain-readable-width'],
 ['heading-scale',/heading scale/i,'normalize-heading-scale'],
 ['hero-proportion',/hero scale|hero proportion/i,'normalize-hero-height'],
 ['viewport-overflow',/viewport|horizontal overflow|outside viewport/i,'contain-horizontal-layout'],
];
function classify(reason,target){const match=supported.find(([,pattern])=>pattern.test(reason));return match?{kind:match[0],target,reason,source:'rendered-audit',boundedAction:match[2]}:undefined;}
const fixtures=rendered.fixtures.map((fixture)=>({fixture:fixture.fixture,candidates:fixture.candidates.map((candidate)=>{const instructions=[];for(const target of ['desktop','mobile'])for(const caution of candidate.targets?.[target]?.cautions??[]){const item=classify(caution,target);if(item)instructions.push(item);}const unique=Array.from(new Map(instructions.map((item)=>[`${item.kind}:${item.target}:${item.boundedAction}`,item])).values());return{candidateId:candidate.id,version:'1.0',instructions:unique,requiresRegeneration:false,allowsArbitraryCodeRewrite:false};})}));
const all=fixtures.flatMap((fixture)=>fixture.candidates);
const report={generatedAt:new Date().toISOString(),fixtures,summary:{fixtureCount:fixtures.length,candidateCount:all.length,candidatesNeedingRepair:all.filter((candidate)=>candidate.instructions.length).length,totalInstructions:all.reduce((sum,candidate)=>sum+candidate.instructions.length,0),unsafePlans:all.filter((candidate)=>candidate.requiresRegeneration||candidate.allowsArbitraryCodeRewrite!==false).length}};
fs.mkdirSync('artifacts/real-certification-repair-plans',{recursive:true});
fs.writeFileSync('artifacts/real-certification-repair-plans/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(report.summary.fixtureCount!==4||report.summary.candidateCount!==80||report.summary.unsafePlans)process.exit(1);
