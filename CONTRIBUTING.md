# Contributing

Use Node 24+, pnpm 11.7.0 and Git. From a checkout:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm check:public
pnpm typecheck
pnpm test
pnpm --dir packages/cli exec playwright install chromium
pnpm --dir videos/_template exec clapper doctor src/index.tsx
```

For video encoding, install an FFmpeg with libx264 or run `node scripts/build-ffmpeg.mjs` (C/C++ compiler, make, curl, pkg-config and zlib development headers required; macOS provides zlib through the SDK). For sampled music, also run `node scripts/build-sfizz.mjs` (CMake required). These are build-machine prerequisites; packaged Clapper manages its runtime for end users.

Keep browser-only code in core, pure musical logic in music, and Node/native operations in cli. Important animation is a function of the frame; musical timing stays in beats/ticks until rendered to samples. Preserve existing examples and add a focused regression test for fixes.

Formatting is enforced by Biome (2 spaces, LF, double quotes, semicolons, 110-column wrapping) and gofmt. Run `pnpm format` to format, `pnpm lint` to lint, or `pnpm check` for both plus import organization and Go formatting. The explicit lint profile checks unused code/imports, undeclared and unreachable code, hook ordering, unsafe equality/negation, duplicate declarations, async executor mistakes and consistent const/type/Node imports. It avoids imposing DOM-style accessibility rules on decorative frame-by-frame SVG artwork; interactive studio UI still needs accessible controls and browser tests. CI blocks formatting or lint errors.

Before a pull request, run the checks above and the relevant integration test: `node scripts/test-music.mjs`, `node scripts/test-standalone.mjs` or `node scripts/test-npm.mjs`. Packaging tests require locally built artifacts. Do not commit generated media, dependencies, caches or credentials. Include license/provenance metadata for new assets.

Contributions are provided under this repository's MIT license unless an explicitly identified third-party asset retains another license. Open pull requests ready for review.
