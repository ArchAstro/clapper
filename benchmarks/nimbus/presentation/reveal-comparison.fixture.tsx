import type { ReactNode } from "react";
import "./reveal-comparison.css";

const scene = `<Reveal at={6} duration={30}>
  Every hop.
</Reveal>`;

const helper = `function Reveal({
  children, at, duration
}) {
  const p = interpolate(
    useFrame(),
    [at, at + duration], [0, 1],
    {
      easing: QUINT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  return (
    <div className="reveal">
      <span style={{ transform:
        \`translateY(\${(1-p)*110}%)\`
      }}>
        {children}
      </span>
    </div>
  );
}`;

const html = `<div class="reveal"
  data-at="6"
  data-reveal-duration="30">
  <span>Every hop.</span>
</div>`;

const gsap = `for (const el of
  scene.querySelectorAll(".reveal")) {
  tl.fromTo(
    el.firstElementChild,
    { yPercent: 110 },
    {
      yPercent: 0,
      duration: Number(
        el.dataset.revealDuration
      ) / 30,
      ease: QUINT
    },
    Number(el.dataset.at) / 30
  );
}`;

// Tokenize the small displayed excerpts, including expressions inside template strings.
function highlight(line: string): ReactNode[] {
  const tokens = /"[^"\n]*"|`[^`]*`|[A-Za-z_$][\w$]*(?:-[\w$]+)*|\b\d+(?:\.\d+)?\b|[<>{}()[\]=:+*/.,;-]/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of line.matchAll(tokens)) {
    const token = match[0];
    const at = match.index;
    nodes.push(line.slice(cursor, at));
    const before = line.slice(0, at);
    const after = line.slice(at + token.length);
    const cls =
      token.startsWith('"') || token.startsWith("`")
        ? "string"
        : /^(function|const|return|for|of)$/.test(token)
          ? "keyword"
          : /^\d/.test(token)
            ? "number"
            : /<\/?$/.test(before)
              ? "tag"
              : /^\s*\(/.test(after)
                ? "function"
                : /^[A-Z_]+$/.test(token)
                  ? "constant"
                  : /^[A-Za-z_$]/.test(token) && (/^\s*[=:]/.test(after) || /\.$/.test(before))
                    ? "property"
                    : /^(children|at|duration|p|el|scene|tl)$/.test(token)
                      ? "variable"
                      : /^[<>{}()[\]=:+*/.,;-]$/.test(token)
                        ? "punctuation"
                        : "";
    const contents = token.startsWith("`")
      ? token.split(/(\$\{[^}]*\})/g).map((part, i) =>
          part.startsWith("${") ? (
            <span key={i}>
              <span className="punctuation">{"${"}</span>
              {highlight(part.slice(2, -1))}
              <span className="punctuation">{"}"}</span>
            </span>
          ) : (
            part
          ),
        )
      : token;
    nodes.push(
      <span className={cls} key={at}>
        {contents}
      </span>,
    );
    cursor = at + token.length;
  }
  nodes.push(line.slice(cursor));
  return nodes;
}
function Syntax({ code }: { code: string }) {
  return (
    <pre>
      {code.split("\n").map((line, i) => (
        <div className="code-line" key={i}>
          <code>{highlight(line)}</code>
        </div>
      ))}
    </pre>
  );
}
function Figure() {
  return (
    <main data-figure>
      <div className="columns">
        <section>
          <h2>Clapper</h2>
          <p className="description">Built-in component</p>
          <Syntax code={scene} />
        </section>
        <section>
          <h2>Rendiv</h2>
          <p className="description">Custom React helper</p>
          <Syntax code={scene} />
          <div className="section-break" />
          <Syntax code={helper} />
        </section>
        <section>
          <h2>HyperFrames</h2>
          <p className="description">HTML + GSAP</p>
          <Syntax code={html} />
          <div className="section-break" />
          <Syntax code={gsap} />
        </section>
      </div>
      <footer>
        <p>The same text reveal, three ways.</p>
        <small>Simplified excerpts. Imports, typography, and shared clipping-mask CSS omitted.</small>
      </footer>
    </main>
  );
}
export default {
  width: 1800,
  height: 1200,
  background: "#f0ebe1",
  selector: "[data-figure]",
  waitFor: "text=The same text reveal, three ways.",
  component: <Figure />,
};
