export type BrandPaletteDecision = "use" | "repair" | "decouple";

export type BrandPaletteInput = {
  logoColors: string[];
  industry?: string;
};

export type BrandPaletteAssessment = {
  decision: BrandPaletteDecision;
  score: number;
  logoColors: string[];
  primary: string;
  secondary: string;
  accent: string;
  neutrals: [string, string];
  logoSurface: "light" | "dark" | "neutral-container";
  reasons: string[];
};

const FALLBACK = { primary: "#171717", secondary: "#F7F7F5", accent: "#6D5EF5" };

export function assessBrandPalette(input: BrandPaletteInput): BrandPaletteAssessment {
  const colors = input.logoColors.map(normalizeHex).filter((v): v is string => Boolean(v)).slice(0, 6);
  if (!colors.length) return fallback("No reliable logo colors were detected.");

  const unique = [...new Set(colors)];
  const extremes = unique.map(relativeLuminance);
  const spread = Math.max(...extremes) - Math.min(...extremes);
  const saturated = unique.filter(c => saturation(c) > 0.82).length;
  const usableDark = unique.some(c => contrastRatio(c, "#FFFFFF") >= 4.5);
  const usableLight = unique.some(c => contrastRatio(c, "#111111") >= 4.5);

  let score = 100;
  const reasons: string[] = [];
  if (unique.length > 4) { score -= 18; reasons.push("Logo contains too many competing brand colors."); }
  if (saturated >= 3) { score -= 25; reasons.push("Several logo colors are extremely saturated."); }
  if (spread < 0.18) { score -= 20; reasons.push("Logo colors provide little tonal range for a full interface."); }
  if (!usableDark || !usableLight) { score -= 22; reasons.push("Logo palette cannot provide accessible light and dark text relationships by itself."); }
  score = Math.max(0, Math.min(100, score));

  const strongest = unique[0]!;
  if (score >= 75) {
    return { decision: "use", score, logoColors: unique, primary: strongest, secondary: pickSurface(strongest), accent: unique[1] ?? strongest, neutrals: ["#FFFFFF", "#111111"], logoSurface: contrastRatio(strongest,"#FFFFFF") >= 4.5 ? "light" : "dark", reasons: reasons.length ? reasons : ["Logo palette is suitable for a complete accessible website system."] };
  }
  if (score >= 45) {
    return { decision: "repair", score, logoColors: unique, primary: strongest, secondary: pickSurface(strongest), accent: unique.find(c => c !== strongest && saturation(c) < 0.82) ?? strongest, neutrals: ["#FAFAF8", "#181818"], logoSurface: "neutral-container", reasons: [...reasons, "Preserve the strongest brand color and introduce controlled supporting neutrals."] };
  }
  return { ...fallback("Logo colors are unsuitable as the main website design system."), score, logoColors: unique, reasons: [...reasons, "Preserve the original logo, but decouple the website palette from it."] };
}

function fallback(reason: string): BrandPaletteAssessment { return { decision:"decouple", score:0, logoColors:[], primary:FALLBACK.primary, secondary:FALLBACK.secondary, accent:FALLBACK.accent, neutrals:["#FFFFFF","#111111"], logoSurface:"neutral-container", reasons:[reason] }; }
function normalizeHex(value:string){const v=value.trim();if(/^#[0-9a-f]{6}$/i.test(v))return v.toUpperCase();if(/^#[0-9a-f]{3}$/i.test(v))return `#${v.slice(1).split("").map(x=>x+x).join("")}`.toUpperCase();return undefined;}
function rgb(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];}
function relativeLuminance(hex:string){const [r,g,b]=rgb(hex).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*r+.7152*g+.0722*b;}
function contrastRatio(a:string,b:string){const [x,y]=[relativeLuminance(a),relativeLuminance(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);}
function saturation(hex:string){const [r,g,b]=rgb(hex);const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max===min)return 0;const l=(max+min)/2;return (max-min)/(1-Math.abs(2*l-1));}
function pickSurface(brand:string){return relativeLuminance(brand)<.35?"#F8F8F6":"#171717";}
