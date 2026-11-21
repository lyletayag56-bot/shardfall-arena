/* ============================================================
   3D models: baked low-poly rigs for heroes, minions, monsters
   and structures, and their procedural animation.
   Models face +Z; the right hand is at -X.
   ============================================================ */
const TPL = { hero: {}, unit: {} };
const HP2 = Math.PI / 2;

function mkRig(b) {
  const R = { pb: {}, b, B: {} }, nb = (n, x, y, z, p) => (R.B[n] = bone(n, x, y, z, p));
  R.root = new THREE.Group();
  nb('body', 0, 0, 0, R.root); nb('hips', 0, 0.78, 0, R.B.body); nb('spine', 0, 0.05, 0, R.B.hips); nb('head', 0, 0.51, 0, R.B.spine);
  const sx = 0.235 * b + 0.035;
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    nb('arm' + s, k * sx, 0.46, 0, R.B.spine); nb('fore' + s, 0, -0.27, 0, R.B['arm' + s]); nb('hand' + s, 0, -0.27, 0, R.B['fore' + s]);
    nb('wpn' + s, 0, 0, 0, R.B['hand' + s]).rotation.x = HP2;
    nb('leg' + s, k * 0.115 * b, 0, 0, R.B.hips); nb('shin' + s, 0, -0.36, 0, R.B['leg' + s]);
  }
  nb('cape', 0, 0.47, -0.125 * b - 0.02, R.B.spine);
  R.nb = nb; R.P = n => R.pb[n] || (R.pb[n] = new PB());
  return R;
}
function finishRig(R) {
  for (const k in R.pb) if (!R.pb[k].empty) { const m = R.pb[k].mesh(GX.mat.vc); m.userData.cm = 1; R.B[k].add(m); }
  return R.root;
}
function glowPart(R, boneName, geo, hex, x, y, z, haloSize) {
  const m = new THREE.Mesh(geo, glowMat(hex)); m.position.set(x || 0, y || 0, z || 0); R.B[boneName].add(m);
  if (haloSize) { const h = halo(hex, haloSize, 0.7); h.position.copy(m.position); R.B[boneName].add(h); }
  return m;
}
function baseBody(R, o) {
  const b = R.b, T = R.P('spine'), Hp = R.P('hips'), Hd = R.P('head');
  const X = R.look || {}, body = o.body, skin = o.skin, pants = X.pants || o.pants || shade(body, -0.45), boot = X.boot || o.boot || '#2b2622';
  Hp.sph(0.17 * b, pants, { sy: 0.72, sz: 0.82 });
  T.cyl(0.215 * b, 0.165 * b, 0.47, body, { y: 0.245, sz: 0.74, c2: o.body2 || shade(body, 0.14), sh: 0.75 }, 10);
  T.sph(0.215 * b, o.body2 || shade(body, 0.14), { y: 0.46, sy: 0.42, sz: 0.74, sh: 0.9 }, 10, 6);
  T.cyl(0.177 * b, 0.177 * b, 0.075, o.trim, { y: 0.03, sz: 0.8 }, 10);
  T.cyl(0.085, 0.1, 0.12, skin, { y: 0.53 }, 8);
  Hd.sph(0.27, skin, { y: 0.3, sy: 0.96, sh: 0.86 }, 14, 10);
  R.B.head.scale.setScalar(1.08);
  if (!o.noEyes) for (const k of [-1, 1]) Hd.sph(0.042, '#1b1b22', { x: k * 0.1, y: 0.31, z: 0.238, sy: 1.3, sz: 0.5, sh: 1 }, 6, 5);
  const sl = o.sleeve || body, fo = o.fore || sl, gl = o.glove || skin;
  for (const s of ['L', 'R']) {
    R.P('arm' + s).sph(0.1 * b, sl, { sh: 0.85 }, 8, 6).cyl(0.078 * b, 0.068 * b, 0.27, sl, { y: -0.135 }, 8);
    R.P('fore' + s).cyl(0.068 * b, 0.06 * b, 0.25, fo, { y: -0.125 }, 8).sph(0.078 * b, gl, { y: -0.29, sh: 0.85 }, 8, 6);
    R.P('leg' + s).cyl(0.118 * b, 0.1 * b, 0.36, pants, { y: -0.18 }, 8);
    R.P('shin' + s).cyl(0.1 * b, 0.09 * b, 0.33, boot, { y: -0.165 }, 8).box(0.19 * b, 0.11, 0.31, boot, { y: -0.365, z: 0.055, sh: 0.9 });
  }
  if (o.robe) { Hp.cyl(0.185 * b, 0.31 * b, o.robe, body, { y: -o.robe / 2 + 0.03, sz: 0.86, c2: shade(body, 0.12), sh: 0.68 }, 12); Hp.cyl(0.315 * b, 0.322 * b, 0.05, o.trim, { y: -o.robe + 0.045, sz: 0.86 }, 12); }
}
function hairCap(H, c, th, tilt) { H.dome(0.29, c, { y: 0.3, rx: tilt == null ? -0.3 : tilt, sh: 0.82 }, th || Math.PI * 0.55); }
function bowGeo(P, wood, tip, half) {
  P.cyl(0.03, 0.03, 0.2, '#33261a', {}, 6);
  for (const k of [-1, 1]) {
    P.box(0.04, half * 0.54, 0.032, wood, { y: k * half * 0.34, z: 0.02, rx: -k * 0.22 });
    P.box(0.034, half * 0.5, 0.028, wood, { y: k * half * 0.8, z: -0.09, rx: -k * 0.62 });
    P.sph(0.034, tip, { y: k * half * 1.02, z: -0.21 }, 6, 5);
  }
  P.box(0.01, half * 2.04, 0.01, '#f1ead8', { z: -0.21 });
}
/* Cloth. Anything that hangs (cape, sash ends, scarf, streamers) is cut across a chain of up to three bones, root, root1, root2,
   each a hinge at the top of its piece, so it can bend and trail; clothStep() swings the hinges. */
const CLOTH_N = 3, _gc = new THREE.Color();
function gradHex(c, c2, sh, u) { const a = lin(c), b = lin(c2), k = sh + (1 - sh) * u; _gc.setRGB((a.r + (b.r - a.r) * u) * k, (a.g + (b.g - a.g) * u) * k, (a.b + (b.b - a.b) * u) * k).convertLinearToSRGB(); return '#' + _gc.getHexString(); }
function chainOf(R, root, len) {       // the hinge spacing of a chain; the first strip hung on it decides
  const ch = R.ch || (R.ch = {}), seg = ch[root] || (ch[root] = len / CLOTH_N);
  for (let i = 1; i < CLOTH_N; i++) if (!R.B[root + i]) R.nb(root + i, 0, -seg, 0, R.B[i > 1 ? root + (i - 1) : root]);
  return seg;
}
/* a strip `len` long hanging from the root bone (o.y0: starting that far below it; o.x, o.rz: offset and slant; o.c2, o.sh: shading top to bottom) */
function strip(R, root, w, len, d, c, o) {
  o = o || {}; const y00 = o.y0 || 0, seg = chainOf(R, root, y00 + len), c2 = o.c2 || c, sh = o.sh == null ? 1 : o.sh, sn = Math.sin(o.rz || 0);
  for (let i = 0; i < CLOTH_N; i++) {
    const a = Math.max(y00, i * seg), b = i === CLOTH_N - 1 ? y00 + len : Math.min(y00 + len, (i + 1) * seg); if (b - a < 0.004) continue;
    const mid = (a + b) / 2, s0 = a - y00, s1 = b - y00;
    R.P(i ? root + i : root).box(w, b - a + 0.014, d, gradHex(c, c2, sh, 1 - s1 / len), { x: (o.x || 0) + sn * ((s0 + s1) / 2 - len / 2), y: -(mid - i * seg), z: o.z || 0, rz: o.rz || 0, c2: gradHex(c, c2, sh, 1 - s0 / len), sh: 1 });
  }
}
/* the part builder and height to use for something fixed to a chain `y` below its root (a hem, a weight, a tip) */
function onStrip(R, root, y) { const seg = R.ch[root], i = Math.min(CLOTH_N - 1, Math.floor(y / seg + 1e-6)); return [R.P(i ? root + i : root), -(y - i * seg), i ? root + i : root]; }
function capeGeo(R, w, len, c, x) { strip(R, 'cape', w, len, 0.035, c, { x: x || 0, c2: shade(c, 0.28), sh: 0.62 }); }

