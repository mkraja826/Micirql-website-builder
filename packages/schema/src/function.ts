import { z } from "zod";

export const functionPermissionSchema = z.object({
  public: z.array(z.string()).default([]),
  authenticated: z.array(z.string()).default([]),
  roles: z.record(z.string(), z.array(z.string())).default({}),
});

export const functionDefinitionSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  inputSchemaId: z.string().min(1),
  outputSchemaId: z.string().min(1),
  permissions: functionPermissionSchema,
  rateLimited: z.boolean(),
  serverValidationRequired: z.literal(true),
  adapterType: z.enum(["native", "integration", "custom"]),
  integrationProvider: z.string().optional(),
});

export const functionInvocationSchema = z.object({
  actionId: z.string().min(1),
  siteId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().optional(),
});

export type FunctionDefinition = z.infer<typeof functionDefinitionSchema>;
export type FunctionInvocation = z.infer<typeof functionInvocationSchema>;
