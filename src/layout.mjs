// Where everything sits on the board, and the copper that joins it.
import { k, P, at, L, D, S, slab, cyl, rectD, rectY, mat, reserve, KEEP, BOARD, BOARD_TOP, Z0, PORT_X, PORTS, PIN_X, PIN_Y, FAB, CHEST, FANS, TRAY, JACK_Y, rnd, reseed, chamfer, offsetPath, bundlePaths } from "./scene.mjs";
import { SILK, silkFor, smd, smdRow, smdGrid, testPoint, via, flatSvg, PASS, qfp, qfn, bga, soic, sot, inductor, tantalum, elco, crystal, header, tact, smdLed, heatsink } from "./parts.mjs";

// ---- the eight port traces: jack pins -> quad PHY -> column of the crossbar ---------------------------------
export const PHY_A = { x: -122, y: 50, w: 22, d: 18, r: 1 };
export const PHY_B = { x: -39.8, y: 50, w: 22, d: 18, r: 1 };
const JOG = [72, 77, 77, 72];
const LANE_A = [8, 13.5, 19, 24.5];
const LANE_B = [30, 35.5, 41, 46.5];
const pre = [], post = [];
export const TRACES = PORT_X.map((x, i) => {
  const g = i < 4 ? PHY_A : PHY_B, m = i % 4;
  const padx = g.x + g.w / 2 + (m - 1.5) * 5.4;
  const lane = (i < 4 ? LANE_A : LANE_B)[m];
  const a = chamfer([[x, JACK_Y - 2], [x, JOG[m]], [padx, JOG[m]], [padx, g.y + g.d]], 3);
  const b = chamfer([[padx, g.y], [padx, lane], [PIN_X[i], lane], [PIN_X[i], PIN_Y]], 3);
  pre[i] = a; post[i] = b;
  return [...a.map(([px, py]) => [px, py]), ...b.map(([px, py], n) => (n === 0 ? [px, py, 1] : [px, py]))];
});

