# Restaurant factual-reference visual review

Review date: 2026-10-24  
Fixture: Aarunya Table, a fictional internal factual-boundary fixture  
Status: Top-20 responsive route checkpoint accepted; Restaurant remains unregistered, unavailable in onboarding, and uncertified

## Decision

The factual Restaurant / Restaurant reference is the common content and behavior baseline for 20 independently art-directed staging candidates. The candidates now pass the complete six-route/five-width responsive matrix, but this is not a certified pack and must not be exposed as a Builder choice yet.

The reference is materially different from the Dental and Physiotherapy systems. It uses a warm table-editorial grammar: moderate serif display type, double rules, menu-category rhythm, item/price alignment, square reservation actions, warm paper fields, and an editorial venue/food gallery. It does not reuse treatment cards, clinic hero geometry, movement paths, appointment language, or a clinic page sequence.

The review covered the production live renderer and the generated portable static site. Both surfaces passed Home, Menu, Visit, Reservations, Story, and Contact at 320, 390, 768, 1024, and 1440 CSS pixels.

## Senior UI/UX scorecard

| Area                       | Score | Review                                                                                                                                                                                                                                                |
| -------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Information hierarchy      | 4.6/5 | Each route has one clear H1, a restrained introductory measure, and a visible next action. Inner-page sequence matches the visitor’s task.                                                                                                            |
| Typography                 | 4.5/5 | The moderate `Source Serif 4` direction is readable in sentence case, bounded at 2.85rem on mobile and 4.25rem on desktop, and avoids the former condensed ultra-black failure.                                                                       |
| Menu legibility            | 4.7/5 | Three semantic categories, eight supplied items, descriptions, disclosures, and aligned INR prices remain associated at every width and stack safely below 22rem.                                                                                     |
| Imagery                    | 4.3/5 | Six unique route heroes and 16 unique licensed assets provide useful density. Every image is visibly and textually identified as illustrative; a real merchant shoot is still required for customer brand proof.                                      |
| Spacing and composition    | 4.4/5 | The split desktop hero, single-column mobile flow, paper grid, alternating fields, and two-to-one gallery reflow are coherent. Home is deliberately long because it now supplies the depth missing from earlier one-image generations.                |
| Logo and brand handling    | 4.5/5 | The exact QA-supplied mark appears in header and footer with intrinsic dimensions, preserved aspect ratio, contain sizing, eager header loading, and lazy footer loading on live and static surfaces. A QA fixture is not customer identity approval. |
| Conversion clarity         | 4.7/5 | `Request a table` is consistent; receipt is explicitly not confirmation. Reservations owns date, time, and party size, while Contact owns only a general enquiry form.                                                                                |
| Mobile usability           | 4.6/5 | 320/390 px states have no horizontal escape, hero overlap, clipped content, or undersized controls. Menu prices wrap safely and the keyboard menu closes with focus returned.                                                                         |
| Cross-industry distinction | 4.8/5 | The composition, vocabulary, palette, menu system, imagery roles, and conversion model read as hospitality rather than Dental or Physiotherapy.                                                                                                       |

Provisional reference average: **4.6/5**. This accepts one factual reference direction only; it does not score or certify the required 20-candidate catalog.

## What the visual review found and fixed

- Replaced the oversized condensed ultra-heavy heading treatment with a readable moderate editorial serif, sentence case, normal word breaking, and bounded line length.
- Expanded the reference from a one-image result to 16 unique audited assets across the site, including six unique heroes and six meaningful images on Home.
- Added semantic menu groups, visible currency/prices, item disclosures, and responsive price association in both live rendering and static export.
- Corrected the primary renderer label from `Request reservation` to the exact Restaurant action `Request a table`.
- Kept reservation requests and general enquiries as separate action bindings and separate forms.
- Fixed a real 320 px live hero escape by constraining the media wrapper and image; copied the same containment contract into static export.
- Corrected the display-font serialization so the intended serif stack is computed instead of silently falling back to Inter.
- Replaced generic-card static gallery output with the same figure/gallery structure as live rendering, preserving every supplied stock-disclosure alt text instead of substituting the item title.
- Added intrinsic logo dimensions, exact asset identity attributes, load priority, decoding behavior, aspect ratio, and matching header/footer sizing to static output.
- Fixed a static-only 320 px eyebrow escape and explicitly excluded the intentional off-screen spam honeypot from geometry assertions.
- Changed grouping from adjacent-run grouping to stable first-seen category grouping so a repeated non-contiguous category cannot create duplicate headings or React keys.

