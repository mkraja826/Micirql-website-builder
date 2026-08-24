import {
  functionalArchitectureSchema,
  type FunctionalAcceptanceTest,
  type FunctionalArchitecture,
  type FunctionalCapability,
  type FunctionalEntity,
  type FunctionalIntegration,
  type FunctionalPolicy,
  type FunctionalRole,
  type FunctionalWorkflow,
  type ProductSurface,
} from "@micirql/schema";
import type { OnboardingProfile } from "./preset-ranking";

export function deriveFunctionalArchitecture(profile: OnboardingProfile): FunctionalArchitecture {
  const text = profileText(profile);
  const capabilitiesRequested = stringList(profile.required_capabilities);
  const goals = stringList(profile.goals);
  const explicitStatic = isExplicitStaticProfile(profile, capabilitiesRequested, goals);

  const wantsAuth = !explicitStatic && hasAny(text, ["login", "sign in", "signup", "account", "portal", "dashboard", "member", "admin", "role"]);
  const wantsBooking = !explicitStatic && hasAny(text, ["book", "booking", "appointment", "reservation", "schedule", "consultation"]);
  const wantsCommerce = !explicitStatic && hasAny(text, ["ecommerce", "e-commerce", "shop", "store", "cart", "checkout", "order", "purchase"]);
  const wantsPayments = !explicitStatic && (wantsCommerce || hasAny(text, ["payment", "subscription", "billing", "razorpay", "stripe"]));
  const wantsStorage = !explicitStatic && hasAny(text, ["upload", "file", "image", "photo", "document", "gallery", "x-ray", "xray", "attachment"]);
  const wantsNotifications = !explicitStatic && hasAny(text, ["notification", "email", "sms", "whatsapp", "reminder", "alert"]);
  const wantsSearch = !explicitStatic && hasAny(text, ["search", "filter", "listing", "catalog", "property", "products", "directory"]);
  const wantsAdmin = !explicitStatic && hasAny(text, ["admin", "manage", "management", "cms", "backend", "dashboard"]);
  const wantsAi = !explicitStatic && hasAny(text, [" ai ", "artificial intelligence", "chatbot", "assistant", "recommendation"]);
  const wantsAnalytics = !explicitStatic && hasAny(text, ["analytics", "visitor", "tracking", "reports", "reporting"]);
  const wantsMarketplace = !explicitStatic && hasAny(text, ["marketplace", "seller", "vendor", "agent portal", "two-sided"]);
  const wantsMultiTenant = !explicitStatic && hasAny(text, ["multi-tenant", "multitenant", "multiple clinics", "multiple companies", "organizations", "workspaces", "tenants"]);
  const wantsCrud = !explicitStatic && (wantsAuth || wantsBooking || wantsCommerce || wantsAdmin || wantsMarketplace || capabilitiesRequested.some((value) => /crud|database|backend|manage/.test(value)));

  const surfaces = inferSurfaces({ wantsAuth, wantsBooking, wantsCommerce, wantsAdmin, wantsMarketplace });
  const roles = buildRoles({ wantsAuth, wantsAdmin, wantsMarketplace, wantsMultiTenant });
  const entities = buildEntities({ profile, wantsAuth, wantsCrud, wantsBooking, wantsCommerce, wantsStorage, wantsMarketplace, wantsAnalytics, wantsMultiTenant });
  const capabilities = buildCapabilities({
    roles,
    entities,
    wantsAuth,
    wantsBooking,
    wantsCommerce,
    wantsPayments,
    wantsStorage,
    wantsNotifications,
    wantsSearch,
    wantsAdmin,
    wantsAi,
    wantsAnalytics,
    wantsCrud,
  });
  const workflows = buildWorkflows({ roles, entities, wantsBooking, wantsCommerce, wantsPayments, wantsNotifications, wantsAuth });
  const policies = buildPolicies({ roles, entities, wantsAuth, wantsMultiTenant });
  const integrations = buildIntegrations({ wantsPayments, wantsNotifications, wantsAi, wantsAnalytics });
  const acceptanceTests = buildAcceptanceTests({ wantsAuth, wantsBooking, wantsCommerce, wantsPayments, wantsNotifications, wantsAdmin, wantsStorage });
  const backendRequired = wantsCrud || wantsAuth || wantsBooking || wantsCommerce || wantsPayments || wantsNotifications || wantsAnalytics || wantsAi;

  return functionalArchitectureSchema.parse({
    version: "1.0",
    productType: inferProductType(profile, surfaces),
    surfaces,
    roles,
    entities,
    capabilities,
    workflows,
    policies,
    integrations,
    acceptanceTests,
    backendRequired,
    multiTenant: wantsMultiTenant,
    requiresAuth: wantsAuth || wantsAdmin || wantsMarketplace,
    requiresPayments: wantsPayments,
    requiresFileStorage: wantsStorage,
    requiresBackgroundJobs: wantsNotifications || wantsPayments,
    notes: [
      "Functional plan is deterministic and must be validated against the final generated application before publish.",
      ...(explicitStatic ? ["The brief explicitly requests a static website without application backend functionality."] : []),
      ...(backendRequired ? ["Server-side validation is required for all state-changing operations."] : []),
      ...(wantsAuth ? ["Default-deny authorization applies to authenticated data until an explicit policy grants access."] : []),
    ],
  });
}

