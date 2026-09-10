# Install Clapper with npm or npx

Once the release's packages are published to an npm registry you can access:

```sh
npm install -g @archastro/clapper
clapper new my-film --template comic
cd my-film
clapper preview
clapper render
clapper review
clapper add clsx
```

Or run without a global install:

```sh
npx @archastro/clapper new my-film
cd my-film
npx @archastro/clapper preview
```

Pin the CLI version for reproducible invocations, matching `clapper.json` (for example `npx @archastro/clapper@0.3.1 render`). The npm shim needs Node 20+; it starts the platform-specific native launcher, which manages its own pinned Node 24, browser, ffmpeg, templates and dependencies. npm users and standalone users share one runtime installation, checksum verification and cache implementation. This intentionally does not maintain a separate JavaScript installer or use whatever ffmpeg/Chrome happens to be installed.

Platform launchers are ordinary optional npm dependencies named `@archastro/clapper-launcher-<os>-<arch>`, selected by npm's `os`/`cpu` fields. Keep optional dependencies enabled. A release supports exactly the platforms it includes; the current locally verified build is macOS Apple Silicon. No postinstall script downloads a runtime: `--help` and `--version` work immediately, and the first real command installs it.

The GitHub runtime archive is separate from the small npm packages. A private GitHub release requires `GH_TOKEN` or an explicitly supplied local/mirror `CLAPPER_RUNTIME_URL`, exactly as for the standalone launcher. npm registry authentication and GitHub release authentication are separate. See [the repository's standalone guide](https://github.com/ArchAstro/clapper/blob/main/docs/standalone.md) for offline setup and cache locations.

## Build and verify before publishing

From the Clapper checkout:

```sh
node scripts/build-release.mjs
node scripts/pack-npm.mjs
node scripts/test-npm.mjs
```

`dist/npm/<version>/` contains `@archastro/clapper`, the available platform launcher package(s), `@archastro/clapper-music`, `@archastro/clapper-core`, and `artifacts.json`. The CLI package has no workspace-only dependencies; its only dependencies are the pinned platform packages. `@archastro/clapper-core` contains browser sources and declarations expressed as TypeScript, intended for React bundlers. The workspace CLI remains the implementation embedded in the managed runtime; publish the generated tarballs, not the raw `packages/cli` directory.

The test installs the actual tarballs into a temporary global npm prefix, exercises the installed `clapper` command through project creation, offline restore and rendering, then invokes `npx` from an empty directory using the tarballs. Neither route uses workspace symlinks or a globally installed standalone launcher.

Publish matching platform package(s), then `@archastro/clapper-music`, `@archastro/clapper-core`, and finally `@archastro/clapper`, with the matching public runtime release available first. Artifacts include MIT licensing and default to public npm access; publishing requires control of the `@archastro` npm scope and registry credentials. See [exact publishing commands](releasing.md). Packing/testing performs no publication and does not imply these package names are already available on the public registry.
