import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo, type CSSProperties } from "react";

/**
 * Render LaTeX with KaTeX. Import from "@clapper/core/latex".
 *   <Latex display>{String.raw`\int_0^1 x^2\,dx = \tfrac13`}</Latex>
 */
export function Latex({ children, math, display = false, style, className, color, fontSize }: { children?: string; math?: string; display?: boolean; style?: CSSProperties; className?: string; color?: string; fontSize?: number | string }) {
  const src = math ?? children ?? "";
  const html = useMemo(() => katex.renderToString(src, { displayMode: display, throwOnError: false, output: "html" }), [src, display]);
  return <span className={className} style={{ color, fontSize, display: display ? "block" : "inline-block", ...style }} dangerouslySetInnerHTML={{ __html: html }} />;
}
