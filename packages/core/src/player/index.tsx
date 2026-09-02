/**
 * The studio: a browser UI to scrub, play and inspect compositions.
 * Mounted by `agenticvids preview`.
 */
import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ensureRootMounted, getComposition, listCompositions } from "../composition";
import { collectAudioCues } from "../audio";
import { getRegistry, subscribeRegistry, type CompositionMeta, type TrackInfo } from "../registry";
import { TimelineProvider } from "../timeline";
import { AudioEngine } from "./audio-engine";

const css = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#111;color:#e8e6df;font:13px/1.4 -apple-system,system-ui,sans-serif;overflow:hidden}
.studio{display:grid;grid-template-columns:220px 1fr;grid-template-rows:1fr auto;height:100vh}
.side{grid-row:1/3;border-right:1px solid #262626;background:#151515;padding:12px;overflow:auto}
.side h1{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8776;margin:4px 0 12px}
.comp{display:block;width:100%;text-align:left;background:none;border:1px solid transparent;color:#e8e6df;padding:8px 10px;border-radius:8px;cursor:pointer;font:inherit}
.comp:hover{background:#1f1f1f}.comp.active{background:#23302a;border-color:#2e5c46}
.comp small{display:block;color:#8a8776;font-size:11px;margin-top:2px}
.stage{position:relative;display:flex;align-items:center;justify-content:center;background:#0b0b0b;overflow:hidden;
 background-image:linear-gradient(45deg,#141414 25%,transparent 25%),linear-gradient(-45deg,#141414 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#141414 75%),linear-gradient(-45deg,transparent 75%,#141414 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
.canvas{position:absolute;transform-origin:0 0;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden;background:#000}
.bottom{border-top:1px solid #262626;background:#151515;padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px}
.controls{display:flex;align-items:center;gap:8px}
.btn{background:#222;border:1px solid #333;color:#e8e6df;border-radius:6px;padding:5px 10px;font:inherit;cursor:pointer;min-width:34px}
.btn:hover{background:#2a2a2a}.btn.on{background:#2e5c46;border-color:#3e8763}
.time{font-variant-numeric:tabular-nums;color:#c9c5b6;margin-left:6px}
.spacer{flex:1}
.kbd{color:#6f6c60;font-size:11px}
.scrub{position:relative;height:18px;background:#1c1c1c;border-radius:4px;cursor:pointer;user-select:none}
.scrub .fill{position:absolute;left:0;top:0;bottom:0;background:#2b3d33;border-radius:4px}
.scrub .head{position:absolute;top:-4px;bottom:-4px;width:2px;background:#7fb894;transform:translateX(-1px)}
.scrub .tick{position:absolute;top:0;bottom:0;width:1px;background:#2b2b2b}
.scrub .marker{position:absolute;top:0;bottom:0;border-left:1px solid #7fb894;overflow:hidden;pointer-events:none}
.scrub .marker span{font-size:10px;color:#9fd3b3;padding-left:4px;line-height:18px;white-space:nowrap;opacity:.85}
.tracks{position:relative;max-height:150px;overflow:auto;display:flex;flex-direction:column;gap:3px}
.track{position:relative;height:16px}
.track .bar{position:absolute;top:0;height:16px;border-radius:3px;background:#2a3a47;border:1px solid #3a5266;color:#cfe3f2;font-size:10px;line-height:14px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.track .bar.audio{background:#4a3a24;border-color:#6d5532;color:#f2dfc0}
.track .bar.tone{background:#3f3357;border-color:#5b4b7a;color:#e3d7f7}
.track .bar.bus{background:#5a3d2b;color:#e3d7f7}
.playhead{position:absolute;top:0;bottom:0;width:1px;background:#7fb894;pointer-events:none;opacity:.8}
.err{position:absolute;left:12px;top:12px;background:#4a1d1d;color:#ffd7d7;padding:8px 10px;border-radius:6px;max-width:60%;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:11px}
.empty{color:#8a8776;text-align:center;padding:40px}
`;

function useRegistryVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeRegistry(() => setV((x) => x + 1)), []);
  return v;
}

function readUrlState(): { comp?: string; frame?: number } {
  const p = new URLSearchParams(location.search);
  const f = p.get("frame");
  return { comp: p.get("composition") ?? undefined, frame: f ? parseInt(f, 10) : undefined };
}

function writeUrlState(comp: string, frame: number) {
  const p = new URLSearchParams(location.search);
  p.set("composition", comp);
  p.set("frame", String(frame));
  history.replaceState(null, "", `?${p}`);
}

function Studio() {
  const version = useRegistryVersion();
  const comps = useMemo(() => listCompositions(), [version]);
  const [selected, setSelected] = useState<string | undefined>(() => readUrlState().comp);
  const comp = (selected && getComposition(selected)) || (comps[0] && getComposition(comps[0].id)) || null;
  const [frame, setFrame] = useState(() => readUrlState().frame ?? 0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engine = useMemo(() => new AudioEngine(), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    if (comp) writeUrlState(comp.id, frame);
  }, [comp, frame]);

  // Fit canvas to the stage.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !comp) return;
    const ro = new ResizeObserver(() => {
      const pad = 40;
      const s = Math.min((el.clientWidth - pad) / comp.width, (el.clientHeight - pad) / comp.height);
      setScale(Math.max(0.05, s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [comp]);

  // Playback loop.
  useEffect(() => {
    if (!playing || !comp) return;
    engine.play(comp.fps);
    let raf = 0;
    const t0 = performance.now();
    const f0 = frameRef.current;
    const step = () => {
      const elapsed = (performance.now() - t0) / 1000;
      let f = f0 + Math.floor(elapsed * comp.fps);
      if (f >= comp.durationInFrames) {
        if (loop) f = f % comp.durationInFrames;
        else {
          setFrame(comp.durationInFrames - 1);
          setPlaying(false);
          return;
        }
      }
      setFrame(f);
      engine.tick(f, collectAudioCues().filter((c) => c.id.startsWith(`${comp.id}/`) || c.id.startsWith(`${comp.id}|`)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      engine.pause();
    };
  }, [playing, comp, loop, engine]);

  useEffect(() => engine.setMuted(muted), [muted, engine]);

  const seek = useCallback(
    (f: number) => {
      if (!comp) return;
      const clamped = Math.max(0, Math.min(comp.durationInFrames - 1, Math.round(f)));
      engine.seek();
      setFrame(clamped);
      if (playing) {
        setPlaying(false);
        setTimeout(() => setPlaying(true), 0);
      }
    },
    [comp, engine, playing],
  );

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!comp) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case " ":
          e.preventDefault();
          setPlaying((p) => !p);
          break;
        case "ArrowLeft":
          seek(frameRef.current - big);
          break;
        case "ArrowRight":
          seek(frameRef.current + big);
          break;
        case "Home":
          seek(0);
          break;
        case "End":
          seek(comp.durationInFrames - 1);
          break;
        case "l":
          setLoop((l) => !l);
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "]": {
          const next = (comp.scenes ?? []).map((s) => s.start).find((f) => f > frameRef.current);
          if (next !== undefined) seek(next);
          break;
        }
        case "[": {
          const prev = [...(comp.scenes ?? [])].map((s) => s.start).reverse().find((f) => f < frameRef.current - 1);
          seek(prev ?? 0);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comp, seek]);

  const compId = comp?.id;
  const tracks = useMemo(
    () => [...getRegistry().tracks.values()].filter((t) => t.path[0] === compId).sort((a, b) => a.startFrame - b.startFrame || a.depth - b.depth),
    [version, frame, compId],
  );
  const cues = useMemo(() => collectAudioCues().filter((c) => c.id.startsWith(`${compId}/`) || c.id.startsWith(`${compId}|`)), [version, frame, compId]);

  if (!comp) return <div className="empty">No compositions registered. Call registerRoot() with a component that renders &lt;Composition /&gt;.</div>;
  const { component: Comp, ...meta } = comp;
  const seconds = frame / comp.fps;

  return (
    <div className="studio">
      <aside className="side">
        <h1>Compositions</h1>
        {comps.map((c) => (
          <button key={c.id} className={`comp ${c.id === comp.id ? "active" : ""}`} onClick={() => { setSelected(c.id); setFrame(0); setPlaying(false); }}>
            {c.id}
            <small>
              {c.width}×{c.height} · {c.fps} fps · {(c.durationInFrames / c.fps).toFixed(1)}s
            </small>
          </button>
        ))}
      </aside>
      <div className="stage" ref={stageRef}>
        <div className="canvas" style={{ width: meta.width, height: meta.height, transform: `scale(${scale})`, left: `calc(50% - ${(meta.width * scale) / 2}px)`, top: `calc(50% - ${(meta.height * scale) / 2}px)` }}>
          <ErrorBoundary onError={setError} key={comp.id}>
            <TimelineProvider config={meta} frame={frame} mode="preview">
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <Comp {...(meta.defaultProps ?? {})} />
              </div>
            </TimelineProvider>
          </ErrorBoundary>
        </div>
        {error && <div className="err">{error}</div>}
      </div>
      <div className="bottom">
        <div className="controls">
          <button className="btn" onClick={() => seek(0)} title="Home">⇤</button>
          <button className="btn" onClick={() => seek(frame - 1)} title="←">‹</button>
          <button className={`btn ${playing ? "on" : ""}`} onClick={() => setPlaying((p) => !p)} title="Space">{playing ? "❚❚" : "▶"}</button>
          <button className="btn" onClick={() => seek(frame + 1)} title="→">›</button>
          <button className="btn" onClick={() => seek(comp.durationInFrames - 1)} title="End">⇥</button>
          <button className={`btn ${loop ? "on" : ""}`} onClick={() => setLoop((l) => !l)} title="L">loop</button>
          <button className={`btn ${muted ? "" : "on"}`} onClick={() => setMuted((m) => !m)} title="M">{muted ? "muted" : "sound"}</button>
          <span className="time">
            {seconds.toFixed(2)}s · f{frame} / {comp.durationInFrames}
          </span>
          <span className="spacer" />
          <span className="kbd">space play · ←/→ frame · shift ×10 · home/end · l loop · m mute</span>
        </div>
        <Scrubber scenes={comp.scenes} frame={frame} total={comp.durationInFrames} fps={comp.fps} onSeek={seek} />
        <Tracks tracks={tracks} cues={cues} frame={frame} total={comp.durationInFrames} onSeek={seek} />
      </div>
    </div>
  );
}

function Scrubber({ frame, total, fps, scenes = [], onSeek }: { frame: number; total: number; fps: number; scenes?: { name: string; start: number; end: number }[]; onSeek: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const toFrame = (e: React.MouseEvent | MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * total;
  };
  const onDown = (e: React.MouseEvent) => {
    onSeek(toFrame(e));
    const move = (ev: MouseEvent) => onSeek(toFrame(ev));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const ticks = [];
  for (let s = 0; s * fps < total; s++) ticks.push(s * fps);
  return (
    <div className="scrub" ref={ref} onMouseDown={onDown}>
      <div className="fill" style={{ width: `${(frame / total) * 100}%` }} />
      {ticks.map((t) => (
        <div key={t} className="tick" style={{ left: `${(t / total) * 100}%` }} />
      ))}
      {scenes.map((s) => (
        <div key={s.name} className="marker" title={`${s.name} · ${s.start}–${s.end}`} style={{ left: `${(s.start / total) * 100}%`, width: `${((s.end - s.start) / total) * 100}%` }}>
          <span>{s.name}</span>
        </div>
      ))}
      <div className="head" style={{ left: `${(frame / total) * 100}%` }} />
    </div>
  );
}

function Tracks({ tracks, cues, frame, total, onSeek }: { tracks: TrackInfo[]; cues: ReturnType<typeof collectAudioCues>; frame: number; total: number; onSeek: (f: number) => void }) {
  // Pack tracks into rows greedily by depth.
  const rows: { items: { start: number; end: number; label: string; cls: string }[] }[] = [];
  const place = (start: number, end: number, label: string, cls: string) => {
    let row = rows.find((r) => r.items.every((i) => end <= i.start || start >= i.end));
    if (!row) {
      row = { items: [] };
      rows.push(row);
    }
    row.items.push({ start, end, label, cls });
  };
  for (const t of tracks) place(t.startFrame, t.endFrame, t.name, "seq");
  for (const c of cues) {
    if (c.kind === "bus") {
      const depth = Math.min(...(c.automation?.volume ?? [[0, 1]]).map(([, g]) => g));
      place(c.startFrame, c.endFrame, `⤓ duck ×${depth.toFixed(2)}`, "bus");
    } else place(c.startFrame, c.endFrame, c.kind === "file" ? `♪ ${c.src?.split("/").pop()}` : `∿ ${c.tone?.wave} ${Math.round(c.tone?.freq ?? 0)}Hz`, c.kind === "file" ? "audio" : "tone");
  }
  return (
    <div className="tracks">
      {rows.map((r, i) => (
        <div key={i} className="track">
          {r.items.map((it, j) => (
            <div key={j} className={`bar ${it.cls}`} style={{ left: `${(it.start / total) * 100}%`, width: `${Math.max(0.3, ((it.end - it.start) / total) * 100)}%` }} title={`${it.label}: ${it.start}–${it.end}`} onClick={() => onSeek(it.start)}>
              {it.label}
            </div>
          ))}
        </div>
      ))}
      <div className="playhead" style={{ left: `${(frame / total) * 100}%` }} />
    </div>
  );
}

import { Component } from "react";
class ErrorBoundary extends Component<{ onError: (m: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    this.props.onError(String(e.stack ?? e));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function mountStudio() {
  ensureRootMounted();
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const el = document.getElementById("root") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "root" }));
  createRoot(el).render(createElement(Studio));
}
