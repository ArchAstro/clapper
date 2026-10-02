import { defineScenes } from "@archastro/clapper-core";
import beats from "./beats.json";
import timing from "./timing.json";
export const FPS = 30;
type Timing = Record<
  string,
  { seconds: number; take?: { at: number; dur: number }; lines: { at: number; dur: number }[] }
>;
const T = timing as Timing;
export const SCENES = defineScenes(
  Object.fromEntries(beats.map((b) => [b.id, { seconds: T[b.id]?.seconds ?? 8 }])),
  { fps: FPS },
);
/** Scene-local frame at which sentence k of a scene's narration starts (k past the end → scene end). */
export function lineStarts(id: string): (k: number, offsetSeconds?: number, fraction?: number) => number {
  const lines = T[id]?.lines ?? [];
  // `fraction` reaches into the sentence (0 = its first word, 1 = its last).
  return (k, offset = 0, fraction = 0) => {
    const at = k < lines.length ? lines[k].at + fraction * lines[k].dur : (T[id]?.seconds ?? 8);
    return Math.round((at + offset) * FPS);
  };
}
export const LINES = T;
