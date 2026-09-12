import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { generateMultiIndustryBenchmarkMatrix } from "../../../../../src/benchmarks/multi-industry";
import { resolveMultiIndustryBenchmarkMedia } from "../../../../../src/benchmarks/multi-industry-media";
import { planCapabilitiesFromBrief } from "../../../../../src/core/capabilities/planner";
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

export default async function MultiIndustryCandidatePage({ params }: { params: Promise<{ fixture: string; id: string }> }) {
  const { fixture: fixtureId, id } = await params;
  const entry = generateMultiIndustryBenchmarkMatrix(4).find((item) => item.fixture.id === fixtureId);
  if (!entry) notFound();
  const candidate = entry.candidates.find((item) => item.id === id);
  if (!candidate) notFound();

  const copy = entry.fixture.copy;
  const sections = candidate.selectedSections;
  const brand = titleFromBrief(entry.fixture.brief);
  const location = placeFromBrief(entry.fixture.brief);
  const capabilityPlan = planCapabilitiesFromBrief(entry.brief, candidate.direction);
  const primaryCapability = capabilityPlan.capabilities.find((item) => item.id === capabilityPlan.primary) ?? capabilityPlan.capabilities[0];
  if (!primaryCapability) notFound();
  const primaryLabel = primaryCapability.label;
  const primaryAction = { label: primaryLabel, href: primaryCapability.href ?? "#contact" };
  const secondaryAction = { label: entry.fixture.conversionActions[1] ?? "Learn more", href: "#offer" };
  const items = copy.services.map((title) => ({ title, body: `Explore ${title.toLowerCase()} with concise, verifiable information appropriate to this ${entry.fixture.label.toLowerCase()} benchmark.` }));
  const principles = copy.principles.map((title) => ({ title, body: "This benchmark keeps the structure useful while avoiding invented business claims, people, prices, ratings or outcomes." }));
  const steps = [
    { title:"Understand the offer", body:"Start with the business context and the decision the visitor is trying to make." },
    { title:"Review the relevant detail", body:"Present only the information that is appropriate and supported by the supplied brief." },
    { title:"Take the next step", body:`Continue through the ${primaryLabel.toLowerCase()} path when more information is needed.` },
  ];
  const faqItems = copy.faq.map((question) => [question, "This benchmark intentionally avoids inventing unsupported facts. Verified business information should be supplied before publication."] as [string,string]);
  const heroSupportsMedia = sections.hero === "hero-editorial-split" || sections.hero === "hero-cinematic-fullscreen";
  const aboutSupportsMedia = sections.about === "about-editorial-story";
  const requestedMediaRoles = [heroSupportsMedia ? "hero" : null, sections.services === "services-visual-stories" ? "services" : null, aboutSupportsMedia ? "about" : null, sections.gallery ? "gallery" : null].filter((role): role is "hero" | "services" | "about" | "gallery" => Boolean(role));
  const resolvedMedia = requestedMediaRoles.length ? await resolveMultiIndustryBenchmarkMedia({ brief:entry.brief, knowledge:entry.knowledge, direction:candidate.direction, roles:requestedMediaRoles }) : {};
  const heroMedia = resolvedMedia.hero ?? [];
  const serviceMedia = resolvedMedia.services ?? [];
  const aboutMedia = resolvedMedia.about ?? [];
  const galleryMedia = resolvedMedia.gallery?.length ? resolvedMedia.gallery : serviceMedia;
  const heroVisual = renderedMediaItem(`${entry.fixture.label}: hero`, 0, heroMedia);
  const aboutVisual = renderedMediaItem(`${entry.fixture.label}: about`, 0, aboutMedia);
  const galleryItems = copy.services.map((title,index) => renderedMediaItem(`${entry.fixture.label}: ${title}`, index, galleryMedia));
  const serviceVisuals = copy.services.map((title,index) => renderedMediaItem(`${entry.fixture.label}: ${title}`, index, serviceMedia));
  const realMediaCount = [...heroMedia, ...serviceMedia, ...aboutMedia, ...(resolvedMedia.gallery ?? [])].length;
  const style = candidate.cssVariables as CSSProperties;

  const navbar = sections.navbar === "navbar-quiet-luxury" ? <QuietLuxuryNavbar brand={brand} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} cta={primaryAction} /> : <ConversionCleanNavbar brand={brand} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} primaryCta={primaryAction} />;
  const heroProps = { eyebrow:entry.fixture.label, headline:copy.offer, body:`${brand}${location ? ` · ${location}` : ""}. This rendered fixture tests MiCirql's shared multi-industry composition engine.`, primaryCta:primaryAction };
  const hero = sections.hero === "hero-cinematic-fullscreen" ? <CinematicFullscreenHero {...heroProps} secondaryCta={secondaryAction} visualLabel={candidate.direction.label} media={heroMedia.length ? { src:heroVisual.src, alt:heroVisual.alt } : undefined} /> : sections.hero === "hero-typography-led" ? <TypographyLedHero {...heroProps} accent={entry.fixture.label} /> : sections.hero === "hero-conversion-split" ? <ConversionSplitHero {...heroProps} secondaryCta={secondaryAction} proof={[entry.fixture.label,"Verified-content first","Clear next step"]} /> : sections.hero === "hero-framed-statement" ? <FramedStatementHero {...heroProps} secondaryCta={secondaryAction} /> : sections.hero === "hero-poster-offset" ? <PosterOffsetHero {...heroProps} secondaryCta={secondaryAction} /> : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={secondaryAction} trustItems={[{label:entry.fixture.label},{label:"Grounded content"},{label:"Clear next step"}]} visualNote={candidate.direction.label} media={heroMedia.length ? { src:heroVisual.src, alt:heroVisual.alt, focalPoint:heroVisual.focalPoint } : undefined} />;
  const services = sections.services === "services-visual-stories" ? <VisualStoryServices eyebrow="Offer" headline="What the visitor needs to understand." stories={items.map((item,index)=>({...item,media:{src:serviceVisuals[index].src,alt:serviceVisuals[index].alt},link:primaryAction}))} /> : sections.services === "services-banded-list" ? <BandedServiceList eyebrow="Offer" headline="What the visitor needs to understand." items={items} /> : sections.services === "services-rail" ? <RailServices eyebrow="Offer" headline="What the visitor needs to understand." items={items} /> : sections.services === "services-featured-offer" ? <FeaturedOfferServices eyebrow="Offer" headline="What the visitor needs to understand." intro={copy.offer} items={items} /> : <EditorialServiceIndex eyebrow="Offer" headline="What the visitor needs to understand." intro={copy.offer} items={items} />;
  const about = sections.about === "about-editorial-story" ? <EditorialStory eyebrow="Approach" headline="Built around the decision, not a generic template." body="The same MiCirql engine adapts section structure, rhythm and art direction to the interpreted business brief." visualLabel={entry.fixture.label} media={aboutMedia.length ? { src:aboutVisual.src, alt:aboutVisual.alt, focalPoint:aboutVisual.focalPoint } : undefined} /> : sections.about === "about-split-principles" ? <SplitPrinciplesAbout eyebrow="Approach" headline="A grounded structure for this business type." body="The benchmark keeps specialization in industry knowledge while preserving an industry-neutral core." principles={principles} /> : sections.about === "about-statement-ledger" ? <StatementLedgerAbout eyebrow="Approach" headline="A grounded structure for this business type." body="The benchmark keeps specialization in industry knowledge while preserving an industry-neutral core." principles={principles} /> : sections.about === "about-manifesto-columns" ? <ManifestoColumnsAbout eyebrow="Approach" headline="A grounded structure for this business type." body="The benchmark keeps specialization in industry knowledge while preserving an industry-neutral core." principles={principles} /> : <TrustManifesto eyebrow="Approach" headline="Useful structure without fabricated proof." body="MiCirql should adapt to the industry without inventing facts the business did not provide." note="Names, ratings, prices, credentials, outcomes and other unsupported claims remain excluded." />;
  const process = sections.process ? <EditorialProcessSteps eyebrow="Process" headline="A clear path from context to action." intro="The sequence stays understandable across industries." steps={steps} /> : null;
  const gallery = sections.gallery === "gallery-feature-mosaic" ? <FeatureMosaicGallery eyebrow="Visual story" headline="A visual structure appropriate to the business context." items={galleryItems} /> : sections.gallery === "gallery-asymmetric-editorial" ? <AsymmetricEditorialGallery eyebrow="Visual story" headline="A visual structure appropriate to the business context." items={galleryItems} /> : null;
  const faq = sections.faq === "faq-editorial-index" ? <EditorialIndexFaq eyebrow="Questions" headline="Useful context before the next step." intro="Answers stay grounded in what the benchmark actually knows." items={faqItems} /> : sections.faq === "faq-calm-disclosure" ? <CalmDisclosureFaq eyebrow="Questions" headline="Useful context before the next step." items={faqItems} /> : null;
  const cta = sections.cta === "cta-human-split" ? <HumanSplitCta eyebrow="Next step" headline={`Ready to ${primaryLabel.toLowerCase()}?`} body="Continue when you need verified business-specific information." primaryCta={primaryAction} secondaryCta={secondaryAction} /> : sections.cta === "cta-stacked-statement" ? <StackedStatementCta eyebrow="Next step" headline={`Ready to ${primaryLabel.toLowerCase()}?`} body="Continue when you need verified business-specific information." primaryCta={primaryAction} secondaryCta={secondaryAction} /> : sections.cta === "cta-inverted-marquee" ? <InvertedMarqueeCta eyebrow="Next step" headline={`Ready to ${primaryLabel.toLowerCase()}?`} body="Continue when you need verified business-specific information." primaryCta={primaryAction} secondaryCta={secondaryAction} /> : sections.cta === "cta-decision-panel" ? <DecisionPanelCta eyebrow="Next step" headline={`Ready to ${primaryLabel.toLowerCase()}?`} body="Continue when you need verified business-specific information." primaryCta={primaryAction} secondaryCta={secondaryAction} /> : <EditorialCtaBand eyebrow="Next step" headline={`Ready to ${primaryLabel.toLowerCase()}?`} body="Continue when you need verified business-specific information." primaryCta={primaryAction} secondaryCta={secondaryAction} />;
  const contactProps = { eyebrow:"Contact", headline:`Continue with ${brand}.`, body:primaryCapability.reason, status:`${primaryCapability.label} · ${primaryCapability.status.replace(/_/g," ")}`, submitLabel:primaryLabel, note:"No submission is sent from this benchmark route until a real backend is provisioned." };
  const contact = sections.contact === "contact-editorial-inquiry" ? <EditorialInquiryContact {...contactProps} /> : <LocalConversionContact {...contactProps} />;
  const footer = sections.footer === "footer-editorial-minimal" ? <EditorialMinimalFooter brand={brand} statement={copy.offer} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} note={[entry.fixture.label,location].filter(Boolean).join(" · ")} /> : <FunctionalLocalFooter brand={brand} description={copy.offer} location={location || entry.fixture.label} contactLabel={primaryLabel} contactHref={primaryAction.href} links={[{label:"Offer",href:"#offer"},{label:"Approach",href:"#approach"},{label:"Contact",href:"#contact"}]} legal={[brand,location].filter(Boolean).join(" · ")} />;

  const blocks: Record<string,ReactNode> = { navbar, hero, services:<div id="offer">{services}</div>, about:<div id="approach">{about}</div>, process, gallery, faq, cta, contact:<div id="contact">{contact}</div>, footer };
  return <main style={style} data-benchmark-fixture={fixtureId} data-candidate-id={candidate.id} data-primary-capability={primaryCapability.id} data-primary-capability-status={primaryCapability.status} data-media-source={realMediaCount > 0 ? "provider" : "fallback"} data-media-provider-count={realMediaCount} data-hero-media-source={heroSupportsMedia ? (heroMedia.length ? "provider" : "fallback") : "not-applicable"} data-about-media-source={aboutSupportsMedia ? (aboutMedia.length ? "provider" : "fallback") : "not-applicable"}>{candidate.sectionOrder.map((type,index)=>{ const sectionType=type as ChoreographedSectionType; return <div key={`${type}-${index}`} style={getSectionColorStyle(candidate.theme,candidate.direction,sectionType) as CSSProperties} data-section-tone={sectionType}>{blocks[type]}</div>; })}</main>;
}
