// Deterministic protocol fixture only. This is deliberately not an LLM author.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const request = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const brief = JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]), request.case), "utf8"));
assert.equal(brief.constraints, undefined, "Private constraints leaked into author input");
assert.equal(brief.transferQuestions, undefined, "Private questions leaked into author input");
assert.equal(fs.existsSync("/grading-key"), false);
fs.writeFileSync("package.json", '{"type":"module"}');
fs.writeFileSync(
  "entry.tsx",
  `import {Composition,registerRoot,useFrame} from '@archastro/clapper-core';function Film(){const f=useFrame();return <svg width="320" height="180" style={{background:'#10252d'}}><text x="30" y="60" fill="white" fontSize="22">Input → block → output</text><circle cx={30+f*3} cy="110" r="5" fill="#69dec4"/></svg>};registerRoot(()=> <Composition id="film" component={Film} width={320} height={180} fps={30} durationInFrames={60}/>);`,
);
fs.writeFileSync("transcript.txt", "TEST FIXTURE: silent protocol clip.");
fs.writeFileSync(
  "plan.json",
  JSON.stringify({
    schema: 1,
    sourceIds: brief.requiredSourceIds,
    journey: "input to output",
    levels: [{ name: "whole", journey: "input to output", zoomTarget: "block" }],
    claims: [
      { id: "flow", text: "Input reaches output", sourceId: brief.requiredSourceIds[0], sourceSpan: "line1" },
    ],
  }),
);
fs.writeFileSync(
  "submission.json",
  JSON.stringify({
    schema: 1,
    entry: "entry.tsx",
    composition: "film",
    plan: "plan.json",
    transcript: "transcript.txt",
    revisions: [],
    usage: { tokens: 0, costUSD: 0, repairs: 0 },
  }),
);
console.log("Protocol fixture completed; private grading fields were absent.");
