// Real subprocess lifecycle tests; all author behavior is a labeled deterministic fixture.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url)),
  cli = path.join(repo, "packages/cli/bin/clapper.mjs");
const root = fs.mkdtempSync(path.join(repo, ".clapper/eval-failures-"));
const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2));
fs.writeFileSync(path.join(root, "source.md"), "Public source");
const base = {
  schema: 1,
  family: "protocol-only",
  split: "dev",
  title: "Lifecycle fixture",
  brief: "TEST ONLY source resolution",
  audience: "Developer",
  durationSeconds: [1.9, 2.1],
  size: [320, 180],
  fps: 30,
  audioRequired: false,
  sources: [
    {
      id: "source",
      file: "source.md",
      sha256: createHash("sha256").update("Public source").digest("hex"),
      url: "https://example.org/fixture",
      revision: "test",
    },
  ],
  requiredSourceIds: ["source"],
  constraints: [{ id: "flow", description: "Fixture only", modality: "motion" }],
  eventFrames: [],
  transferQuestions: [],
};
fs.writeFileSync(
  path.join(root, "author.mjs"),
  `import fs from 'node:fs';import path from 'node:path';const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),c=JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]),r.case),'utf8'));if(c.id==='wait'){console.log('WAITING');await new Promise(()=>setInterval(()=>{},1000));}if(c.id==='ask-explicit'||c.id==='ask-ambiguous'&&!r.clarification){fs.writeFileSync('clarification-request.json',JSON.stringify({schema:1,question:'Which paper do you mean?'}));}else{process.argv[2]=process.argv[2];await import(${JSON.stringify(fileURLToPath(new URL("../benchmarks/technical-video/examples/fixture-author.mjs", import.meta.url)))});if(c.id==='wrong'){const p=JSON.parse(fs.readFileSync('plan.json'));p.sourceIds=['wrong-paper'];fs.writeFileSync('plan.json',JSON.stringify(p));}}`,
);
const candidate = {
  schema: 1,
  id: "protocol",
  author: {
    command: [process.execPath, path.join(root, "author.mjs"), "{request}"],
    model: "TEST ONLY lifecycle author",
    version: "v1",
    settings: {},
  },
  skill: path.join(repo, "skills/clapper"),
  runtime: { command: [process.execPath, "{clapper}"], version: "source", identity: "source" },
  isolation: { kind: "host-dev" },
  budget: { wallSeconds: 60, maxTokens: 100, maxCostUSD: 1, repairs: 0, maxOutputBytes: 32 * 1024 * 1024 },
};
write("candidate.json", candidate);
const cases = [
  { ...base, id: "ask-explicit" },
  {
    ...base,
    id: "skip-ambiguity",
    clarification: { question: "Which paper?", answer: "Use the supplied Universal Transformers source." },
  },
  {
    ...base,
    id: "ask-ambiguous",
    clarification: { question: "Which paper?", answer: "Use the supplied Universal Transformers source." },
  },
  { ...base, id: "wrong" },
];
cases.forEach((c) => write(c.id + ".json", c));
write("suite.json", { schema: 1, id: "failures", cases: cases.map((c) => c.id + ".json") });
const args = [
  "eval",
  "run",
  "--suite",
  path.join(root, "suite.json"),
  "--candidate",
  path.join(root, "candidate.json"),
  "--out",
  path.join(root, "campaign"),
];
const result = spawnSync(process.execPath, [cli, ...args], {
  cwd: root,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 8 * 1024 * 1024,
});
assert.equal(result.status, 0, result.stderr);
const records = Object.fromEntries(
  cases.map((c) => [
    c.id,
    JSON.parse(fs.readFileSync(path.join(root, "campaign/runs", c.id + "-0/run.json"))),
  ]),
);
assert.equal(records["ask-explicit"].status, "failed");
assert.equal(records["skip-ambiguity"].status, "failed");
assert.equal(records["ask-ambiguous"].status, "succeeded", JSON.stringify(records["ask-ambiguous"]));
assert.equal(records.wrong.status, "failed");
assert.match(records.wrong.attempts[0].error, /unapproved source/);
assert.ok(records.wrong.artifacts.some((a) => a.file.includes("failed-submission/plan.json")));
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "campaign/runs/ask-ambiguous-0/clarification.json"))).answer,
  cases[2].clarification.answer,
);
write("wait.json", { ...base, id: "wait" });
write("after.json", { ...base, id: "after" });
write("cancel-suite.json", { schema: 1, id: "cancel", cases: ["wait.json", "after.json"] });
const cancelArgs = [
  "eval",
  "run",
  "--suite",
  path.join(root, "cancel-suite.json"),
  "--candidate",
  path.join(root, "candidate.json"),
  "--out",
  path.join(root, "cancel"),
];
const child = spawn(process.execPath, [cli, ...cancelArgs], { cwd: root, stdio: "ignore" });
const ended = new Promise((resolve) => child.once("close", resolve));
const log = path.join(root, "cancel/runs/wait-0/author.log");
const deadline = Date.now() + 10000;
while (Date.now() < deadline && (!fs.existsSync(log) || !fs.readFileSync(log, "utf8").includes("WAITING")))
  await new Promise((r) => setTimeout(r, 50));
assert.ok(fs.existsSync(log), "Author did not start");
process.kill(child.pid, "SIGINT");
await ended;
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "cancel/runs/wait-0/run.json"))).status,
  "interrupted",
);
assert.equal(JSON.parse(fs.readFileSync(path.join(root, "cancel/runs/after-0/run.json"))).status, "pending");
const resume = spawnSync(process.execPath, [cli, ...cancelArgs, "--resume"], {
  cwd: root,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 8 * 1024 * 1024,
});
assert.equal(resume.status, 0, resume.stderr);
assert.equal(JSON.parse(fs.readFileSync(path.join(root, "cancel/runs/wait-0/run.json"))).attempts.length, 1);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "cancel/runs/after-0/run.json"))).status,
  "succeeded",
);
console.log(
  `PASS: explicit/ambiguous source behavior, wrong-source early failure with frozen evidence, real interruption and safe pending-work resume.\nArtifacts: ${root}`,
);
