import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildHarness, removeHarness, serveBuilt } from "../bundle.ts";
import { resolveFfmpeg } from "../ffmpeg.ts";
import { probeCompositions } from "../render.ts";
import { domLint, probeScenes, reviewComposition } from "../review.ts";
import { record, sha, writeJSON } from "./io.ts";
import type { FilmCase, MachineEvidence } from "./types.ts";
/** Decode the actual export. Never substitute source metadata for the encoded artifact. */
export function inspectMedia(video: string) {
  const r = spawnSync(
    resolveFfmpeg(),
    [
      "-hide_banner",
      "-i",
      video,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-af",
      "astats=metadata=0:reset=0",
      "-progress",
      "pipe:1",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 180000 },
  );
  assert.equal(r.status, 0, `Cannot decode movie: ${r.error?.message ?? r.stderr.slice(-1000)}`);
  const dimensions = /Video:.*?\b(\d{2,5})x(\d{2,5})\b/.exec(r.stderr);
  assert.ok(dimensions, "Missing encoded video dimensions");
  const values = [...r.stdout.matchAll(/^out_time_us=(\d+)/gm)].map((m) => Number(m[1]) / 1e6);
  const frames = [...r.stdout.matchAll(/^frame=(\d+)/gm)].map((m) => Number(m[1]));
  const audio = /Stream .*Audio:/.test(r.stderr);
  const number = (label: string) => {
    const m = [...r.stderr.matchAll(new RegExp(`${label}: ([-\\w.]+)`, "g"))].at(-1);
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return {
    durationSeconds: values.at(-1) ?? 0,
    frames: frames.at(-1) ?? 0,
    width: Number(dimensions[1]),
    height: Number(dimensions[2]),
    audio: { present: audio, rmsDb: number("RMS level dB"), peakDb: number("Peak level dB") },
  };
}
export async function captureEvidence(
  project: string,
  entry: string,
  composition: string,
  video: string,
  c: FilmCase,
  out: string,
) {
  assert.ok(!fs.existsSync(out), "Evidence directory already exists; never overwrite a frozen collection");
  const target = { entry: path.resolve(project, entry), projectDir: project, mode: "harness" as const };
  const build = await buildHarness(target),
    server = await serveBuilt(target, build);
  try {
    const meta = (await probeCompositions(server.url)).find((m) => m.id === composition);
    assert.ok(meta, "Composition not found");
    const kit = await reviewComposition({
      url: server.url,
      entry: target.entry,
      projectDir: project,
      publicDir: path.join(project, "public"),
      meta,
      out: path.join(out, "kit"),
      video,
    });
    const scenes = await probeScenes(server.url, meta);
    const samples = new Set<number>();
    const step = Math.max(1, Math.ceil(meta.durationInFrames / 48));
    for (let f = 0; f < meta.durationInFrames; f += step) samples.add(f);
    samples.add(meta.durationInFrames - 1);
    for (const f of c.eventFrames)
      for (const offset of [-2, 0, 2])
        if (f + offset >= 0 && f + offset < meta.durationInFrames) samples.add(f + offset);
    const dom = await domLint(server.url, meta, undefined, scenes, () => {}, {
      includeSvg: true,
      inspectMoving: true,
      compareSeek: true,
      extraFrames: [...samples],
    });
    const media = inspectMedia(video),
      failures: string[] = [],
      warnings = dom.issues.map((i) => `${i.rule}@${i.frame}: ${i.message}`);
    if (media.width !== c.size[0] || media.height !== c.size[1])
      failures.push("Encoded dimensions violate the case contract");
    if (
      media.durationSeconds < c.durationSeconds[0] - 0.1 ||
      media.durationSeconds > c.durationSeconds[1] + 0.1
    )
      failures.push("Encoded duration violates the case contract");
    if (Math.abs(media.frames / c.fps - media.durationSeconds) > 0.15)
      failures.push("Encoded frame rate/duration mismatch");
    if (c.audioRequired && (!media.audio.present || media.audio.rmsDb === null || media.audio.rmsDb < -65))
      failures.push("Required soundtrack is absent or silent");
    if (!dom.seekDeterministic) failures.push("Seek-order pixel comparison failed");
    const evidence: MachineEvidence = {
      schema: 1,
      videoHash: sha(fs.readFileSync(video)),
      ...media,
      failures,
      warnings,
      sampledFrames: dom.sampledFrames,
      svgLabels: dom.svgLabels,
      htmlLabels: dom.htmlLabels,
      seekDeterministic: dom.seekDeterministic,
      verdict: failures.length ? "FAIL" : dom.copyBoxes === 0 ? "BLOCKED" : "PASS",
    };
    if (!dom.copyBoxes) warnings.push("No measured labels; geometry coverage is unknown, not clean");
    writeJSON(path.join(out, "machine.json"), evidence);
    writeJSON(path.join(out, "coverage.json"), {
      schema: 1,
      sampledFrames: dom.sampledFrames,
      totalFrames: meta.durationInFrames,
      svgLabelObservations: dom.svgLabels,
      htmlLabelObservations: dom.htmlLabels,
      unobservedFrames: meta.durationInFrames - dom.sampledFrames.length,
      limitations: [
        "Sampled geometry does not establish semantic correctness or all-frame coverage.",
        "Pixel determinism is checked in this environment only.",
        "Audio is decoded/measured, not listened to.",
      ],
      review: kit.checked,
    });
    return { evidence, mediaRecord: record(path.dirname(video), path.basename(video)) };
  } finally {
    await server.close();
    removeHarness(build);
  }
}
