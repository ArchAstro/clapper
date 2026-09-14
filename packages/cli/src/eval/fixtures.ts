import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHarness, removeHarness, serveBuilt } from "../bundle.ts";
import { probeCompositions, renderComposition } from "../render.ts";
import { domLint } from "../review.ts";
import { inspectMedia } from "./capture.ts";
import { writeJSON } from "./io.ts";
import { matrixOracle, queueOracle } from "./oracles.ts";

const layouts = [
  "svg",
  "html",
  "transform",
  "svg-overlap",
  "moving-overlap",
  "html-overlap",
  "safe-margin",
  "zoom",
  "subscript",
  "long-equation",
  "empty",
  "seek-stable",
  "seek-unstable",
  "invisible",
  "hidden",
  "nested",
  "duplicate",
  "portrait",
  "event-window",
  "fractional",
];
export async function runFixtures(out: string) {
  const root = path.resolve(out);
  assert.ok(!fs.existsSync(root), "Fixture output exists; choose a fresh directory");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
  fs.symlinkSync(
    fileURLToPath(new URL("../../node_modules", import.meta.url)),
    path.join(root, "node_modules"),
    "dir",
  );
  fs.writeFileSync(
    path.join(root, "index.tsx"),
    `import {Composition,registerRoot,useFrame,Tone} from '@archastro/clapper-core';
const layouts=${JSON.stringify(layouts)};let counter=0;
function View({kind}){const f=useFrame();const overlap=['svg-overlap','moving-overlap','duplicate','event-window'].includes(kind);const x=kind==='safe-margin'?0:kind==='fractional'?35.5:35;const shift=kind==='moving-overlap'?f*2:kind==='event-window'?(f===8?0:130):0;return <div style={{width:'100%',height:'100%',background:'#10252d',color:'white'}}>
{kind==='audio'&&<Tone freq={440} durationInFrames={30} volume={0.1}/>}
{kind==='html'||kind==='html-overlap'||kind==='nested'?<><div data-copy style={{position:'absolute',left:35,top:45,fontSize:28}}>First label</div>{kind==='html-overlap'&&<div data-copy style={{position:'absolute',left:40,top:50,fontSize:28}}>Second label</div>}{kind==='nested'&&<div data-copy style={{position:'absolute',left:35,top:100}}><span data-copy>Nested label</span></div>}</>:<svg width="100%" height="100%"><g transform={kind==='transform'?'translate(20 15) scale(1.1)':kind==='zoom'?'scale(2.5)':''} opacity={kind==='invisible'?0:1} style={{display:kind==='hidden'?'none':undefined}}>{kind!=='empty'&&<text x={x} y={75} fontSize={kind==='long-equation'?60:28} fill="white">{kind==='seek-unstable'?String(++counter):kind==='long-equation'?'a very long equation extends beyond the viewport':kind==='fractional'?'fractional':kind==='subscript'?<>x<tspan baselineShift="sub" fontSize={16}>t+1</tspan></>:'First label'}</text>}{overlap&&<text x={40+shift} y={80} fontSize={28} fill="#efb975">{kind==='duplicate'?'First label':'Second label'}</text>}</g></svg>}
</div>}
registerRoot(()=> <>{[...layouts,'audio','silent'].map(kind=><Composition key={kind} id={kind} component={()=> <View kind={kind}/>} width={kind==='portrait'?180:320} height={kind==='portrait'?320:180} fps={30} durationInFrames={30}/>)}</>);`,
  );
  const target = { entry: path.join(root, "index.tsx"), projectDir: root, mode: "harness" as const },
    build = await buildHarness(target),
    server = await serveBuilt(target, build);
  const results: { id: string; passed: boolean; detail: unknown }[] = [];
  try {
    const metas = await probeCompositions(server.url);
    for (const kind of layouts) {
      const meta = metas.find((m) => m.id === kind)!;
      try {
        const dom = await domLint(
          server.url,
          meta,
          undefined,
          [{ name: kind, start: 0, end: 30 }],
          () => {},
          {
            includeSvg: true,
            inspectMoving: true,
            compareSeek: kind.startsWith("seek"),
            extraFrames: [0, 8, 12, 29],
          },
        );
        if (["empty", "hidden", "invisible"].includes(kind)) assert.equal(dom.copyBoxes, 0);
        else if (
          ["svg-overlap", "moving-overlap", "html-overlap", "duplicate", "event-window"].includes(kind)
        )
          assert.ok(
            dom.issues.some((i) => i.rule === "overlap"),
            kind + " overlap missed",
          );
        else if (["safe-margin", "zoom", "long-equation"].includes(kind))
          assert.ok(
            dom.issues.some((i) => i.rule === "safe-area"),
            kind + " boundary missed",
          );
        else if (kind === "seek-unstable") assert.equal(dom.seekDeterministic, false);
        else {
          assert.ok(dom.copyBoxes > 0);
          assert.equal(dom.seekDeterministic, true);
        }
        if (kind === "svg") assert.ok(dom.svgLabels > 0 && dom.htmlLabels === 0);
        results.push({ id: kind, passed: true, detail: dom });
      } catch (e) {
        results.push({ id: kind, passed: false, detail: String(e) });
      }
    }
    for (const kind of ["audio", "silent"]) {
      try {
        const video = path.join(root, `${kind}.mp4`);
        await renderComposition({
          url: server.url,
          compositionId: kind,
          out: video,
          publicDir: path.join(root, "public"),
          concurrency: 1,
        });
        const media = inspectMedia(video);
        assert.equal(media.frames, 30);
        assert.equal(media.width, 320);
        assert.equal(media.height, 180);
        if (kind === "audio")
          assert.ok(media.audio.present && media.audio.rmsDb !== null && media.audio.rmsDb > -60);
        else assert.ok(!media.audio.present || media.audio.rmsDb === null);
        results.push({ id: kind, passed: true, detail: media });
      } catch (e) {
        results.push({ id: kind, passed: false, detail: String(e) });
      }
    }
    for (const [id, fn] of [
      ["rectangular-gradient", matrixOracle],
      ["queue-conservation", queueOracle],
    ] as const) {
      try {
        results.push({ id, passed: true, detail: fn() });
      } catch (e) {
        results.push({ id, passed: false, detail: String(e) });
      }
    }
  } finally {
    await server.close();
    removeHarness(build);
  }
  const report = {
    schema: 1,
    createdAt: new Date().toISOString(),
    purpose: "Regression fixtures for the evaluator, not film-quality scores",
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    results,
  };
  writeJSON(path.join(root, "fixtures.json"), report);
  assert.equal(
    report.passed,
    24,
    `Fixture failures: ${results
      .filter((r) => !r.passed)
      .map((r) => r.id)
      .join(", ")}; see ${root}/fixtures.json`,
  );
  return report;
}
