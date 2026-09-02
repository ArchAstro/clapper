# video template

Copy this folder to `videos/<name>` and rename the package.

1. `src/data.ts` — every number and string the copy uses.
2. `src/index.tsx` — `defineScenes()` owns the timing; scenes are components; `<Score/>` is the one place sound lives.
3. `src/theme.css` — tokens (`--bg`, `--fg`, `--accent`, `--display`, `--mono`) on a root class.
4. `public/` — fonts, images, audio (`staticFile("x.png")`).

Loop: `pnpm preview` → `pnpm still -- --scene hook` → `pnpm review` (read `out/review/spot/brief.md`, hand it to a reviewer) → `pnpm render`.
Format variants: `agenticvids render src/index.tsx -c spot@9:16`.
