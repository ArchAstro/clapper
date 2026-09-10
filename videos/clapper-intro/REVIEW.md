# Clapper intro — review state

Approved export: `../../docs/media/clapper-intro.mp4` (identical to `out/round-2.mp4`), 25 seconds, 1920×1080, 30 fps.

SHA-256: `2a56ace62605596195a0a1dff036605985ec9d8923b9db4fe0ae066d225bcf60`.

Source base: Git `d3a7a4510265e17f496fb9ddd5183386dfbb7658` plus this new project. Reviewed source SHA-256:

- `src/index.tsx`: `5775428ba3253091db9e9690295950ff13ec53fe072b0ad021a9c1167824469a`
- `src/mascot.tsx`: `ab415a674e2868fae8784b6fa454b2e9b155f298342d3d5be81c708a8fd5f4a3`
- `src/score.ts`: `a046fb55b93b81732ca75e1506a361897804813420ea8717306a4c5c1530b338`

**VISUAL: independent SHIP. USER: approved for README publication.** After receiving the candidate and the explicit listening limitation, the user responded “this is great, add it to the readme and make it playable and committed in the repo.” This records user acceptance; it does not invent an agent listening pass or a formal human audio-analysis report.

## Independent visual review

Two rounds by a read-only creative-director reviewer. Coverage: actual exported frames at 800px README width, every cut, opening and ending, and self-selected consecutive motion windows.

| Finding | Verification in round 2 |
| --- | --- |
| Major: repeating idle motion did not deliver the promised opening action/reaction or visible tweak payoff | FIXED: lid slam, shape release, bow/recovery; cursor changes bounce height from 28 to 96 and replay visibly responds |
| Major: displayed music phrase did not match the displayed/heard variation | FIXED: current-bar code and note plot derive from the same score phrases |
| Minor: connector crowded against code-panel edge | FIXED: scoped border-box sizing restores spacing |
| Minor: multiline install command omitted continuation | FIXED: explicit continuation on the first line |

No new major/blocker visual findings. Preserve mascot, palette, typography and five-second CTA hold. Full reports and media kit remain in `out/review/`.

## Independent music/audio review

Score and sample-key coverage checked; every instrument's notes are mapped. The musical arc retains the sparse 16–18s break and 22–25s resolution. Displayed-phrase mismatch, off-beat music-scene mascot motion, and inaccurate mode comment were independently rechecked as fixed.

Muxed audio: −18.0 LUFS, −2.0 dBTP, 2.9 LU loudness range; stereo 48 kHz AAC. Break is approximately 3.8 dB below the full groove. Natural tail falls below −55 dB near 23.864s. No established major score/engineering defect.

Round 1 and round 2 decoded stereo f32le audio is byte-identical (9,600,000 bytes), independently verified SHA-256 `a672ad0ff3113eae35740ed98dbbbba24285c20dbf7508c1337aeff5e005fa4d`.

Neither agent could perceive audio through the available tools. These measurements are not listening approval. The user subsequently accepted the candidate and authorized README publication with this limitation disclosed. No numerical quality score or award claim substitutes for that record.

## Reproduction

From the repository root:

```sh
pnpm --dir videos/clapper-intro preview
pnpm --dir videos/clapper-intro render
pnpm --dir videos/clapper-intro exec clapper review --video out/clapper-intro.mp4 -o out/review/new-round
```

Source is original React/SVG and music-as-code. Fonts reuse the repository's licensed local assets; sampled presets are CC0. Any changed render needs a new hash and affected-domain re-review. The committed MP4 is the exact approved candidate; no new encode was performed for publication.