const HERO_BUILD = {
  bram(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: shade(L.body, 0.1), fore: shade(L.body, -0.25), glove: shade(L.body, -0.35), pants: '#3a4654', boot: '#4a5562' });
    const T = R.P('spine'), H = R.P('head'), lt = shade(L.body, 0.3);
    T.sph(0.2, lt, { y: 0.31, z: 0.085, sx: 1.4, sz: 0.62 }).oct(0.075, L.trim, { y: 0.33, z: 0.215, sz: 0.35 });
    for (const k of [-1, 1]) { T.sph(0.165, lt, { x: k * 0.37, y: 0.5, sy: 0.72 }); T.tor(0.155, 0.024, L.trim, { x: k * 0.37, y: 0.455, rx: HP2 }, 5, 12); }
    R.P('hips').cyl(0.21, 0.26, 0.2, shade(L.body, -0.2), { y: -0.06, sz: 0.82 }, 10);
    H.dome(0.3, lt, { y: 0.3 }, Math.PI * 0.52);
    for (const k of [-1, 1]) H.box(0.05, 0.22, 0.2, lt, { x: k * 0.265, y: 0.2, z: 0.07 });
    H.box(0.05, 0.19, 0.04, lt, { y: 0.34, z: 0.285 }).box(0.055, 0.16, 0.46, L.trim, { y: 0.6, z: -0.03 }).box(0.05, 0.12, 0.34, L.acc || '#d2553f', { y: 0.72, z: -0.08, c2: L.acc ? shade(L.acc, 0.4) : '#f08a5c' });
    capeGeo(R, 0.54, 0.86, L.cape); R.P('cape').box(0.58, 0.07, 0.06, L.trim, { y: -0.02 });
    const Wp = R.P('wpnR'); Wp.cyl(0.03, 0.036, 0.62, '#5a4630', { y: 0.22 }, 6).cyl(0.05, 0.05, 0.05, L.trim, { y: 0.43 }, 6).sph(0.125, L.metal || '#aab2bb', { y: 0.58 }, 8, 6).cone(0.045, 0.13, '#e6ebef', { y: 0.74 }, 5);
    for (let i = 0; i < 6; i++) Wp.cone(0.045, 0.13, '#e6ebef', { x: Math.cos(i * 1.047) * 0.15, y: 0.58, z: Math.sin(i * 1.047) * 0.15, rz: -HP2, ry: -i * 1.047 }, 5);
    R.P('wpnL').box(0.52, 0.07, 0.72, shade(L.body, -0.12), { y: -0.1, z: 0.04, c2: lt }).box(0.58, 0.055, 0.09, L.trim, { y: -0.1, z: 0.4 }).box(0.58, 0.055, 0.09, L.trim, { y: -0.1, z: -0.32 }).box(0.09, 0.055, 0.72, L.trim, { x: 0.26, y: -0.1, z: 0.04 }).box(0.09, 0.055, 0.72, L.trim, { x: -0.26, y: -0.1, z: 0.04 }).sph(0.11, L.trim, { y: -0.16, z: 0.04, sy: 0.6 });
    return { style: 'smash', wl: 0 };
  },
  thorn(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: shade(L.body, 0.08), fore: '#3d4347', glove: '#2e3336', pants: '#33402f', boot: '#3a3d3a' });
    const T = R.P('spine'), H = R.P('head'), iron = L.metal || '#7b858b', bd = L.beard || '#4a3323';
    T.sph(0.21, '#3b3128', { y: 0.5, sx: 1.6, sy: 0.42, sz: 1.05 }).sph(0.19, shade(L.body, 0.22), { y: 0.3, z: 0.08, sx: 1.35, sz: 0.6 }).cyl(0.075, 0.075, 0.03, L.trim, { y: 0.045, z: 0.2, rx: HP2 }, 8);
    for (const k of [-1, 1]) { T.sph(0.155, iron, { x: k * 0.38, y: 0.51, sy: 0.75 }); T.cone(0.055, 0.22, '#efe7d2', { x: k * 0.43, y: 0.64, rz: -k * 0.6 }, 5); }
    R.P('hips').cyl(0.21, 0.26, 0.18, '#3b3128', { y: -0.06, sz: 0.82 }, 10);
    H.dome(0.3, iron, { y: 0.3 }, Math.PI * 0.5).cyl(0.306, 0.306, 0.055, L.trim, { y: 0.3 }, 12).box(0.05, 0.16, 0.04, L.trim, { y: 0.36, z: 0.29 });
    for (const k of [-1, 1]) { H.cone(0.08, 0.26, '#e8e0cc', { x: k * 0.31, y: 0.46, rz: -k * 1.15 }, 6); H.cone(0.052, 0.24, '#f6f0df', { x: k * 0.455, y: 0.61, rz: -k * 0.3 }, 6); }
    H.sph(0.17, bd, { y: 0.12, z: 0.15, sx: 1.1, sy: 1.2, sz: 0.82 }).sph(0.08, bd, { y: -0.1, z: 0.17 }, 6, 5).sph(0.045, L.trim, { y: -0.2, z: 0.17 }, 6, 5).box(0.22, 0.05, 0.06, bd, { y: 0.225, z: 0.25 });
    capeGeo(R, 0.56, 0.8, L.cape);
    const Wp = R.P('wpnR'); Wp.cyl(0.035, 0.04, 0.3, '#4a3a28', { y: 0.05 }, 6);
    for (let i = 0; i < 4; i++) Wp.tor(0.05, 0.016, '#c9d0d5', { y: 0.27 + i * 0.08, ry: i % 2 ? HP2 : 0 }, 4, 8);
    Wp.tor(0.16, 0.04, '#dfe5ea', { y: 0.74, rz: -0.6 }, 5, 12, 4.3).cone(0.055, 0.2, '#f6f8fa', { x: 0.15, y: 0.83, rz: 0.9 }, 5);
    R.P('foreL').sph(0.11, '#3d4347', { y: -0.27 });
    return { style: 'slash' };
  },
  kaela(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: L.skin, glove: '#3a2a2a', pants: '#2c2433', boot: '#3b2c2c' });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    Hp.cyl(0.19, 0.275, 0.25, L.body, { y: -0.1, sz: 0.82, c2: shade(L.body, 0.12) }, 10).cyl(0.278, 0.282, 0.04, L.trim, { y: -0.22, sz: 0.82 }, 10);
    T.box(0.11, 0.36, 0.03, L.trim, { y: 0.27, z: 0.153 }).tor(0.105, 0.024, L.trim, { y: 0.5, rx: HP2 }, 5, 10).sph(0.135, L.trim, { x: -0.31, y: 0.51, sy: 0.7 });
    for (const s of ['L', 'R']) R.P('fore' + s).cyl(0.076, 0.07, 0.13, L.trim, { y: -0.17 }, 8);
    hairCap(H, L.hair, Math.PI * 0.57, -0.32);
    H.sph(0.12, L.hair, { x: 0.04, y: 0.475, z: 0.185, sx: 1.9, sy: 0.5, sz: 0.55, rz: 0.12 });
    for (const k of [-1, 1]) H.sph(0.07, L.hair, { x: k * 0.235, y: 0.22, z: 0.08, sy: 2.1, sz: 0.85 });
    H.sph(0.075, L.acc || '#d2553f', { y: 0.58, z: -0.18 });
    R.nb('pony', 0, 0.56, -0.2, R.B.head);
    R.P('pony').sph(0.115, L.hair, { y: -0.04, z: -0.05 }).sph(0.105, L.hair, { y: -0.2, z: -0.1 }).sph(0.09, L.hair, { y: -0.36, z: -0.12 }).sph(0.065, L.hair, { y: -0.5, z: -0.11 });
    capeGeo(R, 0.34, 0.62, L.cape, 0.08);
    R.P('wpnR').cyl(0.026, 0.026, 0.17, '#3a2a2a', {}, 6).sph(0.04, L.trim, { y: -0.1 }, 6, 5).box(0.3, 0.05, 0.075, L.trim, { y: 0.1 }).box(0.08, 0.76, 0.024, L.blade || '#e9eef2', { y: 0.5, c2: '#ffffff', sh: 0.9 }).cone(0.057, 0.15, '#f7f9fb', { y: 0.955, sz: 0.3, ry: Math.PI / 4 }, 4).box(0.022, 0.6, 0.03, '#aab6c2', { y: 0.45 });
    return { style: 'slash' };
  },
  rook(R, L) {
    baseBody(R, { body: L.body, trim: '#4a3624', skin: L.skin, sleeve: L.skin, fore: L.skin, glove: '#4a3624', pants: '#5a4630', boot: '#3a2d22' });
    const T = R.P('spine'), H = R.P('head'), b = R.b;
    T.box(0.08, 0.6, 0.03, '#3a2a1c', { y: 0.27, z: 0.158 * b, rz: 0.7 }).sph(0.16, '#8d949c', { x: 0.39, y: 0.51, sy: 0.7 }).cone(0.05, 0.16, '#d9d2c4', { x: 0.42, y: 0.64 }, 5);
    R.P('hips').cyl(0.2 * b, 0.275 * b, 0.24, '#6a5238', { y: -0.1, sz: 0.85, c2: '#8a6e4c' }, 10);
    for (const s of ['L', 'R']) { R.P('fore' + s).cyl(0.082 * b, 0.074 * b, 0.15, '#4a3624', { y: -0.15 }, 8); R.P('shin' + s).cyl(0.105 * b, 0.1 * b, 0.08, L.hair, { y: -0.03 }, 8); }
    H.sph(0.175, L.hair, { y: 0.13, z: 0.15, sx: 1.15, sy: 1.1, sz: 0.85 }).cone(0.1, 0.2, L.hair, { y: -0.02, z: 0.17, rx: Math.PI }, 6).box(0.22, 0.055, 0.07, L.hair, { y: 0.225, z: 0.25 });
    for (const k of [-1, 1]) { H.box(0.1, 0.035, 0.05, L.hair, { x: k * 0.1, y: 0.39, z: 0.235, rz: -k * 0.25 }); H.sph(0.055, L.skin, { x: k * 0.27, y: 0.3 }, 6, 5); }
    R.P('wpnR').cyl(0.036, 0.042, 1.12, '#5a4630', { y: 0.3 }, 6).box(0.42, 0.28, 0.28, L.metal || '#8d949c', { y: 0.84, c2: shade(L.metal || '#8d949c', 0.32) }).box(0.07, 0.31, 0.31, L.trim, { x: 0.15, y: 0.84 }).box(0.07, 0.31, 0.31, L.trim, { x: -0.15, y: 0.84 }).cone(0.07, 0.16, '#d9d2c4', { y: 1.06 }, 5);
    return { style: 'smash2' };
  },
  vex(R, L) {
    const belt = L.belt || '#5a4a7a';
    baseBody(R, { body: L.body, trim: belt, skin: L.skin, sleeve: L.body, fore: L.fore || '#272238', glove: L.fore ? shade(L.fore, -0.3) : '#1d1a2b', pants: '#262233', boot: '#1d1a2b', noEyes: true });
    const T = R.P('spine'), H = R.P('head');
    T.oct(0.065, L.trim, { y: 0.33, z: 0.16, sz: 0.4 }).cyl(0.185, 0.185, 0.04, belt, { y: 0.14, sz: 0.8, rz: 0.22 }, 10);
    for (const k of [-1, 1]) T.cone(0.075, 0.22, shade(L.body, 0.28), { x: k * 0.31, y: 0.56, rz: -k * 0.9 }, 5);
    H.dome(0.318, L.cape, { y: 0.31, rx: -0.22 }, Math.PI * 0.64).cone(0.14, 0.34, L.cape, { y: 0.36, z: -0.3, rx: -2.2 }, 6).sph(0.22, '#15131d', { y: 0.24, z: 0.1, sy: 0.62, sz: 0.9 });
    for (const k of [-1, 1]) glowPart(R, 'head', new THREE.SphereGeometry(0.036, 6, 5), L.trim, k * 0.1, 0.335, 0.262, k > 0 ? 0 : 0);
    strip(R, 'cape', 0.12, 0.64, 0.02, shade(L.trim, -0.4), { x: -0.1, rz: 0.12 }); strip(R, 'cape', 0.12, 0.5, 0.02, shade(L.trim, -0.52), { x: 0.1, rz: -0.14 });
    if (L.crescent) for (const s of ['L', 'R']) R.P('wpn' + s).cyl(0.024, 0.024, 0.2, '#1d1a2b', { y: 0.02 }, 6).sph(0.04, L.trim, { y: -0.1 }, 6, 5)       // sickle moons instead of daggers
      .tor(0.25, 0.05, L.blade || '#dcd5ee', { x: 0.2, y: 0.32, sz: 0.3, rz: 1.25, c2: '#ffffff', sh: 0.85 }, 4, 12, Math.PI * 0.95).cone(0.05, 0.16, '#ffffff', { x: 0.45, y: 0.41, rz: -1.9, sz: 0.3 }, 4);
    else for (const s of ['L', 'R']) R.P('wpn' + s).cyl(0.023, 0.023, 0.14, '#1d1a2b', {}, 6).box(0.14, 0.032, 0.05, L.trim, { y: 0.08 }).box(0.066, 0.38, 0.022, L.blade || '#dcd5ee', { y: 0.28, c2: '#ffffff', sh: 0.9 }).cone(0.047, 0.11, '#f1ecff', { y: 0.525, sz: 0.3, ry: Math.PI / 4 }, 4);
    return { style: 'dual', wl: -HP2 };
  },
  tavi(R, L) {       // a desert runner: wrapped head and veiled face, sleeveless tunic, a short cloak off one shoulder, a bladed ring in each hand
    const wrap = L.wrap || '#efe4cc', sash = L.sash || '#c2452d', gold = L.trim, cloak = L.cape, b = R.b, steel = L.blade || '#e9f1f4', lea = '#3a2a1c';
    baseBody(R, { body: L.body, trim: sash, skin: L.skin, sleeve: L.skin, fore: wrap, glove: '#2a2320', pants: L.pants || '#3b3229', boot: L.boot || '#2a2320' });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    T.box(0.07, 0.5, 0.03, lea, { y: 0.28, z: 0.158 * b, rz: -0.72 }).box(0.07, 0.5, 0.03, lea, { y: 0.28, z: -0.158 * b, rz: 0.72 }).oct(0.05, gold, { x: 0.02, y: 0.3, z: 0.178 * b, sz: 0.4 })       // a strap across the chest
      .tor(0.125, 0.03, gold, { y: 0.5, rx: HP2 }, 5, 10)
      .sph(0.175, cloak, { x: 0.3 * b, y: 0.5, sy: 0.62, sz: 0.95, c2: shade(cloak, 0.25), sh: 0.8 }, 8, 6)       // the cloak gathered on the left shoulder
      .sph(0.135, gold, { x: -0.31 * b, y: 0.52, sy: 0.6, c2: shade(gold, 0.4), sh: 0.8 }, 8, 6).cone(0.05, 0.13, gold, { x: -0.36 * b, y: 0.6, rz: 0.5 }, 5);       // a bronze guard on the right
    Hp.cyl(0.19 * b, 0.262 * b, 0.21, L.body, { y: -0.09, sz: 0.84, c2: shade(L.body, 0.16) }, 10).cyl(0.205 * b, 0.205 * b, 0.1, sash, { y: 0.03, sz: 0.82, c2: shade(sash, 0.25) }, 10).sph(0.07, sash, { x: 0.15, y: 0.02, z: 0.1, sy: 0.8 }, 6, 5);
    for (const s of ['L', 'R']) {
      R.P('leg' + s).cyl(0.136 * b, 0.118 * b, 0.3, L.pants || '#3b3229', { y: -0.2 }, 8);       // loose trousers, bound at the shin
      R.P('shin' + s).cyl(0.104 * b, 0.1 * b, 0.05, wrap, { y: -0.03 }, 8).cyl(0.097 * b, 0.094 * b, 0.05, wrap, { y: -0.11 }, 8);
      R.P('arm' + s).cyl(0.088 * b, 0.088 * b, 0.04, gold, { y: -0.12 }, 8);
      R.P('fore' + s).cyl(0.075 * b, 0.075 * b, 0.035, gold, { y: -0.03 }, 8).cyl(0.07 * b, 0.07 * b, 0.03, lea, { y: -0.21 }, 8);
    }
    if (L.comet) {       // the star-runner: a deep hood edged with light over the same veil, eyes alight
      H.dome(0.318, wrap, { y: 0.31, z: -0.02, rx: -0.3, c2: shade(wrap, 0.3), sh: 0.8 }, Math.PI * 0.58).cone(0.2, 0.42, wrap, { y: 0.5, z: -0.27, rx: -1.25, c2: shade(wrap, 0.25) }, 8).tor(0.265, 0.022, gold, { y: 0.4, z: 0.07, rx: 0.42 }, 4, 18, Math.PI).oct(0.05, '#ffffff', { y: 0.585, z: 0.2, sz: 0.5 })
        .sph(0.283, shade(L.body, -0.3), { y: 0.185, z: 0.014, sy: 0.5, c2: shade(L.body, 0.2), sh: 0.85 }, 12, 8);
      for (const k of [-1, 1]) glowPart(R, 'head', new THREE.SphereGeometry(0.036, 8, 6), gold, k * 0.1, 0.315, 0.252, 0.35);
    } else {
      // the head: a wound turban with a jewel, dark brows, a veil from the nose down
      H.dome(0.3, wrap, { y: 0.34, rx: -0.14, c2: shade(wrap, 0.18), sh: 0.8 }, Math.PI * 0.5)
        .tor(0.262, 0.075, wrap, { y: 0.46, rx: HP2 - 0.12, c2: shade(wrap, 0.2), sh: 0.75 }, 6, 14).tor(0.225, 0.07, shade(wrap, -0.1), { y: 0.535, rx: HP2 + 0.16, c2: wrap, sh: 0.75 }, 6, 12).sph(0.15, wrap, { y: 0.6, z: -0.03, sy: 0.6 }, 8, 6)
        .oct(0.052, L.glow || gold, { y: 0.47, z: 0.325, sz: 0.5 }).cone(0.03, 0.12, gold, { y: 0.56, z: 0.31, rx: -0.2 }, 4)
        .sph(0.283, shade(L.body, -0.25), { y: 0.185, z: 0.014, sy: 0.5, c2: shade(L.body, 0.05), sh: 0.85 }, 12, 8);
      for (const k of [-1, 1]) H.box(0.095, 0.026, 0.03, L.hair, { x: k * 0.1, y: 0.372, z: 0.243, rz: -k * 0.22 }).sph(0.05, L.hair, { x: k * 0.255, y: 0.28, z: 0.05, sy: 1.5 }, 6, 5);
      R.nb('wtail', -0.12, 0.44, -0.25, R.B.head);       // the loose end of the turban, down the back
      strip(R, 'wtail', 0.12, 0.5, 0.03, wrap, { c2: shade(wrap, 0.25), sh: 0.7 }); strip(R, 'wtail', 0.1, 0.14, 0.028, shade(wrap, -0.12), { y0: 0.49 });
    }
    R.nb('tails', -0.12, -0.02, -0.14, R.B.hips);       // the sash ends, streaming behind
    strip(R, 'tails', 0.13, 0.52, 0.024, sash, { c2: shade(sash, 0.3), sh: 0.7 }); strip(R, 'tails', 0.1, 0.38, 0.022, shade(sash, -0.2), { x: 0.16, rz: 0.12, c2: sash, sh: 0.75 });
    capeGeo(R, 0.3, 0.52, cloak, 0.12); { const [Q, y] = onStrip(R, 'cape', 0.5); Q.box(0.3, 0.035, 0.04, gold, { x: 0.12, y }); }
    for (const s of ['L', 'R']) {       // ring blades: held by a bar across the middle, three teeth on the rim
      const Wp = R.P('wpn' + s);
      Wp.cyl(0.02, 0.02, 0.4, lea, { y: 0.06 }, 6).tor(0.215, 0.03, steel, { y: 0.06, sz: 0.42, c2: '#ffffff', sh: 0.9 }, 5, 20).tor(0.215, 0.014, gold, { y: 0.06, sz: 0.9 }, 4, 20);
      for (let i = 0; i < 3; i++) { const a = HP2 + i * TAU / 3; Wp.cone(0.05, 0.15, steel, { x: Math.cos(a) * 0.29, y: 0.06 + Math.sin(a) * 0.29, rz: a - HP2, sz: 0.3, c2: '#ffffff' }, 4); }
      if (L.comet) { Wp.oct(0.17, steel, { y: 0.06, sx: 0.22, sz: 0.16, c2: '#ffffff' }).oct(0.17, steel, { y: 0.06, sy: 0.22, sz: 0.16, c2: '#ffffff' }); glowPart(R, 'wpn' + s, new THREE.OctahedronGeometry(0.05, 0), L.acc || gold, 0, 0.06, 0, 0.5); }       // a four-point star set in each ring
    }
    return { style: 'fans' };
  },
  kiri(R, L) {       // a shrine medium with two spirit masks. Whichever she is wearing over her face is the form she is in; the other rides behind her head
    const robe = L.body, red = L.sash || L.trim, hc = L.heron || '#8fe6ff', tc = L.tiger || '#ff8a3c', b = R.b, hair = L.hair, ink = '#1b1b22', paper = '#fbfaf5';
    baseBody(R, { body: robe, trim: red, skin: L.skin, sleeve: robe, fore: L.skin, glove: L.skin, pants: L.pants || '#27323a', boot: L.boot || '#1c2228' });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    T.box(0.07, 0.42, 0.03, red, { x: 0.05, y: 0.32, z: 0.158 * b, rz: 0.45 }).box(0.07, 0.42, 0.03, shade(robe, -0.14), { x: -0.05, y: 0.32, z: 0.162 * b, rz: -0.45 });       // crossed collar
    Hp.cyl(0.2 * b, 0.31 * b, 0.25, robe, { y: -0.12, sz: 0.86, c2: shade(robe, -0.1) }, 10).cyl(0.205 * b, 0.205 * b, 0.14, red, { y: 0.05, sz: 0.82, c2: shade(red, 0.25) }, 10)
      .box(0.24, 0.13, 0.08, red, { y: 0.07, z: -0.19 * b }).box(0.08, 0.2, 0.05, shade(red, -0.15), { x: 0.07, y: -0.06, z: -0.2 * b, rz: 0.2 }).box(0.08, 0.2, 0.05, shade(red, -0.15), { x: -0.07, y: -0.06, z: -0.2 * b, rz: -0.2 });       // sash, tied in a bow behind
    for (const s of ['L', 'R']) {
      R.P('arm' + s).cyl(0.085 * b, 0.14 * b, 0.27, robe, { y: -0.16, c2: shade(robe, -0.08) }, 8).cyl(0.142 * b, 0.142 * b, 0.03, red, { y: -0.29 }, 8);       // wide sleeves, red at the cuff
      R.P('shin' + s).cyl(0.1 * b, 0.096 * b, 0.05, red, { y: -0.05 }, 8);
    }
    H.dome(0.288, hair, { y: 0.31, rx: -0.22, c2: shade(hair, 0.3), sh: 0.8 }, Math.PI * 0.55).sph(0.245, hair, { y: 0.2, z: -0.1, sy: 1.1, sz: 0.72 }, 10, 8)       // a straight dark bob
      .sph(0.085, hair, { x: 0.2, y: 0.57, z: -0.08, c2: shade(hair, 0.3) }, 7, 6).tor(0.055, 0.02, red, { x: 0.2, y: 0.51, z: -0.08, rx: HP2 }, 4, 10);
    for (const k of [-1, 1]) H.sph(0.09, hair, { x: k * 0.235, y: 0.2, z: 0.03, sy: 1.9, sz: 0.9 }, 7, 6);
    capeGeo(R, 0.42, 0.56, L.cape); { const [Q, y] = onStrip(R, 'cape', 0.55); Q.box(0.42, 0.04, 0.04, red, { y }); }
    // the masks, each on a bone of its own so it can move between face and back of the head
    R.nb('mask0', 0, 0.3, 0.205, R.B.head); R.nb('mask1', 0, 0.3, 0.205, R.B.head);
    const M0 = R.P('mask0'), M1 = R.P('mask1');
    M0.sph(0.215, paper, { sz: 0.42, sy: 1.14, c2: '#d9e6ee', sh: 0.85 }, 12, 8).cone(0.055, 0.36, '#f2c14e', { y: -0.07, z: 0.21, rx: HP2 + 0.38, c2: '#ffe9a8' }, 6).oct(0.042, red, { y: 0.18, z: 0.082, sz: 0.4 });       // the Heron: white, a long gold bill
    M1.sph(0.225, tc, { sx: 1.08, sz: 0.42, sy: 1.02, c2: shade(tc, 0.35), sh: 0.85 }, 12, 8).sph(0.1, '#fff4e0', { y: -0.085, z: 0.068, sy: 0.8, sz: 0.6 }, 8, 6).oct(0.03, ink, { y: -0.045, z: 0.128 }).box(0.03, 0.11, 0.02, ink, { y: 0.17, z: 0.086 });       // the Tiger: striped, fanged, eared
    for (const k of [-1, 1]) {
      M0.box(0.1, 0.022, 0.02, ink, { x: k * 0.085, y: 0.05, z: 0.089, rz: -k * 0.2 }).box(0.045, 0.13, 0.02, hc, { x: k * 0.14, y: 0.14, z: 0.066, rz: k * 0.5 }).cone(0.03, 0.2, hc, { x: k * 0.06, y: 0.3, z: -0.01, rz: -k * 0.25 }, 4);
      M1.box(0.095, 0.03, 0.02, ink, { x: k * 0.09, y: 0.045, z: 0.092, rz: k * 0.3 }).box(0.03, 0.1, 0.02, ink, { x: k * 0.075, y: 0.165, z: 0.082, rz: k * 0.35 }).box(0.03, 0.09, 0.02, ink, { x: k * 0.185, y: -0.02, z: 0.05, rz: k * 1.2 })
        .cone(0.075, 0.15, tc, { x: k * 0.155, y: 0.25, z: -0.01, rz: -k * 0.3, c2: shade(tc, 0.3) }, 4).cone(0.022, 0.085, '#ffffff', { x: k * 0.05, y: -0.165, z: 0.1, rx: Math.PI }, 4);
    }
    // Heron's tool: a wand hung with folded paper
    R.nb('gearA', 0, 0, 0, R.B.wpnR);
    R.P('gearA').cyl(0.022, 0.027, 1.05, '#6b4f33', { y: 0.25 }, 6).tor(0.04, 0.016, red, { y: 0.72, rx: HP2 }, 4, 8).box(0.11, 0.17, 0.012, paper, { x: 0.075, y: 0.63, rz: -0.35 }).box(0.11, 0.17, 0.012, '#e9edf0', { x: 0.1, y: 0.5, rz: 0.3 }).box(0.11, 0.17, 0.012, paper, { x: 0.075, y: 0.37, rz: -0.35 })
      .box(0.11, 0.17, 0.012, paper, { x: -0.075, y: 0.63, rz: 0.35 }).box(0.11, 0.17, 0.012, '#e9edf0', { x: -0.1, y: 0.5, rz: -0.3 });
    glowPart(R, 'gearA', new THREE.OctahedronGeometry(0.07, 0), hc, 0, 0.84, 0, 0.7);
    // Tiger's tools: spirit claws over both hands and a tail of flame
    for (const [s, k] of [['L', 1], ['R', -1]]) {
      R.nb('gear' + s, 0, 0, 0, R.B['hand' + s]);
      const Gp = R.P('gear' + s); Gp.sph(0.105, shade(tc, -0.25), { y: -0.03, sx: 1.1, sz: 1.15, c2: tc, sh: 0.7 }, 8, 6);
      for (let i = -1; i <= 1; i++) Gp.cone(0.03, 0.3, '#fff4e0', { x: i * 0.065, y: -0.22, z: 0.05, rx: Math.PI - 0.18, c2: tc }, 4);
      glowPart(R, 'gear' + s, new THREE.ConeGeometry(0.11, 0.34, 5).rotateX(Math.PI).translate(0, -0.2, 0.04), tc, 0, 0, 0, 0.75);
      R.B['gear' + s].visible = false;
    }
    R.nb('tails', 0, 0.0, -0.17, R.B.hips);
    R.P('tails').cone(0.085, 0.34, tc, { y: -0.14, rx: Math.PI, c2: shade(tc, 0.4), sh: 0.7 }, 6).cone(0.065, 0.3, '#fff4e0', { y: -0.4, rx: Math.PI }, 6).box(0.1, 0.03, 0.1, ink, { y: -0.2 }).box(0.085, 0.03, 0.085, ink, { y: -0.31 });
    R.B.tails.visible = false;
    kiriMasks(R.B, 0);
    return { style: 'cast' };
  },
  lyra(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: shade(L.body, 0.12), glove: L.skin, pants: '#2a3a6a', boot: '#3a2f4a', robe: 0.6 });
    const T = R.P('spine'), H = R.P('head');
    T.tor(0.12, 0.03, L.trim, { y: 0.5, rx: HP2 }, 5, 10).box(0.075, 0.42, 0.03, L.trim, { y: 0.26, z: 0.155 });
    for (const s of ['L', 'R']) R.P('fore' + s).cyl(0.07, 0.118, 0.2, L.body, { y: -0.16 }, 8).cyl(0.12, 0.12, 0.035, L.trim, { y: -0.255 }, 8);
    H.sph(0.25, L.hair, { y: 0.16, z: -0.12, sx: 1.08, sy: 1.5, sz: 0.6 });
    for (const k of [-1, 1]) H.sph(0.08, L.hair, { x: k * 0.21, y: 0.2, z: 0.1, sy: 1.8, sz: 0.7 });
    H.cyl(0.45, 0.47, 0.035, L.body, { y: 0.5, rx: -0.12 }, 14).cyl(0.28, 0.305, 0.07, L.trim, { y: 0.545, rx: -0.12 }, 12)
      .cone(0.275, 0.44, shade(L.body, 0.1), { y: 0.76, z: -0.03, rx: -0.2 }, 10).cone(0.135, 0.32, shade(L.body, 0.2), { y: 1.0, z: -0.15, rx: -0.78 }, 8).oct(0.065, L.trim, { y: 0.565, z: 0.295, sz: 0.4 });
    capeGeo(R, 0.5, 0.9, L.cape);
    R.P('wpnR').cyl(0.027, 0.032, 1.55, '#6b4f33', { y: 0.2 }, 6).tor(0.13, 0.032, L.trim, { y: 1.09, rz: -3.77 }, 5, 12, 4.4).sph(0.05, L.trim, { y: -0.58 }, 6, 5);
    glowPart(R, 'wpnR', new THREE.SphereGeometry(0.092, 10, 8), L.glow, 0, 1.09, 0, 0.8);
    return { style: 'cast' };
  },
  zephyr(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: shade(L.body, 0.16), glove: L.skin, pants: '#1f5f5c', boot: '#e8f6f2', robe: 0.58 });
    const T = R.P('spine'), H = R.P('head');
    T.box(0.09, 0.62, 0.03, L.trim, { y: 0.27, z: 0.158, rz: -0.55 });
    for (const k of [-1, 1]) T.sph(0.13, L.trim, { x: k * 0.31, y: 0.5, sy: 0.6 }).cone(0.07, 0.24, '#ffd76a', { x: k * 0.36, y: 0.62, rz: -k * 0.7 }, 5);
    hairCap(H, L.hair, Math.PI * 0.55, -0.3);
    H.cone(0.1, 0.32, L.hair, { y: 0.62, z: -0.06, rx: -0.5 }, 5).cone(0.085, 0.28, L.hair, { x: 0.13, y: 0.57, z: -0.09, rx: -0.6, rz: -0.45 }, 5).cone(0.085, 0.28, L.hair, { x: -0.13, y: 0.57, z: -0.09, rx: -0.6, rz: 0.45 }, 5);
    H.tor(0.215, 0.022, '#ffd76a', { y: 0.47, rx: HP2 - 0.25 }, 5, 14);
    for (let i = 0; i < 5; i++) { const a = HP2 + (i - 2) * 0.5; H.cone(0.035, 0.13, '#ffd76a', { x: Math.cos(a) * 0.215, y: 0.56 - Math.abs(i - 2) * 0.02, z: Math.sin(a) * 0.215 + 0.02 }, 4); }
    capeGeo(R, 0.5, 0.84, L.cape);
    R.nb('orb', -0.38, 1.22, 0.3, R.B.body); R.nb('motes', 0, 0, 0, R.B.orb);
    glowPart(R, 'orb', new THREE.SphereGeometry(0.13, 12, 10), L.glow, 0, 0, 0, 1.0);
    for (const k of [-1, 1]) glowPart(R, 'motes', new THREE.SphereGeometry(0.04, 6, 5), '#ffffff', k * 0.25, k * 0.05, 0);
    return { style: 'orb', hover: 0.16, stride: 0.22 };
  },
  orin(R, L) {       // a warden of the thornwood: laurels of beaten copper in his hair, a cowl at his throat, one armoured shoulder, and a leaf of iron as long as his arm to throw
    const b = R.b, cop = L.trim, cop2 = shade(cop, 0.4), copD = shade(cop, -0.3), lea = L.body, cl = L.cape, glow = L.wglow || L.glow || '#b8f06a', steel = L.blade || '#93a69d', dark = '#261d17';
    baseBody(R, { body: lea, body2: shade(lea, 0.18), trim: cop, skin: L.skin, sleeve: shade(cl, -0.06), fore: shade(lea, 0.12), glove: dark, pants: L.pants || '#27352e', boot: L.boot || '#2e241d' });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips'), sx = 0.235 * b + 0.035;
    // a breastplate with a leaf worked into it, a strap for what he carries on his back, a buckle
    T.sph(0.2, copD, { y: 0.335, z: 0.05, sx: 0.98, sy: 0.84, sz: 0.66, c2: cop, sh: 0.82 }, 10, 7)
      .box(0.026, 0.21, 0.02, cop2, { y: 0.335, z: 0.182 }).box(0.1, 0.026, 0.02, cop2, { x: 0.04, y: 0.385, z: 0.176, rz: 0.55 }).box(0.1, 0.026, 0.02, cop2, { x: -0.04, y: 0.385, z: 0.176, rz: -0.55 })
      .box(0.085, 0.075, 0.03, cop2, { y: 0.03, z: 0.152 * b + 0.004 }).box(0.06, 0.5, 0.024, dark, { x: -0.02, y: 0.3, z: -0.158 * b, rz: -0.66 });
    // the cowl: a thick roll round the neck, the hood itself hanging down behind
    T.tor(0.165, 0.078, cl, { y: 0.505, rx: HP2, c2: shade(cl, 0.3), sh: 0.78 }, 6, 12).sph(0.135, shade(cl, -0.1), { y: 0.44, z: -0.2, sy: 1.2, sz: 0.72, c2: cl }, 8, 6).cone(0.085, 0.2, shade(cl, -0.16), { y: 0.3, z: -0.235, rx: Math.PI - 0.22 }, 6);
    // one armoured shoulder (the one he does not throw with): three scales and a leaf tip
    T.sph(0.18, copD, { x: sx + 0.03, y: 0.525, sy: 0.6, sz: 1.04, c2: cop, sh: 0.8 }, 9, 6).sph(0.158, copD, { x: sx + 0.09, y: 0.455, sy: 0.56, sz: 0.98, c2: cop, sh: 0.8 }, 9, 6).sph(0.13, copD, { x: sx + 0.13, y: 0.385, sy: 0.55, sz: 0.9, c2: cop, sh: 0.8 }, 8, 5)
      .cone(0.05, 0.2, cop2, { x: sx + 0.07, y: 0.655, rz: -0.7, sz: 0.45 }, 4).sph(0.105, dark, { x: -sx - 0.01, y: 0.5, sy: 0.62 }, 7, 5).cyl(0.03, 0.03, 0.02, cop2, { x: -sx - 0.03, y: 0.5, z: 0.09, rx: HP2 }, 6);
    // two spare leaves in a sling on his back, their points standing up behind the armoured shoulder
    { const z = -0.205 * b - 0.04; T.box(0.24, 0.1, 0.05, dark, { x: 0.075, y: 0.345, z: z + 0.012, rz: -0.48, c2: shade(lea, 0.2) }).box(0.25, 0.022, 0.056, cop, { x: 0.068, y: 0.39, z: z + 0.012, rz: -0.48 });
      for (const [x, rz, len] of [[0.0, -0.26, 0.5], [0.11, -0.6, 0.46]]) { const dx = -Math.sin(rz), dy = Math.cos(rz), o = { x, y: 0.31, z, rz, rx: -0.08 };
        T.add(leafGeo(len, 0.17, 0.012), '#dfeae3', Object.assign({ c2: '#f6fbf7', sh: 0.9 }, o)).add(leafGeo(len * 0.92, 0.12, 0.04), shade(steel, -0.42), Object.assign({ c2: steel, sh: 0.8 }, o, { x: x + dx * 0.02, y: 0.31 + dy * 0.02 }))
          .cyl(0.02, 0.022, 0.13, dark, { x: x - dx * 0.065, y: 0.31 - dy * 0.065, z, rz }, 5).sph(0.03, cop, { x: x - dx * 0.14, y: 0.31 - dy * 0.14, z }, 5, 4); } }
    // tassets, a hem of copper, and a pouch of seed pods at the hip
    Hp.cyl(0.19 * b, 0.265 * b, 0.2, shade(lea, -0.14), { y: -0.08, sz: 0.82, c2: shade(lea, 0.08) }, 10).cyl(0.268 * b, 0.272 * b, 0.034, cop, { y: -0.176, sz: 0.82 }, 10)
      .sph(0.082, '#4d5a26', { x: 0.2, y: 0.0, z: 0.06, sy: 1.12, c2: '#6f7f34' }, 7, 6).box(0.11, 0.03, 0.09, dark, { x: 0.2, y: 0.07, z: 0.06 }).sph(0.034, glow, { x: 0.225, y: 0.11, z: 0.075 }, 6, 5).sph(0.028, shade(glow, -0.2), { x: 0.17, y: 0.105, z: 0.05 }, 6, 5);
    for (const s of ['L', 'R']) {
      R.P('fore' + s).cyl(0.08 * b, 0.07 * b, 0.15, copD, { y: -0.15, c2: cop, sh: 0.85 }, 8).cyl(0.083 * b, 0.083 * b, 0.022, cop2, { y: -0.075 }, 8);
      R.P('shin' + s).sph(0.076, copD, { y: -0.015, z: 0.062, sy: 1.1, sz: 0.55, c2: cop }, 7, 5).box(0.1, 0.2, 0.03, copD, { y: -0.15, z: 0.088, c2: cop, sh: 0.85 }).cyl(0.105 * b, 0.1 * b, 0.04, dark, { y: -0.03 }, 8);
    }
    R.P('armR').cyl(0.086 * b, 0.086 * b, 0.035, cop, { y: -0.12 }, 8);
    // hair swept back, the wreath: a band of copper with leaves standing along either side, a bead of light at the brow
    hairCap(H, L.hair, Math.PI * 0.56, -0.34); H.sph(0.1, L.hair, { x: 0.03, y: 0.465, z: 0.2, sx: 1.7, sy: 0.55, sz: 0.6, rz: -0.14 });
    for (const [x, y, z, rx, rz, r] of [[0, 0.56, -0.16, -1.05, 0, 0.1], [-0.11, 0.52, -0.2, -1.2, 0.35, 0.085], [0.11, 0.52, -0.2, -1.2, -0.35, 0.085], [0, 0.42, -0.27, -1.6, 0, 0.09]]) H.cone(r, 0.24, L.hair, { x, y, z, rx, rz, c2: shade(L.hair, 0.2) }, 5);
    H.tor(0.286, 0.017, cop, { y: 0.39, rx: HP2 - 0.17 }, 4, 22);
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const a = 0.62 + i * 0.5, x = k * Math.sin(a) * 0.292, z = Math.cos(a) * 0.292; H.cone(0.043, 0.15 - i * 0.012, i % 2 ? cop : cop2, { x, y: 0.455 - z * 0.17 + i * 0.004, z, rz: -k * (0.42 + i * 0.05), rx: -0.5 - i * 0.12, sz: 0.36, c2: cop2 }, 4); }
    for (const k of [-1, 1]) H.box(0.078, 0.02, 0.012, glow, { x: k * 0.105, y: 0.236, z: 0.246, rz: k * 0.16 });       // a stripe of paint under each eye
    glowPart(R, 'head', new THREE.OctahedronGeometry(0.03, 0), glow, 0, 0.432, 0.268, 0.28).scale.set(0.8, 1.25, 0.5);
    // the cloak: two long tails, each hemmed in copper
    strip(R, 'cape', 0.26, 0.76, 0.032, cl, { x: -0.135, rz: 0.06, c2: shade(cl, 0.3), sh: 0.6 }); strip(R, 'cape', 0.26, 0.66, 0.032, shade(cl, -0.1), { x: 0.135, rz: -0.06, c2: shade(cl, 0.24), sh: 0.6 });
    { const [Q, y] = onStrip(R, 'cape', 0.74); Q.box(0.26, 0.03, 0.04, cop, { x: -0.135 + Math.sin(0.06) * 0.36, y, rz: 0.06 }); const [Q2, y2] = onStrip(R, 'cape', 0.64); Q2.box(0.26, 0.03, 0.04, cop, { x: 0.135 - Math.sin(0.06) * 0.31, y: y2, rz: -0.06 }); }
    // the leaf he throws: a grip, a guard like a curled stem, and a broad blade with a vein of light
    const Wp = R.P('wpnR');
    Wp.cyl(0.027, 0.03, 0.2, dark, {}, 6).sph(0.042, cop, { y: -0.118, c2: cop2 }, 6, 5).box(0.18, 0.044, 0.07, copD, { y: 0.118, c2: cop }).cone(0.035, 0.1, cop2, { x: 0.11, y: 0.15, rz: -0.9 }, 4).cone(0.035, 0.1, cop2, { x: -0.11, y: 0.15, rz: 0.9 }, 4)
      .add(leafGeo(0.82, 0.32, 0.02), '#e4eee7', { y: 0.12, c2: '#ffffff', sh: 0.9 }).add(leafGeo(0.77, 0.255, 0.058), shade(steel, -0.45), { y: 0.145, c2: steel, sh: 0.78 });
    for (let i = 0; i < 3; i++) for (const k of [-1, 1]) Wp.box(0.085 - i * 0.014, 0.012, 0.05, shade(steel, -0.45), { x: k * (0.04 - i * 0.004), y: 0.36 + i * 0.13, rz: k * 0.62 });       // side veins, cut in
    glowPart(R, 'wpnR', new THREE.BoxGeometry(0.02, 0.56, 0.066), glow, 0, 0.46, 0, 0);
    return { style: 'hurl' };
  },
  mira(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.skin, fore: '#5a3a1c', glove: L.skin, pants: '#4a321c', boot: '#3a2a1c' });
    const T = R.P('spine'), H = R.P('head');
    R.P('hips').cyl(0.19, 0.255, 0.19, shade(L.body, -0.15), { y: -0.07, sz: 0.82 }, 10);
    for (const s of ['L', 'R']) R.P('arm' + s).cyl(0.086, 0.086, 0.05, L.trim, { y: -0.11 }, 8);
    T.sph(0.17, '#5a3a1c', { x: 0.31, y: 0.5, sx: 1.1, sy: 0.6, sz: 1.1 }).tor(0.11, 0.022, L.trim, { y: 0.5, rx: HP2 }, 5, 10).cyl(0.072, 0.062, 0.42, '#4a321c', { x: 0.14, y: 0.3, z: -0.21, rz: 0.35 }, 7);
    for (let i = 0; i < 3; i++) T.cyl(0.012, 0.012, 0.2, '#e9dcc0', { x: 0.22 - i * 0.03, y: 0.57, z: -0.24 + i * 0.03, rz: 0.35 }, 4).box(0.045, 0.07, 0.008, L.trim, { x: 0.25 - i * 0.03, y: 0.65, z: -0.24 + i * 0.03, rz: 0.35 });
    hairCap(H, L.hair, Math.PI * 0.58, -0.3);
    H.sph(0.105, L.hair, { y: 0.14, z: -0.24 }).sph(0.09, L.hair, { y: -0.02, z: -0.27 }).sph(0.072, L.hair, { y: -0.17, z: -0.28 }).sph(0.052, L.trim, { y: -0.28, z: -0.28 }, 6, 5)
      .cone(0.055, 0.3, L.trim, { x: 0.2, y: 0.6, z: -0.1, rz: -0.35, rx: -0.25, sz: 0.3 }, 5).box(0.3, 0.032, 0.02, L.trim, { y: 0.235, z: 0.262 });
    capeGeo(R, 0.4, 0.42, L.cape); bowGeo(R.P('wpnL'), L.wood || '#4a321c', L.trim, 0.6);
    return { style: 'bow' };
  },
  sera(R, L) {
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: shade(L.body, 0.1), glove: L.skin, pants: '#cfc4a8', boot: '#b89a5a', robe: 0.62 });
    const T = R.P('spine'), H = R.P('head');
    T.box(0.085, 0.44, 0.03, L.trim, { y: 0.27, z: 0.157 }).tor(0.112, 0.03, L.trim, { y: 0.5, rx: HP2 }, 5, 10);
    for (const s of ['L', 'R']) R.P('fore' + s).cyl(0.07, 0.122, 0.2, L.body, { y: -0.16 }, 8).cyl(0.125, 0.125, 0.032, L.trim, { y: -0.255 }, 8);
    hairCap(H, L.hair, Math.PI * 0.57, -0.3); H.sph(0.265, L.hair, { y: 0.1, z: -0.13, sx: 1.12, sy: 1.7, sz: 0.62 });
    for (const k of [-1, 1]) H.sph(0.088, L.hair, { x: k * 0.215, y: 0.16, z: 0.08, sy: 2.0, sz: 0.7 });
    const wn = L.wingN || 3, wc = L.wing || '#fbf7ec', big = wn > 3, hc = L.halo || '#ffd76a';
    for (const k of [-1, 1]) for (let i = 0; i < wn; i++) T.box(big ? 0.12 : 0.1, big ? 0.7 - i * 0.09 : 0.4 - i * 0.07, 0.022, wc, { x: k * (0.17 + i * (big ? 0.11 : 0.1)), y: 0.46 + i * (big ? 0.06 : 0.03), z: -0.18, rz: -k * (0.45 + i * (big ? 0.3 : 0.4)), c2: shade(wc, 0.45) });
    capeGeo(R, 0.42, 0.4, L.cape);
    R.P('wpnR').cyl(0.021, 0.025, 0.52, L.trim, { y: 0.17 }, 6).sph(0.036, L.trim, { y: -0.09 }, 6, 5);
    glowPart(R, 'wpnR', new THREE.OctahedronGeometry(0.085, 0), L.glow, 0, 0.5, 0, 0.7);
    const hr = glowPart(R, 'head', new THREE.TorusGeometry(0.2, 0.025, 6, 20), hc, 0, 0.75, 0, 0); hr.rotation.x = HP2;
    const hh = halo(hc, 0.8, 0.5); hh.position.set(0, 0.75, 0); R.B.head.add(hh);
    return { style: 'cast' };
  },
  miel(R, L) {       // a keeper of bees: a wide straw hat with a veil down the back of it, a cream smock with three cells of comb sewn on the bib, long gloves, a honey pot at her belt, and a crook from which a straw skep hangs glowing. Three of her bees are always about her.
    const veil = L.veil || '#fbf5e4', glove = L.glove || '#9a7448', wood = L.wood || '#7a5a38', straw = L.straw, b = R.b, zf = 0.158 * b;
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: glove, glove, pants: L.pants, boot: L.boot, robe: 0.58 });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    T.box(0.25, 0.3, 0.03, shade(L.body, -0.1), { y: 0.3, z: zf + 0.008, c2: shade(L.body, 0.06) });
    for (const [x, y] of [[0, 0.37], [-0.052, 0.28], [0.052, 0.28]]) T.cyl(0.05, 0.05, 0.02, L.trim, { x, y, z: zf + 0.026, rx: HP2, ry: HP2 / 3 }, 6);
    T.cyl(0.1, 0.31 * b, 0.17, L.cape, { y: 0.455, sz: 0.82, c2: shade(L.cape, 0.25), sh: 0.8 }, 10).tor(0.105, 0.026, L.trim, { y: 0.535, rx: HP2 }, 5, 10);       // a short mantle over the shoulders
    for (const s of ['L', 'R']) R.P('fore' + s).cyl(0.075, 0.105, 0.13, glove, { y: -0.075 }, 8).cyl(0.108, 0.108, 0.026, shade(glove, -0.25), { y: -0.012 }, 8);       // the cuffs of the gloves
    Hp.box(0.075, 0.26, 0.03, L.trim, { x: 0.15 * b, y: -0.12, z: 0.155 * b, rz: 0.1, c2: shade(L.trim, 0.2) }).box(0.06, 0.2, 0.03, shade(L.trim, -0.15), { x: 0.2 * b, y: -0.1, z: 0.14 * b, rz: 0.24 }).sph(0.045, L.trim, { x: 0.165 * b, y: 0.03, z: 0.165 * b });
    Hp.cyl(0.058, 0.058, 0.028, L.band, { x: -0.2 * b, y: 0.012, z: 0.12 * b }, 8); glowPart(R, 'hips', new THREE.CylinderGeometry(0.048, 0.054, 0.09, 8), L.glow, -0.2 * b, -0.045, 0.12 * b, 0.42);       // the honey pot
    H.sph(0.255, L.hair, { y: 0.2, z: -0.1, sx: 1.06, sy: 1.12, sz: 0.72 }); hairCap(H, L.hair, Math.PI * 0.5, -0.32);
    for (const k of [-1, 1]) H.sph(0.078, L.hair, { x: k * 0.215, y: 0.18, z: 0.09, sy: 1.9, sz: 0.7 });
    if (L.hat === 'tiara') {       // the queen's own: no straw, a coronet of comb cells and a mantle of gauze from it
      H.tor(0.215, 0.026, L.trim, { y: 0.49, rx: HP2 - 0.18 }, 5, 14);
      for (let i = 0; i < 5; i++) { const a = HP2 + (i - 2) * 0.48, d = Math.abs(i - 2); H.cyl(0.052 - d * 0.006, 0.052 - d * 0.006, 0.02, L.trim, { x: Math.cos(a) * 0.225, y: 0.585 - d * 0.03, z: Math.sin(a) * 0.225 + 0.03, rx: HP2, ry: HP2 / 3 - (a - HP2) }, 6); }
      glowPart(R, 'head', new THREE.OctahedronGeometry(0.04, 0), L.glow, 0, 0.59, 0.268, 0.5);
      R.nb('veil', 0, 0.52, -0.2, R.B.head); strip(R, 'veil', 0.4, 0.62, 0.02, veil, { c2: shade(veil, -0.2), sh: 0.85 });
    } else {
      const tilt = -0.1;
      H.cyl(0.44, 0.47, 0.03, straw, { y: 0.49, rx: tilt, c2: shade(straw, 0.18), sh: 0.9 }, 18).tor(0.455, 0.02, shade(straw, -0.22), { y: 0.49, rx: HP2 + tilt }, 4, 18)
        .cyl(0.215, 0.265, 0.17, straw, { y: 0.585, z: -0.012, rx: tilt, c2: shade(straw, 0.16) }, 12).sph(0.215, shade(straw, 0.16), { y: 0.665, z: -0.02, sy: 0.4, rx: tilt, sh: 0.92 }, 12, 6)
        .cyl(0.268, 0.272, 0.055, L.band, { y: 0.528, z: -0.006, rx: tilt }, 12);
      H.cyl(0.05, 0.05, 0.02, L.trim, { y: 0.535, z: 0.268, rx: HP2, ry: HP2 / 3 }, 6);       // one cell of comb pinned to the band
      for (const a of [3.38, 3.72, 4.06, 5.365, 5.705, 6.045]) H.box(0.16, 0.27, 0.014, veil, { x: Math.cos(a) * 0.385, y: 0.35 + Math.sin(a) * 0.04, z: Math.sin(a) * 0.385, ry: HP2 - a, c2: shade(veil, -0.18), sh: 0.92 });       // the veil: gathered at the sides, and loose down the back
      R.nb('veil', 0, 0.475, -0.4, R.B.head); strip(R, 'veil', 0.34, 0.5, 0.016, veil, { c2: shade(veil, -0.22), sh: 0.88 });
    }
    capeGeo(R, 0.44, 0.62, L.cape);
    const W = R.P('wpnR'), hk = 0.155;       // the crook, and the skep on its cord: the skep has a bone of its own, so that it can hang plumb whatever she does with the crook
    W.cyl(0.026, 0.031, 1.56, wood, { y: 0.2, c2: shade(wood, 0.2) }, 6).sph(0.04, L.trim, { y: -0.58 }, 6, 5).tor(hk, 0.026, wood, { x: -hk, y: 0.98 }, 5, 12, Math.PI).sph(0.034, L.trim, { x: -2 * hk, y: 0.98 }, 6, 5).cyl(0.034, 0.034, 0.05, L.trim, { y: 0.9 }, 6);
    R.nb('skep', -2 * hk, 0.975, 0, R.B.wpnR); const S = R.P('skep'), sc = L.skep || straw;
    S.cyl(0.008, 0.008, 0.12, L.band, { y: -0.05 }, 4).tor(0.022, 0.009, L.band, { y: -0.105 }, 4, 8);
    [[0.048, -0.135], [0.088, -0.18], [0.116, -0.232], [0.132, -0.288], [0.138, -0.345], [0.134, -0.4]].forEach(([r, y], i) => S.tor(r, 0.034, i % 2 ? shade(sc, -0.14) : sc, { y, rx: HP2 }, 5, 12));
    S.sph(0.118, shade(sc, -0.3), { y: -0.3, sy: 1.25 }, 8, 6).cyl(0.165, 0.165, 0.022, shade(wood, -0.1), { y: -0.44 }, 10).sph(0.046, '#2a1c10', { y: -0.385, z: 0.118, sz: 0.5 }, 6, 5);
    glowPart(R, 'skep', new THREE.SphereGeometry(0.03, 6, 5), L.glow, 0, -0.385, 0.14, 0.75);
    R.nb('bees', 0, 1.34, 0, R.B.body); R.nb('bees2', 0, 0.98, 0, R.B.body);
    for (const [bn, r, y, a, dir] of [['bees', 0.62, 0, 0, 1], ['bees', 0.5, 0.22, 2.5, 1], ['bees2', 0.7, 0, 4.2, -1], ['bees2', 0.55, 0.26, 1.1, -1]]) {       // four bees on their rounds, each one a bee to look at: striped, winged, nose to the way it flies; and behind each a glow that the view colours by her temper (bee: 2)
      const g = beeMesh(0.27, L.bee); g.position.set(Math.cos(a) * r, y, Math.sin(a) * r); g.rotation.y = dir * HP2 - a; R.B[bn].add(g);
      const hl = halo(L.tend || L.glow, 0.34, 0.7); hl.position.copy(g.position); hl.userData.bee = 2; R.B[bn].add(hl);
    }
    return { style: 'cast' };
  },
  hesta(R, L) {       // a herald in bronze and verdigris: scale armour to the knee, a mirror plate on the breast, her hair bound up in a tall knot with a red tassel down the back, a great gong on her left arm for a shield and the beater for it in her right hand
    const b = R.b, zf = 0.158 * b, metal = L.metal || '#c98a3c', dark = shade(L.body, -0.28), plume = L.plume || L.cape, wood = '#5a3d28';
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: shade(L.body, 0.06), fore: metal, glove: '#3a2a22', pants: L.pants, boot: L.boot });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    for (let i = 0; i < 3; i++) T.cyl((0.224 - i * 0.012) * b, (0.236 - i * 0.012) * b, 0.075, i % 2 ? shade(L.body, 0.18) : L.body, { y: 0.4 - i * 0.12, sz: 0.76, c2: dark, sh: 0.8 }, 10);       // bands of scale round the chest
    T.cyl(0.125, 0.125, 0.03, metal, { y: 0.31, z: zf + 0.012, rx: HP2, c2: shade(metal, 0.35) }, 14).sph(0.05, shade(metal, 0.45), { y: 0.31, z: zf + 0.03, sz: 0.5 }, 8, 6).tor(0.125, 0.016, L.trim, { y: 0.31, z: zf + 0.02 }, 4, 14);       // the mirror plate
    T.cyl(0.11, 0.135, 0.075, L.trim, { y: 0.53, sz: 0.85 }, 10);
    for (const k of [-1, 1]) { T.sph(0.17, metal, { x: k * 0.36, y: 0.5, sy: 0.6, c2: shade(metal, 0.3), sh: 0.85 }); T.sph(0.15, L.body, { x: k * 0.41, y: 0.42, sy: 0.55, sz: 0.9 }); T.tor(0.152, 0.02, L.trim, { x: k * 0.385, y: 0.455, rx: HP2 }, 4, 12); }
    Hp.cyl(0.2 * b, 0.3 * b, 0.34, L.body, { y: -0.14, sz: 0.84, c2: dark, sh: 0.7 }, 12).cyl(0.305 * b, 0.31 * b, 0.045, L.trim, { y: -0.3, sz: 0.84 }, 12).cyl(0.205 * b, 0.215 * b, 0.07, metal, { y: 0.02, sz: 0.84 }, 12);       // the skirt of scales, and the belt
    Hp.box(0.15, 0.36, 0.03, L.cape, { y: -0.16, z: 0.17 * b + 0.06, rx: -0.2, c2: shade(L.cape, 0.25) }).cyl(0.05, 0.05, 0.03, L.trim, { y: 0.02, z: 0.18 * b + 0.01, rx: HP2 }, 8);
    for (const s of ['L', 'R']) { R.P('fore' + s).cyl(0.08 * b, 0.07 * b, 0.16, metal, { y: -0.14, c2: shade(metal, 0.3) }, 8).cyl(0.084 * b, 0.084 * b, 0.025, L.trim, { y: -0.06 }, 8); R.P('shin' + s).cyl(0.105 * b, 0.095 * b, 0.14, metal, { y: -0.1, c2: shade(metal, 0.3) }, 8); }
    hairCap(H, L.hair, Math.PI * 0.56, -0.3); H.sph(0.24, L.hair, { y: 0.24, z: -0.1, sx: 1.05, sz: 0.7 });
    for (const k of [-1, 1]) { H.sph(0.07, L.hair, { x: k * 0.225, y: 0.2, z: 0.07, sy: 1.8, sz: 0.75 }); H.sph(0.035, L.trim, { x: k * 0.272, y: 0.12, z: 0.03 }, 6, 5); }
    H.tor(0.275, 0.022, L.trim, { y: 0.43, rx: HP2 - 0.12 }, 5, 16).cyl(0.05, 0.05, 0.02, metal, { y: 0.415, z: 0.272, rx: HP2 }, 10);       // the band across the brow, with a small disc of its own
    H.cyl(0.075, 0.095, 0.1, L.trim, { y: 0.62, z: -0.05 }, 8).sph(0.115, L.hair, { y: 0.73, z: -0.06, sy: 1.15 }).sph(0.07, L.hair, { y: 0.86, z: -0.08 });       // the knot, through a ring
    R.nb('tassel', 0, 0.68, -0.15, R.B.head); strip(R, 'tassel', 0.1, 0.46, 0.03, plume, { c2: shade(plume, 0.3), sh: 0.75 });
    capeGeo(R, 0.5, 0.66, L.cape); R.P('cape').box(0.54, 0.06, 0.05, L.trim, { y: -0.02 });
    R.P('wpnR').cyl(0.028, 0.034, 0.62, wood, { y: 0.2, c2: shade(wood, 0.2) }, 6).sph(0.04, L.trim, { y: -0.12 }, 6, 5).sph(0.13, plume, { y: 0.57, sy: 0.9, c2: shade(plume, 0.35), sh: 0.75 }, 12, 9).tor(0.08, 0.022, L.trim, { y: 0.47, rx: HP2 }, 4, 10);       // the beater: a short haft, a padded head bound in cloth
    const gy = -0.11, gz = 0.05;       // the gong, face outward: a wide disc with a raised rim, rings beaten into it and a boss at its middle
    R.P('wpnL').cyl(0.43, 0.43, 0.045, metal, { y: gy, z: gz, c2: shade(metal, 0.28), sh: 0.85 }, 24).tor(0.43, 0.03, shade(metal, -0.25), { y: gy, z: gz, rx: HP2 }, 5, 24).tor(0.3, 0.012, shade(metal, -0.32), { y: gy - 0.024, z: gz, rx: HP2 }, 4, 20).tor(0.2, 0.012, shade(metal, -0.32), { y: gy - 0.024, z: gz, rx: HP2 }, 4, 18)
      .sph(0.11, shade(metal, 0.45), { y: gy - 0.03, z: gz, sy: 0.4 }, 12, 6);
    return { style: 'smash', wl: 0 };
  },
  sorrel(R, L) {       // a gamekeeper of the high moor: a flat cap with her glass pushed up on it, a scarf wound to the chin, a waxed coat to the knee under a short cape, a bandolier of brass across it, and a shardlock long gun nearly as tall as she is (along the hand's own z, so that it points where her forearm does)
    const b = R.b, zf = 0.158 * b, brass = L.trim, br2 = shade(brass, 0.4), coat = L.body, dark = shade(coat, -0.3), wood = L.wood || '#4a3222', metal = L.metal || '#8a8f98', glow = L.wglow || L.glow || '#7fd8ff', scarf = L.cape, leather = '#3a2a20', cap = shade(coat, -0.2);
    baseBody(R, { body: coat, body2: shade(coat, 0.16), trim: leather, skin: L.skin, sleeve: coat, fore: shade(coat, -0.12), glove: leather, pants: L.pants, boot: L.boot });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    // the coat's skirts, a belt with a brass buckle, a pouch at either hip
    Hp.cyl(0.2 * b, 0.3 * b, 0.4, coat, { y: -0.17, sz: 0.84, c2: dark, sh: 0.7 }, 12).cyl(0.205 * b, 0.212 * b, 0.06, leather, { y: 0.03, sz: 0.84 }, 12).box(0.07, 0.06, 0.03, brass, { y: 0.03, z: 0.18 * b, c2: br2 });
    for (const k of [-1, 1]) Hp.box(0.09, 0.1, 0.06, leather, { x: k * 0.18, y: -0.04, z: 0.08, c2: shade(leather, 0.3) }).box(0.095, 0.025, 0.065, brass, { x: k * 0.18, y: 0.0, z: 0.08 });
    // the bandolier: a strap from one shoulder to the other hip, five brass rounds along the front of it
    T.box(0.075, 0.6, 0.03, leather, { y: 0.26, z: zf + 0.012, rz: 0.72, c2: shade(leather, 0.25) }).box(0.075, 0.56, 0.03, leather, { y: 0.26, z: -zf - 0.028, rz: -0.72 });
    for (let i = 0; i < 5; i++) { const q = (i - 2) * 0.1; T.cyl(0.018, 0.018, 0.075, brass, { x: -q * Math.sin(0.72), y: 0.26 + q * Math.cos(0.72), z: zf + 0.04, rz: 0.72 - HP2, c2: br2 }, 6); }
    // the short cape over her shoulders (what she goes under), pinned at the collarbone with a chip of shard; the scarf: a thick roll to the chin, two ends down her back
    for (const k of [-1, 1]) T.sph(0.155, scarf, { x: k * 0.29, y: 0.47, sy: 0.55, sz: 0.98, c2: shade(scarf, 0.25), sh: 0.8 }, 8, 6);
    capeGeo(R, 0.5, 0.46, scarf); R.P('cape').box(0.52, 0.035, 0.045, shade(scarf, -0.25), { y: -0.015 });
    glowPart(R, 'spine', new THREE.OctahedronGeometry(0.036, 0), glow, -0.14, 0.455, zf + 0.035, 0.3).scale.set(0.8, 1.3, 0.5);
    T.tor(0.15, 0.072, shade(scarf, 0.12), { y: 0.545, rx: HP2, c2: shade(scarf, 0.4), sh: 0.78 }, 6, 12);
    R.nb('scarf', 0.09, 0.52, -0.13 * b - 0.05, R.B.spine); strip(R, 'scarf', 0.1, 0.4, 0.028, shade(scarf, 0.12), { c2: shade(scarf, 0.4), sh: 0.7 }); strip(R, 'scarf', 0.085, 0.28, 0.028, shade(scarf, -0.05), { x: -0.1, c2: shade(scarf, 0.3), sh: 0.7 });
    // cuffs and kneepads of leather
    for (const s of ['L', 'R']) { R.P('fore' + s).cyl(0.076 * b, 0.07 * b, 0.07, leather, { y: -0.2 }, 8); R.P('shin' + s).sph(0.072, leather, { y: -0.02, z: 0.07, sy: 1.1, sz: 0.5, c2: shade(leather, 0.3) }, 7, 5).cyl(0.104 * b, 0.1 * b, 0.05, leather, { y: -0.09 }, 8); }
    // hair cut short, a strand loose at either cheek
    hairCap(H, L.hair, Math.PI * 0.58, -0.32); H.sph(0.21, L.hair, { y: 0.2, z: -0.12, sx: 1.14, sz: 0.8 });
    for (const k of [-1, 1]) H.sph(0.058, L.hair, { x: k * 0.225, y: 0.19, z: 0.09, sy: 1.9, sz: 0.7 });
    // the flat cap: a low crown pulled well forward, a short peak, a button on top; her glass pushed up on it: two brass rings on a strap, a lens of shard-light in each
    H.sph(0.305, cap, { y: 0.47, z: 0.03, sy: 0.4, sz: 1.1, c2: shade(cap, 0.35), sh: 0.8 }, 12, 7).cyl(0.288, 0.292, 0.05, shade(cap, -0.2), { y: 0.42 }, 14).box(0.32, 0.026, 0.19, shade(cap, -0.28), { y: 0.405, z: 0.33, rx: 0.2 }).sph(0.03, brass, { y: 0.595, z: 0.03 }, 6, 5)
      .tor(0.29, 0.016, leather, { y: 0.455, rx: HP2 - 0.14 }, 4, 16).box(0.05, 0.022, 0.022, brass, { y: 0.505, z: 0.3, rx: -0.45 });
    for (const k of [-1, 1]) { H.tor(0.062, 0.018, brass, { x: k * 0.088, y: 0.505, z: 0.283, rx: -0.45, c2: br2 }, 5, 12); glowPart(R, 'head', new THREE.CylinderGeometry(0.05, 0.05, 0.014, 10), glow, k * 0.088, 0.505, 0.286, 0).rotation.x = HP2 - 0.45; }
    // the long gun: stock and fore-end of walnut, a steel lock with the shard alight in it, a long barrel banded and capped in brass, a brass glass along the top
    R.P('wpnR').box(0.065, 0.11, 0.34, wood, { y: -0.035, z: -0.25, rx: -0.1, c2: shade(wood, 0.25), sh: 0.8 }).box(0.072, 0.13, 0.03, brass, { y: -0.052, z: -0.43, c2: br2 }).box(0.055, 0.12, 0.05, wood, { y: -0.075, z: -0.02, rx: 0.3 })
      .box(0.07, 0.085, 0.3, metal, { y: 0.02, z: 0.1, c2: shade(metal, 0.3), sh: 0.85 }).box(0.02, 0.05, 0.1, brass, { y: -0.045, z: 0.07 }).box(0.058, 0.06, 0.36, wood, { y: 0.0, z: 0.42, c2: shade(wood, 0.2), sh: 0.85 })
      .cyl(0.021, 0.024, 0.9, metal, { y: 0.04, z: 0.68, rx: HP2, c2: shade(metal, 0.35) }, 8).cyl(0.034, 0.034, 0.07, brass, { y: 0.04, z: 1.12, rx: HP2, c2: br2 }, 8).cyl(0.03, 0.03, 0.03, brass, { y: 0.04, z: 0.6, rx: HP2 }, 8)
      .cyl(0.034, 0.034, 0.32, brass, { y: 0.125, z: 0.13, rx: HP2, c2: br2 }, 10).cyl(0.044, 0.034, 0.06, brass, { y: 0.125, z: 0.31, rx: HP2 }, 10).cyl(0.034, 0.042, 0.05, brass, { y: 0.125, z: -0.04, rx: HP2 }, 10)
      .box(0.02, 0.05, 0.03, metal, { y: 0.085, z: 0.06 }).box(0.02, 0.05, 0.03, metal, { y: 0.085, z: 0.22 });
    glowPart(R, 'wpnR', new THREE.OctahedronGeometry(0.042, 0), glow, 0, 0.035, 0.27, 0.36).scale.set(0.75, 1.1, 1.5);
    glowPart(R, 'wpnR', new THREE.CylinderGeometry(0.031, 0.031, 0.012, 10), glow, 0, 0.125, 0.345, 0).rotation.x = HP2;
    return { style: 'rifle' };
  },
  odile(R, L) {       // a duellist out of the glassworks: a high-collared coat with tails, her hair pinned up with a sliver of glass, one polished pauldron, a round looking glass slung on her back, and a long blade of rose glass that she holds in both hands
    baseBody(R, { body: L.body, trim: L.trim, skin: L.skin, sleeve: L.body, fore: shade(L.body, -0.22), glove: '#20242c', pants: L.pants, boot: L.boot });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips'), b = R.b, glow = L.glow, mir = L.mirror || '#dfe8f5', zf = 0.158 * b, zb = -0.17 * b;
    T.tor(0.118, 0.034, shade(L.body, 0.1), { y: 0.535, rx: HP2 }, 5, 12);                                    // the collar, standing
    for (const k of [-1, 1]) T.box(0.028, 0.4, 0.02, L.trim, { x: k * 0.062 * b, y: 0.27, z: zf + 0.004, rz: -k * 0.13 });      // a silver edge down each lapel
    for (const k of [-1, 1]) Hp.box(0.17 * b, 0.4, 0.03, L.body, { x: k * 0.095 * b, y: -0.2, z: -0.15 * b, rx: -0.2, rz: k * 0.1, c2: shade(L.body, 0.16) }).box(0.172 * b, 0.03, 0.034, L.trim, { x: k * 0.11 * b, y: -0.385, z: -0.19 * b, rx: -0.2, rz: k * 0.1 });      // the coat's two tails, silver at the hem
    Hp.cyl(0.184 * b, 0.194 * b, 0.1, L.sash || glow, { y: 0.035, sz: 0.82, c2: shade(L.sash || glow, 0.2) }, 10).box(0.07, 0.07, 0.03, L.trim, { y: 0.035, z: 0.152 * b }).box(0.09, 0.3, 0.02, L.sash || glow, { x: -0.13 * b, y: -0.15, z: 0.11 * b, rz: 0.1, c2: shade(L.sash || glow, -0.2) });      // a sash at her waist, its end hanging at her hip, and a silver buckle
    T.box(0.05, 0.6, 0.018, shade(L.trim, -0.4), { y: 0.29, z: zf + 0.012, rz: 0.72 });                      // the strap of the looking glass, across her chest
    T.cyl(0.245, 0.245, 0.028, shade(mir, -0.3), { y: 0.3, z: zb - 0.02, rx: HP2 }, 18);                      // the looking glass on her back: its frame,
    T.cyl(0.208, 0.208, 0.034, mir, { y: 0.3, z: zb - 0.026, rx: HP2, c2: '#ffffff', sh: 1 }, 18);          // its face,
    T.box(0.05, 0.3, 0.012, '#ffffff', { x: -0.05, y: 0.32, z: zb - 0.046, rz: 0.6, sh: 1 });                 // and the light across it
    glowPart(R, 'spine', new THREE.TorusGeometry(0.228, 0.011, 4, 22), glow, 0, 0.3, zb - 0.04, 0);
    T.sph(0.112, shade(mir, -0.5), { x: 0.29 * b, y: 0.5, sx: 1.05, sy: 0.46, c2: shade(mir, -0.2) }).sph(0.085, shade(mir, -0.58), { x: 0.335 * b, y: 0.43, sx: 1.0, sy: 0.46, c2: shade(mir, -0.3) }).tor(0.1, 0.013, L.sash || glow, { x: 0.29 * b, y: 0.468, rx: HP2 }, 4, 12);      // one pauldron of two polished plates, on the arm that does not hold the blade
    for (const s of ['L', 'R']) { R.P('fore' + s).cyl(0.075 * b, 0.066 * b, 0.09, L.trim, { y: -0.2 }, 8); R.P('shin' + s).cyl(0.108 * b, 0.1 * b, 0.05, L.trim, { y: -0.02 }, 8); }
    hairCap(H, L.hair, Math.PI * 0.56, -0.3);
    H.sph(0.13, L.hair, { x: -0.06, y: 0.47, z: 0.17, sx: 1.85, sy: 0.5, sz: 0.6, rz: -0.16 });               // her fringe, swept to the one side
    H.sph(0.06, L.hair, { x: -0.24, y: 0.25, z: 0.07, sy: 1.9, sz: 0.8 });                                    // and a lock down by her cheek on that side
    H.sph(0.125, L.hair, { y: 0.57, z: -0.19 }).tor(0.1, 0.02, L.trim, { y: 0.52, z: -0.16, rx: 0.9 }, 4, 10);      // the knot high at the back, bound in silver
    glowPart(R, 'head', new THREE.CylinderGeometry(0.011, 0.004, 0.42, 5), glow, 0, 0.58, -0.19, 0).rotation.z = 1.15;      // the sliver of glass through it
    const W = R.P('wpnR');
    W.cyl(0.022, 0.024, 0.38, '#20242c', { y: -0.1 }, 6).cyl(0.028, 0.028, 0.03, L.trim, { y: -0.2 }, 6).sph(0.04, L.trim, { y: -0.31, sy: 1.25 }, 6, 5);      // a grip long enough for both her hands, bound once in silver, and its pommel
    W.box(0.3, 0.03, 0.04, L.trim, { y: 0.1 }).tor(0.062, 0.012, L.trim, { y: 0.1, rx: HP2 }, 5, 14);      // the guard: a straight bar, and the ring it has always had
    for (const k of [-1, 1]) W.box(0.06, 0.03, 0.04, L.trim, { x: k * 0.165, y: 0.118, rz: k * 0.55 });      // (the ends of the bar turned up toward the blade)
    W.box(0.056, 1.06, 0.012, L.blade || '#ffd9ea', { y: 0.66, c2: '#ffffff', sh: 1 }).cone(0.04, 0.17, L.blade || '#ffd9ea', { y: 1.275, sz: 0.24, ry: Math.PI / 4 }, 4);      // the blade: long, slender, of glass
    glowPart(R, 'wpnR', new THREE.BoxGeometry(0.012, 1.1, 0.018), glow, 0, 0.67, 0, 0);                       // the light held in it,
    glowPart(R, 'wpnR', new THREE.OctahedronGeometry(0.03, 0), glow, 0, -0.31, 0, 0.2);                       // and a bead of it in the pommel
    return { style: 'long' };
  },
  halvar(R, L) {       // a drover of the high passes: a sheepskin over a wool tunic belted with copper, a roll of fleece at the neck, bare arms, forearms wrapped to the knuckles in hide with a band of horn across each fist, a kilt of hide over his breeches, fleece at the tops of his boots; russet hair cropped at the sides with a ridge of it over the top; and in his breastbone the shard the ram sleeps in
    const b = R.b, zf = 0.158 * b, wool = L.body, fur = L.fur || '#e9e2d0', hide = L.hide || '#3a4256', cop = L.trim, horn = L.horn || '#d8cfe8', glow = L.wglow || L.glow || '#b9a8ff', leather = '#4a3528';
    baseBody(R, { body: wool, body2: shade(wool, 0.16), trim: cop, skin: L.skin, sleeve: L.skin, fore: leather, glove: leather, pants: L.pants, boot: L.boot });
    const T = R.P('spine'), H = R.P('head'), Hp = R.P('hips');
    T.cyl(0.228 * b, 0.19 * b, 0.4, fur, { y: 0.3, z: -0.03, sz: 0.72, c2: shade(fur, -0.18), sh: 0.75 }, 10);
    for (const k of [-1, 1]) T.box(0.1 * b, 0.4, 0.05, fur, { x: k * 0.15 * b, y: 0.3, z: zf * 0.86, c2: shade(fur, -0.15) }).sph(0.14, fur, { x: k * 0.27 * b, y: 0.5, sy: 0.7, c2: shade(fur, -0.12), sh: 0.85 }, 8, 6);
    T.tor(0.16, 0.07, fur, { y: 0.545, rx: HP2, c2: shade(fur, -0.2), sh: 0.8 }, 6, 12);
    glowPart(R, 'spine', new THREE.OctahedronGeometry(0.05, 0), glow, 0, 0.37, zf + 0.02, 0.42).scale.set(0.75, 1.25, 0.5);
    Hp.cyl(0.2 * b, 0.21 * b, 0.07, cop, { y: 0.03, sz: 0.84, c2: shade(cop, 0.3) }, 12).cyl(0.05, 0.05, 0.03, shade(cop, 0.35), { y: 0.03, z: 0.185 * b, rx: HP2 }, 8);
    Hp.cyl(0.19 * b, 0.27 * b, 0.36, hide, { y: -0.16, sz: 0.86, c2: shade(hide, -0.25), sh: 0.7 }, 10);
    for (const s of ['L', 'R']) {
      R.P('fore' + s).cyl(0.074 * b, 0.066 * b, 0.2, leather, { y: -0.13, c2: shade(leather, 0.25) }, 8).box(0.17 * b, 0.07, 0.11, horn, { y: -0.3, z: 0.03, c2: shade(horn, -0.25) });
      glowPart(R, 'hand' + s, new THREE.OctahedronGeometry(0.03, 0), glow, 0, -0.035, 0.085, 0.26);
      R.P('shin' + s).cyl(0.115 * b, 0.105 * b, 0.07, fur, { y: -0.03 }, 8);
      R.P('arm' + s).cyl(0.085 * b, 0.085 * b, 0.035, cop, { y: -0.2 }, 8);
    }
    hairCap(H, L.hair, Math.PI * 0.5, -0.25);
    H.box(0.2, 0.12, 0.44, L.hair, { y: 0.56, z: -0.03, c2: shade(L.hair, 0.3), sh: 0.8 }).sph(0.085, L.hair, { y: 0.44, z: -0.3, sy: 1.5 });
    for (const k of [-1, 1]) H.box(0.085, 0.022, 0.03, shade(L.hair, -0.2), { x: k * 0.1, y: 0.375, z: 0.25, rz: -k * 0.22 });
    return { style: 'brawl' };
  },
};
/* ---------- the Stormhorn: Halvar's second form, a ram the size of a cart ----------
   A rig of its own (rbody, rneck, rhead, rtail, four legs each with a shin), built from his look like the man is and drawn with the
   same material, so that whatever fades or lights the man does the same to the ram. The view swaps the two (ramSwap). */
