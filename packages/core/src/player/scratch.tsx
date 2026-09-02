import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as AV from "../index";
import { registerComposition } from "../composition";

const STORAGE_KEY = "clapper.scratch";

export const SCRATCH_ID = "scratch";

const STARTER = `import { AbsoluteFill, Eyebrow, Reveal, Rule, Pluck, Thump, useProgress } from "@clapper/core";

// Edit, then ⌘/Ctrl + Enter. Exports: Scratch (the component) and meta.
export const meta = { width: 1920, height: 1080, fps: 30, durationInFrames: 120 };

export function Scratch() {
  const p = useProgress("0.2s", "0.8s");
  return (
    <AbsoluteFill style={{ background: "#1e2326", color: "#d3c6aa", padding: 120, fontFamily: "system-ui" }}>
      <Eyebrow color="#a7c080">scratch</Eyebrow>
      <Reveal at="0.2s" as="h1" style={{ fontSize: 120, margin: "24px 0 0", fontWeight: 600 }}>
        Hello, timeline.
      </Reveal>
      <Rule at="0.6s" color="#a7c080" length={320} style={{ marginTop: 32, opacity: p }} />
      <Thump at={0} volume={0.4} />
      <Pluck note="C5" at="0.3s" />
    </AbsoluteFill>
  );
}
`;

type Babel = { transform: (code: string, opts: Record<string, unknown>) => { code: string | null } };
let babelPromise: Promise<Babel> | null = null;
function loadBabel(): Promise<Babel> {
  if (!babelPromise) babelPromise = import("@babel/standalone").then((m) => (m as unknown as { default?: Babel }).default ?? (m as unknown as Babel));
  return babelPromise;
}

/** Compile a TSX module in the browser and register its `Scratch` export as the "scratch" composition. */
export async function compileScratch(source: string): Promise<{ id: string }> {
  const Babel = await loadBabel();
  const out = Babel.transform(source, {
    filename: "scratch.tsx",
    sourceType: "module",
    presets: [["react", { runtime: "classic" }], ["typescript", { isTSX: true, allExtensions: true }]],
    plugins: ["transform-modules-commonjs"],
  });
  if (!out.code) throw new Error("Babel produced no output");
  const exportsObj: Record<string, unknown> = {};
  const moduleObj = { exports: exportsObj };
  const require = (name: string) => {
    if (name === "@clapper/core") return AV;
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment };
    throw new Error(`scratch can only import "@clapper/core" and "react" (tried "${name}")`);
  };
  const fn = new Function("require", "exports", "module", "React", out.code);
  fn(require, exportsObj, moduleObj, React);
  const mod = moduleObj.exports as { Scratch?: React.ComponentType; default?: React.ComponentType; meta?: Partial<{ width: number; height: number; fps: number; durationInFrames: number }> };
  const Comp = mod.Scratch ?? mod.default;
  if (!Comp) throw new Error("export a component named Scratch (or a default export)");
  const meta = { width: 1920, height: 1080, fps: 30, durationInFrames: 120, ...(mod.meta ?? {}) };
  registerComposition({ id: SCRATCH_ID, component: Comp as React.ComponentType<Record<string, unknown>>, ...meta });
  return { id: SCRATCH_ID };
}

/** "scratch" tab: a TSX editor compiled live with Babel; the result shows up as a composition. */
export function Scratch({ onCompiled }: { onCompiled: (id: string) => void }) {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? STARTER;
    } catch {
      return STARTER;
    }
  });
  const [status, setStatus] = useState<{ ok: boolean; text: string }>({ ok: true, text: "⌘/Ctrl + Enter to compile. The result appears as the “scratch” composition." });
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* private mode */
    }
  }, [code]);

  const run = useCallback(async () => {
    setBusy(true);
    const t0 = performance.now();
    try {
      const { id } = await compileScratch(code);
      setStatus({ ok: true, text: `compiled in ${(performance.now() - t0).toFixed(0)} ms → composition “${id}”` });
      onCompiled(id);
    } catch (e) {
      setStatus({ ok: false, text: String((e as Error).message ?? e) });
    } finally {
      setBusy(false);
    }
  }, [code, onCompiled]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void run();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const v = `${code.slice(0, s)}  ${code.slice(el.selectionEnd)}`;
      setCode(v);
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="scratch">
      <div className="row" style={{ margin: 0 }}>
        <button className="btn on" disabled={busy} onClick={() => void run()}>
          {busy ? "compiling…" : "run  ⌘↵"}
        </button>
        <button className="btn" onClick={() => setCode(STARTER)}>reset</button>
        <span className="hint">imports: @clapper/core, react</span>
      </div>
      <textarea ref={ref} value={code} spellCheck={false} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey} />
      <div className={`status ${status.ok ? "" : "bad"}`}>{status.text}</div>
    </div>
  );
}
