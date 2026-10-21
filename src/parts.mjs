// The parts library: real package shapes at real size. Flat things (passives, pads, silkscreen) are
// collected as paths and drawn once on the board; tall things return their own solids.
import { k, P, Z0, at, L, D, S, slab, cyl, rectD, rectY, rectX, mat, reserve } from "./scene.mjs";

export const SILK = [];
export const silkFor = (c, name) => SILK.push({ c, name });
const lotOf = (text) => { let h = 7; for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 9973; return `${2300 + (h % 90)} ${"ABCDEFGHJK"[h % 10]}${(h % 7) + 1}`; };

// ---- flat parts: one path per kind -------------------------------------------------------------------
const SIZES = { "0402": [1.2, 0.6], "0603": [1.9, 1], "0805": [2.4, 1.5], "1206": [3.8, 1.9], "1210": [3.8, 3] };
export const PASS = { cap: [], res: [], end: [], pad: [], via: [], pin1: [], tp: [], mark: [] };
export function smd(x, y, kind = "cap", horiz = true, size = "0603") {
  const [w, d] = SIZES[size];
  const [pw, pd] = horiz ? [w, d] : [d, w];
  const z = Z0 + (kind === "res" ? 0.3 : 0.55);
  PASS[kind === "res" ? "res" : "cap"].push(rectD(x, y, pw, pd, z));
  if (horiz) PASS.end.push(k.lineOnTop([x + 0.38, y], [x + 0.38, y + pd], z, P), k.lineOnTop([x + pw - 0.38, y], [x + pw - 0.38, y + pd], z, P));
  else PASS.end.push(k.lineOnTop([x, y + 0.38], [x + pd, y + 0.38], z, P), k.lineOnTop([x, y + pw - 0.38], [x + pd, y + pw - 0.38], z, P));
  const pad = 0.35;
  PASS.pad.push(rectD(x - pad, y - pad, pw + 2 * pad, pd + 2 * pad, Z0 + 0.04));
  reserve({ x, y, w: pw, d: pd }, 0.5);
}
export function smdRow(x, y, count, pitch, kind = "cap", along = "x", size = "0603") {
  for (let i = 0; i < count; i++) {
    const horiz = along === "x";
    smd(horiz ? x + i * pitch : x, horiz ? y : y + i * pitch, kind, size === "0603" || size === "0402" ? horiz : horiz, size);
  }
}
// a square lattice of capacitors, e.g. under the shadow of a BGA
export function smdGrid(x, y, cols, rows, px, py, kind = "cap", size = "0402") {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) smd(x + i * px, y + j * py, kind, true, size);
}
export function testPoint(x, y, r = 0.9) {
  PASS.tp.push(k.ring(x, y, r, Z0 + 0.1, P, 10), k.ring(x, y, r * 0.45, Z0 + 0.1, P, 8));
  reserve({ x: x - r, y: y - r, w: 2 * r, d: 2 * r }, 0.4);
}
export function via(x, y, r = 0.55) {
  PASS.via.push(at([x, y, Z0 + 0.05]));
}
export function flatSvg() {
  const out = [];
  if (PASS.pad.length) out.push(L(PASS.pad.join(""), { tone: "hi", className: "ln-pad" }));
  if (PASS.cap.length) out.push(`<path class="pc" d="${PASS.cap.join("")}"/>`);
  if (PASS.res.length) out.push(`<path class="pr" d="${PASS.res.join("")}"/>`);
  if (PASS.end.length) out.push(L(PASS.end.join(""), { tone: "hi", className: "ln-end", free: true }));
  if (PASS.tp.length) out.push(L(PASS.tp.join(""), { tone: "hi" }));
  if (PASS.via.length) out.push(D(PASS.via, { size: 0.5, tone: "hi" }));
  return out.join("");
}

