// Pin-out sheets for the parts you can click. Every sheet is drawn from a table, so numbers and names stay in step.
// "std" sheets follow a published standard or a vendor-neutral JEDEC/IEC pin-out. "ill" sheets are this drawing's own
// pin map for a chip whose real one is under NDA (switch SoC, PHY, TCAM): same package style, invented but consistent.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// pin kinds: p power, g ground, s signal, n no connect, c clock/analog
const kindOf = (name) => {
  if (name === "NC" || name === "DNU" || name === "") return "n";
  if (/^(GND|VSS|VSSQ|VEE|AGND|PGND|EP|GNDA|VeeT|VeeR|DGND)/i.test(name)) return "g";
  if (/^(VCC|VDD|VDDQ|VIN|VBUS|\+?3V3|\+?12V|\+?5V|1V\d|VPP|VREF|VTref|VccT|VccR|AVDD|DVDD|L1|L2|N\b)/.test(name) || /^V(DD|CC)/.test(name)) return "p";
  return "s";
};
const FILL = { p: "var(--anatomy-hi)", g: "var(--anatomy-lo)", s: "var(--anatomy-paper)", n: "none" };
const text = (x, y, t, { size = 5, anchor = "middle", rot = 0, weight = 0, mute = false } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ""} class="pt${mute ? " pm" : ""}"${weight ? ` font-weight="${weight}"` : ""}>${esc(t)}</text>`;
const wrap = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="pn" role="img">${body}</svg>`;
const pad = (x, y, w, h, kind, extra = "") => `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx=".6" fill="${FILL[kind]}" stroke="var(--anatomy-hi)" stroke-width=".5"${kind === "n" ? ' stroke-dasharray="1.2 1.2"' : ""}${extra}/>`;
const pin1 = (x, y, r = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--anatomy-hi)"/>`;
const legendRow = (w, y) =>
  [["p", "power"], ["g", "ground"], ["s", "signal"], ["n", "no connect"]].map(([k2, label], i) => pad(14 + i * 62, y, 7, 7, k2) + text(21 + i * 62, y + 2.2, label, { size: 5, anchor: "start", mute: true })).join("");

// ---- dual-row package (SOIC, TSSOP): pin 1 top left, counter-clockwise -----------------------------------------
function dual(names, { pkg, body = 70, pitch = 17, label = "" }) {
  const w = Math.max(268, body + 160), n = names.length, half = n / 2, h = 60 + half * pitch + 30;
  const x0 = w / 2 - body / 2, y0 = 40;
  let s = `<rect x="${x0}" y="${y0}" width="${body}" height="${half * pitch + 6}" rx="3" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".8"/>`;
  s += pin1(x0 + 7, y0 + 7, 2.4) + text(w / 2, y0 + (half * pitch) / 2 + 3, label, { size: 6.5, weight: 600, rot: -90 });
  for (let i = 0; i < half; i++) {
    const y = y0 + 3 + pitch / 2 + i * pitch;
    const l = names[i], r = names[n - 1 - i];
    s += pad(x0 - 7, y, 12, 7, kindOf(l)) + text(x0 - 17, y + 2, l, { size: 5.6, anchor: "end" }) + text(x0 - 7, y + 1.8, i + 1, { size: 4.6, mute: true });
    s += pad(x0 + body + 7, y, 12, 7, kindOf(r)) + text(x0 + body + 17, y + 2, r, { size: 5.6, anchor: "start" }) + text(x0 + body + 7, y + 1.8, n - i, { size: 4.6, mute: true });
  }
  s += text(w / 2, 22, pkg, { size: 6.5, mute: true }) + legendRow(w, h - 12);
  return wrap(w, h, s);
}

