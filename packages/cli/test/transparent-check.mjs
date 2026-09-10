// Integration check: requires installed Chromium, FFmpeg, and ffprobe.
// Run: node --test packages/cli/test/transparent-check.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveFfmpeg } from "../src/ffmpeg.ts";

const cliDir = fileURLToPath(new URL("../", import.meta.url));
const ffmpeg = resolveFfmpeg();

test("CLI exports transparent and translucent pixels, with and without audio", { timeout: 120_000 }, () => {
  const dir = fs.mkdtempSync(path.join(cliDir, "test/.transparent-"));
  try {
    fs.writeFileSync(path.join(dir, "package.json"), '{"type":"module"}');
    const entry = path.join(dir, "index.tsx");
    fs.writeFileSync(
      entry,
      `
import { Composition, registerRoot, Tone, useFrame } from "@archastro/clapper-core";
function Overlay() {
  const frame = useFrame();
  return <>
    <div style={{position:"absolute",left:32+frame,top:0,width:24,height:32,background:"red",opacity:0.5}} />
    <div style={{position:"absolute",left:64,top:0,width:32,height:32,background:"blue"}} />
    <Tone freq={440} durationInFrames={12} volume={0.1} />
  </>;
}
registerRoot(() => <Composition id="overlay" component={Overlay} width={96} height={32} fps={12} durationInFrames={12} />);
`,
    );
    function render(args) {
      execFileSync(
        process.execPath,
        [
          path.join(cliDir, "bin/clapper.mjs"),
          "render",
          entry,
          "-c",
          "overlay",
          "--concurrency",
          "2",
          ...args,
        ],
        { stdio: "inherit" },
      );
    }
    function probe(file) {
      return JSON.parse(
        execFileSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json", file], { encoding: "utf8" }),
      ).streams;
    }
    function checkAlpha(file, audio) {
      const streams = probe(file);
      const video = streams.find((s) => s.codec_type === "video");
      assert.equal(video.codec_name, "prores");
      assert.equal(video.profile, "4444");
      assert.match(video.pix_fmt, /^yuva/);
      assert.equal(
        streams.some((s) => s.codec_type === "audio"),
        audio,
      );
      const pixels = execFileSync(ffmpeg, [
        "-v",
        "error",
        "-i",
        file,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "pipe:1",
      ]);
      const stride = 96 * 32 * 4;
      assert.equal(pixels.length, stride * 12);
      for (let frame = 0; frame < 12; frame++) {
        const alpha = (x) => pixels[frame * stride + (16 * 96 + x) * 4 + 3];
        assert.equal(alpha(8), 0, "empty background stays transparent");
        assert.ok(Math.abs(alpha(48) - 128) <= 2, "half-opacity content retains partial alpha");
        assert.equal(alpha(80), 255, "solid content remains opaque");
        // Converting ProRes's higher-bit-depth alpha to 8-bit can round the midpoint.
        if (frame <= 1) assert.ok(Math.abs(alpha(33) - 128) <= 2, "animated content retains partial alpha");
        else assert.equal(alpha(33), 0, "the moving shape leaves transparent pixels behind");
      }
    }
    render(["--transparent"]);
    checkAlpha(path.join(dir, "out/overlay.mov"), true);
    const silent = path.join(dir, "silent.mov");
    render(["--transparent", "--mute", "--codec", "prores", "--image-format", "png", "-o", silent]);
    checkAlpha(silent, false);
    render(["--mute"]);
    const ordinary = probe(path.join(dir, "out/overlay.mp4")).find((s) => s.codec_type === "video");
    assert.equal(ordinary.codec_name, "h264");
    // FFmpeg can report full-range JPEG input as yuvj420p, including before alpha support.
    assert.match(ordinary.pix_fmt, /^yuvj?420p$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
