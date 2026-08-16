# MiCirql Design Engine V1

## Product goal
Give ordinary business owners a genuinely publishable website with minimal effort. AI communicates; MiCirql guarantees design execution.

## Generation pipeline
Business brief → Website archetype → Industry pack → Section requirements → Component selection → Design system → Palette strategy → Typography strategy → AI content → Top-20 compositions → Editor → Validator → Publish/export.

## V1 website archetypes
1. Local Service / Lead Generation
2. Professional Services
3. Healthcare / Clinic
4. Restaurant / Hospitality
5. Real Estate
6. E-commerce / Retail
7. SaaS / Technology
8. Portfolio / Creative
9. Education / Training
10. Corporate / Company

## Site invariants
For standard business sites these cannot be removed by AI:
- Navbar
- Footer
- Responsive layout
- Mobile burger navigation
- Primary CTA
- Accessible navigation labels and controls
- No horizontal overflow
- Usable forms and actions
- SEO title and description
- Footer navigation/contact links remain reachable on mobile

AI may select visual variants, but cannot disable these invariants.

## Component families
### Global
Navbar, announcement bar, mobile menu, footer, privacy/cookie controls.

### Hero
Split, centered, full-image, video, editorial, product, search, booking, immersive.

### Content
About, services, features, benefits, process, timeline, stats, logo cloud, team, founder, technology, comparison, FAQ.

### Proof
Testimonials, reviews, case studies, before/after, results, certifications, awards, client logos.

### Media
Gallery, portfolio, video, image grid, carousel, before/after slider.

### Commerce
Product grid, product card, category grid, pricing, plans, cart, checkout CTA.

### Conversion
CTA band, lead form, booking form, newsletter, quote request, contact, maps, call/WhatsApp actions.

### Content / SEO
Blog listing, article, related posts, breadcrumbs, author, FAQ schema.

### Utility
Search, filters, tabs, accordion, pagination, modal, drawer, toast, tables, forms.

## Section requirement model
Each archetype declares mandatory, recommended and optional families. Mandatory families are enforced by the composition validator. Recommended families receive a ranking boost. Optional families are selected from the business brief and industry pack.

Example Healthcare / Clinic:
- Mandatory: navbar, hero, treatments/services, CTA, contact, footer
- Recommended: doctor/team, technology, reviews/proof, FAQ, location
- Optional: before/after, gallery, blog, finance, international patients, awards

Example SaaS / Technology:
- Mandatory: navbar, hero, features, CTA, footer
- Recommended: product demo, use cases, integrations, pricing, FAQ
- Optional: testimonials, comparison, security, API, changelog, blog, enterprise

## Design systems
Design systems are independent of industry:
- Corporate
- Minimal
- Luxury
- Editorial
- Bold
- Friendly
- Technical
- Organic
- Playful
- Dark Premium
- High Contrast
- Photography-led

An industry pack must never be selected merely because it shares capabilities with the brief.

## Palette strategies
Logo colors are normalized into semantic roles first: primary, accent, secondary, surface, border/text support. A palette strategy then determines where those roles appear.

Initial strategies:
1. Light Corporate — neutral/light canvas, brand primary for actions and key accents.
2. Brand Heavy — primary/secondary hero and conversion bands with neutral content areas.
3. Editorial — restrained canvas, strong typography, oversized brand accents.
4. Dark Premium — dark secondary canvas, light content, primary/accent highlights.
5. Color Block — deliberate alternating primary/secondary/surface section bands.
6. Soft Tint — brand-tinted surfaces with restrained saturated accents.

Palette strategies must pass contrast validation and must not replace supplied brand colors with preset colors.

## Typography strategies
Typography is selected independently from palette and industry. Initial systems should cover corporate sans, humanist sans, editorial serif/sans, geometric modern, luxury serif, technical, friendly rounded and high-impact display. Typography tokens—not per-component ad-hoc fonts—control the site.

## AI responsibilities
AI may:
- understand/normalize the business brief
- determine communication priorities
- write headings, paragraphs, service descriptions, CTAs, FAQs and SEO copy
- produce image briefs/prompts
- rank compatible components/compositions

AI does not:
- invent component CSS/layouts for normal generation
- decide responsive behavior
- omit navbar/footer/mobile navigation
- assign raw logo colors directly to arbitrary CSS
- bypass accessibility/contrast/invariant validation

## Composition engine responsibilities
MiCirql deterministically owns:
- component implementation
- responsive behavior
- layout/grid/spacing
- palette execution
- typography execution
- navbar/footer/mobile menu
- forms and interactive primitives
- accessibility guardrails
- composition constraints
- final validation

## Top-20 generation
Do not call an AI twenty times to invent websites. Build twenty high-quality compositions from curated components and strategies, then rank them against the business brief.

A composition identity contains at least:
- archetype
- industry pack
- section sequence
- component IDs/versions
- design system
- palette strategy
- typography strategy
- spacing/density strategy
- image strategy
- motion strategy

All 20 must preserve the same business facts and industry. They should differ materially in composition and visual direction.

## Library depth target
Start deep rather than broad. Initial quality targets:
- Navbar: 12+ polished variants
- Hero: 20+
- Services/features: 15+
- About: 10+
- Proof/testimonials: 10+
- Process: 10+
- Gallery/portfolio: 10+
- CTA: 12+
- Contact: 10+
- Footer: 12+

Every library component must be production-ready on desktop and mobile before entering generation.

## Build order
1. Encode archetypes and section requirement rules.
2. Encode site invariants and validator.
3. Build global shell library: navbar/mobile menu/footer.
4. Build hero library deeply.
5. Add palette strategy engine.
6. Add typography strategy engine.
7. Expand core content/proof/conversion libraries.
8. Replace preset roulette with composition recipes.
9. Generate/rank Top 20.
10. Integrate AI content after composition selection/structure is known.
11. Quality gate every composition before showing it to the user.

## V1 quality gate
A candidate cannot enter Top 20 unless it has required site anatomy, responsive mobile navigation, valid component references, acceptable contrast, no horizontal overflow, usable CTA/form actions, sufficient content hierarchy, and materially differs from nearby candidates.
