#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platform = `${process.platform}-${process.arch}`;
const manifest = JSON.parse(fs.readFileSync(path.join(repo, `dist/manifest-${platform}.json`), "utf8"));
const packed = path.join(repo, "dist/npm", manifest.version);
const list = JSON.parse(fs.readFileSync(path.join(packed, "artifacts.json"), "utf8"));
const tarball = (name) => path.join(packed, list.artifacts.find((a) => a.name === name).file);
const cli = tarball("@clapper/cli"),
  native = tarball(`@clapper/launcher-${platform}`);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-npm-test-"));
const prefix = path.join(root, "global");
const env = {
  ...process.env,
  CLAPPER_HOME: path.join(root, "runtime"),
  CLAPPER_RUNTIME_URL: `file://${path.join(repo, "dist", manifest.runtime.file)}`,
  npm_config_cache: path.join(root, "npm-cache"),
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_offline: "true",
};
for (const name of ["CLAPPER_RUNTIME", "CLAPPER_VERSION", "NODE_PATH", "NODE_OPTIONS"]) delete env[name];
function run(command, args, cwd = root, extra = {}) {
  console.log(`$ ${path.basename(command)} ${args.join(" ")}`);
  const r = spawnSync(command, args, {
    cwd,
    env: { ...env, ...extra },
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
console.log(`npm acceptance artifacts: ${root}`);
run("npm", ["install", "--global", "--prefix", prefix, "--ignore-scripts", "--offline", native, cli]);
const executable = path.join(prefix, "bin/clapper");
assert.equal(run(executable, ["--version"]).trim(), manifest.version);
assert.equal(fs.existsSync(env.CLAPPER_HOME), false, "version must not download a runtime");
const metadata = JSON.parse(
  fs.readFileSync(path.join(prefix, "lib/node_modules/@clapper/cli/package.json"), "utf8"),
);
assert.ok(!JSON.stringify(metadata).includes("workspace:"));
assert.equal(metadata.optionalDependencies[`@clapper/launcher-${platform}`], manifest.version);
assert.equal(metadata.license, "MIT");
assert.equal(metadata.publishConfig.access, "public");
assert.match(
  fs.readFileSync(path.join(prefix, "lib/node_modules/@clapper/cli/LICENSE"), "utf8"),
  /MIT License/,
);
const project = path.join(root, "npm film");
run(executable, ["new", project, "--template", "comic"]);
run(executable, ["doctor"], project);
run(executable, ["render", "--scene", "intro", "--draft", "-o", "out/intro.mp4"], project);
assert.ok(fs.statSync(path.join(project, "out/intro.mp4")).size > 1000);
run(executable, ["install"], project, { CLAPPER_RUNTIME_URL: "file:///unavailable" });
// npx resolves only the packed artifacts, from an empty directory and fresh cache.
const empty = path.join(root, "npx");
fs.mkdirSync(empty);
const npxArgs = ["exec", "--yes", "--offline", "--package", native, "--package", cli, "--", "clapper"];
assert.equal(
  run("npm", [...npxArgs, "--version"], empty, { npm_config_cache: path.join(root, "npx-cache") }).trim(),
  manifest.version,
);
const npxProject = path.join(empty, "film");
run("npm", [...npxArgs, "new", npxProject], empty, { npm_config_cache: path.join(root, "npx-cache") });
run("npm", [...npxArgs, "still", "--frame", "30"], npxProject, {
  npm_config_cache: path.join(root, "npx-cache"),
});
console.log(
  `PASS: actual global npm install and npx tarballs create projects, render, restore offline, and use the shared runtime.\n${root}`,
);
