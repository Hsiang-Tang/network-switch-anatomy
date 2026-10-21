// Fan blades in the plane y = const, one closed path per fan, rebuilt each frame by the page.
export const BLADES = 9;
export function fanBlades(iso, P, cx, y, cz, angle, R = 17.5) {
  const s = R / 26;
  const at = (r, t) => iso([cx + r * s * Math.cos(t), y, cz + r * s * Math.sin(t)], P);
  const out = [];
  for (let i = 0; i < BLADES; i++) {
    const a = angle + (i / BLADES) * Math.PI * 2;
    const pts = [at(7.5, a - 0.2), at(14, a + 0.05), at(23, a + 0.3), at(23.2, a + 0.74), at(16, a + 0.55), at(7.5, a + 0.2)];
    out.push("M" + pts.map(([x, z]) => x.toFixed(1) + " " + z.toFixed(1)).join("L") + "Z");
  }
  return out.join("");
}
