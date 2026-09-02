import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ImgHTMLAttributes, type VideoHTMLAttributes } from "react";
import { continueRender, delayRender } from "./registry";
import { Audio } from "./audio";
import { useFps, useFrame, useRenderMode } from "./timeline";

/** Resolve a file in your project's `public/` folder. */
export function staticFile(path: string): string {
  return "/" + path.replace(/^\.?\//, "");
}

/** <img> that blocks the frame capture until it has decoded. */
export function Img({ src, style, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    if (el.complete && el.naturalWidth > 0) return;
    const h = delayRender(`img ${src}`);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(h);
    };
    el.addEventListener("load", finish, { once: true });
    el.addEventListener("error", finish, { once: true });
    return () => finish();
  }, [src]);
  return <img ref={ref} src={src} style={style} {...rest} />;
}

export interface VideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay" | "controls"> {
  src: string;
  /** Seconds to skip into the file. */
  startFrom?: number;
  playbackRate?: number;
  /** Mix the file's own audio into the render (default true). The <video> element itself is always muted in the harness. */
  audio?: boolean;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * <video> whose currentTime is a function of the frame, so renders are
 * deterministic. Audio of the video is NOT mixed; pair with <Audio src={sameFile}/>.
 */
export function Video({ src, startFrom = 0, playbackRate = 1, audio = true, volume = 1, fadeIn = 0, fadeOut = 0, style, ...rest }: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const frame = useFrame();
  const fps = useFps();
  const target = startFrom + (frame / fps) * playbackRate;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = delayRender(`video seek ${src}@${target.toFixed(3)}`);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(h);
    };
    const seek = () => {
      if (Math.abs(el.currentTime - target) < 1 / (fps * 2)) return finish();
      el.addEventListener("seeked", finish, { once: true });
      el.currentTime = target;
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });
    el.addEventListener("error", finish, { once: true });
    return () => finish();
  }, [src, target, fps]);
  return (
    <>
      {audio && <Audio src={src} startFrom={startFrom} playbackRate={playbackRate} volume={volume} fadeIn={fadeIn} fadeOut={fadeOut} name={`video ${src.split("/").pop()}`} />}
      <video ref={ref} src={src} muted playsInline preload="auto" style={style} {...rest} />
    </>
  );
}

/** Load a font from a URL and block rendering until it is ready. */
export function useFont(family: string, url: string, descriptors?: FontFaceDescriptors) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const already = [...document.fonts].some((f) => f.family === family && (!descriptors?.weight || f.weight === descriptors.weight) && (!descriptors?.style || f.style === descriptors.style));
    if (already) return;
    const h = delayRender(`font ${family}`);
    const face = new FontFace(family, `url(${url})`, descriptors);
    face
      .load()
      .then((f) => document.fonts.add(f))
      .catch((e) => console.error(e))
      .finally(() => continueRender(h));
  }, [family, url, descriptors]);
}

/** In preview mode, returns true so components can render live-only UI. */
export function useIsPreview(): boolean {
  return useRenderMode() === "preview";
}

export const fillStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
