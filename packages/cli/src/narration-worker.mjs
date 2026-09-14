// Optional engine dependencies live only in the downloaded runtime, never Clapper's bundle.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

async function main() {
  const [runtime, modelDir, requestFile, outputFile] = process.argv.slice(2);
  const require = createRequire(path.join(runtime, "package.json"));
  const { KokoroTTS, TextSplitterStream } = require("kokoro-js");
  const { env } = require("@huggingface/transformers");
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  const tts = await KokoroTTS.from_pretrained(modelDir, { dtype: "q8", device: "cpu" });
  // Reject oversized phoneme sequences before inference: upstream otherwise silently truncates.
  const tokenizer = tts.tokenizer;
  tts.tokenizer = (text) => {
    const result = tokenizer(text, { truncation: false });
    if (result.input_ids.dims.at(-1) > 510)
      throw new Error("Narration sentence exceeds 510 tokens; split it into shorter sentences/cues.");
    return result;
  };
  const requests = JSON.parse(fs.readFileSync(requestFile, "utf8"));
  const results = [];
  try {
    for (const request of requests) {
      const chunks = [];
      const text = new TextSplitterStream();
      text.push(request.text);
      text.close();
      for await (const { audio } of tts.stream(text, { voice: request.voice, speed: request.speed })) {
        if (audio.sampling_rate !== 24000 || !audio.audio.length || !audio.audio.every(Number.isFinite))
          throw new Error(`Invalid generated audio: ${request.id}`);
        chunks.push(audio.audio);
      }
      const samples = chunks.reduce((n, c) => n + c.length, 0);
      if (!samples) throw new Error(`Empty narration: ${request.id}`);
      const pcm = Buffer.alloc(samples * 4);
      let index = 0,
        peak = 0;
      for (const chunk of chunks)
        for (const sample of chunk) {
          peak = Math.max(peak, Math.abs(sample));
          pcm.writeFloatLE(sample, index++ * 4);
        }
      if (peak < 0.00001) throw new Error(`Silent narration: ${request.id}`);
      fs.writeFileSync(request.output, pcm);
      results.push({ id: request.id, durationSeconds: samples / 24000 });
    }
    fs.writeFileSync(outputFile, JSON.stringify(results));
  } finally {
    await tts.model.dispose();
  }
}
try {
  await main();
} catch (error) {
  console.error(`Narration synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
