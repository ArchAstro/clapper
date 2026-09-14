import { defineNarration } from "@archastro/clapper-core/narration/models";
import { BEATS } from "./beats";
import { FPS, SCENES } from "./plan";
export default defineNarration({
  title: "Universal Transformers — intuition, architecture, and training",
  narrators: { guide: { voice: "af_heart", speed: 1 } },
  cues: BEATS.map((b) => ({
    id: b.id,
    narrator: "guide",
    text: b.text,
    at: SCENES.start(b.id) / FPS + 0.7,
    duration: SCENES.duration(b.id) / FPS - 1.2,
  })),
});