function inferSurfaces(input: { wantsAuth: boolean; wantsBooking: boolean; wantsCommerce: boolean; wantsAdmin: boolean; wantsMarketplace: boolean }): ProductSurface[] {
  const surfaces: ProductSurface[] = ["marketing-site"];
  if (input.wantsAuth) surfaces.push("portal");
  if (input.wantsBooking) surfaces.push("booking");
  if (input.wantsCommerce) surfaces.push("commerce");
  if (input.wantsMarketplace) surfaces.push("marketplace");
  if (input.wantsAdmin) surfaces.push("admin", "dashboard");
  if (input.wantsAuth || input.wantsBooking || input.wantsCommerce || input.wantsMarketplace) surfaces.push("web-app", "api");
  return [...new Set(surfaces)];
}

function buildRoles(input: { wantsAuth: boolean; wantsAdmin: boolean; wantsMarketplace: boolean; wantsMultiTenant: boolean }): FunctionalRole[] {
  const roles: FunctionalRole[] = [{ id: "visitor", name: "Visitor", description: "Unauthenticated public visitor.", authenticated: false, permissions: ["read:public"] }];
  if (input.wantsAuth) roles.push({ id: "user", name: "User", description: "Authenticated end user with access to their own data.", authenticated: true, permissions: ["read:own", "write:own"] });
  if (input.wantsMarketplace) roles.push({ id: "provider", name: "Provider", description: "Authenticated provider, seller or agent managing owned listings and enquiries.", authenticated: true, permissions: ["read:own", "write:own", "manage:listings"] });
  if (input.wantsAdmin) roles.push({ id: "admin", name: "Administrator", description: "Privileged operator for application management.", authenticated: true, permissions: ["manage:application"] });
  if (input.wantsMultiTenant) roles.push({ id: "tenant_admin", name: "Tenant Administrator", description: "Administrator scoped to one organization or workspace.", authenticated: true, permissions: ["manage:tenant"] });
  return roles;
}

