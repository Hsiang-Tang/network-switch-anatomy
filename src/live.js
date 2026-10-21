// Runtime for the page. build.mjs puts the model, the fan geometry and the numbers (P, TRACES, PIN_X ...) above this.
if (/dark/.test(location.hash)) document.body.dataset.theme = "dark";
const stage = document.querySelector(".iso-stage");
const viewport = document.querySelector(".iso-view");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const pucksLow = [...svg.querySelectorAll("[data-puck-low]")];
const pucksHigh = [...svg.querySelectorAll("[data-puck-high]")];
const pins = ROW_Y.map((_, i) => PIN_X.map((__, j) => svg.querySelector('[data-xp="' + i + "-" + j + '"]')));
const sols = [...svg.querySelectorAll("[data-sol]")];
const asmRows = svg.querySelector('[data-asm="rows"]');
const asmSol = svg.querySelector('[data-asm="sol"]');
const lift = { rows: { x: 0, v: 0 }, sol: { x: 0, v: 0 } };
let apart = false, apartAt = 0;
const leds = [...stage.querySelectorAll("[data-led],[data-led-front]")];
const coverEl = stage.querySelector('[data-asm="cover"]');
const lid = { x: 0, v: 0 };
let lidWant = 0, lidTimer = 0;
const rows = [...svg.querySelectorAll("[data-row]")];
const blades = FANS.map((_, i) => [...svg.querySelectorAll('[data-blades="' + i + '"]')]);
const think = svg.querySelector('[data-part="think"]');
const SPEED = 150, T_LOOK = 1.0, TAIL = 0.5, GAP = 0.9, PULL = 10, DROP = 4, LIFT = 0.3, LID_TRAVEL = 440;
const btn = (act) => document.querySelector('[data-act="' + act + '"]');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (u) => u * u * (3 - 2 * u);

// ---- light on the copper: an ink that follows each frame along its trace ---------------------------------
const THEME = (stage.closest("[data-theme]") || document.body).dataset.theme === "light" ? 1 : 0;
const segs = [];
TRACES.forEach((path, i) => {
  let acc = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const own = [];
  for (let n = 1; n < path.length; n++) {
    const len = Math.hypot(path[n][0] - path[n - 1][0], path[n][1] - path[n - 1][1]);
    if (!path[n][2]) {
      own.push("v+=seg(p,vec2(" + path[n - 1][0].toFixed(2) + "," + path[n - 1][1].toFixed(2) + "),vec2(" + path[n][0].toFixed(2) + "," + path[n][1].toFixed(2) + ")," + acc.toFixed(2) + ",uHead[" + i + "],uDir[" + i + "],uAmp[" + i + "]);");
      x0 = Math.min(x0, path[n - 1][0], path[n][0]); x1 = Math.max(x1, path[n - 1][0], path[n][0]);
      y0 = Math.min(y0, path[n - 1][1], path[n][1]); y1 = Math.max(y1, path[n - 1][1], path[n][1]);
    }
    acc += len;
  }
  // a pixel only pays for a trace that is lit and within reach of its bounding box
  segs.push("if(uAmp[" + i + "]>0.004&&p.x>" + (x0 - 14).toFixed(1) + "&&p.x<" + (x1 + 14).toFixed(1) + "&&p.y>" + (y0 - 14).toFixed(1) + "&&p.y<" + (y1 + 14).toFixed(1) + "){" + own.join("") + "}");
});
const FRAGMENT = `
uniform float uHead[8];
uniform float uDir[8];
uniform float uAmp[8];
uniform float uLight;
uniform float uD;
uniform vec3 uT;
vec3 floorP(vec2 vb,float h){
  vec2 q=(vb-uOrigin)/uK;float sA=uCam.x,cA=uCam.y,sE=uCam.z,cE=uCam.w;float dz=h-uT.z;
  float yd=q.y*(uD-dz/sE)/(uD+q.y*cE/sE);
  float s=uD/(uD-(yd*cE/sE+dz/sE));
  float xr=q.x/s;float u=(yd+dz*cE)/sE;
  return vec3(xr*sA+u*cA+uT.x,-xr*cA+u*sA+uT.y,h);
}
float seg(vec2 p, vec2 a, vec2 b, float s0, float h, float dir, float amp){
  vec2 ab=b-a; float L=length(ab);
  float u=clamp(dot(p-a,ab)/(L*L),0.,1.);
  float d=length(p-(a+ab*u));
  float s=s0+u*L;
  float behind=(h-s)*dir;
  float trail=smoothstep(-3.,0.,behind)*exp(-max(behind,0.)/34.)*(1.-smoothstep(100.,170.,behind));
  float line=exp(-d*d/2.4);
  float wide=exp(-d*d/26.)*0.22;
  float pool=exp(-((s-h)*(s-h)+d*d)/90.);
  return amp*(trail*(line+wide)+pool*0.5);
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 w=floorP(vb,${BOARD_TOP}.);
  vec2 p=w.xy;
  float v=0.;
  ${segs.join(" ")}
  float a=1.-exp(-v*1.25);
  vec3 ink=vec3(.85,.32,.12);
  vec3 lum=vec3(1.,.58,.34)*a;
  float dither=(hash12(gl_FragCoord.xy)-.5)/255.;
  vec4 light=vec4(ink*a*.78+dither*a,a*.78);
  vec4 dark=vec4(lum+dither*a,a);
  gl_FragColor=mix(dark,light,uLight);
}`;
const glLayerOn = glLayer({ canvas: stage.querySelector(".fx-gl"), fragment: FRAGMENT, view: [WIDTH, HEIGHT], camera: CAMERA, uniforms: ["uHead", "uDir", "uAmp"], fixed: { uLight: THEME, uD: P.dist, uT: P.target }, maxRatio: 1 });
if (glLayerOn) stage.setAttribute("data-gl", "");
const glHead = new Float32Array(8), glDir = new Float32Array(8).fill(1), glAmp = new Float32Array(8), glWant = new Float32Array(8);

