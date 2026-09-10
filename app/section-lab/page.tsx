import { CinematicFullscreenHero } from "../../src/sections/hero/cinematic-fullscreen";
import { TypographyLedHero } from "../../src/sections/hero/typography-led";
import { EditorialStory } from "../../src/sections/about/editorial-story";
import { EditorialCtaBand } from "../../src/sections/cta/editorial-band";

export default function SectionLabPage() {
  return (
    <main>
      <CinematicFullscreenHero
        eyebrow="Cinematic direction"
        headline="Stay closer to the landscape."
        body="An immersive hero intended for destination-led hospitality, retreats and premium experience businesses."
        primaryCta={{ label: "Explore stays", href: "#story" }}
        secondaryCta={{ label: "View experiences", href: "#cta" }}
        visualLabel="Section lab · 01"
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
      <div id="cta">
        <EditorialCtaBand
          eyebrow="Editorial CTA"
          headline="Ready when the next step feels right."
          body="A low-pressure conversion band designed to close an editorial experience without turning it into a generic sales panel."
          primaryCta={{ label: "Begin an enquiry", href: "#top" }}
          secondaryCta={{ label: "Return to top", href: "#top" }}
        />
      </div>
    </main>
  );
}
