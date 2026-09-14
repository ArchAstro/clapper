import { CLOUD } from "../assets/data.js";
import { BACK, EXPO, INCUBIC, INOUT, INOUTCUBIC, letters, svg } from "../motion.js";
export function title(scene, tl) {
  letters(scene.querySelector(".title-wordmark"), tl, 8, 4, 28, 40, 14);
  tl.fromTo(scene.querySelector(".scan"), { left: -200 }, { left: 2100, duration: 2, ease: INOUT }, 10 / 30);
  tl.fromTo(
    scene.querySelectorAll(".title-stats span"),
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 20 / 30, stagger: 5 / 30, ease: EXPO },
    54 / 30,
  );
}
export function end(scene, tl) {
  const cloud = scene.querySelector(".cloud");
  const edges = CLOUD.map((p, i) => [p, CLOUD[(i + 1) % CLOUD.length]]);
  edges.push([CLOUD[0], CLOUD[3]]);
  edges.forEach(([a, b], i) => {
    const line = svg("line", {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      stroke: "var(--cyan)",
      "stroke-width": 2.5,
      pathLength: 1,
    });
    cloud.append(line);
    tl.fromTo(
      line,
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 36 / 30, ease: INOUTCUBIC },
      (2 + i * 3) / 30,
    );
  });
  CLOUD.forEach((p, i) => {
    const dot = svg("circle", {
      cx: p[0],
      cy: p[1],
      r: 0,
      fill: "var(--cyan)",
    });
    cloud.append(dot);
    tl.to(dot, { attr: { r: 4.5 }, duration: 14 / 30, ease: BACK }, (20 + i * 3) / 30);
  });
  tl.fromTo(cloud, { scale: 0 }, { scale: 1, duration: 1, ease: "power3.out" }, 4 / 30);
  letters(scene.querySelector(".end-wordmark"), tl, 10, 3, 26, 30, 10);
  tl.to(scene.querySelector(".fade-black"), { opacity: 1, duration: 22 / 30, ease: INCUBIC }, 158 / 30);
}
