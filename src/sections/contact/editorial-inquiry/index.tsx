import { RequestFormRuntime, type GeneratedRequestAction } from "../request-form-runtime";

export function EditorialInquiryContact({ eyebrow, headline, body, status, submitLabel, note, action }: { eyebrow:string; headline:string; body:string; status:string; submitLabel:string; note:string; action?: GeneratedRequestAction }) {
  return <section className="shell" id="contact"><div style={{display:"grid",gap:"2rem",gridTemplateColumns:"repeat(auto-fit,minmax(18rem,1fr))"}}><div><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2><p>{body}</p><p><strong>{status}</strong></p></div><RequestFormRuntime action={action} submitLabel={submitLabel} note={note} contactMode="email" messageLabel="What would you like to discuss?" messagePlaceholder="Share a little context" /></div></section>;
}