// ---- chips and tall parts, depth-sorted by the caller -----------------------------------------------------
export const CPU = { x: 108, y: -46, w: 24, d: 24, r: 1.5 };
export const DDR = [{ x: 146, y: -46, w: 11, d: 16 }, { x: 160, y: -46, w: 11, d: 16 }, { x: 146, y: -26, w: 11, d: 16 }, { x: 160, y: -26, w: 11, d: 16 }].map((c) => ({ ...c, r: 0.8 }));
export function chips() {
  const parts = [];
  const add = (x, y, svg, extra = {}) => parts.push({ at: [x, y], svg, ...extra });
  // the two quad PHYs between the jacks and the fabric
  add(PHY_A.x + 11, PHY_A.y + 9, qfn(PHY_A, "PHY-4P", "U30", { pitch: 0.6, h: 1 }), { info: "phy|U30" });
  add(PHY_B.x + 11, PHY_B.y + 9, qfn(PHY_B, "PHY-4P", "U31", { pitch: 0.6, h: 1 }), { info: "phy|U31" });
  // management SoC; its finned sink is a separate part so it can be lifted off
  add(CPU.x + 12, CPU.y + 12, bga(CPU, "NSW-SOC-1200", "U1", { h: 1.7, lid: true }), { info: "soc|U1" });
  add(CPU.x + 12, CPU.y + 12, heatsink({ x: CPU.x + 3, y: CPU.y + 3, w: 18, d: 18 }, Z0 + 0.9 + 1.7 + 0.5, 7, 5), { heat: true, info: "heat|U1" });
  DDR.forEach((c, i) => add(c.x + c.w / 2, c.y + c.d / 2, bga(c, "DDR3L", "U" + (2 + i), { h: 1.3 }), { info: "ddr|U" + (2 + i) }));
  // boot memory, clock and the debug headers under the SoC
  add(110, -8, soic({ x: 108, y: -11, w: 6.2, d: 6.2, r: 0.4 }, "W25Q128", "U6", { pins: 8, pitch: 1.5 }), { info: "flash|U6" });
  add(121, -8, soic({ x: 119, y: -10, w: 4.2, d: 3.4, r: 0.3 }, "24C02", "U7", { pins: 8, pitch: 0.9, len: 1 }), { info: "eeprom|U7" });
  add(130, -8, crystal(128, -10, "Y1"), { info: "crystal|Y1" });
  add(138, -8, sot(136, -9));
  add(114, 2.5, header(108, 1, 5, 2, "J1"), { info: "jtag|J1" });
  add(132.5, 3, header(128, 2, 4, 1, "J2"), { info: "uart|J2" });
  add(150, 2, qfp({ x: 146, y: -4, w: 8.2, d: 8.2, r: 0.4 }, "MCU48", "U8"), { info: "mcu|U8" });
  // regulator block, back right
  [120, 131, 142].forEach((x, i) => add(x + 4, -104, inductor({ x, y: -108, w: 8.2, d: 8.2, r: 0.8 }, ["R47", "1R0", "2R2"][i], "L" + (i + 1))));
  add(155, -105, soic({ x: 152, y: -108, w: 6.2, d: 5, r: 0.4 }, "TPS5433", "U9", { pins: 8 }), { info: "buck|U9" });
  add(166, -105, soic({ x: 164, y: -108, w: 6.2, d: 5, r: 0.4 }, "TPS5433", "U10", { pins: 8 }), { info: "buck|U10" });
  [120, 126, 132, 138, 144, 150].forEach((x) => add(x + 2, -94, tantalum(x, -96)));
  [118, 124, 130, 136].forEach((x) => add(x + 2, -86, sot(x, -86)));
  [158, 166].forEach((x, i) => add(x, -88, elco(x, -88, 3.4, 7, "C" + (20 + i))));
  [96, 104].forEach((x, i) => add(x, -98, elco(x, -98, 3.4, 8, "C" + (26 + i))));
  // back middle: a CPLD, clock generator, LED shift registers
  add(63, -97, bga({ x: 56, y: -104, w: 14, d: 14, r: 0.8 }, "CPLD-256", "U21", { h: 1.2 }), { info: "cpld|U21" });
  add(80, -100, qfn({ x: 77, y: -103, w: 6, d: 6, r: 0.4 }, "CLKGEN", "U22"));
  [58, 70, 82].forEach((x, i) => add(x + 3, -80, soic({ x, y: -83, w: 6.2, d: 4, r: 0.3 }, "HC595", "U" + (23 + i), { pins: 16, pitch: 0.8, len: 1 }), { info: "sr|U" + (23 + i) }));
  add(98, -80, qfn({ x: 94, y: -83, w: 5, d: 5, r: 0.4 }, "I2CM", "U26"));
  add(110, -74, sot(108, -75));
  add(116, -74, sot(114, -75));
  // power input block, mid left
  [-134, -121].forEach((x, i) => add(x + 5, -46, inductor({ x, y: -52, w: 10, d: 10, r: 1 }, i ? "4R7" : "3R3", "L" + (4 + i))));
  [-104, -94].forEach((x, i) => add(x, -44, elco(x, -44, 3.8, 9, "C" + (24 + i))));
  [-164, -152, -140].forEach((x, i) => add(x + 3, -34, sot223(x, -36, "Q" + (1 + i))));
  [-170, -164, -158, -152].forEach((x) => add(x + 2, -22, tantalum(x, -23)));
  add(-130, -26, soic({ x: -134, y: -28, w: 6.2, d: 5, r: 0.4 }, "HSC", "U11"));
  add(-118, -26, soic({ x: -122, y: -28, w: 6.2, d: 5, r: 0.4 }, "TPS5433", "U12"), { info: "buck|U12" });
  add(-166, -52, header(-166, -54, 6, 1, "J5", 3.96));
  // left front: debug, clocks, I/O expander
  add(-165, 14, header(-171, 7, 8, 2, "J3"));
  add(-142, 22, qfp({ x: -146, y: 18, w: 8.2, d: 8.2, r: 0.4 }, "CLK", "U13"), { info: "clk|U13" });
  add(-122, 26, qfn({ x: -128, y: 22, w: 6, d: 6, r: 0.5 }, "IOX", "U14"), { info: "iox|U14" });
  add(-160, 36, soic({ x: -164, y: 33, w: 6.2, d: 5, r: 0.4 }, "MAX3232", "U15", { pins: 16, pitch: 0.8, len: 1 }), { info: "rs232|U15" });
  add(-100, 24, crystal(-104, 22, "Y2"), { info: "crystal|Y2" });
  // middle front: TCAM and SRAM next to the fabric, drivers
  add(39, 21, bga({ x: 30, y: 12, w: 18, d: 18, r: 1 }, "TCAM-64K", "U16", { h: 1.4 }), { info: "tcam|U16" });
  add(62, 19, bga({ x: 56, y: 14, w: 11, d: 11, r: 0.8 }, "SRAM", "U17", { h: 1.2 }), { info: "sram|U17" });
  add(80, 20, qfn({ x: 77, y: 17, w: 5, d: 5, r: 0.4 }, "LEDD", "U18"));
  add(46, 40, header(30, 36, 7, 2, "J4"));
  add(-12, 14, qfn({ x: -17, y: 12, w: 6, d: 6, r: 0.4 }, "CLK-BUF", "U20"));
  add(141, 34, qfp({ x: 134, y: 28, w: 12.2, d: 12.2, r: 0.5 }, "LED-DRV", "U19"), { info: "leddrv|U19" });
  // reset, a coin cell and status LEDs
  add(-170, 60, tact(-170, 56, "SW1"), { info: "reset|SW1" });
  add(150, 70, mat("silver", cyl(150, 70, 9, Z0, 3.2, "mid", 32, 0.5) + L(k.ring(150, 70, 6.5, Z0 + 3.2, P, 26), { tone: "lo" }) + cyl(150, 70, 2.5, Z0 + 3.2, 0.8, "hi", 14)), { info: "coin|BT1" });
  reserve({ x: 141, y: 61, w: 18, d: 18 }, 1);
  add(130, 84, smdLed(130, 84) + smdLed(130, 88) + smdLed(138, 84) + smdLed(138, 88));
  return parts;
}
function sot223(x, y, name) {
  const c = { x, y, w: 6.2, d: 3.4, r: 0.3 };
  reserve({ x: x - 0.6, y: y - 1.6, w: 8.2, d: 7 }, 0.6);
  if (name) silkFor({ x: x - 1.6, y: y - 2.6, w: 9, d: 8.4 }, name);
  const o = [slab(c, Z0 + 0.4, 1.4, "mid", 2, 0.25, { crease: "lo" })];
  o.push(D([0, 1, 2].map((n) => at([x + 0.8 + n * 2.3, y + 3.4 + 1.1, Z0 + 0.5])), { size: 0.3, tone: "hi" }));
  o.push(slab({ x: x + 1.2, y: y - 1.5, w: 3.8, d: 1.5, r: 0.2 }, Z0 + 0.4, 0.5, "hi", 2, 0, { crease: "none" }));
  return mat("ic", o.join(""));
}

