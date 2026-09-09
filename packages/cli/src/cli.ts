import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildHarness, removeHarness, serveBuilt, startStudio } from "./bundle.ts";
import { collectCues, probeCompositions, renderComposition, renderStill, renderStills } from "./render.ts";
import { reviewComposition } from "./review.ts";
import { doctor } from "./doctor.ts";
import { createProject, findConfig, installProject, linkRuntime } from "./project.ts";

const HELP = `clapper — React → MP4

Usage:
  clapper new <directory> [--template basic|comic]  Create an editable project
  clapper install                    Restore project dependencies
  clapper add <package...>            Add libraries with the managed npm
  clapper render <entry> [options]      Render a composition to video
  clapper still <entry> [options]       Render one frame to PNG
  clapper preview <entry> [--port N]    Open the studio (scrub, play, inspect)
  clapper compositions <entry> [--json] List registered compositions (+ scene maps)
  clapper cues <entry> -c <id>          List the audio cues of a composition (audit)
  clapper review <entry> [-c <id>]      Render + build a critique kit (contact sheet, cut strips,
                                            spectrogram, loudness at cuts, lint, brief.md)
  clapper doctor [<entry|dir>]          Check Node, Chromium, ffmpeg (libx264/aac/filters), React/core resolution

Render options:
  -c, --composition <id>   Composition id (default: the only/first one)
  -o, --out <file>         Output file (default: out/<id>.mp4)
      --props <json>       Props passed to the composition
      --range <a-b>        Frame range, inclusive start, exclusive end (e.g. 0-90)
      --scene <name>       Limit to one scene of a defineScenes() plan (render: range; still: frames are scene-local)
      --frame <n[,n…]>     (still) Frame(s) to capture; several go to an --out directory
      --every <n>          (still) One frame every n across the range/scene
      --draft              Half resolution, crf 28, veryfast: for iteration
      --concurrency <n>    Parallel browser tabs (default: cpus-1, max 4)
      --scale <n>          Device scale factor (2 = render at 2x pixels)
      --codec <name>       h264 (default) | h265 | vp9 | prores
      --crf <n>            Quality (lower = better; default 17)
      --preset <name>      x264 preset (default medium)
      --image-format <f>   jpeg (default, q96, ~5x faster) | png (lossless intermediate)
      --mute               Skip audio mixing
      --loudnorm <lufs|off> Loudness target (default -16 LUFS)
      --keep-build         Keep this invocation's .clapper/harness-*/build

Review options:
      --video <file>       Build the kit from an existing MP4 instead of rendering
      --no-lint            Skip the blank-frame / safe-area / overlap / determinism checks
      --draft              Render the review copy at draft quality
Project commands can omit <entry>: clapper.json supplies entry and composition.
Dependency scripts are disabled; pass --allow-scripts explicitly if needed.
`;

