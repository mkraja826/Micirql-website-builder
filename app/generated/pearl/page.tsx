import type { CSSProperties } from "react";
import { generatePearlDentalBenchmark } from "../../../src/core/generation/pearl";
import { ConversionCleanNavbar } from "../../../src/sections/navbar/conversion-clean";
import { EditorialSplitHero } from "../../../src/sections/hero/editorial-split";
import { EditorialServiceIndex } from "../../../src/sections/services/editorial-index";
import { TrustManifesto } from "../../../src/sections/about/trust-manifesto";
import { EditorialCtaBand } from "../../../src/sections/cta/editorial-band";
import { LocalConversionContact } from "../../../src/sections/contact/local-conversion";
import { FunctionalLocalFooter } from "../../../src/sections/footer/functional-local";

export default async function GeneratedPearlPage() {
  const generated = await generatePearlDentalBenchmark();
  const home = generated.content.pages.find((page) => page.slug === "home") ?? generated.content.pages[0];
  const section = (type: string) => home.sections.find((item) => item.sectionType === type);
  const services = section("services");
  const cta = section("cta");
  const contact = section("contact");
  const brand = "Pearl Dental";
  const style = generated.cssVariables as CSSProperties;

  const serviceItems = services?.items?.length
    ? services.items.map((item) => ({ title: item.title, body: item.body ?? "Learn more about this care area during your consultation." }))
    : [
        { title: "Preventive care", body: "Support routine oral health with clear, patient-friendly guidance and appropriate preventive care." },
        { title: "Restorative care", body: "Discuss suitable ways to restore comfort and function based on an individual clinical assessment." },
        { title: "Smile-focused care", body: "Explore cosmetic and restorative options without promises about outcomes that have not been clinically assessed." },
      ];

  return <main style={style}>
    <ConversionCleanNavbar
      brand={brand}
      links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]}
      primaryCta={{label:"Request appointment",href:"#contact"}}
    />
    <EditorialSplitHero
      brand={brand}
      eyebrow="Dental care in Hyderabad"
      headline="Calm, considered dental care."
      body="A clear place to understand common dental care needs and take the next step with confidence."
      primaryCta={{label:"Get in touch",href:"#contact"}}
      secondaryCta={{label:"Explore care",href:"#care"}}
      trustItems={[{label:"Hyderabad"},{label:"Clear next steps"},{label:"Patient-friendly information"}]}
      visualNote="A calm, clear place to begin your dental care journey."
    />
    <EditorialServiceIndex
      eyebrow="Care"
      headline={services?.headline ?? "Understand the care before choosing the next step."}
      intro="Explore common dental care needs and use the enquiry form to discuss what may be appropriate for you."
      items={serviceItems}
    />
    <TrustManifesto
      eyebrow="Our approach"
      headline="Clear information. Thoughtful next steps."
      body="Dental care decisions are personal. This site keeps the first step simple: understand the care area, ask a question and continue with verified clinic guidance."
      note="Specific treatments, clinicians, pricing and outcomes should be confirmed directly with the clinic before care begins."
    />
    <EditorialCtaBand
      eyebrow="Next step"
      headline={cta?.headline ?? "Ready when you are."}
      body="Tell the clinic what you would like help with and continue from there."
      primaryCta={{label:"Start an enquiry",href:"#contact"}}
      secondaryCta={{label:"Review care",href:"#care"}}
    />
    <LocalConversionContact
      eyebrow="Contact"
      headline={contact?.headline ?? "Start with a simple enquiry."}
      body="Share what you would like help with. Verified clinic contact details can be connected before publishing."
      status="Online enquiry preview"
      submitLabel="Send enquiry"
      note="Form submission is not active in this preview yet."
    />
    <FunctionalLocalFooter
      brand={brand}
      description="Clear, patient-friendly dental information with a simple route to enquire."
      location="Hyderabad"
      contactLabel="Enquiry form"
      contactHref="#contact"
      links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]}
      legal="Pearl Dental · Hyderabad"
    />
  </main>;
}
