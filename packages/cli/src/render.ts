import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AudioCue, CompositionMeta } from "@clapper/core";
import type { HarnessApi } from "@clapper/core/harness";
import { type Browser, chromium, type Page } from "playwright";
import { mixAudio, muxAudio, resolveVideoOptions, startFrameEncoder } from "./ffmpeg.ts";

declare global {
  interface Window {
    __clapper?: HarnessApi;
  }
}

export interface RenderOptions {
  url: string;
  compositionId: string;
  props?: Record<string, unknown>;
  out: string;
  publicDir: string;
  concurrency?: number;
  scale?: number;
  /** Inclusive start, exclusive end. */
  range?: [number, number];
  codec?: "h264" | "h265" | "vp9" | "prores";
  crf?: number;
  preset?: string;
  /** Intermediate frame format piped to ffmpeg. Default jpeg (q96); png is lossless but ~5x slower on noisy frames. */
  imageFormat?: "png" | "jpeg";
  /** Capture and export alpha as ProRes 4444 MOV. */
  transparent?: boolean;
  muteAudio?: boolean;
  /** Integrated loudness target in LUFS (default -17); false disables normalisation. */
  loudnorm?: boolean | number;
  onProgress?: (done: number, total: number) => void;
  log?: (msg: string) => void;
}

export const CHROME_ARGS = [
  "--force-color-profile=srgb",
  "--disable-lcd-text",
  "--font-render-hinting=none",
  "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--enable-font-antialiasing",
];

