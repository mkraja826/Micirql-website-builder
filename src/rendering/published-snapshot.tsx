import type { CSSProperties, ReactNode } from "react";
import type { SectionContent } from "../core/content/schema";
import type { MaterializedSiteSnapshot } from "../core/materialization/schema";
import { buildPublishedRequestAction, type PublishedSiteRuntime } from "../core/publish/runtime";
import { ConversionCleanNavbar } from "../sections/navbar/conversion-clean";
import { QuietLuxuryNavbar } from "../sections/navbar/quiet-luxury";
import { EditorialSplitHero } from "../sections/hero/editorial-split";
import { CinematicFullscreenHero } from "../sections/hero/cinematic-fullscreen";
import { TypographyLedHero } from "../sections/hero/typography-led";
import { ConversionSplitHero } from "../sections/hero/conversion-split";
import { FramedStatementHero } from "../sections/hero/framed-statement";
import { PosterOffsetHero } from "../sections/hero/poster-offset";
import { EditorialServiceIndex } from "../sections/services/editorial-index";
import { VisualStoryServices } from "../sections/services/visual-stories";
import { BandedServiceList } from "../sections/services/banded-list";
import { RailServices } from "../sections/services/rail";
import { FeaturedOfferServices } from "../sections/services/featured-offer";
import { TrustManifesto } from "../sections/about/trust-manifesto";
import { EditorialStory } from "../sections/about/editorial-story";
import { SplitPrinciplesAbout } from "../sections/about/split-principles";
import { StatementLedgerAbout } from "../sections/about/statement-ledger";
import { ManifestoColumnsAbout } from "../sections/about/manifesto-columns";
import { EditorialCtaBand } from "../sections/cta/editorial-band";
import { HumanSplitCta } from "../sections/cta/human-split";
import { StackedStatementCta } from "../sections/cta/stacked-statement";
import { InvertedMarqueeCta } from "../sections/cta/inverted-marquee";
import { DecisionPanelCta } from "../sections/cta/decision-panel";
import { EditorialProcessSteps } from "../sections/process/editorial-steps";
import { AsymmetricEditorialGallery } from "../sections/gallery/asymmetric-editorial";
import { FeatureMosaicGallery } from "../sections/gallery/feature-mosaic";
import { CalmDisclosureFaq } from "../sections/faq/calm-disclosure";
import { EditorialIndexFaq } from "../sections/faq/editorial-index";
import { LocalConversionContact } from "../sections/contact/local-conversion";
import { EditorialInquiryContact } from "../sections/contact/editorial-inquiry";
import { FunctionalLocalFooter } from "../sections/footer/functional-local";
import { EditorialMinimalFooter } from "../sections/footer/editorial-minimal";

export type PublishedSnapshotRendererInput = {
  snapshot: MaterializedSiteSnapshot;
  runtime: PublishedSiteRuntime;
  pageSlug: string;
};

function sectionContent(sections: SectionContent[], type: string) {
  return sections.find((section) => section.sectionType === type);
}

function contentItems(section: SectionContent | undefined) {
  return (section?.items ?? []).map((item) => ({ title: item.title, body: item.body ?? section?.body ?? "" }));
}

const supportedSections: Record<string, readonly string[]> = {
  navbar: ["navbar-quiet-luxury", "navbar-conversion-clean"],
  hero: ["hero-cinematic-fullscreen", "hero-typography-led", "hero-conversion-split", "hero-framed-statement", "hero-poster-offset", "hero-editorial-split"],
  services: ["services-visual-stories", "services-banded-list", "services-rail", "services-featured-offer", "services-editorial-index"],
  about: ["about-editorial-story", "about-split-principles", "about-statement-ledger", "about-manifesto-columns", "about-trust-manifesto"],
  process: ["process-editorial-steps"],
  gallery: ["gallery-feature-mosaic", "gallery-asymmetric-editorial"],
  faq: ["faq-editorial-index", "faq-calm-disclosure"],
  cta: ["cta-human-split", "cta-stacked-statement", "cta-inverted-marquee", "cta-decision-panel", "cta-editorial-band"],
  contact: ["contact-editorial-inquiry", "contact-local-conversion"],
  footer: ["footer-editorial-minimal", "footer-functional-local"],
};