export async function main(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      composition: { type: "string", short: "c" },
      out: { type: "string", short: "o" },
      props: { type: "string" },
      range: { type: "string" },
      frame: { type: "string" },
      concurrency: { type: "string" },
      scale: { type: "string" },
      codec: { type: "string" },
      crf: { type: "string" },
      preset: { type: "string" },
      "image-format": { type: "string" },
      mute: { type: "boolean" },
      loudnorm: { type: "string" },
      "keep-build": { type: "boolean" },
      port: { type: "string" },
      open: { type: "boolean" },
      scene: { type: "string" },
      every: { type: "string" },
      draft: { type: "boolean" },
      json: { type: "boolean" },
      video: { type: "string" },
      "no-lint": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      template: { type: "string" },
      "allow-scripts": { type: "boolean" },
    },
  });
  const [command, entryArg] = positionals;
  if (values.help || !command) {
    console.log(HELP);
    return;
  }
  if (command === "new") {
    if (!entryArg || positionals.length !== 2) throw new Error("Usage: clapper new <directory> [--template basic|comic]");
    createProject(entryArg, values.template);
    return;
  }
  const project = findConfig(entryArg ? path.dirname(path.resolve(entryArg)) : process.cwd());
  if (project && process.env.CLAPPER_VERSION && project.config.runtime !== process.env.CLAPPER_VERSION) throw new Error(`Project pins Clapper ${project.config.runtime}; launcher is ${process.env.CLAPPER_VERSION}. Install the matching launcher.`);
  if (project && process.env.CLAPPER_RUNTIME) linkRuntime(project.dir);
  if (command === "install" || command === "add") {
    const current = findConfig();
    if (!current) throw new Error("No clapper.json found. Run clapper new <directory> first.");
    if (command === "add" && positionals.length < 2) throw new Error("Usage: clapper add <package...>");
    installProject(current.dir, command === "add" ? positionals.slice(1) : [], values["allow-scripts"]);
    return;
  }
  if (!entryArg && project) {
    process.chdir(project.dir);
    values.composition ??= project.config.composition;
  }
  if (command === "doctor") {
    const dir = entryArg ? (fs.statSync(path.resolve(entryArg)).isDirectory() ? path.resolve(entryArg) : findProjectDir(path.resolve(entryArg))) : process.cwd();
    const checks = doctor(dir);
    for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name.padEnd(18)} ${c.detail}${!c.ok && c.fix ? `\n     → ${c.fix}` : ""}`);
    const bad = checks.filter((c) => !c.ok).length;
    console.log(bad ? `${bad} problem(s)` : "all good");
    if (bad) process.exitCode = 1;
    return;
  }
  if (!entryArg && !project) throw new Error("Missing <entry> or clapper.json. Run clapper new <directory>.");
  const entry = entryArg ? path.resolve(entryArg) : path.resolve(project!.dir, project!.config.entry);
  if (!fs.existsSync(entry)) throw new Error(`Entry not found: ${entry}`);
  const projectDir = findProjectDir(entry);
  const publicDir = path.join(projectDir, "public");
  const props = values.props ? (JSON.parse(values.props) as Record<string, unknown>) : undefined;

  switch (command) {
    case "preview": {
      const { url } = await startStudio({ entry, projectDir, mode: "studio" }, { port: values.port ? parseInt(values.port, 10) : undefined, open: values.open });
      console.log(`clapper studio → ${url}`);
      await new Promise(() => {});
      return;
    }
    case "compositions": {
      const outDir = await buildHarness({ entry, projectDir, mode: "harness" });
      const server = await serveBuilt({ entry, projectDir, mode: "harness" }, outDir);
      try {
        const comps = await probeCompositions(server.url);
        if (values.json) {
          console.log(JSON.stringify(comps, null, 2));
        } else {
          for (const c of comps) {
            console.log(`${c.id}\t${c.width}x${c.height}\t${c.fps}fps\t${c.durationInFrames} frames (${(c.durationInFrames / c.fps).toFixed(2)}s)`);
            for (const s of c.scenes ?? []) console.log(`  ${s.name.padEnd(12)} ${String(s.start).padStart(5)}–${String(s.end).padEnd(5)} (${(s.start / c.fps).toFixed(2)}s, ${((s.end - s.start) / c.fps).toFixed(1)}s long)`);
          }
        }
      } finally {
        await server.close();
        if (!values["keep-build"]) removeHarness(outDir);
      }
      return;
    }
    case "review": {
      const t0 = Date.now();
      console.error("Bundling…");
      const outDir = await buildHarness({ entry, projectDir, mode: "harness" });
      const server = await serveBuilt({ entry, projectDir, mode: "harness" }, outDir);
      try {
        const comps = await probeCompositions(server.url);
        const meta = comps.find((c) => c.id === (values.composition ?? c.id));
        if (!meta) throw new Error(`Unknown composition "${values.composition}" (available: ${comps.map((c) => c.id).join(", ")})`);
        let last = -1;
        const result = await reviewComposition({
          url: server.url,
          entry,
          projectDir,
          publicDir,
          meta,
          props,
          out: values.out,
          video: values.video ? path.resolve(values.video) : undefined,
          draft: values.draft,
          lint: !values["no-lint"],
          log: (m) => {
            const pm = /^Frames (\d+)\/(\d+)/.exec(m);
            if (pm) {
              const pct = Math.floor((Number(pm[1]) / Number(pm[2])) * 100);
              if (pct !== last) {
                last = pct;
                process.stderr.write(`\r${m}`);
              }
            } else process.stderr.write(`${m}\n`);
          },
        });
        console.log(`Review kit for "${meta.id}" → ${path.relative(process.cwd(), result.dir)}`);
        console.log(`  scenes: ${result.scenes.map((s) => `${s.name}@${s.start}`).join("  ")}`);
        console.log(`  files:  ${result.files.join(", ")}`);
        const errors = result.issues.filter((i) => i.level === "error");
        const warns = result.issues.filter((i) => i.level === "warn");
        console.log(`  lint:   ${errors.length} error(s), ${warns.length} warning(s) · ${result.checked.copyBoxes} copy boxes over ${result.checked.frames} frames${result.issues.length ? " — see lint.json / brief.md" : ""}`);
        for (const i of result.issues.slice(0, 12)) console.log(`    ${i.level.padEnd(5)} ${i.rule}${i.frame !== undefined ? ` @${i.frame}` : ""}${i.scene ? ` [${i.scene}]` : ""}: ${i.message}`);
        console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s total`);
        if (errors.length) process.exitCode = 1;
      } finally {
        await server.close();
        if (!values["keep-build"]) removeHarness(outDir);
      }
      return;
    }
    case "cues": {
      const outDir = await buildHarness({ entry, projectDir, mode: "harness" });
      const server = await serveBuilt({ entry, projectDir, mode: "harness" }, outDir);
      try {
        const comps = await probeCompositions(server.url);
        const compositionId = values.composition ?? comps[0]?.id;
        if (!compositionId) throw new Error("No compositions registered");
        const cues = await collectCues(server.url, compositionId, props);
        const fps = comps.find((c) => c.id === compositionId)?.fps ?? 30;
        if (values.out) {
          fs.writeFileSync(values.out, JSON.stringify(cues, null, 2));
          console.log(`Wrote ${cues.length} cues to ${values.out}`);
        }
        const byKind = new Map<string, number>();
        for (const c of cues) {
          const k = c.kind === "tone" ? `tone:${c.tone?.wave}` : `file`;
          byKind.set(k, (byKind.get(k) ?? 0) + 1);
        }
        console.log(`${cues.length} cues in "${compositionId}"`);
        for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${n}`);
        console.log("start\tend\tvol\tkind\tdetail\tid");
        for (const c of cues) {
          const detail = c.kind === "tone" ? `${c.tone?.wave} ${Math.round(c.tone?.freq ?? 0)}Hz${c.tone?.reverb ? ` rev${c.tone.reverb}` : ""}${c.tone?.pan ? ` pan${c.tone.pan}` : ""}` : c.src;
          console.log(`${(c.startFrame / fps).toFixed(2)}s\t${(c.endFrame / fps).toFixed(2)}s\t${c.volume.toFixed(2)}\t${c.kind}\t${detail}\t${c.id.split("|")[0].split("/").slice(1).join("/")}`);
        }
      } finally {
        await server.close();
        if (!values["keep-build"]) removeHarness(outDir);
      }
      return;
    }
    case "render":
    case "still": {
      const t0 = Date.now();
      console.error("Bundling…");
      const outDir = await buildHarness({ entry, projectDir, mode: "harness" });
      const server = await serveBuilt({ entry, projectDir, mode: "harness" }, outDir);
      try {
        const comps = await probeCompositions(server.url);
        if (comps.length === 0) throw new Error("No compositions registered");
        let compositionId = values.composition;
        if (!compositionId) {
          compositionId = comps[0].id;
          if (comps.length > 1) console.error(`No --composition given; using "${compositionId}" (available: ${comps.map((c) => c.id).join(", ")})`);
        }
        const meta = comps.find((c) => c.id === compositionId);
        if (!meta) throw new Error(`Unknown composition "${compositionId}" (available: ${comps.map((c) => c.id).join(", ")})`);
        // --scene narrows to one scene of the plan; --range is absolute frames
        let range: [number, number] | undefined = values.range ? (values.range.split("-").map((n) => parseInt(n, 10)) as [number, number]) : undefined;
        if (values.scene) {
          const sc = meta.scenes?.find((s) => s.name === values.scene);
          if (!sc) throw new Error(`Unknown scene "${values.scene}"${meta.scenes?.length ? ` (scenes: ${meta.scenes.map((s) => s.name).join(", ")})` : " (the composition declares no scenes; pass scenes={plan} to <Composition>)"}`);
          range = [sc.start, sc.end];
        }
        if (command === "still") {
          const base = range ? range[0] : 0;
          let frames: number[];
          if (values.every) {
            const every = parseInt(values.every, 10);
            const [a, b] = range ?? [0, meta.durationInFrames];
            frames = [];
            for (let f = a; f < b; f += every) frames.push(f);
          } else if (values.frame) {
            frames = values.frame.split(",").map((n) => base + parseInt(n.trim(), 10));
          } else if (range) {
            frames = [range[0], Math.floor((range[0] + range[1]) / 2), range[1] - 1];
          } else frames = [0];
          const scale = values.scale ? parseFloat(values.scale) : values.draft ? 0.5 : 1;
          if (frames.length === 1 && values.out && /\.(png|jpe?g)$/i.test(values.out)) {
            console.log(await renderStill({ url: server.url, compositionId, frame: frames[0], out: values.out, scale, props }));
            return;
          }
          const outDir = values.out ?? path.join(projectDir, "out", "stills");
          const files = await renderStills({ url: server.url, compositionId, frames, outDir, scale, props, format: values["image-format"] as never });
          for (const f of files) console.log(f);
          return;
        }
        const out = values.out ?? path.join(projectDir, "out", `${compositionId}${values.scene ? `.${values.scene}` : ""}${values.draft ? ".draft" : ""}.mp4`);
        let last = -1;
        const result = await renderComposition({
          url: server.url,
          compositionId,
          props,
          out,
          publicDir,
          concurrency: values.concurrency ? parseInt(values.concurrency, 10) : undefined,
          scale: values.scale ? parseFloat(values.scale) : values.draft ? 0.5 : 1,
          range,
          codec: values.codec as never,
          crf: values.crf ? parseInt(values.crf, 10) : values.draft ? 28 : undefined,
          preset: values.preset ?? (values.draft ? "veryfast" : undefined),
          imageFormat: values["image-format"] as never,
          muteAudio: values.mute,
          loudnorm: values.loudnorm === undefined ? undefined : values.loudnorm === "off" ? false : parseFloat(values.loudnorm),
          onProgress: (done, total) => {
            const pct = Math.floor((done / total) * 100);
            if (pct !== last) {
              last = pct;
              process.stderr.write(`\rFrames ${done}/${total} (${pct}%)`);
            }
          },
        });
        process.stderr.write("\n");
        console.log(`Wrote ${result.out}  (${result.frames} frames, ${result.audioCues} audio cues, ${result.seconds.toFixed(1)}s render, ${((Date.now() - t0) / 1000).toFixed(1)}s total)`);
      } finally {
        await server.close();
        if (!values["keep-build"]) removeHarness(outDir);
      }
      return;
    }
    default:
      throw new Error(`Unknown command "${command}". ${HELP}`);
  }
}

/** Nearest ancestor with a package.json. */
function findProjectDir(from: string): string {
  let dir = path.dirname(from);
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.dirname(from);
    dir = parent;
  }
}
