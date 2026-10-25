# MiCirql industry expansion plan

Status date: 2026-10-24

## Current local release baseline

- Dental and Physiotherapy are the two locally certified end-to-end industry packs. This is source/runtime certification, not permission to deploy or publish a customer site.
- Its catalog identity remains `dental-flagship-2026.10.14`; all 20 candidate IDs and their order are compatibility-locked.
- The certified-pack registry is now the production boundary for onboarding, ranking, and design selection. Unsupported industries may be classified, but they cannot receive dental candidates or become selectable by accident.
- The shared logo rendering contract is implemented locally for preview, editor, live rendering, publish validation, and static export. A supplied logo must resolve to the exact opaque asset ID or rendering/publishing fails with `BRAND_LOGO_UNRESOLVED`; text is used only when no logo was supplied.
- Certified packs now own a versioned design grammar as well as a content contract. Cross-industry registration rejects a reused grammar ID, an exact theme/variant/section-order clone, or a candidate whose weighted visual similarity exceeds the pack's declared threshold.
- A production Supabase upload adapter is implemented locally. It uses the signed-in user's bearer token plus the publishable key and RLS, verifies exact site/workspace ownership, writes a private upload intent, validates the stored bytes/MIME/magic bytes/dimensions and safe SVG subset before finalization, and can recover a completed intent idempotently. Preview, static export, and live rendering now re-sign the durable private storage key server-side; deployment configuration and an authorized remote end-to-end smoke remain release blockers.
- Physiotherapy is registered beside Dental and is selectable in onboarding. Restaurant now has a researched draft-planning contract, but remains unregistered, non-actionable, and labelled `Planned` in the product.
- Builder UI/UX is owned by this repository. The `micirql.com` source is now located in GitHub `mkraja826/micirql-website` and the Cloudflare Pages project `micirql`; its local truthful replacement remains a separate, undeployed workstream. The official live MiCirql SVG mark is mirrored byte-for-byte into Builder. Product chrome remains isolated from generated-site CSS.

## Execution checkpoint — 2026-10-23

