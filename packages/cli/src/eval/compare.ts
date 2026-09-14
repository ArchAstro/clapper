import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runVerdict } from "./grade.ts";
import { digest, finite, id, inside, readJSON, textField, writeJSON } from "./io.ts";
import { AXES, type Ballot, type Campaign, type Candidate, type Verdict } from "./types.ts";
export interface Pair {
  id: string;
  family: string;
  pairKey: string;
  A: { runDir: string; videoHash: string | null; candidate: "baseline" | "candidate"; status: Verdict };
  B: Pair["A"];
}
export interface Comparison {
  schema: 1;
  id: string;
  createdAt: string;
  baseline: string;
  candidate: string;
  intervention: "skill" | "runtime" | "author" | "bundle";
  suiteHash: string;
  split: string;
  pairs: Pair[];
}
function control(c: Candidate, kind: Comparison["intervention"]) {
  const { id, skill, runtime, author, isolation, ...common } = c;
  // A runtime intervention may replace the pinned runtime image, while keeping
  // its network policy and isolation mode controlled.
  const isolationControl =
    isolation.kind === "container" && (kind === "runtime" || kind === "bundle")
      ? { kind: isolation.kind, network: isolation.network }
      : isolation;
  return {
    ...common,
    isolation: isolationControl,
    ...(kind !== "runtime" && kind !== "bundle" ? { runtime } : {}),
    ...(kind !== "author" ? { author } : {}),
  };
}
export function createComparison(
  baseline: string,
  candidate: string,
  out: string,
  kind: Comparison["intervention"] = "skill",
) {
  assert.ok(["skill", "runtime", "author", "bundle"].includes(kind));
  baseline = path.resolve(baseline);
  candidate = path.resolve(candidate);
  out = path.resolve(out);
  assert.ok(!fs.existsSync(out), "Comparison already exists; order must not be rerandomized");
  const a = readJSON<Campaign>(path.join(baseline, "campaign.json")),
    b = readJSON<Campaign>(path.join(candidate, "campaign.json"));
  assert.equal(a.suiteHash, b.suiteHash, "Different suites cannot be paired");
  assert.equal(a.split, b.split);
  assert.equal(a.repeats, b.repeats);
  assert.deepEqual(a.runs, b.runs, "Assignments differ");
  const pairs: Pair[] = a.runs.map((key, i) => {
    const left = runVerdict(path.join(baseline, "runs", key)),
      right = runVerdict(path.join(candidate, "runs", key));
    assert.equal(left.run.caseHash, right.run.caseHash);
    if (kind !== "runtime" && kind !== "bundle")
      assert.equal(
        left.run.runtimeHash,
        right.run.runtimeHash,
        "Runtime bytes changed in a non-runtime comparison",
      );
    if (kind !== "author")
      assert.equal(
        left.run.authorHash,
        right.run.authorHash,
        "Author adapter changed in a non-author comparison",
      );
    assert.deepEqual(
      control(left.run.candidate, kind),
      control(right.run.candidate, kind),
      "Uncontrolled candidate difference; declare a bundle comparison or fix the setup",
    );
    if (kind !== "skill" && kind !== "bundle")
      assert.equal(left.run.skillHash, right.run.skillHash, "Skill changed in a non-skill comparison");
    const base = {
      runDir: path.join(baseline, "runs", key),
      videoHash: left.run.videoHash ?? null,
      candidate: "baseline" as const,
      status: left.verdict,
    };
    const cand = {
      runDir: path.join(candidate, "runs", key),
      videoHash: right.run.videoHash ?? null,
      candidate: "candidate" as const,
      status: right.verdict,
    };
    return { id: randomUUID(), family: left.run.family, pairKey: key, A: base, B: cand };
  });
  // Balanced assignment with a random initial orientation. Persist it once.
  const flip = randomBytes(1)[0] % 2;
  for (let i = 0; i < pairs.length; i++)
    if ((i + flip) % 2 === 1) [pairs[i].A, pairs[i].B] = [pairs[i].B, pairs[i].A];
  const comparison: Comparison = {
    schema: 1,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    baseline,
    candidate,
    intervention: kind,
    suiteHash: a.suiteHash,
    split: a.split,
    pairs,
  };
  writeJSON(path.join(out, "comparison.json"), comparison);
  return comparison;
}
export function importBallots(dir: string, file: string) {
  const comparison = readJSON<Comparison>(path.join(dir, "comparison.json"));
  const document = readJSON<{ schema: 1; ballots: Ballot[] }>(file);
  assert.equal(document.schema, 1);
  assert.ok(Array.isArray(document.ballots) && document.ballots.length);
  const existingDir = path.join(dir, "ballots");
  fs.mkdirSync(existingDir, { recursive: true });
  const existing = readBallots(dir);
  const seen = new Set(existing.map((b) => `${b.reviewer}|${b.pairId}`));
  for (const b of document.ballots) {
    assert.equal(b.schema, 1);
    assert.equal(b.comparisonId, comparison.id);
    id(b.reviewer, "reviewer id");
    textField(b.reason, "comparison reason");
    assert.ok(["A", "B", "tie", "blocked"].includes(b.choice));
    const pair = comparison.pairs.find((p) => p.id === b.pairId);
    assert.ok(pair, "Unknown pair");
    assert.equal(b.media.A, pair.A.videoHash);
    assert.equal(b.media.B, pair.B.videoHash);
    assert.ok(
      !seen.has(`${b.reviewer}|${b.pairId}`),
      "Reviewer already voted on this pair; retain old votes rather than silently overwrite",
    );
    seen.add(`${b.reviewer}|${b.pairId}`);
    assert.ok(
      Array.isArray(b.observed) && b.observed.every((m) => ["text", "image", "motion", "audio"].includes(m)),
    );
    finite(b.startSeconds, "ballot start", 0);
    finite(b.endSeconds, "ballot end", b.startSeconds);
    const a = runVerdict(pair.A.runDir),
      c = runVerdict(pair.B.runDir);
    const max = Math.min(a.run.machine?.durationSeconds ?? 0, c.run.machine?.durationSeconds ?? 0);
    assert.ok(b.endSeconds <= max + 0.1, "Ballot timestamp exceeds the paired videos");
    if (b.choice !== "blocked")
      assert.ok(
        b.observed.includes("motion") && b.endSeconds > b.startSeconds,
        "Preference requires actual motion observation",
      );
  }
  const dest = path.join(existingDir, `${digest(document)}.json`);
  writeJSON(dest, { ...document, importedAt: new Date().toISOString() });
  return { file: dest, count: document.ballots.length };
}
function readBallots(dir: string): Ballot[] {
  const ballotDir = path.join(dir, "ballots");
  if (!fs.existsSync(ballotDir)) return [];
  const seen = new Set<string>();
  return fs
    .readdirSync(ballotDir)
    .filter((n) => n.endsWith(".json"))
    .flatMap((name) => {
      const stored = readJSON<{ schema: 1; ballots: Ballot[]; importedAt: string }>(inside(ballotDir, name));
      const { importedAt, ...document } = stored;
      assert.equal(name, `${digest(document)}.json`, "Stored ballot journal changed");
      for (const ballot of document.ballots) {
        const key = `${ballot.reviewer}|${ballot.pairId}`;
        assert.ok(!seen.has(key), "Duplicate stored reviewer vote");
        seen.add(key);
      }
      return document.ballots;
    });
}
function confidence(groups: Map<string, number[]>) {
  const clusters = [...groups.values()];
  if (clusters.length < 2) return null;
  let state = 7919;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const samples = Array.from({ length: 2000 }, () => {
    let sum = 0,
      n = 0;
    for (let i = 0; i < clusters.length; i++) {
      const chosen = clusters[Math.floor(rand() * clusters.length)];
      sum += chosen.reduce((a, b) => a + b, 0);
      n += chosen.length;
    }
    return sum / n;
  }).sort((a, b) => a - b);
  return [samples[50], samples[1950]];
}
export function summarizeComparison(dir: string) {
  const comparison = readJSON<Comparison>(path.join(dir, "comparison.json"));
  const ballots = readBallots(dir);
  const groups = new Map<string, number[]>();
  let wins = 0,
    ties = 0,
    losses = 0,
    blocked = 0,
    regressions = 0,
    qualified = true;
  const operational = {
    baseline: { assigned: comparison.pairs.length, succeeded: 0 },
    candidate: { assigned: comparison.pairs.length, succeeded: 0 },
  };
  const results = comparison.pairs.map((pair) => {
    const a = runVerdict(pair.A.runDir),
      b = runVerdict(pair.B.runDir);
    for (const [slot, result] of [
      [pair.A, a],
      [pair.B, b],
    ] as const)
      if (result.run.status === "succeeded") operational[slot.candidate].succeeded++;
    const roster = (result: ReturnType<typeof runVerdict>) =>
      result.judgments.map((j) => j.profileHash).sort();
    qualified &&= a.calibrated && b.calibrated && digest(roster(a)) === digest(roster(b));
    const selected = ballots.filter((v) => v.pairId === pair.id);
    let score: number | null = null;
    const candidate = pair.A.candidate === "candidate" ? a : b,
      baseline = pair.A.candidate === "baseline" ? a : b;
    if (candidate.verdict === "FAIL" && baseline.verdict === "PASS") {
      score = 0;
      regressions++;
    } else if (baseline.verdict === "FAIL" && candidate.verdict === "PASS") score = 1;
    else if (
      a.verdict === "PASS" &&
      b.verdict === "PASS" &&
      new Set(selected.map((v) => v.reviewer)).size >= 2
    ) {
      const valid = selected.filter(
        (v) =>
          v.choice !== "blocked" &&
          v.observed.includes("motion") &&
          (!a.run.machine?.audio.present || v.observed.includes("audio")) &&
          (!b.run.machine?.audio.present || v.observed.includes("audio")),
      );
      if (new Set(valid.map((v) => v.reviewer)).size >= 2) {
        const scores = valid.map((v) =>
          v.choice === "tie" ? 0.5 : pair[v.choice as "A" | "B"].candidate === "candidate" ? 1 : 0,
        );
        const mean = scores.reduce<number>((x, y) => x + y, 0) / scores.length;
        score = mean > 0.5 ? 1 : mean < 0.5 ? 0 : 0.5;
      }
    }
    if (score === null) blocked++;
    else {
      if (score === 1) wins++;
      else if (score === 0) losses++;
      else ties++;
      const list = groups.get(pair.family) ?? [];
      list.push(score);
      groups.set(pair.family, list);
    }
    const ratings = (result: ReturnType<typeof runVerdict>) =>
      Object.fromEntries(
        AXES.map((axis) => {
          const values = result.judgments.flatMap((j) =>
            j.report.ratings[axis] ? [j.report.ratings[axis]!.value] : [],
          );
          return [axis, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null];
        }),
      );
    return {
      pairId: pair.id,
      ratings: { baseline: ratings(baseline), candidate: ratings(candidate) },
      audioRequired: !!candidate.run.machine?.audio.present,
      issues: candidate.judgments.flatMap((j) => j.reasons),
      ballots: selected.map(({ reviewer, reason, startSeconds, endSeconds, choice }) => ({
        reviewer,
        reason,
        startSeconds,
        endSeconds,
        choice,
      })),
      cost: {
        baseline: baseline.run.usage?.costUSD ?? null,
        candidate: candidate.run.usage?.costUSD ?? null,
        authority: "adapter-reported",
      },
      elapsedSeconds: {
        baseline: baseline.run.elapsedSeconds ?? null,
        candidate: candidate.run.elapsedSeconds ?? null,
      },
      family: pair.family,
      baseline: baseline.verdict,
      candidate: candidate.verdict,
      score,
      reviewers: selected.length,
    };
  });
  const graded = wins + ties + losses,
    adjustedWinRate = graded ? (wins + 0.5 * ties) / graded : null,
    interval = confidence(groups);
  const reasons: string[] = [];
  if (comparison.split !== "holdout")
    reasons.push("Stable promotion requires a sealed holdout, not development or validation results");
  if (groups.size < 12) reasons.push("Fewer than 12 independent topic families");
  if (blocked) reasons.push(`${blocked} comparisons lack complete evidence`);
  if (!qualified)
    reasons.push("Independent judges lack current qualified calibration or matched profiles across arms");
  if (regressions) reasons.push("New hard-failure regressions");
  const axes = AXES.map((axis) => {
    const relevant = results.filter((r) => axis !== "narration" || r.audioRequired);
    const deltas = relevant.flatMap((r) => {
      const a = r.ratings.baseline[axis],
        b = r.ratings.candidate[axis];
      return a === null || b === null ? [] : [b - a];
    });
    return {
      axis,
      observedPairs: deltas.length,
      requiredPairs: relevant.length,
      meanDelta: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
    };
  });
  if (axes.some((a) => a.observedPairs < a.requiredPairs)) reasons.push("Quality-axis coverage incomplete");
  if (axes.some((a) => a.meanDelta !== null && a.meanDelta < -0.5))
    reasons.push("A quality axis regressed by more than 0.5 points");
  if (adjustedWinRate === null || adjustedWinRate < 0.6 || !interval || interval[0] <= 0.5)
    reasons.push("Preference evidence does not meet the proposed effect/confidence gate");
  if (operational.candidate.succeeded < operational.baseline.succeeded)
    reasons.push("Operational success regressed");
  return {
    schema: 1,
    comparisonId: comparison.id,
    intervention: comparison.intervention,
    operational,
    wins,
    ties,
    losses,
    blocked,
    adjustedWinRate,
    independentFamilies: groups.size,
    familyBootstrap95: interval,
    pairs: results,
    qualityAxes: axes,
    promotion: { eligible: reasons.length === 0, reasons, automatic: false },
    learningClaim: "NOT EVALUATED: preferences are not learner outcomes",
    limitations: [
      "Pilot thresholds are policy choices, not established constants.",
      "Usage is adapter-reported; only wall time and artifact bytes are directly enforced/measured.",
      "Blinding removes metadata, not identity clues inherently present in video content.",
    ],
  };
}
