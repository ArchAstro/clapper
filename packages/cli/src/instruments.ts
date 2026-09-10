import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Instrument {
  id: string;
  name: string;
  family: string;
  license: string;
  range: [number, number];
  keys?: number[];
  keyswitch: boolean;
  sfz: string;
  sfzText?: string;
  sha1: string;
  bytes: number;
  assets: { path: string; sha1: string; bytes: number }[];
  pack?: string;
  version?: string;
  baseURL?: string;
  source?: string;
  licenseFile?: { path: string; sha1: string };
}
export interface Catalog {
  schema: number;
  pack: string;
  version: string;
  baseURL: string;
  source: string;
  license: { id: string; path: string; sha1: string };
  instruments: Instrument[];
}
export const catalog = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL("../assets/instruments.json", import.meta.url)), "utf8"),
) as Catalog;
catalog.instruments.push(
  ...JSON.parse(
    fs.readFileSync(fileURLToPath(new URL("../assets/rock-instruments.json", import.meta.url)), "utf8"),
  ).instruments,
);
export const instrumentsRoot = () =>
  path.resolve(process.env.CLAPPER_INSTRUMENTS ?? path.join(os.homedir(), ".cache/clapper/instruments"));
export const packRoot = (p?: Instrument) =>
  path.join(instrumentsRoot(), p?.pack ?? catalog.pack, p?.version ?? catalog.version);
export const instrumentProvenance = (p: Instrument) => ({
  pack: p.pack ?? catalog.pack,
  version: p.version ?? catalog.version,
  source: p.source ?? catalog.source,
  license: p.license,
  patch: p.sha1,
});
export function instrument(id: string): Instrument {
  const p = catalog.instruments.find((i) => i.id === id);
  if (!p) throw new Error(`Unknown instrument ${id}. Run clapper instruments list --json.`);
  return p;
}
export function blobHash(data: Buffer): string {
  return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
}
function assetPath(name: string, instrument: Instrument) {
  const root = packRoot(instrument),
    p = path.resolve(root, name);
  if (!p.startsWith(root + path.sep)) throw new Error("Instrument asset escapes pack");
  return p;
}
async function fetchAsset(name: string, expected: string, instrument: Instrument) {
  const dest = assetPath(name, instrument);
  if (fs.existsSync(dest) && blobHash(fs.readFileSync(dest)) === expected) return;
  const url = (instrument.baseURL ?? catalog.baseURL) + name.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`Instrument download failed (${res.status}): ${name}`);
  const data = Buffer.from(await res.arrayBuffer());
  if (blobHash(data) !== expected) throw new Error(`Instrument checksum mismatch: ${name}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + `.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, dest);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
export async function installInstrument(id: string, log = (s: string) => console.error(s)): Promise<string> {
  const p = instrument(id);
  log(`Instrument ${id}: ${p.assets.length} assets, ${(p.bytes / 1024 / 1024).toFixed(1)} MiB, ${p.license}`);
  const assets = [
    ...(p.sfzText ? [] : [{ path: p.sfz, sha1: p.sha1 }]),
    p.licenseFile ?? catalog.license,
    ...p.assets,
  ];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(6, assets.length) }, async () => {
      while (next < assets.length) {
        const a = assets[next++];
        await fetchAsset(a.path, a.sha1, p);
      }
    }),
  );
  const sfz = assetPath(p.sfz, p);
  if (p.sfzText) {
    const bytes = Buffer.from(p.sfzText);
    if (blobHash(bytes) !== p.sha1) throw new Error("Generated patch checksum mismatch");
    fs.mkdirSync(path.dirname(sfz), { recursive: true });
    const tmp = sfz + `.${randomUUID()}.tmp`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, sfz);
  }
  return sfz;
}
