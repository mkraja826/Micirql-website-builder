export type AiJsonRequest = {
  system: string;
  input: unknown;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type AiJsonResult<T = unknown> = {
  provider: string;
  model: string;
  value: T;
  usage?: AiUsage;
};

export interface AiJsonProvider {
  id: string;
  generateJson<T = unknown>(request: AiJsonRequest): Promise<AiJsonResult<T>>;
}
