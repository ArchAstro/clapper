import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { btreeOracle, matrixOracle, queueOracle, raftOracle } from "../../src/eval/oracles.ts";

it("keeps independent numerical/state reference fixtures consistent with frozen development gold", () => {
  for (const [id, oracle] of [
    ["D02", matrixOracle],
    ["D03", raftOracle],
    ["D04", btreeOracle],
    ["D05", queueOracle],
  ] as const) {
    const file = fileURLToPath(
      new URL(`../../../../benchmarks/technical-video/oracles/${id}.json`, import.meta.url),
    );
    const expected = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(oracle()).toEqual(expected.result);
  }
});
it("uses a rectangular derivative fixture and preserves B-tree keys/search path", () => {
  expect(matrixOracle().weights).toHaveLength(3);
  expect(matrixOracle().input).toEqual([3.25, -1]);
  const b = btreeOracle();
  expect(b.lookup17.found).toBe(true);
  expect(b.inorder).toEqual([5, 6, 7, 10, 12, 17, 20, 30]);
  expect(raftOracle().minorityPartition.canElect).toBe(false);
});
