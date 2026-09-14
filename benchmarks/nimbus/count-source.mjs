// Count all authored visual source, not just the short entry file. Setup and assets are separate.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter(
          (e) => !["node_modules", "out", "assets", "public", ".studio", ".thumbnails"].includes(e.name),
        )
        .map(async (e) => (e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name))),
    )
  ).flat();
}
for (const engine of ["rendiv", "hyperframes"]) {
  const source = (await files(path.join(root, engine))).filter((f) => /\.(tsx?|jsx?|html|css)$/.test(f));
  let lines = 0,
    bytes = 0;
  for (const f of source) {
    const s = await readFile(f, "utf8");
    lines += s.trimEnd().split("\n").length;
    bytes += Buffer.byteLength(s);
  }
  console.log(`${engine}: ${source.length} visual source files, ${lines} lines, ${bytes} bytes`);
}
console.log(
  "Shared design/content: shared/data.js + shared/theme.css; setup: prepare.mjs; verification: verify.mjs.",
);
console.log(
  "Clapper comparison must also account for its reusable primitives, kit.tsx, CSS, and synthesized audio API.",
);
