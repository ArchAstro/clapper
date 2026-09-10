import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export interface Instrument { id:string;name:string;family:string;license:string;range:[number,number];keyswitch:boolean;sfz:string;sha1:string;bytes:number;assets:{path:string;sha1:string;bytes:number}[] }
export interface Catalog {schema:number;pack:string;version:string;baseURL:string;source:string;license:{id:string;path:string;sha1:string};instruments:Instrument[]}
export const catalog=JSON.parse(fs.readFileSync(fileURLToPath(new URL("../assets/instruments.json",import.meta.url)),"utf8")) as Catalog;
export const instrumentsRoot=()=>path.resolve(process.env.CLAPPER_INSTRUMENTS??path.join(os.homedir(),".cache/clapper/instruments"));
export const packRoot=()=>path.join(instrumentsRoot(),catalog.pack,catalog.version);
export function instrument(id:string):Instrument{const p=catalog.instruments.find(i=>i.id===id);if(!p)throw new Error(`Unknown instrument ${id}. Run clapper instruments list --json.`);return p;}
export function blobHash(data:Buffer):string{return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");}
function assetPath(name:string){const p=path.resolve(packRoot(),name);if(!p.startsWith(packRoot()+path.sep))throw new Error("Instrument asset escapes pack");return p;}
async function fetchAsset(name:string,expected:string){
  const dest=assetPath(name);
  if(fs.existsSync(dest)&&blobHash(fs.readFileSync(dest))===expected)return;
  const url=catalog.baseURL+name.split("/").map(encodeURIComponent).join("/");
  const res=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!res.ok)throw new Error(`Instrument download failed (${res.status}): ${name}`);
  const data=Buffer.from(await res.arrayBuffer());if(blobHash(data)!==expected)throw new Error(`Instrument checksum mismatch: ${name}`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});const tmp=dest+`.${randomUUID()}.tmp`;
  try{fs.writeFileSync(tmp,data);fs.renameSync(tmp,dest);}finally{fs.rmSync(tmp,{force:true});}
}
export async function installInstrument(id:string,log=(s:string)=>console.error(s)):Promise<string>{
  const p=instrument(id);log(`Instrument ${id}: ${p.assets.length} samples, ${(p.bytes/1024/1024).toFixed(1)} MiB, ${p.license}`);
  const assets=[{path:p.sfz,sha1:p.sha1},catalog.license,...p.assets];let next=0;
  await Promise.all(Array.from({length:Math.min(6,assets.length)},async()=>{while(next<assets.length){const a=assets[next++];await fetchAsset(a.path,a.sha1);}}));
  return assetPath(p.sfz);
}
