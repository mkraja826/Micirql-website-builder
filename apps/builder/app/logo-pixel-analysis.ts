export type LogoPixelAnalysis = {
  width: number;
  height: number;
  hasTransparency: boolean;
  edgeBackgroundRatio: number;
  backgroundSignal: "transparent" | "embedded" | "clean-opaque" | "unknown";
  edgeColor?: string;
};

/**
 * Samples a browser-decoded logo rather than guessing from its file format.
 * The result is advisory: the server still validates dimensions/file type and
 * combines this signal with Logo Intelligence before choosing presentation.
 */
export async function analyzeLogoPixels(file: File): Promise<LogoPixelAnalysis | undefined> {
  if (file.type === "image/svg+xml") return undefined;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) return undefined;

    const maxDimension = 160;
    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(8, Math.round(naturalWidth * scale));
    const height = Math.max(8, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;

    const edgeDepth = Math.max(1, Math.min(4, Math.round(Math.min(width, height) * 0.035)));
    const edge: Array<[number, number, number, number]> = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x >= edgeDepth && x < width - edgeDepth && y >= edgeDepth && y < height - edgeDepth) continue;
        const index = (y * width + x) * 4;
        edge.push([pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0, pixels[index + 3] ?? 0]);
      }
    }
    if (!edge.length) return undefined;

    const transparent = edge.filter(([, , , a]) => a < 24).length;
    const transparentRatio = transparent / edge.length;
    const opaque = edge.filter(([, , , a]) => a >= 220);
    if (transparentRatio >= 0.18) {
      return { width: naturalWidth, height: naturalHeight, hasTransparency: true, edgeBackgroundRatio: 0, backgroundSignal: "transparent" };
    }
    if (!opaque.length) {
      return { width: naturalWidth, height: naturalHeight, hasTransparency: true, edgeBackgroundRatio: 0, backgroundSignal: "transparent" };
    }

    const median = medianColor(opaque);
    const tolerance = 34;
    const close = opaque.filter(([r, g, b]) => rgbDistance([r, g, b], median) <= tolerance).length;
    const consistency = close / opaque.length;
    const edgeColor = toHex(...median);

    // A large, consistent opaque edge is strong evidence of a rectangular
    // background. Low consistency means the artwork itself reaches the edge.
    const embedded = consistency >= 0.78;
    const cleanOpaque = consistency <= 0.48;
    return {
      width: naturalWidth,
      height: naturalHeight,
      hasTransparency: false,
      edgeBackgroundRatio: Number(consistency.toFixed(3)),
      backgroundSignal: embedded ? "embedded" : cleanOpaque ? "clean-opaque" : "unknown",
      edgeColor,
    };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Creates a transparent PNG derivative without touching the original file.
 * Only border-connected pixels close to the sampled edge color are removed,
 * which avoids globally deleting matching colors from the logo artwork.
 */
export async function createTransparentLogoDerivative(file: File, analysis?: LogoPixelAnalysis): Promise<string | undefined> {
  if (!analysis || file.type === "image/svg+xml" || analysis.hasTransparency) return undefined;
  if (analysis.backgroundSignal !== "embedded" || analysis.edgeBackgroundRatio < 0.9 || !analysis.edgeColor) return undefined;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) return undefined;

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const background = hexToRgb(analysis.edgeColor);
    if (!background) return undefined;

    const pixelCount = width * height;
    const visited = new Uint8Array(pixelCount);
    const queue = new Uint32Array(pixelCount);
    let head = 0;
    let tail = 0;
    const tolerance = 66;

    const enqueue = (index: number) => {
      if (visited[index]) return;
      const offset = index * 4;
      const alpha = data[offset + 3] ?? 0;
      const color: [number, number, number] = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
      if (alpha < 18 || rgbDistance(color, background) <= tolerance) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    };

    for (let x = 0; x < width; x++) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head++] ?? 0;
      const x = index % width;
      const y = Math.floor(index / width);
      const offset = index * 4;
      const color: [number, number, number] = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
      const distance = rgbDistance(color, background);
      const existingAlpha = data[offset + 3] ?? 255;
      const fade = distance <= 30 ? 0 : Math.min(1, (distance - 30) / (tolerance - 30));
      data[offset + 3] = Math.min(existingAlpha, Math.round(255 * fade));

      if (x > 0) enqueue(index - 1);
      if (x + 1 < width) enqueue(index + 1);
      if (y > 0) enqueue(index - width);
      if (y + 1 < height) enqueue(index + width);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode logo pixels."));
    image.src = src;
  });
}

function medianColor(pixels: Array<[number, number, number, number]>): [number, number, number] {
  const channels = [0, 1, 2].map((channel) => pixels.map((pixel) => pixel[channel] ?? 0).sort((a, b) => a - b));
  const middle = Math.floor(pixels.length / 2);
  return [channels[0]?.[middle] ?? 0, channels[1]?.[middle] ?? 0, channels[2]?.[middle] ?? 0];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexToRgb(value: string): [number, number, number] | undefined {
  const match = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return undefined;
  return [parseInt(match[1] ?? "0", 16), parseInt(match[2] ?? "0", 16), parseInt(match[3] ?? "0", 16)];
}
