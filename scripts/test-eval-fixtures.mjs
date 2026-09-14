import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFixtures } from "../packages/cli/src/eval/fixtures.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
fs.mkdirSync(path.join(root, ".clapper"), { recursive: true });
const parent = fs.mkdtempSync(path.join(root, ".clapper/eval-fixture-check-"));
const result = await runFixtures(path.join(parent, "run"));
console.log(
  `PASS: ${result.passed}/${result.total} evaluator regression fixtures. Evidence: ${parent}/run/fixtures.json`,
);
