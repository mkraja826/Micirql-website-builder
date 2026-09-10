import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { generatePearlDentalCandidates } from "../../../../../src/core/generation/pearl";
import { ConversionCleanNavbar } from "../../../../../src/sections/navbar/conversion-clean";
import { QuietLuxuryNavbar } from "../../../../../src/sections/navbar/quiet-luxury";
import { EditorialSplitHero } from "../../../../../src/sections/hero/editorial-split";
import { CinematicFullscreenHero } from "../../../../../src/sections/hero/cinematic-fullscreen";
import { TypographyLedHero } from "../../../../../src/sections/hero/typography-led";
import { ConversionSplitHero } from "../../../../../src/sections/hero/conversion-split";
import { EditorialServiceIndex } from "../../../../../src/sections/services/editorial-index";
import { VisualServiceStories } from "../../../../../src/sections/services/visual-stories";
import { TrustManifesto } from "../../../../../src/sections/about/trust-manifesto";
import { EditorialStory } from "../../../../../src/sections/about/editorial-story";
import { EditorialCtaBand } from "../../../../../src/sections/cta/editorial-band";
import { HumanSplitCta } from "../../../../../src/sections/cta/human-split";
import { LocalConversionContact } from "../../../../../src/sections/contact/local-conversion";
import { FunctionalLocalFooter } from "../../../../../src/sections/footer/functional-local";
import { EditorialMinimalFooter } from "../../../../../src/sections/footer/editorial-minimal";

const careItems = [
  { title: "Preventive care", body: "Support routine oral health with clear, patient-friendly guidance and appropriate preventive care." },
  { title: "Restorative care", body: "Discuss suitable ways to restore comfort and function based on an individual clinical assessment." },
  { title: "Smile-focused care", body: "Explore cosmetic and restorative options without promises about outcomes that have not been clinically assessed." },
];

export default async function PearlCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = generatePearlDentalCandidates(8).find((item) => item.id === id);
  if (!candidate) notFound();

  const style = candidate.cssVariables as CSSProperties;
  const sections = candidate.selectedSections;
  const brand = "Pearl Dental";

  const navbar = sections.navbar === "navbar-quiet-luxury"
    ? <QuietLuxuryNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={{label:"Enquire",href:"#contact"}} />
    : <ConversionCleanNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={{label:"Request appointment",href:"#contact"}} />;

  const heroProps = {
    eyebrow: "Dental care in Hyderabad",
    headline: candidate.direction.visualStyle === "cinematic" || candidate.direction.visualStyle === "immersive-dark" ? "A calmer way to begin dental care." : candidate.direction.visualStyle === "typography-led" ? "Dental care, made easier to understand." : "Calm, considered dental care.",
    body: "Understand common dental care needs, ask questions and take the next step with confidence.",
    primaryCta: { label: "Get in touch", href: "#contact" },
  };

  const hero = sections.hero === "hero-cinematic-fullscreen"
    ? <CinematicFullscreenHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} visualLabel={candidate.direction.label} />
    : sections.hero === "hero-typography-led"
      ? <TypographyLedHero {...heroProps} accent="Pearl" />
      : sections.hero === "hero-conversion-split"
        ? <ConversionSplitHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} proof={["Hyderabad", "Clear next steps", "Patient-friendly information"]} />
        : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} trustItems={[{label:"Hyderabad"},{label:"Clear next steps"},{label:"Patient-friendly information"}]} visualNote="A calm, clear place to begin your dental care journey." />;

  const services = sections.services === "services-visual-stories"
    ? <VisualServiceStories eyebrow="Care" headline="Explore common dental care needs." intro="Start with the care area closest to what you want help with." items={careItems.map((item) => ({ ...item, cta: { label: "Ask about this care", href: "#contact" } }))} />
    : <EditorialServiceIndex eyebrow="Care" headline="Understand the care before choosing the next step." intro="Explore common dental care needs and use the enquiry form to discuss what may be appropriate for you." items={careItems} />;

  const about = sections.about === "about-editorial-story"
    ? <EditorialStory eyebrow="Approach" headline="A clear first step for better-informed care." body="Dental decisions are personal. Pearl Dental’s website keeps the starting point simple and leaves specific clinical recommendations to a verified consultation." />
    : <TrustManifesto eyebrow="Our approach" headline="Clear information. Thoughtful next steps." body="Dental care decisions are personal. This site keeps the first step simple: understand the care area, ask a question and continue with verified clinic guidance." note="Specific treatments, clinicians, pricing and outcomes should be confirmed directly with the clinic before care begins." />;

  const cta = sections.cta === "cta-human-split"
    ? <HumanSplitCta eyebrow="Next step" headline="Ask first. Decide with clarity." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} />
    : <EditorialCtaBand eyebrow="Next step" headline="Ready when you are." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} />;

  const footer = sections.footer === "footer-editorial-minimal"
    ? <EditorialMinimalFooter brand={brand} statement="Clear, patient-friendly dental information with a simple route to enquire." links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} contactLabel="Enquiry form" contactHref="#contact" legal="Pearl Dental · Hyderabad" />
    : <FunctionalLocalFooter brand={brand} description="Clear, patient-friendly dental information with a simple route to enquire." location="Hyderabad" contactLabel="Enquiry form" contactHref="#contact" links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} legal="Pearl Dental · Hyderabad" />;

  return <main style={style}>{navbar}{hero}<div id="care">{services}</div><div id="approach">{about}</div>{cta}<LocalConversionContact eyebrow="Contact" headline="Start with a simple enquiry." body="Share what you would like help with. Verified clinic contact details can be connected before publishing." status="Online enquiry preview" submitLabel="Send enquiry" note="Form submission is not active in this preview yet." />{footer}</main>;
}
