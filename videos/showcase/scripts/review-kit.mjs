// Builds a critique kit per video: contact sheet, motion strips around cuts, opening strip, spectrogram, waveform.
// Usage: node scripts/review-kit.mjs [ledger orbit nimbus]
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
const req = createRequire(import.meta.url);
const FF = createRequire(req.resolve("@agenticvids/cli/package.json"))("ffmpeg-static");
const CUTS = { ledger: [105, 239, 404, 554, 680], orbit: [76, 242, 378, 508], nimbus: [93, 276, 414, 552], archdev: [100, 320, 560, 710, 968] };
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
  console.log(`${id}: ${fs.readdirSync(d).length} files in ${d}`);
}