- Phase 0 is implemented locally: certified-pack registry, shared logo rendering, exact-ID validation, responsive logo sizing, authenticated private-asset preview, live resolution, and static-export bundling.
- Dental and Physiotherapy are actionable certified packs. The onboarding UI exposes both as selectable `Certified` choices and leaves Restaurant visibly `Planned` and noninteractive.
- The certified Clinic / Physiotherapy pack has catalog version `physiotherapy-flagship-2026.10.23`, six pack-owned pages, a typed contract, physiotherapy-safe copy, one real appointment-request form on Contact, a stable 12-image reference set, and a 30-image licensed audit pool. One waiting-room asset with prominent Japanese signage is retained for provenance but quarantined from generation; candidate sites draw deterministic 12-image sets from the 29 locale-safe assets.
- All 20 certified candidates retain the audited immutable IDs, visual identities, themes, component variants, Home journeys, conversion paths, mobile reflows, candidate-scoped motifs, and deterministic 12-image selections established in staging. The 190 within-pack and 400 Physiotherapy-vs-Dental comparisons pass their `0.76` and `0.64` ceilings respectively.
- The production runtime now owns Physiotherapy ranking, scaffold creation, candidate application, exact candidate-order preservation, structure/content/media gates, brand/logo preservation, and publish validation. The old `physiotherapy-draft` route and draft catalog remain archived regression evidence; their stored `packStatus: unavailable` metadata is intentionally not rewritten.
- Certified Physiotherapy ranking selects `calm-arrival`, `local-access`, and `guided-milestones` for calm, local-access, and process-led review briefs. The three selected sites pass all six routes at five viewport widths: 90/90 rendered states plus 54 full-page screenshots.
- The shortlist screenshot review corrected inner-page journey ordering and removed empty practical-information sections. Candidate-specific choreography now applies to Home only; inner routes retain the researched industry anatomy.
- The first non-shortlist batch (`mobility-atlas`, `assessment-blueprint`, `recovery-journal`, and `active-studio`) passes all six routes at all five widths: 120/120 rendered states plus 48 retained mobile/desktop screenshots. Senior review caught and corrected three generic desktop hero geometries and the locale-mismatched Recovery Journal image before accepting this checkpoint.
- The second non-shortlist batch (`functional-grid`, `clinical-notebook`, `arc-and-anchor`, `range-of-motion`, and `step-by-step`) passes another 150/150 rendered states plus 60 retained mobile/desktop screenshots. Senior review rejected the initially generic Clinical Notebook and Step by Step openings; their corrected ruled/pinned-note and oversized-number/narrow-strip contracts then passed 60/60 responsive rerun states.
- The third non-shortlist batch (`movement-pathway`, `kinetic-bands`, `balance-field`, and `human-pace`) passes 120/120 rendered states plus 48 retained mobile/desktop screenshots. Human Pace's initially generic opening was replaced with a documentary image lead and factual caption rail, then rerun across all 30 states.
- The final non-shortlist batch (`assessment-rings`, `motion-tiles`, `grounded-strength`, and `open-practice`) passes 120/120 rendered states plus 48 retained mobile/desktop screenshots. Grounded Strength's initially generic opening was replaced with a low structural baseline and joint system; a full rerun then caught and cleared an intermediate-width copy collision.
- Across the shortlist and four explicit non-shortlist batches, all 20 candidate directions clear the 4/5 senior-review floor and **600/600 unique six-route/five-width states pass**. A fresh post-promotion final-code rerun passes **21/21** in 9.7 minutes with evidence under `C:\mi-physio-post-promotion-responsive-20261023`. This visual checkpoint is one input to local pack certification; it is not customer-site approval.
- The supplied-fact variance matrix now crosses all 20 candidates with calm, local, and process-led clinic inputs over all six routes at 320 and 1440 px: **60/60 generated sites and 720/720 rendered states pass**. It preserves supplied facts, excludes omitted facts and invented phone actions, keeps the appointment form on Contact only, pins candidate/brief navigation, and retains each candidate's 12-image/six-hero media contract.
- The final accessibility gate passes **20/20 candidates and 240/240 route/viewport scans** at 320 and 1440 px across all six routes. Automated WCAG 2.2 A/AA analysis, keyboard navigation, visible focus, mobile menu Enter/Escape with focus return, appointment/form reachability, and reduced motion are green. The gate found and fixed a Physiotherapy-scoped hamburger transition under reduced motion before acceptance.
- Physiotherapy owns the `clinic-physiotherapy-movement-pathway-v1` grammar: movement arcs, staggered exercise cadence, a connected assessment path, and a warm kinetic accent. Dental keeps `clinic-dental-clinical-confidence-v1`; palette changes alone cannot make one pack a variant of the other.
- The renderer now carries `data-mi-domain` and `data-mi-subtype` in preview, editor, live, and export paths so industry-specific composition can be scoped without leaking into Dental.
- Logo QA passes no-logo, square, 3:1, 6:1, and 1:2 cases across header/footer and 320 px mobile. A deterministic supplied-logo fixture also passes all 20 Physiotherapy candidates at 320 and 1440 px, producing 40 screenshots with matching header/footer identity. The production Preview logo suite now passes **14/14**, including durable private-object re-signing for authenticated preview/export and the anonymous live renderer without exposing either the storage key through the public RPC or a server credential to the browser; unauthenticated preview cannot read the private asset registry.
- Physiotherapy cross-surface parity passes **2/2** across all 20 candidates and all six routes. Portable export preserves the immutable Site snapshot, while static export preserves subtype and exact candidate identity, candidate-scoped export-native composition CSS, visible conversion content and links, the single Contact appointment form, and footer copyright. The exact-candidate assertion replaces the earlier generic-selector false positive. The promoted registry/runtime architecture suite passes **39/39** and all 20 workspace packages typecheck.
- The Radhika Physiotherapy draft passes 30 viewport/page checks across 320, 390, 768, 1024, and 1440 px. It has one readable H1 per page, no overflow or navbar collisions, 44 px controls, unique heroes, 7 Home images, 1–4 images on other pages, no hero reuse, and no dental, outcome, or confirmed-booking language.
- After correcting desktop density, CTA grouping, sparse Therapists content, and compliance-sounding public copy, the senior UI/UX re-audit scores the reference at 4.4/5 with no must-fix issue before candidate generation.
- Dental remains protected: 18/18 structural checks and a fresh **23/23** production-server premium rendered gate pass across the locked 20-candidate catalog. The 2026-10-22 command used one worker, exercised every candidate at eight widths from 320 through 1440 px, and completed in 9.5 minutes with short-path evidence under `C:\mi-dental-full-final-20261022`. The gate caught rank 18's remaining 74.88 px cinematic H1, then accepted the corrected moderate-weight, mixed-case, 68 px-capped system across preview, live CSS, and static export. Ranks 5, 15, and 18 retain key full-page evidence at 390, 768, and 1440 px.
- Focused post-change Radhika Dental generated-route review now passes for rank 5 (`clinic-dental-modern-assurance`), rank 15 (`clinic-dental-contemporary-grid`), and rank 18 (`clinic-dental-immersive-narrative`). Each direction renders the four truthful routes—Home, Services, About, and Contact—at 1440, 768, and 390 px, with 25 retained PNGs per rank: fold and full-page captures for all 12 page/viewport states plus the open mobile-menu state. The gate requires substantive multi-section copy, at least eight meaningful Home images and four on each inner page, unique loaded image sources with alt text, no horizontal overflow, readable H1/H2/H3 sizing and weight, exact header/footer logo propagation, and an on-screen mobile menu with a fixed full-width backdrop.
- Dental clinician pages are now evidence-driven across the whole Builder path. One shared rule governs the scaffold/generator, design-selection server validation, certified publish gate, publish-readiness UI, and Pages Manager: Doctors navigation and `/doctors` are omitted when no visible verified clinician record was supplied, and become required only when factual clinician evidence exists. The focused Radhika Dental review therefore expects `/doctors` to return 404 instead of generating a misleading empty or invented team page.
- Dental imagery is now role-aware and balanced across the full generated site. Six licensed human-centred consultation assets complement treatment/service imagery; site heroes remain unique, hero assets cannot reappear as supporting media, supporting pools follow section intent, and no supporting asset may be used more than twice site-wide. This addresses the earlier one-image, equipment-heavy, and cross-route repetition failures without inventing clinic-specific photography.
- The Radhika Dental route uses a deterministic QA-only logo stand-in to exercise the real header/footer identity pipeline. It is not the clinic's approved logo, and the focused route exercises the real Dental scaffold, ranking preset, and production renderer rather than the complete authenticated dashboard-to-brief-to-saved-draft lifecycle. Commercial acceptance still requires the exact approved logo, verified address/phone/hours/clinicians/credentials/reviews and other business facts, an authenticated saved-project lifecycle run, an authorized deployed upload-to-live/export smoke, and final release approval.
- The prior **23/23** result from 2026-10-22 remains the historical baseline. After Physiotherapy registry/runtime promotion, Dental again passes **23/23 on 2026-10-23** in 7.5 minutes with one worker, covering generated-payload distinctness, the production appointment gateway, 20 distinct rendered signatures, and every candidate across the eight-width premium viewport matrix. Evidence is retained under `C:\mi-dental-post-physio-promotion-20261023`.
- Builder phase 1 now has an isolated production-build visual/accessibility gate for sign-in and account creation at 320/390/768/1024/1440 px. Five tests and ten checked-in baselines pass; the review fixed the account-mode control from 29 px to the 44 px internal touch standard, added explicit focus treatment, and added reduced-motion handling without changing auth/session behavior. The complete 5/5 production gate was rerun after the Physiotherapy candidate work and remained green.
- Builder's pack-driven onboarding is redesigned and production-gated through the real authenticated dashboard-to-brief path. It fixes the dark-root/light-card contrast leak, uses a neutral MiCirql system, separates business, priority, brand, and constraint inputs, enables both certified packs, clears cross-industry inputs when switching, and leaves Restaurant visibly `Planned`. The five-width onboarding suite passes **6/6** with WCAG 2.2 A/AA, keyboard focus, 44 px touch targets, responsive overflow/clipping, reduced motion, runtime, and visual-regression checks. Dental payloads, auth/session transitions, and catalog identity remain unchanged.
- Builder's certified Dental design review now uses the same neutral MiCirql product shell instead of the old internal form treatment. It preserves the exact 20 IDs and saved order, labels ordering as brief fit rather than quality, compares four real generated directions per page, exposes composed palettes/type/image strategy, adds responsive device previews and an accessible full-preview dialog, and opens the selected site in its actual workspace without a demo-project flash. The five-width visual/accessibility matrix and exact selection handoff pass **6/6**; auth, onboarding, and review pass **16/16**; and the locked Dental structural gate passes **18/18** after the change.
- Builder's dashboard and responsive editor now share the exact official mark and neutral product chrome with the preceding journey. Dashboard project/action/loading/empty/error behavior, editor autosave/conflict handling, responsive navigation, visual baselines, keyboard focus, reduced motion, overflow and WCAG A/AA checks are covered across 320/390/768/1024/1440 px. The gate includes actionable logo-upload failure, truthful publish readiness, and an archived pre-certification Physiotherapy draft interaction that persists an edit without rewriting its historical generation metadata; the certified runtime is tested separately.
- Upload intent and finalize no longer trust `x-micirql-user-id`. Both resolve the user from the verified Supabase bearer token and ignore a spoofed browser identity; customer-facing failures use stable safe codes, preserve the current logo/image, and expose retry only for retryable failures. The production-adapter suite passes **5/5**, the upload failure/authentication suite passes **4/4**, and the wider upload-security/publish-readiness suite remains **7/7**. No production configuration or remote object mutation was performed, so deployment verification—not missing local adapter code—remains the commercial blocker.
- The official `micirql.com/micirql-mark.svg` asset is now mirrored exactly at `apps/builder/public/micirql-mark.svg` (matching SHA-256 `7B7B1D2DEBAC2BA38D1EAD35CEC3CD6CDBC3315BA5BF5633857DCEDD6397C136`) and rendered through a shared Builder `ProductBrand` lockup. The older tracked `micirql-logo.webp` in the separate original checkout is truncated and is deliberately not propagated.
- The Radhika Physiotherapy draft currently uses the business-name fallback because no actual Radhika Physiotherapy logo was supplied to that fixture. Logo rendering is technically gated, but this draft is not brand-complete evidence.
- The Radhika Physiotherapy About hero has been replaced with a brand-neutral licensed clinic image and the six-route, five-viewport visual gate passes. Commercial evidence still requires the clinic's real logo and verified identity assets.
- No Supabase migration has been applied and no customer site has been published by this work.

