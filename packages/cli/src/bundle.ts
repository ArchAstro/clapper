import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { build, createServer, preview, searchForWorkspaceRoot, type InlineConfig, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);

export type HarnessMode = "harness" | "studio";

export interface BundleTarget {
  /** Absolute path to the user's entry file (calls registerRoot). */
  entry: string;
  /** Project root: where public/ lives and where .clapper/ is written. */
  projectDir: string;
  mode: HarnessMode;
}

function corePackageDir(): string {
  return path.dirname(require.resolve("@clapper/core/package.json"));
}

/** Writes .clapper/<mode>/{index.html,entry.tsx} and returns that directory. */
export function writeHarnessDir({ entry, projectDir, mode }: BundleTarget): string {
  const dir = path.join(projectDir, ".clapper", mode);
  fs.mkdirSync(dir, { recursive: true });
  let rel = path.relative(dir, entry).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  const mount = mode === "harness" ? `import { mountHarness } from "@clapper/core/harness";\nmountHarness();` : `import { mountStudio } from "@clapper/core/player";\nmountStudio();`;
  fs.writeFileSync(path.join(dir, "entry.tsx"), `import ${JSON.stringify(rel)};\n${mount}\n`);
  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html>\n<html><head><meta charset="utf-8"><title>clapper ${mode}</title>\n<style>html,body{margin:0;padding:0}${mode === "harness" ? "html,body{background:transparent;overflow:hidden}" : ""}</style>\n</head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>\n`,
  );
  return dir;
}

/** Projects that do not depend on React themselves get the copy @clapper/core was built against. */
function reactAliases(projectDir: string): { find: RegExp; replacement: string }[] {
  try {
    createRequire(path.join(projectDir, "package.json")).resolve("react");
    return [];
  } catch {
    const coreReq = createRequire(path.join(corePackageDir(), "package.json"));
    const out: { find: RegExp; replacement: string }[] = [];
    for (const name of ["react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client", "react-dom", "react"]) {
      try {
        out.push({ find: new RegExp(`^${name.replace("/", "\\/")}$`), replacement: coreReq.resolve(name) });
      } catch {
        /* not installed alongside core either; let Vite report it */
      }
    }
    return out;
  }
}

function baseConfig(t: BundleTarget, dir: string): InlineConfig {
  const workspaceRoot = searchForWorkspaceRoot(t.projectDir);
  return {
    root: dir,
    publicDir: path.join(t.projectDir, "public"),
    configFile: false,
    envFile: false,
    logLevel: "warn",
    cacheDir: path.join(t.projectDir, "node_modules", ".vite-clapper"),
    plugins: [react()],
    resolve: { dedupe: ["react", "react-dom", "react/jsx-runtime", "@clapper/core"], alias: reactAliases(t.projectDir) },
    server: { fs: { allow: [workspaceRoot, t.projectDir, corePackageDir(), dir] } },
    optimizeDeps: { include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"] },
    define: { "process.env.NODE_ENV": JSON.stringify(t.mode === "harness" ? "production" : "development") },
  };
}

/** Production-build the render harness. Returns the outDir. */
export async function buildHarness(t: BundleTarget): Promise<string> {
  const dir = writeHarnessDir(t);
  const outDir = path.join(t.projectDir, ".clapper", `${t.mode}-build`);
  await build({
    ...baseConfig(t, dir),
    base: "./",
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      target: "esnext",
      assetsInlineLimit: 0,
      rollupOptions: { input: path.join(dir, "index.html") },
    },
  });
  return outDir;
}

/** Serve a built harness directory. */
export async function serveBuilt(t: BundleTarget, outDir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const dir = path.join(t.projectDir, ".clapper", t.mode);
  const server: PreviewServer = await preview({
    ...baseConfig(t, dir),
    build: { outDir },
    preview: { port: 0, host: "127.0.0.1", strictPort: false, open: false },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("vite preview did not report a URL");
  return { url, close: () => server.close() };
}

/** Start the studio dev server. */
export async function startStudio(t: BundleTarget, opts: { port?: number; open?: boolean } = {}): Promise<{ url: string; server: ViteDevServer }> {
  const dir = writeHarnessDir({ ...t, mode: "studio" });
  const cfg = baseConfig({ ...t, mode: "studio" }, dir);
  const server = await createServer({
    ...cfg,
    server: { ...cfg.server, port: opts.port ?? 4321, host: "127.0.0.1", open: opts.open ?? false },
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${opts.port ?? 4321}/`;
  return { url, server };
}
