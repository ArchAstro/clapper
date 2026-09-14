import { Easing, interpolate } from "@rendiv/core";
// Match Nimbus's authored curves using Rendiv's native bezier evaluator.
export const EXPO = Easing.bezier(0.23, 1, 0.32, 1);
export const QUINT = Easing.bezier(0.22, 1, 0.36, 1);
export const INOUT = Easing.bezier(0.83, 0, 0.17, 1);
export const BACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const INCUBIC = Easing.bezier(0.32, 0, 0.67, 0);
export const tween = (f: number, at: number, duration: number, ease = Easing.linear) =>
  interpolate(f, [at, at + duration], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
export const glow = (color: string, size = 18) => ({
  filter: `drop-shadow(0 0 ${size}px ${color})`,
});

export const INOUTCUBIC = Easing.bezier(0.65, 0, 0.35, 1);
