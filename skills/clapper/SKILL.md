---
name: clapper
description: Create, edit, preview, render, and improve React videos with Clapper, including motion design, character animation, music and foley, and adversarial visual/audio review. Use for Clapper videos, animated product demos, brand films, or recuts made with @clapper/core. Not for ordinary website UI or unrelated video editors.
---

# Clapper: brief → picture + sound → reviewed MP4

Make the next useful artifact yourself: a scene plan, a few proof frames, a playable draft, or a verified final. Keep updates short and numbered. Ask only for decisions that materially change the film; infer ordinary production choices from the request and existing project.

## 1. Find the project and choose the shortest route

For a standalone install, start with `clapper --version` and the project's `clapper.json`. Use `clapper new <directory> --template basic|comic`, then `clapper preview`, `clapper render`, or `clapper review` from the generated project. `clapper install` restores portable dependencies; `clapper add <package>` adds libraries using managed npm. No source checkout or system Node/pnpm is needed. The project pins a runtime version; use the matching launcher instead of silently migrating it. When working on the framework or an older workspace project, follow the checkout route below.

1. Locate the Clapper checkout: use the current workspace if it contains `packages/core` and `packages/cli`; otherwise check `/Users/calvin/archastro/clapper`. Read its `CLAUDE.md`, project README, package scripts, and Git status. Preserve existing edits. Never assume a new checkout has the same APIs as the last session.
2. Choose the mode:
   - **New film:** start from `videos/_template`; choose one visual sibling from the table below.
   - **Recut:** preserve the previous composition ID; reuse exported scene components and make the new scene plan explicit. Review changed scenes and both joins, plus regressions in the full export.
   - **Audio pass:** keep picture timing fixed unless authorized to retime; read [audio.md](references/audio.md).
   - **Preview/render only:** use the existing entry and composition; don't impose a redesign or full creative review.
   - **Polish/final production:** use [visuals.md](references/visuals.md), [audio.md](references/audio.md), and [review.md](references/review.md).
3. Resolve the entry and composition with `clapper compositions`; never silently render the CLI's first composition. Root `pnpm preview` / `pnpm render` target intern-promo, not whichever film the user mentioned.

| Intent | Read the closest concrete example |
| --- | --- |
| Basic scenes, data, score, portrait variant | `videos/_template/src/index.tsx`, `data.ts`, `theme.css` |
| Editorial type and counters | `videos/showcase/src/ledger/` |
| Playful springs and spatial movement | `videos/showcase/src/orbit/` |
| Terminal, graphs, camera and grain | `videos/showcase/src/nimbus/` |
| Character acting and continuous score | `videos/showcase/src/archdev/archdev2.tsx` |
| Boiling-ink comic and reusable rig | `videos/showcase/src/archdev3/`, `@clapper/core/rigs` |
| New opening/ending around approved scenes | `videos/showcase/src/archdev4/archdev4.tsx` |

Use the existing primitive before inventing a replacement. Later local examples such as `archdev5` may contain useful new instruments; check exports and tests before relying on them. They are not automatically reviewed or shipped because their source exists.

## 2. Get to a working frame

Commands below are Fish syntax. Set actual paths and IDs once; use the tool's `workdir` or `pnpm --dir` rather than relying on persistent `cd` state.

```fish
set -l clapper_repo /Users/calvin/archastro/clapper
set -l clapper_project "$clapper_repo/videos/showcase"
set -l clapper_id archdev4

pnpm --dir "$clapper_project" exec clapper --help
pnpm --dir "$clapper_project" exec clapper doctor src/index.tsx
pnpm --dir "$clapper_project" exec clapper compositions src/index.tsx --json
pnpm --dir "$clapper_project" exec clapper still src/index.tsx -c "$clapper_id" --frame 0,30 --out out/stills/first-look
pnpm --dir "$clapper_project" exec clapper preview src/index.tsx --port 4321
```

Preview is a long-running server. Use its printed URL (the port may change). Open the user handoff in their main Google Chrome profile; automated browser checks use an isolated profile. Space plays, arrows step, `[` / `]` jump cuts, `s` shows safe areas, `c` shows copy boxes, `i` / `o` set a loop range. Preview audio is an approximation; judge the exported mix.

If setup is missing: Node 24+, pnpm, `pnpm install` at the repository root, then `pnpm --dir packages/cli exec playwright install chromium`. The workspace's `allowBuilds` must permit esbuild and ffmpeg-static. Run doctor against the actual video project. Clapper is a local workspace package: don't substitute an unrelated public npm package.

