# Technical-video evals

This is an executable development suite, not a claim that a model makes good films.
The evaluator's own regression fixtures and protocol tests are separate from real
model authoring, calibrated judgment, and human learning outcomes.

## Quick verification (no model API calls)

```fish
pnpm test:evals:fixtures
pnpm test:evals
```

The first command runs 24 fixed checks through real browser/media collectors.
The second uses an explicitly deterministic fixture author, renders real MP4s,
imports synthetic protocol-test judgments, and exercises the blind HTML report.
Those synthetic judgments are never evidence of video quality or learner improvement.

## Run an actual author

```fish
node packages/cli/bin/clapper.mjs eval list
node packages/cli/bin/clapper.mjs eval init --out .clapper/my-candidate.json
# Configure the generated author command/model/version and budget first.
node packages/cli/bin/clapper.mjs eval run --candidate .clapper/my-candidate.json --out .clapper/evals/candidate --repeats 2
```

No model/provider is silently selected, and no API call is made without a configured
adapter. The trusted author adapter receives `{request}` as an absolute JSON path;
its working directory is a new output workspace. It must start a fresh conversation,
read the public brief and supplied skill/source pack, and produce:

```json
{
  "schema": 1,
  "entry": "src/index.tsx",
  "composition": "film",
  "plan": "plan.json",
  "transcript": "transcript.txt",
  "revisions": [],
  "usage": { "tokens": 1234, "costUSD": 0.12, "repairs": 0 }
}
```

The above usage is a schema example, not a measurement. Save it as `submission.json`.
`plan.json` contains `schema:1`, `sourceIds`, a complete `journey`, `levels` with
`name/journey/zoomTarget`, and `claims` with `id/text/sourceId/sourceSpan`. Revisions
are ordered file paths retaining author-critic repair history. For a genuinely
ambiguous fixture, emit `clarification-request.json` with `schema:1, question` and
exit; the runner supplies the one scripted user response and invokes the adapter
again. Usage must be cumulative. Exact-source cases do not permit redundant questions.

The runner validates declared plan/source consistency before its render. This does
not prove semantic truth; independent graders must inspect the final film. Authors
may use their own critic within the fixed repair budget, never hidden grading keys.

### Isolation and provenance

- **host-dev** creates fresh processes/workspaces but is NOT a filesystem/security
  sandbox. It is allowed only on development cases. Model conversation isolation is
  the trusted adapter's responsibility; process isolation alone does not prove it.
- **container** requires an immutable image ID/digest. Only public input (read-only)
  and the output workspace are mounted. Rendering and collection also run inside
  the container. Root is read-only; capabilities are dropped; no Docker socket is
  mounted; render/collection have no network. Limits:2 CPUs,4GiB,256 processes.
- Author networking is explicit (`none` or `bridge`). For source-controlled research
  comparisons prefer `none`; an API-using harness may require a controlled proxy or
  the operator's explicit `bridge` choice. Do not supply grading keys as environment
  variables. Only named environment variables are forwarded to the author.
- Runtime, skill, source pack and trusted command-file hashes are retained. For a
  custom host runtime, supply its matching `runtime.dependencyRoot`; do not mix an
  older CLI with newer core dependencies. The source-checkout shortcut is `{clapper}`.
- Total wall time is enforced across author/render/collection. Artifact-size limits
  reject oversized submissions/exports. Token/cost values are adapter-reported and
  checked after execution; the adapter must enforce provider limits before spending.
  Reported usage is never labelled independently metered.
- `--resume` verifies configuration and frozen outputs, skips completed assignments,
  and continues pending ones. Interrupted/failed assignments are retained, not quietly
  retried or replaced. A fresh campaign is required for a new attempt policy.
  `eval run` returns a campaign receipt even when assignments fail; automation must
  inspect its `results` statuses and each `run.json`, not infer quality from exit0.

### Container proof

```fish
docker build -f benchmarks/technical-video/examples/Dockerfile -t clapper-eval:local .
set -l eval_image (docker image inspect clapper-eval:local --format '{{.Id}}')
pnpm test:evals:container "$eval_image"
```

The image is an evaluation toolchain, not a published platform runtime. Add
`--build-arg INSTALL_VOICES=1` when building an image for real spoken-film tasks.
Without it, the protocol fixture is intentionally silent. Use the resulting digest
in candidate configuration, not the mutable local tag. Example container commands
use `node /opt/clapper/packages/cli/bin/clapper.mjs` and image-local author tools.

## Independent grading

```fish
node packages/cli/bin/clapper.mjs eval grade --run .clapper/evals/candidate/runs/D01-0 --judge benchmarks/technical-video/judges/human.json
# Inspect the packet and complete its template, using actual video/audio access.
node packages/cli/bin/clapper.mjs eval grade --run .clapper/evals/candidate/runs/D01-0 --judge my-judge.json --review completed-judgment.json
```

