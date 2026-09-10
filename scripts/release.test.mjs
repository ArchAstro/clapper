import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { main, orderArtifacts, publicationState, verifyFiles } from "./release.mjs";

test("platforms precede music, core and CLI; missing or duplicate packages fail", () => {
  const names = ["@clapper/cli", "@clapper/core", "@clapper/music", "@clapper/launcher-darwin-arm64"];
  const artifacts = names.map((name) => ({ name }));
  assert.deepEqual(
    orderArtifacts(artifacts, ["darwin-arm64"]).map((a) => a.name),
    names.toReversed(),
  );
  assert.throws(() => orderArtifacts(artifacts.slice(1), ["darwin-arm64"]));
  assert.throws(() => orderArtifacts([...artifacts.slice(1), artifacts[1]], ["darwin-arm64"]));
});
test("resume skips identical published bytes and rejects version collisions", () => {
  assert.equal(publicationState(null, "sha512-match"), "publish");
  assert.equal(publicationState("sha512-match", "sha512-match"), "skip");
  assert.throws(() => publicationState("sha512-other", "sha512-match"));
});
test("prepared artifacts cannot change or escape the repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-release-test-"));
  try {
    fs.writeFileSync(path.join(root, "package.tgz"), "original");
    const files = [{ path: "package.tgz", sha256: createHash("sha256").update("original").digest("hex") }];
    verifyFiles(root, files);
    fs.writeFileSync(path.join(root, "package.tgz"), "changed");
    assert.throws(() => verifyFiles(root, files), /Artifact changed/);
    assert.throws(() => verifyFiles(root, [{ path: "../outside", sha256: "" }]), /escapes/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("unknown publish flags fail rather than silently publishing", async () => {
  await assert.rejects(main(["publish", "--dryrun"]), /Usage/);
});

test("CLI preparation gates publication and forwards dry-run to every package", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-release-cli-"));
  try {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.mkdirSync(path.join(root, "bin"));
    fs.copyFileSync(new URL("./release.mjs", import.meta.url), path.join(root, "scripts/release.mjs"));
    fs.writeFileSync(path.join(root, ".gitignore"), "dist/\ncommands.log\n");
    // Only orchestration is under test here; native builds have their own acceptance suites.
    const stub = `#!${process.execPath}
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync('commands.log', JSON.stringify([command, ...args]) + '\\n');
if (process.env.CLAPPER_TEST_FAIL === args[0]) process.exit(1);
if (command === 'pnpm' && args[0] === 'pack:npm') {
  const platform = process.platform + '-' + process.arch;
  const version = '1.0.0';
  fs.mkdirSync('dist/npm/' + version, {recursive:true});
  const names = ['@clapper/cli', '@clapper/music', '@clapper/core', '@clapper/launcher-' + platform];
  const artifacts = names.map((name, i) => ({name, file: i + '.tgz', integrity:'sha512-test'}));
  for (const a of artifacts) fs.writeFileSync('dist/npm/' + version + '/' + a.file, 'fixture');
  fs.writeFileSync('dist/runtime.tgz', 'fixture');
  fs.writeFileSync('dist/launcher', 'fixture');
  fs.writeFileSync('dist/npm/' + version + '/artifacts.json', JSON.stringify({version, platforms:[platform], artifacts}));
  const sourceRevision = cp.execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
  fs.writeFileSync('dist/manifest-' + platform + '.json', JSON.stringify({version, sourceRevision, runtime:{file:'runtime.tgz', url:'https://example.invalid/runtime'}, launcher:{file:'launcher'}}));
}
`;
    for (const tool of ["pnpm", "go", "npm"])
      fs.writeFileSync(path.join(root, "bin", tool), stub, { mode: 0o755 });
    for (const args of [
      ["init", "--quiet"],
      ["add", "."],
      ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "fixture"],
    ])
      execFileSync("git", args, { cwd: root });
    const env = { ...process.env, PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}` };
    const invoke = (args, extra = {}) =>
      spawnSync(process.execPath, ["scripts/release.mjs", ...args], {
        cwd: root,
        env: { ...env, ...extra },
        encoding: "utf8",
      });
    assert.equal(invoke(["publish", "--dry-run"]).status, 1);
    const prepared = invoke(["prepare"]);
    assert.equal(prepared.status, 0, prepared.stderr);
    assert.ok(fs.existsSync(path.join(root, "dist/release-prepared.json")));
    const preview = invoke(["publish", "--dry-run"]);
    assert.equal(preview.status, 0, preview.stderr);
    const commands = fs
      .readFileSync(path.join(root, "commands.log"), "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    const publishes = commands.filter((c) => c[0] === "npm");
    assert.equal(publishes.length, 4);
    assert.ok(publishes.every((c) => c.includes("--dry-run") && c.includes("--ignore-scripts")));
    assert.deepEqual(
      publishes.map((c) => path.basename(c[2])),
      ["3.tgz", "1.tgz", "2.tgz", "0.tgz"],
    );
    assert.equal(invoke(["prepare"], { CLAPPER_TEST_FAIL: "check" }).status, 1);
    assert.ok(!fs.existsSync(path.join(root, "dist/release-prepared.json")), "Failure invalidates approval");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