export async function openHarnessPage(
  browser: Browser,
  url: string,
  viewport: { width: number; height: number },
  scale: number,
  log: (m: string) => void,
): Promise<Page> {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => log(`[page error] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") log(`[console.${m.type()}] ${m.text()}`);
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__clapper?.ready === true, undefined, { timeout: 60_000 });
  return page;
}

export async function probeCompositions(url: string): Promise<CompositionMeta[]> {
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const page = await openHarnessPage(browser, url, { width: 800, height: 600 }, 1, () => {});
    return await page.evaluate(() => window.__clapper!.listCompositions());
  } finally {
    await browser.close();
  }
}

/** Visit every frame in a throwaway page and return the merged audio cue list. */
export async function collectCues(
  url: string,
  compositionId: string,
  props?: Record<string, unknown>,
): Promise<AudioCue[]> {
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const page = await openHarnessPage(browser, url, { width: 320, height: 180 }, 0.25, () => {});
    const meta: CompositionMeta = await page.evaluate(({ id, p }) => window.__clapper!.select(id, p), {
      id: compositionId,
      p: props ?? {},
    });
    // Cues register when their sequence is mounted; stepping every 4th frame is enough
    // because no cue is shorter than a sequence's mount window at that stride... except
    // one-frame sequences, so step every frame when the composition is short.
    const stride = meta.durationInFrames > 2400 ? 4 : 1;
    for (let f = 0; f < meta.durationInFrames; f += stride)
      await page.evaluate((fr) => window.__clapper!.setFrame(fr), f);
    const cues: AudioCue[] = await page.evaluate(() => window.__clapper!.collectAudio());
    return cues.sort((a, b) => a.startFrame - b.startFrame);
  } finally {
    await browser.close();
  }
}

export interface RenderResult {
  out: string;
  frames: number;
  audioCues: number;
  seconds: number;
}

export async function renderComposition(o: RenderOptions): Promise<RenderResult> {
  const { imageFormat: fmt } = resolveVideoOptions(o);
  const log = o.log ?? ((m) => console.error(m));
  const scale = o.scale ?? 1;
  const concurrency = Math.max(1, o.concurrency ?? Math.min(4, Math.max(1, os.cpus().length - 1)));
  const t0 = Date.now();
  const browser = await chromium.launch({ args: CHROME_ARGS });
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-"));
  try {
    // Probe to learn the composition's size.
    const probe = await openHarnessPage(browser, o.url, { width: 800, height: 600 }, 1, log);
    const meta: CompositionMeta = await probe.evaluate(
      ({ id, props }) => window.__clapper!.select(id, props),
      { id: o.compositionId, props: o.props ?? {} },
    );
    await probe.context().close();

    const [start, end] = o.range
      ? [Math.max(0, o.range[0]), Math.min(meta.durationInFrames, o.range[1])]
      : [0, meta.durationInFrames];
    const total = end - start;
    if (total <= 0) throw new Error(`Empty frame range ${start}-${end}`);
    log(
      `Rendering "${meta.id}" ${meta.width}x${meta.height}@${meta.fps}fps, frames ${start}-${end - 1} (${total}), ${concurrency} workers, scale ${scale}`,
    );

    fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    const videoOnly = path.join(workDir, `video${path.extname(o.out) || ".mp4"}`);
    // JPEG capture by default: PNG-encoding a 1080p frame with grain or
    // gradients costs ~250 ms; JPEG q96 costs ~40 ms and is invisible after x264.
    const encoder = startFrameEncoder({
      fps: meta.fps,
      width: meta.width * scale,
      height: meta.height * scale,
      out: videoOnly,
      codec: o.codec,
      crf: o.crf,
      preset: o.preset,
      imageFormat: fmt,
      transparent: o.transparent,
    });
    const stdin = encoder.child.stdin!;
    let encoderFailed: Error | null = null;
    encoder.catch((e) => (encoderFailed = e));

    // Ordered writer with a bounded reorder buffer.
    const pending = new Map<number, Buffer>();
    let next = start;
    let done = 0;
    let writing = Promise.resolve();
    const flush = () => {
      writing = writing.then(async () => {
        while (pending.has(next)) {
          const buf = pending.get(next)!;
          pending.delete(next);
          next++;
          if (!stdin.write(buf)) await once(stdin, "drain");
        }
      });
      return writing;
    };

    const workers = Math.min(concurrency, total);
    const chunk = Math.ceil(total / workers);
    const cuesById = new Map<string, AudioCue>();
    const errors: string[] = [];

    await Promise.all(
      Array.from({ length: workers }, async (_, w) => {
        const from = start + w * chunk;
        const to = Math.min(end, from + chunk);
        if (from >= to) return;
        const page = await openHarnessPage(
          browser,
          o.url,
          { width: meta.width, height: meta.height },
          scale,
          log,
        );
        await page.evaluate(({ id, props }) => window.__clapper!.select(id, props), {
          id: o.compositionId,
          props: o.props ?? {},
        });
        for (let f = from; f < to; f++) {
          if (encoderFailed) throw encoderFailed;
          // back-pressure: don't run far ahead of the writer
          while (f - next > workers * 6) await new Promise((r) => setTimeout(r, 5));
          await page.evaluate((frame) => window.__clapper!.setFrame(frame), f);
          const buf = await page.screenshot({
            type: fmt,
            omitBackground: o.transparent,
            quality: fmt === "jpeg" ? 96 : undefined,
            animations: "allow",
            caret: "hide",
            scale: "device",
            timeout: 60_000,
          });
          pending.set(f, buf);
          done++;
          o.onProgress?.(done, total);
          void flush();
        }
        const pageErrors: string[] = await page.evaluate(() => window.__clapper!.errors);
        errors.push(...pageErrors);
        const cues: AudioCue[] = await page.evaluate(() => window.__clapper!.collectAudio());
        for (const c of cues) cuesById.set(c.id, c);
        await page.context().close();
      }),
    );
    await flush();
    stdin.end();
    await encoder;
    if (errors.length)
      log(`[clapper] ${errors.length} page error(s) during render:\n  ${[...new Set(errors)].join("\n  ")}`);

    // Audio
    const cues = [...cuesById.values()]
      .filter((c) => c.endFrame > start && c.startFrame < end)
      .map((c) => ({ ...c, startFrame: c.startFrame - start, endFrame: c.endFrame - start }));
    let mixed: string | null = null;
    if (!o.muteAudio && cues.length) {
      log(`Mixing ${cues.length} audio cue(s)…`);
      mixed = await mixAudio({
        cues,
        fps: meta.fps,
        durationInFrames: total,
        publicDir: o.publicDir,
        workDir,
        out: path.join(workDir, "mix.wav"),
      });
    }
    const out = path.resolve(o.out);
    if (mixed) await muxAudio(videoOnly, mixed, out, { loudnorm: o.loudnorm });
    else fs.copyFileSync(videoOnly, out);
    return { out, frames: total, audioCues: cues.length, seconds: (Date.now() - t0) / 1000 };
  } finally {
    await browser.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function renderStills(o: {
  url: string;
  compositionId: string;
  frames: number[];
  outDir: string;
  scale?: number;
  props?: Record<string, unknown>;
  log?: (m: string) => void;
  format?: "png" | "jpeg";
}): Promise<string[]> {
  const log = o.log ?? ((m) => console.error(m));
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const probe = await openHarnessPage(browser, o.url, { width: 800, height: 600 }, 1, log);
    const meta: CompositionMeta = await probe.evaluate(
      ({ id, props }) => window.__clapper!.select(id, props),
      { id: o.compositionId, props: o.props ?? {} },
    );
    await probe.context().close();
    const page = await openHarnessPage(
      browser,
      o.url,
      { width: meta.width, height: meta.height },
      o.scale ?? 1,
      log,
    );
    await page.evaluate(({ id, props }) => window.__clapper!.select(id, props), {
      id: o.compositionId,
      props: o.props ?? {},
    });
    fs.mkdirSync(o.outDir, { recursive: true });
    const files: string[] = [];
    for (const f of o.frames) {
      await page.evaluate((frame) => window.__clapper!.setFrame(frame), f);
      const file = path.join(
        o.outDir,
        `${o.compositionId}-${String(f).padStart(5, "0")}.${o.format === "jpeg" ? "jpg" : "png"}`,
      );
      await page.screenshot({
        path: file,
        type: o.format ?? "png",
        animations: "allow",
        caret: "hide",
        scale: "device",
      });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}

export async function renderStill(o: {
  url: string;
  compositionId: string;
  frame: number;
  out: string;
  scale?: number;
  props?: Record<string, unknown>;
  log?: (m: string) => void;
}): Promise<string> {
  const outDir = path.dirname(path.resolve(o.out));
  const [file] = await renderStills({
    ...o,
    frames: [o.frame],
    outDir,
    format: /\.jpe?g$/i.test(o.out) ? "jpeg" : "png",
  });
  const target = path.resolve(o.out);
  if (file !== target) fs.renameSync(file, target);
  return target;
}
