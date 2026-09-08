"use client";

import { useEffect, useMemo, useState } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import { DentalReviewRenderCertifier, type DentalReviewCertificationResult } from "../../dental-review-render-certifier";
import type { ReviewDirection } from "../../review-directions";

const STORAGE_KEY = "micirql:qa-render-certification-site";

export default function RenderCertificationHarness() {
  const [site, setSite] = useState<Site | null>(null);
  const [results, setResults] = useState<DentalReviewCertificationResult[] | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setSite(siteSchema.parse(JSON.parse(raw)));
    } catch {
      setResults([]);
    }
  }, []);

  const directions = useMemo<ReviewDirection[]>(() => {
    if (!site) return [];
    return [{
      id: `qa-${site.siteId}`,
      name: site.name,
      description: "QA rendered certification harness",
      reasons: ["exact generated site supplied by Playwright"],
      site,
      themeFamily: site.theme.family,
      variantSeed: 0,
      readiness: {} as ReviewDirection["readiness"],
      contentQuality: {} as ReviewDirection["contentQuality"],
      designScore: {} as ReviewDirection["designScore"],
    }];
  }, [site]);

  const status = results ? "complete" : site ? "running" : "waiting";
  return <main data-testid="render-certification-harness" data-status={status}>
    <output data-testid="render-certification-result">{results ? JSON.stringify(results) : ""}</output>
    {directions.length ? <DentalReviewRenderCertifier directions={directions} onComplete={setResults} /> : null}
  </main>;
}
