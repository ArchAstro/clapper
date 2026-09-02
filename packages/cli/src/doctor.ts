import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { resolveFfmpeg } from "./ffmpeg.ts";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

/** Environment checks: Node, Chromium, ffmpeg encoders, React/core resolution from the project. */
export function doctor(projectDir?: string): DoctorCheck[] {
  const out: DoctorCheck[] = [];
  const major = parseInt(process.versions.node.split(".")[0], 10);
  out.push({ name: "node", ok: major >= 24, detail: `v${process.versions.node}`, fix: "Node 24+ is required (the CLI runs TypeScript natively)." });

  let chromePath = "";
  try {
    chromePath = chromium.executablePath();
  } catch (e) {
    chromePath = "";
  }
  const chromeOk = !!chromePath && fs.existsSync(chromePath);
  out.push({ name: "chromium", ok: chromeOk, detail: chromeOk ? chromePath : "not installed", fix: "cd packages/cli && pnpm exec playwright install chromium" });

  let ffPath = "";
  try {
    ffPath = resolveFfmpeg();
  } catch {
    ffPath = "";
  }
  if (!ffPath) out.push({ name: "ffmpeg", ok: false, detail: "not found", fix: "pnpm install (ffmpeg-static must be allowed to build; see pnpm-workspace.yaml allowBuilds) or set AGENTICVIDS_FFMPEG" });
  else {
    const r = spawnSync(ffPath, ["-hide_banner", "-encoders"], { encoding: "utf8" });
    const enc = r.stdout ?? "";
    const has = (n: string) => new RegExp(`\\s${n}\\s`).test(enc);
    const ver = /ffmpeg version (\S+)/.exec(spawnSync(ffPath, ["-version"], { encoding: "utf8" }).stdout ?? "")?.[1] ?? "?";
    out.push({ name: "ffmpeg", ok: r.status === 0, detail: `${ffPath} (${ver})` });
    out.push({ name: "ffmpeg libx264", ok: has("libx264"), detail: has("libx264") ? "available" : "missing", fix: "Use the bundled ffmpeg-static or a system ffmpeg built with libx264." });
    out.push({ name: "ffmpeg aac", ok: has("aac"), detail: has("aac") ? "available" : "missing" });
    const filters = spawnSync(ffPath, ["-hide_banner", "-filters"], { encoding: "utf8" }).stdout ?? "";
    const needed = ["loudnorm", "ebur128", "signalstats", "showspectrumpic", "amix"];
    const missing = needed.filter((f) => !new RegExp(`\\s${f}\\s`).test(filters));
    out.push({ name: "ffmpeg filters", ok: missing.length === 0, detail: missing.length ? `missing ${missing.join(", ")}` : needed.join(", ") });
  }

  const dir = projectDir ?? process.cwd();
  const req = createRequire(path.join(dir, "package.json"));
  for (const mod of ["react", "react-dom", "@agenticvids/core"]) {
    try {
      const p = req.resolve(`${mod}/package.json`);
      const v = JSON.parse(fs.readFileSync(p, "utf8")).version;
      out.push({ name: mod, ok: true, detail: `${v} from ${path.relative(dir, path.dirname(p)) || "."}` });
    } catch {
      const soft = mod !== "@agenticvids/core";
      out.push({ name: mod, ok: soft, detail: soft ? "not a project dependency (core's copy will be used)" : "not resolvable", fix: soft ? undefined : `pnpm add ${mod}` });
    }
  }
  return out;
}