// ---- passives: decoupling and pull-ups round every chip, in the order a layout engineer would put them --------
export function passives() {
  reseed(11);
  const ring = (c, margin, kind, size) => {
    const step = size === "0402" ? 2.2 : 2.9;
    for (let x = c.x; x <= c.x + c.w - 1; x += step) { smd(x, c.y - margin - 1, kind, true, size); smd(x, c.y + c.d + margin, kind, true, size); }
    for (let y = c.y + step; y <= c.y + c.d - 2; y += step) { smd(c.x - margin - 1, y, kind, false, size); smd(c.x + c.w + margin, y, kind, false, size); }
  };
  ring(CPU, 5, "cap", "0402");
  smdRow(CPU.x - 10, CPU.y + 2, 10, 2.4, "cap", "y", "0402");
  DDR.forEach((c, i) => {
    smdRow(c.x - 1, c.y + c.d + 3, 6, 2, i < 2 ? "res" : "cap", "x", "0402");
    smdRow(c.x + c.w + 3, c.y + 1, 6, 2.4, "res", "y", "0402");
  });
  ring({ x: 56, y: -104, w: 14, d: 14 }, 3.4, "cap", "0402");
  ring({ x: 30, y: 12, w: 18, d: 18 }, 3.4, "cap", "0402");
  // regulator block: bulk caps, resistor dividers
  smdRow(118, -100, 18, 2.8, "cap", "x", "1206");
  smdRow(116, -80, 22, 2.8, "res", "x", "0603");
  smdRow(116, -77, 22, 2.8, "cap", "x", "0603");
  smdRow(150, -97, 12, 3, "cap", "y", "0805");
  smdRow(174, -96, 10, 3, "res", "y", "0805");
  smdRow(56, -88, 26, 2.8, "cap", "x", "0603");
  smdRow(56, -76, 20, 2.8, "res", "x", "0603");
  // power input
  smdRow(-170, -48, 12, 3.6, "cap", "x", "1206");
  smdRow(-124, -14, 18, 2.9, "cap", "x", "0805");
  smdRow(-170, -12, 20, 2.9, "res", "x", "0603");
  smdRow(-110, -34, 6, 3.6, "cap", "x", "1210");
  smdRow(-170, 0, 9, 3.2, "cap", "x", "0805");
  // PHY analog sides: termination, bias, bypass
  for (const g of [PHY_A, PHY_B]) {
    smdRow(g.x - 6, g.y + 1, 7, 2.4, "cap", "y", "0402");
    smdRow(g.x + g.w + 4, g.y + 1, 7, 2.4, "cap", "y", "0402");
    smdRow(g.x, g.y - 7, 9, 2.4, "res", "x", "0402");
    smdRow(g.x + 1, g.y + g.d + 4, 8, 2.6, "cap", "x", "0603");
  }
  // memory termination field and the fabric's own rail caps
  smdGrid(-62, -54, 3, 2, 3, 2.2, "cap", "0402");
  smdRow(-62, -52, 3, 3, "res", "x", "0402");
  smdRow(12, -53, 6, 2.8, "cap", "x", "0402");
  smdRow(12, 2, 6, 2.8, "cap", "x", "0402");
  smdRow(30, 33, 12, 2.6, "cap", "x", "0402");
  smdRow(56, 28, 6, 2.5, "cap", "x", "0402");
  smdRow(104, 36, 12, 2.6, "res", "x", "0402");
  smdRow(134, 24, 12, 2.2, "cap", "x", "0402");
  smdRow(134, 44, 12, 2.2, "res", "x", "0402");
  smdRow(-146, 30, 5, 2.4, "cap", "x", "0402");
  smdRow(-130, 30, 6, 2.4, "res", "x", "0402");
  smdRow(-158, 44, 10, 2.8, "cap", "x", "0603");
  smdRow(-20, 60, 6, 2.4, "res", "x", "0402");
  smdRow(20, 22, 4, 3.2, "cap", "x", "0603");
  smdRow(108, -16, 12, 2.4, "cap", "x", "0402");
  // test points: a lattice by the debug headers, singles beside rails
  for (let i = 0; i < 16; i++) testPoint(-168 + (i % 8) * 4.4, -4 + Math.floor(i / 8) * 4, 0.8);
  for (let i = 0; i < 10; i++) testPoint(104 + i * 3.4, -52, 0.8);
  for (let i = 0; i < 6; i++) testPoint(100 + i * 4, 58, 0.8);
  return flatSvg();
}

