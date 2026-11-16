/* ============================================================
   3D world: painted terrain with raised jungle walls, river,
   forest, hideable grass and base decor
   ============================================================ */
const PAL = {
  top: '#2c6a40', top2: '#3a8749', top3: '#215436',
  rock: '#8a7f6d', rockHi: '#b0a48d', rockLo: '#585247',
  floor: '#5c9c53', lane: '#cbb383', lane2: '#dcc798', laneEdge: '#a18c63', path: '#a59a6c',
  river: '#2c88a0', river2: '#45adbf', camp: '#8f8a66', pit: '#236a84', stone: '#8d96a0', stone2: '#aab3bc',
  blue: '#46b4ff', red: '#ff5d5d',
};
const WORLD = { N: 240, hgt: null, group: null, bushes: [], water: null, skirtY: 0.74, swap: false, gtex: null, sideG: null };
const teamHex = t => { if (WORLD.swap && (t === BLUE || t === RED)) t = 1 - t; return t === BLUE ? PAL.blue : t === RED ? PAL.red : '#e8b55a'; };
/* Which team is shown in the allies' colour. A player on the red team sees their own side blue and the other red, like the bars, the
   minimap and the score on their screen (the map itself is not turned: their base stays at the top right). Nothing is painted again
   for it: the two bases differ only in colour and the map is the same after a half turn, so the ground's paint and the bases'
   ornaments are simply turned half round; the units and buildings are built in the other colour as they come (see unitInstance). */
function worldSide(swap) {
  swap = !!swap; if (WORLD.swap === swap) return; WORLD.swap = swap;
  if (WORLD.gtex) { WORLD.gtex.center.set(0.5, 0.5); WORLD.gtex.rotation = swap ? Math.PI : 0; WORLD.gtex.updateMatrix(); }
  if (WORLD.sideG) { WORLD.sideG.rotation.y = swap ? Math.PI : 0; WORLD.sideG.position.set(swap ? W * S3 : 0, 0, swap ? W * S3 : 0); WORLD.sideG.updateMatrixWorld(true); }
}

/* signed distance to the walkable area in sim units: <0 walkable, >0 inside a wall */
function sdWalk(x, y) {
  let d = 1e9;
  for (const c of MAP.circles) { const v = Math.hypot(x - c.x, y - c.y) - c.r; if (v < d) d = v; }
  for (const c of MAP.corridors) { const v = polyDist(x, y, c.pts) - c.w / 2; if (v < d) d = v; }
  const b0 = MAP.bounds[0], b1 = MAP.bounds[1];
  return Math.max(d, b0 - x, x - b1, b0 - y, y - b1);
}
function heightOf(sd, x, y) {
  if (sd <= 0) return 0;
  let h = smooth(sd / 60) * (0.56 + 0.2 * vnoise(x / 230, y / 230, 7)) + smooth((sd - 70) / 260) * 0.55 * vnoise(x / 400 + 9, y / 400 + 3, 8);
  const e = Math.min(x, W - x, y, W - y);
  if (e < 140) h = lerp(WORLD.skirtY, h, Math.max(0, e) / 140);
  return h;
}
function hAt(x, z) {          // terrain height in metres at world metres
  const N = WORLD.N, fx = x / WM * N, fz = z / WM * N;
  if (fx <= 0 || fz <= 0 || fx >= N || fz >= N) return WORLD.skirtY;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = WORLD.hgt, r = N + 1;
  return (H[j * r + i] * (1 - u) + H[j * r + i + 1] * u) * (1 - v) + (H[(j + 1) * r + i] * (1 - u) + H[(j + 1) * r + i + 1] * u) * v;
}