const RAM_SC = 1.22;
function buildRam(L) {
  const fur = L.fleece || '#a9a4bc', hide = L.hide || '#3a4256', horn = L.horn || '#d8cfe8', glow = L.wglow || L.glow || '#b9a8ff', hoof = '#22222a';       // (fleece: a storm cloud's colour, not the cream of the sheepskin he wears as a man)
  const pb = {}, B = {}, P = n => pb[n] || (pb[n] = new PB()), nb = (n, x, y, z, p) => (B[n] = bone(n, x, y, z, p)), root = new THREE.Group();
  nb('rbody', 0, 1.02, 0, root); nb('rneck', 0, 0.2, 0.62, B.rbody); nb('rhead', 0, 0.34, 0.3, B.rneck); nb('rtail', 0, 0.2, -0.86, B.rbody);
  for (const [n, x, z] of [['rFL', 0.33, 0.52], ['rFR', -0.33, 0.52], ['rBL', 0.33, -0.56], ['rBR', -0.33, -0.56]]) { nb(n, x, -0.18, z, B.rbody); nb(n + 's', 0, -0.42, 0, B[n]); }
  // the barrel of him: hide underneath, a great fleece over the back, a ruff over the shoulders
  P('rbody').sph(0.5, hide, { sx: 0.92, sy: 0.82, sz: 1.72, c2: shade(hide, 0.2), sh: 0.75 }, 12, 9).sph(0.56, fur, { y: 0.14, z: -0.05, sx: 0.98, sy: 0.74, sz: 1.5, c2: shade(fur, -0.2), sh: 0.78 }, 12, 9);
  for (let i = 0; i < 7; i++) { const a = i * 2.4; P('rbody').sph(0.24 + (i % 3) * 0.03, fur, { x: Math.sin(a) * 0.3, y: 0.36 + Math.cos(a * 1.7) * 0.06, z: -0.75 + i * 0.25, c2: shade(fur, -0.16), sh: 0.82 }, 8, 6); }
  P('rbody').sph(0.46, fur, { y: 0.12, z: 0.62, sx: 1.05, sy: 0.95, sz: 0.8, c2: shade(fur, -0.2), sh: 0.8 }, 10, 8);
  // neck and head: a long dark face with a pale blaze down it, ears, and the horns: each a heavy curl out from the brow, back, down and round to point forward again
  P('rneck').cyl(0.24, 0.32, 0.56, fur, { y: 0.12, z: 0.12, rx: 0.75, c2: shade(fur, -0.2), sh: 0.8 }, 9);
  P('rhead').box(0.42, 0.4, 0.56, hide, { y: 0.02, z: 0.12, c2: shade(hide, 0.25), sh: 0.8 }).box(0.3, 0.27, 0.34, shade(hide, -0.15), { y: -0.1, z: 0.5, rx: 0.25 }).box(0.12, 0.05, 0.5, shade(fur, 0.35), { y: 0.23, z: 0.2 }).box(0.2, 0.05, 0.05, hoof, { y: -0.1, z: 0.615 });
  for (const k of [-1, 1]) {
    P('rhead').box(0.16, 0.06, 0.1, hide, { x: k * 0.27, y: 0.0, z: -0.14, rz: k * 0.5 });
    P('rhead').tor(0.36, 0.125, horn, { x: k * 0.4, y: 0.02, z: -0.1, ry: HP2, rz: -Math.PI * 0.75, c2: shade(horn, -0.32), sh: 0.68 }, 7, 16, Math.PI * 1.5);
    P('rhead').cone(0.12, 0.34, horn, { x: k * 0.4, y: 0.02 - 0.36 * 0.707 + 0.12, z: -0.1 + 0.36 * 0.707 + 0.12, rx: 0.785, c2: shade(horn, 0.2) }, 6);
    P('rhead').sph(0.16, horn, { x: k * 0.3, y: 0.24, z: 0.0, c2: shade(horn, -0.2) }, 7, 5);
  }
  for (const n of ['rFL', 'rFR', 'rBL', 'rBR']) { P(n).cyl(0.22, 0.155, 0.46, fur, { y: -0.2, c2: shade(fur, -0.25), sh: 0.75 }, 8); P(n + 's').cyl(0.135, 0.115, 0.4, hide, { y: -0.2 }, 7).cyl(0.145, 0.165, 0.1, hoof, { y: -0.4 }, 7); }
  P('rtail').sph(0.13, fur, { sy: 1.4, c2: shade(fur, -0.2) }, 7, 5);
  for (const k in pb) { const m = pb[k].mesh(GX.mat.vc); m.userData.cm = 1; B[k].add(m); }
  // the storm in him: his eyes, the shard in his breast, a seam of light along each horn, a glow at each hoof
  const gp = (bn, geo, x, y, z, hs) => { const m = new THREE.Mesh(geo, glowMat(glow)); m.position.set(x, y, z); B[bn].add(m); if (hs) { const h = halo(glow, hs, 0.7); h.position.copy(m.position); B[bn].add(h); } return m; };
  for (const k of [-1, 1]) { gp('rhead', new THREE.SphereGeometry(0.04, 6, 5), k * 0.215, 0.09, 0.34, 0.24); gp('rhead', new THREE.TorusGeometry(0.36, 0.026, 4, 14, Math.PI * 1.2), k * 0.535, 0.02, -0.1, 0).rotation.set(0, HP2, -Math.PI * 0.6, 'XYZ'); }
  gp('rbody', new THREE.OctahedronGeometry(0.11, 0), 0, -0.1, 0.84, 0.75).scale.set(0.8, 1.25, 0.55);
  for (const n of ['rFLs', 'rFRs', 'rBLs', 'rBRs']) gp(n, new THREE.TorusGeometry(0.165, 0.02, 4, 10), 0, -0.34, 0, 0).rotation.x = HP2;
  if (L.stars) {       // the Starherd's ram: stars caught all through the fleece, and along each flank the four of the Ram joined by a line of light
    const st = (bn, x, y, z, r, hex, hs) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), glowMat(hex)); m.position.set(x, y, z); B[bn].add(m); if (hs) { const h = halo(hex, hs, 0.7); h.position.set(x, y, z); B[bn].add(h); } return m; }, a2 = L.acc || glow;
    for (let i = 0; i < 16; i++) { const a = i * 2.399963, v = (i + 0.5) / 16, th = 0.25 + v * 1.25, px = Math.sin(th) * Math.cos(a) * 0.56 * 0.98, py = 0.14 + Math.cos(th) * 0.56 * 0.74, pz = -0.05 + Math.sin(th) * Math.sin(a) * 0.56 * 1.5; st('rbody', px * 1.04, py + 0.02, pz * 1.02, i % 4 === 0 ? 0.03 : 0.018, i % 4 === 0 ? '#ffffff' : i % 4 === 2 ? a2 : glow, i % 4 === 0 ? 0.22 : 0); }
    for (const k of [-1, 1]) { const pts = [[-0.5, 0.02], [-0.16, 0.14], [0.2, 0.2], [0.52, 0.4]], X = z => k * (0.56 * 0.98 * Math.sqrt(Math.max(0.05, 1 - Math.pow((z + 0.05) / 0.84, 2))) + 0.015);
      pts.forEach((q, i) => st('rbody', X(q[0]) * (1 - Math.abs(q[1] - 0.14) * 0.5), q[1], q[0], i === 2 ? 0.045 : 0.03, i === 2 ? '#ffffff' : glow, i === 2 ? 0.34 : 0.14));
      for (let i = 0; i < 3; i++) { const p0 = pts[i], p1 = pts[i + 1], x0 = X(p0[0]) * (1 - Math.abs(p0[1] - 0.14) * 0.5), x1 = X(p1[0]) * (1 - Math.abs(p1[1] - 0.14) * 0.5), dz = p1[0] - p0[0], dy = p1[1] - p0[1], dx = x1 - x0, m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 1), glowMat(a2)); m.scale.z = Math.hypot(dx, dy, dz); m.position.set((x0 + x1) / 2, (p0[1] + p1[1]) / 2, (p0[0] + p1[0]) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, dy, dz).normalize()); B.rbody.add(m); } }
    st('rhead', 0, 0.36, 0.04, 0.05, '#ffffff', 0.5).scale.set(0.6, 1.5, 0.6);       // one bright one riding between the horns
  }
  return root;
}
function ramInstance(key, skin, mat) {
  const tk = key + (skin | 0); TPL.ram = TPL.ram || {};
  if (!TPL.ram[tk]) TPL.ram[tk] = buildRam(heroLook(key, skin | 0));
  const o = TPL.ram[tk].clone(true); o.traverse(x => { if (x.isMesh && x.userData.cm) { x.material = mat; x.castShadow = true; } });
  return { o, b: bonesOf(o) };
}
/* s: what animHero is given; u: the hero himself (for where in a leap he is) */
function animRam(v, u, s, t, dt) {
  const B = v.rb, on = s.moving || s.dash; v.rRun = (v.rRun || 0) + ((on ? 1 : 0) - (v.rRun || 0)) * Math.min(1, dt * 10);
  if (on) v.rWalk = (v.rWalk || 0) + dt * s.speed * (s.dash ? 4.2 : 2.5);
  const rk = v.rRun, w = v.rWalk || 0, sw = Math.sin(w), cw = Math.cos(w);
  let by = 1.02 + Math.abs(cw) * 0.07 * rk + Math.sin(t * 1.8 + v.seed) * 0.012, bz = 0, bx = 0.05 * sw * rk, neck = -0.1 + 0.05 * Math.sin(t * 1.3 + v.seed), head = 0.12 - 0.08 * sw * rk, hy = Math.sin(t * 0.7 + v.seed) * 0.14 * (1 - rk), fl = sw * 0.75 * rk, bl = -sw * 0.75 * rk, tuck = 0;
  const A = s.atk;
  if (A >= 0) { const q = tri(A, 0, -1, 1), av = v.av || 0;       // a butt: back on his haunches, then the whole of him forward behind his horns; a hook of the horns from one side across to the other; and up on his hind legs to come down on them
    if (av === 1) { bz += q > 0 ? q * 0.22 : q * 0.1; neck += 0.35 * Math.abs(q); head += 0.3 * Math.abs(q); hy = -q * 0.85; bx += Math.abs(q) * 0.06; }
    else if (av === 2) { const up = q < 0 ? -q : 0, dn = q > 0 ? q : 0; bx += -0.55 * up + 0.22 * dn; by += 0.2 * up - 0.05 * dn; fl += -0.9 * up + 0.25 * dn; neck += -0.2 * up + 0.5 * dn; head += 0.45 * dn; bz += 0.3 * dn; }
    else { bz += q > 0 ? q * 0.36 : q * 0.15; neck += q > 0 ? q * 0.5 : q * 0.34; head += q > 0 ? q * 0.6 : q * 0.2; bx += q > 0 ? q * 0.1 : q * 0.08; } }
  let pawF = 0; if (v.idW > 0 && !on) { const T = v.idle - IDLE_AT, u = (T % 6) / 6, gz = v.idW * win(u, 0.08, 0.5, 0.08), pw = v.idW * win(u, 0.58, 0.95, 0.05);       // standing idle: his head down to the ground as if to graze, a shake of it, and a forefoot scraped back along the ground
    neck += 0.75 * gz; head += 0.5 * gz; hy += gz * 0.5 * Math.sin(T * 14) * win(u, 0.3, 0.46, 0.03); pawF = pw * (0.5 + 0.5 * Math.sin(seg01(u, 0.6, 0.93) * Math.PI * 6)); neck += 0.3 * pw; head += 0.2 * pw; }
  if (s.dash) { neck += 0.55; head += 0.5; bx += 0.12; }       // the charge: head down, horns first
  if (s.leap) { const k = clamp(u.leap ? u.leap.t / u.leap.dur : 1, 0, 1); bx += lerp(-0.6, 0.8, smooth(k)); tuck = Math.sin(k * Math.PI) * 0.8; neck += lerp(-0.3, 0.6, k); head += lerp(-0.2, 0.55, k); }
  if (v.rClip > 0) { v.rClip -= dt / 0.62; const k = 1 - Math.max(0, v.rClip), q = Math.sin(Math.min(1, k * 1.5) * Math.PI);       // the bellow: up off his forefeet, head thrown out
    bx -= 0.3 * q; by += 0.13 * q; neck -= 0.4 * q; head -= 0.3 * q; fl -= 0.55 * q; }
  if (s.stun && !s.air) { head += 0.6; neck += 0.35; hy = Math.sin(t * 9) * 0.25; }
  if (s.air) { tuck = 0.6; bx += Math.sin(s.air * Math.PI) * 0.5; }
  if (s.recall > 0) { by -= 0.32; tuck = Math.max(tuck, 0.85); neck += 0.3; head += 0.3; }
  B.rbody.position.set(0, by, bz); B.rbody.rotation.x = bx; B.rneck.rotation.x = neck; B.rhead.rotation.set(head, hy, 0);
  const leg = (n, a) => { const f = n[1] === 'F' ? 1 : -1; B[n].rotation.x = a * (1 - tuck) - 0.9 * tuck * f; B[n + 's'].rotation.x = f * (Math.max(0, -a * f) * 0.9 * (1 - tuck) + 1.5 * tuck); };
  leg('rFL', fl - pawF * 0.75); leg('rFR', fl * 0.8 + 0.14 * cw * rk); leg('rBL', bl); leg('rBR', bl * 0.8 - 0.14 * cw * rk);
  B.rtail.rotation.x = -0.5 + Math.sin(t * 3 + v.seed) * 0.2 + rk * 0.5;
  if (v.ramK > 0 && v.ramK < 1) { v.ramK = Math.min(1, v.ramK + dt / 0.3); const e = v.ramK; v.o.scale.setScalar(v.sc * (v.big || 1) * RAM_SC * (0.55 + 0.45 * e + 0.22 * Math.sin(e * Math.PI))); }       // he swells into it
}
/* man to ram and back: the view's model (v.o) is whichever he is, so everything that turns, scales, fades or ghosts "the model"
   does it to the right one; what the tall grass does to a model is kept per model. */
