# MiCirql product UI plan

Status date: 2026-10-23  
State: Dental and Physiotherapy certified locally; Builder product shell and truthful marketing replacement implemented locally and gated  
Release rule: Builder and marketing changes must not alter locked Dental output, deploy, migrate, or publish a customer site without explicit authorization

## Objective

Give `builder.micirql.com` and `micirql.com` a coherent, premium MiCirql product identity while keeping generated websites industry-specific. The product should feel like one commercial platform, but a Dental, Physiotherapy, Restaurant, or Consulting site must never look like the MiCirql dashboard or like another industry's template.

## Current surface map

| Surface                | Repository ownership | Relevant source                                                                                                                                                                     |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder                | Present              | `apps/builder/app/page.tsx`, `auth-gate.tsx`, `project-dashboard.tsx`, `onboarding-gate.tsx`, `first-build-review.tsx`, `workspace-client.tsx`                                      |
| Builder preview        | Present              | `apps/builder/app/renderer-preview.tsx`                                                                                                                                             |
| Generated sites/forms  | Present              | `apps/live`; root `micirql.com` remains deliberately outside its wildcard/form routes                                                                                               |
| Internal docs          | Present              | `apps/docs`; this is not the marketing website                                                                                                                                      |
| Public marketing site  | Located              | GitHub `mkraja826/micirql-website`, Cloudflare Pages project `micirql`; local worktree `C:\Users\mamat\OneDrive\Documents\ChatGPT\micirql-website` on `codex/truthful-marketing-ui` |
| Canonical MiCirql mark | Recovered            | `apps/builder/public/micirql-mark.svg` is an exact SHA-256 match to the official asset currently served by `micirql.com`                                                            |

## Product design boundary

A neutral `packages/product-ui` foundation should own:

- MiCirql logo/wordmark rendering and light/dark variants;
- product typography, spacing, focus, motion, elevation, surface, and status tokens;
- buttons, inputs, chips, badges, dialogs, empty/loading/error/conflict states;
- product topbar, sidebar, inspector, responsive drawer, and mobile action patterns.

It must not own generated-site heroes, cards, section sequences, imagery, palettes, or industry motifs. Those remain inside certified industry packs and section variants.

## Builder redesign sequence

1. **Test harness and baselines (passed locally)** — production-build QA covers sign-in, account creation, dashboard management, the real authenticated dashboard-to-onboarding path, certified design review, responsive editor, optimistic conflict handling, actionable logo-upload failure, truthful publish readiness, and archived Physiotherapy draft compatibility at 320/390/768/1024/1440 with overflow, focus, keyboard, touch-target, accessibility, reduced-motion, runtime-error, truthful-status, and screenshot gates.
2. **Auth and dashboard (passed locally)** — duplicated visual treatment is replaced by the shared MiCirql mark, truthful workspace summary, project cards, accessible project actions/dialog behavior, and deterministic loading/empty/recoverable-error coverage without changing auth/session or project APIs.
3. **Pack-driven onboarding (passed)** — universal business/brand facts are separated from pack-owned wording; Dental and Physiotherapy are independently actionable certified packs, Restaurant is visibly `Planned`, pack switching clears cross-industry inputs, and the certified registry remains authoritative.
4. **Certified design review (passed)** — explains that order is brief fit rather than quality, preserves all 20 Dental IDs/order, supports responsive comparison and full preview, and displays factual pack/certification readiness.
5. **Editor shell (passed locally)** — a five-item mobile action bar, progressive `More` menu, responsive canvas/inspector, explicit saved/conflict states, exact same-project identity, and recoverable media/logo failure states replace the dense legacy shell.
6. **Publish readiness (passed locally)** — the editor uses the same certified release assessment as the publish API, distinguishes draft evidence from final production checks, and never implies that passing the screen has deployed a site.

All steps retain current API payloads, state transitions, Dental catalog compatibility, and archived staging-evidence isolation unless a separately reviewed migration is required.

## Marketing redesign sequence

Source ownership is resolved, but deployment remains deliberately unauthorized.
The canonical MiCirql mark was recovered from the official live site, mirrored
byte-for-byte in Builder, and reused by the local marketing replacement. The
replacement lives on `codex/truthful-marketing-ui`, has not been pushed or
deployed, and can be reviewed independently of Builder and generated-site routes.

The evidence-backed audit and replacement contract are recorded in
[`micirql-marketing-current-state-audit.md`](./micirql-marketing-current-state-audit.md).

Recommended public journey:

`Evidence-led proposition → what MiCirql builds → certified Dental example → certified Physiotherapy status → real Builder workflow → editing/publishing capabilities → truthful industry roadmap → FAQ → start building`

Rules:

- use MiCirql's neutral product identity, not Dental styling;
- label every industry `Certified`, `In validation`, or `Planned` from a read-only status source;
- never let a marketing label grant runtime certification;
- show real generated screenshots and real Builder states rather than generic mockups;
- preserve campaign/industry intent in Builder handoff, then let Builder revalidate availability;
- omit pricing until the billing model is decided;
- avoid claims about storage, publishing, integrations, or availability that the production path cannot prove.

