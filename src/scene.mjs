// Shared context for the drawing: dimensions, the projection and the small drawing helpers.
// Units: one unit is about 0.85 mm. The chassis is a half-width 1U box (about 310 x 200 x 44 mm), so an
// RJ45 jack (16 x 21 x 13.5 mm) comes out near 19 x 25 x 16 units and a 0603 resistor near 1.9 x 1 units.
import * as k from "./kit/iso-kit.mjs";
export { k };

export const WIDTH = 1000;
export const HEIGHT = 700;

// chassis: a tray, lid off; back and left walls stand, the front and right are a low rim
export const TRAY = { x: -184, y: -118, w: 368, d: 236, r: 6 };
export const FLOOR_TOP = 4;
export const WALL_TOP = 52;
export const COVER_Z = 54.5;
export const BOARD = { x: -176, y: -110, w: 352, d: 218, r: 3 };
export const BOARD_TOP = 8;
export const Z0 = BOARD_TOP;

// eight RJ45 jacks along the front edge
export const PORTS = 8;
export const PORT_X = Array.from({ length: PORTS }, (_, i) => -141 + 20.4 * i);
export const JACK_W = 19;
export const JACK_Y = 89;
export const JACK_FRONT = 114;
export const JACK_H = 16;
export const JACK_TOP = BOARD_TOP + JACK_H;

// crossbar fabric: the decapped switch ASIC. Eight columns (one per port) under eight rows (one per sender)
export const FAB = { x: -51, y: -50, w: 60, d: 52, r: 2 };
export const PIN_Y = FAB.y + FAB.d;
export const PIN_X = Array.from({ length: 8 }, (_, j) => -44 + 6.6 * j);
export const ROW_Y = Array.from({ length: 8 }, (_, i) => -45 + 5 * i);
export const DECK_TOP = BOARD_TOP + 4;
export const COL_TOP = DECK_TOP + 2;
export const ROW_BOT = DECK_TOP + 7;
export const ROW_TOP = ROW_BOT + 2.2;
export const PIN_DROP = 2.2;
export const PUCK_Z = BOARD_TOP + 1;
export const DZ_LOW = COL_TOP - PUCK_Z;
export const DZ_HIGH = ROW_TOP - PUCK_Z;
export const SOL_X = FAB.x - 17;

// MAC table: a chest of eight drawers
export const CHEST = { x: 24, y: -46, w: 62, d: 38 };
export const DRAWER_PITCH = 4.2;
export const DRAWER_Z = (i) => BOARD_TOP + 2 + i * DRAWER_PITCH;
export const DRAWER = { x: CHEST.x + 2.5, y: CHEST.y + 2.5, w: CHEST.w - 2.5, d: 31 };
export const DRAWER_FRONT = DRAWER.y + DRAWER.d;
export const BUS_Y = [-33, -30, -27];

// two fans on the back wall
export const FANS = [-24, 22];
export const FAN_W = 42;
export const FAN_R = 17.5;
export const FAN_Z = BOARD_TOP + 21.5;
export const FAN_FACE = TRAY.y + 6 + 14;

export const P = k.fitProjection(
  [...k.boxCorners({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d }, -6, WALL_TOP + 4)],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: Number(process.env.VIEW_AZ ?? 45), elevation: Number(process.env.VIEW_EL ?? 35), dist: Number(process.env.VIEW_DIST ?? 1300), target: [0, 0, 20] },
);

export const at = (point) => k.iso(point, P);
export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (points, style) => k.dotsSvg(points, style);
export const slab = (plan, z, h, tone = "mid", steps = 3, bevel = 0.4, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
export const cyl = (x, y, r, z, h, tone = "mid", steps = 24, bevel = 0, extra = {}) => S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone, ...extra });
export const depth = (x, y) => k.depthOf([x, y, 0], P);
export const inOrder = (items) => [...items].sort((a, b) => depth(...a.at) - depth(...b.at)).map((item) => item.svg).join("");
export const rectY = (x0, x1, z0, z1, y) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]].map(([a, b, c, d]) => k.segment([a, y, b], [c, y, d], P)).join("");
export const rectX = (y0, y1, z0, z1, x) => [[y0, z0, y1, z0], [y1, z0, y1, z1], [y1, z1, y0, z1], [y0, z1, y0, z0]].map(([a, b, c, d]) => k.segment([x, a, b], [x, c, d], P)).join("");
export const screwsAt = (points, z, r = 1.5) => L(points.map(([x, y]) => k.ring(x, y, r, z, P, 12) + k.lineOnTop([x - r * 0.7, y], [x + r * 0.7, y], z, P)).join(""), { tone: "lo" }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.4 });
// a closed rectangle lying flat at height z, as a path fragment
export const rectD = (x, y, w, d, z) => k.onTop([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], z, P, true);
// a rectangle standing in a plane of constant y (a front face), as a flat filled polygon
export const faceRectY = (x0, x1, z0, z1, y) => `M${at([x0, y, z0]).join(" ")}L${at([x1, y, z0]).join(" ")}L${at([x1, y, z1]).join(" ")}L${at([x0, y, z1]).join(" ")}Z`;
export const faceRectX = (y0, y1, z0, z1, x) => `M${at([x, y0, z0]).join(" ")}L${at([x, y1, z0]).join(" ")}L${at([x, y1, z1]).join(" ")}L${at([x, y0, z1]).join(" ")}Z`;
// a flat face painted with the current material (no extruded edges)
export const flatFace = (d, tone = "lo") => S({ fill: d, shades: ["", "", "", ""], top: "", crease: "", outline: d }, { tone, flat: true });

