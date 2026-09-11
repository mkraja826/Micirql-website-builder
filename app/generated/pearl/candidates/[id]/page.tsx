import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { generatePearlDentalCandidates } from "../../../../../src/benchmarks/pearl";
import { createArtDirectedNarrative } from "../../../../../src/core/content/art-directed-narrative";
import { capability, planDentalCapabilities } from "../../../../../src/core/capabilities/planner";
import { getSectionColorStyle, type ChoreographedSectionType } from "../../../../../src/core/theme/section-choreography";
import { resolvePearlAboutMedia, resolvePearlHeroMedia, resolvePearlServiceMedia } from "../../../../../src/core/media/pearl";
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
import { FeaturedOfferServices } from "../../../../../src/sections/services/featured-offer";
import { TrustManifesto } from "../../../../../src/sections/about/trust-manifesto";
import { EditorialStory } from "../../../../../src/sections/about/editorial-story";
import { SplitPrinciplesAbout } from "../../../../../src/sections/about/split-principles";
import { StatementLedgerAbout } from "../../../../../src/sections/about/statement-ledger";
import { ManifestoColumnsAbout } from "../../../../../src/sections/about/manifesto-columns";
import { EditorialCtaBand } from "../../../../../src/sections/cta/editorial-band";
import { HumanSplitCta } from "../../../../../src/sections/cta/human-split";
import { StackedStatementCta } from "../../../../../src/sections/cta/stacked-statement";
import { InvertedMarqueeCta } from "../../../../../src/sections/cta/inverted-marquee";
import { DecisionPanelCta } from "../../../../../src/sections/cta/decision-panel";
import { CareJourney } from "../../../../../src/sections/process/care-journey";
import { EditorialProcessSteps } from "../../../../../src/sections/process/editorial-steps";
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
const journey = [
  { title: "Start with a question", body: "Share what you would like help with so the clinic can guide the next step." },
  { title: "Discuss the care area", body: "Use verified clinic guidance to understand what may be appropriate for your situation." },
  { title: "Choose the next step", body: "Continue only after questions, options and expectations are clear." },
];

