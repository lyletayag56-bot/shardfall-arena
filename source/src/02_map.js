/* ============================================================
   map geometry, collision grid, navigation
   Blue base bottom-left, red base top-right. Three lanes, a river
   on the opposite diagonal, four jungle triangles.
   ============================================================ */
const mirM = p => [W - p[1], W - p[0]];   // reflect across the mid lane
const mirP = p => [W - p[0], W - p[1]];   // rotate 180° about the centre (blue <-> red)

const MAP = (() => {
  const corridors = [];  // {pts, w, kind}
  const circles = [];    // {x,y,r,kind,team}
  const bushes = [];     // {x,y,r}
  const camps = [];      // {x,y,type,side}
  // The layout is drawn on a 5120 sheet and blown up to the world (K), so every route keeps its place while the ground gets roomier;
  // widths and radii below are in world units.
  const K = W / 5120, P = p => [p[0] * K, p[1] * K];
  const LANE_W = 580, MID_W = 620, RIVER_W = 540, PATH_W = 340;
  const C0 = P([700, 4420]), C1 = mirP(C0);
  const S0 = P([330, 4790]), S1 = mirP(S0);

  const top = [[700, 4420], [620, 3900], [620, 820], [820, 620], [3900, 620], [4420, 700]].map(P);
  const bot = top.map(mirM);
  const mid = [[700, 4420], [4420, 700]].map(P);
  corridors.push({ pts: top, w: LANE_W, kind: 'lane' }, { pts: bot, w: LANE_W, kind: 'lane' }, { pts: mid, w: MID_W, kind: 'lane' });
  corridors.push({ pts: [[780, 780], [4340, 4340]].map(P), w: RIVER_W, kind: 'river' });
  const B0 = P([600, 4520]), PT = P([1650, 1650]);
  circles.push({ x: B0[0], y: B0[1], r: 810, kind: 'base', team: BLUE }, { x: W - B0[0], y: W - B0[1], r: 810, kind: 'base', team: RED });
  circles.push({ x: PT[0], y: PT[1], r: 450, kind: 'pit' }, { x: W - PT[0], y: W - PT[1], r: 450, kind: 'pit' });

  // West jungle triangle (blue side, between top lane, river and mid lane), mirrored three times.
  const wPaths = [
    [[620, 2560], [1300, 2560]],
    [[1300, 2560], [1960, 1960]],
    [[1300, 2560], [1930, 3190]],
    [[620, 1500], [1090, 1750], [1300, 2560]],
    [[620, 3620], [1090, 3370], [1300, 2560]],
    [[1300, 2560], [1850, 2560], [2340, 2560]],     // through the den to the middle of the map
  ];
  const wCamps = [
    { p: [1300, 2560], r: 330, type: 'buff' },
    { p: [1090, 1750], r: 255, type: 'small' },
    { p: [1090, 3370], r: 255, type: 'small' },
    { p: [1850, 2560], r: 250, type: 'warden' },
  ];
  const wBush = [[455, 2250, 105], [1620, 2260, 100], [1605, 2875, 100], [850, 3500, 95], [850, 1620, 95], [1644, 3264, 95], [2150, 2330, 95], [560, 1180, 100], [2120, 2560, 80], [1575, 2560, 70]];
  const tris = [
    { f: p => p, side: BLUE, buff: 'azure' },
    { f: mirM, side: BLUE, buff: 'crimson' },
    { f: p => mirP(mirM(p)), side: RED, buff: 'crimson' },
    { f: mirP, side: RED, buff: 'azure' },
  ];
  for (const t of tris) {
    for (const path of wPaths) corridors.push({ pts: path.map(q => t.f(P(q))), w: PATH_W, kind: 'path' });
    for (const c of wCamps) {
      const p = t.f(P(c.p));
      circles.push({ x: p[0], y: p[1], r: c.r, kind: 'camp' });
      camps.push({ x: p[0], y: p[1], type: c.type === 'buff' ? t.buff : c.type, side: t.side });
    }
    for (const b of wBush) { const p = t.f(P([b[0], b[1]])); bushes.push({ x: p[0], y: p[1], r: b[2] * 1.3 }); }
  }
  // two skitters live in the river itself, half way between each pit and the middle: nobody's jungle
  for (const q of [P([2190, 2190]), mirP(P([2190, 2190]))]) camps.push({ x: q[0], y: q[1], type: 'skitter', side: NEUTRAL });

  // turrets: tier 1 = outer, 3 = closest to the crystal
  const tw = [];
  const blueT = {
    top: [[690, 1620], [690, 2620], [690, 3530]].map(P),       // about 1,230 and 1,350 apart: no turret can cover for its neighbour
    mid: [[2115, 3105], [1705, 3515], [1294, 3926]].map(P),   // 785 apart, and the middle of mid is still well outside both outer turrets
  };
  blueT.bot = blueT.top.map(mirM);
  for (const lane of ['top', 'mid', 'bot']) blueT[lane].forEach((p, i) => {
    tw.push({ x: p[0], y: p[1], team: BLUE, lane, tier: i + 1 });
    const q = mirP(p);
    // 180° rotation maps blue top lane onto red bot lane (same physical lane names are kept per path)
    tw.push({ x: q[0], y: q[1], team: RED, lane: lane === 'top' ? 'bot' : lane === 'bot' ? 'top' : 'mid', tier: i + 1 });
  });

  return {
    corridors, circles, bushes, camps, turrets: tw,
    crystal: [{ x: C0[0], y: C0[1] }, { x: C1[0], y: C1[1] }],
    spawn: [{ x: S0[0], y: S0[1] }, { x: S1[0], y: S1[1] }],
    lanes: { top, mid, bot },
    turtle: { x: PT[0], y: PT[1] }, lord: { x: W - PT[0], y: W - PT[1] },
    bounds: [70, W - 70],
  };
})();

