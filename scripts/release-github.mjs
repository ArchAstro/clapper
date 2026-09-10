import assert from "node:assert/strict";
import path from "node:path";

const repository = "ArchAstro/clapper";
const base = `repos/${repository}`;

export function missingAssets(expected, existing) {
  return expected.filter((file) => {
    const matches = existing.filter((a) => a.name === path.basename(file.path));
    assert.ok(matches.length <= 1, `Duplicate GitHub asset: ${file.path}`);
    if (!matches.length) return true;
    assert.equal(matches[0].state, "uploaded", `Incomplete GitHub asset: ${file.path}`);
    assert.equal(
      matches[0].digest,
      `sha256:${file.sha256}`,
      `GitHub asset differs: ${file.path}; never overwrite a released version`,
    );
    return false;
  });
}

/** Publish only GitHub assets; never npm or repository visibility. Dependencies are injectable for tests. */
export async function ensureGithubRelease(receipt, { root, execute, request = fetch, dryRun = false }) {
  const tag = `v${receipt.version}`;
  const expected = receipt.files.filter((f) => f.path.startsWith("dist/") && !f.path.startsWith("dist/npm/"));
  assert.equal(
    expected.length,
    receipt.platforms.length * 3,
    "Expected launcher, runtime and manifest per platform",
  );
  const runtime = expected.find(
    (f) =>
      receipt.runtimeURL ===
      `https://github.com/${repository}/releases/download/${tag}/${path.basename(f.path)}`,
  );
  assert.ok(runtime, "Runtime URL must point to the prepared GitHub release");
  if (dryRun) {
    console.log(
      `Would create/resume ${repository} ${tag}, upload ${expected.length} assets, and verify public access.`,
    );
    return;
  }
  const api = (endpoint, flags = []) => JSON.parse(execute("gh", ["api", endpoint, ...flags], true));
  const repo = api(base);
  assert.equal(
    repo.visibility,
    "public",
    "Make ArchAstro/clapper public once before releasing; visibility is never changed automatically.",
  );
  assert.equal(
    api(`${base}/commits/${receipt.head}`).sha,
    receipt.head,
    "Push the prepared commit before publishing",
  );
  const checkTag = () => {
    const refs = api(`${base}/git/matching-refs/tags/${tag}`);
    let object = refs.find((r) => r.ref === `refs/tags/${tag}`)?.object;
    for (let depth = 0; object?.type === "tag" && depth < 8; depth++)
      object = api(`${base}/git/tags/${object.sha}`).object;
    if (object) {
      assert.equal(object.type, "commit", "Release tag must resolve to a commit");
      assert.equal(object.sha, receipt.head, "Release tag points to another commit; use a new version");
    }
    return Boolean(object);
  };
  checkTag();
  // Paginated structured reads distinguish missing releases from auth/network failures.
  const releases = api(`${base}/releases?per_page=100`, ["--paginate", "--slurp"]).flat();
  let release = releases.find((r) => r.tag_name === tag);
  if (!release) {
    // Keep incomplete uploads unpublished; a retry resumes this draft.
    // Use the creation response: the releases listing can lag behind a successful write.
    release = api(`${base}/releases`, [
      "--method",
      "POST",
      "-f",
      `tag_name=${tag}`,
      "-f",
      `target_commitish=${receipt.head}`,
      "-f",
      `name=Clapper ${receipt.version}`,
      "-f",
      "body=React video and original music-as-code runtime. Includes matching native sources, licenses and checksums. macOS builds are ad-hoc signed.",
      "-F",
      "draft=true",
      "-F",
      `prerelease=${receipt.version.includes("-")}`,
    ]);
    assert.ok(release.id && release.tag_name === tag, "Unexpected GitHub creation response");
  }
  // Drafts may not have created their tag yet. Refuse a draft aimed at other source.
  if (release.draft)
    assert.equal(release.target_commitish, receipt.head, "Existing draft targets another commit");
  else assert.ok(checkTag(), "Published release tag is missing");
  const readAssets = () =>
    api(`${base}/releases/${release.id}/assets?per_page=100`, ["--paginate", "--slurp"]).flat();
  const missing = missingAssets(expected, readAssets());
  if (missing.length)
    execute("gh", [
      "release",
      "upload",
      tag,
      ...missing.map((f) => path.join(root, f.path)),
      "--repo",
      repository,
    ]);
  assert.equal(missingAssets(expected, readAssets()).length, 0, "GitHub upload incomplete");
  if (release.draft) execute("gh", ["release", "edit", tag, "--repo", repository, "--draft=false"]);
  assert.ok(checkTag(), "Published release tag is missing");
  // Anonymous checks: end users must be able to download every release asset.
  for (const file of expected) {
    const url = `https://github.com/${repository}/releases/download/${tag}/${path.basename(file.path)}`;
    const response = await request(url, { method: "HEAD", signal: AbortSignal.timeout(30000) });
    assert.ok(
      response.ok,
      `GitHub asset is not publicly downloadable (${response.status}): ${url}; retry publishing`,
    );
  }
  console.log(`GitHub release verified: https://github.com/${repository}/releases/tag/${tag}`);
}