## Release gates

### Builder

- auth, dashboard, onboarding, ranked review, editor, conflict, media/logo, and publish-readiness states at five widths;
- no overflow, clipping, covered controls, sub-44 px primary mobile targets, or unreadable status text;
- keyboard-only completion, visible focus, modal focus return, reduced motion, zoom/reflow, and automated accessibility checks;
- project CRUD, autosave/conflict handling, exact logo propagation, preview, and publish-readiness workflows;
- planned industries remain non-actionable; only packs that pass their independent gate enter the registry/runtime.

### Marketing

- every capability and industry statement maps to current verified production state;
- navigation, Builder handoff, contact/enquiry form, no-JavaScript fallback, and error states work end to end;
- server-rendered/indexable content, canonical metadata, structured data, sitemap, social previews, and bounded script/image budgets;
- responsive and accessibility matrix at the same five widths;
- independent deployment ownership for `micirql.com`, `builder.micirql.com`, `forms.micirql.com`, and generated-site wildcard routes.

### Regression boundary

- Dental catalog version, 20 IDs/order, selection behavior, screenshots, live rendering, export, and action semantics remain unchanged;
- Dental Doctors navigation and `/doctors` remain evidence-driven: the scaffold/generator, design-selection server validation, certified publish gate, publish-readiness UI, and Pages Manager all omit the route when no visible verified clinician record exists and require it only when factual clinician evidence is present;
- Physiotherapy remains registered at `physiotherapy-flagship-2026.10.23`; its archived draft route remains unavailable evidence rather than a second runtime;
- Builder/marketing releases are independent and reversible;
- no UI milestone performs a database migration, production deployment, or customer publication automatically.

## Current blockers

1. The private Supabase upload adapter and durable preview/live/export re-signing path pass locally, but the production deployment configuration and an authorized remote upload-to-live/export smoke are still outstanding.
2. Physiotherapy is locally certified, but a real customer site still needs that clinic's exact approved identity assets and verified facts; deterministic logo fixtures are not commercial approval.
3. The local marketing replacement passes its clean build and 9/9 product-UI gate, but privacy/abuse-control decisions, production handoff, final copy approval, rollback verification, and deployment authorization remain outstanding.
4. Focused post-change Radhika Dental generated-route evidence is green, but its deterministic logo is a QA-only stand-in and it does not cover the complete authenticated dashboard-to-brief-to-saved-draft lifecycle. Commercial acceptance still needs the clinic's exact approved logo, verified business/contact/team/review facts, an authenticated saved-project run, and the authorized deployed upload-to-live/export smoke.

Builder and marketing can continue through independent local release gates while
deployment-verification and production-handoff blockers are resolved. Locating and validating the
marketing source does not itself authorize a public deployment.

Latest 2026-10-23 focused evidence: Radhika Dental ranks 5, 15, and 18 pass the generated-route visual gate across the truthful Home, Services, About, and Contact routes at 1440, 768, and 390 px. Each rank retains 25 PNGs covering fold/full-page states and the open mobile menu; the gate checks substantive content, human/service image balance, unique loaded images with alt text, readable H1/H2/H3 typography, zero horizontal overflow, exact header/footer logo propagation, mobile-menu containment/backdrop behavior, and the factual omission of Doctors when no verified clinician evidence exists. The route uses a QA-only logo stand-in and the real Dental scaffold, ranked preset, and production renderer, but not the full authenticated saved-project lifecycle.

The **23/23** eight-width full-catalog Dental result from 2026-10-22 remains the prior baseline. After Physiotherapy registry/runtime promotion, the final 2026-10-23 full 20-candidate production rerun passes **23/23** in 7.5 minutes; evidence is retained under `C:\mi-dental-post-physio-promotion-20261023`. Physiotherapy's promoted registry/runtime architecture suite passes **39/39**, its final-code responsive matrix passes **21/21** test cases over 600 route/viewport states, the supplied-fact matrix passes 60/60 test cases over 720 states, and accessibility/logo evidence covers 240 accessibility states plus all 20 candidates. All 20 workspace packages typecheck, and the separate marketing repository passes its production build and **9/9** five-width product-UI suite. No deployment, migration, push, or customer publication is included.

## Phase 1 checkpoint: unauthenticated shell

The first Builder product-chrome gate now runs against a production build with
`pnpm qa:builder:chrome`. It covers both sign-in and account-creation states at
320, 390, 768, 1024, and 1440 pixels, compares them with ten checked-in visual
baselines, and writes current evidence to `test-results/builder-product-chrome`.

The gate currently verifies:

- no horizontal overflow, escaped content, or clipped text;
- 44 by 44 pixel mobile/tablet interactive targets;
- keyboard tab order and visible focus treatment;
- automated WCAG A/AA checks, form semantics, and accessible names;
- reduced-motion behavior and the absence of browser runtime errors;
- production-build rendering, with Playwright diagnostics isolated from the
  generated-site test artifacts.

