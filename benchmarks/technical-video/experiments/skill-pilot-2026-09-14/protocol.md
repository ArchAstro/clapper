> Historical protocol and iteration notes. The completed outcome is in README.md.

# Skill optimization pilot — 2026-09-14

Status: development runs in progress. Baseline D05 exceeded its token budget; its completed author export is retained for diagnostic review, not counted as a successful run.

1. Compare the current checkout skill with one narrowly revised candidate informed
   by observed baseline defects. Development experiment, not a sealed evaluation.
2. Cases: D05 bounded-queue backpressure and D01 Universal Transformers. Two topic
   families, one generation each per arm. This is exploratory; no confidence claim.
3. Author: fresh Codex CLI 0.154.0 sessions, configured account selector gpt-6-astra,
   high reasoning. The server model revision is not independently pinned/verified.
   Existing ChatGPT subscription; zero incremental API charges reported by this
   adapter do not measure subscription value or quota consumption.
4. Runtime, author adapter, briefs and budget stay fixed across arms. Source pack
   contains public curator notes. Host-dev is not a security sandbox; author access
   is restricted by instructions. No claim of sealed isolation or zero contamination.
5. Inspect final media/source/transcript and retain independent scoped critiques.
   Unavailable audio listening remains BLOCKED. Never generate synthetic approvals.
6. Accept only narrow skill changes with a reproduced baseline failure and improved
   candidate behavior, checking the second family for regressions. Retain failures,
   even infrastructure failures, separately from completed-film quality findings.
7. Full promotion remains ineligible: two development families, no human-confirmed
   judge calibration, no independent learner study, and potentially missing audio.

Live artifacts: `/private/tmp/clapper-skill-optimization/`. The first attempt under
macOS `/tmp` failed before authoring because the containment checker compared the
symlink spelling against `/private/tmp`. The actual baseline uses canonical paths;
that failed receipt remains under `baseline/`, and `baseline-v1/` is the campaign.


## Revisions under test

- v1: prepare narration before final picture timing. A fresh author still allocated
  one speech window too narrowly; the instruction was not sufficient to prevent it.
- v2: retain early measurement, give a concrete separate-probe workflow, and add
  event-phase consistency plus mid-transition inspection to technical explainers.
  Motivation: independently observed final-video defects, reproduced by the owner,
  in the baseline D05 export. See baseline-visual-review.md.
- The working skill remains unchanged until candidate evidence is inspected.
- Runs overlap on this machine. Wall-time differences are descriptive only; CPU
  contention prevents a controlled speed claim. Cached input is included in the
  token cap; the cap remains fixed for all three arms.

- v3 (final planned candidate): v2 plus explicit operands/paths and matrix axes
  matched to the on-screen example; a preconfigured eval-author route with ESM
  project metadata and a clear handoff of the final full render to the runner.
  These target repeated project-init failures, redundant full exports, and the
  independently reproduced UT diagram defects in baseline-ut-review.md.
- No further full-film candidate arms are planned for this pass. Retain all four
  arms and report missing/failed review coverage rather than select only successes.


## Diagnostic renders after budget failures

The final D05 author used 2,431,246 input/output tokens and exceeded the unchanged
2,000,000 cap. A separate operator render of its retained source is being made for
visual diagnosis. It does not change that run's status or count as a successful
benchmark export. Encoding uses the same runtime, 1280×720 at30fps, CRF20/veryfast.
No additional author revision is introduced by that render.
