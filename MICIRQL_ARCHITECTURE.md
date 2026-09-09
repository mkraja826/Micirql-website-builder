# MiCirql V1 Architecture Constitution

## North star
A user can provide anything from a business name to a detailed brief. MiCirql interprets it, understands the industry/sub-industry/business type, generates AI content without inventing factual claims, selects from a curated library of complete premium sections, assembles 20 meaningfully different functional websites, ranks them, and lets the user edit and publish a chosen candidate.

## Lessons carried forward from the previous builder
1. Do not build certification complexity before output quality is proven.
2. Do not use a component library as the generator's visual foundation.
3. Do not ask AI to invent arbitrary JSX/CSS layouts.
4. Do not couple generation failure to publish certification.
5. Do not hardcode Pearl Dental or any benchmark into product logic.
6. Do not mistake CI success for product/design success.
7. Do not use palette swaps as design diversity.
8. Do not let prompt quality determine website quality.
9. Do not fabricate business facts to fill weak briefs.
10. Do not reinvent common backend capabilities for every generated site.

## Architecture rules
- No generative component library. Complete sections are the visual building block.
- Industry -> sub-industry -> business type is foundational to design, content and functionality.
- Every raw user brief is interpreted before generation.
- AI selects art direction, sections and content strategy; MiCirql executes deterministic rendering and backend capabilities.
- Section implementations may be completely independent. No forced variant abstraction.
- Sections carry compatibility metadata for industry, sub-industry, visual style, content density, media requirements and conversion purpose.
- Minimal briefs must still produce strong websites through industry intelligence.
- Known facts, safe inferences, generated marketing copy and unknown facts remain separate.
- The 20 generated candidates must be structurally and visually meaningful alternatives, not recolors.
- Backend functionality is selected through a tested capability library.
- QA initially protects against broken output. Heavy certification belongs near publication, not basic generation.
- Pearl Dental is a benchmark input only.

## V1 generation pipeline
Raw Brief
-> Brief Interpreter
-> Industry / Sub-industry / Business Type Classification
-> Fact-Inference Separation
-> Business Requirements
-> 20 Art Directions
-> Complete Section Selection
-> AI Content + Image Intent
-> Backend Capability Selection
-> Candidate Rendering
-> Lightweight Functional + Visual Validation
-> Ranking
-> Preview / Edit
-> Publish

## Initial proof target
Generate 20 Pearl Dental candidates from a minimal brief. All 20 must be functional and non-broken, most must be commercially credible, and the top candidates must be strong enough to sell as professional web-design work.
