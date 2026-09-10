import { compileScore, type Score, scoreAsset } from "@clapper/music";
import { useLayoutEffect, useMemo, useState } from "react";
import { Audio } from "./audio";
import type { Frames } from "./frames";
import { continueRender, delayRender } from "./registry";
import { useVideoConfig } from "./timeline";

/** Play exactly the cached sfizz render used by the offline exporter. Add
 * `score: "src/score.ts"` to clapper.json so preview/render prepares this asset. */
export function ScoreAudio({ score, at = 0, volume = 1 }: { score: Score; at?: Frames; volume?: number }) {
  const { fps } = useVideoConfig();
  const prepared = useMemo(
    () => ({ src: scoreAsset(score), duration: compileScore(score).durationSeconds }),
    [score],
  );
  const [error, setError] = useState<string>();
  useLayoutEffect(() => {
    const handle = delayRender("prepared musical score");
    let alive = true;
    fetch(prepared.src, { method: "HEAD" })
      .then((r) => {
        if (!r.ok || !r.headers.get("content-type")?.includes("audio"))
          throw new Error(
            "Score audio is missing. Set score in clapper.json, then restart clapper preview/render to prepare it.",
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
  return (
    <Audio src={prepared.src} at={at} durationInFrames={Math.ceil(prepared.duration * fps)} volume={volume} />
  );
}
