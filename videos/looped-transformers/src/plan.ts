import { defineScenes } from "@archastro/clapper-core";
import { BEATS } from "./beats";
import timing from "./timing.json";
export const FPS = 30;
export const SCENES = defineScenes(
  Object.fromEntries(
    BEATS.map((b) => [
      b.id,
      {
        seconds: (timing as Record<string, number>)[b.id] ?? Math.ceil(b.text.split(/\s+/).length / 2.4 + 3),
      },
    ]),
  ),
  { fps: FPS },
);
