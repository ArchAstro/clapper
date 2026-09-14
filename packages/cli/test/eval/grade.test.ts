import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { adjudicate } from "../../src/eval/adjudicate.ts";
import { evaluateJudgment, importJudgment, runVerdict } from "../../src/eval/grade.ts";
import { sha, writeJSON } from "../../src/eval/io.ts";
import { judge, judgment, storedRun } from "./helpers";

const dirs: string[] = [];
const temp = () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-grade-"));
  dirs.push(p);
  return p;
};
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
it("never averages away a failed source-fit constraint", () => {
  const { run, c } = storedRun(temp(), "one"),
    p = judge(),
    report = judgment(run, c, p);
  report.constraints[0].verdict = "FAIL";
  Object.values(report.ratings).forEach((r) => {
    r!.value = 4;
  });
  expect(evaluateJudgment(report, p, run, c).verdict).toBe("FAIL");
});
it("requires compatible observed evidence for each graded modality", () => {
  const { run, c } = storedRun(temp(), "one"),
    p = judge(),
    report = judgment(run, c, p);
  report.observed = ["text", "image"];
  delete report.ratings.narration;
  expect(evaluateJudgment(report, p, run, c).verdict).toBe("BLOCKED");
});
it("rejects a forged movie hash, unsupported capabilities and author self-judging", () => {
  const { run, c } = storedRun(temp(), "one"),
    p = judge(),
    report = judgment(run, c, p);
  report.videoHash = "wrong";
  expect(() => evaluateJudgment(report, p, run, c)).toThrow("another movie");
  const bad = judgment(run, c, p);
  p.capabilities = ["text"];
  expect(() => evaluateJudgment(bad, p, run, c)).toThrow("unsupported");
  const same = judge(run.candidate.id);
  expect(() => evaluateJudgment(judgment(run, c, same), same, run, c)).toThrow("own final judge");
});
it("does not allow unknown evidence files or ungrounded source claims", () => {
  const { run, c } = storedRun(temp(), "one"),
    p = judge(),
    report = judgment(run, c, p);
  report.constraints[0].evidence[0].file = "invented.png";
  expect(() => evaluateJudgment(report, p, run, c)).toThrow("frozen artifact");
  const noSource = judgment(run, c, p);
  noSource.constraints[0].evidence[0].sourceId = undefined;
  expect(evaluateJudgment(noSource, p, run, c).verdict).toBe("BLOCKED");
});
it("keeps a valid but unreviewed film blocked and requires independent judgments", () => {
  const root = temp(),
    { dir, run, c } = storedRun(root, "one");
  expect(runVerdict(dir).verdict).toBe("BLOCKED");
  for (const name of ["first", "second"]) {
    const p = judge(name);
    writeJSON(path.join(root, name + ".json"), p);
    writeJSON(path.join(root, name + "-report.json"), judgment(run, c, p));
    importJudgment(dir, path.join(root, name + ".json"), path.join(root, name + "-report.json"));
  }
  expect(runVerdict(dir).verdict).toBe("PASS");
  expect(runVerdict(dir).calibrated).toBe(false);
});
it("retains adjudicated judgments and cannot waive the independent-judge gate", () => {
  const root = temp(),
    { dir, run, c } = storedRun(root, "adjudication");
  for (const name of ["first", "second"]) {
    const p = judge(name);
    writeJSON(path.join(root, name + ".json"), p);
    writeJSON(path.join(root, name + "-report.json"), judgment(run, c, p));
    importJudgment(dir, path.join(root, name + ".json"), path.join(root, name + "-report.json"));
  }
  const name = fs.readdirSync(path.join(dir, "judgments"))[0];
  const file = `judgments/${name}`;
  const decision = {
    schema: 1,
    runId: run.id,
    videoHash: run.videoHash,
    summary: "Synthetic test of an explicit human exclusion",
    evidence: judgment(run, c).constraints[0].evidence,
    exclude: [{ file, sha256: sha(fs.readFileSync(path.join(dir, file))), reason: "Test-only exclusion" }],
  };
  const profileFile = path.join(root, "arbiter.json"),
    decisionFile = path.join(root, "decision.json");
  writeJSON(decisionFile, decision);
  writeJSON(profileFile, judge("arbiter"));
  expect(() => adjudicate(dir, profileFile, decisionFile)).toThrow("explicit human");
  writeJSON(profileFile, { ...judge("arbiter"), kind: "human" });
  adjudicate(dir, profileFile, decisionFile);
  expect(fs.existsSync(path.join(dir, file))).toBe(true);
  expect(runVerdict(dir).verdict).toBe("BLOCKED");
});
