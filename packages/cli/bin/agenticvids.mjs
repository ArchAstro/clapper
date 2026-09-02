#!/usr/bin/env node
// Node 24+ strips TypeScript types natively, so the CLI runs its .ts sources directly.
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = pathToFileURL(join(here, "..", "src", "cli.ts")).href;
const mod = await import(entry);
await mod.main(process.argv.slice(2));