// ---- the copper ------------------------------------------------------------------------------------------
export function copper() {
  const sig = [], pw = [], vias = [], pads = [];
  const line = (d) => sig.push(d);
  const route = (pts, n = 1, pitch = 0.6, end = pitch, r = 2) => bundlePaths(chamfer(pts, r), n, pitch, end).forEach(line);
  // the eight port bundles
  TRACES.forEach((_, i) => {
    bundlePaths(pre[i], 8, 1.2, 0.5).forEach(line);
    bundlePaths(post[i], 8, 0.5, 0.5).forEach(line);
    const [px, py] = post[i][0];
    for (let n = 0; n < 8; n++) { vias.push(at([px + (n - 3.5) * 0.5, py - 0.3, Z0])); }
    const [jx, jy] = pre[i][0];
    for (let n = 0; n < 8; n++) vias.push(at([jx + (n - 3.5) * 1.2, jy, Z0]));
  });
  // SoC to the DDR chips: data and address groups with a serpentine for length matching
  const serp = (x0, y, x1, amp, n, dir = 1) => {
    const pts = [[x0, y]];
    const step = (x1 - x0) / (n * 2);
    for (let i = 0; i < n; i++) { pts.push([x0 + step * (2 * i + 0.5), y], [x0 + step * (2 * i + 0.5), y + amp * dir], [x0 + step * (2 * i + 1.5), y + amp * dir], [x0 + step * (2 * i + 1.5), y]); }
    pts.push([x1, y]);
    return pts;
  };
  route([[CPU.x + CPU.w, -44], [138, -44], [142, -40], [DDR[0].x, -40]], 8, 0.55, 0.55, 2);
  route([[CPU.x + CPU.w, -36], [140, -36], [144, -34], [DDR[0].x, -34]], 8, 0.55, 0.55, 2);
  route([[DDR[0].x + DDR[0].w, -38], [DDR[1].x, -38]], 8, 0.5, 0.5, 1);
  route([[CPU.x + CPU.w, -28], [138, -28], [140, -22], [DDR[2].x, -22]], 8, 0.55, 0.55, 2);
  route([[CPU.x + CPU.w, -24], [142, -24], [144, -16], [DDR[2].x, -16]], 8, 0.55, 0.55, 2);
  route([[DDR[2].x + DDR[2].w, -18], [DDR[3].x, -18]], 8, 0.5, 0.5, 1);
  route(serp(CPU.x + CPU.w + 1, -48.4, DDR[0].x - 1, 1.4, 3), 3, 0.6, 0.6, 1);
  // fabric lanes: three bundles of eight lines from the top of the SoC over the chest to the crossbar
  route([[112, -46], [112, -54], [-2, -54], [-2, -50]], 8, 0.6, 0.45, 3);
  route([[120, -46], [120, -58], [-14, -58], [-14, -50]], 8, 0.6, 0.45, 3);
  route([[128, -46], [128, -62], [-26, -62], [-26, -50]], 8, 0.6, 0.45, 3);
  // SPI, I2C, UART, JTAG down to the boot parts and headers
  route([[114, -22], [114, -16], [111, -14], [111, -12]], 6, 0.5, 0.5, 2);
  route([[122, -22], [122, -17], [121, -14], [121, -11]], 4, 0.5, 0.5, 2);
  route([[118, -22], [118, -12], [114, 0], [114, 1]], 10, 0.5, 0.5, 2);
  route([[130, -22], [130, -12], [132, 0], [132, 2]], 4, 0.5, 0.5, 2);
  // MCU to the LED driver
  route([[152, 4], [152, 12], [142, 18], [142, 28]], 6, 0.55, 0.55, 3);
  route([[164, -4], [172, -4], [172, 24], [146, 34]], 3, 0.6, 0.6, 3);
  // crossbar fabric to the PHY management bus, the CPLD and the clocks
  route([[-52, 2], [-62, 2], [-66, 6], [-66, 46], [-74, 50]], 4, 0.6, 0.6, 3);
  route([[-17, 15], [-4, 15], [-4, 28], [30, 28], [30, 26]], 3, 0.6, 0.6, 3);
  route([[-104, 22], [-104, 14], [-146, 14], [-146, 18]], 2, 0.6, 0.6, 2);
  route([[56, -98], [48, -98], [48, -66], [100, -66], [100, -48]], 6, 0.55, 0.55, 3);
  route([[63, -90], [63, -84]], 8, 0.5, 0.5, 1);
  // power: wide rails as double lines
  const rail = (pts, w = 1.6) => { const c = chamfer(pts, 3); pw.push(k.onTop(offsetPath(c, -w / 2), Z0, P), k.onTop(offsetPath(c, w / 2), Z0, P)); };
  rail([[-158, -53], [-158, -62]]);
  rail([[-155, -50], [-155, -40], [-134, -40], [-134, -52]], 2);
  rail([[-124, -42], [-124, -38], [-104, -38], [-104, -42]], 2);
  rail([[-96, -44], [-80, -44], [-80, -54], [-70, -54], [-70, -68], [118, -68], [118, -100]], 2.2);
  rail([[-80, -44], [-80, 6], [-120, 6], [-120, 14]], 1.6);
  rail([[100, -68], [100, -60], [96, -56]], 1.6);
  rail([[118, -78], [124, -78]], 1.6);
  rail([[170, -92], [170, -75], [150, -75], [150, -60]], 1.6);
  // copper pours, hatched at 45 degrees as an EDA tool draws a plane
  const hatch = (r, pitch = 1.4, flip = false) => {
    const lines = [];
    for (let s = -r.d; s <= r.w; s += pitch) {
      const a = flip ? [r.x + r.w - Math.max(0, s), r.y + Math.max(0, -s)] : [r.x + Math.max(0, s), r.y + Math.max(0, -s)];
      const len = Math.min(r.w - Math.max(0, s), r.d - Math.max(0, -s));
      if (len <= 0) continue;
      const b = flip ? [a[0] - len, a[1] + len] : [a[0] + len, a[1] + len];
      lines.push(k.onTop([a, b], Z0 + 0.02, P));
    }
    return lines.join("");
  };
  const pours = [{ x: 106, y: 8, w: 68, d: 56 }, { x: -174, y: 62, w: 28, d: 22 }, { x: 150, y: -56, w: 24, d: 14 }, { x: -170, y: -100, w: 4, d: 40 }];
  const hatched = pours.map((r) => hatch(r)).join("");
  const sv = [];
  pours.forEach((r) => { for (let x = r.x + 3; x < r.x + r.w - 1; x += 5) for (let y = r.y + 3; y < r.y + r.d - 1; y += 5) sv.push(at([x, y, Z0 + 0.02])); });
  // the fabric's lookup bus into the drawer chest is drawn with the chest
  return { sig: sig.join(""), pw: pw.join(""), hatched, vias, sv };
}

