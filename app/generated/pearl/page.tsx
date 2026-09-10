import type { CSSProperties } from "react";
import { generatePearlDentalBenchmark } from "../../../src/core/generation/pearl";
import { ConversionCleanNavbar } from "../../../src/sections/navbar/conversion-clean";
import { EditorialSplitHero } from "../../../src/sections/hero/editorial-split";
import { EditorialServiceIndex } from "../../../src/sections/services/editorial-index";
import { EditorialCtaBand } from "../../../src/sections/cta/editorial-band";
import { LocalConversionContact } from "../../../src/sections/contact/local-conversion";
import { FunctionalLocalFooter } from "../../../src/sections/footer/functional-local";

export default async function GeneratedPearlPage() {
  const generated = await generatePearlDentalBenchmark();
  const home = generated.content.pages.find((page) => page.slug === "home") ?? generated.content.pages[0];
  const section = (type: string) => home.sections.find((item) => item.sectionType === type);
  const hero = section("hero");
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
      links={[{label:"Care",href:"#care"},{label:"About",href:"#about"},{label:"Contact",href:"#contact"}]}
      primaryCta={{label:"Book appointment",href:"#contact"}}
    />
    <EditorialSplitHero
      brand={brand}
      eyebrow="Dental care in Hyderabad"
      headline={hero?.headline ?? "Calm, considered dental care."}
      body={hero?.body ?? "A clear introduction to Pearl Dental, shaped around reassurance, useful information and an easy next step."}
      primaryCta={{label:hero?.primaryCta?.label ?? "Book appointment",href:"#contact"}}
      secondaryCta={{label:"Explore care",href:"#care"}}
      trustItems={[{label:"Hyderabad"},{label:"Clear next steps"},{label:"Patient-friendly information"}]}
      visualNote="Automatically composed from the MiCirql V1 pipeline"
    />
    <EditorialServiceIndex
      eyebrow="Care"
      headline={services?.headline ?? "Understand the care before choosing the next step."}
      intro={services?.body ?? "These are general care categories for the benchmark. Specific services must be verified before a production site is published."}
      items={serviceItems}
    />
    <section className="manifesto shell" id="about">
      <p className="eyebrow">About this benchmark</p>
      <h2>Generated from a two-part brief: Pearl Dental, Hyderabad.</h2>
      <p>This page is assembled through Brief Interpreter → Industry Knowledge → Art Director → Content Director → Theme Intelligence → complete-section selection → deterministic rendering. Unknown business facts remain intentionally absent.</p>
    </section>
    <EditorialCtaBand
      eyebrow="Next step"
      headline={cta?.headline ?? "Ready when you are."}
      body={cta?.body ?? "Use the enquiry route to start a conversation without relying on unverified phone, address, pricing or staff details."}
      primaryCta={{label:cta?.primaryCta?.label ?? "Book appointment",href:"#contact"}}
      secondaryCta={{label:"Review care",href:"#care"}}
    />
    <LocalConversionContact
      eyebrow="Contact"
      headline={contact?.headline ?? "Start with a simple enquiry."}
      body={contact?.body ?? "Share what you would like help with. Verified clinic contact details can be connected before publishing."}
      status="Benchmark form — backend capability not activated yet"
      submitLabel="Send enquiry"
      note="This milestone validates composition first; functional backend activation follows in the backend-capability phase."
    />
    <FunctionalLocalFooter
      brand={brand}
      description="Automatically generated V1 benchmark with business-specific unknowns kept out of published copy."
      location="Hyderabad"
      contactLabel="Enquiry form"
      contactHref="#contact"
      links={[{label:"Care",href:"#care"},{label:"About",href:"#about"},{label:"Contact",href:"#contact"}]}
      legal="MiCirql automatic Pearl Dental benchmark"
    />
  </main>;
}
