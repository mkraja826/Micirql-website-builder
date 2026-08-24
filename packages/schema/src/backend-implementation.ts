import { z } from "zod";

export const backendColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "integer", "numeric", "boolean", "date", "timestamptz", "uuid", "jsonb"]),
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  references: z.string().optional(),
  defaultSql: z.string().optional(),
});

export const backendTableSchema = z.object({
  name: z.string().min(1),
  entityId: z.string().min(1),
  columns: z.array(backendColumnSchema).min(1),
  primaryKey: z.string().default("id"),
  indexes: z.array(z.array(z.string()).min(1)).default([]),
  rlsEnabled: z.boolean().default(true),
  auditRequired: z.boolean().default(false),
});

export const backendPolicySchema = z.object({
  id: z.string().min(1),
  table: z.string().min(1),
  operation: z.enum(["select", "insert", "update", "delete"]),
  roleIds: z.array(z.string()).default([]),
  usingSql: z.string().optional(),
  checkSql: z.string().optional(),
});

export const backendRouteSchema = z.object({
  id: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().startsWith("/"),
  capabilityId: z.string().optional(),
  entityIds: z.array(z.string()).default([]),
  auth: z.enum(["public", "authenticated", "admin", "webhook"]),
  idempotent: z.boolean().default(false),
  serverValidation: z.boolean().default(true),
});

export const backendStorageBucketSchema = z.object({
  id: z.string().min(1),
  public: z.boolean().default(false),
  ownerScoped: z.boolean().default(true),
  maxBytes: z.number().int().positive().optional(),
  allowedMimePrefixes: z.array(z.string()).default([]),
});

export const backendJobSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(["schedule", "event", "webhook"]),
  purpose: z.string().min(1),
  idempotent: z.boolean().default(true),
});

export const backendIntegrationSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  purpose: z.string().min(1),
  required: z.boolean().default(false),
  secretsServerOnly: z.boolean().default(true),
  webhookVerificationRequired: z.boolean().default(false),
});

export const backendAcceptanceCheckSchema = z.object({
  id: z.string().min(1),
  requirement: z.string().min(1),
  required: z.boolean().default(true),
});

export const backendImplementationContractSchema = z.object({
  version: z.literal("1.0"),
  provider: z.enum(["supabase", "generic-postgres"]),
  tables: z.array(backendTableSchema).default([]),
  policies: z.array(backendPolicySchema).default([]),
  routes: z.array(backendRouteSchema).default([]),
  storageBuckets: z.array(backendStorageBucketSchema).default([]),
  jobs: z.array(backendJobSchema).default([]),
  integrations: z.array(backendIntegrationSchema).default([]),
  acceptanceChecks: z.array(backendAcceptanceCheckSchema).default([]),
  requiresAuth: z.boolean().default(false),
  requiresRls: z.boolean().default(false),
  requiresSecrets: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});

export type BackendColumn = z.infer<typeof backendColumnSchema>;
export type BackendTable = z.infer<typeof backendTableSchema>;
export type BackendPolicy = z.infer<typeof backendPolicySchema>;
export type BackendRoute = z.infer<typeof backendRouteSchema>;
export type BackendStorageBucket = z.infer<typeof backendStorageBucketSchema>;
export type BackendJob = z.infer<typeof backendJobSchema>;
export type BackendIntegration = z.infer<typeof backendIntegrationSchema>;
export type BackendAcceptanceCheck = z.infer<typeof backendAcceptanceCheckSchema>;
export type BackendImplementationContract = z.infer<typeof backendImplementationContractSchema>;