The gate exposed and fixed an undersized account-mode control. This first
checkpoint did not cover authenticated states; onboarding, certified design
review, dashboard management, editor, and conflict behavior are addressed by the
following checkpoints. The current full gate now includes media/logo failure and publish readiness.

Latest production result, reconfirmed after the Physiotherapy candidate work: **5/5 tests passed**, comparing ten current renders
against ten checked-in baselines. The account-mode control increased from 29 px
to the 44 px internal touch standard; focus and reduced-motion handling are now
explicit. API payloads, auth/session transitions, Dental output, and registry
state were unchanged.

## Pack-driven onboarding checkpoint

The business-discovery form now uses scoped light-scheme product styles instead
of inheriting the Builder's dark root colors into a white card. The checkpoint
replaces the Dental-era internal form with a neutral MiCirql business brief:

- a truthful three-stage journey (`Business brief → Choose direction → Edit & publish`);
- keyboard-accessible certified choices for Dental and Physiotherapy, plus a
  noninteractive `Planned` Restaurant card that cannot start generation;
- universal business facts plus pack-owned focus wording;
- an optional enrichment disclosure for verified trust facts, approved opening
  hours, and the real-photo/certified-library image plan so richer output can be
  requested without inventing claims;
- accessible multi-select priorities with explicit selected state;
- an exact-logo promise, optional candidate-palette behavior, and styled asset input;
- a live brief summary, pack-specific `Continue to 20 … directions` action, and a
  safe-area-aware mobile review bar that keeps required-item status reachable;
- no user-facing implementation phrase such as “rank 20 dental-only compositions.”

The test follows the real stored-session, dashboard, draft, and onboarding-status
path with deterministic network responses; it adds no production QA route or
authentication bypass. Five onboarding renders pass at 320, 390, 768, 1024,
and 1440 px with WCAG 2.2 A/AA, visible focus, 44 px mobile/tablet targets,
responsive overflow/clipping, planned-pack non-actionability, reduced motion, and
runtime-error checks. Together with the unauthenticated shell, the current
Builder product-chrome gate passed **10/10 production tests** at this checkpoint.
With the certified design-review suite included, that checkpoint passed
**16/16**. The current expanded gate, including dashboard and editor states,
passes **33/33**. The API payload, session lifecycle, Dental certified boundary,
and post-submit review transition remain unchanged.

## Certified design-review checkpoint

The old internal-looking ranked-candidate page is replaced with a neutral
MiCirql product surface that continues the same three-stage journey from the
business brief. It deliberately keeps generated-site styling inside each
candidate preview instead of letting Dental visuals become Builder chrome.

The review now provides:

- a readable, moderate-weight heading and factual explanation that ordering is
  based on brief fit, not an absolute quality or performance score;
- the compatibility-locked 20 Dental candidate IDs in their existing order,
  shown four at a time with clear pagination;
- each candidate's real composed palette, type sample, image strategy, and
  responsive desktop/tablet/mobile preview controls;
- inert review previews so generated links and forms cannot steal keyboard
  focus, plus a focus-trapped full-preview dialog with Escape and focus return;
- selection loading, safe error and revision-conflict recovery, and the exact
  existing optimistic POST contract;
- editor handoff to the same selected workspace and site, with no demo-project
  flash while the selected draft loads.

Production-build QA passes **6/6 design-review tests** at 320, 390, 768, 1024,
and 1440 px, including WCAG 2.2 A/AA shell checks, visible focus, 44 px
mobile/tablet controls, overflow and clipping, reduced motion, runtime errors,
modal behavior, exact 20-ID ordering, candidate-specific preview identity,
brand-color composition, exact selection payload, and same-project editor
handoff. Auth, onboarding, and review pass **16/16** at this checkpoint; the
current expanded product-chrome gate passes **33/33**, and the locked Dental
structural gate also passes **18/18**. No deployment, migration, or customer
publication is part of this checkpoint.

## Dashboard and responsive-editor checkpoint

The authenticated project dashboard and editor now use the same neutral MiCirql
product system and exact recovered mark as auth, onboarding, and design review.
The dashboard provides truthful published/draft counts, distinct project cards,
explicit empty/loading/recoverable-error states, and accessible rename,
duplicate, archive, and create actions. The editor retains the real selected
project, saved state, conflict recovery, desktop rails and responsive mobile
navigation without importing generated-site visual language into product chrome.

The final production-build matrix passes **33/33 tests**: seven editor/readiness tests, six
certified design-review tests, six onboarding/media-failure tests, thirteen exact-mark,
auth, dashboard, action-contract, and state tests, plus one archived pre-certification Physiotherapy editor interaction. It covers 320, 390, 768, 1024,
and 1440 px, checked-in visual baselines, WCAG A/AA automation, visible keyboard
focus, 44 px internal touch targets, reduced motion, overflow/clipping, runtime
errors, API contracts, autosave and optimistic-conflict recovery. The gate found
and corrected low-contrast dashboard preview labels and metadata instead of
weakening the accessibility assertion. Logo failure preserves the previous brief and offers a safe retry; publish readiness shares the server's certified gate and labels final production validation separately. The supporting upload-security/readiness contract suite passes **7/7**.