const lengthOf = (path) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
function alongPath(path, s) {
  let rest = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (rest <= seg || i === path.length - 1) {
      const u = seg ? Math.min(1, rest / seg) : 0;
      const a = path[i - 1], b = path[i];
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (a[2] > 1 ? a[2] : 0) + ((b[2] > 1 ? b[2] : 0) - (a[2] > 1 ? a[2] : 0)) * u];
    }
    rest -= seg;
  }
  return path[path.length - 1];
}
// the hidden flag on a trace point is 1; a real height is always above 1 here
const plain = (path) => path.map(([x, y, z]) => [x, y, z > 1 ? z : 0]);
const inPath = (i) => [...plain(TRACES[i]), [PIN_X[i], PIN_Y - 3, DZ_LOW], [PIN_X[i], ROW_Y[i], DZ_LOW]];
const rowLen = (i, j) => Math.abs(PIN_X[j] - PIN_X[i]);
const outPath = (j) => [[PIN_X[j], ROW_Y[0], DZ_LOW], [PIN_X[j], PIN_Y - 3, DZ_LOW], ...plain(TRACES[j]).reverse()];
const LENT = TRACES.map(lengthOf);
const IN = TRACES.map((_, i) => lengthOf(inPath(i)));

let table = newTable();
const view = rows.map(() => ({ shown: 0, want: 0, lift: 0, liftWant: 0, text: "" }));
const ledAt = PORT_X.map(() => -9);
let job = null, queue = [], clock = 0, tourIndex = 0, idle = 0, held = 0, lastSrc = -1, glow = 0, spin = 2.2, spinAngle = 0.4, calmSpin = 2.2;
let frame = 0, last = 0, visible = false;

function say(text) {
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-label", "Network switch: " + text);
}
function start(src, dst) {
  const result = handle(table, src, dst);
  job = { ...result, t: 0, tIn: IN[src] / SPEED, learnedShown: false };
  job.tOut = Math.max(...job.out.map((port) => (rowLen(src, port) + DROP + lengthOf(outPath(port).map(([x, y], n) => (n === 0 ? [x, ROW_Y[src]] : [x, y])))) / SPEED), 0);
  job.end = job.tIn + T_LOOK + job.tOut + TAIL;
  lastSrc = src;
  ledAt[src] = clock;
  say("port " + (src + 1) + " · frame " + HOSTS[src].name + " → " + HOSTS[dst].name);
}
function showRow(i, entry) {
  const text = entry.mac + "  →  port " + (entry.port + 1);
  view[i].want = 1;
  if (view[i].text !== text) {
    view[i].text = text;
    rows[i].querySelector("text").textContent = text;
  }
}
function clearTable() {
  table = newTable();
  view.forEach((v) => { v.want = 0; v.liftWant = 0; });
}

// Moving a drawn part in a perspective picture: the point it is anchored at goes where the camera sees it afterwards, and
// the part is rescaled about that point by the change in perspective scale. (The kit's translateAlong only shifts, which
// is exact for an orthographic picture but not for a pinhole camera.)
function moveBy([dx, dy, dz], [ax, ay, az] = [0, 0, 0]) {
  const a = iso([ax, ay, az], P), b = iso([ax + dx, ay + dy, az + dz], P);
  const sc = perspectiveScale([ax + dx, ay + dy, az + dz], P) / perspectiveScale([ax, ay, az], P);
  const f = (v) => Math.round(v * 100) / 100;
  return sc > 0.9995 && sc < 1.0005 ? "translate(" + f(b[0] - a[0]) + " " + f(b[1] - a[1]) + ")" : "translate(" + f(b[0]) + " " + f(b[1]) + ") scale(" + Math.round(sc * 10000) / 10000 + ") translate(" + f(-a[0]) + " " + f(-a[1]) + ")";
}
function put(el, [x, y, z], alpha) {
  el.setAttribute("transform", moveBy([x, y, z]));
  el.setAttribute("opacity", alpha.toFixed(2));
}
const pinWant = ROW_Y.map((_, i) => PIN_X.map((__, j) => (i === j ? 1 : 0)));
const pinNow = ROW_Y.map((_, i) => PIN_X.map((__, j) => (i === j ? 1 : 0)));
const solNow = ROW_Y.map(() => 0);