// ---- background routing: seeded bundles that grow out of chip edges, avoiding parts and each other -----------------
const lengthSum = (pts) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
export function autoRoute(count = 160) {
  reseed(23);
  const cell = 1, W = Math.ceil(BOARD.w / cell), H = Math.ceil(BOARD.d / cell);
  const taken = new Uint8Array(W * H);
  const ix = (x) => Math.floor((x - BOARD.x) / cell), iy = (y) => Math.floor((y - BOARD.y) / cell);
  const inside = (x, y) => x > BOARD.x + 6 && x < BOARD.x + BOARD.w - 6 && y > BOARD.y + 6 && y < BOARD.y + BOARD.d - 22;
  const keep = new Uint8Array(W * H);
  const free = (x, y) => inside(x, y) && !taken[iy(y) * W + ix(x)] && !keep[iy(y) * W + ix(x)];
  const occupy = (x, y, r = 2) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const cx = ix(x) + a, cy = iy(y) + b; if (cx >= 0 && cx < W && cy >= 0 && cy < H) taken[cy * W + cx] = 1; } };
  // what is already routed blocks the ground under it
  for (const d of [FAB, CHEST]) KEEP.push({ x: d.x - 2, y: d.y - 2, w: (d.w ?? 0) + 4, d: (d.d ?? 0) + 4 });
  KEEP.push({ x: -146, y: 60, w: 160, d: 40 }, { x: -146, y: 0, w: 160, d: 60 });
  for (const r of KEEP) for (let x = Math.floor(r.x); x <= r.x + r.w; x += cell) for (let y = Math.floor(r.y); y <= r.y + r.d; y += cell) { const cx = ix(x), cy = iy(y); if (cx >= 0 && cx < W && cy >= 0 && cy < H) keep[cy * W + cx] = 1; }
  const mark = (pts, r) => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s <= len; s += 0.6) occupy(a[0] + ((b[0] - a[0]) * s) / (len || 1), a[1] + ((b[1] - a[1]) * s) / (len || 1), r); } };
  for (const t of TRACES) mark(t, 3);
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)]);
  const ok = (a, b) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s <= len; s += 0.7) if (!free(a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len)) return false; return true; };
  // seeds: points just outside each kept footprint, heading away from it
  const seeds = [];
  const sources = KEEP.filter((r) => r.w > 6 && r.d > 6);
  for (const r of sources) {
    for (let n = 0; n < 12; n++) {
      const side = Math.floor(rnd() * 4), t = rnd();
      const x = side === 0 ? r.x + t * r.w : side === 1 ? r.x + r.w : side === 2 ? r.x + t * r.w : r.x;
      const y = side === 0 ? r.y : side === 1 ? r.y + t * r.d : side === 2 ? r.y + r.d : r.y + t * r.d;
      const d0 = side === 0 ? 6 : side === 1 ? 0 : side === 2 ? 2 : 4;
      seeds.push({ p: [x + dirs[d0][0] * 2.2, y + dirs[d0][1] * 2.2], dir: d0 });
    }
  }
  for (let n = 0; n < 500; n++) { const p = [BOARD.x + 8 + rnd() * (BOARD.w - 16), BOARD.y + 8 + rnd() * (BOARD.d - 30)]; if (free(p[0], p[1])) seeds.push({ p, dir: Math.floor(rnd() * 8) }); }
  const out = [], viaDots = [];
  let made = 0, tries = 0;
  while (made < count && tries < count * 60 && seeds.length) {
    tries++;
    const s = seeds[Math.floor(rnd() * seeds.length)];
    let p = [...s.p], dir = s.dir;
    const n = [2, 3, 4, 4, 6, 8][Math.floor(rnd() * 6)];
    const pts = [p];
    const segs = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < segs; i++) {
      const len = 4 + rnd() * 30;
      const q = [p[0] + dirs[dir][0] * len, p[1] + dirs[dir][1] * len];
      let used = len, found = false;
      for (let l = len; l >= 3; l -= 1.5) { const qq = [p[0] + dirs[dir][0] * l, p[1] + dirs[dir][1] * l]; if (ok(p, qq)) { used = l; found = true; p = qq; break; } }
      if (!found) break;
      pts.push(p);
      dir = (dir + (rnd() < 0.5 ? 1 : 7)) % 8;
      if (rnd() < 0.25) dir = (dir + (rnd() < 0.5 ? 1 : 7)) % 8;
    }
    if (pts.length < 3 || lengthSum(pts) < 14) continue;
    mark(pts, 1 + Math.ceil(n / 4));
    const c = chamfer(pts, 2);
    const pitch = 0.55 + rnd() * 0.15;
    bundlePaths(c, n, pitch, pitch).forEach((d) => out.push(d));
    const last = pts[pts.length - 1];
    for (let m = 0; m < n; m++) viaDots.push(at([last[0] + (m - (n - 1) / 2) * pitch * 0.9, last[1], Z0]));
    made++;
  }
  return { d: out.join(""), vias: viaDots };
}
