import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Preserve pnpm's resolved versions, but copy only the production dependency
// graph plus the compiler/types used by generated projects. Never ship the
// build machine's entire node_modules (linters, test runners, stale binaries).
export function copyRuntimeDependencies(repo, root) {
  const visited = new Set();
  function locate(name, parent) {
    const req = createRequire(path.join(parent, "package.json"));
    for (const base of req.resolve.paths(name) ?? []) {
      const candidate = path.join(base, name);
      if (fs.existsSync(path.join(candidate, "package.json"))) return fs.realpathSync(candidate);
    }
    throw new Error(`Missing runtime dependency ${name} from ${path.relative(repo, parent)}`);
  }
  function target(source) {
    const rel = path.relative(repo, source);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Runtime dependency outside checkout");
    return path.join(root, rel);
  }
  function link(parent, name, dependency) {
    const dest = path.join(parent, "node_modules", name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.symlinkSync(path.relative(path.dirname(dest), target(dependency)), dest);
  }
  function visit(source) {
    if (visited.has(source)) return;
    visited.add(source);
    const metadata = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
    const dest = target(source);
    if (!fs.existsSync(dest))
      fs.cpSync(source, dest, {
        recursive: true,
        verbatimSymlinks: true,
        filter: (p) => path.basename(p) !== "node_modules",
      });
    const required = {
      ...metadata.dependencies,
      ...Object.fromEntries(
        Object.entries(metadata.peerDependencies ?? {}).filter(
          ([name]) => !metadata.peerDependenciesMeta?.[name]?.optional,
        ),
      ),
    };
    for (const [name, optional] of [
      ...Object.keys(required).map((n) => [n, false]),
      ...Object.keys(metadata.optionalDependencies ?? {}).map((n) => [n, true]),
    ]) {
      let dependency;
      try {
        dependency = locate(name, source);
      } catch (error) {
        if (optional) continue;
        throw error;
      }
      visit(dependency);
      link(dest, name, dependency);
    }
  }
  for (const pkg of ["core", "cli", "music"]) visit(path.join(repo, "packages", pkg));
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom", "typescript"]) {
    const dependency = locate(name, name === "typescript" ? repo : path.join(repo, "packages/core"));
    visit(dependency);
    link(root, name, dependency);
  }
  return visited.size;
}
