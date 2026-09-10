import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { ensureGithubRelease } from "./release-github.mjs";

const receipt = {
  version: "0.3.0",
  head: "abc123",
  platforms: ["darwin-arm64"],
  runtimeURL: "https://github.com/ArchAstro/clapper/releases/download/v0.3.0/runtime.tgz",
  files: ["runtime.tgz", "launcher", "manifest.json"].map((name) => ({ path: `dist/${name}`, sha256: name })),
};
function fixture(options = {}) {
  let release = options.existing
    ? { id: 1, tag_name: "v0.3.0", draft: false, target_commitish: receipt.head }
    : null;
  let assets = options.existing
    ? receipt.files.map((f) => ({
        name: path.basename(f.path),
        state: "uploaded",
        digest: `sha256:${f.sha256}`,
      }))
    : [];
  if (options.conflict) assets[0].digest = "sha256:different";
  const calls = [];
  const execute = (command, args) => {
    calls.push([command, ...args]);
    assert.equal(command, "gh");
    const endpoint = args[1];
    if (args[0] === "api") {
      if (endpoint === "repos/ArchAstro/clapper")
        return JSON.stringify({ visibility: options.private ? "private" : "public" });
      if (endpoint.includes("/commits/")) return JSON.stringify({ sha: receipt.head });
      if (endpoint.includes("/matching-refs/"))
        return JSON.stringify(
          release && !release.draft
            ? [
                {
                  ref: "refs/tags/v0.3.0",
                  object: { type: "commit", sha: options.wrongTag ? "other" : receipt.head },
                },
              ]
            : [],
        );
      if (endpoint.includes("/assets?")) return JSON.stringify([assets]);
      if (endpoint.includes("/releases?")) return JSON.stringify([release ? [release] : []]);
    }
    if (args[0] === "release" && args[1] === "create") {
      release = { id: 1, tag_name: "v0.3.0", draft: true, target_commitish: receipt.head };
      assert.ok(args.includes("--draft"));
      return "";
    }
    if (args[0] === "release" && args[1] === "upload") {
      assert.ok(!args.includes("--clobber"));
      if (options.uploadFails) throw new Error("Upload interrupted");
      assets = receipt.files.map((f) => ({
        name: path.basename(f.path),
        state: "uploaded",
        digest: `sha256:${f.sha256}`,
      }));
      return "";
    }
    if (args[0] === "release" && args[1] === "edit") {
      release.draft = false;
      return "";
    }
    throw new Error(`Unexpected command: ${args}`);
  };
  const request = async (url, init) => {
    calls.push(["HEAD", url]);
    assert.equal(init.method, "HEAD");
    assert.equal(init.headers, undefined, "Public checks must not carry credentials");
    return { ok: !options.privateDownload, status: options.privateDownload ? 404 : 200 };
  };
  return { calls, root: "/fixture", execute, request };
}
test("creates draft, uploads, verifies, publishes and checks anonymous access", async () => {
  const f = fixture();
  await ensureGithubRelease(receipt, f);
  assert.deepEqual(
    f.calls.filter((c) => c[1] === "release").map((c) => c[2]),
    ["create", "upload", "edit"],
  );
  assert.equal(f.calls.filter((c) => c[0] === "HEAD").length, 3);
});
test("retry of matching release makes no writes", async () => {
  const f = fixture({ existing: true });
  await ensureGithubRelease(receipt, f);
  assert.ok(f.calls.every((c) => c[1] !== "release"));
});
test("digest conflicts, wrong tags and private repositories fail before writes", async () => {
  for (const options of [
    { existing: true, conflict: true },
    { existing: true, wrongTag: true },
    { private: true },
  ]) {
    const f = fixture(options);
    await assert.rejects(ensureGithubRelease(receipt, f));
    assert.ok(f.calls.every((c) => c[1] !== "release"));
  }
});
test("failed upload leaves draft unpublished", async () => {
  const options = { uploadFails: true };
  const f = fixture(options);
  await assert.rejects(ensureGithubRelease(receipt, f), /Upload interrupted/);
  assert.ok(f.calls.every((c) => c[2] !== "edit"));
  options.uploadFails = false;
  await ensureGithubRelease(receipt, f);
  assert.equal(f.calls.filter((c) => c[2] === "create").length, 1, "Retry must resume the draft");
});
test("dry run has no network or GitHub side effects", async () => {
  const f = fixture();
  await ensureGithubRelease(receipt, { ...f, dryRun: true });
  assert.deepEqual(f.calls, []);
});
test("failed anonymous access blocks completion", async () => {
  await assert.rejects(
    ensureGithubRelease(receipt, fixture({ existing: true, privateDownload: true })),
    /not publicly downloadable/,
  );
});