// ---- quad package (QFN, LQFP): pin 1 top of the left side, counter-clockwise --------------------------------------
function quad(names, { pkg, body = 120, label = "", ep = "EP" }) {
  const w = Math.max(268, body + 140), per = names.length / 4, pitch = (body - 12) / per, c = w / 2, x0 = c - body / 2, y0 = 70;
  let s = `<rect x="${x0}" y="${y0}" width="${body}" height="${body}" rx="4" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".8"/>`;
  s += pin1(x0 + 7, y0 + 7, 2.4) + text(c, y0 + body / 2 + 3, label, { size: 7, weight: 600 });
  if (ep) s += `<rect x="${c - 22}" y="${y0 + body / 2 + 12}" width="44" height="26" fill="var(--anatomy-lo)" stroke="var(--anatomy-hi)" stroke-width=".4"/>` + text(c, y0 + body / 2 + 28, ep + " = GND", { size: 5 });
  const long = (t, x, y, a, rot) => text(x, y, t, { size: 4.2, anchor: a, rot });
  for (let i = 0; i < per; i++) {
    const o = 6 + pitch / 2 + i * pitch;
    // left, top to bottom
    s += pad(x0 - 3.5, y0 + o, 6, pitch * 0.62, kindOf(names[i])) + long(names[i], x0 - 8, y0 + o + 1.5, "end", 0);
    // bottom, left to right
    s += pad(x0 + o, y0 + body + 3.5, pitch * 0.62, 6, kindOf(names[per + i])) + long(names[per + i], x0 + o + 1.5, y0 + body + 9, "end", -90);
    // right, bottom to top
    s += pad(x0 + body + 3.5, y0 + body - o, 6, pitch * 0.62, kindOf(names[2 * per + i])) + long(names[2 * per + i], x0 + body + 8, y0 + body - o + 1.5, "start", 0);
    // top, right to left
    s += pad(x0 + body - o, y0 - 3.5, pitch * 0.62, 6, kindOf(names[3 * per + i])) + long(names[3 * per + i], x0 + body - o + 1.5, y0 - 9, "start", -90);
    // numbers on the package
    if (i % 4 === 0 || i === per - 1) {
      s += text(x0 + 4.5, y0 + o + 1.3, i + 1, { size: 3.6, mute: true });
      s += text(x0 + o, y0 + body - 2.5, per + i + 1, { size: 3.6, mute: true });
      s += text(x0 + body - 4.5, y0 + body - o + 1.3, 2 * per + i + 1, { size: 3.6, mute: true, anchor: "end" });
      s += text(x0 + body - o, y0 + 6.5, 3 * per + i + 1, { size: 3.6, mute: true });
    }
  }
  const h = y0 + body + 80;
  s += text(c, 18, pkg, { size: 6.5, mute: true }) + legendRow(w, h - 12);
  return wrap(w, h, s);
}

// ---- ball grid: rows letters top to bottom, columns left to right ----------------------------------------------
function bga(rows, cols, ball, { pkg, cell = 18, label = "", fs = 3.6 }) {
  const gw = cols.length * cell, w = Math.max(268, gw + 64), gh = rows.length * cell, x0 = (w - gw) / 2 + 6, y0 = 50;
  let s = `<rect x="${x0 - 6}" y="${y0 - 6}" width="${gw + 12}" height="${gh + 12}" rx="3" fill="none" stroke="var(--anatomy-hi)" stroke-width=".8"/>`;
  s += pin1(x0 - 1, y0 - 1, 2);
  cols.forEach((c, j) => { s += text(x0 + j * cell + cell / 2, y0 - 9, c, { size: 5, mute: true }); });
  rows.forEach((r, i) => { s += text(x0 - 11, y0 + i * cell + cell / 2 + 1.8, r, { size: 5, mute: true }); });
  rows.forEach((r, i) => cols.forEach((c, j) => {
    const nm = ball(r, c);
    if (nm == null) return;
    const kind = kindOf(nm), cx = x0 + j * cell + cell / 2, cy = y0 + i * cell + cell / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="${cell * 0.46}" fill="${FILL[kind]}" stroke="var(--anatomy-hi)" stroke-width=".4"${kind === "n" ? ' stroke-dasharray="1 1"' : ""}/>`;
    s += text(cx, cy + 1.2, nm.length > 7 ? nm.slice(0, 7) : nm, { size: fs, mute: false, ...(kind === "p" ? {} : {}) }).replace('class="pt', `class="pt${kind === "p" ? " pw" : ""}`);
  }));
  const h = y0 + gh + 50;
  s += text(w / 2, 20, pkg, { size: 6.5, mute: true }) + text(w / 2, 32, label, { size: 6, weight: 600 }) + legendRow(w, h - 12);
  return wrap(w, h, s);
}

// ---- pin header, N columns x R rows; odd pins on the top row (pin 1 marked) -------------------------------------
function header(names, { cols, rows, pkg, cell = 30, label = "" }) {
  const gw = cols * cell, w = Math.max(268, gw + 110), gh = rows * cell, x0 = (w - gw) / 2, y0 = 70;
  let s = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${gw + 16}" height="${gh + 16}" rx="2" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".8"/>`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const n = rows === 1 ? c : c * rows + r, nm = names[n] ?? "NC";
    const cx = x0 + c * cell + cell / 2, cy = y0 + r * cell + cell / 2;
    s += `<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" ${n === 0 ? "" : 'rx="6"'} fill="${FILL[kindOf(nm)]}" stroke="var(--anatomy-hi)" stroke-width=".6"/>` + text(cx, cy + 1.6, n + 1, { size: 5, ...(kindOf(nm) === "p" ? {} : {}) }).replace('class="pt', `class="pt${kindOf(nm) === "p" ? " pw" : ""}`);
    s += text(cx, r === 0 ? cy - 12 : cy + 17, nm, { size: 5 });
  }
  const h = y0 + gh + 50;
  return wrap(w, h, s + text(w / 2, 20, pkg, { size: 6.5, mute: true }) + text(w / 2, 40, label, { size: 6.5, weight: 600 }) + legendRow(w, h - 12));
}

