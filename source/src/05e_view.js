/* ============================================================
   view: camera, unit views, overlay bars, aiming markers,
   minimap, rendered portraits, hero showcase, quality control
   ============================================================ */
const V = { cv: null, ov: null, og: null, odpr: 1, vw: 800, vh: 600, z: 0.7, cam: { x: W / 2, y: W / 2 }, dist: 17, t: 0, tick: 0, G: null,
  aim: null, team: -1, me: null, peek: null, showRange: false, mm: null, mmBg: null, views: new Map(), structs: new Map(), ug: null,
  q: 2, auto: true, ftAcc: 0, ftN: 0, lastNow: 0, slow: 0, zoomK: 1, replay: false, cut: false, slayer: 0 };       // replay: the view is being shown a recording; cut: the picture has just jumped, nothing should animate across it
const PORT = {}, PORT_CV = {}, AIM = {}, MK = {}, SHOW = { key: null, v: null, t: 0, el: null };
const COL = { ally: '#46b4ff', enemy: '#ff5d5d', self: '#5fe08a', gold: '#f2c14e' };
const tcol = (team, viewer) => viewer < 0 ? (team === BLUE ? COL.ally : team === NEUTRAL ? '#e8b55a' : COL.enemy) : team === viewer ? COL.ally : team === NEUTRAL ? '#e8b55a' : COL.enemy;
let _v3, _sp = { x: 0, y: 0 }, _sp2 = { x: 0, y: 0 };
const _st = { moving: false, speed: 2, atk: -1, cast: 0, dash: false, leap: false, spin: false, stun: false, air: 0, recall: false, dead: 0, kneel: 0 }, _ss = { kind: '', dead: false, windT: 0, ghost: false };

function viewInit(cv) {
  if (!gfxInit(cv)) return false;
  _v3 = new THREE.Vector3(); V.cv = cv; V.ov = document.getElementById('ov'); V.og = V.ov.getContext('2d');
  fxInit(); V.ug = new THREE.Group(); GX.scene.add(V.ug);
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  V.q = coarse ? 1 : 2;
  buildWorld(coarse ? 1024 : 2048); markersInit(); makePortraits(); showcaseInit();
  return true;
}
function applyQuality() {
  const q = V.q, dp = window.devicePixelRatio || 1;
  const pr = Math.max(0.7, Math.min(dp, q === 2 ? 2 : q === 1 ? 1.5 : 1, Math.sqrt((q === 2 ? 3.7e6 : q === 1 ? 2.2e6 : 1.3e6) / (V.vw * V.vh))));
  GX.r.setPixelRatio(pr); GX.r.setSize(V.vw, V.vh, false);
  const sun = GX.sun, sh = q > 0, ms = q === 2 ? 2048 : 1024;
  if (sun.castShadow !== sh) sun.castShadow = sh;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  GX.cam.aspect = V.vw / V.vh; GX.cam.updateProjectionMatrix();
  const sc = V.vh * pr / (2 * Math.tan(GX.cam.fov * Math.PI / 360)); FX.add.mat.uniforms.uScale.value = sc; FX.alpha.mat.uniforms.uScale.value = sc;
}
function viewResize(cv) {
  if (!GX.ok) return;
  V.vw = Math.max(200, cv.clientWidth); V.vh = Math.max(200, cv.clientHeight);      // layout size: unaffected by the frame being turned
  applyQuality();
  const asp = V.vw / V.vh, tv = Math.tan(GX.cam.fov * Math.PI / 360), span = 19.6 * V.zoomK;
  V.dist = clamp(span / (2 * tv * Math.max(asp, 1)), 14, 34);
  V.z = V.vw / (2 * V.dist * tv * asp / S3);
  V.odpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.7e6 / (V.vw * V.vh))); V.ov.width = Math.round(V.vw * V.odpr); V.ov.height = Math.round(V.vh * V.odpr);
  camPlace(0);
}
function setQuality(q, manual) { V.q = clamp(q, 0, 2); if (manual) V.auto = false; applyQuality(); }
function camPlace(dt) {
  const d = V.dist; let ox = 0, oy = 0;
  if (FX.shake > 0.004) { ox = (Math.random() - .5) * FX.shake; oy = (Math.random() - .5) * FX.shake; FX.shake *= Math.pow(0.002, dt); } else FX.shake = 0;
  const tx = V.cam.x * S3 + ox, tz = V.cam.y * S3;
  GX.cam.position.set(tx, 0.8 + d * 0.8 + oy, tz + d * 0.6); GX.cam.lookAt(tx, 0.8 + oy, tz); GX.cam.updateMatrixWorld();
  sunFollow(tx, tz - 1.2);
}
function s2w(px, py) {
  const c = GX.cam; _v3.set(px / V.vw * 2 - 1, -(py / V.vh) * 2 + 1, 0.5).unproject(c);
  const o = c.position, dx = _v3.x - o.x, dy = _v3.y - o.y, dz = _v3.z - o.z, k = dy < -1e-6 ? -o.y / dy : 0;
  return { x: (o.x + dx * k) / S3, y: (o.z + dz * k) / S3 };
}
function w2s(x, h, z, out) { _v3.set(x, h, z).project(GX.cam); out.x = (_v3.x * 0.5 + 0.5) * V.vw; out.y = (-_v3.y * 0.5 + 0.5) * V.vh; return _v3.z < 1; }
function pickTarget(px, py, maxPx) {
  const me = G.player; let best = null, bd = maxPx;
  for (const u of G.units) {
    if (!canTarget(me, u)) continue;
    const h = u.kind === 'turret' ? 1.8 : u.kind === 'crystal' ? 1.6 : u.kind === 'hero' || u.kind === 'clone' ? 1.0 : 0.5;
    if (!w2s(u.x * S3, h, u.y * S3, _sp)) continue;
    const d = Math.hypot(_sp.x - px, (_sp.y - py) * 0.7) - u.r * V.z * 0.7; if (d < bd) { bd = d; best = u; }
  }
  return best;
}
function seen(u) { return V.team < 0 || u.team === V.team || u.team === NEUTRAL || u.vis[V.team]; }

/* ---------- unit views ---------- */
/* A hero in tall grass is drawn see-through and the grass is left as it is. A body made of many parts, simply blended, shows its parts
   through one another; so while he is in the grass his shape is first laid down in the depth buffer alone (one colourless twin per part,
   a hair behind it), and the parts are then blended over that: each pixel of him is blended once. What glows on him is dimmed to match. */
const BUSH_OP = 0.58, CAMO_OP = 0.36;       // (CAMO_OP: a hero under her own cape, as her own side sees her)
/* Under her cape she is not shown to the other side. But the air where she stands is not quite still, and whoever is watching for it can
   tell: a faint ring opening on the ground now and then, a wisp or two above it. */
