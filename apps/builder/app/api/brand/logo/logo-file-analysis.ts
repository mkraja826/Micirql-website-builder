export type LogoFileAnalysis = {
  width?: number;
  height?: number;
  hasTransparency?: boolean;
};

export function analyzeLogoFile(bytes: Uint8Array, contentType: string): LogoFileAnalysis {
  if (contentType === "image/png") return analyzePng(bytes);
  if (contentType === "image/jpeg") return analyzeJpeg(bytes);
  if (contentType === "image/webp") return analyzeWebp(bytes);
  if (contentType === "image/svg+xml") return analyzeSvg(bytes);
  return {};
}

function analyzePng(bytes: Uint8Array): LogoFileAnalysis {
  if (bytes.length < 26) return {};
  const signature = [137,80,78,71,13,10,26,10];
  if (!signature.every((value,index)=>bytes[index]===value)) return {};
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const colorType = bytes[25];
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  const text = ascii(bytes);
  return { width, height, hasTransparency: hasAlphaChannel || text.includes("tRNS") };
}

function analyzeJpeg(bytes: Uint8Array): LogoFileAnalysis {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return {};
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      const height = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
      const width = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
      return { width, height, hasTransparency: false };
    }
    offset += length + 2;
  }
  return { hasTransparency: false };
}

function analyzeWebp(bytes: Uint8Array): LogoFileAnalysis {
  if (bytes.length < 30 || ascii(bytes.slice(0,4)) !== "RIFF" || ascii(bytes.slice(8,12)) !== "WEBP") return {};
  const chunk = ascii(bytes.slice(12,16));
  if (chunk === "VP8X") {
    const flags = bytes[20] ?? 0;
    const width = 1 + u24(bytes,24);
    const height = 1 + u24(bytes,27);
    return { width, height, hasTransparency: Boolean(flags & 0x10) };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b1=bytes[21]??0,b2=bytes[22]??0,b3=bytes[23]??0,b4=bytes[24]??0;
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return { width, height, hasTransparency: true };
  }
  return {};
}

function analyzeSvg(bytes: Uint8Array): LogoFileAnalysis {
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 65536)));
  const svg = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const width = numberAttr(svg,"width");
  const height = numberAttr(svg,"height");
  if (width && height) return { width, height, hasTransparency: true };
  const viewBox = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  return { width: positiveNumber(viewBox?.[1]), height: positiveNumber(viewBox?.[2]), hasTransparency: true };
}

function numberAttr(svg:string,name:string){return positiveNumber(svg.match(new RegExp(`${name}\\s*=\\s*["']([\\d.]+)`,"i"))?.[1]);}
function positiveNumber(value?:string){const n=value?Number(value):NaN;return Number.isFinite(n)&&n>0?n:undefined;}
function u24(bytes:Uint8Array,offset:number){return (bytes[offset]??0)|((bytes[offset+1]??0)<<8)|((bytes[offset+2]??0)<<16);}
function ascii(bytes:Uint8Array){return String.fromCharCode(...bytes);}