/* ---------- painting (canvas 2D in sim units) ---------- */
function traceWalk(g, grow) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const c of MAP.corridors) { g.lineWidth = c.w + grow * 2; g.beginPath(); c.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  for (const c of MAP.circles) { g.beginPath(); g.arc(c.x, c.y, c.r + grow, 0, TAU); g.fill(); }
}
function clipBounds(g, grow) { const b0 = MAP.bounds[0] - grow, b1 = MAP.bounds[1] + grow; g.beginPath(); g.rect(b0, b0, b1 - b0, b1 - b0); g.clip(); }
function strokePoly(g, pts, w, col, dash) {
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []);
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.setLineDash([]);
}
function paintFloor(g) {
  g.fillStyle = PAL.floor; g.fillRect(0, 0, W, W);
  const D = 150, n = Math.ceil(W / D) + 1;
  for (let gy = -1; gy <= n; gy++) for (let gx = -1; gx <= n; gx++) for (let k = 0; k < 2; k++) {
    const px = (gx + hash2(gx, gy, 1 + k)) * D, py = (gy + hash2(gx, gy, 5 + k)) * D, r = 60 + hash2(gx, gy, 9 + k) * 90, v = hash2(gx, gy, 13 + k);
    g.fillStyle = v > 0.5 ? 'rgba(160,220,110,0.16)' : 'rgba(20,70,40,0.17)'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
  }
  // grass tufts, pebbles and flowers
  for (let gy = 0; gy <= n; gy++) for (let gx = 0; gx <= n; gx++) for (let k = 0; k < 4; k++) {
    const px = (gx + hash2(gx, gy, 20 + k)) * D, py = (gy + hash2(gx, gy, 30 + k)) * D, v = hash2(gx, gy, 40 + k);
    if (v < 0.55) { g.strokeStyle = v < 0.3 ? 'rgba(190,240,140,0.55)' : 'rgba(30,90,50,0.5)'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(px - 8, py); g.lineTo(px - 12, py - 15); g.moveTo(px, py); g.lineTo(px, py - 20); g.moveTo(px + 8, py); g.lineTo(px + 12, py - 14); g.stroke(); }
    else if (v < 0.8) { g.fillStyle = 'rgba(40,50,45,0.35)'; g.beginPath(); g.ellipse(px, py, 6 + v * 6, 4 + v * 4, v * 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(210,215,200,0.35)'; g.beginPath(); g.ellipse(px - 1, py - 2, 4 + v * 3, 2 + v * 2, v * 6, 0, TAU); g.fill(); }
    else { g.fillStyle = v > 0.93 ? 'rgba(255,236,150,0.9)' : v > 0.86 ? 'rgba(255,170,190,0.85)' : 'rgba(215,190,255,0.85)'; for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(px + (q - 1) * 9, py + ((q * 7) % 5) * 2 - 4, 3.6, 0, TAU); g.fill(); } }
  }
  // jungle paths: packed earth
  for (const c of MAP.corridors) if (c.kind === 'path') { strokePoly(g, c.pts, c.w - 70, rgba(PAL.path, 0.5)); strokePoly(g, c.pts, c.w - 130, rgba('#b9ad7c', 0.5)); strokePoly(g, c.pts, c.w - 150, 'rgba(90,80,50,0.18)', [18, 60]); }
  // camps
  for (const c of MAP.circles) if (c.kind === 'camp') {
    const gr = g.createRadialGradient(c.x, c.y, c.r * 0.25, c.x, c.y, c.r); gr.addColorStop(0, PAL.camp); gr.addColorStop(0.7, rgba(PAL.camp, 0.92)); gr.addColorStop(1, rgba(PAL.camp, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, c.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,55,40,0.4)'; g.lineWidth = 7; g.setLineDash([26, 20]); g.beginPath(); g.arc(c.x, c.y, c.r * 0.6, 0, TAU); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,240,200,0.22)'; g.lineWidth = 4; g.beginPath(); g.arc(c.x, c.y, c.r * 0.42, 0, TAU); g.stroke();
  }
  // lanes: stone road with paving seams
  const lanes = MAP.corridors.filter(c => c.kind === 'lane');
  for (const c of lanes) strokePoly(g, c.pts, c.w - 26, PAL.laneEdge);
  for (const c of lanes) strokePoly(g, c.pts, c.w - 66, PAL.lane);
  for (const c of lanes) { strokePoly(g, c.pts, c.w - 180, PAL.lane2); strokePoly(g, c.pts, c.w - 70, 'rgba(110,88,54,0.22)', [9, 87]); strokePoly(g, c.pts, c.w - 200, 'rgba(255,246,214,0.18)', [44, 52]); strokePoly(g, c.pts, 40, 'rgba(120,96,60,0.13)', [60, 36]); }
  // river bed (the animated water sits on top), with fords where lanes cross
  for (const c of MAP.corridors) if (c.kind === 'river') { strokePoly(g, c.pts, c.w - 16, PAL.river); strokePoly(g, c.pts, c.w - 110, rgba(PAL.river2, 0.85)); strokePoly(g, c.pts, c.w - 230, 'rgba(190,240,245,0.20)', [70, 130]); }
  for (const c of MAP.circles) if (c.kind === 'pit') {
    const gr = g.createRadialGradient(c.x, c.y, 20, c.x, c.y, c.r - 10); gr.addColorStop(0, '#164d68'); gr.addColorStop(0.75, PAL.pit); gr.addColorStop(1, PAL.river);
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, c.r - 10, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(170,235,245,0.4)'; g.lineWidth = 7; g.setLineDash([34, 24]); g.beginPath(); g.arc(c.x, c.y, c.r - 70, 0, TAU); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(170,235,245,0.22)'; g.lineWidth = 4; g.beginPath(); g.arc(c.x, c.y, c.r - 150, 0, TAU); g.stroke();
  }
  g.globalAlpha = 0.42; for (const c of lanes) strokePoly(g, c.pts, c.w - 110, PAL.lane2); g.globalAlpha = 1;
  // bases
  for (const c of MAP.circles) if (c.kind === 'base') {
    const tc = teamHex(c.team);
    g.fillStyle = PAL.stone; g.beginPath(); g.arc(c.x, c.y, c.r - 12, 0, TAU); g.fill();
    g.fillStyle = PAL.stone2; g.beginPath(); g.arc(c.x, c.y, c.r - 92, 0, TAU); g.fill();
    g.strokeStyle = rgba(tc, 0.75); g.lineWidth = 12; g.beginPath(); g.arc(c.x, c.y, c.r - 58, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(40,48,58,0.3)'; g.lineWidth = 4;
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; g.beginPath(); g.moveTo(c.x + Math.cos(a) * 200, c.y + Math.sin(a) * 200); g.lineTo(c.x + Math.cos(a) * (c.r - 96), c.y + Math.sin(a) * (c.r - 96)); g.stroke(); }
    for (const rr of [300, 410]) { g.beginPath(); g.arc(c.x, c.y, rr, 0, TAU); g.stroke(); }
    const cr = MAP.crystal[c.team], sp = MAP.spawn[c.team];
    g.fillStyle = '#b9c2cb'; g.beginPath(); g.arc(cr.x, cr.y, 200, 0, TAU); g.fill();
    g.strokeStyle = rgba(tc, 0.95); g.lineWidth = 10; g.beginPath(); g.arc(cr.x, cr.y, 160, 0, TAU); g.stroke();
    g.strokeStyle = rgba(tc, 0.5); g.lineWidth = 5; g.setLineDash([22, 16]); g.beginPath(); g.arc(cr.x, cr.y, 128, 0, TAU); g.stroke(); g.setLineDash([]);
    const gr = g.createRadialGradient(sp.x, sp.y, 30, sp.x, sp.y, 250); gr.addColorStop(0, rgba(shade(tc, 0.55), 0.95)); gr.addColorStop(0.8, rgba(tc, 0.7)); gr.addColorStop(1, rgba(tc, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(sp.x, sp.y, 250, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 6; g.setLineDash([28, 18]); g.beginPath(); g.arc(sp.x, sp.y, 205, 0, TAU); g.stroke(); g.setLineDash([]);
  }
  // turret plinths
  for (const t of MAP.turrets) {
    g.fillStyle = 'rgba(70,74,82,0.55)'; g.beginPath(); g.arc(t.x, t.y, 118, 0, TAU); g.fill();
    g.fillStyle = '#a7aeb7'; g.beginPath(); g.arc(t.x, t.y, 104, 0, TAU); g.fill();
    g.strokeStyle = rgba(teamHex(t.team), 0.8); g.lineWidth = 8; g.beginPath(); g.arc(t.x, t.y, 86, 0, TAU); g.stroke();
  }
  // shade under the tall grass
  for (const b of MAP.bushes) { const gr = g.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r + 26); gr.addColorStop(0, 'rgba(20,62,34,0.85)'); gr.addColorStop(0.8, 'rgba(24,70,38,0.6)'); gr.addColorStop(1, 'rgba(24,70,38,0)'); g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r + 26, 0, TAU); g.fill(); }
}
function paintPlateau(g) {
  g.fillStyle = PAL.top; g.fillRect(0, 0, W, W);
  const D = 130, n = Math.ceil(W / D) + 1;
  for (let gy = -1; gy <= n; gy++) for (let gx = -1; gx <= n; gx++) for (let k = 0; k < 3; k++) {
    const px = (gx + hash2(gx, gy, 50 + k)) * D, py = (gy + hash2(gx, gy, 60 + k)) * D, r = 40 + hash2(gx, gy, 70 + k) * 60, v = hash2(gx, gy, 80 + k);
    g.fillStyle = v < 0.4 ? rgba(PAL.top2, 0.55) : v < 0.75 ? rgba(PAL.top3, 0.6) : 'rgba(120,170,90,0.25)';
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
  }
}
function paintWorld(size) {
  const k = size / W;
  const mk = (s) => { const c = document.createElement('canvas'); c.width = c.height = s || size; const g = c.getContext('2d'); g.setTransform((s || size) / W, 0, 0, (s || size) / W, 0, 0); return [c, g]; };
  // walkable mask
  const [mc, mg] = mk(); mg.save(); clipBounds(mg, 0); mg.fillStyle = '#fff'; mg.strokeStyle = '#fff'; traceWalk(mg, 0); mg.restore();
  // floor art, soft contact shadow from the walls, cut to the walkable shape
  const [fc, fg] = mk(); paintFloor(fg);
  const [ic, ig] = mk(); ig.fillStyle = '#000'; ig.fillRect(0, 0, W, W); ig.setTransform(1, 0, 0, 1, 0, 0); ig.globalCompositeOperation = 'destination-out'; ig.drawImage(mc, 0, 0);
  fg.setTransform(1, 0, 0, 1, 0, 0);
  fg.shadowColor = 'rgba(6,24,16,0.85)'; fg.shadowBlur = 22 * size / 2048; fg.shadowOffsetX = size * 2; fg.drawImage(ic, -size * 2, 0);
  fg.shadowBlur = 7 * size / 2048; fg.drawImage(ic, -size * 2, 0);
  fg.shadowColor = 'transparent'; fg.shadowOffsetX = 0;
  fg.globalCompositeOperation = 'destination-in'; fg.drawImage(mc, 0, 0); fg.globalCompositeOperation = 'source-over';
  // plateau and cliff bands underneath
  const [bc, bg] = mk(); paintPlateau(bg);
  const band = (grow, col) => { bg.save(); clipBounds(bg, grow); bg.fillStyle = col; bg.strokeStyle = col; traceWalk(bg, grow); bg.restore(); };
  band(80, 'rgba(20,50,30,0.5)'); band(68, PAL.rockHi); band(56, PAL.rock); band(18, PAL.rockLo);
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.drawImage(fc, 0, 0);
  // detail-blend mask: red = stone-like surfaces
  const ms = 512, [kc, kg] = mk(ms);
  kg.fillStyle = '#000'; kg.fillRect(0, 0, W, W);
  kg.save(); clipBounds(kg, 64); kg.fillStyle = '#fff'; kg.strokeStyle = '#fff'; traceWalk(kg, 64); kg.restore();
  kg.save(); clipBounds(kg, 0); kg.fillStyle = '#000'; kg.strokeStyle = '#000'; traceWalk(kg, 0); kg.restore();
  for (const c of MAP.corridors) if (c.kind === 'path') strokePoly(kg, c.pts, c.w - 90, '#555');
  for (const c of MAP.circles) if (c.kind === 'camp') { kg.fillStyle = '#666'; kg.beginPath(); kg.arc(c.x, c.y, c.r * 0.8, 0, TAU); kg.fill(); }
  for (const c of MAP.corridors) if (c.kind === 'lane') strokePoly(kg, c.pts, c.w - 40, '#fff');
  for (const c of MAP.corridors) if (c.kind === 'river') strokePoly(kg, c.pts, c.w - 30, '#444');
  for (const c of MAP.circles) if (c.kind === 'base') { kg.fillStyle = '#fff'; kg.beginPath(); kg.arc(c.x, c.y, c.r - 14, 0, TAU); kg.fill(); }
  for (const t of MAP.turrets) { kg.fillStyle = '#fff'; kg.beginPath(); kg.arc(t.x, t.y, 110, 0, TAU); kg.fill(); }
  mc.width = mc.height = fc.width = fc.height = ic.width = ic.height = 1;       // release the scratch canvases
  return { color: bc, mask: kc, k };
}
function detailTex(kind) {
  const S = 256;
  const t = canvasTex(S, S, (g) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    const wrap = (fn) => { for (const ox of [0, -S]) for (const oy of [0, -S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
    if (kind === 'grass') {
      for (let i = 0; i < 900; i++) {
        const x = hash2(i, 1, 3) * S, y = hash2(i, 2, 3) * S, l = 5 + hash2(i, 3, 3) * 9, a = -1.57 + (hash2(i, 4, 3) - .5) * 1.3, v = hash2(i, 5, 3);
        wrap(() => { g.strokeStyle = v > 0.5 ? `rgba(255,255,255,${0.10 + v * 0.16})` : `rgba(0,0,0,${0.10 + v * 0.22})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
      }
      for (let i = 0; i < 70; i++) { const x = hash2(i, 6, 3) * S, y = hash2(i, 7, 3) * S, r = 8 + hash2(i, 8, 3) * 22, v = hash2(i, 9, 3); wrap(() => { g.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
    } else {
      g.fillStyle = '#626262'; g.fillRect(0, 0, S, S);
      const n = 6, c = S / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const off = (j % 2) * c * 0.5, x = i * c + off + (hash2(i, j, 11) - .5) * 7, y = j * c + (hash2(i, j, 12) - .5) * 7, w = c - 5 - hash2(i, j, 13) * 4, h = c - 5 - hash2(i, j, 14) * 4, v = 0.44 + hash2(i, j, 15) * 0.18;
        wrap(() => { const q = Math.round(v * 255); g.fillStyle = `rgb(${q},${q},${q})`; const r = 7; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 4, y + 3, w - 8, 3); });
        wrap(() => { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x + 4, y + h - 5, w - 8, 3); });
      }
      for (let i = 0; i < 260; i++) { const x = hash2(i, 16, 3) * S, y = hash2(i, 17, 3) * S, v = hash2(i, 18, 3); g.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'; g.fillRect(x, y, 2, 2); }
    }
  }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, anisotropy: GX.maxAniso });
  return t;
}

/* ---------- terrain mesh ---------- */
function buildTerrain(texSize) {
  const N = WORLD.N, cell = W / N, R = N + 1, H = WORLD.hgt = new Float32Array(R * R);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = i * cell, y = j * cell; H[j * R + i] = heightOf(sdWalk(x, y), x, y); }
  const art = paintWorld(texSize);
  const tex = WORLD.gtex = new THREE.CanvasTexture(art.color); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = GX.maxAniso;
  const mtex = new THREE.CanvasTexture(art.mask), dA = detailTex('grass'), dB = detailTex('stone');
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDetA = { value: dA }; sh.uniforms.uDetB = { value: dB }; sh.uniforms.uMask = { value: mtex };
    sh.fragmentShader = 'uniform sampler2D uDetA, uDetB, uMask;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `vec4 texelColor = mapTexelToLinear(texture2D(map, vUv));
       float dm = texture2D(uMask, vUv).r;
       vec3 det = mix(texture2D(uDetA, vUv * 58.0).rgb, texture2D(uDetB, vUv * 27.0).rgb, dm);
       diffuseColor.rgb *= texelColor.rgb * (0.5 + det);`);
  };
  const CH = 8, per = N / CH, cm = cell * S3;
  for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
    const n1 = per + 1, pos = new Float32Array(n1 * n1 * 3), nor = new Float32Array(n1 * n1 * 3), uv = new Float32Array(n1 * n1 * 2), idx = [];
    for (let j = 0; j <= per; j++) for (let i = 0; i <= per; i++) {
      const gi = ci * per + i, gj = cj * per + j, o = j * n1 + i, h = H[gj * R + gi];
      pos[o * 3] = gi * cm; pos[o * 3 + 1] = h; pos[o * 3 + 2] = gj * cm;
      const hl = H[gj * R + Math.max(0, gi - 1)], hr = H[gj * R + Math.min(N, gi + 1)], hu = H[Math.max(0, gj - 1) * R + gi], hd = H[Math.min(N, gj + 1) * R + gi];
      let nx = (hl - hr) / (2 * cm), nz = (hu - hd) / (2 * cm), ny = 1; const l = Math.hypot(nx, ny, nz);
      nor[o * 3] = nx / l; nor[o * 3 + 1] = ny / l; nor[o * 3 + 2] = nz / l;
      uv[o * 2] = gi / N; uv[o * 2 + 1] = 1 - gj / N;
      if (i < per && j < per) idx.push(o, o + n1, o + 1, o + 1, o + n1, o + n1 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.matrixAutoUpdate = false; WORLD.group.add(m);
  }
  // forest floor continuing past the map edge
  const sk = new THREE.MeshLambertMaterial({ color: lin(shade(PAL.top, -0.12)) }), E = 16;
  for (const [x0, z0, x1, z1] of [[-E, -E, WM + E, 0], [-E, WM, WM + E, WM + E], [-E, 0, 0, WM], [WM, 0, WM + E, WM]]) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, sk); m.position.set((x0 + x1) / 2, WORLD.skirtY - 0.01, (z0 + z1) / 2); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); WORLD.group.add(m);
  }
}

/* ---------- river ---------- */
function buildWater() {
  const river = MAP.corridors.find(c => c.kind === 'river'), pits = MAP.circles.filter(c => c.kind === 'pit');
  const sd = (x, y) => { let d = polyDist(x, y, river.pts) - river.w / 2 + 34; for (const p of pits) d = Math.min(d, Math.hypot(x - p.x, y - p.y) - p.r + 38); return d; };
  const c = 32, n = W / c, r = n + 1, val = new Float32Array(r * r), map = new Int32Array(r * r).fill(-1), pos = [], edge = [], idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) val[j * r + i] = sd(i * c, j * c);
  const vid = (i, j) => { const o = j * r + i; if (map[o] < 0) { map[o] = pos.length / 3; pos.push(i * c * S3, 0.035, j * c * S3); edge.push(clamp(-val[o] / 70, 0, 1)); } return map[o]; };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (Math.min(val[j * r + i], val[j * r + i + 1], val[(j + 1) * r + i], val[(j + 1) * r + i + 1]) > 0) continue;
    const a = vid(i, j), b = vid(i + 1, j), d = vid(i, j + 1), e = vid(i + 1, j + 1); idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: TIME },
    vertexShader: 'attribute float aEdge; varying float vE; varying vec2 vW; void main(){ vE = aEdge; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `uniform float uTime; varying float vE; varying vec2 vW;
      float wv(vec2 p, float t){ return sin(p.x * 1.9 + t * 1.3) + sin(p.y * 2.3 - t * 1.1) + sin((p.x + p.y) * 1.4 + t * 0.7) + sin((p.x - p.y) * 2.9 - t * 1.7); }
      void main(){
        vec2 fl = vec2(0.22, 0.22) * uTime;
        float a = wv(vW * 1.5 + fl, uTime) * 0.25, b = wv(vW * 3.9 - fl * 1.6, uTime * 1.3) * 0.25, c = a * 0.6 + b * 0.4;
        float ca = 1.0 - smoothstep(0.02, 0.30, abs(c));
        vec3 col = mix(vec3(0.10, 0.42, 0.58), vec3(0.24, 0.70, 0.76), 0.5 + 0.5 * c) + ca * vec3(0.30, 0.36, 0.34);
        float foam = (1.0 - smoothstep(0.0, 0.55, vE)) * (0.55 + 0.45 * sin(vE * 26.0 - uTime * 2.4 + c * 5.0));
        col = mix(col, vec3(0.90, 0.99, 1.0), clamp(foam, 0.0, 1.0) * 0.7);
        gl_FragColor = vec4(col, smoothstep(0.0, 0.3, vE) * 0.56 + clamp(foam, 0.0, 1.0) * 0.22 * step(0.02, vE));
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 1; m.matrixAutoUpdate = false; WORLD.group.add(m); WORLD.water = m;
}

/* ---------- instanced forest ---------- */
function scatter(geos, mat, items, shadow) {
  const CH = 9, E0 = -12, span = WM + 24, B = {};
  for (const it of items) { const k = it.t + ':' + clamp(Math.floor((it.x - E0) / span * CH), 0, CH - 1) + ':' + clamp(Math.floor((it.z - E0) / span * CH), 0, CH - 1); (B[k] || (B[k] = [])).push(it); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  for (const k in B) {
    const arr = B[k], geo = geos[arr[0].t].clone(), im = new THREE.InstancedMesh(geo, mat, arr.length);
    let cx = 0, cz = 0; for (const it of arr) { cx += it.x; cz += it.z; } cx /= arr.length; cz /= arr.length; let rad = 0;
    arr.forEach((it, i) => {
      e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e); m4.compose(p.set(it.x, it.y, it.z), q, s.set(it.s * (it.sx || 1), it.s * (it.sy || 1), it.s * (it.sx || 1)));
      im.setMatrixAt(i, m4); col.copy(lin(it.c)).multiplyScalar(it.b || 1); im.setColorAt(i, col);
      rad = Math.max(rad, Math.hypot(it.x - cx, it.z - cz));
    });
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 1.5, cz), rad + 2.4);
    im.castShadow = !!shadow; im.receiveShadow = true; im.matrixAutoUpdate = false; im.frustumCulled = true; WORLD.group.add(im);
  }
}
function buildForest() {
  const leaf = '#f4fbef', leaf2 = '#d9ead2', bark = '#8a6a48';
  const tA = new PB().cyl(0.04, 0.07, 0.5, bark, { y: 0.25 }, 6)
    .ico(0.3, leaf, { y: 0.66, sh: 0.55 }).ico(0.22, leaf2, { x: 0.17, y: 0.55, z: 0.1, sh: 0.55 }).ico(0.2, leaf2, { x: -0.16, y: 0.58, z: -0.07, sh: 0.55 }).ico(0.17, leaf, { x: 0.02, y: 0.9, z: -0.03, sh: 0.6 }).ico(0.16, leaf2, { x: -0.04, y: 0.6, z: 0.2, sh: 0.55 }).geo();
  const tB = new PB().cyl(0.035, 0.06, 0.3, bark, { y: 0.15 }, 6)
    .cone(0.3, 0.42, leaf2, { y: 0.42, sh: 0.5, flat: true }, 7).cone(0.23, 0.38, leaf, { y: 0.67, sh: 0.55, flat: true }, 7).cone(0.15, 0.34, leaf, { y: 0.9, sh: 0.6, flat: true }, 6).geo();
  const tC = new PB().ico(0.3, leaf2, { y: 0.2, sy: 0.75, sh: 0.5 }).ico(0.22, leaf, { x: 0.2, y: 0.17, z: 0.12, sy: 0.8, sh: 0.5 }).ico(0.2, leaf, { x: -0.17, y: 0.16, z: -0.1, sy: 0.8, sh: 0.5 }).geo();
  const rk = new PB().dod(0.3, '#ffffff', { y: 0.12, sy: 0.7, sh: 0.6 }).dod(0.17, '#e9e9e9', { x: 0.24, y: 0.07, z: 0.1, sy: 0.7, sh: 0.6 }).geo();
  const trees = [], rocks = [], E0 = -11, E1 = WM + 11, step = 1.3;
  const blueG = ['#3fa257', '#2f9468', '#4bb061', '#2c8a72'], redG = ['#86ad42', '#a2b548', '#d98c3c', '#c4623c', '#e3bd4e', '#7ba03e'];
  for (let gz = 0; E0 + gz * step < E1; gz++) for (let gx = 0; E0 + gx * step < E1; gx++) {
    const x = E0 + (gx + 0.15 + 0.7 * hash2(gx, gz, 21)) * step, z = E0 + (gz + 0.15 + 0.7 * hash2(gx, gz, 22)) * step, sx = x / S3, sy = z / S3;
    const inside = sx > 0 && sy > 0 && sx < W && sy < W, sd = inside ? sdWalk(sx, sy) : 500;
    if (sd < 64) continue;
    if (!inside && hash2(gx, gz, 27) < 0.5) continue;
    let dN = 6; for (let d = 0.3; d < 6; d += 0.3) { const yy = sy - d / S3; if (yy > 0 && yy < W && sx > 0 && sx < W && sdWalk(sx, yy) < 0) { dN = d; break; } }
    const out = Math.max(-x, x - WM, z - WM, 0), y = hAt(x, z), cap = Math.min(dN * 1.3 - 0.2 - y, inside || z < 0 ? 9 : 0.5 + out * 0.85), v = hash2(gx, gz, 23), v2 = hash2(gx, gz, 24), v3 = hash2(gx, gz, 25);
    const side = smooth(((x - z) / WM + 0.28) / 0.56), fam = hash2(gx, gz, 26) < side ? redG : blueG, c = fam[Math.floor(v3 * fam.length) % fam.length], b = 0.82 + v2 * 0.3;
    if (v < 0.09 || (sd < 95 && v < 0.2)) { rocks.push({ t: 'rk', x, y: y - 0.03, z, ry: v2 * TAU, s: 0.7 + v3 * 1.3, sy: 0.7 + v2 * 0.6, c: v3 > 0.5 ? '#9a917f' : '#7f786c', b }); continue; }
    if (cap < 0.5) { if (v > 0.55) trees.push({ t: 'tC', x, y, z, ry: v2 * TAU, s: 0.7 + v3 * 0.5, c, b }); continue; }
    const want = inside ? 1.15 + v2 * 1.25 : 3.0 + v2 * 2.4, h = Math.min(cap, want);
    if (h < 1.05) { trees.push({ t: 'tC', x, y, z, ry: v2 * TAU, s: 0.9 + h * 0.8, c, b }); continue; }
    trees.push({ t: v > 0.62 ? 'tB' : 'tA', x, y: y - 0.04, z, ry: v2 * TAU, s: h, sx: (0.85 + v3 * 0.35) * (inside ? 1 : 1.35), c, b });
  }
  const tm = new THREE.MeshLambertMaterial({ vertexColors: true }); tm.onBeforeCompile = swayInject(0.035, 0.3);
  scatter({ tA, tB, tC }, tm, trees, true);
  scatter({ rk }, GX.mat.vcFlat, rocks, true);
}

/* ---------- hideable tall grass ---------- */
function buildBushes() {
  GX.mat.grass = new THREE.MeshLambertMaterial({ vertexColors: true }); GX.mat.grass.onBeforeCompile = swayInject(0.11, 0.0);       // the grass never changes: whoever stands in it does (heroBush)
  MAP.bushes.forEach((b, bi) => {
    const pb = new PB(), n = Math.round(52 + b.r * 0.2), R = b.r * S3;
    for (let i = 0; i < n; i++) {
      const a = hash2(bi, i, 5) * TAU, d = Math.sqrt(hash2(bi, i, 6)) * R * 0.97, h = 0.55 + hash2(bi, i, 7) * 0.45, v = hash2(bi, i, 8);
      pb.cone(0.085 + v * 0.05, h, v > 0.6 ? '#2f8a45' : '#2a7a40', { x: Math.cos(a) * d, y: h / 2, z: Math.sin(a) * d, rx: (hash2(bi, i, 9) - .5) * 0.4, rz: (hash2(bi, i, 10) - .5) * 0.4, ry: v * 3, c2: v > 0.5 ? '#a6e070' : '#86cf62', sh: 0.75, flat: true }, 4);
    }
    const m = pb.mesh(GX.mat.grass, false); m.position.set(b.x * S3, 0, b.y * S3); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); WORLD.group.add(m); WORLD.bushes[bi] = m;
  });
}

/* ---------- base decor: fountains and obelisks ---------- */
function buildDecor() {
  const ob = new PB().box(0.5, 0.16, 0.5, '#7b838c', { y: 0.08 }).cyl(0.13, 0.2, 1.7, '#9aa3ad', { y: 1.0, c2: '#c3cad2' }, 4).box(0.36, 0.1, 0.36, '#6c747d', { y: 1.88 }).geo();
  const SG = WORLD.sideG = new THREE.Group(); WORLD.group.add(SG);       // everything here wears a team's colour (see worldSide)
  for (const T of [BLUE, RED]) {
    const hex = teamHex(T), base = MAP.circles.find(c => c.kind === 'base' && c.team === T), sp = MAP.spawn[T];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU, x = base.x + Math.cos(a) * 668, y = base.y + Math.sin(a) * 668;
      if (x < 0 || y < 0 || x > W || y > W || sdWalk(x, y) < 50) continue;
      const m = new THREE.Mesh(ob, GX.mat.vc); m.position.set(x * S3, hAt(x * S3, y * S3) - 0.05, y * S3); m.rotation.y = a; m.castShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); SG.add(m);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), glowMat(shade(hex, 0.25))); cr.position.set(m.position.x, m.position.y + 2.25, m.position.z); cr.scale.y = 1.7; cr.matrixAutoUpdate = false; cr.updateMatrix(); SG.add(cr);
      const h = halo(hex, 1.5, 0.55); h.position.copy(cr.position); SG.add(h);
    }
    // fountain: glowing ring and a soft column of light
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.2, 48), fxMat(hex, 0.3)); ring.rotation.x = -Math.PI / 2; ring.position.set(sp.x * S3, 0.05, sp.y * S3); SG.add(ring);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.4, 28, 1, true), fxMat(hex, 0.12, { map: GX.tex.pillar })); col.position.set(sp.x * S3, 1.7, sp.y * S3); SG.add(col);
  }
}
function buildProps() {
  // lanterns along the lanes, glowing shard clusters around the two river pits
  const posts = new PB(), glow = new PB();
  for (const lane of LANE_NAMES) {
    const path = LANE_PATH[BLUE][lane], hw = MAP.corridors.find(c => c.pts === MAP.lanes[lane]).w / 2; let side = 1;
    for (let s = 520; s < path.len - 520; s += 610) {
      const p = pointAlong(path, s), q = pointAlong(path, s + 20), nx = -(q.y - p.y) / 20, ny = (q.x - p.x) / 20; side = -side;
      const x = p.x + nx * side * (hw + 54), y = p.y + ny * side * (hw + 54);
      if (sdWalk(x, y) < 38 || MAP.turrets.some(t => hyp(t.x - x, t.y - y) < 340)) continue;
      const X = x * S3, Z = y * S3, Y = hAt(X, Z);
      posts.cyl(0.04, 0.06, 1.15, '#3d444b', { x: X, y: Y + 0.55, z: Z }, 5).box(0.22, 0.05, 0.22, '#3d444b', { x: X, y: Y + 1.14, z: Z }).cone(0.16, 0.16, '#2c3238', { x: X, y: Y + 1.52, z: Z, flat: true }, 4);
      glow.oct(0.1, '#ffe7ad', { x: X, y: Y + 1.31, z: Z, sy: 1.3, sh: 0.85 });
      const h = halo('#ffc866', 1.5, 0.5); h.position.set(X, Y + 1.31, Z); WORLD.group.add(h);
    }
  }
  for (const [pit, hex] of [[MAP.turtle, '#8fe6d6'], [MAP.lord, '#c58aff']]) for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + 0.2, x = pit.x + Math.cos(a) * 470, y = pit.y + Math.sin(a) * 470;
    if (sdWalk(x, y) < 55) continue;
    const X = x * S3, Z = y * S3, Y = hAt(X, Z) - 0.05, k = 0.8 + hash2(i, 3, 91) * 0.6;
    glow.oct(0.16 * k, shade(hex, -0.25), { x: X, y: Y + 0.3 * k, z: Z, sy: 2.4, rz: 0.15, c2: shade(hex, 0.45), sh: 0.7 }).oct(0.11 * k, shade(hex, -0.3), { x: X + 0.2, y: Y + 0.18 * k, z: Z + 0.08, sy: 2.0, rz: -0.5, c2: shade(hex, 0.3), sh: 0.7 }).oct(0.09 * k, shade(hex, -0.3), { x: X - 0.17, y: Y + 0.15 * k, z: Z - 0.1, sy: 2.0, rz: 0.6, c2: shade(hex, 0.3), sh: 0.7 });
    const h = halo(hex, 1.6 * k, 0.4); h.position.set(X, Y + 0.4, Z); WORLD.group.add(h);
  }
  const pm = posts.mesh(GX.mat.vc); pm.matrixAutoUpdate = false; WORLD.group.add(pm);
  const gm = new THREE.Mesh(glow.geo(), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); gm.matrixAutoUpdate = false; WORLD.group.add(gm);
}
function buildWorld(texSize) {
  WORLD.group = new THREE.Group(); GX.scene.add(WORLD.group);
  buildTerrain(texSize); buildWater(); buildForest(); buildBushes(); buildDecor(); buildProps();
}