## Verified evidence

- Factual scaffold contract: **7/7 passed**.
- Production live visual matrix: **1/1 specification passed; all 30 route/viewport states green**.
- Portable static-export visual matrix: **1/1 specification passed; all 30 route/viewport states green**.
- Combined Restaurant reference visual coverage: **60/60 route/viewport states green**.
- Shared ungrouped service renderer on the optimized production build: **8/8 viewport states green**.
- Restaurant planning, registry/runtime isolation, content-boundary, Physiotherapy preservation, generic export, and locked Dental Top-20 contracts: **71/71 passed**.
- Static exact-logo cases: **2/2 passed**.
- Builder, Preview, and Sections TypeScript checks pass; the optimized Preview production build completes and registers the Restaurant draft route.

Live evidence is retained under:

- `test-results/restaurant-draft-visual-spec`

Portable-export evidence is retained under:

- `C:\mi-restaurant-static-reference-20261024`

The live gate retains full-page 320, 390, and 1440 px screenshots for all six routes plus Home fold captures. The static gate retains full-page screenshots for every route at all five widths.

## Top-20 responsive route checkpoint — 2026-10-25

- The staging catalog owns 20 immutable candidates with unique Home flows, labels, visual identities, component tuples, hero assets, ranking behavior, and candidate-scoped media selections.
- All 190 within-Restaurant and 800 Restaurant-vs-certified-industry comparisons pass the `0.74` and `0.56` similarity ceilings.
- The contract and factual-scaffold suite passes **23/23**.
- The Home catalog passes **20/20 candidates and 100/100 responsive states** at 320, 390, 768, 1024, and 1440 px. A new containment assertion protects menu headings, item names, descriptions, and prices from escaping their owned menu track.
- Senior screenshot inspection found five desktop menu compositions whose generic section-variant grid had squeezed content into a 30 px track: Market Ledger, Courtyard Threshold, Open Fire, Counter Signal, and Linen and Light. The Restaurant-owned two-column menu anatomy now overrides that generic grid without changing mobile layouts.
- The new all-route matrix passes **20/20 candidates and 600/600 states** across Home, Menu, Visit, Reservations, Story, and Contact at all five widths. It verifies exact candidate identity, page anatomy, factual copy boundaries, separate reservation/general-enquiry forms, menu prices, the exact supplied QA logo, image count/loading/alt text, unique route heroes, responsive typography, 44 px mobile controls, navigation separation, overflow, clipping, and menu containment.
- The all-route gate caught and fixed an Open Fire Home hero whose centered generic variant could expand the copy outside the canvas at 1024 and 1440 px. The final candidate-scoped layout stretches the copy inside its grid track while preserving the dark fire-led direction.
- Full-page 320 and 1440 px evidence for every candidate and route is retained under `qa-artifacts/restaurant-candidate-route-matrix` when `pnpm qa:restaurant:routes` runs with its default screenshot settings. This yields 240 retained screenshots.

## Release boundary and next milestone

Restaurant now has the 20-candidate catalog, deterministic ranking evidence, and the complete live-preview responsive route matrix. It still has no candidate-level accessibility matrix, three-brief factual variance matrix, full cross-surface preview/editor/live/static-export matrix, Restaurant-specific logo aspect-ratio matrix, recorded senior 4/5 review for every candidate, or final Dental/Physiotherapy preservation rerun. It therefore remains `Planned` and cannot be selected or published through the certified-pack flow.

The next milestone is the three-brief factual variance matrix and candidate-level WCAG/keyboard/reduced-motion gate, followed by cross-surface, logo-aspect-ratio, senior-review, and Dental/Physiotherapy preservation evidence. Registration remains a separate explicit decision after those gates pass.

No database migration, deployment, customer publication, or commercial release was performed.
