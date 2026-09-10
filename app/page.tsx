const treatments = [
  { title: "Preventive care", body: "Routine care focused on protecting long-term oral health with clarity and comfort." },
  { title: "Smile restoration", body: "Thoughtful restorative treatment planning with a calm, patient-first approach." },
  { title: "Cosmetic dentistry", body: "Aesthetic treatment options presented with restraint, realism and attention to detail." },
  { title: "Dental implants", body: "Consultation-led implant care designed around suitability, planning and informed decisions." },
];

const faqs = [
  ["Can I book an appointment online?", "Yes. Use the appointment enquiry to request a preferred date and time. The clinic can then confirm availability."],
  ["What should I bring to my first visit?", "Bring any relevant dental records or recent scans you already have. If you do not have them, the clinic can guide you during the visit."],
  ["Do you provide treatment estimates?", "Treatment costs depend on the care recommended after assessment. A personalised estimate should be discussed with the clinic before treatment."],
];

export default function Home() {
  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#top" aria-label="Pearl Dental home"><span className="brandMark">P</span><span>Pearl Dental</span></a>
        <nav aria-label="Primary navigation"><a href="#care">Care</a><a href="#approach">Approach</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav>
        <a className="button buttonSmall" href="#contact">Book appointment</a>
      </header>

      <section className="hero shell" id="top">
        <div className="heroCopy">
          <p className="eyebrow">Modern dental care · Hyderabad</p>
          <h1>Calm, considered dentistry for everyday confidence.</h1>
          <p className="lede">A warm, contemporary dental experience built around clear conversations, thoughtful treatment planning and care that never feels rushed.</p>
          <div className="actions"><a className="button" href="#contact">Request an appointment</a><a className="textLink" href="#care">Explore care <span>↘</span></a></div>
          <div className="trustLine"><span>Patient-first consultation</span><span>Clear treatment guidance</span><span>Comfort-led experience</span></div>
        </div>
        <div className="heroVisual" aria-label="Abstract warm dental clinic visual">
          <div className="arch archOne"/><div className="arch archTwo"/><div className="pearlOrb"/><div className="visualNote">A quieter kind of dental visit.</div>
        </div>
      </section>

      <section className="manifesto shell" id="approach">
        <p className="eyebrow">Our approach</p>
        <div className="manifestoGrid"><h2>Good care begins with understanding.</h2><div><p>Dental decisions should feel informed, not overwhelming. Pearl Dental is presented here as a clinic experience centred on listening first, explaining clearly and recommending care with purpose.</p><p className="muted">This benchmark intentionally avoids invented doctor names, awards, ratings, experience claims, pricing and treatment outcomes.</p></div></div>
      </section>

      <section className="services shell" id="care">
        <div className="sectionHead"><div><p className="eyebrow">Care, thoughtfully organised</p><h2>Explore treatment areas</h2></div><p>Simple, useful information without turning treatment into a catalogue of cards.</p></div>
        <div className="serviceList">{treatments.map((item,index)=><article key={item.title}><span>0{index+1}</span><h3>{item.title}</h3><p>{item.body}</p><a href="#contact" aria-label={`Ask about ${item.title}`}>Ask about this care ↗</a></article>)}</div>
      </section>

      <section className="journey">
        <div className="shell journeyInner"><p className="eyebrow eyebrowLight">Your visit</p><h2>A clear path from first conversation to next step.</h2><div className="steps"><div><span>01</span><h3>Tell us what brings you in</h3><p>Share your concern, goal or preferred appointment time.</p></div><div><span>02</span><h3>Understand the options</h3><p>Use the consultation to discuss findings, priorities and suitable next steps.</p></div><div><span>03</span><h3>Move forward with clarity</h3><p>Proceed only with a plan you understand and feel comfortable with.</p></div></div></div>
      </section>

      <section className="faq shell" id="faq"><div><p className="eyebrow">Useful answers</p><h2>Questions before your visit.</h2></div><div className="faqList">{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

      <section className="contact shell" id="contact">
        <div className="contactIntro"><p className="eyebrow">Start with a conversation</p><h2>Request an appointment.</h2><p>Share the basic details below. No medical or business-specific facts are invented in this benchmark.</p><a className="textLink" href="tel:#">Call clinic <span>↗</span></a></div>
        <form><label>Name<input name="name" placeholder="Your name"/></label><label>Phone<input name="phone" inputMode="tel" placeholder="Your phone number"/></label><label>What can we help with?<textarea name="message" rows={4} placeholder="Tell us briefly"/></label><button className="button" type="button">Send appointment enquiry</button><small>Benchmark UI only — form backend will be connected through MiCirql's appointment capability.</small></form>
      </section>

      <footer><div className="shell footerInner"><div className="brand footerBrand"><span className="brandMark">P</span><span>Pearl Dental</span></div><p>Calm, considered dental care.</p><div><a href="#care">Care</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></div><small>MiCirql manual quality benchmark · no fabricated clinic facts.</small></div></footer>
    </main>
  );
}
