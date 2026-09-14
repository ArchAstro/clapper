import { useFrame } from "@rendiv/core";
// Same deterministic character timing as the reference, including pauses on spaces/punctuation.
export function Typed({ text, at, cursor = false }: { text: string; at: number; cursor?: boolean }) {
  const frame = useFrame();
  const duration = Math.ceil((text.length / 110) * 30);
  const weights = [...text].map((ch, i) => {
    const h = Math.sin(i * 12.9898 + ch.charCodeAt(0) * 78.233) * 43758.5453;
    return 1 + (h - Math.floor(h) - 0.5) * 0.7 + (ch === " " ? 0.5 : 0) + (".,!?".includes(ch) ? 1.5 : 0);
  });
  const budget = ((frame - at) / Math.max(1, duration)) * weights.reduce((a, b) => a + b, 0);
  let used = 0;
  let length = 0;
  for (const weight of weights) {
    used += weight;
    if (used > budget) break;
    length++;
  }
  if (frame >= at + duration) length = text.length;
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {text.slice(0, length)}
      {cursor && (
        <span
          className="caret"
          style={{
            opacity: Math.floor(((frame - at) / 30) * 2.2) % 2 === 0 ? 1 : 0,
          }}
        />
      )}
    </span>
  );
}
