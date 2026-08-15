import { z } from "zod";
import type { RuntimeFunctionDefinition } from "./types";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().min(6).max(40).optional(),
    message: z.string().trim().max(4000).optional(),
    consent: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "At least one contact method is required.",
  });

const createdOutputSchema = z.object({
  recordId: z.string().min(1),
  status: z.enum(["received", "queued"]),
});

const publicRateLimit = { limit: 8, windowSeconds: 600, key: "site-ip" as const };
const newsletterRateLimit = { limit: 5, windowSeconds: 3600, key: "site-ip" as const };

export const nativeFunctionCatalog = [
  {
    id: "lead.create",
    version: "1.0.0",
    description: "Capture a general website enquiry.",
    input: contactSchema.extend({ sourcePage: z.string().startsWith("/").optional() }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.leads.create",
    audit: true,
  },
  {
    id: "appointment.request",
    version: "1.0.0",
    description: "Capture an appointment request without implying confirmed availability.",
    input: contactSchema.extend({
      service: z.string().trim().max(160).optional(),
      clinician: z.string().trim().max(160).optional(),
      preferredDate: z.string().date().optional(),
      preferredTime: z.string().trim().max(40).optional(),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.appointments.create",
    audit: true,
  },
  {
    id: "reservation.request",
    version: "1.0.0",
    description: "Capture a restaurant reservation request without confirming a table.",
    input: contactSchema.extend({
      requestedDate: z.string().date(),
      requestedTime: z.string().trim().min(1).max(40),
      partySize: z.number().int().min(1).max(100),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.reservations.create",
    audit: true,
  },
  {
    id: "quote.request",
    version: "1.0.0",
    description: "Capture a service or project quote request.",
    input: contactSchema.extend({
      service: z.string().trim().min(1).max(160),
      location: z.string().trim().max(240).optional(),
      budgetRange: z.string().trim().max(120).optional(),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.quotes.create",
    audit: true,
  },
  {
    id: "newsletter.subscribe",
    version: "1.0.0",
    description: "Subscribe an email address to site updates after explicit consent.",
    input: z.object({
      email: z.string().trim().email().max(254),
      consent: z.literal(true),
      sourcePage: z.string().startsWith("/").optional(),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: newsletterRateLimit,
    idempotent: true,
    adapterKey: "records.newsletter.create",
    audit: true,
  },
  {
    id: "property.enquiry",
    version: "1.0.0",
    description: "Capture an enquiry about a real-estate property or project.",
    input: contactSchema.extend({
      propertyId: z.string().trim().min(1).max(160),
      enquiryType: z.enum(["details", "visit", "brochure", "callback"]).default("details"),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.propertyEnquiries.create",
    audit: true,
  },
  {
    id: "demo.request",
    version: "1.0.0",
    description: "Capture a SaaS or technology product demo request.",
    input: contactSchema.extend({
      company: z.string().trim().max(180).optional(),
      role: z.string().trim().max(120).optional(),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.demoRequests.create",
    audit: true,
  },
  {
    id: "booking.request",
    version: "1.0.0",
    description: "Capture a hospitality booking enquiry without confirming inventory.",
    input: contactSchema.extend({
      checkIn: z.string().date(),
      checkOut: z.string().date(),
      guests: z.number().int().min(1).max(50),
      roomPreference: z.string().trim().max(160).optional(),
    }),
    output: createdOutputSchema,
    access: "public",
    rateLimit: publicRateLimit,
    idempotent: true,
    adapterKey: "records.bookingRequests.create",
    audit: true,
  },
] satisfies RuntimeFunctionDefinition[];

export function getNativeFunction(actionId: string) {
  return nativeFunctionCatalog.find((definition) => definition.id === actionId);
}
