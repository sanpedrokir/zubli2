// Node module-resolution hooks for running server modules under `node --test`:
//  - resolves "@/..." and extensionless relative imports the way Next.js does
//  - stubs "server-only"
//  - swaps lib/db.js for an in-process PostgreSQL (PGlite) with the same API
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const realDb = path.join(root, "lib", "db.js");

function findFile(p) {
  for (const candidate of [p, `${p}.js`, `${p}.mjs`, path.join(p, "index.js")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return { url: pathToFileURL(path.join(here, "empty.mjs")).href, shortCircuit: true };
  }
  let target = null;
  if (specifier.startsWith("@/")) {
    target = path.join(root, specifier.slice(2));
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target) {
    const file = findFile(target);
    if (file) {
      if (path.normalize(file) === realDb) {
        return { url: pathToFileURL(path.join(here, "fake-db.mjs")).href, shortCircuit: true };
      }
      return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
