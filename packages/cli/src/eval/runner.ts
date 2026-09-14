import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectMedia } from "./capture.ts";
import { loadCandidate, loadSuite, validateSubmission } from "./contracts.ts";
import { digest, inside, readJSON, record, snapshot, tree, verify, writeJSON } from "./io.ts";
import { BudgetExceeded, dockerCommand, execute, RunInterrupted } from "./process.ts";
import { authorFingerprint, runtimeFingerprint } from "./provenance.ts";
import type { Campaign, Candidate, FilmCase, RunRecord, Split } from "./types.ts";
export const clapper = fileURLToPath(new URL("../../bin/clapper.mjs", import.meta.url));
const replacements = (argv: string[], vars: Record<string, string>) =>
  argv.map((a) => a.replace(/\{(request|workspace|input|skill|clapper)\}/g, (_, key) => vars[key]));
function publicCase(c: FilmCase) {
  return {
    schema: c.schema,
    id: c.id,
    family: c.family,
    split: c.split,
    title: c.title,
    brief: c.brief,
    audience: c.audience,
    durationSeconds: c.durationSeconds,
    size: c.size,
    fps: c.fps,
    audioRequired: c.audioRequired,
    sources: c.sources.map(({ id, file, sha256, url, revision }) => ({ id, file, sha256, url, revision })),
    requiredSourceIds: c.clarification ? [] : c.requiredSourceIds,
  };
}
function lock(dir: string, resume: boolean) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "campaign.lock");
  if (fs.existsSync(file)) {
    const owner = readJSON<{ pid: number; host: string }>(file);
    assert.equal(owner.host, os.hostname(), "Campaign locked on another host");
    let alive = true;
    try {
      process.kill(owner.pid, 0);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ESRCH") alive = false;
    }
    assert.ok(resume && !alive, "Campaign is locked; do not run concurrent authors against it");
    fs.unlinkSync(file);
  }
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, host: os.hostname() }), { flag: "wx" });
  return () => fs.unlinkSync(file);
}
async function inContainer(
  c: Candidate,
  name: string,
  input: string,
  work: string,
  args: string[],
  log: string,
  wall: number,
  network: "none" | "bridge",
  env: string[] = [],
) {
  assert.equal(c.isolation.kind, "container");
  if (c.isolation.kind !== "container") throw Error("Container required");
  try {
    return await execute(
      dockerCommand(c.isolation.image, name, input, work, args, network, env),
      work,
      log,
      wall,
      env,
    );
  } finally {
    spawnSync("docker", ["rm", "--force", name], { stdio: "ignore", timeout: 10000 });
  }
}
export async function runCampaign(
  suiteFile: string,
  candidateFile: string,
  out: string,
  options: { split?: Split; repeats?: number; resume?: boolean; caseId?: string } = {},
) {
  const split = options.split ?? "dev",
    repeats = options.repeats ?? 1;
  assert.ok(Number.isInteger(repeats) && repeats > 0 && repeats <= 20, "Invalid repeats");
  const loaded = loadSuite(suiteFile, split),
    candidate = loadCandidate(candidateFile);
  assert.ok(
    split === "dev" || candidate.isolation.kind === "container",
    "Validation/holdout requires a pinned container boundary; host-dev is not a security sandbox",
  );
  const cases = loaded.cases.filter((c) => !options.caseId || c.id === options.caseId);
  assert.ok(cases.length, "Case not found in split");
  const sourceFiles = loaded.all.flatMap((c) => c.sources),
    suiteHash = digest({ suite: loaded.suite, cases: loaded.all, sources: sourceFiles });
  const skillFiles = tree(candidate.skill),
    skillHash = digest(skillFiles),
    runtimeHash = runtimeFingerprint(candidate),
    authorHash = authorFingerprint(candidate),
    candidateHash = digest({ ...candidate, skill: skillHash, runtimeHash, authorHash });
  const root = path.resolve(out),
    file = path.join(root, "campaign.json"),
    unlock = lock(root, !!options.resume);
  try {
    let campaign: Campaign;
    if (fs.existsSync(file)) {
      assert.ok(options.resume, "Campaign exists; use --resume or a fresh directory");
      campaign = readJSON<Campaign>(file);
      assert.equal(campaign.suiteHash, suiteHash, "Suite changed on resume");
      assert.equal(campaign.candidateHash, candidateHash, "Candidate changed on resume");
      assert.equal(campaign.skillHash, skillHash);
      assert.equal(campaign.repeats, repeats);
      assert.equal(campaign.split, split);
      assert.deepEqual(
        campaign.runs,
        cases.flatMap((c) => Array.from({ length: repeats }, (_, r) => `${c.id}-${r}`)),
        "Case selection changed on resume",
      );
    } else {
      campaign = {
        schema: 1,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        suiteHash,
        candidateHash,
        skillHash,
        repeats,
        split,
        runs: cases.flatMap((c) => Array.from({ length: repeats }, (_, r) => `${c.id}-${r}`)),
      };
      // Persist every assignment before any author starts; failures cannot disappear from denominators.
      for (const c of cases)
        for (let r = 0; r < repeats; r++) {
          const run: RunRecord = {
            schema: 1,
            id: randomUUID(),
            pairKey: `${c.id}-${r}`,
            caseId: c.id,
            family: c.family,
            split,
            repeat: r,
            status: "pending",
            caseHash: digest(c),
            candidateHash,
            candidate,
            skillHash,
            runtimeHash,
            authorHash,
            suiteHash,
            attempts: [],
            usageAuthority: "adapter-reported",
          };
          const dir = path.join(root, "runs", run.pairKey);
          writeJSON(path.join(dir, "run.json"), run);
          writeJSON(path.join(dir, "case.json"), c);
          if (c.oracle) fs.copyFileSync(inside(loaded.root, c.oracle.file), path.join(dir, "oracle.json"));
        }
      writeJSON(file, campaign);
    }
    let cancelled = false;
    jobs: for (const c of cases)
      for (let r = 0; r < repeats; r++) {
        const dir = path.join(root, "runs", `${c.id}-${r}`),
          runFile = path.join(dir, "run.json"),
          run = readJSON<RunRecord>(runFile);
        if (run.status === "succeeded") {
          verify(dir, run.artifacts!);
          continue;
        }
        if (run.status !== "pending") {
          if (run.status === "running") {
            run.status = "interrupted";
            const last = run.attempts.at(-1)!;
            last.status = "interrupted";
            last.finishedAt = new Date().toISOString();
            last.error =
              "Supervisor interrupted; attempt retained. Use a fresh campaign to retry this assignment.";
            writeJSON(runFile, run);
          }
          continue;
        }
        const attempt = { id: randomUUID(), status: "running" as const, startedAt: new Date().toISOString() };
        run.attempts.push(attempt);
        run.status = "running";
        writeJSON(runFile, run);
        const input = path.join(dir, "input"),
          work = path.join(dir, "work");
        fs.mkdirSync(input);
        fs.mkdirSync(work);
        const started = Date.now();
        const remaining = () => {
          const seconds = candidate.budget.wallSeconds - (Date.now() - started) / 1000;
          if (seconds <= 0) throw new BudgetExceeded("Total wall budget exhausted");
          return seconds;
        };
        try {
          snapshot(candidate.skill, path.join(input, "skill"));
          for (const source of c.sources) {
            const dest = inside(input, `sources/${source.id}.txt`);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(inside(loaded.root, source.file), dest);
          }
          const publicInput = publicCase(c);
          publicInput.sources = publicInput.sources.map((s) => ({ ...s, file: `sources/${s.id}.txt` }));
          writeJSON(path.join(input, "brief.json"), publicInput);
          const request = {
            schema: 1,
            runId: run.id,
            case: "brief.json",
            skill: "skill/SKILL.md",
            seed: r,
            budget: candidate.budget,
            model: candidate.author,
            output: "submission.json (relative to working directory)",
            clarificationProtocol:
              "If essential input is missing, write clarification-request.json with schema:1 and question:string, then exit. Otherwise write submission.json. Usage must be cumulative across calls.",
            contract: {
              entry: "relative TSX entry",
              composition: "registered id",
              plan: "relative plan.json",
              transcript: "relative transcript text",
              revisions: "ordered relative revision evidence paths",
              usage: "adapter-reported tokens/costUSD/repairs",
            },
            isolation: candidate.isolation.kind,
          };
          writeJSON(path.join(input, "request.json"), request);
          const container = candidate.isolation.kind === "container";
          const vars = {
            request: container ? "/input/request.json" : path.join(input, "request.json"),
            workspace: container ? "/work" : work,
            input: container ? "/input" : input,
            skill: container ? "/input/skill" : path.join(input, "skill"),
            clapper,
          };
          let inputFiles = tree(input);
          const argv = replacements(candidate.author.command, vars),
            log = path.join(dir, "author.log");
          console.error(`Authoring ${run.pairKey} (${candidate.id}, ${candidate.isolation.kind})`);
          const invokeAuthor = async () => {
            if (container) {
              assert.ok(
                !candidate.author.command.some((a) => a.includes("{clapper}")),
                "Container adapters must use image-local executables",
              );
              await inContainer(
                candidate,
                `clapper-eval-${attempt.id}`,
                input,
                work,
                argv,
                log,
                remaining(),
                candidate.isolation.kind === "container" ? candidate.isolation.network : "none",
                candidate.author.env,
              );
            } else
              await execute(argv, work, log, remaining(), candidate.author.env, {
                CLAPPER_EVAL_REQUEST: vars.request,
              });
          };
          await invokeAuthor();
          verify(input, inputFiles);
          const questionFile = path.join(work, "clarification-request.json");
          if (fs.existsSync(questionFile)) {
            assert.ok(c.clarification, "Brief was explicit; no scripted clarification is available");
            assert.ok(
              !fs.existsSync(path.join(work, "submission.json")),
              "Submit a question or a film, not both",
            );
            const question = readJSON<{ schema: number; question: string }>(questionFile);
            assert.equal(question.schema, 1);
            assert.ok(
              typeof question.question === "string" && question.question.trim(),
              "Empty clarification",
            );
            writeJSON(path.join(dir, "clarification.json"), {
              question: question.question,
              answer: c.clarification.answer,
            });
            fs.renameSync(questionFile, path.join(dir, "clarification-request.json"));
            writeJSON(path.join(input, "initial-request.json"), request);
            writeJSON(path.join(input, "request.json"), {
              ...request,
              clarification: { question: question.question, answer: c.clarification.answer },
            });
            writeJSON(path.join(input, "brief.json"), {
              ...publicInput,
              requiredSourceIds: c.requiredSourceIds,
            });
            inputFiles = tree(input);
            await invokeAuthor();
            verify(input, inputFiles);
            assert.ok(!fs.existsSync(questionFile), "Only one scripted clarification is permitted");
          } else assert.ok(!c.clarification, "This ambiguous case requires clarification before authoring");
          const { submission, plan } = validateSubmission(work, c);
          run.usage = submission.usage;
          if (
            submission.usage.tokens > candidate.budget.maxTokens ||
            submission.usage.costUSD > candidate.budget.maxCostUSD ||
            submission.usage.repairs > candidate.budget.repairs
          )
            throw new BudgetExceeded("Reported token/cost/repair budget exceeded");
          assert.ok(submission.revisions.length >= submission.usage.repairs, "Missing repair history");
          const frozen = path.join(dir, "submission");
          snapshot(work, frozen, candidate.budget.maxOutputBytes);
          const history = [];
          let historyBytes = 0;
          for (const [index, relative] of submission.revisions.entries()) {
            const original = inside(work, relative),
              name = `revisions/${index}-${path.basename(relative)}`,
              destination = inside(frozen, name);
            historyBytes += fs.statSync(original).size;
            if (historyBytes > candidate.budget.maxOutputBytes)
              throw new BudgetExceeded("Repair history exceeds artifact budget");
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(original, destination);
            history.push({ original: relative, ...record(frozen, name) });
          }
          writeJSON(path.join(frozen, "revision-history.json"), history);
          const modules =
            candidate.runtime.dependencyRoot ??
            (container
              ? "/opt/clapper/packages/cli/node_modules"
              : path.resolve(path.dirname(clapper), "../node_modules"));
          fs.symlinkSync(modules, path.join(frozen, "node_modules"), "dir");
          // Render and collect inside the same enforced boundary for sealed runs.
          const runtime = replacements(candidate.runtime.command, {
            ...vars,
            workspace: container ? "/work" : frozen,
          });
          const renderArgs = [
            ...runtime,
            "render",
            submission.entry,
            "-c",
            submission.composition,
            "-o",
            "out/final.mp4",
            "--concurrency",
            "1",
          ];
          if (container) {
            await inContainer(
              candidate,
              `clapper-render-${attempt.id}`,
              input,
              frozen,
              renderArgs,
              path.join(dir, "render.log"),
              remaining(),
              "none",
            );
            writeJSON(path.join(input, "media-contract.json"), {
              ...publicCase(c),
              eventFrames: c.eventFrames,
              constraints: [],
              transferQuestions: [],
            });
            await inContainer(
              candidate,
              `clapper-collect-${attempt.id}`,
              input,
              frozen,
              [
                ...runtime,
                "eval",
                "collect",
                "--project",
                "/work",
                "--case",
                "/input/media-contract.json",
                "--entry",
                submission.entry,
                "--composition",
                submission.composition,
                "--video",
                "/work/out/final.mp4",
                "--out",
                "/work/out/evidence",
              ],
              path.join(dir, "collect.log"),
              remaining(),
              "none",
            );
            run.machine = readJSON(path.join(frozen, "out/evidence/machine.json"));
            const media = inspectMedia(path.join(frozen, "out/final.mp4"));
            assert.equal(media.width, c.size[0]);
            assert.equal(media.height, c.size[1]);
          } else {
            await execute(renderArgs, frozen, path.join(dir, "render.log"), remaining(), [], {
              CLAPPER_FFMPEG: process.env.CLAPPER_FFMPEG ?? "",
            });
            await execute(
              [
                process.execPath,
                clapper,
                "eval",
                "collect",
                "--project",
                frozen,
                "--case",
                path.join(dir, "case.json"),
                "--entry",
                submission.entry,
                "--composition",
                submission.composition,
                "--video",
                path.join(frozen, "out/final.mp4"),
                "--out",
                path.join(frozen, "out/evidence"),
              ],
              frozen,
              path.join(dir, "collect.log"),
              remaining(),
            );
            run.machine = readJSON(path.join(frozen, "out/evidence/machine.json"));
          }
          run.planChecks = [
            "Declared sources match the case pack",
            `${plan.levels.length} declared abstraction levels; semantic quality still requires independent grading`,
          ];
          const assets = tree(
            frozen,
            candidate.budget.maxOutputBytes,
            new Set(["node_modules", ".clapper", ".git"]),
          );
          run.artifacts = assets.map((a) => ({ ...a, file: `submission/${a.file}` }));
          run.artifacts.push(...inputFiles.map((a) => ({ ...a, file: `input/${a.file}` })));
          for (const f of [
            "case.json",
            "oracle.json",
            "author.log",
            "render.log",
            "clarification.json",
            "clarification-request.json",
          ])
            if (fs.existsSync(path.join(dir, f))) run.artifacts.push(record(dir, f));
          assert.equal(runtimeFingerprint(candidate), runtimeHash, "Runtime changed during the run");
          assert.equal(authorFingerprint(candidate), authorHash, "Author adapter changed during the run");
          run.videoHash = record(frozen, "out/final.mp4").sha256;
          assert.equal(run.machine!.videoHash, run.videoHash, "Collector movie mismatch");
          run.status = "succeeded";
          run.attempts.at(-1)!.status = "succeeded";
        } catch (error) {
          cancelled = error instanceof RunInterrupted;
          run.status = cancelled
            ? "interrupted"
            : error instanceof BudgetExceeded
              ? "budget_exhausted"
              : "failed";
          run.attempts.at(-1)!.status = run.status;
          run.attempts.at(-1)!.error = error instanceof Error ? error.message : String(error);
          run.artifacts = [];
          try {
            const failed = path.join(dir, "failed-submission");
            if (fs.existsSync(work) && !fs.existsSync(failed))
              run.artifacts.push(
                ...snapshot(work, failed, candidate.budget.maxOutputBytes).map((a) => ({
                  ...a,
                  file: `failed-submission/${a.file}`,
                })),
              );
          } catch (snapshotError) {
            run.attempts.at(-1)!.error += `; incomplete failed snapshot: ${String(snapshotError)}`;
          }
          for (const file of ["case.json", "author.log", "render.log", "collect.log"])
            if (fs.existsSync(path.join(dir, file))) run.artifacts.push(record(dir, file));
        }
        run.elapsedSeconds = (Date.now() - started) / 1000;
        run.attempts.at(-1)!.elapsedSeconds = run.elapsedSeconds;
        run.attempts.at(-1)!.finishedAt = new Date().toISOString();
        writeJSON(runFile, run);
        if (cancelled) break jobs;
      }
    return {
      ...campaign,
      results: campaign.runs.map((key) => {
        const r = readJSON<RunRecord>(path.join(root, "runs", key, "run.json"));
        return { pairKey: key, status: r.status, attempts: r.attempts.length };
      }),
    };
  } finally {
    unlock();
  }
}