function buildEntities(input: { profile: OnboardingProfile; wantsAuth: boolean; wantsCrud: boolean; wantsBooking: boolean; wantsCommerce: boolean; wantsStorage: boolean; wantsMarketplace: boolean; wantsAnalytics: boolean; wantsMultiTenant: boolean }): FunctionalEntity[] {
  const entities: FunctionalEntity[] = [];
  if (input.wantsMultiTenant) entities.push(entity("tenant", "Tenant", "Organization/workspace boundary.", "system", [field("name", "text", true), field("slug", "text", true, true)], true));
  if (input.wantsBooking) entities.push(entity("booking", "Booking", "Appointment or reservation request.", input.wantsMultiTenant ? "tenant" : "user", [field("name", "text", true), field("email", "email", true), field("phone", "phone"), field("starts_at", "datetime", true), field("status", "text", true), field("notes", "text")], true));
  if (input.wantsCommerce) {
    entities.push(entity("product", "Product", "Sellable product or service.", input.wantsMultiTenant ? "tenant" : "system", [field("name", "text", true), field("price", "number", true), field("active", "boolean", true)], true));
    entities.push(entity("order", "Order", "Checkout and payment lifecycle.", "user", [field("status", "text", true), field("amount", "number", true), field("payment_reference", "text")], true));
  }
  if (input.wantsMarketplace) entities.push(entity("listing", "Listing", "Provider-managed public listing.", "user", [field("title", "text", true), field("description", "text", true), field("status", "text", true)], true));
  if (input.wantsStorage) entities.push(entity("asset", "Asset", "Uploaded file or media metadata.", "user", [field("url", "url", true), field("mime_type", "text", true), field("size", "number")], true));
  if (input.wantsAnalytics) entities.push(entity("event", "Analytics Event", "Privacy-aware product or visitor event.", "system", [field("event_name", "text", true), field("occurred_at", "datetime", true), field("metadata", "json")], false));
  if (!entities.length && hasAny(profileText(input.profile), ["contact", "enquiry", "lead"])) entities.push(entity("enquiry", "Enquiry", "Website contact or lead enquiry.", "system", [field("name", "text", true), field("email", "email", true), field("phone", "phone"), field("message", "text", true)], true));
  if (!entities.length && input.wantsCrud) entities.push(entity("record", "Application Record", "Generic persisted application record required by the explicit backend/data-management request.", input.wantsAuth ? "user" : "system", [field("title", "text", true), field("status", "text"), field("data", "json")], true));
  return entities;
}

function buildCapabilities(input: {
  roles: FunctionalRole[]; entities: FunctionalEntity[]; wantsAuth: boolean; wantsBooking: boolean; wantsCommerce: boolean; wantsPayments: boolean; wantsStorage: boolean; wantsNotifications: boolean; wantsSearch: boolean; wantsAdmin: boolean; wantsAi: boolean; wantsAnalytics: boolean; wantsCrud: boolean;
}): FunctionalCapability[] {
  const allRoleIds = input.roles.filter((role) => role.authenticated).map((role) => role.id);
  const entityIds = input.entities.map((entity) => entity.id);
  const out: FunctionalCapability[] = [];
  if (input.wantsAuth) out.push(cap("auth", "Authentication", "auth", "Sign in, sign out, session handling and protected access.", allRoleIds));
  if (input.wantsCrud) out.push(cap("data-management", "Data management", "crud", "Validated create/read/update/delete operations for application records.", allRoleIds, entityIds));
  if (input.wantsSearch) out.push(cap("search", "Search and filtering", "search", "Server-backed search, filtering and pagination.", ["visitor", ...allRoleIds], entityIds));
  if (input.wantsBooking) out.push(cap("booking", "Booking workflow", "booking", "Create, manage and confirm appointment or reservation requests.", ["visitor", ...allRoleIds], ["booking"]));
  if (input.wantsCommerce) out.push(cap("commerce", "Commerce", "workflow", "Catalog, cart/order and checkout workflow.", ["visitor", ...allRoleIds], ["product", "order"]));
  if (input.wantsPayments) out.push(cap("payments", "Payments", "payment", "Server-created payment intents/orders with webhook verification and idempotency.", allRoleIds, ["order"]));
  if (input.wantsStorage) out.push(cap("storage", "File storage", "storage", "Authenticated upload, validation and ownership-aware file access.", allRoleIds, ["asset"]));
  if (input.wantsNotifications) out.push(cap("notifications", "Notifications", "notification", "Transactional notifications driven by backend events.", allRoleIds));
  if (input.wantsAdmin) out.push(cap("admin", "Administration", "admin", "Privileged operational management with auditability.", input.roles.filter((role) => /admin/.test(role.id)).map((role) => role.id), entityIds));
  if (input.wantsAi) out.push(cap("ai", "AI assistance", "ai", "Server-mediated AI feature with tenant/user scoping and rate limits.", allRoleIds, entityIds));
  if (input.wantsAnalytics) out.push(cap("analytics", "Analytics", "analytics", "Privacy-aware application and visitor analytics.", input.wantsAdmin ? ["admin"] : allRoleIds, ["event"]));
  return out;
}