// ---- RJ45 face-on (8P8C): contacts 1..8 left to right with the latch at the bottom ----------------------------------
function rj45(names, { pkg, label = "", leds = true, bar = [] }) {
  const w = 268, cx = w / 2, y0 = 56;
  let s = `<rect x="${cx - 62}" y="${y0}" width="124" height="104" rx="4" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width="1"/>`;
  s += `<rect x="${cx - 46}" y="${y0 + 16}" width="92" height="74" fill="var(--anatomy-lo)" stroke="var(--anatomy-hi)" stroke-width=".6"/>`;
  s += `<rect x="${cx - 14}" y="${y0 + 84}" width="28" height="12" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".6"/>`;
  names.forEach((nm, i) => {
    const x = cx - 40.25 + i * 11.5, kind = kindOf(nm);
    s += `<rect x="${x - 2.4}" y="${y0 + 22}" width="4.8" height="32" fill="${FILL[kind] === "none" ? "var(--anatomy-paper)" : FILL[kind]}" stroke="var(--anatomy-hi)" stroke-width=".5"/>` + text(x, y0 + 62, i + 1, { size: 6, weight: 600 }) + text(x, y0 - 6 + (i % 2) * -8, nm, { size: 5 });
    s += `<line x1="${x}" y1="${y0 + 22}" x2="${x}" y2="${y0 - 3 - (i % 2) * 8 + 2}" stroke="var(--anatomy-lo)" stroke-width=".3"/>`;
  });
  if (leds) s += `<rect x="${cx - 56}" y="${y0 + 100}" width="10" height="6" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".5"/><rect x="${cx + 46}" y="${y0 + 100}" width="10" height="6" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".5"/>` + text(cx - 51, y0 + 116, "LED L", { size: 4.6, mute: true }) + text(cx + 51, y0 + 116, "LED R", { size: 4.6, mute: true });
  const h = 260;
  bar.forEach((t, i) => { s += text(cx, 192 + i * 11, t, { size: 5.4, mute: i > 0 }); });
  return wrap(w, h, s + text(w / 2, 18, pkg, { size: 6.5, mute: true }) + text(w / 2, 30, label, { size: 6.5, weight: 600 }));
}

// ---- SFP edge connector: 20 contacts in two rows -----------------------------------------------------------------
function sfp(names, { pkg, label }) {
  const w = 370, x0 = 38, step = 32, y0 = 80;
  let s = `<rect x="${x0 - 22}" y="${y0 - 34}" width="${step * 9 + 44}" height="108" rx="4" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width="1"/>`;
  for (let i = 0; i < 10; i++) {
    const x = x0 + i * step;
    // bottom row pins 1..10, top row 20..11 (pin 20 above pin 1)
    s += pad(x, y0 + 28, 14, 22, kindOf(names[i])) + text(x, y0 + 31, i + 1, { size: 6, weight: 600 }).replace('class="pt', `class="pt${kindOf(names[i]) === "p" ? " pw" : ""}`) + text(x, y0 + 52, names[i], { size: 5 });
    s += pad(x, y0 - 12, 14, 22, kindOf(names[19 - i])) + text(x, y0 - 9, 20 - i, { size: 6, weight: 600 }).replace('class="pt', `class="pt${kindOf(names[19 - i]) === "p" ? " pw" : ""}`) + text(x, y0 - 28, names[19 - i], { size: 5 });
  }
  s += text(w / 2, 18, pkg, { size: 6.5, mute: true }) + text(w / 2, 30, label, { size: 6.5, weight: 600 });
  s += text(w / 2, y0 + 82, "host side card-edge: bottom row 1-10, top row 20-11", { size: 5, mute: true });
  return wrap(w, 220, s + legendRow(w, 208));
}

// ---- a few pins in a row: crystal, USB, power block, fan, battery ---------------------------------------------------
function strip(names, { pkg, label, shape = "rect", pitch = 60 }) {
  const n = names.length, gw = (n - 1) * pitch, w = Math.max(268, gw + 170), x0 = w / 2 - gw / 2, y0 = 90;
  let s = `<rect x="${x0 - 40}" y="${y0 - 36}" width="${gw + 80}" height="72" rx="${shape === "round" ? 36 : 4}" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".9"/>`;
  names.forEach((nm, i) => {
    const x = x0 + i * pitch;
    s += pad(x, y0, 16, 24, kindOf(nm)) + text(x, y0 + 2.2, i + 1, { size: 7, weight: 600, ...(kindOf(nm) === "p" ? {} : {}) }).replace('class="pt', `class="pt${kindOf(nm) === "p" ? " pw" : ""}`) + text(x, y0 + 50, nm, { size: 6 });
  });
  const h = 190;
  return wrap(w, h, s + text(w / 2, 18, pkg, { size: 6.5, mute: true }) + text(w / 2, 30, label, { size: 6.5, weight: 600 }) + legendRow(w, h - 12));
}

