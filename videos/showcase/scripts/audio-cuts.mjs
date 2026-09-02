// Short-term loudness around each cut (100 ms windows, ±1.2 s) so a reviewer can see dips,
// jumps and missing tails without listening. Usage: node scripts/audio-cuts.mjs <video.mp4> <fps> <cut frames…>
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const FF = createRequire(req.resolve("@agenticvids/cli/package.json"))("ffmpeg-static");
const [video, fpsArg, ...cutArgs] = process.argv.slice(2);
const fps = Number(fpsArg);
const cuts = cutArgs.map(Number);
const win = 0.1, span = 1.2;
const rms = (a, b) => {
  const r = spawnSync(FF, ["-hide_banner", "-ss", a.toFixed(3), "-to", b.toFixed(3), "-i", video, "-vn", "-af", "astats=measure_perchannel=none:measure_overall=RMS_level", "-f", "null", "-"], { encoding: "utf8" });
  const m = /RMS level dB:\s*(-?[\d.]+|-inf)/.exec(r.stderr);
  return m ? (m[1] === "-inf" ? -90 : Number(m[1])) : NaN;
};
console.log(`cut\tt(s)\t${Array.from({ length: Math.round((2 * span) / win) }, (_, i) => (-span + i * win).toFixed(1)).join("\t")}`);
for (const c of cuts) {
  const t = c / fps;
  const row = [];
  for (let o = -span; o < span - 1e-9; o += win) row.push(rms(Math.max(0, t + o), Math.max(0, t + o + win)).toFixed(0));
  console.log(`${c}\t${t.toFixed(2)}\t${row.join("\t")}`);
}
