import {
  backendImplementationContractSchema,
  type BackendAcceptanceCheck,
  type BackendImplementationContract,
  type BackendIntegration,
  type BackendJob,
  type BackendPolicy,
  type BackendRoute,
  type BackendStorageBucket,
  type BackendTable,
  type FunctionalArchitecture,
  type FunctionalEntity,
} from "@micirql/schema";

export function deriveBackendImplementationContract(architecture: FunctionalArchitecture): BackendImplementationContract {
  const baseTables = architecture.entities.map(tableFromEntity);
  const tables = architecture.requiresPayments ? hardenPaymentPersistence(baseTables) : baseTables;
  const policies = architecture.policies.map((policy): BackendPolicy => ({
    id: policy.id,
    table: tableName(policy.entityId),
    operation: policy.operation,
    roleIds: policy.roleIds,
    ...(policy.operation === "insert"
      ? { checkSql: policySql(policy.rule) }
      : policy.operation === "update"
        ? { usingSql: policySql(policy.rule), checkSql: policySql(policy.rule) }
        : { usingSql: policySql(policy.rule) }),
  }));

  const routes = buildRoutes(architecture);
  const storageBuckets: BackendStorageBucket[] = architecture.requiresFileStorage
    ? [{ id: "user-assets", public: false, ownerScoped: true, maxBytes: 20 * 1024 * 1024, allowedMimePrefixes: ["image/", "application/pdf"] }]
    : [];
  const jobs = buildJobs(architecture);
  const integrations: BackendIntegration[] = architecture.integrations.map((integration) => ({
    id: integration.id,
    provider: integration.provider,
    purpose: integration.purpose,
    required: integration.required,
    secretsServerOnly: integration.serverOnlySecrets,
    webhookVerificationRequired: integration.id === "payments",
  }));
  const acceptanceChecks = buildAcceptanceChecks(architecture);

  return backendImplementationContractSchema.parse({
    version: "1.0",
    provider: "supabase",
    tables,
    policies,
    routes,
    storageBuckets,
    jobs,
    integrations,
    acceptanceChecks,
    requiresAuth: architecture.requiresAuth,
    requiresRls: tables.some((table) => table.rlsEnabled),
    requiresSecrets: integrations.some((integration) => integration.secretsServerOnly),
    notes: [
      "Generate migrations from this contract; never expose service-role or provider secrets to the browser.",
      ...(architecture.requiresAuth ? ["Authenticated data access must be denied by default and granted only by explicit RLS policies."] : []),
      ...(architecture.requiresPayments ? ["Payment state may only transition after verified server-side provider confirmation or signed webhook verification.", "Payment creation and webhook delivery must persist unique idempotency/event keys before fulfillment."] : []),
    ],
  });
}

function tableFromEntity(entity: FunctionalEntity): BackendTable {
  const columns: BackendTable["columns"] = [
    { name: "id", type: "uuid", nullable: false, unique: true, defaultSql: "gen_random_uuid()" },
    ...ownershipColumns(entity.ownership),
    ...entity.fields.map((field) => ({
      name: field.id,
      type: dbType(field.type),
      nullable: !field.required,
      unique: field.unique,
      ...(field.relationEntityId ? { references: `${tableName(field.relationEntityId)}(id)` } : {}),
    })),
    { name: "created_at", type: "timestamptz", nullable: false, unique: false, defaultSql: "now()" },
    { name: "updated_at", type: "timestamptz", nullable: false, unique: false, defaultSql: "now()" },
  ];
  return {
    name: tableName(entity.id),
    entityId: entity.id,
    columns,
    primaryKey: "id",
    indexes: [...entity.indexes, ...ownershipIndexes(entity.ownership)],
    rlsEnabled: entity.ownership !== "public",
    auditRequired: entity.auditRequired,
  };
}

function hardenPaymentPersistence(input: BackendTable[]): BackendTable[] {
  const tables = input.map((table) => ({ ...table, columns: table.columns.map((column) => ({ ...column })), indexes: table.indexes.map((index) => [...index]) }));
  const orders = tables.find((table) => table.name === "orders");
  if (orders) {
    if (!orders.columns.some((column) => column.name === "idempotency_key")) orders.columns.push({ name: "idempotency_key", type: "text", nullable: false, unique: true });
    if (!orders.columns.some((column) => column.name === "provider_payment_id")) orders.columns.push({ name: "provider_payment_id", type: "text", nullable: true, unique: true });
    if (!orders.indexes.some((index) => index.length === 1 && index[0] === "idempotency_key")) orders.indexes.push(["idempotency_key"]);
  }
  if (!tables.some((table) => table.name === "payment_events")) {
    tables.push({
      name: "payment_events",
      entityId: "payment_event",
      primaryKey: "id",
      rlsEnabled: true,
      auditRequired: true,
      indexes: [["provider_event_id"]],
      columns: [
        { name: "id", type: "uuid", nullable: false, unique: true, defaultSql: "gen_random_uuid()" },
        { name: "provider_event_id", type: "text", nullable: false, unique: true },
        { name: "event_type", type: "text", nullable: false, unique: false },
        { name: "payload", type: "jsonb", nullable: false, unique: false },
        { name: "processed_at", type: "timestamptz", nullable: false, unique: false, defaultSql: "now()" },
        { name: "created_at", type: "timestamptz", nullable: false, unique: false, defaultSql: "now()" },
        { name: "updated_at", type: "timestamptz", nullable: false, unique: false, defaultSql: "now()" },
      ],
    });
  }
  return tables;
}

