import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioCue, CompositionMeta, TrackInfo } from "../registry";
import {
  CATEGORY_ORDER,
  clamp,
  cueCategory,
  cueLabel,
  packRows,
  type Selection,
  timecode,
  volumeEnvelope,
} from "./state";

const HEAD = 150;

interface Block {
  id: string;
  start: number;
  end: number;
  label: string;
  cls: string;
  sel: Selection;
  env?: [number, number][];
  alt?: boolean;
  title: string;
}

interface Lane {
  name: string;
  count: number;
  rows: Block[][];
}

export interface TimelineProps {
  meta: CompositionMeta;
  tracks: TrackInfo[];
  cues: AudioCue[];
  frame: number;
  playing: boolean;
  range: [number, number] | null;
  selection: Selection;
  ppf: number | null;
  onPpf: (v: number | null) => void;
  onFit: (fit: number) => void;
  onSeek: (f: number) => void;
  onSelect: (s: Selection) => void;
  onRange: (r: [number, number] | null) => void;
}

/** NLE-style timeline: ruler, scene markers, sequence lanes by depth, audio lanes by kind, playhead, loop range. */
export function Timeline({
  meta,
  tracks,
  cues,
  frame,
  playing,
  range,
  selection,
  ppf,
  onPpf,
  onFit,
  onSeek,
  onSelect,
  onRange,
}: TimelineProps) {
  const total = meta.durationInFrames;
  const fps = meta.fps;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = Math.max(0.02, (width - HEAD - 12) / total);
  useEffect(() => onFit(fit), [fit, onFit]);
  const scale = ppf ?? fit;
  const x = (f: number) => f * scale;

  // Zoom around the cursor with ctrl/cmd + wheel (needs a non-passive listener).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - HEAD + el.scrollLeft;
      const f = px / scale;
      const next = clamp(scale * Math.exp(-e.deltaY * 0.0025), fit * 0.5, 80);
      onPpf(next);
      requestAnimationFrame(() => {
        el.scrollLeft = f * next - (e.clientX - rect.left - HEAD);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, fit, onPpf]);

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !playing) return;
    const px = x(frame);
    const view = el.clientWidth - HEAD;
    if (px < el.scrollLeft || px > el.scrollLeft + view - 20) el.scrollLeft = Math.max(0, px - 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, playing]);

  const cuts = useMemo(() => {
    const s = new Set<number>([0, total]);
    for (const sc of meta.scenes ?? []) {
      s.add(sc.start);
      s.add(sc.end);
    }
    return [...s];
  }, [meta.scenes, total]);

  const frameAt = useCallback(
    (clientX: number, snap: boolean) => {
      const el = scrollRef.current!;
      const rect = el.getBoundingClientRect();
      let f = (clientX - rect.left - HEAD + el.scrollLeft) / scale;
      if (snap) {
        const near = cuts.find((c) => Math.abs(c - f) * scale <= 6);
        if (near !== undefined) f = near;
      }
      return clamp(Math.round(f), 0, total - 1);
    },
    [scale, cuts, total],
  );

  const onDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".block") || (e.target as HTMLElement).closest(".head")) return;
    onSeek(frameAt(e.clientX, !e.altKey));
    const move = (ev: MouseEvent) => onSeek(frameAt(ev.clientX, !ev.altKey));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const lanes = useMemo<Lane[]>(() => {
    const out: Lane[] = [];
    const scenes = (meta.scenes ?? []).map((s, i) => ({
      id: `scene:${s.name}`,
      start: s.start,
      end: s.end,
      label: s.name,
      cls: "scene",
      alt: i % 2 === 1,
      sel: null,
      title: `${s.name} · ${s.start}–${s.end} (${((s.end - s.start) / fps).toFixed(2)} s)`,
    }));
    if (scenes.length) out.push({ name: "scenes", count: scenes.length, rows: packRows(scenes) });
    const depths = [...new Set(tracks.map((t) => t.depth))].sort((a, b) => a - b);
    depths.forEach((d, i) => {
      const items = tracks
        .filter((t) => t.depth === d)
        .map((t) => ({
          id: t.id,
          start: t.startFrame,
          end: t.endFrame,
          label: t.name,
          cls: `seq d${Math.min(3, i + 1)}`,
          sel: { kind: "track", id: t.id } as Selection,
          title: `${t.name} · ${t.startFrame}–${t.endFrame}`,
        }));
      out.push({ name: i === 0 ? "sequences" : `nested ${i}`, count: items.length, rows: packRows(items) });
    });
    const byCat = new Map<string, AudioCue[]>();
    for (const c of cues) {
      const k = cueCategory(c);
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(c);
    }
    const cats = [...byCat.keys()].sort(
      (a, b) => ((CATEGORY_ORDER.indexOf(a) + 100) % 100) - ((CATEGORY_ORDER.indexOf(b) + 100) % 100),
    );
    for (const k of cats) {
      const items = byCat.get(k)!.map((c) => ({
        id: c.id,
        start: c.startFrame,
        end: c.endFrame,
        label: cueLabel(c),
        cls: `audio-${k}`,
        sel: { kind: "cue", id: c.id } as Selection,
        env: volumeEnvelope(c),
        title: `${cueLabel(c)} · ${c.startFrame}–${c.endFrame} · vol ${c.volume.toFixed(2)}`,
      }));
      // dense patterns (ringing plucks) would stack into a dozen rows: cap at 4 and let the rest overlap in the last row
      const rows = packRows(items);
      if (rows.length > 4) {
        const rest = rows.slice(3).flat();
        rows.splice(3, rows.length - 3, rest);
      }
      out.push({ name: k === "file" ? "audio files" : k === "bus" ? "bus" : k, count: items.length, rows });
    }
    return out;
  }, [meta.scenes, tracks, cues, fps]);

  const ticks = useMemo(() => {
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60];
    const major = (steps.find((s) => s * fps * scale >= 64) ?? 60) * fps;
    const minor = major / (major >= fps ? 4 : 2);
    const out: { f: number; major: boolean; label?: string }[] = [];
    for (let f = 0; f <= total; f += minor) {
      const isMajor = Math.abs(f / major - Math.round(f / major)) < 1e-6;
      out.push({
        f: Math.round(f),
        major: isMajor,
        label: isMajor
          ? major >= fps
            ? timecode(Math.round(f), fps).slice(0, 5)
            : `f${Math.round(f)}`
          : undefined,
      });
    }
    return out;
  }, [fps, scale, total]);

  const isSel = (b: Block) =>
    (b.sel && selection && b.sel.kind === selection.kind && b.sel.id === selection.id) || false;
  const bodyW = x(total);

  return (
    <div className="timeline" ref={scrollRef} onMouseDown={onDown}>
      <div className="tl-inner" style={{ width: HEAD + bodyW + 24 }}>
        <div className="lane ruler">
          <div className="head">
            <b>{timecode(frame, fps)}</b>
            <i>{scale.toFixed(2)} px/f</i>
          </div>
          <div className="body" style={{ width: bodyW }}>
            {range && <div className="range" style={{ left: x(range[0]), width: x(range[1] - range[0]) }} />}
            {ticks.map((t) => (
              <div key={t.f} className={`tick ${t.major ? "major" : ""}`} style={{ left: x(t.f) }}>
                {t.label && <span className="lab">{t.label}</span>}
              </div>
            ))}
          </div>
        </div>
        {lanes.map((lane) =>
          lane.rows.map((row, ri) => (
            <div key={`${lane.name}-${ri}`} className="lane">
              <div className="head">
                {ri === 0 ? (
                  <>
                    <b>{lane.name}</b>
                    <i>{lane.count}</i>
                  </>
                ) : (
                  <i>…</i>
                )}
              </div>
              <div className="body" style={{ width: bodyW }}>
                {row.map((b) => (
                  <div
                    key={b.id}
                    className={`block ${b.cls} ${b.alt ? "alt" : ""} ${isSel(b) ? "sel" : ""}`}
                    style={{ left: x(b.start), width: Math.max(3, x(b.end - b.start) - 1) }}
                    title={b.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(b.sel);
                      onSeek(b.start);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onRange([b.start, b.end]);
                    }}
                  >
                    {b.env && <Envelope env={b.env} dur={b.end - b.start} />}
                    <span className="lbl">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )),
        )}
        {lanes.length === 0 && (
          <div className="lane">
            <div className="head">
              <i>no tracks yet</i>
            </div>
          </div>
        )}
        <div className="playhead" style={{ left: HEAD + x(frame) }}>
          <span className="f">{frame}</span>
        </div>
      </div>
    </div>
  );
}

function Envelope({ env, dur }: { env: [number, number][]; dur: number }) {
  const max = Math.max(1, ...env.map(([, g]) => g));
  const pts = env
    .map(([f, g]) => `${((f / dur) * 100).toFixed(1)},${(100 - (g / max) * 90).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={`0,100 ${pts} 100,100`}
        fill="rgba(255,255,255,.12)"
        stroke="rgba(255,255,255,.45)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
