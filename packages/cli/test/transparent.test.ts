import { describe, expect, it } from "vitest";
import { resolveVideoOptions } from "../src/ffmpeg.ts";
import { renderComposition } from "../src/render.ts";

describe("transparent export options", () => {
  it("selects lossless capture and alpha-capable encoding", () => {
    expect(resolveVideoOptions({ out: "overlay.mov", transparent: true })).toEqual({
      codec: "prores",
      imageFormat: "png",
      pixFmt: "yuva444p10le",
    });
  });

  it("preserves ordinary render defaults and opaque ProRes", () => {
    expect(resolveVideoOptions({ out: "video.mp4" })).toEqual({
      codec: "h264",
      imageFormat: "jpeg",
      pixFmt: "yuv420p",
    });
    expect(resolveVideoOptions({ out: "video.mov", codec: "prores" }).pixFmt).toBe("yuv422p10le");
  });

  it.each([
    { codec: "h264" as const },
    { codec: "h265" as const },
    { codec: "vp9" as const },
    { imageFormat: "jpeg" as const },
    { out: "overlay.mp4" },
    { pixFmt: "yuv422p10le" },
  ])("rejects options that would discard alpha: %j", (options) => {
    expect(() => resolveVideoOptions({ out: "overlay.mov", transparent: true, ...options })).toThrow();
  });

  it("rejects incompatible output before launching a browser", async () => {
    await expect(
      renderComposition({
        url: "http://unused.invalid",
        compositionId: "overlay",
        publicDir: ".",
        out: "overlay.mp4",
        transparent: true,
      }),
    ).rejects.toThrow(".mov");
  });
});
