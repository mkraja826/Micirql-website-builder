import { getCloudflareContext } from "@opennextjs/cloudflare";

export const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const CLOUDFLARE_IMAGE_SIZE = { width: 1536, height: 1024 } as const;
export const CLOUDFLARE_IMAGE_COST_MICROUSD = 1722;

type WorkersAiBinding = {
  run(model: string, input: {
    multipart: {
      body: ReadableStream<Uint8Array> | null;
      contentType: string | null;
    };
  }): Promise<unknown>;
};

type WorkersAiImageResponse = { image?: string };

export function getWorkersAiBinding(): WorkersAiBinding | null {
  try {
    const context = getCloudflareContext();
    const ai = (context.env as unknown as Record<string, unknown>).AI;
    if (!ai || typeof (ai as { run?: unknown }).run !== "function") return null;
    return ai as WorkersAiBinding;
  } catch {
    return null;
  }
}

export async function generateWithWorkersAi(prompt: string) {
  const ai = getWorkersAiBinding();
  if (!ai) throw new Error("Cloudflare Workers AI binding is unavailable.");

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(CLOUDFLARE_IMAGE_SIZE.width));
  form.append("height", String(CLOUDFLARE_IMAGE_SIZE.height));

  const serialized = new Response(form);
  const response = await ai.run(CLOUDFLARE_IMAGE_MODEL, {
    multipart: {
      body: serialized.body,
      contentType: serialized.headers.get("content-type"),
    },
  }) as WorkersAiImageResponse;

  if (!response?.image) throw new Error("Cloudflare Workers AI returned no image.");
  const bytes = decodeBase64(response.image);
  if (!bytes.byteLength) throw new Error("Cloudflare Workers AI returned an empty image.");

  return {
    bytes,
    contentType: "image/png",
    model: CLOUDFLARE_IMAGE_MODEL,
    profileId: "cloudflare-workers-ai-flux-2-klein-4b",
    size: `${CLOUDFLARE_IMAGE_SIZE.width}x${CLOUDFLARE_IMAGE_SIZE.height}` as const,
    costMicrousd: CLOUDFLARE_IMAGE_COST_MICROUSD,
  };
}

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
