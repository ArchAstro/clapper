#!/usr/bin/env node
// End-to-end acceptance against release artifacts. All child commands have no
// system Node/pnpm/ffmpeg/Chrome on PATH and use a fresh runtime/npm cache.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const platform=`${process.platform}-${process.arch}`;
const manifest=JSON.parse(fs.readFileSync(path.join(repo,`dist/manifest-${platform}.json`),"utf8"));
const binary=path.join(repo,"dist",manifest.launcher.file);
const archive=path.join(repo,"dist",manifest.runtime.file);
const root=fs.mkdtempSync(path.join(os.tmpdir(),"clapper standalone "));
const project=path.join(root,"my film");
const env={...process.env,PATH:"/usr/bin:/bin",CLAPPER_HOME:path.join(root,"cache"),npm_config_cache:path.join(root,"npm-cache"),npm_config_offline:"true"};
for(const name of ["NODE_PATH","NODE_OPTIONS","CLAPPER_RUNTIME","CLAPPER_VERSION","CLAPPER_FFMPEG","PLAYWRIGHT_BROWSERS_PATH"])delete env[name];
let downloads=0;
const server=http.createServer((req,res)=>{downloads++;res.writeHead(200,{"Content-Type":"application/gzip"});fs.createReadStream(archive).pipe(res);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
env.CLAPPER_RUNTIME_URL=`http://127.0.0.1:${server.address().port}/runtime.tar.gz`;
function run(args,{cwd=root,expected=0,customEnv=env,command=binary}={}){
  console.log(`$ clapper ${args.join(" ")}`);
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env:customEnv,stdio:["ignore","pipe","pipe"]});let output="";
    const timer=setTimeout(()=>{child.kill("SIGTERM");reject(new Error(`Timed out: ${args.join(" ")}`));},180000);
    child.stdout.on("data",b=>{output+=b});child.stderr.on("data",b=>{output+=b});
    child.on("error",e=>{clearTimeout(timer);reject(e)});
    child.on("close",code=>{clearTimeout(timer);if(code!==expected)reject(new Error(`Exit ${code}, expected ${expected}\n${output}`));else resolve(output)});
  });
}
let preview;
try {
  assert.equal((await run(["--version"])).trim(),manifest.version);
  assert.equal(downloads,0,"version should not install anything");
  // Two processes request an empty cache simultaneously: only one installs.
  const [runtime,other]=await Promise.all([run(["runtime","path"]),run(["runtime","path"])]);
  const runtimeDir=runtime.trim().split("\n").at(-1);
  assert.ok(other.includes(runtimeDir));assert.equal(downloads,1);
  await new Promise(resolve=>server.close(resolve));
  env.CLAPPER_RUNTIME_URL="http://127.0.0.1:1/offline";
  await run(["new",project]);
  const lock=fs.readFileSync(path.join(project,"package-lock.json"),"utf8");
  assert.ok(!lock.includes(repo),"project lock must not reference checkout");
  assert.ok((await run(["doctor"],{cwd:project})).includes("all good"));
  const comps=JSON.parse(await run(["compositions","--json"],{cwd:project}));assert.ok(comps.some(c=>c.id==="spot"));
  await Promise.all([run(["still","--frame","0,30","-o","out/a"],{cwd:project}),run(["still","--frame","60,90","-o","out/b"],{cwd:project})]);
  await run(["render","--draft","-o","out/final.mp4"],{cwd:project});
  await run(["review","--video","out/final.mp4","-o","out/review"],{cwd:project});
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project,"out/review/lint.json"),"utf8")),[]);
  const audio=await run(["-hide_banner","-i",path.join(project,"out/final.mp4"),"-vn","-af","astats","-f","null","-"],{command:path.join(runtimeDir,"bin/ffmpeg")});
  assert.match(audio,/Audio: aac/);assert.match(audio,/48000 Hz, stereo/);assert.doesNotMatch(audio,/RMS level dB: -inf/);
  // Add a real npm library, then restore from the resulting lockfile offline.
  await run(["add","clsx@2.1.1"],{cwd:project,customEnv:{...env,npm_config_offline:"false"}});
  assert.equal(JSON.parse(fs.readFileSync(path.join(project,"package.json"),"utf8")).dependencies.clsx,"2.1.1");
  const entry=path.join(project,"src/index.tsx");
  fs.writeFileSync(entry,'import clsx from "clsx";\n'+fs.readFileSync(entry,"utf8").replaceAll('className="spot"','className={clsx("spot")}'));
  await run(["install"],{cwd:project});
  await run(["new",project],{expected:1});
  // Recreate on a different path from only committed project files.
  const moved=path.join(root,"moved film");fs.mkdirSync(moved);
  for(const name of ["src","package.json","package-lock.json","clapper.json","tsconfig.json",".npmrc"])fs.cpSync(path.join(project,name),path.join(moved,name),{recursive:true});
  await run(["install"],{cwd:moved});await run(["still","--frame","30"],{cwd:path.join(moved,"src")});
  const config=JSON.parse(fs.readFileSync(path.join(moved,"clapper.json"),"utf8"));
  fs.writeFileSync(path.join(moved,"clapper.json"),JSON.stringify({...config,runtime:"999.0.0"}));
  assert.match(await run(["render"],{cwd:moved,expected:1}),/project pins/);
  const comic=path.join(root,"comic");await run(["new",comic,"--template","comic"]);
  await run([path.join(comic,"node_modules/typescript/bin/tsc"),"--noEmit"],{cwd:comic,command:path.join(runtimeDir,"node/bin/node")});
  await run(["still","--scene","work","--frame","30","-o","out/work.png"],{cwd:comic});
  preview=spawn(binary,["preview","--port","0"],{cwd:project,env,stdio:["ignore","pipe","pipe"]});
  let previewOutput="";
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Preview failed to start: ${previewOutput}`)),30000);
    const read=b=>{previewOutput+=b;const m=previewOutput.match(/clapper studio → (http:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1])}};
    preview.stdout.on("data",read);preview.stderr.on("data",read);preview.on("error",reject);preview.on("exit",code=>{clearTimeout(timer);reject(new Error(`Preview exited ${code}: ${previewOutput}`))});
  });
  assert.equal((await fetch(url)).status,200);
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(runtimeDir,"browsers");
  const { chromium }=await import(pathToFileURL(path.join(runtimeDir,"packages/cli/node_modules/playwright/index.mjs")).href);
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
    await page.goto(`${url}?frame=30`);
    await page.getByText("spot",{exact:true}).first().waitFor();
    await page.locator('.stage .spot').first().waitFor();
    await page.locator('.stage').getByText("Ship the thing.",{exact:true}).waitFor();
    await page.screenshot({path:path.join(root,"preview.png")});
    assert.deepEqual(errors,[],"preview should mount without React errors");
  } finally { await browser.close(); }
  console.log(`\nPASS: clean install, offline reuse, projects, add/install, relocation, parallel stills, audio render, review and preview.\nEvidence: ${root}`);
} finally {
  preview?.kill("SIGTERM");server.close();
  // Retain bounded test artifacts for inspection; never touch user projects.
  console.log(`Standalone test artifacts: ${root}`);
}