function camoNear(u, T) {       // but for the cape she would be in plain sight of that side: one of theirs is near enough, and no grass hides her from him
  for (const w of G.units) { if (w.team !== T || w.dead || w.kind === 'monster') continue; const sr = w.kind === 'hero' ? 980 : w.kind === 'minion' ? 720 : 900, dx = w.x - u.x, dy = w.y - u.y; if (dx * dx + dy * dy <= sr * sr && (u.bush < 0 || w.bush === u.bush)) return true; }
  return false;
}
function camoHint(v, u, dt) {
  v.chT = (v.chT || 0) - dt; if (v.chT > 0) return; v.chT = 0.34 + Math.random() * 0.12; if (!camoNear(u, V.team)) return;       // (out of everybody's sight anyway, she gives nothing away)
  const x = u.x * S3, z = u.y * S3; ring3(x, z, 0.25, 0.85, 0.5, '#dfeee8', 0.22, true, 0.06);
  for (let i = 0; i < 2; i++) FX.add.emit(x + (Math.random() - .5) * 0.5, 0.3 + Math.random() * 1.1, z + (Math.random() - .5) * 0.5, 0, 0.5, 0, 0.5, 0.2, 0.05, '#cfe6e0', 0.16, 0, 0);
}
/* The long gun fires: a flash at its mouth, a wisp of smoke; a Long Shot flashes in the shard's own colour, with a ring thrown forward. */
function rifleFlash(v, u) {
  const m = muzzleOf(v), ls = G.t - (u.pv.shot == null ? -9 : u.pv.shot) < 0.3, c = ls ? skinColor(u.key, u.skin, 2) : '#ffe2b0';
  flash3(m.x, m.y, m.z, ls ? 2.4 : 1.3, 0.12, '#ffffff'); flash3(m.x, m.y, m.z, ls ? 3.2 : 1.8, 0.16, c); if (ls) vring3(m.x, m.y, m.z, u.face, 0.1, 0.6, 0.2, c, 0.85);
  sparks(m.x, m.y, m.z, ls ? 6 : 3, '#ffe9b0', 3.5, 0.11, 0.22, 0.5); smoke(m.x, m.y, m.z, 2, '#dfe6ea', 0.3, 0.45, 0.15);
}
function dimOf(m) { if (!m._dim) { const c = m._dim = m.clone(); c.transparent = true; c.opacity = (m.opacity == null ? 1 : m.opacity) * BUSH_OP * 0.9; c.depthWrite = false; } return m._dim; }
function heroBush(v, on) {
  v.gh = on;
  if (!v.pre) {
    if (!on) return; v.pre = []; v.o.traverse(x => { if (x.isMesh && x.material === v.mat) v.pre.push(x); });
    if (!GX.mat.depthOnly) { const m = GX.mat.depthOnly = charMat(); m.colorWrite = false; m.transparent = true; m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 2; }
    for (const x of v.pre) { const p = new THREE.Mesh(x.geometry, GX.mat.depthOnly); p.renderOrder = 8; p.castShadow = false; p.userData.dz = 1; x.add(p); x._pre = p; }       // (kept off userData: cloning a view copies userData as JSON)
  }
  for (const x of v.pre) { x._pre.visible = on; x.renderOrder = on ? 9 : 0; }
  v.o.traverse(x => {
    if (!(x.isMesh || x.isSprite) || x.material === v.mat || x.userData.dz) return;
    if (on) { if (!x._m0) { x._m0 = x.material; x.material = dimOf(x.material); } } else if (x._m0) { x.material = x._m0; x._m0 = null; }
  });
}
const _white = new THREE.Color(1, 1, 1);
function relHex(u) { return u === V.me ? COL.self : tcol(u.team, V.team); }
function makeView(u) {
  let v;
  if (u.kind === 'hero' || u.kind === 'clone') {       // (clone: one of Halvar's echoes. To the other side it is him to the life; to his own it is a shade paler, lit with his storm, so that they know him from it)
    v = heroInstance(u.key, u.skin); if (u.kind === 'clone' && (V.team < 0 || u.team === V.team)) { v.mat.color.copy(lin(u.look.glow)).lerp(_white, 0.5); v.echo = 1; } v.sc = 1.16; v.top = v.top0 = 2.78 + v.hover; v.big = 1; v.bigV = 0; v.castN = u.castN; v.gT = 0; v.lx = u.x; v.ly = u.y;       // bars clear a crest or a hovering head
    v.ring = new THREE.Mesh(FG.ring, new THREE.MeshBasicMaterial({ color: lin(relHex(u)), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    v.ring.scale.set(0.58, 1, 0.58); v.ring.position.y = 0.05; v.ring.renderOrder = 2;
  } else { v = unitInstance(u); v.sc = u.kind === 'minion' && u.mtype !== 'lord' ? 1.12 : 1; v.top *= v.sc; }
  v.o.scale.setScalar(v.sc); v.root = new THREE.Group(); v.root.add(v.o); if (v.ring) v.root.add(v.ring);
  v.blob = new THREE.Mesh(FG.disc, GX.mat.blob || (GX.mat.blob = new THREE.MeshBasicMaterial({ map: GX.tex.blob, transparent: true, depthWrite: false, toneMapped: false })));
  v.blob.scale.set(u.r * S3 * 1.5, 1, u.r * S3 * 1.5); v.blob.position.y = 0.04; v.blob.renderOrder = 1; v.root.add(v.blob);
  V.ug.add(v.root); return v;
}
function lazyFx(v, key, make) { let m = v[key]; if (!m) { m = v[key] = make(); m.renderOrder = 3; v.root.add(m); } return m; }
/* What the Eclipse skin does all the time: a black sun turns under its feet, embers lift off the corona at its back, and when it moves
   it trails shadow and afterimages. */
function eclipseExtras(v, u, t, dt, ux, uz, c) {
  const g = lazyFx(v, 'ecl', () => { const q = new THREE.Group(), m = new THREE.Mesh(FG.plane, fxMat('#000000', 0.8, { map: GX.tex.moon, blending: THREE.NormalBlending })), k = new THREE.Mesh(FG.plane, fxMat(c, 0.8, { map: GX.tex.corona })); m.scale.set(1.5, 1, 1.5); k.scale.set(2.9, 1, 2.9); m.position.y = 0.045; k.position.y = 0.048; m.renderOrder = 2; m.userData.own = 1; q.add(m); q.add(k); return q; });
  g.visible = true; g.children[1].rotation.y = t * 0.9; const s = 1 + Math.sin(t * 2.6) * 0.05; g.scale.set(s, 1, s); g.position.y = -(u.z || 0) * S3;
  if (Math.random() < dt * 9) { const a = Math.random() * TAU; FX.add.emit(ux + Math.cos(a) * 0.42, 2.0 + Math.sin(a) * 0.42, uz - 0.15, Math.cos(a) * 0.3, 0.9 + Math.random(), 0, 0.8, 0.11, 0.02, Math.random() < 0.3 ? '#ffffff' : c, 0.9, -0.3, 0.6); }
  if (u.moving) {
    if (Math.random() < dt * 14) FX.alpha.emit(ux + (Math.random() - .5) * 0.4, 0.2 + Math.random() * 1.2, uz + (Math.random() - .5) * 0.4, -u.vx * S3 * 0.2, 0.3, -u.vy * S3 * 0.2, 0.55, 0.3, 0.55, '#0a0712', 0.55, -0.2, 1);
    v.eT = (v.eT || 0) - dt; if (v.eT <= 0 && !u.dash && !u.leap) { v.eT = 0.2; ghost3(v, c, 0.3, 0.2); }
  }
}
/* Each hero's recall has its own colour and its own small weather, to go with the way they wait. */
const RECALL_C = { bram: '#ffd27a', thorn: '#8fe07a', kaela: '#ff7a8a', rook: '#e0b890', vex: '#b48cff', tavi: '#ffd76a', kiri: '#8fe6ff', lyra: '#9fb8ff', zephyr: '#9ff0e0', orin: '#ffb35c', mira: '#c8f08a', sera: '#fff0b0', miel: '#ffc94a', hesta: '#ffcf7a', sorrel: '#9fe0c8' };
function recallAccent(u, k, t, dt, c) {
  const x = u.x * S3, z = u.y * S3, E = FX.add, rnd = Math.random, a = rnd() * TAU, T = k * 6;
  switch (u.key) {
    case 'bram': if (Math.pow(Math.max(0, Math.sin(T * 4.4)), 6) > 0.8 && rnd() < dt * 60) E.emit(x + (rnd() - .5) * 0.3, 1.25, z + (rnd() - .5) * 0.3, Math.cos(a) * 1.6, 1 + rnd(), Math.sin(a) * 1.6, 0.4, 0.11, 0.02, c, 1, 3, 1); if (rnd() < dt * 8) E.emit(x, 2.7, z, Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5, 0.6, 0.12, 0.02, '#ffffff', 0.9, 0.5, 0.5); break;       // sparks off the breastplate, a glint on the raised head of the hammer
    case 'thorn': if (rnd() < dt * 22) { const r = 0.4 + rnd() * 0.9; E.emit(x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r, 0, 0.7 + rnd() * 0.9, 0, 1.3, 0.13, 0.04, rnd() < 0.3 ? '#e6d36a' : c, 0.9, -0.1, 0.3); } break;       // green rising out of the ground he touches
    case 'kaela': if (rnd() < dt * 16) { const r = rnd() * 1.3; E.emit(x + Math.cos(a) * r, 2.6 + rnd() * 0.6, z + Math.sin(a) * r, 0.5, -0.9, 0.2, 2.2, 0.13, 0.08, rnd() < 0.3 ? '#ffd0d8' : c, 0.95, 0.15, 0.8); } break;       // petals
    case 'rook': if (rnd() < dt * 14) { const r = 0.3 + rnd() * 0.6; E.emit(x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r, Math.cos(a) * 0.8, 1.6 + rnd() * 1.6, Math.sin(a) * 0.8, 0.7, 0.16, 0.08, rnd() < 0.5 ? '#8a7a66' : c, 0.9, 4.5, 0.6); } break;       // grit shaken off the ground
    case 'vex': if (rnd() < dt * 26) { const r = 1.5 - rnd() * 0.3; E.emit(x + Math.cos(a) * r, 0.1 + rnd() * 0.4, z + Math.sin(a) * r, -Math.cos(a) * 1.6 - Math.sin(a) * 1.2, 0.3, -Math.sin(a) * 1.6 + Math.cos(a) * 1.2, 0.8, 0.2, 0.03, rnd() < 0.5 ? '#3a2a5a' : c, 0.8, 0, 0.5); } break;       // dark drawn in along the ground
    case 'tavi': if (rnd() < dt * (16 + k * 50)) { const r = 0.7 + rnd() * 0.5, w = 2.4 + k * 4; E.emit(x + Math.cos(a) * r, 0.1 + rnd() * 1.3, z + Math.sin(a) * r, -Math.sin(a) * w, 0.3 + rnd() * 0.6, Math.cos(a) * w, 0.55, 0.11, 0.03, rnd() < 0.6 ? '#ecd9a6' : c, 0.9, 0.4, 0.5); } break;       // a dust devil, picking up with him
    case 'kiri': if (rnd() < dt * 12) { const r = 0.8 + rnd() * 0.5; E.emit(x + Math.cos(a) * r, 0.3 + rnd() * 1.6, z + Math.sin(a) * r, -Math.sin(a) * 1.3, 0.25, Math.cos(a) * 1.3, 1.5, 0.14, 0.08, rnd() < 0.25 ? '#ffd0c8' : '#fbfaf5', 0.95, 0.12, 0.3); } break;       // paper slips circling
    case 'lyra': if (rnd() < dt * 6) glint3(x + Math.cos(a) * (0.5 + rnd()), 0.6 + rnd() * 2, z + Math.sin(a) * (0.5 + rnd()), 0.5 + rnd() * 0.6, 0.35, rnd() < 0.5 ? '#ffffff' : c); if (rnd() < dt * 14) E.emit(x + Math.cos(a) * 0.9, 0.2 + rnd() * 1.8, z + Math.sin(a) * 0.9, -Math.sin(a) * 0.7, 0.1, Math.cos(a) * 0.7, 1.1, 0.1, 0.01, c, 0.9, 0, 0); break;       // stars keeping her company
    case 'zephyr': if (rnd() < dt * (24 + k * 50)) { const r = 0.9 - k * 0.4, w = 3 + k * 5; E.emit(x + Math.cos(a) * r, rnd() * (1 + k * 2), z + Math.sin(a) * r, -Math.sin(a) * w, 1.6 + k * 3, Math.cos(a) * w, 0.5, 0.12, 0.02, rnd() < 0.5 ? '#ffffff' : c, 0.8, 0, 0.3); } break;       // the whirlwind that lifts him
    case 'orin': if (rnd() < dt * 12) E.emit(x + Math.cos(a) * rnd() * 0.9, 0.05, z + Math.sin(a) * rnd() * 0.9, (rnd() - .5) * 0.5, 0.9 + rnd() * 1.1, (rnd() - .5) * 0.5, 1.3, 0.09, 0.01, rnd() < 0.4 ? '#ffe9a0' : c, 1, -0.2, 0.3); break;       // embers, as from a camp fire
    case 'mira': if (rnd() < dt * 12) { const r = rnd() * 1.2; E.emit(x + Math.cos(a) * r, 2.4 + rnd() * 0.8, z + Math.sin(a) * r, Math.cos(t * 2) * 0.6, -0.7, Math.sin(t * 2) * 0.6, 2.2, 0.15, 0.09, rnd() < 0.4 ? '#ffffff' : c, 0.95, 0.1, 1); } break;       // feathers coming down
    case 'miel': if (rnd() < dt * (10 + k * 26)) { const r = 1.7 - k * 1.1 + rnd() * 0.3, w = 1.8 + k * 2.4; E.emit(x + Math.cos(a) * r, 0.5 + rnd() * 1.5, z + Math.sin(a) * r, -Math.sin(a) * w - Math.cos(a) * 0.9, (rnd() - .5) * 0.8, Math.cos(a) * w - Math.sin(a) * 0.9, 0.7, 0.1, 0.02, rnd() < 0.3 ? '#ffffff' : c, 0.95, 0, 0.2); } break;       // the hive coming home: bees circling in, closer and faster
    case 'hesta': if (Math.pow(Math.max(0, Math.sin(T * 3.2)), 5) > 0.9 && k < 0.8 && rnd() < dt * 26) ring3(x, z, 0.35, 1.5 + k, 0.7, c, 0.45, true, 0.5); if (rnd() < dt * 8) E.emit(x + Math.cos(a) * 0.9, 0.3 + rnd() * 1.4, z + Math.sin(a) * 0.9, Math.cos(a) * 0.6, 0.3, Math.sin(a) * 0.6, 0.7, 0.1, 0.02, rnd() < 0.4 ? '#ffffff' : c, 0.9, 0, 0.2); break;       // each stroke of the beater sends a ring out
    case 'sorrel': if (rnd() < dt * 9) { const r = 0.6 + rnd() * 1.3; FX.alpha.emit(x + Math.cos(a) * r, 0.05 + rnd() * 0.5, z + Math.sin(a) * r, 0.5, 0.25 + rnd() * 0.4, 0.2, 2.0, 0.1, 0.05, rnd() < 0.5 ? '#c9b8d8' : '#e8e2c8', 0.85, 0.05, 0.6); } if (rnd() < dt * (1 + k * 5)) glint3(x + Math.cos(a) * 1.2, 0.4 + rnd() * 1.4, z + Math.sin(a) * 1.2, 0.5, 0.35, c); break;       // heather and grass seed on the wind off the moor
    case 'sera': if (rnd() < dt * 20) { const r = rnd() * 0.9; E.emit(x + Math.cos(a) * r, 0.1 + rnd() * 0.6, z + Math.sin(a) * r, 0, 1.1 + rnd() * 1.4 + k * 2, 0, 1.2, 0.12, 0.02, rnd() < 0.4 ? '#ffffff' : c, 0.95, 0, 0); } if (rnd() < dt * (1 + k * 6)) glint3(x + (rnd() - .5) * 1.2, 1.6 + rnd() * 1.6, z + (rnd() - .5) * 1.2, 0.6 + rnd() * 0.8, 0.4, '#ffffff'); break;       // light rising round her
  }
}
/* What the Starfall skin does all the time: a star chart turns under him, three small stars orbit him, he trails dust and afterimages
   when he runs, and the blades he has left hanging are joined up into a constellation. */
function cometExtras(v, u, t, dt, ux, uz, c) {
  const g = lazyFx(v, 'cmt', () => { const q = new THREE.Group(), m = new THREE.Mesh(FG.plane, fxMat(c, 0.6, { map: GX.tex.starmap })); m.scale.set(2.5, 1, 2.5); m.position.y = 0.05; q.add(m);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(FG.oct, fxMat(i === 1 ? STAR2 : '#ffffff', 0.95)); s.scale.set(0.05, 0.13, 0.05); q.add(s); const h = halo(i === 1 ? STAR2 : c, 0.5, 0.8); q.add(h); } return q; });
  g.visible = true; const C = g.children; C[0].rotation.y = -t * 0.7; C[0].position.y = 0.05 - (u.z || 0) * S3; C[0].material.opacity = 0.42 + Math.sin(t * 2.2) * 0.12;
  for (let i = 0; i < 3; i++) { const a = t * (1.7 + i * 0.35) + i * 2.1, r = 0.62 + Math.sin(t * 1.3 + i) * 0.08, y = 0.75 + i * 0.42 + Math.sin(t * 2 + i * 1.7) * 0.18, x = Math.cos(a) * r, z = Math.sin(a) * r; C[1 + i * 2].position.set(x, y, z); C[1 + i * 2].rotation.y = t * 5; C[2 + i * 2].position.set(x, y, z);
    if (Math.random() < dt * 9) FX.add.emit(ux + x, y + (u.z || 0) * S3, uz + z, 0, 0.1, 0, 0.5, 0.09, 0.01, i === 1 ? STAR2 : c, 0.8, 0, 0); }
  if (u.moving || u.leap) {
    if (Math.random() < dt * 26) FX.add.emit(ux + (Math.random() - .5) * 0.5, 0.2 + Math.random() * 1.4, uz + (Math.random() - .5) * 0.5, -u.vx * S3 * 0.25, 0.2, -u.vy * S3 * 0.25, 0.6, 0.15, 0.02, Math.random() < 0.3 ? STAR2 : Math.random() < 0.5 ? '#ffffff' : c, 0.9, -0.1, 0.6);
    v.eT = (v.eT || 0) - dt; if (v.eT <= 0 && !u.dash) { v.eT = u.leap ? 0.05 : 0.17; ghost3(v, (v.gi ^= 1) ? c : STAR2, 0.32, u.leap ? 0.4 : 0.22); }
  }
  const r1 = u.re && u.re[1];       // the constellation: every hanging blade joined to the next, and the last to him
  if (r1 && r1.until > G.t && r1.pts) { v.cT = (v.cT || 0) - dt; if (v.cT <= 0) { v.cT = 0.11; let px = ux, pz = uz, n = 0;
    for (const q of r1.pts) { if (!q.prop || q.prop.t <= 0) continue; const x = q.x * S3, z = q.y * S3; if (n++ < 12) streak3(px, pz, x, z, 0.05, 0.16, n % 2 ? c : STAR2, 0.62, 0.55); px = x; pz = z; } } }
}
/* its recall: the chart widens, a shaft of starlight stands on him and stars spiral up it */
function starherdExtras(v, u, t, dt, ux, uz, c) {       // the Starherd: a patch of the night sky turns under his feet (a wider one under the ram), star dust falls from him as he goes, and now and then one glints beside him
  const m = lazyFx(v, 'shd', () => { const q = new THREE.Mesh(FG.plane, fxMat(c, 0.5, { map: GX.tex.starmap })); q.position.y = 0.05; return q; }), big = u.form ? 1.5 : 1;
  m.visible = true; m.scale.set(2.3 * big, 1, 2.3 * big); m.rotation.y = -t * 0.5; m.position.y = 0.05 - (u.z || 0) * S3; m.material.opacity = 0.34 + Math.sin(t * 1.9) * 0.1;
  if ((u.moving || u.leap || u.dash) && Math.random() < dt * (u.form ? 30 : 18)) FX.add.emit(ux + (Math.random() - .5) * 0.6 * big, 0.15 + Math.random() * (u.form ? 0.6 : 1.2), uz + (Math.random() - .5) * 0.6 * big, -(u.vx || 0) * S3 * 0.2, 0.3, -(u.vy || 0) * S3 * 0.2, 0.7, 0.13, 0.02, Math.random() < 0.3 ? '#ffffff' : Math.random() < 0.5 ? STAR_S : c, 0.9, -0.1, 0.6);
  if (Math.random() < dt * 1.6) glint3(ux + (Math.random() - .5) * 1.1 * big, 0.5 + Math.random() * 1.6, uz + (Math.random() - .5) * 1.1 * big, 0.45 + Math.random() * 0.4, 0.4, '#ffffff');
}
function cometRecall(v, u, t, dt, on, c, c2) {       // (c2: the second colour of whichever skin of the stars this is)
  c2 = c2 || STAR2;
  const g = lazyFx(v, 'rc', () => { const q = new THREE.Group(), m = new THREE.Mesh(FG.plane, fxMat(c, 0.9, { map: GX.tex.starmap })), b = new THREE.Mesh(FG.cyl, fxMat(c, 0.3, { map: GX.tex.pillar })), r = new THREE.Mesh(FG.ringThin, fxMat(c2, 0.8)); m.position.y = 0.056; r.position.y = 0.06; q.add(m); q.add(b); q.add(r); return q; });
  g.visible = on; if (!on) return;
  const k = 1 - u.recallT / 6, C = g.children, ux = u.x * S3, uz = u.y * S3, r = 1.6 + k * 1.6; C[0].scale.set(r * 2, 1, r * 2); C[0].rotation.y = t * (0.8 + k * 3); C[1].scale.set(0.5 + k * 0.3, 4 + k * 5, 0.5 + k * 0.3); C[1].material.opacity = 0.12 + k * 0.45; C[2].scale.set(r * 0.9, 1, r * 0.9); C[2].rotation.y = -t * 2;
  if (Math.random() < dt * (18 + k * 50)) { const a = t * 6 + Math.random() * 0.6, d = 0.7 - k * 0.3; FX.add.emit(ux + Math.cos(a) * d, 0.1, uz + Math.sin(a) * d, -Math.sin(a) * 1.6, 2.6 + k * 3, Math.cos(a) * 1.6, 0.8, 0.15, 0.02, Math.random() < 0.3 ? c2 : Math.random() < 0.5 ? '#ffffff' : c, 0.95, 0, 0.4); }
  if (Math.random() < dt * (2 + k * 7)) { const a = Math.random() * TAU, d = Math.random() * r; glint3(ux + Math.cos(a) * d, 0.3 + Math.random() * 2.6, uz + Math.sin(a) * d, 0.6 + Math.random() * 0.7, 0.3, '#ffffff'); }
}
/* its recall: no pillar of light. An eclipse gathers overhead and widens underfoot while everything bright nearby is drawn up into it. */
function eclipseRecall(v, u, t, dt, on, c) {
  const g = lazyFx(v, 'rc', () => {
    const q = new THREE.Group(), m = new THREE.Mesh(FG.plane, fxMat('#000000', 0.9, { map: GX.tex.moon, blending: THREE.NormalBlending })), k = new THREE.Mesh(FG.plane, fxMat(c, 0.95, { map: GX.tex.corona }));
    const cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.corona, color: lin(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })), moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.moon, color: 0x000000, depthWrite: false, transparent: true, toneMapped: false }));
    m.position.y = 0.05; k.position.y = 0.054; m.renderOrder = 2; cor.renderOrder = 5; moon.renderOrder = 6; m.userData.own = cor.userData.own = moon.userData.own = 1; q.add(m); q.add(k); q.add(cor); q.add(moon); return q;
  });
  g.visible = on; if (!on) return;
  const k = 1 - u.recallT / 6, r = 0.7 + k * 1.1, q = 0.9 + k * 2.6, y = 3.7, ux = u.x * S3, uz = u.y * S3, C = g.children;
  C[0].scale.set(r * 2.64, 1, r * 2.64); C[1].scale.set(r * 5.12, 1, r * 5.12); C[1].rotation.y = -t * (1 + k * 3);
  C[2].position.y = C[3].position.y = y; C[2].scale.set(q, q, 1); C[3].scale.set(q * 0.5, q * 0.5, 1); C[2].material.rotation = t * (1 + k * 4);
  if (Math.random() < dt * (20 + k * 50)) { const a = Math.random() * TAU, d = 0.5 + Math.random() * 1.3, tt = 0.45 + Math.random() * 0.3; FX.add.emit(ux + Math.cos(a) * d, 0.1 + Math.random() * 0.6, uz + Math.sin(a) * d, -Math.cos(a) * d / tt, (y - 0.4) / tt, -Math.sin(a) * d / tt, tt, 0.15, 0.03, Math.random() < 0.3 ? '#ffffff' : c, 0.9, 0, 0); }
}
/* The Ironwill Totem at work: four standing stones circle their bearer, runes lit, over a rune ring on the ground. They rise out of
   the ground when it is pressed and sink back as its time runs out. */
