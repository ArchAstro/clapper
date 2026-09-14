// Verify the rendered files, then write aligned frame sheets and audio-equivalence measurements.
// Run after each native renderer: node benchmarks/nimbus/verify.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sharp = createRequire(new URL("./hyperframes/package.json", import.meta.url))("sharp");
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "out/verification");
await mkdir(out, { recursive: true });
const inputs = {
  clapper: "out/clapper.mp4",
  rendiv: "rendiv/out/nimbus.mp4",
  hyperframes: "hyperframes/out/nimbus.mp4",
};
const frames = [
  0, 30, 75, 93, 99, 104, 150, 240, 276, 282, 287, 334, 350, 376, 400, 414, 420, 425, 470, 510, 540, 552, 558,
  563, 590, 642, 700, 731,
];
const pcm = (file) => {
  const data = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "12000", "-f", "f32le", "-"],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  return new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
};
const referenceAudio = pcm(path.join(root, inputs.clapper));
const report = {
  generatedAt: new Date().toISOString(),
  note: "Signal equivalence is not an audition or a performance benchmark.",
  videos: {},
};
for (const [name, relative] of Object.entries(inputs)) {
  const file = path.join(root, relative);
  const probe = JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-count_frames",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      file,
    ]),
  );
  const video = probe.streams.find((s) => s.codec_type === "video");
  const audio = probe.streams.find((s) => s.codec_type === "audio");
  if (
    video.width !== 1920 ||
    video.height !== 1080 ||
    video.nb_read_frames !== "732" ||
    video.r_frame_rate !== "30/1" ||
    !audio ||
    Math.abs(Number(probe.format.duration) - 24.4) > 0.05
  )
    throw new Error(`${name}: wrong dimensions, frame count, duration, fps, or missing audio`);
  const signal = pcm(file),
    n = Math.min(signal.length, referenceAudio.length);
  let dot = 0,
    aa = 0,
    bb = 0,
    error = 0;
  for (let i = 0; i < n; i++) {
    const a = referenceAudio[i],
      b = signal[i];
    dot += a * b;
    aa += a * a;
    bb += b * b;
    error += (a - b) ** 2;
  }
  const correlation = dot / Math.sqrt(aa * bb);
  if (!Number.isFinite(correlation) || correlation < 0.98)
    throw new Error(`${name}: audio alignment/content differs (correlation ${correlation})`);
  report.videos[name] = {
    file: relative,
    sha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    width: video.width,
    height: video.height,
    frames: Number(video.nb_read_frames),
    fps: video.r_frame_rate,
    duration: probe.format.duration,
    audioCorrelation: correlation,
    audioGainDb: 10 * Math.log10(bb / aa),
    audioErrorRms: Math.sqrt(error / n),
  };
  await mkdir(path.join(out, name), { recursive: true });
  for (const frame of frames)
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-ss",
      String(frame / 30),
      "-i",
      file,
      "-frames:v",
      "1",
      path.join(out, name, `${frame}.png`),
    ]);
}
for (const frame of frames) {
  const tiles = [];
  for (const [i, name] of Object.keys(inputs).entries()) {
    tiles.push({
      input: await sharp(path.join(out, name, `${frame}.png`))
        .resize(640, 360)
        .toBuffer(),
      left: i * 640,
      top: 32,
    });
    tiles.push({
      input: Buffer.from(
        `<svg width="640" height="32"><text x="12" y="23" fill="white" font-size="18" font-family="sans-serif">${name} · frame ${frame} · ${(frame / 30).toFixed(2)}s</text></svg>`,
      ),
      left: i * 640,
      top: 0,
    });
  }
  await sharp({
    create: { width: 1920, height: 392, channels: 3, background: "#15171b" },
  })
    .composite(tiles)
    .png()
    .toFile(path.join(out, `compare-${frame}.png`));
}
await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
console.log(`Aligned comparison frames: ${out}`);
