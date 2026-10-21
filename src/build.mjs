// Network switch, lid off. Built with the anatomy kit (https://github.com/wheresryan22/anatomy).
// The kit is vendored under vendor/anatomy (MIT, see LICENSE.anatomy).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { glScript } from "../vendor/anatomy/scripts/inline-kit.mjs";
import { glCamera } from "../vendor/anatomy/kit/gl.mjs";
import * as S0 from "./scene.mjs";
import { HOSTS } from "./model.mjs";
import { chips, passives, copper, autoRoute, TRACES, CPU } from "./layout.mjs";
import { boardSvg } from "./board.mjs";
import { chassis, power, fan, jack, leds, cover, sfp, usb, SFP_X, CON_X, USB_X } from "./enclosure.mjs";
import { fabric, chest, drawer, think } from "./fabric.mjs";
import { smdLed } from "./parts.mjs";
import { PANELS } from "./pinouts.mjs";

const { k, P, WIDTH, HEIGHT, BOARD_TOP, PORT_X, PORTS, MAT_CSS, mat, inOrder, depth, at, D, L, slab } = S0;
const HERE = dirname(fileURLToPath(import.meta.url));
const theme = "light";
const kitScript = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const fanSource = readFileSync(join(HERE, "fan.mjs"), "utf8").replace(/^export /gm, "");
const liveSource = existsSync(join(HERE, "live.js")) ? readFileSync(join(HERE, "live.js"), "utf8") : "";

// ---- compose: chips and tall parts first (they reserve their footprints), then the flat layers ---------------
const parts = chips();
const front = [...SFP_X.map((x) => sfp(x)), usb(USB_X)];
const pw = power();
const fans = S0.FANS.map((cx, i) => fan(cx, i));
const fab = fabric();
const chestSvg = chest();
const drawers = Array.from({ length: 8 }, (_, i) => drawer(i)).join("");
const flat = passives();
const cu = copper();
const auto = autoRoute(520);
const boardLayer = boardSvg(cu, auto);

// each tall part is one swappable item: where it sits, how far it floats when the box is taken apart
const items = [
  { id: "psu", ...pw.parts[0], info: "psu|PS1", up: 104, up2: 170 },
  ...pw.parts.slice(1, 4).map((p, i) => ({ id: "c" + i, ...p, up: 70 + i * 4, up2: 120 + i * 6 })),
  ...pw.parts.slice(4).map((p, i) => ({ id: "e" + i, ...p, up: 76, up2: 128 })),
  { id: "fan0", ...fans[0], info: "fan|FAN1", up: 96, up2: 150 },
  { id: "fan1", ...fans[1], info: "fan|FAN2", up: 96, up2: 150 },
  ...parts.map((p, i) => ({ id: "p" + i, ...p, up: p.heat ? 108 : 52 + (i % 5) * 5, up2: p.heat ? 190 : 80 + (i % 7) * 7 })),
  ...front.map((p, i) => ({ id: "f" + i, ...p, info: i < 2 ? "sfp|CN" + (9 + i) : "usb|CN12", up: 70, up2: 110 })),
  { id: "fab", ...fab, up: 64, up2: 100 },
  { id: "chest", at: [60, -26], svg: chestSvg + drawers + think(), up: 88, up2: 150 },
];
const rear = items.sort((a, b) => depth(...a.at) - depth(...b.at)).map((it, n) => `<g class="ex" data-ex="${it.up}" data-ex2="${it.up2}" data-ax="${it.at[0].toFixed(1)}" data-ay="${it.at[1].toFixed(1)}" data-n="${n}">${it.svg}</g>`).join("");

