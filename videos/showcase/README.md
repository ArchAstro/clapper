# Showcase

Three made-up SaaS products, three visual systems, one framework. Each is a 22–26 s brand spot with synthesized sound.

| id | product | system | sound |
| --- | --- | --- | --- |
| `ledger` | treasury & close for finance teams | editorial: Fraunces on bone paper, JetBrains Mono numbers, one vermilion; hard cuts and wipes | sub-bass hits on cuts, counter ticks, low pads, resolved chord |
| `orbit` | meetings that find their own time | bold flat color blocks, Bricolage Grotesque, spring physics, slide wipes | pops per event, marimba-ish chimes, whooshes on wipes |
| `nimbus` | edge observability | dark drifting grid, Unbounded + cyan glow, node graph with packets in flight, histogram, terminal stream, camera pushes | arpeggio bed, sawtooth pad, pops per letter, two-tone alert, chimes |
| `archdev2` | ArchDev, problem-only cut with a tease ending | same rig and scenes plus a 1,284-line PR-review scene (drowsy → jolt → LGTM → approved at 1:52) and a tease (the mark draws itself; no product shown); one continuous score with volume/cutoff automation across hard cuts, risers that land on the cut, hits only where the story slams | see `Score()` in `src/archdev/archdev2.tsx` |
| `archdev` | ArchDev (real product): the overseer for multi-agent runs | character film: a monoline developer rig (`src/archdev/person.tsx`: IK arms, head/brow/mouth channels, keyframed poses) acting out a towering plan, twelve swarming agents, lost context at 2 AM, then the overseer board; Everforest palette, Archie marks as agents | layered mechanical keystrokes, plucked-string and electric-piano score (D minor → D major), stereo reverb bus, heartbeat and a single ringing note in the blank; see docs/archdev-audio-audit.md |

```bash
pnpm preview                                   # studio
pnpm render:all                                # out/{ledger,orbit,nimbus,archdev}.mp4
pnpm review                                    # agenticvids review per spot → out/review/<id>/: contact sheet, cut strips, spectrogram, loudness, lint, brief.md
pnpm exec agenticvids still src/index.tsx -c orbit --frame 40,200 --out out/stills/orbit --image-format jpeg
```

## Review loop

Each spot was critiqued by a reviewer agent playing a motion-studio creative director, using the review kit plus
full-resolution stills it rendered itself, and revised until it got a SHIP verdict. `src/kit.tsx` holds the shared
motion vocabulary those rounds converged on (masked line reveals, drawing rules, tiled grain, impact punch, path helpers).

| spot | round 1 | round 2 | round 3 | what the reviews caught |
| --- | --- | --- | --- | --- |
| ledger | REVISE 6 | REVISE 6 | **SHIP 9** | composition sized without subtracting transition overlaps (blank tail), hard cuts landing on empty frames, missing pad beds, empty quadrants, the "days→hours" roll clipping type |
| orbit | REVISE 7 | **SHIP 8** | | relocating block sliding through another with no elevation, banner hold under 1.2 s, safe margins, mechanical waveform |
| nimbus | REVISE 6 | REVISE 6 | **SHIP 9** | graph edge crossing the headline, camera push cropping the log panel (then the headline), badge overlap, stat inconsistency, hot pad under quiet holds |
| archdev2 | CD 6 · X 6 · audio 6.5 | **CD SHIP 8 · audio SHIP 8.5 · X 7** | | three reviewers in parallel (creative director, X virality strategist, audio director with loudness-around-cuts data): hook too small for a muted feed, tease louder than the climax, over-stacked alert beat, turn toward the mark not reading, jolt not held, counter contradicting the copy; remaining: a restaged 1:1 export for the feed |
| archdev | REVISE 6 | SHIP 8 | **SHIP 9** | hands-to-head beat hidden behind windows, sheet over the face, generic swivel arms, no hit on a cut, character missing from the end card, 12 vs 20 windows unexplained; then sheet edge clipping, straight-line arm travel, and a desk-jump across the wipe (replaced by a continuous reframe) |

Encoding note: Nimbus renders with `--crf 21` because animated grain over near-black costs 30 Mbps at CRF 17.
