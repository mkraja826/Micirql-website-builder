import { RequestFormRuntime, type GeneratedRequestAction } from "../request-form-runtime";

export function LocalConversionContact({ eyebrow, headline, body, status, submitLabel, note, action }: { eyebrow:string; headline:string; body:string; status:string; submitLabel:string; note:string; action?: GeneratedRequestAction }) {
  return <section className="contact shell" id="contact"><div className="contactIntro"><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2><p>{body}</p><span className="contactStatus">{status}</span></div><RequestFormRuntime action={action} submitLabel={submitLabel} note={note} contactMode="phone" messageLabel="What can we help with?" messagePlaceholder="Tell us briefly" /></section>;
}
