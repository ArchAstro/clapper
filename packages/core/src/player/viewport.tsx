import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CompositionEntry } from "../registry";
import { TimelineProvider } from "../timeline";
import { ErrorBoundary } from "./boundary";
import { timecode } from "./state";

export interface Overlays {
  safe: boolean;
  grid: boolean;
  copy: boolean;
}
export type Zoom = "fit" | number;

interface CopyBox {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

/** The composition, scaled to fit (or zoomed), with safe-area / thirds / copy-box overlays and a HUD. */
export function Viewport({ entry, frame, overlays, zoom, error, onError, scene }: { entry: CompositionEntry; frame: number; overlays: Overlays; zoom: Zoom; error: string | null; onError: (m: string) => void; scene: { name: string; local: number } | null }) {
  const { component: Comp, ...meta } = entry;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.3);
  const [boxes, setBoxes] = useState<CopyBox[]>([]);
  const scale = zoom === "fit" ? fit : zoom;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 48;
      setFit(Math.max(0.05, Math.min((el.clientWidth - pad) / meta.width, (el.clientHeight - pad) / meta.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [meta.width, meta.height]);

  // Measure copy boxes after every frame render (same idea as the review lint, unclipped).
  useLayoutEffect(() => {
    if (!overlays.copy || !canvasRef.current) {
      if (boxes.length) setBoxes([]);
      return;
    }
    const root = canvasRef.current;
    const cr = root.getBoundingClientRect();
    const out: CopyBox[] = [];
    for (const el of Array.from(root.querySelectorAll("[data-copy],[data-eyebrow]"))) {
      if (el.querySelector("[data-copy],[data-eyebrow]")) continue;
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      const range = document.createRange();
      range.selectNodeContents(el.firstElementChild ?? el);
      const r = range.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      out.push({ x: (r.left - cr.left) / scale, y: (r.top - cr.top) / scale, w: r.width / scale, h: r.height / scale, text: text.slice(0, 32) });
    }
    setBoxes(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, overlays.copy, entry.id, scale]);

  const mx = meta.width * 0.05;
  const my = meta.height * 0.05;
  return (
    <div className="stage" ref={stageRef}>
      <div className="inner">
        <div style={{ width: meta.width * scale, height: meta.height * scale, position: "relative", flex: "none" }}>
          <div className="canvas" ref={canvasRef} style={{ width: meta.width, height: meta.height, transform: `scale(${scale})` }}>
            <div className="comp-root">
              <ErrorBoundary onError={onError} resetKey={entry.id}>
                <TimelineProvider config={meta} frame={frame} mode="preview">
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                    <Comp {...(meta.defaultProps ?? {})} />
                  </div>
                </TimelineProvider>
              </ErrorBoundary>
            </div>
            <div className="overlay">
              {overlays.safe && (
                <>
                  <div className="safe" style={{ left: mx, top: my, width: meta.width - 2 * mx, height: meta.height - 2 * my }} />
                  <div className="title" style={{ left: mx * 2, top: my * 2, width: meta.width - 4 * mx, height: meta.height - 4 * my }} />
                </>
              )}
              {overlays.grid && (
                <>
                  <div className="third" style={{ left: meta.width / 3, top: 0, width: 1, height: meta.height }} />
                  <div className="third" style={{ left: (meta.width * 2) / 3, top: 0, width: 1, height: meta.height }} />
                  <div className="third" style={{ top: meta.height / 3, left: 0, height: 1, width: meta.width }} />
                  <div className="third" style={{ top: (meta.height * 2) / 3, left: 0, height: 1, width: meta.width }} />
                </>
              )}
              {overlays.copy &&
                boxes.map((b, i) => (
                  <div key={i} className="copy" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
                    <span style={{ fontSize: 10 / scale, top: -14 / scale }}>{b.text}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      <div className="hud">
        <span>{timecode(frame, meta.fps)}</span>
        <span>f{frame}</span>
        {scene && (
          <span>
            <b className="scene">{scene.name}</b> · local {scene.local}
          </span>
        )}
        <span>
          {meta.width}×{meta.height} · {meta.fps} fps
        </span>
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}
