import assert from "node:assert/strict";
export function matrixOracle() {
  const w = [
      [1, 2],
      [-1, 1],
      [0.5, -2],
    ],
    x = [3, 1],
    g = [1, -2, 0.5];
  const loss = (a: number[][], b: number[]) =>
    a.reduce((s, row, i) => s + row.reduce((n, v, j) => n + v * b[j], 0) * g[i], 0);
  const weights = g.map((v) => x.map((a) => v * a)),
    input = x.map((_, j) => w.reduce((s, row, i) => s + row[j] * g[i], 0));
  let maxError = 0;
  const eps = 1e-6;
  for (let i = 0; i < w.length; i++)
    for (let j = 0; j < x.length; j++) {
      const plus = w.map((r) => [...r]),
        minus = w.map((r) => [...r]);
      plus[i][j] += eps;
      minus[i][j] -= eps;
      maxError = Math.max(maxError, Math.abs((loss(plus, x) - loss(minus, x)) / (2 * eps) - weights[i][j]));
    }
  for (let j = 0; j < x.length; j++) {
    const plus = [...x],
      minus = [...x];
    plus[j] += eps;
    minus[j] -= eps;
    maxError = Math.max(maxError, Math.abs((loss(w, plus) - loss(w, minus)) / (2 * eps) - input[j]));
  }
  assert.ok(maxError < 1e-7, "Gradient oracle failed finite differences");
  return {
    w,
    x,
    g,
    output: w.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)),
    weights,
    input,
    maxError,
  };
}
export function queueOracle(ticks = 6) {
  let queued = 0,
    waiting = 0,
    completed = 0;
  const trace = [];
  for (let t = 0; t < ticks; t++) {
    const served = Math.min(2, queued);
    queued -= served;
    completed += served;
    const offered = 3 + waiting;
    const admitted = Math.min(4 - queued, offered);
    queued += admitted;
    waiting = offered - admitted;
    assert.equal(completed + queued + waiting, (t + 1) * 3);
    trace.push({ tick: t, queued, waiting, completed });
  }
  return trace;
}
export function raftOracle() {
  const majority = 3;
  return {
    servers: 5,
    majority,
    minorityPartition: { reachable: 2, canElect: 2 >= majority },
    majorityPartition: { reachable: 3, canElect: 3 >= majority },
    higherTermResponse: {
      before: { term: 1, role: "leader" },
      receivedTerm: 2,
      after: { term: 2, role: "follower" },
    },
    limits: "Election-only reference cases, not a full Raft implementation or log-commit oracle.",
  };
}
interface BNode {
  keys: number[];
  children: BNode[];
}
export function btreeOracle() {
  const input = [10, 20, 5, 6, 12, 30, 7, 17];
  let root: BNode = { keys: [], children: [] };
  const split = (parent: BNode, i: number) => {
    const child = parent.children[i],
      median = child.keys[1],
      right: BNode = { keys: child.keys.slice(2), children: child.children.slice(2) };
    child.keys = child.keys.slice(0, 1);
    child.children = child.children.slice(0, 2);
    parent.keys.splice(i, 0, median);
    parent.children.splice(i + 1, 0, right);
  };
  const insert = (node: BNode, key: number) => {
    let i = node.keys.findIndex((k) => k > key);
    if (i < 0) i = node.keys.length;
    if (!node.children.length) {
      node.keys.splice(i, 0, key);
      return;
    }
    if (node.children[i].keys.length === 3) {
      split(node, i);
      if (key > node.keys[i]) i++;
    }
    insert(node.children[i], key);
  };
  const ordered = (node: BNode): number[] =>
    node.children.length
      ? node.keys.flatMap((k, i) => [...ordered(node.children[i]), k]).concat(ordered(node.children.at(-1)!))
      : [...node.keys];
  const trace = [];
  for (const key of input) {
    if (root.keys.length === 3) {
      root = { keys: [], children: [root] };
      split(root, 0);
    }
    insert(root, key);
    trace.push({ insert: key, tree: JSON.parse(JSON.stringify(root)) });
  }
  assert.deepEqual(
    ordered(root),
    [...input].sort((a, b) => a - b),
  );
  const depths: number[] = [];
  const check = (node: BNode, depth: number) => {
    assert.ok(node.keys.length >= 1 && node.keys.length <= 3);
    if (!node.children.length) depths.push(depth);
    else {
      assert.equal(node.children.length, node.keys.length + 1);
      node.children.forEach((c) => check(c, depth + 1));
    }
  };
  check(root, 0);
  assert.equal(new Set(depths).size, 1);
  const visited: number[][] = [];
  let node = root,
    found = false;
  while (node) {
    visited.push(node.keys);
    if (node.keys.includes(17)) {
      found = true;
      break;
    }
    let i = node.keys.findIndex((k) => k > 17);
    if (i < 0) i = node.keys.length;
    node = node.children[i];
  }
  return { minimumDegree: 2, input, trace, inorder: ordered(root), lookup17: { visited, found } };
}