## MiCirql product surfaces

Generated-site design and MiCirql product design are separate systems:

- industry packs own each generated website's page anatomy, palette, typography, imagery, conversion path, and responsive behavior;
- a future `packages/product-ui` layer should own only MiCirql's builder and marketing chrome: product tokens, wordmark, buttons, fields, dialogs, status states, navigation, editor rails, and responsive drawers;
- product UI must not import Dental or Physiotherapy motifs, and industry packs must not inherit MiCirql marketing styling.

Current ownership:

| Surface                | Source in this workspace | Current state                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builder.micirql.com`  | `apps/builder`           | Auth, dashboard, onboarding, certified design review, responsive editor, media/logo failure, and truthful publish readiness use neutral product chrome and pass 33/33; the durable private adapter is local and still needs authorized deployment verification. |
| `micirql.com`          | Separate located repo    | Local truthful replacement on `codex/truthful-marketing-ui`; clean install, production build, form contract, exact mark, SEO, WCAG, reduced-motion, and five-width responsive gate pass 9/9; not pushed or deployed.                                            |
| Generated public sites | `apps/live`              | Separate wildcard/form routing; must not claim the root marketing domain.                                                                                                                                                                                       |
| Internal documentation | `apps/docs`              | Not the public marketing site and must not be repurposed accidentally.                                                                                                                                                                                          |

Product-surface execution order:

1. Keep the located marketing source and Builder releases independent; finalize production handoff and rollback around the recovered canonical MiCirql SVG mark.
2. Maintain Builder and marketing baselines at 320, 390, 768, 1024, and 1440 px while freezing Dental IDs, order, and rendered fingerprints.
3. Build the neutral product-UI foundation and a Builder visual/accessibility harness behind a parallel route or feature flag.
4. Redesign Builder in low-risk order: auth/dashboard → pack-driven onboarding → ranked design review → editor shell/mobile navigation → publish readiness. API payloads, state transitions, registry boundaries, and Dental output remain unchanged.
5. Redesign marketing around truthful status: Certified, In validation, or Planned. Show real generated examples and Builder screens; do not advertise planned industries as available.
6. Integrate intent handoff, form behavior, SEO, performance, and independent Cloudflare ownership; release marketing and Builder separately with rollback.
7. After each industry is certified, enable it in onboarding and only then add its public case study/status. Rerun the complete Dental suite every time.

The detailed product-surface plan and release gates are recorded in [`micirql-product-ui-plan.md`](./micirql-product-ui-plan.md).

## One-industry-at-a-time rollout

| Order | Pack                                 | Purpose                                                                     | Primary conversion              | Risk                                          | State             |
| ----- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------- | ----------------- |
| 0     | Shared platform                      | Pack registry, logos, assets, actions, release gates                        | N/A                             | Cross-industry regression                     | In progress       |
| 1     | Clinic / Physiotherapy               | Prove a second clinic subtype can reuse the platform without dental leakage | Appointment request             | Medical claims and credential accuracy        | Certified locally |
| 2     | Restaurant / Restaurant              | Prove the first genuinely different page and conversion model               | Reservation request             | Invented menu, pricing, or availability       | Draft planning    |
| 3     | Restaurant / Cafe                    | Validate a lighter visit/menu/order journey                                 | Directions, call, order enquiry | Invented products and hours                   | Planned           |
| 4     | Corporate / Consulting               | Validate trust-led B2B lead generation                                      | Consultation enquiry            | Fake clients, awards, or outcomes             | Planned           |
| 5     | SaaS / B2B SaaS                      | Validate product-led storytelling and demo capture                          | Demo request                    | Fake integrations, security, or metrics       | Planned           |
| 6     | Education / Academy                  | Validate programme discovery                                                | Enrolment enquiry               | Fake accreditation or outcomes                | Planned           |
| 7     | Hospitality / Hotel                  | Validate gallery-led inventory discovery                                    | Booking request                 | Fake availability, amenities, or prices       | Planned           |
| 8     | Construction / Interiors             | Validate portfolio/project-led conversion                                   | Consultation/quote request      | Fake projects or licences                     | Planned           |
| 9     | Real estate / Broker                 | Validate listing discovery                                                  | Property enquiry                | Fake inventory, prices, or scarcity           | Planned           |
| 10    | Clinic / Dermatology and Diagnostics | Add only after the medical-claims gate is proven on physiotherapy           | Appointment request             | High claim, consent, and evidence risk        | Deferred          |
| 11    | Retail                               | Add a new top-level domain and commerce contract first                      | Purchase/order                  | No current retail domain or checkout contract | Deferred          |

Only one row may move from `planned` to `certified` at a time. The next row does not start certification until the previous pack passes visual review on real generated sites.

## Contract every certified pack must own

Each pack must define and test:

1. Exact domain, subtype, aliases, catalog version, candidate prefix, and 20 immutable candidate IDs.
2. Required facts, prohibited inventions, claim rules, and content fallback behavior.
3. Page anatomy for every required page, with an explicit purpose for every section.
4. One primary conversion journey and the native action used to complete it.
5. Palette roles, contrast-safe text/background pairs, typography scale, density, shape, motion, and focus treatment.
6. Responsive rules at 320, 390, 768, 1024, and 1440 CSS pixels.
7. Licensed imagery requirements by page and section, including minimum visual density and duplication limits.
8. Logo behavior for no-logo, 1:1, 3:1, 6:1, and 1:2 marks in header and footer.
9. Preview, editor, live, and export parity.
10. A 100/100 technical gate plus senior visual scores of at least 4/5 for hierarchy, typography, imagery, spacing, brand fit, and mobile usability.
11. A versioned industry design grammar whose page sequence, hero geometry, conversion storytelling, and signature motifs are not copied from any certified pack. Shared primitives are allowed; candidate signatures are not.

Certification never publishes a customer site automatically.

## Cross-industry design isolation

The builder may share accessibility, rendering, action, asset, form, and responsive primitives. It must not share a finished design identity between industries.

For every pair of industry packs, the registry compares theme family, section variants, relative page-section order, typography direction, imagery direction, and signature motifs. The current maximum weighted similarity is `0.64` for Dental and Physiotherapy. Registration fails when:

- two packs reuse the same design-grammar ID;
- a candidate copies another industry's theme, section variants, and page sequence;
- the weighted signature exceeds either pack's maximum similarity;
- the visible difference is only a palette, font, image, or business-name swap.

Within a new 20-candidate catalog, candidates must also differ in dominant visual idea, hero composition, information rhythm, proof model, and conversion path presentation. This is reviewed visually; passing a hash or type check is not enough.

## Pilot specification: Clinic / Physiotherapy

### Positioning and facts

The generated site should help a visitor understand who the clinic helps, what therapies or conditions are actually offered, who provides care, where the clinic is, and how to request an appointment. It must not diagnose a visitor, promise recovery, imply guaranteed pain relief, invent professional registration, or fabricate patient outcomes.

Required facts:

- clinic name, address/service area, contact details, opening hours;
- therapies and conditions supplied by the business;
- physiotherapist names, qualifications, and registration/certification only when supplied;
- accessibility or home-visit information only when supplied;
- appointment-request policy, not implied live availability.

### Required pages and anatomy

| Page       | Section sequence                                                                                                                                               | UX purpose                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Home       | Navbar → benefit-led Hero → Conditions/Therapies split → Why choose us → Care process → verified therapist preview → location/hours → appointment CTA → Footer | Answer “is this relevant, credible, nearby, and easy to contact?” without forcing medical self-diagnosis. |
| Therapies  | Hero → therapy cards → what to expect → suitability/limitations note → appointment CTA                                                                         | Let users compare supplied services in plain language.                                                    |
| Conditions | Hero → condition groups → when to seek assessment → FAQ → appointment CTA                                                                                      | Support intent-led discovery while avoiding diagnosis and cure claims.                                    |
| Therapists | Hero → verified profile cards → qualifications/special interests → clinic approach → CTA                                                                       | Establish real professional authority; hide the section when profiles are absent.                         |
| About      | Hero → clinic story → facilities/accessibility → care principles → location CTA                                                                                | Build trust without invented history, technology, or awards.                                              |
| Contact    | concise Hero → appointment request form → phone/address/hours → map/directions when supplied → response expectation                                            | Complete the conversion with the least required personal data.                                            |

Unsupported evidence sections are hidden, not filled with generic testimonials, fake metrics, or fictional clinicians. When clinician profiles are absent, the Therapists route may provide verification guidance, but it must not render invented profile cards.

### Conversion journey

`Local/search visit → relevance in hero → therapy or condition detail → verified care/process proof → appointment request → explicit received/not-confirmed state`

- Primary action: `appointment.request`.
- Secondary action: `tel:` only when a supplied phone number exists.
- The form asks for name, one contact method, optional service, preferred date/time, short message, and consent.
- Submission copy says “request” or “enquiry”; it never claims a confirmed slot.
- The CTA label stays consistent across navbar, page body, and footer.

### UI system

Palette A — calm clinical movement:

| Role            | Value     | Use                                                                           |
| --------------- | --------- | ----------------------------------------------------------------------------- |
| Ink / secondary | `#12324A` | Headings, body emphasis, dark surfaces                                        |
| Background      | `#F7FAFC` | Main page canvas                                                              |
| Surface         | `#FFFFFF` | Cards and forms                                                               |
| Primary         | `#176B87` | Main CTA and interactive emphasis; white text contrast is approximately 6.0:1 |
| Accent          | `#C96A35` | Small warm highlights, diagrams, tags; never small white text                 |
| Border          | `#CBD8E1` | Quiet boundaries                                                              |
| Text muted      | `#526474` | Supporting copy after contrast verification                                   |
| Error           | `#B42318` | Form errors only                                                              |