// ---- markings, pin one, leads ---------------------------------------------------------------------------
const pinOne = (c, z, r = 0.55) => D([at([c.x + 1.7, c.y + 1.7, z])], { size: r, tone: "hi" });
export function marking(c, z, text, size = 1.9) {
  const big = c.d > 9 && c.w > 12;
  const main = k.faceTextSvg(k.topMatrix([c.x + c.w / 2, c.y + c.d / 2 + size * (big ? -0.2 : 0.35)], z, P, "x"), text, { size, tone: "hi", anchor: "middle" });
  const lot = big ? k.faceTextSvg(k.topMatrix([c.x + c.w / 2, c.y + c.d / 2 + size * 1.25], z, P, "x"), lotOf(text), { size: size * 0.7, tone: "mid", anchor: "middle" }) : "";
  const logo = c.w > 18 ? k.faceTextSvg(k.topMatrix([c.x + c.w / 2, c.y + c.d / 2 + size * 2.5], z, P, "x"), "(c) NSW 2026", { size: size * 0.55, tone: "faint", anchor: "middle" }) : "";
  return main + lot + logo;
}
// gull-wing leads on all four sides: a shoulder at body height and a foot on the board
function leadsOf(c, pitch, len, z, sides = "xy") {
  const lines = [], dots = [], foot = [];
  const nx = Math.floor((c.w - 2.4) / pitch), ny = Math.floor((c.d - 2.4) / pitch);
  const ox = c.x + (c.w - nx * pitch) / 2, oy = c.y + (c.d - ny * pitch) / 2;
  if (sides.includes("x")) for (let i = 0; i <= nx; i++) {
    const x = ox + i * pitch;
    lines.push(k.lineOnTop([x, c.y], [x, c.y - len], z, P), k.lineOnTop([x, c.y + c.d], [x, c.y + c.d + len], z, P));
    dots.push(at([x, c.y - len, z]), at([x, c.y + c.d + len, z]));
  }
  if (sides.includes("y")) for (let j = 0; j <= ny; j++) {
    const y = oy + j * pitch;
    lines.push(k.lineOnTop([c.x, y], [c.x - len, y], z, P), k.lineOnTop([c.x + c.w, y], [c.x + c.w + len, y], z, P));
    dots.push(at([c.x - len, y, z]), at([c.x + c.w + len, y, z]));
  }
  return L(lines.join(""), { tone: "mid" }) + D(dots, { size: 0.32, tone: "hi" }) + (foot.length ? L(foot.join(""), { tone: "faint" }) : "");
}

