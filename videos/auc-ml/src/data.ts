export const ITEMS = [
  { id: "A", score: 0.9, positive: true },
  { id: "B", score: 0.8, positive: false },
  { id: "C", score: 0.7, positive: true },
  { id: "D", score: 0.6, positive: true },
  { id: "E", score: 0.4, positive: false },
  { id: "F", score: 0.1, positive: false },
];
export const CUTS = [1, 0.85, 0.75, 0.65, 0.5, 0.25, 0];
export const STATES = Array.from({ length: 7 }, (_, n) => {
  const tp = ITEMS.slice(0, n).filter((x) => x.positive).length,
    fp = n - tp;
  return {
    n,
    tp,
    fp,
    fn: 3 - tp,
    tn: 3 - fp,
    tpr: tp / 3,
    fpr: fp / 3,
    precision: n ? tp / n : 1,
    threshold: CUTS[n],
  };
});
export const ROC = STATES.map((s) => [s.fpr, s.tpr] as [number, number]);
export const PR = STATES.map((s) => [s.tpr, s.precision] as [number, number]);
export const AP_STEPS = [
  [0, 1],
  [1 / 3, 1],
  [1 / 3, 2 / 3],
  [2 / 3, 2 / 3],
  [2 / 3, 3 / 4],
  [1, 3 / 4],
] as [number, number][];
export const POS = ITEMS.filter((x) => x.positive),
  NEG = ITEMS.filter((x) => !x.positive);
export const trap = (p: [number, number][]) =>
  p.slice(1).reduce((a, [x, y], i) => a + ((x - p[i][0]) * (y + p[i][1])) / 2, 0);
export const AUC = trap(ROC),
  AP = (1 + 2 / 3 + 3 / 4) / 3;
