import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  compileNarration,
  type NarrationScript,
  narrationAsset,
} from "@archastro/clapper-core/narration/models";
import { tsImport } from "tsx/esm/api";
import { runFfmpeg } from "./ffmpeg.ts";
import {
  engineIdentity,
  modelRoot,
  narrationWorker,
  runProcess,
  sha256,
  verifyVoices,
  voice,
  voiceRuntime,
} from "./voices.ts";

export async function loadNarration(file: string): Promise<NarrationScript> {
  const mod = file.endsWith(".json")
    ? undefined
    : await tsImport(pathToFileURL(path.resolve(file)).href + `?snapshot=${randomUUID()}`, import.meta.url);
  const script = mod ? (mod.default ?? mod.narration) : JSON.parse(fs.readFileSync(file, "utf8"));
  compileNarration(script);
  return script;
}
export function narrationLock(script: NarrationScript) {
  const compiled = compileNarration(script);
  return {
    schema: 1,
    engine: engineIdentity,
    narrators: Object.fromEntries(
      Object.entries(compiled.narrators).map(([id, n]) => [id, { ...n, embedding: voice(n.voice).sha256 }]),
    ),
  };
}
/** The committed cast lock is shared by every scene; drift requires an explicit relock. */
export function checkNarrationLock(script: NarrationScript, projectDir: string, update = false) {
  const expected = narrationLock(script);
  const file = path.join(projectDir, "clapper-voices.lock.json");
  if (update) {
    fs.writeFileSync(file, JSON.stringify(expected, null, 2) + "\n");
  } else if (
    !fs.existsSync(file) ||
    JSON.stringify(JSON.parse(fs.readFileSync(file, "utf8"))) !== JSON.stringify(expected)
  ) {
    throw new Error(
      "Narration cast/model differs from clapper-voices.lock.json or is not locked. Review voices, then run clapper narration lock <script> explicitly.",
    );
  }
  return expected;
}
interface Take {
  id: string;
  durationSeconds: number;
  file: string;
  sha256: string;
}
export async function renderNarration(
  script: NarrationScript,
  projectDir: string,
  outDir: string,
  options: { force?: boolean } = {},
) {
  const compiled = compileNarration(script);
  const lock = checkNarrationLock(script, projectDir);
  verifyVoices();
  const dest = path.resolve(outDir);
  fs.mkdirSync(dest, { recursive: true });
  const work = fs.mkdtempSync(path.join(dest, ".render-"));
  const cache = path.join(projectDir, ".clapper/narration/takes");
  fs.mkdirSync(cache, { recursive: true });
  const takes: Take[] = [];
  const pending: { id: string; text: string; voice: string; speed: number; output: string }[] = [];
  try {
    for (const cue of compiled.cues) {
      const narrator = compiled.narrators[cue.narrator];
      const key = sha256(
        JSON.stringify({
          engine: lock.engine,
          narrator,
          embedding: voice(narrator.voice).sha256,
          text: cue.text,
        }),
      );
      const file = path.join(cache, `${key}.f32`),
        metadata = `${file}.json`;
      let take: Take | undefined;
      if (!options.force && fs.existsSync(file) && fs.existsSync(metadata)) {
        const saved = JSON.parse(fs.readFileSync(metadata, "utf8")) as Take;
        if (
          sha256(fs.readFileSync(file)) === saved.sha256 &&
          saved.durationSeconds === fs.statSync(file).size / 96000
        )
          take = { ...saved, id: cue.id, file };
      }
      takes.push(take ?? { id: cue.id, file, durationSeconds: 0, sha256: "" });
      if (!take)
        pending.push({ id: cue.id, text: cue.text, ...narrator, output: path.join(work, `${cue.id}.f32`) });
    }
    if (pending.length) {
      console.error(`Synthesizing ${pending.length} narration takes locally…`);
      const request = path.join(work, "request.json"),
        result = path.join(work, "result.json");
      fs.writeFileSync(request, JSON.stringify(pending));
      await runProcess(process.execPath, [narrationWorker, voiceRuntime(), modelRoot(), request, result]);
      const generated = JSON.parse(fs.readFileSync(result, "utf8")) as {
        id: string;
        durationSeconds: number;
      }[];
      for (const item of generated) {
        const take = takes.find((t) => t.id === item.id)!;
        const bytes = fs.readFileSync(path.join(work, `${item.id}.f32`));
        take.durationSeconds = item.durationSeconds;
        take.sha256 = sha256(bytes);
        const temp = `${take.file}.${randomUUID()}`;
        fs.writeFileSync(temp, bytes);
        fs.renameSync(temp, take.file);
        const metadata = `${take.file}.json.${randomUUID()}`;
        fs.writeFileSync(metadata, JSON.stringify(take));
        fs.renameSync(metadata, `${take.file}.json`);
      }
    }
    const inputs: string[] = [],
      filters: string[] = [];
    for (let i = 0; i < compiled.cues.length; i++) {
      const cue = compiled.cues[i],
        take = takes[i];
      if (
        !Number.isFinite(take.durationSeconds) ||
        take.durationSeconds <= 0 ||
        take.durationSeconds > cue.duration
      )
        throw new Error(
          `${cue.id}: speech takes ${take.durationSeconds.toFixed(2)}s, window is ${cue.duration}s. Shorten copy or extend scene timing; narration is never truncated or auto-sped-up.`,
        );
      inputs.push("-f", "f32le", "-ar", "24000", "-ac", "1", "-i", take.file);
      filters.push(`[${i}:a]adelay=${Math.round(cue.at * 24000)}S:all=1[a${i}]`);
    }
    filters.push(
      `${takes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${takes.length}:normalize=0:dropout_transition=0,apad=whole_dur=${compiled.durationSeconds},atrim=end=${compiled.durationSeconds}[master]`,
    );
    const master = path.join(work, "master.wav");
    await runFfmpeg([
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[master]",
      "-ar",
      "48000",
      "-c:a",
      "pcm_s24le",
      "-y",
      master,
    ]);
    const manifest = {
      schema: 1,
      lock,
      asset: narrationAsset(script),
      durationSeconds: compiled.durationSeconds,
      cues: compiled.cues.map((cue, i) => ({
        ...cue,
        durationSeconds: takes[i].durationSeconds,
        sha256: takes[i].sha256,
      })),
      sha256: sha256(fs.readFileSync(master)),
    };
    fs.renameSync(master, path.join(dest, "master.wav"));
    const manifestTemp = path.join(work, "manifest.json");
    fs.writeFileSync(manifestTemp, JSON.stringify(manifest, null, 2) + "\n");
    fs.renameSync(manifestTemp, path.join(dest, "manifest.json"));
    return { ...manifest, dir: dest };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
export async function prepareNarration(file: string, projectDir: string) {
  const script = await loadNarration(file);
  const asset = narrationAsset(script);
  const result = await renderNarration(
    script,
    projectDir,
    path.join(projectDir, ".clapper/narration", path.basename(asset, ".wav")),
  );
  const dest = path.join(projectDir, "public", asset.slice(1));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const temp = `${dest}.${randomUUID()}`;
  fs.copyFileSync(path.join(result.dir, "master.wav"), temp);
  fs.renameSync(temp, dest);
  return result;
}
