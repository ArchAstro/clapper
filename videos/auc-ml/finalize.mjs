import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFfmpeg } from "@archastro/clapper";

const root = path.dirname(fileURLToPath(import.meta.url));
const chapters = JSON.parse(fs.readFileSync(path.join(root, "out/chapters.json")));
const escape = (s) => s.replace(/[\\=;#\n]/g, (c) => "\\" + c);
const lines = [";FFMETADATA1", "title=AUC in machine learning — intuition and mathematical rigor"];
for (const c of chapters)
  lines.push(
    "[CHAPTER]",
    "TIMEBASE=1/1000",
    `START=${Math.round(c.startSeconds * 1000)}`,
    `END=${Math.round((c.startSeconds + c.durationSeconds) * 1000)}`,
    `title=${escape(c.title)}`,
  );
const metadata = path.join(root, "out/chapters.ffmeta");
fs.writeFileSync(metadata, lines.join("\n") + "\n");
const r = spawnSync(
  resolveFfmpeg(),
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    path.join(root, "out/render.mp4"),
    "-i",
    metadata,
    "-map",
    "0",
    "-map_metadata",
    "1",
    "-map_chapters",
    "1",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "-y",
    path.join(root, "out/auc-ml.mp4"),
  ],
  { stdio: "inherit" },
);
if (r.status !== 0) throw Error("Chapter mux failed");
console.log("Chaptered MP4: out/auc-ml.mp4");
