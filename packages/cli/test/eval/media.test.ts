import { spawnSync } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import { inspectMedia } from "../../src/eval/capture.ts";

vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawnSync: vi.fn(),
}));
vi.mock("../../src/ffmpeg.ts", async (original) => ({
  ...(await original<typeof import("../../src/ffmpeg.ts")>()),
  resolveFfmpeg: () => "/tools/ffmpeg",
}));
afterEach(() => vi.resetAllMocks());
function mockMedia(progress: number, duration = "2.000000") {
  vi.mocked(spawnSync).mockImplementation((_command, args) => {
    const probe = args?.includes("-show_entries");
    const stdout = probe
      ? JSON.stringify({ format: { duration }, streams: [{ codec_type: "video", width: 320, height: 180 }] })
      : `frame=60\nout_time_us=${progress}\nprogress=end\n`;
    const stderr = probe ? "" : "Video: h264, 320x180, 30 fps";
    return { pid: 1, output: [null, stdout, stderr], stdout, stderr, status: 0, signal: null };
  });
}
it.each([1966667, 2000000])("uses encoded duration, not FFmpeg progress time %i", (progress) => {
  mockMedia(progress);
  const media = inspectMedia("two-seconds.mp4");
  expect(media.durationSeconds).toBe(2);
  expect(media.frames).toBe(60);
  expect(media.width).toBe(320);
});
it("rejects missing encoded duration instead of treating progress as a duration fallback", () => {
  mockMedia(2000000, "N/A");
  expect(() => inspectMedia("invalid-duration.mp4")).toThrow("encoded duration");
});
