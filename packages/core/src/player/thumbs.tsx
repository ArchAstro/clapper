import { memo } from "react";
import type { CompositionEntry } from "../registry";
import { TimelineProvider } from "../timeline";
import { ErrorBoundary } from "./boundary";

/** A live, scaled mount of a composition at one representative frame. */
export const Thumb = memo(function Thumb({
  entry,
  width = 96,
  height = 54,
  at,
}: {
  entry: CompositionEntry;
  width?: number;
  height?: number;
  at?: number;
}) {
  const { component: Comp, ...meta } = entry;
  const frame = at ?? Math.floor(meta.durationInFrames * 0.38);
  const s = Math.min(width / meta.width, height / meta.height);
  return (
    <div className="thumb" style={{ width, height }}>
      <div style={{ width: meta.width, height: meta.height, transform: `scale(${s})` }}>
        <ErrorBoundary resetKey={entry.id}>
          <TimelineProvider config={meta} frame={frame} mode="preview">
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <Comp {...(meta.defaultProps ?? {})} />
            </div>
          </TimelineProvider>
        </ErrorBoundary>
      </div>
    </div>
  );
});
