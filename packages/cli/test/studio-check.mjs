// Manual e2e for the studio. Start `agenticvids preview <entry> --port 4399` first, then: node test/studio-check.mjs [compositionId]
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.env.STUDIO_SHOTS ?? path.join(here, "..", "..", "..", "out", "studio");
await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const id = process.argv[2] ?? "archdev3";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`http://127.0.0.1:4399/?composition=${id}&frame=440`, { waitUntil: "networkidle" });
await page.waitForSelector(".comp", { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/studio-1.png` });
// play 1 s, pause
await page.keyboard.press("Space");
await page.waitForTimeout(1000);
await page.keyboard.press("Space");
await page.waitForTimeout(300);
const tc = await page.textContent(".transport .tc:not(input)");
// overlays + a block selection + zoom
await page.keyboard.press("s");
await page.keyboard.press("c");
await page.keyboard.press("]");
await page.waitForTimeout(400);
const blocks = await page.$$(".timeline .block");
if (blocks[3]) await blocks[3].click();
await page.keyboard.press("=");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/studio-2.png` });
// scratch: compile the starter
await page.click(".tab:nth-child(3)");
await page.waitForTimeout(300);
await page.click(".scratch .btn.on");
await page.waitForSelector(".scratch .status:not(.bad)", { timeout: 60000 });
await page.waitForFunction(() => /compiled/.test(document.querySelector(".scratch .status")?.textContent ?? ""), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/studio-3.png` });
const status = await page.textContent(".scratch .status");
console.log(JSON.stringify({ id, tc, comps: await page.$$eval(".comp .id", (els) => els.map((e) => e.textContent)), lanes: await page.$$eval(".timeline .lane", (els) => els.length), blocks: blocks.length, scratch: status, errors }, null, 1));
await browser.close();