function buildRoutes(architecture: FunctionalArchitecture): BackendRoute[] {
  const routes: BackendRoute[] = [];
  for (const capability of architecture.capabilities) {
    const auth = capability.id === "booking" ? "public" : /admin/.test(capability.id) ? "admin" : architecture.requiresAuth ? "authenticated" : "public";
    if (capability.category === "crud") {
      for (const entityId of capability.entityIds) {
        routes.push({ id: `${entityId}-list`, method: "GET", path: `/api/${tableName(entityId)}`, capabilityId: capability.id, entityIds: [entityId], auth, idempotent: true, serverValidation: true });
        routes.push({ id: `${entityId}-create`, method: "POST", path: `/api/${tableName(entityId)}`, capabilityId: capability.id, entityIds: [entityId], auth, idempotent: false, serverValidation: true });
      }
    }
    if (capability.id === "booking") routes.push({ id: "booking-create", method: "POST", path: "/api/bookings", capabilityId: capability.id, entityIds: ["booking"], auth: "public", idempotent: true, serverValidation: true });
    if (capability.id === "payments") {
      routes.push({ id: "payment-create", method: "POST", path: "/api/payments/create", capabilityId: capability.id, entityIds: capability.entityIds, auth: "authenticated", idempotent: true, serverValidation: true });
      routes.push({ id: "payment-webhook", method: "POST", path: "/api/payments/webhook", capabilityId: capability.id, entityIds: capability.entityIds, auth: "webhook", idempotent: true, serverValidation: true });
    }
    if (capability.id === "storage") routes.push({ id: "asset-upload", method: "POST", path: "/api/assets/upload", capabilityId: capability.id, entityIds: ["asset"], auth: "authenticated", idempotent: false, serverValidation: true });
    if (capability.id === "search") routes.push({ id: "search", method: "GET", path: "/api/search", capabilityId: capability.id, entityIds: capability.entityIds, auth: "public", idempotent: true, serverValidation: true });
    if (capability.id === "ai") routes.push({ id: "ai-inference", method: "POST", path: "/api/ai", capabilityId: capability.id, entityIds: capability.entityIds, auth: "authenticated", idempotent: false, serverValidation: true });
  }
  return dedupeRoutes(routes);
}

function buildJobs(architecture: FunctionalArchitecture): BackendJob[] {
  const jobs: BackendJob[] = [];
  if (architecture.capabilities.some((capability) => capability.id === "notifications")) jobs.push({ id: "transactional-notifications", trigger: "event", purpose: "Deliver queued transactional notifications with retry and deduplication.", idempotent: true });
  if (architecture.requiresPayments) jobs.push({ id: "payment-reconciliation", trigger: "schedule", purpose: "Reconcile unsettled payment state against the provider without duplicating fulfillment.", idempotent: true });
  return jobs;
}

function buildAcceptanceChecks(architecture: FunctionalArchitecture): BackendAcceptanceCheck[] {
  const checks: BackendAcceptanceCheck[] = architecture.acceptanceTests.filter((test) => test.required).map((test) => ({ id: test.id, requirement: `${test.given}; ${test.when}; ${test.then.join("; ")}`, required: true }));
  if (architecture.backendRequired) checks.push({ id: "server-validation", requirement: "Every state-changing route performs server-side input validation before persistence.", required: true });
  if (architecture.requiresAuth) checks.push({ id: "rls-negative-test", requirement: "A user cannot read, update or delete another user's or tenant's protected rows.", required: true });
  if (architecture.requiresPayments) checks.push({ id: "payment-idempotency", requirement: "Duplicate checkout or webhook delivery cannot create duplicate orders, charges or fulfillment.", required: true });
  if (architecture.requiresFileStorage) checks.push({ id: "upload-ownership", requirement: "Uploads enforce size/type validation and ownership-scoped access.", required: true });
  return checks;
}

function ownershipColumns(ownership: FunctionalEntity["ownership"]): BackendTable["columns"] {
  if (ownership === "user") return [{ name: "owner_user_id", type: "uuid", nullable: false, unique: false, defaultSql: "auth.uid()" }];
  if (ownership === "tenant") return [{ name: "tenant_id", type: "uuid", nullable: false, unique: false, references: "tenants(id)" }];
  return [];
}
function ownershipIndexes(ownership: FunctionalEntity["ownership"]) { if (ownership === "user") return [["owner_user_id"]]; if (ownership === "tenant") return [["tenant_id"]]; return []; }
function policySql(rule: string) {
  const lower = rule.toLowerCase();
  if (lower.includes("tenant_id")) return "tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid";
  if (lower.includes("owner_user_id")) return "owner_user_id = auth.uid()";
  return "false";
}
function tableName(entityId: string) { return entityId.endsWith("s") ? entityId : `${entityId}s`; }
function dbType(type: FunctionalEntity["fields"][number]["type"]): BackendTable["columns"][number]["type"] { if (type === "number") return "numeric"; if (type === "boolean") return "boolean"; if (type === "date") return "date"; if (type === "datetime") return "timestamptz"; if (type === "json") return "jsonb"; if (type === "relation") return "uuid"; return "text"; }
function dedupeRoutes(routes: BackendRoute[]) { const seen = new Set<string>(); return routes.filter((route) => { const key = `${route.method}:${route.path}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