function ramSwap(v, f) {
  const first = v.form === undefined; v.form = f; if (!v.oMan) v.oMan = v.o;
  if (f && !v.oRam) { const r = ramInstance(v.key, v.skin, v.mat); v.oRam = r.o; v.rb = r.b; v.oRam.visible = false; v.root.add(v.oRam); }
  if (first && !f) return;
  const gh = v.gh; if (gh) heroBush(v, false);
  if (v.o === v.oRam) v.preRam = v.pre; else v.preMan = v.pre;
  v.o.visible = false; v.o = f ? v.oRam : v.oMan; v.o.visible = true; v.pre = (f ? v.preRam : v.preMan) || null; v.o.rotation.y = v.face || 0;
  v.ramS = f ? RAM_SC : 1; v.ramK = f ? 0.001 : 0; v.rClip = 0; v.o.scale.setScalar(v.sc * (v.big || 1) * (f ? RAM_SC * 0.55 : 1));
  v.top0 = (f ? 3.2 : 2.78) + v.hover; v.top = v.top0 * (0.12 + 0.88 * (v.big || 1));
  if (gh) heroBush(v, true);
}
/* where the long gun's muzzle is in the world right now (a hero whose weapon lies along its hand's z) */
const _mz = new THREE.Vector3();
function muzzleOf(v) { return v.b.wpnR.localToWorld(_mz.set(0, 0.04, 1.16)); }
/* ---------- skins: extra pieces bolted onto the rig ---------- */
const SKIN_PARTS = {
  pauldrons(R, L) { const T = R.P('spine'), sx = 0.235 * R.b + 0.1, c = L.trim, c2 = shade(c, 0.4);
    for (const k of [-1, 1]) T.sph(0.19, shade(c, -0.25), { x: k * sx, y: 0.54, sy: 0.72, c2: c, sh: 0.8 }).cone(0.065, 0.3, c2, { x: k * (sx + 0.07), y: 0.71, rz: -k * 0.5 }, 5).cone(0.05, 0.22, c2, { x: k * (sx + 0.17), y: 0.6, rz: -k * 1.1 }, 5); },
  plume(R, L) { const c = L.acc || L.trim; for (const [y, z, k, rx] of [[0.84, -0.02, 1, -0.45], [0.76, -0.2, 0.8, -0.95], [0.62, -0.33, 0.62, -1.4]]) glowPart(R, 'head', new THREE.ConeGeometry(0.085 * k, 0.4 * k, 5), c, 0, y, z, k === 1 ? 0.9 : 0).rotation.x = rx; },
  shards(R, L) { const c = L.glow || L.trim; R.nb('skorb', 0, 1.12, 0, R.B.body);
    for (let i = 0; i < 4; i++) glowPart(R, 'skorb', new THREE.OctahedronGeometry(0.075, 0), c, Math.cos(i * HP2) * 0.64, i % 2 ? 0.14 : -0.1, Math.sin(i * HP2) * 0.64, i % 2 ? 0 : 0.55).scale.y = 1.9; },
  visor(R, L) { glowPart(R, 'head', new THREE.BoxGeometry(0.36, 0.055, 0.05), L.trim, 0, 0.315, 0.25, 0.6); },
  spines(R, L) { const T = R.P('spine'), c = L.trim; for (let i = 0; i < 3; i++) T.cone(0.055 - i * 0.008, 0.3 - i * 0.05, c, { y: 0.56 - i * 0.17, z: -0.16 * R.b - 0.08, rx: -1.25 - i * 0.2, c2: shade(c, 0.4) }, 4); },
  banner(R, L) { const T = R.P('spine'), c = L.cape || L.body, z = -0.14 * R.b - 0.07;
    T.cyl(0.018, 0.018, 1.1, '#3a2a1c', { y: 0.82, z }, 5).sph(0.04, L.trim, { y: 1.39, z }, 6, 5).box(0.32, 0.5, 0.02, c, { x: 0.17, y: 1.1, z, c2: shade(c, 0.3), sh: 0.7 }).box(0.32, 0.05, 0.026, L.trim, { x: 0.17, y: 1.33, z }).oct(0.07, L.trim, { x: 0.17, y: 1.08, z: z + 0.012, sz: 0.25 }); },
  gem(R, L) { glowPart(R, 'spine', new THREE.OctahedronGeometry(0.068, 0), L.glow || L.trim, 0, 0.33, 0.165 * R.b + 0.035, 0.5); },
  scarf(R, L) { const c = L.acc || L.trim; R.P('spine').tor(0.13, 0.05, c, { y: 0.53, rx: HP2 }, 5, 10); R.nb('scarf', 0.07, 0.52, -0.125 * R.b - 0.03, R.B.spine);
    strip(R, 'scarf', 0.15, 0.5, 0.03, c, { c2: shade(c, 0.3), sh: 0.75 }); strip(R, 'scarf', 0.13, 0.34, 0.028, shade(c, -0.15), { x: 0.02, rz: 0.08, y0: 0.47 }); },
  halo(R, L) { const c = L.glow || L.trim; glowPart(R, 'head', new THREE.TorusGeometry(0.37, 0.02, 5, 28), c, 0, 0.34, -0.22, 1.3);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; glowPart(R, 'head', new THREE.ConeGeometry(0.025, 0.12, 4), c, Math.cos(a) * 0.47, 0.34 + Math.sin(a) * 0.47, -0.22, 0).rotation.z = a - HP2; } },
  crown(R, L) { const H = R.P('head'), c = L.trim; H.tor(0.2, 0.024, c, { y: 0.5, rx: HP2 - 0.2 }, 5, 14); for (let i = 0; i < 5; i++) { const a = HP2 + (i - 2) * 0.5, d = Math.abs(i - 2) * 0.025; H.cone(0.034, 0.14 - d, c, { x: Math.cos(a) * 0.2, y: 0.585 - d, z: Math.sin(a) * 0.2 + 0.03 }, 4); } },
  horns(R, L) { const H = R.P('head'), c = L.trim; for (const k of [-1, 1]) H.cone(0.07, 0.26, shade(c, -0.3), { x: k * 0.25, y: 0.54, rz: -k * 0.75, c2: c }, 5).cone(0.045, 0.2, c, { x: k * 0.37, y: 0.68, rz: -k * 0.15 }, 5); },
  antlers(R, L) { const H = R.P('head'), c = '#8a6a48'; for (const k of [-1, 1]) { H.cyl(0.02, 0.03, 0.34, c, { x: k * 0.2, y: 0.68, rz: -k * 0.42 }, 5).cyl(0.014, 0.02, 0.2, c, { x: k * 0.33, y: 0.76, rz: -k * 1.15 }, 5).cyl(0.014, 0.018, 0.18, c, { x: k * 0.24, y: 0.89, rz: k * 0.25 }, 5); for (const [x, y] of [[0.42, 0.8], [0.22, 0.99], [0.29, 0.86]]) H.sph(0.035, L.trim, { x: k * x, y }, 5, 4); } },
  /* the Eclipse set: a black sun at the back, four blades that hang in the air behind the shoulders, and the trimmings */
  corona(R, L) {
    const c = L.trim; R.nb('corona', 0, 0.62, -0.34, R.B.spine); R.nb('rays', 0, 0, 0, R.B.corona);
    R.P('corona').cyl(0.4, 0.4, 0.03, '#050308', { rx: HP2 }, 24);       // the dark disc
    glowPart(R, 'corona', new THREE.TorusGeometry(0.42, 0.028, 5, 36), c, 0, 0, 0, 0);
    R.B.rays.add(new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.15), fxMat(c, 0.85, { map: GX.tex.corona })));       // its glow and flares: a ring, so the disc itself stays black from either side
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, len = i % 3 === 0 ? 0.36 : i % 3 === 1 ? 0.16 : 0.24, m = glowPart(R, 'rays', new THREE.ConeGeometry(0.03, len, 4), i % 3 ? L.acc || c : c, Math.cos(a) * (0.47 + len / 2), Math.sin(a) * (0.47 + len / 2), 0, 0); m.rotation.z = a - HP2; m.scale.z = 0.3; }
  },
  wingblades(R, L) {
    const c = L.trim; R.nb('wings', 0, 1.36, -0.36, R.B.body);
    for (let i = 0; i < 4; i++) {
      const k = i < 2 ? -1 : 1, hi = i % 2, n = 'wb' + i; R.nb(n, k * (0.3 + hi * 0.12), hi ? 0.2 : -0.08, 0, R.B.wings); R.B[n].userData.k = k; R.B[n].userData.hi = hi;
      const len = hi ? 1.0 : 0.78;       // a long leaf of a blade: broad at the shoulder, drawn to a point, one edge alight
      R.P(n).cone(0.13, len, '#0d0916', { y: len / 2 + 0.06, sz: 0.16, c2: shade(L.body, 0.3), sh: 0.75 }, 4).cone(0.13, 0.16, '#0d0916', { y: -0.02, rx: Math.PI, sz: 0.16 }, 4).oct(0.05, L.belt || c, { y: 0.06, sz: 0.7 });
      const ed = glowPart(R, n, new THREE.ConeGeometry(0.02, len * 0.92, 3), c, -k * 0.055, len / 2 + 0.05, 0, 0); ed.rotation.z = -k * 0.068; glowPart(R, n, new THREE.OctahedronGeometry(0.04, 0), L.acc || c, 0, 0.06, 0.03, hi ? 0.45 : 0);
    }
  },
  eclipsed(R, L) {
    const T = R.P('spine'), H = R.P('head'), c = L.trim, sx = 0.235 * R.b + 0.08;
    glowPart(R, 'head', new THREE.BoxGeometry(0.27, 0.03, 0.04), L.acc || c, 0, 0.335, 0.283, 0.7);       // a burning slit across the two eyes
    for (const k of [-1, 1]) { T.cone(0.08, 0.34, '#0d0916', { x: k * sx, y: 0.6, rz: -k * 0.55, c2: c, sh: 0.6 }, 5).cone(0.055, 0.24, '#0d0916', { x: k * (sx + 0.1), y: 0.5, rz: -k * 1.15, c2: c, sh: 0.6 }, 5); H.cone(0.05, 0.3, c, { x: k * 0.17, y: 0.66, z: -0.06, rz: -k * 0.4, rx: -0.25, c2: '#fff3d0' }, 4); }
    T.tor(0.11, 0.022, c, { y: 0.33, z: 0.158, sz: 0.3 }, 5, 16); glowPart(R, 'spine', new THREE.SphereGeometry(0.05, 8, 6), L.acc || c, 0, 0.33, 0.172, 0.6);       // a ringed sun on the chest
    for (const s of ['L', 'R']) R.P('fore' + s).cyl(0.075, 0.07, 0.11, c, { y: -0.17, c2: shade(c, 0.4) }, 8);
    strip(R, 'cape', 0.1, 0.9, 0.02, '#0a0712', { x: -0.22, rz: 0.2, c2: c, sh: 0.6 }); strip(R, 'cape', 0.1, 0.8, 0.02, '#0a0712', { x: 0.22, rz: -0.22, c2: c, sh: 0.6 }); strip(R, 'cape', 0.09, 1.0, 0.02, '#0a0712', { c2: L.acc || c, sh: 0.55 });
  },
  starhalo(R, L) {       // a tilted ring of light behind the head and shoulders, five stars riding round it
    const c = L.trim, a2 = L.acc || c; R.nb('corona', 0, 0.74, -0.3, R.B.spine); R.nb('rays', 0, 0, 0, R.B.corona); R.B.corona.rotation.x = -0.3;
    glowPart(R, 'corona', new THREE.TorusGeometry(0.5, 0.012, 4, 44), c, 0, 0, 0, 0); glowPart(R, 'corona', new THREE.TorusGeometry(0.4, 0.006, 4, 36), a2, 0, 0, 0, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3, m = glowPart(R, 'rays', new THREE.OctahedronGeometry(0.07, 0), i % 2 ? a2 : '#ffffff', Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0, i % 2 ? 0.3 : 0.5); m.scale.set(0.45, 1.5, 0.3); m.rotation.z = a - HP2; }
  },
  cometcape(R, L) {       // two long streamers from the shoulders, dark at the root and bright at the tip
    const c = L.trim, v = L.cape; R.nb('wtail', 0, 0.5, -0.17, R.B.spine);
    for (const k of [-1, 1]) { strip(R, 'wtail', 0.15, 1.15, 0.02, c, { x: k * 0.17, rz: k * 0.16, c2: shade(v, -0.25), sh: 1 }); const [Q, y] = onStrip(R, 'wtail', 1.24); Q.cone(0.075, 0.2, c, { x: k * 0.265, y, rx: Math.PI, sz: 0.2 }, 4);
      const seg = R.ch.wtail, sn = Math.sin(k * 0.16); for (let i = 0; i < CLOTH_N; i++) { const e = glowPart(R, i ? 'wtail' + i : 'wtail', new THREE.BoxGeometry(0.014, seg, 0.014), c, k * 0.255 + sn * ((i + 0.5) * seg - 0.575), -seg / 2, -0.012, 0); e.rotation.z = k * 0.16; } }
  },
  constellation(R, L) {       // stars pinned across chest and shoulders, joined by lines of light
    const c = L.trim, a2 = L.acc || c, b = R.b, pts = [[-0.17, 0.44], [-0.05, 0.3], [0.1, 0.38], [0.16, 0.2], [0.0, 0.12]];
    pts.forEach((q, i) => glowPart(R, 'spine', new THREE.OctahedronGeometry(i === 2 ? 0.034 : 0.024, 0), i === 2 ? '#ffffff' : c, q[0], q[1], 0.168 * b, i === 2 ? 0.4 : 0));
    for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i], p1 = pts[i + 1], dx = p1[0] - p0[0], dy = p1[1] - p0[1], m = glowPart(R, 'spine', new THREE.BoxGeometry(0.008, Math.hypot(dx, dy), 0.004), c, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0.164 * b, 0); m.rotation.z = Math.atan2(-dx, dy); }
    glowPart(R, 'spine', new THREE.OctahedronGeometry(0.06, 0), a2, -0.31 * b, 0.62, 0, 0.45);
    for (const s of ['L', 'R']) { R.P('fore' + s).cyl(0.078 * b, 0.072 * b, 0.12, shade(L.body, 0.2), { y: -0.14, c2: c, sh: 0.4 }, 8); R.P('shin' + s).cyl(0.105 * b, 0.1 * b, 0.03, c, { y: -0.03 }, 8); }
  },
  starherd(R, L) {       // the Ram's stars across his chest, joined by lines of light; more of them caught in the fleece on his shoulders and back; a sickle moon for a clasp at his throat
    const c = L.trim, a2 = L.acc || c, b = R.b, zf = 0.158 * b + 0.03, pts = [[-0.15, 0.2], [-0.04, 0.27], [0.08, 0.3], [0.17, 0.42]];
    pts.forEach((q, i) => glowPart(R, 'spine', new THREE.OctahedronGeometry(i === 2 ? 0.036 : 0.024, 0), i === 2 ? '#ffffff' : c, q[0] * b, q[1], zf, i === 2 ? 0.36 : 0));
    for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i], p1 = pts[i + 1], dx = (p1[0] - p0[0]) * b, dy = p1[1] - p0[1], m = glowPart(R, 'spine', new THREE.BoxGeometry(0.008, Math.hypot(dx, dy), 0.004), a2, (p0[0] + p1[0]) / 2 * b, (p0[1] + p1[1]) / 2, zf - 0.004, 0); m.rotation.z = Math.atan2(-dx, dy); }
    for (const [x, y, z, k] of [[-0.27, 0.56, 0.06, 1], [0.29, 0.53, -0.04, 0], [0.24, 0.6, 0.08, 0], [-0.12, 0.44, -0.2, 0], [0.1, 0.3, -0.21, 1], [-0.04, 0.2, -0.2, 0], [0.16, 0.5, -0.17, 0], [-0.2, 0.3, -0.16, 0]]) glowPart(R, 'spine', new THREE.OctahedronGeometry(k ? 0.024 : 0.016, 0), k ? '#ffffff' : c, x * b, y, z * b - (z < 0 ? 0.03 : 0), k ? 0.2 : 0);
    const m = glowPart(R, 'spine', new THREE.TorusGeometry(0.055, 0.014, 4, 12, Math.PI * 1.25), c, 0, 0.5, 0.17 * b + 0.05, 0.3); m.rotation.z = 2.2;
    for (const s of ['L', 'R']) R.P('shin' + s).cyl(0.118 * b, 0.108 * b, 0.02, c, { y: -0.075 }, 8);
  },
  ruff(R, L) { R.P('spine').tor(0.2, 0.075, '#f4f7fa', { y: 0.5, rx: HP2, c2: '#ffffff' }, 6, 12); for (const k of ['L', 'R']) R.P('fore' + k).tor(0.075 * R.b, 0.035, '#f4f7fa', { y: -0.2, rx: HP2 }, 5, 8); },
};
function wglow(R, key, c) {      // a glowing edge on the hero's weapon
  const slab = (bn, y, len, w) => glowPart(R, bn, new THREE.BoxGeometry(w || 0.03, len, 0.036), c, 0, y, 0, 0);
  const aura = (bn, y, k, z) => { const h = halo(c, k, 0.7); h.position.set(0, y, z || 0); R.B[bn].add(h); };
  if (key === 'kaela') { slab('wpnR', 0.5, 0.72); aura('wpnR', 0.6, 0.9); }
  else if (key === 'vex' && R.look.crescent) for (const k of ['L', 'R']) { const m = glowPart(R, 'wpn' + k, new THREE.TorusGeometry(0.25, 0.022, 4, 14, Math.PI * 0.95), c, 0.2, 0.32, 0, 0); m.rotation.z = 1.25; m.scale.z = 0.5; aura('wpn' + k, 0.4, 0.55); }
  else if (key === 'vex') for (const k of ['L', 'R']) { slab('wpn' + k, 0.28, 0.34, 0.026); aura('wpn' + k, 0.32, 0.6); }
  else if (key === 'tavi') for (const k of ['L', 'R']) { glowPart(R, 'wpn' + k, new THREE.TorusGeometry(0.24, 0.014, 4, 22), c, 0, 0.06, 0, 0); aura('wpn' + k, 0.06, 0.75); }
  else if (key === 'rook') { glowPart(R, 'wpnR', new THREE.BoxGeometry(0.44, 0.07, 0.3), c, 0, 0.84, 0, 1.2); glowPart(R, 'wpnR', new THREE.BoxGeometry(0.1, 0.3, 0.3), c, 0, 0.84, 0, 0); }
  else if (key === 'bram') glowPart(R, 'wpnR', new THREE.TorusGeometry(0.135, 0.022, 5, 14), c, 0, 0.58, 0, 1.0).rotation.x = HP2;
  else if (key === 'thorn') glowPart(R, 'wpnR', new THREE.TorusGeometry(0.16, 0.047, 5, 12, 4.3), c, 0, 0.74, 0, 0.9).rotation.z = -0.6;
  else if (key === 'hesta') { glowPart(R, 'wpnL', new THREE.TorusGeometry(0.445, 0.018, 5, 28), c, 0, -0.11, 0.05, 0).rotation.x = HP2; aura('wpnL', -0.16, 0.9, 0.05); }       // the rim of the gong alight
  else if (key === 'orin') { aura('wpnR', 0.46, 1.0); aura('wpnR', 0.86, 0.5); }       // his leaf already carries a vein of light: a skin makes the whole blade glow
  else if (key === 'sorrel') { glowPart(R, 'wpnR', new THREE.BoxGeometry(0.012, 0.012, 0.86), c, 0, 0.072, 0.68, 0); const h = halo(c, 0.7, 0.7); h.position.set(0, 0.04, 1.14); R.B.wpnR.add(h); }       // a line of light along the barrel, a glow at its mouth
  else if (key === 'mira') { const hf = 0.6; glowPart(R, 'wpnL', new THREE.BoxGeometry(0.016, hf * 2.04, 0.016), c, 0, 0, -0.21, 0); for (const k of [-1, 1]) aura('wpnL', k * hf * 1.02, 0.45, -0.21); }
}
function buildHeroTemplate(key, skin) {
  const L = heroLook(key, skin), sk = SKINS[key][skin | 0] || {}, bulk = { bram: 1.28, thorn: 1.26, kaela: 0.95, rook: 1.34, vex: 0.9, kiri: 0.86, tavi: 1.02, lyra: 0.9, zephyr: 0.92, orin: 1.0, mira: 0.92, sera: 0.9, miel: 0.92, hesta: 1.2, sorrel: 0.93, halvar: 1.14, odile: 0.88 }[key] || 1;
  const R = mkRig(bulk); R.look = L; const info = HERO_BUILD[key](R, L);
  for (const n of sk.parts || []) SKIN_PARTS[n](R, L);
  if (L.wglow) wglow(R, key, L.wglow);
  if (info.wl != null) R.B.wpnL.rotation.x = info.wl; if (info.wr != null) R.B.wpnR.rotation.x = info.wr;
  finishRig(R);
  R.root.userData.info = { style: sk.style || info.style, hover: sk.hover || info.hover || 0, stride: sk.stride != null ? sk.stride : info.stride == null ? 1 : info.stride };
  return R.root;
}
function bonesOf(o) { const b = {}; o.traverse(x => { if (x.name) b[x.name] = x; }); return b; }
function heroInstance(key, skin) {
  const tk = key + (skin | 0);
  if (!TPL.hero[tk]) TPL.hero[tk] = buildHeroTemplate(key, skin | 0);
  const o = TPL.hero[tk].clone(true), mat = charMat(), info = TPL.hero[tk].userData.info;
  o.traverse(x => { if (x.isMesh && x.userData.cm) { x.material = mat; x.castShadow = true; } });
  return { o, b: bonesOf(o), mat, kind: 'hero', key, skin: skin | 0, style: info.style, hover: info.hover, stride: info.stride, hipY: 0.78, walk: 0, runK: 0, seed: Math.random() * 9, alt: 0, clipT: 9, clipDur: 0.4, lastAtk: 0, deadT: 0, face: null, clip: null, clipU: 0, clipD: 1, clipI: 0 };
}

/* ---------- minions ---------- */
function buildMinion(type, team) {
  const tc = teamHex(team), dk = shade(tc, -0.45), root = new THREE.Group(), body = bone('body', 0, 0, 0, root), B = {}, P = {};
  const nb = (n, x, y, z, p) => (B[n] = bone(n, x, y, z, p)), pb = n => P[n] || (P[n] = new PB());
  if (type === 'siege') {
    nb('chassis', 0, 0.3, 0, body); nb('barrel', 0, 0.3, 0.08, B.chassis);
    pb('chassis').box(0.62, 0.26, 0.95, dk, { c2: shade(tc, -0.2) }).box(0.66, 0.07, 0.99, tc, { y: 0.1 }).box(0.5, 0.2, 0.4, '#4a4f57', { y: 0.2, z: -0.12 });
    for (const [x, z] of [[-0.36, 0.3], [0.36, 0.3], [-0.36, -0.3], [0.36, -0.3]]) pb('chassis').cyl(0.2, 0.2, 0.09, '#3a3027', { x, y: -0.1, z, rz: HP2 }, 10).cyl(0.07, 0.07, 0.1, '#8a7a5a', { x, y: -0.1, z, rz: HP2 }, 6);
    pb('barrel').cyl(0.1, 0.14, 0.78, '#3d444c', { z: 0.3, rx: HP2, c2: '#5a626b' }, 10).cyl(0.13, 0.13, 0.09, '#20252b', { z: 0.68, rx: HP2 }, 10).cyl(0.15, 0.15, 0.07, tc, { z: 0.02, rx: HP2 }, 10);
    B.barrel.rotation.x = -0.4;
  } else {
    nb('hips', 0, 0.4, 0, body); nb('armR', -0.22, 0.34, 0, B.hips); nb('armL', 0.22, 0.34, 0, B.hips); nb('legL', 0.085, 0, 0, B.hips); nb('legR', -0.085, 0, 0, B.hips);
    const H = pb('hips');
    if (type === 'melee') {
      H.cyl(0.19, 0.16, 0.36, dk, { y: 0.2, c2: shade(tc, -0.25) }, 8).cyl(0.165, 0.17, 0.06, tc, { y: 0.06 }, 8).box(0.14, 0.2, 0.02, tc, { y: 0.24, z: 0.165 });
      H.sph(0.165, '#d8b79c', { y: 0.54 }, 10, 8).dome(0.18, tc, { y: 0.55 }, Math.PI * 0.52).box(0.04, 0.12, 0.03, tc, { y: 0.56, z: 0.17 });
      for (const k of [-1, 1]) H.sph(0.028, '#1b1b22', { x: k * 0.06, y: 0.53, z: 0.15, sz: 0.5 }, 5, 4);
      pb('armR').cyl(0.055, 0.05, 0.26, dk, { y: -0.12 }, 6).box(0.045, 0.5, 0.018, '#e6ebef', { y: -0.26, z: 0.27, rx: HP2 }).box(0.14, 0.03, 0.04, '#5a4630', { y: -0.26, z: 0.03 });
      pb('armL').cyl(0.055, 0.05, 0.26, dk, { y: -0.12 }, 6).cyl(0.17, 0.17, 0.04, shade(tc, -0.15), { x: 0.06, y: -0.2, z: 0.06, rz: HP2 }, 10).sph(0.05, '#e6ebef', { x: 0.09, y: -0.2, z: 0.06 }, 6, 5);
      for (const s of ['L', 'R']) pb('leg' + s).cyl(0.062, 0.055, 0.32, '#2b2f36', { y: -0.16 }, 6).box(0.1, 0.07, 0.17, '#22252b', { y: -0.36, z: 0.03 });
    } else {
      H.cyl(0.12, 0.25, 0.62, dk, { y: 0.0, c2: shade(tc, -0.2) }, 9).cyl(0.255, 0.26, 0.04, tc, { y: -0.3 }, 9);
      H.sph(0.15, '#191c22', { y: 0.45 }, 8, 6).dome(0.19, shade(tc, -0.3), { y: 0.45, rx: -0.25 }, Math.PI * 0.62).cone(0.09, 0.2, shade(tc, -0.3), { y: 0.6, z: -0.14, rx: -1.9 }, 5);
      pb('armR').cyl(0.05, 0.07, 0.26, dk, { y: -0.12 }, 6).cyl(0.02, 0.022, 0.86, '#6b4f33', { y: -0.24, z: 0.12, rx: 0.35 }, 5);
      pb('armL').cyl(0.05, 0.07, 0.26, dk, { y: -0.12 }, 6);
    }
  }
  for (const k in P) { const m = P[k].mesh(GX.mat.vc); B[k].add(m); }
  if (type === 'ranged') { const g = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), glowMat(shade(tc, 0.35))); g.position.set(0, 0.14, 0.27); B.armR.add(g); const h = halo(tc, 0.5, 0.7); h.position.copy(g.position); B.armR.add(h); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), glowMat(shade(tc, 0.5))); e.position.set(k * 0.05, 0.46, 0.135); B.hips.add(e); } }
  return root;
}

/* ---------- jungle monsters ---------- */
function buildMonster(type, hexOverride) {
  const root = new THREE.Group(), body = bone('body', 0, 0, 0, root), B = { body }, P = {};
  const nb = (n, x, y, z, p) => (B[n] = bone(n, x, y, z, p)), pb = n => P[n] || (P[n] = new PB());
  const glows = [];
  if (type === 'sprite') {
    nb('hips', 0, 0.26, 0, body);
    pb('hips').sph(0.27, '#6f9a4f', { sy: 0.92, c2: '#93c064', sh: 0.7 }, 10, 8).sph(0.2, '#b7dc8a', { y: -0.04, z: 0.1, sy: 0.8 }, 8, 6)
      .cone(0.08, 0.28, '#4f7a38', { x: 0.17, y: 0.27, rz: -0.5, sz: 0.4 }, 5).cone(0.08, 0.28, '#4f7a38', { x: -0.17, y: 0.27, rz: 0.5, sz: 0.4 }, 5)
      .cyl(0.012, 0.012, 0.12, '#4f7a38', { y: 0.3 }, 4).sph(0.05, '#ffd76a', { y: 0.38 }, 6, 5)
      .sph(0.07, '#55793c', { x: 0.13, y: -0.23, z: 0.05, sy: 0.6 }, 6, 5).sph(0.07, '#55793c', { x: -0.13, y: -0.23, z: 0.05, sy: 0.6 }, 6, 5);
    for (const k of [-1, 1]) { pb('hips').sph(0.06, '#fff6c0', { x: k * 0.1, y: 0.06, z: 0.225, sh: 1 }, 7, 6).sph(0.03, '#1b1b22', { x: k * 0.1, y: 0.06, z: 0.275, sh: 1 }, 5, 4); }
  } else if (type === 'skitter') {       // a river crab: wide shell, eyes on stalks, two big claws (armL/armR, so it swings like the golems)
    const sh = '#2f9aa0', sh2 = '#7fe0d0', leg = '#1f6f78', cl = '#ff9a5a';
    nb('hips', 0, 0.3, 0, body); nb('armL', 0.4, 0.06, 0.2, B.hips); nb('armR', -0.4, 0.06, 0.2, B.hips);
    pb('hips').sph(0.4, sh, { sy: 0.5, sz: 0.82, c2: sh2, sh: 0.6 }, 12, 8).sph(0.3, '#e9dcb4', { y: -0.08, sy: 0.4, sz: 0.75 }, 10, 6)
      .cone(0.07, 0.16, sh2, { y: 0.2, z: -0.1 }, 5).cone(0.06, 0.13, sh2, { x: 0.17, y: 0.17, z: -0.05 }, 5).cone(0.06, 0.13, sh2, { x: -0.17, y: 0.17, z: -0.05 }, 5);
    for (const k of [-1, 1]) {
      pb('hips').cyl(0.02, 0.025, 0.2, leg, { x: k * 0.12, y: 0.24, z: 0.24 }, 5).sph(0.055, '#fff6c0', { x: k * 0.12, y: 0.36, z: 0.24, sh: 1 }, 7, 6).sph(0.028, '#1b1b22', { x: k * 0.12, y: 0.37, z: 0.285, sh: 1 }, 5, 4);
      for (let i = 0; i < 3; i++) pb('hips').cyl(0.028, 0.018, 0.34, leg, { x: k * (0.4 + i * 0.03), y: -0.14, z: 0.05 - i * 0.2, rz: k * 0.9 }, 5);
    }
    for (const [s, k] of [['L', 1], ['R', -1]]) pb('arm' + s).cyl(0.045, 0.055, 0.26, leg, { x: k * 0.06, z: 0.1, rx: HP2 }, 6).sph(0.15, cl, { z: 0.3, sy: 0.8, sz: 1.25, c2: '#ffd0a0', sh: 0.6 }, 8, 6).cone(0.06, 0.2, '#ffe6c8', { x: k * 0.05, y: 0.02, z: 0.5, rx: HP2 }, 5).cone(0.045, 0.16, '#ffe6c8', { x: -k * 0.06, y: -0.02, z: 0.46, rx: HP2 }, 5);
    glows.push(['hips', new THREE.OctahedronGeometry(0.07, 0), '#7dffb0', 0, 0.26, -0.02, 1.4, 0.8]);
  } else if (type === 'azure' || type === 'crimson' || type === 'warden') {
    const wd = type === 'warden', c = type === 'azure' ? '#4f9dff' : wd ? '#e9c46a' : '#ff6a4a', st = wd ? '#66704f' : '#69747f', st2 = wd ? '#8f9c68' : '#8a96a2';
    if (wd) root.scale.setScalar(0.9);
    nb('hips', 0, 0.62, 0, body); nb('armL', 0.52, 0.42, 0, B.hips); nb('armR', -0.52, 0.42, 0, B.hips);
    pb('hips').dod(0.46, st, { y: 0.28, sx: 1.12, sz: 0.9, c2: st2, sh: 0.7 }).box(0.5, 0.26, 0.4, '#58626c', { y: -0.1 })
      .box(0.24, 0.42, 0.28, '#58626c', { x: 0.18, y: -0.4 }).box(0.24, 0.42, 0.28, '#58626c', { x: -0.18, y: -0.4 }).dod(0.2, st2, { y: 0.78, z: 0.1, sy: 0.85 });
    for (const s of ['L', 'R']) pb('arm' + s).dod(0.2, st2, {}).box(0.22, 0.46, 0.24, st, { y: -0.34 }).dod(0.19, '#58626c', { y: -0.66 });
    if (wd) {       // overgrown: moss on the shoulders, a pair of bark horns
      pb('hips').sph(0.3, '#4f8a3c', { x: 0.3, y: 0.62, z: -0.05, sy: 0.45, c2: '#7fc064', sh: 0.5 }, 8, 6).sph(0.26, '#4f8a3c', { x: -0.32, y: 0.6, z: -0.08, sy: 0.45, c2: '#7fc064', sh: 0.5 }, 8, 6)
        .cone(0.07, 0.34, '#5a4630', { x: 0.2, y: 1.02, z: 0.06, rz: -0.5 }, 5).cone(0.07, 0.34, '#5a4630', { x: -0.2, y: 1.02, z: 0.06, rz: 0.5 }, 5);
      for (const s of ['L', 'R']) pb('arm' + s).sph(0.17, '#4f8a3c', { y: 0.12, sy: 0.5, c2: '#7fc064' }, 7, 5);
    }
    glows.push(['hips', new THREE.OctahedronGeometry(0.17, 0), c, -0.2, 0.74, -0.2, 1.7, 0.9], ['hips', new THREE.OctahedronGeometry(0.22, 0), c, 0.02, 0.86, -0.26, 2.0, 1.2], ['hips', new THREE.OctahedronGeometry(0.15, 0), c, 0.24, 0.74, -0.18, 1.6, 0],
      ['hips', new THREE.BoxGeometry(0.08, 0.035, 0.02), c, 0.07, 0.8, 0.27, 1, 0], ['hips', new THREE.BoxGeometry(0.08, 0.035, 0.02), c, -0.07, 0.8, 0.27, 1, 0], ['hips', new THREE.OctahedronGeometry(0.09, 0), c, 0, 0.3, 0.41, 1.3, 0.7]);
  } else if (type === 'turtle') {
    nb('hips', 0, 0.42, 0, body); nb('head', 0, 0.02, 0.72, B.hips);
    pb('hips').dome(0.78, '#2f6e73', { y: -0.12, sy: 0.78, c2: '#4f9a96', sh: 0.6 }, HP2, 14, 6).tor(0.76, 0.07, '#7fd0c4', { y: -0.1, rx: HP2 }, 5, 16).cyl(0.74, 0.6, 0.12, '#e3d9b6', { y: -0.2 }, 14)
      .tor(0.45, 0.035, '#7fd0c4', { y: 0.33, rx: HP2 }, 4, 14).cone(0.1, 0.4, '#3d7f5e', { y: -0.12, z: -0.82, rx: -1.9 }, 5);
    for (const [x, z] of [[0.52, 0.42], [-0.52, 0.42], [0.52, -0.42], [-0.52, -0.42]]) pb('hips').cyl(0.15, 0.18, 0.3, '#4a7f58', { x, y: -0.27, z }, 7);
    pb('head').sph(0.25, '#5f9a68', { sz: 1.2, c2: '#7fba80' }, 10, 8).sph(0.19, '#5f9a68', { y: -0.04, z: -0.26 }, 8, 6);
    for (const k of [-1, 1]) pb('head').sph(0.055, '#ffe9a0', { x: k * 0.14, y: 0.1, z: 0.2, sh: 1 }, 6, 5).sph(0.028, '#1b1b22', { x: k * 0.15, y: 0.1, z: 0.245, sh: 1 }, 5, 4);
    glows.push(['hips', new THREE.OctahedronGeometry(0.16, 0), '#8fe6d6', -0.3, 0.42, 0.05, 1.8, 0], ['hips', new THREE.OctahedronGeometry(0.24, 0), '#8fe6d6', 0, 0.56, -0.05, 2.0, 1.6], ['hips', new THREE.OctahedronGeometry(0.16, 0), '#8fe6d6', 0.3, 0.42, 0.05, 1.8, 0], ['hips', new THREE.OctahedronGeometry(0.13, 0), '#8fe6d6', 0.05, 0.36, -0.42, 1.6, 0]);
  } else {   // lord
    const c = hexOverride || '#c070ff', d1 = '#3a2f47', d2 = '#55456a', d0 = '#2a2233';
    nb('hips', 0, 1.2, 0, body); nb('head', 0, 0.98, 0.12, B.hips); nb('armL', 0.92, 0.66, 0, B.hips); nb('armR', -0.92, 0.66, 0, B.hips);
    pb('hips').dod(0.78, d1, { y: 0.36, sx: 1.15, sz: 0.88, c2: d2, sh: 0.65 }).box(0.8, 0.4, 0.6, d0, { y: -0.28 }).box(0.4, 0.78, 0.46, d0, { x: 0.3, y: -0.8 }).box(0.4, 0.78, 0.46, d0, { x: -0.3, y: -0.8 })
      .box(0.5, 0.16, 0.6, d1, { x: 0.3, y: -1.12, z: 0.06 }).box(0.5, 0.16, 0.6, d1, { x: -0.3, y: -1.12, z: 0.06 }).box(0.9, 0.5, 0.2, d2, { y: 0.5, z: 0.6 });
    for (const k of [-1, 1]) pb('hips').cone(0.16, 0.5, '#e8e0cc', { x: k * 0.8, y: 1.0, rz: -k * 0.5 }, 6).cone(0.12, 0.4, '#e8e0cc', { x: k * 0.55, y: 1.02, z: -0.3, rz: -k * 0.3, rx: -0.4 }, 5);
    pb('head').dod(0.32, d0, { sy: 0.92 });
    for (const k of [-1, 1]) pb('head').cone(0.1, 0.36, '#e8e0cc', { x: k * 0.32, y: 0.2, rz: -k * 1.0 }, 6).cone(0.065, 0.36, '#f6f0df', { x: k * 0.52, y: 0.44, rz: -k * 0.2 }, 6);
    for (const s of ['L', 'R']) { pb('arm' + s).dod(0.32, d2, {}).box(0.34, 0.74, 0.36, d1, { y: -0.52 }).dod(0.3, d0, { y: -1.04 }); for (let i = -1; i <= 1; i++) pb('arm' + s).cone(0.06, 0.26, '#e8e0cc', { x: i * 0.13, y: -1.3, z: 0.12, rx: Math.PI - 0.3 }, 5); }
    glows.push(['hips', new THREE.OctahedronGeometry(0.26, 0), c, 0, 0.5, 0.7, 1.5, 2.2], ['head', new THREE.BoxGeometry(0.11, 0.05, 0.02), c, 0.11, 0.02, 0.3, 1, 0], ['head', new THREE.BoxGeometry(0.11, 0.05, 0.02), c, -0.11, 0.02, 0.3, 1, 0],
      ['hips', new THREE.OctahedronGeometry(0.17, 0), c, 0.45, 1.05, -0.35, 1.9, 0], ['hips', new THREE.OctahedronGeometry(0.2, 0), c, -0.4, 1.1, -0.3, 2.0, 0]);
  }
  for (const k in P) B[k].add(P[k].mesh(GX.mat.vcFlat));
  for (const [bn, geo, hex, x, y, z, sy, hs] of glows) { const m = new THREE.Mesh(geo, glowMat(hex)); m.position.set(x, y, z); m.scale.y = sy; B[bn].add(m); if (hs) { const h = halo(hex, hs, 0.6); h.position.set(x, y, z); B[bn].add(h); } }
  return root;
}

