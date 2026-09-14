// GSAP owns seeking; these curves match Nimbus's original art direction.
const { gsap, CustomEase } = window;
gsap.registerPlugin(CustomEase);
export const EXPO = CustomEase.create("nimbus-expo", "0.23,1,0.32,1");
export const QUINT = CustomEase.create("nimbus-quint", "0.22,1,0.36,1");
export const INOUT = CustomEase.create("nimbus-inout", "0.83,0,0.17,1");
export const BACK = CustomEase.create("nimbus-back", "0.34,1.56,0.64,1");
export const INCUBIC = CustomEase.create("nimbus-in", "0.32,0,0.67,0");
export const progress = (f, at, duration, ease = (x) => x) =>
  ease(Math.max(0, Math.min(1, (f - at) / duration)));
export const glow = (color, size = 18) => `drop-shadow(0 0 ${size}px ${color})`;
export function svg(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
export function reveals(scene, tl) {
  for (const mask of scene.querySelectorAll(".reveal")) {
    tl.fromTo(
      mask.firstElementChild,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: Number(mask.dataset.revealDuration ?? 26) / 30,
        ease: QUINT,
      },
      Number(mask.dataset.at) / 30,
    );
  }
}
export function letters(el, tl, at, each, duration, y, blur) {
  const chars = [...el.textContent];
  el.textContent = "";
  for (const ch of chars) {
    const span = document.createElement("span");
    span.textContent = ch;
    span.style.display = "inline-block";
    el.append(span);
  }
  tl.fromTo(
    el.children,
    { opacity: 0, y, filter: `blur(${blur}px)` },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      stagger: each / 30,
      duration: duration / 30,
      ease: QUINT,
    },
    at / 30,
  );
}

export const INOUTCUBIC = CustomEase.create("nimbus-inout-cubic", "0.65,0,0.35,1");