// seeded noise, so every build is the same picture
let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const reseed = (n) => { seed = n; };

// ---- materials: dark ink for IC bodies, a darker board, everything else the kit's own greys --------------
const INK = (a, b, c, d, top, paper, face, hi, mid, lo, faint, dot) => `--anatomy-shade-0:${a};--anatomy-shade-1:${b};--anatomy-shade-2:${c};--anatomy-shade-3:${d};--anatomy-top:${top};--anatomy-paper:${paper};--anatomy-face:${face};--anatomy-hi:${hi};--anatomy-mid:${mid};--anatomy-lo:${lo};--anatomy-faint:${faint};--anatomy-dot:${dot}`;
export const MAT_CSS = [
  `.m-ink{${INK("#26262a", "#2c2c30", "#323237", "#39393e", "#45454b", "#323237", "#39393e", "#dcdce0", "#9a9aa2", "#17171a", "#505057", "#e4e4e8")}}`,
  `.iso[data-theme="dark"] .m-ink{${INK("#0a0a0b", "#0d0d0e", "#101011", "#141415", "#1c1c1e", "#101011", "#141415", "#d0d0d4", "#808088", "#060607", "#34343a", "#d0d0d4")}}`,
  `.m-pcb{${INK("#bdbdb8", "#c3c3be", "#c9c9c4", "#cfcfca", "#d8d8d3", "#d2d2cd", "#d8d8d3", "#52525a", "#7e7e86", "#fbfbf9", "#c2c2bd", "#3c3c42")}}`,
  `.iso[data-theme="dark"] .m-pcb{${INK("#0f0f11", "#121214", "#151517", "#18181a", "#1d1d20", "#16161a", "#1a1a1d", "#707078", "#4a4a52", "#d6d6da", "#26262b", "#c6c6cc")}}`,
].join("");
export const INKED = new Set(["ic"]);
export const mat = (name, svg) => (INKED.has(name) ? `<g class="m-ink">${svg}</g>` : svg);

// ---- routing helpers ------------------------------------------------------------------------------------
// Cut each right-angle corner into a 45 degree bevel of size r (as a board house would route it).
export function chamfer(points, r = 2) {
  if (points.length < 3) return points.map((p) => [...p]);
  const out = [[...points[0]]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const cut = Math.min(r, l1 / 2, l2 / 2);
    if (cut < 0.05) { out.push([...b]); continue; }
    out.push([b[0] + ((a[0] - b[0]) / l1) * cut, b[1] + ((a[1] - b[1]) / l1) * cut]);
    out.push([b[0] + ((c[0] - b[0]) / l2) * cut, b[1] + ((c[1] - b[1]) / l2) * cut]);
  }
  out.push([...points[points.length - 1]]);
  return out;
}
// Parallel copy of a polyline, `by` units to the side (a number, or a function of the vertex index).
export function offsetPath(points, by) {
  const n = points.length;
  const normals = [];
  for (let i = 1; i < n; i++) {
    const dx = points[i][0] - points[i - 1][0], dy = points[i][1] - points[i - 1][1], len = Math.hypot(dx, dy) || 1;
    normals.push([-dy / len, dx / len]);
  }
  return points.map(([x, y], i) => {
    const o = typeof by === "function" ? by(i) : by;
    const a = normals[Math.max(0, i - 1)], b = normals[Math.min(normals.length - 1, i)];
    if (i === 0 || i === n - 1) return [x + a[0] * o, y + a[1] * o];
    let mx = a[0] + b[0], my = a[1] + b[1];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    const scale = 1 / Math.max(0.5, mx * a[0] + my * a[1]);
    return [x + mx * o * scale, y + my * o * scale];
  });
}
// `count` parallel lines along a route, spaced `pitch`, ending `pitchEnd` apart when given (a fan-in).
export function bundlePaths(points, count, pitch, pitchEnd = pitch) {
  const out = [];
  const last = Math.max(1, points.length - 1);
  for (let n = 0; n < count; n++) {
    const mid = (count - 1) / 2;
    out.push(k.onTop(offsetPath(points, (i) => (n - mid) * (pitch + (pitchEnd - pitch) * (i / last))), BOARD_TOP, P));
  }
  return out;
}

// footprints that later traces must keep clear of
export const KEEP = [];
export const reserve = (r, m = 1) => { KEEP.push({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, d: r.d + 2 * m }); };
export const blocked = (x, y) => KEEP.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.d);