// ---- taking the box apart: every part is an item that floats up by its own height ----------------------------
const items = [...stage.querySelectorAll(".ex")].filter((el) => !el.hasAttribute("data-fixed")).map((el) => ({
  el, up: Number(el.dataset.ex), up2: Number(el.dataset.ex2), x: Number(el.dataset.ax || 0), y: Number(el.dataset.ay || 0), n: Number(el.dataset.n || 0),
  e: 0, v: 0, board: el.hasAttribute("data-board"), front: !!el.closest(".fx-front"),
}));
const rearBox = svg.querySelector(".rear");
const rearItems = [...rearBox.children];
const boardItem = items.find((it) => it.board);
const leaders = document.createElementNS("http://www.w3.org/2000/svg", "g");
leaders.setAttribute("class", "leaders");
svg.appendChild(leaders);
const leadLines = items.filter((it) => !it.board).map((it) => { const l = document.createElementNS("http://www.w3.org/2000/svg", "line"); leaders.appendChild(l); return l; });
let level = 0, levelAt = 0, orderLevel = 0;
const exCover = { e: 0, v: 0 };
let partsDown = true, landedAt = 0, coverZ = 210;
const maxUp = Math.max(...items.map((it) => it.up2));
function reorder(byLevel) {
  const keyOf = (el) => { const it = items.find((i) => i.el === el); return (byLevel ? (level >= 2 ? it.up2 : it.up) : 0) * 1000 + it.n; };
  [...rearBox.children].sort((a, b) => keyOf(a) - keyOf(b)).forEach((el) => rearBox.appendChild(el));
}
function setLevel(n) {
  if (n === level) return;
  const expanding = n > level;
  level = n; levelAt = clock;
  if (expanding) { if (orderLevel === 0) { orderLevel = 1; } reorder(true); }
  btn("explode").setAttribute("aria-pressed", n ? "true" : "false");
  btn("explode").textContent = n === 0 ? "Explode" : n === 1 ? "Explode more" : "Assemble";
  if (n > 0) { setApart(false); clearJob(); }
  if (n === 0 && !expanding) { lidWant = 0; btn("lid").textContent = "Open lid"; btn("lid").setAttribute("aria-pressed", "false"); }
  say(n === 0 ? "assembling" : n === 1 ? "layers apart" : "single parts apart");
  if (n > 0) frameView(true); else frameView(false);
  run();
}
function clearJob() { job = null; queue.length = 0; pucksLow.forEach((el) => el.setAttribute("opacity", "0")); pucksHigh.forEach((el) => el.setAttribute("opacity", "0")); glWant.fill(0); }

// ---- zoom and pan: the stage is one element, scaled and moved ---------------------------------------------------
let sel = null;
const cam = { z: 1, x: 0, y: 0, tz: 1, tx: 0, ty: 0, manual: false };
function bounds() { return { w: stage.offsetWidth, h: stage.offsetHeight }; }
const stageOrigin = () => { const r = viewport.getBoundingClientRect(); return { x: r.left + stage.offsetLeft, y: r.top + stage.offsetTop }; };
function clampCam(c) {
  const { w, h } = bounds();
  const sx = sel ? w * 0.5 : 0, sy = sel ? h * 0.4 : 0;
  c.tx = clamp(c.tx, w - w * c.tz - sx, sx * 0.4);
  c.ty = clamp(c.ty, h - h * c.tz - sy, sy * 0.4);
}
function frameView(exploded) {
  cam.manual = false;
  const { w, h } = bounds();
  if (exploded) { const z = level >= 2 ? 0.56 : 0.68; cam.tz = z; cam.tx = (w - w * z) / 2; cam.ty = h * (level >= 2 ? 0.45 : 0.31); }
  else { cam.tz = 1; cam.tx = 0; cam.ty = 0; }
  run();
}
function zoomAt(factor, cx, cy) {
  const { w, h } = bounds();
  const nz = clamp(cam.tz * factor, 1, 14);
  const px = (cx ?? w / 2), py = (cy ?? h / 2);
  cam.tx = px - ((px - cam.tx) / cam.tz) * nz;
  cam.ty = py - ((py - cam.ty) / cam.tz) * nz;
  cam.tz = nz;
  cam.manual = true;
  if (nz <= 1.001) { cam.tx = 0; cam.ty = 0; }
  clampCam(cam);
  run();
}
function applyCam(dt) {
  const k = 1 - Math.exp(-dt / 0.12);
  cam.z += (cam.tz - cam.z) * k; cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
  const settled = Math.abs(cam.tz - cam.z) < 0.001 && Math.abs(cam.tx - cam.x) < 0.3 && Math.abs(cam.ty - cam.y) < 0.3;
  if (settled || still.matches) { cam.z = cam.tz; cam.x = cam.tx; cam.y = cam.ty; }
  stage.style.transform = cam.z === 1 && cam.x === 0 && cam.y === 0 ? "" : "translate(" + cam.x.toFixed(1) + "px," + cam.y.toFixed(1) + "px) scale(" + cam.z.toFixed(4) + ")";
  return !settled;
}

