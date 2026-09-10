# Bootstrap before production

The user installed a skill, not a development toolchain. Own setup; do not send them back to a Clapper installation guide or ask them to run ordinary setup commands. State the chosen project directory and any significant download once, then proceed within the request and execution permissions. Do not use sudo, change shell profiles, install system package managers, overwrite projects, migrate pinned runtimes, or publish anything without separate authority.

## 1. Inspect, then choose a route

1. Read workspace instructions and Git status. Locate the requested project, including ancestor `clapper.json` when the working directory is a subdirectory. An existing framework workspace (`packages/core` and `packages/cli`) uses the source route below. Otherwise prefer standalone; a source checkout is not required.
2. Detect OS/architecture and available `node`, `npm`, and `clapper`. Inspect an existing command's origin and version; do not confuse Clapper with unrelated packages. Existing projects must keep the exact `clapper.json.runtime`. For a new project, resolve a current stable release rather than guessing a version. Verify that release has an asset for this host before promising support; macOS Apple Silicon is the initially verified target. Windows launchers are not implemented.
3. If a compatible launcher is already available, reuse it and run the verification sequence below. Otherwise use the npm helper when Node 20+ and npm exist. Without those, use the native route; Clapper's managed runtime includes Node/npm, Chromium, FFmpeg and sfizz.

## 2. npm route: one helper

Resolve this installed skill's directory (not the user's working directory), then run:

```sh
node /absolute/path/to/installed/clapper/scripts/bootstrap.mjs /absolute/path/to/my-film --template basic
```

Choose `comic` only when it fits the brief. For an existing standalone project, pass its root directory. The helper resolves and pins `@archastro/clapper`, runs it through npm's cache without a global install, downloads the checksum-verified managed runtime, creates/restores the project, runs doctor, validates its composition and writes a first-frame proof. It refuses existing non-project directories and never changes a runtime pin. A first install downloads hundreds of MB; don't mistake a quiet download for a hang.

Use the exact command array printed at completion for subsequent `preview`, `render`, `review`, `score` and `instruments` commands. For example, with the actual resolved version substituted:

```sh
npm exec --yes --package=@archastro/clapper@VERSION -- clapper preview
```

Run project commands with the project root as `workdir`. `clapper` in the other skill references means this resolved command prefix, not a requirement to install a global executable. Use `clapper add` for additional project libraries; don't install core or music separately from the managed runtime.

## 3. Native route: no system Node/npm

1. Read the release metadata from `https://api.github.com/repos/ArchAstro/clapper/releases/latest`, or `/releases/tags/v<VERSION>` for a pinned project. Use the agent's HTTP tools or `curl --fail --location`; no npm account or GitHub login is required for public downloads. Map Darwin→`darwin`, Linux→`linux`, arm64/aarch64→`arm64`, x86_64→`x64`. Stop with the exact unsupported-platform gap when no matching release assets exist; don't run a binary built for another host.
2. Download that release's `manifest-<platform>.json` into a fresh temporary directory. Read its JSON with your available tools. Check its version/platform and resolve the launcher filename and SHA-256. Only download the named `clapper-<platform>` asset from that exact `ArchAstro/clapper` release over HTTPS.
3. Verify the downloaded launcher with `shasum -a 256` or `sha256sum` against the manifest **before executing it**. Never execute an unchecked download or pipe network content to a shell. Put the verified launcher in a new versioned, user-writable tool/cache directory; do not replace an unrelated existing `clapper`. Use its absolute path, without editing PATH or shell profiles.
4. Make that file executable and run `--version`, then `runtime path`. The launcher verifies and installs the matching runtime archive. Keep the exact executable path and version for the session.

## 4. Verify and continue, not just install

With the resolved command prefix:

1. New film: `clapper new <unused-directory> --template basic|comic`. Existing standalone project: `clapper install` from its root. Never run `new` over existing work.
2. Run `clapper doctor` and `clapper compositions --json` from the project. Select the configured/requested composition explicitly. Render frame 0 into a new `out/bootstrap-*` path and inspect it. The helper already runs these checks; do not repeat them blindly.
3. For music, run `clapper instruments list --json`, select real preset IDs by range/license/download size, and read [music.md](music.md). `instruments audition <id>` and score preparation obtain the required samples; download only the chosen instruments, not the entire catalog. No system sampler or DAW setup is needed with the managed runtime.
4. Obtain API details from the installed runtime path: `packages/core/src`, `packages/music/dist`, `packages/cli/src`, `docs/music.md`, and the bundled templates. Keep authoring files in the project; do not edit the cached runtime. Checkout-only examples are optional inspiration, not setup dependencies. If needed, read specific examples from the official GitHub repo at the installed version's tag; don't clone the whole framework merely to render a film.
5. Resume the actual request using the main skill's picture, music and review workflow. Setup is complete only when the requested project works; a successful `--version` alone isn't enough. Preview belongs in the user's main Chrome profile, with automated tests isolated.

## 5. Source workspace or a real blocker

When the user is working on Clapper itself or an existing `workspace:*` video, use that checkout: inspect its package scripts; install Node 24+ and the declared pnpm version only through an existing user-approved tool manager; run `pnpm install --frozen-lockfile`, `pnpm --dir packages/cli exec playwright install chromium`, then doctor from the actual video package. Build FFmpeg with `node scripts/build-ffmpeg.mjs` (or use compatible system FFmpeg). Build sfizz with `node scripts/build-sfizz.mjs` only for sampled music. Use the checkout's `CONTRIBUTING.md` and `docs/guide.md` for prerequisites/API details. Do not replace an existing development project with a standalone template.

A public-package 404, unavailable release, unsupported host, checksum mismatch, denied permission, insufficient disk, or missing native build tool is a concrete blocker—not permission to substitute an unrelated package, use unverified binaries, or silently migrate versions. Inspect the failing layer, try a supported route where available, and ask for only the missing decision/permission. If a helper fails after creating a project, preserve it and resume from the failed check; don't delete the user's new work to start over.
