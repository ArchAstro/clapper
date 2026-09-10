# Public release runbook

These commands publish externally. The build, pack and test scripts do not publish or change repository visibility.

## Everyday CLI workflow

From a clean, committed checkout:

```fish
pnpm release:prepare
pnpm release:publish --dry-run
gh auth login
npm login --registry=https://registry.npmjs.org
pnpm release:publish
```

`release:prepare` installs from the lockfile, runs lint/format, public-source, type, unit and Go checks, builds the runtime/packages, and runs standalone and npm acceptance tests. Only a successful run writes `dist/release-prepared.json`, binding the tested files to their hashes and Git commit. Preparation does not publish anything. Commit source changes before preparation. Publishing consumes these exact prepared artifacts, not subsequent source edits; it prints the source revision being released. Changed artifacts require preparation again. This convenience workflow currently qualifies one native platform per release.

`release:publish` verifies the receipt and artifact hashes, preflights npm authentication/version conflicts, creates or resumes the GitHub release, uploads the launcher/runtime/manifest, verifies remote SHA-256 digests and anonymous downloads, then publishes launchers → music → core → CLI. New GitHub releases stay drafts until every upload is verified. Existing tags must point at the prepared commit; existing assets must match byte-for-byte and are never overwritten. It uses `latest` for stable npm versions and `next` for prereleases (also marked prerelease on GitHub). A retry skips already-published npm versions only when their registry integrity matches. Publication is not atomic: after a network/authentication failure, rerun the same command with the same prepared artifacts to resume.

One-time setup: make the repository public explicitly and authenticate with GitHub and npm. The wrapper never changes repository visibility or logs in for you. Push the prepared commit before publishing. GitHub credentials need release-write permission; npm credentials need publishing rights in the `@archastro` scope. Do not rebuild a version after any release asset/package has been published; use the original prepared artifacts or choose a new version.

`--dry-run` validates prepared files, prints the planned GitHub operation and runs npm's publication preview without external writes; it skips remote availability/authentication checks, so it is not proof of publishing permissions. Unknown flags are rejected. In CI, provide `GH_TOKEN` with contents-write permission and npm credentials through the runner's npm configuration instead of interactive login; scripts return nonzero on failure. Interactive npm authentication may require 2FA. The lower-level commands below remain available for diagnosis, not as extra steps in the normal workflow.

## 1. Prepare an immutable candidate

The first qualified target is macOS Apple Silicon. Node 24+, pnpm 11.7.0, Go 1.24+, CMake, a C/C++ compiler, make, curl and pkg-config are build prerequisites. Linux/Intel can build natively, but only advertise platforms whose packaged integration tests have passed. Windows is not implemented.

From a clean checkout of the commit being released (Fish shell):

```fish
set -lx CLAPPER_RELEASE_VERSION 0.3.1
pnpm install --frozen-lockfile
pnpm check
pnpm check:public
pnpm typecheck
pnpm test
go -C launcher test -race ./...
pnpm build:standalone
pnpm pack:npm
pnpm test:standalone
pnpm test:npm
```

Stable builds/packing reject an uncommitted tree or a runtime from another commit. Use a unique prerelease version (for example `0.3.1-rc.1`) for development verification. Never reuse a published version or replace an archive behind a released launcher's embedded digest.

Artifacts are in `dist/` and `dist/npm/0.3.1/`. Each npm package includes MIT licensing; the runtime includes third-party notices, an inventory, and matching FFmpeg/x264 and sfizz source inputs/build instructions. The encoder build explicitly excludes nonfree components. The bundled encoder supports H.264/AAC and native ProRes; H.265/VP9 exports require a separately supplied FFmpeg with those encoders (`CLAPPER_FFMPEG`).

## 2. Make the runtime available before npm

`pnpm release:publish` performs this step automatically. The manual equivalent below is only for troubleshooting. Repository visibility is a one-time explicit setup step, not changed by the script. The CLI's first real command downloads this runtime archive.

```fish
gh release create v0.3.1 \
  ./dist/clapper-darwin-arm64 \
  ./dist/clapper-runtime-0.3.1-darwin-arm64.tar.gz \
  ./dist/manifest-darwin-arm64.json \
  --repo ArchAstro/clapper \
  --target (git rev-parse HEAD) \
  --title 'Clapper 0.3.1' \
  --notes 'Initial Apple Silicon release. Includes the runtime, corresponding source archives, licenses and checksums.'
```

Source archives and licenses are inside the runtime, so they stay alongside the binaries when downloaded. Retain them if mirroring/repackaging. macOS artifacts are ad-hoc signed; Developer ID signing/notarization requires the owner's Apple credentials and is not claimed by this build.

## 3. Publish npm packages in dependency order

You need permission to publish in the **@archastro npm scope**. GitHub organization ownership alone does not grant this. Authenticate and verify membership before publishing; if the scope is not yours, resolve the namespace before building/publishing rather than publishing lookalike package names.

```fish
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
npm org ls archastro --registry=https://registry.npmjs.org

npm publish ./dist/npm/0.3.1/archastro-clapper-launcher-darwin-arm64-0.3.1.tgz --access public --tag latest
npm publish ./dist/npm/0.3.1/archastro-clapper-music-0.3.1.tgz --access public --tag latest
npm publish ./dist/npm/0.3.1/archastro-clapper-core-0.3.1.tgz --access public --tag latest
npm publish ./dist/npm/0.3.1/archastro-clapper-0.3.1.tgz --access public --tag latest
```

Use `--tag next` for prereleases. If building more platforms, publish every platform package listed in `artifacts.json` before the CLI. npm may request browser/2FA confirmation. Run these commands on the generated tarballs, not `npm publish --workspaces` or the raw workspace CLI package.

## 4. Verify public access

```fish
npm view @archastro/clapper@0.3.1 version
npx --yes @archastro/clapper@0.3.1 --version
env -u GH_TOKEN CLAPPER_HOME=(mktemp -d) npx --yes @archastro/clapper@0.3.1 runtime path
```

The last command uses a fresh runtime cache without GitHub credentials. Then create a new project and render a short video on a clean machine. Source CI and local tarball tests do not prove that registry permissions or remote release asset visibility are correct.