function frameAt(dt) {
  clock += dt;
  let moving = false;
  const lidOpen = lid.x > 0.96 && lidWant === 1 && level === 0;
  if (!job && lidOpen) {
    if (queue.length) { const [s, d] = queue.shift(); start(s, d); }
    else if (!still.matches && !FILM && clock > held) {
      idle += dt;
      if (idle > GAP) {
        idle = 0;
        if (tourIndex >= TOUR.length) { clearTable(); tourIndex = 0; say("table aged out · learning again"); idle = -1.4; }
        else { const [s, d] = TOUR[tourIndex++]; start(s, d); }
      }
    }
  }
  glWant.fill(0);
  let busy = 0;
  if (job) {
    job.t += dt;
    const { t, tIn } = job;
    const phase = t < tIn ? 0 : t < tIn + T_LOOK ? 1 : 2;
    busy = 1;
    if (phase >= 1 && !job.learnedShown) {
      job.learnedShown = true;
      showRow(job.srcRow, table[job.srcRow]);
      if (job.hitRow >= 0) view[job.hitRow].liftWant = 1;
      say(sayLookup(job));
    }
    if (phase === 2 && !job.outSaid) { job.outSaid = true; say(sayOut(job)); }
    pucksLow.forEach((el) => el.setAttribute("opacity", "0"));
    pucksHigh.forEach((el) => el.setAttribute("opacity", "0"));
    const src = job.src, diag = [PIN_X[src], ROW_Y[src]];
    if (phase === 0) {
      put(pucksLow[src], alongPath(inPath(src), t * SPEED), 1);
      glHead[src] = Math.min(t * SPEED, LENT[src]); glDir[src] = 1; glWant[src] = t * SPEED < LENT[src] ? 1 : 0;
    }
    if (phase === 1) {
      const u = clamp((t - tIn) / LIFT, 0, 1), e = ease(u);
      if (u < 1) put(pucksLow[src], [...diag, DZ_LOW], 1 - e);
      put(pucksHigh[src], [...diag, DZ_LOW + (DZ_HIGH - DZ_LOW) * e], e);
      job.out.forEach((port, rank) => { if (t - tIn > LIFT + 0.04 * rank) pinWant[src][port] = 1; });
    }
    if (phase === 2) {
      const u = t - tIn - T_LOOK;
      if (!job.outStarted) { job.outStarted = true; job.out.forEach((port) => { pinWant[src][port] = 1; }); }
      const s = u * SPEED;
      job.out.forEach((port) => {
        const run = rowLen(src, port);
        const dir = Math.sign(PIN_X[port] - PIN_X[src]);
        const low = outPath(port).map(([x, y, z], n) => (n === 0 ? [x, ROW_Y[src], z] : [x, y, z]));
        const lowLen = lengthOf(low);
        if (s < run) put(pucksHigh[port], [PIN_X[src] + dir * s, ROW_Y[src], DZ_HIGH], 1);
        else if (s < run + DROP) {
          const v = (s - run) / DROP, e = ease(v);
          put(pucksHigh[port], [PIN_X[port], ROW_Y[src], DZ_HIGH + (DZ_LOW - DZ_HIGH) * e], 1 - e);
          put(pucksLow[port], [PIN_X[port], ROW_Y[src], DZ_LOW], e);
        } else {
          const along = s - run - DROP;
          const onBoard = along - (PIN_Y - ROW_Y[src]);
          if (onBoard > 0) { glHead[port] = Math.max(0, LENT[port] - onBoard); glDir[port] = -1; glWant[port] = onBoard < LENT[port] ? 1 : 0; }
          if (along < lowLen) put(pucksLow[port], alongPath(low, along), 1);
          else {
            if (!job["led" + port]) { job["led" + port] = true; ledAt[port] = clock; }
            put(pucksLow[port], low[low.length - 1], clamp(1 - (along - lowLen) / 8, 0, 1));
          }
        }
      });
    }
    if (t >= job.end) {
      if (job.hitRow >= 0) view[job.hitRow].liftWant = 0;
      for (let j = 0; j < PIN_X.length; j++) if (j !== job.src) pinWant[job.src][j] = 0;
      job = null; idle = 0;
    }
  }
  const lookup = job && job.t >= job.tIn && job.t < job.tIn + T_LOOK ? 1 : 0;
  glow += (lookup - glow) * (1 - Math.exp(-dt / 0.12));
  think.setAttribute("opacity", glow.toFixed(3));
  spin += ((busy ? 7.5 : calmSpin) - spin) * (1 - Math.exp(-dt / 0.6));
  if (!still.matches) spinAngle += spin * dt;
  FANS.forEach((cx, i) => {
    const d = fanBlades(iso, P, cx, FAN_FACE - 0.5, FAN_Z, spinAngle + i, FAN_R);
    blades[i].forEach((el) => el.setAttribute("d", d));
  });
  moving = moving || !!job || queue.length > 0 || glow > 0.004;
  view.forEach((v, i) => {
    v.shown = still.matches ? v.want : v.shown + (v.want - v.shown) * (1 - Math.exp(-dt / 0.16));
    v.lift = still.matches ? v.liftWant : v.lift + (v.liftWant - v.lift) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(v.want - v.shown) < 0.004) v.shown = v.want; else moving = true;
    if (Math.abs(v.liftWant - v.lift) < 0.004) v.lift = v.liftWant; else moving = true;
    rows[i].setAttribute("transform", moveBy([0, v.shown * PULL + v.lift * 4.5, 0], [55, -27, BOARD_TOP + 8]));
  });
  // the cover slides off along +x, or floats straight up when the box is taken apart
  {
    const steps = 4, h = dt / steps;
    // order of work: taking apart, the cover leaves first; putting back, the parts land first and the cover comes down last,
    // straight onto the box; only then may it slide open
    const coverUp = level > 0 || !partsDown || clock - landedAt < 0.25;
    const lidTarget = !coverUp && exCover.e < 0.02 ? lidWant : 0;
    for (let n = 0; n < steps; n++) { lid.v += (-64 * (lid.x - lidTarget) - 14.2 * lid.v) * h; lid.x += lid.v * h; }
    const wantC = coverUp ? 1 : 0;
    for (let n = 0; n < steps; n++) { exCover.v += (-48 * (exCover.e - wantC) - 12 * exCover.v) * h; exCover.e += exCover.v * h; }
    if (level > 0) coverZ += ((level >= 2 ? 290 : 210) - coverZ) * (1 - Math.exp(-dt / 0.22));
    if (still.matches) { lid.x = lidTarget; lid.v = 0; exCover.e = wantC; exCover.v = 0; coverZ = level >= 2 ? 290 : 210; }
    if (Math.abs(lid.x - lidTarget) < 0.002 && Math.abs(lid.v) < 0.002) { lid.x = lidTarget; lid.v = 0; } else moving = true;
    if (Math.abs(exCover.e - wantC) < 0.002 && Math.abs(exCover.v) < 0.002) { exCover.e = wantC; exCover.v = 0; } else moving = true;
    if (Math.abs(coverZ - (level >= 2 ? 290 : 210)) > 0.5 && level > 0) moving = true;
    const u = clamp(lid.x, 0, 1.04), lf = Math.min(1, u * 4);
    const ec = exCover.e, floatZ = coverZ * ec, floatX = 40 * ec;
    coverEl.setAttribute("transform", moveBy([LID_TRAVEL * u * (1 - clamp(ec, 0, 1)) + floatX, 0, 70 * ease(lf) * (1 - clamp(ec, 0, 1)) + floatZ], [0, 0, 53]));
    coverEl.style.setProperty("--solid", (1 - 0.94 * clamp(ec, 0, 1)).toFixed(3));
    coverEl.style.display = lid.x > 0.998 && exCover.e < 0.01 ? "none" : "";
  }
  // each part floats to its own height, high parts first when going apart, low parts first when coming together
  {
    let any = false, settledAll = true;
    for (const it of items) {
      const expanding = level > 0;
      const delay = (expanding ? 0.3 + (maxUp - it.up2) * 0.0055 : it.up2 * 0.0055);
      const target = clock - levelAt >= delay ? level : (expanding ? it.e0 ?? 0 : it.e0 ?? 0);
      if (clock - levelAt < delay) { it.e0 = it.e; continue; }
      it.e0 = undefined;
      const steps = 4, h = dt / steps;
      for (let n = 0; n < steps; n++) { it.v += (-60 * (it.e - level) - 13.5 * it.v) * h; it.e += it.v * h; }
      if (still.matches) { it.e = level; it.v = 0; }
      if (Math.abs(it.e - level) < 0.003 && Math.abs(it.v) < 0.003) { it.e = level; it.v = 0; } else settledAll = false;
      const z = it.up * clamp(it.e, 0, 1) + (it.up2 - it.up) * clamp(it.e - 1, 0, 1) + (it.e < 0 ? it.up * it.e : 0);
      it.z = z;
      it.el.setAttribute("transform", moveBy([0, 0, z], [it.x, it.y, BOARD_TOP + 4]));
      if (it.e > 0.004) any = true;
    }
    if (!settledAll) moving = true;
    const down = level === 0 && settledAll;
    if (down && !partsDown) landedAt = clock;
    partsDown = down;
    if (level === 0 && settledAll && orderLevel) { orderLevel = 0; [...rearBox.children].sort((a, b) => Number(a.dataset.n) - Number(b.dataset.n)).forEach((el) => rearBox.appendChild(el)); }
    let li = 0;
    for (const it of items) {
      if (it.board) continue;
      const line = leadLines[li++], z = it.z || 0;
      if (z > 1.5 && it.x !== undefined && !it.front) {
        const a = iso([it.x, it.y, BOARD_TOP + (boardItem ? boardItem.z || 0 : 0)], P), b = iso([it.x, it.y, BOARD_TOP + z], P);
        line.setAttribute("x1", a[0].toFixed(1)); line.setAttribute("y1", a[1].toFixed(1)); line.setAttribute("x2", b[0].toFixed(1)); line.setAttribute("y2", b[1].toFixed(1)); line.style.display = "";
      } else line.style.display = "none";
    }
    leaders.style.display = any ? "" : "none";
  }
  pinNow.forEach((row, i) => row.forEach((v, j) => {
    if (i === j) return;
    const next = still.matches ? pinWant[i][j] : v + (pinWant[i][j] - v) * (1 - Math.exp(-dt / 0.07));
    const settled = Math.abs(next - pinWant[i][j]) < 0.01 ? pinWant[i][j] : next;
    if (settled !== v) {
      row[j] = settled;
      pins[i][j].setAttribute("transform", moveBy([0, 0, -PIN_DROP * settled], [PIN_X[j], ROW_Y[i], BOARD_TOP + 6]));
      if (settled > 0.5) pins[i][j].setAttribute("data-on", ""); else pins[i][j].removeAttribute("data-on");
      moving = true;
    }
  }));
  sols.forEach((el, i) => {
    const want = job && job.src === i && job.t >= job.tIn ? 1 : 0;
    solNow[i] += (want - solNow[i]) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(want - solNow[i]) < 0.01) solNow[i] = want; else moving = true;
    el.setAttribute("opacity", (0.16 + 0.84 * solNow[i]).toFixed(2));
  });
  {
    const open = apart || level >= 2 ? 1 : 0;
    const delay = { rows: open ? 0 : 0.035, sol: open ? 0.035 : 0 };
    for (const key of ["rows", "sol"]) {
      const st = lift[key];
      const target = clock - apartAt >= delay[key] ? open : 1 - open;
      const steps = 4, h = dt / steps;
      for (let n = 0; n < steps; n++) { st.v += (-64 * (st.x - target) - 14.2 * st.v) * h; st.x += st.v * h; }
      if (still.matches) { st.x = open; st.v = 0; }
      if (Math.abs(st.x - open) < 0.002 && Math.abs(st.v) < 0.002) { st.x = open; st.v = 0; } else moving = true;
    }
    asmRows.setAttribute("transform", moveBy([0, 0, 22 * lift.rows.x], [-20, -24, BOARD_TOP + 8]));
    asmSol.setAttribute("transform", moveBy([-14 * lift.sol.x, 0, 0], [-68, -24, BOARD_TOP + 6]));
  }
  if (glLayerOn) {
    let lit = 0;
    const hideGl = level > 0 || (boardItem && boardItem.e > 0.01);
    for (let i = 0; i < 8; i++) {
      glAmp[i] = still.matches ? glWant[i] : glAmp[i] + (glWant[i] - glAmp[i]) * (1 - Math.exp(-dt / (glWant[i] > glAmp[i] ? 0.06 : 0.45)));
      if (glAmp[i] < 0.004 && !glWant[i]) glAmp[i] = 0;
      lit += glAmp[i];
    }
    if (lit > 0 && !hideGl) { glLayerOn.draw({ uHead: glHead, uDir: glDir, uAmp: glAmp }, clock); moving = true; } else glLayerOn.clear();
  }
  leds.forEach((el) => {
    const i = Number(el.dataset.led ?? el.dataset.ledFront);
    const level2 = clamp(1 - (clock - ledAt[i]) / 0.55, 0, 1);
    if (level2 > 0) moving = true;
    el.setAttribute("opacity", (0.16 + 0.84 * level2).toFixed(2));
  });
  if (applyCam(dt)) moving = true;
  settledNow = !moving;
  return moving || !still.matches;
}
// the tour and the fans are decoration: after 8 s without input (or when the window loses focus) the loop sleeps (no frames, no CPU) until the next touch
let lastInput = performance.now(), settledNow = false;
const wake = () => { lastInput = performance.now(); run(); };
["pointerdown", "keydown", "wheel", "pointermove", "focus"].forEach((n) => addEventListener(n, wake, { passive: true }));
function tick(now) {
  if (last && now - last < 33) { frame = requestAnimationFrame(tick); return; } // 30 fps is plenty for this drawing
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 30;
  last = now;
  const keep = frameAt(dt);
  const asleep = settledNow && !job && !queue.length && (now - lastInput > 8000 || !document.hasFocus());
  frame = visible && keep && !asleep ? requestAnimationFrame(tick) : 0;
}
const FILM = /film/.test(location.hash);
function run() { if (FILM) return; if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }

