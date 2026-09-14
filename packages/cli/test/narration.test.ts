import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineNarration } from "@archastro/clapper-core/narration/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkNarrationLock, loadNarration, renderNarration } from "../src/narration-render.ts";
import { runProcess } from "../src/voices.ts";

vi.mock("../src/voices.ts", async (original) => ({
  ...(await original<typeof import("../src/voices.ts")>()),
  verifyVoices: vi.fn(),
  runProcess: vi.fn(async (_cmd, args) => {
    const requests = JSON.parse(fs.readFileSync(args[3], "utf8"));
    for (const request of requests) {
      const pcm = Buffer.alloc(24000 * 4);
      for (let i = 0; i < 24000; i++) pcm.writeFloatLE(Math.sin(i / 10) * 0.1, i * 4);
      fs.writeFileSync(request.output, pcm);
    }
    fs.writeFileSync(args[4], JSON.stringify(requests.map((r) => ({ id: r.id, durationSeconds: 1 }))));
  }),
}));
vi.mock("../src/ffmpeg.ts", () => ({
  runFfmpeg: vi.fn(async (args) => fs.writeFileSync(args.at(-1), "mock wav")),
}));
const roots: string[] = [];
const root = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-narration-"));
  roots.push(dir);
  return dir;
};
const script = () =>
  defineNarration({
    title: "Story",
    narrators: { host: { voice: "af_heart" } },
    cues: [{ id: "hello", narrator: "host", at: 0, duration: 2, text: "Hello." }],
  });
afterEach(() => {
  for (const dir of roots.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});
describe("narration preparation", () => {
  it("requires an explicit cast lock and refuses voice/model drift", () => {
    const dir = root(),
      value = script();
    expect(() => checkNarrationLock(value, dir)).toThrow("not locked");
    checkNarrationLock(value, dir, true);
    value.cues[0].text = "New copy is allowed";
    expect(() => checkNarrationLock(value, dir)).not.toThrow();
    value.narrators.host.voice = "am_michael";
    expect(() => checkNarrationLock(value, dir)).toThrow("differs");
    checkNarrationLock(value, dir, true);
    expect(() => checkNarrationLock(value, dir)).not.toThrow();
  });
  it("reuses takes across timing edits but regenerates changed text or corrupt audio", async () => {
    const dir = root(),
      value = script(),
      out = path.join(dir, "out");
    checkNarrationLock(value, dir, true);
    const first = await renderNarration(value, dir, out);
    value.cues[0].at = 3;
    const second = await renderNarration(value, dir, out);
    expect(runProcess).toHaveBeenCalledTimes(1);
    expect(first.cues[0].sha256).toBe(second.cues[0].sha256);
    const cache = path.join(dir, ".clapper/narration/takes");
    const take = fs.readdirSync(cache).find((f) => f.endsWith(".f32"))!;
    fs.writeFileSync(path.join(cache, take), "corrupt");
    await renderNarration(value, dir, out);
    expect(runProcess).toHaveBeenCalledTimes(2);
    value.cues[0].text = "Changed.";
    await renderNarration(value, dir, out);
    expect(runProcess).toHaveBeenCalledTimes(3);
  });
  it("fails on an overflowing take before publishing a master", async () => {
    const dir = root(),
      value = script();
    value.cues[0].duration = 0.5;
    checkNarrationLock(value, dir, true);
    await expect(renderNarration(value, dir, path.join(dir, "out"))).rejects.toThrow("never truncated");
    expect(fs.existsSync(path.join(dir, "out/master.wav"))).toBe(false);
  });
  it("validates loaded JSON and rejects unknown voice presets at lock time", async () => {
    const dir = root(),
      file = path.join(dir, "script.json"),
      value = script();
    fs.writeFileSync(file, JSON.stringify(value));
    expect(await loadNarration(file)).toEqual(value);
    value.narrators.host.voice = "made_up";
    expect(() => checkNarrationLock(value, dir, true)).toThrow("Unknown voice");
  });
});