export default async function PearlCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = generatePearlDentalCandidates(20).find((item) => item.id === id);
  if (!candidate) notFound();
  const style = candidate.cssVariables as CSSProperties;
  const sections = candidate.selectedSections;
  const brand = "Pearl Dental";
  const narrative = createArtDirectedNarrative(candidate.direction);
  const capabilityPlan = planDentalCapabilities(candidate.direction);
  const primaryCapability = capability(capabilityPlan, capabilityPlan.primary)!;
  const contactCapability = capability(capabilityPlan, "contact")!;

  const resolvedHeroMedia = await resolvePearlHeroMedia(candidate.direction);
  const usedProviderIds = resolvedHeroMedia ? [resolvedHeroMedia.providerId] : [];
  const resolvedServiceMedia = sections.services === "services-visual-stories" ? await resolvePearlServiceMedia(candidate.direction, usedProviderIds) : [];
  usedProviderIds.push(...resolvedServiceMedia.map((media) => media.providerId));
  const resolvedAboutMedia = sections.about === "about-editorial-story" ? await resolvePearlAboutMedia(candidate.direction, usedProviderIds) : undefined;

  const heroMedia = resolvedHeroMedia ? { src: resolvedHeroMedia.imageUrl, alt: resolvedHeroMedia.alt, focalPoint: resolvedHeroMedia.focalPoint } : undefined;
  const serviceMedia = resolvedServiceMedia.map((media) => ({ src: media.imageUrl, alt: media.alt }));
  const aboutMedia = resolvedAboutMedia ? { src: resolvedAboutMedia.imageUrl, alt: resolvedAboutMedia.alt, focalPoint: resolvedAboutMedia.focalPoint } : undefined;
  const primaryAction = { label: primaryCapability.label, href: primaryCapability.href ?? "#contact" };

  const navbar = sections.navbar === "navbar-quiet-luxury"
    ? <QuietLuxuryNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} cta={primaryAction} />
    : <ConversionCleanNavbar brand={brand} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={primaryAction} />;

  const heroProps = { eyebrow: narrative.hero.eyebrow, headline: narrative.hero.headline, body: narrative.hero.body, primaryCta: primaryAction };
  const secondaryHeroCta = { label: narrative.hero.secondary, href: "#care" };
  const hero = sections.hero === "hero-cinematic-fullscreen" ? <CinematicFullscreenHero {...heroProps} secondaryCta={secondaryHeroCta} media={heroMedia} visualLabel={candidate.direction.label} /> : sections.hero === "hero-typography-led" ? <TypographyLedHero {...heroProps} accent="Pearl" /> : sections.hero === "hero-conversion-split" ? <ConversionSplitHero {...heroProps} secondaryCta={secondaryHeroCta} media={heroMedia} proof={["Hyderabad", "Clear next steps", "Patient-friendly information"]} /> : sections.hero === "hero-framed-statement" ? <FramedStatementHero {...heroProps} secondaryCta={secondaryHeroCta} /> : sections.hero === "hero-poster-offset" ? <PosterOffsetHero {...heroProps} secondaryCta={secondaryHeroCta} /> : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={secondaryHeroCta} trustItems={[{label:"Hyderabad"},{label:"Clear next steps"},{label:"Patient-friendly information"}]} visualNote={narrative.about.headline} media={heroMedia} />;

  const services = sections.services === "services-visual-stories" ? <VisualStoryServices eyebrow="Care" headline={narrative.services.headline} stories={careItems.map((item, index) => ({ ...item, media: serviceMedia[index], link: primaryAction }))} /> : sections.services === "services-banded-list" ? <BandedServiceList eyebrow="Care" headline={narrative.services.headline} items={careItems} /> : sections.services === "services-rail" ? <RailServices eyebrow="Care" headline={narrative.services.headline} items={careItems} /> : sections.services === "services-featured-offer" ? <FeaturedOfferServices eyebrow="Care" headline={narrative.services.headline} intro={narrative.services.intro} items={careItems} /> : <EditorialServiceIndex eyebrow="Care" headline={narrative.services.headline} intro={narrative.services.intro} items={careItems} />;

  const about = sections.about === "about-editorial-story" ? <EditorialStory eyebrow="Approach" headline={narrative.about.headline} body={narrative.about.body} visualLabel="Pearl Dental" media={aboutMedia} /> : sections.about === "about-split-principles" ? <SplitPrinciplesAbout eyebrow="Approach" headline={narrative.about.headline} body={narrative.about.body} principles={principles} /> : sections.about === "about-statement-ledger" ? <StatementLedgerAbout eyebrow="Approach" headline={narrative.about.headline} body={narrative.about.body} principles={principles} /> : sections.about === "about-manifesto-columns" ? <ManifestoColumnsAbout eyebrow="Approach" headline={narrative.about.headline} body={narrative.about.body} principles={principles} /> : <TrustManifesto eyebrow="Our approach" headline={narrative.about.headline} body={narrative.about.body} note="Specific treatments, clinicians, pricing and outcomes should be confirmed directly with the clinic before care begins." />;

  const secondaryCta = { label: narrative.cta.secondary, href: "#care" };
  const cta = sections.cta === "cta-human-split" ? <HumanSplitCta eyebrow="Next step" headline={narrative.cta.headline} body={narrative.cta.body} primaryCta={primaryAction} secondaryCta={secondaryCta} /> : sections.cta === "cta-stacked-statement" ? <StackedStatementCta eyebrow="Next step" headline={narrative.cta.headline} body={narrative.cta.body} primaryCta={primaryAction} secondaryCta={secondaryCta} /> : sections.cta === "cta-inverted-marquee" ? <InvertedMarqueeCta eyebrow="Next step" headline={narrative.cta.headline} body={narrative.cta.body} primaryCta={primaryAction} secondaryCta={secondaryCta} /> : sections.cta === "cta-decision-panel" ? <DecisionPanelCta eyebrow="Next step" headline={narrative.cta.headline} body={narrative.cta.body} primaryCta={primaryAction} secondaryCta={secondaryCta} /> : <EditorialCtaBand eyebrow="Next step" headline={narrative.cta.headline} body={narrative.cta.body} primaryCta={primaryAction} secondaryCta={secondaryCta} />;

  const process = sections.process === "process-editorial-steps" ? <EditorialProcessSteps eyebrow="What to expect" headline={narrative.process.headline} intro="A clear path from the first question to an informed next step." steps={journey} /> : sections.process ? <CareJourney eyebrow="What to expect" headline={narrative.process.headline} steps={journey} /> : null;
  const contact = <LocalConversionContact eyebrow={capabilityPlan.primary === "appointment" ? "Appointment request" : "Contact"} headline={narrative.contact.headline} body={narrative.contact.body} status={contactCapability.status === "preview" ? "Request form preview" : "Online enquiry"} submitLabel={contactCapability.label} note="This preview collects intent only; form submission is not active until a backend is configured." />;
  const footer = sections.footer === "footer-editorial-minimal" ? <EditorialMinimalFooter brand={brand} statement={narrative.footer} links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} note="Pearl Dental · Hyderabad" /> : <FunctionalLocalFooter brand={brand} description={narrative.footer} location="Hyderabad" contactLabel={primaryCapability.label} contactHref="#contact" links={[{label:"Care",href:"#care"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} legal="Pearl Dental · Hyderabad" />;

  const blocks: Record<string, ReactNode> = { navbar, hero, services: <div id="care">{services}</div>, about: <div id="approach">{about}</div>, cta, process, contact: <div id="contact">{contact}</div>, footer };
  const capabilityIds = capabilityPlan.capabilities.map((item) => `${item.id}:${item.status}`).join(",");
  return <main style={style} data-capabilities={capabilityIds}>{candidate.sectionOrder.map((type, index) => {
    const sectionType = type as ChoreographedSectionType;
    const sectionStyle = getSectionColorStyle(candidate.theme, candidate.direction, sectionType) as CSSProperties;
    return <div key={`${type}-${index}`} style={sectionStyle} data-section-tone={sectionType}>{blocks[type]}</div>;
  })}</main>;
}