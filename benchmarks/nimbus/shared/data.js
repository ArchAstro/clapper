// The unchanged design/content contract for all three implementations.
export const FPS = 30;
export const TOTAL = 732;
export const SCENES = [
  { name: "title", start: 0, frames: 105 },
  { name: "graph", start: 93, frames: 195 },
  { name: "latency", start: 276, frames: 150 },
  { name: "trace", start: 414, frames: 150 },
  { name: "end", start: 552, frames: 180 },
];
export const NODES = [
  { id: "us-east", p: [960, 540], hub: true },
  { id: "us-west", p: [420, 380] },
  { id: "eu-west", p: [1380, 300] },
  { id: "eu-central", p: [1560, 620] },
  { id: "ap-south", p: [1240, 860] },
  { id: "sa-east", p: [560, 800] },
  { id: "ca-central", p: [820, 150] },
];
export const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [2, 6],
  [3, 4],
  [4, 5],
  [2, 3],
  [1, 5],
];
export const LOG = [
  ["11:42:07.114", "200", "GET  /api/cart            ", "41 ms", "us-east"],
  ["11:42:07.118", "200", "GET  /api/products?limit=24", "38 ms", "eu-west"],
  ["11:42:07.131", "201", "POST /api/checkout        ", "212 ms", "us-east"],
  ["11:42:07.133", "200", "GET  /api/session         ", "12 ms", "ap-south"],
  ["11:42:07.140", "504", "POST /api/checkout        ", "3,104 ms", "us-east"],
  ["11:42:07.141", "trace", "cold start detected · fn:checkout · 2.9 s", "", ""],
  ["11:42:07.160", "200", "GET  /api/cart            ", "44 ms", "us-west"],
  ["11:42:07.171", "200", "GET  /api/products?limit=24", "36 ms", "eu-central"],
];
export const CLOUD = [
  [50, 62],
  [32, 52],
  [42, 34],
  [64, 30],
  [78, 46],
  [72, 62],
];