function totemShell(v, u, im, t, dt, ux, uz) {
  const c = (im && im.shell) || v.twC || '#c4b5ff'; v.twC = c;
  const g = lazyFx(v, 'tw', () => {
    const q = new THREE.Group(), slab = FG.slab || (FG.slab = new THREE.BoxGeometry(0.26, 0.74, 0.1)), stone = new THREE.MeshLambertMaterial({ color: lin('#3b3658'), emissive: lin(c), emissiveIntensity: 0.22 }), rune = fxMat(c, 0.95);
    for (let i = 0; i < 4; i++) { const p = new THREE.Group(), m = new THREE.Mesh(slab, stone), r1 = new THREE.Mesh(FG.plane, rune), r2 = new THREE.Mesh(FG.plane, rune), gl = halo(c, 0.7, 0.5);
      m.userData.own = 1; m.castShadow = true; r1.rotation.x = HP2; r1.scale.set(0.035, 1, 0.5); r1.position.z = 0.056; r2.rotation.x = HP2; r2.scale.set(0.16, 1, 0.035); r2.position.set(0, 0.1, 0.056); gl.position.z = 0.1; p.add(m); p.add(r1); p.add(r2); p.add(gl); q.add(p); }
    const rn = new THREE.Mesh(FG.plane, fxMat(c, 0.8, { map: GX.tex.rune })), rg = new THREE.Mesh(FG.ringThin, fxMat(c, 0.9)); rn.position.y = 0.06; rn.scale.set(2.5, 1, 2.5); rg.position.y = 0.065; rg.scale.set(1.2, 1, 1.2); q.add(rn); q.add(rg); return q;
  });
  g.visible = !!im; if (!im) return;
  const left = im.t, age = im.dur - im.t, up = Math.min(1, age / 0.25) * Math.min(1, left / 0.5), C = g.children, last = left < 1.5 ? 0.6 + 0.4 * Math.sin(t * 22) : 1;
  const big = v.big || 1, rr = 0.82 * (0.55 + 0.45 * big) * 1.22;       // the stones keep clear of a bearer grown large
  g.position.y = -(u.z || 0) * S3;
  for (let i = 0; i < 4; i++) { const a = t * 1.9 + i * HP2, p = C[i]; p.position.set(Math.cos(a) * rr, (0.62 * up + Math.sin(t * 3 + i * 1.7) * 0.05 - 0.4 * (1 - up)) * big, Math.sin(a) * rr); p.rotation.y = HP2 - a; p.scale.setScalar((0.4 + 0.6 * up) * (0.6 + 0.4 * big)); p.children[1].material.opacity = 0.95 * last; }
  C[4].rotation.y = -t * 1.4; C[4].material.opacity = 0.8 * up * last; C[4].scale.set(2.5 * big, 1, 2.5 * big); C[5].material.opacity = 0.9 * up; const s = (1.2 + Math.sin(t * 5) * 0.04) * big; C[5].scale.set(s, 1, s);
  if (Math.random() < dt * 16) { const a = Math.random() * TAU; FX.add.emit(ux + Math.cos(a) * rr * 1.03, 0.1 + Math.random() * 0.3, uz + Math.sin(a) * rr * 1.03, 0, 1.9, 0, 0.6, 0.12, 0.02, Math.random() < 0.3 ? '#ffffff' : c, 0.9, 0, 0); }
}
/* Bloodrage's wings on a hero's back, from the eruption to the end of the rage. They snap open in the first third of a second, beat
   slowly while she stands and harder as she runs or strikes, stream back in a dash, gutter through the last second and fold away with
   it. Each skin sheds something of its own from them. */
function rageWings(v, u, rg, t, dt, ux, uz) {
  if (!rg) { if (v.wg) v.wg.g.visible = false; v.wgAge = -1; return; }
  const c = skinColor(u.key, u.skin, rg.ci == null ? 2 : rg.ci);
  if (v.wg && v.wg.c !== c) { wingsDrop(v.wg); v.wg = null; }
  const W = v.wg || (v.wg = wingsMake(c)); if (!W.g.parent) v.b.spine.add(W.g);
  const dur = rg.dur || 7, age = dur - rg.t, opening = Math.min(1, age / 0.36), closing = Math.min(1, rg.t / 0.45);
  const snap = 1 + 2.4 * Math.pow(opening - 1, 3) + 1.4 * Math.pow(opening - 1, 2), open = snap * smooth(closing);       // out past full and back, like something let go
  const A = v.clipT < v.clipDur ? v.clipT / v.clipDur : -1, beat = A >= 0 ? Math.max(0, 1 - Math.abs(A - 0.6) * 4.5) : 0, gutter = rg.t < 1.2 && rg.t > 0.45 ? 0.72 + 0.28 * Math.sin(t * 24) : 1;
  W.g.visible = true; wingsPose(W, open, t, { run: v.runK || 0, beat, dash: !!u.dash, dim: (v.bk == null ? 1 : v.bk) * gutter, face: v.face == null ? u.face : HP2 - v.face });
  const f = u.face, bx = -Math.cos(f), bz = -Math.sin(f), sx = -Math.sin(f), sz = Math.cos(f), big = v.big || 1, y0 = (u.z || 0) * S3, kind = SKINS[u.key][u.skin].wing || 'ember';
  if (age < 0.5 && (v.wgAge == null || v.wgAge < 0 || age < v.wgAge - 0.3)) {       // just cast: a burst of it out to either side as they open
    for (const k of [-1, 1]) for (let i = 0; i < 12; i++) { const d = 0.3 + Math.random() * 1.1; FX.add.emit(ux + bx * 0.3 + sx * k * d * 0.4, y0 + 1.2 + Math.random() * 0.9, uz + bz * 0.3 + sz * k * d * 0.4, sx * k * (2.5 + Math.random() * 3) + bx, 0.6 + Math.random() * 1.6, sz * k * (2.5 + Math.random() * 3) + bz, 0.45 + Math.random() * 0.25, 0.15, 0.03, i % 3 ? c : '#ffffff', 1, 1.5, 1.6); }
  }
  v.wgAge = age;
  if (open > 0.5 && Math.random() < dt * (kind === 'petal' ? 9 : 13)) {       // what they shed
    const k = Math.random() < 0.5 ? -1 : 1, d = 0.35 + Math.random() * 1.15, px = ux + (bx * (0.3 + d * 0.35) + sx * k * d) * big, pz = uz + (bz * (0.3 + d * 0.35) + sz * k * d) * big, py = y0 + (1.0 + Math.random() * 1.3) * big;
    if (kind === 'petal') FX.alpha.emit(px, py, pz, bx * 0.5 + (Math.random() - .5) * 0.6, -0.5 - Math.random() * 0.4, bz * 0.5 + (Math.random() - .5) * 0.6, 1.5, 0.12, 0.07, Math.random() < 0.35 ? '#ffe3ec' : c, 0.95, 0.2, 0.9);
    else if (kind === 'mote') FX.add.emit(px, py, pz, bx * 0.3, 0.15 + Math.random() * 0.3, bz * 0.3, 1.0, 0.1, 0.01, Math.random() < 0.4 ? '#ffffff' : c, 0.9, 0, 0.2);
    else FX.add.emit(px, py, pz, bx * 0.6 + (Math.random() - .5) * 0.5, 0.7 + Math.random() * 1.1, bz * 0.6 + (Math.random() - .5) * 0.5, 0.75, 0.12, 0.02, Math.random() < 0.3 ? '#ffd9a8' : c, 0.95, -0.4, 0.5);
  }
}
/* A passive with two tempers shows which it is in. Miel's bees: pale and unhurried while she has someone to tend, hot, quick and wide while she has not. */
function moodExtras(v, u, ps, t, dt, ux, uz) {
  const m = ps.mood(u), c = heroLook(u.key, u.skin)[ps.moods[m].look] || ps.c;
  v.sting = (v.sting || 0) + (m - (v.sting || 0)) * Math.min(1, dt * 5);
  if (v.mood !== m) {
    if (!v.beeM) { v.beeM = []; v.o.traverse(x => { if (x.userData.bee) v.beeM.push(x); }); }
    const gm = glowMat(c), hm = v.beeM.some(b => b.userData.bee === 2) ? halo(c, 0.34, 0.7).material : null; for (const b of v.beeM) b.material = b.userData.bee === 2 ? hm : gm;
    if (v.mood != null && nearCam(u.x, u.y, 200)) { ring3(ux, uz, 0.3, 1.1, 0.35, c, 0.6, true); sparks(ux, 1.3, uz, 8, c, 2.4, 0.1, 0.4, 1);       // the turn itself; and for the player's own hero, the word for it (not more often than every few seconds)
      if (u === V.me && t - (v.moodT || -9) > 2.5) { v.moodT = t; text3(ux, (v.top || 2.8) + 0.5, uz, ps.moods[m].name.toUpperCase(), c, false, 0.9); } }
    v.mood = m;
  }
  if (Math.random() < dt * (m ? 11 : 5)) { const a = Math.random() * TAU, r = m ? 0.75 : 0.5, w = m ? 3.2 : 0.7; FX.add.emit(ux + Math.cos(a) * r, 0.7 + Math.random() * 0.9, uz + Math.sin(a) * r, -Math.sin(a) * w, m ? (Math.random() - .5) * 1.2 : 0.35, Math.cos(a) * w, m ? 0.3 : 0.8, 0.09, 0.02, c, 0.9, 0, m ? 1 : 0.2); }
}
function heroExtras(v, u, t, dt) {
  let aura = null; const ux = u.x * S3, uz = u.y * S3, skn = SKINS[u.key][u.skin], ps = u.def.passive;
  if (ps && ps.moods) moodExtras(v, u, ps, t, dt, ux, uz);
  if (ps && ps.quiet) { const rdy = (u.pv.n || 0) >= ps.stacks && !u.snipe && !u.camo; if (rdy || v.lsG) { let h = v.lsG; if (!h) { h = v.lsG = halo(skinColor(u.key, u.skin, 2), 0.6, 0.9); h.position.set(0, 0.125, 0.37); v.b.wpnR.add(h); } h.visible = rdy; if (rdy) h.scale.setScalar(0.5 + 0.14 * Math.sin(t * 7)); } }       // a Long Shot ready: a light in the glass of her gun
  else if (ps && ps.stacks && (u.pv.n || 0) >= ps.stacks) { aura = ps.c; if (Math.random() < dt * 18) { const a = Math.random() * TAU; FX.add.emit(ux + Math.cos(a) * 0.35, 0.9 + Math.random() * 0.5, uz + Math.sin(a) * 0.35, Math.cos(a) * 0.5, 0.9, Math.sin(a) * 0.5, 0.5, 0.14, 0.03, Math.random() < 0.4 ? '#ffffff' : ps.c, 0.95, 0, 1); } }       // a passive that is charged shows
  if (skn.fx === 'E') eclipseExtras(v, u, t, dt, ux, uz, skn.sk[0]); else if (skn.fx === 'C') cometExtras(v, u, t, dt, ux, uz, skn.sk[0]); else if (skn.fx === 'S') starherdExtras(v, u, t, dt, ux, uz, skn.sk[0]);
  { const rg = hasBuff(u, 'rage'); if (rg || v.wg) rageWings(v, u, rg, t, dt, ux, uz); }
  if (u.def.kneel) { const a2 = odileExtras(v, u, t, dt, ux, uz); if (a2) aura = a2; }
  for (const b of u.buffs) if (b.aura) { aura = b.ci != null ? skinColor(u.key, u.skin, b.ci) : b.aura; if (Math.random() < dt * 14) { const a = Math.random() * TAU; FX.add.emit(ux + Math.cos(a) * 0.5, 0.1, uz + Math.sin(a) * 0.5, 0, 1.7, 0, 0.7, 0.15, 0.03, aura, 0.9, 0, 0); } }
  const sa = SKINS[u.key][u.skin].aura; if (sa && Math.random() < dt * (u.moving ? 7 : 3)) FX.add.emit(ux + (Math.random() - .5) * 0.5, 0.2 + Math.random() * 1.3, uz + (Math.random() - .5) * 0.5, 0, 0.5, 0, 0.8, 0.12, 0.02, sa, 0.75, -0.1, 0);
  if (hasBuff(u, 'sprint') && u.moving && Math.random() < dt * 30) FX.add.emit(ux + (Math.random() - .5) * 0.5, 0.1 + Math.random() * 1.2, uz + (Math.random() - .5) * 0.5, -u.vx * S3 * 0.5, 0, -u.vy * S3 * 0.5, 0.3, 0.13, 0.02, '#c8fff0', 0.8, 0, 0);
  if (aura || v.auraM) { const m = lazyFx(v, 'auraM', () => { const q = new THREE.Mesh(FG.plane, fxMat('#ffffff', 0.75, { map: GX.tex.swirl })); q.position.y = 0.05; return q; }); m.visible = !!aura; if (aura) { m.material.color.copy(lin(aura)); const s = 2.1 + Math.sin(t * 5) * 0.12; m.scale.set(s, 1, s); m.rotation.y = -t * 4; } }
  const sh = shieldOf(u) > 1, pz = sh && hasBuff(u, 'poise'), pl = sh && !pz ? u.shields.find(s => s.pool) : null, bc = pz ? skinColor(u.key, u.skin, 0) : pl ? skinColor(pl.by.key, pl.by.skin, 2) : '#cfe4ff';       // (pl: under a shield its side shares: in the colour of whoever raised it)
  if (sh || v.bub) { const m = lazyFx(v, 'bub', () => { const q = new THREE.Mesh(FG.sphere, fxMat('#cfe4ff', 0.3, { side: THREE.FrontSide, map: GX.tex.hex })); q.position.y = 1.05; return q; }); m.visible = sh; if (sh) { if (v.bubC !== bc) { v.bubC = bc; m.material.color.copy(lin(bc)); } const s = 1.02 + Math.sin(t * 6) * 0.03; m.scale.set(s, s * 1.15, s); m.rotation.y = t * (pz ? 2.4 : 0.8); m.material.opacity = (pz ? 0.38 : 0.3) + Math.sin(t * 6) * 0.06; } }
  if (pz && Math.random() < dt * 30) { const a = t * 7 + Math.random() * 0.9, q = Math.random() < 0.5 ? 0 : Math.PI; FX.add.emit(ux + Math.cos(a + q) * 0.62, 0.15 + Math.random() * 0.5, uz + Math.sin(a + q) * 0.62, -Math.sin(a + q) * 2.4, 2.2, Math.cos(a + q) * 2.4, 0.5, 0.13, 0.02, Math.random() < 0.3 ? '#ffffff' : bc, 0.9, 0, 0.8); }       // leaves on the wind round a steadied hunter
  const im = immuneOf(u);
  if (im || v.tw) totemShell(v, u, im, t, dt, ux, uz);
  const rc = u.recallT > 0;
  if (skn.fx === 'E') { if (rc || v.rc) eclipseRecall(v, u, t, dt, rc, skn.sk[0]); }
  else if (skn.fx === 'C') { if (rc || v.rc) cometRecall(v, u, t, dt, rc, skn.sk[0]); }
  else if (skn.fx === 'S') { if (rc || v.rc) cometRecall(v, u, t, dt, rc, skn.sk[0], STAR_S); }
  else if (rc || v.rc) {
    const hc = RECALL_C[u.key] || '#9fd8ff';
    const g = lazyFx(v, 'rc', () => { const q = new THREE.Group(), a = new THREE.Mesh(FG.ring, fxMat(hc, 0.85)), b = new THREE.Mesh(FG.cyl, fxMat(hc, 0.3, { map: GX.tex.pillar })), d = new THREE.Mesh(FG.plane, fxMat(hc, 0.8, { map: GX.tex.rune })); a.position.y = 0.06; b.scale.set(0.62, 3.4, 0.62); d.position.y = 0.055; d.scale.set(2.3, 1, 2.3); q.add(a); q.add(b); q.add(d); return q; });
    g.visible = rc;
    if (rc) { const k = 1 - u.recallT / 6, s = 0.75 - k * 0.15; g.children[0].scale.set(s, 1, s); g.children[0].rotation.y = t * 2; g.children[1].material.opacity = 0.15 + k * 0.4; g.children[2].rotation.y = -t * 1.3; g.children[2].material.opacity = 0.35 + k * 0.5;
      if (Math.random() < dt * 10) { const a = Math.random() * TAU; FX.add.emit(u.x * S3 + Math.cos(a) * 0.6, 0.05, u.y * S3 + Math.sin(a) * 0.6, -Math.cos(a) * 0.3, 2.4, -Math.sin(a) * 0.3, 0.8, 0.14, 0.03, hc, 0.9, 0, 0); }
      recallAccent(u, k, t, dt, hc); }
  }
  const rt = u.rootT > 0;
  if (rt || v.rt) { const m = lazyFx(v, 'rt', () => { const q = new THREE.Mesh(FG.ring, fxMat('#a0ebff', 0.85)); q.position.y = 0.06; q.scale.set(0.5, 1, 0.5); return q; }); m.visible = rt; if (rt) m.rotation.y = -t * 3; }
}
/* Odile. On her knees (Anneal): slow rings close on her and light rises round her. A keen edge: her blade is alight, and sheds sparks.
   Quicksilver: an afterimage behind her every few paces, bright flecks off her, and the swirl under her feet in its colour (returned). */
