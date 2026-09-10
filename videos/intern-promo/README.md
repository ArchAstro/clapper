# tryintern.dev promo

`intern-film` is the 38-second brand film: one frozen Friday launch deck transforms into a living Tuesday Launch Room, proving persistent data, company privacy, and human-agent collaboration in one continuous story.

"Send a site, not a deck." 1920×1080 @ 30 fps, ~57 s, eight scenes (`src/scenes/`), transitions between them, synthesized
sound (pads per scene, chimes on beats, typewriter clicks). Brand tokens, fonts (Instrument Serif / Schibsted Grotesk /
Fragment Mono) and copy were adapted from the product's public branding. This example is self-contained and does not require another repository or a live service.

```bash
pnpm preview   # studio
pnpm render    # out/intern-promo.mp4
```

| # | Scene | Beat |
| - | --- | --- |
| 1 | deck | dark; a pile of v7_FINAL_final decks fans in — "Another doc nobody reopens." |
| 2 | tagline | paper; wordmark, hero art, "Send a site, *not a deck*" |
| 3 | prompt | Claude chat: the on-call prompt is typed (clicks), reply "Published to oncall.acme.tryintern.dev", camera zooms to the URL |
| 4 | site | the on-call site assembles in a browser frame; "A real site, ready from the first click." + checklist |
| 5 | features | camera pans across three panels: forms/dashboards (bars, counter), shared Markdown (human cursors + agent), privacy (toggle → Globex) |
| 6 | connect | agent chips spring in; terminal types `claude mcp add … https://tryintern.dev/mcp` |
| 7 | pricing | "$19/month for the whole company", plan cards |
| 8 | end card | logo, tryintern.dev, tagline, fade out |
