// Real CLI/browser/media protocol test. The author and judgments are explicit test doubles,
// not measurements of a model's ability to teach.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url)),
  cli = path.join(repo, "packages/cli/bin/clapper.mjs");
fs.mkdirSync(path.join(repo, ".clapper"), { recursive: true });
const root = fs.mkdtempSync(path.join(repo, ".clapper/eval-e2e-"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function run(args, expected = 0) {
  const r = spawnSync(process.execPath, [cli, "eval", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: 180000,
  });
  assert.equal(r.status, expected, `${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
fs.writeFileSync(path.join(root, "source.md"), "Input passes through a shared block to the output.");
const fixture = {
  schema: 1,
  id: "smoke",
  family: "smoke",
  split: "dev",
  title: "Protocol smoke test",
  brief: "Test-only: show an input, shared block and output; no real model grading.",
  audience: "Harness developer",
  durationSeconds: [1.9, 2.1],
  size: [320, 180],
  fps: 30,
  audioRequired: false,
  sources: [
    {
      id: "source",
      file: "source.md",
      sha256: hash(fs.readFileSync(path.join(root, "source.md"))),
      url: "https://example.org/fixture",
      revision: "test-only",
    },
  ],
  requiredSourceIds: ["source"],
  constraints: [
    {
      id: "flow",
      description: "Test-only motion criterion",
      modality: "motion",
      sourceId: "source",
      sourceSpan: "line1",
    },
  ],
  eventFrames: [8],
  transferQuestions: [],
};
write("case.json", fixture);
write("suite.json", { schema: 1, id: "smoke-suite", cases: ["case.json"] });
fs.writeFileSync(
  path.join(root, "author.mjs"),
  `import fs from 'node:fs';import path from 'node:path';const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const input=path.dirname(process.argv[2]);const brief=JSON.parse(fs.readFileSync(path.join(input,request.case),'utf8'));fs.writeFileSync('package.json','{"type":"module"}');fs.writeFileSync('entry.tsx',\`import {Composition,registerRoot,useFrame} from '@archastro/clapper-core';function Film(){const f=useFrame();return <svg width="320" height="180" style={{background:'#10252d'}}><text x="30" y="60" fill="white" fontSize="22">Input → block → output</text><circle cx={30+f*3} cy="110" r="5" fill="#69dec4"/></svg>};registerRoot(()=> <Composition id="film" component={Film} width={320} height={180} fps={30} durationInFrames={60}/>);\`);fs.writeFileSync('transcript.txt','Synthetic silent fixture');fs.writeFileSync('plan.json',JSON.stringify({schema:1,sourceIds:['source'],journey:'input to output',levels:[{name:'whole',journey:'input to output',zoomTarget:'block'}],claims:[{id:'flow',text:'input to output',sourceId:'source',sourceSpan:'line1'}]}));fs.writeFileSync('submission.json',JSON.stringify({schema:1,entry:'entry.tsx',composition:'film',plan:'plan.json',transcript:'transcript.txt',revisions:[],usage:{tokens:0,costUSD:0,repairs:0}}));`,
);
const candidate = {
  schema: 1,
  id: "baseline",
  author: {
    command: [process.execPath, path.join(root, "author.mjs"), "{request}"],
    model: "TEST-ONLY deterministic author",
    version: "fixture-v1",
    settings: {},
  },
  skill: path.join(repo, "skills/clapper"),
  runtime: { command: [process.execPath, "{clapper}"], version: "0.4.0", identity: "test-source-checkout" },
  isolation: { kind: "host-dev" },
  budget: { wallSeconds: 90, maxTokens: 100, maxCostUSD: 1, repairs: 0, maxOutputBytes: 32 * 1024 * 1024 },
};
write("baseline.json", candidate);
write("candidate.json", { ...candidate, id: "candidate" });
for (const arm of ["baseline", "candidate"]) {
  run([
    "run",
    "--suite",
    path.join(root, "suite.json"),
    "--candidate",
    path.join(root, arm + ".json"),
    "--out",
    path.join(root, arm),
  ]);
  const runDir = path.join(root, arm, "runs/smoke-0"),
    record = JSON.parse(fs.readFileSync(path.join(runDir, "run.json")));
  assert.equal(record.status, "succeeded", JSON.stringify(record));
  assert.equal(record.machine.verdict, "PASS");
  assert.ok(record.machine.svgLabels > 0);
  assert.ok(record.machine.seekDeterministic);
  const before = fs.readFileSync(path.join(runDir, "run.json"), "utf8");
  run([
    "run",
    "--suite",
    path.join(root, "suite.json"),
    "--candidate",
    path.join(root, arm + ".json"),
    "--out",
    path.join(root, arm),
    "--resume",
  ]);
  assert.equal(fs.readFileSync(path.join(runDir, "run.json"), "utf8"), before);
  write("human.json", {
    schema: 1,
    id: "human-pending",
    version: "v1",
    kind: "human",
    capabilities: ["text", "image", "motion", "audio"],
  });
  assert.match(run(["grade", "--run", runDir, "--judge", path.join(root, "human.json")]), /BLOCKED/);
  for (const judgeId of ["fixture-a", "fixture-b"]) {
    const profile = {
      schema: 1,
      id: judgeId,
      version: "test-double-v1",
      kind: "model",
      capabilities: ["text", "image", "motion"],
    };
    write(judgeId + ".json", profile);
    const evidence = {
      file: "submission/out/final.mp4",
      sha256: record.videoHash,
      startSeconds: 0,
      endSeconds: 2,
      sourceId: "source",
      sourceSpan: "line1",
    };
    const review = {
      schema: 1,
      runId: record.id,
      judgeId,
      judgeVersion: profile.version,
      videoHash: record.videoHash,
      observed: profile.capabilities,
      constraints: [
        {
          id: "flow",
          verdict: "PASS",
          reason: "Synthetic fixture judgment for protocol test only",
          evidence: [evidence],
        },
      ],
      ratings: {},
      verdict: "PASS",
      summary: "TEST DOUBLE: not a model quality judgment",
    };
    write("judgment.json", review);
    run([
      "grade",
      "--run",
      runDir,
      "--judge",
      path.join(root, judgeId + ".json"),
      "--review",
      path.join(root, "judgment.json"),
    ]);
  }
}
const comparisonDir = path.join(root, "comparison");
run([
  "compare",
  "--baseline",
  path.join(root, "baseline"),
  "--candidate",
  path.join(root, "candidate"),
  "--out",
  comparisonDir,
]);
const comparison = JSON.parse(fs.readFileSync(path.join(comparisonDir, "comparison.json")));
const pair = comparison.pairs[0];
for (const reviewer of ["fixture-one", "fixture-two"]) {
  write("ballots.json", {
    schema: 1,
    ballots: [
      {
        schema: 1,
        comparisonId: comparison.id,
        pairId: pair.id,
        reviewer,
        choice: "tie",
        reason: "TEST DOUBLE comparison: identical fixture films",
        startSeconds: 0,
        endSeconds: 2,
        observed: ["motion"],
        media: { A: pair.A.videoHash, B: pair.B.videoHash },
      },
    ],
  });
  run(["ballots", "--comparison", comparisonDir, "--review", path.join(root, "ballots.json")]);
}
const summary = JSON.parse(fs.readFileSync(path.join(comparisonDir, "summary.json")));
assert.equal(summary.ties, 1);
assert.equal(summary.promotion.eligible, false);
assert.match(summary.learningClaim, /NOT EVALUATED/);
const { chromium } = await import("../packages/cli/node_modules/playwright/index.mjs");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("file://" + path.join(comparisonDir, "report/index.html"));
  assert.equal(await page.locator("video").count(), 2);
  await page.locator("#reviewer").fill("browser-reviewer");
  await page.locator("textarea").fill("Browser protocol test");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export").click()]);
  await download.saveAs(path.join(root, "browser-ballot.json"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "browser-ballot.json"))).ballots.length, 1);
  await page.screenshot({ path: path.join(root, "report.png"), fullPage: true });
} finally {
  await browser.close();
}
console.log(
  `PASS: real author-process → Clapper render → evidence → guarded grade → blinded comparison → browser ballot export.\nTest doubles do not establish video quality.\nArtifacts: ${root}`,
);
