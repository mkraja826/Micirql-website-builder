import type { BackendImplementationContract, FunctionalArchitecture, Site } from "@micirql/schema";
import { evaluateFinalGenerationAcceptance, type FinalGenerationAcceptance } from "./final-generation-acceptance";
import { evaluateFunctionalPublishGate, type FunctionalPublishGateResult } from "./functional-publish-gate";
import {
  evaluateFullStackPublishCertification,
  fingerprintPublishInput,
  type FullStackPublishCertificationStore,
  type FullStackPublishGateResult,
} from "./publish-full-stack-certification";

export type RenderedVisualCertificationReceipt = {
  siteId: string;
  draftFingerprint: string;
  passed: boolean;
  certifiedAt: string;
  viewports: Array<"mobile" | "tablet" | "desktop">;
  dimensions: Array<"first-screen" | "typography" | "responsive-composition" | "image">;
  failures?: string[];
};

export type RenderedVisualCertificationStore = {
  find(args: { siteId: string; draftFingerprint: string }): Promise<RenderedVisualCertificationReceipt | undefined>;
};

export type PublishableDraftCertification = {
  publishable: boolean;
  draftFingerprint: string;
  generation: FinalGenerationAcceptance;
  functional: FunctionalPublishGateResult;
  renderedVisual: {
    certified: boolean;
    status: "missing" | "failed" | "certified";
    receipt?: RenderedVisualCertificationReceipt;
  };
  fullStack: FullStackPublishGateResult;
  blockers: string[];
};

const REQUIRED_VIEWPORTS = ["mobile", "tablet", "desktop"] as const;
const REQUIRED_VISUAL_DIMENSIONS = ["first-screen", "typography", "responsive-composition", "image"] as const;

let renderedVisualStore: RenderedVisualCertificationStore | undefined;

export function configureRenderedVisualCertificationStore(next: RenderedVisualCertificationStore) {
  renderedVisualStore = next;
}

export function resetRenderedVisualCertificationStore() {
  renderedVisualStore = undefined;
}

export function getRenderedVisualCertificationStore() {
  return renderedVisualStore;
}

export async function evaluatePublishableDraftCertification(input: {
  site: Site;
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  renderedVisualStore?: RenderedVisualCertificationStore;
  fullStackStore?: FullStackPublishCertificationStore;
}): Promise<PublishableDraftCertification> {
  const generation = evaluateFinalGenerationAcceptance(input.site);
  const functional = evaluateFunctionalPublishGate(input.site, input.architecture);
  const draftFingerprint = await fingerprintPublishInput(input.site, input.architecture, input.backend);
  const visualStore = input.renderedVisualStore ?? renderedVisualStore;
  const visualReceipt = await visualStore?.find({ siteId: input.site.siteId, draftFingerprint });
  const renderedVisual = evaluateRenderedVisualReceipt(visualReceipt, input.site.siteId, draftFingerprint);
  const fullStack = await evaluateFullStackPublishCertification({
    site: input.site,
    architecture: input.architecture,
    backend: input.backend,
    ...(input.fullStackStore ? { store: input.fullStackStore } : {}),
  });
  const blockers: string[] = [];

  if (!generation.ready) blockers.push(...generation.blockers.map((message) => `generation: ${message}`));
  if (!functional.ready) blockers.push(...functional.issues.map((issue) => `functional:${issue.code}: ${issue.message}`));
  if (!renderedVisual.certified) {
    blockers.push(renderedVisual.status === "missing"
      ? "rendered-visual: Exact-draft rendered visual certification is missing."
      : "rendered-visual: Exact-draft rendered visual certification failed or is incomplete.");
  }
  if (!fullStack.allowed) blockers.push(`functional-certification: Exact-draft functional certification is ${fullStack.status}.`);

  return {
    publishable: generation.ready && functional.ready && renderedVisual.certified && fullStack.allowed && blockers.length === 0,
    draftFingerprint,
    generation,
    functional,
    renderedVisual,
    fullStack,
    blockers,
  };
}

export function evaluateRenderedVisualReceipt(
  receipt: RenderedVisualCertificationReceipt | undefined,
  siteId: string,
  draftFingerprint: string,
): PublishableDraftCertification["renderedVisual"] {
  if (!receipt) return { certified: false, status: "missing" };
  const viewports = new Set(receipt.viewports);
  const dimensions = new Set(receipt.dimensions);
  const exactDraft = receipt.siteId === siteId && receipt.draftFingerprint === draftFingerprint;
  const complete = REQUIRED_VIEWPORTS.every((viewport) => viewports.has(viewport))
    && REQUIRED_VISUAL_DIMENSIONS.every((dimension) => dimensions.has(dimension));
  const validTimestamp = Number.isFinite(Date.parse(receipt.certifiedAt));
  const noFailures = !receipt.failures?.length;

  if (!receipt.passed || !exactDraft || !complete || !validTimestamp || !noFailures) {
    return { certified: false, status: "failed", receipt };
  }
  return { certified: true, status: "certified", receipt };
}
