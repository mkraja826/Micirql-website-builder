import type { FunctionAdapter, FunctionExecutionContext, RuntimeFunctionDefinition } from "./types";

export type StoredFunctionRecord = {
  id: string;
  workspaceId: string;
  siteId: string;
  actionId: string;
  actionVersion: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "received" | "queued";
  createdAt: string;
};

export type RecordStore = {
  create(input: Omit<StoredFunctionRecord, "id" | "createdAt">): Promise<StoredFunctionRecord>;
};

export function createRecordStoreAdapter(store: RecordStore): FunctionAdapter {
  return {
    async execute<TInput, TOutput>({ definition, input, context }: {
      definition: RuntimeFunctionDefinition<TInput, TOutput>;
      input: TInput;
      context: FunctionExecutionContext;
    }): Promise<TOutput> {
      const payload = toRecord(input);
      const contactName = stringField(payload, "name");
      const contactEmail = stringField(payload, "email");
      const contactPhone = stringField(payload, "phone");
      const record = await store.create({
        workspaceId: context.workspaceId,
        siteId: context.siteId,
        actionId: definition.id,
        actionVersion: definition.version,
        payload,
        status: "received",
        ...(context.idempotencyKey ? { idempotencyKey: context.idempotencyKey } : {}),
        ...(contactName ? { contactName } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactPhone ? { contactPhone } : {}),
      });

      return definition.output.parse({ recordId: record.id, status: record.status }) as TOutput;
    },
  };
}

export function recordStoreAdapterMap(store: RecordStore): Record<string, FunctionAdapter> {
  const adapter = createRecordStoreAdapter(store);
  return {
    "records.leads.create": adapter,
    "records.appointments.create": adapter,
    "records.reservations.create": adapter,
    "records.quotes.create": adapter,
    "records.newsletter.create": adapter,
    "records.propertyEnquiries.create": adapter,
    "records.demoRequests.create": adapter,
    "records.bookingRequests.create": adapter,
    "records.enrollmentEnquiries.create": adapter,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Function input must be an object.");
  return value as Record<string, unknown>;
}

function stringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