function odileExtras(v, u, t, dt, ux, uz) {
  const c1 = skinColor(u.key, u.skin, 1), c2 = skinColor(u.key, u.skin, 2), c0 = skinColor(u.key, u.skin, 0); let aura = null;
  if (u.med) {
    v.anT = (v.anT || 0) - dt; if (v.anT <= 0) { v.anT = 0.5; ring3(ux, uz, 1.5, 0.35, 0.5, c1, 0.5, true); }
    if (Math.random() < dt * 22) { const a = Math.random() * TAU, d = 0.25 + Math.random() * 0.75; FX.add.emit(ux + Math.cos(a) * d, 0.05, uz + Math.sin(a) * d, 0, 1.3 + Math.random() * 0.9, 0, 0.9, 0.13, 0.02, Math.random() < 0.4 ? '#ffffff' : c1, 0.9, 0, 0); }
    aura = c1;
  }
  const ke = hasBuff(u, 'keen');
  if (ke || v.keenH) { let h = v.keenH; if (!h) { h = v.keenH = new THREE.Group(); for (const y of [0.35, 0.72, 1.08]) { const q = halo(c0, 0.5, 0.85); q.position.set(0, y, 0); h.add(q); } v.b.wpnR.add(h); }
    h.visible = !!ke; if (ke) { const s = (0.8 + 0.2 * Math.sin(t * 11)) * Math.min(1, ke.t / 0.4); for (const q of h.children) { q.scale.setScalar(0.5 * s); q.material.color.copy(lin(c0)); }
      if (Math.random() < dt * 16) { v.b.wpnR.getWorldPosition(_ov); FX.add.emit(_ov.x + (Math.random() - .5) * 0.3, _ov.y + 0.2 + Math.random() * 0.8, _ov.z + (Math.random() - .5) * 0.3, (Math.random() - .5) * 0.8, 0.6, (Math.random() - .5) * 0.8, 0.4, 0.11, 0.02, Math.random() < 0.5 ? '#ffffff' : c0, 0.95, 1.5, 0.8); } } }
  const qk = hasBuff(u, 'quick');
  if (qk) {
    aura = c2; v.qkT = (v.qkT || 0) - dt;
    if (u.moving && v.qkT <= 0) { v.qkT = 0.085; ghost3(v, c2, 0.3, 0.3); }
    if (Math.random() < dt * (u.moving ? 34 : 12)) FX.add.emit(ux + (Math.random() - .5) * 0.6, 0.15 + Math.random() * 1.5, uz + (Math.random() - .5) * 0.6, -(u.vx || 0) * S3 * 0.35, 0.2, -(u.vy || 0) * S3 * 0.35, 0.4, 0.12, 0.02, Math.random() < 0.45 ? '#ffffff' : c2, 0.9, 0, 0.4);
  }
  return aura;
}
const _ov = new THREE.Vector3();
/* How large a hero stands. The Ironwill Totem makes its bearer a third again as tall for as long as it works (he swells with a
   little bounce and settles back when it ends), so nobody can miss that it is on. Looks only: reach and hit size stay as they were. */
