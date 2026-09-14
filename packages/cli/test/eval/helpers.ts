import fs from "node:fs";
import path from "node:path";
import { digest, record, sha, writeJSON } from "../../src/eval/io.ts";
import {
  AXES,
  type Candidate,
  type FilmCase,
  type JudgeProfile,
  type Judgment,
  type RunRecord,
} from "../../src/eval/types.ts";
export const candidate = (id = "candidate"): Candidate => ({
  schema: 1,
  id,
  author: { command: ["fixture-author"], model: "fixture", version: "v1", settings: {} },
  skill: "/fixture/skill",
  runtime: { command: ["fixture-runtime"], version: "v1", identity: "fixture" },
  isolation: { kind: "host-dev" },
  budget: { wallSeconds: 20, maxTokens: 100, maxCostUSD: 1, repairs: 2, maxOutputBytes: 1000000 },
});
export const filmCase = (): FilmCase => ({
  schema: 1,
  id: "case",
  family: "family",
  split: "dev",
  title: "Fixture",
  brief: "Explain a complete journey",
  audience: "A beginner",
  durationSeconds: [0.5, 2],
  size: [320, 180],
  fps: 30,
  audioRequired: false,
  sources: [
    {
      id: "source",
      file: "source.md",
      sha256: sha("Source"),
      url: "https://example.org/source",
      revision: "fixture-v1",
    },
  ],
  requiredSourceIds: ["source"],
  constraints: [
    {
      id: "source-fit",
      description: "Use the specified source",
      modality: "text",
      sourceId: "source",
      sourceSpan: "line1",
    },
    { id: "flow", description: "Explain the flow", modality: "motion" },
  ],
  eventFrames: [8],
  transferQuestions: ["Predict the next state"],
});
export function storedRun(root: string, key: string, candidateId = "candidate") {
  const dir = path.join(root, "runs", key),
    c = filmCase();
  fs.mkdirSync(path.join(dir, "submission/out"), { recursive: true });
  fs.writeFileSync(path.join(dir, "submission/out/final.mp4"), "TEST-ONLY-NOT-REAL-MEDIA");
  fs.writeFileSync(path.join(dir, "submission/transcript.txt"), "Source explains the flow");
  const artifacts = [record(dir, "submission/out/final.mp4"), record(dir, "submission/transcript.txt")];
  const run: RunRecord = {
    schema: 1,
    id: key + "-" + candidateId,
    pairKey: key,
    caseId: c.id,
    family: c.family,
    split: "dev",
    repeat: 0,
    status: "succeeded",
    caseHash: digest(c),
    candidateHash: digest(candidate(candidateId)),
    candidate: candidate(candidateId),
    skillHash: "fixture-skill",
    suiteHash: "fixture-suite",
    attempts: [],
    artifacts,
    videoHash: artifacts[0].sha256,
    usageAuthority: "adapter-reported",
    machine: {
      schema: 1,
      videoHash: artifacts[0].sha256,
      verdict: "PASS",
      failures: [],
      warnings: [],
      durationSeconds: 1,
      width: 320,
      height: 180,
      frames: 30,
      audio: { present: false, rmsDb: null, peakDb: null },
      sampledFrames: [0],
      svgLabels: 1,
      htmlLabels: 0,
      seekDeterministic: true,
    },
  };
  writeJSON(path.join(dir, "run.json"), run);
  writeJSON(path.join(dir, "case.json"), c);
  return { dir, run, c };
}
export const judge = (id = "reviewer"): JudgeProfile => ({
  schema: 1,
  id,
  version: "test-double-v1",
  kind: "model",
  capabilities: ["text", "image", "motion", "audio"],
});
export function judgment(run: RunRecord, c: FilmCase, p = judge()): Judgment {
  const video = run.artifacts![0];
  const evidence = {
    file: video.file,
    sha256: video.sha256,
    startSeconds: 0,
    endSeconds: 1,
    sourceId: "source",
    sourceSpan: "line1",
  };
  return {
    schema: 1,
    runId: run.id,
    judgeId: p.id,
    judgeVersion: p.version,
    videoHash: run.videoHash!,
    observed: p.capabilities,
    constraints: c.constraints
      .filter((k) => p.capabilities.includes(k.modality))
      .map((k) => ({
        id: k.id,
        verdict: "PASS",
        reason: "Synthetic protocol-test judgment",
        evidence: [evidence],
      })),
    ratings: Object.fromEntries(
      AXES.map((a) => [a, { value: 3, reason: "Synthetic protocol test only", evidence: [evidence] }]),
    ),
    verdict: "PASS",
    summary: "Synthetic protocol fixture, not an actual media assessment",
  };
}
