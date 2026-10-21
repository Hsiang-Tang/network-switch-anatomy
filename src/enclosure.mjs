// The box: tray, power supply, fans, RJ45 jacks, console and the sliding cover.
import { k, P, at, L, D, S, slab, cyl, rectY, rectX, rectD, faceRectY, flatFace, screwsAt, mat, reserve, TRAY, FLOOR_TOP, WALL_TOP, COVER_Z, BOARD, BOARD_TOP, PORT_X, JACK_W, JACK_Y, JACK_FRONT, JACK_H, JACK_TOP, FANS, FAN_W, FAN_R, FAN_Z, FAN_FACE } from "./scene.mjs";
import { HOSTS } from "./model.mjs";
import { fanBlades } from "./fan.mjs";
import { silkFor, elco, inductor } from "./parts.mjs";

export const FRONT_Y = TRAY.y + TRAY.d - 3;
export const RIGHT_X = TRAY.x + TRAY.w - 6;
// front-panel features, left to right after the eight jacks
export const SFP_X = [34, 54];
export const CON_X = 82;
export const USB_X = 104;
export const RESET_X = 122;
export const LED_X = [136, 147, 158, 169];

// ---- chassis ----------------------------------------------------------------------------------
export function chassis() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, -6, 6, P)}"/>`];
  const feet = k.corners(TRAY, 18).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(cyl(x, y, 7, -6, 2, "lo"));
    out.push(cyl(x, y, 5.4, -4, 4, "mid"));
    out.push(L(k.ring(x, y, 3.6, -0.2, P, 14), { tone: "faint" }));
  }
  out.push(S(k.slabOf(TRAY, 0, FLOOR_TOP, P, 8, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 4), FLOOR_TOP, P, 6), { tone: "faint" }));
  // embossed ribs across the floor, and standoffs under the board holes (as screw heads)
  const ribs = [];
  for (let i = -3; i <= 3; i++) ribs.push(k.lineOnTop([-170, i * 32], [170, i * 32], FLOOR_TOP, P));
  out.push(L(ribs.join(""), { tone: "faint" }));
  // back and left walls: folded sheet with a return lip
  const hi = WALL_TOP - FLOOR_TOP - 1.6;
  out.push(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 4, r: 1 }, FLOOR_TOP, hi, "mid", 3, 0.6));
  out.push(slab({ x: TRAY.x, y: TRAY.y + 4, w: 4, d: TRAY.d - 4, r: 1 }, FLOOR_TOP, hi, "mid", 3, 0.6));
  out.push(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 10, r: 1 }, WALL_TOP - 1.6, 1.6, "mid", 3, 0.4));
  out.push(slab({ x: TRAY.x, y: TRAY.y + 10, w: 10, d: TRAY.d - 10, r: 1 }, WALL_TOP - 1.6, 1.6, "mid", 3, 0.4));
  // vents punched through the back wall
  const slotsBack = [];
  for (let i = 0; i < 40; i++) slotsBack.push(rectY(-176 + i * 8.9, -176 + i * 8.9 + 2.2, 30, 46, TRAY.y + 4));
  out.push(L(slotsBack.join(""), { tone: "lo" }));
  // and through the left wall
  const slotsLeft = [];
  for (let i = 0; i < 16; i++) slotsLeft.push(rectX(-34 + i * 8.4, -34 + i * 8.4 + 2.2, 28, 46, TRAY.x + 4));
  out.push(L(slotsLeft.join(""), { tone: "lo" }));
  // mains inlet in the left wall: a socket, three blades and a fuse drawer
  {
    const y0 = -98, y1 = -70, z0 = 14, z1 = 34, x = TRAY.x + 4;
    out.push(L(rectX(y0, y1, z0, z1, x), { tone: "lo" }) + L(rectX(y0 + 3, y1 - 3, z0 + 3, z1 - 3, x), { tone: "faint" }));
    out.push(mat("ic", flatFace(`M${at([x + 0.05, y0 + 3, z0 + 3]).join(" ")}L${at([x + 0.05, y1 - 3, z0 + 3]).join(" ")}L${at([x + 0.05, y1 - 3, z1 - 3]).join(" ")}L${at([x + 0.05, y0 + 3, z1 - 3]).join(" ")}Z`, "lo")));
    out.push(D([[y0 + 11, z0 + 8], [y0 + 17, z0 + 8], [y0 + 14, z1 - 7]].map(([y, z]) => at([x + 0.1, y, z])), { size: 1.1, tone: "hi" }));
    out.push(L(rectX(y0 + 5, y1 - 5, z1 - 2.4, z1 - 0.6, x), { tone: "faint" }));
  }
  out.push(D([-170, -120, -70, -20, 30, 80, 130, 170].map((x) => at([x, TRAY.y + 5, WALL_TOP - 0.8])), { size: 0.45 }));
  out.push(D([-100, -50, 0, 50, 100].map((y) => at([TRAY.x + 5, y, WALL_TOP - 0.8])), { size: 0.45 }));
  // rivet lines
  const riv = [];
  for (let x = -176; x <= 176; x += 11) riv.push(at([x, TRAY.y + 4.1, 10]), at([x, TRAY.y + 4.1, WALL_TOP - 6]));
  out.push(D(riv, { size: 0.3, tone: "mid" }));
  // low rims on the front and right
  out.push(slab({ x: TRAY.x, y: FRONT_Y, w: TRAY.w - 6, d: 3, r: 0.5 }, FLOOR_TOP, BOARD_TOP + 1.5 - FLOOR_TOP, "mid", 2, 0.4));
  out.push(slab({ x: RIGHT_X, y: TRAY.y, w: 6, d: TRAY.d, r: 1 }, FLOOR_TOP, 8, "mid", 3, 0.5));
  // earth stud on the front flange, and a rating plate on the floor rim
  out.push(cyl(-170, 112, 3.6, FLOOR_TOP, 3, "mid", 18));
  out.push(cyl(-170, 112, 1.6, FLOOR_TOP + 3, 4, "lo", 12));
  out.push(L(k.ring(-170, 112, 2.6, FLOOR_TOP + 3, P, 16), { tone: "lo" }));
  return out.join("");
}

