import { LOG } from "../assets/data.js";
import { EXPO, INOUT, progress } from "../motion.js";
export function trace(scene, tl) {
  const terminal = scene.querySelector(".terminal");
  const fields = [];
  const rows = LOG.map((row, i) => {
    const el = document.createElement("div");
    el.className = "log-row mono";
    const highlight = i === 5,
      error = row[1] === "504";
    Object.assign(el.style, {
      color: highlight ? "#fff" : "var(--muted)",
      borderLeftColor: highlight ? "var(--magenta)" : "transparent",
    });
    row.forEach((text, col) => {
      const span = document.createElement("span");
      if (col === 1) span.style.color = error || row[1] === "trace" ? "var(--magenta)" : "var(--green)";
      if (col === 2) {
        span.style.whiteSpace = "pre";
        if (highlight) span.style.color = "var(--ink)";
      }
      if (col >= 3) span.style.textAlign = "right";
      if (col === 3 && error) span.style.color = "var(--magenta)";
      const content = document.createTextNode("");
      span.append(content);
      el.append(span);
      // Precompute the reference's jittered typing thresholds once; seeking is stateless.
      let sum = 0;
      const weights = [...text].map((ch, j) => {
        const h = Math.sin(j * 12.9898 + ch.charCodeAt(0) * 78.233) * 43758.5453;
        const w =
          1 + (h - Math.floor(h) - 0.5) * 0.7 + (ch === " " ? 0.5 : 0) + (".,!?".includes(ch) ? 1.5 : 0);
        sum += w;
        return sum;
      });
      const at = [6, 9, 11, 13, 14][col] + i * 9;
      const duration = Math.ceil((text.length / 110) * 30);
      let caret;
      if (i === LOG.length - 1 && col === 2) {
        caret = document.createElement("span");
        caret.className = "caret";
        span.append(caret);
      }
      fields.push({
        text,
        content,
        at,
        duration,
        thresholds: weights.map((w) => w / sum),
        caret,
      });
    });
    terminal.append(el);
    return el;
  });
  tl.fromTo(
    scene.querySelector(".callout"),
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 16 / 30, ease: EXPO },
    110 / 30,
  );
  const camera = scene.querySelector(".camera");
  return (f) => {
    const cameraProgress = progress(f, 84, 30, INOUT),
      push = progress(f, 84, 24, INOUT);
    camera.style.transform = `translate(960px,540px) scale(${Math.pow(1.07, cameraProgress)}) translate(-960px,${-540 - 20 * cameraProgress}px)`;
    rows.forEach((row, i) => {
      row.style.opacity = i === 5 ? 1 : 1 - 0.6 * push;
      if (i === 5)
        Object.assign(row.style, {
          background: `rgba(255,62,165,${0.12 + 0.14 * push})`,
          textShadow: `0 0 ${14 * push}px rgba(255,62,165,${0.6 * push})`,
          filter: `brightness(${1 + 0.15 * push})`,
        });
    });
    fields.forEach(({ text, content, at, duration, thresholds, caret }) => {
      const p = (f - at) / Math.max(1, duration);
      const n = f >= at + duration ? text.length : thresholds.filter((t) => t <= p).length;
      content.textContent = text.slice(0, n);
      if (caret) caret.style.opacity = Math.floor(((f - at) / 30) * 2.2) % 2 === 0 ? 1 : 0;
    });
  };
}
