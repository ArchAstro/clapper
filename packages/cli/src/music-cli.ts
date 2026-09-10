import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { compileScore, defineScore, phrase, type Score } from "@clapper/music";
import { exportMidi, importMidi } from "@clapper/music/midi";
import { catalog, installInstrument } from "./instruments.ts";
import { loadScore, renderScore } from "./music-render.ts";

export async function musicCLI(kind: string, args: string[]) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: "string", short: "o" },
      json: { type: "boolean" },
      family: { type: "string" },
      force: { type: "boolean" },
      stems: { type: "boolean" },
      format: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [action, file] = positionals;
  if (values.help || !action) {
    console.log(
      "clapper instruments list [--family strings] [--json]\nclapper instruments install <id>\nclapper instruments audition <id> [-o directory]\nclapper score validate <score.ts>\nclapper score render <score.ts> [-o directory] [--force]\nclapper score export <score.ts> [-o score.mid]\nclapper score import <score.mid> [-o score.json]",
    );
    return;
  }
  if (kind === "instruments") {
    if (action === "list") {
      const entries = catalog.instruments
        .filter((i) => !values.family || i.family === values.family)
        .map(({ assets, sfzText, ...i }) => ({
          ...i,
          sampleCount: assets.filter((a) => /\.(wav|flac|aiff?)$/i.test(a.path)).length,
        }));
      console.log(
        values.json
          ? JSON.stringify(entries, null, 2)
          : entries
              .map(
                (i) =>
                  `${i.id.padEnd(30)} ${i.family.padEnd(12)} ${i.license} ${(i.bytes / 1048576).toFixed(1)} MiB`,
              )
              .join("\n"),
      );
      return;
    }
    if (!file) throw new Error("Instrument id required");
    if (action === "install") {
      console.log(await installInstrument(file));
      return;
    }
    if (action === "audition") {
      const score = defineScore({
        title: `Audition ${file}`,
        tempo: 100,
        tail: 3,
        tracks: [
          {
            id: "audition",
            instrument: file,
            clips: [{ notes: phrase("C4 E4 G4 C5", { duration: 1 }) }],
            gain: 0.6,
          },
        ],
      });
      console.log(await renderScore(score, values.out ?? `out/audition/${file}`, { force: values.force }));
      return;
    }
    throw new Error(`Unknown instruments command ${action}`);
  }
  if (!file) throw new Error("Score file required");
  if (values.format && values.format !== "midi") throw new Error("Supported interchange format: midi");
  if (action === "import") {
    const result = importMidi(fs.readFileSync(file));
    const out = values.out ?? "out/imported-score.json";
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result.score, null, 2) + "\n");
    for (const w of result.warnings) console.error(w);
    console.log(out);
    return;
  }
  const score: Score = file.endsWith(".json")
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : await loadScore(file);
  const compiled = compileScore(score);
  if (action === "validate") {
    console.log(
      JSON.stringify(
        {
          title: score.title,
          tracks: compiled.tracks.length,
          notes: compiled.tracks.reduce((n, t) => n + t.notes.length, 0),
          durationSeconds: compiled.durationSeconds,
          tempos: compiled.tempos,
          markers: compiled.markers,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (action === "export") {
    const out = values.out ?? "out/score.mid";
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, exportMidi(compiled));
    console.error(
      "MIDI exports notes/tempo/controllers; SFZ mix gains, effects and gain automation remain in the score.",
    );
    console.log(out);
    return;
  }
  if (action === "render") {
    console.log(
      JSON.stringify(await renderScore(score, values.out ?? "out/score", { force: values.force }), null, 2),
    );
    return;
  }
  throw new Error(`Unknown score command ${action}`);
}
