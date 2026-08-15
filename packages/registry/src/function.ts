import { z } from "zod";
import { domainSchema, functionDefinitionSchema, lifecycleStatusSchema } from "@micirql/schema";

export const functionRegistryEntrySchema = z.object({
  definition: functionDefinitionSchema,
  status: lifecycleStatusSchema,
  domains: z.array(domainSchema).default([]),
  tags: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  protocol: z.object({
    passed: z.boolean(),
    checkedAt: z.string().datetime(),
  }),
});

export type FunctionRegistryEntry = z.infer<typeof functionRegistryEntrySchema>;