const TOTEM_BIG = 1.34;
function heroSize(v, u, dt, cut) {
  const want = !u.dead && immuneOf(u) ? TOTEM_BIG : 1; let b = v.big || 1;
  if (cut) { b = want; v.bigV = 0; }
  else if (b !== want || v.bigV) { const n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n; let w = v.bigV || 0; for (let i = 0; i < n; i++) { w += ((want - b) * 150 - w * 13) * h; b += w * h; } if (Math.abs(want - b) < 0.002 && Math.abs(w) < 0.02) { b = want; w = 0; } v.bigV = w; }
  if (b !== v.big) { v.big = b; v.o.scale.setScalar(v.sc * b * (v.ramS || 1)); v.ring.scale.set(0.58 * (0.4 + 0.6 * b), 1, 0.58 * (0.4 + 0.6 * b)); v.top = v.top0 * (0.12 + 0.88 * b); }
  return b;
}
const ATK_STR = 2.4;       // a hero that has not attacked for this long (or, if its attacks come slower than that, for most of two of them) starts its string of attacks over
function syncViews(t, dt) {
  const tick = ++V.tick, st = _st, low = V.q === 0, cut = V.cut; V.cut = false;
  for (const u of G.units) {
    if (u.kind === 'turret' || u.kind === 'crystal') continue;
    let v = V.views.get(u.id); if (!v) { v = makeView(u); V.views.set(u.id, v); }
    v.tick = tick; v.u = u;
    const hero = u.kind === 'hero' || u.kind === 'clone';
    if (hero) { if (u.dead) v.deadT += dt; else if (v.deadT > 0) { v.deadT = 0; v.mat.opacity = 1; v.mat.transparent = false; v.b.body.rotation.x = 0; v.b.body.position.y = 0; v.face = null; } }
    const show = seen(u) && u.away !== true && nearCam(u.x, u.y, 500) && !(hero && u.dead && v.deadT > 2.3);       // (away: Odile in the glass, where only her cuts are seen)
    v.root.visible = show; if (!show) { v.lastAtk = u.atkAnim; if (hero && u.camo && !u.dead && !seen(u) && nearCam(u.x, u.y, 200)) camoHint(v, u, dt); continue; }
    let px = u.x, py = u.y; const mine = AH.on && u === V.me && !V.replay;       // this player's own hero in a networked match: drawn where it is about to be (see netAhead)
    if (mine) { px = AH.x; py = AH.y; }
    if (G.net) { if (v.sx == null || cut || Math.abs(px - v.sx) + Math.abs(py - v.sy) > 260) { v.sx = px; v.sy = py; } else { const k = Math.min(1, dt * 28); v.sx += (px - v.sx) * k; v.sy += (py - v.sy) * k; } px = v.sx; py = v.sy; }       // a networked match is stepped thirty times a second whatever the screen does: the figures glide between the steps
    { const zz = (u.z || 0) * S3; v.root.position.set(px * S3, zz, py * S3); if (zz || v.zz) { v.zz = zz; v.blob.position.y = 0.04 - zz; if (v.ring) v.ring.position.y = 0.05 - zz; } }       // its ring and its shadow stay on the ground under it
    const tf = HP2 - (mine && AH.moving ? AH.face : u.face); v.face = v.face == null || cut ? tf : angLerp(v.face, tf, Math.min(1, dt * 15)); v.o.rotation.y = v.face;
    { const kn = u.km && u.km.until > G.t ? u.km.n : 0; if (kn || v.kmG) kmSync(v, u, kn, t); }
    { const sn = u.sg && !u.dead ? u.sg.n : 0; if (sn || v.sgG) sgSync(v, u, sn, t); }
    if (u.atkAnim > v.lastAtk + 0.25 && !cut) { v.clipT = 0; v.clipDur = clamp((u.windup || 0.26) / 0.6, 0.2, 0.8); v.alt ^= 1; v.av = t - (v.avT == null ? -9 : v.avT) > Math.max(ATK_STR, 1.8 / (u.asp || 1)) ? 0 : ((v.av || 0) + 1) % 3; v.avT = t; }       // (v.av: which of the three motions of this hero's string the attack is; the first again when it has not attacked for a while)
    v.lastAtk = u.atkAnim; v.clipT += dt;
    st.moving = (u.moving || (mine && AH.moving)) && !u.dead; st.speed = Math.max(1.4, u.ms * S3); st.atk = v.clipT < v.clipDur ? v.clipT / v.clipDur : -1;
    v.blob.visible = low && !(hero && u.dead);
    if (hero) {
      if (u.def.forms && v.form !== u.form) applyForm(v, u.form);
      if (cut) { v.castN = u.castN; v.rcK = 0; v.arrT = 0; if (v.cq) v.cq.on = false; v.lx = u.x; v.ly = u.y; }       // the picture jumped: no cast, no arrival, no cloth is carried across
      heroSize(v, u, dt, cut);
      if (v.castN !== u.castN) { v.castN = u.castN; if (u.castI !== 3) startClip(v, u.castI > 3 ? u.castI - 1 : u.castI); if (v.rb && u.form && u.castI === 8) v.rClip = 1; }       // 4..6 are second casts: clips 3..5
      if ((u.dash || u.leap) && !u.dead) { v.gT -= dt; if (v.gT <= 0) { v.gT = 0.07; const gc = skinColor(u.key, u.skin, v.clipI || 0); ghost3(v, gc, 0.32, 0.28); trail3(v.lx * S3, v.ly * S3, u.x * S3, u.y * S3, 0.75, 0.45, gc, 0.1 + (u.z || 0) * S3, 0.55); v.lx = u.x; v.ly = u.y; } } else { v.gT = 0; v.lx = u.x; v.ly = u.y; }
      v.kn = (v.kn || 0) + ((u.med ? 1 : 0) - (v.kn || 0)) * Math.min(1, dt * 9); st.kneel = v.kn > 0.003 ? v.kn : 0;
      st.cast = u.castAnim > 0 ? Math.min(1, u.castAnim / 0.3) : 0; st.dash = !!u.dash; st.leap = !!u.leap; st.spin = !!hasBuff(u, 'whirl'); st.stun = u.stunT > 0 || u.reviveT > 0; st.air = u.air && !u.dead ? clamp(u.air.t / u.air.dur, 0.001, 1) : 0; st.recall = u.recallT > 0 ? Math.max(0.001, 1 - u.recallT / 6) : 0; st.dead = u.dead ? v.deadT : 0;
      if (v.rcK > 0.9 && !st.recall && !u.dead && hyp(u.x - v.rcX, u.y - v.rcY) > 400) v.arrT = 0.001;       // the recall went through: play the setting-down at the fountain
      v.rcK = st.recall; if (st.recall) { v.rcX = u.x; v.rcY = u.y; } if (v.arrT > 0) { v.arrT += dt / 0.6; if (v.arrT >= 1) v.arrT = 0; } st.arrive = v.arrT || 0;
      st.busy = t - (v.avT == null ? -9 : v.avT) < Math.max(1.2, 1.25 / (u.asp || 1)) || G.t - u.lastDmgT < 1.5;       // still in its fight: its next blow may be on its way, or it has just been struck
      animHero(v, st, t, dt); if (v.rb && v.form) animRam(v, u, st, t, dt);
      if (v.style === 'rifle') { if (st.atk >= 0.6 && v.a0 >= 0 && v.a0 < 0.6 && !cut) rifleFlash(v, u); v.a0 = st.atk; }
      if (v.style === 'long') { if (st.atk >= 0.42 && v.a0 >= 0 && v.a0 < 0.42 && !cut) { const sw = 0.3 * v.clipDur + 0.03, kn = !!hasBuff(u, 'keen'); bladeTrail(v, skinColor(u.key, u.skin, 0), sw, 0.2, { op: kn ? 0.6 : 0.42 }); bladeTrail(v, '#ffffff', sw, 0.12, { y0: kn ? 1.1 : 1.24, op: kn ? 0.7 : 0.45 }); } v.a0 = st.atk; }       // the path of her blade through each cut (and of its keen edge, when it has one)
      if (v.style === 'hurl') { if (st.atk >= 0.6 && v.a0 >= 0 && v.a0 < 0.6 && !cut) slash3(u.x * S3 + Math.cos(u.face) * 0.25, u.y * S3 + Math.sin(u.face) * 0.25, u.face, 0.62, 1.05, 0.15, u.look.glow || u.look.trim, 1.25, { thin: 1, op: 0.5, edge: 0.7 }); v.a0 = st.atk; }       // the sweep of the throwing arm as the leaf leaves it
      { const im = !u.dead && immuneOf(u); if (im && im.shell && !(u.flash > 0)) { v.mat.emissive.copy(lin(im.shell)).multiplyScalar(0.16 + 0.05 * Math.sin(t * 6)); v.glow = 1; } else if (u.flash > 0 && !u.dead) { v.mat.emissive.setScalar(0.13); v.glow = 1; } else if (v.glow !== 0) { v.mat.emissive.setScalar(0); v.glow = 0; } }
      { const quick = v.style === 'reap' || SKINS[u.key][u.skin].fx === 'C', f0 = quick ? 0.55 : 1.7, fd = quick ? 0.25 : 0.6, fading = u.dead && v.deadT > f0;
        const want = !u.dead && u.camo ? CAMO_OP : !u.dead && u.bush >= 0 ? BUSH_OP : 1; let bk = v.bk == null || cut ? want : v.bk; if (bk !== want) { bk += (want - bk) * Math.min(1, dt * 10); if (Math.abs(bk - want) < 0.012) bk = want; } v.bk = bk;       // in tall grass he goes see-through; the grass is left alone
        const gh = bk < 0.995; if (!!v.gh !== gh) heroBush(v, gh);
        const op = (fading ? clamp(1 - (v.deadT - f0) / fd, 0, 1) : 1) * bk, tr = op < 0.999; if (v.mat.transparent !== tr) v.mat.transparent = tr; v.mat.opacity = op;
        if (fading && quick && v.deadT > f0 + fd) v.o.visible = false; else if (!v.o.visible) v.o.visible = true; }       // the Eclipse skin is gone by the time its eclipse bursts
      v.ring.visible = !u.dead;
      if (st.moving && !v.hover && !u.leap && Math.random() < dt * 7) FX.alpha.emit(u.x * S3 + (Math.random() - .5) * 0.3, 0.06, u.y * S3 + (Math.random() - .5) * 0.3, 0, 0.35, 0, 0.45, 0.14, 0.4, '#d8cfb4', 0.3, -0.2, 1);
      if (!u.dead) heroExtras(v, u, t, dt); else { if (v.wg) { v.wg.g.visible = false; v.wgAge = -1; } if (v.auraM) v.auraM.visible = false; if (v.tw) v.tw.visible = false; if (v.bub) v.bub.visible = false; if (v.rc) v.rc.visible = false; if (v.rt) v.rt.visible = false; if (v.ecl) v.ecl.visible = false; if (v.cmt) v.cmt.visible = false; if (v.shd) v.shd.visible = false; }
    } else {
      animUnit(v, u, st, t, dt);
      const ak = u.air ? Math.sin(Math.min(1, u.air.t / u.air.dur) * Math.PI) : 0; if (ak || v.airK) { v.airK = ak; v.o.rotation.x = -0.7 * ak; v.o.rotation.z = (v.seed > 3 ? 0.4 : -0.4) * ak; }       // thrown into the air, it tumbles
    }
  }
  for (const [id, v] of V.views) if (v.tick !== tick) {       // gone from the sim: brief collapse, then remove
    if (V.replay) { v.root.visible = false; continue; }       // not in the recording: kept, out of sight, for when the live game is shown again
    v.goneT = (v.goneT || 0) + dt; const k = v.goneT / 0.38;
    if (k >= 1 || v.kind === 'hero' || !v.root.visible) { V.ug.remove(v.root); if (v.mat) v.mat.dispose(); V.views.delete(id); }
    else { v.o.scale.setScalar(v.sc * (1 - k * 0.55)); v.root.position.y = -k * 0.35; v.o.rotation.x = -k * 0.8; v.blob.visible = false; }
  }
  GX.mat.gold.emissiveIntensity = GX.mat.goldGhost.emissiveIntensity = 0.55 + 0.25 * Math.sin(t * 2.6);       // the plating breathes
  for (const s of G.turrets) structSync(s, t, dt); for (const s of G.crystals) structSync(s, t, dt);
}
function structSync(s, t, dt) {
  let v = V.structs.get(s.id);
  if (!v) { v = unitInstance(s); v.o.position.set(s.x * S3, 0, s.y * S3); V.ug.add(v.o); V.structs.set(s.id, v); }
  const me = V.me, dy = me ? s.y - me.y : 0, big = s.kind === 'crystal';
  _ss.ghost = !!(me && !me.dead && dy > 30 && dy < (big ? 560 : 470) && Math.abs(me.x - s.x) < (big ? 170 : 100) + dy * 0.1);
  _ss.plates = s.plate > 0 ? Math.ceil(s.plate / PLATE_HP - 1e-9) : 0;
  if (_ss.plates && !_ss.ghost && Math.random() < dt * 0.8 && nearCam(s.x, s.y, 0)) { const a = 0.4 + Math.random() * 2.3; glint3(s.x * S3 + Math.cos(a) * 0.56, PLATE_Y[(Math.random() * _ss.plates) | 0] + (Math.random() - .5) * 0.2, s.y * S3 + Math.sin(a) * 0.56, 0.55, 0.5, '#fff6d0'); }       // a glint now and then, on the side the camera sees
  v.u = s; _ss.kind = s.kind; _ss.dead = s.dead; _ss.windT = s.windT; animStructure(v, _ss, t, dt);
}
function viewsClear() {
  for (const v of V.views.values()) { V.ug.remove(v.root); if (v.mat) v.mat.dispose(); if (v.ring) v.ring.material.dispose(); v.root.traverse(x => { if ((x.isMesh && x.material.blending === THREE.AdditiveBlending) || x.userData.own === 1) x.material.dispose(); }); }
  for (const v of V.structs.values()) V.ug.remove(v.o);
  V.views.clear(); V.structs.clear(); fxClear();
}
function fxPing(x, y, c) { ring3(x * S3, y * S3, 0.15, 0.6, 0.45, c || '#8fe0a8', 0.9); ring3(x * S3, y * S3, 0.1, 0.35, 0.3, '#ffffff', 0.7, true); }