// ---- power supply: a perforated can with its mains side, caps and EMI parts beside it -----------------------
export const PSU = { x: -172, y: -108, w: 90, d: 48, r: 2 };
export function power() {
  const parts = [];
  const psu = PSU, top = BOARD_TOP + 30;
  {
    const o = [];
    o.push(slab(psu, BOARD_TOP, 30, "mid", 4, 0.7));
    o.push(slab(k.insetPlan(psu, 2), top, 1.6, "mid", 3, 0.4));
    const slots = [];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) slots.push(k.onTop([[psu.x + 6 + i * 6.9, psu.y + 5 + row * 6], [psu.x + 6 + i * 6.9 + 4, psu.y + 5 + row * 6], [psu.x + 6 + i * 6.9 + 4, psu.y + 6.6 + row * 6], [psu.x + 6 + i * 6.9, psu.y + 6.6 + row * 6]], top + 1.6, P, true));
    o.push(L(slots.join(""), { tone: "lo" }));
    const lab = { x: psu.x + 8, y: psu.y + 26, w: 46, d: 17, r: 1 };
    o.push(slab(lab, top + 1.6, 0.5, "hi", 3, 0, { crease: "none" }));
    o.push(k.faceTextSvg(k.topMatrix([lab.x + 3, lab.y + 5], top + 2.1, P, "x"), "AC 100-240V 50/60Hz 1.2A", { size: 2.2, tone: "mid" }));
    o.push(k.faceTextSvg(k.topMatrix([lab.x + 3, lab.y + 9.6], top + 2.1, P, "x"), "DC 12V 2.5A  30W MAX", { size: 2.2, tone: "mid" }));
    o.push(L([13, 14.6].map((y) => k.lineOnTop([lab.x + 3, lab.y + y], [lab.x + 43, lab.y + y], top + 2.1, P)).join(""), { tone: "faint", free: true }));
    o.push(L(Array.from({ length: 18 }, (_, n) => k.lineOnTop([lab.x + 24 + n * 1, lab.y + 11.2], [lab.x + 24 + n * 1, lab.y + 12.6 + (n % 3 === 0 ? 0.8 : 0)], top + 2.1, P)).join(""), { tone: "lo", free: true }));
    o.push(cyl(psu.x + 70, psu.y + 33, 3.2, top + 1.6, 3.4, "mid", 18));
    o.push(L(k.knurl(psu.x + 70, psu.y + 33, 3.2, top + 1.6, top + 5, 14, P), { tone: "lo" }));
    o.push(screwsAt(k.corners(psu, 4), top + 1.6));
    // mains side screw terminal block and fuse holder on the left face, output connector on the front
    o.push(slab({ x: psu.x + 10, y: psu.y + psu.d, w: 22, d: 5, r: 0.8 }, BOARD_TOP + 5, 12, "hi", 3, 0.4));
    o.push(L(rectY(psu.x + 12, psu.x + 30, BOARD_TOP + 8, BOARD_TOP + 15, psu.y + psu.d + 5), { tone: "lo" }));
    o.push(D([0, 1, 2, 3].map((n) => at([psu.x + 14 + n * 4.6, psu.y + psu.d + 5, BOARD_TOP + 11.5])), { size: 0.9, tone: "hi" }));
    const frontSlots = [];
    for (let r = 0; r < 2; r++) for (let n = 0; n < 6; n++) frontSlots.push(rectY(psu.x + 40 + n * 6, psu.x + 43.4 + n * 6, BOARD_TOP + 10 + r * 6.4, BOARD_TOP + 13 + r * 6.4, psu.y + psu.d));
    o.push(L(frontSlots.join(""), { tone: "lo" }));
    const sideSlots = [];
    for (let r = 0; r < 3; r++) for (let n = 0; n < 7; n++) sideSlots.push(rectX(psu.y + 5 + n * 6, psu.y + 5 + n * 6 + 3.4, BOARD_TOP + 7 + r * 6.4, BOARD_TOP + 10 + r * 6.4, psu.x + psu.w));
    o.push(L(sideSlots.join(""), { tone: "lo" }));
    o.push(L(k.lineOnTop([psu.x, psu.y + psu.d - 2.4], [psu.x + psu.w, psu.y + psu.d - 2.4], BOARD_TOP + 30, P), { tone: "faint" }));
    parts.push({ at: [psu.x + psu.w / 2, psu.y + psu.d / 2], svg: mat("silver", o.join("")) });
    reserve(psu, 1.5);
    reserve({ x: psu.x + 10, y: psu.y + psu.d, w: 22, d: 5 }, 1);
  }
  // three bulk capacitors, a film capacitor, a varistor and the common-mode choke between supply and fans
  [-73, -62.5, -52].forEach((x, i) => parts.push({ at: [x, -100], svg: elco(x, -100, 4.4, 10, "C" + (1 + i)) }));
  parts.push({ at: [-62, -82], svg: mat("silver", slab({ x: -76, y: -86, w: 14, d: 7, r: 1 }, BOARD_TOP, 9, "mid", 3, 0.5) + L(k.planOutline(k.insetPlan({ x: -76, y: -86, w: 14, d: 7, r: 1 }, 1), BOARD_TOP + 9, P, 3), { tone: "faint" }) + k.faceTextSvg(k.topMatrix([-69, -81.4], BOARD_TOP + 9, P, "x"), "X2 0.47u", { size: 1.8, tone: "mid", anchor: "middle" })) });
  reserve({ x: -76, y: -86, w: 14, d: 7 }, 1);
  silkFor({ x: -78, y: -88, w: 18, d: 11 }, "C4");
  parts.push({ at: [-52, -80], svg: mat("silver", cyl(-52, -80, 3.8, BOARD_TOP, 1.6, "mid", 18) + L(k.ring(-52, -80, 2.4, BOARD_TOP + 1.6, P, 14), { tone: "lo" })) });
  reserve({ x: -56, y: -84, w: 8, d: 8 }, 1);
  parts.push({ at: [-66, -70], svg: mat("silver", slab({ x: -78, y: -74, w: 16, d: 8, r: 1.4 }, BOARD_TOP, 7, "mid", 3, 0.6) + L(k.ring(-72, -70, 2.8, BOARD_TOP + 7, P, 14), { tone: "lo" }) + L(k.ring(-66, -70, 2.8, BOARD_TOP + 7, P, 14), { tone: "lo" })) });
  reserve({ x: -78, y: -74, w: 16, d: 8 }, 1);
  silkFor({ x: -80, y: -76, w: 20, d: 12 }, "T1");
  return { parts, harness: harness() };
}
function harness() {
  const o = [];
  const z = BOARD_TOP + 2;
  o.push(slab({ x: -168, y: -56, w: 21, d: 6, r: 0.8 }, BOARD_TOP, 5, "hi", 3, 0.3));
  o.push(D(Array.from({ length: 6 }, (_, i) => at([-165 + i * 3.4, -53, BOARD_TOP + 5])), { size: 0.5, tone: "mid" }));
  for (let i = 0; i < 6; i++) {
    const x = -160 + i * 5;
    o.push(k.wireSvg(at([-165 + i * 3.4, -53, BOARD_TOP + 5]), at([x, -60, BOARD_TOP + 22 - i]), { via: [at([-165 + i * 3.4, -56, z + 4])], tone: "mid", size: 0.7 }));
  }
  return o.join("");
}

