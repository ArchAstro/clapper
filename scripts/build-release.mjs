#!/usr/bin/env node
// Native-host release build. Requires Node 24+, pnpm and Go on the BUILD machine only.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.env.CLAPPER_RELEASE_VERSION ?? "0.3.0-dev.1";
const platform = `${process.platform}-${process.arch}`;
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error("Invalid CLAPPER_RELEASE_VERSION");
if (!["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"].includes(platform)) throw new Error(`Unsupported build host: ${platform}`);
const nodeVersion = "v24.21.0";
const dist = path.join(repo,"dist");
fs.mkdirSync(dist,{recursive:true});
const stage = fs.mkdtempSync(path.join(os.tmpdir(),"clapper-release-"));
const root = path.join(stage,"runtime");
fs.mkdirSync(root);
const run = (cmd,args,opts={}) => {
  const r = spawnSync(cmd,args,{cwd:repo,stdio:"inherit",...opts});
  if(r.error) throw r.error;
  if(r.status!==0) throw new Error(`${cmd} failed (${r.status})`);
};
const copy = (from,to) => { fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true,verbatimSymlinks:true}); };
const sha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

try {
  console.log(`Building Clapper ${version} for ${platform}`);
  // Honor the existing lockfile; the archive includes dependency license files.
  run("pnpm",["install","--frozen-lockfile"]);
  run("pnpm",["--dir","packages/music","build"]);
  run(process.execPath,["scripts/build-sfizz.mjs"]);
  for(const pkg of ["core","cli","music"]){
    for(const name of ["src","bin","dist","assets","package.json","node_modules"]){
      const source=path.join(repo,"packages",pkg,name);
      if(fs.existsSync(source)) copy(source,path.join(root,"packages",pkg,name));
    }
    const metadataFile=path.join(root,"packages",pkg,"package.json");
    const metadata=JSON.parse(fs.readFileSync(metadataFile,"utf8"));
    for(const [name,spec] of Object.entries(metadata.dependencies??{})){
      if(String(spec).startsWith("workspace:")){
        const sibling=JSON.parse(fs.readFileSync(path.join(repo,"packages",name.split("/").at(-1),"package.json"),"utf8"));
        metadata.dependencies[name]=sibling.version;
      }
    }
    fs.writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+"\n");
  }
  copy(path.join(repo,"node_modules"),path.join(root,"node_modules"));
  copy(path.join(repo,"package.json"),path.join(root,"package.json"));
  copy(path.join(repo,"pnpm-lock.yaml"),path.join(root,"pnpm-lock.yaml"));
  // Stable top-level links for generated projects (no global npm publication).
  const coreRequire=createRequire(path.join(repo,"packages/core/package.json"));
  const rootRequire=createRequire(path.join(repo,"package.json"));
  const projectDependencies = { "@clapper/core": "packages/core" };
  function collectProjectDependency(pkg, req) {
    if (projectDependencies[pkg]) return;
    const source = path.dirname(req.resolve(`${pkg}/package.json`));
    projectDependencies[pkg] = path.relative(repo, source).split(path.sep).join("/");
    const packageJSON = JSON.parse(fs.readFileSync(path.join(source,"package.json"),"utf8"));
    const childRequire = createRequire(path.join(source,"package.json"));
    for (const child of Object.keys(packageJSON.dependencies ?? {})) collectProjectDependency(child, childRequire);
  }
  for (const pkg of Object.keys(JSON.parse(fs.readFileSync(path.join(repo,"packages/core/package.json"),"utf8")).dependencies)) collectProjectDependency(pkg, coreRequire);
  for(const pkg of ["react","react-dom","@types/react","@types/react-dom","typescript"]){
    const req=pkg==="typescript"?rootRequire:coreRequire;
    collectProjectDependency(pkg,req);
    const source=path.dirname(req.resolve(`${pkg}/package.json`));
    const staged=path.join(root,path.relative(repo,source));
    const dest=path.join(root,"node_modules",pkg);
    if(!fs.existsSync(dest)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.symlinkSync(path.relative(path.dirname(dest),staged),dest);}
  }
  copy(path.join(repo,"videos/_template/src"),path.join(root,"templates/basic/src"));
  copy(path.join(repo,"templates/comic/src"),path.join(root,"templates/comic/src"));
  copy(path.join(repo,"skills/clapper"),path.join(root,"skill"));

  console.log(`Downloading verified Node ${nodeVersion} (includes npm)…`);
  const nodeArchive=`node-${nodeVersion}-${platform}.tar.gz`;
  const nodeBase=`https://nodejs.org/dist/${nodeVersion}/`;
  const sumsResp=await fetch(nodeBase+"SHASUMS256.txt");if(!sumsResp.ok)throw new Error(`Node checksums: ${sumsResp.status}`);
  const line=(await sumsResp.text()).split("\n").find(l=>l.endsWith(`  ${nodeArchive}`));
  if(!line)throw new Error(`No Node checksum for ${nodeArchive}`);
  const downloads=path.join(dist,".downloads");fs.mkdirSync(downloads,{recursive:true});
  const nodeFile=path.join(downloads,nodeArchive);
  if(!fs.existsSync(nodeFile)||sha(nodeFile)!==line.split(/\s+/)[0]){
    const response=await fetch(nodeBase+nodeArchive);if(!response.ok)throw new Error(`Node download: ${response.status}`);
    fs.writeFileSync(nodeFile,Buffer.from(await response.arrayBuffer()));
  }
  if(sha(nodeFile)!==line.split(/\s+/)[0])throw new Error("Node checksum mismatch");
  run("tar",["-xzf",nodeFile,"-C",stage]);
  fs.renameSync(path.join(stage,`node-${nodeVersion}-${platform}`),path.join(root,"node"));

  const cliRequire=createRequire(path.join(repo,"packages/cli/package.json"));
  const ffmpeg=cliRequire("ffmpeg-static");
  if(!ffmpeg||!fs.existsSync(ffmpeg))throw new Error("ffmpeg-static binary missing");
  copy(ffmpeg,path.join(root,"bin/ffmpeg"));
  copy(path.join(repo,".clapper/toolchain/build/library/bin/sfizz_render"),path.join(root,"bin/sfizz_render"));
  copy(path.join(repo,".clapper/toolchain/sfizz-source.tar.gz"),path.join(root,"licenses/sfizz-1.2.3-source.tar.gz"));
  copy(path.join(repo,".clapper/toolchain/sfizz-build.json"),path.join(root,"licenses/sfizz-build.json"));
  // Full Chromium also satisfies doctor; all browser binaries are version-matched.
  const browserCache=path.join(dist,".browsers");
  run(path.join(root,"node/bin/node"),[path.join(path.dirname(cliRequire.resolve("playwright/package.json")),"cli.js"),"install","chromium"],{env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:browserCache}});
  copy(browserCache,path.join(root,"browsers"));
  fs.writeFileSync(path.join(root,"runtime.json"),JSON.stringify({version,platform,node:nodeVersion,projectDependencies},null,2)+"\n");
  fs.writeFileSync(path.join(root,"NOTICE.txt"),"Clapper runtime includes Node.js/npm, Chromium/Playwright, ffmpeg-static, React, Vite, and their dependencies. License files are retained alongside each package and browser. ffmpeg-static builds include GPL components (libx264); consult its COPYING/license and upstream build/source instructions before redistributing.\n");
  // No link in the archive may retain a dependency on the build checkout.
  function checkLinks(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isSymbolicLink()){
      const target=fs.readlinkSync(p);const rel=path.relative(root,path.resolve(path.dirname(p),target));
      if(path.isAbsolute(target)||rel===".."||rel.startsWith(`..${path.sep}`))throw new Error(`Nonportable runtime link: ${p} → ${target}`);
    } else if(e.isDirectory())checkLinks(p);
  }}
  checkLinks(root);
  const archiveName=`clapper-runtime-${version}-${platform}.tar.gz`;
  const archive=path.join(dist,archiveName);
  run("tar",["-czf",archive,"-C",root,"."],{env:{...process.env,COPYFILE_DISABLE:"1"}});
  const digest=sha(archive);
  const url=process.env.CLAPPER_RELEASE_BASE_URL ? `${process.env.CLAPPER_RELEASE_BASE_URL.replace(/\/$/,"")}/${archiveName}` : `https://github.com/ArchAstro/clapper/releases/download/v${version}/${archiveName}`;
  const binary=path.join(dist,`clapper-${platform}`);
  run("go",["build","-trimpath","-ldflags",`-s -w -X main.version=${version} -X main.runtimeSHA=${digest} -X main.runtimeURL=${url}`,"-o",binary,"."],{cwd:path.join(repo,"launcher"),env:{...process.env,CGO_ENABLED:"0"}});
  if(process.platform==="darwin")run("codesign",["--force","--sign","-",binary]);
  fs.writeFileSync(path.join(dist,`manifest-${platform}.json`),JSON.stringify({version,platform,runtime:{file:archiveName,sha256:digest,url},launcher:{file:path.basename(binary),sha256:sha(binary)}},null,2)+"\n");
  console.log(`\nBuilt ${binary}\nRuntime ${archive} (${(fs.statSync(archive).size/1024/1024).toFixed(1)} MiB)\nLocal install: CLAPPER_RUNTIME_URL=file://${archive} ${binary} runtime path`);
} finally { fs.rmSync(stage,{recursive:true,force:true}); }
