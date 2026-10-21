// Film director. usage: node film/render.mjs stills|video [shot-prefix]|join (join re-cuts existing shot mp4s)   (60 fps; music is added by film/music.py + film/mux.sh)
// Three lenses of the same page (film/build-shots.mjs), each a shot with its own camera path; shots are encoded one by one and
// cross-dissolved by ffmpeg. The page runs in #film mode: this script advances it 1/60 s per frame and screenshots it.
import { createRequire } from "module";
import fs from "fs"; import path from "path"; import url from "url";
import { execFileSync } from "child_process";
const { chromium } = createRequire(import.meta.url)("playwright-core");
const here = path.dirname(url.fileURLToPath(import.meta.url));
const ev = path.resolve(here, "../.render");
const mode = process.argv[2] || "stills", FPS = 60, DT = 1 / FPS, XF = 0.6;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";

// camera keyframes [t, zoom, dx, dy]; a cubic Hermite spline through them gives continuous velocity (no stop-start)
function spline(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const [t0, ...a] = keys[i], [t1, ...b] = keys[i + 1], h = t1 - t0, u = (t - t0) / h;
  const slope = (j, k) => keys[k][0] === keys[j][0] ? [0, 0, 0] : [1, 2, 3].map((c) => (keys[k][c] - keys[j][c]) / (keys[k][0] - keys[j][0]));
  const m0 = i === 0 ? slope(0, 0) : slope(i - 1, i + 1), m1 = i + 1 === n - 1 ? slope(n - 1, n - 1) : slope(i, i + 2);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return a.map((v, c) => h00 * v + h10 * h * m0[c] + h01 * b[c] + h11 * h * m1[c]);
}
// level 1 / level 2 explode frames are about zoom .68 / .56, dy +.15 / +.23 (see frameView in live.js)
const SHOTS = [
  { name: "a-wide", page: "wide", pre: [], settle: 3, dur: 17,
    ev: [[1.4, "film.lid(true)"], [7.0, "film.send(0)"], [11.5, "film.send(4)"]],
    cam: [[0, 0.74, -0.1, 0.06], [2.6, 0.98, -0.01, 0.0], [5, 1.04, 0.0, 0.0], [8, 1.0, 0.03, 0.0], [12, 1.06, 0.03, -0.01], [17, 1.1, -0.01, -0.01]] },
  { name: "b-iso", page: "iso", pre: ["film.lid(true)"], settle: 4, dur: 20,
    ev: [[1.0, "film.level(1)"], [8.0, "film.level(2)"], [15.0, "film.level(0)"]],
    cam: [[0, 1.0, 0.0, 0.0], [3.5, 0.64, 0.0, 0.17], [8, 0.64, 0.02, 0.17], [11, 0.54, 0.0, 0.25], [15, 0.56, -0.03, 0.24], [20, 1.0, 0.0, 0.0]] },
  { name: "c-low", page: "low", pre: ["film.lid(true)", "film.level(2)"], settle: 6, dur: 13,
    ev: [[4.0, "film.level(0)"], [9.5, "film.lid(false)"]],
    cam: [[0, 0.56, -0.05, 0.23], [4, 0.6, 0.03, 0.22], [8, 0.9, 0.0, 0.05], [13, 1.0, 0.0, 0.0]] },
];
const only = process.argv[3];
const stillsAt = (s) => [0.2, s.dur * 0.25, s.dur * 0.5, s.dur * 0.75, s.dur - 0.2];

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--force-color-profile=srgb", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const s of SHOTS) {
    if (mode === "join" || (only && !s.name.startsWith(only))) continue;
    const dir = path.join(ev, "shot-" + s.name); fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
    await page.goto("file://" + path.join(ev, "shots", s.page + ".html") + "#film");
    await page.waitForFunction(() => !!window.film);
    const adv = (n) => page.evaluate((k) => { for (let i = 0; i < k; i++) window.film.step(1 / 60); }, n);
    await adv(3 * FPS);
    for (const e of s.pre) await page.evaluate(e);
    await adv(s.settle * FPS);
    const total = Math.round(s.dur * FPS), wanted = mode === "stills" ? stillsAt(s).map((x) => Math.round(x * FPS)) : null;
    let ei = 0;
    for (let f = 0; f <= total; f++) {
      const t = f * DT;
      while (ei < s.ev.length && s.ev[ei][0] <= t + 1e-6) { await page.evaluate(s.ev[ei][1]); ei++; }
      const [z, dx, dy] = spline(s.cam, t);
      await page.evaluate(([a, b, c, d]) => { window.film.cam2(a, b, c); window.film.step(d); }, [z, dx, dy, DT]);
      if (!wanted || wanted.includes(f)) await page.screenshot({ path: path.join(dir, (wanted ? "s" : "f") + String(f).padStart(5, "0") + ".png") });
      if (!wanted && f % 120 === 0) console.log(s.name, f, "/", total);
    }
    await page.close();
    if (!wanted) execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "60", "-i", path.join(dir, "f%05d.png"), "-vf", "scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "60", path.join(ev, s.name + ".mp4")]);
  }
  if ((mode === "video" && !only) || mode === "join") {
    const names = SHOTS.map((s) => path.join(ev, s.name + ".mp4"));
    let off = 0; const args = ["-y", "-loglevel", "error"]; names.forEach((n) => args.push("-i", n));
    let prev = "[0:v]", filt = [];
    SHOTS.slice(0, -1).forEach((s, i) => { off += s.dur - XF; filt.push(`${prev}[${i + 1}:v]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[v${i}]`); prev = `[v${i}]`; });
    args.push("-filter_complex", filt.join(";"), "-map", prev, "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "60", "-movflags", "+faststart", path.join(here, "network-switch.mp4"));
    execFileSync(FFMPEG, args);
  }
} finally { await browser.close(); }
