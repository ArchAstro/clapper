// Narration timing from natural paragraph takes.
//   node prepare-timing.mjs probe   → src/probe.json (one cue per scene, generous windows)
//   clapper narration render src/probe.json -o out/probe-para
//   node prepare-timing.mjs         → src/timing.json, out/chapters.json, transcript.md
// Each scene is one take (Kokoro's own sentence rhythm). Sentence onsets inside the take
// come from its pauses (sentence-bounds.mjs), so scenes can animate on the sentence that
// explains each step (lineStarts in src/plan.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentenceOnsets } from "./sentence-bounds.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const beats = JSON.parse(fs.readFileSync(path.join(root, "src/beats.json")));
export const sentences = (text) => text.split(/(?<=[.?!])\s+(?=[A-Z“"(])/).filter(Boolean);

const LEAD = 0.6; // scene start → take start (the take carries ~0.3 s of its own lead-in)
const HOLD = { default: 1.8, math: 3.0 }; // take end → cut
const math = new Set([
  "area",
  "pairs",
  "bridge",
  "rigor",
  "ties",
  "imbalance",
  "ap",
  "conventions",
  "partial",
  "multiclass",
]);

if (process.argv[2] === "probe") {
  let at = 0;
  const cues = [];
  for (const b of beats) {
    if (!b.text) continue;
    const window = Math.max(40, Math.ceil(b.text.split(/\s+/).length / 1.5) + 10);
    cues.push({ id: b.id, narrator: "guide", text: b.text, at, duration: window });
    at += window;
  }
  const probe = {
    title: "AUC in machine learning — paragraph probe",
    narrators: { guide: { voice: "af_heart", speed: 1 } },
    cues,
  };
  fs.writeFileSync(path.join(root, "src/probe.json"), JSON.stringify(probe, null, 2) + "\n");
  console.log(`${cues.length} paragraph cues → src/probe.json`);
  process.exit(0);
}

const measured = JSON.parse(fs.readFileSync(path.join(root, "out/probe-para/manifest.json")));
const takes = new Map();
const takeDir = path.join(root, ".clapper/narration/takes");
for (const f of fs.readdirSync(takeDir).filter((f) => f.endsWith(".json"))) {
  const t = JSON.parse(fs.readFileSync(path.join(takeDir, f)));
  takes.set(t.sha256, t);
}
const timing = {};
const chapters = [];
let at = 0;
for (const b of beats) {
  let seconds = b.seconds,
    take,
    lines = [];
  if (b.text) {
    const c = measured.cues.find((c) => c.id === b.id);
    assert.ok(c, `No measured take for ${b.id}`);
    assert.equal(c.text, b.text, `Stale measured text for ${b.id}`);
    const file = takes.get(c.sha256)?.file;
    assert.ok(file, `Take audio for ${b.id} not in the narration cache`);
    const parts = sentences(b.text);
    const r = sentenceOnsets(file, parts.length);
    lines = r.onsets.map((o, k) => {
      const end = k + 1 < r.onsets.length ? r.onsets[k + 1] : r.voiceEnd;
      // Plausibility: speech runs ~5–12 cs per character; a misplaced boundary breaks that.
      const rate = ((end - o) / parts[k].length) * 100;
      assert.ok(
        rate > 4 && rate < 13,
        `${b.id} sentence ${k}: implausible boundary (${rate.toFixed(1)} cs/char)`,
      );
      return { at: Math.round((LEAD + o) * 100) / 100, dur: Math.round((end - o) * 100) / 100 };
    });
    take = { at: LEAD, dur: c.durationSeconds };
    seconds = Math.ceil((LEAD + c.durationSeconds + (math.has(b.id) ? HOLD.math : HOLD.default)) * 2) / 2;
  }
  timing[b.id] = { seconds, take, lines };
  if (b.title) chapters.push({ id: b.id, title: b.title, startSeconds: at, durationSeconds: seconds });
  at += seconds;
}
fs.writeFileSync(path.join(root, "src/timing.json"), JSON.stringify(timing, null, 2) + "\n");
fs.mkdirSync(path.join(root, "out"), { recursive: true });
fs.writeFileSync(path.join(root, "out/chapters.json"), JSON.stringify(chapters, null, 2) + "\n");
const stamp = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
fs.writeFileSync(
  path.join(root, "transcript.md"),
  chapters
    .map((c) => `## ${stamp(c.startSeconds)} — ${c.title}\n\n${beats.find((x) => x.id === c.id).text}\n`)
    .join("\n"),
);
console.log(`Film: ${at}s (${(at / 60).toFixed(2)} min), ${chapters.length} chapters.`);
