import { expect, test } from "@playwright/test";
import { orientationForSection, focalPointForSection } from "../apps/builder/app/pexels-stock-image";
import { executeMediaPlan } from "../apps/builder/app/media-execution";
import type { VisualMediaPlan } from "../apps/builder/app/visual-media-intelligence";

function plan(aspect: "portrait" | "wide", preferredTags: string[]): VisualMediaPlan {
  return {
    style: "editorial",
    rules: [],
    sections: [{
      family: "hero",
      role: "hero-photo",
      prominence: "dominant",
      aspect,
      subject: aspect === "portrait"
        ? "Generic non-identifying premium implant consultation portrait context"
        : "Generic non-identifying bright clinical dental consultation context",
      avoid: ["fake clinic identity"],
      preferredTags,
    }],
  };
}

test("portrait-led flagship media keeps portrait intent through execution", () => {
  const execution = executeMediaPlan({
    plan: plan("portrait", ["dental", "implant", "portrait-led", "editorial", "luxury"]),
    allowGeneration: true,
  });
  const request = execution.requests[0]!;
  expect(request.source).toBe("generated");
  expect(request.desiredAspect).toBe("portrait");
  expect(request.preferredTags).toContain("portrait-led");
  expect(orientationForSection("hero", request.desiredAspect)).toBe("portrait");
  expect(focalPointForSection("hero", "portrait", request.desiredAspect).y).toBeLessThan(.4);
});

test("clinical flagship hero stays wide instead of inheriting generic portrait behavior", () => {
  const execution = executeMediaPlan({
    plan: plan("wide", ["dental", "clinical", "authority", "specialist"]),
    allowGeneration: true,
  });
  const request = execution.requests[0]!;
  expect(request.desiredAspect).toBe("wide");
  expect(request.preferredTags).toContain("clinical");
  expect(orientationForSection("hero", request.desiredAspect)).toBe("landscape");
});

test("explicit aspect overrides section-family defaults", () => {
  expect(orientationForSection("team", "wide")).toBe("landscape");
  expect(orientationForSection("hero", "portrait")).toBe("portrait");
  expect(orientationForSection("gallery", "1:1")).toBe("square");
});
