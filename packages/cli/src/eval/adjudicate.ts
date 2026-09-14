import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadJudge } from "./contracts.ts";
import { evidenceRef } from "./grade.ts";
import { digest, inside, readJSON, sha, textField, verify, writeJSON } from "./io.ts";
import type { EvidenceRef, FilmCase, JudgeProfile, RunRecord } from "./types.ts";
export interface Adjudication {
  schema: 1;
  runId: string;
  videoHash: string;
  summary: string;
  evidence: EvidenceRef[];
  exclude: { file: string; sha256: string; reason: string }[];
}
export function validateAdjudication(
  runDir: string,
  decision: Adjudication,
  profile: JudgeProfile,
  run: RunRecord,
  c: FilmCase,
) {
  assert.equal(profile.kind, "human", "Only an explicit human adjudication may exclude a judgment");
  assert.notEqual(profile.id, run.candidate.id);
  assert.equal(decision.schema, 1);
  assert.equal(decision.runId, run.id);
  assert.equal(decision.videoHash, run.videoHash);
  textField(decision.summary, "adjudication summary");
  assert.ok(decision.evidence.length);
  decision.evidence.forEach((e) => evidenceRef(e, run, c));
  assert.ok(decision.exclude.length);
  for (const item of decision.exclude) {
    assert.ok(
      /^judgments\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.json$/.test(item.file),
      "Only judgment files may be excluded",
    );
    assert.equal(
      sha(fs.readFileSync(inside(runDir, item.file))),
      item.sha256,
      "Adjudicated judgment changed",
    );
    textField(item.reason, "exclusion reason");
  }
}
export function adjudicate(runDir: string, profileFile: string, decisionFile: string) {
  const run = readJSON<RunRecord>(path.join(runDir, "run.json")),
    c = readJSON<FilmCase>(path.join(runDir, "case.json")),
    profile = loadJudge(profileFile),
    decision = readJSON<Adjudication>(decisionFile);
  verify(runDir, run.artifacts ?? []);
  validateAdjudication(runDir, decision, profile, run, c);
  const stored = { schema: 1, decidedAt: new Date().toISOString(), profile, decision };
  const file = path.join(runDir, "adjudications", `${digest(stored)}.json`);
  writeJSON(file, stored);
  return {
    file,
    excluded: decision.exclude.length,
    notice: "Original judgments retained. Remaining evidence must still satisfy the independent-judge gate.",
  };
}