A judge profile declares `schema,id,version,kind,capabilities`, with an optional
`adapter.command` containing `{request}` and `{response}`. Configure separate judge
IDs; the author cannot be its own final judge. Profiles are operator-controlled
capability declarations, not proof that a model saw/heard media. The trusted adapter
must actually provide those media. No observation may be inferred from source alone.

A profile grades the constraints within its declared capabilities. At least two
independent judge identities and coverage of every required constraint are needed
for a run PASS. Ratings require evidence and compatible observation. Any material
constraint FAIL defeats high ratings. Missing evidence/modalities are BLOCKED.
Every citation binds a frozen file SHA, timestamp interval and source span. Existing
artifact tampering invalidates the evaluation. No judge defaults or fallback models.

## Blind comparison and persistent votes

```fish
node packages/cli/bin/clapper.mjs eval compare --baseline .clapper/evals/baseline --candidate .clapper/evals/candidate --intervention skill --out .clapper/evals/comparison
# Open comparison/report/index.html; watch A/B, use scene/seek controls, export votes.
node packages/cli/bin/clapper.mjs eval ballots --comparison .clapper/evals/comparison --review clapper-ballots.json
node packages/cli/bin/clapper.mjs eval report --comparison .clapper/evals/comparison
```

`comparison.json` is the private assignment map; share only `report/` with blind
reviewers. Identity hints inherent in videos may remain. The HTML has no server
write endpoint: votes become durable only after explicit export/import. Duplicate
reviewer/pair votes and mismatched movie hashes are rejected. Changed ballot journals
are rejected on read; promotion also requires matched judge profiles across arms. Blocked pairs remain
in denominators. `analysis.html` shows unblinded results, per-axis coverage, costs,
reasons, family-clustered exploratory intervals and promotion blockers.

Skill/runtime/author/bundle interventions are explicit, and unmatched assignments
or control changes are rejected. These are proposed pilot promotion thresholds;
there is no automatic release or skill replacement. A development pilot cannot
establish generalization. Neither preference nor a test double establishes learning.

## Calibration is a separate test of the judges

```fish
node packages/cli/bin/clapper.mjs voices install
node packages/cli/bin/clapper.mjs eval calibration-build --out .clapper/eval-calibration
node packages/cli/bin/clapper.mjs eval calibration-judge --set .clapper/eval-calibration/calibration.json --judge my-judge.json --out .clapper/calibration-judging
# Human profiles emit a template; configured adapters may return a response.
node packages/cli/bin/clapper.mjs eval calibration-import --run .clapper/calibration-judging --review completed-response.json
node packages/cli/bin/clapper.mjs eval calibrate --set .clapper/eval-calibration/calibration.json --predictions .clapper/calibration-judging/predictions.json --judge my-judge.json --out .clapper/calibration-receipt.json
```

The generator makes 12 targeted clean/broken pairs, including real narration.
Generated gold is UNQUALIFIED: an expert must inspect the actual clips and set
`curator.name/confirmedAt` in the private set only after confirming the labels.
Each clip tests its stated criterion, not whether it is a great complete lesson.
Judge packets use opaque filenames and randomized order; private maps stay outside.
The initial policy is at least11/12 defect detections, at most1/12 false alarms,
no critical misses and no blocked items. Passing is not a population-reliability
claim. Add the receipt path to the judge profile's `calibration` field to qualify it.

## Corpus status and human phase

Six development briefs ship with hash-pinned curator-written source notes and
primary references. These notes are NOT copies of the primary publications and
need expert verification for confirmatory evaluation. Related UT/backprop briefs
share one family. Numerical/queue oracles are independent of authored film code.

Validation/holdout data must be supplied as a separately curated suite outside the
public checkout. Family leakage across splits is rejected. The implementation does
not manufacture a sealed holdout from public examples or claim the proposed12-case
corpus is already independently validated. Stable promotion requires at least12
fresh families, calibrated graders, full evidence and no material regression; this
six-brief development set cannot satisfy it.

Actual learner recruitment, consent, grading and a powered follow-up remain human
work. See [learner-protocol.md](learner-protocol.md). There are no learner results.

## Resolving a false-positive judgment

`eval adjudicate --run <run-dir> --judge <human-profile.json> --review <decision.json>`
records an explicit human decision to exclude a specific invalid judgment. The
profile must be `kind: human`; agents must not synthesize human approval. A decision
contains schema1,runId,videoHash,summary,evidence refs, and an `exclude` list of
`file,sha256,reason` entries bound to original judgment files. Original records stay
on disk. Excluding one bad judgment does not waive the two-judge/evidence gate;
obtain fresh independent coverage when necessary.

The private run-level oracle is copied outside the author's mount. Development
oracle implementations/data are public and must not be called sealed gold. Private
suites can supply an `oracle` with a relative file path and SHA256; it is available
only to the evaluator packet. Hash-pinned cases, source notes and oracles must be
updated deliberately as a new suite revision when their content changes.
