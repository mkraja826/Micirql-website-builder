import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Dental review certifier measures true nested viewports instead of widening a phone DOM node", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  const probe = readFileSync("apps/builder/app/isolated-renderer-probe.tsx", "utf8");
  const composition = readFileSync("apps/builder/app/rendered-responsive-composition-quality.ts", "utf8");
  const image = readFileSync("apps/builder/app/rendered-image-quality.ts", "utf8");

  expect(certifier).toContain("IsolatedRendererProbe");
  expect(certifier).toContain("getDocumentRoot()");
  expect(certifier).toContain("width={target.width}");
  expect(certifier).toContain("height={target.foldHeight}");
  expect(certifier).not.toContain('left: "-20000px", top: 0, width: target.width');

  expect(probe).toContain("<iframe");
  expect(probe).toContain("srcDoc={FRAME_DOCUMENT}");
  expect(probe).toContain('width,\n        height,');
  expect(probe).toContain("createPortal(");
  expect(probe).toContain("copyParentStyles(frameDocument)");
  expect(probe).toContain('querySelector<HTMLElement>(".renderer-preview-document")');

  expect(certifier).toContain("node.ownerDocument.defaultView?.getComputedStyle(node)");
  expect(composition).toContain("node.ownerDocument.defaultView?.getComputedStyle(node)");
  expect(image).toContain("node.ownerDocument.defaultView?.getComputedStyle(node)");
  expect(composition).not.toContain("child instanceof HTMLElement");
});
