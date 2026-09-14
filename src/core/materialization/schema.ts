import type { PublishableDraft } from "../publish/schema";

export type MaterializedSiteStatus = "draft";

export type MaterializedSiteSnapshot = {
  version: "1.0";
  siteId: string;
  revision: 1;
  status: MaterializedSiteStatus;
  fingerprint: string;
  source: {
    sourceKey: string;
    candidateId: string;
    draftVersion: PublishableDraft["version"];
  };
  snapshot: {
    pages: PublishableDraft["pages"];
    content: PublishableDraft["content"];
    media: PublishableDraft["media"];
    selectedSections: PublishableDraft["selectedSections"];
    theme: PublishableDraft["theme"];
    cssVariables: PublishableDraft["cssVariables"];
    primaryCapability: PublishableDraft["primaryCapability"];
    capabilities: PublishableDraft["capabilities"];
    warnings: string[];
  };
};