/* ---------- geometry helpers ---------- */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return hyp(px - ax - dx * t, py - ay - dy * t);
}
function polyDist(px, py, pts) {
  let m = 1e9;
  for (let i = 0; i < pts.length - 1; i++) { const d = segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < m) m = d; }
  return m;
}
// lane paths with cumulative lengths, per team direction
function makePath(pts) {
  const p = pts.map(q => ({ x: q[0], y: q[1] })); const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i], p[i - 1]));
  return { p, cum, len: cum[cum.length - 1] };
}
const LANE_NAMES = ['top', 'mid', 'bot'];
const LANE_PATH = [{}, {}];
for (const n of LANE_NAMES) { LANE_PATH[BLUE][n] = makePath(MAP.lanes[n]); LANE_PATH[RED][n] = makePath(MAP.lanes[n].slice().reverse()); }
function progOf(path, x, y) {
  let best = 1e18, prog = 0;
  for (let i = 0; i < path.p.length - 1; i++) {
    const a = path.p[i], b = path.p[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    let t = ((x - a.x) * dx + (y - a.y) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - a.x - dx * t, ey = y - a.y - dy * t, d = ex * ex + ey * ey;       // (written out: a square by multiplication is the same in every browser)
    if (d < best) { best = d; prog = path.cum[i] + Math.sqrt(l2) * t; }
  }
  return prog;
}
function pointAlong(path, s) {
  s = clamp(s, 0, path.len);
  for (let i = 0; i < path.p.length - 1; i++) {
    if (s <= path.cum[i + 1]) { const t = (s - path.cum[i]) / (path.cum[i + 1] - path.cum[i]); return { x: lerp(path.p[i].x, path.p[i + 1].x, t), y: lerp(path.p[i].y, path.p[i + 1].y, t) }; }
  }
  const e = path.p[path.p.length - 1]; return { x: e.x, y: e.y };
}

/* ---------- collision: a distance field over a 16u grid ----------
   sdg holds, at every cell centre, the distance to the edge of the walkable ground (positive inside, clamped to ±SDC).
   It is read bilinearly, so walls are smooth at any angle and movement can slide along them instead of catching on grid steps. */
const FC = 16, FN = W / FC, SDC = 96;
const fine = new Uint8Array(FN * FN), sdg = new Float32Array(FN * FN).fill(-SDC);
(() => {
  const SH = 16; // keep unit centres a little off the cliff edges
  const stamp = (x0, y0, x1, y1, f) => {       // raise the field inside a box of cells
    const i0 = Math.max(0, Math.floor(x0 / FC)), i1 = Math.min(FN - 1, Math.floor(x1 / FC)), j0 = Math.max(0, Math.floor(y0 / FC)), j1 = Math.min(FN - 1, Math.floor(y1 / FC));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = f(i * FC + FC / 2, j * FC + FC / 2), k = j * FN + i; if (d > sdg[k]) sdg[k] = d; }
  };
  for (const c of MAP.circles) { const R = c.r - SH, m = R + SDC; stamp(c.x - m, c.y - m, c.x + m, c.y + m, (x, y) => R - hyp(x - c.x, y - c.y)); }
  for (const c of MAP.corridors) {
    const R = c.w / 2 - SH, m = R + SDC;
    for (let q = 0; q < c.pts.length - 1; q++) {
      const a = c.pts[q], b = c.pts[q + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = hyp(dx, dy), f = (x, y) => R - segDist(x, y, a[0], a[1], b[0], b[1]);
      if (Math.abs(dy) * 4 < len) { stamp(Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, f); continue; }      // nearly level: its bounding box is tight already
      const hw = m * len / Math.abs(dy), j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - m) / FC)), j1 = Math.min(FN - 1, Math.floor((Math.max(a[1], b[1]) + m) / FC));
      for (let j = j0; j <= j1; j++) { const y = j * FC + FC / 2, xc = a[0] + dx * clamp((y - a[1]) / dy, 0, 1); stamp(xc - hw, y, xc + hw, y, f); }      // slanted: only the band of cells beside it
    }
  }
  const B0 = MAP.bounds[0], B1 = MAP.bounds[1];
  for (let j = 0; j < FN; j++) for (let i = 0; i < FN; i++) {
    const x = i * FC + FC / 2, y = j * FC + FC / 2, k = j * FN + i;
    const d = Math.max(-SDC, Math.min(sdg[k], SDC, x - B0, y - B0, B1 - x, B1 - y)); sdg[k] = d; if (d > 0) fine[k] = 1;
  }
})();
/* Turrets and crystals guard the road, not the woods: laneSd is how far inside lane or base ground a point is (negative off it).
   Jungle paths, camps, the river and the pits are all off it, so nobody roaming the jungle is ever shot at. */
