# Standalone Clapper

Clapper ships as a native launcher plus a versioned runtime archive. The **end user needs no Node, npm, pnpm, Go, or Clapper checkout**. First use downloads the runtime; subsequent commands use its local cache. The launcher embeds the archive SHA-256 and installs under an OS cache directory atomically, with a process lock for concurrent first runs.

## Build and try locally

Build-machine prerequisites: Node 24+, the repo's pinned pnpm, Go 1.24+, and tar. Build on the target OS/architecture; native dependencies and browser builds cannot simply be cross-compiled with the Go launcher. Apple Silicon is the first acceptance-tested target.

```fish
node scripts/build-release.mjs
node scripts/test-standalone.mjs

# Use the two local artifacts before a GitHub release is published.
set -lx CLAPPER_RUNTIME_URL "file://$PWD/dist/clapper-runtime-0.2.0-dev.1-darwin-arm64.tar.gz"
./dist/clapper-darwin-arm64 new /tmp/my-film --template comic
cd /tmp/my-film
/absolute/path/to/clapper-darwin-arm64 preview
/absolute/path/to/clapper-darwin-arm64 render
/absolute/path/to/clapper-darwin-arm64 review
```

Place the launcher on your PATH as `clapper` for everyday use. The Fish environment override can be removed after the runtime is cached. Default runtime cache: macOS `~/Library/Caches/clapper/<sha256>`; Linux `$XDG_CACHE_HOME/clapper/<sha256>` or `~/.cache/clapper/<sha256>`. `CLAPPER_HOME` selects another cache root. `clapper runtime path` prints the selected runtime; `clapper --version` and `--help` do not download it.

The runtime includes Node 24.21.0 and npm, the installed locked workspace dependencies, React/core/CLI, matching Playwright Chromium and Headless Shell, ffmpeg-static, starter templates, and the Clapper skill. macOS launchers are ad-hoc signed by the build; Developer ID signing/notarization is a separate release step, not something the local build claims to provide.

## Projects

```fish
clapper new launch-film                    # basic three-scene starter + score
clapper new launch-film --template comic   # editable character/comic starter
cd launch-film
clapper preview
clapper still --scene intro --every 6
clapper render --draft
clapper render -o out/final.mp4
clapper review --video out/final.mp4
clapper add clsx@2.1.1
clapper install
clapper doctor
```

`--scene intro` is the comic starter's opening; the basic starter calls it `hook`. `clapper compositions --json` lists actual IDs and scene maps. Explicit entry paths and composition options still work for existing workspace projects.

1. `clapper.json` pins the runtime version, entry, and default composition. Commands from nested project folders resolve the same config and put outputs under the project root. A version mismatch stops with instructions to use the matching launcher; the initial implementation does not silently upgrade or migrate projects.
2. Sources, theme, data, config, `package.json`, and `package-lock.json` are portable and should be committed. Generated dependencies refer to bundled packages through a relative `.clapper/runtime` link; there are no `workspace:*` or author-machine absolute paths. The local link and `node_modules` are ignored and restored by `clapper install`.
3. The starter dependency closure is bundled, so project creation works with an empty offline npm cache after runtime installation. `clapper add` uses bundled Node/npm for additional libraries, saves exact versions and a lockfile, and requires registry access for uncached packages. `clapper install` uses `npm ci` when a lock exists; it can restore offline once those packages are cached.
4. Dependency lifecycle scripts are disabled by default. `--allow-scripts` enables them for dependencies that require a build. Native libraries may additionally need OS build tools; Clapper does not ship a C/C++ toolchain.
5. Each harness invocation owns its own scratch directory. Concurrent still/render/review builds do not delete one another. Use distinct output paths when running jobs concurrently; don't edit source during a review round.

## Runtime integrity and distribution

The builder writes a native executable, `clapper-runtime-<version>-<platform>.tar.gz`, and `manifest-<platform>.json` with their checksums. `CLAPPER_RELEASE_VERSION` selects a release version and `CLAPPER_RELEASE_BASE_URL` selects the download base; otherwise the executable points to the matching `ArchAstro/clapper` GitHub release. **Building does not publish anything.** Publish matching artifacts together; never replace a runtime archive behind an already-shipped launcher.

For this private repository, users can provide `GH_TOKEN` with release-read access. The launcher resolves the GitHub asset API itself; it does not need `gh` installed. Alternatively download both artifacts while signed in and use a `file://` override for the runtime. `CLAPPER_RUNTIME_URL` can point to an HTTPS mirror or local file; the digest embedded in the launcher remains mandatory. HTTP is supported only on loopback for the acceptance harness.

Archive contents are verified before extraction; traversal, external symlinks, devices and writing through symlinks are rejected. Downloads/staging never become the active runtime until validation succeeds. Failed installs remove only their temporary directory. A damaged existing cache fails with its exact location rather than deleting it automatically.

The archive retains third-party license files. ffmpeg-static's libx264-enabled builds include GPL components; complete the relevant binary/source distribution obligations before publishing externally. Signing/notarization credentials, a published release, and platform certification are not supplied by the build script. Linux also needs Playwright's supported OS libraries; `doctor` and an actual render should be part of each target's qualification. Windows is not implemented in the POSIX launcher.

## Verification

```fish
go -C launcher test -race ./...
pnpm --dir packages/cli test
pnpm typecheck
node scripts/build-release.mjs
node scripts/test-standalone.mjs
```

The acceptance harness uses a fresh cache, paths with spaces, and `PATH=/usr/bin:/bin`. It serves the archive over loopback, verifies concurrent first install, shuts the server down to prove offline reuse, generates both templates, renders audio, builds the review kit, runs concurrent stills, installs a library, relocates a project from only its portable files, checks version mismatch rejection, and starts preview. This proves independence from system Node/pnpm and the checkout at runtime; it is not a claim of testing every clean OS installation or Apple's distribution trust prompts.
