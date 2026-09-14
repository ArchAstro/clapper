import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { engineIdentity, sha256, voice } from "../../../packages/cli/src/voices.ts";
import { BEATS } from "../src/beats.ts";

const narrator = { voice: "af_heart", speed: 1 };
const timing = {};
for (const beat of BEATS) {
  const key = sha256(
    JSON.stringify({
      engine: engineIdentity,
      narrator,
      embedding: voice(narrator.voice).sha256,
      text: beat.text.trim(),
    }),
  );
  const metadata = new URL(`../.clapper/narration/takes/${key}.f32.json`, import.meta.url);
  timing[beat.id] = fs.existsSync(metadata)
    ? Math.ceil((JSON.parse(fs.readFileSync(metadata, "utf8")).durationSeconds + 2.2) * 2) / 2
    : Math.ceil(beat.text.split(/\s+/).length / 1.7 + 4);
}
fs.writeFileSync(new URL("../src/timing.json", import.meta.url), JSON.stringify(timing, null, 2) + "\n");
console.log(
  "Timing:",
  fileURLToPath(new URL("../src/timing.json", import.meta.url)),
  "Total seconds:",
  Object.values(timing).reduce((a, b) => a + b, 0),
);
