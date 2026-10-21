// bounding box of the drawing in each lens and pose at the neutral camera -> fit numbers for the camera paths
import { createRequire } from "module"; import path from "path"; import url from "url"; import fs from "fs";
const { chromium } = createRequire("/tmp/swfilm/")("playwright-core");
const here = path.dirname(url.fileURLToPath(import.meta.url));
const ev = path.resolve(here, "../.render"); fs.mkdirSync(ev + "/probe", { recursive: true });
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const shot of ["wide", "iso", "low"]) {
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto("file://" + ev + "/shots/" + shot + ".html#film");
  await pg.waitForFunction(() => !!window.film);
  const adv = (s) => pg.evaluate((n) => { window.film.cam2(1, 0, 0); for (let i = 0; i < n; i++) window.film.step(1 / 60); window.film.cam2(1, 0, 0); }, s * 60);
  await adv(3);
  const snap = (n) => pg.screenshot({ path: `${ev}/probe/${shot}-${n}.png` });
  await snap("closed");
  await pg.evaluate(() => film.lid(true)); await adv(4); await snap("open");
  await pg.evaluate(() => film.level(1)); await adv(5); await snap("ex1");
  await pg.evaluate(() => film.level(2)); await adv(5); await snap("ex2");
  await pg.close();
}
await b.close();