// clickable regions: where each part sits, so the page can zoom to it and open its pin-out sheet
const RADIUS = { psu: 36, fan: 22, soc: 16, heat: 12, phy: 13, ddr: 9, tcam: 11, sram: 8, cpld: 9, rj45: 11, sfp: 12, usb: 7, console: 11, coin: 10, mcu: 6, flash: 5, eeprom: 4, crystal: 4, jtag: 8, uart: 5, reset: 5 };
const ZOOM = { psu: 2.6, fan: 3.4, soc: 5.5, heat: 6, phy: 6.5, ddr: 7, tcam: 6.5, sram: 8, cpld: 7.5, rj45: 6, sfp: 6.5, usb: 8, console: 6, coin: 7, mcu: 9, flash: 11, eeprom: 12, crystal: 12, jtag: 10, uart: 12, reset: 11, buck: 11, sr: 11, rs232: 10, clk: 9, iox: 10, leddrv: 8 };
const ZLIFT = { psu: 16, fan: 12, heat: 8, soc: 2, rj45: 8, console: 8, sfp: 8, usb: 5, coin: 3 };
const regionOf = (info, x, y) => { const [id] = info.split("|"); return { info, x: +x.toFixed(1), y: +y.toFixed(1), z: BOARD_TOP + (ZLIFT[id] ?? 2), r: RADIUS[id] ?? 6, zoom: ZOOM[id] ?? 8 }; };
const REGIONS = [
  ...items.filter((it) => it.info).map((it) => regionOf(it.info, it.at[0], it.at[1])),
  ...PORT_X.map((x, i) => regionOf("rj45|CN" + (i + 1), x, S0.JACK_Y + 12)),
  regionOf("console|CN11", CON_X, S0.JACK_Y + 12),
];
const PART_MENU = [...new Map(REGIONS.map((r) => [r.info, r])).values()].sort((a, b2) => a.info.split("|")[1].localeCompare(b2.info.split("|")[1], "en", { numeric: true }));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An eight-port network switch with the lid off, drawn at real size: the power supply, two fans, the processor, memory, two quad PHY chips, the printed copper between them, the crossbar fabric that routes frames, and a chest of eight drawers that holds the MAC table. A frame comes in at one port and runs its trace to the crossbar. The switch files the sender's address in a drawer, looks up the destination, and sends the frame out of the one port that holds it, or out of every other port when it has never seen that address.",
  body: [
    `<g class="ex" data-ex="0" data-ex2="0" data-fixed>${mat("steel", chassis())}</g>`,
    `<g class="ex" data-ex="30" data-ex2="44" data-ax="0" data-ay="0" data-board>${boardLayer}${flat}${mat("ic", pw.harness)}</g>`,
    `<g class="rear">${rear}</g>`,
  ],
});
const jacks = PORT_X.map((x, i) => `<g data-port="${i}" class="ex" data-ex="58" data-ex2="92" data-ax="${x}" data-ay="100">${jack(x)}</g>`);
const extraJacks = `<g class="ex" data-ex="58" data-ex2="92" data-ax="${CON_X}" data-ay="100">${jack(CON_X, { label: "", ow: 13.8 })}</g>`;
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg fx-layer fx-front" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${[...jacks, extraJacks, mat("led", leds()), cover()].join("")}</svg>`;
const camera = glCamera(P);

const header = `
const REGIONS = ${JSON.stringify(REGIONS)};
const PANELS = ${JSON.stringify(PANELS)};

const P = ${JSON.stringify(P)};
const PORT_X = ${JSON.stringify(PORT_X)};
const TRACES = ${JSON.stringify(TRACES)};
const CAMERA = ${JSON.stringify(camera)}, BOARD_TOP = ${BOARD_TOP}, HEIGHT = ${HEIGHT}, WIDTH = ${WIDTH};
const PIN_X = ${JSON.stringify(S0.PIN_X)}, ROW_Y = ${JSON.stringify(S0.ROW_Y)}, PIN_Y = ${S0.PIN_Y}, DZ_LOW = ${S0.DZ_LOW}, DZ_HIGH = ${S0.DZ_HIGH}, PIN_DROP = ${S0.PIN_DROP};
const JACK_TOP = ${S0.JACK_TOP}, JACK_Y = ${S0.JACK_Y}, FANS = ${JSON.stringify(S0.FANS)}, FAN_Z = ${S0.FAN_Z}, FAN_FACE = ${S0.FAN_FACE}, FAN_R = ${S0.FAN_R};
const PORTS = ${PORTS}, AUTO_OPEN = false;
`;
const live = `${modelSource}\n${fanSource}\n${header}\n${liveSource}`;

