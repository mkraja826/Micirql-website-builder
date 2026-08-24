import { z } from "zod";

export const productSurfaceSchema = z.enum([
  "marketing-site",
  "web-app",
  "dashboard",
  "portal",
  "marketplace",
  "commerce",
  "booking",
  "admin",
  "api",
]);

export const functionalRoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  authenticated: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
});

export const functionalFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "number", "boolean", "date", "datetime", "email", "phone", "url", "json", "relation", "file"]),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  relationEntityId: z.string().optional(),
});

export const functionalEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  ownership: z.enum(["public", "user", "tenant", "system"]),
  fields: z.array(functionalFieldSchema).default([]),
  indexes: z.array(z.array(z.string()).min(1)).default([]),
  auditRequired: z.boolean().default(false),
});

export const functionalCapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["auth", "crud", "search", "booking", "payment", "notification", "storage", "analytics", "ai", "integration", "admin", "workflow"]),
  description: z.string().min(1),
  required: z.boolean().default(true),
  roles: z.array(z.string()).default([]),
  entityIds: z.array(z.string()).default([]),
});

export const functionalWorkflowStepSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  actorRoleId: z.string().optional(),
  entityId: z.string().optional(),
  requiresAuth: z.boolean().default(false),
  idempotent: z.boolean().default(false),
});

export const functionalWorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: z.enum(["user", "system", "schedule", "webhook", "admin"]),
  description: z.string().min(1),
  steps: z.array(functionalWorkflowStepSchema).min(1),
});

export const functionalPolicySchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.enum(["select", "insert", "update", "delete"]),
  roleIds: z.array(z.string()).default([]),
  rule: z.string().min(1),
});

export const functionalIntegrationSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  purpose: z.string().min(1),
  required: z.boolean().default(false),
  serverOnlySecrets: z.boolean().default(true),
});

export const functionalAcceptanceTestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["auth", "permission", "crud", "workflow", "integration", "payment", "notification", "security", "resilience", "ui"]),
  required: z.boolean().default(true),
  given: z.string().min(1),
  when: z.string().min(1),
  then: z.array(z.string().min(1)).min(1),
});

export const functionalArchitectureSchema = z.object({
  version: z.literal("1.0"),
  productType: z.string().min(1),
  surfaces: z.array(productSurfaceSchema).min(1),
  roles: z.array(functionalRoleSchema).default([]),
  entities: z.array(functionalEntitySchema).default([]),
  capabilities: z.array(functionalCapabilitySchema).default([]),
  workflows: z.array(functionalWorkflowSchema).default([]),
  policies: z.array(functionalPolicySchema).default([]),
  integrations: z.array(functionalIntegrationSchema).default([]),
  acceptanceTests: z.array(functionalAcceptanceTestSchema).default([]),
  backendRequired: z.boolean(),
  multiTenant: z.boolean().default(false),
  requiresAuth: z.boolean().default(false),
  requiresPayments: z.boolean().default(false),
  requiresFileStorage: z.boolean().default(false),
  requiresBackgroundJobs: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});

export type ProductSurface = z.infer<typeof productSurfaceSchema>;
export type FunctionalRole = z.infer<typeof functionalRoleSchema>;
export type FunctionalField = z.infer<typeof functionalFieldSchema>;
export type FunctionalEntity = z.infer<typeof functionalEntitySchema>;
export type FunctionalCapability = z.infer<typeof functionalCapabilitySchema>;
export type FunctionalWorkflow = z.infer<typeof functionalWorkflowSchema>;
export type FunctionalPolicy = z.infer<typeof functionalPolicySchema>;
export type FunctionalIntegration = z.infer<typeof functionalIntegrationSchema>;
export type FunctionalAcceptanceTest = z.infer<typeof functionalAcceptanceTestSchema>;
export type FunctionalArchitecture = z.infer<typeof functionalArchitectureSchema>;
