#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const files = execFileSync("git", ["ls-files", "videos/*/src/fonts/fonts.css"], { encoding: "utf8" })
  .trim()
  .split("\n");
const families = new Map();
for (const file of files)
  for (const block of fs.readFileSync(file, "utf8").matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const name = /font-family:\s*['"]([^'"]+)/.exec(block[1])?.[1],
      url = /url\(['"]?([^)'"\s]+)/.exec(block[1])?.[1];
    if (!name || !url) throw new Error(`Cannot identify font in ${file}`);
    const entries = families.get(name) ?? new Set();
    entries.add(path.join(path.dirname(file), url));
    families.set(name, entries);
  }
const resp = await fetch("https://api.github.com/repos/google/fonts/commits/main");
if (!resp.ok) throw new Error(`Font upstream: ${resp.status}`);
const revision = (await resp.json()).sha,
  inventory = [];
for (const [family, files] of families) {
  const slug = family.toLowerCase().replaceAll(" ", ""),
    url = `https://raw.githubusercontent.com/google/fonts/${revision}/ofl/${slug}/OFL.txt`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Font license ${family}: ${r.status}`);
  const license = await r.text();
  if (!license.includes("SIL OPEN FONT LICENSE")) throw new Error(`Unexpected license for ${family}`);
  const dir = `third-party/fonts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/OFL.txt`, license);
  inventory.push({
    family,
    license: "OFL-1.1",
    licenseFile: `${dir}/OFL.txt`,
    source: url,
    files: [...files].map((file) => ({
      file,
      sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    })),
  });
}
fs.writeFileSync(
  "third-party/fonts/manifest.json",
  JSON.stringify({ revision, fonts: inventory }, null, 2) + "\n",
);
console.log(`Recorded licenses for ${families.size} font families.`);
