/** Narration uses seconds, independently of musical beats and video frame rate. */
export interface Narrator {
  voice: string;
  speed?: number;
}
export interface NarrationCue {
  id: string;
  narrator: string;
  text: string;
  /** Start in seconds, local to NarrationAudio's enclosing scene/sequence. */
  at: number;
  /** Available speech window; overflowing takes fail instead of being truncated. */
  duration: number;
}
export interface NarrationScript {
  title: string;
  narrators: Record<string, Narrator>;
  cues: NarrationCue[];
}
export interface CompiledNarration {
  schema: 1;
  title: string;
  narrators: Record<string, Required<Narrator>>;
  cues: NarrationCue[];
  durationSeconds: number;
}
const validId = (s: string) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9_-]+$/.test(s) &&
  !["__proto__", "constructor", "prototype"].includes(s);
export function compileNarration(script: NarrationScript): CompiledNarration {
  if (
    !script ||
    typeof script.title !== "string" ||
    !script.title.trim() ||
    !script.narrators ||
    !Array.isArray(script.cues) ||
    !script.cues.length
  )
    throw new Error("Narration requires a title, narrators and nonempty cues");
  const narrators: CompiledNarration["narrators"] = {};
  for (const [id, value] of Object.entries(script.narrators).sort(([a], [b]) => a.localeCompare(b))) {
    if (!validId(id) || !value || !validId(value.voice)) throw new Error(`Invalid narrator ${id}`);
    for (const key of Object.keys(value))
      if (!["voice", "speed"].includes(key)) throw new Error(`${id}: unsupported narrator field ${key}`);
    const speed = value.speed ?? 1;
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 2)
      throw new Error(`Invalid speed for ${id}: expected 0.5–2`);
    narrators[id] = { voice: value.voice, speed };
  }
  const ids = new Set<string>();
  const cues = script.cues
    .map((cue) => {
      if (!cue || !validId(cue.id) || ids.has(cue.id))
        throw new Error("Invalid or duplicate narration cue id");
      ids.add(cue.id);
      if (!Object.hasOwn(narrators, cue.narrator)) throw new Error(`Unknown narrator ${cue.narrator}`);
      for (const key of Object.keys(cue))
        if (!["id", "narrator", "text", "at", "duration"].includes(key))
          throw new Error(`${cue.id}: unsupported cue field ${key}; voices and delivery belong to narrators`);
      if (typeof cue.text !== "string" || !cue.text.trim()) throw new Error(`${cue.id}: text is empty`);
      if (!Number.isFinite(cue.at) || cue.at < 0 || !Number.isFinite(cue.duration) || cue.duration <= 0)
        throw new Error(`${cue.id}: invalid timing`);
      return {
        id: cue.id,
        narrator: cue.narrator,
        text: cue.text.trim(),
        at: cue.at,
        duration: cue.duration,
      };
    })
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  for (let i = 1; i < cues.length; i++)
    if (cues[i].at < cues[i - 1].at + cues[i - 1].duration)
      throw new Error(`Narration windows overlap: ${cues[i - 1].id}, ${cues[i].id}`);
  return {
    schema: 1,
    title: script.title,
    narrators,
    cues,
    durationSeconds: Math.max(...cues.map((c) => c.at + c.duration)),
  };
}
export function defineNarration(script: NarrationScript): NarrationScript {
  compileNarration(script);
  return script;
}
export function narrationId(script: NarrationScript): string {
  const text = JSON.stringify(compileNarration(script));
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}
export const narrationAsset = (script: NarrationScript) => `/.clapper-narration/${narrationId(script)}.wav`;
