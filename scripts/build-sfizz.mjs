#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(repo, ".clapper/toolchain");
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, "sfizz-source.tar.gz"),
  version = "1.2.3";
const expected = "a9339eac7620d7f0f6b44bdfe860680fab73e66efad4b5f15b21198dd9436822";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if (!fs.existsSync(source) || hash(source) !== expected) {
  const r = await fetch(
    `https://github.com/sfztools/sfizz/releases/download/${version}/sfizz-${version}.tar.gz`,
  );
  if (!r.ok) throw new Error(`sfizz source download failed: ${r.status}`);
  fs.writeFileSync(source, Buffer.from(await r.arrayBuffer()));
}
if (hash(source) !== expected) throw new Error("sfizz source checksum mismatch");
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: repo });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} failed ${r.status}`);
};
const src = path.join(dir, `sfizz-${version}`);
if (!fs.existsSync(src)) run("tar", ["-xzf", source, "-C", dir]);
// The bundled atomic_queue predates Clang 21's diagnosis of a template keyword
// on these non-template functions. This is a syntax correction, not suppression.
const header = path.join(src, "external/atomic_queue/include/atomic_queue/atomic_queue.h");
fs.writeFileSync(
  header,
  fs
    .readFileSync(header, "utf8")
    .replaceAll("Base::template do_pop_any", "Base::do_pop_any")
    .replaceAll("Base::template do_push_any", "Base::do_push_any"),
);
const build = path.join(dir, "build");
run("cmake", [
  "-S",
  src,
  "-B",
  build,
  "-DCMAKE_BUILD_TYPE=Release",
  "-DSFIZZ_JACK=OFF",
  "-DSFIZZ_SHARED=OFF",
  "-DSFIZZ_RENDER=ON",
  "-DENABLE_LTO=OFF",
  "-DCMAKE_POLICY_VERSION_MINIMUM=3.5",
  ...(process.arch === "arm64" ? ["-DPROJECT_SYSTEM_PROCESSOR=aarch64"] : []),
]);
run("cmake", ["--build", build, "--target", "sfizz_render", "-j", "8"]);
const bin = path.join(build, "library/bin/sfizz_render");
console.log(`sfizz ${version}: ${bin}`);
fs.writeFileSync(
  path.join(dir, "sfizz-build.json"),
  JSON.stringify(
    {
      version,
      sourceSHA256: expected,
      platform: `${process.platform}-${process.arch}`,
      binarySHA256: hash(bin),
      patches: [
        "Clang 21 atomic_queue non-template call syntax",
        "arm64 uses AArch64 CPU spelling to avoid ARM32 FPU flags",
      ],
    },
    null,
    2,
  ) + "\n",
);
