import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { createComparison, importBallots, summarizeComparison } from "../../src/eval/compare.ts";
import { importJudgment } from "../../src/eval/grade.ts";
import { readJSON, writeJSON } from "../../src/eval/io.ts";
import { renderReport } from "../../src/eval/report.ts";
import type { RunRecord } from "../../src/eval/types.ts";
import { judge, judgment, storedRun } from "./helpers";

const dirs: string[] = [];
const temp = () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-compare-"));
  dirs.push(p);
  return p;
};
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
function setup(graded = false) {
  const root = temp(),
    baseline = path.join(root, "baseline-identity"),
    candidate = path.join(root, "candidate-identity");
  for (const [dir, id] of [
    [baseline, "baseline-identity"],
    [candidate, "candidate-identity"],
  ]) {
    const r = storedRun(dir, "case-0", id);
    writeJSON(path.join(dir, "campaign.json"), {
      schema: 1,
      id,
      createdAt: "fixture",
      suiteHash: "same",
      candidateHash: id,
      skillHash: "same",
      repeats: 1,
      split: "dev",
      runs: ["case-0"],
    });
    if (graded)
      for (const name of ["judge-a", "judge-b"]) {
        const p = judge(name);
        writeJSON(path.join(root, name + ".json"), p);
        writeJSON(path.join(root, name + "-report.json"), judgment(r.run, r.c, p));
        importJudgment(r.dir, path.join(root, name + ".json"), path.join(root, name + "-report.json"));
      }
  }
  return { root, baseline, candidate };
}
it("retains blocked assignments and never promotes an unjudged comparison", () => {
  const { root, baseline, candidate } = setup(),
    out = path.join(root, "comparison");
  createComparison(baseline, candidate, out);
  const report = renderReport(out);
  expect(report.summary.blocked).toBe(1);
  expect(report.summary.operational.candidate.assigned).toBe(1);
  expect(report.summary.adjustedWinRate).toBeNull();
  expect(report.summary.promotion.eligible).toBe(false);
  const html = fs.readFileSync(report.blindReport, "utf8");
  expect(html).not.toContain("baseline-identity");
  expect(html).not.toContain("candidate-identity");
  expect(() => createComparison(baseline, candidate, out)).toThrow("already exists");
});
it("imports bound ballots, rejects duplicates, and reports preference separately from learning", () => {
  const { root, baseline, candidate } = setup(true),
    out = path.join(root, "comparison"),
    comparison = createComparison(baseline, candidate, out);
  const pair = comparison.pairs[0],
    choice = pair.A.candidate === "candidate" ? "A" : "B";
  for (const reviewer of ["one", "two"]) {
    const file = path.join(root, reviewer + ".json");
    writeJSON(file, {
      schema: 1,
      ballots: [
        {
          schema: 1,
          comparisonId: comparison.id,
          pairId: pair.id,
          reviewer,
          choice,
          reason: "Synthetic fixture preference, not a real rating",
          startSeconds: 0,
          endSeconds: 1,
          observed: ["motion"],
          media: { A: pair.A.videoHash, B: pair.B.videoHash },
        },
      ],
    });
    importBallots(out, file);
    expect(() => importBallots(out, file)).toThrow("already voted");
  }
  const summary = summarizeComparison(out);
  expect(summary.wins).toBe(1);
  expect(summary.adjustedWinRate).toBe(1);
  expect(summary.promotion.eligible).toBe(false);
  expect(summary.learningClaim).toContain("NOT EVALUATED");
  const journal = path.join(out, "ballots", fs.readdirSync(path.join(out, "ballots"))[0]);
  const stored = readJSON<{ ballots: { reason: string }[] }>(journal);
  stored.ballots[0].reason = "Changed after import";
  writeJSON(journal, stored);
  expect(() => summarizeComparison(out)).toThrow("journal changed");
});
it("permits pinned image changes only for a declared runtime intervention", () => {
  const { root, baseline, candidate } = setup();
  for (const [dir, image] of [
    [baseline, "a"],
    [candidate, "b"],
  ]) {
    const file = path.join(dir, "runs/case-0/run.json");
    const run = readJSON<RunRecord>(file);
    run.candidate.isolation = { kind: "container", image: `sha256:${image.repeat(64)}`, network: "none" };
    writeJSON(file, run);
  }
  expect(() => createComparison(baseline, candidate, path.join(root, "skill"))).toThrow("Uncontrolled");
  expect(createComparison(baseline, candidate, path.join(root, "runtime"), "runtime").intervention).toBe(
    "runtime",
  );
});
it("refuses unmatched assignments and changed control variables", () => {
  const { root, baseline, candidate } = setup();
  writeJSON(path.join(candidate, "campaign.json"), { schema: 1, suiteHash: "different" });
  expect(() => createComparison(baseline, candidate, path.join(root, "comparison"))).toThrow(
    "Different suites",
  );
});
