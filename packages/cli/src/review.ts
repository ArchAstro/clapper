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
  /** Index of the enclosing copy element (siblings inside one line share it), -1 for top-level. */
  group: number;
}

/** DOM checks on sampled frames: copy outside the safe area, copy overlapping copy. */
async function domLint(url: string, meta: CompositionMeta, props: Record<string, unknown> | undefined, scenes: SceneMeta[], log: (m: string) => void): Promise<{ issues: LintIssue[]; frames: number; copyBoxes: number }> {
  const issues: LintIssue[] = [];
  let copyBoxes = 0;
  const frames = new Set<number>();
  // Sample only where one scene is on screen alone (outside transition overlaps): start+12, middle, end-6.
  const sorted = [...scenes].sort((a, b) => a.start - b.start);
  sorted.forEach((s, i) => {
    const solo0 = Math.max(s.start, sorted[i - 1]?.end ?? 0);
    const solo1 = Math.min(s.end, sorted[i + 1]?.start ?? meta.durationInFrames);
    const d = solo1 - solo0;
    if (d <= 0) return;
    for (const f of [solo0 + Math.min(12, d - 1), solo0 + Math.floor(d / 2), solo1 - 6]) if (f >= solo0 && f < solo1 && f < meta.durationInFrames - 3) frames.add(f);
  });
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const page = await openHarnessPage(browser, url, { width: meta.width, height: meta.height }, 1, log);
    await page.evaluate(([id, p]) => window.__agenticvids!.select(id as string, p as Record<string, unknown>), [meta.id, props ?? {}] as const);
    const measure = async (n: number): Promise<Box[]> => {
      await page.evaluate((k) => window.__agenticvids!.setFrame(k), n);
      return page.evaluate(() => {
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
        const all = Array.from(document.querySelectorAll("[data-copy],[data-eyebrow]"));
        all.forEach((el, i) => el.setAttribute("data-lint-i", String(i)));
        for (const el of all) {
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
          if (visibleOpacity(el) < 0.08) continue;
          // nested copy (a Reveal wrapping an Eyebrow, letters inside a line): keep the innermost only
          if (el.querySelector("[data-copy],[data-eyebrow]")) continue;
          const ancestor = el.parentElement?.closest("[data-copy],[data-eyebrow]");
          const group = ancestor ? Number(ancestor.getAttribute("data-lint-i")) : -1;
          // Measure the glyphs (a Range), not the block box: a full-width <h1> is not "outside the safe area".
          const range = document.createRange();
          range.selectNodeContents(el.firstElementChild ?? el);
          const inner = range.getBoundingClientRect();
          // Clip by every overflow-hidden ancestor and by the canvas: masked or exited copy is not on screen.
          let x1 = inner.left, y1 = inner.top, x2 = inner.right, y2 = inner.bottom;
          const clipTo = (r: DOMRect) => {
            x1 = Math.max(x1, r.left);
            y1 = Math.max(y1, r.top);
            x2 = Math.min(x2, r.right);
            y2 = Math.min(y2, r.bottom);
          };
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") clipTo(a.getBoundingClientRect());
          }
          clipTo(new DOMRect(0, 0, window.innerWidth, window.innerHeight));
          const w = x2 - x1, h = y2 - y1;
          if (w <= 0 || h <= 0) continue;
          if (w * h < 0.2 * inner.width * inner.height) continue; // mostly masked away (mid-reveal or exited)
          out.push({ x: x1, y: y1, w, h, text: text.slice(0, 40), kind: el.hasAttribute("data-eyebrow") ? "eyebrow" : "copy", group });
        }
        return out;
      });
    };
    for (const f of [...frames].sort((a, b) => a - b)) {
      const now = await measure(f);
      const later = await measure(f + 3);
      // settled boxes only: copy in flight (entering, exiting, wiping) is not a layout defect
      const key = (b: Box) => `${b.kind}|${b.text}|${b.group}`;
      const laterBy = new Map(later.map((b) => [key(b), b]));
      const boxes = now.filter((b) => {
        const l = laterBy.get(key(b));
        return l && Math.abs(l.x - b.x) < 2 && Math.abs(l.y - b.y) < 2 && Math.abs(l.w - b.w) < 2;
      });
      copyBoxes += boxes.length;
      const scene = scenes.find((s) => f >= s.start && f < s.end)?.name;
      const mx = meta.width * 0.05, my = meta.height * 0.05;
      for (const b of boxes) {
        if (b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= meta.width || b.y >= meta.height) continue;
        if (b.x < mx || b.y < my || b.x + b.w > meta.width - mx || b.y + b.h > meta.height - my) {
          issues.push({ level: "warn", rule: "safe-area", frame: f, scene, message: `"${b.text}" crosses the 5% safe margin (${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)})` });
        }
      }
      // Line boxes carry the font's internal leading; shrink 15% top/bottom and 3% left/right to approximate ink
      // before testing, so tightly leaded stacked lines do not count as collisions.
      const ink = (b: Box) => ({ x: b.x + b.w * 0.03, y: b.y + b.h * 0.15, w: b.w * 0.94, h: b.h * 0.7 });
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = ink(boxes[i]), b = ink(boxes[j]);
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 6 && oy > 6 && boxes[i].group === boxes[j].group && !(boxes[i].text.includes(boxes[j].text) || boxes[j].text.includes(boxes[i].text))) {
            issues.push({ level: "error", rule: "overlap", frame: f, scene, message: `"${boxes[i].text}" overlaps "${boxes[j].text}" by ${Math.round(ox)}×${Math.round(oy)}px` });
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  return { issues, frames: frames.size, copyBoxes };
}

