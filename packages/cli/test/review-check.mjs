// End-to-end check of `agenticvids review`: the lint must catch the four planted defects in fixtures/lint.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "fixtures/lint/src/index.tsx");
const out = path.join(here, "fixtures/lint/out/review");
const r = spawnSync("node", [path.join(here, "../bin/agenticvids.mjs"), "review", entry, "-c", "lint", "--draft", "--out", out], { encoding: "utf8" });
process.stdout.write(r.stdout);
if (r.stderr && !/Review kit for/.test(r.stdout)) process.stderr.write(r.stderr);
const issues = JSON.parse(fs.readFileSync(path.join(out, "lint.json"), "utf8"));
const rules = new Set(issues.map((i) => i.rule));
const want = ["overlap", "safe-area", "blank-after-cut", "determinism"];
const missing = want.filter((w) => !rules.has(w));
for (const f of ["brief.md", "contact-sheet.png", "cut-0030.png", "opening-2s.png", "scenes.json"]) if (!fs.existsSync(path.join(out, f))) missing.push(`file:${f}`);
if (r.status !== 1) missing.push(`exit code ${r.status} (expected 1 because errors were found)`);
fs.rmSync(path.join(here, "fixtures/lint/out"), { recursive: true, force: true });
fs.rmSync(path.join(here, "fixtures/lint/.agenticvids"), { recursive: true, force: true });
if (missing.length) {
  console.error(`review-check FAILED, missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`review-check OK: ${issues.length} issues, rules ${[...rules].join(", ")}`);
