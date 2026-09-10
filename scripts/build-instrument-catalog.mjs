#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const commit = "28092772094b2d9f1148d84cea97f4545b8c687d";
const base = `https://raw.githubusercontent.com/sgossner/VSCO-2-CE/${commit}/`;
const response = await fetch(
  `https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/${commit}?recursive=1`,
);
if (!response.ok) throw new Error(`GitHub tree ${response.status}`);
const tree = (await response.json()).tree;
const files = new Map(tree.filter((t) => t.type === "blob").map((t) => [t.path, t]));
const patches = tree.filter((t) => t.path.endsWith(".sfz"));
const instruments = [];
for (const patch of patches) {
  const resp = await fetch(base + encodeURI(patch.path));
  if (!resp.ok) throw new Error(patch.path);
  const body = Buffer.from(await resp.arrayBuffer());
  const sha = createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex");
  if (sha !== patch.sha) throw new Error("Git content mismatch");
  const text = body.toString("utf8").replace(/\r/g, "");
  let prefix = "";
  const paths = [];
  for (const m of text.matchAll(/(?:^|\s)(default_path|sample)=([^\n]+)/g)) {
    const value = m[2].trim().replaceAll("\\", "/");
    if (m[1] === "default_path") prefix = value;
    else paths.push(path.posix.normalize(prefix + value));
  }
  const samples = [...new Set(paths)];
  const assets = samples.map((p) => {
    const item = files.get(p);
    if (!item) throw new Error(`${patch.path}: missing ${p}`);
    return { path: p, sha1: item.sha, bytes: item.size };
  });
  const id = path
    .basename(patch.path, ".sfz")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
  const family = /violin|viola|cello|contrabass/i.test(id)
    ? "strings"
    : /flute|piccolo|oboe|clarinet|bassoon/i.test(id)
      ? "woodwinds"
      : /horn|trumpet|trombone|tuba/i.test(id)
        ? "brass"
        : /piano|upright|organ/i.test(id)
          ? "keys"
          : "percussion";
  const lows = [...text.matchAll(/\blokey=(\d+)/g)].map((m) => Number(m[1]));
  const highs = [...text.matchAll(/\bhikey=(\d+)/g)].map((m) => Number(m[1]));
  instruments.push({
    id,
    name: path.basename(patch.path, ".sfz"),
    family,
    license: "CC0-1.0",
    range: [lows.length ? Math.min(...lows) : 0, highs.length ? Math.max(...highs) : 127],
    keyswitch: id.endsWith("-ks"),
    sfz: patch.path,
    sha1: patch.sha,
    assets,
    bytes: assets.reduce((s, a) => s + a.bytes, 0),
  });
}
const catalog = {
  schema: 1,
  pack: "vsco2-ce",
  version: commit,
  source: "https://github.com/sgossner/VSCO-2-CE",
  baseURL: base,
  license: { id: "CC0-1.0", path: "LICENSE", sha1: files.get("LICENSE").sha },
  instruments,
};
fs.mkdirSync("packages/cli/assets", { recursive: true });
fs.writeFileSync("packages/cli/assets/instruments.json", JSON.stringify(catalog, null, 2) + "\n");
console.log(`${instruments.length} CC0 presets indexed; samples download per instrument.`);
