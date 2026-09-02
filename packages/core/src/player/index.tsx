/**
 * The studio: a browser editor to scrub, play and inspect compositions.
 * Mounted by `agenticvids preview`. Left: project (live thumbnails, scenes).
 * Centre: viewport with overlays. Right: inspector / cues / scratch (TSX
 * compiled in the browser). Bottom: transport and an NLE-style timeline.
 */
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ensureRootMounted, getComposition, listCompositions } from "../composition";
import { collectAudioCues } from "../audio";
import { getRegistry, subscribeRegistry } from "../registry";
import { AudioEngine } from "./audio-engine";
import { css } from "./styles";
import { Thumb } from "./thumbs";
import { Viewport, type Overlays, type Zoom } from "./viewport";
import { Timeline } from "./timeline";
import { CueTable, Inspector } from "./inspector";
import { Scratch } from "./scratch";
import { clamp, timecode, type Selection } from "./state";

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

const RATES = [-4, -2, -1, 0.25, 0.5, 1, 2, 4];

function Studio() {
  const version = useRegistryVersion();
  const comps = useMemo(() => listCompositions(), [version]);
  const [selected, setSelected] = useState<string | undefined>(() => readUrlState().comp);
  const comp = (selected && getComposition(selected)) || (comps[0] && getComposition(comps[0].id)) || null;
  const [frame, setFrame] = useState(() => readUrlState().frame ?? 0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [muted, setMuted] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [overlays, setOverlays] = useState<Overlays>({ safe: false, grid: false, copy: false });
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [tab, setTab] = useState<"inspect" | "cues" | "scratch">("inspect");
  const [ppf, setPpf] = useState<number | null>(null);
  const fitRef = useRef(1);
  const [error, setError] = useState<string | null>(null);
  const [frameText, setFrameText] = useState("0");
  const engine = useMemo(() => new AudioEngine(), []);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(() => {
    if (comp && !playing) writeUrlState(comp.id, frame);
  }, [comp, frame, playing]);
  useEffect(() => setFrameText(String(frame)), [frame]);
  useEffect(() => setError(null), [comp?.id]);

  const total = comp?.durationInFrames ?? 1;
  const fps = comp?.fps ?? 30;

  // Playback: rate can be negative; the loop wraps inside the in/out range when one is set.
  useEffect(() => {
    if (!playing || !comp) return;
    if (rate > 0) engine.play(comp.fps);
    let raf = 0;
    const t0 = performance.now();
    const f0 = frameRef.current;
    const step = () => {
      const elapsed = (performance.now() - t0) / 1000;
      let f = f0 + Math.round(elapsed * comp.fps * rate);
      const [a, b] = rangeRef.current ?? [0, comp.durationInFrames];
      const len = Math.max(1, b - a);
      if (rate > 0 && f >= b) {
        if (!loop) {
          setFrame(b - 1);
          setPlaying(false);
          return;
        }
        f = a + ((f - a) % len);
      } else if (rate < 0 && f < a) {
        if (!loop) {
          setFrame(a);
          setPlaying(false);
          return;
        }
        f = b - 1 - ((a - f - 1) % len);
      }
      setFrame(f);
      if (rate > 0) engine.tick(f, collectAudioCues().filter((c) => c.id.startsWith(`${comp.id}/`) || c.id.startsWith(`${comp.id}|`)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      engine.pause();
    };
  }, [playing, comp, loop, rate, engine]);

  useEffect(() => engine.setMuted(muted), [muted, engine]);

  const seek = useCallback(
    (f: number) => {
      if (!comp) return;
      const clamped = clamp(Math.round(f), 0, comp.durationInFrames - 1);
      engine.seek();
      setFrame(clamped);
      if (playing) {
        setPlaying(false);
        setTimeout(() => setPlaying(true), 0);
      }
    },
    [comp, engine, playing],
  );

  const pick = useCallback((id: string) => {
    setSelected(id);
    setFrame(0);
    setPlaying(false);
    setSelection(null);
    setRange(null);
    setPpf(null);
  }, []);

  const cutStarts = useMemo(() => (comp?.scenes ?? []).map((s) => s.start), [comp?.scenes]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!comp) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!playing) setRate((r) => (r > 0 ? r : 1));
          setPlaying((p) => !p);
          break;
        case "ArrowLeft":
        case ",":
          seek(frameRef.current - big);
          break;
        case "ArrowRight":
        case ".":
          seek(frameRef.current + big);
          break;
        case "Home":
          seek(0);
          break;
        case "End":
          seek(comp.durationInFrames - 1);
          break;
        case "j":
          setRate((r) => (r < 0 ? Math.max(-4, r * 2) : -1));
          setPlaying(true);
          break;
        case "k":
          setPlaying(false);
          break;
        case "l":
          setLoop((v) => !v);
          break;
        case "m":
          setMuted((v) => !v);
          break;
        case "i":
          setRange((r) => [frameRef.current, Math.max(frameRef.current + 1, r?.[1] ?? comp.durationInFrames)]);
          break;
        case "o":
          setRange((r) => [Math.min(r?.[0] ?? 0, frameRef.current), frameRef.current + 1]);
          break;
        case "x":
          setRange(null);
          break;
        case "]": {
          const next = cutStarts.find((f) => f > frameRef.current);
          if (next !== undefined) seek(next);
          break;
        }
        case "[": {
          const prev = [...cutStarts].reverse().find((f) => f < frameRef.current - 1);
          seek(prev ?? 0);
          break;
        }
        case "-":
          setPpf((p) => (p ?? fitRef.current) / 1.25);
          break;
        case "=":
        case "+":
          setPpf((p) => Math.min(80, (p ?? fitRef.current) * 1.25));
          break;
        case "0":
          setPpf(null);
          break;
        case "s":
          setOverlays((o) => ({ ...o, safe: !o.safe }));
          break;
        case "g":
          setOverlays((o) => ({ ...o, grid: !o.grid }));
          break;
        case "c":
          setOverlays((o) => ({ ...o, copy: !o.copy }));
          break;
        case "Escape":
          setSelection(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comp, seek, playing, cutStarts]);

  const compId = comp?.id;
  const trackCount = getRegistry().tracks.size;
  const cueCount = getRegistry().audio.size;
  const tracks = useMemo(
    () => [...getRegistry().tracks.values()].filter((t) => t.path[0] === compId).sort((a, b) => a.startFrame - b.startFrame || a.depth - b.depth),
    [version, trackCount, compId],
  );
  const cues = useMemo(() => collectAudioCues().filter((c) => c.id.startsWith(`${compId}/`) || c.id.startsWith(`${compId}|`)), [version, cueCount, compId]);
  const scene = useMemo(() => {
    const s = (comp?.scenes ?? []).filter((x) => frame >= x.start && frame < x.end).sort((a, b) => b.start - a.start)[0];
    return s ? { name: s.name, local: frame - s.start } : null;
  }, [comp?.scenes, frame]);

  if (!comp) return <div className="empty">No compositions registered. Call registerRoot() with a component that renders &lt;Composition /&gt;.</div>;

  return (
    <div className="studio">
      <div className="top">
        <span className="brand">agenticvids studio</span>
        <span className="name">{comp.id}</span>
        <span className="meta">
          {comp.width}×{comp.height} · {comp.fps} fps · {timecode(comp.durationInFrames, comp.fps)} · {comp.durationInFrames} f
        </span>
        <span style={{ flex: 1 }} />
        <button className={`btn sm ${overlays.safe ? "on" : ""}`} onClick={() => setOverlays((o) => ({ ...o, safe: !o.safe }))} title="S">safe</button>
        <button className={`btn sm ${overlays.grid ? "on" : ""}`} onClick={() => setOverlays((o) => ({ ...o, grid: !o.grid }))} title="G">thirds</button>
        <button className={`btn sm ${overlays.copy ? "on" : ""}`} onClick={() => setOverlays((o) => ({ ...o, copy: !o.copy }))} title="C">copy boxes</button>
        <select className="btn sm" value={String(zoom)} onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : parseFloat(e.target.value))}>
          <option value="fit">fit</option>
          <option value="0.25">25%</option>
          <option value="0.5">50%</option>
          <option value="1">100%</option>
          <option value="2">200%</option>
        </select>
      </div>
      <aside className="side">
        <h2>Compositions</h2>
        {comps.map((c) => {
          const entry = getComposition(c.id)!;
          return (
            <button key={c.id} className={`comp ${c.id === comp.id ? "active" : ""}`} onClick={() => pick(c.id)}>
              <Thumb entry={entry} />
              <span>
                <span className="id">{c.id}</span>
                <small>
                  {c.width}×{c.height} · {c.fps} fps · {(c.durationInFrames / c.fps).toFixed(1)}s
                </small>
                {c.scenes?.length ? <small>{c.scenes.length} scenes</small> : null}
              </span>
            </button>
          );
        })}
        {comp.scenes?.length ? (
          <>
            <h2>Scenes</h2>
            <div className="scenes">
              {comp.scenes.map((s, i) => (
                <button key={s.name} className={`scene ${scene?.name === s.name ? "active" : ""}`} onClick={() => seek(s.start)} onDoubleClick={() => setRange([s.start, s.end])} title="click: go to · double-click: loop">
                  <span className="sw" style={{ background: i % 2 ? "#3f6b56" : "#3a5266" }} />
                  <span className="n">{s.name}</span>
                  <span className="t">
                    {timecode(s.start, comp.fps)} · {((s.end - s.start) / comp.fps).toFixed(1)}s
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </aside>
      <Viewport entry={comp} frame={frame} overlays={overlays} zoom={zoom} error={error} onError={setError} scene={scene} />
      <div className="panel">
        <div className="tabs">
          {(["inspect", "cues", "scratch"] as const).map((t) => (
            <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="body">
          {tab === "inspect" && <Inspector meta={comp} tracks={tracks} cues={cues} selection={selection} frame={frame} engine={engine} onSeek={seek} onRange={setRange} onSelect={setSelection} />}
          {tab === "cues" && (
            <CueTable
              cues={cues}
              fps={comp.fps}
              selection={selection}
              onPick={(c) => {
                setSelection({ kind: "cue", id: c.id });
                seek(c.startFrame);
                setTab("inspect");
              }}
            />
          )}
          {tab === "scratch" && <Scratch onCompiled={pick} />}
        </div>
      </div>
      <div className="bottom">
        <div className="transport">
          <button className="btn" onClick={() => seek(range?.[0] ?? 0)} title="Home">⇤</button>
          <button className="btn" onClick={() => { const p = [...cutStarts].reverse().find((f) => f < frame - 1); seek(p ?? 0); }} title="[  previous cut">|◀</button>
          <button className="btn" onClick={() => seek(frame - 1)} title="← / ,">‹</button>
          <button className={`btn ${playing ? "on" : ""}`} onClick={() => { if (!playing && rate <= 0) setRate(1); setPlaying((p) => !p); }} title="Space">{playing ? "❚❚" : "▶"}</button>
          <button className="btn" onClick={() => seek(frame + 1)} title="→ / .">›</button>
          <button className="btn" onClick={() => { const n = cutStarts.find((f) => f > frame); if (n !== undefined) seek(n); }} title="]  next cut">▶|</button>
          <button className="btn" onClick={() => seek((range?.[1] ?? comp.durationInFrames) - 1)} title="End">⇥</button>
          <select className="btn" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} title="J / K / L">
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r > 0 ? `${r}×` : `◀ ${-r}×`}
              </option>
            ))}
          </select>
          <button className={`btn ${loop ? "on" : ""}`} onClick={() => setLoop((l) => !l)} title="L">loop</button>
          <button className={`btn ${range ? "on" : ""}`} onClick={() => setRange((r) => [frame, Math.max(frame + 1, r?.[1] ?? total)])} title="I">in</button>
          <button className={`btn ${range ? "on" : ""}`} onClick={() => setRange((r) => [Math.min(r?.[0] ?? 0, frame), frame + 1])} title="O">out</button>
          {range && (
            <button className="btn" onClick={() => setRange(null)} title="X">
              ✕ {range[0]}–{range[1]}
            </button>
          )}
          <button className={`btn ${muted ? "" : "on"}`} onClick={() => setMuted((m) => !m)} title="M">{muted ? "muted" : "sound"}</button>
          <input
            className="tc"
            value={frameText}
            onChange={(e) => setFrameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(frameText, 10);
                if (!Number.isNaN(n)) seek(n);
                (e.target as HTMLInputElement).blur();
              }
            }}
            title="frame (Enter to go)"
          />
          <span className="tc" style={{ width: "auto" }}>
            {timecode(frame, fps)} · {(frame / fps).toFixed(2)}s
          </span>
          <span className="kbd">space play · j/k shuttle · ←→ frame · ⇧×10 · [ ] cuts · i/o/x range · l loop · m mute · s/g/c overlays · ⌘wheel zoom · −/=/0</span>
        </div>
        <Timeline meta={comp} tracks={tracks} cues={cues} frame={frame} playing={playing} range={range} selection={selection} ppf={ppf} onPpf={setPpf} onFit={(f) => { fitRef.current = f; }} onSeek={seek} onSelect={setSelection} onRange={setRange} />
      </div>
    </div>
  );
}

export function mountStudio() {
  ensureRootMounted();
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const el = document.getElementById("root") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "root" }));
  createRoot(el).render(createElement(Studio));
}
