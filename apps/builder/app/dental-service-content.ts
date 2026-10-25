type DentalServiceCopyContext = {
  businessName: string;
};

/**
 * Deterministic visitor copy that explains the next decision without inventing
 * clinic capabilities, outcomes, prices, credentials or availability.
 */
export function dentalServiceDescription(
  service: string,
  { businessName }: DentalServiceCopyContext,
): string {
  const label = clean(service) || "this dental service";
  const key = label.toLocaleLowerCase("en-US");

  if (/general\s+(?:dentistry|dental\s+care)/.test(key)) {
    return `${title(label)} is a broad starting point for routine examinations and common oral-health concerns. A consultation can clarify which listed service fits the reason for the visit and whether further assessment is needed.`;
  }
  if (/consult|assessment|second opinion/.test(key)) {
    return `${title(label)} create time to discuss a concern, relevant history and possible care pathways before deciding what to do. Ask what examination or records may help the dentist assess the request.`;
  }

  if (/implant/.test(key)) {
    return `Dental implants are one option a dentist may discuss when replacing missing teeth. An assessment helps clarify bone, gum and neighbouring-tooth considerations before options are compared.`;
  }
  if (/root\s*canal|endodont/.test(key)) {
    return `Root canal treatment addresses problems inside a tooth and may be considered when retaining it is clinically appropriate. The visit can establish what examination is needed and what alternatives should be discussed.`;
  }
  if (/crown|bridge/.test(key)) {
    return `${title(label)} may be used to restore or replace teeth, depending on the teeth and supporting structures. A dentist can explain preparation, material and maintenance considerations after assessment.`;
  }
  if (/denture/.test(key)) {
    return `Dentures are removable tooth-replacement options that can vary in design, fit and care needs. Discuss the type of denture, adjustment period and follow-up that may be relevant after an examination.`;
  }
  if (/align|orthodont|braces/.test(key)) {
    return `${title(label)} focuses on tooth alignment and bite-related goals. An orthodontic assessment can identify the records needed, possible approaches and questions to consider before treatment.`;
  }
  if (/whiten|bleach/.test(key)) {
    return `${title(label)} is a cosmetic option for changing the appearance of tooth colour. Ask about suitability, sensitivity and the differences between professionally supervised and other approaches.`;
  }
  if (/clean|hygiene|prevent|check.?up|exam/.test(key)) {
    return `${title(label)} supports routine assessment, cleaning and prevention based on an individual's oral health. The visit can help identify a suitable recall interval and any areas that need closer attention.`;
  }
  if (/child|paediatric|pediatric|kids?/.test(key)) {
    return `${title(label)} considers age-appropriate assessment, prevention and treatment discussions. Parents or carers can ask how to prepare for the visit and what information the clinic needs beforehand.`;
  }
  if (/extract|removal|oral surgery|surgical/.test(key)) {
    return `${title(label)} requires an assessment of the tooth, surrounding structures and suitable care options. The dentist can outline why removal may be considered and what aftercare questions to raise.`;
  }
  if (/gum|periodont/.test(key)) {
    return `${title(label)} relates to the assessment and care of gums and the structures supporting the teeth. Ask how gum measurements, home care and follow-up may inform the care plan.`;
  }
  if (/emergency|urgent/.test(key)) {
    return `${title(label)} begins with understanding the concern and deciding what level of dental assessment is appropriate. Contact local emergency services for a medical emergency.`;
  }

  return `${title(label)} can be discussed in terms of purpose, assessment, alternatives and follow-up before a care decision is made. Contact ${businessName} to ask what information is needed for that conversation.`;
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
}