Typography:

- Display: humanist/geometric sans, weight 600–700; no condensed all-caps treatment.
- Body/UI: highly legible humanist sans, weight 400–650.
- Mobile H1: `clamp(2rem, 9cqi, 2.75rem)`, line-height 1.08–1.14, normal word breaking.
- Desktop H1 maximum: 4rem and approximately 15–18 characters per line; medium split layouts scale from the page container so long words remain intact.
- H2 and H3 use sentence case; eyebrow text may be uppercase but must remain short.

Composition rules:

- Calm, spacious, and active—not sterile, futuristic, or hospital-like.
- Alternate editorial split layouts, process timelines, and image-led cards across the 20 candidates; palette changes alone do not create a new candidate.
- Use one dominant visual idea above the fold and one primary CTA.
- Avoid excessive glass effects, floating decoration behind text, giant typography, and unbounded card grids.

### Responsive behavior

- 320/390: one-column reading order; navigation, logo, CTA, forms, and cards cannot create horizontal overflow; key controls are at least 44 CSS px; the hero image follows the proposition rather than pushing it below an oversized title.
- 768: two-column sections may appear only where both columns remain readable; form fields retain full labels and error space.
- 1024/1440: use asymmetric 5/7 or 6/6 grids, bounded text measure, and deliberate whitespace; never enlarge headings solely to fill width.
- No essential action depends on hover, drag, carousel autoplay, or animation.
- Reduced-motion preference disables nonessential transforms and reveal motion.

