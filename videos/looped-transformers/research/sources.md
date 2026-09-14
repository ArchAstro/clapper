# Confirmed primary source: Universal Transformers

The user explicitly selected **Universal Transformers (2018/2019)**.

Mostafa Dehghani, Stephan Gouws, Oriol Vinyals, Jakob Uszkoreit, Łukasz Kaiser.
*Universal Transformers*. Preprint July 2018; ICLR 2019.
https://arxiv.org/abs/1807.03819
Full text: https://arxiv.org/html/1807.03819v3

## Architecture claims

- §2.1 / Figure 2: recurrent-depth encoder and decoder; separate blocks. Input
  encoding is run once, while output generation is autoregressive. Decoder consumes
  the available prefix with masked self-attention, attends to final encoder states,
  and projects to vocabulary probabilities before token selection.
- §2.1 / Equations 4–7: position and depth signals are added each refinement step;
  attention then transition, with residual connections and normalization. Dropout
  is omitted from the explainer diagram and identified as omitted.
- Transition: a position-wise affine–ReLU–affine FFN is shown. The paper also uses
  separable convolution. Do not imply all UT variants have the FFN choice.
- §2.2 / Appendix C: optional learned per-position adaptive computation time.
  The math segment explains the fixed-depth core, not the full adaptive-halting loss.
- The paper's primary contribution is recurrent refinement of representations across
  depth. Do not substitute the 2023 programmable-computer construction, or mix in
  Huginn's later decoder-only recurrent-depth architecture.

## Teaching conventions

The Lea → Omar → drawer story is an original illustrative example. The displayed
'entities → relations → connected evidence' stages are a mental model, not a claim
that a trained UT follows those semantic states in those exact rounds. No generated
activation trace, benchmark result or inference run is implied.

The architecture figure uses words for token positions for readability; real
systems may tokenize words into subword pieces. The decoder loop across output
positions is distinct from its recurrence across depth.

## Calculus

The local linear projection uses column vectors, unlike the paper's row-stacked H.
This is stated on screen. x is a token vector at the local-projection level and a
vectorized state at the recurrence level. theta denotes one recurrent block's
parameters; H0 is independent of that theta but may depend on separate embedding
parameters. Position/depth signals and fixed context are implicit in F_theta.

For a scalar example y=wx, x=3, w=0.5, target=1:
L=0.5(y-1)^2=0.125, dL/dy=0.5, dL/dw=1.5.
For y=Wx and incoming loss gradient g:
dy=(dW)x+W(dx); dL=g^T(dW)x+g^TW(dx).
The matrix-gradient term uses the entrywise/Frobenius inner product, giving
∇W L=gx^T and ∇x L=W^Tg. A transpose is not an inverse.
The nonlinear gates, attention, residuals and normalizations have their own
local derivatives, composed by automatic differentiation.

For fixed-depth recurrent use with a final-state loss:
g_t=J_t^T g_(t+1), J_t=∂F_theta(x_t)/∂x_t.
∇theta L=Σ_t B_t^Tg_(t+1), B_t=∂F_theta(x_t)/∂theta holding x_t fixed.
This is a vector-Jacobian product; implementations need not build full Jacobians.
Cross-attention/context, embeddings and other block parameters receive their own
corresponding gradients. There is one parameter update after accumulation, not one
optimizer update between the depicted refinement steps.
