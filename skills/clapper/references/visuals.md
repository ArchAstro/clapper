# Picture: make the story visible

## Direction and construction

1. Anchor to real brand assets/copy when supplied. Use a distinct visual grammar: type roles, spacing, palette, material, motion and transitions that suit the subject. Ledger's editorial restraint, Orbit's springy blocks, and Nimbus's terminal glow are alternatives, not ingredients to mix indiscriminately.
2. Each scene needs an action and an information hierarchy. Establish, act, react, hold. A character's emotion should read through silhouette, posture, gaze and timing before the caption explains it.
3. Reuse core `Copy`, `Reveal`, `Eyebrow`, `Rule`, `Camera`, and animation helpers. Mark custom essential text with `data-copy=""`. Use `Person`/`Scribble` and named pose helpers from `@archastro/clapper-core/rigs` for compatible character designs. `definePoses`/`usePose`, IK and arc channels support custom acting; don't redraw an existing rig merely to change a gesture.
4. Important async assets must be ready before capture: use local fonts/images and the core readiness APIs where needed. Test the actual rendered font, not just the fallback geometry.

## Checks that found real defects

| Check | What to inspect | Typical repair |
| --- | --- | --- |
| Opening at display size | Frame 0 and first two seconds, sound off | Make the premise/subject readable immediately; trim empty pre-roll when it adds nothing |
| Hard-cut arrival | Cut−1, cut, cut+1 and first 8 local frames | Keep a visible anchor while masked copy enters; intentional black/silence needs story justification |
| Text geometry | Widest strings, descenders, reveal midpoint, final hold | Fix line box/mask/position, then check again; a softer mask can still clip |
| Occlusion | Face, hands, captions during peak action | Change depth, staging or camera; key acting must not hide behind windows/paper |
| Travel and continuity | Mid-motion frames, both sides of a join | Arc/elevate moving objects; preserve pose/desk location or stage an intentional cut |
| Camera push | All four boundaries throughout the move | Protect headline and supporting UI together; fixing a side crop can create a top crop |
| Sketch fills | Before and during drawing cues | `<Draw>` reveals strokes, not necessarily fills; gate a filled object until its cue if it covers earlier content |
| Copy vs proof | Counts, UI rows, counters, captions across scenes | Derive them from shared data; investigate whether a discrepancy is intended before changing it |
| End card | Last frame and the full settled CTA hold | Leave room for descenders/borders; no fade-out while copy is still revealing |

The earlier 1.2-second settled-copy hold is a useful floor for short phrases, not a universal reading time. Longer copy needs longer; measure reveal end → exit start. For character takes, hold the expression long enough to register before interpolation blends it away.

## Aspect ratios and phone size

1. Respect the requested format. Register additional formats only when needed; `formats` plus `useFormat()` lets scenes restage themselves.
2. A portrait/square export is not just a crop of a wide terminal or swarm. Reflow windows, put the diff below the character, adjust camera/copy, and review the variant independently.
3. Inspect feed work at its actual small display size with audio muted. A 22px eyebrow on a 1080px canvas can become unreadable even when a full-resolution screenshot looks fine. Avoid universal claims about platform algorithms or an ideal runtime.

## Evidence, not a gallery

1. Use the kit's contact sheet for pacing and coverage, cut strips for continuity, and full-resolution stills for geometry. Confirm the sheet includes the ending.
2. Three scene stills are reconnaissance. Capture additional frames through risky motion, not just settled poses. The reviewer should choose some of those frames independently.
3. Automated geometry lint only samples certain frames and tagged, settled text. It can miss clipping, non-text occlusion, and brief motion collisions. Zero inspected copy boxes is not a clean typography review.
4. When text exists in the DOM but is invisible, inspect paint order, masks, fill timing and overflow. The local `packages/cli/test/dom-probe.mjs` can report boxes at a frame; inspect its invocation before use.
5. Replay a short rendered clip to judge rhythm, easing and acting when playback is available. Still images support spatial claims; don't pretend they prove how every motion feels.
