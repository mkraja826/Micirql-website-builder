import { expect, test } from "@playwright/test";
import type { BackendImplementationContract, FunctionalArchitecture, Site } from "@micirql/schema";
import {
  configureFullStackPublishCertificationStore,
  deriveRequiredFunctionalInteractions,
  evaluateFullStackPublishCertification,
  fingerprintPublishInput,
  resetFullStackPublishCertificationStore,
  type FullStackPublishCertificationReceipt,
} from "../apps/builder/app/publish-full-stack-certification";

const architecture = {
  backendRequired: false,
  requiresAuth: false,
  requiresPayments: false,
  requiresFileStorage: false,
  capabilities: [],
} as unknown as FunctionalArchitecture;

const backend = { tables: [], routes: [] } as unknown as BackendImplementationContract;

function site(componentId = "DENTAL-HERO-001", actionId?: string): Site {
  return {
    siteId: "site-functional-cert",
    workspaceId: "workspace-functional-cert",
    name: "Pearl Dental",
    pages: [{
      id: "home",
      name: "Home",
      path: "/",
      sections: [{
        id: "hero",
        component: { componentId },
        bindings: actionId ? { submit: { actionId } } : {},
        props: { heading: "Confident dental care" },
      }],
    }],
    navigation: [],
  } as unknown as Site;
}

function receipt(args: {
  site: Site;
  fingerprint: string;
  required: string[];
  certified?: string[];
  builderPassed?: boolean;
  livePassed?: boolean;
}): FullStackPublishCertificationReceipt {
  return {
    siteId: args.site.siteId,
    draftFingerprint: args.fingerprint,
    previewUrl: "https://preview.micirql.test/pearl-dental",
    environment: "preview",
    passed: true,
    certifiedAt: "2026-09-08T05:00:00.000Z",
    architecture,
    backend,
    interactionCertification: {
      requiredInteractionIds: args.required,
      certifiedInteractionIds: args.certified ?? args.required,
      builderPassed: args.builderPassed ?? true,
      livePassed: args.livePassed ?? true,
    },
  };
}

test.afterEach(() => resetFullStackPublishCertificationStore());

test("derives only interactions actually declared by the generated Site", () => {
  expect(deriveRequiredFunctionalInteractions(site())).toEqual([]);
  expect(deriveRequiredFunctionalInteractions(site("DENTAL-FAQ-001"))).toEqual(["interaction:faq-accordion"]);
  expect(deriveRequiredFunctionalInteractions(site("DENTAL-GALLERY-001"))).toEqual(["interaction:gallery-lightbox"]);
  expect(deriveRequiredFunctionalInteractions(site("DENTAL-CONTACT-001", "appointment.request"))).toEqual(["action:appointment.request"]);
});

test("frontend-only declared interactions fail closed without an exact-draft receipt", async () => {
  const current = site("DENTAL-FAQ-001");
  const result = await evaluateFullStackPublishCertification({ site: current, architecture, backend });

  expect(result.required).toBe(true);
  expect(result.enforced).toBe(true);
  expect(result.allowed).toBe(false);
  expect(result.status).toBe("missing");
  expect(result.requiredInteractionIds).toEqual(["interaction:faq-accordion"]);
});

test("requires builder and published-live evidence for every declared interaction", async () => {
  const current = site("DENTAL-GALLERY-001", "appointment.request");
  const fingerprint = await fingerprintPublishInput(current, architecture, backend);
  const required = deriveRequiredFunctionalInteractions(current);

  configureFullStackPublishCertificationStore({
    async find() {
      return receipt({
        site: current,
        fingerprint,
        required,
        certified: ["interaction:gallery-lightbox"],
      });
    },
  });

  const incomplete = await evaluateFullStackPublishCertification({ site: current, architecture, backend });
  expect(incomplete.allowed).toBe(false);
  expect(incomplete.status).toBe("failed");

  configureFullStackPublishCertificationStore({
    async find() {
      return receipt({ site: current, fingerprint, required, livePassed: false });
    },
  });
  const liveFailed = await evaluateFullStackPublishCertification({ site: current, architecture, backend });
  expect(liveFailed.allowed).toBe(false);
  expect(liveFailed.status).toBe("failed");
});

test("allows the exact draft only when every required interaction passes builder and live certification", async () => {
  const current = site("DENTAL-FAQ-001", "appointment.request");
  const fingerprint = await fingerprintPublishInput(current, architecture, backend);
  const required = deriveRequiredFunctionalInteractions(current);

  configureFullStackPublishCertificationStore({
    async find(args) {
      expect(args).toEqual({ siteId: current.siteId, draftFingerprint: fingerprint });
      return receipt({ site: current, fingerprint, required });
    },
  });

  const result = await evaluateFullStackPublishCertification({ site: current, architecture, backend });
  expect(result.allowed).toBe(true);
  expect(result.status).toBe("certified");
  expect(result.requiredInteractionIds).toEqual(["action:appointment.request", "interaction:faq-accordion"]);
});

test("any Site mutation invalidates prior interaction certification evidence", async () => {
  const current = site("DENTAL-FAQ-001");
  const oldFingerprint = await fingerprintPublishInput(current, architecture, backend);
  const changed = structuredClone(current);
  (changed.pages[0]!.sections[0]!.props as Record<string, unknown>).heading = "A changed exact draft";
  const newFingerprint = await fingerprintPublishInput(changed, architecture, backend);

  expect(newFingerprint).not.toBe(oldFingerprint);
  configureFullStackPublishCertificationStore({
    async find(args) {
      if (args.draftFingerprint !== oldFingerprint) return undefined;
      return receipt({
        site: current,
        fingerprint: oldFingerprint,
        required: deriveRequiredFunctionalInteractions(current),
      });
    },
  });

  const result = await evaluateFullStackPublishCertification({ site: changed, architecture, backend });
  expect(result.allowed).toBe(false);
  expect(result.status).toBe("missing");
});
