import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const appRoots = process.argv.slice(2);

if (appRoots.length === 0) {
  throw new Error("Pass at least one app directory to verify.");
}

const forbiddenDynamicRequire = "require(this.middlewareManifestPath)";

for (const appRoot of appRoots) {
  const serverFunctionsRoot = path.resolve(
    appRoot,
    ".open-next",
    "server-functions",
  );
  const handlers = await findHandlers(serverFunctionsRoot);

  if (handlers.length === 0) {
    throw new Error(
      `No OpenNext handler bundle found under ${serverFunctionsRoot}.`,
    );
  }

  for (const handler of handlers) {
    const source = await readFile(handler, "utf8");
    if (source.includes(forbiddenDynamicRequire)) {
      throw new Error(
        `Unsupported middleware manifest dynamic require found in ${handler}.`,
      );
    }
  }

  console.log(
    `Verified ${handlers.length} OpenNext handler(s) for ${appRoot}.`,
  );
}

async function findHandlers(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const handlers = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      handlers.push(...(await findHandlers(entryPath)));
    } else if (entry.isFile() && entry.name === "handler.mjs") {
      handlers.push(entryPath);
    }
  }

  return handlers;
}
