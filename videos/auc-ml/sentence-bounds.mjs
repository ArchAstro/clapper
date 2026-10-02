// Sentence onsets inside one paragraph take: the N−1 longest pauses separate N sentences.
import fs from "node:fs";
export function sentenceOnsets(file, n, rate = 24000) {
  const buf = fs.readFileSync(file);
  const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const hop = rate / 100; // 10 ms frames
  const env = [];
  for (let i = 0; i + hop <= x.length; i += hop) {
    let s = 0;
    for (let j = i; j < i + hop; j++) s += x[j] * x[j];
    env.push(10 * Math.log10(s / hop + 1e-12));
  }
  const peak = Math.max(...env),
    floor = peak - 38;
  const voiced = env.map((v) => v > floor);
  const first = voiced.indexOf(true),
    last = voiced.lastIndexOf(true);
  const gaps = [];
  for (let i = first, start = -1; i <= last; i++) {
    if (!voiced[i] && start < 0) start = i;
    if (voiced[i] && start >= 0) {
      gaps.push({ start: start / 100, end: i / 100, len: (i - start) / 100 });
      start = -1;
    }
  }
  const chosen = [...gaps]
    .sort((a, b) => b.len - a.len)
    .slice(0, n - 1)
    .sort((a, b) => a.start - b.start);
  if (chosen.length !== n - 1)
    throw new Error(`${file}: found ${chosen.length + 1} sentences, expected ${n}`);
  return {
    onsets: [first / 100, ...chosen.map((g) => g.end)],
    voiceEnd: last / 100,
    pauses: chosen.map((g) => g.len),
    weakest: chosen.length ? Math.min(...chosen.map((g) => g.len)) : 0,
    nextGap: gaps.length >= n ? ([...gaps].sort((a, b) => b.len - a.len)[n - 1]?.len ?? 0) : 0,
  };
}
