// Builds a critique kit per video: contact sheet, motion strips around cuts, opening strip, spectrogram, waveform.
// Usage: node scripts/review-kit.mjs [ledger orbit nimbus]
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
const req = createRequire(import.meta.url);
const FF = createRequire(req.resolve("@agenticvids/cli/package.json"))("ffmpeg-static");
const CUTS = { ledger: [105, 239, 404, 554, 680], orbit: [76, 242, 378, 508], nimbus: [93, 276, 414, 552], archdev: [100, 320, 560, 710, 968], archdev2: [100, 320, 560, 770, 920] };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CUTS);
const run = (args) => {
  const r = spawnSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
};
for (const id of ids) {
  const d = `out/review/${id}`;
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  const src = `out/${id}.mp4`;
  run(["-i", src, "-vf", "select=not(mod(n\\,12)),scale=240:-1,tile=8x12:padding=4:margin=4:color=#333333", "-frames:v", "1", `${d}/contact-sheet.png`]);
  for (const c of CUTS[id] ?? []) {
    const a = c - 10, b = c + 14;
    run(["-i", src, "-vf", `select='between(n\\,${a}\\,${b})*not(mod(n-${a}\\,3))',scale=213:-1,tile=9x1:padding=2:color=#333333`, "-frames:v", "1", `${d}/cut-${String(c).padStart(4, "0")}.png`]);
  }
  run(["-i", src, "-vf", "select='lt(n\\,60)*not(mod(n\\,4))',scale=213:-1,tile=5x3:padding=2:color=#333333", "-frames:v", "1", `${d}/opening-2s.png`]);
  run(["-i", src, "-lavfi", "showspectrumpic=s=1920x560:legend=1:color=intensity:scale=log", `${d}/spectrogram.png`]);
  run(["-i", src, "-lavfi", "showwavespic=s=1920x260:colors=#39d0ff|#ff3ea5:split_channels=0", `${d}/waveform.png`]);
  // audio: short-term loudness around every cut, and integrated loudness per scene
  const cutsTxt = spawnSync("node", ["scripts/audio-cuts.mjs", src, "30", ...(CUTS[id] ?? []).map(String)], { encoding: "utf8" }).stdout;
  const bounds = [0, ...(CUTS[id] ?? [])];
  const durProbe = spawnSync(FF, ["-hide_banner", "-i", src], { encoding: "utf8" }).stderr;
  const dm = /Duration: (\d+):(\d+):([\d.]+)/.exec(durProbe);
  const total = dm ? Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]) : 0;
  const scenes = bounds.map((b, i) => [b / 30, (bounds[i + 1] ?? total * 30) / 30]);
  const rows = scenes.map(([a, b], i) => {
    const r = spawnSync(FF, ["-hide_banner", "-ss", a.toFixed(2), "-to", b.toFixed(2), "-i", src, "-vn", "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
    const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.split("Summary").pop() ?? "");
    return `scene ${i + 1}\t${a.toFixed(2)}–${b.toFixed(2)} s\t${m ? m[1] : "?"} LUFS`;
  });
  fs.writeFileSync(`${d}/audio-cuts.txt`, `Short-term RMS (dB) in 100 ms windows from -1.2 s to +1.1 s around each cut. Look for holes before a hit and jumps after.\n${cutsTxt}\nIntegrated loudness per scene:\n${rows.join("\n")}\n`);
  console.log(`${id}: ${fs.readdirSync(d).length} files in ${d}`);
}
