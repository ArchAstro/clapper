import {
  Animate,
  Click,
  Easing,
  Img,
  type StyleValue,
  staticFile,
  typedLength,
  useBlink,
  useFps,
  useFrame,
} from "@clapper/core";
import { type CSSProperties, type ReactNode, useMemo } from "react";

/* Shared visual vocabulary for the Intern promo, mirroring the landing page's
   mock components (site-frame, chips, kicker, etc.). */

export const EASE = Easing.outExpo;

export function Wordmark({
  size = 44,
  color = "var(--ink)",
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32, color, ...style }}>
      <Img
        src={staticFile("intern-icon.svg")}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
      <span style={{ fontSize: size * 0.72, fontWeight: 600, letterSpacing: "-0.01em" }}>Intern</span>
    </div>
  );
}

export function Kicker({
  children,
  color = "var(--accent)",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Chip({
  children,
  dark = false,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 22px",
        borderRadius: 999,
        background: dark ? "var(--dark-ink)" : "var(--ink)",
        color: dark ? "var(--dark)" : "var(--dark-ink)",
        fontSize: 26,
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Browser window chrome, like the landing page's `.site-frame`. */
export function SiteFrame({
  url,
  width = 1100,
  children,
  lock = true,
  style,
  bodyStyle,
}: {
  url: string;
  width?: number;
  children: ReactNode;
  lock?: boolean;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        background: "var(--paper)",
        border: "1px solid var(--line)",
        boxShadow: "0 30px 80px rgba(27,24,17,0.18), 0 2px 6px rgba(27,24,17,0.06)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 22px",
          borderBottom: "1px solid var(--line)",
          background: "var(--paper-high)",
        }}
      >
        {["#e9e9e4", "#e9e9e4", "#e9e9e4"].map((c, i) => (
          <span
            key={i}
            style={{ width: 12, height: 12, borderRadius: 999, background: c, border: "1px solid #d8d8d0" }}
          />
        ))}
        <span
          className="mono"
          style={{
            marginLeft: 12,
            flex: 1,
            fontSize: 21,
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {lock && <LockGlyph />}
          {url}
        </span>
      </div>
      <div style={{ padding: 36, position: "relative", ...bodyStyle }}>{children}</div>
    </div>
  );
}

export function LockGlyph({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      aria-hidden
    >
      <rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6" />
      <path d="M5.7 7V5.3a2.3 2.3 0 0 1 4.6 0V7" />
    </svg>
  );
}

export function Dot({
  color = "var(--accent-soft)",
  size = 14,
  pulse = true,
}: {
  color?: string;
  size?: number;
  pulse?: boolean;
}) {
  const frame = useFrame();
  const fps = useFps();
  const t = (frame / fps) % 1.6;
  const ring = pulse ? Math.min(1, t / 1.2) : 0;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      {pulse && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `2px solid ${color}`,
            transform: `scale(${1 + ring * 1.8})`,
            opacity: 1 - ring,
          }}
        />
      )}
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: color }} />
    </span>
  );
}

/** Registers a click sound for every character a <Typewriter> with the same props types. */
export function TypeClicks({
  text,
  at = 0,
  cps = 30,
  duration,
  jitter = 0.35,
  every = 1,
  volume = 0.1,
}: {
  text: string;
  at?: number;
  cps?: number;
  duration?: number;
  jitter?: number;
  every?: number;
  volume?: number;
}) {
  const fps = useFps();
  const frames = useMemo(() => {
    const total = duration ?? Math.ceil((text.length / cps) * fps);
    const out: number[] = [];
    let prev = 0;
    for (let f = at; f <= at + total + 1; f++) {
      const n = typedLength({ text, frame: f, fps, at, cps, duration, jitter });
      if (n > prev) {
        if (text[n - 1] !== " " && (n - 1) % every === 0) out.push(f);
        prev = n;
      }
    }
    return out;
  }, [text, at, cps, duration, jitter, every, fps]);
  return (
    <>
      {frames.map((f, i) => (
        <Click
          key={f}
          at={f}
          volume={volume * (0.85 + ((i * 7) % 4) * 0.05)}
          freq={2000 + ((i * 13) % 5) * 180}
          name={`type-${i}`}
        />
      ))}
    </>
  );
}

/** Fade + rise entrance shorthand. */
export function Rise({
  at = 0,
  duration = 24,
  y = 28,
  children,
  style,
  exitAt,
  className,
  spring,
}: {
  at?: number;
  duration?: number;
  y?: number;
  children: ReactNode;
  style?: CSSProperties;
  exitAt?: number;
  className?: string;
  spring?: "wobbly" | "gentle" | "snappy" | "smooth" | "stiff";
}) {
  return (
    <Animate
      from={{ opacity: 0, y }}
      at={at}
      duration={duration}
      easing={EASE}
      spring={spring}
      exit={exitAt !== undefined ? { opacity: 0, y: -y * 0.6 } : undefined}
      exitAt={exitAt}
      style={style}
      className={className}
    >
      {children}
    </Animate>
  );
}

/** A soft paper background with the landing page's warm gradient. */
export function Paper({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="promo"
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #ffffff 0%, #fafaf8 60%, #f3f2ec 100%)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Dark({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="promo"
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(120% 90% at 30% 20%, #221e14 0%, #15130c 60%, #0f0e09 100%)",
        color: "var(--dark-ink)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Caret() {
  const on = useBlink(1.1, 0.55);
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.6em",
        height: "1em",
        verticalAlign: "-0.12em",
        background: "currentColor",
        opacity: on,
      }}
    />
  );
}

export const fromValues = (v: Record<string, StyleValue>) => v;
