import { FPS, SCENES, TOTAL } from "./assets/data.js";
import { INOUT, reveals } from "./motion.js";
import { graph } from "./scenes/graph.js";
import { latency } from "./scenes/latency.js";
import { end, title } from "./scenes/titles.js";
import { trace } from "./scenes/trace.js";

const { gsap } = window;
export const timeline = gsap.timeline({ paused: true });
const build = { title, graph, latency, trace, end };
const ticks = [];
for (const [i, scene] of SCENES.entries()) {
  const el = document.getElementById(scene.name);
  const local = gsap.timeline();
  reveals(el, local);
  const tick = build[scene.name](el, local);
  if (tick) ticks.push({ start: scene.start, frames: scene.frames, tick });
  timeline.add(local, scene.start / FPS);
  timeline.set(el, { visibility: "visible" }, scene.start / FPS);
  if (i > 0)
    timeline.fromTo(
      el,
      { opacity: 0, filter: "blur(24px)" },
      { opacity: 1, filter: "blur(0px)", duration: 12 / FPS, ease: INOUT },
      scene.start / FPS,
    );
  if (i < SCENES.length - 1)
    timeline.to(
      el,
      { opacity: 0, filter: "blur(24px)", duration: 12 / FPS, ease: INOUT },
      (scene.start + scene.frames - 12) / FPS,
    );
  timeline.set(el, { visibility: "hidden" }, (scene.start + scene.frames) / FPS);
}
const tiles = Array.from({ length: 6 }, (_, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${11 + i * 17}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
});
const grid = document.querySelector(".grid"),
  grain = document.querySelector(".grain");
// Procedural effects are evaluated from GSAP's seekable clock, never wall time.
const clock = { frame: 0 };
function drawFrame() {
  const f = Math.round(clock.frame),
    drift = (f * 0.25) % 60;
  grid.style.backgroundPosition = `${-drift}px ${-drift}px`;
  grain.style.backgroundImage = tiles[f % 6];
  grain.style.backgroundPosition = `${((f * 37) % 320) - 320}px ${((f * 23) % 320) - 320}px`;
  for (const { start, frames, tick } of ticks) tick(Math.max(0, Math.min(frames, f - start)));
}
timeline.to(clock, { frame: TOTAL, duration: TOTAL / FPS, ease: "none", onUpdate: drawFrame }, 0);
timeline.seek(0);
drawFrame();
