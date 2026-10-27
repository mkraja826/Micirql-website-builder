# MiCirql marketing current-state audit

Status date: 2026-10-27<br />
Surface audited: `https://micirql.com`  
Purpose: record the live-site audit, resolved source ownership, and the local truthful replacement gate before any public release

The live capture and original marketing QA result below remain dated 2026-10-23 evidence. A 2026-10-27 Builder source milestone subsequently promoted Restaurant locally; that promotion changes the required marketing manifest and proof, but it did not deploy either surface.

## Evidence captured

- The public root returned HTTP 200 and rendered at 1440 × 900 and 390 × 844.
- The live page serves `/micirql-mark.svg`. The asset mirrored into
  `apps/builder/public/micirql-mark.svg` matches the live bytes exactly at SHA-256
  `7B7B1D2DEBAC2BA38D1EAD35CEC3CD6CDBC3315BA5BF5633857DCEDD6397C136`.
- Source ownership is resolved: GitHub `mkraja826/micirql-website` is connected
  to the Cloudflare Pages project `micirql`; production deploys track `main`.
- The source was cloned to
  `C:\Users\mamat\OneDrive\Documents\ChatGPT\micirql-website` and the truthful
  replacement is isolated on `codex/truthful-marketing-ui`.
- The live page is visually coherent and responsive, but its capability and
  industry language is broader than the verified Builder release state.

## Public claims versus verified state

| Current public message                                                                                       | Verified project state                                                                                                                           | Required correction                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| “Built for” Clinic, Restaurant, Real estate, SaaS, Construction, and Professional services                   | Dental, Physiotherapy, and Restaurant are certified and selectable locally; Cafe is the next planned pack and every remaining industry is planned. | Replace the undifferentiated list with `Certified`, `In validation`, and `Planned` statuses sourced from a read-only release manifest.   |
| “MiCirql chooses the structure, design system and functionality.”                                            | Dental, Physiotherapy, and Restaurant each have verified independent ranking, 20-direction selection, page anatomy, and visual grammar.          | Scope the claim to certified industries and explain that each industry owns its own researched pack.                                     |
| “Click text, replace images, drag sections, switch themes and tune typography, spacing and motion visually.” | The responsive editor shell, autosave/conflict recovery, media/logo failure, and publish-readiness states are locally gated.                     | Show only interactions proven by the current editor gate; do not imply that local readiness has deployed a site.                          |
| “Forms, authentication, databases, dashboards and business workflows can be connected.”                      | Forms and platform modules exist, but customer-ready cross-surface, storage and operational evidence is incomplete.                              | Separate currently verified website capabilities from custom/in-validation product engineering work.                                     |
| “Use a custom domain with MiCirql hosting or export the finished site.”                                      | Publish/export code exists, while production object storage and the full publish-readiness product gate remain incomplete.                       | Do not imply self-serve commercial readiness until the release gate is green; offer a qualified assisted workflow if operationally true. |

The contact selector also uses `Micirql` while the product lockup uses `MiCirql`;
the replacement must use one canonical spelling.

## Required public journey

1. **Evidence-led proposition** — explain that MiCirql builds structured,
   editable websites from certified industry systems rather than one-off generic
   templates.
2. **Certified locally** — show Dental, Physiotherapy, and Restaurant as independently
   certified packs, link to real generated evidence, and state that this is not
   deployment, customer publication, or commercial availability.
3. **How the Builder works** — `Business brief → Choose direction → Edit →
readiness check`, using real Builder screenshots and current UI wording.
4. **Certified pack proof** — show multiple genuinely different Dental,
   Physiotherapy, and Restaurant directions, responsive output, page coverage,
   imagery density, factual boundaries, and brand/logo preservation.
5. **Industry validation roadmap** — show Dental, Physiotherapy, and Restaurant
   as `Certified`, Cafe as the next `Planned` pack, and every later industry truthfully;
   marketing labels must never grant generation access.
6. **Verified capability table** — separate `Available`, `In validation`, and
   `Assisted/custom` functionality.
7. **Why the system stays usable** — explain pack-owned anatomy, design grammar,
   content boundaries, accessibility and regression gates in plain language.
8. **FAQ and start-building handoff** — preserve campaign intent but let Builder
   revalidate availability before creating a draft.

Pricing stays absent until billing is decided.

## Product design direction

- Keep the neutral near-black/violet MiCirql identity and the recovered official
  mark; do not reuse Dental teal, clinical motifs or generated-site typography as
  marketing chrome.
- Reduce the current very long mobile page by grouping proof and roadmap content
  into progressive sections without hiding release status.
- Use moderate display weight and readable line height. Avoid the compressed,
  extra-heavy heading treatment already rejected in generated Dental output.
- Use real generated-site and Builder evidence, not generic website mockups.
- Ensure every screenshot has a text explanation and does not become the only
  way a capability or status is communicated.

## Marketing release gate

At the 2026-10-23 checkpoint, the local replacement used a frozen read-only
release manifest, scoped the public proposition to certified Dental and
Physiotherapy, kept Restaurant and later industries `Planned`, removed
unsupported backend/self-serve publish claims, and used the exact official mark.
Production-build UI QA passed 9/9 at
320, 390, 768, 1024, and 1440 px with navigation, keyboard, touch targets,
reduced motion, WCAG A/AA, runtime, responsive overflow, and visual baselines.
The build and `git diff --check` also passed. No deploy, push, or PR occurred at
that audit checkpoint.

Following the 2026-10-27 local Builder promotion, the marketing source must now
derive Dental, Physiotherapy, and Restaurant as `Certified` and Cafe as the next
`Planned` pack. Restaurant proof should identify catalog
`restaurant-flagship-2026.10.27`, its 20 candidates and six routes, while
explaining that supplied menu, location, contact, story, and reservation facts
remain immutable in the Site snapshot and generic enrichment is disabled for
the pack. This is a required source update and fresh release-gate rerun, not a
claim that the current live site or the pushed marketing branch already contains
the promotion.

The replacement cannot be considered complete until:

- production handoff confirms the existing Cloudflare Pages configuration,
  rollback procedure, final copy and deployment authorization;
- the frozen release manifest, roadmap and certified proof are updated for the
  three locally certified packs, with Cafe next, and the complete marketing
  build/visual/accessibility gate is rerun;
- the canonical mark and approved lockups render correctly on light and dark
  surfaces;
- industry/status text is generated from a read-only manifest and cannot mutate
  pack certification;
- claims map to current test evidence and do not overstate storage, publishing,
  backend, integrations or industry availability;
- navigation, Builder handoff, enquiry form, no-JavaScript fallback and error
  states work end to end;
- metadata, structured data, sitemap, social preview, image/script budgets and
  server-rendered indexable content pass;
- 320, 390, 768, 1024, and 1440 px visual, keyboard, reflow, reduced-motion and
  WCAG 2.2 A/AA checks pass; and
- no marketing release changes generated-site wildcard routes or Dental output.

No deployment, customer publication, production-data mutation, or commercial
release is authorized by this audit or the Restaurant promotion addendum.
