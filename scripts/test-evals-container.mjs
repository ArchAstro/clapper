// Real container-boundary + Clapper rendering proof. Use the local image from the documented Dockerfile.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const image = process.argv[2];
assert.match(image ?? "", /^sha256:[a-f0-9]{64}$/, "Pass an immutable local Docker image ID");
const root = fs.mkdtempSync(path.join(repo, ".clapper/eval-container-"));
const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2));
const source = "Public source: input reaches output.";
fs.writeFileSync(path.join(root, "source.md"), source);
fs.writeFileSync(path.join(root, "grading-key"), "SECRET_EVAL_GOLD_MUST_NOT_BE_MOUNTED");
write("case.json", {
  schema: 1,
  id: "container-smoke",
  family: "test-only",
  split: "holdout",
  title: "Container protocol fixture",
  goldAnswer: "SECRET_EXTRA_FIELD",
  brief: "TEST ONLY. Generate a two-second input to output diagram.",
  audience: "Harness developer",
  durationSeconds: [1.9, 2.1],
  size: [320, 180],
  fps: 30,
  audioRequired: false,
  sources: [
    {
      id: "source",
      file: "source.md",
      sha256: createHash("sha256").update(source).digest("hex"),
      url: "https://example.org/fixture",
      revision: "test-only",
    },
  ],
  requiredSourceIds: ["source"],
  constraints: [{ id: "private", description: "SECRET_EVAL_GOLD_MUST_NOT_BE_MOUNTED", modality: "text" }],
  eventFrames: [8],
  transferQuestions: ["SECRET_QUESTION"],
});
write("suite.json", { schema: 1, id: "container-protocol", cases: ["case.json"] });
write("candidate.json", {
  schema: 1,
  id: "container-fixture",
  author: {
    command: ["node", "/opt/clapper/benchmarks/technical-video/examples/fixture-author.mjs", "{request}"],
    model: "TEST ONLY deterministic adapter",
    version: "fixture-v1",
    settings: {},
  },
  skill: path.join(repo, "skills/clapper"),
  runtime: {
    command: ["node", "/opt/clapper/packages/cli/bin/clapper.mjs"],
    version: "0.4.0-source",
    identity: image,
  },
  isolation: { kind: "container", image, network: "none" },
  budget: { wallSeconds: 150, maxTokens: 100, maxCostUSD: 1, repairs: 0, maxOutputBytes: 32 * 1024 * 1024 },
});
const r = spawnSync(
  process.execPath,
  [
    path.join(repo, "packages/cli/bin/clapper.mjs"),
    "eval",
    "run",
    "--suite",
    path.join(root, "suite.json"),
    "--candidate",
    path.join(root, "candidate.json"),
    "--split",
    "holdout",
    "--out",
    path.join(root, "campaign"),
  ],
  { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 180000 },
);
assert.equal(r.status, 0, r.stderr);
const dir = path.join(root, "campaign/runs/container-smoke-0"),
  record = JSON.parse(fs.readFileSync(path.join(dir, "run.json")));
assert.equal(record.status, "succeeded", JSON.stringify(record));
assert.equal(record.machine.verdict, "PASS");
assert.ok(record.videoHash);
assert.doesNotMatch(fs.readFileSync(path.join(dir, "input/brief.json"), "utf8"), /SECRET_/);
assert.doesNotMatch(fs.readFileSync(path.join(dir, "input/media-contract.json"), "utf8"), /SECRET_/);
assert.match(fs.readFileSync(path.join(dir, "author.log"), "utf8"), /private grading fields were absent/);
console.log(
  `PASS: pinned, read-only, network-disabled container authors/renders/collects without private grading fields.\nFixture only; no real holdout quality claim.\nArtifacts: ${root}`,
);
