import { designRegistryEntrySchema, type DesignRegistryEntry } from "./design";
import { functionRegistryEntrySchema, type FunctionRegistryEntry } from "./function";
import { rankDesigns, type DesignQuery, type RankedDesign } from "./rank";

export class RegistryStore {
  private readonly designs = new Map<string, DesignRegistryEntry>();
  private readonly functions = new Map<string, FunctionRegistryEntry>();

  registerDesign(input: unknown): DesignRegistryEntry {
    const entry = designRegistryEntrySchema.parse(input);
    const key = `${entry.id}@${entry.version}`;
    this.designs.set(key, entry);
    return entry;
  }

  registerFunction(input: unknown): FunctionRegistryEntry {
    const entry = functionRegistryEntrySchema.parse(input);
    const key = `${entry.definition.id}@${entry.definition.version}`;
    this.functions.set(key, entry);
    return entry;
  }

  getDesign(id: string, version: string): DesignRegistryEntry | undefined {
    return this.designs.get(`${id}@${version}`);
  }

  getFunction(id: string, version: string): FunctionRegistryEntry | undefined {
    return this.functions.get(`${id}@${version}`);
  }

  listDesigns(): DesignRegistryEntry[] {
    return [...this.designs.values()];
  }

  listFunctions(): FunctionRegistryEntry[] {
    return [...this.functions.values()];
  }

  rank(query: DesignQuery): RankedDesign[] {
    return rankDesigns(this.listDesigns(), query);
  }
}
