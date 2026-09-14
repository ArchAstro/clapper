import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BudgetExceeded } from "./process.ts";
import type { FileHash } from "./types.ts";
export const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const digest = (value: unknown) => sha(JSON.stringify(value));
export function readJSON<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
export function writeJSON(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
export function inside(root: string, relative: string): string {
  assert.ok(
    typeof relative === "string" && relative.length && !path.isAbsolute(relative),
    "Expected a relative artifact path",
  );
  const base = path.resolve(root),
    result = path.resolve(base, relative);
  assert.ok(result.startsWith(base + path.sep), `Path escapes root: ${relative}`);
  let p = base;
  for (const part of path.relative(base, result).split(path.sep)) {
    p = path.join(p, part);
    if (fs.existsSync(p) || isLink(p))
      assert.ok(!fs.lstatSync(p).isSymbolicLink(), `Symlink not allowed: ${relative}`);
  }
  return result;
}
function isLink(file: string) {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}
export function tree(
  root: string,
  maxBytes = 1024 ** 3,
  ignored = new Set(["node_modules", ".git", ".clapper", "out"]),
): FileHash[] {
  const result: FileHash[] = [];
  let total = 0;
  const visit = (dir: string) => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(dir, entry.name),
        relative = path.relative(root, file).split(path.sep).join("/");
      assert.ok(!entry.isSymbolicLink(), `Symlink not allowed in snapshot: ${relative}`);
      if (entry.isDirectory()) visit(file);
      else {
        assert.ok(entry.isFile(), `Not a regular file: ${relative}`);
        const bytes = fs.statSync(file).size;
        total += bytes;
        if (total > maxBytes) throw new BudgetExceeded(`Snapshot exceeds ${maxBytes} bytes`);
        result.push({ file: relative, sha256: sha(fs.readFileSync(file)), bytes });
      }
    }
  };
  visit(fs.realpathSync(root));
  return result;
}
export function snapshot(source: string, target: string, maxBytes?: number, ignored?: Set<string>) {
  const files = tree(source, maxBytes, ignored);
  assert.ok(!fs.existsSync(target), `Snapshot already exists: ${target}`);
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) {
    const dest = inside(target, file.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(inside(source, file.file), dest);
  }
  verify(target, files);
  return files;
}
export function verify(root: string, files: FileHash[]) {
  for (const f of files) {
    const file = inside(root, f.file);
    assert.ok(
      fs.existsSync(file) &&
        fs.statSync(file).isFile() &&
        fs.statSync(file).size === f.bytes &&
        sha(fs.readFileSync(file)) === f.sha256,
      `Artifact changed or missing: ${f.file}`,
    );
  }
}
export function record(root: string, relative: string): FileHash {
  const file = inside(root, relative);
  return { file: relative, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) };
}
export function id(value: unknown, field: string): asserts value is string {
  assert.ok(typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(value), `Invalid ${field}`);
}
export function textField(value: unknown, field: string): asserts value is string {
  assert.ok(typeof value === "string" && value.trim().length > 0, `Missing ${field}`);
}
export function finite(value: unknown, field: string, min = 0, max = Infinity): asserts value is number {
  assert.ok(
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max,
    `Invalid ${field}`,
  );
}
export const html = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
