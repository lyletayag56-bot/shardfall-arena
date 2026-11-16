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
    for (const [bn, r, y, a] of [['bees', 0.62, 0, 0], ['bees', 0.5, 0.2, 2.5], ['bees2', 0.7, 0, 4.2]]) { const m = glowPart(R, bn, new THREE.SphereGeometry(0.034, 6, 5), L.tend || L.glow, Math.cos(a) * r, y, Math.sin(a) * r, 0.34), ch = R.B[bn].children; m.scale.set(1, 0.8, 1.5); m.rotation.y = -a; m.userData.bee = 1; ch[ch.length - 1].userData.bee = 2; }       // (marked, body and glow, so that the view can colour them by her temper)
    return { style: 'cast' };
  },
};
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
  else if (key === 'orin') { aura('wpnR', 0.46, 1.0); aura('wpnR', 0.86, 0.5); }       // his leaf already carries a vein of light: a skin makes the whole blade glow
  else if (key === 'mira') { const hf = 0.6; glowPart(R, 'wpnL', new THREE.BoxGeometry(0.016, hf * 2.04, 0.016), c, 0, 0, -0.21, 0); for (const k of [-1, 1]) aura('wpnL', k * hf * 1.02, 0.45, -0.21); }
}
function buildHeroTemplate(key, skin) {
  const L = heroLook(key, skin), sk = SKINS[key][skin | 0] || {}, bulk = { bram: 1.28, thorn: 1.26, kaela: 0.95, rook: 1.34, vex: 0.9, kiri: 0.86, tavi: 1.02, lyra: 0.9, zephyr: 0.92, orin: 1.0, mira: 0.92, sera: 0.9, miel: 0.92 }[key] || 1;
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
};
const CLIP_CH = ['aLx', 'fLx', 'aLz', 'aRx', 'fRx', 'aRz', 'lLx', 'lRx', 'sLx', 'sRx', 'hipRx', 'spRy', 'headRx', 'headRy'];
/* which clip each hero plays for skill 1, skill 2 and the ultimate ([name, seconds] overrides the length); entries 3..5 are for
   their second casts, 6..8 for a second form's, 9..11 for third casts. A skin may bring a set of its own (clips). */
const HERO_CLIPS = { bram: ['rush', 'guard', 'leap'], thorn: ['throw', 'slam', 'pull'], kaela: ['cadA', 'lunge', 'roar', 'cadB', null, null, null, null, null, 'cadC'], rook: [['slam', 0.78], 'roar', null], vex: ['throw', 'sweep', 'stab'],
  tavi: ['throw', 'fanout', 'vault', 'lunge', 'pull', 'vault'],
  kiri: ['toss', 'bolt', 'roar', null, null, null, 'vault', 'lunge', 'roar'],       // 6..8: the Tiger's leap, rush and the turn back
  lyra: ['bolt', 'channel', 'invoke'], zephyr: ['bolt', 'channel', 'beam'], orin: ['ward', 'throw', 'lobL'], mira: ['shot', 'toss', 'focus'], sera: ['channel', 'bolt', 'invoke'], miel: ['send', 'ward', 'hive'] };
