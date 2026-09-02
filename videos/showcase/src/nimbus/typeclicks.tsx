import { Click, typedLength, useFps } from "@clapper/core";
import { useMemo } from "react";

/** Click per typed character (or every Nth), synced to <Typewriter> with the same props. */
export function TypeClicks({ text, at = 0, cps = 30, duration, jitter = 0.35, every = 1, volume = 0.1, freq = 2200 }: { text: string; at?: number; cps?: number; duration?: number; jitter?: number; every?: number; volume?: number; freq?: number }) {
  const fps = useFps();
  const frames = useMemo(() => {
    const total = duration ?? Math.ceil((text.length / cps) * fps);
    const out: number[] = [];
    let prev = 0;
    for (let f = at; f <= at + total + 1; f++) {
      const n = typedLength({ text, frame: f, fps, at, cps, duration, jitter });
      if (n > prev) {
        if (text[n - 1] !== " " && (n - 1) % every === 0) out.push(f);
        prev = n;
      }
    }
    return [...new Set(out)];
  }, [text, at, cps, duration, jitter, every, fps]);
  return (
    <>
      {frames.map((f, i) => (
        <Click key={f} at={f} volume={volume} freq={freq + ((i * 13) % 5) * 150} name={`k${i}`} />
      ))}
    </>
  );
}
