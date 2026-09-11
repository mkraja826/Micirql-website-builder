import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { generatePearlDentalCandidates } from "../../../../../src/core/generation/pearl";
import { ConversionCleanNavbar } from "../../../../../src/sections/navbar/conversion-clean";
import { QuietLuxuryNavbar } from "../../../../../src/sections/navbar/quiet-luxury";
import { EditorialSplitHero } from "../../../../../src/sections/hero/editorial-split";
import { CinematicFullscreenHero } from "../../../../../src/sections/hero/cinematic-fullscreen";
import { TypographyLedHero } from "../../../../../src/sections/hero/typography-led";
import { ConversionSplitHero } from "../../../../../src/sections/hero/conversion-split";
import { FramedStatementHero } from "../../../../../src/sections/hero/framed-statement";
import { PosterOffsetHero } from "../../../../../src/sections/hero/poster-offset";
import { EditorialServiceIndex } from "../../../../../src/sections/services/editorial-index";
import { VisualStoryServices } from "../../../../../src/sections/services/visual-stories";
import { BandedServiceList } from "../../../../../src/sections/services/banded-list";
import { RailServices } from "../../../../../src/sections/services/rail";
import { TrustManifesto } from "../../../../../src/sections/about/trust-manifesto";
import { EditorialStory } from "../../../../../src/sections/about/editorial-story";
import { SplitPrinciplesAbout } from "../../../../../src/sections/about/split-principles";
import { StatementLedgerAbout } from "../../../../../src/sections/about/statement-ledger";
import { EditorialCtaBand } from "../../../../../src/sections/cta/editorial-band";
import { HumanSplitCta } from "../../../../../src/sections/cta/human-split";
import { StackedStatementCta } from "../../../../../src/sections/cta/stacked-statement";
import { InvertedMarqueeCta } from "../../../../../src/sections/cta/inverted-marquee";
import { LocalConversionContact } from "../../../../../src/sections/contact/local-conversion";
import { FunctionalLocalFooter } from "../../../../../src/sections/footer/functional-local";
import { EditorialMinimalFooter } from "../../../../../src/sections/footer/editorial-minimal";

const careItems = [
  { title: "Preventive care", body: "Support routine oral health with clear, patient-friendly guidance and appropriate preventive care." },
  { title: "Restorative care", body: "Discuss suitable ways to restore comfort and function based on an individual clinical assessment." },
  { title: "Smile-focused care", body: "Explore cosmetic and restorative options without promises about outcomes that have not been clinically assessed." },
];
const principles = [
  { title: "Understand first", body: "Begin with clear information about the care area before deciding what to discuss with the clinic." },
  { title: "Keep claims grounded", body: "Specific clinicians, pricing and outcomes stay outside the website until the clinic verifies them." },
  { title: "Make the next step simple", body: "Use the enquiry path to continue with clinic guidance rather than presenting a generic promise." },
];

