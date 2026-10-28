# Cafe industry research and staging contract

Status date: 2026-10-28
Pack: `restaurant-cafe`
State: `draft-unregistered` — visible in the Builder roadmap, not selectable

## Decision

Cafe is not a copy variant of Restaurant. The first Cafe pack uses a faster, daypart-aware counter journey centred on the current menu, opening facts, directions, and one verified ordering path. Restaurant's table-reservation funnel, table-led editorial pacing, six-page anatomy, and warm dining grammar are explicitly excluded.

This checkpoint creates the research, factual contract, and release boundary. It does not create or certify a generated Cafe website.

## Primary-source findings

1. [Schema.org CafeOrCoffeeShop](https://schema.org/CafeOrCoffeeShop) treats a cafe as a specific food-establishment subtype and supports a structured menu. MiCirql therefore keeps `restaurant-cafe` separate from `restaurant-restaurant` while sharing only safe platform primitives.
2. [Schema.org Menu](https://schema.org/Menu) groups menu items into sections and associates item offers, prices, currency, and supplied dietary evidence. The Cafe menu must therefore remain semantic HTML; an image or PDF cannot be the only menu.
3. [Google Business Profile menu guidance](https://support.google.com/business/answer/9455840?hl=en) tells food and drink businesses to maintain current menu sections, items, descriptions, prices, and a canonical menu URL. MiCirql requires the business to mark the supplied menu current and reviewed before staging.
4. [Google Business Profile local-link guidance](https://support.google.com/business/answer/6218037?hl=en) separates menu, reservation, and food-ordering destinations. MiCirql therefore exposes an order link only when the merchant supplies an approved HTTPS destination; it does not synthesize checkout or provider availability.
5. [FSSAI's food-service display FAQ](https://fssai.gov.in/upload/uploadfiles/files/FAQ-%20Display%20of%20Information.pdf) says applicable allergen information should remain next to the relevant item and describes online display expectations. MiCirql records merchant-reviewed disclosure scope and item-level disclosures, but never infers an allergen, dietary, nutrition, organic, licence, or compliance claim.
6. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies the cross-industry baseline for 320 CSS-pixel reflow, keyboard access, visible focus, labelled controls, meaningful alternatives, and target usability.

These sources define data and safety boundaries. They do not choose the visual design and do not certify a merchant's legal compliance.

## Cafe-owned visitor journey

| Route    | Visitor question                                          | Required anatomy                                                                                   | Primary outcome                               |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `/`      | What is this cafe, is it useful now, and how do I act?    | Compact navigation → daypart lead → hours/location strip → menu preview → real imagery → action    | Plan visit or use the supplied order path     |
| `/menu`  | What can I buy and what does it cost?                     | Current-menu lead → daypart/availability notes → semantic categories/items → disclosures → action  | View the current menu without image-only text |
| `/visit` | Where is it, when is it open, and what is the space like? | Address/directions/hours → exterior/counter/seating evidence → supplied access and amenities       | Get directions or call                        |
| `/order` | Can I order ahead or ask about an order?                  | Verified path → supplied steps → fulfilment/policy → optional enquiry → external handoff or call   | Leave for approved ordering or send enquiry   |
| `/story` | What approved facts explain this cafe?                    | Approved description → supplied story/approach → verified place/process/people → menu/visit action | Build trust without invented heritage         |

The default Cafe journey has no reservations page and no `Request a table` action. A future Cafe that genuinely accepts reservations would need an explicit supplied-fact contract and separate release review.

## Factual intake boundary

`cafe-facts-v1` requires:

- approved business name and public description;
- cafe focus and current service modes;
- a business-reviewed current HTML menu with named categories and items;
- an approved description, price, and explicit currency for every named item;
- recorded merchant-reviewed disclosure scope and item-attached disclosure arrays;
- public address, HTTPS directions link, opening hours, and at least one phone or email;
- exactly one order mode: merchant-approved external ordering, order enquiry, or in-person only;
- supplied fulfilment modes and order-policy notes.

Access, seating, amenities, parking, transit, story, and named people remain optional. If present, they must be supplied; every named person must be explicitly verified. Reservation fields are rejected so Restaurant behavior cannot leak into Cafe staging.

## Distinct UI/UX system

The base grammar is `cafe-counter-daypart-utility-v1`:

- counter-ticket, daypart-band, steam-line, menu-stamp, and street-window motifs;
- rounded grotesk display typography with restrained utility-mono accents;
- moderate `500–700` display weight, sentence-case headings, normal word breaking, and no ultra-black or condensed all-caps treatment;
- oat, deep mint, clay, warm white, and dark green-black as the reference palette;
- location/hours before atmospheric gallery content;
- menu names, descriptions, prices, currency, and disclosures kept together at every width;
- order links announce the external handoff and never imply stock, preparation time, payment, or confirmation.

Candidate generation must produce 20 independently art-directed directions. Palette-only variation and Restaurant's editorial-serif/table-frame composition are disallowed.

## Imagery rules

A generated Cafe site targets 10–16 distinct meaningful images and 5–8 on Home. Prefer supplied product, preparation, counter, interior, exterior, and arrival images. Audited library media must remain visibly illustrative and cannot be named as a merchant's exact menu item, venue, staff member, landmark, or real customer scene.

The system must not fabricate product size, ingredients, garnish, availability, staff identity, crowds, queues, reviews, awards, sold-out cues, seating, amenities, or neighbourhood proof. When verified evidence is absent, the relevant proof block is removed rather than replaced with a claim.

## Responsive release contract

- Test 320, 390, 768, 1024, and 1440 CSS pixels.
- No horizontal document overflow or two-dimensional menu scrolling.
- All important controls keep the Builder's 44 px internal touch target.
- Menu item names, descriptions, prices, currency, and disclosures reflow as one readable unit.
- Opening hours and directions remain before decorative/atmospheric media on narrow screens.
- Sticky actions cannot obscure menu content, status messages, focus, or order-enquiry feedback.
- Tablet/desktop menu columns appear only when each column retains readable measure.
- Wide screens keep a bounded canvas and do not enlarge headings or menu line lengths to fill space.

## Certification sequence

1. **Complete:** primary research, draft pack contract, `cafe-facts-v1` validation, non-selectable Builder roadmap state.
2. Build one factual reference scaffold and verify exact facts, menu semantics, conditional order journey, brand/logo, and no Restaurant reservation leakage.
3. Render all five routes at all five widths and complete senior UI/UX, accessibility, keyboard, reduced-motion, overflow, text-fit, image-density, and logo review.
4. Build 20 independent candidate directions with distinct visual identities, palettes, typography, imagery, and responsive compositions.
5. Run three factual briefs across all candidates; then run full route, accessibility, logo, cross-surface, export, and senior-review matrices.
6. Rerun locked Dental, Physiotherapy, and Restaurant preservation gates.
7. Only after every gate passes may Cafe receive a certified catalog/runtime and become selectable.

No deployment, remote database mutation, customer publication, or commercial release is authorized by this document.
