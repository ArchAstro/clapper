import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const showcase = path.resolve(root, "../../videos/showcase/src");
// Copy assets into each framework's ordinary static directory. No shared renderer.
const target = process.argv[2];
if (target && !["rendiv", "hyperframes"].includes(target)) throw new Error("Expected rendiv or hyperframes");
const dirs =
  target === "rendiv"
    ? ["rendiv/public/assets"]
    : target === "hyperframes"
      ? ["hyperframes/assets"]
      : ["rendiv/public/assets", "hyperframes/assets"];
for (const dir of dirs) {
  const dest = path.join(root, dir);
  await mkdir(dest, { recursive: true });
  await cp(path.join(root, "shared"), dest, { recursive: true });
  await cp(path.join(showcase, "fonts"), path.join(dest, "fonts"), {
    recursive: true,
  });
}
console.log("Prepared Nimbus fonts, design tokens, data, and reference soundtrack.");

for (const file of target === "rendiv" ? [] : ["gsap.min.js", "CustomEase.min.js"]) {
  await cp(
    path.join(root, "hyperframes/node_modules/gsap/dist", file),
    path.join(root, "hyperframes/assets", file),
  );
}