function laneSd(x, y) {
  let m = -1e9;
  for (const c of MAP.corridors) if (c.kind === 'lane') { const d = c.w / 2 - polyDist(x, y, c.pts); if (d > m) m = d; }
  for (const c of MAP.circles) if (c.kind === 'base') { const d = c.r - hyp(x - c.x, y - c.y); if (d > m) m = d; }
  return m;
}
let _sgx = 0, _sgy = 0, _wx = 0, _wy = 0;
function sdAt(x, y) {       // distance to the nearest wall at any point; leaves the field's gradient in _sgx, _sgy
  const fx = x / FC - 0.5, fy = y / FC - 0.5, i = Math.floor(fx), j = Math.floor(fy);
  if (!(i >= 0 && j >= 0 && i < FN - 1 && j < FN - 1)) { _sgx = _sgy = 0; return -SDC; }
  const tx = fx - i, ty = fy - j, k = j * FN + i, a = sdg[k], b = sdg[k + 1], c = sdg[k + FN], d = sdg[k + FN + 1];
  _sgx = ((b - a) * (1 - ty) + (d - c) * ty) / FC; _sgy = ((c - a) * (1 - tx) + (d - b) * tx) / FC;
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}
function walkable(x, y) { return sdAt(x, y) > 0; }
/* Move a point by (mx,my) without leaving the walkable ground: whatever would enter a wall is turned along it.
   `assist` (0..1) is the least share of the step kept when sliding, so brushing a wall at a steep angle never feels sticky;
   pushing almost straight in still stops. The result is left in _wx, _wy; returns false if the point cannot move. */
