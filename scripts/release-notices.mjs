import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function releaseNotices(repo, root) {
  for (const name of ["LICENSE", "NOTICE.md", "third-party", "docs/music.md"]) {
    const dest = path.join(root, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(path.join(repo, name), dest, { recursive: true });
  }
  const licenses = path.join(root, "licenses");
  fs.mkdirSync(licenses, { recursive: true });
  const goRoot = execFileSync("go", ["env", "GOROOT"], { encoding: "utf8" }).trim();
  fs.copyFileSync(path.join(goRoot, "LICENSE"), path.join(licenses, "Go-LICENSE"));
  const deps = [];
  function walk(dir) {
    const metadata = path.join(dir, "package.json");
    if (fs.existsSync(metadata)) {
      const p = JSON.parse(fs.readFileSync(metadata, "utf8"));
      if (p.name === "ffmpeg-static") throw new Error("Refusing to package the old unverified FFmpeg binary");
      if (p.name && p.version)
        deps.push({
          name: p.name,
          version: p.version,
          license: p.license ?? p.licenses ?? null,
          path: path.relative(root, dir),
          notices: fs.readdirSync(dir).filter((n) => /^(license|copying|notice)/i.test(n)),
        });
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }))
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
  }
  walk(path.join(root, "node_modules"));
  fs.writeFileSync(path.join(licenses, "javascript-dependencies.json"), JSON.stringify(deps, null, 2) + "\n");
}