// ---- fans on the back wall ------------------------------------------------------------------------
export function fan(cx, index) {
  const o = [];
  const frame = { x: cx - FAN_W / 2, y: TRAY.y + 6, w: FAN_W, d: 14, r: 3 };
  o.push(slab(frame, BOARD_TOP, 43, "mid", 5, 0.7));
  const face = FAN_FACE;
  o.push(L(rectY(cx - 19.5, cx + 19.5, BOARD_TOP + 2, BOARD_TOP + 41, face), { tone: "faint" }));
  const c = (r, y = face + 0.2) => k.sideRing([cx, y, FAN_Z], r, "y", P, 40);
  o.push(mat("ic", S({ fill: c(FAN_R + 0.5), shades: ["", "", "", ""], top: "", crease: "", outline: c(FAN_R + 0.5) }, { tone: "lo", flat: true })));
  o.push(`<g class="iso-solid m-ink"><path class="iso-fill" data-blades="${index}" d="${fanBlades(k.iso, P, cx, face - 0.5, FAN_Z, 0.3 + index, FAN_R)}"/><path class="iso-line iso-edge" data-tone="mid" data-blades="${index}" d="${fanBlades(k.iso, P, cx, face - 0.5, FAN_Z, 0.3 + index, FAN_R)}"/></g>`);
  o.push(mat("ic", L([FAN_R + 0.5, FAN_R * 0.7, FAN_R * 0.42].map((r) => c(r, face + 0.3)).join(""), { tone: "mid" })));
  const spokes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    spokes.push(k.segment([cx + FAN_R * 0.42 * Math.cos(a), face + 0.3, FAN_Z + FAN_R * 0.42 * Math.sin(a)], [cx + (FAN_R + 0.5) * Math.cos(a), face + 0.3, FAN_Z + (FAN_R + 0.5) * Math.sin(a)], P));
  }
  o.push(mat("ic", L(spokes.join(""), { tone: "mid" })));
  o.push(mat("ic", L(c(FAN_R * 0.26, face + 0.3), { tone: "hi" }) + k.faceTextSvg(k.sideMatrix([cx - 2.4, face + 0.4], FAN_Z - 0.9, P, "left"), "NSF", { size: 1.8, tone: "hi" })));
  const cnr = [[-17.5, 17.5], [17.5, 17.5], [-17.5, -17.5], [17.5, -17.5]];
  o.push(D(cnr.map(([dx, dz]) => at([cx + dx, face, FAN_Z + dz])), { size: 0.45, tone: "hi" }));
  o.push(L(cnr.map(([dx, dz]) => k.sideRing([cx + dx, face, FAN_Z + dz], 1.3, "y", P, 10)).join(""), { tone: "lo" }));
  // the lead: three wires into a header
  const hx = cx + FAN_W / 2 + 3;
  o.push(slab({ x: hx, y: -108, w: 7, d: 4, r: 0.5 }, BOARD_TOP, 3.4, "hi", 2, 0.2));
  o.push(D([0, 1, 2].map((i) => at([hx + 1.4 + i * 2, -106, BOARD_TOP + 3.4])), { size: 0.4, tone: "mid" }));
  o.push(k.wireSvg(at([cx + FAN_W / 2 - 1, -104, BOARD_TOP + 12]), at([hx + 3.5, -106, BOARD_TOP + 3.4]), { via: [at([cx + FAN_W / 2 + 1, -104, BOARD_TOP + 6])], tone: "mid", size: 0.6 }));
  reserve({ x: cx - FAN_W / 2, y: TRAY.y + 6, w: FAN_W + 10, d: 14 }, 1);
  return { at: [cx, TRAY.y + 13], svg: o.join("") };
}