function buildWorkflows(input: { roles: FunctionalRole[]; entities: FunctionalEntity[]; wantsBooking: boolean; wantsCommerce: boolean; wantsPayments: boolean; wantsNotifications: boolean; wantsAuth: boolean }): FunctionalWorkflow[] {
  const out: FunctionalWorkflow[] = [];
  if (input.wantsAuth) out.push({ id: "authenticate-user", name: "Authenticate user", trigger: "user", description: "Establish and verify an authenticated session.", steps: [{ id: "submit-credentials", action: "submit authentication request", requiresAuth: false, idempotent: false }, { id: "establish-session", action: "establish verified session", requiresAuth: false, idempotent: true }] });
  if (input.wantsBooking) out.push({ id: "create-booking", name: "Create booking", trigger: "user", description: "Validate and persist a booking, then optionally notify stakeholders.", steps: [{ id: "validate-booking", action: "validate booking input and availability", entityId: "booking", requiresAuth: false, idempotent: true }, { id: "persist-booking", action: "persist booking", entityId: "booking", requiresAuth: false, idempotent: true }, ...(input.wantsNotifications ? [{ id: "notify-booking", action: "enqueue booking notification", entityId: "booking", requiresAuth: false, idempotent: true }] : [])] });
  if (input.wantsCommerce) out.push({ id: "checkout-order", name: "Checkout order", trigger: "user", description: "Create and complete an order safely.", steps: [{ id: "create-order", action: "create order from server-validated pricing", entityId: "order", requiresAuth: true, idempotent: true }, ...(input.wantsPayments ? [{ id: "create-payment", action: "create payment request", entityId: "order", requiresAuth: true, idempotent: true }, { id: "verify-payment", action: "verify signed payment webhook before marking paid", entityId: "order", requiresAuth: false, idempotent: true }] : [])] });
  return out;
}

function buildPolicies(input: { roles: FunctionalRole[]; entities: FunctionalEntity[]; wantsAuth: boolean; wantsMultiTenant: boolean }): FunctionalPolicy[] {
  const policies: FunctionalPolicy[] = [];
  for (const entity of input.entities) {
    if (entity.ownership === "public") continue;
    const scopedRule = input.wantsMultiTenant || entity.ownership === "tenant" ? "row tenant_id must equal the authenticated user's tenant_id" : entity.ownership === "user" ? "row owner_user_id must equal auth.uid()" : "operation requires privileged server/admin context";
    for (const operation of ["select", "insert", "update", "delete"] as const) {
      policies.push({ id: `${entity.id}-${operation}`, entityId: entity.id, operation, roleIds: input.roles.filter((role) => role.authenticated).map((role) => role.id), rule: scopedRule });
    }
  }
  return policies;
}

function buildIntegrations(input: { wantsPayments: boolean; wantsNotifications: boolean; wantsAi: boolean; wantsAnalytics: boolean }): FunctionalIntegration[] {
  const out: FunctionalIntegration[] = [];
  if (input.wantsPayments) out.push({ id: "payments", provider: "payment-provider", purpose: "Payment collection and webhook settlement.", required: true, serverOnlySecrets: true });
  if (input.wantsNotifications) out.push({ id: "transactional-messaging", provider: "messaging-provider", purpose: "Transactional email/SMS/WhatsApp delivery.", required: false, serverOnlySecrets: true });
  if (input.wantsAi) out.push({ id: "ai-provider", provider: "ai-model-provider", purpose: "AI inference through a server-side gateway.", required: true, serverOnlySecrets: true });
  if (input.wantsAnalytics) out.push({ id: "analytics", provider: "analytics-provider", purpose: "Application and visitor analytics.", required: false, serverOnlySecrets: false });
  return out;
}

