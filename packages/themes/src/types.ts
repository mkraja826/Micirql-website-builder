import type { ThemeFamily, ThemeModifier } from "@micirql/schema";

export type ThemeTokens = {
  radiusControl: string;
  radiusCard: string;
  shadowControl: string;
  shadowCard: string;
  borderWidth: string;
  surfaceOpacity: string;
  blur: string;
  sectionSpace: string;
  controlWeight: string;
  displayTracking: string;
  bodyLeading: string;
  motionFast: string;
  motionStandard: string;
  motionDistance: string;
  imageRadius: string;
  imageTreatment: "clean" | "soft" | "dramatic" | "editorial" | "immersive";
};

export type BrandColors = {
  primary: string;
  primaryContrast: string;
  secondary: string;
  secondaryContrast: string;
  accent: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
};

export type BrandTypography = {
  display: string;
  body: string;
};

export type ThemeRequest = {
  family: ThemeFamily;
  modifiers?: ThemeModifier[];
  colors: BrandColors;
  typography: BrandTypography;
};

export type ResolvedTheme = {
  family: ThemeFamily;
  modifiers: ThemeModifier[];
  tokens: ThemeTokens;
  cssVariables: Record<string, string>;
};