function anchorFor(type: string) {
  if (type === "services") return "offer";
  if (type === "about" || type === "process") return "approach";
  if (type === "contact") return "contact";
  return type;
}

function mediaFor(snapshot: MaterializedSiteSnapshot, pageSlug: string, sectionType: string, role: string) {
  return snapshot.snapshot.media
    .filter((asset) => asset.pageSlug === pageSlug && asset.sectionType === sectionType && asset.role === role)
    .sort((a, b) => a.index - b.index);
}

function renderMedia(asset: MaterializedSiteSnapshot["snapshot"]["media"][number] | undefined) {
  return asset ? { src: asset.src, alt: asset.alt, focalPoint: asset.focalPoint } : undefined;
}

function displayName(snapshot: MaterializedSiteSnapshot, pageTitle: string) {
  const home = snapshot.snapshot.content.pages.find((page) => page.slug === "home") ?? snapshot.snapshot.content.pages[0];
  const hero = home ? sectionContent(home.sections, "hero") : undefined;
  return hero?.eyebrow?.trim() || snapshot.snapshot.content.seo.title?.trim() || pageTitle;
}

function primaryAction(snapshot: MaterializedSiteSnapshot) {
  const capability = snapshot.snapshot.capabilities.find((item) => item.id === snapshot.snapshot.primaryCapability)
    ?? snapshot.snapshot.capabilities.find((item) => item.state === "active")
    ?? snapshot.snapshot.capabilities[0];
  return capability
    ? { label: capability.label, href: capability.href ?? "#contact", capabilityKey: capability.id }
    : { label: "Contact", href: "#contact", capabilityKey: "contact" };
}

