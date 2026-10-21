// The part that decides: a decapped switch ASIC drawn as a crossbar, and the MAC table as a chest of drawers.
import { k, P, at, L, D, S, slab, cyl, rectY, mat, screwsAt, FAB, PIN_X, PIN_Y, ROW_Y, DECK_TOP, COL_TOP, ROW_BOT, ROW_TOP, PIN_DROP, PUCK_Z, SOL_X, BOARD_TOP, PORTS, CHEST, DRAWER, DRAWER_FRONT, DRAWER_Z, DRAWER_PITCH, BUS_Y } from "./scene.mjs";
import { reserve } from "./scene.mjs";

const pinOf = (i, j, lowered) => {
  const x = PIN_X[j], y = ROW_Y[i];
  const len = ROW_BOT - COL_TOP - PIN_DROP;
  const o = [
    cyl(x, y, 0.8, ROW_BOT - len, len, "hi", 8),
    cyl(x, y, 1.25, ROW_BOT - 0.7, 0.7, "mid", 10),
    cyl(x, y, 1, ROW_BOT - len - 0.6, 0.6, "lo", 8),
  ].join("");
  return `<g class="xp" data-xp="${i}-${j}"${i === j ? ' data-fixed=""' : ""} transform="${k.translateAlong(P, [0, 0, lowered ? -PIN_DROP : 0])}">${mat("gold", o)}</g>`;
};
export const puck = () => S(k.slabOf({ x: -2, y: -2, w: 4, d: 4, r: 1 }, PUCK_Z, 2.2, P, 3, 0.3), { tone: "hi", lit: true, className: "puck" });

export function fabric() {
  const left = [], deck = [], bars = [];
  // eight solenoids, one per row, on the left: they hold the row's sender selected
  for (let i = 0; i < 8; i++) {
    const y = ROW_Y[i] - 2.1, o = [];
    o.push(slab({ x: SOL_X, y, w: 9, d: 4.2, r: 0.3 }, BOARD_TOP, ROW_TOP - BOARD_TOP - 0.6, "mid", 3, 0.3));
    o.push(L(k.planOutline({ x: SOL_X + 1.2, y: y + 0.7, w: 6.6, d: 2.8, r: 0.4 }, ROW_TOP - 0.6, P, 2), { tone: "faint" }));
    o.push(L(k.lineOnTop([SOL_X, y + 2.1], [SOL_X + 9, y + 2.1], ROW_TOP - 0.6, P), { tone: "faint" }));
    o.push(L(rectY(SOL_X + 1.4, SOL_X + 7.6, BOARD_TOP + 1.6, BOARD_TOP + 4, y + 4.2) + rectY(SOL_X + 1.4, SOL_X + 7.6, BOARD_TOP + 5.2, BOARD_TOP + 7.6, y + 4.2), { tone: "lo" }));
    o.push(`<g data-sol="${i}" opacity="0.16">${D([at([SOL_X + 7, y + 2.1, ROW_TOP - 0.6])], { size: 0.8, tone: "hi" })}</g>`);
    left.push(o.join(""));
  }
  const sols = `<g data-asm="sol" transform="${k.translateAlong(P, [0, 0, 0])}">${mat("silver", left.join(""))}</g>`;
  reserve({ x: SOL_X, y: ROW_Y[0] - 3, w: 10, d: 42 }, 1);
  // base, deck, rails, bond pads along the front edge
  deck.push(`<path class="iso-halo" d="${k.haloOf(FAB, BOARD_TOP, 3, P)}"/>`);
  const pads = [];
  for (let n = 0; n < 40; n++) pads.push(at([FAB.x + 3 + n * 1.45, FAB.y + FAB.d - 1.2, DECK_TOP]));
  deck.push(mat("ic", slab(FAB, BOARD_TOP, 4, "mid", 4, 0.6) + L(k.planOutline(k.insetPlan(FAB, 2), DECK_TOP, P, 4), { tone: "faint" }) + screwsAt(k.corners(FAB, 3), DECK_TOP, 1) + D(pads, { size: 0.28, tone: "hi" }) + k.faceTextSvg(k.topMatrix([FAB.x + 4, FAB.y + FAB.d - 3.2], DECK_TOP, P, "x"), "SWITCH ASIC  XBAR-8", { size: 1.7, tone: "hi" })));
  for (const x of [FAB.x + 2, FAB.x + FAB.w - 5]) {
    deck.push(mat("silver", slab({ x, y: FAB.y + 3, w: 3, d: FAB.d - 6, r: 0.5 }, DECK_TOP, ROW_BOT - DECK_TOP, "mid", 2, 0.3) + D([FAB.y + 6, FAB.y + FAB.d / 2, FAB.y + FAB.d - 6].map((y) => at([x + 1.5, y, ROW_BOT])), { size: 0.35 })));
  }
  // columns with contact pads at the front
  for (let j = 0; j < 8; j++) {
    const x = PIN_X[j] - 2;
    deck.push(mat("gold", slab({ x, y: FAB.y + 3, w: 4, d: FAB.d - 3, r: 0.4 }, DECK_TOP, COL_TOP - DECK_TOP, "hi", 2, 0.2, { crease: "lo" }) + L(k.lineOnTop([PIN_X[j], FAB.y + 3], [PIN_X[j], PIN_Y], COL_TOP, P), { tone: "faint", free: true }) + slab({ x: x - 0.4, y: PIN_Y - 2.2, w: 4.8, d: 2.2, r: 0.3 }, DECK_TOP, 0.8, "mid", 2, 0.1)));
  }
  // rows: pins first (they hang under the row), then the row
  for (let i = 0; i < 8; i++) {
    bars.push(PIN_X.map((_, j) => pinOf(i, j, i === j)).join(""));
    const row = { x: FAB.x + 3, y: ROW_Y[i] - 1.4, w: FAB.w - 6, d: 2.8, r: 0.4 };
    bars.push(mat("silver", slab(row, ROW_BOT, 2.2, "hi", 2, 0.3, { crease: "lo" }) + L(k.lineOnTop([row.x, ROW_Y[i]], [row.x + row.w, ROW_Y[i]], ROW_TOP, P), { tone: "faint", free: true }) + D([at([row.x + 2, ROW_Y[i], ROW_TOP]), at([row.x + row.w - 2, ROW_Y[i], ROW_TOP])], { size: 0.35 })));
  }
  const pl = Array.from({ length: PORTS }, (_, i) => `<g data-puck-low="${i}" opacity="0" transform="${k.translateAlong(P, [0, 0, 0])}">${puck()}</g>`).join("");
  const ph = Array.from({ length: PORTS }, (_, i) => `<g data-puck-high="${i}" opacity="0" transform="${k.translateAlong(P, [0, 0, 0])}">${puck()}</g>`).join("");
  reserve(FAB, 1);
  return { at: [-20, -30], svg: sols + deck.join("") + pl + `<g data-asm="rows" transform="${k.translateAlong(P, [0, 0, 0])}">${bars.join("")}${ph}</g>` };
}

