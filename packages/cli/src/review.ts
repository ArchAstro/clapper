import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import type { CompositionMeta, SceneMeta } from "@agenticvids/core";
import { resolveFfmpeg } from "./ffmpeg.ts";
import { CHROME_ARGS, openHarnessPage, renderComposition } from "./render.ts";

/**
 * `agenticvids review`: one command that turns a composition into a critique kit
 * a reviewer (human or subagent) can judge without scrubbing the video:
 * contact sheet, motion strips around every cut, opening strip, spectrogram,
 * waveform, loudness around cuts and per scene, a lint report, and a brief.
 */

export interface LintIssue {
  level: "error" | "warn";
  rule: string;
  frame?: number;
  scene?: string;
  message: string;
}

export interface ReviewOptions {
  url: string;
  entry: string;
  projectDir: string;
  publicDir: string;
  meta: CompositionMeta;
  props?: Record<string, unknown>;
  /** Output directory (default out/review/<id>). */
  out?: string;
  /** Use an existing MP4 instead of rendering. */
  video?: string;
  /** Faster, lower-quality render for iteration. */
  draft?: boolean;
  lint?: boolean;
  log?: (m: string) => void;
}

export interface ReviewResult {
  dir: string;
  video: string;
  scenes: SceneMeta[];
  cuts: number[];
  issues: LintIssue[];
  /** How much the DOM lint looked at (so "clean" is meaningful). */
  checked: { frames: number; copyBoxes: number };
  files: string[];
}

const ff = (args: string[], opts: { capture?: boolean } = {}) => {
  const r = spawnSync(resolveFfmpeg(), ["-hide_banner", "-loglevel", opts.capture ? "info" : "error", "-y", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !opts.capture) throw new Error(`ffmpeg failed: ${args.join(" ")}\n${r.stderr}`);
  return r;
};

/** Scene map: the composition's declared scenes, else the top-level named sequences found while stepping through the film. */
export async function probeScenes(url: string, meta: CompositionMeta, props?: Record<string, unknown>, log: (m: string) => void = () => {}): Promise<SceneMeta[]> {
  if (meta.scenes?.length) return meta.scenes;
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const page = await openHarnessPage(browser, url, { width: meta.width, height: meta.height }, 1, log);
    await page.evaluate(([id, p]) => window.__agenticvids!.select(id as string, p as Record<string, unknown>), [meta.id, props ?? {}] as const);
    const step = Math.max(1, Math.floor(meta.fps / 2));
    for (let f = 0; f < meta.durationInFrames; f += step) await page.evaluate((n) => window.__agenticvids!.setFrame(n), f);
    const tracks = await page.evaluate(() => window.__agenticvids!.getTracks());
    const named = tracks.filter((t) => t.name);
    if (named.length === 0) return [{ name: meta.id, start: 0, end: meta.durationInFrames }];
    const top = Math.min(...named.map((t) => t.depth));
    return named
      .filter((t) => t.depth === top)
      .sort((a, b) => a.startFrame - b.startFrame)
      .map((t) => ({ name: t.name, start: t.startFrame, end: Math.min(t.endFrame, meta.durationInFrames) }));
  } finally {
    await browser.close();
  }
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  kind: string;
}

