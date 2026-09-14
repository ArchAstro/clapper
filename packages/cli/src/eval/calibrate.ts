import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadJudge } from "./contracts.ts";
import { digest, id, inside, readJSON, sha, textField, writeJSON } from "./io.ts";
export interface CalibrationSet {
  schema: 1;
  id: string;
  curator: { name: string; confirmedAt: string } | null;
  pairs: {
    id: string;
    critical: boolean;
    criterion: string;
    clean: { file: string; sha256: string; itemId: string };
    defect: { file: string; sha256: string; itemId: string };
  }[];
}
function wilson(successes: number, n: number) {
  const z = 1.959963984540054,
    p = successes / n,
    d = 1 + (z * z) / n,
    c = (p + (z * z) / (2 * n)) / d,
    h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
export function calibrate(setFile: string, predictionsFile: string, profileFile: string, out: string) {
  const set = readJSON<CalibrationSet>(setFile),
    profile = loadJudge(profileFile);
  assert.equal(set.schema, 1);
  id(set.id, "calibration id");
  assert.equal(set.pairs.length, 12, "Initial calibration needs 12 complete pairs");
  const predictions = readJSON<{
    schema: 1;
    judgeId: string;
    judgeVersion: string;
    items: {
      itemId: string;
      sha256: string;
      verdict: "PASS" | "FAIL" | "BLOCKED";
    }[];
  }>(predictionsFile);
  assert.equal(predictions.schema, 1);
  assert.equal(predictions.judgeId, profile.id);
  assert.equal(predictions.judgeVersion, profile.version);
  const ids = new Set<string>();
  let hits = 0,
    falseAlarms = 0,
    criticalMisses = 0,
    blocked = 0;
  const details = [];
  for (const pair of set.pairs) {
    id(pair.id, "pair id");
    assert.ok(!ids.has(pair.id));
    ids.add(pair.id);
    textField(pair.criterion, "criterion");
    for (const variant of ["clean", "defect"] as const) {
      const artifact = pair[variant];
      const bytes = fs.readFileSync(inside(path.dirname(setFile), artifact.file));
      assert.equal(sha(bytes), artifact.sha256, "Calibration artifact changed");
      const matches = predictions.items.filter((p) => p.itemId === artifact.itemId);
      assert.equal(matches.length, 1, "Missing/duplicate calibration prediction");
      const result = matches[0];
      assert.equal(result.sha256, artifact.sha256);
      assert.ok(["PASS", "FAIL", "BLOCKED"].includes(result.verdict));
      if (result.verdict === "BLOCKED") blocked++;
      if (variant === "defect" && result.verdict === "FAIL") hits++;
      if (variant === "clean" && result.verdict === "FAIL") falseAlarms++;
      if (variant === "defect" && pair.critical && result.verdict !== "FAIL") criticalMisses++;
      details.push({ ...result, pairId: pair.id, variant, critical: pair.critical });
    }
  }
  assert.equal(predictions.items.length, 24, "Unexpected calibration rows");
  const confirmed =
    !!set.curator?.name && !!set.curator.confirmedAt && !Number.isNaN(Date.parse(set.curator.confirmedAt));
  const verdict =
    !confirmed || blocked
      ? "BLOCKED"
      : hits >= 11 && falseAlarms <= 1 && criticalMisses === 0
        ? "PASS"
        : "FAIL";
  const result = {
    schema: 1,
    judgeId: profile.id,
    judgeVersion: profile.version,
    profileHash: digest({ ...profile, calibration: undefined }),
    setId: set.id,
    setHash: digest(set),
    createdAt: new Date().toISOString(),
    curator: confirmed ? set.curator!.name : null,
    verdict,
    hits,
    defects: 12,
    recallWilson95: wilson(hits, 12),
    evaluatedControls: details.filter((d) => d.variant === "clean" && d.verdict !== "BLOCKED").length,
    falseAlarmWilson95: details.filter((d) => d.variant === "clean" && d.verdict !== "BLOCKED").length
      ? wilson(falseAlarms, details.filter((d) => d.variant === "clean" && d.verdict !== "BLOCKED").length)
      : null,
    falseAlarms,
    controls: 12,
    criticalMisses,
    blocked,
    details,
    limitations: [
      "Small, exploratory calibration; passing does not establish population reliability.",
      "Human confirmation of defect labels is required; the generator cannot self-certify its gold labels.",
    ],
  };
  writeJSON(out, result);
  return result;
}
