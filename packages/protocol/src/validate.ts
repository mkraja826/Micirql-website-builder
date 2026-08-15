import {
  MIN_TAP_TARGET_PX,
  MOBILE_TEST_WIDTHS,
  PERFORMANCE_BUDGETS,
} from "./rules";
import type { ProtocolInput, ProtocolIssue, ProtocolResult } from "./types";

function push(
  issues: ProtocolIssue[],
  issue: ProtocolIssue,
): void {
  issues.push(issue);
}

export function validateProtocol(input: ProtocolInput): ProtocolResult {
  const issues: ProtocolIssue[] = [];

  if (input.functionality.interactive && !input.functionality.actionsDeclared) {
    push(issues, {
      code: "FUNCTION_ACTION_MISSING",
      category: "functionality",
      severity: "error",
      message: "Interactive UI must declare registered actions.",
    });
  }

  if (
    input.functionality.interactive &&
    (!input.functionality.states.loading ||
      !input.functionality.states.error ||
      !input.functionality.states.success)
  ) {
    push(issues, {
      code: "FUNCTION_STATES_INCOMPLETE",
      category: "functionality",
      severity: "error",
      message: "Interactive functionality must provide loading, error, and success states.",
    });
  }

  const missingWidths = MOBILE_TEST_WIDTHS.filter(
    (width) => !input.mobile.testedWidths.includes(width),
  );

  if (missingWidths.length > 0) {
    push(issues, {
      code: "MOBILE_WIDTHS_UNTESTED",
      category: "mobile",
      severity: "error",
      message: `Required mobile widths are untested: ${missingWidths.join(", ")}.`,
    });
  }

  if (input.mobile.hasHorizontalOverflow) {
    push(issues, {
      code: "MOBILE_HORIZONTAL_OVERFLOW",
      category: "mobile",
      severity: "error",
      message: "Horizontal overflow is not allowed on supported mobile widths.",
    });
  }

  if (input.mobile.minTapTargetPx < MIN_TAP_TARGET_PX) {
    push(issues, {
      code: "MOBILE_TAP_TARGET",
      category: "mobile",
      severity: "error",
      message: `Interactive targets must be at least ${MIN_TAP_TARGET_PX}px.`,
    });
  }

  if (!input.mobile.mobileNavigationVerified) {
    push(issues, {
      code: "MOBILE_NAV_UNVERIFIED",
      category: "mobile",
      severity: "error",
      message: "Mobile navigation behavior must be verified.",
    });
  }

  if (input.performance.clientJsKb > PERFORMANCE_BUDGETS.clientJsKb) {
    push(issues, {
      code: "PERF_CLIENT_JS_BUDGET",
      category: "performance",
      severity: "error",
      message: `Client JavaScript exceeds ${PERFORMANCE_BUDGETS.clientJsKb}KB budget.`,
    });
  }

  if (
    input.performance.imageKbAboveFold >
    PERFORMANCE_BUDGETS.imageKbAboveFold
  ) {
    push(issues, {
      code: "PERF_ABOVE_FOLD_IMAGE_BUDGET",
      category: "performance",
      severity: "error",
      message: `Above-fold imagery exceeds ${PERFORMANCE_BUDGETS.imageKbAboveFold}KB budget.`,
    });
  }

  if (input.performance.totalFontKb > PERFORMANCE_BUDGETS.totalFontKb) {
    push(issues, {
      code: "PERF_FONT_BUDGET",
      category: "performance",
      severity: "error",
      message: `Font payload exceeds ${PERFORMANCE_BUDGETS.totalFontKb}KB budget.`,
    });
  }

  if (
    input.performance.thirdPartyScriptCount >
    PERFORMANCE_BUDGETS.thirdPartyScriptCount
  ) {
    push(issues, {
      code: "PERF_THIRD_PARTY_BUDGET",
      category: "performance",
      severity: "warning",
      message: `Third-party script count exceeds recommended limit of ${PERFORMANCE_BUDGETS.thirdPartyScriptCount}.`,
    });
  }

  if (input.performance.animationCost === "high") {
    push(issues, {
      code: "PERF_ANIMATION_HIGH_COST",
      category: "performance",
      severity: "warning",
      message: "High-cost animation requires explicit review before production use.",
    });
  }

  const accessibilityChecks = [
    [input.accessibility.keyboardNavigable, "keyboard navigation"],
    [input.accessibility.focusVisible, "visible focus"],
    [input.accessibility.labelsPresent, "accessible labels"],
    [input.accessibility.contrastPass, "contrast"],
    [input.accessibility.reducedMotionSupported, "reduced-motion support"],
  ] as const;

  for (const [passed, label] of accessibilityChecks) {
    if (!passed) {
      push(issues, {
        code: `A11Y_${label.toUpperCase().replace(/[^A-Z]+/g, "_")}`,
        category: "accessibility",
        severity: "error",
        message: `Accessibility check failed: ${label}.`,
      });
    }
  }

  const seoChecks = [
    [input.seo.titlePresent, "title"],
    [input.seo.metaDescriptionPresent, "meta description"],
    [input.seo.logicalH1, "logical H1"],
    [input.seo.headingHierarchyPass, "heading hierarchy"],
    [input.seo.canonicalPresent, "canonical URL"],
    [input.seo.altTextPass, "image alt text"],
    [input.seo.structuredDataValid, "structured data"],
  ] as const;

  if (input.seo.indexable) {
    for (const [passed, label] of seoChecks) {
      if (!passed) {
        push(issues, {
          code: `SEO_${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
          category: "seo",
          severity: "error",
          message: `Indexable pages must pass SEO check: ${label}.`,
        });
      }
    }
  }

  if (input.security.exposesSecrets) {
    push(issues, {
      code: "SECURITY_SECRET_EXPOSURE",
      category: "security",
      severity: "error",
      message: "Secrets must never be exposed to the rendered website.",
    });
  }

  const securityChecks = [
    [input.security.registeredActionsOnly, "registered actions only"],
    [input.security.serverValidationPresent, "server-side validation"],
    [input.security.publicPermissionsExplicit, "explicit public permissions"],
    [input.security.rateLimitConfigured, "rate limiting"],
  ] as const;

  for (const [passed, label] of securityChecks) {
    if (!passed) {
      push(issues, {
        code: `SECURITY_${label.toUpperCase().replace(/[^A-Z]+/g, "_")}`,
        category: "security",
        severity: "error",
        message: `Security requirement missing: ${label}.`,
      });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const score = Math.max(0, 100 - errorCount * 12 - warningCount * 3);

  return {
    passed: errorCount === 0,
    publishBlocked: errorCount > 0,
    score,
    issues,
  };
}
