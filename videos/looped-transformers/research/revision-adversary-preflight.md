# Revision adversary preflight

**Verdict: prior film fails task fit. Rebuild the explanation around the intended recurrent architecture. Mathematical correctness cannot compensate for explaining the wrong paper.** This is a pre-production scope check, not approval of an unwritten replacement.

## 1. Paper decision

**Recommended default:** Dehghani et al., *Universal Transformers* (2018 preprint / ICLR 2019), because the user requested a foundational architecture paper. **This is an inference, not confirmation of user intent.** The phrase “recurrent transformer” is not a unique paper identifier.

If the intended subject is modern latent test-time reasoning, Geiping et al., *Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach* (2025), is a stronger match: it studies an iterated recurrent language-model block and computation scaling without longer generated reasoning traces. That is a different film, not an interchangeable citation. [Primary abstract](https://arxiv.org/abs/2502.05171).

Remove the programmable-computer framing completely from this replacement unless the user explicitly restores it. Do not salvage the old program-counter/memory/instruction cycle merely because those animations already exist.

## 2. UT architecture facts that the detailed pass must preserve

1. Encoder–decoder model; recurrence revises depth, not successive input positions. Token representations update in parallel within each depth step.
2. Encoder: embeddings → repeated self-attention and transition → final contextual states. The transition can be a positionwise feedforward network or separable convolution.
3. Parameters are reused across depth; encoder/decoder blocks need not share parameters with each other. Position and depth sinusoidal signals are added each step.
4. Residual connections and layer normalization surround sub-blocks; dropout exists. Figure 2 intentionally omits these details; consult equations 4–5 and Appendix A when zooming in.
5. Decoder: masked self-attention → attention to final encoder states → transition. Generation is autoregressive; teacher-forced training uses shifted targets. Output projection and softmax produce vocabulary probabilities.
6. ACT is optional and per position: accumulated halting probabilities, remainder, and maximum-step cap matter. Halted positions retain state; this is not a global “the model knows the answer” switch. Appendix C includes state interpolation.

Sources: [§2, Figure 2, equations 4–7](https://arxiv.org/html/1807.03819v3#S2); [Appendices A/C](https://arxiv.org/html/1807.03819v3#A3). These are paper-specific constraints, not a demand to crowd every detail onto the opening diagram.

## 3. Top-down acceptance checklist

1. **Dedicated intuition opening, before terminology.** Introduce one concrete input and desired output. Show why revisiting an internal interpretation can help. Distinguish input, internal representation, and produced answer. Do not begin with citations, gradients, or a box whose purpose is unexplained.
2. **First complete trip:** show the same example enter the model, undergo a few refinement passes, and produce an answer. Finish the whole story before opening any box. Keep three or four visual concepts; no matrix symbols. Label hand-authored reasoning/attention as illustrative rather than measured model behavior.
3. **Second complete trip:** return visibly to the original input; replace each broad box with its immediate children and traverse the entire pipeline again. Explain what each child receives, changes, and returns. End on the same output, then explain training at this same level: target → error → backwards credit → shared-weight update → next attempt.
4. **Third complete trip:** revisit the same example using actual vectors, attention, residual paths, and output probabilities. Each equation must attach to a previously explained arrow. When simplifying to a toy network, state what was removed and return to the architecture afterward.
5. **Only then matrix calculus:** first identify the scalar training objective and parameters being trained. Explain sensitivities before notation. Trace one perturbation all the way to the loss, then generalize to outer products and transposes. Unroll shared-weight refinement; show all use-specific contributions meeting at one optimizer update. Fixed inputs, local partials, and loss placement must be explicit.
6. **Close the loop:** return to the original problem and summarize what the refinement changed and what training learned. The viewer must be able to retell the whole process without recalling algebra.

## 4. Review gates before expensive production

1. **Task-fit gate:** paper choice and storyboard independently checked against the user's actual correction. A scientifically accurate off-topic film fails.
2. **Narrative gate:** storyboard contains an identifiable complete beginning-to-end pass at each abstraction level. A sequence of isolated component lessons fails, even when individually clear.
3. **Causality gate:** no “pass 1 finds X, pass 2 finds Y” claim without either measured evidence or an illustrative-example label. More passes are not guaranteed improvement, convergence, or human-like thought.
4. **Math gate:** coherent shape convention. If the architecture uses row-wise H and the teaching derivation uses column x, explicitly mark the convention switch. Attention scale uses head/key dimension. Shared forward weights do not imply identical activations or an optimizer update during inference.
5. **Film gate:** review actual exported frames and narration together against the approved story, not only source code. Ask the adversary to reconstruct the end-to-end process from the film. Correct isolated formulas are insufficient.

**Recommendation:** use fixed refinement depth for the main explanatory story; add ACT afterward as an optional extension. It otherwise introduces stopping, masking, and weighting before the viewer understands what is being repeated. Keep the opening example consistent through all three passes.
