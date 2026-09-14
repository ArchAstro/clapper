# Pre-production adversarial gate — SHIP TO FULL RENDER

**Verdict: SHIP for full rendering.** The confirmed Universal Transformer subject, dedicated intuition opening, top-down progression, causal diagrams, and mathematical content now pass this pre-production gate. No open blocker or major content finding remains. This approves production from the inspected source; it is not a final motion/audio approval.

## Evidence

Reviewed current `src/beats.ts`, `intuition.tsx`, `architecture.tsx`, `training.tsx`, `index.tsx`, and the replacement storyboard. Inspected `out/recurrent-contact.png` covering all 18 scenes, then full-resolution `out/recurrent-proof/looped-transformers-02588.png` (architecture), `04908` (attention), `07923` (learning loop), and `12243` (shared-gradient formula). Old proofs and old MP4 were excluded.

Primary-source basis remains [Universal Transformers, §2 / Figure 2 / equations 4–7 and Appendices A/C](https://arxiv.org/html/1807.03819v3#S2). The user has now confirmed this paper; paper selection is no longer provisional.

## Prior findings: FIXED

1. **Output feedback origin — FIXED.** The yellow autoregressive return now starts at the selected “drawer” token and returns to PREFIX with arrowheads. The decoder's blue internal loop is separate. Full frame 02588 confirms the two recurrences represent different objects.
2. **Attention fan-out — FIXED.** CURRENT STATES now feeds queries, keys, and values. Queries/keys lead to matching-score normalization; values and mixing weights converge at WEIGHTED MIX. Frame 04908 confirms all dependencies.
3. **Prediction operation — FIXED.** The decoder→token edge names projection and softmax; the token box identifies selection from probabilities. The narration explains probabilities before selection.
4. **Masking explanation — FIXED.** Architecture narration explicitly says future output tokens are hidden. This resolves the possible confusion between parallel position processing and unrestricted decoder access.
5. **Training through discrete output selection — FIXED.** Narration and picture use token probabilities and target likelihood, not a sampled word as a differentiable quantity. Frame 07923 includes the shifted-target-prefix teacher-forcing note.
6. **Math introduced before its local forward problem — FIXED.** The new projection scene shows W and x producing y, the downstream network producing a loss, and incoming g before the gradient-matrix scene.

## Required task-fit gates: PASS

1. **Correct paper:** actual trained Universal Transformer architecture. No programmable-computer, instructions, scratchpad, or frozen-task-network narrative remains in live wiring.
2. **Intuition first:** the key/handoff/drawer story is introduced before architecture. Input→internal refinement→answer completes a whole journey. Hypothetical intermediate reasoning is explicitly illustrative; improvement is not guaranteed.
3. **Top-down architecture:** the full encoder/decoder/prediction map precedes component detail. The axes scene distinguishes depth from token positions and generation, with separate encoder/decoder parameter sets tied within depth.
4. **One abstraction lower, then return:** state/signals→attention→residual/norm→transition→residual/norm→next state is a complete revision; the return scene then traverses the original input-to-answer path again.
5. **Learning before calculus:** probability prediction→target comparison→loss→backpropagation→optimizer→next prediction forms a complete learning loop before unrolling and derivatives.
6. **Math reconnects:** scalar connection→full local projection→matrix gradients→differential→shared-depth gradients→original story. The local examples are clearly separated from the complete Transformer.

## Scientific and mathematical checks: PASS

- Position and depth signals, shared recurrent parameters, residual connections, normalization, and the feedforward-versus-convolution choice are represented consistently with the source. Dropout omission is labeled.
- Encoder conditioning of the decoder, masked output-prefix processing, next-token probabilities, token feedback, and encoder-once generation are distinguishable in text and picture.
- ACT is explicitly optional and per position. The derivation explicitly switches to fixed depth; no claim of differentiating through an answer-truth stopping test is made.
- Scalar example: x=3, w=.5, y=1.5, target=1 gives loss .125, output gradient .5, and weight gradient 1.5. The values remain at the stated base point.
- Matrix example: W=[[1,2],[-1,1]], x=[3,1] gives y=[5,-2]. For incoming g=[1,-2], gxᵀ=[[3,1],[-6,-2]] and Wᵀg=[3,0]. The incoming gradient is explicitly supplied by the rest of the model, so a second local target need not be invented.
- First differential and coefficient interpretation are correct; the entrywise matrix inner product is named. Column-vector notation is explicitly selected for the teaching slice.
- Shared-parameter BPTT equations use local partial derivatives and fixed initial state with respect to the isolated block's parameters. Depth signals are marked implicit. Other trainable components still receive their own gradients. The unroll scene explicitly isolates one recurrent block, preventing its schematic from being mistaken for the complete encoder/decoder training graph.

## Production boundary

The proof stills establish scene identity, readable equations, corrected dependencies, and story coverage. They do not establish the final pace, spoken-number/highlight synchronization, or narration quality. Review those against the newly rendered film before final delivery. No additional source change is required by this gate.
