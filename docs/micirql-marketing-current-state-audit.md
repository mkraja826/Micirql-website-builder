# MiCirql marketing current-state audit

Status date: 2026-10-23  
Surface audited: `https://micirql.com`  
Purpose: record the live-site audit, resolved source ownership, and the local truthful replacement gate before any public release

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
| “Built for” Clinic, Restaurant, Real estate, SaaS, Construction, and Professional services                   | Dental and Physiotherapy are certified and selectable locally; Restaurant is next and every remaining industry is planned.                       | Replace the undifferentiated list with `Certified`, `In validation`, and `Planned` statuses sourced from a read-only release manifest.   |
| “MiCirql chooses the structure, design system and functionality.”                                            | Dental and Physiotherapy each have verified independent ranking, 20-direction selection, page anatomy, and visual grammar.                       | Scope the claim to certified industries and explain that each industry owns its own researched pack.                                     |
| “Click text, replace images, drag sections, switch themes and tune typography, spacing and motion visually.” | The responsive editor shell, autosave/conflict recovery, media/logo failure, and publish-readiness states are locally gated.                     | Show only interactions proven by the current editor gate; do not imply that local readiness has deployed a site.                          |
| “Forms, authentication, databases, dashboards and business workflows can be connected.”                      | Forms and platform modules exist, but customer-ready cross-surface, storage and operational evidence is incomplete.                              | Separate currently verified website capabilities from custom/in-validation product engineering work.                                     |
| “Use a custom domain with MiCirql hosting or export the finished site.”                                      | Publish/export code exists, while production object storage and the full publish-readiness product gate remain incomplete.                       | Do not imply self-serve commercial readiness until the release gate is green; offer a qualified assisted workflow if operationally true. |

The contact selector also uses `Micirql` while the product lockup uses `MiCirql`;
the replacement must use one canonical spelling.

## Required public journey

1. **Evidence-led proposition** — explain that MiCirql builds structured,
   editable websites from certified industry systems rather than one-off generic
   templates.
2. **Available now** — show Dental and Physiotherapy as independently certified
   packs and link to real generated evidence.
3. **How the Builder works** — `Business brief → Choose direction → Edit →
readiness check`, using real Builder screenshots and current UI wording.
4. **Certified Dental proof** — show multiple genuinely different Dental
   directions, responsive output, page coverage, imagery density and brand/logo
   preservation.
5. **Industry validation roadmap** — show Dental and Physiotherapy as `Certified`,
   Restaurant as the next `Planned` pack, and every later industry truthfully;
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

The local replacement now uses a frozen read-only release manifest, scopes the
public proposition to certified Dental and Physiotherapy, keeps Restaurant and
later industries `Planned`, removes unsupported backend/self-serve publish
claims, and uses the exact official mark. Production-build UI QA passes 9/9 at
320, 390, 768, 1024, and 1440 px with navigation, keyboard, touch targets,
reduced motion, WCAG A/AA, runtime, responsive overflow, and visual baselines.
The build and `git diff --check` also pass. No deploy, push, or PR occurred.

The replacement cannot be considered complete until:

- production handoff confirms the existing Cloudflare Pages configuration,
  rollback procedure, final copy and deployment authorization;
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

No deployment is authorized by this audit.
