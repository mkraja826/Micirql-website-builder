"use client";

/**
 * Computes a 64-bit difference hash (dHash) from decoded image pixels.
 * The browser performs the decode so JPEG/PNG/WebP all work without a native
 * image dependency in the Cloudflare/OpenNext runtime.
 */
export async function computeImageDHash(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  const image = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return undefined;
    context.imageSmoothingEnabled = true;
    context.drawImage(image, 0, 0, 9, 8);
    const data = context.getImageData(0, 0, 9, 8).data;
    let bits = "";
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = luminance(data, (y * 9 + x) * 4);
        const right = luminance(data, (y * 9 + x + 1) * 4);
        bits += left > right ? "1" : "0";
      }
    }
    let hex = "";
    for (let i = 0; i < 64; i += 4) hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
    return /^[0-9a-f]{16}$/.test(hex) ? hex : undefined;
  } catch {
    return undefined;
  } finally {
    image.cleanup();
  }
}

function luminance(data: Uint8ClampedArray, index: number) {
  const r = data[index] ?? 0;
  const g = data[index + 1] ?? 0;
  const b = data[index + 2] ?? 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function loadImage(file: File): Promise<{ drawImage: CanvasImageSource; cleanup(): void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { drawImage: bitmap, cleanup: () => bitmap.close() };
    } catch {
      // Fall through to HTMLImageElement for older/mobile browsers.
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ drawImage: image, cleanup: () => URL.revokeObjectURL(url) });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode image for perceptual hashing.")); };
    image.src = url;
  });
}
