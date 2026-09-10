# Adversarial review that converges

The successful session pattern was author inspection → specialist review → batched fixes → independent verification. Review is adversarial toward defects, not toward the brief. Preserve intentional style and scope; reviewers do not get authority to redesign the film or demand new deliverables.

## Required scope and release gate

| Requested result | Required independent coverage |
| --- | --- |
| Finished film/showcase or substantial polish | Visual + audio; music composition/performance if it has an original score |
| Final music-only composition | Music composition/performance + audio mix; one qualified independent reviewer may cover both |
| Scoped recut or audio-only revision | Changed domains, adjoining boundaries, and affected regressions; keep unchanged approvals only when their artifacts remain valid |
| Explicit draft, quick preview, render-only or diagnostic | Verify the requested operation; full creative review is not mandatory, and no claim of final approval is allowed |

The author must obtain and retain a report from each required role. For a finished film, visual and audio reviews are separate independent reviewer assignments—not two headings written by the author. Use available permitted subagents. The author remains responsible for reproducing findings, deciding fixes and verifying provenance.

**Only mark SHIP/final when all required domains have evidence-backed SHIP verdicts on the delivered artifact and no unresolved blocker/major defect.** Successful encoding, a lint pass, an attractive still, a numeric score, or the author's own confidence cannot satisfy this gate. If the user explicitly accepts a limitation, record it; do not relabel the missing review as passed.

If a reviewer cannot view motion or actually assess audio, its relevant verdict is BLOCKED, with the missing capability named. Measurement-only audio analysis is useful partial evidence, not a listening pass. If independent agents are unavailable/prohibited, perform clearly labeled author checks and return **review incomplete**, not a fabricated independent approval. Do not spawn agents contrary to higher-priority restrictions.

## 1. Freeze a reviewable round

1. Finish a draft and generate its kit. Record round, entry, composition, fps, duration, format, props, source revision (including uncommitted changes), exact MP4 path, and SHA-256. Store the scene map and reviewer reports under that round's output directory. A Git HEAD alone does not identify dirty source.
2. Check the author-selected opening, every cut, high-risk motion and final frame. Fix obvious failures before spending reviewer effort.
3. Give every reviewer the same immutable MP4/kit, brief, current scene map, source access, and exact still command. Don't describe desired verdicts or hide known weak spots.
4. No author edits while the round is being inspected. The kit can be read in parallel. Current standalone builds isolate scratch per invocation; use distinct reviewer output directories. Older versions share `.clapper/harness-build` and must serialize harness commands or use isolated project copies. If version capabilities are unknown, reviewers request frame batches from the parent until isolation is established.

For an isolated snapshot, keep its own writable `.clapper` directory and resolve imports through the installed workspace packages. A copied `package.json` with `workspace:*` is not a standalone install: `pnpm exec` outside the workspace may try to install and fail. A local test can invoke `node <clapper-repo>/packages/cli/bin/clapper.mjs ...` with the snapshot as `workdir`, after linking/resolving its dependencies. Do not install public lookalike packages to make the copy work.

## 2. Independent roles

Assign available permitted subagents before calling the film finished. They are read-only on source and write only their designated review artifacts. They should test the author's claims, not congratulate the implementation. Give reviewers the brief and evidence, not an instruction to obtain a particular score. If agents are unavailable, use the incomplete-review path above; separate author passes do not satisfy independence.

1. **Creative director:** hierarchy, typography, palette, staging, acting, motion, continuity, pacing and narrative. Inspect the opening, ending, every cut and self-chosen mid-motion windows at the intended viewing size. Watch playback or consecutive frames sufficient to judge motion; isolated stills do not establish smoothness or pacing. Check each delivered aspect ratio.
2. **Audio director:** assess the actual muxed soundtrack, not only pre-encode WAVs. Check continuity, foley timing, duck attack/release, masking, spectral balance, stereo/mono, dynamics, clipping and final peak. Use listening plus measurements; say exactly which windows were auditioned. With no listening capability, return BLOCKED for listening and retain measured findings as partial evidence.
   - **Original music is an explicit sub-review:** motif development, harmony, voicing/register, groove, expression/articulations, instrument realism, musical arc, ending and synchronization to visible action. Compare rendered notes to intended score; look for silent/out-of-range notes and mechanical repetitions. Require the audio director to report MUSIC separately from MIX, or assign an additional music reviewer. A good LUFS value does not prove a good composition.
3. **Muted-feed/story reviewer (when relevant):** first two seconds, small-screen comprehension, setup/payoff emphasis, readable CTA hold and requested aspect ratio. Assess craft and audience comprehension; do not promise virality or invent platform rules.

