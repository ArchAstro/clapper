# Showcase

Three made-up SaaS products, three visual systems, one framework. Each is a 22–26 s brand spot with synthesized sound.

| id | product | system | sound |
| --- | --- | --- | --- |
| `ledger` | treasury & close for finance teams | editorial: Fraunces on bone paper, JetBrains Mono numbers, one vermilion; hard cuts and wipes | sub-bass hits on cuts, counter ticks, low pads, resolved chord |
| `orbit` | meetings that find their own time | bold flat color blocks, Bricolage Grotesque, spring physics, slide wipes | pops per event, marimba-ish chimes, whooshes on wipes |
| `nimbus` | edge observability | dark drifting grid, Unbounded + cyan glow, node graph with packets in flight, histogram, terminal stream, camera pushes | arpeggio bed, sawtooth pad, pops per letter, two-tone alert, chimes |
| `archdev` | ArchDev (real product): the overseer for multi-agent runs | character film: a monoline developer rig (`src/archdev/person.tsx`: IK arms, head/brow/mouth channels, keyframed poses) acting out a towering plan, twelve swarming agents, lost context at 2 AM, then the overseer board; Everforest palette, Archie marks as agents | typing clicks, riser into the slump, layered arps and alerts, heartbeat and tinnitus in the blank, resolve chord |

```bash
pnpm preview                                   # studio
pnpm render:all                                # out/{ledger,orbit,nimbus,archdev}.mp4
pnpm review-kit                                # out/review/<id>/: contact sheet, cut strips, spectrogram, waveform
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
| archdev | REVISE 6 | SHIP 8 | **SHIP 9** | hands-to-head beat hidden behind windows, sheet over the face, generic swivel arms, no hit on a cut, character missing from the end card, 12 vs 20 windows unexplained; then sheet edge clipping, straight-line arm travel, and a desk-jump across the wipe (replaced by a continuous reframe) |

Encoding note: Nimbus renders with `--crf 21` because animated grain over near-black costs 30 Mbps at CRF 17.