// ---- IC packages -----------------------------------------------------------------------------------------
export function qfp(c, mark, name, { pitch = 0.65, h = 1.9, len = 1.7 } = {}) {
  const top = Z0 + 0.35 + h;
  const o = [slab(c, Z0 + 0.35, h, "mid", 3, 0.4, { crease: "lo" })];
  o.push(L(k.planOutline(k.insetPlan(c, 0.9), top, P, 3), { tone: "faint" }));
  o.push(L(k.planOutline({ x: c.x + c.w / 2 - c.w * 0.18, y: c.y + c.d / 2 - c.d * 0.18, w: c.w * 0.36, d: c.d * 0.36, r: 0.5 }, top, P, 3), { tone: "faint" }));
  o.push(pinOne(c, top), marking(c, top, mark, Math.min(2.4, c.w / 7)));
  o.push(leadsOf(c, pitch, len, Z0 + 0.5));
  if (name) silkFor({ x: c.x - 3, y: c.y - 3, w: c.w + 6, d: c.d + 6 }, name);
  reserve({ x: c.x - len, y: c.y - len, w: c.w + 2 * len, d: c.d + 2 * len }, 1.2);
  return mat("ic", o.join(""));
}
export function qfn(c, mark, name, { pitch = 0.6, h = 0.9, pad = 0.3 } = {}) {
  const top = Z0 + h;
  const o = [slab(c, Z0, h, "mid", 3, 0.3, { crease: "lo" })];
  o.push(pinOne(c, top, 0.5), marking(c, top, mark, Math.min(2, c.w / 6)));
  const pads = [];
  const nx = Math.floor((c.w - 1.6) / pitch), ny = Math.floor((c.d - 1.6) / pitch);
  const ox = c.x + (c.w - nx * pitch) / 2, oy = c.y + (c.d - ny * pitch) / 2;
  for (let i = 0; i <= nx; i++) {
    pads.push(k.lineOnTop([ox + i * pitch, c.y], [ox + i * pitch, c.y - pad - 0.3], Z0 + 0.05, P), k.lineOnTop([ox + i * pitch, c.y + c.d], [ox + i * pitch, c.y + c.d + pad + 0.3], Z0 + 0.05, P));
  }
  for (let j = 0; j <= ny; j++) {
    pads.push(k.lineOnTop([c.x, oy + j * pitch], [c.x - pad - 0.3, oy + j * pitch], Z0 + 0.05, P), k.lineOnTop([c.x + c.w, oy + j * pitch], [c.x + c.w + pad + 0.3, oy + j * pitch], Z0 + 0.05, P));
  }
  o.push(L(pads.join(""), { tone: "mid" }));
  if (name) silkFor({ x: c.x - 2.6, y: c.y - 2.6, w: c.w + 5.2, d: c.d + 5.2 }, name);
  reserve(c, 1.8);
  return mat("ic", o.join(""));
}
export function bga(c, mark, name, { h = 1.7, lid = false, pitch = 0.95 } = {}) {
  const sub = { x: c.x - 0.6, y: c.y - 0.6, w: c.w + 1.2, d: c.d + 1.2, r: 0.6 };
  const o = [slab(sub, Z0, 0.9, "lo", 3, 0.2, { crease: "lo" }), slab(c, Z0 + 0.9, h, "mid", 3, 0.4, { crease: "lo" })];
  const top = Z0 + 0.9 + h;
  o.push(L(k.planOutline(k.insetPlan(c, 0.8), top, P, 3), { tone: "faint" }));
  if (lid) o.push(slab(k.insetPlan(c, 2.2), top, 0.5, "hi", 3, 0.2, { crease: "none" }));
  o.push(pinOne(c, top), marking(c, top + (lid ? 0.5 : 0), mark, Math.min(2.4, c.w / 7)));
  const balls = [];
  const nx = Math.floor((sub.w - 1.1) / pitch), ny = Math.floor((sub.d - 1.1) / pitch);
  for (let i = 0; i <= nx; i++) balls.push(at([sub.x + 0.55 + i * pitch, sub.y + 0.4, Z0 + 0.9]), at([sub.x + 0.55 + i * pitch, sub.y + sub.d - 0.4, Z0 + 0.9]));
  for (let j = 1; j < ny; j++) balls.push(at([sub.x + 0.4, sub.y + 0.55 + j * pitch, Z0 + 0.9]), at([sub.x + sub.w - 0.4, sub.y + 0.55 + j * pitch, Z0 + 0.9]));
  o.push(D(balls, { size: 0.3, tone: "hi" }));
  o.push(L(k.lineOnTop([c.x, c.y + 2.4], [c.x + 2.4, c.y], top, P), { tone: "faint" }));
  if (name) silkFor({ x: c.x - 2.4, y: c.y - 2.4, w: c.w + 4.8, d: c.d + 4.8 }, name);
  reserve(sub, 1.4);
  return mat("ic", o.join(""));
}
export function soic(c, mark, name, { pins = 8, pitch = 1.5, len = 1.4 } = {}) {
  const top = Z0 + 0.4 + 1.5;
  const o = [slab(c, Z0 + 0.4, 1.5, "mid", 2, 0.25, { crease: "lo" }), pinOne(c, top, 0.4), marking(c, top, mark, 1.5)];
  const half = pins / 2, span = (half - 1) * pitch, x0 = c.x + (c.w - span) / 2;
  const lines = [], dots = [];
  for (let i = 0; i < half; i++) {
    const x = x0 + i * pitch;
    lines.push(k.lineOnTop([x, c.y], [x, c.y - len], Z0 + 0.6, P), k.lineOnTop([x, c.y + c.d], [x, c.y + c.d + len], Z0 + 0.6, P));
    dots.push(at([x, c.y - len, Z0 + 0.6]), at([x, c.y + c.d + len, Z0 + 0.6]));
  }
  o.push(L(lines.join(""), { tone: "mid" }), D(dots, { size: 0.3, tone: "hi" }));
  if (name) silkFor({ x: c.x - 2, y: c.y - len - 1.2, w: c.w + 4, d: c.d + 2 * len + 2.4 }, name);
  reserve({ x: c.x - 0.6, y: c.y - len, w: c.w + 1.2, d: c.d + 2 * len }, 1);
  return mat("ic", o.join(""));
}
export function sot(x, y, pins = 3) {
  const c = { x, y, w: 3.4, d: 1.7, r: 0.2 };
  const o = [slab(c, Z0 + 0.35, 1.1, "mid", 2, 0.15, { crease: "none" })];
  const pts = pins === 3 ? [[x + 0.5, y + 1.7], [x + 2.9, y + 1.7], [x + 1.7, y]] : [[x + 0.4, y + 1.7], [x + 1.7, y + 1.7], [x + 3, y + 1.7], [x + 0.4, y], [x + 3, y]];
  o.push(D(pts.map(([px, py]) => at([px, py + (py > y + 0.9 ? 0.7 : -0.7), Z0 + 0.45])), { size: 0.26, tone: "hi" }));
  reserve({ x: x - 0.6, y: y - 0.8, w: 4.6, d: 3.4 }, 0.5);
  return mat("ic", o.join(""));
}
export function inductor(c, text, name) {
  const o = [slab(c, Z0, 4.4, "mid", 3, 0.5, { crease: "lo" })];
  o.push(slab(k.insetPlan(c, 1), Z0 + 4.4, 0.4, "hi", 3, 0.25, { crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([c.x + c.w / 2, c.y + c.d / 2 + 0.8], Z0 + 4.8, P, "x"), text, { size: 1.8, tone: "hi", anchor: "middle" }));
  o.push(slab({ x: c.x - 0.5, y: c.y + 1, w: 0.5, d: c.d - 2, r: 0.1 }, Z0, 1, "hi", 2, 0, { crease: "none" }));
  o.push(slab({ x: c.x + c.w, y: c.y + 1, w: 0.5, d: c.d - 2, r: 0.1 }, Z0, 1, "hi", 2, 0, { crease: "none" }));
  if (name) silkFor({ x: c.x - 1.8, y: c.y - 1.8, w: c.w + 3.6, d: c.d + 3.6 }, name);
  reserve(c, 1.4);
  return mat("silver", o.join(""));
}
export function tantalum(x, y) {
  const c = { x, y, w: 4.1, d: 2.4, r: 0.4 };
  reserve(c, 0.8);
  return slab(c, Z0, 1.9, "mid", 2, 0.25, { crease: "lo" }) + slab({ x: x + 0.4, y: y + 0.3, w: 0.8, d: 1.8, r: 0.1 }, Z0 + 1.9, 0.2, "lo", 2, 0, { crease: "none" });
}
export function elco(x, y, r, h, name) {
  const o = [cyl(x, y, r, Z0, h, "mid", 28, 0.3)];
  o.push(L(k.ring(x, y, r * 0.78, Z0 + h, P, 24), { tone: "lo" }));
  o.push(L(`${k.lineOnTop([x - r * 0.5, y - r * 0.5], [x + r * 0.5, y + r * 0.5], Z0 + h, P)}${k.lineOnTop([x - r * 0.5, y + r * 0.5], [x + r * 0.5, y - r * 0.5], Z0 + h, P)}`, { tone: "lo" }));
  o.push(L(k.knurl(x, y, r, Z0 + h - 1.1, Z0 + h, 22, P), { tone: "faint" }));
  o.push(L(k.sideArc(x, y, r, Z0 + 0.7, P, 18), { tone: "faint" }));
  // polarity stripe down the side, and a printed rating
  o.push(L(k.sideArc(x, y, r + 0.02, Z0 + h * 0.5, P, 12), { tone: "hi" }));
  if (name) silkFor({ x: x - r - 1, y: y - r - 1, w: 2 * r + 2, d: 2 * r + 2 }, name);
  reserve({ x: x - r, y: y - r, w: 2 * r, d: 2 * r }, 1);
  return mat("cap", o.join(""));
}
export function crystal(x, y, name) {
  const c = { x, y, w: 3.8, d: 3, r: 0.6 };
  reserve(c, 1);
  if (name) silkFor({ x: x - 1.2, y: y - 1.2, w: 6.2, d: 5.4 }, name);
  return mat("silver", slab(c, Z0, 1.1, "mid", 2, 0.25, { crease: "lo" }) + D([at([x + 0.7, y + 0.7, Z0 + 1.1]), at([x + 3.1, y + 2.3, Z0 + 1.1])], { size: 0.3, tone: "hi" }));
}
export function header(x, y, cols, rows, name, pitch = 3) {
  const c = { x, y, w: cols * pitch + 0.8, d: rows * pitch + 0.8, r: 0.2 };
  const o = [mat("ic", slab(c, Z0, 2.2, "mid", 2, 0.2, { crease: "lo" }))];
  const pts = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) pts.push([x + 0.4 + pitch / 2 + i * pitch, y + 0.4 + pitch / 2 + j * pitch]);
  o.push(pts.map(([px, py]) => cyl(px, py, 0.4, Z0 + 2.2, 3.2, "hi", 6)).join(""));
  o.push(D(pts.map(([px, py]) => at([px, py, Z0 + 5.4])), { size: 0.25, tone: "hi" }));
  if (name) silkFor({ x: x - 1.2, y: y - 1.2, w: c.w + 2.4, d: c.d + 2.4 }, name);
  reserve(c, 1.2);
  return o.join("");
}
export function tact(x, y, name) {
  const c = { x, y, w: 6, d: 6, r: 0.5 };
  reserve(c, 1);
  if (name) silkFor({ x: x - 1.4, y: y - 1.4, w: 8.8, d: 8.8 }, name);
  return mat("silver", slab(c, Z0, 2.6, "mid", 3, 0.35, { crease: "lo" })) + mat("ic", cyl(x + 3, y + 3, 1.7, Z0 + 2.6, 1.4, "mid", 14) + L(k.ring(x + 3, y + 3, 0.9, Z0 + 4, P, 10), { tone: "faint" }));
}
export function smdLed(x, y) {
  reserve({ x, y, w: 1.9, d: 1 }, 0.5);
  return mat("led", slab({ x, y, w: 1.9, d: 1, r: 0.2 }, Z0, 0.7, "mid", 2, 0.1, { crease: "none" }));
}
// a heat sink: a base plate and a comb of fins, fins along y
export function heatsink(c, z, fins = 7, finH = 5) {
  const o = [mat("silver", slab(k.insetPlan({ ...c, r: 0.5 }, 0), z, 1.4, "hi", 3, 0.3))];
  const gap = c.w / fins;
  for (let i = 0; i < fins; i++) o.push(mat("silver", slab({ x: c.x + 0.4 + i * gap, y: c.y + 0.8, w: gap * 0.5, d: c.d - 1.6, r: 0.2 }, z + 1.4, finH, "hi", 2, 0, { crease: "lo" })));
  return o.join("");
}
