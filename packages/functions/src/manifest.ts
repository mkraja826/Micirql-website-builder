import type { FunctionDefinition } from "@micirql/schema";
import { nativeFunctionCatalog } from "./catalog";

export const nativeFunctionManifest: FunctionDefinition[] = nativeFunctionCatalog.map((definition) => ({
  id: definition.id,
  version: definition.version,
  description: definition.description,
  inputSchemaId: `micirql.function.${definition.id}.input.v${definition.version}`,
  outputSchemaId: `micirql.function.${definition.id}.output.v${definition.version}`,
  permissions: {
    public: definition.access === "public" ? ["invoke"] : [],
    authenticated: definition.access === "authenticated" ? ["invoke"] : [],
    roles:
      definition.access === "role-restricted"
        ? Object.fromEntries((definition.allowedRoles ?? []).map((role) => [role, ["invoke"]]))
        : {},
  },
  rateLimited: true,
  serverValidationRequired: true,
  adapterType: "native",
}));

export function getNativeFunctionManifest(actionId: string) {
  return nativeFunctionManifest.find((definition) => definition.id === actionId);
}
