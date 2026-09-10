#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
// Build a redistributable encoder and retain its complete matching source inputs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(repo, ".clapper/toolchain/ffmpeg"),
  sources = path.join(root, "sources"),
  prefix = path.join(root, "install");
fs.mkdirSync(sources, { recursive: true });
const inputs = [
  {
    file: "ffmpeg-9.0.1.tar.xz",
    url: "https://ffmpeg.org/releases/ffmpeg-9.0.1.tar.xz",
    sha256: "cf38e0e28c7e5605942c4a77755349b0145804a397af37eb1fb4c77cb237f635",
    folder: "ffmpeg-9.0.1",
  },
  {
    file: "x264.tar.gz",
    url: "https://code.videolan.org/videolan/x264/-/archive/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/x264-b35605ace3ddf7c1a5d67a2eb553f034aef41d55.tar.gz",
    sha256: "cd71a7515b0e9a012e1ac9b1f8415bebcaf6fc97d4db32286642ac4c0fbe24f9",
    folder: "x264-b35605ace3ddf7c1a5d67a2eb553f034aef41d55",
  },
];
const sha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const run = (cmd, args, cwd, env = process.env) => {
  const r = spawnSync(cmd, args, { cwd, env, stdio: "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`);
};
const xargs = [
  `--prefix=${prefix}`,
  "--enable-static",
  "--enable-pic",
  "--disable-cli",
  "--disable-opencl",
  "--disable-lavf",
  "--disable-swscale",
];
const fargs = [
  "--prefix=.",
  "--enable-gpl",
  "--enable-libx264",
  "--disable-nonfree",
  "--disable-version3",
  "--disable-autodetect",
  "--enable-zlib",
  "--enable-static",
  "--disable-shared",
  "--disable-doc",
  "--disable-debug",
  "--disable-ffplay",
  "--pkg-config-flags=--static",
  ...(process.platform === "darwin" ? ["--enable-securetransport"] : []),
];
if (process.arch === "x64" && spawnSync("nasm", ["-v"], { stdio: "ignore" }).status !== 0) {
  xargs.push("--disable-asm");
  fargs.push("--disable-x86asm");
}
const identity = sha(fileURLToPath(import.meta.url)) + `-${process.platform}-${process.arch}`;
const record = path.join(root, "build.json"),
  bin = path.join(prefix, "bin/ffmpeg");
if (fs.existsSync(record) && fs.existsSync(bin)) {
  const m = JSON.parse(fs.readFileSync(record, "utf8"));
  if (
    m.identity === identity &&
    m.binarySHA256 === sha(bin) &&
    inputs.every(
      (i) => fs.existsSync(path.join(sources, i.file)) && sha(path.join(sources, i.file)) === i.sha256,
    )
  ) {
    console.log(`Verified cached FFmpeg: ${bin}`);
    process.exit(0);
  }
}
for (const input of inputs) {
  const dest = path.join(sources, input.file);
  if (!fs.existsSync(dest) || sha(dest) !== input.sha256) {
    run("curl", ["--fail", "--location", "--silent", "--show-error", input.url, "--output", dest], repo);
  }
  if (sha(dest) !== input.sha256) throw new Error(`Source checksum mismatch: ${input.file}`);
  if (!fs.existsSync(path.join(root, input.folder))) run("tar", ["-xf", dest, "-C", root], repo);
}
const xdir = path.join(root, inputs[1].folder),
  fdir = path.join(root, inputs[0].folder);
run("sh", ["./configure", ...xargs], xdir);
run("make", ["-j8"], xdir);
run("make", ["install"], xdir);
const env = {
  ...process.env,
  PKG_CONFIG_LIBDIR: path.join(prefix, "lib/pkgconfig"),
  PKG_CONFIG_PATH: path.join(prefix, "lib/pkgconfig"),
};
run("sh", ["./configure", ...fargs], fdir, env);
run("make", ["-j8"], fdir, env);
run("make", ["install", `DESTDIR=${prefix}/`], fdir, env);
const info = spawnSync(bin, ["-version"], { encoding: "utf8" });
if (info.status !== 0 || info.stdout.includes("--enable-nonfree"))
  throw new Error("Encoder build is not eligible for redistribution");
fs.copyFileSync(path.join(fdir, "COPYING.GPLv2"), path.join(sources, "FFmpeg-COPYING.GPLv2"));
fs.copyFileSync(path.join(xdir, "COPYING"), path.join(sources, "x264-COPYING"));
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(sources, "build-ffmpeg.mjs"));
fs.writeFileSync(
  record,
  JSON.stringify(
    {
      identity,
      license: "GPL-2.0-or-later",
      inputs,
      configure: { x264: xargs.map((a) => a.replace(prefix, "<build-prefix>")), ffmpeg: fargs },
      platform: `${process.platform}-${process.arch}`,
      binarySHA256: sha(bin),
      versionOutput: info.stdout,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Built redistributable FFmpeg: ${bin}`);