/* ---------- structures ---------- */
function crystalMat(hex, ghost) {
  const k = (ghost ? 'cg' : 'c') + hex; return GX.mat[k] || (GX.mat[k] = new THREE.MeshStandardMaterial({ color: lin(hex), emissive: lin(hex), emissiveIntensity: 0.6, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: !!ghost, opacity: ghost ? 0.3 : 1, depthWrite: !ghost }));
}
const PLATE_Y = [1.44, 1.74, 2.04, 2.34];       // gold plating: four bands up a turret's shaft, the topmost the first to go
function buildTurret(team) {
  const tc = teamHex(team), st = '#8b95a1', st2 = '#b4bcc6', dk = '#5d6671', root = new THREE.Group(), pb = new PB();
  pb.cyl(0.8, 0.9, 0.3, dk, { y: 0.15 }, 8).cyl(0.64, 0.74, 0.26, st, { y: 0.43 }, 8).cyl(0.4, 0.56, 2.3, st, { y: 1.7, c2: st2, sh: 0.72 }, 8)
    .cyl(0.5, 0.52, 0.12, tc, { y: 1.2 }, 8).cyl(0.43, 0.45, 0.1, shade(tc, -0.25), { y: 2.2 }, 8).cyl(0.6, 0.42, 0.3, dk, { y: 2.98 }, 8).cyl(0.62, 0.62, 0.1, st2, { y: 3.16 }, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.39; pb.box(0.2, 0.24, 0.14, st, { x: Math.cos(a) * 0.54, y: 3.3, z: Math.sin(a) * 0.54, ry: -a + HP2 }); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785; pb.box(0.2, 0.7, 0.3, dk, { x: Math.cos(a) * 0.62, y: 0.6, z: Math.sin(a) * 0.62, ry: -a + HP2, rx: 0.0 }); pb.box(0.1, 0.3, 0.03, '#2a3038', { x: Math.cos(a + 0.785) * 0.47, y: 1.9, z: Math.sin(a + 0.785) * 0.47, ry: -a - 0.785 + HP2 }); }
  pb.cyl(0.3, 0.42, 0.14, dk, { y: 3.25 }, 8);
  const tower = pb.mesh(GX.mat.vc); tower.name = 'tower'; tower.receiveShadow = false; root.add(tower);
  const pl = bone('plates', 0, 0, 0, root); pl.visible = false;       // shown by animStructure, as many as the turret still wears
  PLATE_Y.forEach((y, i) => {
    const r = 0.56 - (y - 0.55) / 2.3 * 0.16 + 0.05, q = new PB();
    q.cyl(r - 0.008, r + 0.012, 0.25, '#dc9f28', { c2: '#ffd766', sh: 0.85 }, 8).cyl(r + 0.03, r + 0.03, 0.04, '#ffe9a3', { y: 0.127 }, 8).cyl(r + 0.036, r + 0.036, 0.04, '#c08a22', { y: -0.127 }, 8);
    for (let j = 0; j < 4; j++) { const a = j / 4 * TAU + 0.3927 + (i % 2) * 0.7854, d = r * 0.924 + 0.022; q.oct(0.07, '#fff3c8', { x: Math.cos(a) * d, z: Math.sin(a) * d, sy: 1.3, ry: -a }); }
    const m = q.mesh(GX.mat.gold); m.position.y = y; m.name = 'plate' + i; m.receiveShadow = false; pl.add(m);
  });
  const cr = bone('crystal', 0, 4.05, 0, root);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), crystalMat(shade(tc, 0.15))); gem.scale.set(1, 1.7, 1); gem.castShadow = true; gem.name = 'gem'; gem.userData.hex = shade(tc, 0.15); cr.add(gem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 5, 20), glowMat(shade(tc, 0.3))); ring.rotation.x = HP2; ring.position.y = -0.5; ring.name = 'ring'; cr.add(ring);
  const h = halo(tc, 2.4, 0.6); h.name = 'halo'; cr.add(h);
  // rubble shown once the turret has fallen
  const rb = new PB(); for (const [x, z, r, sy] of [[-0.3, -0.06, 0.4, 0.6], [0.2, -0.1, 0.5, 0.7], [0.45, 0.2, 0.3, 0.6], [-0.1, 0.3, 0.36, 0.5], [-0.55, 0.3, 0.24, 0.6], [0.1, 0.0, 0.3, 1.5]]) rb.dod(r, '#727b86', { x, y: r * sy * 0.5, z, sy, ry: x * 9, c2: '#9aa3ad' });
  rb.cyl(0.36, 0.5, 0.7, '#6a737e', { y: 0.3, x: -0.05, rz: 0.25 }, 7);
  const rub = rb.mesh(GX.mat.vcFlat); rub.name = 'rubble'; rub.visible = false; root.add(rub);
  return root;
}
function buildCrystal(team) {
  const tc = teamHex(team), st = '#8b95a1', st2 = '#b4bcc6', dk = '#5d6671', root = new THREE.Group(), pb = new PB();
  pb.cyl(1.3, 1.42, 0.24, dk, { y: 0.12 }, 12).cyl(1.02, 1.12, 0.22, st, { y: 0.35 }, 12).cyl(0.72, 0.82, 0.2, shade(tc, -0.35), { y: 0.56 }, 12).cyl(0.74, 0.74, 0.05, tc, { y: 0.67 }, 12);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785, c = Math.cos(a), s = Math.sin(a); pb.box(0.26, 1.3, 0.3, st, { x: c * 1.08, y: 1.0, z: s * 1.08, ry: -a + HP2, rx: -0.22, c2: st2 }).box(0.2, 0.9, 0.24, st2, { x: c * 0.86, y: 2.0, z: s * 0.86, ry: -a + HP2, rx: -0.6 }).cone(0.1, 0.3, tc, { x: c * 0.62, y: 2.5, z: s * 0.62 }, 4); }
  const base = pb.mesh(GX.mat.vc); base.name = 'tower'; root.add(base);
  const cr = bone('crystal', 0, 2.75, 0, root);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), crystalMat(shade(tc, 0.1))); gem.scale.set(1, 2.1, 1); gem.castShadow = true; gem.name = 'gem'; gem.userData.hex = shade(tc, 0.1); cr.add(gem);
  const orbit = bone('orbit', 0, 0, 0, cr);
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), crystalMat(shade(tc, 0.3))); m.scale.y = 1.9; m.position.set(Math.cos(i * 2.094) * 1.05, Math.sin(i * 2.4) * 0.3, Math.sin(i * 2.094) * 1.05); orbit.add(m); }
  const h = halo(tc, 4.2, 0.4); h.name = 'halo'; cr.add(h);
  const rb = new PB(); rb.cone(0.5, 0.9, shade(tc, -0.4), { y: 1.05, flat: true }, 5).cone(0.3, 0.7, shade(tc, -0.3), { x: 0.3, y: 0.95, rz: -0.4, flat: true }, 4).cone(0.26, 0.6, shade(tc, -0.45), { x: -0.32, y: 0.9, rz: 0.5, flat: true }, 4);
  for (const [x, z, r] of [[-1.5, 0.3, 0.2], [-0.9, 1.3, 0.14], [1.4, 0.8, 0.22], [1.8, -0.4, 0.13], [0.4, 1.7, 0.16], [-1.9, -0.9, 0.12]]) rb.oct(r, shade(tc, -0.15), { x, y: r * 0.6, z, sy: 1.6, rz: x, rx: z });
  const rub = rb.mesh(GX.mat.vcFlat); rub.name = 'rubble'; rub.visible = false; root.add(rub);
  return root;
}

/* ---------- instancing from templates ---------- */
function unitTemplate(key, make) { return TPL.unit[key] || (TPL.unit[key] = make()); }
function unitInstance(u) {
  let tpl, v = { kind: u.kind, walk: 0, runK: 0, seed: Math.random() * 9, clipT: 9, clipDur: 0.4, lastAtk: 0, face: null, deadT: 0 };
  const sw = WORLD.swap ? 's' : '';       // (a team's things are kept in both colours: which one is the allies' depends on who is looking)
  if (u.kind === 'minion') {
    if (u.mtype === 'lord') { tpl = unitTemplate('lord' + u.team + sw, () => buildMonster('lord', teamHex(u.team))); v.sub = 'lord'; v.top = 3.5; }
    else { tpl = unitTemplate(u.mtype + u.team + sw, () => buildMinion(u.mtype, u.team)); v.sub = u.mtype; v.top = u.mtype === 'siege' ? 1.15 : 1.3; }
  } else if (u.kind === 'monster') { tpl = unitTemplate('m' + u.mtype, () => buildMonster(u.mtype)); v.sub = u.mtype; v.top = { sprite: 0.85, azure: 1.95, crimson: 1.95, warden: 1.8, skitter: 0.95, turtle: 1.6, lord: 3.5 }[u.mtype]; }
  else if (u.kind === 'turret') { tpl = unitTemplate('t' + u.team + sw, () => buildTurret(u.team)); v.top = 4.75; }
  else { tpl = unitTemplate('c' + u.team + sw, () => buildCrystal(u.team)); v.top = 5.3; }
  v.o = tpl.clone(true); v.b = bonesOf(v.o);
  v.o.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return v;
}

/* ---------- animation ---------- */
const STANCE = {   // idle arm pose: [armL.x, foreL.x, armL.z, armR.x, foreR.x, armR.z]
  slash: [0.08, -0.35, 0.14, -0.45, -0.95, -0.12],
  smash: [-0.75, -0.85, 0.05, -0.4, -1.0, -0.12],
  smash2: [-0.72, -0.78, -0.3, -0.6, -0.9, 0.22],
  dual: [-0.3, -1.1, 0.16, -0.3, -1.1, -0.16],
  fans: [-0.15, -1.25, 0.5, -0.15, -1.25, -0.5],
  reap: [0.2, -0.3, 0.62, 0.2, -0.3, -0.62],
  cast: [0.08, -0.3, 0.14, -0.35, -1.15, -0.1],
  claw: [-0.5, -1.3, 0.42, -0.5, -1.3, -0.42],
  orb: [0.05, -0.4, 0.2, -0.55, -0.7, -0.2],
  bow: [-0.4, -0.55, 0.12, 0.06, -0.35, -0.12],
  hurl: [0.1, -0.5, 0.18, -0.3, -0.85, -0.16],
  brawl: [-0.5, -1.55, 0.2, -0.5, -1.55, -0.2],       // fists up before his chin
  long: [0.08, -0.35, 0.14, -0.45, -0.95, -0.12],       // (what Odile's arms do with only one hand on her sword: thrown, stunned, fallen. Otherwise the sword leads them: longStep)
  rifle: [-1.02, -0.36, -0.6, -0.5, -0.83, -0.05],       // the long gun at the low ready: in the right hand, the left under its fore-end
};
function tri(u, a, b, c) {       // stance -> wind-up -> strike (lands at 0.6) -> recover
  if (u < 0.42) return lerp(a, b, smooth(u / 0.42));
  if (u < 0.6) return lerp(b, c, smooth((u - 0.42) / 0.18));
  if (u < 0.72) return c;
  return lerp(c, a, smooth((u - 0.72) / 0.28));
}
/* Skill clips. Each channel is [time, value, time, value, ...] over the clip's 0..1 and is blended in and out on its own.
   hipY is an offset; spin and roll are whole turns of the body; hop is the peak lift in metres. */
const CLIPS = {
  rush:    { d: 0.42, aLx: [0, -1.5], fLx: [0, -0.35], aLz: [0, -0.25], aRx: [0, 0.7], fRx: [0, -0.5], hipRx: [0, 0.5], spRy: [0, 0.3] },
  guard:   { d: 0.6, aLx: [0, -2.5, 0.25, -2.5, 0.42, -1.1, 1, -0.9], fLx: [0, -0.4, 0.25, -0.4, 0.42, -0.9], aRx: [0, -0.2, 0.42, 0.3], aRz: [0, -0.6], hipY: [0, 0.05, 0.25, 0.06, 0.42, -0.2, 1, 0], hipRx: [0, -0.1, 0.25, -0.12, 0.42, 0.3, 1, 0.05] },
  leap:    { d: 0.85, aRx: [0, -3.0, 0.52, -3.0, 0.62, -0.45, 1, -0.5], aLx: [0, -2.2, 0.52, -2.2, 0.62, -0.9, 1, -0.8], fRx: [0, -0.5, 0.52, -0.5, 0.62, -0.1], hipRx: [0, 0.1, 0.52, 0.1, 0.62, 0.6, 1, 0.1], hipY: [0, 0, 0.52, 0, 0.62, -0.24, 1, 0] },
  throw:   { d: 0.5, aRx: [0, -2.9, 0.16, -2.9, 0.32, -0.75, 1, -0.6], fRx: [0, -1.5, 0.16, -1.5, 0.32, -0.1, 1, -0.5], aRz: [0, -0.35, 0.32, 0.2], spRy: [0, -0.6, 0.16, -0.6, 0.32, 0.5, 1, 0.1], hipRx: [0, -0.1, 0.16, -0.1, 0.32, 0.28, 1, 0.05], aLx: [0, -0.9, 0.32, 0.4] },
  slam:    { d: 0.56, aRx: [0, -3.0, 0.3, -3.05, 0.45, -0.5, 1, -0.6], aLx: [0, -3.0, 0.3, -3.05, 0.45, -0.6, 1, -0.6], fRx: [0, -0.6, 0.3, -0.6, 0.45, -0.1], fLx: [0, -0.6, 0.3, -0.6, 0.45, -0.1], hipRx: [0, -0.25, 0.3, -0.28, 0.45, 0.55, 1, 0.1], hipY: [0, 0.08, 0.3, 0.1, 0.45, -0.22, 1, 0] },
  pull:    { d: 0.6, aRx: [0, -1.5, 0.3, -1.5, 0.5, -0.6], aLx: [0, -1.5, 0.3, -1.5, 0.5, -0.6], aRz: [0, -1.2, 0.3, -1.2, 0.5, 0.25], aLz: [0, 1.2, 0.3, 1.2, 0.5, -0.25], fRx: [0, -0.1, 0.3, -0.1, 0.5, -1.6], fLx: [0, -0.1, 0.3, -0.1, 0.5, -1.6], hipRx: [0, 0.12, 0.3, 0.12, 0.5, -0.25], hipY: [0, -0.08, 0.5, 0.04] },
  roar:    { d: 0.7, aRx: [0, 0.35], aLx: [0, 0.35], aRz: [0, -1.15], aLz: [0, 1.15], fRx: [0, -0.9], fLx: [0, -0.9], hipRx: [0, -0.3], headRx: [0, -0.45], hipY: [0, 0.06] },
  sweep:   { d: 0.42, spin: 1, aRx: [0, -0.5], fRx: [0, -0.15], aRz: [0, -1.35], aLz: [0, 0.9], aLx: [0, 0.2], hipRx: [0, 0.2], hipY: [0, -0.06] },
  lunge:   { d: 0.4, aRx: [0, -1.55], fRx: [0, -0.05], aRz: [0, 0.1], aLx: [0, 0.9], spRy: [0, 0.45], hipRx: [0, 0.55] },
  stab:    { d: 0.55, hop: 0.35, aRx: [0, -2.9, 0.4, -2.9, 0.55, -0.7, 1, -0.5], aLx: [0, -2.9, 0.4, -2.9, 0.55, -0.7, 1, -0.5], fRx: [0, -1.2, 0.4, -1.2, 0.55, -0.2], fLx: [0, -1.2, 0.4, -1.2, 0.55, -0.2], hipRx: [0, -0.15, 0.4, -0.15, 0.55, 0.5, 1, 0.1] },
  bolt:    { d: 0.48, aRx: [0, -0.5, 0.14, -0.5, 0.3, -1.7, 1, -1.5], fRx: [0, -2.0, 0.14, -2.0, 0.3, -0.05, 1, -0.2], spRy: [0, -0.45, 0.14, -0.45, 0.3, 0.4, 1, 0.1], hipRx: [0, -0.08, 0.3, 0.22, 1, 0.05], aLx: [0, -0.5, 0.3, 0.3], orb: [0, -0.2, 0.14, -0.2, 0.3, 1.3, 1, 0.3] },
  channel: { d: 0.75, aRx: [0, -2.95], fRx: [0, -0.25], aRz: [0, -0.2], aLx: [0, -1.3], aLz: [0, 0.6], fLx: [0, -0.5], headRx: [0, -0.3], hipRx: [0, -0.1], orb: [0, 0.5] },
  invoke:  { d: 1.0, hop: 0.16, aRx: [0, -2.85], aLx: [0, -2.85], aRz: [0, -0.55], aLz: [0, 0.55], fRx: [0, -0.2], fLx: [0, -0.2], headRx: [0, -0.5], hipRx: [0, -0.16], orb: [0, 0.2] },
  beam:    { d: 1.05, aRx: [0, -1.1, 0.5, -1.0, 0.6, -1.6, 1, -1.55], aLx: [0, -1.1, 0.5, -1.0, 0.6, -1.6, 1, -1.55], fRx: [0, -1.9, 0.5, -2.0, 0.6, -0.05], fLx: [0, -1.9, 0.5, -2.0, 0.6, -0.05], aRz: [0, 0.3, 0.6, 0.1], aLz: [0, -0.3, 0.6, -0.1], hipRx: [0, -0.2, 0.5, -0.26, 0.6, 0.3, 1, 0.2], orb: [0, -0.3, 0.5, -0.45, 0.6, 1.6, 1, 1.2] },
  shot:    { d: 0.45, aLx: [0, -1.52], fLx: [0, -0.06], aLz: [0, -0.1], aRx: [0, -1.25], fRx: [0, -2.3, 0.2, -2.3, 0.3, -0.5, 1, -0.7], aRz: [0, -0.25], spRy: [0, -0.3], hipRx: [0, -0.18, 0.2, -0.18, 0.3, 0.1], headRy: [0, 0.25] },
  volley:  { d: 0.6, aLx: [0, -1.75, 0.3, -1.6, 1, -1.5], fLx: [0, -0.06], aLz: [0, -0.1], aRx: [0, -1.35], fRx: [0, -2.3, 0.22, -2.3, 0.32, -0.5, 1, -0.7], aRz: [0, -0.25], spRy: [0, -0.7, 0.22, -0.6, 0.6, 0.25, 1, -0.2], hipRx: [0, -0.25, 0.3, 0.05], headRy: [0, 0.25] },
  roll:    { d: 0.3, roll: 1, aRx: [0, -1.4], aLx: [0, -1.4], fRx: [0, -1.8], fLx: [0, -1.8], lLx: [0, -1.5], lRx: [0, -1.5], sLx: [0, 1.9], sRx: [0, 1.9] },
  brace:   { d: 0.55, aLx: [0, -1.95, 0.4, -1.95, 0.62, -1.25, 1, -1.2], aLz: [0, 0.55, 0.4, 0.55, 0.62, -0.1], fLx: [0, -0.35], aRx: [0, -0.9, 0.4, -0.9, 0.62, -0.25], fRx: [0, -2.05, 0.4, -2.05, 0.62, -1.1], aRz: [0, 0.5, 0.62, 0.1], hipY: [0, -0.1, 0.4, -0.13, 0.62, 0.04, 1, 0], hipRx: [0, 0.2, 0.4, 0.22, 0.62, -0.1, 1, 0], headRx: [0, 0.18, 0.4, 0.18, 0.62, -0.22, 1, 0], lLx: [0, -0.35, 0.62, 0], sLx: [0, 0.5, 0.62, 0] },       // down behind the bow held across the chest, then up
  ward:    { d: 0.55, aRx: [0, -0.6, 0.4, -0.6, 0.62, -0.4, 1, -0.3], fRx: [0, -1.02, 0.4, -1.02, 0.62, -0.85], aRz: [0, 0.55, 0.4, 0.55, 0.62, -0.1], aLx: [0, -1.05, 0.4, -1.05, 0.62, -0.2], fLx: [0, -1.25, 0.4, -1.25, 0.62, -0.4], aLz: [0, -0.5, 0.4, -0.5, 0.62, 0.15], hipY: [0, -0.1, 0.4, -0.13, 0.62, 0.04, 1, 0], hipRx: [0, 0.2, 0.4, 0.22, 0.62, -0.1, 1, 0], headRx: [0, 0.18, 0.4, 0.18, 0.62, -0.22, 1, 0], lLx: [0, -0.35, 0.62, 0], sLx: [0, 0.5, 0.62, 0] },       // down behind the leaf held upright before the chest, a palm against its flat; then up
  lobL:    { d: 0.5, aLx: [0, 0.55, 0.2, 0.55, 0.38, -1.6, 1, -1.2], fLx: [0, -0.4, 0.2, -0.4, 0.38, -0.08], aLz: [0, 0.1, 0.38, -0.12], spRy: [0, 0.4, 0.2, 0.4, 0.38, -0.35, 1, -0.05], hipRx: [0, 0.28, 0.38, 0.08], hipY: [0, -0.1, 0.38, 0], aRx: [0, -0.5, 0.38, 0.2], headRx: [0, 0.1, 0.38, -0.15] },       // an underarm lob with the free hand
  focus:   { d: 0.7, aLx: [0, -2.7], fLx: [0, -0.1], aRx: [0, -2.1], fRx: [0, -2.1], aRz: [0, 0.35], headRx: [0, -0.3], hipRx: [0, -0.12] },
  send:    { d: 0.5, aRx: [0, -2.5, 0.16, -2.6, 0.34, -1.25, 1, -1.1], fRx: [0, -1.1, 0.16, -1.2, 0.34, -0.08, 1, -0.3], aRz: [0, -0.5, 0.34, 0.15], spRy: [0, -0.55, 0.16, -0.6, 0.34, 0.45, 1, 0.1], hipRx: [0, -0.1, 0.16, -0.12, 0.34, 0.24, 1, 0.05], aLx: [0, -1.5, 0.34, -1.45, 1, -0.9], fLx: [0, -0.1], aLz: [0, 0.3, 0.34, -0.1], headRx: [0, -0.1, 0.34, 0.08] },
  hive:    { d: 1.0, hop: 0.14, aRx: [0, -1.5, 0.25, -1.78, 1, -1.72], fRx: [0, -0.1, 0.25, -0.02], aRz: [0, -0.1], aLx: [0, -0.7, 0.25, -0.3], aLz: [0, 0.9, 0.25, 1.25], fLx: [0, -0.5, 0.25, -0.25], headRx: [0, -0.2, 0.25, -0.45], hipRx: [0, -0.05, 0.25, -0.14] },       // the crook held up at arm's length, the skep high over her, the other arm flung wide
  heave:   { d: 0.5, hop: 0.12, aLx: [0, 0.35, 0.2, 0.55, 0.44, -2.75, 1, -2.2], fLx: [0, -0.9, 0.2, -1.05, 0.44, -0.15, 1, -0.5], aLz: [0, -0.2, 0.44, 0.12], aRx: [0, 0.3, 0.44, 0.7, 1, 0.2], fRx: [0, -0.6], hipRx: [0, 0.42, 0.2, 0.5, 0.44, -0.26, 1, 0], hipY: [0, -0.15, 0.2, -0.2, 0.44, 0.05, 1, 0], spRy: [0, 0.35, 0.44, -0.2, 1, 0], headRx: [0, 0.2, 0.44, -0.4, 1, 0] },       // down behind the shield, then up with it from the knees
  queen:   { d: 1.1, hop: 0.2, spin: 1, aRx: [0, -0.6, 0.18, -0.4, 0.42, -1.9, 1, -1.75], fRx: [0, -1.0, 0.18, -1.1, 0.42, -0.05], aRz: [0, 0.3, 0.42, -0.12], aLx: [0, -0.4, 0.42, -0.9, 1, -0.5], aLz: [0, 0.4, 0.42, 1.35, 1, 1.2], fLx: [0, -0.9, 0.42, -0.2], headRx: [0, 0.15, 0.42, -0.5, 1, -0.4], hipRx: [0, 0.2, 0.18, 0.25, 0.42, -0.16, 1, -0.1], hipY: [0, -0.12, 0.18, -0.16, 0.42, 0.04, 1, 0] },       // gathered low over the skep, then a full turn with the crook swept up overhead and the free arm flung wide
  fade:    { d: 0.45, aLx: [0, -1.7, 0.3, -2.05, 1, -1.2], fLx: [0, -1.4, 0.3, -1.75, 1, -0.8], aLz: [0, -0.5], hipY: [0, -0.1, 0.4, -0.2, 1, -0.05], hipRx: [0, 0.2, 0.4, 0.34, 1, 0.1], headRx: [0, 0.22], lLx: [0, -0.5], sLx: [0, 0.8], lRx: [0, -0.3], sRx: [0, 0.6] },       // down under the cape, an arm drawing it across her face
  aim:     { d: 0.64, aRx: [0, -0.9, 0.3, -1.44], fRx: [0, -0.5, 0.3, -0.1], aRz: [0, 0.1], aLx: [0, -1.1, 0.3, -1.32], fLx: [0, -0.4, 0.3, -0.28], aLz: [0, -0.55], lLx: [0, -0.4, 0.35, -1.4], sLx: [0, 0.5, 0.35, 1.4], lRx: [0, 0, 0.35, 0.15], sRx: [0, 0.4, 0.35, 1.5], hipY: [0, -0.08, 0.35, -0.34], hipRx: [0, 0.1], headRy: [0, 0.25], headRx: [0, 0.08] },       // down on one knee, the long gun brought up to the shoulder
  recoil:  { d: 0.64, snap: 1, aRx: [0, -1.68, 0.16, -1.44], fRx: [0, -0.24, 0.16, -0.1], aRz: [0, 0.1], aLx: [0, -1.46, 0.16, -1.32], fLx: [0, -0.28], aLz: [0, -0.55], lLx: [0, -1.4], sLx: [0, 1.4], lRx: [0, 0.15], sRx: [0, 1.5], hipY: [0, -0.34], hipRx: [0, 0.0, 0.18, 0.1], headRy: [0, 0.25], headRx: [0, -0.08, 0.18, 0.08] },       // still on her knee: the kick of a round, and the gun settling back onto its mark (snap: it is held from the first instant, with no way in from standing)
  gong:    { d: 0.55, aLx: [0, -1.2], fLx: [0, -0.75], aLz: [0, -0.3], aRx: [0, -1.5, 0.22, -1.6, 0.4, -0.95, 1, -0.6], aRz: [0, -1.25, 0.22, -1.35, 0.4, 0.55, 1, 0.1], fRx: [0, -0.7, 0.22, -0.8, 0.4, -0.35, 1, -0.8], spRy: [0, -0.5, 0.22, -0.55, 0.4, 0.3, 1, 0], hipRx: [0, -0.08, 0.4, 0.14, 1, 0], headRx: [0, -0.25, 0.4, -0.3, 1, 0], hipY: [0, 0, 0.4, -0.06, 1, 0] },       // the beater swung out wide and brought across onto the gong held before her
  raise:   { d: 1.0, hop: 0.1, aLx: [0, -2.3, 0.22, -2.95], fLx: [0, -0.35, 0.22, -0.12], aLz: [0, 0.12], aRx: [0, -0.5, 0.22, -0.25], aRz: [0, -0.8, 0.22, -1.2], fRx: [0, -0.7, 0.22, -0.45], headRx: [0, -0.3, 0.22, -0.45], hipRx: [0, -0.06, 0.22, -0.14] },       // the gong lifted high over her head, the beater held wide
  toss:    { d: 0.45, aRx: [0, 0.5, 0.18, 0.5, 0.36, -1.5, 1, -1.2], fRx: [0, -0.3, 0.36, -0.1], hipRx: [0, 0.3, 0.36, 0.1], hipY: [0, -0.1, 0.36, 0] },
  fanout:  { d: 0.46, aRx: [0, -1.3, 0.2, -1.3, 0.38, -1.45, 1, -1.2], aLx: [0, -1.3, 0.2, -1.3, 0.38, -1.45, 1, -1.2], aRz: [0, 0.6, 0.2, 0.6, 0.38, -1.15, 1, -0.8], aLz: [0, -0.6, 0.2, -0.6, 0.38, 1.15, 1, 0.8], fRx: [0, -1.7, 0.2, -1.7, 0.38, -0.05], fLx: [0, -1.7, 0.2, -1.7, 0.38, -0.05], hipRx: [0, -0.14, 0.2, -0.14, 0.38, 0.32, 1, 0.05], hipY: [0, 0.03, 0.2, 0.04, 0.38, -0.08, 1, 0] },
  /* Kaela's Triple Cadence: a forehand cut across on the step in, a backhand cut back the other way, and a leap (the sim lifts her) with
     the blade held high in both hands, brought down into the ground as she lands on one knee */
  cadA:    { d: 0.36, aRx: [0, -0.3, 0.14, -0.3, 0.46, -0.75, 1, -0.5], aRz: [0, -1.5, 0.14, -1.5, 0.46, 0.7, 1, 0.3], fRx: [0, -0.25, 0.46, -0.1, 1, -0.6], spRy: [0, -0.85, 0.14, -0.85, 0.46, 0.9, 1, 0.35], hipRx: [0, 0.32, 0.46, 0.42, 1, 0.12], hipY: [0, -0.06, 0.46, -0.12, 1, 0], aLx: [0, -0.5, 0.46, 0.75], aLz: [0, 0.3, 0.46, 0.75], lLx: [0, -0.8, 0.6, -0.65, 1, 0], sLx: [0, 0.6, 0.6, 0.55, 1, 0], lRx: [0, 0.6, 0.6, 0.5, 1, 0], sRx: [0, 0.25, 1, 0], headRy: [0, 0.3, 0.46, -0.25, 1, 0] },
  cadB:    { d: 0.36, aRx: [0, -0.8, 0.14, -0.8, 0.46, -0.3, 1, -0.4], aRz: [0, 0.8, 0.14, 0.8, 0.46, -1.5, 1, -0.9], fRx: [0, -0.55, 0.14, -0.55, 0.46, -0.08, 1, -0.6], spRy: [0, 0.95, 0.14, 0.95, 0.46, -0.85, 1, -0.3], hipRx: [0, 0.32, 0.46, 0.42, 1, 0.12], hipY: [0, -0.06, 0.46, -0.12, 1, 0], aLx: [0, 0.5, 0.46, -0.45], aLz: [0, 0.7, 0.46, 0.35], lRx: [0, -0.8, 0.6, -0.65, 1, 0], sRx: [0, 0.6, 0.6, 0.55, 1, 0], lLx: [0, 0.6, 0.6, 0.5, 1, 0], sLx: [0, 0.25, 1, 0], headRy: [0, -0.3, 0.46, 0.25, 1, 0] },
  cadC:    { d: 0.74, aRx: [0, -2.6, 0.12, -2.95, 0.38, -3.05, 0.47, -0.12, 0.76, -0.12, 1, -0.5], aLx: [0, -2.3, 0.12, -2.8, 0.38, -2.95, 0.47, -0.3, 0.76, -0.3, 1, -0.2], aRz: [0, -0.2, 0.38, -0.12, 0.47, 0.12, 1, 0], aLz: [0, 0.35, 0.38, 0.22, 0.47, -0.15, 1, 0.1], fRx: [0, -0.6, 0.38, -0.35, 0.47, -0.08, 0.76, -0.08, 1, -0.6], fLx: [0, -0.8, 0.38, -0.55, 0.47, -0.5, 0.76, -0.5, 1, -0.3], spRy: [0, -0.25, 0.38, -0.3, 0.47, 0.12, 1, 0], hipRx: [0, -0.15, 0.38, -0.4, 0.47, 0.82, 0.76, 0.78, 1, 0.1], hipY: [0, 0.04, 0.38, 0.08, 0.47, -0.36, 0.76, -0.34, 1, 0], headRx: [0, -0.3, 0.38, -0.4, 0.47, 0.25, 0.76, 0.2, 1, 0], lLx: [0, -1.0, 0.38, -0.55, 0.47, -1.85, 0.76, -1.8, 1, 0], sLx: [0, 1.6, 0.38, 1.1, 0.47, 1.8, 0.76, 1.75, 1, 0], lRx: [0, -0.45, 0.38, 0.25, 0.47, -0.7, 0.76, -0.68, 1, 0], sRx: [0, 1.4, 0.38, 0.9, 0.47, 1.4, 0.76, 1.38, 1, 0] },
  vault:   { d: 0.36, roll: 1, lift: 0.8, aRx: [0, -2.6], aLx: [0, -2.6], fRx: [0, -0.4], fLx: [0, -0.4], lLx: [0, -1.3], lRx: [0, -1.3], sLx: [0, 1.7], sRx: [0, 1.7] },
  /* the Eclipse skin's own moves: a whirling throw, a somersault out of the rift, and a rise into the air that ends in a two-handed fall */
  hurlE:    { d: 0.52, spin: 1, hop: 0.3, aRx: [0, -0.3, 0.5, -0.3, 0.7, -1.55, 1, -1.3], aRz: [0, -1.45, 0.5, -1.45, 0.7, 0.25], fRx: [0, -0.15], aLx: [0, 0.4], aLz: [0, 1.3, 0.6, 1.3, 1, 0.5], hipRx: [0, 0.18], lLx: [0, -0.5], sLx: [0, 0.9] },
  riftE:    { d: 0.62, roll: 1, lift: 1.4, aRx: [0, -2.95, 0.6, -2.95, 0.8, -0.6], aLx: [0, -2.95, 0.6, -2.95, 0.8, -0.6], fRx: [0, -0.3], fLx: [0, -0.3], lLx: [0, -1.4, 0.7, -1.4, 1, 0], lRx: [0, -1.4, 0.7, -1.4, 1, 0], sLx: [0, 1.8, 0.7, 1.8, 1, 0.4], sRx: [0, 1.8, 0.7, 1.8, 1, 0.4] },
  eclipseE: { d: 1.05, hop: 1.0, spin: 2, aRx: [0, -0.15, 0.5, -0.15, 0.62, -2.95, 0.74, -0.45, 1, -0.5], aLx: [0, -0.15, 0.5, -0.15, 0.62, -2.95, 0.74, -0.45, 1, -0.5], aRz: [0, -1.55, 0.5, -1.55, 0.62, -0.3], aLz: [0, 1.55, 0.5, 1.55, 0.62, 0.3], fRx: [0, -0.1], fLx: [0, -0.1], headRx: [0, -0.55, 0.55, -0.55, 0.72, 0.35, 1, 0], lLx: [0, -0.55], lRx: [0, 0.3], sLx: [0, 1.1], sRx: [0, 0.5], hipRx: [0, -0.2, 0.55, -0.2, 0.72, 0.5, 1, 0.1] },
  /* Odile's: what her body does (her sword, and so her arms, are led by longStep). A step into a thrust; drawn up to her full height
     behind the upright blade; and up off her knee with the turn of a rising cut */
  lthrust: { d: 0.4, hipRx: [0, 0.14, 0.3, 0.2, 0.52, 0.5, 1, 0.3], spRy: [0, -0.25, 0.3, -0.3, 0.52, 0.22, 1, 0.1], lLx: [0, 0.1, 0.3, 0.16, 0.52, -0.85, 1, -0.6], sLx: [0, 0, 0.3, 0.1, 0.52, 0.6], lRx: [0, 0, 0.52, 0.5], hipY: [0, -0.03, 0.52, -0.12, 1, -0.06], headRx: [0, -0.1] },
  lsalute: { d: 0.9, hop: 0.07, headRx: [0, -0.18, 0.5, -0.26, 0.8, 0.05, 1, 0], hipRx: [0, -0.06, 0.5, -0.1, 0.78, 0.12, 1, 0], hipY: [0, 0.02, 0.5, 0.04, 0.78, -0.05, 1, 0], spRy: [0, 0, 0.55, 0, 0.76, -0.4, 1, 0] },
  lrise: { d: 0.44, hipRx: [0, 0.26, 0.46, 0.02, 1, 0], hipY: [0, -0.06, 0.46, 0.04, 1, 0], spRy: [0, 0.5, 0.2, 0.55, 0.46, -0.45, 1, 0], headRx: [0, 0.15, 0.46, -0.12, 1, 0] },
};
const CLIP_CH = ['aLx', 'fLx', 'aLz', 'aRx', 'fRx', 'aRz', 'lLx', 'lRx', 'sLx', 'sRx', 'hipRx', 'spRy', 'headRx', 'headRy'];
/* which clip each hero plays for skill 1, skill 2 and the ultimate ([name, seconds] overrides the length); entries 3..5 are for
   their second casts, 6..8 for a second form's, 9..11 for third casts. A skin may bring a set of its own (clips). */