// ---- tables -----------------------------------------------------------------------------------------------------------
const tbl = (rows) => `<table class="pk"><tbody>${rows.map(([a, b, c]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td>${c !== undefined ? `<td>${esc(c)}</td>` : ""}</tr>`).join("")}</tbody></table>`;
const table = (rows) => (rows.length > 9 ? `<div class="pk2">${tbl(rows.slice(0, Math.ceil(rows.length / 2)))}${tbl(rows.slice(Math.ceil(rows.length / 2)))}</div>` : tbl(rows));

// ===== data ==========================================================================================================
// 8P8C jack, 1000BASE-T (IEEE 802.3 clause 40), TIA-568B pair colours
const RJ45 = ["TD0+", "TD0-", "TD1+", "TD2+", "TD2-", "TD1-", "TD3+", "TD3-"];
const RJ45_COLOR = ["white/orange", "orange", "white/green", "blue", "white/blue", "green", "white/brown", "brown"];
// RJ45 console, Cisco rollover style
const CONSOLE = ["RTS", "DTR", "TXD", "GND", "GND", "RXD", "DSR", "CTS"];
// SFP, INF-8074 / SFF-8431
const SFP = ["VeeT", "TX_Fault", "TX_Disable", "SDA", "SCL", "MOD_ABS", "RS0", "RX_LOS", "RS1", "VeeR", "VeeR", "RD-", "RD+", "VeeR", "VccR", "VccT", "VeeT", "TD+", "TD-", "VeeT"];
const SFP_NOTE = ["1 VeeT", "2 TX_Fault", "3 TX_Disable", "4 MOD-DEF2 (SDA)", "5 MOD-DEF1 (SCL)", "6 MOD-DEF0 (MOD_ABS)", "7 RS0", "8 LOS", "9 RS1", "10-11 VeeR", "12 RD-", "13 RD+", "14 VeeR", "15 VccR", "16 VccT", "17 VeeT", "18 TD+", "19 TD-", "20 VeeT"];
// W25Q128JV, SOIC-8 (208 mil)
const FLASH = ["/CS", "DO (IO1)", "/WP (IO2)", "GND", "DI (IO0)", "CLK", "/HOLD (IO3)", "VCC"];
// 24C02, SOIC-8
const EEPROM = ["A0", "A1", "A2", "GND", "SDA", "SCL", "WP", "VCC"];
// TPS54331-class buck, SOIC-8
const BUCK = ["BOOT", "VIN", "EN", "SS/TR", "VSENSE", "COMP", "GND", "PH"];
// 74HC595, SOIC-16
const SR = ["QB", "QC", "QD", "QE", "QF", "QG", "QH", "GND", "QH'", "SRCLR", "SRCLK", "RCLK", "OE", "SER", "QA", "VCC"];
// MAX3232, SOIC-16
const RS232 = ["C1+", "V+", "C1-", "C2+", "C2-", "V-", "T2OUT", "R2IN", "R2OUT", "T2IN", "T1IN", "R1OUT", "R1IN", "T1OUT", "GND", "VCC"];
// ARM Cortex debug 2x5 1.27 mm (odd pins top row, as drawn: 1 3 5 7 9 / 2 4 6 8 10)
const JTAG = ["VTref", "TMS", "GND", "TCK", "GND", "TDO", "KEY", "TDI", "GNDDetect", "nRESET"];
const UART = ["3V3", "TXD", "RXD", "GND"];
// DDR3 x16, 96-ball FBGA (JEDEC), top view, columns 1-3 and 7-9
const D3 = {
  A: ["VDDQ", "DQU5", "DQU7", "DQU4", "VDDQ", "VSS"],
  B: ["VSSQ", "VDD", "VSS", "DQSU#", "DQU6", "VSSQ"],
  C: ["VDDQ", "DQU3", "DQU1", "DQSU", "DQU2", "VDDQ"],
  D: ["VSSQ", "VDDQ", "DQU0", "DMU", "VSSQ", "VDD"],
  E: ["VSS", "VSSQ", "DQL0", "DML", "VSSQ", "VDDQ"],
  F: ["VDDQ", "DQL2", "DQSL", "DQL1", "DQL3", "VSSQ"],
  G: ["VSSQ", "DQL6", "DQSL#", "VDD", "VSS", "VSSQ"],
  H: ["VREFDQ", "VDDQ", "DQL4", "DQL7", "DQL5", "VDDQ"],
  J: ["NC", "VSS", "RAS#", "CK", "VSS", "NC"],
  K: ["ODT", "VDD", "CAS#", "CK#", "VDD", "CKE"],
  L: ["NC", "CS#", "WE#", "A10/AP", "ZQ", "NC"],
  M: ["VSS", "BA0", "BA2", "A15", "VREFCA", "VSS"],
  N: ["VDD", "A3", "A0", "A12/BC#", "BA1", "VDD"],
  P: ["VSS", "A5", "A2", "A1", "A4", "VSS"],
  R: ["VDD", "A7", "A9", "A11", "A6", "VDD"],
  T: ["VSS", "RESET#", "A13", "A14", "A8", "VSS"],
};
const D3_COLS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const D3_BALL = (r, c) => { const i = [1, 2, 3, 7, 8, 9].indexOf(Number(c)); return i < 0 ? null : D3[r][i]; };

// quad PHY, QFN-64 (illustrative): four ports of four pairs, QSGMII to the switch, management and LED pins
const mdi = (p) => ["0P", "0N", "1P", "1N", "2P", "2N", "3P", "3N"].map((s) => `P${p}_MDI${s}`);
const PHY = [
  // left side: power and management (1-16)
  "AVDD", "GND", "XI", "XO", "REXT", "AVDD", "MDC", "MDIO", "RESET#", "INT#", "PHYAD0", "PHYAD1", "DVDD", "GND", "AVDD", "GND",
  // bottom: ports 2 and 3 analog (17-32)
  ...mdi(2), ...mdi(3),
  // right side: QSGMII and LED (33-48)
  "QSG_TXP", "QSG_TXN", "GND", "QSG_RXP", "QSG_RXN", "GND", "QSG_CKP", "QSG_CKN", "DVDD", "LED0_0", "LED0_1", "LED1_0", "LED1_1", "LED2_0", "LED3_0", "LED3_1",
  // top: ports 0 and 1 analog (49-64), listed right to left
  ...mdi(0), ...mdi(1),
];

// management SoC, BGA-256, 16 x 16 (illustrative); rows A..T without I O Q S X Z
const ROWS16 = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "T"];
const COLS16 = Array.from({ length: 16 }, (_, i) => String(i + 1));
const socMap = (() => {
  const m = {};
  const ddr = [...Array.from({ length: 16 }, (_, i) => "DDR_A" + i), "DDR_BA0", "DDR_BA1", "DDR_BA2", "DDR_RAS#", "DDR_CAS#", "DDR_WE#", "DDR_CS#", "DDR_CKE", "DDR_ODT", "DDR_CK", "DDR_CK#", "DDR_RST#", ...Array.from({ length: 32 }, (_, i) => "DDR_DQ" + i), "DDR_DQS0", "DDR_DQS1", "DDR_DQS2", "DDR_DQS3", "DDR_DM0", "DDR_DM1"];
  const io = ["SPI_CLK", "SPI_CS#", "SPI_MOSI", "SPI_MISO", "SPI_WP#", "SPI_HD#", "UART0_TX", "UART0_RX", "I2C_SCL", "I2C_SDA", "MDC", "MDIO", "TCK", "TMS", "TDI", "TDO", "TRST#", "RESET#", "XI", "XO", "SYSCLK", "GPIO0", "GPIO1", "GPIO2", "GPIO3", "GPIO4", "GPIO5", "GPIO6", "GPIO7", "LED_CLK", "LED_DAT", "LED_LAT", "FAN_PWM", "FAN_TACH", "PWR_GD", "WDOG#"];
  const ser = ["QSG0_TXP", "QSG0_TXN", "QSG0_RXP", "QSG0_RXN", "QSG1_TXP", "QSG1_TXN", "QSG1_RXP", "QSG1_RXN", "SG8_TXP", "SG8_TXN", "SG8_RXP", "SG8_RXN", "SG9_TXP", "SG9_TXN", "SG9_RXP", "SG9_RXN", "SERDES_REFP", "SERDES_REFN"];
  let di = 0, ii = 0, si = 0;
  ROWS16.forEach((r, ri) => COLS16.forEach((c, ci) => {
    const core = ri >= 5 && ri <= 10 && ci >= 5 && ci <= 10;
    const ring = ri === 4 || ri === 11 || ci === 4 || ci === 11;
    let nm;
    if (core) nm = (ri + ci) % 2 ? "GND" : "VDDC";
    else if (ring && !(ri < 4 || ri > 11) ) nm = (ri + ci) % 3 === 0 ? "GND" : (ri + ci) % 3 === 1 ? "VDD33" : "VDDIO";
    else if (ri < 4) nm = ddr[di++] ?? "GND";
    else if (ci < 4) nm = ser[si++] ?? ((ri + ci) % 2 ? "GND" : "AVDD");
    else if (ci > 11) nm = io[ii++] ?? ((ri + ci) % 2 ? "GND" : "VDD33");
    else nm = io[ii++] ?? ((ri + ci) % 2 ? "GND" : "VDDIO");
    m[r + c] = nm;
  }));
  return m;
})();

// memory-style grids for TCAM / SRAM / CPLD are not tabulated pin by pin: they use the same helper with a family tag
const FAMILY = (prefix, rows, cols, n) => {
  const m = {};
  let i = 0;
  rows.forEach((r, ri) => cols.forEach((c, ci) => { m[r + c] = (ri + ci) % 5 === 0 ? "GND" : (ri + ci) % 5 === 1 ? "VDD" : prefix + (i++); }));
  return m;
};

const ROWS14 = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P"];
const COLS14 = Array.from({ length: 14 }, (_, i) => String(i + 1));
const TCAM = FAMILY("I", ROWS14, COLS14);
const ROWS10 = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];
const COLS10 = Array.from({ length: 10 }, (_, i) => String(i + 1));
const SRAM = FAMILY("D", ROWS10, COLS10);

// MCU, LQFP-48 (illustrative, generic Cortex-M style)
const MCU = [
  "VBAT", "PC13", "PC14", "PC15", "PD0", "PD1", "NRST", "VSSA", "VDDA", "PA0", "PA1", "PA2",
  "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1", "PB2", "PB10", "PB11", "GND", "VDD",
  "PB12", "PB13", "PB14", "PB15", "PA8", "PA9", "PA10", "PA11", "PA12", "SWDIO", "GND", "VDD",
  "SWCLK", "PA15", "PB3", "PB4", "PB5", "PB6", "PB7", "BOOT0", "PB8", "PB9", "GND", "VDD",
];
const LQ_CLK = ["VDD", "GND", "XI", "XO", "OE", "S0", "S1", "S2", "CLK0", "CLK1", "CLK2", "CLK3", "VDD", "GND", "CLK4", "CLK5", "CLK6", "CLK7", "GND", "VDD", "SCL", "SDA", "REFSEL", "LOCK", "VDD", "GND", "XI2", "XO2", "NC", "NC", "RST#", "GND", "VDD", "GND", "NC", "NC", "SS0", "SS1", "SS2", "PD#", "CLK8", "CLK9", "GND", "VDD", "VDD", "GND", "NC", "NC"];
const LED_DRV = Array.from({ length: 48 }, (_, i) => (i % 12 === 0 ? "VDD" : i % 12 === 6 ? "GND" : i < 24 ? "LED" + i : "SEG" + (i - 24)));
const QFN24 = (a) => a;
const IOX = ["GPIO" + 0, "GPIO1", "GPIO2", "GPIO3", "GPIO4", "GPIO5", "VDD", "GND", "SCL", "SDA", "INT#", "A0", "A1", "A2", "GPIO6", "GPIO7", "RST#", "NC", "VDD", "GND", "GPIO8", "GPIO9", "GPIO10", "GPIO11"];

// ===== panels ========================================================================================================
const std = "Pin-out follows the published standard or datasheet.";
const ill = "Illustrative pin map: the real part's pin-out is under NDA, so this sheet keeps the package style and signal families but the numbering is this drawing's own.";
const badge = (k2) => (k2 === "std" ? "standard pin-out" : "illustrative pin map");

export const PANELS = {
  rj45: { ref: "CN1-CN8", kind: "std", title: "RJ45 jack, 1000BASE-T", sub: "8P8C with integrated magnetics, 2 LEDs",
    svg: rj45(RJ45, { pkg: "8P8C shielded, front view (contacts up)", label: "IEEE 802.3 clause 40", bar: ["pairs: 1-2, 3-6, 4-5, 7-8   (TIA-568B colours below)"] }),
    note: table(RJ45.map((n, i) => [String(i + 1), n, RJ45_COLOR[i]])) },
  console: { ref: "CN11", kind: "std", title: "RJ45 console, RS-232", sub: "Cisco-style rollover pin-out, 115200 8N1",
    svg: rj45(CONSOLE, { pkg: "8P8C, front view", label: "console", leds: false, bar: ["goes through U15 (MAX3232) to the SoC UART"] }),
    note: table(CONSOLE.map((n, i) => [String(i + 1), n])) },
  sfp: { ref: "CN9-CN10", kind: "std", title: "SFP cage, 1000BASE-X", sub: "20-pin host connector, INF-8074 / SFF-8431",
    svg: sfp(SFP, { pkg: "SFP+ cage with 20-pin edge connector", label: "empty cage" }),
    note: table(SFP_NOTE.map((s) => [s.split(" ")[0], s.split(" ").slice(1).join(" ")])) },
  usb: { ref: "CN12", kind: "std", title: "USB-A socket, USB 2.0", sub: "4 contacts, host port for firmware updates",
    svg: strip(["VBUS", "D-", "D+", "GND"], { pkg: "USB Type-A receptacle, front view", label: "USB 2.0", pitch: 56 }),
    note: table([["1", "VBUS +5V"], ["2", "D-"], ["3", "D+"], ["4", "GND"]]) },
  flash: { ref: "U6", kind: "std", title: "Boot flash, 128 Mbit SPI NOR", sub: "W25Q128JV in SOIC-8 (208 mil), 16 MB",
    svg: dual(FLASH, { pkg: "SOIC-8, top view", label: "W25Q128JV", pitch: 22, body: 84 }),
    note: table(FLASH.map((n, i) => [String(i + 1), n])) },
  eeprom: { ref: "U7", kind: "std", title: "Serial EEPROM, 2 kbit", sub: "24C02 in SOIC-8: MAC address and config",
    svg: dual(EEPROM, { pkg: "SOIC-8, top view", label: "24C02", pitch: 22, body: 84 }),
    note: table(EEPROM.map((n, i) => [String(i + 1), n])) },
  buck: { ref: "U9 U10 U12", kind: "std", title: "Step-down regulator", sub: "TPS54331-class 3 A buck in SOIC-8",
    svg: dual(BUCK, { pkg: "SOIC-8, top view", label: "BUCK", pitch: 22, body: 84 }),
    note: table(BUCK.map((n, i) => [String(i + 1), n])) },
  sr: { ref: "U23-U25", kind: "std", title: "LED shift register", sub: "74HC595, 8-bit serial in, parallel out, SOIC-16",
    svg: dual(SR, { pkg: "SOIC-16, top view", label: "74HC595", pitch: 20, body: 84 }),
    note: table(SR.map((n, i) => [String(i + 1), n])) },
  rs232: { ref: "U15", kind: "std", title: "RS-232 transceiver", sub: "MAX3232 dual driver/receiver, SOIC-16",
    svg: dual(RS232, { pkg: "SOIC-16, top view", label: "MAX3232", pitch: 20, body: 84 }),
    note: table(RS232.map((n, i) => [String(i + 1), n])) },
  ddr: { ref: "U2-U5", kind: "std", title: "DDR3 SDRAM, x16", sub: "96-ball FBGA, JEDEC ball map (balls 4-6 absent), top view",
    svg: bga("ABCDEFGHJKLMNPRT".split(""), D3_COLS, D3_BALL, { pkg: "FBGA-96, 9 x 16 grid, 0.8 mm pitch", label: "DDR3 / DDR3L x16", cell: 20, fs: 3.8 }),
    note: "<p class=\"nt\">Balls A1 VDDQ, J1 and J9 NC, T2 RESET#. Rows skip I, O, Q.</p>" },
  jtag: { ref: "J1", kind: "std", title: "JTAG / SWD header", sub: "ARM Cortex debug connector, 2x5, 1.27 mm",
    svg: header(JTAG, { cols: 5, rows: 2, pkg: "2x5 header, top view, odd pins on the top row", label: "pin 1 square" }),
    note: table(JTAG.map((n, i) => [String(i + 1), n])) },
  uart: { ref: "J2", kind: "std", title: "UART header", sub: "3.3 V logic console, 115200 8N1",
    svg: strip(UART, { pkg: "1x4 header, 2.54 mm", label: "pin 1 square", pitch: 60 }),
    note: table(UART.map((n, i) => [String(i + 1), n])) },
  crystal: { ref: "Y1 Y2", kind: "std", title: "Crystal, 25 MHz", sub: "3.2 x 2.5 mm, 4 pads",
    svg: strip(["XTAL1", "GND", "XTAL2", "GND"], { pkg: "SMD-4 pads 1-2-3-4", label: "25.000 MHz, 10 pF", pitch: 56 }),
    note: table([["1", "XTAL1"], ["2", "GND (case)"], ["3", "XTAL2"], ["4", "GND (case)"]]) },
  fan: { ref: "FAN1 FAN2", kind: "std", title: "Fan, 40 mm", sub: "4-wire PWM, speed follows traffic",
    svg: strip(["GND", "+12V", "TACH", "PWM"], { pkg: "4-pin fan header", label: "Intel 4-wire fan spec", pitch: 56 }),
    note: table([["1", "GND"], ["2", "+12 V"], ["3", "TACH (sense)"], ["4", "PWM 25 kHz"]]) },
  psu: { ref: "PS1", kind: "std", title: "Power supply, 12 V 2.5 A", sub: "mains inlet and DC harness",
    svg: strip(["L", "N", "PE"], { pkg: "AC inlet terminal", label: "100-240 V ~, 50/60 Hz", pitch: 80 }),
    note: table([["L", "line"], ["N", "neutral"], ["PE", "protective earth (chassis stud)"], ["DC", "+12 V, GND to J5 (6-pin)"]]) },
  coin: { ref: "BT1", kind: "std", title: "Coin cell, CR2032", sub: "RTC and config backup",
    svg: strip(["+", "-"], { pkg: "CR2032 holder", label: "3 V lithium", shape: "round", pitch: 80 }),
    note: table([["+", "case (top) 3 V"], ["-", "back, to GND via holder"]]) },
  reset: { ref: "SW1", kind: "std", title: "Reset switch", sub: "tactile switch, 4 legs, shorted in pairs",
    svg: strip(["A", "A'", "B", "B'"], { pkg: "6 x 6 mm tact", label: "A-A' and B-B' joined inside", pitch: 56 }),
    note: table([["A, A'", "to RESET# net"], ["B, B'", "GND"]]) },
  phy: { ref: "U30 U31", kind: "ill", title: "Quad gigabit PHY", sub: "4 x 10/100/1000BASE-T, QSGMII to the switch core",
    svg: quad(PHY, { pkg: "QFN-64 8 x 8 mm, top view", label: "PHY-4P", body: 190 }),
    note: `<p class="nt">${ill}</p>` },
  soc: { ref: "U1", kind: "ill", title: "Switch SoC", sub: "switching core, CPU and memory controller",
    svg: bga(ROWS16, COLS16, (r, c) => socMap[r + c], { pkg: "BGA-256, 16 x 16, 1.0 mm pitch", label: "NSW-SOC-1200", cell: 22, fs: 4.3 }),
    note: `<p class="nt">${ill}</p>` },
  tcam: { ref: "U16", kind: "ill", title: "TCAM, 64K entries", sub: "ACL and routing lookup",
    svg: bga(ROWS14, COLS14, (r, c) => TCAM[r + c], { pkg: "BGA-196, 14 x 14", label: "TCAM-64K", cell: 24, fs: 4.6 }),
    note: `<p class="nt">${ill}</p>` },
  sram: { ref: "U17", kind: "ill", title: "Packet SRAM", sub: "frame buffers",
    svg: bga(ROWS10, COLS10, (r, c) => SRAM[r + c], { pkg: "BGA-100, 10 x 10", label: "SRAM", cell: 32, fs: 5.6 }),
    note: `<p class="nt">${ill}</p>` },
  cpld: { ref: "U21", kind: "ill", title: "CPLD", sub: "glue logic, reset sequencing, front-panel LEDs",
    svg: bga(ROWS14, COLS14, (r, c) => TCAM[r + c].replace(/^I/, "IO"), { pkg: "BGA-196, 14 x 14", label: "CPLD-256", cell: 24, fs: 4.6 }),
    note: `<p class="nt">${ill}</p>` },
  mcu: { ref: "U8", kind: "ill", title: "Management MCU", sub: "fans, power sequencing, temperature",
    svg: quad(MCU, { pkg: "LQFP-48 7 x 7 mm, top view", label: "MCU48", ep: "", body: 170 }),
    note: `<p class="nt">${ill}</p>` },
  clk: { ref: "U13", kind: "ill", title: "Clock generator", sub: "25 MHz in, ten outputs",
    svg: quad(LQ_CLK, { pkg: "LQFP-48 7 x 7 mm, top view", label: "CLK", ep: "", body: 170 }),
    note: `<p class="nt">${ill}</p>` },
  leddrv: { ref: "U19", kind: "ill", title: "LED driver", sub: "port and system LEDs, 24 channels",
    svg: quad(LED_DRV, { pkg: "LQFP-48 10 x 10 mm, top view", label: "LED-DRV", ep: "", body: 190 }),
    note: `<p class="nt">${ill}</p>` },
  iox: { ref: "U14", kind: "ill", title: "I/O expander", sub: "I2C, 12 lines",
    svg: quad(IOX, { pkg: "QFN-24 4 x 4 mm, top view", label: "IOX", body: 120 }),
    note: `<p class="nt">${ill}</p>` },
  heat: { ref: "U1", kind: "std", title: "Heatsink on U1", sub: "finned aluminium, clip-on",
    svg: strip(["fin pitch 2 mm", "7 fins", "5 mm tall"], { pkg: "clip-on heatsink", label: "thermal pad 1.5 W/mK", pitch: 100 }),
    note: table([["Rth", "about 9 K/W with 1 m/s airflow"], ["Pad", "0.5 mm gap pad onto the lid"]]) },
};
for (const p of Object.values(PANELS)) p.badge = badge(p.kind);