function send(port) {
  if (level > 0) return;
  held = clock + 7;
  if (lidWant === 0) setLid(true);
  const dst = lastSrc >= 0 && lastSrc !== port ? lastSrc : (port + 1) % PORTS;
  if (queue.length < 2) queue.push([port, dst]);
  run();
}
const hit = (event) => {
  const box = svg.getBoundingClientRect();
  const scale = box.width / WIDTH;
  let best = -1, bestD = 1e9;
  PORT_X.forEach((x, i) => {
    const [sx, sy] = iso([x, JACK_Y + 14, JACK_TOP], P);
    const d = Math.hypot(box.left + sx * scale - event.clientX, box.top + sy * scale - event.clientY);
    if (d < bestD) { bestD = d; best = i; }
  });
  return bestD < 24 * scale ? best : -1;
};
const overFab = (event) => {
  const box = svg.getBoundingClientRect(), scale = box.width / WIDTH;
  const [sx, sy] = iso([-20, -24, 14], P);
  return Math.hypot(box.left + sx * scale - event.clientX, box.top + sy * scale - event.clientY) < 52 * scale;
};
function setApart(on) { if (on && (lidWant !== 1 || level > 0)) return; if (apart !== on) { apart = on; apartAt = clock; run(); } }
function setLid(on) {
  if (lidWant === (on ? 1 : 0)) return;
  if (level > 0) setLevel(0);
  lidWant = on ? 1 : 0;
  if (!on) { setApart(false); clearJob(); }
  btn("lid").textContent = on ? "Close lid" : "Open lid";
  btn("lid").setAttribute("aria-pressed", on ? "true" : "false");
  say(on ? "lid off" : "lid on");
  run();
}
stage.addEventListener("pointermove", (event) => { if (event.pointerType === "mouse" && !drag) setApart(overFab(event)); });
stage.addEventListener("pointerleave", () => setApart(false));
let drag = null;
viewport.addEventListener("pointerdown", (event) => { drag = { x: event.clientX, y: event.clientY, tx: cam.tx, ty: cam.ty, moved: false, id: event.pointerId }; });
viewport.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 5 && cam.tz > 1.01) { drag.moved = true; viewport.setPointerCapture(event.pointerId); }
  if (drag.moved) { cam.tx = drag.tx + dx; cam.ty = drag.ty + dy; clampCam(cam); cam.manual = true; run(); }
});
viewport.addEventListener("pointerup", (event) => {
  const d = drag; drag = null;
  if (!d || d.moved) return;
  const port = hit(event);
  if (port >= 0) send(port);
  else if (lidWant === 0 && level === 0) setLid(true);
  else { const r = regionAt(event, false); if (r && level === 0) openPart(r); }
});
viewport.addEventListener("dblclick", (event) => { const r = regionAt(event, true); if (r && level === 0) openPart(r); });
viewport.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const o = stageOrigin();
  zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - o.x, event.clientY - o.y);
}, { passive: false });
btn("lid").addEventListener("click", () => setLid(lidWant === 0));
btn("explode").addEventListener("click", () => setLevel((level + 1) % 3));
btn("zoom-in").addEventListener("click", () => zoomAt(1.5));
btn("zoom-out").addEventListener("click", () => zoomAt(1 / 1.5));
btn("fit").addEventListener("click", () => frameView(level > 0));
stage.addEventListener("keydown", (event) => {
  if (/^[1-8]$/.test(event.key)) { event.preventDefault(); send(Number(event.key) - 1); }
  if (event.key === "l" || event.key === "L") { event.preventDefault(); setLid(lidWant === 0); }
  if (event.key === "e" || event.key === "E") { event.preventDefault(); setLevel((level + 1) % 3); }
  if (event.key === "r" || event.key === "R") { event.preventDefault(); clearTable(); held = clock + 7; say("table cleared"); run(); }
  if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomAt(1.5); }
  if (event.key === "-") { event.preventDefault(); zoomAt(1 / 1.5); }
  if (event.key === "0") { event.preventDefault(); frameView(level > 0); }
});

