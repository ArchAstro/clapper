import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineNarration } from "@archastro/clapper-core/narration/models";
import { buildHarness, removeHarness, serveBuilt } from "../bundle.ts";
import { checkNarrationLock, prepareNarration } from "../narration-render.ts";
import { renderComposition } from "../render.ts";
import type { CalibrationSet } from "./calibrate.ts";
import { sha, writeJSON } from "./io.ts";
export const MUTATIONS = [
  {
    id: "source",
    critical: true,
    criterion:
      "The requested subject is Universal Transformers2018/2019, not programmable transformer computers.",
  },
  {
    id: "direction",
    critical: true,
    criterion: "The arrow must run from input through the block to output, not backward.",
  },
  { id: "transpose", critical: true, criterion: "For y=Wx and column g, the input gradient is Wᵀg, not Wg." },
  {
    id: "qkv",
    critical: true,
    criterion: "All of Q,K,V are derived from states; the value branch must not be omitted.",
  },
  {
    id: "intro",
    critical: false,
    criterion: "The first visible explanation establishes the goal before an unintroduced equation.",
  },
  {
    id: "ordering",
    critical: false,
    criterion: "The complete input-to-answer journey must precede internal block details.",
  },
  {
    id: "illustration",
    critical: false,
    criterion: "Unmeasured synthetic numbers must be labelled illustrative, never as measured model results.",
  },
  { id: "output", critical: false, criterion: "The end-to-end architecture must include an output stage." },
  {
    id: "overlap",
    critical: false,
    criterion: "The two explanatory labels must be spatially separated and readable.",
  },
  {
    id: "tiny",
    critical: false,
    criterion: "The essential equation must be readable at320px viewing width.",
  },
  {
    id: "timing",
    critical: false,
    criterion: "The visible output cue must be present while the bottom caption refers to that output.",
  },
  {
    id: "speech",
    critical: true,
    criterion: "The delivered movie must retain its requested intelligible narration.",
  },
] as const;
export async function buildCalibration(out: string) {
  const root = path.resolve(out);
  assert.ok(!fs.existsSync(root), "Calibration output exists");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
  fs.symlinkSync(
    fileURLToPath(new URL("../../node_modules", import.meta.url)),
    path.join(root, "node_modules"),
    "dir",
  );
  const script = defineNarration({
    title: "Calibration narration",
    narrators: { guide: { voice: "af_heart" } },
    cues: [
      {
        id: "guide",
        narrator: "guide",
        at: 0,
        duration: 10,
        text: "Follow the input into the shared block. The output returns as the next input.",
      },
    ],
  });
  writeJSON(path.join(root, "narration.json"), script);
  checkNarrationLock(script, root, true);
  await prepareNarration(path.join(root, "narration.json"), root);
  fs.writeFileSync(
    path.join(root, "index.tsx"),
    `import {Composition,registerRoot,useFrame} from '@archastro/clapper-core';import {NarrationAudio} from '@archastro/clapper-core/narration';import script from './narration.json';const mutations=${JSON.stringify(MUTATIONS)};
function View({kind,bad}){const f=useFrame();const title=kind==='source'&&bad?'Programmable computers':'Universal Transformers';const goal=bad&&kind==='intro'?'∂L/∂θ = Σ Bᵀg':'Goal: refine the state, then predict';return <div style={{width:'100%',height:'100%',background:'#10252d',color:'#e9f5ee'}}>{!(bad&&kind==='speech')&&<NarrationAudio script={script}/>}<svg width="640" height="360"><text x="35" y="45" fill="#75e0c5" fontSize="20">{title}</text><text x="35" y="88" fill="white" fontSize="22">{goal}</text><text x="40" y="160" fill="white" fontSize="24">INPUT</text><rect x="215" y="120" width="190" height="80" rx="8" fill="#1c474d"/><text x="310" y="167" textAnchor="middle" fill="white" fontSize="18">{kind==='qkv'?(bad?'Q + K':'Q + K + V'):'SHARED BLOCK'}</text><text x="475" y="160" fill="white" fontSize="24" opacity={bad&&(kind==='output'||kind==='timing'&&f<240)?0:1}>OUTPUT</text><path d={bad&&kind==='direction'?'M210 165 H130 L145 157 M410 165 H470':'M130 165 H205 L190 157 M410 165 H470 L455 157'} stroke="#75e0c5" strokeWidth="3" fill="none"/><circle cx={130+(f%90)/90*75} cy="165" r="4" fill="white"/>
<text x="40" y="240" fill="#f5b891" fontSize={bad&&kind==='tiny'?6:23}>{kind==='transpose'?(bad?'∇x L = Wg':'∇x L = Wᵀg'):kind==='illustration'?(bad?'Measured accuracy: 99%':'Illustrative number: 99%'):kind==='ordering'?(bad?'Start: attention internals → purpose later':'Start: complete journey → then internals'):'State changes; weights are shared'}</text>
{kind==='overlap'&&<text x={bad?45:450} y="242" fill="#ff8793" fontSize="23">SECOND LABEL</text>}<text x="40" y="312" fill="white" fontSize="21">{kind==='timing'?'The output is visible now.':'A focused calibration clip, not a full lesson.'}</text></svg></div>}
registerRoot(()=> <>{mutations.flatMap(m=>[false,true].map(bad=><Composition key={m.id+bad} id={m.id+(bad?'-defect':'-clean')} component={()=> <View kind={m.id} bad={bad}/>} width={640} height={360} fps={30} durationInFrames={300}/>))}</>);`,
  );
  const target = { entry: path.join(root, "index.tsx"), projectDir: root, mode: "harness" as const },
    build = await buildHarness(target),
    server = await serveBuilt(target, build);
  const pairs: CalibrationSet["pairs"] = [];
  try {
    for (const m of MUTATIONS) {
      const pair = {
        id: m.id,
        critical: m.critical,
        criterion: m.criterion,
        clean: { file: `${m.id}-clean.mp4`, sha256: "", itemId: randomUUID() },
        defect: { file: `${m.id}-defect.mp4`, sha256: "", itemId: randomUUID() },
      };
      for (const kind of ["clean", "defect"] as const) {
        console.error(`Calibration ${m.id}/${kind}`);
        const file = path.join(root, pair[kind].file);
        await renderComposition({
          url: server.url,
          compositionId: `${m.id}-${kind}`,
          out: file,
          publicDir: path.join(root, "public"),
          concurrency: 1,
        });
        pair[kind].sha256 = sha(fs.readFileSync(file));
      }
      pairs.push(pair);
    }
  } finally {
    await server.close();
    removeHarness(build);
  }
  const items: { itemId: string; video: string; sha256: string; criterion: string }[] = [];
  fs.mkdirSync(path.join(root, "public-review/media"), { recursive: true });
  for (const pair of pairs)
    for (const variant of ["clean", "defect"] as const) {
      const artifact = pair[variant],
        destination = `public-review/media/${artifact.itemId}.mp4`;
      fs.renameSync(path.join(root, artifact.file), path.join(root, destination));
      artifact.file = destination;
      items.push({
        itemId: artifact.itemId,
        video: `media/${artifact.itemId}.mp4`,
        sha256: artifact.sha256,
        criterion: pair.criterion,
      });
    }
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  writeJSON(path.join(root, "public-review/packet.json"), {
    schema: 1,
    instructions:
      "Assess only the stated criterion on the actual clip. Use PASS/FAIL/BLOCKED; cite observations. No broader film-quality judgment is requested.",
    items,
  });
  const set: CalibrationSet = { schema: 1, id: "technical-calibration-v1", curator: null, pairs };
  writeJSON(path.join(root, "calibration.json"), set);
  writeJSON(path.join(root, "predictions-template.json"), {
    schema: 1,
    judgeId: "REPLACE",
    judgeVersion: "REPLACE",
    items: items.map((i) => ({ itemId: i.itemId, sha256: i.sha256, verdict: "BLOCKED" })),
  });
  fs.writeFileSync(
    path.join(root, "README.md"),
    "# Unqualified calibration set\n\nThese are authored matched clips targeting one criterion per pair, not examples of good complete films. A human expert must inspect each actual clip and confirm the defect labels before setting curator.name and curator.confirmedAt in calibration.json. No model/human judge has been calibrated by generating these files. Do not show variant labels or this gold manifest to the judge; use anonymous copies and retain the mapping outside its packet.\n",
  );
  return { manifest: path.join(root, "calibration.json"), pairs: pairs.length, qualified: false };
}
