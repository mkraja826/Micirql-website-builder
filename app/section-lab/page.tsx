import { CinematicFullscreenHero } from "../../src/sections/hero/cinematic-fullscreen";
import { TypographyLedHero } from "../../src/sections/hero/typography-led";
import { ConversionSplitHero } from "../../src/sections/hero/conversion-split";
import { EditorialStory } from "../../src/sections/about/editorial-story";
import { VisualStoryServices } from "../../src/sections/services/visual-stories";
import { EditorialCtaBand } from "../../src/sections/cta/editorial-band";
import { HumanSplitCta } from "../../src/sections/cta/human-split";
import { ConversionCleanNavbar } from "../../src/sections/navbar/conversion-clean";
import { FunctionalLocalFooter } from "../../src/sections/footer/functional-local";

const RESORT_MEDIA = {
  src: "https://images.pexels.com/photos/19829800/pexels-photo-19829800/free-photo-of-pool-on-terrace-in-valley-in-mountains.jpeg?auto=compress&dpr=1&h=1080&w=1920",
  alt: "Aerial view of a mountain resort with an infinity pool surrounded by forest and mountains",
  kind: "image" as const,
};

const WORK_MEDIA = {
  src: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&dpr=1&w=1600",
  alt: "People collaborating around a table",
};

export default function SectionLabPage() {
  return (
    <main id="top">
      <ConversionCleanNavbar
        brand="North & Field"
        links={[{label:"Approach",href:"#story"},{label:"Services",href:"#services"},{label:"Contact",href:"#human-cta"}]}
        primaryCta={{label:"Start a project",href:"#human-cta"}}
        secondaryCta={{label:"View work",href:"#services"}}
      />
      <CinematicFullscreenHero
        eyebrow="Cinematic direction"
        headline="Stay closer to the landscape."
        body="An immersive hero intended for destination-led hospitality, retreats and premium experience businesses."
        primaryCta={{ label: "Explore stays", href: "#story" }}
        secondaryCta={{ label: "View experiences", href: "#cta" }}
        media={RESORT_MEDIA}
        visualLabel="Pexels · Tina Lu · photo 19829800"
      />
      <ConversionSplitHero
        eyebrow="Conversion split direction"
        headline="Make the next step unmistakably clear."
        body="A high-intent hero for businesses where the visitor should understand the offer, trust the path forward and act quickly without a generic SaaS shell."
        primaryCta={{label:"Request an introduction",href:"#human-cta"}}
        secondaryCta={{label:"See the approach",href:"#services"}}
        media={WORK_MEDIA}
        proof={["Clear next step","Human support","Responsive by design"]}
      />
      <TypographyLedHero
        eyebrow="Typography-led direction"
        headline="Build less. Mean more."
        body="A deliberately sparse direction for consultancies, studios and modern professional brands where language carries the identity."
        primaryCta={{ label: "Start a conversation", href: "#cta" }}
        accent="Aa"
      />
      <div id="story">
        <EditorialStory
          eyebrow="Editorial story"
          headline="A point of view deserves room to breathe."
          body="This section uses image rhythm, long-form typography and a restrained quote treatment instead of a conventional card grid. Its content is supplied entirely by the composition layer."
          quote="Clarity is not the absence of detail. It is the decision about what deserves attention."
          visualLabel="Independent section"
        />
      </div>
      <div id="services">
        <VisualStoryServices
          eyebrow="Visual story services"
          headline="Services shown as narratives, not tiles."
          stories={[
            {title:"Discover",body:"Frame the problem, audience and decision before choosing the visual language.",media:WORK_MEDIA,link:{label:"Understand discovery",href:"#human-cta"}},
            {title:"Shape",body:"Turn the strongest idea into a coherent experience with hierarchy, rhythm and a clear conversion path."},
            {title:"Deliver",body:"Carry the chosen direction through responsive states and the functional details people actually use.",link:{label:"Talk about delivery",href:"#human-cta"}},
          ]}
        />
      </div>
      <div id="cta">
        <EditorialCtaBand
          eyebrow="Editorial CTA"
          headline="Ready when the next step feels right."
          body="A low-pressure conversion band designed to close an editorial experience without turning it into a generic sales panel."
          primaryCta={{ label: "Begin an enquiry", href: "#human-cta" }}
          secondaryCta={{ label: "Return to top", href: "#top" }}
        />
      </div>
      <div id="human-cta">
        <HumanSplitCta
          eyebrow="Human conversion"
          headline="Talk to a person before you commit to the path."
          body="A warmer conversion close for professional and local-service businesses where reassurance matters as much as the action itself."
          primaryCta={{label:"Start a conversation",href:"#top"}}
          secondaryCta={{label:"Review services",href:"#services"}}
          media={WORK_MEDIA}
        />
      </div>
      <FunctionalLocalFooter
        brand="North & Field"
        description="A functional local-business footer designed to keep navigation, location and verified contact information useful without becoming a dense sitemap."
        location="Example location only"
        contactLabel="Contact route"
        contactHref="#human-cta"
        links={[{label:"Approach",href:"#story"},{label:"Services",href:"#services"},{label:"Contact",href:"#human-cta"}]}
        legal="Section Lab · fixture content only"
      />
    </main>
  );
}
