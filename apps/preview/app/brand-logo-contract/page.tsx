import {
  SeedSection,
  type BrandMarkReference,
  type UniversalSectionProps,
} from "@micirql/sections";

const BUSINESS_NAME = "Radhika Dental";
const EXACT_LOGO_ASSET_ID = "UserLogo/Case-Sensitive_%2F_01";

const shapes = [
  { id: "square", width: 120, height: 120 },
  { id: "wide", width: 320, height: 96 },
  { id: "ultra-wide", width: 600, height: 100 },
  { id: "tall", width: 120, height: 240 },
] as const;

/** Test-only render matrix used by qa/brand-logo-render.spec.ts. */
export default function BrandLogoContractPage() {
  return (
    <main data-brand-logo-contract>
      <BrandPair shape="none" />
      {shapes.map((shape) => (
        <BrandPair
          key={shape.id}
          shape={shape.id}
          brandMark={brandMark(shape.id, shape.width, shape.height)}
        />
      ))}
    </main>
  );
}

function BrandPair({
  brandMark,
  shape,
}: {
  brandMark?: BrandMarkReference;
  shape: string;
}) {
  const commonProps: Pick<UniversalSectionProps, "title" | "brandMark"> = {
    title: BUSINESS_NAME,
    ...(brandMark ? { brandMark } : {}),
  };
  return (
    <div data-logo-shape={shape}>
      <SeedSection
        family="navbar"
        theme="minimalist"
        variant={1}
        props={{
          ...commonProps,
          items: [
            { title: "Services", href: "/services" },
            { title: "About", href: "/about" },
          ],
          primaryAction: { label: "Book", href: "/contact" },
        }}
      />
      <SeedSection
        family="footer"
        theme="minimalist"
        variant={1}
        props={{
          ...commonProps,
          description: "Clear dental care information.",
          footerLinks: [{ label: "Contact", href: "/contact" }],
        }}
      />
    </div>
  );
}

function brandMark(
  shape: string,
  width: number,
  height: number,
): BrandMarkReference {
  return {
    assetId: `${EXACT_LOGO_ASSET_ID}:${shape}`,
    src: svgDataUrl(width, height, shape),
    alt: `${BUSINESS_NAME} ${shape} logo`,
    width,
    height,
  };
}

function svgDataUrl(width: number, height: number, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#155e75"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
