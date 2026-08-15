# MiCirql Foundation Contract

## Platform invariant

MiCirql is a structured website-building platform with AI as a decision layer. AI should reuse approved library assets first, compose approved assets second, and generate custom code only when a necessary requirement cannot be satisfied safely by the platform.

## Dependency direction

The intended dependency direction is:

`primitives -> components -> sections -> domains`

Cross-cutting packages are consumed through stable contracts:

- `schema` defines portable site/component/function contracts.
- `registry` indexes approved designs and functions.
- `themes` supplies visual behavior and semantic tokens; customer brand color is not hard-coded into designs.
- `renderer` resolves approved schema into runtime output.
- `functions` exposes approved backend action contracts.
- `protocol` enforces production quality gates.
- `ai` plans, ranks, selects, configures, and reviews; it must not bypass registry/protocol contracts.

## App boundaries

### builder

Authenticated customer/editor experience. Can use richer client-side behavior because it is not the published website runtime.

### preview

Draft/published schema rendering shell. This evolves into the performance-sensitive customer runtime and should default to server rendering with client-side JavaScript only for necessary interactions.

### docs

Internal design library documentation, registry inspection, component QA, and eventually Storybook integration.

## Non-negotiable MiCirql Build Protocol

A design or site cannot be production-ready unless it passes:

1. Functionality
2. Mobile-first UX
3. Performance
4. Accessibility
5. SEO readiness
6. Security/integrity
7. Visual coherence

These are platform constraints, not theme modifiers.

## Library scale

The architecture must support 50+ genuinely distinct design variants per high-variation section family per theme. Small primitives should remain robust shared implementations driven by semantic theme tokens rather than thousands of duplicated components.

## Locked V1 domains

1. Healthcare / Clinic
2. Landing Page
3. Real Estate
4. Restaurant / Cafe
5. Corporate / Business
6. SaaS / Technology
7. Portfolio / Personal Brand
8. Construction / Home Services
9. Education / Training
10. Hospitality / Travel

## Locked V1 theme families

1. Minimalist
2. Corporate / Professional
3. Luxury / Premium
4. Editorial
5. Glass / Modern UI
6. Maximalist / Bold
7. Organic / Soft
8. Futuristic / Tech
9. Playful / Friendly
10. Cinematic / Immersive

Theme modifiers such as liquid/fluid, light/dark, gradients, rounded/sharp geometry, depth, motion intensity, illustrative/photography-led, geometric, and texture/grain are orthogonal to theme family.