// ---- RJ45 jack: a shielded housing, a dark socket with a contact comb, two light pipes ---------------------------
export function jack(x, opts = {}) {
  const w = opts.w ?? JACK_W, y0 = opts.y ?? JACK_Y, front = JACK_FRONT, h = opts.h ?? JACK_H, top = BOARD_TOP + h;
  const o = [];
  const housing = { x: x - w / 2, y: y0, w, d: front - y0, r: 1 };
  o.push(S(k.slabOf({ x: x - w / 2 - 1.2, y: y0 - 1, w: w + 2.4, d: front - y0 + 1, r: 1.2 }, BOARD_TOP, 0.8, P, 3, 0.15), { tone: "lo", crease: "faint" }));
  o.push(slab(housing, BOARD_TOP + 0.8, h - 0.8, "mid", 3, 0.5));
  o.push(L(k.planOutline(k.insetPlan(housing, 1.6), top, P, 3), { tone: "faint" }));
  // the folded seam, two stamped ribs, spring fingers at the front corners, grounding tabs
  o.push(L(k.lineOnTop([x - w / 2, y0 + 14], [x + w / 2, y0 + 14], top, P), { tone: "faint" }));
  o.push(L([x - 3, x + 3].map((rx) => k.lineOnTop([rx, y0 + 3], [rx, y0 + 11], top, P)).join(""), { tone: "lo", free: true }));
  const fingers = [];
  for (let n = 0; n < 6; n++) fingers.push(k.lineOnTop([x - w / 2, y0 + 16 + n * 1.7], [x - w / 2 + 1.8, y0 + 16 + n * 1.7], top, P), k.lineOnTop([x + w / 2, y0 + 16 + n * 1.7], [x + w / 2 - 1.8, y0 + 16 + n * 1.7], top, P));
  o.push(L(fingers.join(""), { tone: "lo", free: true }));
  o.push(D([at([x - w / 2 + 2.4, y0 + 4, top]), at([x + w / 2 - 2.4, y0 + 4, top])], { size: 0.35 }));
  if (opts.label) o.push(k.faceTextSvg(k.topMatrix([x, y0 + 22], top, P, "x"), opts.label, { size: 4, tone: "mid", anchor: "middle" }));
  // solder tails round the rear and the two grounding legs
  o.push(D(Array.from({ length: 8 }, (_, n) => at([x - 6.3 + n * 1.8, y0 + 1.6, BOARD_TOP + 0.8])), { size: 0.3, tone: "hi" }));
  o.push(D([at([x - w / 2 + 0.6, y0 + 7, BOARD_TOP + 0.8]), at([x + w / 2 - 0.6, y0 + 7, BOARD_TOP + 0.8])], { size: 0.5, tone: "hi" }));
  // light pipes: two small rectangles on the top front edge
  const lp = (lx) => slab({ x: lx, y: front - 4.4, w: 3.4, d: 2.6, r: 0.4 }, top, 0.7, "hi", 2, 0.1, { crease: "lo" });
  o.push(lp(x - w / 2 + 1.6), lp(x + w / 2 - 5));
  // the front: a dark recess for the plug, with the contact comb and the latch notch
  const ow = (opts.ow ?? 13.8) / 2, z0 = BOARD_TOP + 2.2, z1 = top - 3.8;
  o.push(mat("ic", flatFace(faceRectY(x - ow, x + ow, z0, z1, front + 0.05), "lo")));
  o.push(L(rectY(x - ow - 1.6, x + ow + 1.6, z0 - 1, z1 + 1, front) + rectY(x - ow, x + ow, z0, z1, front), { tone: "lo" }));
  o.push(mat("ic", L(Array.from({ length: 8 }, (_, n) => k.segment([x - 4.2 + n * 1.2, front + 0.1, z1 - 0.4], [x - 4.2 + n * 1.2, front + 0.1, z1 - 3.6], P)).join(""), { tone: "hi", free: true })));
  o.push(mat("ic", L(rectY(x - 2.6, x + 2.6, z0 + 0.4, z0 + 1.8, front + 0.1) + k.segment([x - ow + 0.6, front + 0.1, z0 + 0.4], [x + ow - 0.6, front + 0.1, z0 + 0.4], P), { tone: "mid" })));
  o.push(D([at([x - ow - 1.6, front, z1 + 1]), at([x + ow + 1.6, front, z1 + 1]), at([x - ow - 1.6, front, z0 - 1]), at([x + ow + 1.6, front, z0 - 1])], { size: 0.35 }));
  return o.join("");
}
export const leds = () => PORT_X.map((x, i) => `<g data-led="${i}" opacity="0.16">${D([at([x - JACK_W / 2 + 3.3, JACK_FRONT - 3.1, JACK_TOP + 0.7]), at([x + JACK_W / 2 - 3.3, JACK_FRONT - 3.1, JACK_TOP + 0.7])], { size: 1.1, tone: "hi" })}</g>`).join("");

