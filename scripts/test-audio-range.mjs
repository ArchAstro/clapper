// Regression: a range starting inside file audio must retain source position and fades.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mixAudio, runFfmpeg } from "../packages/cli/src/ffmpeg.ts";

fs.mkdirSync(path.resolve(".clapper"), { recursive: true });
const root = fs.mkdtempSync(path.resolve(".clapper/audio-range-"));
const src = path.join(root, "source.wav");
await runFfmpeg(["-f", "lavfi", "-i", "aevalsrc=0.1+0.1*t:s=48000:d=5", "-y", src]);
const cue = {
  id: "speech",
  kind: "file",
  src,
  startFrame: 0,
  endFrame: 120,
  volume: 0.8,
  fadeInFrames: 90,
  fadeOutFrames: 30,
  trimStart: 0.5,
};
const options = {
  fps: 30,
  durationInFrames: 120,
  publicDir: root,
  workDir: root,
  out: path.join(root, "full.wav"),
};
await mixAudio({ ...options, cues: [cue] });
for (const [start, end] of [
  [45, 75],
  [90, 120],
]) {
  const file = path.join(root, `range-${start}.wav`);
  await mixAudio({
    ...options,
    cues: [{ ...cue, startFrame: cue.startFrame - start, endFrame: cue.endFrame - start }],
    durationInFrames: end - start,
    out: file,
  });
  const expected = path.join(root, `expected-${start}.f32`),
    actual = path.join(root, `actual-${start}.f32`);
  await runFfmpeg([
    "-i",
    options.out,
    "-af",
    `atrim=start=${start / 30}:end=${end / 30},asetpts=PTS-STARTPTS`,
    "-f",
    "f32le",
    "-y",
    expected,
  ]);
  await runFfmpeg(["-i", file, "-f", "f32le", "-y", actual]);
  const a = fs.readFileSync(actual),
    b = fs.readFileSync(expected);
  assert.equal(a.length, b.length, "Range sample count differs from full-mix slice");
  let max = 0;
  for (let i = 0; i < a.length; i += 4) max = Math.max(max, Math.abs(a.readFloatLE(i) - b.readFloatLE(i)));
  assert.ok(max <= 2 / 32768, `Source position/fade changed: max sample error ${max}`);
}
console.log(`PASS: file-audio ranges preserve source trim and fade phase. Artifacts: ${root}`);
