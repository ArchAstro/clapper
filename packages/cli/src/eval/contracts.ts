import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { finite, id, inside, readJSON, sha, textField } from "./io.ts";
import type { Candidate, FilmCase, JudgeProfile, Plan, Submission, Suite } from "./types.ts";

const modalities = ["text", "image", "motion", "audio"];
function command(value: unknown) {
  assert.ok(
    Array.isArray(value) && value.length && value.every((v) => typeof v === "string" && v.length),
    "Command must be a nonempty argv array",
  );
}
export function loadSuite(file: string, split: string) {
  assert.ok(["dev", "validation", "holdout"].includes(split), "Unknown split");
  const suite = readJSON<Suite>(file);
  assert.equal(suite.schema, 1);
  id(suite.id, "suite id");
  assert.ok(Array.isArray(suite.cases) && suite.cases.length, "Suite has no cases");
  const root = path.dirname(path.resolve(file)),
    ids = new Set<string>(),
    families = new Map<string, string>();
  const all = suite.cases.map((relative) => {
    const caseFile = inside(root, relative),
      c = readJSON<FilmCase>(caseFile);
    validateCase(c);
    assert.ok(!ids.has(c.id), `Duplicate case ${c.id}`);
    ids.add(c.id);
    assert.ok(
      !families.has(c.family) || families.get(c.family) === c.split,
      `Topic family crosses splits: ${c.family}`,
    );
    families.set(c.family, c.split);
    for (const source of c.sources) {
      const bytes = fs.readFileSync(inside(root, source.file));
      assert.equal(sha(bytes), source.sha256, `Source checksum mismatch: ${source.id}`);
    }
    if (c.oracle)
      assert.equal(
        sha(fs.readFileSync(inside(root, c.oracle.file))),
        c.oracle.sha256,
        "Oracle checksum mismatch",
      );
    return c;
  });
  const cases = all.filter((c) => c.split === split);
  assert.ok(
    cases.length,
    `No ${split} cases. Supply a separately curated suite; sealed cases are not invented automatically.`,
  );
  return { root, suite, cases, all };
}
export function validateCase(c: FilmCase) {
  assert.equal(c.schema, 1);
  id(c.id, "case id");
  id(c.family, "family");
  assert.ok(["dev", "validation", "holdout"].includes(c.split));
  for (const name of ["title", "brief", "audience"] as const) textField(c[name], name);
  assert.equal(c.durationSeconds?.length, 2);
  finite(c.durationSeconds[0], "minimum duration", 0.1, 3600);
  finite(c.durationSeconds[1], "maximum duration", c.durationSeconds[0], 3600);
  assert.equal(c.size?.length, 2);
  c.size.forEach((n) => finite(n, "size", 64, 8192));
  finite(c.fps, "fps", 1, 120);
  assert.equal(typeof c.audioRequired, "boolean");
  assert.ok(Array.isArray(c.sources) && c.sources.length && Array.isArray(c.requiredSourceIds));
  const sources = new Set<string>();
  for (const s of c.sources) {
    id(s.id, "source id");
    assert.ok(!sources.has(s.id));
    sources.add(s.id);
    assert.match(s.sha256, /^[a-f0-9]{64}$/);
    textField(s.url, "source URL");
    textField(s.revision, "source revision");
  }
  for (const s of c.requiredSourceIds) assert.ok(sources.has(s), `Unknown required source ${s}`);
  assert.ok(Array.isArray(c.constraints) && c.constraints.length);
  const constraints = new Set<string>();
  for (const k of c.constraints) {
    id(k.id, "constraint id");
    assert.ok(!constraints.has(k.id));
    constraints.add(k.id);
    textField(k.description, "constraint description");
    assert.ok(modalities.includes(k.modality));
    if (k.sourceId) assert.ok(sources.has(k.sourceId));
  }
  assert.ok(Array.isArray(c.eventFrames));
  c.eventFrames.forEach((f) => {
    finite(f, "event frame", 0, c.durationSeconds[1] * c.fps);
    assert.ok(Number.isInteger(f));
  });
  assert.ok(Array.isArray(c.transferQuestions));
}
export function loadCandidate(file: string): Candidate {
  const c = readJSON<Candidate>(file);
  assert.equal(c.schema, 1);
  id(c.id, "candidate id");
  command(c.author?.command);
  textField(c.author.model, "author model");
  textField(c.author.version, "author version");
  assert.ok(c.author.settings && typeof c.author.settings === "object");
  command(c.runtime?.command);
  textField(c.runtime.version, "runtime version");
  textField(c.runtime.identity, "runtime identity");
  if (c.runtime.dependencyRoot && c.isolation?.kind !== "container")
    c.runtime.dependencyRoot = path.resolve(path.dirname(file), c.runtime.dependencyRoot);
  c.skill = path.resolve(path.dirname(file), c.skill);
  assert.ok(fs.existsSync(path.join(c.skill, "SKILL.md")), "Skill directory must contain SKILL.md");
  assert.ok(["container", "host-dev"].includes(c.isolation?.kind));
  if (c.isolation.kind === "container") {
    assert.match(
      c.isolation.image,
      /^(?:sha256:|[a-zA-Z0-9][a-zA-Z0-9._/:\-]*@sha256:)[a-f0-9]{64}$/,
      "Pin the author image by digest",
    );
    assert.ok(["none", "bridge"].includes(c.isolation.network));
  }
  if (c.isolation.kind === "host-dev" && !c.runtime.command.includes("{clapper}"))
    assert.ok(
      c.runtime.dependencyRoot,
      "A custom host runtime needs its matching dependencyRoot; never silently mix runtime versions",
    );
  finite(c.budget?.wallSeconds, "wallSeconds", 1, 86400);
  finite(c.budget.maxTokens, "maxTokens", 1);
  finite(c.budget.maxCostUSD, "maxCostUSD", 0);
  finite(c.budget.repairs, "repairs", 0, 2);
  finite(c.budget.maxOutputBytes, "maxOutputBytes", 1024, 4 * 1024 ** 3);
  assert.ok(Number.isInteger(c.budget.repairs));
  for (const name of c.author.env ?? []) assert.match(name, /^[A-Z][A-Z0-9_]*$/);
  return c;
}
export function loadJudge(file: string): JudgeProfile {
  const p = readJSON<JudgeProfile>(file);
  assert.equal(p.schema, 1);
  id(p.id, "judge id");
  textField(p.version, "judge version");
  assert.ok(["human", "model"].includes(p.kind));
  assert.ok(
    Array.isArray(p.capabilities) &&
      p.capabilities.every((c) => modalities.includes(c)) &&
      new Set(p.capabilities).size === p.capabilities.length,
  );
  if (p.adapter) command(p.adapter.command);
  if (p.calibration) p.calibration = path.resolve(path.dirname(file), p.calibration);
  return p;
}
export function validateSubmission(work: string, c: FilmCase) {
  const s = readJSON<Submission>(inside(work, "submission.json"));
  assert.equal(s.schema, 1);
  for (const k of ["entry", "plan", "transcript"] as const)
    assert.ok(fs.statSync(inside(work, s[k])).isFile(), `Missing ${k}`);
  for (const key of ["entry", "plan", "transcript"] as const)
    assert.ok(
      !s[key].split(/[\\/]/).some((p) => ["out", "node_modules", ".clapper", ".git"].includes(p)),
      "Keep entry, plan and transcript outside ignored output/dependency directories",
    );
  id(s.composition, "composition id");
  assert.ok(Array.isArray(s.revisions));
  assert.equal(new Set(s.revisions).size, s.revisions.length, "Duplicate revision paths");
  for (const r of s.revisions) assert.ok(fs.statSync(inside(work, r)).isFile());
  finite(s.usage?.tokens, "reported tokens");
  finite(s.usage.costUSD, "reported cost");
  finite(s.usage.repairs, "reported repairs", 0, 2);
  const plan = readJSON<Plan>(inside(work, s.plan));
  assert.equal(plan.schema, 1);
  textField(plan.journey, "complete journey");
  assert.ok(Array.isArray(plan.levels) && plan.levels.length);
  for (const level of plan.levels) {
    textField(level.name, "level name");
    textField(level.journey, "level journey");
    textField(level.zoomTarget, "zoom target");
  }
  assert.ok(Array.isArray(plan.sourceIds));
  const known = new Set(c.sources.map((x) => x.id));
  assert.ok(
    plan.sourceIds.every((s) => known.has(s)),
    "Plan cites an unapproved source",
  );
  assert.ok(
    c.requiredSourceIds.every((s) => plan.sourceIds.includes(s)),
    "Plan omits the required source; wrong-paper runs fail before rendering",
  );
  assert.ok(Array.isArray(plan.claims) && plan.claims.length);
  for (const claim of plan.claims) {
    id(claim.id, "claim id");
    textField(claim.text, "claim");
    assert.ok(known.has(claim.sourceId));
    textField(claim.sourceSpan, "claim source span");
  }
  return { submission: s, plan };
}
