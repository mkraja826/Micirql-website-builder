import type { GeneratedImageBinary, ImageGenerationInput } from "./image-generation";
import type { MeteredModelResult } from "./usage";

export type ImageProviderConfig = {
  id: string;
  endpoint: string;
  apiKey: string;
  model: string;
  size: `${number}x${number}`;
  imageCostMicrousd: number;
  headers?: Record<string, string>;
  responseFormat?: "b64_json" | "url";
};

type ImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export function createOpenAiCompatibleImageExecutor(config: ImageProviderConfig) {
  validateConfig(config);
  return {
    profileId: config.id,
    async run(input: ImageGenerationInput): Promise<MeteredModelResult<GeneratedImageBinary>> {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
          ...config.headers,
        },
        body: JSON.stringify({
          model: config.model,
          prompt: input.prompt,
          size: config.size,
          n: 1,
          response_format: config.responseFormat ?? "b64_json",
        }),
      });

      const payload = await parsePayload(response);
      if (!response.ok) throw new Error(payload.error?.message ?? `Image provider request failed (${response.status}).`);
      const item = payload.data?.[0];
      if (!item) throw new Error("Image provider returned no image.");

      const bytes = item.b64_json
        ? decodeBase64(item.b64_json)
        : item.url
          ? await fetchImageBytes(item.url)
          : undefined;
      if (!bytes?.byteLength) throw new Error("Image provider returned an empty image.");

      return {
        output: {
          bytes,
          contentType: "image/png",
          fileName: `generated-${crypto.randomUUID()}.png`,
          alt: input.purpose,
          tags: [input.domain, input.purpose, "ai-generated"].filter(Boolean),
        },
        usage: { images: 1, costMicrousd: config.imageCostMicrousd },
      };
    },
  };
}

function validateConfig(config: ImageProviderConfig): void {
  if (!config.id.trim()) throw new Error("Image provider id is required.");
  if (!config.model.trim()) throw new Error("Image provider model is required.");
  if (!config.apiKey.trim()) throw new Error("Image provider API key is required.");
  if (!Number.isInteger(config.imageCostMicrousd) || config.imageCostMicrousd < 0) {
    throw new Error("Image provider cost must be a non-negative integer in micro-USD.");
  }
  if (!/^\d+x\d+$/.test(config.size)) throw new Error("Image provider size must look like 1536x1024.");
  let endpoint: URL;
  try { endpoint = new URL(config.endpoint); } catch { throw new Error("Image provider endpoint must be a valid URL."); }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    throw new Error("Image provider endpoint must use HTTPS unless it is local development.");
  }
}

async function parsePayload(response: Response): Promise<ImageResponse> {
  try { return await response.json() as ImageResponse; }
  catch { throw new Error(`Image provider returned invalid JSON (${response.status}).`); }
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error("Generated image URL must use HTTPS.");
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Generated image download failed (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