/* ---------- ground markers: aim, ranges, target ---------- */
function markersInit() {
  const mk = (geo, hex, op, o) => { const m = new THREE.Mesh(geo, fxMat(hex, op, o)); m.visible = false; m.renderOrder = 2; GX.scene.add(m); return m; };
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, 0, 0, 0.5, 0.7, 0, 0], 3)); tri.setIndex([0, 1, 2]);
  const NB = { blending: THREE.NormalBlending };
  AIM.range = mk(FG.ringThin, '#8fd8ff', 0.7, NB);
  AIM.line = new THREE.Group(); AIM.line.visible = false; GX.scene.add(AIM.line);
  AIM.rect = new THREE.Mesh(FG.plane, fxMat('#8fd8ff', 0.3, NB)); AIM.e1 = new THREE.Mesh(FG.plane, fxMat('#8fd8ff', 0.95, NB)); AIM.e2 = new THREE.Mesh(FG.plane, fxMat('#8fd8ff', 0.95, NB)); AIM.tip = new THREE.Mesh(tri, fxMat('#8fd8ff', 0.85, NB));
  for (const m of [AIM.rect, AIM.e1, AIM.e2, AIM.tip]) { m.position.y = 0.075; m.renderOrder = 2; AIM.line.add(m); }
  AIM.disc = mk(FG.disc, '#8fd8ff', 1, { map: GX.tex.disc, blending: THREE.NormalBlending }); AIM.link = mk(FG.plane, '#8fd8ff', 0.55, NB);
  AIM.sector = mk(FG.disc, '#8fd8ff', 0.34, NB); AIM.sectorKey = '';
  AIM.all = [AIM.range, AIM.rect, AIM.e1, AIM.e2, AIM.tip, AIM.disc, AIM.link, AIM.sector];
  MK.atk = mk(FG.ringThin, '#ffffff', 0.28); MK.tgt = mk(FG.ring, '#ffd76a', 0.9); MK.tr = [mk(FG.ringThin, '#ff4a3a', 0.6, { blending: THREE.NormalBlending }), mk(FG.ringThin, '#ff4a3a', 0.6, { blending: THREE.NormalBlending })];
  MK.laser = mk(FG.beam, '#ff3a2a', 0.85, { blending: THREE.NormalBlending });
}
/* The ground a turret guards, as an outline: its range cut off where the lane ends, since it never shoots into the woods. */
const _guardGeo = new Map();
function guardGeo(s) {
  const key = s.x + ',' + s.y; let g = _guardGeo.get(key); if (g) return g;
  const N = 160, pos = new Float32Array((N + 1) * 6), idx = [];
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, cx = Math.cos(a), cy = Math.sin(a); let r = 0;
    for (let d = 16; d <= s.range; d += 16) { if (laneSd(s.x + cx * d, s.y + cy * d) <= 0) break; r = d; }
    if (r + 16 <= s.range) { let lo = r, hi = r + 16; for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (laneSd(s.x + cx * m, s.y + cy * m) > 0) lo = m; else hi = m; } r = lo; } else r = s.range;
    const r0 = Math.max(0, r - 18), o = i * 6;
    pos[o] = cx * r0 * S3; pos[o + 2] = cy * r0 * S3; pos[o + 3] = cx * r * S3; pos[o + 5] = cy * r * S3;
    if (i < N) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); _guardGeo.set(key, g); return g;
}
function markersUpdate(t) {
  const me = V.me, aim = V.aim, on = !!(aim && me && !me.dead);
  for (const m of AIM.all) if (m.parent === GX.scene) m.visible = false; AIM.line.visible = false;
  if (on) {
    const own = AH.on && me === G.player, mx = (own ? AH.x : me.x) * S3, mz = (own ? AH.y : me.y) * S3;       // (in a networked match: from where the hero is about to be, which is where it will cast from)
    const s = aim.s, ind = s.ind, ax = aim.x * S3, az = aim.y * S3, ang = Math.atan2(az - mz, ax - mx), rng = (s.range || 0) * S3;
    const c = lin(aim.cancel ? '#ff4d4d' : '#3fb6ff'); for (const m of AIM.all) m.material.color.copy(c);
    if (s.range && ind.t !== 'self') { AIM.range.visible = true; AIM.range.position.set(mx, 0.07, mz); AIM.range.scale.set(rng, 1, rng); }
    if (ind.t === 'line') {
      const w = ind.w * S3; AIM.line.visible = true; AIM.line.position.set(mx, 0, mz); AIM.line.rotation.y = -ang;
      AIM.rect.scale.set(rng, 1, w); AIM.rect.position.x = rng / 2; AIM.e1.scale.set(rng, 1, 0.04); AIM.e1.position.set(rng / 2, 0.08, w / 2); AIM.e2.scale.set(rng, 1, 0.04); AIM.e2.position.set(rng / 2, 0.08, -w / 2);
      AIM.tip.visible = true; AIM.tip.position.x = rng; AIM.tip.scale.set(w * 1.1, 1, w * 1.5);
    } else if (ind.t === 'step') {       // a short step, then a sweep around where it ends
      const d = ind.d * S3, w = ind.w * S3, r = ind.r * S3, key = r.toFixed(2) + ':' + ind.a; if (AIM.sectorKey !== key) { if (AIM.sectorKey) AIM.sector.geometry.dispose(); AIM.sector.geometry = new THREE.RingGeometry(0.2, r, 28, 1, -ind.a, ind.a * 2).rotateX(-HP2); AIM.sectorKey = key; }
      AIM.line.visible = true; AIM.line.position.set(mx, 0, mz); AIM.line.rotation.y = -ang; AIM.tip.visible = false;
      AIM.rect.scale.set(d, 1, w); AIM.rect.position.x = d / 2; AIM.e1.scale.set(d, 1, 0.04); AIM.e1.position.set(d / 2, 0.08, w / 2); AIM.e2.scale.set(d, 1, 0.04); AIM.e2.position.set(d / 2, 0.08, -w / 2);
      AIM.sector.visible = true; AIM.sector.position.set(mx + Math.cos(ang) * d, 0.075, mz + Math.sin(ang) * d); AIM.sector.rotation.y = -ang;
    } else if (ind.t === 'cone') {
      const key = rng.toFixed(2) + ':' + ind.a; if (AIM.sectorKey !== key) { if (AIM.sectorKey) AIM.sector.geometry.dispose(); AIM.sector.geometry = new THREE.RingGeometry(0.2, rng, 28, 1, -ind.a, ind.a * 2).rotateX(-HP2); AIM.sectorKey = key; }
      AIM.sector.visible = true; AIM.sector.position.set(mx, 0.075, mz); AIM.sector.rotation.y = -ang;
    } else if (ind.t === 'circle') {
      const r = ind.r * S3, d = Math.hypot(ax - mx, az - mz); AIM.disc.visible = true; AIM.disc.position.set(ax, 0.075, az); AIM.disc.scale.set(r, 1, r);
      AIM.link.visible = d > 0.2; AIM.link.position.set((ax + mx) / 2, 0.07, (az + mz) / 2); AIM.link.rotation.y = -ang; AIM.link.scale.set(d, 1, 0.05);
    } else { const r = Math.max(ind.r, 70) * S3; AIM.disc.visible = true; AIM.disc.position.set(mx, 0.075, mz); AIM.disc.scale.set(r, 1, r); }
  }
  // own attack range while attacking, and the current target
  const live = me && !me.dead;
  MK.atk.visible = !!(live && V.showRange); if (MK.atk.visible) { const r = (me.range + 30) * S3, own = AH.on && me === G.player; MK.atk.position.set((own ? AH.x : me.x) * S3, 0.065, (own ? AH.y : me.y) * S3); MK.atk.scale.set(r, 1, r); }
  const tg = live && me.atkTarget && !me.atkTarget.dead ? me.atkTarget : null;
  MK.tgt.visible = !!tg; if (tg) { const r = (tg.r + 20) * S3 * (1 + Math.sin(t * 7) * 0.06); MK.tgt.position.set(tg.x * S3, 0.08, tg.y * S3); MK.tgt.scale.set(r, 1, r); }
  // enemy turret range when the player is close, and a warning beam when it locks on
  let n = 0; MK.laser.visible = false;
  if (live) for (const s of G.turrets.concat(G.crystals)) {
    if (s.dead || s.team === me.team || n >= 2) continue; const d = hyp(s.x - me.x, s.y - me.y); if (d > s.range + 340) continue;
    const m = MK.tr[n++], hot = s.tgt === me; m.visible = true; m.geometry = guardGeo(s); m.position.set(s.x * S3, 0.07, s.y * S3); m.scale.set(1, 1, 1); m.material.side = THREE.DoubleSide; m.material.opacity = hot ? 0.75 + Math.sin(t * 12) * 0.25 : 0.45;
    if (hot) { const y0 = s.kind === 'crystal' ? 2.8 : 4.05, x0 = s.x * S3, z0 = s.y * S3, x1 = me.x * S3, z1 = me.y * S3; MK.laser.visible = true; MK.laser.position.set((x0 + x1) / 2, (y0 + 1) / 2, (z0 + z1) / 2); MK.laser.scale.set(0.028, 0.028, Math.hypot(x1 - x0, 1 - y0, z1 - z0)); MK.laser.lookAt(x1, 1, z1); }
  }
  for (; n < 2; n++) MK.tr[n].visible = false;
}

