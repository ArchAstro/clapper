import { EDGES, NODES } from "../assets/data.js";
import { BACK, EXPO, glow, INOUT, progress, svg } from "../motion.js";
export function graph(scene, tl) {
  const canvas = scene.querySelector("svg");
  const camera = scene.querySelector(".camera");
  EDGES.forEach(([a, b], i) => {
    const line = svg("line", {
      x1: NODES[a].p[0],
      y1: NODES[a].p[1],
      x2: NODES[b].p[0],
      y2: NODES[b].p[1],
      stroke: "rgba(57,208,255,0.35)",
      "stroke-width": 2,
      pathLength: 1,
    });
    canvas.append(line);
    tl.fromTo(
      line,
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 40 / 30, ease: INOUT },
      (4 + i * 3) / 30,
    );
  });
  const packets = EDGES.flatMap(([a, b], i) =>
    [0, 1].map((k) => {
      const color = k ? "var(--magenta)" : "var(--cyan)";
      const circle = svg("circle", { r: 4, fill: color });
      circle.style.filter = glow(color, 8);
      canvas.append(circle);
      tl.fromTo(circle, { opacity: 0 }, { opacity: 1, duration: 10 / 30, ease: "none" }, (30 + i * 3) / 30);
      return { a, b, i, k, circle };
    }),
  );
  let hubRing;
  NODES.forEach((n, i) => {
    const position = svg("g", { transform: `translate(${n.p.join(" ")})` });
    const group = svg("g", {});
    group.style.filter = glow("rgba(57,208,255,0.6)", 14);
    group.append(
      svg("circle", {
        r: n.hub ? 26 : 16,
        fill: "var(--bg)",
        stroke: "var(--cyan)",
        "stroke-width": n.hub ? 4 : 3,
      }),
      svg("circle", { r: n.hub ? 9 : 5, fill: "var(--cyan)" }),
    );
    if (n.hub) {
      hubRing = svg("circle", {
        r: 44,
        fill: "none",
        stroke: "var(--cyan)",
        "stroke-width": 1.5,
      });
      group.append(hubRing);
    }
    position.append(group);
    canvas.append(position);
    tl.fromTo(
      group,
      { scale: 0, svgOrigin: "0 0" },
      { scale: 1, duration: 24 / 30, ease: BACK },
      (10 + i * 4) / 30,
    );
    const label = document.createElement("div");
    label.className = "node-label mono";
    label.textContent = n.id;
    Object.assign(label.style, {
      left: `${n.p[0] + (n.hub ? 40 : 26)}px`,
      top: `${n.p[1] - 12}px`,
      color: n.hub ? "var(--ink)" : "var(--muted)",
    });
    if (n.hub) {
      const hub = document.createElement("span");
      hub.textContent = "hub";
      hub.style.cssText = "color:var(--cyan);margin-left:12px";
      label.append(hub);
    }
    scene.querySelector(".labels").append(label);
    tl.fromTo(
      label,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 16 / 30, ease: EXPO },
      (24 + i * 4) / 30,
    );
  });
  tl.fromTo(
    scene.querySelectorAll(".graph-stats > div"),
    { opacity: 0, x: 12 },
    { opacity: 1, x: 0, stagger: 6 / 30, duration: 18 / 30, ease: EXPO },
    48 / 30,
  );
  const requests = scene.querySelector(".requests"),
    inflight = scene.querySelector(".inflight");
  return (f) => {
    const p = progress(f, 0, 195),
      zoom = Math.pow(1.28, p);
    camera.style.transform = `translate(960px,540px) scale(${zoom}) translate(${-960 - 20 * p}px,${-540 + 20 * p}px)`;
    for (const { a, b, i, k, circle } of packets) {
      const t = (f * (0.011 + (i % 3) * 0.003) + i * 0.37 + k * 0.5) % 1;
      const dir = (i + k) % 2 === 0 ? t : 1 - t;
      circle.setAttribute("cx", NODES[a].p[0] + (NODES[b].p[0] - NODES[a].p[0]) * dir);
      circle.setAttribute("cy", NODES[a].p[1] + (NODES[b].p[1] - NODES[a].p[1]) * dir);
    }
    hubRing.setAttribute("opacity", 0.35 + 0.35 * Math.sin(f / 6));
    requests.textContent = Math.round(143820 * progress(f, 48, 90, EXPO)).toLocaleString("en-US");
    inflight.textContent = Math.round(2412 * progress(f, 54, 80, EXPO)).toLocaleString("en-US");
  };
}