function wallSlide(x, y, mx, my, assist) {
  let nx = x + mx, ny = y + my, s = sdAt(nx, ny), gx = 0, gy = 0, hit = false;
  for (let it = 0; it < 4 && s < 0.5; it++) {
    const g2 = _sgx * _sgx + _sgy * _sgy; if (g2 < 1e-8) return false;
    const k = (0.75 - s) / g2; gx = _sgx; gy = _sgy; nx += gx * k; ny += gy * k; hit = true; s = sdAt(nx, ny);
  }
  if (s < 0) return false;
  if (hit && assist) {
    const gl = hyp(gx, gy), tx = -gy / gl, ty = gx / gl, m = hyp(mx, my) || 1, along = (mx * tx + my * ty) / m;
    if (Math.abs(along) > 0.12 && Math.abs(along) < assist) {
      const want = (along < 0 ? -assist : assist) * m; let px = x + tx * want, py = y + ty * want, ps = sdAt(px, py);
      for (let it = 0; it < 3 && ps < 0.5; it++) { const g2 = _sgx * _sgx + _sgy * _sgy; if (g2 < 1e-8) break; const k = (0.75 - ps) / g2; px += _sgx * k; py += _sgy * k; ps = sdAt(px, py); }
      if (ps >= 0 && (px - x) * mx + (py - y) * my > 0) { nx = px; ny = py; }
    }
  }
  _wx = nx; _wy = ny;
  return (nx - x) * (nx - x) + (ny - y) * (ny - y) > 1e-6;
}
function nearestWalkable(x, y) {
  if (walkable(x, y)) return { x, y };
  for (let r = FC; r < 700; r += FC) for (let a = 0; a < 16; a++) {
    const nx = x + fcos(a * TAU / 16) * r, ny = y + fsin(a * TAU / 16) * r;
    if (walkable(nx, ny)) return { x: nx, y: ny };
  }
  return { x: W / 2, y: W / 2 };
}
// walk back from (x1,y1) toward (x0,y0) until a walkable spot is found
function clampWalk(x0, y0, x1, y1) {
  if (walkable(x1, y1)) return { x: x1, y: y1 };
  const d = hyp(x1 - x0, y1 - y0), n = Math.ceil(d / 12);
  for (let i = n - 1; i >= 0; i--) { const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t); if (walkable(x, y)) return { x, y }; }
  return nearestWalkable(x0, y0);
}
/* Can the straight line be walked? Marches the distance field, stepping by the room there is, so no wall is ever stepped over however
   thin (the tip of a wedge between two paths used to slip between fixed samples, and whoever trusted the line ran into it). The line
   keeps LOS_PAD clear of walls, or as much as its two ends have if they are closer than that themselves. */
const LOS_PAD = 14;
function losWalk(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, d = hyp(dx, dy); if (d < 1) return true;
  const s0 = sdAt(x0, y0), s1 = sdAt(x1, y1); if (s0 <= 0 || s1 <= 0) return false;
  const need = Math.min(LOS_PAD, s0 * 0.5, s1 * 0.5), ux = dx / d, uy = dy / d;
  for (let t = 0; t < d;) { const s = sdAt(x0 + ux * t, y0 + uy * t); if (s < need) return false; t += Math.min(64, Math.max(3, (s - need) * 0.85)); }
  return true;
}
function bushAt(x, y) {
  const B = MAP.bushes;
  for (let i = 0; i < B.length; i++) { const b = B[i], dx = x - b.x, dy = y - b.y; if (dx * dx + dy * dy < b.r * b.r) return i; }
  return -1;
}

/* ---------- nav grid (64u) + A* ---------- */
const NC = 64, NN = W / NC;
const nav = new Uint8Array(NN * NN);
(() => {
  const k = NC / FC;
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
    let n = 0;
    for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) n += fine[(j * k + b) * FN + i * k + a];
    if (n >= k * k - 2) nav[j * NN + i] = 1;
  }
})();
const _g = new Float32Array(NN * NN), _par = new Int32Array(NN * NN), _gen = new Uint32Array(NN * NN), _closed = new Uint32Array(NN * NN);
let _genId = 0;
function navCell(x, y) {
  let i = clamp((x / NC) | 0, 0, NN - 1), j = clamp((y / NC) | 0, 0, NN - 1);
  if (nav[j * NN + i]) return j * NN + i;
  for (let r = 1; r < 8; r++) {
    let best = -1, bd = 1e9;
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= NN || jj >= NN || !nav[jj * NN + ii]) continue;
      const d = hyp((ii + .5) * NC - x, (jj + .5) * NC - y); if (d < bd) { bd = d; best = jj * NN + ii; }
    }
    if (best >= 0) return best;
  }
  return -1;
}
function openCentre(x, y, to) {       // a cell centre close by that can be walked to in a straight line, best one on the way to `to`
  const ci = clamp((x / NC) | 0, 0, NN - 1), cj = clamp((y / NC) | 0, 0, NN - 1); let best = null, bd = 1e9;
  for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
    const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= NN || j >= NN || !nav[j * NN + i]) continue;
    const cx = (i + .5) * NC, cy = (j + .5) * NC, d = hyp(cx - x, cy - y) + (to ? hyp(cx - to.x, cy - to.y) : 0);
    if (d < bd && losWalk(x, y, cx, cy)) { bd = d; best = { x: cx, y: cy }; }
  }
  return best;
}
/* Which point of a found path to walk to now. A corner is cut only once the point after it can be reached in a straight line: turning
   early by distance alone walks straight into the wall the path was going round. */
