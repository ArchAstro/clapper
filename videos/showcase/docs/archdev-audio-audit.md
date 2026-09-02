# ArchDev soundtrack audit (2026-09-02)

Measured with ffmpeg (`ebur128`, `astats`, band-limited RMS) on the audio extracted from `out/archdev.mp4`.
Spectrograms: `out/audio-audit/before-spectrogram.png`, `after-spectrogram.png`. Cue inventory: `clapper cues src/index.tsx -c archdev`.

## Findings (before)

| measure | before | problem |
| --- | --- | --- |
| integrated loudness | −15.9 LUFS | fine |
| loudness range (LRA) | 4.5 LU | flat; the film has a whisper-quiet scene and a chaos scene, the mix did not |
| chaos vs. 2 AM scene | −15.7 vs −17.5 LUFS (1.8 LU) | the drop-out did not drop |
| stereo side channel | −64 dB RMS | effectively mono |
| spectral balance (open) | <200 Hz −18 dB · 0.5–2 kHz −31 dB · >4 kHz −46 dB | sub-heavy sine drones, no mids, no air |
| timbres | 9× sine pads, triangle/square arps, square-wave alerts, 2-frame noise clicks | every source a raw oscillator: the "synth" feel |
| keyboard | one noise burst per key at ~2 kHz | a tick, not a key: no body, no variation |
| music | none; arps as texture | nothing carries the emotional arc |

## Changes

1. Engine (`packages/cli/src/ffmpeg.ts`, `packages/core/src/audio.tsx`):
   - stereo bus with constant-power `pan`, detuned `spread` voices, and a Schroeder reverb send (`reverb`, decorrelated L/R);
   - new voices: `pluck` (Karplus–Strong string, `ring` and `brightness`) and `epiano` (2-op FM, bell transient over a ringing body);
   - per-cue `cutoff` lowpass, `lfo` tremolo, `detune` cents;
   - instruments: `<Pluck>`, `<EPiano>`, `<Chord strum>`, `<Pattern steps bpm step humanize swing>` (a step sequencer clamped to its scene), `<Drone>` (filtered saw with tremolo and width), `<RoomTone>`;
   - keyboard: `<Keystroke>` = click transient (noise 3.6–5.4 kHz, 12 ms) + body "thock" (200 Hz gliding down, 35 ms, partials) + faint key-up tick, with per-key variation; space bar lower and longer. `<Typing>` syncs keystrokes to `<Typewriter>`;
   - loudness normalisation keeps more range (`loudnorm` LRA 16 instead of 11);
   - `clapper cues` lists a composition's cue inventory for audits.
2. Score (D dorian → D major, 84 bpm), all synthesized, no assets:
   - open: felt pluck motif over a low drone and room tone; the "claimed" ding is an electric-piano A4;
   - plan: descending pluck line, paper ticks, noise riser, a low D2 string "boom" on the slump;
   - agents: bass pluck ostinato, a bright 16th-note pluck layer, dissonant electric-piano stabs (Ab against D), window pops as panned e-piano notes, alerts as dissonant pluck double-stops rising by semitone;
   - blank: room tone, a sub drone, a single ringing E6, heartbeats, soft keystrokes;
   - archdev: Dmaj9 and Gmaj7 strummed e-piano chords, a calm pluck arpeggio, e-piano dings per report row, final D chord;
   - end: strummed D chord with a short pluck flourish.

## Results (after)

| measure | before | after |
| --- | --- | --- |
| integrated loudness | −15.9 LUFS | −16.1 LUFS |
| loudness range (LRA) | 4.5 LU | 6.8 LU |
| chaos vs. 2 AM scene | 1.8 LU apart | 5.5 LU apart (−15.8 vs −21.3) |
| relief scene vs. chaos | +0.3 LU louder | level (−15.5 vs −15.8) |
| stereo side channel | −64 dB | −31 dB |
| spectral balance (open) | −18 / −31 / −46 dB | −27 / −27 / −31 dB |
| cue inventory | 8 thumps, 6 sine pads, 4 arps, 3 square alerts, ~200 clicks | 108 plucks, 52 e-piano, 158 noise transients (keys, ticks, air), 56 sine (thumps, bodies), 9 saw drones |

## Still open

- No real recorded keyboard or music; everything is synthesized. A licensed bed or a sampled keyboard would beat this, and `<Audio src>` already supports files.
- Sidechain ducking (music under keystrokes and hits) is not implemented; levels are balanced by hand.
- The other three showcase spots still use the v1 palette (sine pads, triangle chimes); the same treatment applies.

## v2: transitions (2026-09-02, later)

The user's note after v1.1: "clunky at transitions". Measured with `scripts/audio-cuts.mjs` (short-term RMS in 100 ms windows around each cut; now part of the review kit as `audio-cuts.txt`):

| cut | v1.1 | v2 |
| --- | --- | --- |
| open → plan (100) | hole to −38 dB then a hit | continuous −31…−32 dB glide, no hit |
| plan → agents (320) | bed decays to −54 dB for a second, then a −9 dB slam | riser climbs −27 → −16 → −9 dB landing on the frame |
| agents → review (560) | intended drop, −17 → −40 dB | riser into a softer hit, −23 → −11 dB |
| review → blank (770) | bed ends at −75 dB, then jumps | 30-frame automated fall to −35 dB, heartbeat at +0.6 s |
| blank → tease (920) | (new) | chord lands on the cut: −35 → −18 dB at 0.0 s |

Cause in v1.1: every scene owned its own drone, room tone and patterns, each fading out and back in at the cut on its own tempo grid. v2 moves the bed and all patterns into one `Score()` at the composition root: one drone with `automation` (volume and cutoff breakpoints across the scene starts), all patterns on a single 84 bpm 8th-note grid (`g8(k)`), risers that end on the hit frame, hits only where the story slams, and a widened 30-frame fall into the silent scene. Engine addition: `ToneSpec.automation` (volume/cutoff envelopes as `[frame, value][]`).

Per-scene loudness v2: open −18.0, plan −16.8, agents −16.5, review −19.5, blank −21.0, tease −17.1 LUFS (climax loudest, tease under it); integrated −17.3 LUFS, LRA 7.1 LU.
