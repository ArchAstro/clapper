# Clapper skill optimization pilot — 2026-09-14

**Result: scoped skill improvements, no budget-qualified winner.** Eight real
Codex author runs covered two development topics. Six of eight sampled diagnostic
reviews preferred the revised films; reversed-order reviews were mixed. All eight
author runs exceeded the unchanged token cap. No listening or learning claim.

1. **Changes kept.** The skill now measures speech before final picture timing,
   synchronizes visual states/counters/captions, makes operands and architectural
   paths explicit, and distinguishes the preconfigured eval-author handoff from
   ordinary production. Source-backed eval projects initialize ESM/config metadata
   before narration. See [the skill](../../../../skills/clapper/SKILL.md).
2. **Method.** One generation per topic per arm; same source packs, runtime, author
   adapter, account model selector (`gpt-6-astra`, high), CLI0.154.0 and caps.
   Host-dev, not a sealed sandbox. The two topics are bounded queues and Universal
   Transformers. Source packs are curator-written notes, not independently
   validated full primary publications. See [protocol and iteration history](protocol.md).
3. **Measured author outcomes.** The cap was 2,000,000 input/output tokens including
   cached input, with a 1,200-second total wall budget. No threshold was relaxed.

| Skill arm | Queue tokens | UT tokens | Speech-window failure commands | Budget passes |
|---|---:|---:|---:|---:|
| Baseline | 2,476,171 | 2,585,923 | 3 | 0/2 |
| v1: timing prose | 3,984,073 | 2,602,104 | 4 | 0/2 |
| v2: probe + visual state | 3,635,716 | 3,215,184 | 1 | 0/2 |
| v3: final film candidate | 2,431,246 | 2,054,663 | 0 | 0/2 |

The final candidate used 1.8% fewer reported tokens on queues and 20.5% fewer on
UT than the baseline. These single-run differences do not establish a reliable
efficiency effect. Runs overlapped; wall time is not a controlled speed result.
Incremental API charge was not applicable to the existing ChatGPT subscription;
subscription/quota cost was not measured. The pilot adapter initialized repair
counts to zero: **do not interpret them as measured zero-repair runs**. Its exact
used source is archived in [used-author-adapter.json](used-author-adapter.json);
the reusable adapter's subsequent bookkeeping correction is outside this trial.
Full receipts are summarized in [results.json](results.json).

4. **Diagnostic comparisons.** Original budget failures remain failures. The two
   final-candidate source projects received separate operator renders for visual
   diagnosis, using the unchanged runtime. Four reviewers inspected each topic;
   two saw baseline=A/revised=B and two saw the reversed order. These are two topic
   families, not eight independent topics. Reviewers inspected decoded frames and
   sampled consecutive transitions, not full continuous playback or audio.

| Reviewer | Queue preference | UT preference |
|---|---|---|
| Initial content | Revised | Revised |
| Initial visual | Revised | Revised |
| Reversed content | Baseline | Revised |
| Reversed visual | Revised | Baseline |

The revised queue film has clearer continuous flow and state labels; the baseline
has stronger backlog arithmetic and numerical latency. The revised UT film makes
residual operands/paths and transition mechanics inspectable; the baseline has
strengths in its initial whole-system journey, shifted training targets and explicit
weighted sums. See [preferences](diagnostic-preferences.json),
[queue content](queue-blind-content.md), [queue visual](queue-blind-visual.md),
[UT content](ut-blind-content.md), [UT visual](ut-blind-visual.md),
[reversed content](counter-content.md), and [reversed visual](counter-visual.md).

Remaining film defects include first-use definitions, incomplete numerical examples,
brief transit/state ambiguity, gradient contributions not clearly attached to their
parameter uses, and one clipped illustration label. No film receives final approval.

5. **Final wording scope.** Full-film evidence applies to v3. Two subsequent narrow
   clarifications protect requested definitions/worked examples when cutting copy
   and distinguish dispatch/transit/arrival. An independent [plan-only forward
   check](final-plan-check.md) retained the unit definition, complete request journey
   and worked queue accounting. Those final clarifications have not received another
   full-film trial. [Timing-probe verification](timing-probe-verification.json) used
   the baseline's 12 real cached Kokoro takes: all fit a 272.6-second schedule without
   changing text, voice or speed. This is a timing check, not a listening review.
6. **Runtime defect fixed separately.** A range beginning inside file narration
   shifted its start negative and passed a negative delay to FFmpeg. Cropping after
   cue-local fades now preserves source position/envelope and keeps delay nonnegative.
   The fix was applied after all experiment and diagnostic exports. The regression
   compares two cropped intervals with the full mix, including fade phase; the exact
   previously failing 2340–2544-frame CLI range now produces a 6.8-second MP4 with
   audio. Run `pnpm test:audio-range`. Repository checks/typechecking/unit tests and
   all24 evaluator fixtures passed. CI now includes the audio-range regression.
7. **Promotion remains blocked.** No budget passes, no independently curated holdout,
   no human-confirmed grader calibration and no learner study. The formal comparison
   reports zero qualified wins and two blocked pairs. The pilot produced skill changes and a
   runtime fix; it does not qualify a release.

Local, gitignored artifacts are retained at
`.clapper/skill-optimization-2026-09-14/`: `index.html` contains playable diagnostic
exports, `receipts/` holds verified original run artifacts, and the review directories
contain sampled evidence. The original `/private/tmp` runs are also retained.
