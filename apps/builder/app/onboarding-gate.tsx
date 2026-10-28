"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import type { OnboardingProfile } from "./preset-ranking";
import { OnboardingProfileProvider } from "./onboarding-profile-context";
import { FirstBuildReview } from "./first-build-review";
import { ProductBrand } from "./product-brand";
import { uploadWorkspaceImage } from "./upload-client";
import WorkspaceClient from "./workspace-client";
import {
  certifiedOnboardingIndustry,
  INDUSTRY_AVAILABILITY,
} from "./industry-availability";
import { restaurantIndustryFactsIssues } from "./industry-packs/restaurant-facts";
import styles from "./onboarding-gate.module.css";
import {
  normalizeWorkspaceUploadFailure,
  type WorkspaceUploadFailure,
} from "./upload-errors";

type DraftContext = {
  workspaceId: string;
  siteId: string;
  snapshot?: { name?: string };
};
type FormState = {
  businessName: string;
  packId: string;
  subindustry: string;
  location: string;
  services: string;
  openingHours: string;
  trustFacts: string;
  imagePlan: string;
  goals: string[];
  styleTags: string[];
  requiredCapabilities: string[];
  languages: string;
  notes: string;
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
  logoAssetId: string;
  logoName: string;
  restaurantMenu: string;
  restaurantMenuDisclosures: string;
  restaurantMapUrl: string;
  restaurantPhone: string;
  restaurantEmail: string;
  restaurantReservationPolicy: string;
  restaurantAccessibility: string;
  restaurantParking: string;
  restaurantTransit: string;
  restaurantStory: string;
};

const BRIEF_STEPS = [
  {
    label: "Business",
    description: "Industry, identity and core offer",
  },
  {
    label: "Content & goals",
    description: "Conversion priorities and richer facts",
  },
  {
    label: "Brand & media",
    description: "Logo, palette and image direction",
  },
  {
    label: "Review",
    description: "Language, constraints and final check",
  },
] as const;

const initialForm: FormState = {
  businessName: "",
  packId: "clinic-dental",
  subindustry: "",
  location: "",
  services: "",
  openingHours: "",
  trustFacts: "",
  imagePlan: "Use the certified image library for now",
  goals: ["generate leads", "book appointments"],
  styleTags: ["professional", "modern"],
  requiredCapabilities: ["contact form", "booking"],
  languages: "en",
  notes: "",
  brandPrimary: "",
  brandSecondary: "",
  brandAccent: "",
  logoAssetId: "",
  logoName: "",
  restaurantMenu: "",
  restaurantMenuDisclosures: "",
  restaurantMapUrl: "",
  restaurantPhone: "",
  restaurantEmail: "",
  restaurantReservationPolicy: "",
  restaurantAccessibility: "",
  restaurantParking: "",
  restaurantTransit: "",
  restaurantStory: "",
};

