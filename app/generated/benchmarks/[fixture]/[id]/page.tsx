import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { generateMultiIndustryBenchmarkMatrix } from "../../../../../src/benchmarks/multi-industry";
import { resolveMultiIndustryBenchmarkMedia } from "../../../../../src/benchmarks/multi-industry-media";
import { planCapabilitiesFromBrief } from "../../../../../src/core/capabilities/planner";
import { directContent } from "../../../../../src/core/content/director";
import type { SectionContent } from "../../../../../src/core/content/schema";
import { getSectionColorStyle, type ChoreographedSectionType } from "../../../../../src/core/theme/section-choreography";
import type { MediaCandidate } from "../../../../../src/providers/media/schema";
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
import { EditorialProcessSteps } from "../../../../../src/sections/process/editorial-steps";
import { AsymmetricEditorialGallery } from "../../../../../src/sections/gallery/asymmetric-editorial";
import { FeatureMosaicGallery } from "../../../../../src/sections/gallery/feature-mosaic";
import { CalmDisclosureFaq } from "../../../../../src/sections/faq/calm-disclosure";
import { EditorialIndexFaq } from "../../../../../src/sections/faq/editorial-index";
import { LocalConversionContact } from "../../../../../src/sections/contact/local-conversion";
import { EditorialInquiryContact } from "../../../../../src/sections/contact/editorial-inquiry";
import { FunctionalLocalFooter } from "../../../../../src/sections/footer/functional-local";
import { EditorialMinimalFooter } from "../../../../../src/sections/footer/editorial-minimal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function titleFromBrief(brief: string) { return brief.split(",")[0]; }
function placeFromBrief(brief: string) { return brief.split(",")[1]?.trim() ?? ""; }
function svgData(label: string, index: number) {
  const safe = label.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="%23e8e4dc"/><text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="48" fill="%23343b38">${safe}</text><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="24" fill="%23616b66">Neutral fallback ${index + 1}</text></svg>`;
  return `data:image/svg+xml,${svg}`;
}
function renderedMediaItem(label: string, index: number, candidates: MediaCandidate[]) {
  const candidate = candidates[index % Math.max(candidates.length, 1)];
  if (!candidate) return { src:svgData(label,index), alt:`Neutral benchmark fallback for ${label}`, caption:label, provider:"fallback" };
  return { src:candidate.imageUrl, alt:candidate.alt, caption:label, provider:candidate.provider, focalPoint:candidate.focalPoint };
}
function sectionContent(sections: SectionContent[], type: string) {
  return sections.find((section) => section.sectionType === type);
}
function contentItems(section: SectionContent | undefined, fallback: string) {
  const fallbackBody = section?.body ?? "Use verified business information and safe industry context.";
  return section?.items?.length
    ? section.items.map((item) => ({ title:item.title, body:item.body ?? fallbackBody }))
    : [{ title:fallback, body:fallbackBody }];
}

export default async function MultiIndustryCandidatePage({ params }: { params: Promise<{ fixture: string; id: string }> }) {
  const { fixture: fixtureId, id } = await params;
  const entry = generateMultiIndustryBenchmarkMatrix(4).find((item) => item.fixture.id === fixtureId);
  if (!entry) notFound();
  const candidate = entry.candidates.find((item) => item.id === id);
  if (!candidate) notFound();

  const sections = candidate.selectedSections;
  const brand = titleFromBrief(entry.fixture.brief);
  const location = placeFromBrief(entry.fixture.brief);
  const contentPlan = await directContent({ brief:entry.brief, knowledge:entry.knowledge, artDirection:candidate.direction });
  const homeContent = contentPlan.pages.find((page) => page.slug === "home") ?? contentPlan.pages[0];
  if (!homeContent) notFound();
  const heroContent = sectionContent(homeContent.sections,"hero");
  const servicesContent = sectionContent(homeContent.sections,"services");
  const aboutContent = sectionContent(homeContent.sections,"about");
  const processContent = sectionContent(homeContent.sections,"process");
  const galleryContent = sectionContent(homeContent.sections,"gallery");
  const faqContent = sectionContent(homeContent.sections,"faq");
  const ctaContent = sectionContent(homeContent.sections,"cta");
  const contactContent = sectionContent(homeContent.sections,"contact");
  const footerContent = sectionContent(homeContent.sections,"footer");

  const capabilityPlan = planCapabilitiesFromBrief(entry.brief, candidate.direction);
  const primaryCapability = capabilityPlan.capabilities.find((item) => item.id === capabilityPlan.primary) ?? capabilityPlan.capabilities[0];
  if (!primaryCapability) notFound();
  const primaryLabel = primaryCapability.label;
  const primaryAction = { label:primaryLabel, href:primaryCapability.href ?? "#contact" };
  const secondaryAction = { label:heroContent?.secondaryCta?.label ?? ctaContent?.secondaryCta?.label ?? "Explore the offer", href:"#offer" };
  const items = contentItems(servicesContent,"Business offer");
  const principles = contentItems(aboutContent,"Grounded business context");
  const steps = processContent?.items?.length
    ? processContent.items.map((item) => ({ title:item.title, body:item.body ?? processContent.body ?? "Use verified business information and safe industry context." }))
    : [
        { title:"Understand the offer", body:processContent?.body ?? "Start with the relevant business context." },
        { title:"Review the relevant detail", body:"Use verified business information and safe industry context." },
        { title:"Take the next step", body:`Continue through the ${primaryLabel.toLowerCase()} path when more information is needed.` },
      ];
  const faqItems = (contentPlan.faq?.length ? contentPlan.faq : [{ question:faqContent?.headline ?? "What should I know?", answer:faqContent?.body ?? "Use verified business information before publication.", claims:[] }]).map((item) => [item.question,item.answer] as [string,string]);

  const heroSupportsMedia = sections.hero === "hero-editorial-split" || sections.hero === "hero-cinematic-fullscreen";
  const aboutSupportsMedia = sections.about === "about-editorial-story";
  const requestedMediaRoles = [heroSupportsMedia ? "hero" : null, sections.services === "services-visual-stories" ? "services" : null, aboutSupportsMedia ? "about" : null, sections.gallery ? "gallery" : null].filter((role): role is "hero" | "services" | "about" | "gallery" => Boolean(role));
  const resolvedMedia = requestedMediaRoles.length ? await resolveMultiIndustryBenchmarkMedia({ brief:entry.brief, knowledge:entry.knowledge, direction:candidate.direction, roles:requestedMediaRoles }) : {};
  const heroMedia = resolvedMedia.hero ?? [];
  const serviceMedia = resolvedMedia.services ?? [];
  const aboutMedia = resolvedMedia.about ?? [];
  const galleryMedia = resolvedMedia.gallery?.length ? resolvedMedia.gallery : serviceMedia;
  const heroVisual = renderedMediaItem(`${entry.fixture.label}: hero`,0,heroMedia);
  const aboutVisual = renderedMediaItem(`${entry.fixture.label}: about`,0,aboutMedia);
  const galleryItems = items.map((item,index) => renderedMediaItem(`${entry.fixture.label}: ${item.title}`,index,galleryMedia));
  const serviceVisuals = items.map((item,index) => renderedMediaItem(`${entry.fixture.label}: ${item.title}`,index,serviceMedia));
  const realMediaCount = [...heroMedia,...serviceMedia,...aboutMedia,...(resolvedMedia.gallery ?? [])].length;
  const style = candidate.cssVariables as CSSProperties;

  const navbar = sections.navbar === "navbar-quiet-luxury" ? <QuietLuxuryNavbar brand={brand} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} cta={primaryAction} /> : <ConversionCleanNavbar brand={brand} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={primaryAction} />;
  const heroProps = { eyebrow:heroContent?.eyebrow ?? entry.fixture.label, headline:heroContent?.headline ?? brand, body:heroContent?.body ?? homeContent.purpose, primaryCta:primaryAction };
  const hero = sections.hero === "hero-cinematic-fullscreen" ? <CinematicFullscreenHero {...heroProps} secondaryCta={secondaryAction} visualLabel={candidate.direction.label} media={heroMedia.length ? { src:heroVisual.src, alt:heroVisual.alt } : undefined} /> : sections.hero === "hero-typography-led" ? <TypographyLedHero {...heroProps} accent={entry.fixture.label} /> : sections.hero === "hero-conversion-split" ? <ConversionSplitHero {...heroProps} secondaryCta={secondaryAction} proof={[entry.fixture.label,"Grounded content","Clear next step"]} /> : sections.hero === "hero-framed-statement" ? <FramedStatementHero {...heroProps} secondaryCta={secondaryAction} /> : sections.hero === "hero-poster-offset" ? <PosterOffsetHero {...heroProps} secondaryCta={secondaryAction} /> : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={secondaryAction} trustItems={[{label:entry.fixture.label},{label:"Grounded content"},{label:"Clear next step"}]} visualNote={candidate.direction.label} media={heroMedia.length ? { src:heroVisual.src, alt:heroVisual.alt, focalPoint:heroVisual.focalPoint } : undefined} />;
  const servicesEyebrow = servicesContent?.eyebrow ?? "Offer";
  const servicesHeadline = servicesContent?.headline ?? "Understand the offer clearly.";
  const services = sections.services === "services-visual-stories" ? <VisualStoryServices eyebrow={servicesEyebrow} headline={servicesHeadline} stories={items.map((item,index)=>({ title:item.title, body:item.body, media:{src:serviceVisuals[index].src,alt:serviceVisuals[index].alt},link:primaryAction}))} /> : sections.services === "services-banded-list" ? <BandedServiceList eyebrow={servicesEyebrow} headline={servicesHeadline} items={items} /> : sections.services === "services-rail" ? <RailServices eyebrow={servicesEyebrow} headline={servicesHeadline} items={items} /> : sections.services === "services-featured-offer" ? <FeaturedOfferServices eyebrow={servicesEyebrow} headline={servicesHeadline} intro={servicesContent?.body ?? homeContent.purpose} items={items} /> : <EditorialServiceIndex eyebrow={servicesEyebrow} headline={servicesHeadline} intro={servicesContent?.body ?? homeContent.purpose} items={items} />;
  const aboutEyebrow = aboutContent?.eyebrow ?? "About";
  const aboutHeadline = aboutContent?.headline ?? `Understand ${brand}.`;
  const aboutBody = aboutContent?.body ?? homeContent.purpose;
  const about = sections.about === "about-editorial-story" ? <EditorialStory eyebrow={aboutEyebrow} headline={aboutHeadline} body={aboutBody} visualLabel={entry.fixture.label} media={aboutMedia.length ? { src:aboutVisual.src, alt:aboutVisual.alt, focalPoint:aboutVisual.focalPoint } : undefined} /> : sections.about === "about-split-principles" ? <SplitPrinciplesAbout eyebrow={aboutEyebrow} headline={aboutHeadline} body={aboutBody} principles={principles} /> : sections.about === "about-statement-ledger" ? <StatementLedgerAbout eyebrow={aboutEyebrow} headline={aboutHeadline} body={aboutBody} principles={principles} /> : sections.about === "about-manifesto-columns" ? <ManifestoColumnsAbout eyebrow={aboutEyebrow} headline={aboutHeadline} body={aboutBody} principles={principles} /> : <TrustManifesto eyebrow={aboutEyebrow} headline={aboutHeadline} body={aboutBody} note="Unsupported business-specific proof remains excluded until verified." />;
  const process = sections.process ? <EditorialProcessSteps eyebrow={processContent?.eyebrow ?? "Process"} headline={processContent?.headline ?? "A clear path from context to action."} intro={processContent?.body ?? "A useful decision sequence without invented operational claims."} steps={steps} /> : null;
  const gallery = sections.gallery === "gallery-feature-mosaic" ? <FeatureMosaicGallery eyebrow={galleryContent?.eyebrow ?? "Visual story"} headline={galleryContent?.headline ?? "See the business context."} items={galleryItems} /> : sections.gallery === "gallery-asymmetric-editorial" ? <AsymmetricEditorialGallery eyebrow={galleryContent?.eyebrow ?? "Visual story"} headline={galleryContent?.headline ?? "See the business context."} items={galleryItems} /> : null;
  const faq = sections.faq === "faq-editorial-index" ? <EditorialIndexFaq eyebrow={faqContent?.eyebrow ?? "Questions"} headline={faqContent?.headline ?? "Useful context before the next step."} intro={faqContent?.body ?? "Answers stay within verified facts and safe industry context."} items={faqItems} /> : sections.faq === "faq-calm-disclosure" ? <CalmDisclosureFaq eyebrow={faqContent?.eyebrow ?? "Questions"} headline={faqContent?.headline ?? "Useful context before the next step."} items={faqItems} /> : null;
  const ctaProps = { eyebrow:ctaContent?.eyebrow ?? "Next step", headline:ctaContent?.headline ?? `Ready to ${primaryLabel.toLowerCase()}?`, body:ctaContent?.body ?? "Continue when you have enough context to decide what you need.", primaryCta:primaryAction, secondaryCta:secondaryAction };
  const cta = sections.cta === "cta-human-split" ? <HumanSplitCta {...ctaProps} /> : sections.cta === "cta-stacked-statement" ? <StackedStatementCta {...ctaProps} /> : sections.cta === "cta-inverted-marquee" ? <InvertedMarqueeCta {...ctaProps} /> : sections.cta === "cta-decision-panel" ? <DecisionPanelCta {...ctaProps} /> : <EditorialCtaBand {...ctaProps} />;
  const contactProps = { eyebrow:contactContent?.eyebrow ?? "Contact", headline:contactContent?.headline ?? `Continue with ${brand}.`, body:contactContent?.body ?? primaryCapability.reason, status:`${primaryCapability.label} · ${primaryCapability.status.replace(/_/g," ")}`, submitLabel:primaryLabel, note:"No submission is sent from this benchmark route until a real backend is provisioned." };
  const contact = sections.contact === "contact-editorial-inquiry" ? <EditorialInquiryContact {...contactProps} /> : <LocalConversionContact {...contactProps} />;
  const footerDescription = footerContent?.body ?? contentPlan.seo.description;
  const footer = sections.footer === "footer-editorial-minimal" ? <EditorialMinimalFooter brand={brand} statement={footerDescription} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} note={[entry.fixture.label,location].filter(Boolean).join(" · ")} /> : <FunctionalLocalFooter brand={brand} description={footerDescription} location={location || entry.fixture.label} contactLabel={primaryLabel} contactHref={primaryAction.href} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} legal={[brand,location].filter(Boolean).join(" · ")} />;

  const blocks: Record<string,ReactNode> = { navbar, hero, services:<div id="offer">{services}</div>, about:<div id="approach">{about}</div>, process, gallery, faq, cta, contact:<div id="contact">{contact}</div>, footer };
  return <main style={style} data-benchmark-fixture={fixtureId} data-candidate-id={candidate.id} data-art-direction={candidate.direction.visualStyle} data-primary-capability={primaryCapability.id} data-primary-capability-status={primaryCapability.status} data-content-source="deterministic-safe" data-content-warning-count={contentPlan.warnings.length} data-content-section-count={homeContent.sections.length} data-media-source={realMediaCount > 0 ? "provider" : "fallback"} data-media-provider-count={realMediaCount} data-hero-media-source={heroSupportsMedia ? (heroMedia.length ? "provider" : "fallback") : "not-applicable"} data-about-media-source={aboutSupportsMedia ? (aboutMedia.length ? "provider" : "fallback") : "not-applicable"}>{candidate.sectionOrder.map((type,index)=>{ const sectionType=type as ChoreographedSectionType; const archetype=sections[type] ?? type; return <div key={`${type}-${index}`} style={getSectionColorStyle(candidate.theme,candidate.direction,sectionType) as CSSProperties} data-section-tone={sectionType} data-section-archetype={archetype}>{blocks[type]}</div>; })}</main>;
}