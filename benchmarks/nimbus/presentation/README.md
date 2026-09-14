# Reveal comparison figure

A code-focused screenshot styled to match the supplied Substack reference:
warm cream `#f0ebe1`, dark ink `#46423a`, serif headings, distinct syntax
colors for tags, functions, props, keywords, strings, numbers, and variables, and three plain columns. No cards, motion strip, or explanatory panels.

Render from the repository root after installing the Rendiv example:

```fish
astroshot react benchmarks/nimbus/presentation/reveal-comparison.fixture.tsx --config benchmarks/nimbus/presentation/react-shot.config.ts -o benchmarks/nimbus/out/reveal-comparison-substack-highlighted.png
```

- Astroshot React fixture; **1800 × 1067 PNG**, cropped to `[data-figure]`.
- Readiness: “The same text reveal, three ways.” is visible.
- Checked all code columns and footer for clipping and readability.
- Excerpts are simplified; imports, typography, and shared clipping-mask CSS
  are omitted and disclosed in the image. The Rendiv progress helper is inlined
  to keep the comparison in one code column.

Alt text: “Code for the same masked text reveal in Clapper, Rendiv, and
HyperFrames. Clapper uses its built-in Reveal component. Rendiv adds a reusable
React helper using interpolation. HyperFrames connects HTML timing attributes
to a GSAP timeline.”