/* ---------- 2D overlay: bars, names, status, floating text ---------- */
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBar(ctx, x, y, w, h, f, col, sh, ticksPer, maxHp) {
  ctx.fillStyle = 'rgba(8,14,18,0.85)'; rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 3); ctx.fill();
  ctx.fillStyle = '#26323a'; ctx.fillRect(x, y, w, h);
  const fw = w * clamp(f, 0, 1); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, fw, h * 0.4);
  if (sh > 0) { const swd = Math.min(w, w * sh); ctx.fillStyle = 'rgba(235,245,255,0.9)'; ctx.fillRect(x + Math.min(fw, w - swd), y, swd, h); }
  if (ticksPer) { ctx.fillStyle = 'rgba(8,14,18,0.7)'; const n = Math.floor(maxHp / ticksPer); if (n < 40) for (let i = 1; i <= n; i++) ctx.fillRect(x + w * (i * ticksPer / maxHp) - 0.5, y, 1, h * (i % 2 ? 0.55 : 1)); }
}
function drawOverlay(dt) {
  const g = V.og, d = V.odpr, me = V.me, t = V.t, us = clamp(Math.min(V.vh / 760, V.vw / 1000), 0.72, 1.25), p = _sp;
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, V.vw, V.vh);
  const F1 = "Teko, 'Arial Narrow', sans-serif", F2 = "'Barlow Semi Condensed', 'Arial Narrow', sans-serif";
  const label = (txt, x, y, size, fill) => { g.font = `600 ${size}px ${F2}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };
  for (const v of V.views.values()) {
    const u = v.u; if (v.tick !== V.tick || !v.root.visible || u.dead) continue;
    if (!w2s(v.root.position.x, v.top + (u.z || 0) * S3, v.root.position.z, p)) continue;       // (over the figure as it is drawn: in a networked match that glides a little behind the unit itself)
    const px = p.x, by = p.y, col = tcol(u.team, V.team);
    if (px < -80 || px > V.vw + 80 || by < -60 || by > V.vh + 60) continue;
    if (u.tauntT > 0) { const r = (8.5 + Math.sin(t * 14) * 1.2) * us, cx = px + 3 * us, cy = by - (u.kind === 'hero' ? 39 : 20) * us;       // taunted: a red mark over the head for as long as it lasts
      g.fillStyle = TAUNT_C; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.stroke();
      g.fillStyle = '#fff'; g.fillRect(cx - 1.4 * us, cy - 5 * us, 2.8 * us, 6.2 * us); g.beginPath(); g.arc(cx, cy + 3.9 * us, 1.6 * us, 0, TAU); g.fill(); }
    if (u.stunT > 0) { g.fillStyle = '#ffe36a'; for (let j = 0; j < 3; j++) { const a = t * 6 + j * TAU / 3; g.beginPath(); g.arc(px + Math.cos(a) * 15 * us, by + 16 * us + Math.sin(a) * 5 * us, 3.4 * us, 0, TAU); g.fill(); } }
    if (u.kind === 'hero' || u.kind === 'clone') {
      const w = 80 * us, h = 8.5 * us, x = px - w / 2 + 7 * us, y = by - h - 4 * us, mine = u === me, mo = u.owner || u;       // (an echo shows his mana, not its own: its own would give it away)
      drawBar(g, x, y, w, h, u.hp / u.maxHp, mine ? COL.self : col, shieldOf(u) / u.maxHp, 500, u.kind === 'clone' && !v.echo ? mo.maxHp : u.maxHp);       // (nor do the marks along an echo's bar count its own health, to the side that must not know it from him)
      g.fillStyle = '#16222a'; g.fillRect(x, y + h + 1.5, w, 3 * us); g.fillStyle = '#4f8dff'; g.fillRect(x, y + h + 1.5, w * (mo.mp / mo.maxMp), 3 * us);
      g.fillStyle = 'rgba(8,14,18,0.9)'; g.beginPath(); g.arc(x - 9 * us, y + h / 2 + 1, 9.5 * us, 0, TAU); g.fill(); g.strokeStyle = mine ? COL.self : col; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#fff'; g.font = `700 ${12 * us}px ${F1}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(u.level, x - 9 * us, y + h / 2 + 1.5);
      label(mine ? 'You' : v.echo ? 'Echo' : u.name, px + 3 * us, y - 4 * us, 11 * us, mine ? '#d6ffe0' : u.team === V.team || (V.team < 0 && u.team === BLUE) ? '#cfe9ff' : '#ffd2d2');
      if (u.sg) for (let j = 0; j < u.sg.n; j++) { const sx = x + w + (8 + j * 9.5) * us, sy = y + h / 2; g.fillStyle = '#ffb21e'; g.strokeStyle = 'rgba(24,14,0,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, sy - 5.5 * us); g.lineTo(sx + 3.8 * us, sy); g.lineTo(sx, sy + 5.5 * us); g.lineTo(sx - 3.8 * us, sy); g.closePath(); g.stroke(); g.fill(); }       // Miel's stings in this hero: a pip for each, at the end of the bar
      if (u === V.focus) { const ty = y - 17 * us, s = 5.5 * us; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 3 * us - s, ty - s); g.lineTo(px + 3 * us + s, ty - s); g.lineTo(px + 3 * us, ty); g.closePath(); g.stroke(); g.fill(); }       // watching: the one the view is on
      if (V.replay && u.id === V.slayer && w2s(u.x * S3, 0, u.y * S3, _sp2)) { const gx = _sp2.x, gy = _sp2.y + 15 * us; g.fillStyle = '#ff5d5d'; g.beginPath(); g.moveTo(gx - 5 * us, gy + 6 * us); g.lineTo(gx + 5 * us, gy + 6 * us); g.lineTo(gx, gy); g.closePath(); g.fill(); label('SLAYER', gx, gy + 19 * us, 12 * us, '#ffb3b3'); }       // under his feet, where neither the bars nor the dark bands hide it
      if (u.tp) { const k = 1 - u.tp.t / TP_T; g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x, y + h + 7 * us, w, 4 * us); g.fillStyle = SPELLS.teleport.c; g.fillRect(x, y + h + 7 * us, w * k, 4 * us); }       // on his way by Teleport
      else if (u.med) { const k = clamp(1 - u.med.t / AN_T, 0, 1); g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x, y + h + 7 * us, w, 4 * us); g.fillStyle = skinColor(u.key, u.skin, 1); g.fillRect(x, y + h + 7 * us, w * k, 4 * us); }       // Odile on her knees: how much of it is done
      else if (u.def.kneel && hasBuff(u, 'quick')) { const k = clamp(hasBuff(u, 'quick').t / QS_T, 0, 1); g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x, y + h + 7 * us, w, 3.5 * us); g.fillStyle = skinColor(u.key, u.skin, 2); g.fillRect(x, y + h + 7 * us, w * k, 3.5 * us); }       // how much longer Quicksilver lasts
      else if (u.form && u.def.forms && u.def.forms.beast && u.pv.bt) { const k = clamp((u.pv.bt - G.t) / BEAST_T, 0, 1); g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x, y + h + 7 * us, w, 3.5 * us); g.fillStyle = skinColor(u.key, u.skin, 2); g.fillRect(x, y + h + 7 * us, w * k, 3.5 * us); }       // how much longer he is the Stormhorn
      if (u.recallT > 0) { const k = 1 - u.recallT / 6; g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x, y + h + 7 * us, w, 4 * us); g.fillStyle = '#9fd8ff'; g.fillRect(x, y + h + 7 * us, w * k, 4 * us); }
    } else if (u.kind === 'minion') {
      if (u.mtype === 'lord') drawBar(g, px - 62 * us, by - 8, 124 * us, 7.5 * us, u.hp / u.maxHp, col, 0);
      else drawBar(g, px - 18 * us, by - 2, 36 * us, 3.6 * us, u.hp / u.maxHp, col, 0);
    } else if (u.epic) { drawBar(g, px - 72 * us, by - 8, 144 * us, 8.5 * us, u.hp / u.maxHp, '#c070ff', 0); label(u.name, px, by - 14, 12.5 * us, '#ead6ff'); }
    else if (u.hp < u.maxHp || u.r > 40) drawBar(g, px - 25 * us, by - 4, 50 * us, 4.6 * us, u.hp / u.maxHp, u.mtype === 'azure' ? '#4f9dff' : u.mtype === 'crimson' ? '#ff6a4a' : u.mtype === 'skitter' ? '#5fe0c8' : '#e8b55a', 0);
  }
  for (const v of V.structs.values()) {
    const u = v.u; if (u.dead || !nearCam(u.x, u.y, 500) || !w2s(u.x * S3, v.top, u.y * S3, p)) continue;
    const px = p.x, by = p.y, col = tcol(u.team, V.team);
    if (u.kind === 'turret' && u.plate > 0) {       // gold plating: a plate to a segment, and how long it will still be there
      const w = 92 * us, x0 = px - 46 * us, h = 5 * us, y0 = by - h - 3, gap = 2, sw = (w - gap * (PLATES - 1)) / PLATES;
      g.fillStyle = 'rgba(8,14,18,0.85)'; g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      for (let i = 0; i < PLATES; i++) { const f = clamp(u.plate / PLATE_HP - i, 0, 1), sx = x0 + i * (sw + gap); g.fillStyle = '#3d3216'; g.fillRect(sx, y0, sw, h); if (f > 0) { g.fillStyle = '#f2c14e'; g.fillRect(sx, y0, sw * f, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(sx, y0, sw * f, Math.max(1, h * 0.3)); } }
      if (!V.replay) { const left = Math.max(0, Math.ceil(PLATE_TIME - G.t)); g.font = `700 ${10.5 * us}px ${F1}`; g.textAlign = 'left'; g.textBaseline = 'middle'; const tx = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(tx, x0 + w + 5 * us, y0 + h / 2 + 0.5); g.fillStyle = left <= 30 ? '#ffb38a' : '#f2c14e'; g.fillText(tx, x0 + w + 5 * us, y0 + h / 2 + 0.5); }
    }
    if (u.kind === 'turret') { drawBar(g, px - 46 * us, by, 92 * us, 7.5 * us, u.hp / u.maxHp, col, 0); if (u.locked) { g.fillStyle = 'rgba(8,14,18,0.8)'; g.fillRect(px - 46 * us, by, 92 * us, 7.5 * us); g.fillStyle = '#9fb0b8'; g.font = `600 ${9 * us}px ${F2}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROTECTED', px, by + 4.2 * us); } }
    else { drawBar(g, px - 84 * us, by, 168 * us, 9.5 * us, u.hp / u.maxHp, col, 0); if (u.locked) label('PROTECTED UNTIL A LANE FALLS', px, by - 6, 11 * us, '#cfd9de'); }
  }
  for (let i = FX.texts.length - 1; i >= 0; i--) {
    const f = FX.texts[i]; f.t += dt; const k = f.t / f.dur; if (k >= 1) { FX.texts.splice(i, 1); continue; }
    if (!w2s(f.x, f.y + k * 0.7, f.z, p)) continue;
    const sz = (f.big ? 25 : 18) * us * (k < 0.12 ? 0.7 + k * 2.5 : 1); g.font = `700 ${sz}px ${F1}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(f.txt, p.x + f.ox * us, p.y); g.fillStyle = f.c; g.fillText(f.txt, p.x + f.ox * us, p.y); g.globalAlpha = 1;
  }
}

/* ---------- death replay ----------
   The view keeps the last seconds of what it was shown around the player: fifteen times a second a copy of every hero and of
   whatever else stood near him, with the shots and areas in the air, and every effect and sound at the moment it happened. Once he
   is slain that stretch is cut out as a clip, and playing it hands the view those copies (moved smoothly from one to the next) in
   place of the live game, which carries on unseen meanwhile. The sim knows nothing of any of this. */
const REC = { frames: [], ev: [], sf: [], acc: 0, rid: 0, hz: 15, keep: 10, span: 7, tail: 1.2, rx: 1700, ry: 1700, clip: null, deathN: 0, cutN: -1, deathT: -99, aliveT: 0, wasDead: false };
const RP = { on: false, clip: null, t: 0, i: 0, ei: 0, si: 0, px: new Map(), pp: new Map(), pa: new Map(), sfx: [], slowmo: true, first: false };
function recReset() { REC.frames.length = 0; REC.ev.length = 0; REC.sf.length = 0; REC.acc = 0; REC.clip = null; REC.deathN = 0; REC.cutN = -1; REC.deathT = -99; REC.aliveT = 0; REC.wasDead = false; }
function recUnit(u) {       // a copy the view can be shown later: what changes in place (buffs, shields, sight, marks) is copied one level down
  const c = Object.assign({}, u);
  if (u.buffs) c.buffs = u.buffs.length ? u.buffs.map(b => Object.assign({}, b)) : u.buffs.slice(); if (u.shields) c.shields = u.shields.length ? u.shields.map(b => Object.assign({}, b)) : u.shields.slice();
  if (u.flurry) c.flurry = { tgt: { id: u.flurry.tgt.id }, n: u.flurry.n, until: u.flurry.until, ci: u.flurry.ci };
  if (u.vis) c.vis = u.vis.slice(); if (u.pv) c.pv = Object.assign({}, u.pv); if (u.km) c.km = Object.assign({}, u.km); if (u.om) c.om = Object.assign({}, u.om); if (u.sg) c.sg = Object.assign({}, u.sg); if (u.air) c.air = Object.assign({}, u.air); if (u.re) c.re = u.re.map(r => r ? Object.assign({}, r) : r);
  return c;
}
function recFrame(me, t) {
  const f = { t, units: [], projs: [], areas: [], ix: null, px: null, ax: null }, rx = REC.rx, ry = REC.ry, near = o => Math.abs(o.x - me.x) <= rx && Math.abs(o.y - me.y) <= ry;
  for (const u of G.units) if (u.kind === 'hero' || u.kind === 'turret' || u.kind === 'crystal' || near(u)) f.units.push(recUnit(u));
  for (const p of G.projs) { if (!near(p)) continue; const c = Object.assign({}, p); c._v = null; c._rid = p._rid || (p._rid = ++REC.rid); c.srcId = p.src ? p.src.id : 0; c.tgtId = p.tgt ? p.tgt.id : 0; if (p.tgt) { c.tx = p.tgt.x; c.ty = p.tgt.y; c.tk = p.tgt.kind; } f.projs.push(c); }
  for (const a of G.areas) { if (!near(a)) continue; const c = Object.assign({}, a); c._v = null; c._rid = a._rid || (a._rid = ++REC.rid); c.srcId = a.src ? a.src.id : 0; c.folId = a.follow ? a.follow.id : 0; f.areas.push(c); }
  return f;
}
function recTrim(arr, key, cut) { let n = 0; while (n < arr.length && arr[n][key] < cut) n++; if (n > 24) arr.splice(0, n); }
function recClip(me) {       // the stretch that ends in the death just recorded: from at most `span` seconds before it (never from before he last came back) to the tail after it
  const d = REC.deathT, t0 = Math.max(d - REC.span, REC.aliveT + 0.1), fr = REC.frames.filter(f => f.t >= t0);
  if (fr.length < 6 || d - fr[0].t < 0.8) return null;
  return { t0: fr[0].t, t1: fr[fr.length - 1].t, death: d, frames: fr, ev: REC.ev.filter(e => e.rt > fr[0].t), sf: REC.sf.filter(e => e.rt > fr[0].t), me: me.id, n: me.deaths };
}
function recTick(dt) {
  const me = G.player; if (!me || G.over) return; const t = G.t;
  for (const e of G.fx) if (e.rt == null) { e.rt = t; REC.ev.push(e); }
  for (const e of G.sfx) if (e.rt == null) { e.rt = t; REC.sf.push(e); }
  if (me.dead) {
    if (!REC.wasDead) { REC.wasDead = true; REC.deathN = me.deaths; REC.deathT = me.recap ? me.recap.t : t; REC.clip = null; }
    if (t > REC.deathT + REC.tail) { if (REC.cutN !== me.deaths) { REC.cutN = me.deaths; REC.clip = recClip(me); REC.frames.length = 0; REC.ev.length = 0; REC.sf.length = 0; } return; }       // the clip is cut once; nothing more is kept until he is back
  } else if (REC.wasDead) { REC.wasDead = false; REC.aliveT = t; REC.acc = 1; }
  REC.acc += dt; if (REC.acc < 1 / REC.hz) return; REC.acc = Math.min(REC.acc - 1 / REC.hz, 1 / REC.hz);
  REC.frames.push(recFrame(me, t));
  const cut = t - REC.keep; recTrim(REC.frames, 't', cut); recTrim(REC.ev, 'rt', cut); recTrim(REC.sf, 'rt', cut);
}
/* How long the clip takes to watch from sim time `from` (the last second before the blow runs slow), and where to start so that it
   fits into `avail` seconds: the start is what gets cut, never the end. */
const RP_SLOW = 0.4, RP_S0 = 1.1, RP_S1 = 0.25;
function replayLength(c, from, slowmo) { const a = Math.max(from, c.death - RP_S0), b = Math.min(c.t1, c.death + RP_S1), sl = slowmo ? Math.max(0, b - a) : 0; return (c.t1 - from) - sl + sl / RP_SLOW; }
function replayPlan(c, avail) {
  if (replayLength(c, c.t0, true) <= avail) return { from: c.t0, slowmo: true };
  const extra = (RP_S0 + RP_S1) / RP_SLOW - (RP_S0 + RP_S1), need = RP_S0 + extra + (c.t1 - c.death) + 1;       // slow motion is kept while at least a second of lead-in fits before it
  if (avail >= need) return { from: c.t1 - (avail - extra), slowmo: true };
  return { from: Math.max(c.t0, c.t1 - avail), slowmo: false };
}
function replayStart(c, avail) {
  const plan = replayPlan(c, avail == null ? 1e9 : avail);
  RP.on = true; RP.clip = c; RP.t = plan.from; RP.slowmo = plan.slowmo; RP.i = 0; RP.ei = RP.si = 0; RP.px.clear(); RP.pp.clear(); RP.pa.clear(); RP.sfx.length = 0; RP.first = true; RP.from = plan.from;
  while (RP.ei < c.ev.length && c.ev[RP.ei].rt <= RP.t) RP.ei++; while (RP.si < c.sf.length && c.sf[RP.si].rt <= RP.t) RP.si++;
  V.replay = true; V.cut = true; fxClear();       // none of the live game's effects are carried into the recording
}
function replayStop() {
  if (!RP.on) return; RP.on = false; RP.clip = null; RP.px.clear(); RP.pp.clear(); RP.pa.clear(); RP.sfx.length = 0;
  V.replay = false; V.cut = true; V.me = G.player; fxClear(); if (G.player) { V.cam.x = G.player.x; V.cam.y = G.player.y; }
}
function replayFrame(dt) {       // draws one frame of the recording; false once it has run out
  const c = RP.clip, live = G, slow = RP.slowmo && RP.t > c.death - RP_S0 && RP.t < c.death + RP_S1 ? RP_SLOW : 1, sdt = dt * slow;
  RP.t += sdt; if (RP.t >= c.t1) return false;
  const F = c.frames; while (RP.i < F.length - 2 && F[RP.i + 1].t <= RP.t) RP.i++;
  const A = F[RP.i], B = F[Math.min(RP.i + 1, F.length - 1)], k = B.t > A.t ? clamp((RP.t - A.t) / (B.t - A.t), 0, 1) : 0;
  if (!B.ix) { B.ix = new Map(); for (const u of B.units) B.ix.set(u.id, u); B.px = new Map(); for (const p of B.projs) B.px.set(p._rid, p); B.ax = new Map(); for (const a of B.areas) B.ax.set(a._rid, a); }
  const RW = Object.create(live); RW.replayOf = live; RW.t = A.t + (B.t - A.t) * k; RW.units = []; RW.heroes = []; RW.turrets = []; RW.crystals = []; RW.projs = []; RW.areas = []; RW.fx = []; RW.sfx = [];
  for (const a of A.units) {
    let p = RP.px.get(a.id); if (!p) { p = {}; RP.px.set(a.id, p); }
    Object.assign(p, a);
    const b = k > 0 ? B.ix.get(a.id) : null;
    if (b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < 300 * 300) { p.x = a.x + dx * k; p.y = a.y + dy * k; p.z = (a.z || 0) + ((b.z || 0) - (a.z || 0)) * k; if (a.face != null && b.face != null) p.face = angLerp(a.face, b.face, k); }       // further than that in one step is a blink: no gliding across
      if (!a.dead && !b.dead && a.hp != null) { p.hp = a.hp + (b.hp - a.hp) * k; if (a.mp != null) p.mp = a.mp + (b.mp - a.mp) * k; }
    }
    RW.units.push(p); if (a.kind === 'hero') RW.heroes.push(p); else if (a.kind === 'turret') RW.turrets.push(p); else if (a.kind === 'crystal') RW.crystals.push(p);
  }
  const me = RP.px.get(c.me) || null; RW.player = me || live.player;
  for (const a of A.projs) {
    let p = RP.pp.get(a._rid); if (!p) { p = {}; RP.pp.set(a._rid, p); } const view = p._v; Object.assign(p, a); p._v = view;
    const b = k > 0 ? B.px.get(a._rid) : null; if (b) { p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k; }
    p.src = RP.px.get(a.srcId) || a.src; p.tgt = a.tgtId ? RP.px.get(a.tgtId) || { id: a.tgtId, x: a.tx, y: a.ty, kind: a.tk, r: 30, dead: false } : null;
    RW.projs.push(p);
  }
  for (const a of A.areas) {
    let p = RP.pa.get(a._rid); if (!p) { p = {}; RP.pa.set(a._rid, p); } const view = p._v; Object.assign(p, a); p._v = view;
    const b = k > 0 ? B.ax.get(a._rid) : null; if (b) { p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k; p.t = a.t + (b.t - a.t) * k; if (a.r != null && b.r != null) p.r = a.r + (b.r - a.r) * k; }
    p.src = RP.px.get(a.srcId) || a.src; p.follow = a.folId ? RP.px.get(a.folId) || null : null;
    RW.areas.push(p);
  }
  while (RP.ei < c.ev.length && c.ev[RP.ei].rt <= RP.t) RW.fx.push(c.ev[RP.ei++]);
  while (RP.si < c.sf.length && c.sf[RP.si].rt <= RP.t) RP.sfx.push(c.sf[RP.si++]);
  if (me) { if (RP.first) { V.cam.x = me.x; V.cam.y = me.y; RP.first = false; } else { const q = Math.min(1, dt * 9); V.cam.x += (me.x - V.cam.x) * q; V.cam.y += (me.y - V.cam.y) * q; } }
  G = RW; V.me = me || live.player;
  try { renderFrame(sdt); } finally { G = live; V.me = live.player; }
  live.fx.length = 0;       // the live game's own effects pass unseen while the recording runs
  return true;
}

/* ---------- frame ---------- */
function renderFrame(dt) {
  if (!GX.ok) return;
  const t = (V.t += dt); TIME.value = t;
  if (V.G !== G && !V.replay) { viewsClear(); V.G = G; }
  camPlace(dt); ingestFx(); syncViews(t, dt); syncProjs(dt); syncAreas(t, dt); markersUpdate(t); fxUpdate(dt);
  if (UI.state === 'menu') showcaseRender(dt);
  GX.r.render(GX.scene, GX.cam);
  drawOverlay(dt);
  // adaptive quality: step down if frames stay slow
  const now = performance.now(), ft = now - V.lastNow; V.lastNow = now;
  if (V.auto && ft < 400 && dt > 0) { V.ftAcc += ft; if (++V.ftN >= 90) { const avg = V.ftAcc / V.ftN; V.ftAcc = V.ftN = 0; if (avg > 36 && V.q > 0) { if (++V.slow >= 2) { V.slow = 0; setQuality(V.q - 1); } } else V.slow = 0; } }
}

/* ---------- minimap ---------- */
const MM_HERO = 9.2;       // radius of a hero's portrait on the minimap, in 160ths of its width
function mmInit(cv) {
  V.mm = cv; const d = Math.min(window.devicePixelRatio || 1, 2), n = Math.round((cv.clientWidth || 150) * d);
  cv.width = cv.height = n;
  const b = document.createElement('canvas'); b.width = b.height = n; const g = b.getContext('2d'), k = n / W;
  g.fillStyle = '#12301f'; g.fillRect(0, 0, n, n); g.setTransform(k, 0, 0, k, 0, 0);
  g.save(); clipBounds(g, 0); g.fillStyle = '#3f7f48'; g.strokeStyle = '#3f7f48'; traceWalk(g, 0); g.restore();
  for (const c of MAP.corridors) if (c.kind === 'river') strokePoly(g, c.pts, c.w - 60, '#2f8fb0');
  for (const c of MAP.circles) if (c.kind === 'pit') { g.fillStyle = '#2f8fb0'; g.beginPath(); g.arc(c.x, c.y, c.r - 40, 0, TAU); g.fill(); }
  for (const c of MAP.corridors) if (c.kind === 'lane') strokePoly(g, c.pts, c.w - 150, '#c9b383');
  for (const c of MAP.circles) if (c.kind === 'base') { g.fillStyle = c.team === (V.team === RED ? RED : BLUE) ? '#3a6fa8' : '#a84a4a'; g.beginPath(); g.arc(c.x, c.y, c.r - 60, 0, TAU); g.fill(); }
  V.mmBg = b;
}
function drawMinimap() {
  const cv = V.mm; if (!cv || !V.mmBg) return; const g = cv.getContext('2d'), n = cv.width, k = n / W, me = V.me, T = V.team, t = V.t, q = n / 160;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(V.mmBg, 0, 0);
  const dot = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x * k, y * k, r * q, 0, TAU); g.fill(); };
  for (const c of G.camps) if (c.units.length) dot(c.x, c.y, 2.2, c.type === 'azure' ? '#4f9dff' : c.type === 'crimson' ? '#ff6a4a' : c.type === 'skitter' ? '#5fe0c8' : '#e9c46a');
  for (const e of [G.epic.turtle, G.epic.lord]) if (e && !e.dead) { dot(e.x, e.y, 5.5, 'rgba(192,112,255,0.4)'); dot(e.x, e.y, 3.2, '#c070ff'); }
  for (const s of G.turrets) { if (s.dead) continue; const c = tcol(s.team, T), w = 3.4 * q, e = s.plate > 0 ? Math.max(1.5, 1.4 * q) : 0; g.fillStyle = e ? '#f2c14e' : '#0b1418'; g.fillRect(s.x * k - w - 1 - e, s.y * k - w - 1 - e, w * 2 + 2 + e * 2, w * 2 + 2 + e * 2); g.fillStyle = c; g.fillRect(s.x * k - w, s.y * k - w, w * 2, w * 2); }
  for (const s of G.crystals) { if (s.dead) continue; const c = tcol(s.team, T), w = 6.5 * q; g.fillStyle = '#0b1418'; g.beginPath(); g.moveTo(s.x * k, s.y * k - w - 1.5); g.lineTo(s.x * k + w * 0.7 + 1.5, s.y * k); g.lineTo(s.x * k, s.y * k + w + 1.5); g.lineTo(s.x * k - w * 0.7 - 1.5, s.y * k); g.fill(); g.fillStyle = c; g.beginPath(); g.moveTo(s.x * k, s.y * k - w); g.lineTo(s.x * k + w * 0.7, s.y * k); g.lineTo(s.x * k, s.y * k + w); g.lineTo(s.x * k - w * 0.7, s.y * k); g.fill(); }
  for (const u of G.units) if (u.kind === 'minion' && !u.dead && seen(u)) dot(u.x, u.y, u.mtype === 'lord' ? 4 : 1.5, u.mtype === 'lord' ? '#c070ff' : tcol(u.team, T));
  for (const u of G.units) if (u.kind === 'clone' && !u.dead && seen(u) && (T < 0 || u.team === T)) { g.strokeStyle = tcol(u.team, T); g.lineWidth = 1.4 * Math.max(1, q); g.beginPath(); g.arc(u.x * k, u.y * k, 3.2 * q, 0, TAU); g.stroke(); }
  const mmH = T < 0 ? G.heroes : G.heroes.concat(G.units.filter(u => u.kind === 'clone' && u.team !== T));
  for (let pass = 0; pass < 3; pass++) for (const h of mmH) {       // allies first, enemies over them, the player on top: icons this size overlap in a fight
    if (h.dead || !seen(h) || (h === me ? 2 : h.team === T ? 0 : 1) !== pass) continue; const c = h === me ? COL.self : tcol(h.team, T), r = MM_HERO * q, x = h.x * k, y = h.y * k;
    g.fillStyle = '#0b1418'; g.beginPath(); g.arc(x, y, r + 2.6 * q, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, y, r + 1.8 * q, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.drawImage(PORT_CV[h.key + h.skin] || PORT_CV[h.key + 0], x - r, y - r * 0.95, r * 2, r * 2); g.restore();
    if (h === me || h === V.focus) { g.strokeStyle = '#fff'; g.lineWidth = 1.5 * Math.max(1, q); g.beginPath(); g.arc(x, y, r + 3.4 * q, 0, TAU); g.stroke(); }
  }
  if (T >= 0) { const al = G.alert[T]; if (al && G.t - al.t < 4) { const ph = (t * 1.5) % 1; g.strokeStyle = `rgba(255,80,80,${1 - ph})`; g.lineWidth = 2; g.beginPath(); g.arc(al.x * k, al.y * k, (4 + ph * 14) * q, 0, TAU); g.stroke(); } }
  const a = s2w(0, 0), b = s2w(V.vw, 0), c = s2w(V.vw, V.vh), e = s2w(0, V.vh);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x * k, a.y * k); g.lineTo(b.x * k, b.y * k); g.lineTo(c.x * k, c.y * k); g.lineTo(e.x * k, e.y * k); g.closePath(); g.stroke();
}