interface Luma {
  avg: number;
  /** YMAX − YMIN: small for a flat background (codec noise only), large once type or shapes are on screen. */
  range: number;
}

/** Luma statistics of specific frames in the MP4. */
function lumaOf(video: string, frames: number[]): Map<number, Luma> {
  const sorted = [...new Set(frames)].sort((a, b) => a - b);
  const sel = sorted.map((n) => `eq(n\\,${n})`).join("+");
  const r = ff(["-i", video, "-vf", `select='${sel}',signalstats,metadata=print:file=-`, "-f", "null", "-"], { capture: true });
  const avg = [...(r.stdout ?? "").matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const low = [...(r.stdout ?? "").matchAll(/lavfi\.signalstats\.YMIN=([\d.]+)/g)].map((m) => Number(m[1]));
  const high = [...(r.stdout ?? "").matchAll(/lavfi\.signalstats\.YMAX=([\d.]+)/g)].map((m) => Number(m[1]));
  const out = new Map<number, Luma>();
  sorted.forEach((n, i) => out.set(n, { avg: avg[i] ?? NaN, range: (high[i] ?? 0) - (low[i] ?? 0) }));
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
    const ref = luma.get(Math.min(c + 15, total - 1)) ?? { avg: 0, range: 0 };
    const scene = scenes.find((s) => c >= s.start && c < s.end)?.name;
    for (const f of [c, c + 1, c + 2]) {
      const y = luma.get(f) ?? { avg: 0, range: 0 };
      if (y.avg < 24 && ref.avg > y.avg + 20) issues.push({ level: "error", rule: "blank-after-cut", frame: f, scene, message: `frame ${f} is near-black (Y=${y.avg.toFixed(1)}) right after the cut at ${c}; the scene settles at Y=${ref.avg.toFixed(1)}` });
      else if (y.range < 20 && ref.range > 80) issues.push({ level: "error", rule: "flat-after-cut", frame: f, scene, message: `frame ${f} is a flat background (luma spread ${y.range.toFixed(0)}) right after the cut at ${c}; the scene has content by +15 (spread ${ref.range.toFixed(0)}). Give the scene an instant anchor at local frame 0.` });
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
  const optIn = o.lint !== false && checked.copyBoxes === 0 ? "\n- **no copy elements found**: the safe-area/overlap rules only see elements tagged `data-copy` (core `Copy`, `Reveal`, `Eyebrow`, `Bubble` do this); add `data-copy=\"\"` to your own headline elements to opt in" : "";
  const lintText = `${o.lint === false ? "- skipped (--no-lint)" : `- checked ${cuts.length} cut(s) for blank frames, ${checked.copyBoxes} copy element(s) across ${checked.frames} sampled frame(s) for safe-area/overlap, and the source for non-determinism`}${optIn}\n${issues.map((i) => `- **${i.level}** \`${i.rule}\`${i.frame !== undefined ? ` @${i.frame}` : ""}${i.scene ? ` [${i.scene}]` : ""}: ${i.message}`).join("\n") || "- clean"}`;
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
