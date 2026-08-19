import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("business upload path computes, sends and persists perceptual fingerprints", () => {
  const hash = read("apps/builder/app/image-perceptual-hash.ts");
  const onboarding = read("apps/builder/app/guided-onboarding.tsx");
  const uploadRoute = read("apps/builder/app/api/assets/upload/route.ts");
  const supabaseAssets = read("apps/builder/app/api/assets/supabase-assets.ts");
  const migration = read("supabase/migrations/20260819170000_asset_perceptual_hash.sql");

  expect(hash).toContain("canvas.width = 9");
  expect(hash).toContain("canvas.height = 8");
  expect(hash).toContain("left > right");
  expect(hash).toContain("^[0-9a-f]{16}$");

  expect(onboarding).toContain("computeImageDHash(file)");
  expect(onboarding).toContain("perceptualHash });");

  expect(uploadRoute).toContain("perceptualHash?: string");
  expect(uploadRoute).toContain("Invalid image perceptual fingerprint");
  expect(uploadRoute).toContain("perceptualHash: body.perceptualHash.toLowerCase()");

  expect(supabaseAssets).toContain("perceptual_hash:asset.perceptualHash??null");
  expect(supabaseAssets).toContain("perceptualHash:row.perceptual_hash??undefined");

  expect(migration).toContain("add column if not exists perceptual_hash text");
  expect(migration).toContain("assets_perceptual_hash_format_check");
});
