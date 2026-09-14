import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const voiceCatalog = JSON.parse(
  fs.readFileSync(new URL("../assets/voices.json", import.meta.url), "utf8"),
) as {
  id: string;
  version: string;
  revision: string;
  source: string;
  license: string;
  assets: { path: string; bytes: number; hash: string; algorithm: string }[];
  voices: { id: string; language: string; sha256: string }[];
};
export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const runtimeLock = fs.readFileSync(new URL("../assets/narration-runtime-lock.json", import.meta.url));
export const engineIdentity = {
  model: voiceCatalog.id,
  revision: voiceCatalog.revision,
  runtime: sha256(runtimeLock),
  renderer: 1,
};
export const voicesRoot = () =>
  path.resolve(process.env.CLAPPER_VOICES ?? path.join(os.homedir(), ".cache/clapper/voices"));
export const voiceRuntime = () => path.join(voicesRoot(), `runtime-${engineIdentity.runtime.slice(0, 16)}`);
export const modelRoot = () => path.join(voicesRoot(), voiceCatalog.revision);
export function voice(id: string) {
  const value = voiceCatalog.voices.find((v) => v.id === id);
  if (!value) throw new Error(`Unknown voice ${id}. Run clapper voices list.`);
  return value;
}
function hashAsset(bytes: Buffer, algorithm: string) {
  return algorithm === "sha256"
    ? sha256(bytes)
    : createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}
export function runProcess(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(command)} failed (${code ?? signal})`)),
    );
  });
}
export async function installVoices() {
  fs.mkdirSync(voicesRoot(), { recursive: true });
  const runtime = voiceRuntime();
  if (!fs.existsSync(path.join(runtime, "ready.json"))) {
    const temp = fs.mkdtempSync(path.join(voicesRoot(), ".install-"));
    try {
      fs.writeFileSync(
        path.join(temp, "package.json"),
        JSON.stringify({
          name: "clapper-narration-runtime",
          private: true,
          dependencies: { "kokoro-js": voiceCatalog.version },
        }),
      );
      fs.writeFileSync(path.join(temp, "package-lock.json"), runtimeLock);
      console.error("Installing optional local narration runtime (hundreds of MB)…");
      const npm = process.env.CLAPPER_RUNTIME
        ? path.join(process.env.CLAPPER_RUNTIME, "node/lib/node_modules/npm/bin/npm-cli.js")
        : undefined;
      const args = ["ci", "--ignore-scripts", "--no-audit", "--no-fund"];
      await runProcess(npm ? process.execPath : "npm", npm ? [npm, ...args] : args, temp);
      fs.writeFileSync(path.join(temp, "ready.json"), JSON.stringify(engineIdentity));
      if (!fs.existsSync(runtime)) fs.renameSync(temp, runtime);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
  for (const asset of voiceCatalog.assets) {
    const dest = path.join(modelRoot(), asset.path);
    if (fs.existsSync(dest) && hashAsset(fs.readFileSync(dest), asset.algorithm) === asset.hash) continue;
    console.error(`Downloading ${asset.path} (${(asset.bytes / 1048576).toFixed(1)} MiB)…`);
    const response = await fetch(`${voiceCatalog.source}/resolve/${voiceCatalog.revision}/${asset.path}`, {
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok) throw new Error(`Model download failed: ${response.status} ${asset.path}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== asset.bytes || hashAsset(bytes, asset.algorithm) !== asset.hash)
      throw new Error(`Model checksum mismatch: ${asset.path}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const temp = `${dest}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, bytes);
      fs.renameSync(temp, dest);
    } finally {
      fs.rmSync(temp, { force: true });
    }
  }
  verifyVoices();
  console.error(`Local narration ready: ${voiceCatalog.id} (${voiceCatalog.license})`);
}
export function verifyVoices() {
  const fix = "Run clapper voices install.";
  if (!fs.existsSync(path.join(voiceRuntime(), "ready.json")))
    throw new Error(`Local narration runtime missing. ${fix}`);
  for (const asset of voiceCatalog.assets) {
    const file = path.join(modelRoot(), asset.path);
    if (!fs.existsSync(file) || hashAsset(fs.readFileSync(file), asset.algorithm) !== asset.hash)
      throw new Error(`Local narration model missing or corrupt: ${asset.path}. ${fix}`);
  }
  for (const v of voiceCatalog.voices) {
    const file = path.join(voiceRuntime(), "node_modules/kokoro-js/voices", `${v.id}.bin`);
    if (!fs.existsSync(file) || sha256(fs.readFileSync(file)) !== v.sha256)
      throw new Error(
        `Voice embedding missing or corrupt: ${v.id}. Remove ${voiceRuntime()} and run clapper voices install.`,
      );
  }
}
export const narrationWorker = fileURLToPath(new URL("./narration-worker.mjs", import.meta.url));