For a new video, copy only the template's authored files (`package.json`, `tsconfig.json`, `src/`, and assets if present) into an unused `videos/<name>`; never copy `node_modules`, `.clapper`, or `out`. Set a unique package name and composition ID, then install workspace links. Keep useful `preview`, `still`, `review`, `render`, and `typecheck` scripts with explicit IDs.

## 3. Author picture and sound together

1. Write a compact beat plan: audience, promise, duration, format, style reference, one action per scene, on-screen copy, and the intended sound/quiet beat. For a requested spec, use an HTML task UI. Otherwise a short scene table is enough; don't delay a simple edit with a spec.
2. `defineScenes` owns durations and overlaps. Pass the plan to both `<Composition scenes={SCENES}>` and `<Scenes plan={SCENES}>`. Use `SCENES.start(name)` for global sound cues. Inside a scene, `useFrame()` is local. Numeric times are frames; `"0.4s"` is seconds. Recompute frame references after a retime.
3. Put factual copy/numbers in one `data.ts`, scoped brand tokens in `theme.css`, and long music beds in one root-level `Score`. Local action foley may stay in its scene. Check reused scenes for old beds/hits before adding a new score.
4. All important motion comes from `useFrame()`. Use seeded randomness, `useBoil`, or `noise1d`; no wall clocks, timers, or unseeded randomness. CSS animations may depend on worker history: use frame-based motion for anything that must survive arbitrary seeking.
5. Read [visuals.md](references/visuals.md) before authoring or polishing picture. Read [audio.md](references/audio.md) before scoring or changing the mix. These cover demonstrated traps, not a mandated house style.

## 4. Iterate with the right artifact

```fish
# For a scene named intro; replace with a name from the scene map.
pnpm --dir "$clapper_project" exec clapper still src/index.tsx -c "$clapper_id" --scene intro --every 6 -o out/stills/intro
pnpm --dir "$clapper_project" exec clapper render src/index.tsx -c "$clapper_id" --scene intro --draft -o out/intro-draft.mp4
pnpm --dir "$clapper_project" exec clapper review src/index.tsx -c "$clapper_id" --draft -o out/review/round-1

# Final encode, then review that exact file without another encode.
pnpm --dir "$clapper_project" exec clapper render src/index.tsx -c "$clapper_id" --crf 20 -o out/final.mp4
pnpm --dir "$clapper_project" exec clapper review src/index.tsx -c "$clapper_id" --video out/final.mp4 -o out/review/final
```

`--scene` makes explicit still frame numbers scene-local. `--range a-b` is start-inclusive/end-exclusive; with `still --range`, explicit frame numbers are offsets from the range start too. Without either, `--frame` is absolute. Valid final frame is `durationInFrames - 1`.

JPEG q96 is the default intermediate and was much faster than PNG on grain. Choose PNG when lossless intermediates matter. CRF 17 suits flat art; 20–22 was useful for grain-heavy work. Measure the result instead of treating those as delivery requirements. Use short scene/range probes to diagnose slow renders.

**Concurrency:** the standalone packaging implementation gives each build a unique `.clapper/harness-*/build` directory; those versions can build concurrently with distinct output paths. Older Clapper versions rebuild/delete one `.clapper/harness-build` directory: serialize their harness commands or use isolated project snapshots. Check the installed version/source rather than assuming isolation. Do not edit source while reviewers are capturing frames.

## 5. Review, fix, deliver

For a new finished film or substantial polish, follow [review.md](references/review.md): author inspection → independent visual and audio critiques → evidence-backed fixes → fresh review of the changed result. Add a muted-feed reviewer when social distribution matters. A quick preview request does not require the whole loop.

Completion means:

1. The requested entry/ID/format renders; picture is inspected at opening, cuts, motion trouble spots, and final held frame; factual copy and CTA agree.
2. Sound was checked on the exported file. Report whether it was actually auditioned or only measured. No claim of listening based on a waveform.
3. Review blockers are fixed and verified. Record remaining taste notes and any unverified dimension. A score is supporting feedback, not a substitute for evidence or a promise of awards/virality.
4. The final MP4 and kit match the final source/props/format; changes after review invalidate the affected checks. Link the playable output and preview, name the composition and duration, and give a short verdict.

Keep commits, pushes, uploads and publishing within the user's requested scope. This skill does not authorize them.

For why these rules exist and which old advice was superseded, see [session-evidence.md](references/session-evidence.md).