// ---- inspect: click a part (double-click a jack), the view zooms to it and its pin-out sheet opens ------------------
const dp = document.querySelector(".dp"), menu = document.querySelector(".pmenu"), tip = document.querySelector(".tip"), plate = document.querySelector(".iso-plate");
const frontEl = stage.querySelector(".fx-front");
const ringEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
ringEl.setAttribute("class", "sel"); ringEl.style.display = "none"; frontEl.appendChild(ringEl);
const JACKISH = /^(rj45|console)\|/;
function regionAt(event, withJacks) {
  const box = svg.getBoundingClientRect(), scale = box.width / WIDTH;
  let best = null, bestLim = 1e9;
  for (const r of REGIONS) {
    if (!withJacks && JACKISH.test(r.info)) continue;
    const [sx, sy] = iso([r.x, r.y, r.z], P);
    const d = Math.hypot(box.left + sx * scale - event.clientX, box.top + sy * scale - event.clientY);
    const lim = Math.max(7, r.r * P.scale * scale * 0.8);
    if (d < lim && lim < bestLim) { best = r; bestLim = lim; }
  }
  return best;
}
function focusOn(r) {
  const [sx, sy] = iso([r.x, r.y, r.z], P);
  const w = stage.offsetWidth, h = stage.offsetHeight, o = stageOrigin(), pr = dp.getBoundingClientRect();
  const want = (Math.max(o.x, 0) + pr.left) / 2 - o.x;
  cam.tz = r.zoom; cam.tx = want - r.zoom * sx * (w / WIDTH); cam.ty = h * 0.5 - r.zoom * sy * (h / HEIGHT);
  cam.manual = true; clampCam(cam); run();
}
function openPart(r) {
  const [id, ref] = r.info.split("|"), p = PANELS[id];
  if (level > 0) setLevel(0);
  if (lidWant === 0) setLid(true);
  sel = r; menu.hidden = true; btn("parts").setAttribute("aria-expanded", "false");
  dp.querySelector("h2").textContent = ref + " \u00b7 " + p.title;
  dp.querySelector(".ds").textContent = p.sub;
  dp.querySelector(".dsv").innerHTML = '<span class="bd">' + p.badge + "</span>" + p.svg;
  dp.querySelector(".dn").innerHTML = p.note;
  dp.hidden = false; tip.hidden = true;
  const pts = Array.from({ length: 49 }, (_, i) => iso([r.x + Math.cos((i / 48) * 6.2832) * r.r * 0.95, r.y + Math.sin((i / 48) * 6.2832) * r.r * 0.95, r.z], P));
  ringEl.setAttribute("d", "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") + "Z");
  ringEl.style.display = "";
  say(ref + " \u00b7 " + p.title);
  focusOn(r);
}
function closePart() { if (!sel) return; sel = null; dp.hidden = true; ringEl.style.display = "none"; frameView(false); say(lidWant ? "lid off" : "lid on"); }
viewport.addEventListener("pointermove", (event) => {
  if (drag && drag.moved) { tip.hidden = true; return; }
  const r = regionAt(event, true);
  viewport.style.cursor = r && !JACKISH.test(r.info) ? "pointer" : "";
  if (!r || level > 0 || lidWant === 0) { tip.hidden = true; return; }
  const [id, ref] = r.info.split("|"), pr = plate.getBoundingClientRect();
  tip.textContent = ref + " \u00b7 " + PANELS[id].title + (JACKISH.test(r.info) ? "  (double-click for pin-out)" : "  (click for pin-out)");
  tip.style.left = Math.min(event.clientX - pr.left + 14, pr.width - 260) + "px"; tip.style.top = event.clientY - pr.top + 16 + "px"; tip.hidden = false;
});
viewport.addEventListener("pointerleave", () => { tip.hidden = true; });
dp.querySelector(".dx").addEventListener("click", closePart);
btn("parts").addEventListener("click", () => { menu.hidden = !menu.hidden; btn("parts").setAttribute("aria-expanded", String(!menu.hidden)); });
menu.addEventListener("click", (event) => { const b = event.target.closest("[data-part]"); if (b) openPart(REGIONS.find((r) => r.info === b.dataset.part)); });
addEventListener("keydown", (event) => { if (event.key === "Escape") { menu.hidden = true; btn("parts").setAttribute("aria-expanded", "false"); closePart(); } });
const openFromHash = /part=([a-z0-9|]+)/i.exec(decodeURIComponent(location.hash));
if (openFromHash) { const r = REGIONS.find((q) => q.info === openFromHash[1]); if (r) setTimeout(() => openPart(r), 300); }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) { if (AUTO_OPEN && !lidTimer && lidWant === 0 && !still.matches && !/closed|open|ex\d/.test(location.hash)) lidTimer = setTimeout(() => setLid(true), 1100); run(); } }, { rootMargin: "120px 0px" }).observe(stage);
put(pucksLow[0], alongPath(inPath(0), 120), 1);
ledAt[0] = 0;
const hash = location.hash;
if (still.matches || /open|ex\d/.test(hash)) { lidWant = 1; lid.x = 1; btn("lid").textContent = "Close lid"; btn("lid").setAttribute("aria-pressed", "true"); say("lid off"); }
else say("lid on · opening");
if (/ex1|ex2/.test(hash)) {
  const n = /ex2/.test(hash) ? 2 : 1;
  level = n; levelAt = -99; reorder(true); orderLevel = 1;
  items.forEach((it) => { it.e = n; });
  exCover.e = 1; coverZ = n >= 2 ? 290 : 210; partsDown = false;
  frameView(true); cam.z = cam.tz; cam.x = cam.tx; cam.y = cam.ty;
  btn("explode").setAttribute("aria-pressed", "true"); btn("explode").textContent = n === 1 ? "Explode more" : "Assemble";
}

