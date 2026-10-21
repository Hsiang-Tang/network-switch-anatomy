// Builds every view into a temp folder (one process each: the parts library keeps per-build state), then packs them
// into one self-contained file: network-switch.html, a thin shell whose frame swaps between the two views.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const views = [["index.html", 45, 35], ["view-elev.html", 90, 9]];
const out = mkdtempSync(join(tmpdir(), "nsw-"));
for (const [file, az, el] of views) {
  execFileSync(process.execPath, [join(here, "build.mjs")], { stdio: "inherit", env: { ...process.env, VIEW_OUT: out, VIEW_FILE: file, VIEW_AZ: String(az), VIEW_EL: String(el), ...(file === "view-elev.html" ? { VIEW_CLOSED: "1" } : {}) } });
}
const pages = Object.fromEntries(views.map(([file]) => [file, readFileSync(join(out, file), "utf8")]));
const json = JSON.stringify(pages).replace(/<\//g, "<\\/");
const shell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>8-port network switch</title><style>html,body{margin:0;height:100%;background:#fbfbfa}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe id="f" title="8-port network switch" allow="fullscreen"></iframe><script>
const PAGES = ${json};
const f = document.getElementById("f");
let url = "";
function show(name, hash) {
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(new Blob([PAGES[name] || PAGES["index.html"]], { type: "text/html" }));
  f.src = url + (hash || "");
}
addEventListener("message", (e) => { if (e.data && e.data.nsView) show(e.data.nsView, e.data.hash); });
show("index.html", location.hash);
<\/script></body></html>`;
writeFileSync(join(here, "..", "index.html"), shell);
rmSync(out, { recursive: true, force: true });
console.log("wrote index.html", (shell.length / 1e6).toFixed(2) + " MB");
