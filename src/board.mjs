// The printed circuit board as a drawn layer: substrate, copper, vias, silkscreen and the passives.
import { k, P, at, L, D, slab, rectD, mat, BOARD, BOARD_TOP, FLOOR_TOP, TRAY, PORT_X, JACK_Y } from "./scene.mjs";
import { SILK, silkFor } from "./parts.mjs";
import { copper, autoRoute, TRACES } from "./layout.mjs";

export function boardSvg(cu, auto) {
  const out = [];
  out.push(slab(BOARD, FLOOR_TOP + 1, BOARD_TOP - FLOOR_TOP - 1, "lo", 5, 0.5));
  out.push(L(k.planOutline(k.insetPlan(BOARD, 3), BOARD_TOP, P, 5), { tone: "faint" }));
  // edge ticks like a ruler, along the back and the left side
  const ticks = [];
  for (let x = BOARD.x + 12; x < BOARD.x + BOARD.w - 10; x += 10) ticks.push(k.lineOnTop([x, BOARD.y + 1], [x, BOARD.y + (x % 50 === 2 || Math.abs((x - BOARD.x - 12) % 50) < 1 ? 4 : 2.4)], BOARD_TOP, P));
  for (let y = BOARD.y + 12; y < BOARD.y + BOARD.d - 10; y += 10) ticks.push(k.lineOnTop([BOARD.x + 1, y], [BOARD.x + 3, y], BOARD_TOP, P));
  out.push(L(ticks.join(""), { tone: "lo", free: true }));
  // mounting holes with a keepout ring and a screw
  const holes = [...k.corners(BOARD, 7), [BOARD.x + 7, 0], [BOARD.x + BOARD.w - 7, 0], [0, BOARD.y + 7], [0, 70], [90, 0], [-80, 0]];
  out.push(L(holes.map(([x, y]) => k.ring(x, y, 3.4, BOARD_TOP, P, 18) + k.ring(x, y, 2.2, BOARD_TOP, P, 14)).join(""), { tone: "hi", className: "ln-pad" }));
  // copper
  out.push(`<g class="trc">${L(cu.hatched, { tone: "hi", className: "ln-hatch", free: true })}${L(auto.d, { tone: "hi", free: true })}${L(cu.sig, { tone: "hi", free: true })}${L(cu.pw, { tone: "hi", className: "ln-pw", free: true })}</g>`);
  out.push(D([...cu.vias, ...auto.vias], { size: 0.38, tone: "hi" }));
  out.push(D(cu.sv, { size: 0.35, tone: "hi" }));
  // silkscreen: a box and a designator for each part, a section name, polarity marks
  out.push(L(SILK.map(({ c }) => k.planOutline({ ...c, r: 0.6 }, BOARD_TOP, P, 3)).join(""), { tone: "lo" }));
  out.push(SILK.filter((e) => e.name).map(({ c, name }) => k.faceTextSvg(k.topMatrix([c.x + 0.8, c.y - 0.8], BOARD_TOP, P, "x"), name, { size: 2, tone: "lo" })).join(""));
  const sect = [[-170, -64, "POWER IN"], [-172, 4, "DEBUG"], [48, -110, "CPU / DDR3"], [-52, -56, "SWITCH FABRIC"], [24, -54, "MAC TABLE"], [-124, 46, "PHY 1-4"], [-42, 46, "PHY 5-8"], [126, 2, "LED / CLK"], [-124, 74, "MAGNETICS"]];
  out.push(sect.map(([x, y, t]) => k.faceTextSvg(k.topMatrix([x, y], BOARD_TOP, P, "x"), t, { size: 2.3, tone: "lo" })).join(""));
  // fiducials, a title block, regulatory marks and a serial number
  for (const [fx, fy] of [[-166, 98], [166, 98], [-166, -100], [166, -100], [0, -102]]) out.push(L(k.ring(fx, fy, 2.2, BOARD_TOP, P, 18) + k.ring(fx, fy, 1, BOARD_TOP, P, 12), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([-172, 80], BOARD_TOP, P, "x"), "NSW-8G  REV C  2026-10", { size: 2.8, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([-172, 84.6], BOARD_TOP, P, "x"), "6L 1.6MM ENIG  FR-4 TG170  UL 94V-0", { size: 1.8, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([120, 98], BOARD_TOP, P, "x"), "CE  FC  RoHS  WEEE", { size: 2.4, tone: "lo" }));
  out.push(slab({ x: 140, y: 88, w: 18, d: 14, r: 1 }, BOARD_TOP, 0.4, "hi", 3, 0, { crease: "none" }));
  return mat("pcb", out.join(""));
}
