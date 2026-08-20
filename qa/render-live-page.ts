import { readFileSync } from "node:fs";
import { nativeFunctionCatalog } from "@micirql/functions";
import { createProductionSectionRendererRegistry } from "@micirql/live-runtime/production-section-registry";
import { createFunctionBindingResolver, preparePage, renderPreparedPage } from "@micirql/renderer";
import type { Site } from "@micirql/schema";
import { renderToStaticMarkup } from "react-dom/server";

type Input = {
  site: Site;
  path: string;
  origin: string;
};

const raw = readFileSync(0, "utf8");
const input = JSON.parse(raw) as Input;
const prepared = await preparePage({
  site: input.site,
  path: input.path,
  origin: input.origin,
  registry: createProductionSectionRendererRegistry(),
  functions: createFunctionBindingResolver({ actionIds: nativeFunctionCatalog.map((item) => item.id) }),
  mode: "production",
});

if (!prepared.ok) {
  throw new Error(`Unable to prepare isolated live QA page: ${prepared.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" | ")}`);
}

process.stdout.write(renderToStaticMarkup(renderPreparedPage(prepared.value)));