// ---- two SFP cages and a USB socket on the front edge --------------------------------------------------------
export function sfp(x) {
  const c = { x: x - 8, y: 58, w: 16, d: 56, r: 0.6 }, h = 12, top = BOARD_TOP + h;
  const o = [slab(c, BOARD_TOP, h, "mid", 3, 0.5, { crease: "lo" })];
  o.push(slab({ x: x - 0.8, y: 60, w: 1.6, d: 52, r: 0.3 }, top, 0.4, "lo", 2, 0, { crease: "none" }));
  const grill = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) grill.push(k.onTop([[x - 6 + i * 3.2, 62 + j * 5.4], [x - 4.4 + i * 3.2, 62 + j * 5.4], [x - 4.4 + i * 3.2, 65.4 + j * 5.4], [x - 6 + i * 3.2, 65.4 + j * 5.4]], top + 0.4, P, true));
  o.push(L(grill.join(""), { tone: "lo" }));
  const mouth = c.y + c.d;
  o.push(mat("ic", flatFace(faceRectY(x - 6.5, x + 6.5, BOARD_TOP + 1.6, top - 1.6, mouth + 0.05), "lo")));
  o.push(L(rectY(x - 7, x + 7, BOARD_TOP + 1.2, top - 1.2, mouth) + rectY(x - 6.5, x + 6.5, BOARD_TOP + 1.6, top - 1.6, mouth), { tone: "lo" }));
  const fingers = [];
  for (let n = 0; n < 9; n++) fingers.push(k.segment([x - 7 + n * 1.75, mouth, BOARD_TOP + 1.2], [x - 7 + n * 1.75, mouth, BOARD_TOP + 3], P), k.segment([x - 7 + n * 1.75, mouth, top - 1.2], [x - 7 + n * 1.75, mouth, top - 3], P));
  o.push(L(fingers.join(""), { tone: "faint" }));
  o.push(D([at([x - 7, c.y + 3, top]), at([x + 7, c.y + 3, top]), at([x - 7, mouth - 3, top]), at([x + 7, mouth - 3, top])], { size: 0.4 }));
  o.push(D(Array.from({ length: 8 }, (_, n) => at([x - 6.5 + n * 1.86, c.y - 0.8, BOARD_TOP + 0.5])), { size: 0.3, tone: "hi" }));
  silkFor({ x: c.x - 2, y: c.y - 2, w: c.w + 4, d: 4 }, x < 40 ? "J9" : "J10");
  reserve(c, 1.4);
  return { at: [x, 86], svg: mat("silver", o.join("")) };
}
export function usb(x) {
  const c = { x: x - 4.5, y: 102, w: 9, d: 12, r: 0.6 };
  const o = [slab(c, BOARD_TOP, 6, "mid", 2, 0.3, { crease: "lo" })];
  o.push(mat("ic", flatFace(faceRectY(x - 3.2, x + 3.2, BOARD_TOP + 1.4, BOARD_TOP + 4.4, 114.05), "lo")));
  o.push(L(rectY(x - 3.7, x + 3.7, BOARD_TOP + 1, BOARD_TOP + 4.8, 114), { tone: "lo" }));
  o.push(mat("ic", L(k.segment([x - 2.4, 114.1, BOARD_TOP + 2.9], [x + 2.4, 114.1, BOARD_TOP + 2.9], P), { tone: "hi", free: true })));
  reserve(c, 1);
  return { at: [x, 108], svg: mat("silver", o.join("")) };
}

