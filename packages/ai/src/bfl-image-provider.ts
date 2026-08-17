import type { GeneratedImageBinary, ImageGenerationInput } from "./image-generation";
import type { ImageProviderConfig } from "./image-provider";
import type { MeteredModelResult } from "./usage";

type BflSubmitResponse = {
  id?: string;
  polling_url?: string;
  detail?: unknown;
  error?: unknown;
};

type BflPollResponse = {
  status?: string;
  result?: { sample?: string };
  detail?: unknown;
  error?: unknown;
};

export function createBflImageExecutor(config: ImageProviderConfig) {
  const { width, height } = parseSize(config.size);
  return {
    profileId: config.id,
    async run(input: ImageGenerationInput): Promise<MeteredModelResult<GeneratedImageBinary>> {
      const submit = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-key": config.apiKey,
        },
        body: JSON.stringify({ prompt: input.prompt, width, height }),
      });
      const submitted = await json<BflSubmitResponse>(submit);
      if (!submit.ok) {
        throw new Error(`BFL image request failed (${submit.status}): ${describeProviderError(submitted)}`);
      }
      if (!submitted.polling_url) throw new Error("BFL image request returned no polling URL.");

      const imageUrl = await waitForImage(submitted.polling_url, config.apiKey);
      const image = await fetch(imageUrl, { headers: { accept: "image/*" } });
      if (!image.ok) throw new Error(`BFL generated image download failed (${image.status}).`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      if (!bytes.byteLength) throw new Error("BFL generated image was empty.");
      const contentType = image.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

      return {
        output: {
          bytes,
          contentType,
          fileName: `generated-${crypto.randomUUID()}.${extension}`,
          alt: input.purpose,
          tags: [input.domain, input.purpose, "ai-generated", "bfl", "flux-2-klein-4b"].filter(Boolean),
        },
        usage: { images: 1, costMicrousd: config.imageCostMicrousd },
      };
    },
  };
}

async function waitForImage(pollingUrl: string, apiKey: string): Promise<string> {
  const target = new URL(pollingUrl);
  if (target.protocol !== "https:") throw new Error("BFL polling URL must use HTTPS.");
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (attempt > 0) await sleep(500);
    const response = await fetch(target, { headers: { accept: "application/json", "x-key": apiKey }, cache: "no-store" });
    const payload = await json<BflPollResponse>(response);
    if (!response.ok) throw new Error(`BFL image polling failed (${response.status}): ${describeProviderError(payload)}`);
    if (payload.status === "Ready") {
      const sample = payload.result?.sample;
      if (!sample) throw new Error("BFL image result returned no sample URL.");
      const sampleUrl = new URL(sample);
      if (sampleUrl.protocol !== "https:") throw new Error("BFL image result URL must use HTTPS.");
      return sampleUrl.toString();
    }
    if (payload.status === "Error" || payload.status === "Failed") {
      throw new Error(`BFL image generation failed: ${describeProviderError(payload)}`);
    }
  }
  throw new Error("BFL image generation timed out.");
}

function parseSize(size: `${number}x${number}`) {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) throw new Error("Invalid BFL image size.");
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function json<T>(response: Response): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error(`BFL returned invalid JSON (${response.status}).`); }
}

function describeProviderError(payload: { detail?: unknown; error?: unknown }): string {
  const value = payload.detail ?? payload.error;
  if (typeof value === "string") return value.slice(0, 600);
  if (value !== undefined) {
    try { return JSON.stringify(value).slice(0, 600); }
    catch { return "provider returned structured validation details"; }
  }
  return "provider returned no validation detail";
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
