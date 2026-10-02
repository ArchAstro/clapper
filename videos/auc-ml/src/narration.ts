import { defineNarration } from "@archastro/clapper-core/narration/models";
import beats from "./beats.json";
import { FPS, LINES, SCENES } from "./plan";

// One natural take per scene. Sentence onsets inside each take are measured
// (prepare-timing.mjs) so diagram steps can land on the sentence that explains them.
export default defineNarration({
  title: "AUC in machine learning — from intuition to mathematics",
  narrators: { guide: { voice: "af_heart", speed: 1 } },
  cues: (beats as { id: string; text?: string }[])
    .filter((b) => b.text)
    .map((b) => {
      const take = LINES[b.id].take!;
      return {
        id: b.id,
        narrator: "guide",
        text: b.text!,
        at: SCENES.start(b.id) / FPS + take.at,
        duration: take.dur + 0.3,
      };
    }),
});