function pathStep(P, i, x, y, near) {
  while (i < P.length - 1) { const d = hyp(P[i].x - x, P[i].y - y); if (d < 10 || d < near && losWalk(x, y, P[i + 1].x, P[i + 1].y)) i++; else break; }
  return i;
}
/* cost: an optional weight per nav cell, added to the price of stepping onto it. Ground that is dear is gone round where there is a way
   round (and still crossed where there is none, or where the goal lies in it); straightening never cuts a corner through dearer ground. */
function findPath(x0, y0, x1, y1, cost) {
  const s = navCell(x0, y0), e = navCell(x1, y1);
  if (s < 0 || e < 0) return null;
  if (s === e) return [{ x: x1, y: y1 }];
  const gen = ++_genId, ex = e % NN, ey = (e / NN) | 0;
  const heap = [], hf = [];
  const push = (n, f) => { let i = heap.length; heap.push(n); hf.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; heap[i] = heap[p]; hf[i] = hf[p]; i = p; } heap[i] = n; hf[i] = f; };
  const pop = () => {
    const top = heap[0], ln = heap.pop(), lf = hf.pop();
    if (heap.length) { let i = 0; const n = heap.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; heap[i] = heap[c]; hf[i] = hf[c]; i = c; } heap[i] = ln; hf[i] = lf; }
    return top;
  };
  const cGoal = cost ? cost[e] : 0;       // ground no dearer than where the goal lies is free: walking up to a turret costs nothing extra, and the search does not flood the map looking for a way round what it has to enter anyway
  const H = (i, j) => { const dx = Math.abs(i - ex), dy = Math.abs(j - ey); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
  _g[s] = 0; _gen[s] = gen; _par[s] = -1; push(s, H(s % NN, (s / NN) | 0));
  let found = false;
  while (heap.length) {
    const c = pop(); if (c === e) { found = true; break; }
    if (_closed[c] === gen) continue; _closed[c] = gen;
    const ci = c % NN, cj = (c / NN) | 0, cg = _g[c];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      if (!a && !b) continue;
      const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= NN || nj >= NN) continue;
      const n = nj * NN + ni; if (!nav[n] || _closed[n] === gen) continue;
      if (a && b && (!nav[cj * NN + ni] || !nav[nj * NN + ci])) continue;
      const ng = cg + (a && b ? 1.4142 : 1) + (cost && cost[n] > cGoal ? cost[n] - cGoal : 0);
      if (_gen[n] !== gen || ng < _g[n]) { _g[n] = ng; _gen[n] = gen; _par[n] = c; push(n, ng + H(ni, nj)); }
    }
  }
  if (!found) return null;
  const cells = []; for (let c = e; c !== -1; c = _par[c]) cells.push(c); cells.reverse();
  const pts = cells.map(c => ({ x: (c % NN + .5) * NC, y: (((c / NN) | 0) + .5) * NC }));
  const c0 = pts[0]; pts[0] = { x: x0, y: y0 };
  if (walkable(x1, y1)) pts[pts.length - 1] = { x: x1, y: y1 };
  // string pulling
  const out = []; let i = 0;
  const cell = (x, y) => clamp((y / NC) | 0, 0, NN - 1) * NN + clamp((x / NC) | 0, 0, NN - 1);
  const clear = cost ? (ax, ay, bx, by) => {       // a straight line that is walkable and passes over nothing dearer than its two ends
    if (!losWalk(ax, ay, bx, by)) return false;
    const n = Math.ceil(hyp(bx - ax, by - ay) / 40), lim = Math.max(cost[cell(ax, ay)], cost[cell(bx, by)]) + 0.01;
    for (let q = 1; q < n; q++) if (cost[cell(ax + (bx - ax) * q / n, ay + (by - ay) * q / n)] > lim) return false;
    return true;
  } : losWalk;
  {      // the first leg has to be walkable from where the walker stands: against a wall, the next cell may well be round the corner
    let j = Math.min(pts.length - 1, 14); while (j >= 1 && !clear(x0, y0, pts[j].x, pts[j].y)) j--;
    if (j >= 1) { out.push(pts[j]); i = j; }
    else { const o = losWalk(x0, y0, c0.x, c0.y) ? c0 : openCentre(x0, y0, pts[1]); if (o) { out.push(o); pts[0] = o; } }
  }
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 14);
    while (j > i + 1 && !clear(pts[i].x, pts[i].y, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
