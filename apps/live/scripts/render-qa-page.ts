import { readFileSync } from "node:fs";
import { nativeFunctionCatalog } from "@micirql/functions";
import { createProductionSectionRendererRegistry } from "@micirql/live-runtime/production-section-registry";
import { createFunctionBindingResolver, preparePage, renderPreparedPage } from "@micirql/renderer";
import type { Site } from "@micirql/schema";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

type Input = {
  site: Site;
  path: string;
  origin: string;
};

/* The QA harness executes workspace TSX directly through tsx. Some dependency
 * files can be emitted with the classic JSX factory even though production
 * Next builds use the automatic runtime. Expose React on the Node global so
 * those classic factory references remain deterministic inside this isolated
 * certification process without changing published application behavior. */
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

async function main() {
  const input = JSON.parse(readFileSync(0, "utf8")) as Input;
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
