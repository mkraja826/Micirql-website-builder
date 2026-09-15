import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Compile local TS/TSX for server-rendering tests; CSS class values do not affect assertions.
const require = createRequire(import.meta.url);
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
    }, fileName: filename }).outputText, filename);
  };
}
require.extensions['.css'] = (module) => { module.exports = {}; };
const { renderToStaticMarkup } = require('react-dom/server');
const { renderPublishedSnapshot } = require('../src/core/publish/renderer.tsx');
const { buildPublishedRequestAction } = require('../src/core/publish/runtime.ts');
const runtime = { dbSiteId: 'site-db', status: 'published', publishedVersionId: 'v1', renderedVersionId: 'v1', capabilities: [{ id: 'contact', state: 'active' }] };
const snapshot = { snapshot: {
  pages: [{ slug: 'home', sectionOrder: ['hero', 'gallery', 'contact'] }],
  content: { pages: [{ slug: 'home', title: 'Persisted business', purpose: 'Persisted purpose', sections: [
    { sectionType: 'hero', eyebrow: 'Persisted brand', headline: 'Saved headline', body: 'Saved body' },
    { sectionType: 'gallery', headline: 'Saved gallery', items: [{ title: 'Saved caption' }] },
    { sectionType: 'contact', headline: 'Saved contact', body: 'Saved contact body' },
  ] }], seo: { title: 'Saved SEO' } },
  selectedSections: { hero: 'hero-editorial-split', gallery: 'gallery-feature-mosaic', contact: 'contact-local-conversion' },
  media: [{ pageSlug: 'home', sectionType: 'gallery', role: 'gallery', index: 0, src: 'https://example.com/saved.jpg', alt: 'Saved alt' },
    { pageSlug: 'other', sectionType: 'gallery', role: 'gallery', index: 0, src: 'https://example.com/other.jpg', alt: 'Other page' }],
  theme: { color: { background: '#123456', text: '#ffffff' } },
  cssVariables: { '--theme-accent': '#abcdef' },
  primaryCapability: 'contact', capabilities: [{ id: 'contact', label: 'Saved action', state: 'disabled_preview' }],
} };
const original = JSON.stringify(snapshot);
const fetchBefore = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Rendering performed a network lookup'); };
try {
  const render = (value = snapshot, pageSlug = 'home') => renderPublishedSnapshot({ snapshot: value, runtime, pageSlug });
  const html = renderToStaticMarkup(render());
  assert.equal(renderToStaticMarkup(render(JSON.parse(original))), html, 'Serialized snapshot reload changed output');
  assert.equal(JSON.stringify(snapshot), original, 'Rendering mutated the snapshot');
  for (const text of ['Saved headline', 'Saved body', 'Saved contact', 'Saved alt', 'Saved caption', 'saved.jpg', '--theme-accent:#abcdef']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('other.jpg'), 'Media leaked across pages');
  assert.ok(!html.includes('Published snapshot'), 'Renderer invented proof');
  assert.ok(html.indexOf('Saved headline') < html.indexOf('Saved gallery') && html.indexOf('Saved gallery') < html.indexOf('Saved contact'), 'Persisted order changed');
  assert.equal(render(snapshot, 'missing'), null);
  const unknown = JSON.parse(original); unknown.snapshot.selectedSections.hero = 'future-hero';
  assert.equal(render(unknown), null, 'Unsupported selection silently substituted');
  const missing = JSON.parse(original); missing.snapshot.content.pages[0].sections.shift();
  assert.equal(render(missing), null, 'Missing section content silently substituted');
  assert.equal(buildPublishedRequestAction({ ...runtime, status: 'draft' }, 'contact'), undefined);
  assert.equal(buildPublishedRequestAction({ ...runtime, renderedVersionId: 'v2' }, 'contact'), undefined);
  assert.equal(buildPublishedRequestAction({ ...runtime, capabilities: [{ id: 'contact', state: 'disabled_preview' }] }, 'contact'), undefined);
  assert.equal(buildPublishedRequestAction(runtime, 'unknown'), undefined);
  assert.deepEqual(buildPublishedRequestAction(runtime, 'contact'), { siteId: 'site-db', capabilityKey: 'contact' });
  // Inspect contact props before React executes the client form, including snapshot denial.
  const contact = render().props.children[2].props.children;
  assert.equal(contact.props.action, undefined);
  const active = JSON.parse(original); active.snapshot.capabilities[0].state = 'active';
  assert.deepEqual(render(active).props.children[2].props.children.props.action, { siteId: 'site-db', capabilityKey: 'contact' });
} finally { globalThis.fetch = fetchBefore; }
console.log('Published snapshot rendering behavior passed.');

// Build test snapshots before rendering. Generation is fixture setup only.
const { generateMultiIndustryBenchmarkFixture } = require('../src/benchmarks/multi-industry.ts');
const { directContent } = require('../src/core/content/director.ts');
const { planCapabilitiesFromBrief } = require('../src/core/capabilities/planner.ts');
const { composePublishableDraft } = require('../src/core/publish/planner.ts');
const { materializeSiteDraft } = require('../src/core/materialization/materializer.ts');
let renderedCount = 0;
for (const fixture of ['restaurant', 'saas', 'construction', 'law-firm']) {
  const entry = generateMultiIndustryBenchmarkFixture(fixture, 20);
  for (const candidate of entry.candidates) {
    const content = await directContent({ brief: entry.brief, knowledge: entry.knowledge, artDirection: candidate.direction });
    const draft = composePublishableDraft({ candidate, content, capabilityPlan: planCapabilitiesFromBrief(entry.brief, candidate.direction) });
    const saved = JSON.parse(JSON.stringify(materializeSiteDraft({ sourceKey: fixture, draft })));
    globalThis.fetch = () => { throw new Error('Published rendering performed a network lookup'); };
    try {
      const node = renderPublishedSnapshot({ snapshot: saved, runtime: { ...runtime, capabilities: [] }, pageSlug: saved.snapshot.pages[0].slug });
      assert.ok(node, `${fixture}/${candidate.id} rejected supported snapshot`);
      assert.ok(renderToStaticMarkup(node).includes(content.pages[0].sections.find(section => section.sectionType === 'hero').headline.replaceAll('&', '&amp;')), `${fixture}/${candidate.id} lost headline`);
      renderedCount++;
    } finally { globalThis.fetch = fetchBefore; }
  }
}
console.log(`Rendered ${renderedCount} persisted candidates across four industries without network access.`);