export function chest() {
  const out = [];
  const top = BOARD_TOP + 2 + 8 * DRAWER_PITCH + 1.4;
  out.push(slab({ x: CHEST.x, y: CHEST.y, w: CHEST.w, d: CHEST.d }, BOARD_TOP, 2, "mid", 3, 0.3));
  out.push(slab({ x: CHEST.x, y: CHEST.y, w: CHEST.w, d: 2.5, r: 0.5 }, BOARD_TOP + 2, top - BOARD_TOP - 2, "mid", 2, 0.3));
  out.push(slab({ x: CHEST.x, y: CHEST.y + 2.5, w: 2.5, d: CHEST.d - 2.5, r: 0.5 }, BOARD_TOP + 2, top - BOARD_TOP - 2, "mid", 2, 0.3));
  // drawer rails and a stack of vent holes on the back wall
  out.push(L(Array.from({ length: 9 }, (_, i) => k.lineOnTop([CHEST.x + 2.5, CHEST.y + 2.5], [CHEST.x + 2.5, CHEST.y + CHEST.d - 2], BOARD_TOP + 2 + i * DRAWER_PITCH, P)).join(""), { tone: "faint", free: true }));
  out.push(D([0, 1, 2, 3].map((i) => at([CHEST.x + 1.2, CHEST.y + 8 + i * 10, top])), { size: 0.4 }));
  reserve({ x: CHEST.x, y: CHEST.y, w: CHEST.w, d: CHEST.d + 14 }, 1);
  return out.join("");
}
export function drawer(i) {
  const z = DRAWER_Z(i), o = [];
  const plan = { x: DRAWER.x, y: DRAWER.y, w: DRAWER.w, d: DRAWER.d, r: 0.6 };
  o.push(slab(plan, z, 3, "mid", 2, 0.25, { crease: "faint" }));
  o.push(L(k.planOutline(k.insetPlan(plan, 1.4), z + 3, P, 2), { tone: "faint" }));
  o.push(slab({ x: DRAWER.x + 5, y: DRAWER.y + 5, w: 11, d: 7, r: 0.6 }, z + 3, 0.8, "hi", 2, 0.1));
  o.push(slab({ x: DRAWER.x + 19, y: DRAWER.y + 5, w: 11, d: 7, r: 0.6 }, z + 3, 0.8, "hi", 2, 0.1));
  o.push(L([16, 19, 22, 25].map((y) => k.lineOnTop([DRAWER.x + 4, DRAWER.y + y], [DRAWER.x + 4 + (y % 2 ? 40 : 50), DRAWER.y + y], z + 3, P)).join(""), { tone: "faint", free: true }));
  o.push(slab({ x: DRAWER.x + DRAWER.w - 12, y: DRAWER_FRONT, w: 7, d: 1.6, r: 0.5 }, z + 0.7, 1.4, "hi", 2, 0.2));
  o.push(L(rectY(DRAWER.x + 2, DRAWER.x + 42, z + 0.3, z + 2.7, DRAWER_FRONT), { tone: "faint" }));
  o.push(`<g data-text>${k.faceTextSvg(k.sideMatrix([DRAWER.x + 3, DRAWER_FRONT + 0.1], z + 0.7, P, "left"), "", { size: 1.9, tone: "hi" })}</g>`);
  o.push(D([at([DRAWER.x + 46, DRAWER_FRONT, z + 1.5])], { size: 0.45, tone: "lo" }));
  return `<g data-row="${i}" transform="${k.translateAlong(P, [0, 0, 0])}">${o.join("")}</g>`;
}
export function think() {
  const bus = BUS_Y.map((y) => k.lineOnTop([FAB.x + FAB.w, y], [CHEST.x, y], BOARD_TOP + 0.05, P)).join("");
  return `<g data-part="think" opacity="0">${L(bus, { tone: "lit", flow: true })}</g>`;
}
