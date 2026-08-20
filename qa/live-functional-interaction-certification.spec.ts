import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

async function generatedLiveRuntimeCss(): Promise<string> {
  execFileSync(pnpm, ["--filter", "@micirql/live", "generate:runtime-css"], {
    cwd: repoRoot,
    stdio: "pipe",
    env: process.env,
  });
  const generated = await readFile(path.join(repoRoot, "apps/live/generated/runtime-css.ts"), "utf8");
  const match = generated.match(/export const MICIRQL_RUNTIME_CSS = (.*);\s*$/s);
  if (!match?.[1]) throw new Error("Unable to read generated live runtime CSS artifact");
  return JSON.parse(match[1]) as string;
}

async function publishedFormFeedbackScript(): Promise<string> {
  const source = await readFile(path.join(repoRoot, "packages/live-runtime/src/index.ts"), "utf8");
  const match = source.match(/function formFeedbackScript\(\) \{\s*return `(<script>[\s\S]*?<\/script>)`;\s*\}/);
  if (!match?.[1]) throw new Error("Unable to extract the published live form feedback script");
  return match[1];
}

function functionalLiveDocument(css: string, feedbackScript: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${css}</style>
</head>
<body>
  <main data-mi-site style="--mi-color-primary:#5b45ff;--mi-color-accent:#6d59ff;--mi-color-border:#d9d9e3;--mi-background:#fff;--mi-foreground:#17171d">
    <header class="mi-shell-navbar mi-shell-navbar--classic">
      <div class="mi-container">
        <div class="mi-nav-row">
          <a href="/" class="mi-shell-brand">Aurelia Dental</a>
          <nav class="mi-shell-links" aria-label="Primary navigation">
            <a href="#services">Services</a>
            <details class="mi-shell-dropdown">
              <summary>Treatments <span aria-hidden="true">⌄</span></summary>
              <div class="mi-shell-dropdown__panel">
                <a href="#all-on-4">All-on-4 implants</a>
                <a href="#single-implant">Single implants</a>
              </div>
            </details>
            <a href="#enquiry">Contact</a>
          </nav>
          <a class="mi-shell-cta" href="#enquiry">Book appointment</a>
        </div>
      </div>
    </header>

    <section class="mi-section" id="services"><div class="mi-container"><h1>Implant dentistry with clear next steps</h1></div></section>
    <section class="mi-section" id="all-on-4"><div class="mi-container"><h2>All-on-4 implants</h2></div></section>
    <section class="mi-section" id="single-implant"><div class="mi-container"><h2>Single implants</h2></div></section>

    <section class="mi-section mi-contact-struct mi-contact-struct--classic" id="enquiry">
      <div class="mi-container">
        <form class="mi-contact-form mi-functional-form" action="https://clinic.test/api/functions/appointment.request" method="post" data-mi-action-id="appointment.request">
          <input type="hidden" name="workspaceId" value="workspace-1">
          <input type="hidden" name="siteId" value="site-1">
          <input type="hidden" name="actionId" value="appointment.request">
          <input type="hidden" name="sourcePage" value="/">
          <input type="text" name="website" tabindex="-1" autocomplete="off" class="mi-form-honeypot" aria-hidden="true">
          <div class="mi-functional-form__grid">
            <label><span>Name *</span><input name="name" required autocomplete="name"></label>
            <label><span>Email</span><input name="email" type="email" placeholder="you@example.com" autocomplete="email"></label>
            <label><span>Phone *</span><input name="phone" type="tel" required placeholder="+91 98765 43210" autocomplete="tel"></label>
            <label class="mi-form-field--wide"><span>Treatment / service *</span><input name="service" required></label>
            <label class="mi-form-field--wide"><span>Preferred clinician</span><input name="clinician"></label>
            <label><span>Preferred date</span><input name="preferredDate" type="date"></label>
            <label><span>Preferred time</span><input name="preferredTime" type="time"></label>
            <label class="mi-form-field--wide"><span>Message</span><textarea name="message" rows="5" placeholder="Share any symptoms, concerns, or accessibility needs"></textarea></label>
          </div>
          <label class="mi-form-consent"><input type="checkbox" name="consent" value="true" required> <span>I agree to be contacted about this request.</span></label>
          <button type="submit" class="mi-functional-form__submit">Request appointment</button>
          <p class="mi-form-status" data-mi-form-status aria-live="polite">Send your preferred treatment and time. The clinic will contact you to confirm the appointment.</p>
        </form>
      </div>
    </section>
  </main>
  ${feedbackScript}
</body>
</html>`;
}

let runtimeCss = "";
let feedbackScript = "";

test.beforeAll(async () => {
  [runtimeCss, feedbackScript] = await Promise.all([
    generatedLiveRuntimeCss(),
    publishedFormFeedbackScript(),
  ]);
  expect(runtimeCss).toContain("packages/sections/src/interaction-polish.css");
  expect(feedbackScript).toContain("data-mi-form-status");
  expect(feedbackScript).toContain("formError");
});

test.describe("published live functional interaction certification", () => {
  test("desktop treatment dropdown is keyboard operable with safe focusable destinations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent(functionalLiveDocument(runtimeCss, feedbackScript), { waitUntil: "load" });

    const dropdown = page.locator("[data-mi-site] details.mi-shell-dropdown");
    const trigger = dropdown.locator("summary");
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(dropdown).toHaveAttribute("open", "");

    const panel = dropdown.locator(".mi-shell-dropdown__panel");
    await expect(panel).toBeVisible();
    const links = panel.locator("a[href]");
    expect(await links.count()).toBeGreaterThanOrEqual(2);

    const unsafe = await links.evaluateAll((anchors) => anchors.filter((anchor) => {
      const href = anchor.getAttribute("href")?.trim() ?? "";
      return !href || href === "#" || /^(?:javascript|data|file|vbscript):/i.test(href);
    }).length);
    expect(unsafe).toBe(0);

    const firstLink = links.first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    const focus = await firstLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
    });
    expect(focus.outlineStyle).not.toBe("none");
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(dropdown).not.toHaveAttribute("open", "");
  });

  test("appointment form blocks incomplete submission and posts the complete functional payload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let interceptedPosts = 0;
    await page.route("https://clinic.test/api/functions/appointment.request", async (route) => {
      interceptedPosts += 1;
      await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>received</title><p>ok</p>" });
    });
    await page.setContent(functionalLiveDocument(runtimeCss, feedbackScript), { waitUntil: "load" });

    const form = page.locator("form[data-mi-action-id='appointment.request']");
    await expect(form).toBeVisible();
    expect(await form.evaluate((element) => (element as HTMLFormElement).checkValidity())).toBeFalsy();

    await form.locator("button[type='submit']").click();
    await page.waitForTimeout(75);
    expect(interceptedPosts).toBe(0);

    const requiredNames = await form.locator("[required]").evaluateAll((elements) => elements.map((element) => element.getAttribute("name")));
    expect(requiredNames).toEqual(expect.arrayContaining(["name", "phone", "service", "consent"]));

    await form.locator("input[name='name']").fill("Karthik Raja");
    await form.locator("input[name='email']").fill("karthik@example.com");
    await form.locator("input[name='phone']").fill("9876543210");
    await form.locator("input[name='service']").fill("All-on-4 implants");
    await form.locator("textarea[name='message']").fill("I would like an implant consultation.");
    await form.locator("input[name='consent']").check();
    expect(await form.evaluate((element) => (element as HTMLFormElement).checkValidity())).toBeTruthy();

    const requestPromise = page.waitForRequest((request) => request.url() === "https://clinic.test/api/functions/appointment.request" && request.method() === "POST");
    await form.locator("button[type='submit']").click();
    const request = await requestPromise;
    const payload = new URLSearchParams(request.postData() ?? "");

    expect(payload.get("actionId")).toBe("appointment.request");
    expect(payload.get("name")).toBe("Karthik Raja");
    expect(payload.get("phone")).toBe("9876543210");
    expect(payload.get("service")).toBe("All-on-4 implants");
    expect(payload.get("consent")).toBe("true");
    expect(payload.get("website")).toBe("");
    expect(interceptedPosts).toBe(1);
  });

  test("published feedback script announces successful submissions through the aria-live status", async ({ page }) => {
    await page.route("https://clinic.test/**", async (route) => {
      if (route.request().method() !== "GET") return route.abort();
      await route.fulfill({ status: 200, contentType: "text/html", body: functionalLiveDocument(runtimeCss, feedbackScript) });
    });

    await page.goto("https://clinic.test/?form=received#enquiry", { waitUntil: "load" });
    const status = page.locator("[data-mi-form-status]");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("data-state", "success");
    await expect(status).toContainText("Request received");
  });

  test("published feedback script exposes actionable validation errors without losing the live region", async ({ page }) => {
    await page.route("https://clinic.test/**", async (route) => {
      if (route.request().method() !== "GET") return route.abort();
      await route.fulfill({ status: 200, contentType: "text/html", body: functionalLiveDocument(runtimeCss, feedbackScript) });
    });

    await page.goto("https://clinic.test/?formError=check-details#enquiry", { waitUntil: "load" });
    const status = page.locator("[data-mi-form-status]");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("data-state", "error");
    await expect(status).toContainText("check the details");
  });
});
