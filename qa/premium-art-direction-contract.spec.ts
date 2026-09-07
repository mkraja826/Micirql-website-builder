import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectPremiumArtDirection } from "../apps/builder/app/premium-art-direction";

test("clinic generations default to calm premium art direction", () => {
  const direction = selectPremiumArtDirection({
    industry: "clinic",
    subindustry: "dental",
    styleTags: ["premium", "modern", "professional"],
    goals: ["book appointments", "build trust"],
  });

  expect(direction.id).toBe("quiet-premium");
  expect(["luxury", "editorial"]).toContain(direction.family);
  expect(direction.tone).toBe("premium");
  expect(direction.typography.body).toBe("Inter");
  expect(direction.typography.ui).toBe("Inter");
  expect(direction.density).toBe("spacious");
  expect(direction.motion).toBe("subtle");
});

test("editorial premium brief locks an editorial family rather than generic styling", () => {
  const direction = selectPremiumArtDirection({
    industry: "clinic",
    subindustry: "dental",
    styleTags: ["premium", "minimal", "editorial"],
    goals: [],
  });

  expect(direction.family).toBe("editorial");
  expect(direction.typography.display).toBe("DM Serif Display");
  expect(direction.shape).toBe("sharp");
});

test("warm brief gets a coherent organic system", () => {
  const direction = selectPremiumArtDirection({
    industry: "hospitality",
    styleTags: ["warm", "welcoming"],
    goals: [],
  });

  expect(direction.id).toBe("warm-modern");
  expect(direction.family).toBe("organic");
  expect(direction.shape).toBe("soft");
  expect(direction.typographyMood).toBe("humanist");
});

test("premium correction applies and reasserts the art-direction lock", () => {
  const source = readFileSync(resolve(process.cwd(), "apps/builder/app/premium-quality-correction.ts"), "utf8");
  expect(source).toContain("applyPremiumArtDirection(site");
  expect(source).toContain("applyPremiumArtDirection(siteSchema.parse(candidate)");
  expect(source).toContain("Art direction owns typography/density/shape/motion");
});
