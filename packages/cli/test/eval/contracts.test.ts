import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { loadSuite, validateSubmission } from "../../src/eval/contracts.ts";
import { inside, record, snapshot, verify, writeJSON } from "../../src/eval/io.ts";
import { filmCase } from "./helpers";

const dirs: string[] = [];
const temp = () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-eval-"));
  dirs.push(p);
  return p;
};
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
it("rejects escaping paths and symlink artifacts", () => {
  const root = temp();
  expect(() => inside(root, "../secret")).toThrow("escapes");
  fs.symlinkSync(os.tmpdir(), path.join(root, "link"));
  expect(() => inside(root, "link/file")).toThrow("Symlink");
  expect(() => snapshot(root, path.join(temp(), "snapshot"))).toThrow("Symlink");
});
it("detects tampering in frozen artifacts", () => {
  const root = temp();
  fs.writeFileSync(path.join(root, "x"), "original");
  const files = [record(root, "x")];
  verify(root, files);
  fs.writeFileSync(path.join(root, "x"), "modified");
  expect(() => verify(root, files)).toThrow("changed");
});
it("keeps source hashes and topic splits honest", () => {
  const root = temp(),
    c = filmCase();
  fs.writeFileSync(path.join(root, "source.md"), "Source");
  writeJSON(path.join(root, "case.json"), c);
  writeJSON(path.join(root, "suite.json"), { schema: 1, id: "suite", cases: ["case.json"] });
  expect(loadSuite(path.join(root, "suite.json"), "dev").cases).toHaveLength(1);
  expect(() => loadSuite(path.join(root, "suite.json"), "holdout")).toThrow("No holdout");
  const other = { ...c, id: "other", split: "holdout" };
  writeJSON(path.join(root, "other.json"), other);
  writeJSON(path.join(root, "suite.json"), { schema: 1, id: "suite", cases: ["case.json", "other.json"] });
  expect(() => loadSuite(path.join(root, "suite.json"), "dev")).toThrow("crosses splits");
});
it("rejects source checksum drift before launching an author", () => {
  const root = temp(),
    c = filmCase();
  fs.writeFileSync(path.join(root, "source.md"), "Altered source");
  writeJSON(path.join(root, "case.json"), c);
  writeJSON(path.join(root, "suite.json"), { schema: 1, id: "suite", cases: ["case.json"] });
  expect(() => loadSuite(path.join(root, "suite.json"), "dev")).toThrow("checksum");
});
it("fails wrong-paper plans before rendering", () => {
  const root = temp(),
    c = filmCase();
  for (const f of ["index.tsx", "transcript.txt"]) fs.writeFileSync(path.join(root, f), "fixture");
  writeJSON(path.join(root, "plan.json"), {
    schema: 1,
    sourceIds: ["wrong-paper"],
    journey: "input to result",
    levels: [{ name: "whole", journey: "input to result", zoomTarget: "model" }],
    claims: [],
  });
  writeJSON(path.join(root, "submission.json"), {
    schema: 1,
    entry: "index.tsx",
    composition: "film",
    plan: "plan.json",
    transcript: "transcript.txt",
    revisions: [],
    usage: { tokens: 0, costUSD: 0, repairs: 0 },
  });
  expect(() => validateSubmission(root, c)).toThrow("unapproved source");
});
