import assert from "node:assert/strict";

const W = [
    [1, 2],
    [-1, 1],
  ],
  x = [3, 1],
  target = [4, 0];
const mv = (A, v) => A.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const outer = (a, b) => a.map((ai) => b.map((bj) => ai * bj));
const loss = (A, v) => mv(A, v).reduce((sum, yi, i) => sum + 0.5 * (yi - target[i]) ** 2, 0);
const y = mv(W, x),
  g = y.map((yi, i) => yi - target[i]);
const dW = outer(g, x),
  dx = mv(transpose(W), g),
  epsilon = 1e-6;
let maxError = 0;
for (let i = 0; i < 2; i++)
  for (let j = 0; j < 2; j++) {
    const plus = W.map((r) => [...r]),
      minus = W.map((r) => [...r]);
    plus[i][j] += epsilon;
    minus[i][j] -= epsilon;
    maxError = Math.max(maxError, Math.abs((loss(plus, x) - loss(minus, x)) / (2 * epsilon) - dW[i][j]));
  }
for (let i = 0; i < 2; i++) {
  const plus = [...x],
    minus = [...x];
  plus[i] += epsilon;
  minus[i] -= epsilon;
  maxError = Math.max(maxError, Math.abs((loss(W, plus) - loss(W, minus)) / (2 * epsilon) - dx[i]));
}
assert.ok(maxError < 1e-6);
const updated = W.map((r, i) => r.map((w, j) => w - 0.05 * dW[i][j]));
assert.ok(Math.abs(loss(updated, x) - 0.625) < 1e-12);
// Check full shared-parameter gradient for a three-step nonlinear recurrence.
const A = [
    [0.4, 0.1],
    [-0.2, 0.3],
  ],
  initial = [0.3, -0.5];
const recurrentLoss = (A) => {
  let h = initial;
  for (let t = 0; t < 3; t++) h = mv(A, h).map(Math.tanh);
  return 0.5 * h.reduce((s, v) => s + v * v, 0);
};
const states = [initial];
for (let t = 0; t < 3; t++) states.push(mv(A, states.at(-1)).map(Math.tanh));
let upstream = states.at(-1),
  grad = [
    [0, 0],
    [0, 0],
  ];
for (let t = 2; t >= 0; t--) {
  const delta = upstream.map((v, i) => v * (1 - states[t + 1][i] ** 2));
  const contribution = outer(delta, states[t]);
  grad = grad.map((r, i) => r.map((v, j) => v + contribution[i][j]));
  upstream = mv(transpose(A), delta);
}
let recurrentError = 0;
for (let i = 0; i < 2; i++)
  for (let j = 0; j < 2; j++) {
    const plus = A.map((r) => [...r]),
      minus = A.map((r) => [...r]);
    plus[i][j] += epsilon;
    minus[i][j] -= epsilon;
    recurrentError = Math.max(
      recurrentError,
      Math.abs((recurrentLoss(plus) - recurrentLoss(minus)) / (2 * epsilon) - grad[i][j]),
    );
  }
assert.ok(recurrentError < 1e-7);
console.log(
  JSON.stringify(
    {
      y,
      g,
      dW,
      dx,
      initialLoss: loss(W, x),
      updated,
      updatedLoss: loss(updated, x),
      finiteDifferenceMaxError: maxError,
      recurrentGradient: grad,
      recurrentFiniteDifferenceMaxError: recurrentError,
    },
    null,
    2,
  ),
);

const scalarLoss = (w) => 0.5 * (3 * w - 1) ** 2;
const scalarGradient = (scalarLoss(0.5 + 1e-6) - scalarLoss(0.5 - 1e-6)) / 2e-6;
assert.ok(Math.abs(scalarGradient - 1.5) < 1e-8);
console.log(
  JSON.stringify({
    scalarOutput: 1.5,
    scalarLoss: scalarLoss(0.5),
    scalarGradient,
    expectedScalarGradient: 1.5,
  }),
);
