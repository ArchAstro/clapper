# Technical explainers: establish the whole before the parts

1. Resolve the intended paper or system before scripting. Similar titles or shared
   terminology are not enough. Match the user's actual question to the primary
   source's contribution; surface a concrete ambiguity before expensive production.
2. Begin with a dedicated intuition-building intro: a familiar problem, why it is
   hard, and what the proposed idea changes. Do not lead with citations or symbols.
3. Use an abstraction ladder. At each level, show one complete end-to-end journey
   before descending: purpose and result → architecture and state flow → one repeated
   computation → training flow → local mathematical operations.
4. Keep one running example and one visual map across levels. Show what a box does
   in the overall journey before opening it. Return to the full map at transitions.
5. Introduce notation only after its referent and purpose are visible. Explain the
   complete learning loop before deriving one weight's gradient. Tie local matrix
   calculus back to the actual architecture, not an unrelated model.
6. Preserve paper-specific choices. Label illustrative states as illustrations;
   do not present invented intermediate thoughts as measured model activations.
   Separate foundational and later architectures rather than blending their details.
7. The adversary reviews source selection and teaching order against the original
   user request, not just the author's chosen brief. Correct math about the wrong
   subject is still a failed explainer. Gate before full rendering on source fit,
   the intro, and complete end-to-end passes at each abstraction level.
8. Keep the film visually clean: one explanatory action per shot, generous space,
   consistent roles for colors, and motion that reveals causality. Do not substitute
   a succession of diagram slides for a continuous conceptual explanation.