export default async function PearlCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = generatePearlDentalCandidates(20).find((item) => item.id === id);
  if (!candidate) notFound();
  const style = candidate.cssVariables as CSSProperties;
  const sections = candidate.selectedSections;
  const brand = "Pearl Dental";
  const navbar = sections.navbar === "navbar-quiet-luxury"
    ? <QuietLuxuryNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} cta={{label:"Enquire",href:"#contact"}} />
    : <ConversionCleanNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={{label:"Request appointment",href:"#contact"}} />;
  const heroProps = { eyebrow: "Dental care in Hyderabad", headline: candidate.direction.visualStyle === "cinematic" || candidate.direction.visualStyle === "immersive-dark" ? "A calmer way to begin dental care." : candidate.direction.visualStyle === "typography-led" || candidate.direction.visualStyle === "statement-first" || candidate.direction.visualStyle === "bold-contrast" ? "Dental care, made easier to understand." : "Calm, considered dental care.", body: "Understand common dental care needs, ask questions and take the next step with confidence.", primaryCta: { label: "Get in touch", href: "#contact" } };
  const hero = sections.hero === "hero-cinematic-fullscreen" ? <CinematicFullscreenHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} visualLabel={candidate.direction.label} /> : sections.hero === "hero-typography-led" ? <TypographyLedHero {...heroProps} accent="Pearl" /> : sections.hero === "hero-conversion-split" ? <ConversionSplitHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} proof={["Hyderabad", "Clear next steps", "Patient-friendly information"]} /> : sections.hero === "hero-framed-statement" ? <FramedStatementHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} /> : sections.hero === "hero-poster-offset" ? <PosterOffsetHero {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} /> : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={{label:"Explore care",href:"#care"}} trustItems={[{label:"Hyderabad"},{label:"Clear next steps"},{label:"Patient-friendly information"}]} visualNote="A calm, clear place to begin your dental care journey." />;
  const services = sections.services === "services-visual-stories" ? <VisualStoryServices eyebrow="Care" headline="Explore common dental care needs." stories={careItems.map((item) => ({ ...item, link: { label: "Ask about this care", href: "#contact" } }))} /> : sections.services === "services-banded-list" ? <BandedServiceList eyebrow="Care" headline="Care areas, presented with clarity." items={careItems} /> : sections.services === "services-rail" ? <RailServices eyebrow="Care" headline="Three clear routes into everyday dental care." items={careItems} /> : <EditorialServiceIndex eyebrow="Care" headline="Understand the care before choosing the next step." intro="Explore common dental care needs and use the enquiry form to discuss what may be appropriate for you." items={careItems} />;
  const about = sections.about === "about-editorial-story" ? <EditorialStory eyebrow="Approach" headline="A clear first step for better-informed care." body="Dental decisions are personal. Pearl Dental’s website keeps the starting point simple and leaves specific clinical recommendations to a verified consultation." /> : sections.about === "about-split-principles" ? <SplitPrinciplesAbout eyebrow="Approach" headline="A thoughtful route from question to care." body="The website supports informed first steps while keeping clinical recommendations with the clinic." principles={principles} /> : sections.about === "about-statement-ledger" ? <StatementLedgerAbout eyebrow="Approach" headline="Clarity is part of the care experience." body="The website supports informed first steps while keeping specific clinical recommendations with the clinic." principles={principles} /> : <TrustManifesto eyebrow="Our approach" headline="Clear information. Thoughtful next steps." body="Dental care decisions are personal. This site keeps the first step simple: understand the care area, ask a question and continue with verified clinic guidance." note="Specific treatments, clinicians, pricing and outcomes should be confirmed directly with the clinic before care begins." />;
  const cta = sections.cta === "cta-human-split" ? <HumanSplitCta eyebrow="Next step" headline="Ask first. Decide with clarity." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} /> : sections.cta === "cta-stacked-statement" ? <StackedStatementCta eyebrow="Next step" headline="A clearer next step starts with one question." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} /> : sections.cta === "cta-inverted-marquee" ? <InvertedMarqueeCta eyebrow="Next step" headline="Ask. Understand. Then decide." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} /> : <EditorialCtaBand eyebrow="Next step" headline="Ready when you are." body="Tell the clinic what you would like help with and continue from there." primaryCta={{label:"Start an enquiry",href:"#contact"}} secondaryCta={{label:"Review care",href:"#care"}} />;
  const footer = sections.footer === "footer-editorial-minimal" ? <EditorialMinimalFooter brand={brand} statement="Clear, patient-friendly dental information with a simple route to enquire." links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} note="Pearl Dental · Hyderabad" /> : <FunctionalLocalFooter brand={brand} description="Clear, patient-friendly dental information with a simple route to enquire." location="Hyderabad" contactLabel="Enquiry form" contactHref="#contact" links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} legal="Pearl Dental · Hyderabad" />;
  return <main style={style}>{navbar}{hero}<div id="care">{services}</div><div id="approach">{about}</div>{cta}<LocalConversionContact eyebrow="Contact" headline="Start with a simple enquiry." body="Share what you would like help with. Verified clinic contact details can be connected before publishing." status="Online enquiry preview" submitLabel="Send enquiry" note="Form submission is not active in this preview yet." />{footer}</main>;
}