### Imagery rules

- Target 10–14 distinct, licensed site images across the full site, with 5–8 meaningful images on Home depending on the chosen composition.
- Prefer real supplied clinic, therapist, movement-assessment, equipment, exercise, and accessible-facility imagery.
- Stock fallback must be clearly generic and cannot imply the pictured person works at the clinic or received a specific outcome.
- No before/after imagery, visible patient records, invasive procedures, fabricated awards, or exaggerated pain imagery.
- Avoid reusing the hero asset elsewhere. No page may repeat the same asset more than once unless it is the supplied logo.
- Portraits render only for supplied/verified team members. If none are supplied, hide Therapists rather than inventing profiles.
- Every meaningful image requires contextual alt text; decorative images use empty alt text.

### Logo rules

- Preserve the exact supplied asset ID, pixels, intrinsic ratio, and colors.
- Render with `object-fit: contain`; never crop, stretch, trace, recolor, or regenerate it.
- Use a neutral surface or an explicitly supplied inverse logo when contrast is insufficient.
- Show the same canonical asset in the header and footer on preview, editor, live, and export surfaces.
- Use business-name text only when no logo was provided. A provided but unresolved logo is a blocking error.

### Pilot release evidence

The staging-to-certification evidence is recorded in [`physiotherapy-draft-visual-review.md`](./physiotherapy-draft-visual-review.md). It preserves the audit trail for all 20 candidates and records the subsequent local registry/runtime promotion.