export function renderPublishedSnapshot({ snapshot, runtime, pageSlug }: PublishedSnapshotRendererInput): ReactNode | null {
  if (runtime.status !== "published" || runtime.renderedVersionId !== runtime.publishedVersionId) return null;

  const persistedPage = snapshot.snapshot.pages.find((page) => page.slug === pageSlug);
  const contentPage = snapshot.snapshot.content.pages.find((page) => page.slug === pageSlug);
  if (!persistedPage || !contentPage) return null;

  const selected = snapshot.snapshot.selectedSections;
  if (persistedPage.sectionOrder.some((type) =>
    !supportedSections[type]?.includes(selected[type as keyof typeof selected] ?? "") ||
    (!["navbar", "footer"].includes(type) && !sectionContent(contentPage.sections, type))
  )) return null;
  const brand = displayName(snapshot, contentPage.title);
  const primary = primaryAction(snapshot);
  const primaryLink = { label: primary.label, href: primary.href };
  const heroContent = sectionContent(contentPage.sections, "hero");
  const servicesContent = sectionContent(contentPage.sections, "services");
  const aboutContent = sectionContent(contentPage.sections, "about");
  const processContent = sectionContent(contentPage.sections, "process");
  const galleryContent = sectionContent(contentPage.sections, "gallery");
  const faqContent = sectionContent(contentPage.sections, "faq");
  const ctaContent = sectionContent(contentPage.sections, "cta");
  const contactContent = sectionContent(contentPage.sections, "contact");
  const footerContent = sectionContent(contentPage.sections, "footer");
  const secondaryLink = { label: heroContent?.secondaryCta?.label ?? ctaContent?.secondaryCta?.label ?? "Explore", href: "#offer" };
  const items = contentItems(servicesContent);
  const principles = contentItems(aboutContent);
  const steps = contentItems(processContent);
  const faqItems = (snapshot.snapshot.content.faq ?? []).map((item) => [item.question, item.answer] as [string, string]);

  const heroMedia = mediaFor(snapshot, pageSlug, "hero", "hero");
  const serviceMedia = mediaFor(snapshot, pageSlug, "services", "services");
  const aboutMedia = mediaFor(snapshot, pageSlug, "about", "about");
  const galleryMedia = mediaFor(snapshot, pageSlug, "gallery", "gallery");
  const serviceVisuals = items.map((_, index) => serviceMedia[index]);
  const galleryItems = galleryMedia.map((asset, index) => ({ src: asset.src, alt: asset.alt, caption: galleryContent?.items?.[index]?.title }));

  const navbar = selected.navbar === "navbar-quiet-luxury"
    ? <QuietLuxuryNavbar brand={brand} links={[{ label: "Offer", href: "#offer" }, { label: "Approach", href: "#approach" }, { label: "Contact", href: "#contact" }]} cta={primaryLink} />
    : <ConversionCleanNavbar brand={brand} links={[{ label: "Offer", href: "#offer" }, { label: "Approach", href: "#approach" }, { label: "Contact", href: "#contact" }]} primaryCta={primaryLink} />;

  const heroProps = { eyebrow: heroContent?.eyebrow ?? "", headline: heroContent?.headline ?? contentPage.title, body: heroContent?.body ?? contentPage.purpose, primaryCta: primaryLink };
  const hero = selected.hero === "hero-cinematic-fullscreen"
    ? <CinematicFullscreenHero {...heroProps} secondaryCta={secondaryLink} visualLabel={brand} media={renderMedia(heroMedia[0])} />
    : selected.hero === "hero-typography-led" ? <TypographyLedHero {...heroProps} accent={brand} />
    : selected.hero === "hero-conversion-split" ? <ConversionSplitHero {...heroProps} secondaryCta={secondaryLink} media={renderMedia(heroMedia[0])} />
    : selected.hero === "hero-framed-statement" ? <FramedStatementHero {...heroProps} secondaryCta={secondaryLink} />
    : selected.hero === "hero-poster-offset" ? <PosterOffsetHero {...heroProps} secondaryCta={secondaryLink} media={renderMedia(heroMedia[0])} />
    : <EditorialSplitHero brand={brand} {...heroProps} secondaryCta={secondaryLink} trustItems={[]} visualNote={brand} media={renderMedia(heroMedia[0])} />;

  const services = selected.services === "services-visual-stories"
    ? <VisualStoryServices eyebrow={servicesContent?.eyebrow ?? ""} headline={servicesContent?.headline ?? ""} stories={items.map((item, index) => ({ title: item.title, body: item.body, media: renderMedia(serviceVisuals[index]), link: primaryLink }))} />
    : selected.services === "services-banded-list" ? <BandedServiceList eyebrow={servicesContent?.eyebrow ?? ""} headline={servicesContent?.headline ?? ""} items={items} />
    : selected.services === "services-rail" ? <RailServices eyebrow={servicesContent?.eyebrow ?? ""} headline={servicesContent?.headline ?? ""} items={items} />
    : selected.services === "services-featured-offer" ? <FeaturedOfferServices eyebrow={servicesContent?.eyebrow ?? ""} headline={servicesContent?.headline ?? ""} intro={servicesContent?.body ?? contentPage.purpose} items={items} />
    : <EditorialServiceIndex eyebrow={servicesContent?.eyebrow ?? ""} headline={servicesContent?.headline ?? ""} intro={servicesContent?.body ?? contentPage.purpose} items={items} />;

  const about = selected.about === "about-editorial-story"
    ? <EditorialStory eyebrow={aboutContent?.eyebrow ?? ""} headline={aboutContent?.headline ?? brand} body={aboutContent?.body ?? contentPage.purpose} visualLabel={brand} media={renderMedia(aboutMedia[0])} />
    : selected.about === "about-split-principles" ? <SplitPrinciplesAbout eyebrow={aboutContent?.eyebrow ?? ""} headline={aboutContent?.headline ?? brand} body={aboutContent?.body ?? contentPage.purpose} principles={principles} />
    : selected.about === "about-statement-ledger" ? <StatementLedgerAbout eyebrow={aboutContent?.eyebrow ?? ""} headline={aboutContent?.headline ?? brand} body={aboutContent?.body ?? contentPage.purpose} principles={principles} />
    : selected.about === "about-manifesto-columns" ? <ManifestoColumnsAbout eyebrow={aboutContent?.eyebrow ?? ""} headline={aboutContent?.headline ?? brand} body={aboutContent?.body ?? contentPage.purpose} principles={principles} />
    : <TrustManifesto eyebrow={aboutContent?.eyebrow ?? ""} headline={aboutContent?.headline ?? brand} body={aboutContent?.body ?? contentPage.purpose} note="" />;

  const process = selected.process ? <EditorialProcessSteps eyebrow={processContent?.eyebrow ?? ""} headline={processContent?.headline ?? ""} intro={processContent?.body ?? contentPage.purpose} steps={steps} /> : null;
  const gallery = selected.gallery === "gallery-feature-mosaic"
    ? <FeatureMosaicGallery eyebrow={galleryContent?.eyebrow ?? ""} headline={galleryContent?.headline ?? ""} items={galleryItems} />
    : selected.gallery === "gallery-asymmetric-editorial" ? <AsymmetricEditorialGallery eyebrow={galleryContent?.eyebrow ?? ""} headline={galleryContent?.headline ?? ""} items={galleryItems} /> : null;
  const faq = selected.faq === "faq-editorial-index"
    ? <EditorialIndexFaq eyebrow={faqContent?.eyebrow ?? ""} headline={faqContent?.headline ?? ""} intro={faqContent?.body ?? ""} items={faqItems} />
    : selected.faq === "faq-calm-disclosure" ? <CalmDisclosureFaq eyebrow={faqContent?.eyebrow ?? ""} headline={faqContent?.headline ?? ""} items={faqItems} /> : null;
  const ctaProps = { eyebrow: ctaContent?.eyebrow ?? "", headline: ctaContent?.headline ?? primary.label, body: ctaContent?.body ?? contentPage.purpose, primaryCta: primaryLink, secondaryCta: secondaryLink };
  const cta = selected.cta === "cta-human-split" ? <HumanSplitCta {...ctaProps} />
    : selected.cta === "cta-stacked-statement" ? <StackedStatementCta {...ctaProps} />
    : selected.cta === "cta-inverted-marquee" ? <InvertedMarqueeCta {...ctaProps} />
    : selected.cta === "cta-decision-panel" ? <DecisionPanelCta {...ctaProps} /> : <EditorialCtaBand {...ctaProps} />;

  const requestAction = snapshot.snapshot.capabilities.find((item) => item.id === primary.capabilityKey)?.state === "active"
    ? buildPublishedRequestAction(runtime, primary.capabilityKey) : undefined;
  const contactProps = { eyebrow: contactContent?.eyebrow ?? "Contact", headline: contactContent?.headline ?? `Continue with ${brand}.`, body: contactContent?.body ?? "", submitLabel: primary.label, status: "", note: "", action: requestAction };
  const contact = selected.contact === "contact-editorial-inquiry" ? <EditorialInquiryContact {...contactProps} /> : <LocalConversionContact {...contactProps} />;
  const footer = selected.footer === "footer-editorial-minimal"
    ? <EditorialMinimalFooter brand={brand} statement={footerContent?.body ?? ""} note="" links={[{ label: "Offer", href: "#offer" }, { label: "Contact", href: "#contact" }]} />
    : <FunctionalLocalFooter brand={brand} location="" description={footerContent?.body ?? ""} legal="" links={[{ label: "Offer", href: "#offer" }, { label: "Contact", href: "#contact" }]} />;

  const nodes: Record<string, ReactNode> = { navbar, hero, services, about, process, gallery, faq, cta, contact, footer };
  const rendered = persistedPage.sectionOrder.map((type) => {
    const node = nodes[type];
    if (!node) return null;
    if (type === "navbar" || type === "hero" || type === "footer") return <div key={type}>{node}</div>;
    return <div key={type} id={anchorFor(type)}>{node}</div>;
  });

  return (
    <main
      data-published-site-id={runtime.dbSiteId}
      data-published-version-id={runtime.publishedVersionId}
      data-published-page-slug={pageSlug}
      style={{ background: snapshot.snapshot.theme.color.background, color: snapshot.snapshot.theme.color.text, ...snapshot.snapshot.cssVariables } as CSSProperties}
    >
      {rendered}
    </main>
  );
}
