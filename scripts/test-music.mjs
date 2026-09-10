#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { startStudio } from "../packages/cli/src/bundle.ts";
import { prepareScore, renderScore } from "../packages/cli/src/music-render.ts";
import { defineScore, note, scoreAsset } from "../packages/music/dist/index.js";

const req = createRequire(new URL("../packages/cli/package.json", import.meta.url));
const { chromium } = req("playwright");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-music-proof-"));
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const score = defineScore({
  title: "Deterministic sampled performance",
  seed: 23,
  tempo: [
    { at: 0, bpm: 110 },
    { at: 2, bpm: 95 },
  ],
  meter: [3, 4],
  tail: 1,
  length: 4,
  tracks: [
    {
      id: "piano",
      instrument: "vsupright1",
      clips: [{ notes: [note("D4", 0, 1.2), note("F#4", 1, 1.2), note("A4", 2, 1.8)] }],
      reverb: 0.4,
      controls: [
        { at: 0, cc: 64, value: 127 },
        { at: 3.8, cc: 64, value: 0 },
      ],
    },
  ],
});
if (!process.argv.includes("--preview-only")) {
  const first = await renderScore(score, path.join(root, "a"));
  const second = await renderScore(score, path.join(root, "b"), { force: true });
  assert.equal(
    hash(path.join(first.dir, "master.wav")),
    hash(path.join(second.dir, "master.wav")),
    "fresh sfizz renders must be byte-repeatable",
  );
  const cached = await renderScore(score, first.dir);
  assert.equal(cached.identity, first.identity);
  const large = defineScore({
    title: "Many parts",
    tempo: 120,
    tail: 0.3,
    tracks: Array.from({ length: 16 }, (_, i) => ({
      id: `part-${i}`,
      instrument: "glockenspiel",
      gain: 0.15,
      clips: [{ notes: [note("C5", 0, 0.3, 55)] }],
    })),
  });
  const many = await renderScore(large, path.join(root, "large"));
  assert.ok(!many.outputs.some((f) => f.file === "score.mid"));
  assert.equal(many.outputs.filter((f) => f.file.endsWith(".mid")).length, 16);
  console.log("PASS: fresh render determinism, cache verification, 16 independent parts");
}

// Real preview: score edits rebuild the WAV before full reload reaches the client.
const project = path.join(root, "project");
fs.mkdirSync(path.join(project, "src"), { recursive: true });
fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ type: "module" }));
fs.symlinkSync(path.resolve("videos/cat-ballet/node_modules"), path.join(project, "node_modules"), "dir");
const source = path.join(project, "src/score.ts");
fs.writeFileSync(source, `export default ${JSON.stringify(score)};`);
fs.writeFileSync(
  path.join(project, "src/index.tsx"),
  'import {Composition,registerRoot} from "@archastro/clapper-core"; import {ScoreAudio} from "@archastro/clapper-core/music"; import score from "./score"; function Film(){return <><ScoreAudio score={score}/><div>Music proof</div></>}; registerRoot(()=> <Composition id="proof" component={Film} width={640} height={360} fps={30} durationInFrames={240}/>);',
);
await prepareScore(source, project);
const { url, server } = await startStudio(
  { entry: path.join(project, "src/index.tsx"), projectDir: project, mode: "studio" },
  { port: 0, scoreFile: source, beforeReload: () => prepareScore(source, project) },
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(url);
  await page
    .locator(".stage")
    .getByText("Music proof", { exact: true })
    .waitFor({ timeout: 15000 })
    .catch(async (e) => {
      console.error(errors);
      console.error(await page.locator("body").innerText());
      throw e;
    });
  const api = await fetch(new URL("/__clapper/music", url));
  assert.equal(api.status, 200);
  const details = await api.json();
  assert.equal(details.path, "src/score.ts");
  assert.equal(details.score.tracks[0].notes.length, 3);
  assert.equal((await fetch(new URL("/__clapper/music", url), { method: "POST" })).status, 405);
  await page.getByRole("button", { name: "music", exact: true }).click();
  await page.getByRole("heading", { name: score.title, exact: true }).waitFor();
  const noteButton = page.locator(".music-note").nth(1),
    targetFrame = Number(await noteButton.getAttribute("data-frame"));
  await noteButton.click();
  await page.waitForFunction(
    (n) => new URLSearchParams(location.search).get("frame") === String(n),
    targetFrame,
  );
  await page.getByRole("button", { name: "Code", exact: true }).click();
  assert.ok((await page.getByLabel("Score source code").innerText()).includes(score.title));
  const changed = { ...score, title: "Changed performance", tempo: 123 };
  const reloaded = page.waitForEvent("load", { timeout: 60000 });
  fs.writeFileSync(source, `export default ${JSON.stringify(changed)};`);
  await reloaded;
  await page.waitForFunction(
    (expected) => [...(globalThis.__clapperRegistry?.audio?.values() ?? [])].some((c) => c.src === expected),
    scoreAsset(changed),
    { timeout: 60000 },
  );
  await page
    .locator(".stage")
    .getByText("Music proof", { exact: true })
    .waitFor({ timeout: 15000 })
    .catch(async (e) => {
      console.error(errors);
      console.error(await page.locator("body").innerText());
      console.error("Expected asset", scoreAsset(changed), "at", root);
      throw e;
    });
  assert.ok(fs.existsSync(path.join(project, "public", scoreAsset(changed))));
  await page.getByRole("heading", { name: changed.title, exact: true }).waitFor();
  await page.getByRole("button", { name: "Code", exact: true }).click();
  assert.ok((await page.getByLabel("Score source code").innerText()).includes(changed.title));
  assert.deepEqual(errors, []);
  console.log("PASS: preview score edit produces the new cached WAV and reloads cleanly");
} finally {
  await browser.close();
  await server.close();
}
console.log(`Music proof artifacts: ${root}`);