/* ---------- portraits rendered from the 3D models ---------- */
function makePortraits() {
  const r = GX.r, sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(27, 1, 0.1, 20), sz = 176;
  sc.add(new THREE.HemisphereLight(lin('#f2f6ff'), lin('#8a8f9a'), 0.85)); const dl = new THREE.DirectionalLight(lin('#fff2dc'), 0.75); dl.position.set(-2.5, 4, 5); sc.add(dl);
  r.setPixelRatio(1); r.setSize(sz, sz, false);
  for (const k of HERO_KEYS) for (let sk = 0; sk < SKINS[k].length; sk++) {
    const v = heroInstance(k, sk), body = heroLook(k, sk).body;
    for (let i = 0; i < 40; i++) animHero(v, { moving: false, speed: 2, atk: -1, cast: 0, busy: true }, i * 0.03, 0.03);       // (busy: as it stands, not as it idles)
    v.o.rotation.y = -0.42; sc.add(v.o); sc.background = new THREE.Color(shade(body, -0.5));
    const bg = halo(shade(body, 0.35), 5.5, 0.55); bg.position.set(0, 1.75, -1.4); sc.add(bg);
    cam.position.set(0.34, 1.78 + v.hover, 2.5); cam.lookAt(0, 1.58 + v.hover, 0);
    r.render(sc, cam);
    const cv = document.createElement('canvas'); cv.width = cv.height = sz; const g = cv.getContext('2d'); g.drawImage(r.domElement, 0, 0, sz, sz);
    const vg = g.createRadialGradient(sz / 2, sz * 0.45, sz * 0.3, sz / 2, sz / 2, sz * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)'); g.fillStyle = vg; g.fillRect(0, 0, sz, sz);
    PORT[k + sk] = cv.toDataURL('image/png'); PORT_CV[k + sk] = cv;
    sc.remove(v.o); sc.remove(bg); v.mat.dispose();
  }
  // the portraits are baked: release the GPU copies of every skin's model; whichever a match needs is uploaded again on first use
  for (const k in TPL.hero) TPL.hero[k].traverse(x => { if (x.geometry) x.geometry.dispose(); });
}
function portrait(key, skin) { return PORT[key + (skin | 0)] || PORT[key + 0] || ''; }

/* ---------- menu: rotating hero showcase drawn into its own small canvas ---------- */
function showcaseInit() {
  const sc = SHOW.scene = new THREE.Scene(); SHOW.cam = new THREE.PerspectiveCamera(30, 0.8, 0.1, 30);
  sc.add(new THREE.HemisphereLight(lin('#eef4ff'), lin('#7f8794'), 0.8)); const dl = new THREE.DirectionalLight(lin('#fff0d6'), 0.85); dl.position.set(-3, 5, 4); sc.add(dl);
  const ped = new PB().cyl(0.8, 0.92, 0.16, '#59636e', { y: -0.08, c2: '#8a949f' }, 20).cyl(0.66, 0.68, 0.04, '#f2c14e', { y: 0.015 }, 20).mesh(GX.mat.vc, false); sc.add(ped);
  SHOW.glow = halo('#ffffff', 6, 0.5); SHOW.glow.position.set(0, 1.3, -1.6); sc.add(SHOW.glow);
  SHOW.root = new THREE.Group(); sc.add(SHOW.root); sc.background = new THREE.Color('#0d1a20');
}
function showcaseSet(key, skin) {
  skin |= 0; if (!GX.ok || (SHOW.key === key && SHOW.skin === skin)) return;
  if (SHOW.v) { SHOW.root.remove(SHOW.v.o); SHOW.v.mat.dispose(); if (SHOW.v.wg) { wingsDrop(SHOW.v.wg); SHOW.v.wg = null; } }
  SHOW.key = key; SHOW.skin = skin; SHOW.v = heroInstance(key, skin); SHOW.root.add(SHOW.v.o); SHOW.t = 0; SHOW.ph = -1; SHOW.kn = 0; SHOW.v.clipT = 9;
  const L = heroLook(key, skin); SHOW.glow.material = halo(L.glow || L.trim, 1, 0.5).material; SHOW.scene.background = new THREE.Color(shade(L.body, -0.72));
}
function showcaseRender(dt) {
  const el = SHOW.el || (SHOW.el = document.getElementById('show')), v = SHOW.v; if (!el || !v) return;
  const w = el.clientWidth, h = el.clientHeight; if (w < 8 || h < 8) return;
  const r = GX.r, pr = r.getPixelRatio(), t = (SHOW.t += dt);
  const ph = Math.floor((t % 16.8) / 1.2);      // the three attacks of its string, the three skill moves, a short walk, and then what it does standing idle
  if (ph !== SHOW.ph) { SHOW.ph = ph; SHOW.sub = 0; if (ph <= 2) { v.clipT = 0; v.clipDur = 0.62; v.alt ^= 1; v.av = ph; } else if (ph <= 5) startClip(v, ph - 3); else if (ph === 8) v.idle = IDLE_AT; }
  if (ph === 3 && HEROES[v.key].skills[0].chain) { const sub = Math.min(2, Math.floor((t % 1.2) / 0.4)); if (sub !== SHOW.sub) { SHOW.sub = sub; startClip(v, sub === 1 ? 3 : 9); } }       // a chain of three: all three, one after the other
  v.clipT += dt; _st.moving = ph === 6 || ph === 7; _st.speed = 2.5; _st.atk = v.clipT < v.clipDur ? v.clipT / v.clipDur : -1; _st.cast = 0; _st.dash = _st.leap = _st.spin = _st.stun = _st.recall = _st.busy = false; _st.air = 0; _st.dead = 0; SHOW.kn = (SHOW.kn || 0) + ((ph === 4 && HEROES[v.key].kneel && (t % 1.2) < 0.95 ? 1 : 0) - (SHOW.kn || 0)) * Math.min(1, dt * 9); _st.kneel = SHOW.kn > 0.003 ? SHOW.kn : 0; _st.spin = ph === 5 && !v.clip && (t % 1.2) < 0.9 && HERO_CLIPS[v.key][2] === null;
  animHero(v, _st, t, dt); v.o.rotation.y = -0.35 + Math.sin(t * 0.55) * 0.55;
  if (HEROES[v.key].wings) {       // an ultimate that gives wings: they open for its turn and a little beyond
    const q = (t % 16.8) - 6.0, on = q >= 0 && q < 2.1;
    if (on) { const W = v.wg || (v.wg = wingsMake(skinColor(v.key, v.skin, 2))); if (!W.g.parent) v.b.spine.add(W.g); const op = Math.min(1, q / 0.36), snap = 1 + 2.4 * Math.pow(op - 1, 3) + 1.4 * Math.pow(op - 1, 2); W.g.visible = true; wingsPose(W, snap * smooth(Math.min(1, (2.1 - q) / 0.45)), t, { run: v.runK || 0, beat: 0, dash: false, dim: 1 }); }
    else if (v.wg) v.wg.g.visible = false;
  }
  SHOW.cam.aspect = w / h; SHOW.cam.position.set(0, 1.5, 5.3); SHOW.cam.lookAt(0, 1.08, 0); SHOW.cam.updateProjectionMatrix();
  const cw = Math.min(w, V.vw), ch = Math.min(h, V.vh);
  r.setViewport(0, 0, cw, ch); r.setScissor(0, 0, cw, ch); r.setScissorTest(true); r.render(SHOW.scene, SHOW.cam); r.setScissorTest(false); r.setViewport(0, 0, V.vw, V.vh);
  const bw = Math.round(cw * pr), bh = Math.round(ch * pr); if (el.width !== bw || el.height !== bh) { el.width = bw; el.height = bh; }
  el.getContext('2d').drawImage(r.domElement, 0, r.domElement.height - bh, bw, bh, 0, 0, bw, bh);
}
