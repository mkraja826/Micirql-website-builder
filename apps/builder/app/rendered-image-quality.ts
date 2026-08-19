export type RenderedImageQualityIssue = {
  code:
    | "IMAGE_FAILED_TO_LOAD"
    | "IMAGE_UPSCALED_TOO_FAR"
    | "IMAGE_CROP_TOO_AGGRESSIVE"
    | "IMAGE_ALT_MISSING"
    | "IMAGE_REUSED_TOO_OFTEN";
  severity: "warning" | "error";
  detail: string;
  sectionId?: string;
  src?: string;
};

/**
 * Browser-level image quality QA. This inspects what the customer actually sees,
 * not just the media-plan metadata. Small icons/editor chrome are ignored.
 */
export function measureRenderedImageQualityIssues(root: HTMLElement, width: number): RenderedImageQualityIssue[] {
  const issues: RenderedImageQualityIssue[] = [];
  const editorSelector = "[data-mi-canvas-action],.mi-editor-insert-zone,.mi-editor-canvas-toolbar";
  const visible = (node: Element) => {
    if (node.closest(editorSelector)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") !== 0 && rect.width > 0 && rect.height > 0;
  };

  const images = [...root.querySelectorAll<HTMLImageElement>("img")]
    .filter(visible)
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width >= 96 && rect.height >= 72;
    });

  const srcCounts = new Map<string, { count: number; sectionIds: Set<string> }>();
  for (const image of images) {
    const rect = image.getBoundingClientRect();
    const src = image.currentSrc || image.src;
    const sectionId = image.closest<HTMLElement>("[data-mi-section-id]")?.dataset.miSectionId;
    if (src) {
      const current = srcCounts.get(src) ?? { count: 0, sectionIds: new Set<string>() };
      current.count += 1;
      if (sectionId) current.sectionIds.add(sectionId);
      srcCounts.set(src, current);
    }

    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      issues.push({ code: "IMAGE_FAILED_TO_LOAD", severity: "error", detail: src || "unknown image", sectionId, src });
      continue;
    }

    const scaleX = rect.width / image.naturalWidth;
    const scaleY = rect.height / image.naturalHeight;
    const upscale = Math.max(scaleX, scaleY);
    const upscaleWarning = width <= 430 ? 1.65 : width <= 1024 ? 1.45 : 1.3;
    const upscaleError = width <= 430 ? 2.2 : width <= 1024 ? 1.9 : 1.7;
    if (upscale > upscaleWarning) {
      issues.push({
        code: "IMAGE_UPSCALED_TOO_FAR",
        severity: upscale > upscaleError ? "error" : "warning",
        detail: `${Math.round(rect.width)}x${Math.round(rect.height)} rendered from ${image.naturalWidth}x${image.naturalHeight} (${upscale.toFixed(2)}x)`,
        sectionId,
        src,
      });
    }

    const style = getComputedStyle(image);
    if (style.objectFit === "cover" && rect.width > 0 && rect.height > 0) {
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = rect.width / rect.height;
      const cropPressure = Math.max(sourceRatio / boxRatio, boxRatio / sourceRatio);
      if (cropPressure > 2.25) {
        issues.push({
          code: "IMAGE_CROP_TOO_AGGRESSIVE",
          severity: cropPressure > 3.2 ? "error" : "warning",
          detail: `source ${sourceRatio.toFixed(2)} vs box ${boxRatio.toFixed(2)} (${cropPressure.toFixed(2)}x crop pressure)`,
          sectionId,
          src,
        });
      }
    }

    const alt = (image.getAttribute("alt") ?? "").trim();
    if (!alt) {
      issues.push({ code: "IMAGE_ALT_MISSING", severity: "warning", detail: src || "visible image", sectionId, src });
    }
  }

  for (const [src, value] of srcCounts) {
    if (value.count >= 3) {
      issues.push({
        code: "IMAGE_REUSED_TOO_OFTEN",
        severity: value.count >= 4 ? "error" : "warning",
        detail: `${value.count} visible uses of ${src}`,
        sectionId: [...value.sectionIds][0],
        src,
      });
    }
  }

  return dedupe(issues);
}

function dedupe(issues: RenderedImageQualityIssue[]): RenderedImageQualityIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.sectionId ?? ""}:${issue.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