const HERO_CLIPS = { bram: ['rush', 'guard', 'leap', null, 'heave'], thorn: ['throw', 'slam', 'pull'], kaela: ['cadA', 'lunge', 'roar', 'cadB', null, null, null, null, null, 'cadC'], rook: [['slam', 0.78], 'roar', null], vex: ['throw', 'sweep', 'stab'],
  tavi: ['throw', 'fanout', 'vault', 'lunge', 'pull', 'vault'],
  kiri: ['toss', 'bolt', 'roar', null, null, null, 'vault', 'lunge', 'roar'],       // 6..8: the Tiger's leap, rush and the turn back
  lyra: ['bolt', 'channel', 'invoke'], zephyr: ['bolt', 'channel', 'beam'], orin: ['ward', 'throw', 'lobL'], mira: ['shot', 'toss', 'focus'], sera: ['channel', 'bolt', 'invoke'], miel: ['send', 'ward', 'queen'], hesta: ['rush', 'gong', 'raise'], sorrel: ['fade', 'lobL', 'aim', null, null, 'recoil'],
  halvar: ['raise', 'lunge', 'roar', null, null, null, null, null, null],
  odile: ['lthrust', null, 'lsalute', null, 'lrise'] };       // (1: Anneal is a pose she holds, not a motion: s.kneel; 4: Rise. What her sword does in each is in longStep)       // (6..8 are the ram's: it has motions of its own, see animRam)       // (sorrel 5: each round of the four)
function KF(u, a) { if (u <= a[0]) return a[1]; for (let i = 2; i < a.length; i += 2) if (u <= a[i]) return lerp(a[i - 1], a[i + 1], smooth((u - a[i - 2]) / (a[i] - a[i - 2]))); return a[a.length - 1]; }
/* which mask is over the face: the worn one sits on the face, the other is slung behind the head */
function kiriMasks(B, f) {
  const on = f ? B.mask1 : B.mask0, off = f ? B.mask0 : B.mask1;
  on.position.set(0, 0.3, 0.205); on.rotation.set(0, 0, 0); on.scale.setScalar(1);
  off.position.set(-0.19, 0.44, -0.17); off.rotation.set(0.35, Math.PI - 0.75, 0.25); off.scale.setScalar(0.86);
}
/* a two-form hero's view follows the unit's form: masks, what she holds, how she stands and strikes */
function applyForm(v, f) {
  if (HEROES[v.key].forms.beast) { ramSwap(v, f); return; }
  const B = v.b; v.form = f; if (v.style0 === undefined) v.style0 = v.style; v.style = f ? 'claw' : v.style0;
  if (B.mask0) kiriMasks(B, f);
  if (B.gearA) B.gearA.visible = !f; for (const n of ['gearL', 'gearR', 'tails']) if (B[n] && v.key === 'kiri') B[n].visible = !!f;
}
function startClip(v, i) {
  const set = (SKINS[v.key][v.skin] || {}).clips || HERO_CLIPS[v.key], spec = set && (set[i] !== undefined ? set[i] : set[i % 3]); v.clipI = i % 3; v.clipX = i; if (!spec) { v.clip = null; return; }
  const arr = Array.isArray(spec); v.clip = CLIPS[arr ? spec[0] : spec]; v.clipD = arr ? spec[1] : v.clip.d; v.clipU = 0;
}
const _p = {};
/* s: { moving, speed (m/s), atk (-1 or 0..1), cast (0..1), dash, leap, spin, stun, air (0, or 0..1 through a knock-up), recall, dead (0..1) } */
/* ---------------- cloth ----------------
   Each chain is a damped pendulum per hinge, pushed by the wind of the hero's own movement (measured from how the model actually moved
   this frame, so dashes, leaps, knock-backs and blinks all count), flung out by turning, lifted by falling, and never quite still.
   rest: how it hangs; kv: how easily the wind takes it; K, D: spring and damping; fl: flutter; min: it cannot swing through the body. */
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
const CLOTH = {
  cape:  { rest: 0.07, kv: 0.3, K: 62, D: 4.4, fl: 0.05, min: 0.03 },
  scarf: { rest: 0.10, kv: 0.36, K: 46, D: 3.8, fl: 0.09, min: 0.03 },
  tails: { rest: 0.14, kv: 0.32, K: 52, D: 4.2, fl: 0.08, min: 0.04 },
  wtail: { rest: 0.16, kv: 0.34, K: 44, D: 3.6, fl: 0.09, min: 0.05 },
  pony:  { rest: 0.22, kv: 0.24, K: 85, D: 6.0, fl: 0.03, min: 0.05 },
  veil:  { rest: 0.06, kv: 0.3, K: 50, D: 4.2, fl: 0.07, min: 0.02 },
};
function clothInit(v) {
  v.cloth = [];
  for (const n in CLOTH) { const b0 = v.b[n]; if (!b0) continue; const d = CLOTH[n], bs = [b0]; for (let i = 1; i < CLOTH_N && v.b[n + i]; i++) bs.push(v.b[n + i]);
    v.cloth.push({ d, bs, x: bs.map((_, i) => i ? 0 : d.rest), z: bs.map(() => 0), vx: bs.map(() => 0), vz: bs.map(() => 0), ph: Math.random() * 9 }); }
  v.cq = { x: 0, y: 0, z: 0, yaw: 0, vf: 0, vl: 0, vy: 0, w: 0, on: false };
}
function clothStep(v, t, dt, flare) {
  if (!v.cloth) clothInit(v); if (!v.cloth.length || dt <= 0) return;
  const B = v.b, q = v.cq, P = v.root ? v.root.position : null, face = v.o.rotation.y, yaw = face + B.body.rotation.y + B.spine.rotation.y, h0 = Math.min(dt, 0.1);
  let vf = 0, vl = 0, vy = 0, w = 0;
  if (q.on) {
    w = clamp(angDiff(yaw, q.yaw) / h0, -26, 26);
    if (P) { let dx = P.x - q.x, dy = P.y - q.y, dz = P.z - q.z; if (dx * dx + dz * dz > 9) { dx = dz = dy = 0; flare += 0.9; }       // a blink: no wind, just a jolt
      const sn = Math.sin(face), cs = Math.cos(face); vf = clamp((dx * sn + dz * cs) / h0, -6, 15); vl = clamp((dx * cs - dz * sn) / h0, -9, 9); vy = clamp(dy / h0, -9, 9); }
  }
  if (P) { q.x = P.x; q.y = P.y; q.z = P.z; } q.yaw = yaw; q.on = true;
  const sm = Math.min(1, h0 * 14); q.vf += (vf - q.vf) * sm; q.vl += (vl - q.vl) * sm; q.vy += (vy - q.vy) * sm; q.w += (w - q.w) * sm;
  const wind = Math.hypot(q.vf, q.vl), busy = 0.35 + Math.min(1.7, wind * 0.3 + Math.abs(q.w) * 0.06 + flare), n = Math.max(1, Math.min(6, Math.ceil(h0 / 0.0168))), h = h0 / n;
  for (const c of v.cloth) {
    const d = c.d, tx = d.rest + clamp(d.kv * q.vf, -0.3, 1.3) + clamp(-q.vy * 0.17, -0.35, 0.9) + Math.min(1.15, q.w * q.w * 0.007) + flare * 0.55, tz = clamp(-d.kv * q.vl + q.w * 0.085, -0.9, 0.9), m = c.bs.length;
    for (let s = 0; s < n; s++) for (let i = 0; i < m; i++) {
      const g = i ? 0.34 : m > 1 ? 0.6 : 1, K = d.K / (1 + i * 0.55), fl = Math.sin(t * (5.2 + i * 1.9) + c.ph - i * 1.4) * d.fl * busy * (1 + i * 0.6);
      const gx = tx * g + fl - (i ? c.vx[i - 1] * 0.07 : 0), gz = tz * g + Math.cos(t * (4.1 + i * 1.3) + c.ph * 1.7 - i) * d.fl * busy * 0.7 - (i ? c.vz[i - 1] * 0.07 : 0);       // a piece lags the one above it: that is the whip
      c.vx[i] += ((gx - c.x[i]) * K - c.vx[i] * d.D) * h; c.x[i] += c.vx[i] * h; c.vz[i] += ((gz - c.z[i]) * K - c.vz[i] * d.D) * h; c.z[i] += c.vz[i] * h;
      const lo = i ? -0.45 : d.min; if (c.x[i] < lo) { c.x[i] = lo; if (c.vx[i] < 0) c.vx[i] *= -0.25; } else if (c.x[i] > 1.55) { c.x[i] = 1.55; c.vx[i] = 0; }
      if (c.z[i] > 0.95) { c.z[i] = 0.95; c.vz[i] = 0; } else if (c.z[i] < -0.95) { c.z[i] = -0.95; c.vz[i] = 0; }
    }
    for (let i = 0; i < m; i++) { c.bs[i].rotation.x = c.x[i]; c.bs[i].rotation.z = c.z[i]; }
  }
}
/* ---------------- recall ----------------
   Six seconds of waiting for the way home, and every hero waits in their own manner. Each function poses the hero for moment T (seconds
   in) and progress k (0..1); R takes what the pose channels cannot hold: lift, lean, head tilt, a slow turn (yaw) or a steady spin. */
const _rq = { y: 0, rx: 0, hz: 0, yaw: null, spin: 0, wp: 0 };       // wp: a turn of what the right hand holds, about the grip
function kneel(p, d) { p.hipY -= 0.34 * d; p.lLx = lerp(p.lLx, -1.4, d); p.sLx = lerp(p.sLx, 1.4, d); p.lRx = lerp(p.lRx, 0.15, d); p.sRx = lerp(p.sRx, 1.5, d); p.hipRx = lerp(p.hipRx, 0.1, d); }
const RECALL = {
  bram(p, R, T, k) {       // the oath: weapon held high, a fist beaten on the breastplate
    const beat = Math.pow(Math.max(0, Math.sin(T * 4.4)), 6); p.aRx = -2.95; p.fRx = -0.05; p.aRz = -0.12; p.aLx = -0.95; p.fLx = -2.15 + beat * 0.55; p.aLz = -0.28; p.headRx = -0.28; p.hipRx = -0.05; R.y = beat * 0.035; },
  thorn(p, R, T, k) {      // one knee, a palm flat on the earth, head bowed
    kneel(p, 1); p.aRx = -0.62; p.fRx = -0.12; p.aRz = 0.1; p.aLx = -1.05; p.fLx = -1.25; p.aLz = -0.1; p.headRx = 0.42 + Math.sin(T * 1.6) * 0.04; p.hipRx = 0.3; },
  kaela(p, R, T, k) {      // the duelist's salute: blade upright before the face, then swept down into a bow
    const u = smooth(seg01(k, 0.78, 0.92)); p.aRx = lerp(-1.38, 0.25, u); p.fRx = lerp(-1.78, -0.1, u); p.aRz = lerp(0.26, -0.55, u); p.aLx = 0.55; p.fLx = -1.35; p.aLz = -0.22; p.headRx = lerp(-0.12, 0.4, u); p.hipRx = lerp(0, 0.3, u); },
  rook(p, R, T, k) {       // showing off: both arms flexed, then fists pounded together, over and over
    const ph = (T % 2.4) / 2.4, fx = ph < 0.55, pulse = Math.sin(T * 9) * 0.12, hit = Math.pow(Math.max(0, Math.sin(T * 7.5)), 4);
    if (fx) { p.aLz = 1.4; p.aRz = -1.4; p.aLx = p.aRx = -0.1; p.fLx = p.fRx = -2.25 + pulse; p.headRx = -0.3; R.y = Math.abs(pulse) * 0.1; }
    else { p.aLx = p.aRx = -0.95; p.aLz = -0.5 + hit * 0.22; p.aRz = 0.5 - hit * 0.22; p.fLx = p.fRx = -1.25; p.headRx = 0.1; p.hipRx = 0.12; R.y = -hit * 0.03; } },
  vex(p, R, T, k) {        // folded into the dark: crouched, arms crossed, turning slowly
    if (!p.hov) { p.hipY -= 0.3; p.lLx = p.lRx = -1.15; p.sLx = p.sRx = 1.85; } p.aLx = p.aRx = -0.9; p.fLx = p.fRx = -2.2; p.aLz = -0.58; p.aRz = 0.58; p.headRx = 0.32; p.hipRx = 0.18; R.spin = 2.1; },
  tavi(p, R, T, k) {       // the whirl: one arm to the sky, one to the earth, faster and faster
    p.aRx = p.aLx = 0; p.aRz = -2.0; p.aLz = 1.05; p.fRx = p.fLx = -0.15; p.lLx = -0.45; p.sLx = 0.85; R.hz = 0.24; R.spin = 3.5 + k * 9.5; R.y = 0.03; },
  kiri(p, R, T, k) {       // a shrine dance: arms swept side to side, a step with each sweep
    const f = T * 2.3, sn = Math.sin(f), cs = Math.cos(f); p.aRz = -0.95 - sn * 0.55; p.aLz = 0.95 - sn * 0.55; p.aRx = -0.65 + cs * 0.42; p.aLx = -0.65 - cs * 0.42; p.fRx = p.fLx = -0.55;
    p.lLx = -Math.max(0, sn) * 0.55; p.sLx = Math.max(0, sn) * 0.95; p.lRx = -Math.max(0, -sn) * 0.55; p.sRx = Math.max(0, -sn) * 0.95; R.hz = sn * 0.2; R.yaw = Math.sin(f * 0.5) * 0.8; R.y = Math.abs(sn) * 0.04; },
  lyra(p, R, T, k) {       // afloat, legs folded, staff upright, turning like a slow planet
    p.hipY += 0.3 + Math.sin(T * 1.8) * 0.05; p.lLx = p.lRx = -1.45; p.sLx = p.sRx = 2.1; p.aLx = -0.5; p.fLx = -1.2; p.aLz = 0.36; p.aRx = -0.72; p.fRx = -1.32; p.aRz = -0.42; p.headRx = -0.12 - k * 0.25; p.hipRx = -0.05; R.spin = 1.25; },
  zephyr(p, R, T, k) {     // taken by the wind: arms swept back, rising in a tightening spiral
    p.aLx = p.aRx = 0.75; p.aLz = 0.8; p.aRz = -0.8; p.fLx = p.fRx = -0.1; p.hipRx = 0.36; p.headRx = -0.38; p.lLx = 0.32; p.lRx = 0.14; p.sLx = 0.5; p.sRx = 0.62; R.spin = 2 + k * k * 11; R.y = 0.12 + k * k * 0.85; },
  orin(p, R, T, k) {       // the warden's vigil: on one knee, his leaf set point-down in the earth and both hands on its hilt, watching the tree line; then up, and the leaf held to the sky
    const u = smooth(seg01(k, 0.8, 0.9)), d = 1 - u; kneel(p, d);
    p.aRx = lerp(-2.9, -0.62, d); p.fRx = lerp(-0.1, -0.92, d); p.aRz = lerp(-0.12, 0.36, d); p.aLx = lerp(0.15, -0.62, d); p.fLx = lerp(-0.35, -0.92, d); p.aLz = lerp(0.22, -0.36, d);
    p.headRy = Math.sin(T * 1.25) * 0.6 * d; p.headRx = lerp(-0.5, 0.06, d); p.hipRx = lerp(-0.04, 0.16, d); R.wp = -(p.aRx + p.fRx) + lerp(-HP2, HP2, d); },
  mira(p, R, T, k) {       // can't stand still: hopping on the spot, waving for the bird
    const h = Math.abs(Math.sin(T * 5.2)); R.y = h * 0.17; p.lLx = p.lRx = -0.28 * h; p.sLx = p.sRx = 0.55 * h; p.aRx = -2.78; p.aRz = -0.35 + Math.sin(T * 10.4) * 0.42; p.fRx = -0.3; p.aLz = 0.5; p.aLx = -0.1; R.hz = Math.sin(T * 5.2) * 0.14; R.yaw = Math.sin(T * 2.6) * 0.32; },
  sera(p, R, T, k) {       // a prayer on both knees; at the last her arms open and she rises into the light
    const u = smooth(seg01(k, 0.72, 0.93)); p.hipY -= 0.34 * (1 - u * 0.6); p.lLx = p.lRx = 0.1; p.sLx = p.sRx = lerp(1.55, 0.9, u); p.aLx = p.aRx = lerp(-0.78, -2.45, u); p.fLx = p.fRx = lerp(-1.92, -0.3, u); p.aLz = lerp(-0.3, 0.72, u); p.aRz = lerp(0.3, -0.72, u);
    p.headRx = lerp(0.36, -0.48, u); p.hipRx = 0.04; R.y = u * 0.18 + Math.sin(T * 2) * 0.01; },
  miel(p, R, T, k) {       // calling the hive home: down on one knee with the crook planted, a hand held out for them to settle on, her head following one bee and then another; then up, and the crook raised
    const u = smooth(seg01(k, 0.8, 0.92)), d = 1 - u; kneel(p, d);
    p.aRx = lerp(-2.7, -0.95, d); p.fRx = lerp(-0.15, -0.75, d); p.aRz = lerp(-0.2, -0.3, d); p.aLx = lerp(-0.4, -1.05, d); p.fLx = lerp(-0.3, -0.75 + Math.sin(T * 2.2) * 0.07, d); p.aLz = lerp(0.3, 0.42, d);
    p.headRy = Math.sin(T * 1.5) * 0.55 * d; p.headRx = lerp(-0.42, -0.12 + Math.sin(T * 3) * 0.1, d); p.hipRx = lerp(-0.06, 0.1, d); },
  odile(p, R, T, k) {      // the blade upright before her in both hands, turned slowly so that the light runs along it (longStep); at the last her face lifts to it
    p.headRx = lerp(0.12, -0.3, smooth(seg01(k, 0.8, 0.95))); p.hipRx = -0.03; R.y = 0.015 + Math.sin(T * 1.5) * 0.01; },
  sorrel(p, R, T, k) {     // the long watch: on one knee with the gun across it, her head turning along the skyline; then up, and the gun raised to the sky
    const u = smooth(seg01(k, 0.8, 0.92)), d = 1 - u; kneel(p, d);
    p.aRx = lerp(-2.75, -0.75, d); p.fRx = lerp(-0.1, -0.7, d); p.aRz = lerp(-0.1, 0.25, d); p.aLx = lerp(-0.3, -1.05, d); p.fLx = lerp(-0.3, -0.85, d); p.aLz = lerp(0.25, -0.5, d);
    p.headRy = Math.sin(T * 1.1) * 0.65 * d; p.headRx = lerp(-0.45, 0.04, d); p.hipRx = lerp(-0.04, 0.14, d); },
  hesta(p, R, T, k) {      // a slow measure beaten on the gong held out before her, her head bowed over it; at the last the gong goes up over her head
    const u = smooth(seg01(k, 0.8, 0.92)), beat = Math.pow(Math.max(0, Math.sin(T * 3.2)), 5) * (1 - u);
    p.aLx = lerp(-1.25, -2.9, u); p.fLx = lerp(-0.7, -0.15, u); p.aLz = lerp(-0.25, 0.1, u);
    p.aRx = lerp(-1.25 + beat * 0.2, -0.3, u); p.aRz = lerp(-1.0 + beat * 1.45, -1.1, u); p.fRx = lerp(-0.75 + beat * 0.35, -0.5, u);
    p.headRx = lerp(0.22, -0.45, u); p.hipRx = lerp(0.06, -0.1, u); R.y = beat * 0.02; },
};
/* ---------- Odile's long blade: a sword held in two hands ----------
   Her arms do not carry the sword: the sword leads her arms. Each frame it is given a place and a heading in the space of her chest
   (a LONG pose: where the right hand is, which way the blade points, which way its edge leads, and where along it the left hand
   holds), both arms are bent to reach it, and the blade is turned in the right hand to its heading. In that space +x is her left,
   +y up and +z before her; her shoulders are at (+-0.24, 0.46, 0) and a hand reaches 0.54 from its shoulder.
   v.lg: c, where the sword is now; g, how much of all this holds (none of it while she is thrown, stunned or fallen: then she has
   it in one hand, as STANCE.long); fk, her arms as they would be without it; out, seconds left of the end of the cut she steps
   out of the glass with. */
const LONG = {
  //        the right hand         the blade points        its edge leads         the left hand (along the blade from the right; -0.16: on the grip, nearer the pommel)
  guard:   [ 0.02, 0.18, 0.32,     0.05, 0.71, 0.70,       0.0, -0.7, 0.71,       -0.16],       // before her, the point at the height of a face
  carry:   [-0.10, 0.30, 0.26,    -0.45, 0.85, -0.27,      0.5, 0.0, -0.85,       -0.16],       // on the move: at her right shoulder, the blade up and back
  w1:      [-0.20, 0.60, 0.16,    -0.28, 0.80, -0.53,      0.3, -0.3, -0.9,       -0.16],       // gathered high on her right, the blade back over her shoulder,
  m1:      [-0.04, 0.42, 0.34,     0.08, 0.55, 0.83,       0.2, -0.8, 0.55,       -0.16],
  s1:      [ 0.06, 0.14, 0.30,     0.42, -0.30, 0.86,      0.45, -0.85, -0.25,    -0.16],       // and cut down across to her low left
  w2:      [ 0.10, 0.14, 0.22,     0.55, -0.25, -0.80,     -0.6, -0.3, -0.75,     -0.16],       // gathered low on her left, the blade behind her,
  m2:      [ 0.02, 0.20, 0.34,     0.30, -0.15, 0.94,      -0.5, 0.6, 0.6,        -0.16],
  s2:      [-0.12, 0.40, 0.34,    -0.50, 0.62, 0.60,       -0.6, 0.5, -0.6,       -0.16],       // and cut up across to her high right
  draw:    [ 0.02, 0.36, 0.34,     0.0, -0.05, 1.0,        0.0, -1.0, 0.0,        -0.16],       // drawn back to her chest, the point at them,
  thrust:  [ 0.0, 0.34, 0.43,      0.0, -0.07, 1.0,        0.0, -1.0, 0.0,        -0.16],       // and sent out
  salute:  [ 0.0, 0.79, 0.34,      0.0, 1.0, 0.03,         1.0, 0.0, 0.0,         -0.16],       // upright before her face
  sweep:   [-0.14, 0.18, 0.28,    -0.75, -0.35, 0.56,      -0.5, 0.2, -0.8,       -0.16],       // and swept down to her right
  upright: [ 0.0, 0.42, 0.34,      0.0, 1.0, 0.0,          1.0, 0.0, 0.0,         -0.16],
  out:     [ 0.10, 0.20, 0.26,     0.85, -0.15, 0.50,      0.5, 0.1, -0.85,       -0.16],       // the end of a cut across
  level:   [-0.28, 0.30, 0.31,     0.97, 0.12, 0.20,       0.0, 0.6, 0.8,          0.44],       // laid level before her, her left hand under the flat of it
  rest:    [-0.06, 0.32, 0.24,    -0.38, 0.50, -0.78,      0.4, 0.3, -0.85,       -0.16],       // laid back on her right shoulder
  look:    [-0.26, 0.60, 0.37,     0.98, 0.10, 0.12,       0.0, 0.3, 0.95,         0.42],       // held level before her eyes, to look in the flat of it
};
const _lgT = new Float64Array(10), _lgB = new Float64Array(10), _lgA = new Float64Array(10), _lgM = new THREE.Matrix4(), _lgQ = new THREE.Quaternion(), _lgQ2 = new THREE.Quaternion(), _lgQ0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(HP2, 0, 0));
function lgSet(T, P) { for (let i = 0; i < 10; i++) T[i] = P[i]; }
function lgMix(T, P, w) { if (w <= 0) return; for (let i = 0; i < 10; i++) T[i] += (P[i] - T[i]) * w; }
function lgBez(T, W, M, S, u) { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; for (let i = 0; i < 10; i++) T[i] = a * W[i] + b * (2 * M[i] - (W[i] + S[i]) / 2) + c * S[i]; }       // from W to S by way of M
function lgCut(T, base, W, M, S, A) {       // a cut over an attack's 0..1: gathered by 0.36, loosed at 0.42, home at 0.6 (when the blow lands), held, and back
  if (A < 0.42) { lgSet(T, base); lgMix(T, W, smooth(A / 0.36)); }
  else if (A < 0.6) { const u = (A - 0.42) / 0.18; lgBez(T, W, M, S, u * (0.3 + 0.7 * u)); }
  else { lgSet(T, S); if (A > 0.72) lgMix(T, base, smooth((A - 0.72) / 0.28)); }
}
/* bend an arm so that what is l2 beyond its elbow comes to (tx, ty, tz) in the space of her chest, the elbow toward the pole
   (px, py, pz); w: how much of that, over what the arm was doing */
function armReach(arm, fore, tx, ty, tz, px, py, pz, l2, w) {
  const l1 = 0.27, S = arm.position; let ax = tx - S.x, ay = ty - S.y, az = tz - S.z, d = Math.sqrt(ax * ax + ay * ay + az * az);
  const dm = l1 + l2 - 0.003, dn = Math.abs(l1 - l2) + 0.03; if (d < 1e-5) { ax = 0; ay = -1; az = 0; d = 1; }
  const dd = d > dm ? dm : d < dn ? dn : d, ux = ax / d, uy = ay / d, uz = az / d;
  const cb = (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), sb = Math.sqrt(Math.max(0, 1 - cb * cb));
  const pd = px * ux + py * uy + pz * uz; let qx = px - pd * ux, qy = py - pd * uy, qz = pz - pd * uz, ql = Math.sqrt(qx * qx + qy * qy + qz * qz);
  if (ql < 1e-4) { qx = uz; qy = 0; qz = -ux; ql = Math.sqrt(qx * qx + qz * qz); if (ql < 1e-4) { qx = 1; qz = 0; ql = 1; } }       // (the pole is along the arm: any way across it)
  qx /= ql; qy /= ql; qz /= ql;
  const ex = cb * ux + sb * qx, ey = cb * uy + sb * qy, ez = cb * uz + sb * qz;       // from the shoulder to the elbow,
  const fx = (dd * ux - l1 * ex) / l2, fy = (dd * uy - l1 * ey) / l2, fz = (dd * uz - l1 * ez) / l2, cq = Math.max(-1, Math.min(1, fx * ex + fy * ey + fz * ez)), bend = Math.acos(cq);       // and from the elbow on
  let zx = fx - cq * ex, zy = fy - cq * ey, zz = fz - cq * ez, zl = Math.sqrt(zx * zx + zy * zy + zz * zz); if (zl < 1e-4) { zx = -qx; zy = -qy; zz = -qz; zl = 1; } zx /= zl; zy /= zl; zz /= zl;
  const yx = -ex, yy = -ey, yz = -ez, xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
  _lgM.set(xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, 0, 0, 0, 1); _lgQ.setFromRotationMatrix(_lgM);
  if (w >= 1) { arm.quaternion.copy(_lgQ); fore.rotation.set(-bend, 0, 0); } else { arm.quaternion.slerp(_lgQ, w); fore.rotation.x += (-bend - fore.rotation.x) * w; }
}
function longSolve(v, g) {       // her arms and her blade, from where the sword is (v.lg.c)
  const B = v.b, c = v.lg.c; if (g <= 0) { B.wpnR.quaternion.copy(_lgQ0); return; }
  let dx = c[3], dy = c[4], dz = c[5], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= l; dy /= l; dz /= l;
  armReach(B.armR, B.foreR, c[0], c[1], c[2], -0.55, -0.75, -0.35, 0.27, g);
  const lh = c[9]; armReach(B.armL, B.foreL, c[0] + dx * lh, c[1] + dy * lh - (lh > 0 ? 0.04 : 0), c[2] + dz * lh, 0.55, -0.75, -0.35, 0.29, g);       // (a hand that is on the blade is under it)
  let ex = c[6], ey = c[7], ez = c[8]; const ed = ex * dx + ey * dy + ez * dz; ex -= ed * dx; ey -= ed * dy; ez -= ed * dz; l = Math.sqrt(ex * ex + ey * ey + ez * ez);
  if (l < 1e-4) { ex = dy; ey = -dx; ez = 0; l = Math.sqrt(ex * ex + ey * ey); if (l < 1e-4) { ex = 1; ey = 0; l = 1; } } ex /= l; ey /= l; ez /= l;
  const zx = ey * dz - ez * dy, zy = ez * dx - ex * dz, zz = ex * dy - ey * dx;
  _lgM.set(ex, dx, zx, 0, ey, dy, zy, 0, ez, dz, zz, 0, 0, 0, 0, 1); _lgQ2.setFromRotationMatrix(_lgM);
  _lgQ.copy(B.armR.quaternion).multiply(B.foreR.quaternion).invert().multiply(_lgQ2);       // the blade's heading, as the right hand has to hold it
  if (g >= 1) B.wpnR.quaternion.copy(_lgQ); else B.wpnR.quaternion.copy(_lgQ0).slerp(_lgQ, g);
}
function longStep(v, s, t, dt, A, C, cu, k) {
  const B = v.b, L = v.lg || (v.lg = { c: Float64Array.from(LONG.guard), g: 1, fk: [0, 0, 0, 0, 0, 0], out: 0 }), F = L.fk, T = _lgT, base = _lgB, P = _lgA;
  F[0] = B.armL.rotation.x; F[1] = B.armL.rotation.z; F[2] = B.foreL.rotation.x; F[3] = B.armR.rotation.x; F[4] = B.armR.rotation.z; F[5] = B.foreR.rotation.x;
  const rk = smooth(v.runK), w = v.walk, sd = v.seed || 0;
  lgSet(base, LONG.guard); lgMix(base, LONG.carry, rk);
  base[1] += Math.sin(t * 2.2 + sd) * 0.006 * (1 - rk) + Math.abs(Math.cos(w)) * 0.025 * rk; base[3] += Math.sin(t * 1.3 + sd) * 0.03 * (1 - rk) + Math.sin(w) * 0.07 * rk; base[4] += Math.sin(t * 1.7 + sd) * 0.02 * (1 - rk); base[5] += Math.cos(w) * 0.05 * rk;       // the point is never quite still, and the blade sways with her stride
  lgSet(T, base);
  if (s.kneel > 0) lgMix(T, LONG.level, smooth(s.kneel));
  if (v.idW > 0) { const lk = win(((v.idle - IDLE_AT) % 7.4) / 7.4, 0.5, 0.92, 0.07); lgMix(T, LONG.rest, v.idW * (1 - lk)); lgMix(T, LONG.look, v.idW * lk); }       // standing idle: the blade on her shoulder, and now and then before her eyes
  if (A >= 0) { const av = v.av || 0; if (av === 2) { if (A < 0.42) { lgSet(T, base); lgMix(T, LONG.draw, smooth(A / 0.36)); } else if (A < 0.6) { const u = (A - 0.42) / 0.18; lgSet(T, LONG.draw); lgMix(T, LONG.thrust, u * (0.3 + 0.7 * u)); } else { lgSet(T, LONG.thrust); if (A > 0.72) lgMix(T, base, smooth((A - 0.72) / 0.28)); } }       // the third of her string: drawn back, and the point sent in
    else if (av === 1) lgCut(T, base, LONG.w2, LONG.m2, LONG.s2, A); else lgCut(T, base, LONG.w1, LONG.m1, LONG.s1, A); }
  if (C) {
    const x = v.clipX, wc = Math.min(1, cu / 0.08) * (1 - smooth(seg01(cu, 0.8, 1))); let on = true;
    if (x === 0) { if (cu < 0.3) { lgSet(P, base); lgMix(P, LONG.draw, smooth(cu / 0.22)); } else { lgSet(P, LONG.draw); lgMix(P, LONG.thrust, smooth((cu - 0.3) / 0.2)); } }       // Glasswalk: drawn back, and the point sent at them
    else if (x === 2) { if (cu < 0.55) { lgSet(P, base); lgMix(P, LONG.salute, smooth(cu / 0.2)); } else { lgSet(P, LONG.salute); lgMix(P, LONG.sweep, smooth((cu - 0.55) / 0.19)); } }       // Quicksilver: the blade upright before her face, then swept down to her side
    else if (x === 4) { if (cu < 0.2) { lgSet(P, LONG.level); lgMix(P, LONG.w2, smooth(cu / 0.16)); } else if (cu < 0.46) { const u = (cu - 0.2) / 0.26; lgBez(P, LONG.w2, LONG.m2, LONG.s2, u * (0.3 + 0.7 * u)); } else lgSet(P, LONG.s2); }       // Rise: off her knee with a cut up across
    else on = false;
    if (on) lgMix(T, P, wc);
  }
  if (L.out > 0) { L.out -= dt; lgMix(T, LONG.out, smooth(Math.min(1, L.out / 0.2))); }
  if (s.recall > 0) { lgSet(P, LONG.upright); P[6] = Math.cos(t * 0.8); P[7] = 0; P[8] = Math.sin(t * 0.8); lgMix(T, P, smooth(Math.min(1, s.recall / 0.04))); }
  const free = !!s.stun || s.air > 0 || s.dead > 0; L.g += ((free ? 0 : 1) - L.g) * Math.min(1, dt * (free ? 14 : 7)); if (L.g < 0.003) L.g = 0; else if (L.g > 0.997) L.g = 1;
  const c = L.c, kk = L.out > 0 ? Math.max(k, Math.min(1, dt * 38)) : k; for (let i = 0; i < 10; i++) c[i] += (T[i] - c[i]) * kk;
  longSolve(v, L.g);
}
/* for one who is not being drawn just now (in the glass), set at once into the end of a cut: which = 0 down across to her left,
   1 up across to her right, 2 the thrust. So that the shape of her seen at each cut is of her making it. */