function KF(u, a) { if (u <= a[0]) return a[1]; for (let i = 2; i < a.length; i += 2) if (u <= a[i]) return lerp(a[i - 1], a[i + 1], smooth((u - a[i - 2]) / (a[i] - a[i - 2]))); return a[a.length - 1]; }
/* which mask is over the face: the worn one sits on the face, the other is slung behind the head */
function kiriMasks(B, f) {
  const on = f ? B.mask1 : B.mask0, off = f ? B.mask0 : B.mask1;
  on.position.set(0, 0.3, 0.205); on.rotation.set(0, 0, 0); on.scale.setScalar(1);
  off.position.set(-0.19, 0.44, -0.17); off.rotation.set(0.35, Math.PI - 0.75, 0.25); off.scale.setScalar(0.86);
}
/* a two-form hero's view follows the unit's form: masks, what she holds, how she stands and strikes */
function applyForm(v, f) {
  const B = v.b; v.form = f; if (v.style0 === undefined) v.style0 = v.style; v.style = f ? 'claw' : v.style0;
  if (B.mask0) kiriMasks(B, f);
  if (B.gearA) B.gearA.visible = !f; for (const n of ['gearL', 'gearR', 'tails']) if (B[n] && v.key === 'kiri') B[n].visible = !!f;
}
function startClip(v, i) {
  const set = (SKINS[v.key][v.skin] || {}).clips || HERO_CLIPS[v.key], spec = set && (set[i] !== undefined ? set[i] : set[i % 3]); v.clipI = i % 3; if (!spec) { v.clip = null; return; }
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
  let headRz = 0, bodyRx = 0, bodyY = 0, spin = 0, orb = 0, atkSpin = -1, flare = 0;       // flare: a gust in the clothes from what the body is doing, on top of the wind of moving
  const light = v.style === 'bow' || v.style === 'smash' || v.style === 'hurl' ? 0.35 : 1;
  p.aLx += sw * 0.55 * rk * light; p.aRx += -sw * 0.45 * rk * (v.style === 'bow' ? 1 : 0.4);
  if (v.hover) { p.hipY += v.hover + Math.sin(t * 2.4 + v.seed) * 0.05; p.lLx = 0.12 + rk * 0.25; p.lRx = -0.1 + rk * 0.3; p.sLx = 0.4; p.sRx = 0.55; }
  const A = s.atk;
  if (A >= 0) {
    switch (v.style) {
      case 'slash': p.aRx = tri(A, p.aRx, -2.75, -0.35); p.fRx = tri(A, p.fRx, -1.2, -0.12); p.aRz = tri(A, p.aRz, -0.55, 0.45); p.spRy = tri(A, p.spRy, -0.55, 0.6); p.hipRx += tri(A, 0, -0.08, 0.22); break;
      case 'smash': p.aRx = tri(A, p.aRx, -3.0, -0.6); p.fRx = tri(A, p.fRx, -0.7, -0.1); p.spRy = tri(A, p.spRy, -0.3, 0.25); p.hipRx += tri(A, 0, -0.15, 0.3); break;
      case 'smash2': p.aRx = tri(A, p.aRx, -3.0, -0.85); p.aLx = tri(A, p.aLx, -3.0, -0.95); p.fRx = tri(A, p.fRx, -0.6, -0.15); p.fLx = tri(A, p.fLx, -0.6, -0.15); p.hipRx += tri(A, 0, -0.22, 0.45); p.hipY += tri(A, 0, 0.05, -0.1); break;
      case 'dual':
        if (v.alt) { p.aLx = tri(A, p.aLx, 0.35, -1.45); p.fLx = tri(A, p.fLx, -1.7, -0.1); p.spRy = tri(A, p.spRy, 0.45, -0.5); }
        else { p.aRx = tri(A, p.aRx, 0.35, -1.45); p.fRx = tri(A, p.fRx, -1.7, -0.1); p.spRy = tri(A, p.spRy, -0.45, 0.5); }
        p.hipRx += tri(A, 0, 0, 0.18); break;
      case 'claw':       // a swipe of one set of claws, then the other
      case 'fans':       // a wide flick of one fan, then the other
        if (v.alt) { p.aLx = tri(A, p.aLx, -1.9, -0.55); p.fLx = tri(A, p.fLx, -1.55, -0.12); p.aLz = tri(A, p.aLz, 0.95, -0.45); p.spRy = tri(A, p.spRy, 0.6, -0.65); }
        else { p.aRx = tri(A, p.aRx, -1.9, -0.55); p.fRx = tri(A, p.fRx, -1.55, -0.12); p.aRz = tri(A, p.aRz, -0.95, 0.45); p.spRy = tri(A, p.spRy, -0.6, 0.65); }
        p.hipRx += tri(A, 0, -0.06, 0.2); break;
      case 'reap':       // by turns a full turn with both blades out, and a rising two-handed cut that lifts off the ground
        if (v.alt) { atkSpin = A; p.aRx = tri(A, p.aRx, -0.3, -1.3); p.aLx = tri(A, p.aLx, -0.3, -1.3); p.aRz = tri(A, p.aRz, -1.5, -0.2); p.aLz = tri(A, p.aLz, 1.5, 0.2); p.fRx = p.fLx = -0.1; }
        else { p.aRx = tri(A, p.aRx, 0.5, -2.7); p.aLx = tri(A, p.aLx, 0.5, -2.7); p.aRz = tri(A, p.aRz, 0.4, -0.5); p.aLz = tri(A, p.aLz, -0.4, 0.5); p.fRx = tri(A, p.fRx, -1.2, -0.15); p.fLx = tri(A, p.fLx, -1.2, -0.15); bodyY += Math.sin(Math.min(1, A / 0.75) * Math.PI) * 0.3; p.hipRx += tri(A, 0, 0.3, -0.25); }
        break;
      case 'bow': {
        const e = smooth(seg01(A, 0, 0.22)) * (1 - smooth(seg01(A, 0.8, 1))), q = A < 0.6 ? smooth(seg01(A, 0.12, 0.55)) : 1 - smooth(seg01(A, 0.6, 0.66));
        p.aLx = lerp(p.aLx, -1.52, e); p.fLx = lerp(p.fLx, -0.06, e); p.aLz = lerp(p.aLz, -0.1, e); p.aRx = lerp(p.aRx, -1.25, e); p.fRx = lerp(p.fRx, lerp(-0.7, -2.2, q), e); p.aRz = lerp(p.aRz, -0.25, e); p.spRy = lerp(p.spRy, -0.3, e); p.headRy = 0.25 * e; break;
      }
      case 'hurl':       // an overarm throw: the leaf leaves his hand as the arm comes through (see below: it is gone from the hand until he has a fresh one)
        p.aRx = tri(A, p.aRx, -2.6, -1.25); p.fRx = tri(A, p.fRx, -1.9, -0.05); p.aRz = tri(A, p.aRz, -0.4, 0.3); p.spRy = tri(A, p.spRy, -0.7, 0.55); p.aLx = tri(A, p.aLx, -1.0, 0.5); p.fLx = tri(A, p.fLx, -0.3, -0.5); p.hipRx += tri(A, 0, -0.1, 0.28); break;
      case 'cast': p.aRx = tri(A, p.aRx, -0.9, -1.3); p.fRx = tri(A, p.fRx, -1.7, -0.45); p.aLx = tri(A, p.aLx, -0.6, -1.25); p.fLx = tri(A, p.fLx, -0.8, -0.15); p.hipRx += tri(A, 0, -0.06, 0.14); break;
      case 'orb': p.aRx = tri(A, p.aRx, -0.2, -1.5); p.fRx = tri(A, p.fRx, -1.3, -0.08); p.aLx = tri(A, p.aLx, -0.2, -1.2); p.fLx = tri(A, p.fLx, -1.0, -0.2); orb = tri(A, 0, -0.15, 1); break;
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
    const w = Math.min(1, cu / 0.1) * (1 - smooth(seg01(cu, 0.78, 1)));
    for (const ch of CLIP_CH) { const a = C[ch]; if (a) p[ch] = lerp(p[ch], KF(cu, a), w); }
    if (C.hipY) p.hipY += KF(cu, C.hipY) * w;
    if (C.orb) orb = lerp(orb, KF(cu, C.orb), w);
    if (C.hop) bodyY += C.hop * Math.sin(Math.min(1, cu / 0.62) * Math.PI);
    flare = Math.max(flare, 0.55 * w);
  }
  if (A >= 0) flare = Math.max(flare, 0.3 * Math.sin(Math.min(1, A) * Math.PI));
  if (s.stun) { p.hipRx = 0.14 + Math.sin(t * 9) * 0.04; p.headRx = 0.35; headRz = Math.sin(t * 6) * 0.3; p.aLx = p.aRx = 0.1; p.fLx = p.fRx = -0.2; }
  let rYaw = null, rSpin = 0, lift = 0, wpT = 0, airRx = 0;
  if (s.air > 0) {       // thrown into the air: flung back, arms and legs trailing; gathered in again on the way down
    const e = Math.min(1, s.air * 7) * (1 - smooth(seg01(s.air, 0.82, 1))), w = Math.sin(t * 13 + v.seed) * 0.12; airRx = -0.62 * e;
    p.aLz = lerp(p.aLz, 1.3 + w, e); p.aRz = lerp(p.aRz, -1.3 + w, e); p.aLx = lerp(p.aLx, -0.7, e); p.aRx = lerp(p.aRx, -0.7, e); p.fLx = lerp(p.fLx, -0.5, e); p.fRx = lerp(p.fRx, -0.5, e);
    p.lLx = lerp(p.lLx, -0.55 - w, e); p.lRx = lerp(p.lRx, 0.2 + w, e); p.sLx = lerp(p.sLx, 0.9, e); p.sRx = lerp(p.sRx, 0.5, e); p.headRx = lerp(p.headRx, -0.35, e); p.hipRx = lerp(p.hipRx, -0.12, e); headRz *= 1 - e; flare = Math.max(flare, 0.5 * e);
  }
  if (s.recall > 0) {       // each hero's own way of waiting; at the very end they are drawn up and away
    const R = _rq, fn = RECALL[v.key]; R.y = R.rx = R.hz = R.spin = R.wp = 0; R.yaw = null; p.hov = !!v.hover;
    if (fn) fn(p, R, s.recall * 6, s.recall); else { p.aLz += 0.25; p.aRz -= 0.25; p.headRx = -0.2; R.y = 0.04 + Math.sin(t * 4) * 0.02; }
    bodyY += R.y; bodyRx += R.rx; headRz += R.hz; rYaw = R.yaw; rSpin = R.spin; wpT = R.wp; flare = Math.max(flare, 0.12);
    const q = seg01(s.recall, 0.93, 1); lift = q * q;
  }
  if (s.arrive > 0) lift = Math.max(lift, (1 - smooth(Math.min(1, s.arrive / 0.7))) * 1.1);       // and set down again at the fountain, with a bend of the knees
  if (s.arrive > 0.55) { const a = Math.sin(seg01(s.arrive, 0.55, 1) * Math.PI); p.hipY -= 0.16 * a; p.lLx -= 0.5 * a; p.lRx -= 0.5 * a; p.sLx += 0.9 * a; p.sRx += 0.9 * a; p.hipRx += 0.15 * a; }
  bodyY += lift * 1.5;
  if (s.dead > 0 && v.style === 'reap') { const d = smooth(Math.min(1, s.dead * 1.5)); bodyY = 0.95 * d; spin = 1; p.aLz = 1.5; p.aRz = -1.5; p.aLx = p.aRx = -0.2; p.fLx = p.fRx = -0.1; p.headRx = -0.7 * d; p.lLx = 0.2; p.lRx = -0.15; p.sLx = p.sRx = 0.6; }       // it does not fall: it is lifted, turning, arms wide, into its own eclipse
  else if (s.dead > 0) { const d = smooth(Math.min(1, s.dead * 2.2)); airRx = 0; bodyRx = -1.5 * d; bodyY = 0.14 * d; p.aLz = lerp(p.aLz, 1.2, d); p.aRz = lerp(p.aRz, -1.2, d); p.aLx = p.aRx = 0; p.lLx = -0.2 * d; p.lRx = 0.15 * d; p.hipY = v.hipY; }
  const k = Math.min(1, dt * (A >= 0 || C || s.dash || s.leap ? 38 : 16)), set = (o, ax, val) => { o.rotation[ax] += (val - o.rotation[ax]) * k; };
  set(B.armL, 'x', p.aLx); set(B.foreL, 'x', p.fLx); set(B.armL, 'z', p.aLz); set(B.armR, 'x', p.aRx); set(B.foreR, 'x', p.fRx); set(B.armR, 'z', p.aRz);
  set(B.legL, 'x', p.lLx); set(B.legR, 'x', p.lRx); set(B.shinL, 'x', p.sLx); set(B.shinR, 'x', p.sRx);
  B.hips.position.y += (p.hipY - B.hips.position.y) * k; set(B.hips, 'x', p.hipRx); set(B.spine, 'y', p.spRy);
  set(B.head, 'x', p.headRx); set(B.head, 'y', p.headRy - p.spRy * 0.7); set(B.head, 'z', headRz);
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
  if (wpT || v.wpT) { v.wpT = (v.wpT || 0) + (wpT - (v.wpT || 0)) * Math.min(1, dt * 9); if (!wpT && Math.abs(v.wpT) < 0.004) v.wpT = 0; if (v.wr0 == null) v.wr0 = B.wpnR.rotation.x; B.wpnR.rotation.x = v.wr0 + v.wpT; }
  if (v.style === 'hurl') {       // what he throws is out of his hand from the moment of release, and a fresh leaf snaps into it soon after
    const w = B.wpnR, out = (A >= 0.6 && A < 0.96) || (!!C && v.clipI === 1 && cu > 0.3 && cu < 0.9);
    if (out) { if (w.visible) w.visible = false; v.wk = 0; }
    else { if (!w.visible) { w.visible = true; v.wk = 0.001; } if (v.wk > 0) { v.wk = Math.min(1, v.wk + dt * 6.5); const q = v.wk, e = 1 + 2.2 * Math.pow(q - 1, 3) + 1.2 * Math.pow(q - 1, 2); w.scale.setScalar(0.3 + 0.7 * e); if (q >= 1) { v.wk = 0; w.scale.setScalar(1); } } }
  }
  clothStep(v, t, dt, flare + (v.hover ? 0.12 : 0));
  if (B.skorb) { B.skorb.rotation.y = t * 1.7 + v.seed; B.skorb.position.y = 1.12 + Math.sin(t * 2.1 + v.seed) * 0.06; }
  if (B.orb) { B.orb.position.z = 0.3 + orb * 0.5; B.orb.position.y = 1.22 + Math.sin(t * 2.6) * 0.06 + (v.hover || 0); const sc = 1 + Math.max(0, orb) * 0.6; B.orb.scale.set(sc, sc, sc); B.motes.rotation.y = t * 3.2; B.motes.rotation.x = t * 1.1; }
  if (B.bees) {       // her bees: slow rounds close to her while she tends, fast and wide while she stings (v.sting, 0..1, is set by the view from her temper)
    const q = v.sting || 0, sc = 1 + q * 0.3; v.beeA = (v.beeA == null ? v.seed : v.beeA) + dt * (2.3 + q * 4.8);
    B.bees.rotation.y = v.beeA; B.bees.rotation.z = Math.sin(t * 1.7 + v.seed) * (0.2 + q * 0.25); B.bees.position.y = 1.34 + Math.sin(t * 2.3 + v.seed) * 0.05; B.bees.scale.setScalar(sc);
    B.bees2.rotation.y = -v.beeA * 1.37; B.bees2.rotation.x = Math.sin(t * 1.3 + v.seed) * (0.22 + q * 0.3); B.bees2.scale.setScalar(sc);
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