/** DOM checks on sampled frames: copy outside the safe area, copy overlapping copy. */
async function domLint(url: string, meta: CompositionMeta, props: Record<string, unknown> | undefined, scenes: SceneMeta[], log: (m: string) => void): Promise<{ issues: LintIssue[]; frames: number; copyBoxes: number }> {
  const issues: LintIssue[] = [];
  let copyBoxes = 0;
  const frames = new Set<number>();
  for (const s of scenes) {
    const d = s.end - s.start;
    for (const f of [s.start + Math.min(12, d - 1), s.start + Math.floor(d / 2), s.end - 6]) if (f >= 0 && f < meta.durationInFrames) frames.add(f);
  }
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const page = await openHarnessPage(browser, url, { width: meta.width, height: meta.height }, 1, log);
    await page.evaluate(([id, p]) => window.__agenticvids!.select(id as string, p as Record<string, unknown>), [meta.id, props ?? {}] as const);
    for (const f of [...frames].sort((a, b) => a - b)) {
      await page.evaluate((n) => window.__agenticvids!.setFrame(n), f);
      const boxes: Box[] = await page.evaluate(() => {
        const out: Box[] = [];
        const visibleOpacity = (el: Element | null) => {
          let o = 1;
          while (el && el !== document.body) {
            const cs = getComputedStyle(el);
            o *= parseFloat(cs.opacity || "1");
            if (cs.visibility === "hidden" || cs.display === "none") return 0;
            el = el.parentElement;
          }
          return o;
        };
        for (const el of Array.from(document.querySelectorAll("[data-copy],[data-eyebrow]"))) {
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
          if (visibleOpacity(el) < 0.08) continue;
          // Measure the glyphs (a Range), not the block box: a full-width <h1> is not "outside the safe area".
          const outer = el.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el.firstElementChild ?? el);
          const inner = range.getBoundingClientRect();
          const x1 = Math.max(outer.left, inner.left), y1 = Math.max(outer.top, inner.top);
          const x2 = Math.min(outer.right, inner.right), y2 = Math.min(outer.bottom, inner.bottom);
          const w = x2 - x1, h = y2 - y1;
          if (w <= 0 || h <= 0) continue;
          if (w * h < 0.2 * inner.width * inner.height) continue; // masked away (mid-reveal or exited)
          out.push({ x: x1, y: y1, w, h, text: text.slice(0, 40), kind: el.hasAttribute("data-eyebrow") ? "eyebrow" : "copy" });
        }
        return out;
      });
      copyBoxes += boxes.length;
      const scene = scenes.find((s) => f >= s.start && f < s.end)?.name;
      const mx = meta.width * 0.05, my = meta.height * 0.05;
      for (const b of boxes) {
        if (b.x < mx || b.y < my || b.x + b.w > meta.width - mx || b.y + b.h > meta.height - my) {
          issues.push({ level: "warn", rule: "safe-area", frame: f, scene, message: `"${b.text}" crosses the 5% safe margin (${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)})` });
        }
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 4 && oy > 4 && !(a.text.includes(b.text) || b.text.includes(a.text))) {
            issues.push({ level: "error", rule: "overlap", frame: f, scene, message: `"${a.text}" overlaps "${b.text}" by ${Math.round(ox)}×${Math.round(oy)}px` });
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  return { issues, frames: frames.size, copyBoxes };
}

/** Average luma of specific frames in the MP4, in the order requested. */
function lumaOf(video: string, frames: number[]): Map<number, number> {
  const sorted = [...new Set(frames)].sort((a, b) => a - b);
  const sel = sorted.map((n) => `eq(n\\,${n})`).join("+");
  const r = ff(["-i", video, "-vf", `select='${sel}',signalstats,metadata=print:file=-`, "-f", "null", "-"], { capture: true });
  const vals = [...(r.stdout ?? "").matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const out = new Map<number, number>();
  sorted.forEach((n, i) => out.set(n, vals[i] ?? NaN));
  return out;
}

/** Frames that are near-black right after a cut while the scene itself is not. Limited-range video: black is Y≈16. */
function blankLint(video: string, cuts: number[], scenes: SceneMeta[], total: number): LintIssue[] {
  if (cuts.length === 0) return [];
  const want: number[] = [];
  for (const c of cuts) for (const f of [c, c + 1, c + 2, Math.min(c + 15, total - 1)]) want.push(f);
  const luma = lumaOf(video, want);
  const issues: LintIssue[] = [];
  for (const c of cuts) {
    const ref = luma.get(Math.min(c + 15, total - 1)) ?? 0;
    for (const f of [c, c + 1, c + 2]) {
      const y = luma.get(f) ?? 0;
      if (y < 24 && ref > y + 20) issues.push({ level: "error", rule: "blank-after-cut", frame: f, scene: scenes.find((s) => f >= s.start && f < s.end)?.name, message: `frame ${f} is near-black (Y=${y.toFixed(1)}) right after the cut at ${c}; the scene settles at Y=${ref.toFixed(1)}` });
    }
  }
  return issues;
}

/** Source-level determinism lint: things that make frames depend on wall-clock or randomness. */
export function sourceLint(projectDir: string): LintIssue[] {
  const srcDir = fs.existsSync(path.join(projectDir, "src")) ? path.join(projectDir, "src") : projectDir;
  const rules: [RegExp, string][] = [
    [/Math\.random\(/, "Math.random() makes frames non-deterministic; use useRandom()/noise1d()"],
    [/\bDate\.now\(|new Date\(\)/, "wall-clock time in a frame; derive from useFrame()"],
    [/performance\.now\(/, "performance.now() in a frame; derive from useFrame()"],
    [/\bsetTimeout\(|\bsetInterval\(/, "timers do not advance with the virtual clock; drive it from the frame"],
    [/requestAnimationFrame\(/, "rAF loops fight the harness clock; drive it from the frame"],
  ];
  const issues: LintIssue[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
        fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
          for (const [re, msg] of rules) if (re.test(line) && !/agenticvids-ok/.test(line)) issues.push({ level: "warn", rule: "determinism", message: `${path.relative(projectDir, p)}:${i + 1}: ${msg}` });
        });
      }
    }
  };
  walk(srcDir);
  return issues;
}

function rms(video: string, a: number, b: number): number {
  const r = ff(["-ss", a.toFixed(3), "-to", b.toFixed(3), "-i", video, "-vn", "-af", "astats=measure_perchannel=none:measure_overall=RMS_level", "-f", "null", "-"], { capture: true });
  const m = /RMS level dB:\s*(-?[\d.]+|-inf)/.exec(r.stderr);
  return m ? (m[1] === "-inf" ? -90 : Number(m[1])) : NaN;
}

function lufs(video: string, a: number, b: number): string {
  const r = ff(["-ss", a.toFixed(2), "-to", b.toFixed(2), "-i", video, "-vn", "-af", "ebur128", "-f", "null", "-"], { capture: true });
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr.split("Summary").pop() ?? "");
  return m ? m[1] : "?";
}

function hasAudio(video: string): boolean {
  const r = ff(["-i", video], { capture: true });
  return /Stream #\d+:\d+.*Audio/.test(r.stderr);
}

export async function reviewComposition(o: ReviewOptions): Promise<ReviewResult> {
  const log = o.log ?? (() => {});
  const { meta } = o;
  const fps = meta.fps;
  const dir = o.out ?? path.join(o.projectDir, "out", "review", meta.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const scenes = await probeScenes(o.url, meta, o.props, log);
  const cuts = scenes.slice(1).map((s) => s.start);
  const total = meta.durationInFrames;

  let video = o.video;
  if (!video) {
    video = path.join(dir, `${meta.id}${o.draft ? ".draft" : ""}.mp4`);
    log(`Rendering ${meta.id}${o.draft ? " (draft)" : ""}…`);
    await renderComposition({
      url: o.url,
      compositionId: meta.id,
      props: o.props,
      out: video,
      publicDir: o.publicDir,
      scale: o.draft ? 0.5 : 1,
      crf: o.draft ? 28 : 20,
      preset: o.draft ? "veryfast" : undefined,
      log,
    });
  }
  const audio = hasAudio(video);

  // 1. contact sheet: 8 columns, one tile every `step` frames, at most 16 rows
  const step = Math.max(12, Math.ceil(total / (8 * 16)));
  const rows = Math.max(1, Math.ceil(total / step / 8));
  ff(["-i", video, "-vf", `select=not(mod(n\\,${step})),scale=240:-1,tile=8x${rows}:padding=4:margin=4:color=#333333`, "-frames:v", "1", path.join(dir, "contact-sheet.png")]);
  // 2. motion strips around cuts (9 tiles: -10 … +14 frames, every 3)
  for (const c of cuts) {
    const a = Math.max(0, c - 10), b = c + 14;
    ff(["-i", video, "-vf", `select='between(n\\,${a}\\,${b})*not(mod(n-${a}\\,3))',scale=213:-1,tile=9x1:padding=2:color=#333333`, "-frames:v", "1", path.join(dir, `cut-${String(c).padStart(4, "0")}.png`)]);
  }
  // 3. opening 2 s
  ff(["-i", video, "-vf", `select='lt(n\\,${2 * fps})*not(mod(n\\,4))',scale=213:-1,tile=5x3:padding=2:color=#333333`, "-frames:v", "1", path.join(dir, "opening-2s.png")]);
  // 4. audio pictures + numbers
  if (audio) {
    ff(["-i", video, "-lavfi", "showspectrumpic=s=1920x560:legend=1:color=intensity:scale=log", path.join(dir, "spectrogram.png")]);
    ff(["-i", video, "-lavfi", "showwavespic=s=1920x260:colors=#39d0ff|#ff3ea5:split_channels=0", path.join(dir, "waveform.png")]);
    const win = 0.1, span = 1.2;
    const header = `cut\tt(s)\t${Array.from({ length: Math.round((2 * span) / win) }, (_, i) => (-span + i * win).toFixed(1)).join("\t")}`;
    const lines = cuts.map((c) => {
      const t = c / fps;
      const row: string[] = [];
      for (let off = -span; off < span - 1e-9; off += win) row.push(rms(video!, Math.max(0, t + off), Math.max(0, t + off + win)).toFixed(0));
      return `${c}\t${t.toFixed(2)}\t${row.join("\t")}`;
    });
    const sceneRows = scenes.map((s) => `${s.name}\t${(s.start / fps).toFixed(2)}–${(s.end / fps).toFixed(2)} s\t${lufs(video!, s.start / fps, s.end / fps)} LUFS`);
    fs.writeFileSync(path.join(dir, "audio-cuts.txt"), `Short-term RMS (dB) in 100 ms windows from -1.2 s to +1.1 s around each cut. Look for holes before a hit and jumps after.\n${header}\n${lines.join("\n")}\n\nIntegrated loudness per scene:\n${sceneRows.join("\n")}\n`);
  }
  // 5. lint
  const issues: LintIssue[] = [];
  const checked = { frames: 0, copyBoxes: 0 };
  if (o.lint !== false) {
    issues.push(...blankLint(video, cuts, scenes, total));
    const dom = await domLint(o.url, meta, o.props, scenes, log);
    issues.push(...dom.issues);
    checked.frames = dom.frames;
    checked.copyBoxes = dom.copyBoxes;
    issues.push(...sourceLint(o.projectDir));
  }
  fs.writeFileSync(path.join(dir, "lint.json"), JSON.stringify(issues, null, 2));
  fs.writeFileSync(path.join(dir, "scenes.json"), JSON.stringify({ id: meta.id, fps, width: meta.width, height: meta.height, durationInFrames: total, scenes, cuts }, null, 2));
  // 6. brief
  const files = fs.readdirSync(dir).sort();
  const sceneTable = scenes.map((s) => `| ${s.name} | ${s.start} | ${(s.start / fps).toFixed(2)} s | ${s.end - s.start} (${((s.end - s.start) / fps).toFixed(1)} s) |`).join("\n");
  const lintText = `${o.lint === false ? "- skipped (--no-lint)" : `- checked ${cuts.length} cut(s) for blank frames, ${checked.copyBoxes} copy element(s) across ${checked.frames} sampled frame(s) for safe-area/overlap, and the source for non-determinism`}\n${issues.map((i) => `- **${i.level}** \`${i.rule}\`${i.frame !== undefined ? ` @${i.frame}` : ""}${i.scene ? ` [${i.scene}]` : ""}: ${i.message}`).join("\n") || "- clean"}`;
  const brief = `# Review brief: ${meta.id}

- video: \`${path.relative(o.projectDir, video)}\` · ${meta.width}×${meta.height} · ${fps} fps · ${total} frames (${(total / fps).toFixed(1)} s)${audio ? "" : " · **no audio track**"}
- entry: \`${path.relative(o.projectDir, o.entry)}\`
- stills: \`agenticvids still ${path.relative(o.projectDir, o.entry)} -c ${meta.id} --frame <a,b,c>\` (or \`--scene <name>\`)

## Scenes

| scene | start | t | length |
|---|---|---|---|
${sceneTable}

Cuts at frames: ${cuts.join(", ") || "(none)"}

## Kit

- \`contact-sheet.png\` — every ${step}th frame, 8 per row, reading order = time.
- \`cut-NNNN.png\` — 9 tiles from 10 frames before to 14 after each cut (every 3rd frame): judge the cut itself.
- \`opening-2s.png\` — the first two seconds every 4 frames: the hook.
${audio ? "- `spectrogram.png`, `waveform.png` — the whole mix; look for holes at cuts, sub build-up, brick-wall clipping.\n- `audio-cuts.txt` — RMS in 100 ms windows around each cut and integrated LUFS per scene." : ""}
- \`lint.json\` — machine checks (below). \`scenes.json\` — the scene map.

## Lint

${lintText}

## Reviewer prompt

You are reviewing a ${(total / fps).toFixed(0)}-second motion piece. Open every image in this folder, read \`audio-cuts.txt\`, and render any frames you need with the still command above. Judge it as a creative director would: hook in 2 s, one idea per scene, type never fighting the picture, cuts that land on a beat, an ending that earns its silence. Report defects with frame numbers, then a verdict: SHIP or FIX with the three highest-leverage changes.
`;
  fs.writeFileSync(path.join(dir, "brief.md"), brief);
  return { dir, video, scenes, cuts, issues, checked, files: fs.readdirSync(dir).sort() };
}