function longSnap(v, which) {
  if (v.style !== 'long') return; const B = v.b, L = v.lg || (v.lg = { c: Float64Array.from(LONG.guard), g: 1, fk: [0, 0, 0, 0, 0, 0], out: 0 });
  lgSet(L.c, which === 2 ? LONG.thrust : which ? LONG.s2 : LONG.s1); L.g = 1;
  B.hips.rotation.x = which === 1 ? 0.06 : 0.36; B.hips.position.y = v.hipY - (which === 1 ? 0 : 0.09); B.spine.rotation.y = which === 2 ? 0.2 : which ? -0.5 : 0.6; B.head.rotation.set(-0.08, -B.spine.rotation.y * 0.7, 0);
  B.legL.rotation.x = which === 1 ? 0.4 : -0.65; B.shinL.rotation.x = which === 1 ? 0.1 : 0.45; B.legR.rotation.x = which === 1 ? -0.55 : 0.45; B.shinR.rotation.x = which === 1 ? 0.35 : 0.1;
  B.body.rotation.set(0, 0, 0); B.body.position.set(0, 0, 0); longSolve(v, 1);
}
/* ---------- Idle: what each hero does with time on its hands ----------
   A hero that has had nothing asked of it for IDLE_AT seconds eases into its own way of standing about, and out of it the moment
   it moves, attacks or casts. Each is a loop: a way of standing, and a thing done every few seconds. fn(p, Q, T, I, v): p the
   pose to change, by weight I (0..1); T seconds into it; Q what does not fit in a pose (y, rx: the body lifted, tipped; hz: the
   head on one side; spin: the body turning, rad/s; wp: what the right hand holds turned in the hand, wps: or kept turning, rad/s,
   wys: or spun about its own length; wo: or let up out of the hand; orb: Zephyr's, sent round him). */
const IDLE_AT = 0.9, _iq = { y: 0, rx: 0, hz: 0, spin: 0, wp: 0, wps: 0, wys: 0, wo: 0, orb: 0 };
const win = (u, a, b, e) => u <= a || u >= b ? 0 : smooth(Math.min(1, (u - a) / e)) * smooth(Math.min(1, (b - u) / e));       // 1 between a and b of a loop's 0..1, eased over e at either end
/* how high the hips must be for the lower foot (or, kneeling, the knee) to be on the ground, from how the legs of pose p are bent
   and how far the hips are tipped: a thigh of 0.36 and a shin and boot of 0.42 (0.78 standing straight) */
