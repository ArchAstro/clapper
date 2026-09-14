import { compileNarration, type NarrationScript, narrationAsset } from "./narration";

export * from "./narration";

import { useLayoutEffect, useMemo, useState } from "react";
import { Audio } from "./audio";
import { type Frames, resolveFrames } from "./frames";
import { continueRender, delayRender } from "./registry";
import { useTimeline, useVideoConfig } from "./timeline";

/** Play exactly the cached local voice render used by the offline exporter. Add
 * `narration: "src/narration.ts"` to clapper.json so preview/render prepares this asset. */
export function NarrationAudio({
  script,
  cue,
  at = 0,
  volume = 1,
}: {
  script: NarrationScript;
  cue?: string;
  at?: Frames;
  volume?: number;
}) {
  const { fps } = useVideoConfig();
  const timeline = useTimeline();
  const prepared = useMemo(() => {
    const compiled = compileNarration(script);
    const selected = cue === undefined ? undefined : compiled.cues.find((c) => c.id === cue);
    if (cue !== undefined && !selected) throw new Error(`Unknown narration cue ${cue}`);
    return {
      src: narrationAsset(script),
      startFrom: selected?.at ?? 0,
      duration: selected?.duration ?? compiled.durationSeconds,
    };
  }, [script, cue]);
  const [error, setError] = useState<string>();
  useLayoutEffect(() => {
    const handle = delayRender("prepared narration");
    let alive = true;
    fetch(prepared.src, { method: "HEAD" })
      .then((r) => {
        if (!r.ok || !r.headers.get("content-type")?.includes("audio"))
          throw new Error(
            "Narration audio is missing. Set narration in clapper.json, then restart clapper preview/render to prepare it.",
          );
      })
      .catch((e) => {
        if (alive) setError(String(e));
      })
      .finally(() => continueRender(handle));
    return () => {
      alive = false;
      continueRender(handle);
    };
  }, [prepared.src]);
  if (error) throw new Error(error);
  const startFrame = resolveFrames(at, fps);
  if (!Number.isFinite(startFrame) || startFrame < 0)
    throw new Error("Narration start must be finite and nonnegative");
  if (startFrame + Math.ceil(prepared.duration * fps) > timeline.durationInFrames)
    throw new Error("Narration exceeds its enclosing scene/composition. Extend the scene or select a cue.");
  return (
    <Audio
      src={prepared.src}
      startFrom={prepared.startFrom}
      at={at}
      durationInFrames={Math.ceil(prepared.duration * fps)}
      volume={volume}
    />
  );
}