// inside the single-file bundle the view links ask the parent shell to swap the frame
document.querySelectorAll(".ctl a[href]").forEach((a) => a.addEventListener("click", (event) => {
  if (parent === window) return;
  event.preventDefault();
  parent.postMessage({ nsView: a.getAttribute("href"), hash: location.hash }, "*");
}));

// ---- film mode: #film turns off the animation loop so a script can step the page frame by frame -----------------------
if (FILM) {
  document.body.classList.add("film");
  const capEl = document.createElement("div");
  capEl.className = "film-cap";
  document.querySelector(".iso-plate").appendChild(capEl);
  window.film = {
    step: (dt) => { frameAt(dt); },
    // put the world point (x, y, z) at the centre of the picture, magnified by zoom
    cam: (zoom, x, y, z) => {
      const [sx, sy] = iso([x, y, z], P), w = stage.offsetWidth, h = stage.offsetHeight;
      cam.z = cam.tz = zoom; cam.x = cam.tx = w / 2 - zoom * sx * (w / WIDTH); cam.y = cam.ty = h / 2 - zoom * sy * (h / HEIGHT);
      applyCam(0);
    },
    // camera by zoom and offset from the centred framing, in fractions of the stage size
    cam2: (zoom, dx, dy) => { const w = stage.offsetWidth, h = stage.offsetHeight; cam.z = cam.tz = zoom; cam.x = cam.tx = (w - w * zoom) / 2 + dx * w; cam.y = cam.ty = (h - h * zoom) / 2 + dy * h; applyCam(0); },
    zoomC: (zoom) => { const w = stage.offsetWidth, h = stage.offsetHeight; cam.z = cam.tz = zoom; cam.x = cam.tx = (w - w * zoom) / 2; cam.y = cam.ty = (h - h * zoom) / 2; applyCam(0); },
    send, lid: setLid, level: setLevel, close: closePart,
    part: (info) => openPart(REGIONS.find((r) => r.info === info)),
    cap: (zh, en) => { capEl.innerHTML = "<b>" + zh + "</b><span>" + en + "</span>"; capEl.style.opacity = zh || en ? "1" : "0"; },
    // one entry per kind of part (the eight identical jacks, four DDR chips ... are shown once): [info, caption]
    list: () => { const seen = new Set(), out = []; for (const r of REGIONS) { const [id, ref] = r.info.split("|"); if (seen.has(id)) continue; seen.add(id); out.push([r.info, ref + "  " + PANELS[id].title]); } return out; },
    camFree: () => cam.manual,
  };
}