// ---- cover: top plate, right wall and a front wall with every opening -------------------------------------
export function cover() {
  const o = [];
  const ow = [...PORT_X.map((x) => [x - 11.5, x + 11.5]), ...SFP_X.map((x) => [x - 9, x + 9]), [CON_X - 11.5, CON_X + 11.5], [USB_X - 5.5, USB_X + 5.5]];
  // right wall with a vent field
  o.push(slab({ x: RIGHT_X, y: TRAY.y, w: 6, d: TRAY.d, r: 1 }, 0, WALL_TOP, "mid", 3, 0.6));
  const side = [];
  for (let i = 0; i < 22; i++) side.push(rectX(-104 + i * 9.4, -104 + i * 9.4 + 2.6, 28, 46, TRAY.x + TRAY.w));
  o.push(L(side.join(""), { tone: "lo" }));
  o.push(D([-110, -50, 10, 70, 110].map((y) => at([TRAY.x + TRAY.w, y, 16])), { size: 0.45 }));
  // front wall: a pier between neighbouring openings, then a bar above them all
  o.push(slab({ x: TRAY.x, y: FRONT_Y, w: RIGHT_X - TRAY.x, d: 3, r: 0.4 }, 0, 10, "mid", 2, 0.4));
  const edges = [TRAY.x, ...ow.flat(), RIGHT_X];
  for (let i = 0; i < edges.length; i += 2) {
    if (edges[i + 1] - edges[i] > 0.4) o.push(slab({ x: edges[i], y: FRONT_Y, w: edges[i + 1] - edges[i], d: 3, r: 0.4 }, 10, JACK_TOP + 3.4 - 10, "mid", 2, 0.4));
  }
  o.push(slab({ x: TRAY.x, y: FRONT_Y, w: RIGHT_X - TRAY.x, d: 3, r: 0.8 }, JACK_TOP + 3.4, WALL_TOP - JACK_TOP - 3.4, "mid", 3, 0.6));
  // link and activity windows above each port, a port number, then the model line
  const winZ0 = JACK_TOP + 6, winZ1 = JACK_TOP + 8.2;
  PORT_X.forEach((x) => o.push(L(rectY(x - 7.5, x - 3.5, winZ0, winZ1, FRONT_Y + 3) + rectY(x + 3.5, x + 7.5, winZ0, winZ1, FRONT_Y + 3), { tone: "lo" })));
  o.push(mat("led", PORT_X.map((x, i) => `<g data-led-front="${i}" opacity="0.16">${D([at([x - 5.5, FRONT_Y + 3, winZ0 + 1.1]), at([x + 5.5, FRONT_Y + 3, winZ0 + 1.1])], { size: 1.4, tone: "hi" })}</g>`).join("")));
  o.push(PORT_X.map((x, i) => k.faceTextSvg(k.sideMatrix([x - 1.1, FRONT_Y + 3.1], winZ1 + 2.4, P, "left"), String(i + 1), { size: 3, tone: "hi" })).join(""));
  o.push(PORT_X.map((x, i) => k.faceTextSvg(k.sideMatrix([x - 1, FRONT_Y + 3.1], winZ0 - 3.2, P, "left"), HOSTS[i].name, { size: 2, tone: "mid" })).join(""));
  // SFP, console, USB, reset and the system LED block
  o.push(L(SFP_X.map((x) => rectY(x - 8, x + 8, 9, 20.5, FRONT_Y + 3)).join(""), { tone: "lo" }));
  o.push(k.faceTextSvg(k.sideMatrix([SFP_X[0] - 7, FRONT_Y + 3.1], JACK_TOP + 6, P, "left"), "SFP 9", { size: 2.4, tone: "hi" }) + k.faceTextSvg(k.sideMatrix([SFP_X[1] - 8, FRONT_Y + 3.1], JACK_TOP + 6, P, "left"), "SFP 10", { size: 2.4, tone: "hi" }));
  o.push(k.faceTextSvg(k.sideMatrix([CON_X - 5, FRONT_Y + 3.1], JACK_TOP + 6, P, "left"), "CONSOLE", { size: 2.4, tone: "hi" }));
  o.push(k.faceTextSvg(k.sideMatrix([USB_X - 3, FRONT_Y + 3.1], JACK_TOP + 6, P, "left"), "USB", { size: 2.4, tone: "hi" }));
  o.push(L(k.sideRing([RESET_X, FRONT_Y + 3, 20], 1.1, "y", P, 12) + k.sideRing([RESET_X, FRONT_Y + 3, 20], 2.2, "y", P, 14), { tone: "lo" }));
  o.push(k.faceTextSvg(k.sideMatrix([RESET_X - 3, FRONT_Y + 3.1], 25, P, "left"), "RESET", { size: 2.2, tone: "hi" }));
  const sys = ["PWR", "SYS", "FAN", "ALM"];
  LED_X.forEach((x, i) => {
    o.push(L(k.sideRing([x, FRONT_Y + 3, 24.5], 1.6, "y", P, 12), { tone: "lo" }));
    o.push(mat("led", `<g data-led-sys="${i}" opacity="${i < 3 ? "0.9" : "0.16"}">${D([at([x, FRONT_Y + 3, 24.5])], { size: 1.3, tone: "hi" })}</g>`));
    o.push(k.faceTextSvg(k.sideMatrix([x - 3.2, FRONT_Y + 3.1], 19.5, P, "left"), sys[i], { size: 2.2, tone: "mid" }));
  });
  o.push(k.faceTextSvg(k.sideMatrix([TRAY.x + 12, FRONT_Y + 3.1], 46, P, "left"), "NSW-8G", { size: 5.6, tone: "hi" }));
  o.push(k.faceTextSvg(k.sideMatrix([TRAY.x + 12, FRONT_Y + 3.1], 40.4, P, "left"), "8-PORT GIGABIT MANAGED SWITCH", { size: 2.4, tone: "mid" }));
  o.push(L(Array.from({ length: 26 }, (_, n) => k.segment([TRAY.x + 128 + n * 1.5, FRONT_Y + 3.1, 40.4], [TRAY.x + 128 + n * 1.5, FRONT_Y + 3.1, 40.4 + (n % 3 ? 3 : 5)], P)).join(""), { tone: "lo", free: true }));
  o.push(D([TRAY.x + 7, RIGHT_X - 7].flatMap((x) => [at([x, FRONT_Y + 3, 47]), at([x, FRONT_Y + 3, 13])]), { size: 0.5 }));
  // top plate: three vent fields, a label with a barcode, rivets
  o.push(slab(TRAY, WALL_TOP, COVER_Z - WALL_TOP, "mid", 8, 1));
  o.push(L(k.planOutline(k.insetPlan(TRAY, 5), COVER_Z, P, 8), { tone: "faint" }));
  for (const [gx, gy, n, gd] of [[-166, -104, 12, 40], [76, -104, 10, 40], [-166, 52, 12, 40], [76, 52, 10, 40]]) {
    const slots = [];
    for (let i = 0; i < n; i++) slots.push(k.onTop([[gx + i * 8, gy], [gx + i * 8 + 3.2, gy], [gx + i * 8 + 3.2, gy + gd], [gx + i * 8, gy + gd]], COVER_Z, P, true));
    o.push(L(slots.join(""), { tone: "lo" }));
  }
  const label = { x: -44, y: -26, w: 88, d: 52, r: 2 };
  o.push(slab(label, COVER_Z, 0.6, "hi", 3, 0.2, { crease: "none" }));
  o.push(L(k.planOutline(k.insetPlan(label, 2), COVER_Z + 0.6, P, 3), { tone: "faint" }));
  o.push(k.faceTextSvg(k.topMatrix([label.x + 7, label.y + 15], COVER_Z + 0.6, P, "x"), "NSW-8G", { size: 8.4, tone: "hi" }));
  o.push(k.faceTextSvg(k.topMatrix([label.x + 7, label.y + 21.4], COVER_Z + 0.6, P, "x"), "8 x 10/100/1000BASE-T  +  2 x SFP", { size: 2.6, tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([label.x + 7, label.y + 26.4], COVER_Z + 0.6, P, "x"), "INPUT 100-240V~ 50/60Hz 1.2A   MODEL NSW-8G", { size: 2, tone: "mid" }));
  o.push(L([30.4, 33.4].map((y) => k.lineOnTop([label.x + 7, label.y + y], [label.x + 7 + (y > 31 ? 60 : 74), label.y + y], COVER_Z + 0.6, P)).join(""), { tone: "faint", free: true }));
  o.push(L(Array.from({ length: 44 }, (_, n) => k.lineOnTop([label.x + 7 + n * 1.5, label.y + 37.6], [label.x + 7 + n * 1.5, label.y + 37.6 + (n % 4 === 0 ? 7 : n % 3 === 0 ? 5.6 : 6.4)], COVER_Z + 0.6, P)).join(""), { tone: "lo", free: true }));
  o.push(k.faceTextSvg(k.topMatrix([label.x + 7, label.y + 47.4], COVER_Z + 0.6, P, "x"), "S/N NSW8G-2610-0042   MADE IN TAIWAN", { size: 1.9, tone: "mid" }));
  o.push(cyl(label.x + 76, label.y + 16, 5.4, COVER_Z + 0.6, 0.3, "lo", 24));
  o.push(L(k.ring(label.x + 76, label.y + 16, 3.4, COVER_Z + 0.9, P, 20) + k.knurl(label.x + 76, label.y + 16, 5.4, COVER_Z + 0.6, COVER_Z + 0.9, 16, P), { tone: "faint" }));
  o.push(screwsAt([[-170, -112], [0, -112], [170, -112], [-170, 108], [0, 108], [170, 108]], COVER_Z));
  o.push(L(k.planOutline({ x: -160, y: -100, w: 320, d: 200, r: 5 }, COVER_Z, P, 8), { tone: "faint" }));
  o.push(D([-130, -90, 90, 130].flatMap((x) => [at([x, -108, COVER_Z]), at([x, 104, COVER_Z])]), { size: 0.4 }));
  return `<g data-asm="cover" transform="${k.translateAlong(P, [0, 0, 0])}">${mat("steel", o.join(""))}</g>`;
}
