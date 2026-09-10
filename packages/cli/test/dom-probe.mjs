// Probe the DOM of a composition at a frame: prints every [data-copy] element with rect/opacity/visibility.
// Usage: node test/dom-probe.mjs <entry> <compositionId> <frame> [selector]
import path from "node:path";
import { chromium } from "playwright";
import { buildHarness, serveBuilt } from "../src/bundle.ts";
import { CHROME_ARGS, openHarnessPage, probeCompositions } from "../src/render.ts";

const [entryArg, id, frameArg, selector = "[data-copy],[data-eyebrow]"] = process.argv.slice(2);
const entry = path.resolve(entryArg);
let dir = path.dirname(entry);
while (!(await import("node:fs")).existsSync(path.join(dir, "package.json"))) dir = path.dirname(dir);
const outDir = await buildHarness({ entry, projectDir: dir, mode: "harness" });
const server = await serveBuilt({ entry, projectDir: dir, mode: "harness" }, outDir);
const browser = await chromium.launch({ args: CHROME_ARGS });
try {
  const comps = await probeCompositions(server.url);
  const meta = comps.find((c) => c.id === id);
  const page = await openHarnessPage(
    browser,
    server.url,
    { width: meta.width, height: meta.height },
    1,
    (m) => console.error(m),
  );
  await page.evaluate((i) => window.__clapper.select(i, {}), id);
  await page.evaluate((n) => window.__clapper.setFrame(n), Number(frameArg));
  const rows = await page.evaluate((sel) => {
    const eff = (el) => {
      let o = 1;
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        o *= parseFloat(cs.opacity || "1");
        if (cs.visibility === "hidden" || cs.display === "none") return 0;
      }
      return o;
    };
    return Array.from(document.querySelectorAll(sel)).map((el) => {
      const r = el.getBoundingClientRect();
      const inner = el.firstElementChild ? el.firstElementChild.getBoundingClientRect() : r;
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim().slice(0, 40),
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        ix: Math.round(inner.left),
        iy: Math.round(inner.top),
        iw: Math.round(inner.width),
        ih: Math.round(inner.height),
        opacity: eff(el).toFixed(2),
        color: cs.color,
        font: cs.fontFamily.split(",")[0],
        transform: el.firstElementChild ? getComputedStyle(el.firstElementChild).transform : "",
      };
    });
  }, selector);
  console.table(rows);
} finally {
  await browser.close();
  await server.close();
}