The local certification gate required:

- 20 materially different candidates pass the registry and component protocol;
- at least three factual physiotherapy briefs generate without dental wording or assets;
- desktop and mobile screenshots exist for every candidate, with senior visual review recorded;
- page/action/content/image/logo contracts pass in preview, editor, live, and static export;
- WCAG 2.2 AA automation and keyboard review pass, with 44 px targets used as the MiCirql internal touch standard;
- claim scans find no invented clinicians, credentials, outcomes, availability, awards, or patient proof;
- all existing dental gates still pass unchanged.

## Draft specification: Restaurant / Restaurant

Restaurant is the first deliberately non-clinical pack. The local draft contract is research-backed and testable, but it is not a candidate catalog, certified runtime, onboarding option, or publishing permission. The Builder must continue to show it as `Planned` until the full 20-candidate protocol passes.

### Research and factual boundary

The contract is based on current primary guidance reviewed on 24 October 2026:

- [FSSAI Labelling and Display regulations and amendments](https://www.fssai.gov.in/food-law/regulations/amendments/labelling-display) and the [12 April 2024 food-service clarification](https://fssai.gov.in/upload/advisories/2024/04/66190c9343fe0Letter%20dated%2012Apr2024_Display%20of%20Information_FSE_compressed.pdf): calorie and serving-size duties have a defined licence/outlet scope; allergen and vegetarian/non-vegetarian information has its own menu-display requirement; nutritional and organic information has specified delivery methods. MiCirql must collect the restaurant's actual applicability and verified data. It must not generate declarations or claim FSSAI compliance.
- [Google Business Profile menu guidance](https://support.google.com/business/answer/3038177?hl=en): a menu URL should represent the current menu rather than a popular-items sample or a third-party delivery page. The generated website therefore needs a crawlable first-party HTML menu, even if the merchant also supplies a PDF.
- [Google Business Profile local links](https://support.google.com/business/answer/6218037?hl=en): menu, reservation, and ordering links are different actions. The draft keeps `View menu`, `Request a table`, and any future verified ordering link separate.
- [Google Search Central LocalBusiness guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business): Restaurant structured data may describe the location, menu URL, hours, cuisine, telephone, and price range only when those facts match visible supplied content.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/): menu and reservation journeys must reflow at 320 CSS px, retain keyboard/focus behavior, provide text alternatives, and keep explicit form labels, instructions, errors, and completion feedback.

This is a product and content-safety boundary, not legal advice or a compliance certification. Applicable menu-labelling information becomes a publication blocker when the merchant says the rule applies but has not supplied the facts.

Required merchant facts:

- restaurant name, exact location, contact details, opening hours and exceptions;
- supplied cuisine, service modes, reservation policy, response expectation, and location-specific links;
- a representative current menu with categories, items, descriptions, prices, currency, and availability notes where used;
- verified allergen, dietary, vegetarian/non-vegetarian, calorie, serving-size, nutrition, or organic information when applicable—never inferred from a dish name, cuisine, image, or recipe assumption;
- chef, host, history, sourcing, accessibility, parking, seating, delivery, ordering, award, review, and rating facts only when explicitly supplied and verifiable.

### Required pages and anatomy

| Page         | Draft section sequence                                                                                                                                          | UX purpose                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Home         | Navbar → venue/cuisine Hero → dish-and-space lead → menu preview → supplied positioning → location/hours facts → reservation preview → CTA → Footer             | Establish what the restaurant is, what can be explored, where it is, and the next honest action.           |
| Menu         | menu Hero → semantic category/item list → verified disclosure legend → supplied dish gallery → availability/disclosure notes → reservation CTA                  | Make the representative current menu readable, searchable, and usable without depending on a PDF or image. |
| Visit        | arrival Hero → verified exterior/interior → address/directions/hours → supplied access/parking/transit → supplied service/seating details → reservation CTA     | Remove arrival uncertainty using location facts rather than generic venue claims.                          |
| Reservations | request Hero → labelled reservation form → review/confirmation steps → supplied party/policy details → special-request expectation → supplied phone alternative | Request a table while making it explicit that receipt is not table confirmation.                           |
| Story        | story Hero → supplied origin/approach → verified process/place gallery → verified people → supplied principles → menu/reservation paths                         | Build a distinctive hospitality narrative without fictional heritage, sourcing, or staff.                  |
| Contact      | concise Hero → general enquiry form → verified phone/email/hours → verified map/directions → reservation CTA                                                    | Keep general enquiries separate from reservation requests.                                                 |

The existing `services`, `contact`, and `features` families may support the planning prototype, but Restaurant needs dedicated menu and reservation decisions before certification. A menu PDF or photograph can be supplementary evidence; it cannot be the only usable menu.

### Conversion journey

`Local/search visit → cuisine and venue relevance → first-party menu → visit/policy confidence → Request a table → request received → restaurant confirms separately`

- Primary action: `reservation.request`, labelled `Request a table` consistently in navigation, bodies, and footer.
- Completion state: `reservation-request-received-not-confirmed`.
- Minimum fields: name, one contact method, party size, requested date/time, optional note, and consent. Any additional field needs a stated operational reason.
- Secondary actions: `View menu`; `Get directions` only with a verified location link; `Call restaurant` only with a supplied number.
- Online ordering is not assumed. A future ordering action requires an authorized provider or first-party destination and its own completion contract.

### Independent UI system

The first grammar is `restaurant-table-story-editorial-v1`: table-edge framing, menu-column rhythm, ingredient-note details, an arrival threshold, and warm material fields. It shares accessible primitives with the platform but cannot reuse Dental treatment cards, Physiotherapy movement paths, clinic hero geometry, or either pack's page sequence.

Palette A — warm table editorial:

| Role       | Value     | Use                                                                                      |
| ---------- | --------- | ---------------------------------------------------------------------------------------- |
| Ink        | `#25180F` | Headings and high-emphasis copy                                                          |
| Background | `#FFF9F1` | Warm main canvas                                                                         |
| Surface    | `#FFFFFF` | Menu and form surfaces                                                                   |
| Primary    | `#7A2E1F` | Reservation actions; white text passes the 4.5:1 contract                                |
| Accent     | `#D39A37` | Rules, category markers, and small material details; never a small-white-text background |
| Border     | `#D9C8B6` | Quiet menu and card boundaries                                                           |
| Text muted | `#6B5A4B` | Supporting copy after contrast verification                                              |
| Error      | `#B42318` | Form errors only                                                                         |

Typography uses an editorial serif or soft grotesk at weight 500–650 for display and a high-legibility humanist sans at 400–600 for body/UI. H1/H2/H3 stay in sentence case. Condensed all-caps, ultra-black display, fragmented words, and oversized menu-item names are prohibited. The mobile H1 is bounded by `clamp(2.1rem, 10cqi, 2.85rem)` with normal word breaking; desktop H1 is capped at 4.25rem and a 14–24-character target measure.

### Responsive, imagery, and logo rules

- At 320/390 px, the menu has a single reading order with no two-dimensional scrolling. Item name, description, disclosure, and price remain associated when wrapping. Controls are at least 44 CSS px, labels remain visible, form error space is reserved, and sticky actions cannot cover content.
- At 768 px, menu columns appear only when each retains readable measure. At 1024/1440 px, editorial grids and line lengths stay bounded; large screens do not trigger giant headings or stretched menu rows.
- Target 12–18 distinct licensed images per site and 6–9 meaningful images on Home. Prefer supplied dishes, dining room, exterior/arrival, ingredients, and process. A generic stock image cannot be labelled as a real dish, location, employee, portion, crowd, or outcome.
- A hero asset cannot repeat. No non-logo asset repeats on a page. Dish colors and focal points must not be retouched into a misleading representation.
- Verified chefs/hosts may appear; invented people, reviews, awards, crowds, “fully booked” signals, menu items, portions, ingredients, or ambience evidence may not.
- The supplied logo keeps the exact asset ID, pixels, intrinsic ratio, and colors using `object-fit: contain` across preview, editor, live, and export. Square, 3:1, 6:1, and 1:2 marks must pass header/footer and mobile review. A missing supplied logo is a blocker; text fallback is only for a brief with no logo.

### Reference-scaffold checkpoint — 2026-10-24

The factual Restaurant reference scaffold now covers Home, Menu, Visit, Reservations, Story, and Contact. It preserves the exact QA-supplied logo asset in the header and footer, uses 16 unique audited licensed stock assets with visible disclosure, and keeps the reservation-request form separate from the Contact general-enquiry form. The focused reference suite passes 7/7; the live-preview and portable-export visual matrices each pass all 30 route/viewport states at 320, 390, 768, 1024, and 1440 px, for 60 checked states in total. The [Restaurant factual-reference visual review](restaurant-draft-visual-review.md) records the senior scorecard, corrected defects, evidence, and remaining gates. This remains reference evidence rather than certification; the later staging catalog checkpoint below does not register Restaurant or make it available in onboarding.

### Top-20 responsive checkpoint — 2026-10-25

The 20 independently art-directed staging candidates now exist and pass their catalog, ranking, factual-preservation, media-selection, and anti-cloning contracts. Senior screenshot review caught and corrected five desktop menu-track collapses caused by a generic section-variant grid, then the strengthened Home gate passed **20/20 candidates and 100/100 responsive states**.

A new all-route production-preview matrix covers Home, Menu, Visit, Reservations, Story, and Contact at 320, 390, 768, 1024, and 1440 px for every candidate. It caught and corrected Open Fire's out-of-canvas Home copy at 1024/1440 px. The final-code rerun passes **20/20 candidates and 600/600 responsive states**. Default runs retain 320/1440 full-page evidence for all candidate/route combinations under `qa-artifacts/restaurant-candidate-route-matrix` (240 screenshots).

This checkpoint closes the candidate-catalog and full responsive route-matrix milestones only. Restaurant remains unregistered and `Planned` while three-brief variance, candidate accessibility/keyboard/reduced-motion, full cross-surface parity, Restaurant logo aspect-ratio, recorded per-candidate senior scoring, and final Dental/Physiotherapy preservation gates remain open.

### Path from draft to certification

The factual reference scaffold and 20-candidate responsive route matrix are now accepted. Promotion still requires:

- at least three materially different factual restaurant briefs with no invented menu, price, hours, people, compliance, availability, or provider claims;
- all six routes and the exact primary action in preview, editor, live, and static export;
- 320/390/768/1024/1440 visual evidence for all 20 candidates, keyboard and WCAG 2.2 AA review, menu wrapping tests, and reservation state tests;
- image-density, duplication, alt-text, focal-point, and exact-logo matrices;
- cross-industry similarity at or below `0.56`, plus within-Restaurant similarity at or below `0.74`;
- a senior UI/UX score of at least 4/5 for hierarchy, typography, menu legibility, imagery, spacing, brand fit, reservation clarity, and mobile usability;
- fresh Dental and Physiotherapy preservation gates before Restaurant is added to either registry or onboarding.

### Next implementation step

Run the three-brief factual variance matrix and candidate-level accessibility/keyboard/reduced-motion gate, then complete cross-surface, logo-aspect-ratio, recorded senior-review, and Dental/Physiotherapy preservation evidence. Restaurant stays `Planned` in Builder and marketing until every candidate gate passes and an explicit registration decision is made. No deployment, customer publishing, or commercial release is authorized by this checkpoint.

## Research basis

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — reflow, focus visibility, headings/labels, keyboard behavior, and pointer-target requirements.
- [National Commission for Allied and Healthcare Professions Act material](https://www.mohfw.gov.in/sites/default/files/NCAHP%20Act_1.pdf) — physiotherapy is an allied healthcare profession; professional scope and credentials must not be invented.
- [ASCI Code and Guidelines](https://www.ascionline.in/the-asci-code-guidelines/) — objective advertising claims must be truthful and substantiated; healthcare claims require particular care.
- [Government of India health and wellness endorsement guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1947344) — health-related assertions should not substitute for professional advice and unsubstantiated treatment/cure claims are unsafe.

These sources define the safety and accessibility boundary. Palette and composition choices are MiCirql design decisions and still require generated-site visual validation.
