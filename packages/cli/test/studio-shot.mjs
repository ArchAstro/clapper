// Screenshot the studio at a URL after optional key presses. Usage: node test/studio-shot.mjs <url> <out.png> [keys…]
import { chromium } from "playwright";

const [url, out, ...keys] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
for (const k of keys) {
  await p.keyboard.press(k);
  await p.waitForTimeout(300);
}
await p.screenshot({ path: out });
console.log(`${out}  url now: ${p.url()}`);
await b.close();
