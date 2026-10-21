// Builds the camera set for the film: the same switch seen from three lenses (az, el, dist), one page each, into the ignored
// evidence folder. Perspective tension comes from the short distances; the shipped network-switch.html is not touched.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../.render/shots");
mkdirSync(out, { recursive: true });
const SHOTS = [["wide.html", 30, 22, 560], ["iso.html", 48, 32, 900], ["low.html", 74, 9, 700]];
for (const [file, az, el, dist] of SHOTS) {
  execFileSync(process.execPath, [join(here, "../src/build.mjs")], { stdio: "inherit", env: { ...process.env, VIEW_OUT: out, VIEW_FILE: file, VIEW_AZ: String(az), VIEW_EL: String(el), VIEW_DIST: String(dist) } });
}