const PUCK_CSS = `<style>.iso-plate{overflow:hidden}.iso-stage{position:relative;transform-origin:0 0}.iso-stage>svg,.iso-stage>canvas{display:block;width:100%;height:auto}.iso-stage>.fx-layer{position:absolute;inset:0;height:100%!important;pointer-events:none}.iso{--anatomy-lit:#d9531e}.iso[data-theme="dark"]{--anatomy-lit:#ff8f5a}${MAT_CSS}.iso:not([data-theme="light"]) .fx-gl{mix-blend-mode:screen}.iso-solid.puck>.iso-top,.xp[data-on] .iso-top{fill:var(--anatomy-lit)}.iso-solid.puck>.iso-shade,.xp[data-on] .iso-shade{fill:var(--anatomy-lit);opacity:.72}
.pc{fill:var(--anatomy-paper);stroke:var(--anatomy-hi);stroke-width:.28px}.pr{fill:#2d2d32;stroke:var(--anatomy-hi);stroke-width:.2px}.iso[data-theme="dark"] .pc{fill:#2a2a2e}.iso[data-theme="dark"] .pr{fill:#050506}
.ln-pad{stroke-width:.22px}.ln-end{stroke-width:.26px}.trc .iso-line{stroke-width:.3px}.trc .ln-pw{stroke-width:.4px}.trc .ln-hatch{stroke-width:.18px}
.ctl{position:absolute;left:20px;top:44px;display:flex;gap:6px;z-index:3;flex-wrap:wrap;max-width:calc(100% - 40px)}.ctl button{font:10.5px/1 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-mid);padding:7px 10px;cursor:pointer}.ctl button:hover,.ctl button[aria-pressed="true"]{background:var(--anatomy-strong);color:var(--anatomy-card)}.ctl a{font:10.5px/1 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-text);border:1px solid var(--anatomy-mid);padding:7px 10px;text-decoration:none;background:var(--anatomy-card)}.ctl a[aria-current]{background:var(--anatomy-strong);color:var(--anatomy-card)}
[data-asm="cover"] .iso-fill,[data-asm="cover"] .iso-shade,[data-asm="cover"] .iso-top{opacity:var(--solid,1)}[data-asm="cover"] .iso-halo{opacity:var(--solid,1)}.iso-view{position:relative;overflow:hidden;touch-action:none;transition:height .6s cubic-bezier(.32,.72,0,1)}.leaders line{stroke:var(--anatomy-mid);stroke-width:.5px;stroke-dasharray:1.5 3;vector-effect:non-scaling-stroke}@media (max-width:560px){.ctl{position:static;margin:34px 0 10px;max-width:none}.trc .iso-line{stroke-width:.2px}}</style>`;
const VIEWS = [["index.html", "Iso"], ["view-elev.html", "Elevation"]];
const FIT_CSS = `<style>html,body{height:100%;overflow:hidden}.iso-page{width:100%;height:100%;margin:0}.iso-figure{margin:0;height:100%}.iso-legend{display:none}.iso-plate{height:100%;padding:0;--w:min(100vw,142.857vh)}.iso-plate-corners{z-index:4}.iso-view{position:absolute!important;inset:0;height:auto!important}.iso-stage{position:absolute!important;width:var(--w);height:calc(var(--w)*.7);left:calc((100% - var(--w))/2);top:calc((100% - var(--w)*.7)/2)}.ctl{top:40px}.film .ctl,.film [data-corner=fig],.film [data-corner=title],.film [data-corner=hint]{display:none}.film-cap{position:absolute;left:5vw;bottom:6vh;z-index:6;font:400 15px/1.5 var(--anatomy-mono);color:var(--anatomy-text);opacity:0;transition:none;background:var(--anatomy-card);padding:12px 18px;box-shadow:0 0 0 1px var(--anatomy-mid)}.film-cap b{display:block;font:600 30px/1.3 ui-sans-serif,system-ui,-apple-system,'PingFang TC','Noto Sans TC',sans-serif;color:var(--anatomy-strong);letter-spacing:.02em}.film-cap span{display:block;margin-top:4px;letter-spacing:.06em;text-transform:uppercase}.film [data-readout]{display:none}@media (max-width:560px){.ctl{position:relative!important;top:34px!important;left:0!important;z-index:6}}.dp{position:absolute;z-index:5;right:16px;top:84px;bottom:16px;width:min(520px,44vw);background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid),0 12px 32px -12px #0003;padding:16px 16px 12px;overflow:auto;font:12px/1.5 var(--anatomy-mono);color:var(--anatomy-text)}.dp[hidden],.pmenu[hidden],.tip[hidden]{display:none}.dp h2{margin:0 24px 2px 0;font:600 14px/1.3 var(--anatomy-mono);color:var(--anatomy-strong)}.dp .ds{margin:0 0 8px;color:var(--anatomy-muted)}.dp .dx{position:absolute;right:8px;top:6px;border:0;background:none;color:var(--anatomy-text);font-size:20px;cursor:pointer}.dp .dsv svg{width:100%;height:auto;display:block}.dp .bd{display:inline-block;margin:0 0 6px;padding:2px 6px;border:1px solid var(--anatomy-mid);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted)}.dp table.pk{border-collapse:collapse;width:100%;margin-top:8px}.dp table.pk th{width:3.2em;text-align:left;font-weight:600;color:var(--anatomy-strong);padding:1px 6px 1px 0;vertical-align:top}.dp table.pk td{padding:1px 8px 1px 0}.dp .pk2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.dp .nt{margin:8px 0 0;color:var(--anatomy-muted)}.pt{fill:var(--anatomy-hi);font-family:var(--anatomy-mono)}.pm{fill:var(--anatomy-muted)}.pw{fill:var(--anatomy-paper)}.pmenu{position:absolute;z-index:5;left:20px;top:78px;max-width:calc(100% - 40px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px 14px;padding:10px 12px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid),0 12px 32px -12px #0003}.pmenu button{font:10.5px/1.7 var(--anatomy-mono);text-align:left;background:none;border:0;color:var(--anatomy-text);cursor:pointer;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmenu button:hover{color:var(--anatomy-strong);text-decoration:underline}.pmenu b{display:inline-block;min-width:3.2em;color:var(--anatomy-strong)}.tip{position:absolute;z-index:6;pointer-events:none;padding:3px 7px;background:var(--anatomy-strong);color:var(--anatomy-card);font:10.5px/1.4 var(--anatomy-mono);white-space:nowrap}.sel{fill:none;stroke:var(--anatomy-lit);stroke-width:1.4px;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}@media (max-width:760px){.dp{width:calc(100% - 32px);top:auto;height:46%}.pmenu{grid-template-columns:repeat(2,1fr)}}</style>`;
const body = PUCK_CSS + FIT_CSS + k.plateHtml({
  fig: "Fig 1",
  title: "8-port network switch",
  hint: "Click a port, or press 1 to 8",
  readout: "lid on",
  keys: [
    { mark: "lit", label: "The frame, and the crosspoint pins that route it" },
    { mark: "raised", label: "A drawer pulled out: one address the chip has learned" },
  ],
  caption:
    "An eight-port switch drawn at real size, from the closed box to the open board. A frame arrives at one port and runs its trace through a PHY to the crossbar. The switch files the sender in a drawer of the MAC table, then looks up the destination: a hit leaves by that one port, a miss floods every other port. Open or close the lid with the button, zoom into the board, and take the whole box apart into floating layers and then into single parts.",
  body: `<div class="ctl" role="toolbar" aria-label="View controls"><button type="button" data-act="lid" aria-pressed="false">Open lid</button><button type="button" data-act="explode" aria-pressed="false">Explode</button><button type="button" data-act="zoom-in" aria-label="Zoom in">+</button><button type="button" data-act="zoom-out" aria-label="Zoom out">&minus;</button><button type="button" data-act="fit">Fit</button><button type="button" data-act="parts" aria-expanded="false">Parts</button>${VIEWS.map(([f, n]) => `<a href="${f}"${f === (process.env.VIEW_FILE || "index.html") ? " aria-current=\"page\"" : ""}>${n}</a>`).join("")}</div><div class="iso-view"><div class="iso-stage" tabindex="0" role="application" aria-label="Network switch: click a port or press 1 to 8 to send a frame, R to clear the table">${svg}<canvas class="fx-layer fx-gl" aria-hidden="true"></canvas>${frontSvg}</div></div><aside class="dp" hidden aria-live="polite"><button type="button" class="dx" aria-label="Close" data-act="close">&times;</button><h2></h2><p class="ds"></p><div class="dsv"></div><div class="dn"></div></aside><div class="pmenu" hidden>${PART_MENU.map((r) => `<button type="button" data-part="${r.info}"><b>${r.info.split("|")[1]}</b> ${PANELS[r.info.split("|")[0]].title}</button>`).join("")}</div><div class="tip" hidden></div>`,
});

const name = process.env.VIEW_FILE || "index.html";
writeFileSync(join(process.env.VIEW_OUT || join(HERE, ".."), name), k.pageHtml({ title: "8-port network switch", theme, body, script: kitScript() + glScript() + live, width: 1360 }));
console.log("wrote", name, (body.length / 1e6).toFixed(2) + " MB");
