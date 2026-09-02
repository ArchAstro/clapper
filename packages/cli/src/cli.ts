import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildHarness, serveBuilt, startStudio } from "./bundle.ts";
import { collectCues, probeCompositions, renderComposition, renderStill, renderStills } from "./render.ts";

const HELP = `agenticvids — React → MP4

Usage:
  agenticvids render <entry> [options]      Render a composition to video
  agenticvids still <entry> [options]       Render one frame to PNG
  agenticvids preview <entry> [--port N]    Open the studio (scrub, play, inspect)
  agenticvids compositions <entry>          List registered compositions
  agenticvids cues <entry> -c <id>          List the audio cues of a composition (audit)

Render options:
  -c, --composition <id>   Composition id (default: the only/first one)
  -o, --out <file>         Output file (default: out/<id>.mp4)
      --props <json>       Props passed to the composition
      --range <a-b>        Frame range, inclusive start, exclusive end (e.g. 0-90)
      --frame <n[,n…]>     (still) Frame(s) to capture; several go to an --out directory
      --concurrency <n>    Parallel browser tabs (default: cpus-1, max 4)
      --scale <n>          Device scale factor (2 = render at 2x pixels)
      --codec <name>       h264 (default) | h265 | vp9 | prores
      --crf <n>            Quality (lower = better; default 17)
      --preset <name>      x264 preset (default medium)
      --image-format <f>   jpeg (default, q96, ~5x faster) | png (lossless intermediate)
      --mute               Skip audio mixing
      --loudnorm <lufs|off> Loudness target (default -16 LUFS)
      --keep-build         Keep .agenticvids/harness-build after rendering
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
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, entryArg] = positionals;
  if (values.help || !command) {
    console.log(HELP);
    return;
  }
  if (!entryArg) throw new Error(`Missing <entry>. ${HELP}`);
  const entry = path.resolve(entryArg);
  if (!fs.existsSync(entry)) throw new Error(`Entry not found: ${entry}`);
  const projectDir = findProjectDir(entry);
  const publicDir = path.join(projectDir, "public");
  const props = values.props ? (JSON.parse(values.props) as Record<string, unknown>) : undefined;

  switch (command) {
    case "preview": {
      const { url } = await startStudio({ entry, projectDir, mode: "studio" }, { port: values.port ? parseInt(values.port, 10) : undefined, open: values.open });
      console.log(`agenticvids studio → ${url}`);
      await new Promise(() => {});
      return;
    }
    case "compositions": {
      const outDir = await buildHarness({ entry, projectDir, mode: "harness" });
      const server = await serveBuilt({ entry, projectDir, mode: "harness" }, outDir);
      try {
        const comps = await probeCompositions(server.url);
        for (const c of comps) console.log(`${c.id}\t${c.width}x${c.height}\t${c.fps}fps\t${c.durationInFrames} frames (${(c.durationInFrames / c.fps).toFixed(2)}s)`);
      } finally {
        await server.close();
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
        if (!values["keep-build"]) fs.rmSync(outDir, { recursive: true, force: true });
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
        let compositionId = values.composition;
        if (!compositionId) {
          const comps = await probeCompositions(server.url);
          if (comps.length === 0) throw new Error("No compositions registered");
          compositionId = comps[0].id;
          if (comps.length > 1) console.error(`No --composition given; using "${compositionId}" (available: ${comps.map((c) => c.id).join(", ")})`);
        }
        if (command === "still") {
          const frames = (values.frame ?? "0").split(",").map((n) => parseInt(n.trim(), 10));
          const scale = values.scale ? parseFloat(values.scale) : 1;
          if (frames.length === 1 && values.out && /\.(png|jpe?g)$/i.test(values.out)) {
            console.log(await renderStill({ url: server.url, compositionId, frame: frames[0], out: values.out, scale, props }));
            return;
          }
          const outDir = values.out ?? path.join(projectDir, "out", "stills");
          const files = await renderStills({ url: server.url, compositionId, frames, outDir, scale, props, format: values["image-format"] as never });
          for (const f of files) console.log(f);
          return;
        }
        const out = values.out ?? path.join(projectDir, "out", `${compositionId}.mp4`);
        let last = -1;
        const result = await renderComposition({
          url: server.url,
          compositionId,
          props,
          out,
          publicDir,
          concurrency: values.concurrency ? parseInt(values.concurrency, 10) : undefined,
          scale: values.scale ? parseFloat(values.scale) : 1,
          range: values.range ? (values.range.split("-").map((n) => parseInt(n, 10)) as [number, number]) : undefined,
          codec: values.codec as never,
          crf: values.crf ? parseInt(values.crf, 10) : undefined,
          preset: values.preset,
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
        if (!values["keep-build"]) fs.rmSync(outDir, { recursive: true, force: true });
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
