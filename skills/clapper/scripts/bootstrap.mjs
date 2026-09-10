#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Run from an installed skill: no Clapper checkout, global install or pnpm needed.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log("Usage: node bootstrap.mjs <project-directory> [--template basic|comic]");
  process.exit(0);
}
assert.ok(
  (args.length === 1 || (args.length === 3 && args[1] === "--template")) && !args[0]?.startsWith("-"),
  "Usage: node bootstrap.mjs <project-directory> [--template basic|comic]",
);
assert.ok(
  Number(process.versions.node.split(".")[0]) >= 20,
  "Node 20+ required; use the native bootstrap route instead.",
);
const project = path.resolve(args[0]);
const template = args[2] ?? "basic";
assert.ok(["basic", "comic"].includes(template), "Template must be basic or comic");
const configPath = path.join(project, "clapper.json");
const exists = fs.existsSync(project);
assert.ok(
  !exists || fs.existsSync(configPath),
  "Existing path is not a standalone Clapper project; do not overwrite it. See bootstrap.md for workspace projects.",
);
let config = exists ? JSON.parse(fs.readFileSync(configPath, "utf8")) : undefined;
assert.ok(
  !exists || typeof config?.runtime === "string",
  "Existing clapper.json must pin a runtime; do not guess or migrate it",
);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-bootstrap-"));
function run(args, cwd = scratch, capture = false) {
  const result = spawnSync("npm", args, { cwd, encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `npm ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  return result.stdout?.trim();
}
try {
  const version =
    config?.runtime ??
    JSON.parse(
      run(
        ["view", "@archastro/clapper", "version", "--json", "--registry=https://registry.npmjs.org"],
        scratch,
        true,
      ),
    );
  assert.match(
    version,
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
    "Expected an exact runtime version; never migrate a pinned project implicitly",
  );
  const prefix = [
    "exec",
    "--yes",
    `--package=@archastro/clapper@${version}`,
    "--registry=https://registry.npmjs.org",
    "--",
    "clapper",
  ];
  const clapper = (args, cwd = scratch, capture = false) => run([...prefix, ...args], cwd, capture);
  assert.equal(clapper(["--version"], scratch, true), version);
  clapper(["runtime", "path"]);
  if (exists) clapper(["install"], project);
  else clapper(["new", project, "--template", template]);
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  clapper(["doctor"], project);
  const compositions = JSON.parse(clapper(["compositions", "--json"], project, true));
  assert.ok(
    compositions.some((c) => c.id === config.composition),
    "Configured composition is missing",
  );
  // Do not replace a user's previous proof images on rerun.
  const proof = path.join(project, "out", `bootstrap-${Date.now()}`);
  clapper(["still", "-c", config.composition, "--frame", "0", "-o", proof], project);
  console.log(
    JSON.stringify(
      { project, version, composition: config.composition, proof, command: ["npm", ...prefix] },
      null,
      2,
    ),
  );
  console.log("Bootstrap verified. Inspect the proof frame, then continue the requested film or score.");
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
