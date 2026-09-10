#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureGithubRelease } from "./release-github.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = "https://registry.npmjs.org";
const receiptFile = path.join(repo, "dist/release-prepared.json");
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: repo,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  return result.stdout?.trim();
}
function cleanHead() {
  assert.equal(run("git", ["status", "--porcelain"], true), "", "Commit changes before releasing.");
  return run("git", ["rev-parse", "HEAD"], true);
}
export function orderArtifacts(artifacts, platforms) {
  const names = [
    ...platforms.map((p) => `@clapper/launcher-${p}`),
    "@clapper/music",
    "@clapper/core",
    "@clapper/cli",
  ];
  assert.equal(new Set(platforms).size, platforms.length, "Duplicate platforms");
  assert.ok(platforms.length > 0, "No platforms prepared");
  assert.equal(artifacts.length, names.length, "Unexpected package count");
  return names.map((name) => {
    const matches = artifacts.filter((a) => a.name === name);
    assert.equal(matches.length, 1, `Expected exactly one ${name}`);
    return matches[0];
  });
}
export function publicationState(existing, expectedIntegrity) {
  if (existing === null) return "publish";
  assert.equal(existing, expectedIntegrity, "Registry already contains different bytes for this version");
  return "skip";
}
export function verifyFiles(root, files) {
  for (const file of files) {
    const resolved = path.resolve(root, file.path);
    assert.ok(resolved.startsWith(`${path.resolve(root)}${path.sep}`), "Artifact path escapes repository");
    assert.equal(hash(resolved), file.sha256, `Artifact changed: ${file.path}; run release:prepare again`);
  }
}
async function prepare() {
  const head = cleanHead();
  // An interrupted or failed preparation must never leave an older approval usable.
  fs.rmSync(receiptFile, { force: true });
  for (const args of [
    ["install", "--frozen-lockfile"],
    ["check"],
    ["check:public"],
    ["typecheck"],
    ["test"],
    ["test:release"],
  ])
    run("pnpm", args);
  run("go", ["-C", "launcher", "test", "-race", "./..."]);
  for (const task of ["build:standalone", "pack:npm", "test:standalone", "test:npm"]) run("pnpm", [task]);
  assert.equal(cleanHead(), head, "Source changed during preparation");
  const platform = `${process.platform}-${process.arch}`;
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, `dist/manifest-${platform}.json`), "utf8"));
  const packedPath = `dist/npm/${manifest.version}/artifacts.json`;
  const packed = JSON.parse(fs.readFileSync(path.join(repo, packedPath), "utf8"));
  // Acceptance tests exercise this host only; do not bless other hosts' untested artifacts.
  assert.deepEqual(packed.platforms, [platform], "Prepare one tested platform per release for now");
  assert.equal(manifest.sourceRevision, head);
  const artifacts = orderArtifacts(packed.artifacts, packed.platforms);
  const paths = [
    packedPath,
    `dist/manifest-${platform}.json`,
    `dist/${manifest.runtime.file}`,
    `dist/${manifest.launcher.file}`,
    ...artifacts.map((a) => `dist/npm/${manifest.version}/${a.file}`),
  ];
  const receipt = {
    version: manifest.version,
    head,
    platforms: packed.platforms,
    runtimeURL: manifest.runtime.url,
    artifacts,
    files: paths.map((p) => ({ path: p, sha256: hash(path.join(repo, p)) })),
  };
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`Prepared and tested ${manifest.version}. No packages published.\nNext: pnpm release:publish`);
}
async function existingIntegrity(name, version) {
  const response = await fetch(`${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 404) return null;
  assert.ok(response.ok, `Registry lookup failed (${response.status}) for ${name}`);
  const metadata = await response.json();
  assert.ok(metadata.dist?.integrity, `Registry omitted integrity for ${name}`);
  return metadata.dist.integrity;
}
async function publish(dryRun) {
  assert.ok(fs.existsSync(receiptFile), "Run pnpm release:prepare first");
  const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
  // Publication consumes the immutable, tested artifacts, not the current source tree.
  // Later development must not force a rebuild of an already-uploaded version on retry.
  assert.match(receipt.head, /^[a-f0-9]{40}$/i, "Invalid prepared source revision");
  run("git", ["cat-file", "-e", `${receipt.head}^{commit}`]);
  verifyFiles(repo, receipt.files);
  console.log(
    `Publishing prepared ${receipt.version} from commit ${receipt.head}; current source edits are not included.`,
  );
  const artifacts = orderArtifacts(receipt.artifacts, receipt.platforms);
  const tag = receipt.version.includes("-") ? "next" : "latest";
  if (!dryRun) {
    run("npm", ["whoami", `--registry=${registry}`]);
  }
  // Preflight every package before making any registry writes.
  const plan = [];
  for (const artifact of artifacts) {
    const state = dryRun
      ? "publish"
      : publicationState(await existingIntegrity(artifact.name, receipt.version), artifact.integrity);
    plan.push({ artifact, state });
  }
  await ensureGithubRelease(receipt, { root: repo, execute: run, dryRun });
  for (const { artifact, state } of plan) {
    if (state === "skip") {
      console.log(`Already published with matching integrity: ${artifact.name}@${receipt.version}`);
      continue;
    }
    const file = path.join(repo, "dist/npm", receipt.version, artifact.file);
    const args = [
      "publish",
      file,
      "--access",
      "public",
      "--tag",
      tag,
      `--registry=${registry}`,
      "--ignore-scripts",
    ];
    if (dryRun) args.push("--dry-run");
    run("npm", args);
  }
  console.log(
    dryRun ? "Dry run complete. Nothing published." : `Published ${receipt.version} with tag ${tag}.`,
  );
}
export async function main(args) {
  assert.ok(
    (args.length === 1 && ["prepare", "publish"].includes(args[0])) ||
      (args.length === 2 && args[0] === "publish" && args[1] === "--dry-run"),
    "Usage: release.mjs prepare | publish [--dry-run]",
  );
  if (args[0] === "prepare") await prepare();
  else await publish(args.includes("--dry-run"));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
