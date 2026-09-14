# Firstmate — Take the helm

Candidate: `out/round-3.mp4` — 36 seconds, 1920×1080, 30 fps, H.264/AAC stereo. Original instrumental 6/8 shanty: **The Captain's Share**.

MP4 SHA-256: `366ab3feacb0e26bee0c5a49dfe96f67f367d7b4c2c63f07950effe5766cfd41`.

## Status

- **VISUAL: independent SHIP**, including exact cuts, consecutive motion windows and 800px feed-size review.
- **PRODUCT / MUTED-FEED STORY: independent SHIP**, checked against the pinned upstream repository and actual X replies documented in [RESEARCH.md](RESEARCH.md).
- **MUSIC / MIX: REVIEW INCOMPLETE — actual listening unavailable.** Score, instrument mapping, final-mux measurements and byte-level regression checks are complete. No proven major score/engineering defect, but no agent claims to have heard the soundtrack. Human listening feedback is pending.
- Unofficial concept. No Kun Chen endorsement, real tweet, live product recording, guaranteed outcome, automatic merge authority, or unrestricted public-bot access is implied.

## Independent rounds

Round 1 established coherent typography/pacing, truthful illustration and supported product claims. Two minor product-review suggestions were accepted: explicitly launch the coding agent **inside** the cloned repo, and enlarge the illustrative/unofficial labels. Round 2 independently verified both changes on the exact new export; no new major defects or layout regressions were found. The six-second GitHub destination hold was preserved.

The user then praised the candidate and requested less boilerplate, specifically removal of the unofficial footer. Round 3 removes the repeated chapter kickers and unofficial/Clapper footer, redundant workflow/metadata labels and explanatory copy. The relay keeps a discreet example marker and concise optional/linked-owner qualification. Independent visual and product-story reviewers both returned SHIP on the exact round-3 export, without asking to restore the user-removed boilerplate. No new layout, readability or claim regressions were found; timing and soundtrack are unchanged.

Full reports and frame evidence: `out/review/visual-round-1.md`, `visual-round-2.md`, `visual-round-3.md`, `brand-round-1.md`, `brand-round-2.md`, `brand-round-3.md`, `audio-round-1.md`, `audio-round-2.md` and the per-round media kits. Visual evidence uses exported frames, not only author-selected source stills.

## Music evidence and limits

6/8, quarter-note120 / dotted-quarter80. Scene changes align at4.5/10.5/18/24/30s. Final cadence begins33s. All490 pitched events and141 drum events are covered by the actual sampled instrument regions.

Final mux: −18.0 LUFS, −1.9 dBTP, LRA2.9LU; no intermediate dropout; natural final silence begins34.7112s. Round1/2 independently decoded stereo48kHz f32le PCM is byte-identical:13,824,000 bytes, SHA-256 `1a6f373a5ab01576fe48dbe09bad2e79af981e1e5d63c2e678975f2199042bf7`.

Round 3 was independently visually reviewed; the author's full decoded f32le audio hash matches that same prior soundtrack hash, so its audio measurements remain applicable. This is still not an invented agent listening pass.

Listening must still assess shanty character, memorability, timbre, masking and stereo/mono perception. The fiddle uses short spiccato samples; flute provides sustained response/ending. This is a disclosed articulation choice to audition, not a claim of recorded singers or a proven defect requiring speculative correction.

## Frozen source

Base repository: `450033a807e223c6dd2c7666a3e48bcbc87eac3e` plus this new project and workspace lock entry.

| File | SHA-256 |
| --- | --- |
| `src/index.tsx` | `8c94b5e4926330fcb61cd8a8da4fe08c83e75c90c80357945b70af88cae369d3` |
| `src/art.tsx` | `f304d825bd7d6a841c3d089ccca4dbe7ca83353fbcbf45e552d3a86d9e761b7a` |
| `src/score.ts` | `5217e9387975edbb0fe6107c83b34de620a600fc028c26ea9422b642dd339cc9` |
| `src/assets/sea.png` | `a45d1a5fd449300bbd200c7e41970c143f6dbac3bac99a91f0d7eda160bbd6e6` |
| `src/assets/mate.png` | `570bbb3559b4f90a0c33bddd018fb9f1e8b545f327e3e0fb5fa0b15da46e21b5` |

## Reproduce

From the Clapper repository root:

```sh
pnpm --dir videos/firstmate preview
pnpm --dir videos/firstmate render
pnpm --dir videos/firstmate exec clapper review --video out/firstmate.mp4 -o out/review/new-round
```

The reviewed candidate remains immutable. A changed source/render needs its own hash and affected-domain review. Research, artwork provenance and scope boundaries are recorded in RESEARCH.md. No upstream changes, social posting, outreach, repository commit or upload was performed for this production request.
