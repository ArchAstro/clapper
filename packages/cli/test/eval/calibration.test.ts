import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { type CalibrationSet, calibrate } from "../../src/eval/calibrate.ts";
import { sha, writeJSON } from "../../src/eval/io.ts";
import { judge } from "./helpers";

it("cannot self-certify generated gold, catches false alarms and critical misses", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-calibration-"));
  try {
    const pairs: CalibrationSet["pairs"] = Array.from({ length: 12 }, (_, i) => ({
      id: "pair-" + i,
      critical: i < 4,
      criterion: "Synthetic protocol fixture",
      clean: { itemId: "clean-" + i, file: "clean-" + i, sha256: sha("clean") },
      defect: { itemId: "defect-" + i, file: "defect-" + i, sha256: sha("defect") },
    }));
    for (const p of pairs) {
      fs.writeFileSync(path.join(root, p.clean.file), "clean");
      fs.writeFileSync(path.join(root, p.defect.file), "defect");
    }
    const set: CalibrationSet = { schema: 1, id: "test", curator: null, pairs },
      predictions = {
        schema: 1,
        judgeId: "reviewer",
        judgeVersion: "test-double-v1",
        items: pairs.flatMap((p) => [
          { itemId: p.clean.itemId, sha256: p.clean.sha256, verdict: "PASS" },
          { itemId: p.defect.itemId, sha256: p.defect.sha256, verdict: "FAIL" },
        ]),
      };
    const setFile = path.join(root, "set.json"),
      predFile = path.join(root, "pred.json"),
      profile = path.join(root, "judge.json");
    writeJSON(setFile, set);
    writeJSON(predFile, predictions);
    writeJSON(profile, judge());
    expect(calibrate(setFile, predFile, profile, path.join(root, "result.json")).verdict).toBe("BLOCKED");
    set.curator = { name: "TEST-ONLY curator fixture", confirmedAt: "2026-09-14T00:00:00Z" };
    writeJSON(setFile, set);
    expect(calibrate(setFile, predFile, profile, path.join(root, "result.json")).verdict).toBe("PASS");
    predictions.items[1].verdict = "PASS";
    writeJSON(predFile, predictions);
    expect(calibrate(setFile, predFile, profile, path.join(root, "result.json")).verdict).toBe("FAIL");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