export function OnboardingGate({
  session,
  initialWorkspaceId,
  initialSiteId,
  onBack,
}: {
  session: SupabaseSession;
  initialWorkspaceId?: string;
  initialSiteId?: string;
  onBack?: () => void;
}) {
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [context, setContext] = useState<DraftContext>();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoStatus, setLogoStatus] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoFailure, setLogoFailure] = useState<WorkspaceUploadFailure>();
  const [failedLogoFile, setFailedLogoFile] = useState<File>();
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [briefStep, setBriefStep] = useState(0);
  const authHeaders = { Authorization: "Bearer " + session.access_token };

  useEffect(() => {
    setError("");
  }, [form]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const workspaceId = initialWorkspaceId ?? "workspace-demo";
        const siteId = initialSiteId ?? "workspace-preview";
        if (initialWorkspaceId && initialSiteId) {
          localStorage.setItem(
            "micirql_active_project",
            JSON.stringify({
              workspaceId: initialWorkspaceId,
              siteId: initialSiteId,
            }),
          );
        }
        const draftResponse = await fetch(
          "/api/drafts?workspaceId=" +
            encodeURIComponent(workspaceId) +
            "&siteId=" +
            encodeURIComponent(siteId),
          {
            headers: authHeaders,
            cache: "no-store",
          },
        );
        const draftPayload = await draftResponse.json();
        if (!draftResponse.ok || !draftPayload?.draft)
          throw new Error(
            draftPayload?.error ?? "Could not open your workspace.",
          );
        const nextContext = {
          workspaceId: String(draftPayload.draft.workspaceId),
          siteId: String(draftPayload.draft.siteId),
          snapshot: draftPayload.draft.snapshot,
        };
        if (cancelled) return;
        setContext(nextContext);
        localStorage.setItem(
          "micirql_active_project",
          JSON.stringify({
            workspaceId: nextContext.workspaceId,
            siteId: nextContext.siteId,
          }),
        );

        const statusResponse = await fetch(
          "/api/onboarding?workspaceId=" +
            encodeURIComponent(nextContext.workspaceId) +
            "&siteId=" +
            encodeURIComponent(nextContext.siteId),
          {
            headers: authHeaders,
            cache: "no-store",
          },
        );
        const statusPayload = await statusResponse.json();
        if (!statusResponse.ok)
          throw new Error(
            statusPayload?.error ?? "Could not load onboarding status.",
          );
        if (!cancelled) {
          const nextProfile = (statusPayload.profile ??
            null) as OnboardingProfile | null;
          setProfile(nextProfile);
          setReviewing(Boolean(statusPayload.reviewPending && nextProfile));
          setReady(Boolean(statusPayload.completed));
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not start the builder.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token, initialWorkspaceId, initialSiteId]);

  async function uploadLogo(file: File) {
    if (!context) return;
    setUploadingLogo(true);
    setLogoStatus("Preparing logo upload…");
    setLogoFailure(undefined);
    setFailedLogoFile(undefined);
    setError("");
    try {
      const asset = await uploadWorkspaceImage({
        workspaceId: context.workspaceId,
        siteId: context.siteId,
        file,
        kind: "logo",
        onProgress(progress) {
          setLogoStatus(
            progress.phase === "complete"
              ? "Logo uploaded"
              : "Uploading logo… " + progress.percent + "%",
          );
        },
      });
      setForm((current) => ({
        ...current,
        logoAssetId: asset.id,
        logoName: asset.name,
      }));
      setLogoPreviewUrl(asset.originalUrl || asset.variants[0]?.url || "");
      setLogoStatus("Logo uploaded");
    } catch (caught) {
      const failure = normalizeWorkspaceUploadFailure(caught);
      setLogoStatus("");
      setLogoFailure(failure);
      setFailedLogoFile(file);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!context) return;
    if (!form.businessName.trim() || !form.services.trim()) {
      setBriefStep(0);
      setError(
        "Add the business name and main services before reviewing directions.",
      );
      return;
    }
    const selectedIndustry = certifiedOnboardingIndustry(form.packId);
    if (!selectedIndustry) {
      setError(
        "This industry pack is still planned and cannot generate a site yet.",
      );
      return;
    }
    if (selectedIndustry.id === "restaurant-restaurant") {
      const factIssues = restaurantIndustryFactsIssues(
        buildRestaurantIndustryFacts(form),
      );
      if (factIssues.length) {
        const businessStepCodes = new Set([
          "RESTAURANT_BUSINESS_NAME_REQUIRED",
          "RESTAURANT_CUISINE_REQUIRED",
          "RESTAURANT_SERVICE_MODE_REQUIRED",
          "RESTAURANT_ADDRESS_REQUIRED",
        ]);
        setBriefStep(
          factIssues.some((issue) => businessStepCodes.has(issue.code)) ? 0 : 1,
        );
        setError(
          `Complete the Restaurant brief before reviewing directions. ${factIssues
            .map((issue) => issue.message)
            .join(" ")}`,
        );
        return;
      }
    }
    setBuilding(true);
    setError("");
    try {
      const colors = {
        ...(form.brandPrimary.trim()
          ? { primary: form.brandPrimary.trim() }
          : {}),
        ...(form.brandSecondary.trim()
          ? { secondary: form.brandSecondary.trim() }
          : {}),
        ...(form.brandAccent.trim() ? { accent: form.brandAccent.trim() } : {}),
      };
      const brandInput = {
        ...(form.logoAssetId ? { logoAssetId: form.logoAssetId } : {}),
        colors,
      };
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: context.workspaceId,
          siteId: context.siteId,
          businessName: form.businessName,
          packId: selectedIndustry.id,
          industry: selectedIndustry.onboarding.industry,
          subindustry: form.subindustry,
          location: form.location,
          services: commaList(form.services),
          goals: form.goals,
          styleTags: form.styleTags,
          requiredCapabilities: form.requiredCapabilities,
          languages: commaList(form.languages),
          notes: buildBriefNotes(form),
          industryFacts:
            selectedIndustry.id === "restaurant-restaurant"
              ? buildRestaurantIndustryFacts(form)
              : undefined,
          brandInput,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok)
        throw new Error(
          payload?.message ?? payload?.error ?? "Website planning failed.",
        );
      const nextProfile = (payload.profile ?? null) as OnboardingProfile | null;
      setProfile(nextProfile);
      setQualityWarnings(
        Array.isArray(payload.qualityWarnings)
          ? payload.qualityWarnings.filter(
              (item: unknown): item is string => typeof item === "string",
            )
          : [],
      );
      if (nextProfile) setReviewing(true);
      else setReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Website planning failed.",
      );
    } finally {
      setBuilding(false);
    }
  }

  if (loading)
    return (
      <main className={styles.shell}>
        <div className={styles.loadingCard} role="status">
          <span className={styles.loadingMark} aria-hidden="true" />
          <div>
            <strong>Opening your website brief</strong>
            <span>Preparing the MiCirql workspace…</span>
          </div>
        </div>
      </main>
    );
  if (reviewing && context && profile) {
    return (
      <FirstBuildReview
        session={session}
        workspaceId={context.workspaceId}
        siteId={context.siteId}
        profile={profile}
        qualityWarnings={qualityWarnings}
        onComplete={() => {
          setReviewing(false);
          setReady(true);
        }}
      />
    );
  }
  if (ready && context) {
    return (
      <OnboardingProfileProvider profile={profile}>
        <>
          {onBack ? (
            <button className={styles.workspaceBack} onClick={onBack}>
              ← Projects
            </button>
          ) : null}
          <WorkspaceClient
            accessToken={session.access_token}
            siteId={context.siteId}
            workspaceId={context.workspaceId}
          />
        </>
      </OnboardingProfileProvider>
    );
  }

  const selectedPack =
    certifiedOnboardingIndustry(form.packId) ??
    certifiedOnboardingIndustry(initialForm.packId)!;
  const serviceCount = commaList(form.services).length;
  const suppliedColorCount = [
    form.brandPrimary,
    form.brandSecondary,
    form.brandAccent,
  ].filter((value) => /^#[0-9a-f]{6}$/i.test(value.trim())).length;
  const requiredRemaining = [
    form.businessName,
    form.services,
    ...(selectedPack.id === "restaurant-restaurant"
      ? [form.subindustry, form.location]
      : []),
  ].filter((value) => !value.trim()).length;
  const isFinalBriefStep = briefStep === BRIEF_STEPS.length - 1;
  const activeBriefStep = BRIEF_STEPS[briefStep]!;
  const advanceBrief = () => {
    setError("");
    setBriefStep((current) => Math.min(BRIEF_STEPS.length - 1, current + 1));
  };
  const returnToPreviousBriefStep = () => {
    setError("");
    setBriefStep((current) => Math.max(0, current - 1));
  };

  function submitOrAdvance(event: FormEvent) {
    if (!isFinalBriefStep) {
      event.preventDefault();
      advanceBrief();
      return;
    }
    void submit(event);
  }

  return (
    <main className={styles.shell}>
      <form
        aria-labelledby="onboarding-title"
        className={styles.form}
        onSubmit={submitOrAdvance}
      >
        <header className={styles.productHeader}>
          <ProductBrand />
          <span className={styles.draftStatus}>Draft setup</span>
        </header>

        <div className={styles.intro}>
          {onBack ? (
            <button
              className={styles.backButton}
              type="button"
              onClick={onBack}
            >
              <span aria-hidden="true">←</span> Back to websites
            </button>
          ) : null}
          <div className={styles.introCopy}>
            <span className={styles.eyebrow}>New website · Business brief</span>
            <h1 id="onboarding-title">
              Start with the business. We&rsquo;ll shape the website.
            </h1>
            <p>
              Add the facts, priorities and assets that must stay true. MiCirql
              will turn them into ranked directions before the full content and
              imagery are created.
            </p>
          </div>
          <ol
            className={styles.progress}
            aria-label="Website creation progress"
          >
            <li className={styles.currentStep} aria-current="step">
              <span>01</span>
              <strong>Business brief</strong>
            </li>
            <li>
              <span>02</span>
              <strong>Choose direction</strong>
            </li>
            <li>
              <span>03</span>
              <strong>Edit &amp; publish</strong>
            </li>
          </ol>
        </div>

        <div className={styles.layout}>
          <nav className={styles.briefNav} aria-label="Business brief sections">
            <div className={styles.briefNavHeading}>
              <span>Website brief</span>
              <strong>
                {briefStep + 1} of {BRIEF_STEPS.length}
              </strong>
            </div>
            <ol>
              {BRIEF_STEPS.map((step, index) => (
                <li key={step.label}>
                  <button
                    aria-current={briefStep === index ? "step" : undefined}
                    className={briefStep === index ? styles.briefNavActive : ""}
                    data-complete={index < briefStep ? "true" : "false"}
                    type="button"
                    onClick={() => setBriefStep(index)}
                  >
                    <span aria-hidden="true">
                      {index < briefStep
                        ? "✓"
                        : String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{step.label}</strong>
                      <small>{step.description}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p>
              Only supplied facts and approved assets move into the generated
              website.
            </p>
          </nav>
          <div className={styles.formColumn}>
            {error ? (
              <div className={styles.inlineError} role="alert">
                <strong>Check this brief</strong>
                <span>{error}</span>
              </div>
            ) : null}
            <section
              aria-labelledby="industry-pack-heading"
              className={styles.sectionCard}
              data-brief-panel="business"
              hidden={briefStep !== 0}
            >
              <SectionHeading
                number="01"
                title="Industry release status"
                description="Choose a certified industry system for this website. Planned packs stay visible for the roadmap but cannot be selected early."
                id="industry-pack-heading"
              />
              <div className={styles.industryGrid}>
                {INDUSTRY_AVAILABILITY.map((item) => {
                  const selected = item.id === form.packId;
                  const contents = (
                    <>
                      <span
                        className={styles.packBadge}
                        data-status={item.status}
                      >
                        {packStatusLabel(item.status)}
                      </span>
                      <strong>{item.label}</strong>
                      <span id={`pack-${item.id}-description`}>
                        {item.description}
                      </span>
                      <small>
                        {selected
                          ? "Selected for this website"
                          : item.status === "certified"
                            ? "Choose this certified pack"
                            : item.status === "validation"
                              ? "Release checks in progress"
                              : "Scheduled after current validation"}
                      </small>
                    </>
                  );
                  const className = `${styles.industryCard} ${
                    selected ? styles.industryCardSelected : ""
                  }`;
                  const shared = {
                    className,
                    "data-industry-pack": item.id,
                    "data-pack-selected": selected ? "true" : "false",
                    "data-pack-status": item.status,
                  } as const;
                  return item.status === "certified" ? (
                    <button
                      {...shared}
                      aria-label={`${item.label}: ${packStatusLabel(item.status)}`}
                      aria-pressed={selected}
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          packId: item.id,
                          subindustry: "",
                          services: "",
                          trustFacts: "",
                          goals: [...item.onboarding.defaultGoals],
                          requiredCapabilities: [
                            ...item.onboarding.defaultCapabilities,
                          ],
                          imagePlan:
                            item.id === "restaurant-restaurant"
                              ? "Use the certified Restaurant image library for now"
                              : "Use the certified image library for now",
                          restaurantMenu: "",
                          restaurantMenuDisclosures: "",
                          restaurantMapUrl: "",
                          restaurantPhone: "",
                          restaurantEmail: "",
                          restaurantReservationPolicy: "",
                          restaurantAccessibility: "",
                          restaurantParking: "",
                          restaurantTransit: "",
                          restaurantStory: "",
                        }))
                      }
                    >
                      {contents}
                    </button>
                  ) : (
                    <article
                      {...shared}
                      aria-label={`${item.label}: ${packStatusLabel(item.status)}`}
                      key={item.id}
                    >
                      {contents}
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              aria-labelledby="business-details-heading"
              className={styles.sectionCard}
              data-brief-panel="business"
              hidden={briefStep !== 0}
            >
              <SectionHeading
                number="02"
                title="Business essentials"
                description="Use real business details. MiCirql will not invent credentials, claims, locations or contact facts."
                id="business-details-heading"
              />
              <div className={styles.fieldGrid}>
                <Field label="Business name" required>
                  <input
                    autoComplete="organization"
                    placeholder={selectedPack.brief.businessNamePlaceholder}
                    required={briefStep === 0}
                    value={form.businessName}
                    onChange={(event) =>
                      setForm({ ...form, businessName: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Primary location"
                  helper={
                    selectedPack.id === "restaurant-restaurant"
                      ? "Approved public street address or precise venue location"
                      : "City, area or service region"
                  }
                >
                  <input
                    placeholder="Hyderabad, Telangana"
                    value={form.location}
                    onChange={(event) =>
                      setForm({ ...form, location: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label={selectedPack.brief.focusLabel}
                  helper={selectedPack.brief.focusHelper}
                >
                  <input
                    placeholder={selectedPack.brief.focusPlaceholder}
                    value={form.subindustry}
                    onChange={(event) =>
                      setForm({ ...form, subindustry: event.target.value })
                    }
                  />
                </Field>
                <Field
                  className={styles.fullWidth!}
                  label={
                    selectedPack.id === "restaurant-restaurant"
                      ? "Service modes"
                      : "Main services"
                  }
                  helper={
                    selectedPack.id === "restaurant-restaurant"
                      ? "Separate current modes such as dine-in, takeaway or private dining with commas"
                      : "Separate services with commas"
                  }
                  required
                >
                  <textarea
                    placeholder={selectedPack.brief.servicesPlaceholder}
                    required={briefStep === 0}
                    rows={3}
                    value={form.services}
                    onChange={(event) =>
                      setForm({ ...form, services: event.target.value })
                    }
                  />
                </Field>
              </div>
            </section>

            <section
              aria-labelledby="website-priorities-heading"
              className={styles.sectionCard}
              data-brief-panel="content"
              hidden={briefStep !== 1}
            >
              <SectionHeading
                number="03"
                title="Website priorities"
                description="These choices guide ranking. They do not force every website into the same visual template."
                id="website-priorities-heading"
              />
              <div className={styles.choiceStack}>
                <ChoiceGroup
                  label="Main goals"
                  supporting="What should the website help the business achieve?"
                  values={
                    selectedPack.id === "restaurant-restaurant"
                      ? [
                          "request reservations",
                          "show menu",
                          "plan visits",
                          "build trust",
                          "rank in search",
                        ]
                      : [
                          "generate leads",
                          "book appointments",
                          "build trust",
                          "rank in search",
                        ]
                  }
                  selected={form.goals}
                  onChange={(goals) => setForm({ ...form, goals })}
                />
                <ChoiceGroup
                  label="Visual direction"
                  supporting="Choose qualities, not a fixed template."
                  values={[
                    "professional",
                    "modern",
                    "premium",
                    "minimal",
                    "bold",
                    "friendly",
                    "editorial",
                  ]}
                  selected={form.styleTags}
                  onChange={(styleTags) => setForm({ ...form, styleTags })}
                />
                <ChoiceGroup
                  label="Required functionality"
                  supporting="Select only what this business needs now."
                  values={
                    selectedPack.id === "restaurant-restaurant"
                      ? [
                          "contact form",
                          "reservation request",
                          "menu",
                          "gallery",
                          "maps",
                          "multilingual",
                        ]
                      : [
                          "contact form",
                          "booking",
                          "gallery",
                          "blog",
                          "maps",
                          "lead capture",
                          "multilingual",
                        ]
                  }
                  selected={form.requiredCapabilities}
                  onChange={(requiredCapabilities) =>
                    setForm({ ...form, requiredCapabilities })
                  }
                />
              </div>
              <details className={styles.enrichmentPanel} data-enrichment-panel>
                <summary>
                  <span>
                    <strong>Add richer source material</strong>
                    <small>
                      Approved facts and an image plan help the first build feel
                      complete without inventing proof.
                    </small>
                  </span>
                  <span aria-hidden="true">+</span>
                </summary>
                <div className={styles.enrichmentContent}>
                  <div className={styles.fieldGrid}>
                    <Field
                      label="Opening hours"
                      helper="Add only approved public hours"
                    >
                      <input
                        placeholder="Mon–Sat, 9:00–18:00"
                        value={form.openingHours}
                        onChange={(event) =>
                          setForm({ ...form, openingHours: event.target.value })
                        }
                      />
                    </Field>
                    <Field
                      className={styles.fullWidth!}
                      label={
                        selectedPack.id === "restaurant-restaurant"
                          ? "Verified venue facts"
                          : "Verified trust facts"
                      }
                      helper={
                        selectedPack.id === "restaurant-restaurant"
                          ? "Only supplied facts about the venue, people or service—never inferred awards, ratings or compliance"
                          : "Clinician names, qualifications, years in practice or other approved proof—never estimates"
                      }
                    >
                      <textarea
                        placeholder={selectedPack.brief.trustFactsPlaceholder}
                        rows={3}
                        value={form.trustFacts}
                        onChange={(event) =>
                          setForm({ ...form, trustFacts: event.target.value })
                        }
                      />
                    </Field>
                    {selectedPack.id === "restaurant-restaurant" ? (
                      <>
                        <Field
                          className={styles.fullWidth!}
                          label="Current menu"
                          helper="One item per line: Category | Item | Description | Price | Disclosures. Menu facts must be supplied by the restaurant."
                          required
                        >
                          <textarea
                            placeholder={
                              "Starters | Paneer tikka | Charred paneer and peppers | ₹320 | Contains dairy\nMains | Vegetable biryani | Basmati rice and seasonal vegetables | ₹420 |"
                            }
                            rows={6}
                            value={form.restaurantMenu}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantMenu: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          className={styles.fullWidth!}
                          label="Menu disclosure notes"
                          helper="Use only the restaurant's approved allergen, dietary, serving or availability wording"
                        >
                          <textarea
                            placeholder="Tell our team about allergies before ordering. Items may change when the restaurant updates the menu."
                            rows={3}
                            value={form.restaurantMenuDisclosures}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantMenuDisclosures: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          className={styles.fullWidth!}
                          label="Table-request policy"
                          helper="Explain what happens after a request. The website will never claim that a table is confirmed instantly."
                          required
                        >
                          <textarea
                            placeholder="Table requests are reviewed by the restaurant. A table is confirmed only after the restaurant responds."
                            rows={3}
                            value={form.restaurantReservationPolicy}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantReservationPolicy: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Directions URL"
                          helper="Required approved HTTPS map link"
                        >
                          <input
                            aria-required="true"
                            inputMode="url"
                            placeholder="https://maps.google.com/…"
                            value={form.restaurantMapUrl}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantMapUrl: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Restaurant phone"
                          helper="Approved public number—required if email is blank"
                        >
                          <input
                            autoComplete="tel"
                            inputMode="tel"
                            placeholder="+91 90000 00000"
                            value={form.restaurantPhone}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantPhone: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Restaurant email"
                          helper="Approved public email—required if phone is blank"
                        >
                          <input
                            autoComplete="email"
                            inputMode="email"
                            placeholder="hello@example.com"
                            type="email"
                            value={form.restaurantEmail}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantEmail: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Accessibility"
                          helper="Optional verified entrance or seating details"
                        >
                          <input
                            placeholder="Step-free entrance, accessible seating"
                            value={form.restaurantAccessibility}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantAccessibility: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Parking"
                          helper="Optional verified parking information"
                        >
                          <input
                            placeholder="Street parking; paid parking nearby"
                            value={form.restaurantParking}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantParking: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Public transport"
                          helper="Optional verified arrival information"
                        >
                          <input
                            placeholder="Metro station 400 m away"
                            value={form.restaurantTransit}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantTransit: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          className={styles.fullWidth!}
                          label="Restaurant story"
                          helper="Required approved origin, approach or hospitality story"
                        >
                          <textarea
                            aria-required="true"
                            placeholder="Write only the story supplied and approved by the restaurant."
                            rows={4}
                            value={form.restaurantStory}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                restaurantStory: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </>
                    ) : null}
                  </div>
                  <SingleChoiceGroup
                    label="Image plan"
                    supporting="This tells MiCirql whether to reserve space for supplied photography or use the certified library."
                    values={
                      selectedPack.id === "restaurant-restaurant"
                        ? [
                            "Use the certified Restaurant image library for now",
                            "I have real menu or venue photos",
                            "Mix real menu or venue photos with the certified Restaurant library",
                          ]
                        : [
                            "Use the certified image library for now",
                            "I have real clinic or team photos",
                            "Mix real clinic or team photos with the certified library",
                          ]
                    }
                    selected={form.imagePlan}
                    onChange={(imagePlan) => setForm({ ...form, imagePlan })}
                  />
                </div>
              </details>
            </section>

            <section
              aria-labelledby="brand-assets-heading"
              className={styles.sectionCard}
              data-brief-panel="brand"
              hidden={briefStep !== 2}
            >
              <SectionHeading
                number="04"
                title="Brand assets"
                description="A supplied logo remains unchanged in every direction. Leave colors blank to compare each direction in its researched palette."
                id="brand-assets-heading"
              />
              <div className={styles.brandLayout}>
                <div>
                  <span className={styles.controlLabel}>Logo</span>
                  <label
                    className={`${styles.uploadControl} ${
                      uploadingLogo ? styles.uploading : ""
                    }`}
                  >
                    <input
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className={styles.visuallyHidden}
                      disabled={uploadingLogo || !context}
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void uploadLogo(file);
                      }}
                    />
                    {logoPreviewUrl ? (
                      <span className={styles.logoPreview} aria-hidden="true">
                        <img alt="" src={logoPreviewUrl} />
                      </span>
                    ) : (
                      <span className={styles.uploadSymbol} aria-hidden="true">
                        ↑
                      </span>
                    )}
                    <span className={styles.uploadCopy}>
                      <strong>
                        {form.logoName ||
                          (uploadingLogo ? "Uploading logo…" : "Upload logo")}
                      </strong>
                      <span>SVG, PNG, JPG or WebP</span>
                    </span>
                    <span className={styles.uploadAction}>
                      {form.logoName ? "Replace" : "Choose file"}
                    </span>
                  </label>
                  <p className={styles.brandPromise}>
                    We preserve the supplied mark—no redrawing, recoloring or AI
                    reinterpretation.
                  </p>
                  {logoStatus ? (
                    <p className={styles.statusMessage} role="status">
                      {logoStatus}
                    </p>
                  ) : null}
                  {logoFailure ? (
                    <div
                      className={styles.uploadFailure}
                      data-upload-code={logoFailure.code}
                      role="alert"
                    >
                      <strong>Logo not uploaded</strong>
                      <span>{logoFailure.message}</span>
                      {form.logoAssetId ? (
                        <span>
                          Your previously uploaded logo is still in use.
                        </span>
                      ) : null}
                      <div className={styles.uploadFailureActions}>
                        {logoFailure.retryable && failedLogoFile ? (
                          <button
                            disabled={uploadingLogo}
                            onClick={() => void uploadLogo(failedLogoFile)}
                            type="button"
                          >
                            Try again
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            setLogoFailure(undefined);
                            setFailedLogoFile(undefined);
                          }}
                          type="button"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {form.logoAssetId && !uploadingLogo ? (
                    <button
                      className={styles.removeLogo}
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          logoAssetId: "",
                          logoName: "",
                        }));
                        setLogoFailure(undefined);
                        setFailedLogoFile(undefined);
                        setLogoPreviewUrl("");
                        setLogoStatus("Logo removed from this brief");
                      }}
                      type="button"
                    >
                      Remove logo
                    </button>
                  ) : null}
                </div>
                <div>
                  <span className={styles.controlLabel}>Optional palette</span>
                  <div className={styles.colorGrid}>
                    <ColorField
                      label="Primary"
                      placeholder="#0F766E"
                      value={form.brandPrimary}
                      onChange={(brandPrimary) =>
                        setForm({ ...form, brandPrimary })
                      }
                    />
                    <ColorField
                      label="Secondary"
                      placeholder="#164E63"
                      value={form.brandSecondary}
                      onChange={(brandSecondary) =>
                        setForm({ ...form, brandSecondary })
                      }
                    />
                    <ColorField
                      label="Accent"
                      placeholder="#14B8A6"
                      value={form.brandAccent}
                      onChange={(brandAccent) =>
                        setForm({ ...form, brandAccent })
                      }
                    />
                  </div>
                  <p className={styles.paletteHint}>
                    Blank fields keep candidate palettes available for a fair
                    design comparison.
                  </p>
                </div>
              </div>
            </section>

            <section
              aria-labelledby="additional-details-heading"
              className={styles.sectionCard}
              data-brief-panel="review"
              hidden={briefStep !== 3}
            >
              <SectionHeading
                number="05"
                title="Additional details"
                description="Add language needs and any factual constraints the website must respect."
                id="additional-details-heading"
              />
              <div className={styles.fieldGrid}>
                <Field
                  label="Languages"
                  helper="Use comma-separated language codes"
                >
                  <input
                    placeholder="en, hi, te"
                    value={form.languages}
                    onChange={(event) =>
                      setForm({ ...form, languages: event.target.value })
                    }
                  />
                </Field>
                <Field
                  className={styles.fullWidth!}
                  label="Notes and constraints"
                  helper="Only include facts that can safely appear on the website"
                >
                  <textarea
                    placeholder="Accessibility needs, approved wording, opening hours or facts to avoid…"
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </Field>
              </div>
            </section>
          </div>

          <aside
            className={styles.summary}
            aria-label="Brief summary"
            data-final-review={isFinalBriefStep ? "true" : "false"}
          >
            <span className={styles.summaryKicker}>
              Brief {briefStep + 1} of {BRIEF_STEPS.length}
            </span>
            <h2>
              {isFinalBriefStep
                ? "Review before anything is generated."
                : activeBriefStep.label}
            </h2>
            <p>
              {isFinalBriefStep
                ? "The first build uses only this brief and the selected certified industry system."
                : activeBriefStep.description}
            </p>
            <dl className={styles.summaryFacts}>
              <div>
                <dt>Industry</dt>
                <dd>
                  {selectedPack.label}
                  <span>Certified</span>
                </dd>
              </div>
              <div>
                <dt>Business</dt>
                <dd>{form.businessName.trim() || "Not added yet"}</dd>
              </div>
              <div>
                <dt>Services</dt>
                <dd>
                  {serviceCount
                    ? `${serviceCount} supplied`
                    : "Required before continuing"}
                </dd>
              </div>
              <div>
                <dt>Brand</dt>
                <dd>
                  {form.logoName
                    ? "Logo supplied"
                    : suppliedColorCount
                      ? `${suppliedColorCount} brand color${suppliedColorCount === 1 ? "" : "s"}`
                      : "Candidate palettes"}
                </dd>
              </div>
              <div>
                <dt>Imagery</dt>
                <dd>{shortImagePlan(form.imagePlan)}</dd>
              </div>
            </dl>
            <div className={styles.nextPanel}>
              <strong>What happens next</strong>
              <ol>
                <li>We validate the supplied facts.</li>
                <li>
                  MiCirql ranks 20 certified {selectedPack.brief.directionLabel}{" "}
                  directions.
                </li>
                <li>You choose a direction before the full build.</li>
              </ol>
            </div>
            <div className={styles.truthNotice}>
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Facts stay factual.</strong>
                No invented awards, credentials, phone numbers or claims.
              </p>
            </div>
            <div className={styles.summaryActions}>
              {briefStep > 0 ? (
                <button
                  className={styles.summaryBack}
                  type="button"
                  onClick={returnToPreviousBriefStep}
                >
                  <span aria-hidden="true">←</span> Back
                </button>
              ) : null}
              <button
                className={styles.submitButton}
                disabled={building || uploadingLogo || !context}
                type="button"
                onClick={(event) => {
                  if (isFinalBriefStep)
                    event.currentTarget.form?.requestSubmit();
                  else advanceBrief();
                }}
              >
                {building
                  ? "Preparing 20 directions…"
                  : isFinalBriefStep
                    ? `Review 20 ${selectedPack.brief.directionLabel} directions`
                    : `Continue to ${BRIEF_STEPS[briefStep + 1]!.label}`}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <small className={styles.submitHint}>
              {isFinalBriefStep
                ? "This saved brief remains the factual source for this project."
                : "Your answers stay in this brief as you move between sections."}
            </small>
          </aside>
        </div>
        <div
          className={styles.mobileAction}
          data-mobile-action
          data-visible={
            briefStep > 0 || requiredRemaining === 0 ? "true" : "false"
          }
        >
          <span aria-live="polite">
            {briefStep === 0 && requiredRemaining
              ? `${requiredRemaining} required item${requiredRemaining === 1 ? "" : "s"} left`
              : `${activeBriefStep.label} · ${briefStep + 1} of ${BRIEF_STEPS.length}`}
          </span>
          <button
            disabled={building || uploadingLogo || !context}
            type="button"
            onClick={(event) => {
              if (isFinalBriefStep) event.currentTarget.form?.requestSubmit();
              else advanceBrief();
            }}
          >
            {building
              ? "Preparing…"
              : isFinalBriefStep
                ? "Review 20 directions"
                : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  helper,
  required,
  className,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${styles.field} ${className ?? ""}`}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? <small>Required</small> : null}
      </span>
      {children}
      {helper ? <span className={styles.fieldHelper}>{helper}</span> : null}
    </label>
  );
}

function SectionHeading({
  number,
  title,
  description,
  id,
}: {
  number: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <span aria-hidden="true">{number}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

function ChoiceGroup({
  label,
  supporting,
  values,
  selected,
  onChange,
}: {
  label: string;
  supporting: string;
  values: string[];
  selected: string[];
  onChange(value: string[]): void;
}) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>{label}</legend>
      <p>{supporting}</p>
      <div className={styles.choiceList}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              aria-pressed={active}
              className={active ? styles.choiceActive : undefined}
              key={value}
              type="button"
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((item) => item !== value)
                    : [...selected, value],
                )
              }
            >
              <span aria-hidden="true">{active ? "✓" : "+"}</span>
              {sentenceCase(value)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SingleChoiceGroup({
  label,
  supporting,
  values,
  selected,
  onChange,
}: {
  label: string;
  supporting: string;
  values: string[];
  selected: string;
  onChange(value: string): void;
}) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>{label}</legend>
      <p>{supporting}</p>
      <div className={styles.choiceList}>
        {values.map((value) => {
          const active = selected === value;
          return (
            <button
              aria-pressed={active}
              className={active ? styles.choiceActive : undefined}
              key={value}
              type="button"
              onClick={() => onChange(value)}
            >
              <span aria-hidden="true">{active ? "✓" : "+"}</span>
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ColorField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
}) {
  const validColor = /^#[0-9a-f]{6}$/i.test(value.trim());
  return (
    <label className={styles.colorField}>
      <span>{label}</span>
      <span className={styles.colorInput}>
        <i
          aria-hidden="true"
          style={{ backgroundColor: validColor ? value : undefined }}
        />
        <input
          inputMode="text"
          pattern="^#[0-9A-Fa-f]{6}$"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function commaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBriefNotes(form: FormState) {
  return [
    form.notes.trim(),
    form.openingHours.trim()
      ? `Approved opening hours: ${form.openingHours.trim()}`
      : "",
    form.trustFacts.trim()
      ? `Verified trust facts: ${form.trustFacts.trim()}`
      : "",
    form.imagePlan ? `Image plan: ${form.imagePlan}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRestaurantIndustryFacts(form: FormState) {
  return {
    kind: "restaurant-facts-v1",
    businessName: form.businessName.trim(),
    cuisines: commaList(form.subindustry),
    serviceModes: commaList(form.services),
    menu: {
      suppliedAsCurrent: true,
      categories: parseRestaurantMenu(form.restaurantMenu),
      notes: [],
      disclosureNotes: factLines(form.restaurantMenuDisclosures),
    },
    address: form.location.trim(),
    ...(form.restaurantMapUrl.trim()
      ? { mapUrl: form.restaurantMapUrl.trim() }
      : {}),
    openingHours: factLines(form.openingHours),
    accessibility: factLines(form.restaurantAccessibility),
    parking: factLines(form.restaurantParking),
    transit: factLines(form.restaurantTransit),
    visitDetails: factLines(form.trustFacts),
    ...(form.restaurantPhone.trim()
      ? { phone: form.restaurantPhone.trim() }
      : {}),
    ...(form.restaurantEmail.trim()
      ? { email: form.restaurantEmail.trim() }
      : {}),
    reservationPolicy: factLines(form.restaurantReservationPolicy),
    partyDetails: [],
    specialRequestNotes: [],
    ...(form.restaurantStory.trim()
      ? {
          story: {
            heading: `About ${form.businessName.trim()}`,
            paragraphs: factLines(form.restaurantStory),
            principles: [],
          },
        }
      : {}),
  };
}

function parseRestaurantMenu(value: string) {
  const categories = new Map<
    string,
    {
      name: string;
      items: Array<{
        name: string;
        description?: string;
        price?: string;
        disclosures: string[];
      }>;
    }
  >();
  for (const line of value.split(/\r?\n/)) {
    const [
      categoryValue,
      itemValue,
      descriptionValue,
      priceValue,
      disclosureValue,
    ] = line.split("|").map((part) => part.trim());
    if (!categoryValue || !itemValue) continue;
    const key = categoryValue.toLocaleLowerCase("en-US");
    const category = categories.get(key) ?? {
      name: categoryValue,
      items: [],
    };
    category.items.push({
      name: itemValue,
      ...(descriptionValue ? { description: descriptionValue } : {}),
      ...(priceValue ? { price: priceValue } : {}),
      disclosures: disclosureValue ? commaList(disclosureValue) : [],
    });
    categories.set(key, category);
  }
  return [...categories.values()];
}

function factLines(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortImagePlan(value: string) {
  if (value.startsWith("I have")) return "Real photos supplied later";
  if (value.startsWith("Mix")) return "Real + certified library";
  return "Certified library";
}

function packStatusLabel(
  status: (typeof INDUSTRY_AVAILABILITY)[number]["status"],
) {
  if (status === "certified") return "Certified";
  if (status === "validation") return "In validation";
  return "Planned";
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
