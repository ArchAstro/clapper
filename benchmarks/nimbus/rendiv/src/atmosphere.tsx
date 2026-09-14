import { Fill, useFrame } from "@rendiv/core";

// Rasterized SVG tiles follow the reference grain's six-seed cycle.
const tiles = Array.from({ length: 6 }, (_, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${11 + i * 17}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
});
export function Grid() {
  const drift = (useFrame() * 0.25) % 60;
  return (
    <Fill>
      <div className="grid" style={{ backgroundPosition: `${-drift}px ${-drift}px` }} />
      <Fill className="radial" />
    </Fill>
  );
}
export function Atmosphere() {
  const f = useFrame();
  return (
    <>
      <Fill className="vignette" />
      <Fill
        className="grain"
        style={{
          backgroundImage: tiles[f % 6],
          backgroundPosition: `${((f * 37) % 320) - 320}px ${((f * 23) % 320) - 320}px`,
        }}
      />
    </>
  );
}
