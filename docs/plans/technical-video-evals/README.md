# Technical-video benchmark design

Status: **working checkout implementation**. The linked Intern page preserves the original proposal; the local HTML includes current implementation status. See [the executable suite](../../../benchmarks/technical-video/README.md). No real model-quality or learner results have been produced.

- [Private Intern proposal](https://clapper-technical-video-evals.archastro.tryintern.dev)
- [HTML design and task board](index.html)
- [Structured design data](spec-data.json)

Recommendation: option 2, layered evals. Start with P0/P1: public contracts,
isolated author runs, existing render/review evidence, independent grounded judges,
calibration defects and blind comparisons. Add learner studies in P2.

The proposal distinguishes hard validity failures, anchored quality judgments,
actual learner transfer, and operational cost. It includes six development briefs,
12 initial full-film briefs across development/validation/sealed splits, 24 short
renderer fixtures, 12 paired judge-calibration cases, an exploratory learner pilot,
and eight bounded implementation tasks.

All thresholds and estimates are initial design choices. Small pilots do not
establish generalization or educational superiority. Candidate changes must not
access sealed scoring keys; experiments distinguish skill, runtime and author-model
changes. No one-number quality score can compensate for the wrong subject or wrong math.

Task checkboxes shortlist proposed work in the viewer's browser only. The task-plan
download includes selection and missing prerequisites; it creates no external tasks.

Validation of the design artifact: desktop/mobile render inspected, no horizontal
overflow, task filtering/budget calculation/JSON export checked, no page errors.
Intern publication revision: db47f86d937a83bd19134c02da29b93bd26b01f2.
Anonymous site access returns 401; the proposal stays behind company sign-in.
