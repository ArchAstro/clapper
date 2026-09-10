import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type CompiledScore, compileScore, type Score, scoreAsset } from "@clapper/music";
import { exportMidi } from "@clapper/music/midi";
import { tsImport } from "tsx/esm/api";
import { resolveFfmpeg, reverb, runFfmpeg } from "./ffmpeg.ts";
import { installInstrument, instrument, instrumentProvenance } from "./instruments.ts";

export function resolveSfizz(): string {
  const candidates = [
    process.env.CLAPPER_SFIZZ,
    process.env.CLAPPER_RUNTIME && path.join(process.env.CLAPPER_RUNTIME, "bin/sfizz_render"),
    fileURLToPath(new URL("../../../.clapper/toolchain/build/library/bin/sfizz_render", import.meta.url)),
  ].filter(Boolean) as string[];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  const sys = spawnSync("sfizz_render", ["--help"], { encoding: "utf8" });
  if (sys.status === 0) return "sfizz_render";
  throw new Error(
    "sfizz renderer unavailable. Build with node scripts/build-sfizz.mjs or set CLAPPER_SFIZZ to sfizz_render.",
  );
}
export async function loadScore(file: string): Promise<Score> {
  if (file.endsWith(".json")) {
    const score = JSON.parse(fs.readFileSync(file, "utf8"));
    compileScore(score);
    return score;
  }
  const absolute = path.resolve(file);
  const mod = await tsImport(pathToFileURL(absolute).href + `?snapshot=${randomUUID()}`, import.meta.url);
  const value = mod.default ?? mod.score;
  if (!value) throw new Error(`${file} must export default score or named score`);
  compileScore(value);
  return value;
}
function sha(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}
function expression(points: { at: number; value: number }[], compiled: CompiledScore) {
  const toSeconds = (at: number) => {
    let seconds = 0;
    for (let i = 0; i < compiled.tempos.length; i++) {
      const t = compiled.tempos[i],
        end = Math.min(at * compiled.ppq, compiled.tempos[i + 1]?.tick ?? at * compiled.ppq);
      if (end > t.tick) seconds += ((end - t.tick) * 60) / (t.bpm * compiled.ppq);
    }
    return seconds;
  };
  const p = points.map((a) => ({ t: toSeconds(a.at), v: a.value })).sort((a, b) => a.t - b.t);
  if (!p.length) return "1";
  let expr = String(p.at(-1)!.v);
  for (let i = p.length - 2; i >= 0; i--) {
    const a = p[i],
      b = p[i + 1];
    if (b.t === a.t) throw new Error("Automation points need unique positions");
    expr = `if(lt(t,${b.t}),${a.v}+(${b.v - a.v})*(t-${a.t})/${b.t - a.t},${expr})`;
  }
  return `if(lt(t,${p[0].t}),${p[0].v},${expr})`;
}
export async function renderScore(
  score: Score,
  outDir: string,
  options: { force?: boolean; log?: (s: string) => void } = {},
) {
  const log = options.log ?? console.error;
  const compiled = compileScore(score);
  const binary = resolveSfizz();
  const active = compiled.tracks.filter((t) => !t.mute && t.notes.length);
  if (!active.length) throw new Error("Score has no audible notes");
  for (const t of active) {
    const p = instrument(t.instrument);
    if (p.range) {
      const bad = t.notes.find(
        (n) => n.midi < p.range[0] || n.midi > p.range[1] || (p.keys && !p.keys.includes(n.midi)),
      );
      if (bad) throw new Error(`${t.id}: MIDI note ${bad.midi} outside ${t.instrument} mapped keys`);
    }
  }
  const patches = new Map<string, string>();
  for (const t of active)
    if (!patches.has(t.instrument)) patches.set(t.instrument, await installInstrument(t.instrument, log));
  const packs = [
    ...new Map(
      active.map((t) => {
        const p = instrumentProvenance(instrument(t.instrument));
        return [p.pack, p];
      }),
    ).values(),
  ];
  const identity = sha(
    JSON.stringify({
      renderer: 6,
      compiled,
      packs,
      engine: fs.existsSync(binary) ? sha(fs.readFileSync(binary)) : binary,
    }),
  );
  const dest = path.resolve(outDir);
  const manifestFile = path.join(dest, "manifest.json");
  if (!options.force && fs.existsSync(manifestFile)) {
    const m = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (
      m.identity === identity &&
      m.outputs?.every(
        (f: { file: string; sha256: string }) =>
          fs.existsSync(path.join(dest, f.file)) &&
          sha(fs.readFileSync(path.join(dest, f.file))) === f.sha256,
      )
    ) {
      log("Score cache hit");
      return { ...m, dir: dest };
    }
  }
  fs.mkdirSync(dest, { recursive: true });
  const work = path.join(dest, `.render-${randomUUID()}`);
  fs.mkdirSync(work);
  const inputs: string[] = [],
    filters: string[] = [],
    outputs: string[] = [];
  try {
    const combinedMidi = active.every((t) => t.channel <= 15);
    if (combinedMidi) {
      fs.writeFileSync(path.join(work, "score.mid"), exportMidi(compiled));
      outputs.push("score.mid");
    } else log("Score exceeds one MIDI port: exporting individual MIDI parts instead.");
    for (let i = 0; i < active.length; i++) {
      const t = active[i];
      const midi = path.join(work, `${t.id}.mid`),
        raw = path.join(work, `${t.id}.raw.wav`),
        stem = path.join(work, `${t.id}.wav`);
      // An explicit tail in the MIDI's EOT makes rendering bounded while keeping releases.
      const finalBpm = compiled.tempos.at(-1)!.bpm;
      const renderData = {
        ...compiled,
        lengthTicks:
          compiled.lengthTicks +
          Math.ceil(((compiled.durationSeconds - compiled.musicSeconds) * finalBpm * compiled.ppq) / 60),
      };
      fs.writeFileSync(midi, exportMidi(renderData, t.id));
      outputs.push(`${t.id}.mid`);
      log(`Rendering ${t.id} (${t.instrument}, ${t.notes.length} notes)…`);
      const r = spawnSync(
        binary,
        [
          "--sfz",
          patches.get(t.instrument)!,
          "--midi",
          midi,
          "--wav",
          raw,
          "--samplerate",
          "48000",
          "--blocksize",
          "64",
          "--use-eot",
        ],
        { encoding: "utf8", timeout: 180000, maxBuffer: 8 * 1024 * 1024 },
      );
      if (r.status !== 0 || r.error || !fs.existsSync(raw))
        throw new Error(`sfizz failed for ${t.id}: ${r.error?.message ?? r.stderr}`);
      const pan = t.pan ?? 0;
      const gain = t.gain ?? 1;
      const chain = [
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`,
        `volume=${gain}`,
        `pan=stereo|c0=${pan > 0 ? 1 - pan : 1}*c0|c1=${pan < 0 ? 1 + pan : 1}*c1`,
      ];
      if ((t.drive ?? 1) > 1 || t.preampDb)
        chain.unshift(
          `highpass=f=70`,
          `volume=${(t.drive ?? 1) * Math.pow(10, (t.preampDb ?? 0) / 20)}`,
          "asoftclip=type=tanh:threshold=0.55:output=0.75",
          "lowpass=f=5200",
        );
      if (t.gainAutomation?.length)
        chain.push(`volume='${expression(t.gainAutomation, compiled)}':eval=frame`);
      chain.push(`apad=whole_dur=${compiled.durationSeconds}`, `atrim=end=${compiled.durationSeconds}`);
      await runFfmpeg(["-i", raw, "-af", chain.join(","), "-c:a", "pcm_f32le", "-y", stem]);
      if (t.reverb) {
        const decoded = spawnSync(
          resolveFfmpeg(),
          ["-v", "error", "-i", stem, "-f", "f32le", "-ar", "48000", "-ac", "2", "pipe:1"],
          { maxBuffer: 256 * 1024 * 1024 },
        );
        if (decoded.status !== 0) throw new Error(`Cannot decode ${t.id} for room processing`);
        const n = decoded.stdout.length / 8,
          left = new Float32Array(n),
          right = new Float32Array(n);
        for (let k = 0; k < n; k++) {
          left[k] = decoded.stdout.readFloatLE(k * 8);
          right[k] = decoded.stdout.readFloatLE(k * 8 + 4);
        }
        const wl = reverb(left, 48000, 0),
          wr = reverb(right, 48000, 1),
          mixed = Buffer.alloc(n * 8);
        for (let k = 0; k < n; k++) {
          mixed.writeFloatLE(left[k] + wl[k] * t.reverb, k * 8);
          mixed.writeFloatLE(right[k] + wr[k] * t.reverb, k * 8 + 4);
        }
        const wet = path.join(work, `${t.id}.wet.f32`);
        fs.writeFileSync(wet, mixed);
        await runFfmpeg([
          "-f",
          "f32le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-i",
          wet,
          "-c:a",
          "pcm_f32le",
          "-y",
          stem,
        ]);
      }
      inputs.push("-i", stem);
      outputs.push(`${t.id}.wav`);
    }
    filters.push(
      `${active.map((_, i) => `[${i}:a]`).join("")}amix=inputs=${active.length}:normalize=0:dropout_transition=0,alimiter=limit=0.89:level=false:latency=true,atrim=end=${compiled.durationSeconds}[master]`,
    );
    const premaster = path.join(work, "premaster.wav");
    await runFfmpeg([
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[master]",
      "-c:a",
      "pcm_f32le",
      "-y",
      premaster,
    ]);
    const measurement = spawnSync(
      resolveFfmpeg(),
      [
        "-hide_banner",
        "-i",
        premaster,
        "-af",
        "loudnorm=I=-18:TP=-2:LRA=11:print_format=json",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
    if (measurement.status !== 0) throw new Error("Score loudness measurement failed");
    const stats = JSON.parse(
      measurement.stderr.slice(measurement.stderr.lastIndexOf("{"), measurement.stderr.lastIndexOf("}") + 1),
    );
    if (
      ![stats.input_i, stats.input_tp, stats.input_lra, stats.input_thresh, stats.target_offset].every((v) =>
        Number.isFinite(Number(v)),
      )
    )
      throw new Error("Rendered score is silent or invalid");
    await runFfmpeg([
      "-i",
      premaster,
      "-af",
      `loudnorm=I=-18:TP=-2:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`,
      "-ar",
      "48000",
      "-c:a",
      "pcm_s24le",
      "-y",
      path.join(work, "master.wav"),
    ]);
    fs.writeFileSync(path.join(work, "score.json"), JSON.stringify(compiled, null, 2));
    outputs.push("master.wav", "score.json");
    for (const name of outputs) fs.renameSync(path.join(work, name), path.join(dest, name));
    const manifest = {
      schema: 1,
      identity,
      title: score.title,
      durationSeconds: compiled.durationSeconds,
      asset: scoreAsset(score),
      pack: packs[0],
      packs,
      outputs: outputs.map((file) => ({ file, sha256: sha(fs.readFileSync(path.join(dest, file))) })),
    };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
    return { ...manifest, dir: dest };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
export async function prepareScore(file: string, projectDir: string) {
  const score = await loadScore(file);
  const publicDir = path.join(projectDir, "public");
  const asset = scoreAsset(score);
  const result = await renderScore(
    score,
    path.join(projectDir, ".clapper/music", path.basename(asset, ".wav")),
  );
  const dest = path.join(publicDir, asset.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(result.dir, "master.wav"), dest);
  return result;
}