For a scoped recut, reviewers inspect new parts and connecting boundaries; regressions in reused material remain in scope, but unrelated redesign does not.

## 3. Copyable brief (fill actual values)

```text
Role: [creative director | audio director including music | music reviewer | muted-feed/story reviewer].
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
Use unique outputs; serialize harness commands if build isolation is unverified.

Prior fixes to verify: [issue IDs and changes; none for round 1].
KEEP from prior round: [specific successful decisions to preserve].

Judge the artifact, not the author's description. Seek concrete defects,
then attempt to refute your own finding with frames, geometry, cue timing,
measurements or playback before reporting. Separate bugs, taste, and unknowns.
Source alone does not prove a sound is absent or that motion looks bad.

Return a concise numbered report:
1. VERDICT: SHIP / REVISE / BLOCKED for your required domain(s).
   Audio with original music: report MUSIC and MIX separately. Scores are optional.
2. COVERAGE: files/frames/time windows inspected; playback/listening actually
   performed or not; anything unverified.
3. FIX CHECK: each prior issue FIXED / PARTIAL / NOT FIXED / UNVERIFIED.
4. ISSUES, severity order (lead with the five most consequential; omit no blockers):
   [ID | blocker/major/minor | bug/taste/unknown | scene | absolute + local frames/time]
   evidence → viewer/listener consequence → concrete proposed fix → recheck.
5. KEEP: specific choices the next pass must preserve.
SHIP requires no unresolved blockers/major defects and sufficient evidence.
Do not award SHIP for an audio listening judgment you could not perform.
BLOCKED means required evidence/capability is missing, not that the film is good.
```

## 4. Adjudicate before patching

1. Reproduce each consequential claim. Batch extra frames around the reported interval; convert scene-local/absolute references explicitly. Reviewers have confused intentional asymmetry/cuts with bugs and missed existing whooshes.
2. Independent convergence is a strong investigation signal, not proof. Give specialists' evidence its proper weight: the historical visual reviewer praised an ending's loudness while the audio reviewer measured the same ending as louder than the intended climax.
3. Keep a small issue ledger: ID, evidence, severity, decision, fix, verification frame/window and reviewer verdict. A blocker prevents correct delivery; a major defect materially harms the brief, comprehension, picture or sound; a minor is non-blocking polish. Reject a false positive with concrete evidence and let the reviewer re-evaluate it. Escalate a disputed major tradeoff to the user rather than unilaterally calling it approved. Don't silently drop reports or obey subjective exact-value suggestions mechanically.
4. Batch accepted edits after all relevant reports arrive. Changing timing means regenerate the scene map, score alignment, cut strips and frame references. Check every affected downstream scene.
5. Next-round reviewers get prior fixes and the KEEP list, with no instruction to approve them. Fresh reviewers reduce anchoring; if reusing reviewers, ask for independent remeasurement. A patch or author's claim is not verification: each accepted blocker/major must receive FIXED on fresh evidence before closure.

## 5. Stop on evidence

There is no mandatory round count or numeric score target. At minimum, collect one complete independent round; if it finds accepted blockers/major defects, a correction-and-recheck round is required. Continue targeted correction while concrete in-scope issues remain. If reports repeat unchanged taste preferences, no new evidence appears, or necessary playback/tools are unavailable, stop with **review incomplete** and the precise unresolved decision/limitation. A stopped loop is not a SHIP verdict.

1. For final delivery, encode at the requested size/settings, then generate the kit with `--video` from that exact MP4. The source, props and composition used for live DOM lint must still match that file. `--video` alone does not verify provenance.
2. Recheck prior fixes, lint coverage, boundary clips, opening, final held frame and final audio after muxing. A new encode can change peak/bitrate; a new aspect ratio changes composition and needs its own visual pass.
   Check encoded dimensions and duration from the media itself: the generated brief reports composition metadata, so a half-size draft may still be labeled with the full composition dimensions.
3. A post-review change to picture, sound, timing or props invalidates the affected review. Regenerate and verify it; never label an unreviewed replacement as the approved file.
4. Save final role reports and the closed/open issue ledger in the final kit. Each report names the reviewed file hash; include source snapshot, export settings and any explicit user-accepted limitation. Deliver the playable path/link, composition/format/duration, report paths and separate VISUAL / AUDIO / MUSIC verdicts as applicable. State REVIEW INCOMPLETE for any missing required check. Publishing or uploading still needs authorization from the active task.
