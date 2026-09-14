# Technical-video evaluation workflow

Use this when running a benchmark, comparing a candidate skill/runtime, or diagnosing
repeated technical-explainer failures. First resolve the CLI and run `clapper eval
--help`; the eval commands are a new checkout feature and are not in published0.4.0.
Use the checkout CLI until a release containing them is installed.

1. **Freeze intent:** original brief, audience, exact source pack, duration, viewing
   size and output format. Resolve an essential ambiguity once; do not ask again
   when the exact paper/source is already given. Never replace the user's question
   with an easier author-written brief.
2. **Complete the whole before the parts:** follow [explainers.md](explainers.md).
   Write the complete journey, abstraction levels/zoom targets and grounded claims
   before rendering. Keep a consistent example and return to the whole.
3. **Keep the author/evaluator boundary:** author inputs contain only public task
   material and allowed sources. Do not read private keys, hidden transfer answers,
   calibration labels or other candidates. Your own critique is repair feedback,
   not the benchmark's independent judgment. Honour the supplied repair/resource cap.
4. **Retain evidence:** first plan, source citations, revision history, transcript,
   final source, exact MP4 and measured tool usage. Do not invent usage. A candidate
   with an unobserved modality is BLOCKED for that modality, not approved by analogy.
5. **Run the pipeline:** `eval run` invokes the configured author adapter and the
   existing render/review pipeline; `eval grade` creates an independent packet or
   imports a completed judgment. No model provider is silently chosen. See the
   installed benchmark README or `benchmarks/technical-video/README.md` in the checkout.
6. **Compare fairly:** hold the brief, sources, model, budgets and runtime fixed for
   a skill experiment. Declare runtime/author/bundle interventions explicitly. Use
   fresh conversations, blind A/B order, multiple cases and repeats. Retain failed
   and blocked assignments. Inspect per-axis regressions, not a flattering average.
7. **Improve the owning layer:** repeated scope or teaching-order failures belong in
   the skill; repeated geometry/rendering failures suggest a primitive or collector
   fix. Add a concrete regression before making that change. Retest development
   cases, then independently curated validation; do not tune to holdout feedback.
8. **Keep claims scoped:** regression success is not film quality; preference is not
   learning. Generated calibration clips require human-confirmed labels. Actual
   learner transfer requires target viewers and a preregistered protocol. Only the
   human owner promotes a candidate into the production skill/runtime.

Reports use PASS/FAIL/BLOCKED with exact artifact hashes, timestamps and source spans.
A correct equation about the wrong paper is a hard failure. A contact sheet cannot
establish motion quality, and a waveform/transcript cannot establish pronunciation.

## Author handoff contract

When `eval run` supplies the CLI, dependencies, input pack and a fresh workspace,
use them directly. In a new source-backed workspace, create `package.json` with
`"type": "module"` before loading a TypeScript narration script; without it the
module can load with the wrong default-export shape. A minimal `clapper.json`
requires `runtime` (the supplied runtime version), `entry`, and `composition`;
add `narration` when used. Preserve existing project files instead of replacing
them. This is the preconfigured eval route, not a new standalone installation.

The runner's stated handoff owns the final full-resolution export, evidence kit
and independent review. Before submission, validate the source/plan and narration,
inspect proof frames and short windows around risky causal transitions, and fix
concrete defects within the repair budget. Then write the requested submission
and exit with enough budget for the runner. Do not spend that same budget on a
duplicate whole-film render/review cycle when the runner explicitly performs it.
The submitted source must still describe the entire requested film; this handoff
is not final approval and never waives missing motion or listening review.