const _legDepth = (p, tx, sx) => { const a = p.hipRx + tx, b = a + sx; return 0.36 * Math.cos(a) + Math.max(0.42 * Math.cos(b), 0.09); };
const footed = p => Math.max(_legDepth(p, p.lLx, p.sLx), _legDepth(p, p.lRx, p.sRx));
const IDLE = {
  bram(p, Q, T, I) {       // bored of standing guard: a great stretch, shield and mace lifted wide over his head and his back arched; then he rolls his head from one shoulder to the other, and settles
    const u = (T % 7) / 7, st = I * win(u, 0.1, 0.5, 0.11), roll = I * win(u, 0.58, 0.96, 0.06), r = Math.sin(seg01(u, 0.6, 0.94) * TAU);
    p.aLx = lerp(p.aLx, -2.75, st); p.fLx = lerp(p.fLx, -0.3, st); p.aLz = lerp(p.aLz, 0.8, st); p.aRx = lerp(p.aRx, -2.75, st); p.fRx = lerp(p.fRx, -0.3, st); p.aRz = lerp(p.aRz, -0.8, st);
    p.hipRx -= 0.2 * st; p.headRx = -0.32 * st + 0.1 * roll; Q.y = 0.035 * st; Q.hz = 0.4 * roll * r; p.spRy += 0.1 * roll * r; p.aLx += 0.12 * roll; p.aRx += 0.12 * roll; p.hipY -= 0.02 * I; },
  thorn(p, Q, T, I) {       // a fist on his hip, and the hook going round and round on its chain at his side; now and then he stops it and lets it go again
    const u = (T % 7) / 7, hold = win(u, 0.78, 0.95, 0.05);
    p.aRx = lerp(p.aRx, -0.3, I); p.fRx = lerp(p.fRx, -0.7 - 0.55 * hold, I); p.aRz = lerp(p.aRz, -0.9, I); Q.wps = 5.6 * I * (1 - hold);
    p.aLx = lerp(p.aLx, 0.3, I); p.fLx = lerp(p.fLx, -1.5, I); p.aLz = lerp(p.aLz, 0.5, I); p.headRx = 0.1 * I; p.headRy = -0.3 * I * (1 - hold); p.hipRx += 0.05 * I; },
  kaela(p, Q, T, I) {       // her sword laid back on her shoulder, a hand on her hip, a foot tapping; and when she tires of waiting, a turn of the blade through the air
    const u = (T % 7.5) / 7.5, fl = I * win(u, 0.62, 0.9, 0.06), r = I - fl, a = seg01(u, 0.66, 0.86) * TAU;
    p.aRx = lerp(p.aRx, -0.55, r); p.fRx = lerp(p.fRx, -2.15, r); p.aRz = lerp(p.aRz, -0.25, r); Q.wp = -0.3 * r + 1.5 * fl * Math.sin(a * 2);
    p.aLx = lerp(p.aLx, 0.25, I); p.fLx = lerp(p.fLx, -1.5, I); p.aLz = lerp(p.aLz, 0.55, I);
    p.lRx -= 0.14 * I; p.sRx += 0.16 * r * Math.max(0, Math.sin(T * 7)); Q.hz = 0.1 * r;
    p.aRx = lerp(p.aRx, -1.25 + 0.3 * Math.sin(a * 2), fl); p.fRx = lerp(p.fRx, -0.5, fl); p.aRz = lerp(p.aRz, 0.5 * Math.sin(a), fl); },
  rook(p, Q, T, I) {       // the hammer's head set on the ground before him and both hands on the end of its haft; he hefts it and lets it drop again
    const u = (T % 6.8) / 6.8, up = win(u, 0.68, 0.92, 0.08) * Math.sin(seg01(u, 0.7, 0.9) * Math.PI);
    p.aRx = lerp(p.aRx, -0.95 - 0.5 * up, I); p.aLx = lerp(p.aLx, -0.95 - 0.5 * up, I); p.fRx = lerp(p.fRx, -0.35, I); p.fLx = lerp(p.fLx, -0.35, I); p.aRz = lerp(p.aRz, 0.3, I); p.aLz = lerp(p.aLz, -0.3, I);
    Q.wp = I * 2.87; p.hipRx += I * (0.14 - 0.12 * up); p.hipY += I * (-0.03 + 0.05 * up); p.headRy = I * 0.35 * Math.sin(T * 0.7) * (1 - up); },
  vex(p, Q, T, I) {       // down on his haunches, a knife turned over and over in his fingers; and a look over each shoulder
    const u = (T % 6) / 6, sp = I * win(u, 0.14, 0.52, 0.05), look = I * win(u, 0.6, 0.96, 0.05), lk = Math.sin(seg01(u, 0.62, 0.94) * TAU);
    p.hipRx += 0.2 * I; p.lLx -= 1.1 * I; p.sLx += 1.5 * I; p.lRx -= 0.95 * I; p.sRx += 1.45 * I; p.hipY += footed(p) - 0.78;       // (knees forward, his feet under him)
    p.aRx = lerp(p.aRx, -0.9, sp); p.fRx = lerp(p.fRx, -1.2, sp); Q.wps = 14 * sp; p.headRy = look * 0.9 * lk; p.spRy += look * 0.25 * lk; },
  tavi(p, Q, T, I) {       // never still: from foot to foot like a runner before the start, and a ring set spinning round his hand
    const b = Math.sin(T * 6.2), u = (T % 5) / 5, sp = I * win(u, 0.4, 0.88, 0.06);
    p.hipY += I * Math.abs(b) * 0.035; p.lLx -= I * 0.32 * Math.max(0, b); p.sLx += I * 0.5 * Math.max(0, b); p.lRx -= I * 0.32 * Math.max(0, -b); p.sRx += I * 0.5 * Math.max(0, -b);
    p.aLx += I * 0.25 * b; p.aRx -= I * 0.25 * b; p.aRx = lerp(p.aRx, -1.1, sp); p.fRx = lerp(p.fRx, -1.0, sp); p.aRz = lerp(p.aRz, -0.7, sp); Q.wps = 16 * sp; p.headRy = I * 0.3 * Math.sin(T * 1.1); },
  kiri(p, Q, T, I, v) {       // the Heron stands on one leg and opens her arms like wings, and lets them down, looking about as a bird does, all at once; the Tiger sways low from foot to foot, then goes down on its haunches and rakes the ground with one set of claws and the other, and shakes its head
    if (v.form) { const u = (T % 6.5) / 6.5, rk = I * win(u, 0.1, 0.62, 0.08), a = seg01(u, 0.16, 0.58) * TAU * 2.5, sh = I * win(u, 0.72, 0.96, 0.03), sw = (I - rk) * Math.sin(T * 1.6), fx = Math.sin(T * 5) * 0.25 * (I - rk);
      p.hipRx += 0.12 * I + 0.36 * rk; p.lLx -= 1.38 * rk + 0.25 * Math.max(0, sw); p.lRx -= 1.38 * rk + 0.25 * Math.max(0, -sw); p.sLx += 0.3 * I + 0.9 * rk; p.sRx += 0.3 * I + 0.9 * rk; p.hipY += footed(p) - 0.78; p.spRy += 0.3 * sw + 0.14 * rk * Math.sin(a);
      p.aLx = lerp(p.aLx, -1.2 + 0.5 * Math.sin(a), rk); p.fLx = lerp(p.fLx, -0.45 - 0.45 * Math.max(0, Math.cos(a)), rk) + fx; p.aRx = lerp(p.aRx, -1.2 - 0.5 * Math.sin(a), rk); p.fRx = lerp(p.fRx, -0.45 - 0.45 * Math.max(0, -Math.cos(a)), rk) - fx; p.headRx -= 0.12 * rk;
      Q.hz = sh * Math.sin(T * 30) * 0.35; p.spRy += sh * Math.sin(T * 30 + 1) * 0.12; return; }
    const st = Math.floor(((T % 8) / 8) * 4), wg = 0.5 - 0.5 * Math.cos(T * TAU / 4);       // (wg: her arms opened, 0..1, every four seconds)
    p.lRx = lerp(p.lRx, -1.35, I); p.sRx = lerp(p.sRx, 2.0, I); p.hipY += I * (0.02 + 0.03 * wg); p.hipRx += I * 0.03 * Math.sin(T * 1.2); Q.hz = I * 0.08 * Math.sin(T * 1.2);
    p.aLx = lerp(p.aLx, -0.12, I); p.fLx = lerp(p.fLx, -0.45 + 0.3 * wg, I); p.aLz = lerp(p.aLz, 0.22 + 1.12 * wg, I); p.aRx = lerp(p.aRx, -0.12, I); p.fRx = lerp(p.fRx, -0.45 + 0.3 * wg, I); p.aRz = lerp(p.aRz, -0.22 - 1.12 * wg, I);
    p.headRy = I * (st === 0 ? 0.6 : st === 1 ? -0.5 : st === 2 ? 0.15 : -0.7); },
  lyra(p, Q, T, I) {       // her staff stood upright beside her and her free hand held open before her, which she studies; then she turns the staff so that its crescent comes round
    const u = (T % 8) / 8, tw = win(u, 0.6, 0.94, 0.06), r = I * (1 - tw);
    p.aRx = lerp(p.aRx, -0.1, I); p.fRx = lerp(p.fRx, -0.2, I); p.aRz = lerp(p.aRz, -0.3, I); Q.wp = -1.27 * I; Q.wys = 5 * I * tw;
    p.aLx = lerp(p.aLx, -0.75, r); p.fLx = lerp(p.fLx, -1.35, r); p.aLz = lerp(p.aLz, -0.15, r); p.headRx = 0.28 * r; p.headRy = 0.3 * r - 0.5 * I * tw; Q.hz = 0.06 * I; p.hipRx += 0.04 * I; },
  zephyr(p, Q, T, I) {       // sits on the air with his legs folded and his hands together in his lap, turning slowly, while the orb goes round him
    p.lLx = lerp(p.lLx, -1.45, I); p.sLx = lerp(p.sLx, 2.1, I); p.lRx = lerp(p.lRx, -1.3, I); p.sRx = lerp(p.sRx, 2.25, I);
    p.aLx = lerp(p.aLx, -0.4, I); p.fLx = lerp(p.fLx, -1.2, I); p.aLz = lerp(p.aLz, -0.35, I); p.aRx = lerp(p.aRx, -0.4, I); p.fRx = lerp(p.fRx, -1.2, I); p.aRz = lerp(p.aRz, 0.35, I);
    p.hipY += I * (0.1 + Math.sin(T * 1.3) * 0.05); Q.spin = 0.55 * I; Q.orb = I; p.headRx = -0.08 * I; },
  orin(p, Q, T, I) {       // tosses the iron leaf up end over end and takes it out of the air again; then tries its edge with his thumb
    const u = (T % 5.6) / 5.6, f = seg01(u, 0.14, 0.48), toss = I * win(u, 0.1, 0.52, 0.04), edge = I * win(u, 0.6, 0.94, 0.06);
    p.aRx = lerp(p.aRx, -1.15 - 0.2 * Math.sin(f * Math.PI), toss); p.fRx = lerp(p.fRx, -0.6, toss); Q.wo = 0.6 * toss * Math.sin(f * Math.PI); Q.wp = toss * f * TAU; p.headRx = -0.25 * toss * Math.sin(f * Math.PI);
    p.aRx = lerp(p.aRx, -0.9, edge); p.fRx = lerp(p.fRx, -1.35, edge); p.aRz = lerp(p.aRz, 0.3, edge); p.aLx = lerp(p.aLx, -0.95, edge); p.fLx = lerp(p.fLx, -1.3, edge); p.aLz = lerp(p.aLz, -0.3, edge); p.headRx += 0.3 * edge; },
  mira(p, Q, T, I) {       // her bow lowered, she shades her eyes and searches the distance one way and then the other; then tries the string
    const u = (T % 7.6) / 7.6, look = I * win(u, 0.08, 0.56, 0.06), lk = Math.sin(seg01(u, 0.1, 0.54) * TAU), pl = I * win(u, 0.66, 0.95, 0.05), tw = Math.max(0, Math.sin(seg01(u, 0.7, 0.92) * Math.PI * 3));
    p.aRx = lerp(p.aRx, -2.25, look); p.fRx = lerp(p.fRx, -1.9, look); p.aRz = lerp(p.aRz, 0.35, look); p.headRy = look * 0.75 * lk; p.spRy += look * 0.3 * lk; p.headRx = -0.06 * look;
    p.aLx = lerp(p.aLx, -1.1, pl); p.fLx = lerp(p.fLx, -0.5, pl); p.aRx = lerp(p.aRx, -1.0, pl); p.fRx = lerp(p.fRx, -1.25 - 0.5 * tw, pl); p.aRz = lerp(p.aRz, 0.15, pl); p.headRx += 0.2 * pl; },
  sera(p, Q, T, I) {       // her hands folded on her wand before her and her head bowed; she rises a little, lifts her face and the wand to the light, and comes down again
    const up = win((T % 8.4) / 8.4, 0.55, 0.94, 0.1);
    p.aRx = lerp(p.aRx, -0.95 - 1.75 * up, I); p.fRx = lerp(p.fRx, -1.35 + 1.2 * up, I); p.aRz = lerp(p.aRz, 0.42 - 0.3 * up, I);
    p.aLx = lerp(p.aLx, -0.95 - 0.25 * up, I); p.fLx = lerp(p.fLx, -1.35 + 0.5 * up, I); p.aLz = lerp(p.aLz, -0.42 + 0.9 * up, I);
    p.headRx = I * (0.28 - 0.6 * up); Q.y = I * (0.03 + 0.06 * up + Math.sin(T * 1.5) * 0.012); },
  miel(p, Q, T, I) {       // lifts the skep on its crook to look in at her bees; then waves one of them off the brim of her hat
    const u = (T % 7.2) / 7.2, lk = I * win(u, 0.08, 0.54, 0.07), wv = I * win(u, 0.62, 0.94, 0.05), w = Math.sin(seg01(u, 0.64, 0.92) * Math.PI * 5);
    p.aRx = lerp(p.aRx, -1.35, lk); p.fRx = lerp(p.fRx, -0.95, lk); p.aRz = lerp(p.aRz, 0.25, lk); p.headRx = -0.12 * lk; p.headRy = -0.3 * lk; Q.hz = 0.12 * lk;
    p.aLx = lerp(p.aLx, -2.5, wv); p.fLx = lerp(p.fLx, -1.3 + 0.35 * w, wv); p.aLz = lerp(p.aLz, 0.25 + 0.2 * w, wv); p.headRx += 0.1 * wv; },
  hesta(p, Q, T, I) {       // holds her gong out at arm's length, draws the beater back and gives it one soft stroke; then stands listening to it, her head on one side, the beater hanging at her side and the gong still swaying on her arm
    const u = (T % 7) / 7, g = I * win(u, 0.08, 0.92, 0.07), dr = g * smooth(seg01(u, 0.15, 0.29)), hit = g * smooth(seg01(u, 0.29, 0.35)), low = g * smooth(seg01(u, 0.44, 0.58)), tt = (u - 0.35) * 7, wob = tt > 0 ? Math.sin(tt * 11) * Math.exp(-tt * 1.5) : 0, ls = g * win(u, 0.36, 0.92, 0.08);
    p.aLx = lerp(p.aLx, -1.4, g); p.fLx = lerp(p.fLx, -0.3 + 0.16 * wob, g); p.aLz = lerp(p.aLz, 0.32 + 0.07 * wob, g);
    p.aRx = lerp(p.aRx, -1.0, dr); p.fRx = lerp(p.fRx, -1.0, dr); p.aRz = lerp(p.aRz, -1.05, dr);       // drawn back, out to her right
    p.aRx = lerp(p.aRx, -1.3, hit); p.fRx = lerp(p.fRx, -0.4, hit); p.aRz = lerp(p.aRz, 0.5, hit);       // across, to the gong
    p.aRx = lerp(p.aRx, 0.06, low); p.fRx = lerp(p.fRx, -0.25, low); p.aRz = lerp(p.aRz, -0.16, low);       // and let hang
    p.spRy += -0.3 * dr * (1 - hit / (g || 1)) + 0.32 * hit * (1 - low / (g || 1)); Q.hz = -0.3 * ls; p.headRy = 0.3 * ls; p.hipY += 0.015 * I; p.hipRx -= 0.03 * I; },
  sorrel(p, Q, T, I) {       // the long gun sloped back on her shoulder; she pushes her cap up with her free hand and takes a long look round under it
    const u = (T % 8) / 8, cap = win(u, 0.5, 0.94, 0.06), lk = Math.sin(seg01(u, 0.56, 0.92) * TAU);
    p.aRx = lerp(p.aRx, -0.6, I); p.fRx = lerp(p.fRx, -2.6, I); p.aRz = lerp(p.aRz, -0.12, I);
    p.aLx = lerp(p.aLx, 0.1 - 2.45 * cap, I); p.fLx = lerp(p.fLx, -0.3 - 1.5 * cap, I); p.aLz = lerp(p.aLz, 0.15 - 0.45 * cap, I);
    p.headRy = I * cap * 0.8 * lk; p.spRy += I * cap * 0.25 * lk; p.headRx = -0.05 * I * cap; p.hipRx -= 0.03 * I; },
  halvar(p, Q, T, I) {       // drives one fist into the other palm, twice; then lowers his head and paws the ground with a boot, like one of his own rams
    const u = (T % 6.2) / 6.2, pd = I * win(u, 0.1, 0.46, 0.05), pn = Math.max(0, Math.sin(seg01(u, 0.14, 0.44) * TAU)), paw = I * win(u, 0.58, 0.94, 0.05), sc = Math.sin(seg01(u, 0.6, 0.92) * Math.PI * 3);
    p.aRx = lerp(p.aRx, -0.95, pd); p.fRx = lerp(p.fRx, -1.25 - 0.35 * pn, pd); p.aRz = lerp(p.aRz, 0.25 + 0.3 * pn, pd); p.aLx = lerp(p.aLx, -0.95, pd); p.fLx = lerp(p.fLx, -1.3, pd); p.aLz = lerp(p.aLz, -0.45, pd);
    p.lRx = lerp(p.lRx, -0.35 + 0.45 * sc, paw); p.sRx = lerp(p.sRx, 0.5 + 0.35 * sc, paw); p.hipRx += paw * 0.22; p.headRx = paw * 0.3; p.aLx = lerp(p.aLx, 0.1, paw); p.aRx = lerp(p.aRx, 0.1, paw); p.fLx = lerp(p.fLx, -0.5, paw); p.fRx = lerp(p.fRx, -0.5, paw); },
  odile(p, Q, T, I) {       // her blade laid back on her shoulder; and now and then held level before her eyes, to look at herself in the flat of it (her sword, and so her arms: longStep). Here, the rest of her
    const lk = win((T % 7.4) / 7.4, 0.5, 0.92, 0.07); p.headRx = I * (0.02 + 0.2 * lk); p.headRy = I * (0.25 - 0.4 * lk); p.spRy -= 0.1 * I * (1 - lk); p.hipY += 0.02 * I; },
};
function animHero(v, s, t, dt) {
  const B = v.b, st = STANCE[v.style], p = _p;
  v.runK += ((s.moving ? 1 : 0) - v.runK) * Math.min(1, dt * 10);
  if (s.moving) v.walk += dt * s.speed * 4.6;
  const rk = v.runK, lk = rk * v.stride, sw = Math.sin(v.walk), cw = Math.cos(v.walk);
  p.aLx = st[0]; p.fLx = st[1]; p.aLz = st[2]; p.aRx = st[3]; p.fRx = st[4]; p.aRz = st[5];
  p.lLx = -sw * 0.8 * lk; p.lRx = sw * 0.8 * lk; p.sLx = Math.max(0, cw) * lk; p.sRx = Math.max(0, -cw) * lk;
  p.hipY = v.hipY + Math.abs(cw) * 0.045 * rk + Math.sin(t * 2.2 + v.seed) * 0.012; p.hipRx = 0.13 * rk; p.spRy = sw * 0.12 * rk; p.headRx = 0; p.headRy = 0;
  if (v.style === 'claw') { p.hipRx += 0.2; p.headRx = -0.16; }       // the Tiger stalks: leaning in, chin up
  if (v.style === 'long') { const q = 1 - rk; p.lLx -= 0.24 * q; p.sLx += 0.12 * q; p.lRx += 0.2 * q; p.sRx += 0.16 * q; p.hipY -= 0.03 * q; p.spRy += 0.14 * q; }       // Odile stands to her guard: one foot before the other, her knees a little bent, her left shoulder leading
  let headRz = 0, bodyRx = 0, bodyY = 0, spin = 0, orb = 0, atkSpin = -1, flare = 0;       // flare: a gust in the clothes from what the body is doing, on top of the wind of moving
  const light = v.style === 'bow' || v.style === 'smash' || v.style === 'hurl' ? 0.35 : v.style === 'rifle' ? 0.12 : 1;
  p.aLx += sw * 0.55 * rk * light; p.aRx += -sw * 0.45 * rk * (v.style === 'bow' ? 1 : 0.4);
  if (v.hover) { p.hipY += v.hover + Math.sin(t * 2.4 + v.seed) * 0.05; p.lLx = 0.12 + rk * 0.25; p.lRx = -0.1 + rk * 0.3; p.sLx = 0.4; p.sRx = 0.55; }
  /* at rest: nothing asked of it for a moment, and from then on what this hero does with time on its hands (IDLE) */
  const rest = !s.moving && !(s.atk >= 0) && !v.clip && !(s.cast > 0) && !s.stun && !(s.air > 0) && !(s.dead > 0) && !(s.recall > 0) && !(s.kneel > 0) && !s.dash && !s.leap && !(s.arrive > 0) && !s.spin && !s.busy;
  v.idle = rest ? (v.idle || 0) + dt : 0;
  const I = v.idle > IDLE_AT ? smooth(Math.min(1, (v.idle - IDLE_AT) / 0.7)) : 0, Q = _iq; v.idW = I; Q.y = Q.rx = Q.hz = Q.spin = Q.wp = Q.wps = Q.wys = Q.wo = Q.orb = 0;
  if (I > 0) { const fn = IDLE[v.key]; if (fn) fn(p, Q, v.idle - IDLE_AT, I, v); headRz += Q.hz; bodyY += Q.y; bodyRx += Q.rx; }
  /* an attack: the first, second or third of this hero's string (v.av), each a different motion over the same timing (gathered by
     0.42, landing at 0.6) */
  const A = s.atk, av = v.av || 0;
  if (A >= 0) {
    switch (v.style) {
      case 'slash':       // a cut down across; a backhand cut back the other way; and a third that is the hero's own (Thorn turns right round with his hook out on its chain, anyone else cuts up from below)
        if (av === 1) { p.aRx = tri(A, p.aRx, -1.75, -1.2); p.fRx = tri(A, p.fRx, -1.5, -0.1); p.aRz = tri(A, p.aRz, 0.95, -0.75); p.spRy = tri(A, p.spRy, 0.65, -0.6); p.hipRx += tri(A, 0, 0.05, 0.2); }
        else if (av === 2 && v.key === 'thorn') { atkSpin = A; p.aRx = tri(A, p.aRx, -0.9, -1.25); p.fRx = tri(A, p.fRx, -0.6, -0.08); p.aRz = tri(A, p.aRz, -0.9, -1.35); p.aLz = tri(A, p.aLz, 0.5, 0.9); p.hipRx += tri(A, 0, 0.05, 0.16); }
        else if (av === 2) { p.aRx = tri(A, p.aRx, 0.75, -2.5); p.fRx = tri(A, p.fRx, -0.5, -0.25); p.aRz = tri(A, p.aRz, -0.3, 0.2); p.spRy = tri(A, p.spRy, -0.6, 0.45); p.hipRx += tri(A, 0, 0.28, -0.12); p.hipY += tri(A, 0, -0.08, 0.05); }
        else { p.aRx = tri(A, p.aRx, -2.75, -0.35); p.fRx = tri(A, p.fRx, -1.2, -0.12); p.aRz = tri(A, p.aRz, -0.55, 0.45); p.spRy = tri(A, p.spRy, -0.55, 0.6); p.hipRx += tri(A, 0, -0.08, 0.22); }
        break;
      case 'smash':       // down from overhead; across from the right; and a third of the hero's own (Bram puts his shoulder behind his shield, Hesta brings the beater up from below)
        if (av === 1) { p.aRx = tri(A, p.aRx, -1.1, -1.25); p.fRx = tri(A, p.fRx, -0.9, -0.1); p.aRz = tri(A, p.aRz, -1.15, 0.7); p.spRy = tri(A, p.spRy, -0.7, 0.65); p.hipRx += tri(A, 0, 0, 0.22); }
        else if (av === 2 && v.key === 'bram') { p.aLx = tri(A, p.aLx, -0.5, -1.45); p.fLx = tri(A, p.fLx, -1.6, -0.35); p.aLz = tri(A, p.aLz, -0.1, -0.3); p.spRy = tri(A, p.spRy, 0.5, -0.6); p.hipRx += tri(A, 0, -0.05, 0.3); p.lLx = tri(A, p.lLx, 0.1, -0.5); p.lRx = tri(A, p.lRx, 0, 0.35); }
        else if (av === 2) { p.aRx = tri(A, p.aRx, 0.7, -2.3); p.fRx = tri(A, p.fRx, -0.4, -0.3); p.spRy = tri(A, p.spRy, -0.5, 0.4); p.hipRx += tri(A, 0, 0.25, -0.1); p.hipY += tri(A, 0, -0.07, 0.04); }
        else { p.aRx = tri(A, p.aRx, -3.0, -0.6); p.fRx = tri(A, p.fRx, -0.7, -0.1); p.spRy = tri(A, p.spRy, -0.3, 0.25); p.hipRx += tri(A, 0, -0.15, 0.3); }
        break;
      case 'smash2':       // the great hammer: down from overhead; swept round from the right, his whole body behind it; and swung up from behind his heel
        if (av === 1) { p.aRx = tri(A, p.aRx, -1.2, -1.15); p.aLx = tri(A, p.aLx, -1.3, -1.05); p.fRx = tri(A, p.fRx, -0.9, -0.2); p.fLx = tri(A, p.fLx, -1.1, -0.3); p.aRz = tri(A, p.aRz, -0.75, 0.85); p.aLz = tri(A, p.aLz, -1.0, 0.35); p.spRy = tri(A, p.spRy, -0.85, 0.8); p.hipRx += tri(A, 0, 0.05, 0.25); p.hipY += tri(A, 0, -0.03, -0.08); }
        else if (av === 2) { p.aRx = tri(A, p.aRx, 0.45, -2.35); p.aLx = tri(A, p.aLx, 0.3, -2.3); p.fRx = tri(A, p.fRx, -0.5, -0.25); p.fLx = tri(A, p.fLx, -0.7, -0.3); p.spRy = tri(A, p.spRy, -0.45, 0.3); p.hipRx += tri(A, 0, 0.35, -0.15); p.hipY += tri(A, 0, -0.1, 0.05); }
        else { p.aRx = tri(A, p.aRx, -3.0, -0.85); p.aLx = tri(A, p.aLx, -3.0, -0.95); p.fRx = tri(A, p.fRx, -0.6, -0.15); p.fLx = tri(A, p.fLx, -0.6, -0.15); p.hipRx += tri(A, 0, -0.22, 0.45); p.hipY += tri(A, 0, 0.05, -0.1); }
        break;
      case 'brawl':       // a straight left, a straight right, and then the drover's own: his head, like one of his rams
        if (av === 2) { p.hipRx += tri(A, 0, -0.3, 0.48); p.headRx = tri(A, 0, -0.35, 0.5); p.aRx = tri(A, p.aRx, 0.5, 0.75); p.aLx = tri(A, p.aLx, 0.5, 0.75); p.fRx = tri(A, p.fRx, -1.2, -0.5); p.fLx = tri(A, p.fLx, -1.2, -0.5); p.aRz = tri(A, p.aRz, -0.3, -0.5); p.aLz = tri(A, p.aLz, 0.3, 0.5); p.hipY += tri(A, 0, 0.03, -0.07); p.lLx = tri(A, p.lLx, 0.1, -0.45); p.lRx = tri(A, p.lRx, 0, 0.35); break; }
      case 'dual':       // a stab with the right, a stab with the left, and both blades drawn across from wide
        if (av === 2) { p.aRx = tri(A, p.aRx, -1.0, -1.15); p.aLx = tri(A, p.aLx, -1.0, -1.15); p.fRx = tri(A, p.fRx, -0.5, -0.2); p.fLx = tri(A, p.fLx, -0.5, -0.2); p.aRz = tri(A, p.aRz, -1.25, 0.75); p.aLz = tri(A, p.aLz, 1.25, -0.75); p.hipRx += tri(A, 0, -0.1, 0.3); p.hipY += tri(A, 0, 0.04, -0.06); break; }
        if (av === 1) { p.aLx = tri(A, p.aLx, 0.35, -1.45); p.fLx = tri(A, p.fLx, -1.7, -0.1); p.spRy = tri(A, p.spRy, 0.45, -0.5); }
        else { p.aRx = tri(A, p.aRx, 0.35, -1.45); p.fRx = tri(A, p.fRx, -1.7, -0.1); p.spRy = tri(A, p.spRy, -0.45, 0.5); }
        p.hipRx += tri(A, 0, 0, 0.18); break;
      case 'long':       // Odile: a cut down across from high on her right, a cut up across from low on her left, and a thrust. The sword leads (longStep); this is what her body does behind it: the turn of her chest, the step under the cut
        if (av === 2) { p.spRy = tri(A, p.spRy, -0.3, 0.22); p.hipRx += tri(A, 0, 0.12, 0.45); p.hipY += tri(A, 0, -0.03, -0.1); p.lLx = tri(A, p.lLx, 0.15, -0.85); p.sLx = tri(A, p.sLx, 0.1, 0.55); p.lRx = tri(A, p.lRx, 0, 0.5); }
        else if (av === 1) { p.spRy = tri(A, p.spRy, 0.6, -0.5); p.hipRx += tri(A, 0, 0.26, -0.04); p.hipY += tri(A, 0, -0.09, 0.03); p.lRx = tri(A, p.lRx, 0.12, -0.55); p.sRx = tri(A, p.sRx, 0.1, 0.35); p.lLx = tri(A, p.lLx, 0, 0.4); }
        else { p.spRy = tri(A, p.spRy, -0.55, 0.6); p.hipRx += tri(A, 0, -0.1, 0.34); p.hipY += tri(A, 0, 0.03, -0.08); p.lLx = tri(A, p.lLx, 0.12, -0.6); p.sLx = tri(A, p.sLx, 0.1, 0.4); p.lRx = tri(A, p.lRx, 0, 0.42); }
        break;
      case 'claw':       // the Tiger: one set of claws, the other, and both brought down together from over its head
        if (av === 2) { p.aRx = tri(A, p.aRx, -2.7, -0.7); p.aLx = tri(A, p.aLx, -2.7, -0.7); p.fRx = tri(A, p.fRx, -0.9, -0.2); p.fLx = tri(A, p.fLx, -0.9, -0.2); p.aRz = tri(A, p.aRz, -0.35, 0.2); p.aLz = tri(A, p.aLz, 0.35, -0.2); p.hipRx += tri(A, 0, -0.25, 0.42); p.hipY += tri(A, 0, 0.06, -0.12); break; }
      case 'fans':       // a wide flick of one ring, then the other, and then a turn on his heel with both of them out
        if (av === 2 && v.style === 'fans') { atkSpin = A; p.aRx = tri(A, p.aRx, -1.2, -1.3); p.aLx = tri(A, p.aLx, -1.2, -1.3); p.aRz = tri(A, p.aRz, -1.1, -1.45); p.aLz = tri(A, p.aLz, 1.1, 1.45); p.fRx = p.fLx = -0.12; break; }
        if (av === 1) { p.aLx = tri(A, p.aLx, -1.9, -0.55); p.fLx = tri(A, p.fLx, -1.55, -0.12); p.aLz = tri(A, p.aLz, 0.95, -0.45); p.spRy = tri(A, p.spRy, 0.6, -0.65); }
        else { p.aRx = tri(A, p.aRx, -1.9, -0.55); p.fRx = tri(A, p.fRx, -1.55, -0.12); p.aRz = tri(A, p.aRz, -0.95, 0.45); p.spRy = tri(A, p.spRy, -0.6, 0.65); }
        p.hipRx += tri(A, 0, -0.06, 0.2); break;
      case 'reap':       // a full turn with both blades out; a rising two-handed cut that lifts off the ground; and the two blades closed on them from either side
        if (av === 0) { atkSpin = A; p.aRx = tri(A, p.aRx, -0.3, -1.3); p.aLx = tri(A, p.aLx, -0.3, -1.3); p.aRz = tri(A, p.aRz, -1.5, -0.2); p.aLz = tri(A, p.aLz, 1.5, 0.2); p.fRx = p.fLx = -0.1; }
        else if (av === 2) { p.aRx = tri(A, p.aRx, -1.1, -1.2); p.aLx = tri(A, p.aLx, -1.1, -1.2); p.aRz = tri(A, p.aRz, -1.5, 0.8); p.aLz = tri(A, p.aLz, 1.5, -0.8); p.fRx = p.fLx = -0.15; bodyY += Math.sin(Math.min(1, A / 0.75) * Math.PI) * 0.15; p.hipRx += tri(A, 0, -0.15, 0.3); }
        else { p.aRx = tri(A, p.aRx, 0.5, -2.7); p.aLx = tri(A, p.aLx, 0.5, -2.7); p.aRz = tri(A, p.aRz, 0.4, -0.5); p.aLz = tri(A, p.aLz, -0.4, 0.5); p.fRx = tri(A, p.fRx, -1.2, -0.15); p.fLx = tri(A, p.fLx, -1.2, -0.15); bodyY += Math.sin(Math.min(1, A / 0.75) * Math.PI) * 0.3; p.hipRx += tri(A, 0, 0.3, -0.25); }
        break;
      case 'bow': {       // standing to it; down on one knee for it; and a high one, leaning back
        const e = smooth(seg01(A, 0, 0.22)) * (1 - smooth(seg01(A, 0.8, 1))), q = A < 0.6 ? smooth(seg01(A, 0.12, 0.55)) : 1 - smooth(seg01(A, 0.6, 0.66)), hi = av === 2 ? 0.3 : 0;
        p.aLx = lerp(p.aLx, -1.52 - hi, e); p.fLx = lerp(p.fLx, -0.06, e); p.aLz = lerp(p.aLz, -0.1, e); p.aRx = lerp(p.aRx, -1.25 - hi, e); p.fRx = lerp(p.fRx, lerp(-0.7, -2.2, q), e); p.aRz = lerp(p.aRz, -0.25, e); p.spRy = lerp(p.spRy, -0.3, e); p.headRy = 0.25 * e;
        if (av === 1) { const kn = e * clamp((v.clipDur - 0.24) / 0.2, 0.35, 1);       // (as far down as there is time for: a quick shot is only a dip)
          p.lLx = lerp(p.lLx, -1.45, kn); p.sLx = lerp(p.sLx, 1.55, kn); p.lRx = lerp(p.lRx, 0.2, kn); p.sRx = lerp(p.sRx, 1.45, kn); p.hipY += footed(p) - 0.78; p.spRy = lerp(p.spRy, -0.52, e); p.aLz = lerp(p.aLz, 0.14, e); }
        else if (av === 2) { p.hipRx -= 0.2 * e; p.headRx = -0.14 * e; p.lRx = lerp(p.lRx, 0.3, e); p.lLx = lerp(p.lLx, -0.2, e); }
        break;
      }
      case 'rifle': {       // the long gun brought up to the shoulder; fired from the hip; and from one knee. It kicks as the shot leaves (at 0.6) and settles
        const e = smooth(seg01(A, 0, 0.3)) * (1 - smooth(seg01(A, 0.84, 1))), kick = A >= 0.6 ? 1 - smooth(seg01(A, 0.6, 0.8)) : 0;
        if (av === 1) { p.aRx = lerp(p.aRx, 0.25 - 0.12 * kick, e); p.fRx = lerp(p.fRx, -1.75, e); p.aRz = lerp(p.aRz, -0.12, e); p.aLx = lerp(p.aLx, -0.55 - 0.1 * kick, e); p.fLx = lerp(p.fLx, -0.95, e); p.aLz = lerp(p.aLz, -0.5, e); p.hipRx -= (0.1 + 0.1 * kick) * e; p.hipY -= 0.04 * e; p.headRy = 0.2 * e; p.lLx = lerp(p.lLx, -0.25, e); p.lRx = lerp(p.lRx, 0.25, e); break; }
        p.aRx = lerp(p.aRx, -1.44 - 0.2 * kick, e); p.fRx = lerp(p.fRx, -0.1, e); p.aRz = lerp(p.aRz, 0.1, e); p.aLx = lerp(p.aLx, -1.32 - 0.12 * kick, e); p.fLx = lerp(p.fLx, -0.28, e); p.aLz = lerp(p.aLz, -0.55, e); p.headRy = 0.25 * e; p.headRx = 0.06 * e - 0.1 * kick * e; p.hipRx -= 0.07 * kick * e;
        if (av === 2) { const kn = e * clamp((v.clipDur - 0.24) / 0.2, 0.35, 1); p.hipRx += 0.1 * kn; p.lLx = lerp(p.lLx, -1.45, kn); p.sLx = lerp(p.sLx, 1.55, kn); p.lRx = lerp(p.lRx, 0.2, kn); p.sRx = lerp(p.sRx, 1.45, kn); p.hipY += footed(p) - 0.78; p.headRx += 0.08 * e; }       // (leaning into the stock)
        break;
      }
      case 'hurl':       // an overarm throw; a low sidearm one from the right; and a backhand from across his body. The leaf leaves his hand as the arm comes through (see below: it is gone from the hand until he has a fresh one)
        if (av === 1) { p.aRx = tri(A, p.aRx, -0.75, -1.3); p.fRx = tri(A, p.fRx, -1.0, -0.05); p.aRz = tri(A, p.aRz, -1.3, 0.35); p.spRy = tri(A, p.spRy, -0.9, 0.7); p.aLx = tri(A, p.aLx, -0.9, 0.3); p.hipRx += tri(A, 0, 0.1, 0.3); p.hipY += tri(A, 0, -0.06, -0.08); }
        else if (av === 2) { p.aRx = tri(A, p.aRx, -1.0, -1.4); p.fRx = tri(A, p.fRx, -1.9, -0.05); p.aRz = tri(A, p.aRz, 1.0, -0.35); p.spRy = tri(A, p.spRy, 0.75, -0.5); p.aLx = tri(A, p.aLx, 0.3, -0.6); p.hipRx += tri(A, 0, 0.05, 0.2); }
        else { p.aRx = tri(A, p.aRx, -2.6, -1.25); p.fRx = tri(A, p.fRx, -1.9, -0.05); p.aRz = tri(A, p.aRz, -0.4, 0.3); p.spRy = tri(A, p.spRy, -0.7, 0.55); p.aLx = tri(A, p.aLx, -1.0, 0.5); p.fLx = tri(A, p.fLx, -0.3, -0.5); p.hipRx += tri(A, 0, -0.1, 0.28); }
        break;
      case 'cast':       // sent from both hands; swung over and down at them with what she holds; and a third of each one's own
        if (av === 1) { p.aRx = tri(A, p.aRx, -2.75, -1.25); p.fRx = tri(A, p.fRx, -0.9, -0.1); p.aRz = tri(A, p.aRz, -0.3, 0.25); p.aLx = tri(A, p.aLx, -0.3, 0.2); p.fLx = tri(A, p.fLx, -1.3, -0.9); p.spRy = tri(A, p.spRy, -0.45, 0.4); p.hipRx += tri(A, 0, -0.1, 0.2); }
        else if (av === 2 && v.key === 'lyra') { p.aLx = tri(A, p.aLx, -0.4, -1.55); p.fLx = tri(A, p.fLx, -1.7, -0.05); p.aLz = tri(A, p.aLz, 0.2, -0.1); p.aRx = tri(A, p.aRx, -0.55, -0.5); p.fRx = tri(A, p.fRx, -1.2, -1.3); p.spRy = tri(A, p.spRy, 0.45, -0.5); p.hipRx += tri(A, 0, -0.05, 0.16); }       // her open left hand sent out, the staff held upright at her side
        else if (av === 2 && v.key === 'sera') { p.aRx = tri(A, p.aRx, -3.0, -1.5); p.fRx = tri(A, p.fRx, -0.1, -0.05); p.aLx = tri(A, p.aLx, -1.2, -0.9); p.fLx = tri(A, p.fLx, -1.5, -1.3); p.aLz = tri(A, p.aLz, -0.35, -0.3); p.headRx = tri(A, 0, -0.3, 0); bodyY += tri(A, 0, 0.06, 0); }       // the wand lifted high, and brought down to point
        else if (av === 2 && v.key === 'miel') { p.aRx = tri(A, p.aRx, -0.5, -1.45); p.fRx = tri(A, p.fRx, -1.6, -0.1); p.aLx = tri(A, p.aLx, -0.5, -1.3); p.fLx = tri(A, p.fLx, -1.6, -0.5); p.aLz = tri(A, p.aLz, -0.3, -0.45); p.aRz = tri(A, p.aRz, 0.2, 0.3); p.hipRx += tri(A, 0, -0.08, 0.22); p.lLx = tri(A, p.lLx, 0, -0.4); }       // the crook levelled at them in both hands, a step behind it
        else if (av === 2) { p.aRx = tri(A, p.aRx, -0.6, -1.5); p.fRx = tri(A, p.fRx, -1.9, -0.1); p.aLx = tri(A, p.aLx, -0.6, -1.5); p.fLx = tri(A, p.fLx, -1.9, -0.1); p.aRz = tri(A, p.aRz, 0.35, 0.3); p.aLz = tri(A, p.aLz, -0.35, -0.3); p.hipRx += tri(A, 0, -0.1, 0.2); }       // (the Heron) both palms sent out together
        else { p.aRx = tri(A, p.aRx, -0.9, -1.3); p.fRx = tri(A, p.fRx, -1.7, -0.45); p.aLx = tri(A, p.aLx, -0.6, -1.25); p.fLx = tri(A, p.fLx, -0.8, -0.15); p.hipRx += tri(A, 0, -0.06, 0.14); }
        break;
      case 'orb':       // pushed out from both hands; swept across with one; and lifted over his head and brought down
        if (av === 1) { p.aRx = tri(A, p.aRx, -1.3, -1.35); p.fRx = tri(A, p.fRx, -1.2, -0.1); p.aRz = tri(A, p.aRz, 0.9, -0.7); p.aLx = tri(A, p.aLx, -0.3, -0.2); p.spRy = tri(A, p.spRy, 0.5, -0.5); orb = tri(A, 0, -0.1, 1); }
        else if (av === 2) { p.aRx = tri(A, p.aRx, -2.8, -1.2); p.aLx = tri(A, p.aLx, -2.8, -1.2); p.fRx = tri(A, p.fRx, -0.3, -0.1); p.fLx = tri(A, p.fLx, -0.3, -0.1); p.aRz = tri(A, p.aRz, -0.3, 0.1); p.aLz = tri(A, p.aLz, 0.3, -0.1); bodyY += tri(A, 0, 0.1, -0.04); orb = tri(A, 0, -0.3, 1); }
        else { p.aRx = tri(A, p.aRx, -0.2, -1.5); p.fRx = tri(A, p.fRx, -1.3, -0.08); p.aLx = tri(A, p.aLx, -0.2, -1.2); p.fLx = tri(A, p.fLx, -1.0, -0.2); orb = tri(A, 0, -0.15, 1); }
        break;
    }
  }
  if (s.dead > 0) v.clip = null;
  let C = v.clip, cu = 0;
  if (C) { cu = (v.clipU += dt / v.clipD); if (cu >= 1) C = v.clip = null; }
  const c = C ? 0 : s.cast || 0;
  if (c > 0) {       // plain cast pose (battle spells and skills without a clip)
    if (v.style === 'cast' || v.style === 'orb') { p.aRx = lerp(p.aRx, -2.3, c * 0.85); p.aLx = lerp(p.aLx, -1.9, c * 0.85); p.fRx = lerp(p.fRx, -0.5, c); orb = Math.max(orb, c * 0.6); }
    else { p.aLx = lerp(p.aLx, -1.5, c * 0.7); p.fLx = lerp(p.fLx, -0.3, c); p.spRy += 0.25 * c; }
    p.hipRx -= 0.08 * c;
  }
  if (s.dash) { p.hipRx = 0.5; p.lLx = -0.95; p.sLx = 0.3; p.lRx = 0.8; p.sRx = 0.5; p.aLx = 0.9; p.aRx = Math.min(p.aRx, -0.2); flare = 0.3; }
  if (s.leap) { p.lLx = p.lRx = -0.9; p.sLx = p.sRx = 1.4; p.aRx = -2.7; p.aLx = v.style === 'smash2' ? -2.7 : -2.0; p.hipRx = 0.2; flare = 0.3; }
  if (s.spin) { spin = 1; p.aRz = -1.45; p.aLz = 1.45; p.aRx = p.aLx = 0; p.fRx = p.fLx = -0.1; flare = 0.2; }
  if (C) {
    const w = (C.snap ? 1 : Math.min(1, cu / 0.1)) * (1 - smooth(seg01(cu, 0.78, 1)));
    for (const ch of CLIP_CH) { const a = C[ch]; if (a) p[ch] = lerp(p[ch], KF(cu, a), w); }
    if (C.hipY) p.hipY += KF(cu, C.hipY) * w;
    if (C.orb) orb = lerp(orb, KF(cu, C.orb), w);
    if (C.hop) bodyY += C.hop * Math.sin(Math.min(1, cu / 0.62) * Math.PI);
    flare = Math.max(flare, 0.55 * w);
  }
  if (A >= 0) flare = Math.max(flare, 0.3 * Math.sin(Math.min(1, A) * Math.PI));
  if (s.kneel > 0) {       // on one knee (Odile's Anneal), her head bowed over the blade she holds level before her (the blade: longStep)
    const k = smooth(s.kneel); p.hipY = lerp(p.hipY, 0.47, k) + Math.sin(t * 2.4) * 0.008 * k; p.hipRx = lerp(p.hipRx, 0.12, k); p.spRy = lerp(p.spRy, 0, k);
    p.lLx = lerp(p.lLx, -1.5, k); p.sLx = lerp(p.sLx, 1.5, k); p.lRx = lerp(p.lRx, 0.12, k); p.sRx = lerp(p.sRx, 1.6, k);
    p.aRx = lerp(p.aRx, -1.05, k); p.fRx = lerp(p.fRx, -0.75, k); p.aRz = lerp(p.aRz, 0.12, k); p.aLx = lerp(p.aLx, -0.55, k); p.fLx = lerp(p.fLx, -1.25, k); p.aLz = lerp(p.aLz, -0.2, k); p.headRx = lerp(p.headRx, 0.32, k);
  }
  if (s.stun) { p.hipRx = 0.14 + Math.sin(t * 9) * 0.04; p.headRx = 0.35; headRz = Math.sin(t * 6) * 0.3; p.aLx = p.aRx = 0.1; p.fLx = p.fRx = -0.2; }
  let rYaw = null, rSpin = I > 0 ? Q.spin : 0, lift = 0, wpT = I > 0 ? Q.wp : 0, airRx = 0;
  if (s.air > 0) {       // thrown into the air: flung back, arms and legs trailing; gathered in again on the way down
    const e = Math.min(1, s.air * 7) * (1 - smooth(seg01(s.air, 0.82, 1))), w = Math.sin(t * 13 + v.seed) * 0.12; airRx = -0.62 * e;
    p.aLz = lerp(p.aLz, 1.3 + w, e); p.aRz = lerp(p.aRz, -1.3 + w, e); p.aLx = lerp(p.aLx, -0.7, e); p.aRx = lerp(p.aRx, -0.7, e); p.fLx = lerp(p.fLx, -0.5, e); p.fRx = lerp(p.fRx, -0.5, e);
    p.lLx = lerp(p.lLx, -0.55 - w, e); p.lRx = lerp(p.lRx, 0.2 + w, e); p.sLx = lerp(p.sLx, 0.9, e); p.sRx = lerp(p.sRx, 0.5, e); p.headRx = lerp(p.headRx, -0.35, e); p.hipRx = lerp(p.hipRx, -0.12, e); headRz *= 1 - e; flare = Math.max(flare, 0.5 * e);
  }
  if (s.recall > 0) {       // each hero's own way of waiting; at the very end they are drawn up and away
    const R = _rq, fn = RECALL[v.key]; R.y = R.rx = R.hz = R.spin = R.wp = 0; R.yaw = null; p.hov = !!v.hover;
    if (fn) fn(p, R, s.recall * 6, s.recall); else { p.aLz += 0.25; p.aRz -= 0.25; p.headRx = -0.2; R.y = 0.04 + Math.sin(t * 4) * 0.02; }
    bodyY += R.y; bodyRx += R.rx; headRz += R.hz; rYaw = R.yaw; rSpin = R.spin; wpT = R.wp; flare = Math.max(flare, 0.12);       // (wpT: the weapon turned in the hand)
    const q = seg01(s.recall, 0.93, 1); lift = q * q;
  }
  if (s.arrive > 0) lift = Math.max(lift, (1 - smooth(Math.min(1, s.arrive / 0.7))) * 1.1);       // and set down again at the fountain, with a bend of the knees
  if (s.arrive > 0.55) { const a = Math.sin(seg01(s.arrive, 0.55, 1) * Math.PI); p.hipY -= 0.16 * a; p.lLx -= 0.5 * a; p.lRx -= 0.5 * a; p.sLx += 0.9 * a; p.sRx += 0.9 * a; p.hipRx += 0.15 * a; }
  bodyY += lift * 1.5;
  if (s.dead > 0 && v.style === 'reap') { const d = smooth(Math.min(1, s.dead * 1.5)); bodyY = 0.95 * d; spin = 1; p.aLz = 1.5; p.aRz = -1.5; p.aLx = p.aRx = -0.2; p.fLx = p.fRx = -0.1; p.headRx = -0.7 * d; p.lLx = 0.2; p.lRx = -0.15; p.sLx = p.sRx = 0.6; }       // it does not fall: it is lifted, turning, arms wide, into its own eclipse
  else if (s.dead > 0) { const d = smooth(Math.min(1, s.dead * 2.2)); airRx = 0; bodyRx = -1.5 * d; bodyY = 0.14 * d; p.aLz = lerp(p.aLz, 1.2, d); p.aRz = lerp(p.aRz, -1.2, d); p.aLx = p.aRx = 0; p.lLx = -0.2 * d; p.lRx = 0.15 * d; p.hipY = v.hipY; }
  const k = Math.min(1, dt * (A >= 0 || C || s.dash || s.leap ? 38 : 16)), set = (o, ax, val) => { o.rotation[ax] += (val - o.rotation[ax]) * k; };
  if (v.lg) { const F = v.lg.fk; B.armL.rotation.set(F[0], 0, F[1]); B.foreL.rotation.set(F[2], 0, 0); B.armR.rotation.set(F[3], 0, F[4]); B.foreR.rotation.set(F[5], 0, 0); }       // (Odile: her arms as they would be without her sword to lead them, before it does)
  set(B.armL, 'x', p.aLx); set(B.foreL, 'x', p.fLx); set(B.armL, 'z', p.aLz); set(B.armR, 'x', p.aRx); set(B.foreR, 'x', p.fRx); set(B.armR, 'z', p.aRz);
  set(B.legL, 'x', p.lLx); set(B.legR, 'x', p.lRx); set(B.shinL, 'x', p.sLx); set(B.shinR, 'x', p.sRx);
  B.hips.position.y += (p.hipY - B.hips.position.y) * k; set(B.hips, 'x', p.hipRx); set(B.spine, 'y', p.spRy);
  set(B.head, 'x', p.headRx); set(B.head, 'y', p.headRy - p.spRy * 0.7); set(B.head, 'z', headRz);
  if (v.style === 'long') longStep(v, s, t, dt, A, C, cu, k);
  if (C && C.roll) { const a = TAU * C.roll * cu, h = 0.8, ca = Math.cos(a); B.body.rotation.x = a; B.body.position.y = h - h * ca + (0.21 + (C.lift || 0) * 0.5) * (1 - ca); B.body.position.z = -h * Math.sin(a); }      // somersault about the hips, lifted so the head (and whatever it wears) clears the ground
  else {
    if (B.body.rotation.x > Math.PI) B.body.rotation.x -= TAU;
    B.body.rotation.x += (bodyRx + airRx - B.body.rotation.x) * Math.min(1, dt * 14); B.body.position.y += (bodyY - B.body.position.y) * k; B.body.position.z = 0;
  }
  if (C && C.spin) B.body.rotation.y = -TAU * C.spin * (1 - (1 - cu) * (1 - cu));
  else if (atkSpin >= 0) B.body.rotation.y = -TAU * smooth(Math.min(1, atkSpin / 0.7));
  else if (spin) B.body.rotation.y -= dt * 21; else if (rSpin) B.body.rotation.y += dt * rSpin; else B.body.rotation.y = angLerp(B.body.rotation.y, rYaw == null ? 0 : rYaw, Math.min(1, dt * (rYaw == null ? 14 : 7)));
  { const sy = 1 + lift * 0.55, sx = 1 - Math.min(0.8, lift * 0.7), bs = B.body.scale; bs.x += (sx - bs.x) * k; bs.z = bs.x; bs.y += (sy - bs.y) * k; }       // drawn thin as the light takes them
  if (B.crest) set(B.crest, 'x', -0.12 - rk * 0.42 + Math.sin(t * 3.1 + v.seed) * 0.05 - (C ? 0.2 : 0));
  if (B.corona) { B.rays.rotation.z = t * 0.5; const q = 1 + Math.sin(t * 2.3 + v.seed) * 0.04 + (C || A >= 0 ? 0.14 : 0), c0 = B.corona.scale.x; B.corona.scale.setScalar(c0 + (q - c0) * Math.min(1, dt * 8)); }
  if (B.wings) {       // the hanging blades spread when it strikes or casts and fold when it idles
    const o = v.wOpen = (v.wOpen || 0) + (Math.min(1, (A >= 0 ? 1 : 0) + (C ? 1 : 0) + rk * 0.45) - (v.wOpen || 0)) * Math.min(1, dt * 9);
    B.wings.position.y = 1.36 + (v.hover || 0) + Math.sin(t * 1.9 + v.seed) * 0.05;
    for (let i = 0; i < 4; i++) { const w = B['wb' + i], kk = w.userData.k, hi = w.userData.hi; w.rotation.z = -kk * ((hi ? 0.35 : 0.95) + o * (hi ? 0.5 : 0.55) + Math.sin(t * 2.2 + i * 1.3) * 0.05); w.rotation.x = -0.25 - o * 0.35 + Math.sin(t * 1.7 + i) * 0.04; }
  }
  if (v.style !== 'long') {       // what the right hand holds, turned in the hand (wpT), kept turning (wps: Thorn's hook on its chain) or spun about its own length (wys), and let up out of the hand (wo: Orin's leaf, tossed)
    const ws = I > 0 ? Q.wps : 0, wy = I > 0 ? Q.wys : 0, wo = I > 0 ? Q.wo : 0, wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    if (ws) v.wsA = (v.wsA || 0) + dt * ws; else if (v.wsA) { v.wsA = wrap(v.wsA) * Math.max(0, 1 - dt * 10); if (Math.abs(v.wsA) < 0.01) v.wsA = 0; }
    if (wy) v.wyA = (v.wyA || 0) + dt * wy; else if (v.wyA) { v.wyA = wrap(v.wyA) * Math.max(0, 1 - dt * 10); if (Math.abs(v.wyA) < 0.01) v.wyA = 0; }
    if (wpT || v.wpT || v.wsA || v.wsOn) { v.wpT = (v.wpT || 0) + (wpT - (v.wpT || 0)) * Math.min(1, dt * (wpT ? 9 : 18)); if (!wpT && Math.abs(v.wpT) < 0.004) v.wpT = 0; if (v.wr0 == null) v.wr0 = B.wpnR.rotation.x; B.wpnR.rotation.x = v.wr0 + v.wpT + (v.wsA || 0); v.wsOn = !!v.wsA; }
    if (v.wyA || v.wyOn) { B.wpnR.rotation.y = v.wyA || 0; v.wyOn = !!v.wyA; }
    if (wo || v.woT) { v.woT = (v.woT || 0) + (wo - (v.woT || 0)) * Math.min(1, dt * 30); if (!wo && Math.abs(v.woT) < 0.004) v.woT = 0; B.wpnR.position.z = v.woT; }
  }
  if (v.style === 'hurl') {       // what he throws is out of his hand from the moment of release, and a fresh leaf snaps into it soon after
    const w = B.wpnR, out = (A >= 0.6 && A < 0.96) || (!!C && v.clipI === 1 && cu > 0.3 && cu < 0.9);
    if (out) { if (w.visible) w.visible = false; v.wk = 0; }
    else { if (!w.visible) { w.visible = true; v.wk = 0.001; } if (v.wk > 0) { v.wk = Math.min(1, v.wk + dt * 6.5); const q = v.wk, e = 1 + 2.2 * Math.pow(q - 1, 3) + 1.2 * Math.pow(q - 1, 2); w.scale.setScalar(0.3 + 0.7 * e); if (q >= 1) { v.wk = 0; w.scale.setScalar(1); } } }
  }
  clothStep(v, t, dt, flare + (v.hover ? 0.12 : 0));
  if (B.skorb) { B.skorb.rotation.y = t * 1.7 + v.seed; B.skorb.position.y = 1.12 + Math.sin(t * 2.1 + v.seed) * 0.06; }
  if (B.orb) { const oi = v.orbI = (v.orbI || 0) + ((I > 0 ? Q.orb : 0) - (v.orbI || 0)) * Math.min(1, dt * 6), oa = t * 1.5; B.orb.position.x = Math.sin(oa) * 0.62 * oi; B.orb.position.z = lerp(0.3 + orb * 0.5, Math.cos(oa) * 0.62, oi); B.orb.position.y = 1.22 + Math.sin(t * 2.6) * 0.06 + (v.hover || 0); const sc = 1 + Math.max(0, orb) * 0.6; B.orb.scale.set(sc, sc, sc); B.motes.rotation.y = t * 3.2; B.motes.rotation.x = t * 1.1; }
  if (B.bees) {       // her bees: slow rounds close to her while she tends, fast and wide while she stings (v.sting, 0..1, is set by the view from her temper)
    const q = v.sting || 0, sc = 1 + q * 0.3; v.beeA = (v.beeA == null ? v.seed : v.beeA) + dt * (2.3 + q * 4.8);
    B.bees.rotation.y = v.beeA; B.bees.rotation.z = Math.sin(t * 1.7 + v.seed) * (0.2 + q * 0.25); B.bees.position.y = 1.34 + Math.sin(t * 2.3 + v.seed) * 0.05; B.bees.scale.setScalar(sc);
    B.bees2.rotation.y = -v.beeA * 1.37; B.bees2.rotation.x = Math.sin(t * 1.3 + v.seed) * (0.22 + q * 0.3); B.bees2.scale.setScalar(sc);
    if (!v.beeW) { v.beeW = []; B.bees.traverse(x => { if (x.userData.beeWing) v.beeW.push(x); }); B.bees2.traverse(x => { if (x.userData.beeWing) v.beeW.push(x); }); }
    for (let i = 0; i < v.beeW.length; i++) v.beeW[i].scale.y = Math.cos(t * (46 + q * 16) + i * 1.9);       // wings
  }
  if (B.skep) {       // the skep hangs plumb from the crook, and comes round to it a little late when the crook is swung
    if (s.dead > 0) { B.skep.quaternion.slerp(_skI, Math.min(1, dt * 6)); v.skq = null; }
    else {
      B.wpnR.getWorldQuaternion(_skA); v.o.getWorldQuaternion(_skB);
      if (!v.skq) v.skq = new THREE.Quaternion().copy(_skB); else v.skq.copy(_skA).multiply(B.skep.quaternion).slerp(_skB, Math.min(1, dt * 10));
      B.skep.quaternion.copy(_skA).invert().multiply(v.skq);
    }
  }
}
const _skA = new THREE.Quaternion(), _skB = new THREE.Quaternion(), _skI = new THREE.Quaternion();
function animUnit(v, u, s, t, dt) {
  const B = v.b, sub = v.sub;
  v.runK += ((s.moving ? 1 : 0) - v.runK) * Math.min(1, dt * 10);
  if (s.moving) v.walk += dt * s.speed * (sub === 'lord' ? 2.2 : 6);
  const sw = Math.sin(v.walk), A = s.atk, k = Math.min(1, dt * 22);
  if (v.kind === 'minion' && sub !== 'lord') {
    if (sub === 'siege') {
      B.chassis.position.y = 0.3 + Math.abs(sw) * 0.02 * v.runK; B.chassis.rotation.z = sw * 0.03 * v.runK;
      B.barrel.position.z = 0.08 - (A >= 0 ? (A < 0.6 ? 0 : (1 - seg01(A, 0.6, 1)) * 0.22) : 0);
    } else {
      if (B.legL) { B.legL.rotation.x = -sw * 0.7 * v.runK; B.legR.rotation.x = sw * 0.7 * v.runK; }
      B.hips.position.y = 0.4 + Math.abs(Math.cos(v.walk)) * 0.03 * v.runK + (sub === 'ranged' ? Math.sin(t * 3 + v.seed) * 0.02 : 0);
      const ar = A >= 0 ? (sub === 'melee' ? tri(A, -0.5, -2.6, -0.2) : tri(A, -0.5, -0.9, -1.5)) : -0.5 - sw * 0.3 * v.runK;
      B.armR.rotation.x += (ar - B.armR.rotation.x) * Math.min(1, dt * 34); B.armL.rotation.x = -0.6 + sw * 0.3 * v.runK;
      B.hips.rotation.x = A >= 0 ? tri(A, 0, -0.1, 0.22) : 0.08 * v.runK;
    }
    return;
  }
  const br = Math.sin(t * 2 + v.seed);
  if (sub === 'sprite') {
    const hop = s.moving ? Math.abs(Math.sin(v.walk)) * 0.16 : 0, lunge = A >= 0 ? tri(A, 0, -0.12, 0.3) : 0;
    B.hips.position.y = 0.26 + hop; B.hips.position.z = lunge; B.hips.scale.y = 1 + br * 0.04 - (A >= 0 ? tri(A, 0, 0.12, -0.08) : 0);
  } else if (sub === 'turtle') {
    B.hips.position.y = 0.42 + br * 0.015; B.hips.rotation.z = sw * 0.03 * v.runK;
    B.head.position.z = 0.72 + (A >= 0 ? tri(A, 0, -0.2, 0.4) : br * 0.03); B.head.rotation.x = A >= 0 ? tri(A, 0, -0.3, 0.2) : 0;
  } else {   // golems and the lord
    const big = sub === 'lord', crab = sub === 'skitter', h0 = big ? 1.2 : crab ? 0.3 : 0.62;
    B.hips.position.y = h0 + br * (big ? 0.03 : 0.015) + Math.abs(sw) * 0.04 * v.runK; B.hips.rotation.z = sw * 0.05 * v.runK;
    if (crab) {       // claws snap forward instead of swinging overhead, and it scuttles with a wobble
      const sn = A >= 0 ? tri(A, 0, -0.9, 0.5) : 0; B.armR.rotation.x += (sn + br * 0.06 - B.armR.rotation.x) * Math.min(1, dt * 30); B.armL.rotation.x += ((A >= 0 ? sn * 0.5 : 0) - br * 0.06 - B.armL.rotation.x) * Math.min(1, dt * 30);
      B.armR.rotation.y = -0.25 + sw * 0.2 * v.runK; B.armL.rotation.y = 0.25 + sw * 0.2 * v.runK; B.hips.rotation.y = sw * 0.12 * v.runK; B.hips.rotation.x = A >= 0 ? tri(A, 0, -0.1, 0.2) : 0; return;
    }
    const ar = A >= 0 ? tri(A, 0, -2.6, -0.5) : -sw * 0.35 * v.runK + br * 0.04, al = A >= 0 ? tri(A, 0, big ? -2.6 : 0.3, big ? -0.5 : 0.1) : sw * 0.35 * v.runK - br * 0.04;
    B.armR.rotation.x += (ar - B.armR.rotation.x) * Math.min(1, dt * 30); B.armL.rotation.x += (al - B.armL.rotation.x) * Math.min(1, dt * 30);
    B.hips.rotation.x = A >= 0 ? tri(A, 0, -0.12, 0.25) : 0;
    if (B.head) B.head.rotation.y = Math.sin(t * 0.8 + v.seed) * 0.2;
  }
}
function animStructure(v, s, t, dt) {
  const cr = v.b.crystal, dead = s.dead;
  if (!v.tw) { v.tw = v.o.getObjectByName('tower'); v.rb = v.o.getObjectByName('rubble'); v.gem = v.o.getObjectByName('gem'); v.halo = cr.getObjectByName('halo'); }
  v.tw.visible = !dead; v.rb.visible = dead; cr.visible = !dead;
  if (s.kind === 'turret') { const n = dead ? 0 : s.plates | 0; if (v.pn !== n || v.pg !== s.ghost) { if (!v.pl) v.pl = v.o.getObjectByName('plates'); v.pl.visible = n > 0; v.pl.children.forEach((m, i) => { m.visible = i < n; m.material = s.ghost ? GX.mat.goldGhost : GX.mat.gold; m.castShadow = !s.ghost; }); v.pn = n; v.pg = s.ghost; } }
  if (dead) return;
  if (v.ghost !== s.ghost) { v.ghost = s.ghost; v.tw.material = s.ghost ? GX.mat.vcGhost : GX.mat.vc; v.tw.castShadow = !s.ghost; v.gem.material = crystalMat(v.gem.userData.hex, s.ghost); v.halo.visible = !s.ghost; }
  const charge = s.windT > 0 ? 1 : 0; v.ch = (v.ch || 0) + (charge - (v.ch || 0)) * Math.min(1, dt * 12);
  if (s.kind === 'turret') {
    cr.position.y = 4.05 + Math.sin(t * 2 + v.seed) * 0.1; cr.rotation.y = t * (1.1 + v.ch * 5);
    const sc = 1 + v.ch * 0.25; cr.scale.set(sc, sc, sc);
    v.halo.scale.setScalar(2.4 + v.ch * 1.6 + Math.sin(t * 3) * 0.15);
  } else {
    cr.position.y = 2.75 + Math.sin(t * 1.6) * 0.12; cr.getObjectByName('gem').rotation.y = t * 0.6; v.b.orbit.rotation.y = -t * 0.9;
    v.halo.scale.setScalar(4.2 + Math.sin(t * 3) * 0.3 + v.ch * 2);
  }
}
