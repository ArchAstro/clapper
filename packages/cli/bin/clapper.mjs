#!/usr/bin/env node
import { dirname, join } from "node:path";
// Node 24+ strips TypeScript types natively, so the CLI runs its .ts sources directly.
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = pathToFileURL(join(here, "..", "src", "cli.ts")).href;
const mod = await import(entry);
try {
  await mod.main(process.argv.slice(2));
} catch (error) {
  console.error(`clapper: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
