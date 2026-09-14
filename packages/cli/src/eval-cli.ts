import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { calibrate } from "./eval/calibrate.ts";
import { captureEvidence } from "./eval/capture.ts";
import { createComparison, importBallots } from "./eval/compare.ts";
import { loadSuite } from "./eval/contracts.ts";
import { gradeRun, importJudgment } from "./eval/grade.ts";
import { readJSON, writeJSON } from "./eval/io.ts";
import { renderReport } from "./eval/report.ts";
import { runCampaign } from "./eval/runner.ts";
import type { FilmCase, Split } from "./eval/types.ts";

const help = `clapper eval init --out candidate.json
clapper eval list [--suite suite.json] [--split dev]
clapper eval run --candidate candidate.json --out campaign [--suite suite.json] [--case id] [--repeats 2] [--resume]
clapper eval grade --run campaign/runs/case-0 --judge judge.json [--review judgment.json]
clapper eval compare --baseline campaign-a --candidate campaign-b --out comparison [--intervention skill|runtime|author|bundle]
clapper eval ballots --comparison comparison --review ballots.json
clapper eval adjudicate --run run-directory --judge human-profile.json --review decision.json
clapper eval report --comparison comparison
clapper eval calibrate --set calibration.json --predictions predictions.json --judge judge.json --out receipt.json
clapper eval calibration-build --out directory
clapper eval calibration-judge --set calibration.json --judge judge.json --out packet
clapper eval calibration-import --run packet --review completed-response.json
clapper eval fixtures [--out directory]
clapper eval collect --project directory --case case.json --entry src/index.tsx --composition id --video out/movie.mp4 --out evidence

Author adapters are explicit argv arrays; no default model or paid provider is selected.
Host-dev isolates workspaces, not secrets. Validation/holdout require pinned containers.
Grades require frozen artifact evidence. Missing capabilities are BLOCKED. No automatic promotion.`;
export async function evalCLI(args: string[]) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: Object.fromEntries([
      ...[
        "suite",
        "split",
        "candidate",
        "baseline",
        "out",
        "case",
        "repeats",
        "run",
        "judge",
        "review",
        "comparison",
        "intervention",
        "set",
        "predictions",
        "project",
        "entry",
        "composition",
        "video",
      ].map((k) => [k, { type: "string" as const }]),
      ["resume", { type: "boolean" as const }],
      ["help", { type: "boolean" as const, short: "h" }],
    ]),
  });
  const v: Record<string, unknown> = values;
  assert.ok(positionals.length <= 1, "Use named eval options; unexpected positional arguments");
  const action = positionals[0];
  if (v.help || !action) {
    console.log(help);
    return;
  }
  const value = (key: string) => {
    const x = v[key];
    assert.ok(typeof x === "string" && x.length, `--${key} is required`);
    return x;
  };
  const optional = (key: string) => (typeof v[key] === "string" ? (v[key] as string) : undefined);
  const defaultSuite = fileURLToPath(
    new URL("../../../benchmarks/technical-video/suite.json", import.meta.url),
  );
  const suite = optional("suite") ?? defaultSuite,
    split = (optional("split") ?? "dev") as Split;
  let result: unknown;
  if (action === "init") {
    const out = path.resolve(value("out"));
    assert.ok(!fs.existsSync(out), "Candidate file exists");
    const sourceSkill = fileURLToPath(new URL("../../../skills/clapper", import.meta.url));
    const bundledSkill = fileURLToPath(new URL("../../../skill", import.meta.url));
    writeJSON(out, {
      schema: 1,
      id: "candidate",
      author: {
        command: ["YOUR_AUTHOR_HARNESS", "--request", "{request}"],
        model: "PIN_MODEL_ID",
        version: "PIN_MODEL_VERSION",
        settings: {},
      },
      skill: fs.existsSync(sourceSkill) ? sourceSkill : bundledSkill,
      runtime: {
        command: [process.execPath, "{clapper}"],
        version: "0.4.0-source",
        identity: "source-content-fingerprinted",
      },
      isolation: { kind: "host-dev" },
      budget: { wallSeconds: 1800, maxTokens: 30000, maxCostUSD: 20, repairs: 2, maxOutputBytes: 268435456 },
    });
    result = {
      candidate: out,
      status: "Configure the explicit author harness/model before running; no API provider has been selected",
    };
  } else if (action === "list") {
    assert.ok(fs.existsSync(suite), "Benchmark corpus unavailable; provide --suite");
    const loaded = loadSuite(suite, split);
    result = loaded.cases.map((c) => ({
      id: c.id,
      title: c.title,
      family: c.family,
      split: c.split,
      durationSeconds: c.durationSeconds,
    }));
  } else if (action === "run")
    result = await runCampaign(suite, path.resolve(value("candidate")), value("out"), {
      split,
      repeats: Number(optional("repeats") ?? 1),
      resume: !!v.resume,
      caseId: optional("case"),
    });
  else if (action === "grade")
    result = optional("review")
      ? importJudgment(value("run"), value("judge"), value("review"))
      : await gradeRun(value("run"), value("judge"));
  else if (action === "compare") {
    createComparison(
      value("baseline"),
      value("candidate"),
      value("out"),
      (optional("intervention") ?? "skill") as "skill",
    );
    result = renderReport(value("out"));
  } else if (action === "adjudicate") {
    const { adjudicate } = await import("./eval/adjudicate.ts");
    result = adjudicate(value("run"), value("judge"), value("review"));
  } else if (action === "ballots") {
    result = importBallots(value("comparison"), value("review"));
    renderReport(value("comparison"));
  } else if (action === "report") result = renderReport(value("comparison"));
  else if (action === "calibrate")
    result = calibrate(value("set"), value("predictions"), value("judge"), value("out"));
  else if (action === "collect") {
    const project = path.resolve(value("project"));
    result = await captureEvidence(
      project,
      value("entry"),
      value("composition"),
      path.resolve(project, value("video")),
      readJSON<FilmCase>(value("case")),
      path.resolve(value("out")),
    );
  } else if (action === "calibration-judge") {
    const { prepareCalibrationJudge } = await import("./eval/calibration-judge.ts");
    result = await prepareCalibrationJudge(value("set"), value("judge"), value("out"));
  } else if (action === "calibration-import") {
    const { importCalibrationResponse } = await import("./eval/calibration-judge.ts");
    result = importCalibrationResponse(value("run"), value("review"));
  } else if (action === "calibration-build") {
    const { buildCalibration } = await import("./eval/calibration-build.ts");
    result = await buildCalibration(value("out"));
  } else if (action === "fixtures") {
    const { runFixtures } = await import("./eval/fixtures.ts");
    result = await runFixtures(optional("out") ?? ".clapper/eval-fixtures");
  } else throw new Error(`Unknown eval command ${action}`);
  console.log(JSON.stringify(result, null, 2));
}
