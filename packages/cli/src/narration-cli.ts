import path from "node:path";
import { parseArgs } from "node:util";
import { compileNarration, defineNarration } from "@archastro/clapper-core/narration/models";
import { checkNarrationLock, loadNarration, renderNarration } from "./narration-render.ts";
import { findConfig } from "./project.ts";
import { installVoices, voice, voiceCatalog } from "./voices.ts";

export async function narrationCLI(kind: string, args: string[]) {
  const {
    positionals: [action, file],
    values,
  } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: "string", short: "o" },
      json: { type: "boolean" },
      force: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || !action) {
    console.log(
      "clapper voices list [--json]\nclapper voices install\nclapper voices audition <voice> [-o directory]\nclapper narration validate <script.ts>\nclapper narration lock <script.ts>\nclapper narration render <script.ts> [-o directory] [--force]",
    );
    return;
  }
  if (kind === "voices") {
    if (action === "list") {
      console.log(
        values.json
          ? JSON.stringify(voiceCatalog, null, 2)
          : voiceCatalog.voices.map((v) => `${v.id.padEnd(16)} ${v.language}  ${voiceCatalog.id}`).join("\n"),
      );
      return;
    }
    if (action === "install") {
      await installVoices();
      return;
    }
    if (action === "audition") {
      voice(file);
      const dir = path.resolve(values.out ?? `out/voices/${file}`);
      const fs = await import("node:fs");
      fs.mkdirSync(dir, { recursive: true });
      const script = defineNarration({
        title: `Audition ${file}`,
        narrators: { host: { voice: file } },
        cues: [
          {
            id: "sample",
            narrator: "host",
            at: 0,
            duration: 12,
            text: "Every scene tells part of the story. This is the voice that brings them together.",
          },
        ],
      });
      checkNarrationLock(script, dir, true);
      console.log(JSON.stringify(await renderNarration(script, dir, dir), null, 2));
      return;
    }
    throw new Error(`Unknown voices command ${action}`);
  }
  if (!["validate", "lock", "render"].includes(action))
    throw new Error(`Unknown narration command ${action}`);
  if (!file) throw new Error("Narration script file required");
  const script = await loadNarration(file);
  const root = findConfig(path.dirname(path.resolve(file)))?.dir ?? process.cwd();
  if (action === "validate") {
    for (const narrator of Object.values(script.narrators)) voice(narrator.voice);
    console.log(JSON.stringify(compileNarration(script), null, 2));
  } else if (action === "lock") {
    console.log(JSON.stringify(checkNarrationLock(script, root, true), null, 2));
  } else
    console.log(
      JSON.stringify(
        await renderNarration(script, root, values.out ?? "out/narration", { force: values.force }),
        null,
        2,
      ),
    );
}
