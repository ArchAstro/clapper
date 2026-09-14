// Opt-in integration test: downloads the optional model/runtime on first run.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { resolveFfmpeg } = await import("../packages/cli/src/ffmpeg.ts");
const repo = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(repo, "packages/cli/bin/clapper.mjs");
fs.mkdirSync(path.join(repo, ".clapper"), { recursive: true });
const dir = fs.mkdtempSync(path.join(repo, ".clapper/narration-test-"));
function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: dir,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, expected, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result;
}
const script = {
  title: "Narration integration",
  narrators: { host: { voice: "af_heart" }, guest: { voice: "am_michael" } },
  cues: [
    {
      id: "intro",
      narrator: "host",
      at: 0,
      duration: 5,
      text: "Welcome. Every scene uses the same narrator.",
    },
    {
      id: "return",
      narrator: "host",
      at: 5,
      duration: 5,
      text: "Now we return, with the same voice and delivery.",
    },
    {
      id: "guest",
      narrator: "guest",
      at: 10,
      duration: 5,
      text: "A second character has a separate, locked voice.",
    },
  ],
};
const write = () => fs.writeFileSync(path.join(dir, "script.json"), JSON.stringify(script));
try {
  run(["voices", "list", "--json"]);
  run(["voices", "install"]);
  write();
  run(["narration", "validate", "script.json"]);
  assert.match(run(["narration", "render", "script.json"], 1).stderr, /not locked/);
  run(["narration", "lock", "script.json"]);
  run(["narration", "render", "script.json", "-o", "out"]);
  const first = JSON.parse(fs.readFileSync(path.join(dir, "out/manifest.json"), "utf8"));
  assert.equal(first.cues.length, 3);
  assert.ok(first.cues.every((c) => c.durationSeconds > 1 && c.durationSeconds <= c.duration));
  const repeat = run(["narration", "render", "script.json", "-o", "out"]);
  assert.doesNotMatch(repeat.stderr, /Synthesizing/);
  const second = JSON.parse(fs.readFileSync(path.join(dir, "out/manifest.json"), "utf8"));
  assert.equal(second.sha256, first.sha256);
  script.narrators.host.voice = "af_bella";
  write();
  assert.match(run(["narration", "render", "script.json"], 1).stderr, /differs/);
  script.narrators.host.voice = "af_heart";
  script.cues[0].duration = 0.1;
  write();
  assert.match(run(["narration", "render", "script.json"], 1).stderr, /never truncated/);
  script.cues[0].duration = 5;
  script.cues[0].text = "Extraordinarily complicated pronunciation ".repeat(100);
  write();
  assert.match(run(["narration", "render", "script.json"], 1).stderr, /exceeds 510 tokens/);
  script.cues[0].text = "Welcome. Every scene uses the same narrator.";
  write();
  fs.writeFileSync(path.join(dir, "package.json"), '{"type":"module"}');
  fs.symlinkSync(path.join(repo, "packages/cli/node_modules"), path.join(dir, "node_modules"), "dir");
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(
    path.join(dir, "src/narration.ts"),
    'import {defineNarration} from "@archastro/clapper-core/narration/models"; import script from "../script.json"; export default defineNarration(script);',
  );
  fs.writeFileSync(
    path.join(dir, "clapper.json"),
    JSON.stringify({
      runtime: "0.4.0",
      entry: "src/index.tsx",
      composition: "speech",
      narration: "src/narration.ts",
    }),
  );
  fs.writeFileSync(
    path.join(dir, "src/index.tsx"),
    `import {Composition,registerRoot,Sequence} from "@archastro/clapper-core";
import {NarrationAudio} from "@archastro/clapper-core/narration";
import script from "./narration";
function Film(){return <>{script.cues.map(c=><Sequence key={c.id} from={c.at*30} durationInFrames={c.duration*30}><NarrationAudio script={script} cue={c.id}/><div>{c.text}</div></Sequence>)}</>}
registerRoot(()=><Composition id="speech" component={Film} width={320} height={180} fps={30} durationInFrames={450}/>);`,
  );
  run(["render", "--draft", "-o", "out/speech.mp4"]);
  assert.ok(fs.statSync(path.join(dir, "out/speech.mp4")).size > 10000);
  const decoded = spawnSync(
    resolveFfmpeg(),
    [
      "-v",
      "error",
      "-i",
      path.join(dir, "out/speech.mp4"),
      "-f",
      "f32le",
      "-ar",
      "24000",
      "-ac",
      "1",
      "pipe:1",
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  assert.equal(decoded.status, 0, decoded.stderr.toString());
  assert.ok(decoded.stdout.length >= 15 * 24000 * 4);
  for (const start of [0, 5, 10]) {
    let energy = 0;
    for (let i = start * 24000; i < (start + 3) * 24000; i++)
      energy += decoded.stdout.readFloatLE(i * 4) ** 2;
    assert.ok(Math.sqrt(energy / (3 * 24000)) > 0.01, `Missing speech in scene at ${start}s`);
  }
  console.log(
    `Narration integration passed: two voices, returning narrator, cache reuse, cast drift, overflow, long-text rejection, scene-local MP4.\nArtifacts: ${dir}/out`,
  );
} catch (error) {
  console.error(`Narration test artifacts retained at ${dir}`);
  throw error;
}
