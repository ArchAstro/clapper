#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
// Assemble publishable tarballs without publishing or modifying workspace manifests.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(repo, "dist");
const manifests = fs
  .readdirSync(dist)
  .filter((n) => /^manifest-(darwin|linux)-(arm64|x64)\.json$/.test(n))
  .sort()
  .map((n) => JSON.parse(fs.readFileSync(path.join(dist, n), "utf8")));
if (!manifests.length) throw new Error("Build at least one platform first: node scripts/build-release.mjs");
const version = manifests[0].version;
if (manifests.some((m) => !m.releaseReady || !m.sourceRevision))
  throw new Error("Rebuild artifacts with the public-release builder first.");
if (!version.includes("-")) {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" });
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: repo, encoding: "utf8" });
  if (
    head.status !== 0 ||
    status.status !== 0 ||
    status.stdout.trim() ||
    manifests.some((m) => m.sourceRevision !== head.stdout.trim())
  )
    throw new Error("Stable npm packages must match a clean, committed runtime build.");
}
if (manifests.some((m) => m.version !== version))
  throw new Error("All platform manifests must have the same release version");
const out = path.join(dist, "npm", version);
fs.mkdirSync(out, { recursive: true });
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-npm-pack-"));
const artifacts = [];
const common = {
  version,
  license: "MIT",
  repository: { type: "git", url: "git+https://github.com/ArchAstro/clapper.git" },
  publishConfig: { access: "public", registry: "https://registry.npmjs.org" },
};
function pack(dir, metadata) {
  for (const name of ["LICENSE", "NOTICE.md"]) {
    fs.copyFileSync(path.join(repo, name), path.join(dir, name));
  }
  metadata.files = [...(metadata.files ?? []), "LICENSE", "NOTICE.md"];
  if (metadata.os) {
    fs.copyFileSync(path.join(dist, "Go-LICENSE"), path.join(dir, "Go-LICENSE"));
    metadata.files.push("Go-LICENSE");
  }
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(metadata, null, 2) + "\n");
  const r = spawnSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", out], {
    cwd: dir,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`npm pack failed: ${r.stderr}`);
  const result = JSON.parse(r.stdout)[0];
  artifacts.push({ name: metadata.name, file: result.filename, integrity: result.integrity });
}
try {
  for (const m of manifests) {
    const source = path.join(dist, m.launcher.file);
    const hash = createHash("sha256").update(fs.readFileSync(source)).digest("hex");
    if (hash !== m.launcher.sha256) throw new Error(`Launcher checksum mismatch: ${source}`);
    const dir = path.join(stage, m.platform);
    fs.mkdirSync(path.join(dir, "bin"), { recursive: true });
    fs.copyFileSync(source, path.join(dir, "bin/clapper"));
    fs.chmodSync(path.join(dir, "bin/clapper"), 0o755);
    const [os, cpu] = m.platform.split("-");
    pack(dir, {
      ...common,
      name: `@clapper/launcher-${m.platform}`,
      description: `Clapper native launcher for ${m.platform}`,
      os: [os],
      cpu: [cpu],
      files: ["bin"],
      exports: { "./bin/clapper": "./bin/clapper" },
    });
  }
  const cli = path.join(stage, "cli");
  fs.mkdirSync(path.join(cli, "bin"), { recursive: true });
  fs.copyFileSync(path.join(repo, "distribution/npm/clapper.cjs"), path.join(cli, "bin/clapper.cjs"));
  fs.chmodSync(path.join(cli, "bin/clapper.cjs"), 0o755);
  fs.copyFileSync(path.join(repo, "docs/npm.md"), path.join(cli, "README.md"));
  pack(cli, {
    ...common,
    name: "@clapper/cli",
    description: "Create and render React videos with a managed Clapper runtime",
    bin: { clapper: "bin/clapper.cjs" },
    engines: { node: ">=20" },
    files: ["bin", "README.md"],
    optionalDependencies: Object.fromEntries(
      manifests.map((m) => [`@clapper/launcher-${m.platform}`, version]),
    ),
    clapperPlatforms: manifests.map((m) => m.platform),
  });

  const music = path.join(stage, "music");
  fs.mkdirSync(music);
  fs.cpSync(path.join(repo, "packages/music/dist"), path.join(music, "dist"), { recursive: true });
  const musicSource = JSON.parse(fs.readFileSync(path.join(repo, "packages/music/package.json"), "utf8"));
  delete musicSource.scripts;
  delete musicSource.devDependencies;
  pack(music, { ...musicSource, ...common, files: ["dist"] });
  const core = path.join(stage, "core");
  fs.mkdirSync(core);
  fs.cpSync(path.join(repo, "packages/core/src"), path.join(core, "src"), { recursive: true });
  const { devDependencies, scripts, ...source } = JSON.parse(
    fs.readFileSync(path.join(repo, "packages/core/package.json"), "utf8"),
  );
  pack(core, {
    ...source,
    ...common,
    dependencies: { ...source.dependencies, "@clapper/music": version },
    files: ["src"],
  });
  fs.writeFileSync(
    path.join(out, "artifacts.json"),
    JSON.stringify({ version, platforms: manifests.map((m) => m.platform), artifacts }, null, 2) + "\n",
  );
  console.log(`Packed ${artifacts.length} npm artifacts in ${out}\nNo packages published.`);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