function buildAcceptanceTests(input: { wantsAuth: boolean; wantsBooking: boolean; wantsCommerce: boolean; wantsPayments: boolean; wantsNotifications: boolean; wantsAdmin: boolean; wantsStorage: boolean }): FunctionalAcceptanceTest[] {
  const tests: FunctionalAcceptanceTest[] = [test("invalid-write-rejected", "Server rejects invalid writes", "security", "A state-changing request has invalid or missing fields", "The request reaches the server validation boundary", ["No invalid record is persisted", "The client receives a safe validation error"])];
  if (input.wantsAuth) tests.push(test("protected-route", "Protected routes enforce authentication", "auth", "No authenticated session exists", "A protected route or action is requested", ["Access is denied", "No protected data is returned"]));
  if (input.wantsAdmin) tests.push(test("admin-permission", "Non-admin cannot use admin actions", "permission", "An authenticated non-admin user exists", "They call an admin-only action", ["The server denies the action", "No privileged state changes"]));
  if (input.wantsBooking) tests.push(test("booking-persists", "Booking persists once", "workflow", "A valid booking request exists", "The booking is submitted twice with the same idempotency key", ["Exactly one booking is stored", "A stable result is returned"]));
  if (input.wantsCommerce) tests.push(test("server-price-authority", "Checkout uses server-authoritative pricing", "security", "A client submits a manipulated price", "An order is created", ["Server pricing overrides client pricing", "The stored amount matches trusted product data"]));
  if (input.wantsPayments) tests.push(test("payment-webhook", "Payment webhook is verified and idempotent", "payment", "A payment provider sends a signed event", "The event is delivered more than once", ["Signature is verified", "Order state changes at most once"]));
  if (input.wantsNotifications) tests.push(test("notification-retry", "Notification delivery can retry safely", "resilience", "A transactional message provider temporarily fails", "The backend retries delivery", ["The primary transaction remains successful", "Duplicate user-visible notifications are prevented"]));
  if (input.wantsStorage) tests.push(test("upload-policy", "Uploads enforce validation and ownership", "security", "A user attempts an invalid or unauthorized upload", "The upload request is processed", ["Invalid file types/sizes are rejected", "Users cannot access another user's private asset"]));
  return tests;
}

function inferProductType(profile: OnboardingProfile, surfaces: ProductSurface[]): string {
  const text = profileText(profile);
  if (surfaces.includes("marketplace")) return "marketplace-application";
  if (surfaces.includes("commerce")) return "commerce-application";
  if (hasAny(text, ["saas", "software", "dashboard", "portal", "app"])) return "web-application";
  if (surfaces.includes("booking")) return "service-business-with-booking";
  return "marketing-website";
}

function isExplicitStaticProfile(profile: OnboardingProfile, capabilitiesRequested: string[], goals: string[]): boolean {
  if (capabilitiesRequested.length > 0) return false;
  if (goals.some((goal) => /login|account|portal|dashboard|book|appointment|checkout|payment|upload|backend|database|admin|manage|subscription/.test(goal))) return false;
  const notes = typeof profile.notes === "string" ? profile.notes.trim().toLowerCase() : "";
  const staticIntent = /\bstatic\b|\bmarketing-only\b|\bmarketing only\b/.test(notes);
  const explicitNoBackend = /\bno\s+(?:app\s+)?backend\b|\bwithout\s+(?:an?\s+)?(?:app\s+)?backend\b/.test(notes);
  const explicitNoInteractiveApp = /\bno\s+(?:login|sign[- ]?in|accounts?|forms?|portal|dashboard)\b/.test(notes);
  return staticIntent && (explicitNoBackend || explicitNoInteractiveApp);
}

function entity(id: string, name: string, description: string, ownership: FunctionalEntity["ownership"], fields: FunctionalEntity["fields"], auditRequired: boolean): FunctionalEntity { return { id, name, description, ownership, fields, indexes: [], auditRequired }; }
function field(id: string, type: FunctionalEntity["fields"][number]["type"], required = false, unique = false) { return { id, type, required, unique }; }
function cap(id: string, name: string, category: FunctionalCapability["category"], description: string, roles: string[], entityIds: string[] = []): FunctionalCapability { return { id, name, category, description, required: true, roles, entityIds }; }
function test(id: string, name: string, category: FunctionalAcceptanceTest["category"], given: string, when: string, then: string[]): FunctionalAcceptanceTest { return { id, name, category, required: true, given, when, then }; }
function profileText(profile: OnboardingProfile): string { return [profile.business_name, profile.industry, profile.subindustry, profile.location, ...(profile.goals ?? []), ...(profile.style_tags ?? []), ...(profile.required_capabilities ?? []), ...(profile.services ?? []), profile.notes].filter((value): value is string => typeof value === "string").join(" ").toLowerCase(); }
function stringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean) : []; }
function hasAny(text: string, terms: string[]) { return terms.some((term) => text.includes(term)); }
