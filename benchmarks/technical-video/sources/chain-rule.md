# Original curated derivation; reference chapter6, Deep Learning

Source: https://www.deeplearningbook.org/contents/mlp.html

Pack type: curator-written reference notes, not a verbatim copy of the primary publication. Freeze/approve these notes before confirmatory evaluation.

Use column vectors. For y=Wx and incoming loss gradient g, dy=(dW)x+W(dx). The scalar differential dL=gᵀdy identifies the matrix gradient gxᵀ and input gradient Wᵀg. Matrix coefficients use the Frobenius inner product.
Use W=[[1,2],[-1,1],[0.5,-2]], x=[3,1], g=[1,-2,0.5]. W is3x2, y and g are3x1, gxᵀ is3x2 and Wᵀg is2x1. A transpose routes sensitivities; it is not generally an inverse.
For x_(t+1)=Fθ(x_t) with a final-state loss, g_t=J_tᵀg_(t+1). Each use of shared θ contributes B_tᵀg_(t+1); sum these before one optimizer update. B_t holds x_t fixed. Assume x0 independent of this θ; other parameter sets get their own gradients.
A nonlinear activation introduces an elementwise slope factor. Autodiff computes vector-Jacobian products without needing to materialize full Jacobian matrices. Numerical finite differences verify examples, not the correctness of every claim in a movie.
