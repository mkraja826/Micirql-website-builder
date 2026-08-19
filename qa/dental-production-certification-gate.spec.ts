import { expect, test } from "@playwright/test";
import { recommendLayoutCandidates, recommendWebsiteLayouts } from "@micirql/design-engine";

const input = {
  industry: "dental clinic",
  subindustryId: "general dentistry",
  goals: ["book appointment", "build trust"],
  priorities: ["doctor trust", "treatments"],
  styleTags: ["professional", "clean"],
};

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production Dental selection fails closed without rendered certification", () => {
  withEnv({ NODE_ENV: "production", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: undefined }, () => {
    expect(recommendWebsiteLayouts(input, 20)).toEqual([]);
    expect(recommendLayoutCandidates(input, 20).length).toBeGreaterThan(0);
  });
});

test("production Dental selection can rank only rendered-certified IDs", () => {
  withEnv({ NODE_ENV: "production", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: "dental-04-family-care" }, () => {
    const ranked = recommendWebsiteLayouts(input, 20);
    expect(ranked.map((entry) => entry.layout.id)).toEqual(["dental-04-family-care"]);
  });
});

test("development keeps the design workflow available when no runtime allowlist is present", () => {
  withEnv({ NODE_ENV: "development", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: undefined }, () => {
    expect(recommendWebsiteLayouts(input, 20).length).toBeGreaterThan(0);
  });
});
