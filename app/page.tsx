import { QuietLuxuryNavbar } from "../src/sections/navbar/quiet-luxury";
import { EditorialSplitHero } from "../src/sections/hero/editorial-split";
import { TrustManifesto } from "../src/sections/about/trust-manifesto";
import { EditorialServiceIndex } from "../src/sections/services/editorial-index";
import { CareJourney } from "../src/sections/process/care-journey";
import { CalmDisclosureFaq } from "../src/sections/faq/calm-disclosure";
import { LocalConversionContact } from "../src/sections/contact/local-conversion";
import { EditorialMinimalFooter } from "../src/sections/footer/editorial-minimal";

const treatments = [
  { title: "Preventive care", body: "Routine care focused on protecting long-term oral health with clarity and comfort." },
  { title: "Smile restoration", body: "Thoughtful restorative treatment planning with a calm, patient-first approach." },
  { title: "Cosmetic dentistry", body: "Aesthetic treatment options presented with restraint, realism and attention to detail." },
  { title: "Dental implants", body: "Consultation-led implant care designed around suitability, planning and informed decisions." },
];

const faqs: [string,string][] = [
  ["Can I book an appointment online?", "Yes. Use the appointment enquiry to request a preferred date and time. The clinic can then confirm availability."],
  ["What should I bring to my first visit?", "Bring any relevant dental records or recent scans you already have. If you do not have them, the clinic can guide you during the visit."],
  ["Do you provide treatment estimates?", "Treatment costs depend on the care recommended after assessment. A personalised estimate should be discussed with the clinic before treatment."],
];

const journey = [
  { title: "Tell us what brings you in", body: "Share your concern, goal or preferred appointment time." },
  { title: "Understand the options", body: "Use the consultation to discuss findings, priorities and suitable next steps." },
  { title: "Move forward with clarity", body: "Proceed only with a plan you understand and feel comfortable with." },
];

export default function Home() {
  return (
    <main>
      <QuietLuxuryNavbar brand="Pearl Dental" />
      <EditorialSplitHero brand="Pearl Dental" eyebrow="Modern dental care · Hyderabad" headline="Calm, considered dentistry for everyday confidence." body="A warm, contemporary dental experience built around clear conversations, thoughtful treatment planning and care that never feels rushed." primaryCta="Request an appointment" secondaryCta="Explore care" />
      <TrustManifesto eyebrow="Our approach" headline="Good care begins with understanding." body="Dental decisions should feel informed, not overwhelming. Pearl Dental is presented here as a clinic experience centred on listening first, explaining clearly and recommending care with purpose." note="This benchmark intentionally avoids invented doctor names, awards, ratings, experience claims, pricing and treatment outcomes." />
      <EditorialServiceIndex eyebrow="Care, thoughtfully organised" headline="Explore treatment areas" intro="Useful guidance, presented with enough breathing room to feel considered rather than catalogued." items={treatments} />
      <CareJourney eyebrow="Your visit" headline="A clear path from first conversation to next step." steps={journey} />
      <CalmDisclosureFaq eyebrow="Useful answers" headline="Questions before your visit." items={faqs} />
      <LocalConversionContact eyebrow="Start with a conversation" headline="Request an appointment." body="Share the basic details below and the clinic can follow up to confirm availability." note="Benchmark UI only — form backend will be connected through MiCirql's appointment capability." />
      <EditorialMinimalFooter brand="Pearl Dental" statement="Calm, considered dental care." note="MiCirql manual quality benchmark · no fabricated clinic facts." />
    </main>
  );
}
