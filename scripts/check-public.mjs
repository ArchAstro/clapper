import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

for (const file of ["LICENSE", "NOTICE.md", "CONTRIBUTING.md", "SECURITY.md", "biome.json", ".editorconfig"])
  assert.ok(fs.existsSync(file), `Missing ${file}`);
assert.match(fs.readFileSync("LICENSE", "utf8"), /MIT License/);
for (const file of [
  "package.json",
  "packages/core/package.json",
  "packages/cli/package.json",
  "packages/music/package.json",
]) {
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(p.license, "MIT", `${file}: missing license`);
  assert.ok(!p.dependencies?.["ffmpeg-static"], `${file}: unverified encoder dependency`);
}
const fonts = JSON.parse(fs.readFileSync("third-party/fonts/manifest.json", "utf8"));
const covered = new Set();
for (const font of fonts.fonts) {
  assert.match(fs.readFileSync(font.licenseFile, "utf8"), /SIL OPEN FONT LICENSE/);
  for (const asset of font.files) {
    assert.equal(
      createHash("sha256").update(fs.readFileSync(asset.file)).digest("hex"),
      asset.sha256,
      `Font changed: ${asset.file}`,
    );
    covered.add(asset.file);
  }
}
const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean),
  ),
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (/\.woff2?$/.test(file)) assert.ok(covered.has(file), `Font has no license inventory entry: ${file}`);
  if (/\.(md|[cm]?js|tsx?|json|ya?ml|go)$/.test(file)) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!/\/Users\/[a-zA-Z][^\s/]*\//.test(text), `Personal absolute path in ${file}`);
    assert.ok(!/~\/\.claude\/projects\//.test(text), `Private transcript reference in ${file}`);
  }
}
console.log(
  `Public-source checks passed: ${fonts.fonts.length} font licenses, package metadata, portable paths.`,
);
