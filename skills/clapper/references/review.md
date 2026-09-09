# Adversarial review that converges

The successful session pattern was author inspection → specialist review → batched fixes → independent verification. Review is adversarial toward defects, not toward the brief. Preserve intentional style and scope; reviewers do not get authority to redesign the film or demand new deliverables.

## 1. Freeze a reviewable round

1. Finish a draft and generate its kit. Record round, entry, composition, fps, duration, format, props, source revision (including uncommitted changes), exact MP4 path, and SHA-256. Store the scene map and reviewer reports under that round's output directory. A Git HEAD alone does not identify dirty source.
2. Check the author-selected opening, every cut, high-risk motion and final frame. Fix obvious failures before spending reviewer effort.
3. Give every reviewer the same immutable MP4/kit, brief, current scene map, source access, and exact still command. Don't describe desired verdicts or hide known weak spots.
4. No author edits while the round is being inspected. The kit can be read in parallel, but **all harness-building CLI commands for the same project must be serialized**: output directories alone do not avoid `.clapper/harness-build` races. Reviewers request frames from the parent, or get separately isolated, dependency-resolved project copies. Do not run multiple builds against one checkout.

For an isolated snapshot, keep its own writable `.clapper` directory and resolve imports through the installed workspace packages. A copied `package.json` with `workspace:*` is not a standalone install: `pnpm exec` outside the workspace may try to install and fail. A local test can invoke `node <clapper-repo>/packages/cli/bin/clapper.mjs ...` with the snapshot as `workdir`, after linking/resolving its dependencies. Do not install public lookalike packages to make the copy work.

## 2. Independent roles

Use available subagents for independent critiques when permitted. They are read-only on source and write only their designated review artifacts. A standard finished-film round uses visual and audio reviewers; add distribution review when relevant. If subagents are unavailable, perform separate explicitly labeled passes and disclose the lack of independence; never invent reviewer results.

1. **Creative director:** hierarchy, typography, palette, staging, acting, motion, continuity, pacing and narrative. Inspect the opening, ending, cuts and self-chosen mid-motion frames. Check the intended viewing size.
2. **Audio director:** actual mix evidence, continuity, phrase structure, foley timing, duck attack/release, masking, spectral balance, stereo/mono, dynamics and final peak. Audition if supported; state when analysis is measurement-only.
3. **Muted-feed/story reviewer (when relevant):** first two seconds, small-screen comprehension, setup/payoff emphasis, readable CTA hold and requested aspect ratio. Assess craft and audience comprehension; do not promise virality or invent platform rules.

For a scoped recut, reviewers inspect new parts and connecting boundaries; regressions in reused material remain in scope, but unrelated redesign does not.

## 3. Copyable brief (fill actual values)

```text
Role: [creative director | audio director | muted-feed/story reviewer].
Review only. Do not edit source, change the brief, or publish anything.
Film: [audience, purpose, requested scope, duration/fps, format, style intent].
Round: [N]. Source snapshot: [revision/hash including local edits].
Exact MP4: [absolute path, SHA-256]. Kit: [absolute round directory].
Read brief.md and scenes.json. Use the kit's actual tile cadence/layout,
not an assumed frame map. All scene ends are exclusive.

Evidence: contact-sheet.png (coverage/pacing), opening-2s.png (hook),
cut-*.png (boundaries), waveform.png, spectrogram.png, audio-cuts.txt,
lint.json (issues), brief.md (sampled-frame/copy-box coverage), and [cues path].
Choose additional frames/windows that could disprove an apparent success.
Still command: [exact pnpm --dir ... clapper still ... -c ... --frame ...].
Rendering access: [request frame batches from parent, OR isolated project path].
Do not launch harness commands concurrently against the shared project.

Prior fixes to verify: [issue IDs and changes; none for round 1].
KEEP from prior round: [specific successful decisions to preserve].

Judge the artifact, not the author's description. Seek concrete defects,
then attempt to refute your own finding with frames, geometry, cue timing,
measurements or playback before reporting. Separate bugs, taste, and unknowns.
Source alone does not prove a sound is absent or that motion looks bad.

Return a concise numbered report:
1. VERDICT: SHIP / REVISE / BLOCKED; optional score with reasoning.
2. COVERAGE: files/frames/time windows inspected; playback/listening actually
   performed or not; anything unverified.
3. FIX CHECK: each prior issue FIXED / PARTIAL / NOT FIXED / UNVERIFIED.
4. ISSUES, severity order (focus on the five most consequential):
   [ID | bug/taste/unknown | scene | absolute frames + local frames/time]
   evidence → viewer/listener consequence → concrete proposed fix → recheck.
5. KEEP: specific choices the next pass must preserve.
SHIP requires no unresolved blockers in your domain and sufficient evidence.
Do not award SHIP for an audio listening judgment you could not perform.
```

## 4. Adjudicate before patching

1. Reproduce each consequential claim. Batch extra frames around the reported interval; convert scene-local/absolute references explicitly. Reviewers have confused intentional asymmetry/cuts with bugs and missed existing whooshes.
2. Independent convergence is a strong investigation signal, not proof. Give specialists' evidence its proper weight: the historical visual reviewer praised an ending's loudness while the audio reviewer measured the same ending as louder than the intended climax.
3. Keep a small issue ledger: ID, evidence, severity, decision, fix, verification frame/window. Reject a false positive with the concrete evidence; label an intentional tradeoff. Don't silently drop reports or obey subjective exact-value suggestions mechanically.
4. Batch accepted edits after all relevant reports arrive. Changing timing means regenerate the scene map, score alignment, cut strips and frame references. Check every affected downstream scene.
5. Next-round reviewers get prior fixes and the KEEP list, with no instruction to approve them. Fresh reviewers reduce anchoring; if reusing reviewers, ask for independent remeasurement.

## 5. Stop on evidence

Two or three rounds was typical in the recorded work, not a magic number or a cap that excuses blockers. Continue targeted correction while concrete in-scope issues remain. If reports repeat unchanged taste preferences, no new evidence appears, or necessary playback/tools are unavailable, stop the loop and give the unresolved decision/limitation; don't churn toward a score.

1. For final delivery, encode at the requested size/settings, then generate the kit with `--video` from that exact MP4. The source, props and composition used for live DOM lint must still match that file. `--video` alone does not verify provenance.
2. Recheck prior fixes, lint coverage, boundary clips, opening, final held frame and final audio after muxing. A new encode can change peak/bitrate; a new aspect ratio changes composition and needs its own visual pass.
   Check encoded dimensions and duration from the media itself: the generated brief reports composition metadata, so a half-size draft may still be labeled with the full composition dimensions.
3. A post-review change to picture, sound, timing or props invalidates the affected review. Regenerate and verify it; never label an unreviewed replacement as the approved file.
4. Deliver a playable path/link, composition/format/duration, concise visual/audio verdicts, and any remaining limitation. No unconditional SHIP if critical dimensions are unverified. Publishing or uploading needs authorization from the active task.
