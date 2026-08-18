# MiCirql Premium Generation Gate

MiCirql is generation-quality-first. Product feature expansion is frozen until generated websites consistently pass this gate on desktop, tablet, and mobile.

## Acceptance target
A generated website must look intentionally art-directed rather than template-filled. No candidate enters the premium Top-20 merely because it is valid or functional.

## 1. Typography
- Use an intentional display/body/UI type system; avoid accidental browser-default typography.
- Maintain a clear type scale and hierarchy across eyebrow, H1, H2, H3, body, labels, buttons, navigation and captions.
- H1 line length, wrapping and line-height must remain composed at 360, 390, 430, 768, 1024 and >=1440 px.
- Body copy must remain comfortably readable; avoid tiny text, excessive line length, orphaned headings and dense blocks.
- Weight, tracking and case must be role-specific rather than globally repeated.

## 2. Color
- Palette must fit the brief and theme family while preserving brand facts.
- Verify foreground/background contrast for body copy, muted text, navigation, buttons, cards and form controls.
- Avoid arbitrary gradients, excessive accent usage, muddy low-contrast surfaces and near-identical adjacent surfaces.
- Primary/accent color must have a deliberate hierarchy; not every CTA or decorative element should compete equally.

## 3. Spacing and dimensions
- Use a coherent spacing rhythm for page gutters, section padding, card padding, grid gaps and control gaps.
- Sections must have deliberate vertical rhythm rather than identical padding everywhere.
- Content max-widths must prevent both cramped mobile layouts and stretched desktop layouts.
- Cards, media, forms and text columns must align to a shared grid.
- No horizontal overflow at supported widths.

## 4. Buttons and controls
- Minimum touch target: 44x44 CSS px for primary interactive controls on touch layouts.
- Button height, radius, padding, icon gap, typography and states must be consistent within a design system.
- Primary, secondary, tertiary and text actions need visually distinct hierarchy.
- No clipped labels, wrapping CTAs, overlapping controls or ambiguous disabled/hover/focus states.

## 5. Borders, radius, shadows and surfaces
- Radius must follow the selected shape system rather than random per-section values.
- Borders must be subtle and purposeful; avoid boxing every element.
- Shadows must communicate elevation, not decoration.
- Avoid stacking border + heavy shadow + gradient + glow without a clear reason.

## 6. Layout and composition
- Hero must establish hierarchy immediately and have a deliberate text/media relationship.
- Section transitions must create narrative rhythm: trust, service, proof, differentiation and conversion should not feel mechanically repeated.
- Repeated card grids must vary composition where appropriate.
- Navigation, hero, proof, services, team, gallery, CTA, contact and footer must feel like one design system.
- Top-20 candidates must be materially different in composition and art direction, not recolors.

## 7. Imagery
- Image subject, crop, aspect ratio and placement must fit the page purpose.
- Never stretch images or allow uncontrolled crops over important subjects.
- Generated imagery must not impersonate real doctors, customers, credentials or clinical outcomes.
- Real supplied assets take priority where identity/outcome authenticity matters.
- Avoid repeating the same image across visually prominent slots.

## 8. Responsive behavior
Test at minimum: 360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900.
- Zero horizontal page overflow.
- No fixed controls covering content.
- No collisions between navigation, headings, media, cards, forms, editor overlays or CTAs.
- Grids collapse intentionally, not merely to one cramped column.
- Typography, gutters, section padding and media ratios adapt by breakpoint.
- Mobile is a designed composition, not a shrunk desktop layout.

## 9. Interaction and motion
- Hover/focus/pressed states must be coherent and accessible.
- Motion should reinforce hierarchy and feedback; no gratuitous animation.
- Respect reduced-motion preferences.
- Interactive elements must not shift layout unexpectedly.

## 10. Content fit
- Generated copy must fit its component. No giant paragraphs inside cards or tiny headings inside hero layouts.
- Content density must match the chosen theme and viewport.
- Locked business facts must remain factual; visual polish never justifies invented claims.

## 11. Premium rejection conditions
A candidate is automatically rejected from premium certification if it has any of these:
- horizontal overflow or clipped content
- overlapping/floating UI that blocks content
- broken responsive alignment
- unreadable contrast
- uncontrolled text wrapping
- visibly inconsistent spacing/radii/button systems
- stretched or badly cropped hero media
- placeholder-looking sections
- repeated generic card grids dominating the page
- fake identity, credential, review, result or business fact
- desktop-only composition on mobile

## Development priority
Until this gate is consistently passed, work order is:
1. rendered-output audit
2. typography and font systems
3. spacing/grid/dimensions
4. palette/contrast
5. component geometry and states
6. section composition
7. imagery/art direction
8. responsive/mobile composition
9. motion/micro-interactions
10. Top-20 diversity and final visual scoring

Do not prioritize CRM, analytics, settings, additional integrations or other feature expansion ahead of this gate.
