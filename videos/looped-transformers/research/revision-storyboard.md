# Replacement: recurrent depth, taught from the top down

Working primary source: Dehghani et al., Universal Transformers (2018 / ICLR2019).
User has been offered the explicit alternative Huginn2025; never mix these architectures.

## Running example
Lea hands a key to Omar. Omar puts it in a drawer. Where is the key?
This is an illustrative explanation, not a measured trace of a trained model.

## Abstraction ladder / acceptance gates

1. **Intuition, complete journey.** Dedicated opening screen presents the question.
   Show input → revisable internal meaning → answer. Demonstrate repeated refinement
   using the same example before any blocks, vectors, theta, loss or paper history.
2. **Architecture, complete journey.** Reveal the UT encoder and decoder around that
   familiar map. Explain embeddings, encoder refinements, decoder refinements with
   cross-attention, next-token prediction and repeated output-token generation.
   Explicitly distinguish token positions from recurrent depth; encoder and decoder
   have their own parameters, shared within each across refinement steps.
3. **One recurrent step, complete journey.** Zoom into a familiar encoder box.
   Previous state + position/depth signals → self-attention exchange → residual/norm
   → per-position transition → residual/norm → next state. Then run the full map again.
   Show the FFN variant; name separable convolution as an alternative in the paper.
4. **Training, complete journey.** Predict → compare with target → send loss feedback
   backward through refinements → sum contributions to shared parameters → update.
   Explain this entire loop before one local derivative. Use fixed-depth core for
   the derivation; clearly separate optional per-position ACT.
5. **Local math, then reconnect.** A scalar connection → matrix projection → outer
   product and transpose → differential explanation → shared-parameter BPTT sum.
   Keep math subordinate to the actual recurrent model. No frozen computer or
   separate task network. End by returning to the same input-to-answer map.

## Style
One continuous conceptual map, clean type, generous space. Cyan = forward state,
coral = backward gradient, amber = the question and answer. Only causal motion.
Each scene opens with an established anchor, and each level completes before descent.

## Pre-render review
Adversary must answer: right source? real intuition intro? end-to-end first? each
zoom tied to an established box? mathematical details connected back to recurrence?
A math-correct film that fails any of those checks is REVISE.
