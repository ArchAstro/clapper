# agenticvids

React → MP4 video framework (pnpm workspace). See README.md for the model and API.

## Commands
- `pnpm install` (postinstall builds allowed via `allowBuilds` in pnpm-workspace.yaml), `cd packages/cli && pnpm exec playwright install chromium` once.
- `pnpm typecheck` · `pnpm test` (vitest: core math + offline synth) · `pnpm render` / `pnpm preview` (intern-promo).
- `pnpm exec agenticvids still <entry> -c <id> --frame 10,20 --out out/stills --image-format jpeg` to eyeball frames fast.
- Manual studio e2e: `cd packages/cli && node test/studio-check.mjs` against `agenticvids preview … --port 4399`.

## Rules
- Everything on screen must be a pure function of `useFrame()`; never use wall-clock time or `setTimeout` for motion.
- Sounds are React elements (`<Tone>`, `<Chime>`, `<Audio>`…); cues are collected during render, so a cue inside a `<Sequence>` only exists while that sequence is mounted (that is fine: the renderer visits every frame).
- The CLI runs its TypeScript directly on Node 24+ (type stripping): keep relative imports in `packages/cli/src` with `.ts` extensions and avoid enums/namespaces there.
- `packages/core` is browser-only; `packages/cli` is Node-only. `@agenticvids/core/harness` and `/player` are mounted by the CLI's generated `.agenticvids/*` entries.
- A composition that throws fails the render (by design); check `[page error]` lines.
- Size a `TransitionSeries` composition with `transitionSeriesLength()`; give hard-cut scenes an instant anchor at local frame 0.
- Review loop for showcase-grade work: `agenticvids review <entry> -c <id>` (or `pnpm review` in `videos/showcase`) writes `out/review/<id>/` with a contact sheet, cut strips, spectrogram, loudness at cuts, lint and `brief.md`; a reviewer subagent (creative-director brief) reads it, renders its own stills (`still --scene x`), and returns SHIP/REVISE with frame-referenced fixes. Two to three rounds is typical.
- New videos start from `videos/_template` (`defineScenes`, one `<Score/>`, `data.ts`). Timing props take frames or `"1.2s"`. Scene starts come from the plan, never hand-summed.
- Grainy dark frames: render with `--crf 20-22`; CRF 17 spends 30 Mbps on noise.
