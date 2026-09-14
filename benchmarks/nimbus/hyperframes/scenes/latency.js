import { EXPO, glow, INCUBIC, progress } from "../motion.js";
export function latency(scene, tl) {
  const metrics = ["p50", "p95", "p99"].map((label, i) => {
    const block = document.createElement("div");
    block.innerHTML = `<div class="metric-label">${label}</div><div style="font-size:60px"><span class="value"></span><span style="font-size:24px;color:var(--muted)"> ms</span></div>`;
    scene.querySelector(".latency-stats").append(block);
    tl.fromTo(
      block,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 18 / 30, ease: EXPO },
      (10 + i * 5) / 30,
    );
    return block.querySelector(".value");
  });
  const bars = Array.from({ length: 28 }, () => {
    const bar = document.createElement("div");
    bar.className = "bar";
    scene.querySelector(".bars").append(bar);
    return bar;
  });
  tl.fromTo(scene.querySelector(".slo"), { opacity: 0 }, { opacity: 1, duration: 12 / 30, ease: "none" }, 1);
  // GSAP's back easing supplies the badge's slight overshoot; Rendiv uses a native spring.
  tl.fromTo(
    scene.querySelector(".alert"),
    { opacity: 0, y: 16, scale: 0.9 },
    { opacity: 1, y: 0, scale: 1, duration: 14 / 30, ease: "back.out(1.2)" },
    58 / 30,
  );
  tl.to(scene.querySelector(".alert"), { opacity: 0, y: -10, duration: 15 / 30, ease: INCUBIC }, 92 / 30);
  tl.fromTo(
    scene.querySelector(".recovered"),
    { opacity: 0, y: 16, scale: 0.9 },
    { opacity: 1, y: 0, scale: 1, duration: 16 / 30, ease: "back.out(1.2)" },
    100 / 30,
  );
  return (f) => {
    const spike = f < 58 ? progress(f, 44, 14, EXPO) : 1 - progress(f, 100, 26, EXPO);
    metrics[0].textContent = Math.round(41 * progress(f, 10, 60, EXPO));
    metrics[1].textContent = Math.round(118 * progress(f, 15, 60, EXPO));
    metrics[2].textContent = Math.round(88 + spike * 236);
    metrics[2].parentElement.style.color = spike > 0.5 ? "var(--magenta)" : "var(--green)";
    bars.forEach((bar, i) => {
      const base = 0.25 + 0.35 * Math.abs(Math.sin(i * 0.8 + 1.3));
      const hot = i >= 19 && i <= 24 ? spike * (0.5 + 0.1 * Math.sin(i)) : 0;
      const isHot = hot > 0.15;
      Object.assign(bar.style, {
        height: `${Math.min(1, base + hot) * progress(f, 8 + i * 2, 24, EXPO) * 100}%`,
        background: isHot ? "var(--magenta)" : "var(--cyan)",
        opacity: isHot ? 0.95 : 0.55,
        filter: isHot ? glow("var(--magenta)", 14) : "none",
      });
    });
    scene.querySelector(".alert-dot").style.opacity = f % 12 < 6 ? 1 : 0.3;
  };
}
