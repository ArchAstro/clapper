import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { removeHarness, writeHarnessDir } from "../src/bundle.ts";
import { createProject, findConfig, linkRuntime } from "../src/project.ts";

const roots: string[] = [];
function temp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-project-test-"));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
describe("portable projects", () => {
  it("discovers config from nested directories and rejects escaping entries", () => {
    const dir = temp();
    const nested = path.join(dir, "src/scenes");
    fs.mkdirSync(nested, { recursive: true });
    const config = { runtime: "1.2.3", entry: "src/index.tsx", composition: "spot" };
    fs.writeFileSync(path.join(dir, "clapper.json"), JSON.stringify(config));
    expect(findConfig(nested)).toEqual({ dir, config });
    fs.writeFileSync(path.join(dir, "clapper.json"), JSON.stringify({ ...config, entry: "../outside.tsx" }));
    expect(() => findConfig(nested)).toThrow("inside the project");
  });
  it("relinks a moved project's runtime but never overwrites a real directory", () => {
    const dir = temp(),
      a = temp(),
      b = temp();
    linkRuntime(dir, a);
    linkRuntime(dir, b);
    expect(fs.realpathSync(path.join(dir, ".clapper/runtime"))).toBe(fs.realpathSync(b));
    const other = temp();
    fs.mkdirSync(path.join(other, ".clapper/runtime"), { recursive: true });
    expect(() => linkRuntime(other, a)).toThrow("move the existing directory");
  });
  it("rejects unknown templates before creating anything", () => {
    const target = path.join(temp(), "new");
    expect(() => createProject(target, "missing")).toThrow("Unknown template");
    expect(fs.existsSync(target)).toBe(false);
  });
});
it("isolates invocation scratch and cleans only its owner", () => {
  const dir = temp();
  const target = { entry: path.join(dir, "src/index.tsx"), projectDir: dir, mode: "harness" as const };
  const a = writeHarnessDir(target, true),
    b = writeHarnessDir(target, true);
  expect(a).not.toBe(b);
  removeHarness(path.join(a, "build"));
  expect(fs.existsSync(a)).toBe(false);
  expect(fs.existsSync(b)).toBe(true);
  expect(() => removeHarness(dir)).toThrow("scratch path");
});
