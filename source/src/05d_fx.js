/* ============================================================
   3D effects: particles, flashes, rings, beams, decals, spikes,
   lightning, afterimages, per-skill effects, projectiles,
   area telegraphs and floating text
   ============================================================ */
const FX = { list: [], texts: [], q: [], add: null, alpha: null, group: null, shake: 0, pv: [], av: [], tick: 0, dt: 0 };
const FG = {};
const _rgb = new Map();
function rgbOf(hex) { let v = _rgb.get(hex); if (!v) { const c = new THREE.Color(hex); v = [c.r, c.g, c.b]; _rgb.set(hex, v); } return v; }

class PSys {
  constructor(n, additive) {
    this.n = n; this.live = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.a0 = new Float32Array(n);
    const g = this.geo = new THREE.BufferGeometry(), dyn = a => { a.setUsage(THREE.DynamicDrawUsage); return a; };
    g.setAttribute('position', dyn(new THREE.BufferAttribute(this.pos, 3))); g.setAttribute('aCol', dyn(new THREE.BufferAttribute(this.col, 4))); g.setAttribute('aSize', dyn(new THREE.BufferAttribute(this.size, 1)));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float aSize; attribute vec4 aCol; varying vec4 vC; uniform float uScale; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(' + (additive ? '0.15' : '0.55') + ', 1.0, d); gl_FragColor = vec4(vC.rgb, vC.a * a); }',
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; g.setDrawRange(0, 0);
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, hex, a, grav, drag) {
    if (this.live >= this.n) return;
    const i = this.live++, c = rgbOf(hex);
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 4] = c[0]; this.col[i * 4 + 1] = c[1]; this.col[i * 4 + 2] = c[2]; this.col[i * 4 + 3] = a;
    this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.grav[i] = grav || 0; this.drag[i] = drag || 0; this.a0[i] = a; this.size[i] = s0;
  }
  update(dt) {
    const P = this.pos, Vl = this.vel, C = this.col;
    for (let i = 0; i < this.live; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) {
        const j = --this.live;
        if (i !== j) { for (let q = 0; q < 3; q++) { P[i * 3 + q] = P[j * 3 + q]; Vl[i * 3 + q] = Vl[j * 3 + q]; } for (let q = 0; q < 4; q++) C[i * 4 + q] = C[j * 4 + q];
          this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.s0[i] = this.s0[j]; this.s1[i] = this.s1[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.a0[i] = this.a0[j]; }
        i--; continue;
      }
      const k = this.life[i] / this.max[i], dr = 1 - this.drag[i] * dt;
      Vl[i * 3] *= dr; Vl[i * 3 + 2] *= dr; Vl[i * 3 + 1] = Vl[i * 3 + 1] * dr - this.grav[i] * dt;
      P[i * 3] += Vl[i * 3] * dt; P[i * 3 + 1] += Vl[i * 3 + 1] * dt; P[i * 3 + 2] += Vl[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.03 && this.grav[i] > 0) { P[i * 3 + 1] = 0.03; Vl[i * 3 + 1] *= -0.35; Vl[i * 3] *= 0.6; Vl[i * 3 + 2] *= 0.6; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k; C[i * 4 + 3] = this.a0[i] * (k < 0.7 ? 1 : (1 - k) / 0.3);
    }
    const g = this.geo; g.setDrawRange(0, this.live);
    g.attributes.position.needsUpdate = true; g.attributes.aCol.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
  }
}
function crossStrip() {      // unit strip along X made of two crossed quads; u runs along the length so a texture can tile
  const g = new THREE.BufferGeometry(), p = [], uv = [];
  for (const [ay, az] of [[0, 1], [1, 0]]) for (const [u, k] of [[0, -1], [1, -1], [1, 1], [0, 1]]) { p.push(u - 0.5, k * 0.5 * ay, k * 0.5 * az); uv.push(u, (k + 1) / 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); return g;
}
function fxInit() {
  FX.group = new THREE.Group(); GX.scene.add(FX.group);
  FX.add = new PSys(2200, true); FX.alpha = new PSys(600, false); GX.scene.add(FX.add.pts); GX.scene.add(FX.alpha.pts);
  FG.ring = new THREE.RingGeometry(0.88, 1, 48).rotateX(-HP2);
  FG.ringThin = new THREE.RingGeometry(0.965, 1, 64).rotateX(-HP2);
  FG.ringV = new THREE.RingGeometry(0.78, 1, 28);
  FG.disc = new THREE.CircleGeometry(1, 40).rotateX(-HP2);
  FG.plane = new THREE.PlaneGeometry(1, 1).rotateX(-HP2);
  FG.cyl = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0);
  FG.beam = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(HP2);
  FG.sphere = new THREE.SphereGeometry(1, 20, 12);
  FG.dome = new THREE.SphereGeometry(1, 24, 10, 0, TAU, 0, HP2);
  FG.oct = new THREE.OctahedronGeometry(1, 0);
  FG.chak = new THREE.TorusGeometry(1, 0.13, 5, 22).rotateX(HP2); FG.tooth = new THREE.ConeGeometry(0.17, 0.5, 4).rotateZ(-HP2).translate(1.22, 0, 0);
  FG.spike = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0).toNonIndexed(); FG.spike.computeVertexNormals();
  FG.shaft = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5).rotateZ(HP2);
  FG.leaf = leafGeo(1, 0.4, 0.1).rotateZ(-HP2).rotateX(HP2).translate(-0.5, 0, 0);       // a leaf of iron lying flat, its length along X: what Orin throws
  FG.tip = new THREE.ConeGeometry(0.06, 0.2, 5).rotateZ(-HP2).translate(0.48, 0, 0);
  FG.hook = new THREE.TorusGeometry(0.2, 0.045, 5, 10, 4.2).rotateX(HP2);
  FG.trap = new THREE.TorusGeometry(0.34, 0.05, 5, 12).rotateX(HP2);
  FG.jaw = new THREE.TorusGeometry(0.36, 0.055, 5, 8, Math.PI);
  GX.mat.trap = new THREE.MeshLambertMaterial({ color: lin('#8d949c') });
  FG.plume = plumeGeo(); FG.wingArm = wingArmGeo();
}
/* ---------- Bloodrage: wings of light ----------
   Kaela's ultimate puts a pair of wings on her back for as long as the rage lasts: an arched arm of light with ten long feathers of
   it hanging from each. They are drawn, not worn: no feather is solid, and they are there only while the buff is.
   WING_F: each feather as [where on the arm it grows (x out, y up), the way it points when the wing is spread (0 = straight out,
   -PI/2 = straight down), how long, how wide]; WING_ARM: the arm, root to tip. */
const WING_F = [[0.10, 0.14, -1.50, 0.54, 0.34], [0.19, 0.27, -1.29, 0.68, 0.37], [0.27, 0.39, -1.08, 0.80, 0.39], [0.33, 0.50, -0.84, 0.90, 0.40], [0.38, 0.60, -0.56, 1.00, 0.41],
  [0.42, 0.68, -0.26, 1.09, 0.41], [0.45, 0.74, 0.06, 1.16, 0.40], [0.47, 0.79, 0.38, 1.18, 0.38], [0.49, 0.83, 0.72, 1.12, 0.36], [0.50, 0.86, 1.06, 0.98, 0.33]];
const WING_ARM = [[0, 0, 0.09], [0.28, 0.40, 0.085], [0.50, 0.86, 0.06], [0.56, 1.02, 0.012]], WING_SC = 0.95;
function plumeGeo() {       // one feather: a unit long, hanging from the origin down -Y, a unit across at its widest; two crossed leaves, so it has some body from any side; darker towards the tip
  const n = 9, pos = [], uv = [], col = [], idx = [];
  for (let leaf = 0; leaf < 2; leaf++) { const b = pos.length / 3, k = leaf ? 0.5 : 1;
    for (let j = 0; j <= n; j++) { const t = j / n, w = j === n ? 0 : 0.5 * k * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.6)), c = 1 - 0.4 * t;
      if (leaf) pos.push(0, -t, -w, 0, -t, w); else pos.push(-w, -t, 0, w, -t, 0); uv.push(t, 0, t, 1); col.push(c, c, c, c, c, c);
      if (j < n) idx.push(b + j * 2, b + j * 2 + 1, b + j * 2 + 2, b + j * 2 + 1, b + j * 2 + 3, b + j * 2 + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
function wingArmGeo() {       // the arm the feathers hang from: a ribbon along WING_ARM, soft across
  const P = WING_ARM, pos = [], uv = [], idx = [];
  for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = P[i][2];
    pos.push(P[i][0] + nx * w, P[i][1] + ny * w, 0, P[i][0] - nx * w, P[i][1] - ny * w, 0); uv.push(i / (P.length - 1), 0, i / (P.length - 1), 1); if (i < P.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
/* The pair, ready to hang on a hero's spine: W.g is what to add, W.sides the two wings (the right one is the left one mirrored).
   Nothing in it is part of the hero's own look: every piece is marked so that afterimages leave it out and the tall-grass fade
   leaves it alone (its own opacity does that: see wingsPose). */
function wingsMake(c) {
  const W = { g: new THREE.Group(), sides: [], mats: [], c: null }, hi = lite(c, 0.62);
  for (let j = 0; j < 3; j++) { const m = new THREE.MeshBasicMaterial({ color: lin(shade(c, -0.14)), map: GX.tex.plume, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }); W.mats.push(m); }
  W.arm = fxMat(hi, 0, { map: GX.tex.band }); W.glow = new THREE.SpriteMaterial({ map: GX.tex.glow, color: lin(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false });
  W.core = fxMat(hi, 0, { map: GX.tex.plume });
  const own = m => { m.userData.dz = 1; m.userData.own = 1; m.renderOrder = 5; m.frustumCulled = false; return m; };
  for (const k of [1, -1]) {
    const side = new THREE.Group(), yp = new THREE.Group(), fl = new THREE.Group(), fs = []; side.position.set(k * 0.07, 0.4, -0.18); side.scale.x = k; side.add(yp); yp.add(fl); W.g.add(side);
    fl.add(own(new THREE.Mesh(FG.wingArm, W.arm)));
    WING_F.forEach((f, i) => { const m = own(new THREE.Mesh(FG.plume, W.mats[i % 3])), q = own(new THREE.Mesh(FG.plume, W.core)); m.position.set(f[0], f[1], (i % 2 ? 0.012 : -0.012)); q.position.set(0, 0, 0.004); q.scale.set(0.4, 0.7, 0.4); m.add(q); fl.add(m); fs.push(m); });
    const gs = own(new THREE.Sprite(W.glow)); gs.position.set(0.72, 0.72, -0.05); gs.scale.set(2.6, 2.6, 1); fl.add(gs);
    W.sides.push({ k, side, yp, fl, fs });
  }
  W.c = c; return W;
}
function wingsDrop(W) { for (const m of W.mats) m.dispose(); W.arm.dispose(); W.glow.dispose(); W.core.dispose(); if (W.g.parent) W.g.parent.remove(W.g); }
/* How they stand this frame. open: 0 folded away (and unseen) .. 1 spread (a little past 1 as they snap open); o.run 0..1 how hard
   she is moving, o.beat 0..1 a downstroke (as a blow lands), o.dash streaming back, o.dim what is left of them to see (tall grass,
   the last second guttering). o.face: which way she faces on the map (the sim's angle). The camera always looks from the south, so
   the wings are set a little differently for each facing to keep them readable from up there: swept well back when she is seen from
   the side (flat on they would be edge-on to the camera), leaning back when she faces it, and upright when she has her back to it. */
function wingsPose(W, open, t, o) {
  const e = Math.max(0, open), e1 = Math.min(1, e), fold = 1 - e1, run = o.run || 0, beat = o.beat || 0, dim = o.dim == null ? 1 : o.dim;
  const fs = o.face == null ? 1 : Math.sin(o.face), fc = o.face == null ? 0 : Math.abs(Math.cos(o.face)), lean = 0.12 + 0.23 * fs, yaw = 0.3 + 0.15 * fs + 0.6 * Math.pow(fc, 1.5);
  for (const sd of W.sides) {
    const ph = sd.k > 0 ? 0 : 0.3, flap = Math.sin(t * (2.3 + run * 3.4) + ph) * (0.055 + 0.075 * run) - beat * 0.4;
    sd.yp.rotation.set(-(lean + 0.25 * fold + (o.dash ? 0.4 : 0) + run * 0.1), yaw + 0.6 * fold + (o.dash ? 0.4 : 0) + run * 0.1 + beat * 0.1, 0);
    sd.fl.rotation.z = -1.7 * fold + (0.02 + flap) * e1; sd.fl.scale.setScalar(WING_SC * (0.28 + 0.72 * e));
    for (let i = 0; i < sd.fs.length; i++) { const f = WING_F[i], m = sd.fs[i], u = i / (sd.fs.length - 1), a = lerp(1.3 - u * 0.35, f[2], e) + Math.sin(t * 3.1 + i * 0.9 + sd.k) * 0.035 + flap * 0.3 * u - (o.dash ? 0.3 * (1 - u) : 0);
      m.rotation.z = a + HP2; m.scale.set(f[4], f[3] * (1 + 0.05 * Math.sin(t * 6.3 + i * 1.7 + sd.k)), f[4]); }
  }
  for (let j = 0; j < 3; j++) W.mats[j].opacity = Math.min(1, e1 * 1.25) * dim * (0.86 + 0.1 * Math.sin(t * 5.2 + j * 2.1));
  W.arm.opacity = e1 * dim * 0.9; W.core.opacity = e1 * dim * (0.5 + 0.15 * Math.sin(t * 7.1)) + beat * 0.3 * dim; W.glow.opacity = e1 * dim * (0.3 + 0.06 * Math.sin(t * 4.3)) + beat * 0.2 * dim;
}
function fxClear() {
  for (const e of FX.list) { fxDrop(e.m); if (e.mat) e.mat.dispose(); if (e.mat2) e.mat2.dispose(); } FX.list.length = 0; FX.texts.length = 0; FX.q.length = 0;
  for (const v of FX.pv) projDrop(v); FX.pv.length = 0; for (const v of FX.av) { v.dead = true; fxDrop(v.m); } FX.av.length = 0;
  FX.add.live = 0; FX.alpha.live = 0; FX.shake = 0;
}
/* materials and geometries are disposed with their effect unless marked shared (own = 0) */
function fxDrop(m) { FX.group.remove(m); m.traverse(x => { if (x.material && x.userData.own !== 0) x.material.dispose(); if (x.userData.ownGeo) x.geometry.dispose(); }); }
function shared(m) { m.userData.own = 0; return m; }
function fxAdd(m, dur, upd) { FX.group.add(m); const e = { m, t: 0, dur, upd }; FX.list.push(e); upd(0, e); return e; }
function later(t, fn) { FX.q.push({ t, fn }); }
function fxUpdate(dt) {
  FX.dt = dt;
  for (let i = FX.q.length - 1; i >= 0; i--) { const q = FX.q[i]; q.t -= dt; if (q.t <= 0) { FX.q.splice(i, 1); q.fn(); } }
  for (let i = FX.list.length - 1; i >= 0; i--) {
    const e = FX.list[i]; e.t += dt; const k = e.t / e.dur;
    if (k >= 1) { fxDrop(e.m); if (e.mat) e.mat.dispose(); if (e.mat2) e.mat2.dispose(); FX.list[i] = FX.list[FX.list.length - 1]; FX.list.pop(); } else e.upd(k, e);
  }
  FX.add.update(dt); FX.alpha.update(dt);
}
const easeOut = k => 1 - (1 - k) * (1 - k);
const lite = (c, f) => shade(c, f == null ? 0.5 : f);

/* ---------- building blocks ---------- */
function flat(geo, hex, op, x, y, z, o) { const m = new THREE.Mesh(geo, fxMat(hex, op, o)); m.position.set(x, y, z); m.renderOrder = 3; return m; }
function ring3(x, z, r0, r1, dur, hex, op, thin, y) {
  const m = flat(thin ? FG.ringThin : FG.ring, hex, op, x, y || 0.07, z);
  fxAdd(m, dur, k => { const r = r0 + (r1 - r0) * easeOut(k); m.scale.set(r, 1, r); m.material.opacity = op * (1 - k); });
}
function vring3(x, y, z, ang, r0, r1, dur, hex, op) {      // upright ring facing along `ang` (gusts, muzzle rings)
  const m = flat(FG.ringV, hex, op, x, y, z); m.rotation.y = HP2 - ang; m.renderOrder = 4;
  fxAdd(m, dur, k => { const r = r0 + (r1 - r0) * easeOut(k); m.scale.set(r, r, 1); m.material.opacity = op * (1 - k); });
}
function disc3(x, z, r0, r1, dur, hex, op, tex) {
  const m = flat(FG.disc, hex, op, x, 0.06, z, tex ? { map: GX.tex.disc } : null);
  fxAdd(m, dur, k => { const r = r0 + (r1 - r0) * easeOut(k); m.scale.set(r, 1, r); m.material.opacity = op * (1 - k); });
}
/* textured mark on the ground. o: r0 (start radius), gk (share of life spent growing), spin (rad/s), fin/fout (fade shares), nb (normal blend), rot, y */
function decal3(tex, x, z, r, dur, hex, op, o) {
  o = o || {};
  const m = flat(FG.plane, hex, 0, x, o.y || 0.058, z, { map: tex, blending: o.nb ? THREE.NormalBlending : THREE.AdditiveBlending });
  m.rotation.y = o.rot == null ? Math.random() * TAU : o.rot; if (o.nb) m.renderOrder = 2;
  const r0 = o.r0 == null ? r : o.r0, gk = o.gk || 0.35, fin = o.fin == null ? 0.12 : o.fin, fout = o.fout == null ? 0.4 : o.fout, spin = o.spin || 0;
  fxAdd(m, dur, k => { const q = (r0 + (r - r0) * easeOut(Math.min(1, k / gk))) * 2; m.scale.set(q, 1, q); m.rotation.y += spin * FX.dt; m.material.opacity = op * Math.min(1, k / fin) * Math.min(1, (1 - k) / fout); });
}
function scorch3(x, z, r, dur) { decal3(GX.tex.blob, x, z, r, dur, '#000000', 0.75, { nb: 1, fin: 0.03, fout: 0.5, rot: 0 }); }
function flash3(x, y, z, size, dur, hex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.glow, color: lin(hex), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  s.position.set(x, y, z); s.renderOrder = 4;
  fxAdd(s, dur, k => { const q = size * (0.5 + 0.7 * easeOut(k)); s.scale.set(q, q, 1); s.material.opacity = 1 - k; });
}
function glint3(x, y, z, size, dur, hex) {      // four-point sparkle
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.star, color: lin(hex), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }));
  s.position.set(x, y, z); s.renderOrder = 6;
  fxAdd(s, dur, k => { const q = size * Math.sin(Math.min(1, k * 1.25) * Math.PI) + 0.001; s.scale.set(q, q, 1); s.material.rotation = k * 1.6; s.material.opacity = 1 - k * k; });
}
function cut3(x, y, z, len, rot, hex, dur, w) {      // a quick blade stroke that always faces the camera
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.cut, color: lin(hex), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false, rotation: rot }));
  s.position.set(x, y, z); s.renderOrder = 6; const w0 = w || len * 0.15;
  fxAdd(s, dur, k => { const g = easeOut(Math.min(1, k / 0.25)); s.scale.set(len * (0.25 + 0.75 * g), w0 * (1 - k * 0.7), 1); s.material.opacity = k < 0.25 ? 1 : 1 - (k - 0.25) / 0.75; });
}
function xcut(x, y, z, len, hex, dur) { for (const r of [0.75, -0.75]) { cut3(x, y, z, len, r, hex, dur); cut3(x, y, z, len * 0.8, r, '#ffffff', dur * 0.8, len * 0.05); } }
function pillar3(x, z, r, h, dur, hex, op) {
  const m = flat(FG.cyl, hex, op, x, 0.02, z, { map: GX.tex.pillar });
  fxAdd(m, dur, k => { const q = r * (1 - 0.35 * k); m.scale.set(q, h * (0.5 + 0.5 * easeOut(k)), q); m.material.opacity = op * (1 - k * k); });
}
function beam3(x1, y1, z1, x2, y2, z2, w, dur, hex, op) {
  const g = new THREE.Group(), len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  const a = new THREE.Mesh(FG.beam, fxMat(hex, op == null ? 0.5 : op)), b = new THREE.Mesh(FG.beam, fxMat('#ffffff', 0.8));
  g.add(a); g.add(b); g.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); g.lookAt(x2, y2, z2); g.renderOrder = 4;
  fxAdd(g, dur, k => { const q = 1 - k * 0.6; a.scale.set(w * q, w * q, len); b.scale.set(w * 0.3 * (1 - k), w * 0.3 * (1 - k), len); a.material.opacity = 0.5 * (1 - k); b.material.opacity = 0.8 * (1 - k); });
}
function bolt3(x1, y1, z1, x2, y2, z2, hex, w, dur, jag, segs) {      // jagged lightning between two points
  const g = new THREE.Group(), n = segs || 6, mat = fxMat(hex, 1), core = fxMat('#ffffff', 1);
  let px = x1, py = y1, pz = z1; const j = (jag == null ? 0.12 : jag) * Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  for (let i = 1; i <= n; i++) {
    const t = i / n, last = i === n, qx = last ? x2 : lerp(x1, x2, t) + (Math.random() - .5) * j, qy = last ? y2 : Math.max(0.05, lerp(y1, y2, t) + (Math.random() - .5) * j), qz = last ? z2 : lerp(z1, z2, t) + (Math.random() - .5) * j;
    for (const [mt, ws] of [[mat, 1], [core, 0.4]]) { const m = shared(new THREE.Mesh(FG.beam, mt)); m.position.set((px + qx) / 2, (py + qy) / 2, (pz + qz) / 2); m.lookAt(qx, qy, qz); m.scale.set(w * ws, w * ws, Math.hypot(qx - px, qy - py, qz - pz)); g.add(m); }
    px = qx; py = qy; pz = qz;
  }
  g.renderOrder = 4;
  const e = fxAdd(g, dur, k => { const f = k < 0.3 ? 1 : (1 - k) / 0.7; mat.opacity = 0.75 * f * (Math.random() < 0.85 ? 1 : 0.3); core.opacity = f; });
  e.mat = mat; e.mat2 = core;
}
function streak3(x1, z1, x2, z2, w, dur, hex, y, op) {      // flat streak along a line, brightest at the far end
  const len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.02) return;
  const m = flat(FG.plane, hex, op || 0.8, (x1 + x2) / 2, y || 0.5, (z1 + z2) / 2, { map: GX.tex.streak });
  m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.scale.set(len, 1, w);
  fxAdd(m, dur, k => { m.material.opacity = (op || 0.8) * (1 - k); m.scale.z = w * (1 - 0.5 * k); });
}
function trail3(x1, z1, x2, z2, w, dur, hex, y, op) {      // one soft-edged segment of a movement trail
  const len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.02) return;
  const m = flat(FG.plane, hex, op, (x1 + x2) / 2, y, (z1 + z2) / 2, { map: GX.tex.band }); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.scale.set(len * 1.08, 1, w);
  fxAdd(m, dur, k => { m.material.opacity = op * (1 - k); m.scale.z = w * (1 - 0.6 * k); });
}
/* o: true or { thin } = narrow arc, { flat } = single layer, { op } */
function slash3(x, z, ang, half, r, dur, hex, y, o) {
  const thin = o === true || !!(o && o.thin), op = (o && o.op) || 0.36, one = o && o.flat, eo = (o && o.edge) || 0.9;
  const g = new THREE.Group(), a = new THREE.Mesh(new THREE.RingGeometry(r * (thin ? 0.74 : 0.45), r, 24, 1, -ang - half, half * 2).rotateX(-HP2), fxMat(hex, op)); a.userData.ownGeo = 1; g.add(a);
  let b = null; if (!one) { b = new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r, 24, 1, -ang - half, half * 2).rotateX(-HP2), fxMat('#ffffff', eo)); b.userData.ownGeo = 1; g.add(b); }
  g.position.set(x, y || 0.8, z); g.renderOrder = 4;
  fxAdd(g, dur, k => { const q = one ? 1 : 0.65 + 0.35 * easeOut(k); g.scale.set(q, 1, q); a.material.opacity = op * (1 - k); if (b) b.material.opacity = eo * (1 - k); });
}
/* The arc of a swung blade, drawn as it is swung: a bright head runs from one end of the arc to the other and its tail fades behind
   it. Flat arcs lie level, `half` to either side of `ang`; dir +1 runs with the rising angle (her left to her right), -1 against it.
   o.up stands the arc on end along `ang`, from o.a0 below level through o.span, leaning o.lean to the side: a rising cut.
   o: y, r0 (inner radius as a share), op, swing (share of the life the head takes to cross), edge (the white rim) */
function sweep3(x, z, ang, half, r, dir, dur, hex, o) {
  o = o || {};
  const N = 24, r0 = o.r0 || 0.5, a0 = o.up ? (o.a0 == null ? -0.4 : o.a0) : -half, span = o.up ? (o.span || 2.4) : half * 2, op = o.op == null ? 0.6 : o.op, sw = o.swing || 0.5, ed = o.edge == null ? 0.8 : o.edge;
  const mk = (ri, ro) => { const pos = new Float32Array((N + 1) * 6), idx = [];
    for (let i = 0; i <= N; i++) { const a = a0 + span * i / N, c = Math.cos(a), s = Math.sin(a), k = i * 6; pos[k] = c * ri * r; pos[k + 2] = s * ri * r; pos[k + 3] = c * ro * r; pos[k + 5] = s * ro * r; if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((N + 1) * 6), 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, fxMat('#ffffff', 1, { vertexColors: true })); m.userData.ownGeo = 1; m.renderOrder = 4; m.frustumCulled = false; return m; };
  const g = new THREE.Group(), body = mk(r0, 1), rim = mk(0.955, 1.0), cc = lin(hex); g.add(body); g.add(rim);
  g.position.set(x, o.y == null ? 0.9 : o.y, z); g.rotation.y = -ang;
  if (o.up) { const t = new THREE.Group(); t.rotation.x = -HP2 + (o.lean || 0); g.remove(body); g.remove(rim); t.add(body); t.add(rim); g.add(t); }
  const bc = body.geometry.attributes.color, rc = rim.geometry.attributes.color;
  fxAdd(g, dur, k => {
    const head = Math.min(1.08, k / sw * 1.08), fade = k < sw ? 1 : 1 - (k - sw) / (1 - sw), grow = 0.9 + 0.1 * easeOut(Math.min(1, k / sw));
    for (let i = 0; i <= N; i++) { const u = dir > 0 ? i / N : 1 - i / N, d = head - u, b = d < 0 ? Math.max(0, 1 + d * 22) : Math.exp(-d * 3.4), v = b * fade * op, w = Math.max(0, 1 - Math.abs(d) * 5) * fade * ed + v * 0.3 * ed;
      bc.setXYZ(i * 2, cc.r * v * 0.04, cc.g * v * 0.04, cc.b * v * 0.04); bc.setXYZ(i * 2 + 1, cc.r * v, cc.g * v, cc.b * v); rc.setXYZ(i * 2, w * 0.3, w * 0.3, w * 0.3); rc.setXYZ(i * 2 + 1, w, w, w); }
    bc.needsUpdate = true; rc.needsUpdate = true; g.scale.setScalar(grow);
  });
}
/* something thrown into the air: the ground kicks up under it and a gust follows it up */
function launchFx(x, z, c, big) {
  const k = big ? 1.5 : 1; ring3(x, z, 0.2, 1.0 * k, 0.32, '#ffffff', 0.45, true, 0.08); ring3(x, z, 0.15, 0.75 * k, 0.4, c, 0.7);
  pillar3(x, z, 0.5 * k, 2.6, 0.42, c, 0.5); smoke(x, 0.1, z, 5, '#d8cfb4', 0.42 * k, 0.55, 0.45 * k); debris(x, 0.1, z, 5, '#8a8272', 2.2, 0.14, 0.6);
  for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, d = Math.random() * 0.45 * k; FX.add.emit(x + Math.cos(a) * d, 0.2 + Math.random() * 0.5, z + Math.sin(a) * d, Math.cos(a) * 0.4, 3.6 + Math.random() * 2.6, Math.sin(a) * 0.4, 0.4 + Math.random() * 0.2, 0.13, 0.02, i % 3 ? c : '#ffffff', 0.95, 2.5, 0.4); }
}
function dome3(x, z, r, dur, hex, op, o) {      // honeycomb shield dome
  const m = new THREE.Mesh(FG.dome, fxMat(hex, op, { map: GX.tex.hex })); m.position.set(x, 0, z); m.renderOrder = 4; const sy = (o && o.sy) || 1;
  fxAdd(m, dur, k => { const q = r * (0.4 + 0.6 * easeOut(Math.min(1, k * 3))); m.scale.set(q, q * sy, q); m.rotation.y += FX.dt * 0.7; m.material.opacity = op * Math.min(1, (1 - k) / 0.6); });
}
/* cones that jab out of the ground and sink back. o: w, fill, lean, glow */
function spikes3(x, z, r, n, hex, h, dur, o) {
  o = o || {};
  const g = new THREE.Group(), mat = o.glow ? fxMat(hex, 0.85, { blending: THREE.NormalBlending }) : new THREE.MeshLambertMaterial({ color: lin(hex) }), lean = o.lean == null ? 0.4 : o.lean;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (Math.random() - .5) * 0.35, d = r * (o.fill ? Math.sqrt(Math.random()) : 0.8 + Math.random() * 0.25), m = shared(new THREE.Mesh(FG.spike, mat));
    m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.rotation.set(Math.sin(a) * lean + (Math.random() - .5) * 0.3, 0, -Math.cos(a) * lean + (Math.random() - .5) * 0.3);
    m.userData.h = h * (0.6 + Math.random() * 0.7); m.userData.w = (o.w || 0.16) * (0.7 + Math.random() * 0.6); m.castShadow = !o.glow; g.add(m);
  }
  g.position.set(x, 0, z);
  const e = fxAdd(g, dur, k => { const up = k < 0.1 ? easeOut(k / 0.1) : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; for (const m of g.children) m.scale.set(m.userData.w, Math.max(0.001, m.userData.h * up), m.userData.w); });
  e.mat = mat;
}
function ghost3(v, hex, dur, op, px, pz) {      // afterimage of a hero in its current pose
  if (!v || !v.o || !v.root.visible || FX.list.length > 140) return;
  const g = v.o.clone(true), mat = fxMat(hex, op || 0.5, { side: THREE.FrontSide }), kill = [];
  g.traverse(x => { if (x.isSprite || x.userData.dz || (x.isMesh && x.material.map)) kill.push(x); else if (x.isMesh) { x.material = mat; x.castShadow = false; x.userData.own = 0; x.userData.ownGeo = 0; } });       // glows and textured planes are not part of the silhouette
  for (const s of kill) s.parent.remove(s);
  g.position.copy(v.root.position); if (px != null) { g.position.x = px; g.position.z = pz; }
  const e = fxAdd(g, dur, k => { mat.opacity = (op || 0.5) * (1 - k); }); e.mat = mat;
}
function chainStrip(hex, add) { const m = new THREE.Mesh(crossStrip(), fxMat(hex, 1, { map: GX.tex.chain, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.userData.ownGeo = 1; m.renderOrder = 4; return m; }
function chainSet(m, ax, az, bx, bz, y, th) {
  const len = Math.hypot(bx - ax, bz - az) || 0.001, uv = m.geometry.attributes.uv, rep = Math.max(1, len / (th * 4));
  m.position.set((ax + bx) / 2, y, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); m.scale.set(len, th, th);
  uv.setX(1, rep); uv.setX(2, rep); uv.setX(5, rep); uv.setX(6, rep); uv.needsUpdate = true;
}
function chainFx(ax, az, bx0, bz0, bx1, bz1, dur, hex, y) { const m = chainStrip(hex, true); fxAdd(m, dur, k => { const q = easeOut(k); chainSet(m, ax, az, lerp(bx0, bx1, q), lerp(bz0, bz1, q), y, 0.17); m.material.opacity = Math.min(1, (1 - k) / 0.3); }); }
function sparks(x, y, z, n, hex, speed, size, life, up, grav) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.35 + Math.random() * 0.65), e = (Math.random() - 0.3) * (up == null ? 1 : up); FX.add.emit(x, y, z, Math.cos(a) * v, e * speed, Math.sin(a) * v, life * (0.6 + Math.random() * 0.6), size, size * 0.2, hex, 1, grav == null ? 4 : grav, 1.5); }
}
function debris(x, y, z, n, hex, speed, size, life) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7); FX.alpha.emit(x, y + Math.random() * 0.3, z, Math.cos(a) * v, speed * (0.6 + Math.random()), Math.sin(a) * v, life * (0.7 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), size * 0.5, hex, 1, 14, 0.4); }
}
function smoke(x, y, z, n, hex, size, life, spread) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.random() * (spread || 0.4); FX.alpha.emit(x + Math.cos(a) * d, y + Math.random() * 0.3, z + Math.sin(a) * d, Math.cos(a) * 0.4, 0.6 + Math.random() * 0.9, Math.sin(a) * 0.4, life * (0.7 + Math.random() * 0.6), size * 0.6, size * 1.8, hex, 0.5, -0.2, 0.8); }
}
function rise3(x, z, r, n, hex, speed, life, size) {      // motes drifting up inside a circle
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r; FX.add.emit(x + Math.cos(a) * d, 0.05 + Math.random() * 0.25, z + Math.sin(a) * d, 0, speed * (0.6 + Math.random() * 0.8), 0, life * (0.6 + Math.random() * 0.7), size || 0.14, 0.03, hex, 0.9, -0.2, 0); }
}
function conv3(x, y, z, r, n, hex, life, size) {      // motes flying inward to a point
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = (Math.random() - .3) * 1.2, d = r * (0.6 + Math.random() * 0.5), cx = Math.cos(a) * Math.cos(e) * d, cy = Math.sin(e) * d, cz = Math.sin(a) * Math.cos(e) * d, t = life * (0.7 + Math.random() * 0.4); FX.add.emit(x + cx, Math.max(0.05, y + cy), z + cz, -cx / t, -cy / t, -cz / t, t, size || 0.14, 0.04, hex, 0.9, 0, 0); }
}
function grit(x, y, z, n, hex, speed) {      // sand kicked up: flung out low and fast, down again at once
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.35 + Math.random() * 0.65); FX.add.emit(x, y + (Math.random() - .5) * 0.3, z, Math.cos(a) * v, 0.8 + Math.random() * 1.8, Math.sin(a) * v, 0.35 + Math.random() * 0.35, 0.09, 0.03, i % 3 ? '#ecd9a6' : hex, 0.9, 5.5, 2.2); }
}
/* a bladed ring lying flat: white steel, a coloured edge, three teeth */
function leafBlade(c, k) {       // a thrown leaf of iron, spinning flat: the blade, its edge alight, and the blur of its turning. Returns [what to add, what spins]
  const tilt = new THREE.Group(), g = new THREE.Group(), a = shared(new THREE.Mesh(FG.leaf, glowMat('#f4fbf6'))), b = new THREE.Mesh(FG.leaf, fxMat(c, 0.7)), d = new THREE.Mesh(FG.plane, fxMat(c, 0.38, { map: GX.tex.swirl }));
  a.scale.set(0.66 * k, 0.55 * k, 0.66 * k); b.scale.set(0.84 * k, 0.22 * k, 0.9 * k); d.scale.set(1.05 * k, 1, 1.05 * k); g.add(a); g.add(b); g.add(d); tilt.rotation.x = 0.32; tilt.add(g);
  return [tilt, g];
}
function chakram(c, size) {
  const g = new THREE.Group(), a = shared(new THREE.Mesh(FG.chak, glowMat('#ffffff'))), b = new THREE.Mesh(FG.chak, fxMat(c, 0.7));
  a.scale.set(size, size * 0.45, size); b.scale.set(size * 1.24, size * 0.3, size * 1.24); g.add(a); g.add(b);
  for (let i = 0; i < 3; i++) { const t = shared(new THREE.Mesh(FG.tooth, glowMat('#ffffff'))); t.scale.setScalar(size); t.rotation.y = i * TAU / 3; g.add(t); }
  return g;
}
/* an eclipse hanging in the air: a dark disc in a ring of fire that always faces the camera. o: gk (share of life spent opening),
   spin (turns of the corona, rad/s), fout, shrink (closes instead of opening) */
function eclipse3(x, y, z, size, dur, hex, o) {
  o = o || {};
  const g = new THREE.Group(), cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.corona, color: lin(hex), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })), moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.moon, color: 0x000000, depthWrite: false, transparent: true, toneMapped: false }));
  let back = null; if (o.dark) { back = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.blob, color: 0x000000, depthWrite: false, transparent: true, toneMapped: false })); back.renderOrder = 4; g.add(back); }       // a patch of night behind it, so its fire shows against a bright sky
  g.add(cor); g.add(moon); g.position.set(x, y, z); cor.renderOrder = 5; moon.renderOrder = 6;
  const gk = o.gk || 0.18, fo = o.fout || 0.3, sp = o.spin == null ? 0.6 : o.spin;
  fxAdd(g, dur, k => { const q = size * (o.shrink ? 1 - k * 0.75 : easeOut(Math.min(1, k / gk))) + 0.001; cor.scale.set(q, q, 1); moon.scale.set(q * 0.5, q * 0.5, 1); cor.material.rotation = sp * k * dur; const a = Math.min(1, (1 - k) / fo); cor.material.opacity = a; moon.material.opacity = a; if (back) { back.scale.set(q * 1.5, q * 1.5, 1); back.material.opacity = a * 0.8; } });
}
/* the same lying on the ground: a black disc of radius r with a burning rim. It opens from a point, or with shrink closes to one */
function eclipseDecal(x, z, r, dur, hex, o) {
  o = o || {}; const gk = o.gk || 0.22, fout = o.fout || 0.35, a = o.shrink ? 1 : 0.2, b = o.shrink ? 0.06 : 1;
  decal3(GX.tex.moon, x, z, r * 1.32 * b, dur, '#000000', 0.92, { nb: 1, rot: 0, fin: 0.06, fout, r0: r * 1.32 * a, gk, y: 0.062 });
  decal3(GX.tex.corona, x, z, r * 2.56 * b, dur, hex, 0.95, { rot: 0, spin: o.spin == null ? 1.2 : o.spin, fin: 0.06, fout, r0: r * 2.56 * a, gk, y: 0.066 });
}
function sunburst3(x, z, r, n, hex, dur, w, y) {      // straight rays from a point, lying just over the ground, brightest at their tips
  const a0 = Math.random() * TAU;
  for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU + (Math.random() - .5) * 0.2, k = 0.55 + Math.random() * 0.45; streak3(x + Math.cos(a) * r * 0.12, z + Math.sin(a) * r * 0.12, x + Math.cos(a) * r * k, z + Math.sin(a) * r * k, w || 0.22, dur * (0.7 + Math.random() * 0.5), hex, y || 0.12, 0.85); }
}
function shards3(x, y, z, n, hex, speed, dur) {      // splinters of something broken: flung out, tumbling, falling
  const g = new THREE.Group(), mat = fxMat(hex, 1), P = [];
  for (let i = 0; i < n; i++) { const m = shared(new THREE.Mesh(FG.oct, mat)), a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.6), q = 0.05 + Math.random() * 0.09; m.scale.set(q * 0.35, q * 2.2, q); m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); g.add(m); P.push([Math.cos(a) * v, 1.5 + Math.random() * 3.2, Math.sin(a) * v, (Math.random() - .5) * 14, (Math.random() - .5) * 14]); }
  g.position.set(x, y, z); g.renderOrder = 4;
  const e = fxAdd(g, dur, k => { const t = k * dur; for (let i = 0; i < n; i++) { const m = g.children[i], p = P[i]; m.position.set(p[0] * t, Math.max(0.03 - y, p[1] * t - 6.5 * t * t), p[2] * t); m.rotation.x += p[3] * FX.dt; m.rotation.z += p[4] * FX.dt; } mat.opacity = Math.min(1, (1 - k) / 0.35); });
  e.mat = mat;
}
function skyblade3(x, z, h, dur, hex, fall, done) {      // a blade of light as tall as a tower: it drops out of the sky and stands for a moment
  const g = new THREE.Group(), core = new THREE.Mesh(FG.oct, fxMat('#ffffff', 1)), edge = new THREE.Mesh(FG.oct, fxMat(hex, 0.7));
  core.scale.set(0.16, h * 0.5, 0.05); edge.scale.set(0.42, h * 0.56, 0.1); g.add(core); g.add(edge); g.renderOrder = 5; g.rotation.y = Math.random() * 3; let hit = false;
  fxAdd(g, dur, k => { const t = k * dur, f = Math.min(1, t / fall); g.position.set(x, lerp(11, h * 0.5 - 0.3, f * f), z); const a = t < fall ? 1 : Math.max(0, 1 - (t - fall) / (dur - fall)); core.material.opacity = a; edge.material.opacity = 0.7 * a; g.scale.x = g.scale.z = 0.6 + 0.4 * a; if (!hit && f >= 1) { hit = true; if (done) done(); } });
}
/* a mark that hangs over a unit until its owner's follow-up is spent or runs out */
function markFx(tid, h, c, dur) {
  const g = new THREE.Group(), ring = new THREE.Mesh(FG.ring, fxMat(c, 0.9)), top = new THREE.Mesh(FG.oct, fxMat('#ffffff', 0.95)), gl = shared(halo(c, 0.9, 0.9));
  ring.position.y = 0.07; g.add(ring); top.scale.set(0.11, 0.3, 0.11); g.add(top); g.add(gl); g.renderOrder = 4;
  fxAdd(g, dur, k => {
    const v = V.views.get(tid), r = h && h.re && h.re[0], on = !!(v && v.u && !v.u.dead && v.root.visible && r && r.tgt && r.tgt.id === tid && r.until > G.t);
    g.visible = on; if (!on) return;
    const u = v.u, t = V.t, rr = (u.r * S3 + 0.22) * (1 + Math.sin(t * 9) * 0.06), yy = v.top + 0.5 + Math.sin(t * 5) * 0.08;
    g.position.set(u.x * S3, 0, u.y * S3); ring.scale.set(rr, 1, rr); ring.rotation.y = t * 3; top.position.y = yy; top.rotation.y = t * 4; gl.position.y = yy; ring.material.opacity = 0.9 * Math.min(1, (1 - k) / 0.15);
  });
}
function shake(a) { FX.shake = Math.max(FX.shake, a); }
/* ---- Tavi's Starfall skin ---- */
const STAR2 = '#ff9ae6';
function stars3(x, y, z, n, hex, speed, life) {       // a spray of star dust: out, up a little, then drifting
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7); FX.add.emit(x, y + (Math.random() - .5) * 0.4, z, Math.cos(a) * v, 0.4 + Math.random() * 1.6, Math.sin(a) * v, (life || 0.6) * (0.6 + Math.random() * 0.7), 0.17, 0.02, i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? STAR2 : hex, 1, 0.9, 1.8); }
}
function twinkle(x, y, z, r, n, hex) { for (let i = 0; i < n; i++) later(i * 0.04, () => { const a = Math.random() * TAU, d = Math.random() * r; glint3(x + Math.cos(a) * d, y + (Math.random() - .3) * r * 0.8, z + Math.sin(a) * d, 0.5 + Math.random() * 0.7, 0.3, i % 2 ? hex : '#ffffff'); }); }
function starmap3(x, z, r, dur, hex, spin, o) { decal3(GX.tex.starmap, x, z, r, dur, hex, 0.95, Object.assign({ spin: spin == null ? 2 : spin, r0: r * 0.45, gk: 0.3 }, o)); }
function skyline3(x, z, hex, w, dur, dx, dz) {       // a line of light from high in the sky down to a spot on the ground
  const g = new THREE.Group(), a = new THREE.Mesh(FG.beam, fxMat('#ffffff', 1)), b = new THREE.Mesh(FG.beam, fxMat(hex, 0.7)), sx = x + (dx == null ? 3.4 : dx), sy = 10, sz = z + (dz == null ? -2.4 : dz), len = Math.hypot(sx - x, sy, sz - z);
  a.scale.set(w * 0.35, w * 0.35, len); b.scale.set(w, w, len); g.add(a); g.add(b); g.position.set((sx + x) / 2, sy / 2, (sz + z) / 2); g.lookAt(x, 0, z); g.renderOrder = 5;
  fxAdd(g, dur, k => { const f = 1 - k; a.material.opacity = f; b.material.opacity = 0.7 * f * f; const q = 0.4 + 0.6 * f; a.scale.x = a.scale.y = w * 0.35 * q; b.scale.x = b.scale.y = w * (1 + k * 1.5); });
}
/* ---- Halvar's Starherd skin (fx 'S'): where the others have thunder, this one has starlight ---- */
const STAR_S = '#9fb4ff';       // the night's blue beside its gold
function dustS(x, y, z, n, hex, speed, life) {       // star dust in the skin's own three colours
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7); FX.add.emit(x, y + (Math.random() - .5) * 0.4, z, Math.cos(a) * v, 0.4 + Math.random() * 1.6, Math.sin(a) * v, (life || 0.6) * (0.6 + Math.random() * 0.7), 0.17, 0.02, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? STAR_S : hex, 1, 0.9, 1.8); }
}
function ghostTrail(v, hex, x0, z0, x1, z1, n) { if (!v) return; for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; ghost3(v, i % 2 ? STAR2 : hex, 0.28 + k * 0.3, 0.22 + k * 0.3, lerp(x0, x1, k), lerp(z0, z1, k)); } }
function impactC(x, z, c, r, big) {       // where a star comes down
  skyline3(x, z, c, big ? 0.5 : 0.28, big ? 0.42 : 0.3); flash3(x, 0.8, z, r * 2.6, 0.3, '#ffffff'); flash3(x, 0.8, z, r * 3.4, 0.4, c); ring3(x, z, 0.2, r * 1.15, 0.4, c, 1); ring3(x, z, 0.2, r * 0.8, 0.3, '#ffffff', 0.8); later(0.08, () => ring3(x, z, 0.3, r * 1.5, 0.5, STAR2, 0.6, true));
  sunburst3(x, z, r * 1.5, big ? 18 : 10, c, 0.42, 0.16, 0.12); sunburst3(x, z, r * 0.9, big ? 10 : 6, '#ffffff', 0.3, 0.09, 0.14); starmap3(x, z, r * 1.1, big ? 0.9 : 0.6, c, 5); pillar3(x, z, r * 0.3, big ? 6 : 3.5, 0.45, c, 0.65);
  stars3(x, 0.6, z, big ? 34 : 14, c, big ? 5.5 : 3.6, 0.8); twinkle(x, 1.2, z, r, big ? 8 : 4, c); if (big) { decal3(GX.tex.crack, x, z, r * 1.2, 1.6, c, 0.8, { r0: r * 0.7, gk: 0.1, fout: 0.6 }); scorch3(x, z, r * 0.8, 1.8); }
  shake(big ? 0.36 : 0.16);
}
function starProp(c) {       // a star hanging in the air: a four-point spark inside two tilted orbits
  const g = new THREE.Group(), mk = (hex, sx, sy, sz, op) => { const m = new THREE.Mesh(FG.oct, op ? fxMat(hex, op) : glowMat(hex)); if (!op) shared(m); m.scale.set(sx, sy, sz); g.add(m); return m; };
  mk('#ffffff', 0.05, 0.3, 0.05); mk('#ffffff', 0.3, 0.05, 0.05); mk(c, 0.09, 0.42, 0.09, 0.6); mk(c, 0.42, 0.09, 0.09, 0.6);
  for (const k of [0.5, -0.7]) { const r = new THREE.Mesh(FG.ringThin, fxMat(k > 0 ? c : STAR2, 0.8)); r.scale.set(0.34, 1, 0.34); r.rotation.x = HP2 + k; r.rotation.z = k * 0.6; g.add(r); }
  return g;
}
/* ---- the two-mask medium ---- */
function kc(h, f) { const L = h && h.look; return f ? (L && L.tiger) || '#ff8a3c' : (L && L.heron) || '#8fe6ff'; }
function papers(x, y, z, n, speed) {       // paper slips: thrown up, drifting down slowly
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7); FX.add.emit(x, y + Math.random() * 0.3, z, Math.cos(a) * v, 1.2 + Math.random() * 1.6, Math.sin(a) * v, 0.8 + Math.random() * 0.6, 0.13, 0.06, i % 4 ? '#fbfaf5' : '#ffd0c8', 0.95, 1.6, 2.6); }
}
function claws3(x, y, z, ang, len, hex, dur) {       // three parallel strokes
  const rot = Math.atan2(Math.sin(ang), Math.cos(ang)) * 0 + 0.6;
  for (let i = -1; i <= 1; i++) { const ox = -Math.sin(ang) * i * 0.3, oz = Math.cos(ang) * i * 0.3; cut3(x + ox, y + i * 0.18, z + oz, len * (1 - Math.abs(i) * 0.15), rot, hex, dur); cut3(x + ox, y + i * 0.18, z + oz, len * 0.7, rot, '#ffffff', dur * 0.75, len * 0.03); }
}
function latchFx(tid, c, dur) {       // a ward clinging to its catch: slips circling closer and faster until it bursts
  const g = new THREE.Group(), ring = new THREE.Mesh(FG.ringThin, fxMat(c, 0.9)), bits = []; ring.position.y = 0.08; g.add(ring);
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(FG.plane, fxMat('#ffffff', 0.95, { side: THREE.DoubleSide })); m.scale.set(0.16, 1, 0.3); g.add(m); bits.push(m); }
  fxAdd(g, dur, k => { const v = V.views.get(tid); g.visible = !!(v && v.u && !v.u.dead && v.root.visible); if (!g.visible) return; const u = v.u, t = V.t, r = (u.r * S3 + 1.1) * (1 - k * 0.75) + 0.25; g.position.set(u.x * S3, 0, u.y * S3); ring.scale.set(r, 1, r); ring.material.opacity = 0.5 + 0.5 * Math.sin(t * (10 + k * 30));
    bits.forEach((m, i) => { const a = t * (4 + k * 14) + i * HP2; m.position.set(Math.cos(a) * r, 0.9 + Math.sin(t * 6 + i) * 0.25, Math.sin(a) * r); m.rotation.set(HP2, 0, a); }); });
}
function kmSync(v, u, n, t) {       // the marks over a marked unit's head: one or two small flames
  let g = v.kmG;
  if (!g) { if (!n) return; g = v.kmG = new THREE.Group(); for (const k of [-1, 1]) { const m = new THREE.Mesh(FG.oct, fxMat(u.km.c, 0.95)); m.scale.set(0.09, 0.2, 0.09); m.position.x = k * 0.16; g.add(m); } const h = halo(u.km.c, 0.7, 0.8); g.add(h); v.root.add(g); }
  g.visible = n > 0; if (!n) return;
  g.position.y = (v.top || 1.3) + 0.42 + Math.sin(t * 5) * 0.05; g.rotation.y = t * 3; g.children[1].visible = n > 1; g.children[0].position.x = n > 1 ? -0.16 : 0;
}
function sgSync(v, u, n, t) {       // Miel's stings in a unit: as many bees circling it as it has stings (a bright body in a small glow, to be seen on any ground)
  let g = v.sgG;
  if (!g) { if (!n) return; g = v.sgG = new THREE.Group(); for (let i = 0; i < STING_MAX; i++) { const b = new THREE.Group(), m = new THREE.Mesh(FG.oct, glowMat('#ffb21e')), tail = new THREE.Mesh(FG.oct, glowMat('#3a2408')); m.scale.set(0.12, 0.12, 0.18); tail.scale.set(0.1, 0.1, 0.12); tail.position.z = -0.14; b.add(m); b.add(tail); b.add(halo('#ffc23a', 0.85, 0.8)); g.add(b); } v.root.add(g); }
  g.visible = n > 0; if (!n) return;
  const r = (u.r || 30) * S3 + 0.42, y0 = (v.top || 1.3) * 0.7;
  for (let i = 0; i < g.children.length; i++) { const m = g.children[i]; m.visible = i < n; if (i >= n) continue; const a = t * 5.5 + i * (TAU / n); m.position.set(Math.cos(a) * r, y0 + Math.sin(t * 9 + i * 1.7) * 0.16, Math.sin(a) * r); m.rotation.y = -a; }
}
function text3(x, y, z, txt, c, big, dur) { if (FX.texts.length < 40) FX.texts.push({ x, y, z, t: 0, dur: dur || 0.85, txt, c, big: !!big, ox: (Math.random() - 0.5) * 30 }); }
function nearCam(sx, sy, pad) { const f = Math.max(1, V.dist / 16.3); return Math.abs(sx - V.cam.x) < 1080 * f + pad && sy - V.cam.y > -1180 * f - pad && sy - V.cam.y < 760 * f + pad; }

/* ---------- compound effects ---------- */
function quakeFx(x, z, r, c, pw) {      // heavy ground impact: cracks that linger, shock rings, rubble and dust
  pw = pw || 1; const rot = Math.random() * TAU;
  decal3(GX.tex.crack, x, z, r * 1.05, 2.6, '#1f160e', 0.85, { nb: 1, fin: 0.03, fout: 0.45, r0: r * 0.5, gk: 0.06, rot });
  decal3(GX.tex.crack, x, z, r * 1.03, 0.9, c, 0.95, { fin: 0.03, fout: 0.8, r0: r * 0.5, gk: 0.12, rot });
  disc3(x, z, r, r, 0.5, c, 0.2, true); ring3(x, z, r * 0.25, r * 1.03, 0.45, c, 0.9); ring3(x, z, r * 0.15, r * 0.82, 0.6, '#ffffff', 0.45, true);
  flash3(x, 0.4, z, r * 1.3, 0.22, c); debris(x, 0.1, z, Math.round(11 * pw), '#7a7468', r * 1.7 + 1, 0.2, 0.75); smoke(x, 0.1, z, Math.round(12 * pw), '#cfc6b0', Math.min(0.8, r * 0.28), 0.7, r * 0.75); sparks(x, 0.3, z, 12, c, r * 2.6, 0.16, 0.55, 1.2);
  FX.shake = Math.max(FX.shake, 0.13 * pw);
}
function frostBurst(x, z, r, c) {      // a crown of ice that erupts and melts
  const g = new THREE.Group(), mat = fxMat(lite(c || '#8fe6ff', 0.45), 0.85, { blending: THREE.NormalBlending }), n = 15;
  for (let i = 0; i < n; i++) { const inner = i >= 10, a = i / (inner ? 5 : 10) * TAU + Math.random() * 0.4, d = r * (inner ? 0.3 + Math.random() * 0.2 : 0.62 + Math.random() * 0.3), m = shared(new THREE.Mesh(FG.oct, mat)); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.rotation.set(Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3); m.userData.h = (inner ? 1.0 : 0.55) + Math.random() * 0.6; g.add(m); }
  g.position.set(x, 0, z);
  const e = fxAdd(g, 1.3, k => { const up = k < 0.1 ? k / 0.1 : 1, f = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; mat.opacity = 0.85 * f; for (const m of g.children) m.scale.set(0.15, m.userData.h * up, 0.15); });
  e.mat = mat;
}
function starFall(x, z, hex) {      // one falling star and its splash
  const g = new THREE.Group(), core = shared(new THREE.Mesh(FG.oct, glowMat('#ffffff'))), tl = new THREE.Mesh(FG.beam, fxMat(hex, 0.7));
  core.scale.set(0.11, 0.11, 0.28); g.add(core); g.add(shared(halo(hex, 1.1, 0.9))); tl.scale.set(0.05, 0.05, 1.7); tl.position.z = -0.85; g.add(tl);
  const sx = x + 1.1, sy = 5.4, sz = z - 0.6; g.position.set(sx, sy, sz); g.lookAt(x, 0.1, z);
  fxAdd(g, 0.3, k => { g.position.set(lerp(sx, x, k), lerp(sy, 0.1, k), lerp(sz, z, k)); });
  later(0.3, () => { ring3(x, z, 0.08, 0.62, 0.3, hex, 0.9); flash3(x, 0.3, z, 1.5, 0.2, hex); sparks(x, 0.2, z, 5, hex, 2.4, 0.13, 0.4, 1.6); });
}
function tossFx(x0, z0, x1, z1, dur) {      // the trap tumbling through the air
  const m = shared(new THREE.Mesh(FG.trap, GX.mat.trap)); m.renderOrder = 3;
  fxAdd(m, dur, k => { m.position.set(lerp(x0, x1, k), 0.95 * (1 - k) + 0.06 + Math.sin(k * Math.PI) * 1.5, lerp(z0, z1, k)); m.rotation.x = k * 9; m.rotation.z = k * 5; });
}
function snapFx(x, z, hex, dur) {      // jaws that snap shut and hold
  const g = new THREE.Group(), J = [];
  for (const k of [-1, 1]) { const j = shared(new THREE.Mesh(FG.jaw, GX.mat.trap)); j.castShadow = true; g.add(j); J.push([j, k]); }
  const gl = new THREE.Mesh(FG.ring, fxMat(hex, 0.9)); gl.scale.set(0.44, 1, 0.44); gl.position.y = 0.03; g.add(gl);
  g.position.set(x, 0.05, z);
  fxAdd(g, dur, k => { const c = easeOut(Math.min(1, k / 0.05)), f = k > 0.85 ? (1 - k) / 0.15 : 1; for (const [j, s] of J) j.rotation.x = s * (1.45 - 1.3 * c); g.scale.setScalar(1.35 * (0.3 + 0.7 * f)); gl.material.opacity = 0.9 * f; });
}
function bindFx(x, z, hex, dur) {      // rings of light that tighten around a rooted target
  const g = new THREE.Group(), mat = fxMat(hex, 0.9);
  for (let i = 0; i < 3; i++) { const m = shared(new THREE.Mesh(FG.ring, mat)); m.position.y = 0.45 + i * 0.5; m.rotation.set((i - 1) * 0.35, i * 2, (i % 2 ? 1 : -1) * 0.3); g.add(m); }
  g.position.set(x, 0, z); g.renderOrder = 4;
  const e = fxAdd(g, dur, k => { const q = 0.6 * (k < 0.12 ? 2.2 - 10 * k : 1); g.children.forEach((m, i) => { m.scale.set(q, 1, q); m.rotation.y += FX.dt * (i % 2 ? 4 : -4); }); mat.opacity = 0.9 * Math.min(1, (1 - k) / 0.2); });
  e.mat = mat;
}

/* a hunter's mark over a marked enemy: a small reticle turning above the head, gone the moment the mark is spent or overwritten */
function huntMark(tid, hid, c, dur, until) {
  const g = new THREE.Group(), ring = new THREE.Mesh(FG.ring, fxMat(c, 0.95)), dot = new THREE.Mesh(FG.oct, fxMat('#ffffff', 0.95)), gl = shared(halo(c, 0.8, 0.7));
  ring.scale.set(0.2, 1, 0.2); g.add(ring); dot.scale.set(0.045, 0.045, 0.045); g.add(dot); g.add(gl);
  for (let i = 0; i < 4; i++) { const m = shared(new THREE.Mesh(FG.plane, ring.material)); m.scale.set(0.15, 1, 0.035); m.position.set(Math.cos(i * HP2) * 0.3, 0, Math.sin(i * HP2) * 0.3); m.rotation.y = -i * HP2; g.add(m); }
  g.renderOrder = 4;
  fxAdd(g, dur, k => {
    const v = V.views.get(tid), u = v && v.u, on = !!(u && !u.dead && v.root.visible && u.om && u.om.by === hid && Math.abs(u.om.until - until) < 1e-6 && u.om.until > G.t);
    g.visible = on; if (!on) return;
    const t = V.t, s = k < 0.06 ? 2.4 - k / 0.06 * 1.4 : 1 + Math.sin(t * 7) * 0.06;
    g.position.set(u.x * S3, (v.top || 1.6) + 0.5 + Math.sin(t * 4) * 0.04, u.y * S3); g.rotation.y = t * 2.2; g.scale.setScalar(s); ring.material.opacity = 0.95 * Math.min(1, (1 - k) / 0.12);
  });
}
/* Death Mark on its hero: a ring turning over the head with three blades on it, one going dark with each fast attack spent, and a ring
   drawn tight round the feet. It lasts as long as the flurry does. */
function deathMark(tid, hid, c, dur) {
  const g = new THREE.Group(), top = new THREE.Group(), ring = new THREE.Mesh(FG.ring, fxMat(c, 0.9)), gl = shared(halo(c, 1.0, 0.55)), gr = new THREE.Mesh(FG.ring, fxMat(c, 0.75)), pips = [];
  ring.scale.set(0.36, 1, 0.36); top.add(ring); top.add(gl);
  for (let i = 0; i < FLURRY_N; i++) { const a = i / FLURRY_N * TAU, m = new THREE.Mesh(FG.oct, fxMat('#ffffff', 0.95)); m.scale.set(0.055, 0.15, 0.055); m.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); top.add(m); pips.push(m); }
  gr.renderOrder = 3; g.add(top); g.add(gr); g.renderOrder = 4;
  fxAdd(g, dur + 0.3, k => {
    const v = V.views.get(tid), u = v && v.u, hv = V.views.get(hid), f = hv && hv.u && hv.u.flurry, on = !!(u && !u.dead && v.root.visible && f && f.n > 0 && f.tgt && f.tgt.id === tid);
    g.visible = on; if (!on) return;
    const t = V.t, s = k < 0.05 ? 2.6 - k / 0.05 * 1.6 : 1 + Math.sin(t * 9) * 0.05;
    g.position.set(u.x * S3, 0, u.y * S3); top.position.y = (v.top || 1.6) + 0.55 + Math.sin(t * 4) * 0.04; top.rotation.y = -t * 3.2; top.scale.setScalar(s);
    gr.position.y = 0.07; const q = 0.62 + Math.sin(t * 9) * 0.04; gr.scale.set(q, 1, q); gr.material.opacity = 0.55 + 0.25 * Math.sin(t * 9);
    for (let i = 0; i < pips.length; i++) pips[i].material.opacity = i < f.n ? 0.95 : 0.1;
  });
}
/* the pod of a Bramble Snare clinging to its catch: roots claw up round the feet (held: only if the root took), vines tighten, and
   the pod overhead beats faster and faster until it bursts */
function brambleLatch(tid, c, dur, held) {
  const g = new THREE.Group(), vine = fxMat('#7ad04a', 0.85), wood = new THREE.MeshLambertMaterial({ color: lin('#4d5f2c') }), R = [], T = [];
  for (let i = 0; i < 3; i++) { const m = shared(new THREE.Mesh(FG.ring, vine)); m.position.y = 0.35 + i * 0.5; m.rotation.set((i - 1) * 0.4, i * 2, (i % 2 ? 1 : -1) * 0.35); g.add(m); R.push(m); }
  if (held) for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3, m = shared(new THREE.Mesh(FG.spike, wood)); m.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); m.rotation.set(-Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55); m.userData.h = 0.55 + (i % 3) * 0.16; m.castShadow = true; g.add(m); T.push(m); }
  const pod = new THREE.Mesh(FG.sphere, fxMat(c, 0.9)), core = shared(new THREE.Mesh(FG.sphere, glowMat('#39451f'))), gl = shared(halo(c, 1.3, 0.8)); g.add(pod); g.add(core); g.add(gl); g.renderOrder = 4;
  const e = fxAdd(g, dur, k => {
    const v = V.views.get(tid), u = v && v.u; g.visible = !!(u && !u.dead && v.root.visible); if (!g.visible) return;
    const t = k * dur, y = (v.top || 1.6) + 0.35, beat = 0.5 + 0.5 * Math.sin(t * (9 + k * 34)), q = (u.r * S3 + 0.55) * (1 - 0.45 * easeOut(Math.min(1, k * 2.2)));
    g.position.set(u.x * S3, 0, u.y * S3);
    R.forEach((m, i) => { m.scale.set(q, 1, q); m.rotation.y += FX.dt * (i % 2 ? 5 : -5); }); vine.opacity = 0.85 * Math.min(1, k / 0.08);
    for (const m of T) m.scale.set(0.07, Math.max(0.001, m.userData.h * easeOut(Math.min(1, k / 0.18))), 0.07);
    const ps = 0.13 + 0.05 * beat + 0.08 * k; pod.position.y = core.position.y = gl.position.y = y; pod.scale.setScalar(ps * 1.25); core.scale.setScalar(ps * 0.8); pod.material.opacity = 0.35 + 0.55 * beat; gl.scale.setScalar(0.9 + 1.2 * beat * (0.4 + k));
  });
  e.mat = wood; e.mat2 = vine;
}
function brambleBurst(x, z, r, c) {       // thorns out of the ground all round, leaves and splinters in the air
  spikes3(x, z, r * 0.78, 16, '#4d5f2c', 1.25, 1.1, { w: 0.12, lean: 0.95 }); spikes3(x, z, r * 0.45, 9, '#6f8a3a', 0.95, 0.95, { w: 0.1, lean: 0.75 }); spikes3(x, z, r * 0.16, 4, '#8fae4a', 0.7, 0.8, { w: 0.09, lean: 0.3 });
  ring3(x, z, r * 0.2, r * 1.04, 0.4, c, 1); ring3(x, z, r * 0.15, r * 0.75, 0.3, '#ffffff', 0.6, true); disc3(x, z, r * 0.3, r, 0.35, c, 0.22, true); flash3(x, 0.8, z, r * 1.9, 0.28, c);
  decal3(GX.tex.crack, x, z, r * 0.95, 1.5, '#1f2a12', 0.8, { nb: 1, fin: 0.03, fout: 0.5, r0: r * 0.4, gk: 0.08 }); sunburst3(x, z, r * 1.05, 12, c, 0.34, 0.12, 0.14);
  for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, v = 2 + Math.random() * 3.6; FX.alpha.emit(x, 0.5 + Math.random() * 0.6, z, Math.cos(a) * v, 1.6 + Math.random() * 2.6, Math.sin(a) * v, 0.6 + Math.random() * 0.5, 0.13, 0.05, i % 3 ? '#6f9a3a' : '#c9d86a', 0.95, 7, 1.2); }
  sparks(x, 0.7, z, 14, c, 4.4, 0.15, 0.5, 1.1); shake(0.18);
}
function plateBreak(x, y, z, soft) {       // a gold band comes off a turret: pieces flung out, coins of light, a ring where it sat
  shards3(x, y, z, soft ? 7 : 12, '#ffd766', soft ? 2.2 : 4.2, 0.9); debris(x, y, z, soft ? 4 : 8, '#dc9f28', soft ? 1.6 : 3, 0.2, 0.9);
  sparks(x, y, z, soft ? 8 : 16, '#fff3c8', soft ? 2 : 4.5, 0.15, 0.6, 1.2, 6); ring3(x, z, 0.5, soft ? 1.0 : 1.4, 0.35, '#ffd766', 0.9, true, y); flash3(x, y, z, soft ? 1.6 : 2.6, 0.2, '#ffe9a3');
  if (soft) smoke(x, y, z, 3, '#d8c9a0', 0.5, 0.7, 0.4); else { glint3(x, y + 0.2, z + 0.6, 1.5, 0.5, '#ffffff'); shake(0.08); }
}
function totemFx(e, x, z, c) {       // the totem wakes: light runs up its bearer, a ring runs out, and whatever was holding him breaks off in splinters
  ring3(x, z, 0.3, 2.7, 0.5, c, 1); ring3(x, z, 0.2, 1.8, 0.36, '#ffffff', 0.7, true); decal3(GX.tex.rune, x, z, 2.0, 0.9, c, 0.9, { spin: -3, r0: 0.6 });
  pillar3(x, z, 0.85, 4.4, 0.6, c, 0.55); flash3(x, 1.1, z, 3.6, 0.3, c); glint3(x, 2.4, z, 1.9, 0.45, '#ffffff'); sunburst3(x, z, 2.2, 8, c, 0.4, 0.14, 0.1);
  if (e.n) { shards3(x, 1.0, z, 6 + e.n * 4, '#a0ebff', 4.2, 0.7); ring3(x, z, 0.9, 0.3, 0.25, '#a0ebff', 0.8, true, 0.9); }
  shake(0.14); if (V.me && e.id === V.me.id) text3(x, 3.5, z, 'UNSHAKEN', c, true, 1.1);
}

/* ---------- one function per skill effect; c is the caster's skin colour for that skill ---------- */
const SKFX = {
  /* battle spells */
  spF(e, x, z, c) { const x0 = e.x0 * S3, z0 = e.y0 * S3; flash3(x0, 1, z0, 2.2, 0.3, c); smoke(x0, 0.3, z0, 5, '#fff3c8', 0.5, 0.5, 0.3); ring3(x0, z0, 0.9, 0.15, 0.3, c, 0.8, true);
    streak3(x0, z0, x, z, 0.7, 0.35, c, 0.9, 0.7); flash3(x, 1, z, 3, 0.35, c); ring3(x, z, 0.2, 1.3, 0.4, c, 0.9); sparks(x, 0.8, z, 12, c, 3, 0.15, 0.5, 1.2);
    for (let i = 0; i < 3; i++) glint3(x + (Math.random() - .5) * 1.2, 0.6 + Math.random() * 1.4, z + (Math.random() - .5) * 1.2, 0.9, 0.4 + i * 0.1, '#ffffff'); },
  spS(e, x, z, c) { for (let i = 0; i < 3; i++) later(i * 0.08, () => ring3(x, z, 0.3, 1.1 + i * 0.35, 0.4, c, 0.8, true, 0.08 + i * 0.4)); decal3(GX.tex.swirl, x, z, 1.5, 0.6, c, 0.7, { spin: -8, r0: 0.5 }); rise3(x, z, 0.6, 10, c, 2.2, 0.6); },
  spI(e, x, z, c) { flash3(x, 1.2, z, 3.2, 0.3, c); for (let i = 0; i < 3; i++) later(i * 0.07, () => ring3(x, z, 1.3 - i * 0.3, 0.25, 0.32, i === 1 ? '#ffffff' : c, 0.85, true, 0.1 + i * 0.5)); pillar3(x, z, 0.7, 3.4, 0.6, c, 0.5); rise3(x, z, 0.6, 16, c, 2.8, 0.7, 0.14); glint3(x, 2.5, z, 1.5, 0.4, '#ffffff'); },       // Inspire: gathered in, and up
  spA(e, x, z, c) { dome3(x, z, 1.25, 0.7, c, 0.7, { sy: 1.25 }); ring3(x, z, 0.3, 1.5, 0.45, c, 0.9); decal3(GX.tex.rune, x, z, 1.3, 0.7, c, 0.7, { spin: 2 }); glint3(x, 2.3, z, 1.4, 0.45, '#ffffff'); },
  spE(e, x, z, c) { beam3(x + 0.3, 8, z - 0.5, x, 0.1, z, 0.34, 0.4, c, 0.9); decal3(GX.tex.mark, x, z, 1.5, 0.8, c, 0.9, { spin: 3, r0: 2.4 }); xcut(x, 1.0, z, 3.4, c, 0.32); flash3(x, 0.9, z, 3.6, 0.3, c);
    ring3(x, z, 0.2, 1.6, 0.4, c, 0.9); sparks(x, 0.7, z, 16, c, 4.5, 0.17, 0.5, 1.2); scorch3(x, z, 0.9, 1.6); FX.shake = Math.max(FX.shake, 0.16); },
  spR(e, x, z, c) { bolt3(x + 0.8, 8.5, z - 0.6, x, 0.05, z, c, 0.11, 0.3, 0.1, 8); later(0.06, () => bolt3(x - 0.5, 8, z - 0.3, x, 0.05, z, c, 0.06, 0.22, 0.12, 7)); decal3(GX.tex.rune, x, z, 1.5, 0.7, c, 0.85, { spin: -3, r0: 0.6 });
    flash3(x, 0.8, z, 3.6, 0.3, c); ring3(x, z, 0.2, 1.5, 0.4, c, 0.9); sparks(x, 0.5, z, 16, c, 4, 0.16, 0.55, 1.3); scorch3(x, z, 1.0, 1.6); FX.shake = Math.max(FX.shake, 0.14); },
  /* Bram */
  bram0(e, x, z, c) { ring3(x, z, 0.3, 1.2, 0.35, c, 0.8, true); smoke(x, 0.1, z, 5, '#d8cfb4', 0.55, 0.5, 0.3); glint3(x + Math.cos(e.ang) * 0.5, 1.2, z + Math.sin(e.ang) * 0.5, 1.5, 0.35, '#ffffff'); },
  bram0h(e, x, z, c) { flash3(x, 1, z, 2.8, 0.25, c); slash3(x - Math.cos(e.ang) * 0.6, z - Math.sin(e.ang) * 0.6, e.ang, 1.0, 1.9, 0.3, c, 0.9); ring3(x, z, 0.2, 1.3, 0.35, '#ffffff', 0.8, true); glint3(x, 1.5, z, 2.2, 0.4, '#ffffff');
    sparks(x, 0.9, z, 14, c, 4.5, 0.16, 0.4, 1); debris(x, 0.2, z, 5, '#8a7f6c', 2, 0.14, 0.5); FX.shake = Math.max(FX.shake, 0.12); },
  bram0u(e, x, z, c) {       // Heave: the shield brought up from the ground, and the ground in front of him with it
    const a = e.ang, r = e.r * S3, ca = Math.cos(a), sa = Math.sin(a), mx = x + ca * r * 0.55, mz = z + sa * r * 0.55;
    slash3(x, z, a, HEAVE_A, r, 0.42, c, 0.08, { op: 0.42, flat: 1 }); later(0.04, () => slash3(x, z, a, HEAVE_A, r * 1.03, 0.3, '#ffffff', 0.1, { thin: 1, op: 0.3, edge: 0.75 })); vring3(x + ca * 0.5, 1.2, z + sa * 0.5, a, 0.3, 1.5, 0.3, c, 0.8);
    flash3(mx, 0.9, mz, 3.6, 0.25, c); pillar3(mx, mz, 0.9, 3.2, 0.5, c, 0.4); smoke(mx, 0.1, mz, 8, '#d8cfb4', 0.9, 0.6, 0.5); FX.shake = Math.max(FX.shake, 0.12);
    decal3(GX.tex.crack, mx, mz, r * 0.6, 1.3, '#2e2014', 0.55, { nb: 1, rot: -a, gk: 0.12, fin: 0.05, fout: 0.5 });       // the ground it broke: dark, so that it shows on pale stone too, where light alone would not
    for (let i = 0; i < 16; i++) { const q = a + (Math.random() - .5) * 2 * HEAVE_A, d = r * (0.25 + Math.random() * 0.7), px = x + Math.cos(q) * d, pz = z + Math.sin(q) * d;
      if (i % 2) FX.add.emit(px, 0.1, pz, 0, 4 + Math.random() * 3.5, 0, 0.45, 0.13, 0.03, Math.random() < 0.4 ? '#ffffff' : c, 0.9, 6, 0);
      else FX.alpha.emit(px, 0.1, pz, Math.cos(q) * 1.2, 4.5 + Math.random() * 3, Math.sin(q) * 1.2, 0.7, 0.17, 0.09, i % 4 ? '#7a5c3a' : '#a58a5e', 0.95, 13, 0); } },       // (and clods of it, thrown up)
  bram1(e, x, z, c) { const r = e.r * S3; dome3(x, z, r * 0.62, 0.8, c, 0.6); decal3(GX.tex.rune, x, z, r, 0.9, c, 0.75, { spin: 1.2, r0: r * 0.3 }); ring3(x, z, r * 0.25, r, 0.5, c, 0.9); ring3(x, z, r * 0.2, r * 0.85, 0.65, '#ffffff', 0.5, true);
    rise3(x, z, r * 0.8, 16, lite(c), 1.6, 0.8); sparks(x, 0.4, z, 10, c, r * 2.2, 0.15, 0.5, 1); },
  bram2a(e, x, z, c) { const r = e.r * S3, x0 = e.x0 * S3, z0 = e.y0 * S3; ring3(x0, z0, 0.3, 1.5, 0.4, c, 0.8); smoke(x0, 0.1, z0, 7, '#cfc6b0', 0.7, 0.6, 0.5); debris(x0, 0.1, z0, 6, '#7a7468', 2.2, 0.16, 0.5);
    ring3(x, z, r * 1.25, r * 0.2, 0.45, c, 0.9, true); decal3(GX.tex.disc, x, z, r, 0.5, c, 0.5, { fin: 0.5, fout: 0.1, rot: 0 }); },
  bram2(e, x, z, c) { const r = e.r * S3; quakeFx(x, z, r, c, 1.3); spikes3(x, z, r * 0.72, 11, '#8d806c', 1.0, 1.3, { w: 0.2 }); spikes3(x, z, r * 0.4, 6, '#a39680', 0.7, 1.1, { w: 0.16 }); pillar3(x, z, r * 0.5, 2.6, 0.5, c, 0.45); },
  /* Thorn */
  thorn0h(e, x, z, c) { const x2 = e.x2 * S3, z2 = e.y2 * S3; flash3(x, 1, z, 2.2, 0.22, c); ring3(x, z, 0.2, 1.0, 0.3, c, 0.9); sparks(x, 0.9, z, 12, '#ffffff', 4, 0.14, 0.4, 1); chainFx(x2, z2, x, z, x2 + (x - x2) * 0.2, z2 + (z - z2) * 0.2, 0.3, lite(c, 0.6), 0.95); },
  thorn1(e, x, z, c) { const r = e.r * S3; quakeFx(x, z, r, c, 0.9); spikes3(x, z, r * 0.62, 9, '#6f7d5e', 0.8, 1.1, { w: 0.18 }); rise3(x, z, r * 0.5, 8, lite(c), 1.4, 0.7); },
  thorn2(e, x, z, c) { const r = e.r * S3, P = e.pts || []; decal3(GX.tex.swirl, x, z, r * 0.35, 0.55, c, 0.9, { r0: r, gk: 1, spin: 11, fin: 0.1, fout: 0.3 }); for (let i = 0; i < 3; i++) ring3(x, z, r * (1 - i * 0.2), 0.2, 0.42 + i * 0.1, c, 0.9, i > 0);
    for (let i = 0; i < 20; i++) { const a = Math.random() * TAU; FX.add.emit(x + Math.cos(a) * r, 0.3 + Math.random() * 0.9, z + Math.sin(a) * r, -Math.cos(a) * r * 2.6, 0.4, -Math.sin(a) * r * 2.6, 0.38, 0.2, 0.05, c, 1, 0, 0); }
    for (let i = 0; i < P.length; i += 2) { const px = P[i] * S3, pz = P[i + 1] * S3, d = Math.hypot(px - x, pz - z) || 1; chainFx(x, z, px, pz, x + (px - x) / d * 1.3, z + (pz - z) / d * 1.3, 0.34, lite(c, 0.6), 0.95); }
    later(0.3, () => quakeFx(x, z, 1.7, c, 0.8)); FX.shake = Math.max(FX.shake, 0.12); },
  /* Kaela */
  /* Triple Cadence. kaela0: the step in, or for the third the leap (st: which); kaela0c: the cut itself where she stops, or the blow on
     the ground where she lands; kaela0h: on each enemy it lands on */
  kaela0(e, x, z, c) { const a = e.ang, ca = Math.cos(a), sa = Math.sin(a), d = (e.d || 0) * S3, last = e.st === 3;
    if (last) {       // the leap: dust where she left the ground, and the blade's arc on its way down to where she will land
      ring3(x, z, 0.25, 0.95, 0.28, c, 0.6, true); smoke(x, 0.08, z, 3, '#d8cfb4', 0.3, 0.4, 0.3);
      const lx = x + ca * d, lz = z + sa * d, t = e.t || 0.34;
      later(Math.max(0, t - 0.16), () => { sweep3(lx + ca * 0.15, lz + sa * 0.15, a, 0, 1.95, -1, 0.3, c, { up: 1, y: 0.25, a0: -0.05, span: 2.2, lean: 0.22, swing: 0.5, r0: 0.5, op: 0.8 }); sweep3(lx + ca * 0.15, lz + sa * 0.15, a, 0, 1.5, -1, 0.26, '#ffffff', { up: 1, y: 0.25, a0: 0, span: 2.0, lean: 0.22, swing: 0.5, r0: 0.82, op: 0.3, edge: 0.5 }); });
      return; }
    streak3(x - ca * 0.2, z - sa * 0.2, x + ca * d, z + sa * d, 0.5, 0.26, c, 0.1, 0.55); ring3(x, z, 0.25, 0.7, 0.25, c, 0.6, true);
    for (let i = 0; i < 3; i++) FX.alpha.emit(x + (Math.random() - .5) * 0.3, 0.08, z + (Math.random() - .5) * 0.3, -ca * (0.8 + Math.random()), 0.3 + Math.random() * 0.3, -sa * (0.8 + Math.random()), 0.35, 0.14, 0.34, '#d8cfb4', 0.3, -0.2, 1); },
  kaela0c(e, x, z, c) { const r = e.r * S3, a = e.ang, ca = Math.cos(a), sa = Math.sin(a);
    if (e.st === 3) {       // the blow on the ground: it cracks under the blade and the shock runs out ahead of her through the whole arc
      const ix = x + ca * 0.85, iz = z + sa * 0.85;
      decal3(GX.tex.crack, ix, iz, 1.5, 2.4, '#1f160e', 0.85, { nb: 1, fin: 0.03, fout: 0.45, r0: 0.6, gk: 0.06 }); decal3(GX.tex.crack, ix, iz, 1.45, 0.8, c, 0.95, { fin: 0.03, fout: 0.8, r0: 0.6, gk: 0.1 });
      slash3(x, z, a, e.a, r, 0.5, c, 0.075, { op: 0.42, flat: 1 }); later(0.04, () => slash3(x, z, a, e.a, r * 1.04, 0.34, '#ffffff', 0.09, { thin: 1, op: 0.3, edge: 0.75 }));
      flash3(ix, 0.35, iz, 2.6, 0.2, c); ring3(ix, iz, 0.3, 1.5, 0.36, '#ffffff', 0.55, true, 0.08); debris(ix, 0.1, iz, 9, '#7a7468', 3.2, 0.17, 0.7); smoke(ix, 0.1, iz, 7, '#cfc6b0', 0.5, 0.6, 0.8);
      for (let i = 0; i < 14; i++) { const q = a + (Math.random() - .5) * 2 * e.a, rr = r * (0.25 + Math.random() * 0.7); later(rr * 0.05, () => FX.add.emit(x + Math.cos(q) * rr, 0.1 + Math.random() * 0.3, z + Math.sin(q) * rr, Math.cos(q) * 1.2, 2.6 + Math.random() * 2.6, Math.sin(q) * 1.2, 0.4, 0.14, 0.02, i % 3 ? c : '#ffffff', 1, 3.5, 0.6)); }
      FX.shake = Math.max(FX.shake, 0.12); return; }
    const dir = e.st === 2 ? 1 : -1;       // forehand: from her right hand across to the left; backhand: back again
    sweep3(x, z, a, e.a, r, dir, 0.34, c, { y: e.st === 2 ? 1.0 : 0.85 }); slash3(x, z, a, e.a, r, 0.5, c, 0.075, { op: 0.2, flat: 1 });
    for (let i = 0; i < 9; i++) { const u = i / 8, q = a + dir * (u * 2 - 1) * e.a; later(u * 0.1, () => FX.add.emit(x + Math.cos(q) * r * 0.95, 0.6 + Math.random() * 0.5, z + Math.sin(q) * r * 0.95, Math.cos(q) * 2.6 - Math.sin(q) * dir * 1.6, 0.7, Math.sin(q) * 2.6 + Math.cos(q) * dir * 1.6, 0.3, 0.14, 0.03, i % 3 ? c : '#ffffff', 1, 2, 1)); }
    later(0.1, () => glint3(x + Math.cos(a + dir * e.a * 0.85) * r * 0.93, 1.0, z + Math.sin(a + dir * e.a * 0.85) * r * 0.93, 1.3, 0.28, '#ffffff')); },
  kaela0h(e, x, z, c) { const up = e.st === 3;
    cut3(x, 1.0, z, up ? 2.6 : 1.9, up ? 1.4 : e.st === 2 ? -0.45 : 0.45, c, 0.24); cut3(x, 1.0, z, up ? 2.0 : 1.5, up ? 1.4 : e.st === 2 ? -0.45 : 0.45, '#ffffff', 0.18, 0.07);
    flash3(x, 1, z, up ? 1.9 : 1.2, 0.16, c); sparks(x, 1, z, up ? 9 : 6, c, 3.2, 0.13, 0.32, 1); },
  kaela1(e, x, z, c) { ring3(x, z, 0.3, 1.1, 0.3, c, 0.8, true); glint3(x + Math.cos(e.ang) * 0.7, 1.1, z + Math.sin(e.ang) * 0.7, 1.4, 0.3, '#ffffff'); },
  kaela1h(e, x, z, c) { xcut(x, 1.0, z, 2.2, c, 0.28); flash3(x, 1, z, 1.6, 0.2, c); sparks(x, 1, z, 8, c, 3.5, 0.14, 0.35, 1); },
  kaela2(e, x, z, c) { const r = e.r * S3; quakeFx(x, z, r, c, 0.9); pillar3(x, z, 0.9, 3.8, 0.6, c, 0.6); rise3(x, z, r * 0.7, 26, c, 2.6, 0.9, 0.16); glint3(x, 2.4, z, 2.4, 0.5, '#ffffff'); later(0.12, () => ring3(x, z, 0.3, r * 1.15, 0.5, '#ffffff', 0.6, true, 0.9)); },       // (her wings open out of this: see rageWings)
  /* Rook */
  rook0(e, x, z, c) { const r = e.r * S3; quakeFx(x, z, r, c, 1); spikes3(x, z, r * 0.7, 8, '#8d806c', 0.75, 1.0, { fill: 1, w: 0.17 }); },
  rook1(e, x, z, c) { const a = e.ang; for (let i = 0; i < 3; i++) later(i * 0.08, () => { ring3(x, z, 0.3, 1.3 + i * 0.5, 0.42, c, 0.85, true, 0.3 + i * 0.55); slash3(x + Math.cos(a) * 0.35 * i, z + Math.sin(a) * 0.35 * i, a, 0.75, 1.1 + i * 0.5, 0.36, '#ffffff', 1.25, { thin: 1 }); });
    pillar3(x, z, 0.7, 2.6, 0.5, c, 0.5); flash3(x, 1.5, z, 2.6, 0.3, c); sparks(x, 1.4, z, 12, c, 3, 0.15, 0.5, 1); FX.shake = Math.max(FX.shake, 0.08); },
  rook2(e, x, z, c) { const r = e.r * S3; ring3(x, z, 0.4, r, 0.4, c, 0.9); decal3(GX.tex.swirl, x, z, r, 0.5, c, 0.6, { spin: -12, r0: r * 0.4 }); smoke(x, 0.1, z, 8, '#d8cfb4', 0.7, 0.6, r * 0.6); },
  /* Vex */
  vex0h(e, x, z, c) { xcut(x, 1.0, z, 2.0, c, 0.26); flash3(x, 1, z, 1.5, 0.2, c); sparks(x, 1, z, 8, c, 3.2, 0.14, 0.35, 1); },
  vex1(e, x, z, c, h) { const x0 = e.x0 * S3, z0 = e.y0 * S3, r = e.r * S3, v = h && V.views.get(h.id), dk = shade(c, -0.6);
    smoke(x0, 0.3, z0, 8, dk, 0.6, 0.6, 0.35); ring3(x0, z0, 0.9, 0.15, 0.3, c, 0.7, true); ghost3(v, c, 0.5, 0.6, x0, z0); streak3(x0, z0, x, z, 0.8, 0.4, c, 0.5, 0.7); streak3(x0, z0, x, z, 0.2, 0.3, '#ffffff', 0.9, 0.6);
    slash3(x, z, 0, Math.PI, r, 0.3, c, 0.8, { op: 0.3, edge: 0.55 }); later(0.06, () => slash3(x, z, 0, Math.PI, r * 0.8, 0.28, c, 1.15, { thin: 1, op: 0.3, edge: 0.4 })); for (let i = 0; i < 3; i++) later(i * 0.05, () => cut3(x + (Math.random() - .5) * r, 0.9, z + (Math.random() - .5) * r, r * 1.6, Math.random() * Math.PI, c, 0.25));
    ring3(x, z, 0.3, r * 1.05, 0.38, c, 0.85, true); sparks(x, 0.8, z, 12, c, r * 2.6, 0.15, 0.4, 1); smoke(x, 0.2, z, 5, dk, 0.5, 0.5, 0.4); },
  vex2(e, x, z, c, h) { const x0 = e.x0 * S3, z0 = e.y0 * S3, x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id), dk = shade(c, -0.6);
    smoke(x0, 0.3, z0, 8, dk, 0.6, 0.6, 0.35); ghost3(v, c, 0.55, 0.6, x0, z0); streak3(x0, z0, x1, z1, 0.9, 0.45, c, 0.5, 0.75); streak3(x0, z0, x1, z1, 0.22, 0.35, '#ffffff', 0.9, 0.6);
    decal3(GX.tex.mark, x, z, 1.5, 0.9, c, 0.95, { spin: 4, r0: 2.6, gk: 0.3 }); beam3(x, 7, z, x, 0.1, z, 0.2, 0.35, c, 0.9); xcut(x, 1.0, z, 3.6, c, 0.34); flash3(x, 0.9, z, 3.8, 0.3, c);
    ring3(x, z, 0.2, 1.6, 0.4, c, 0.9); sparks(x, 0.8, z, 18, c, 4.5, 0.17, 0.5, 1.2); scorch3(x, z, 0.9, 1.6); FX.shake = Math.max(FX.shake, 0.2); },
  /* Vex, Eclipse Herald: none of the above. Every blow opens a small eclipse, the blink is swallowed by a black sun and thrown out of
     another, and the mark brings night down on its target before a blade falls out of the sky. */
  vex0hE(e, x, z, c) { eclipse3(x, 1.05, z, 2.3, 0.42, c, { spin: 3 }); sunburst3(x, z, 1.7, 9, c, 0.3, 0.16, 0.9); ring3(x, z, 0.15, 1.2, 0.3, '#ffffff', 0.8, true, 0.95); shards3(x, 1.0, z, 7, c, 2.6, 0.6); FX.shake = Math.max(FX.shake, 0.06); },
  vex1E(e, x, z, c, h) {
    const x0 = e.x0 * S3, z0 = e.y0 * S3, r = e.r * S3, v = h && V.views.get(h.id), a = Math.atan2(z - z0, x - x0);
    eclipseDecal(x0, z0, 0.95, 0.6, c, { shrink: 1, gk: 1, spin: -6, fout: 0.2 }); beam3(x0, 0.1, z0, x0, 5.5, z0, 0.1, 0.4, c, 0.9); conv3(x0, 0.9, z0, 1.6, 14, c, 0.3, 0.15);       // where it stood, the ground swallows it
    for (let i = 0; i < 4; i++) { const q = (i + 0.5) / 4; later(i * 0.03, () => ghost3(v, c, 0.5, 0.42 - i * 0.07, lerp(x0, x, q), lerp(z0, z, q))); }       // the way across: a row of afterimages on a seam of light
    bolt3(x0, 0.9, z0, x, 0.9, z, c, 0.07, 0.34, 0.07, 7); streak3(x0, z0, x, z, 0.3, 0.4, '#ffffff', 0.12, 0.7);
    eclipseDecal(x, z, r * 0.55, 0.75, c, { spin: 3 }); sunburst3(x, z, r * 1.15, 12, c, 0.38, 0.2); later(0.07, () => sunburst3(x, z, r * 0.8, 6, '#ffffff', 0.26, 0.07, 0.16));       // where it lands, a black sun opens underfoot and throws light all round
    for (let i = 0; i < 2; i++) later(i * 0.08, () => slash3(x, z, a + i * Math.PI, 1.25, r * (1 - i * 0.14), 0.34, i ? '#ffffff' : c, 0.9 + i * 0.3, { thin: 1, op: 0.42, edge: 0.7 }));
    ring3(x, z, 0.3, r * 1.08, 0.42, c, 0.9); shards3(x, 0.6, z, 12, c, r * 1.9, 0.7); decal3(GX.tex.shatter, x, z, r * 1.05, 1.5, c, 0.8, { fin: 0.03, fout: 0.6, r0: r * 0.4, gk: 0.08 }); flash3(x, 0.8, z, r * 1.0, 0.22, c); FX.shake = Math.max(FX.shake, 0.14);
  },
  vex2E(e, x, z, cu, h) {
    const x0 = e.x0 * S3, z0 = e.y0 * S3, x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id), a0 = Math.atan2(z1 - z, x1 - x), c = h ? skinColor(h.key, h.skin, 0) : cu, c1 = h ? skinColor(h.key, h.skin, 1) : cu;       // fire, not the pale colour of its button
    eclipseDecal(x0, z0, 0.95, 0.55, c, { shrink: 1, gk: 1, spin: -6, fout: 0.2 }); conv3(x0, 0.9, z0, 1.6, 12, c, 0.3, 0.15); bolt3(x0, 0.9, z0, x1, 0.9, z1, c, 0.07, 0.3, 0.08, 7);
    decal3(GX.tex.blob, x, z, 3.4, 1.5, '#000000', 0.7, { nb: 1, rot: 0, fin: 0.1, fout: 0.4, r0: 1.2, gk: 0.25 });       // night falls on the target: its shadow on the ground, the eclipse overhead
    eclipse3(x, 4.7, z, 4.6, 1.35, c1, { gk: 0.2, spin: 1.4, fout: 0.25, dark: 1 }); decal3(GX.tex.rune, x, z, 2.0, 1.3, c, 0.8, { spin: -4, r0: 0.6 });
    for (let i = 0; i < 4; i++) later(0.08 + i * 0.1, () => {       // four of it cut through the target from four sides, one after another
      const a = a0 + 0.8 + i * 1.75, px = x + Math.cos(a) * 1.9, pz = z + Math.sin(a) * 1.9, qx = x - Math.cos(a) * 1.9, qz = z - Math.sin(a) * 1.9;
      ghost3(v, i % 2 ? c1 : c, 0.42, 0.4, px, pz); ghost3(v, c1, 0.5, 0.22, qx, qz); streak3(px, pz, qx, qz, 0.5, 0.3, c, 0.9, 0.85); streak3(px, pz, qx, qz, 0.13, 0.24, '#ffffff', 1.0, 0.8);
      cut3(x, 1.0, z, 4.2, i * 0.8 - 1.2, i % 2 ? '#ffffff' : c, 0.28); sparks(x, 1, z, 6, c, 4, 0.15, 0.35, 1); FX.shake = Math.max(FX.shake, 0.1);
    });
    later(0.5, () => skyblade3(x, z, 5.2, 0.75, c, 0.14, () => {       // and then the blade comes down out of the eclipse
      quakeFx(x, z, 2.1, c, 1.3); eclipseDecal(x, z, 1.25, 1.1, c, { spin: 5 }); sunburst3(x, z, 3.6, 16, c, 0.5, 0.24); sunburst3(x, z, 2.2, 8, '#ffffff', 0.34, 0.08, 0.16); shards3(x, 0.8, z, 18, c, 4.5, 0.9);
      pillar3(x, z, 1.0, 6, 0.7, c, 0.55); decal3(GX.tex.shatter, x, z, 2.6, 2.4, c, 0.9, { fin: 0.02, fout: 0.6, r0: 1.0, gk: 0.06 }); FX.shake = Math.max(FX.shake, 0.34);
    }));
  },
  hitE(e, x, z, c) { const ax = e.ax * S3, az = e.ay * S3, a = Math.atan2(z - az, x - ax), d = Math.hypot(x - ax, z - az);       // its basic attacks
    slash3(ax, az, a, 1.05, Math.min(2.4, d + 0.5), 0.2, c, 0.95, { thin: 1, op: 0.5 }); slash3(ax, az, a + 0.25, 0.8, Math.min(2.0, d + 0.25), 0.26, '#ffffff', 1.2, { thin: 1, op: 0.28, edge: 0.6 });
    eclipse3(x, 1.0, z, e.big ? 1.6 : 1.0, 0.24, c, { spin: 5, gk: 0.3 }); sunburst3(x, z, e.big ? 1.3 : 0.8, e.big ? 7 : 4, c, 0.22, 0.1, 0.95); sparks(x, 0.95, z, e.big ? 9 : 4, c, 3.2, 0.13, 0.3, 1); if (e.big) { shards3(x, 1, z, 6, c, 2.4, 0.5); cut3(x, 1.0, z, 2.4, a, '#ffffff', 0.22); } },
  castE(e, x, z, c) { if (UI.state === 'play') snd('eclipse', e.ult ? 1 : 0.6); eclipse3(x, 3.0, z, e.ult ? 3.6 : 2.0, e.ult ? 0.7 : 0.45, c, { spin: 2.5 }); sunburst3(x, z, e.ult ? 2.6 : 1.3, e.ult ? 14 : 7, c, 0.36, 0.16); if (e.ult) { ring3(x, z, 2.4, 0.3, 0.45, c, 0.9, true); conv3(x, 1.2, z, 2.4, 22, c, 0.4, 0.16); decal3(GX.tex.shatter, x, z, 1.9, 1.0, c, 0.7, { r0: 0.6, gk: 0.1 }); } },
  deathE(e, x, z, c) { eclipseDecal(x, z, 1.5, 1.4, c, { shrink: 1, gk: 1, spin: -7, fout: 0.15 }); conv3(x, 1.0, z, 2.6, 30, c, 0.7, 0.17); eclipse3(x, 1.2, z, 3.2, 0.9, c, { shrink: 1, spin: -5, fout: 0.2 });       // it falls into its own eclipse, which then bursts
    later(0.75, () => { flash3(x, 1, z, 4.5, 0.4, c); ring3(x, z, 0.2, 2.4, 0.5, c, 1); sunburst3(x, z, 3, 14, c, 0.5, 0.2); shards3(x, 1, z, 16, c, 3.6, 0.9); }); },
  /* Tavi */
  kiri0(e, x, z, c, h) { const x0 = e.x0 * S3, z0 = e.y0 * S3; streak3(x0, z0, x, z, 0.22, 0.3, c, 1.0, 0.7); flash3(x, 0.5, z, 1.6, 0.25, c); ring3(x, z, 1.5, 0.3, 0.4, c, 0.9, true); ring3(x, z, 0.2, 1.5, 0.5, '#ffffff', 0.4, true); papers(x, 0.3, z, 7, 1.2); glint3(x, 0.9, z, 1.2, 0.35, '#ffffff'); },
  kiri0l(e, x, z, c) { flash3(x, 1, z, 2.2, 0.22, c); ring3(x, z, 0.3, 1.6, 0.3, c, 0.9); papers(x, 1, z, 10, 2.2); sparks(x, 1, z, 8, c, 3, 0.14, 0.4, 1); latchFx(e.tid, c, e.dur || 1); if (UI.state === 'play') snd('chain', 0.5); },
  kiri0x(e, x, z, c) { const r = (e.r || 210) * S3; flash3(x, 1, z, r * 2.2, 0.3, c); ring3(x, z, 0.3, r * 1.1, 0.42, c, 1); ring3(x, z, 0.2, r * 0.7, 0.3, '#ffffff', 0.7); sunburst3(x, z, r * 1.1, 12, c, 0.4, 0.14, 0.12); decal3(GX.tex.swirl, x, z, r, 0.6, c, 0.6, { spin: 7, r0: r * 0.3 }); pillar3(x, z, 0.5, 3.2, 0.4, c, 0.6); papers(x, 0.8, z, 18, 3.4); sparks(x, 0.9, z, 16, c, 4.5, 0.16, 0.5, 1); shake(0.25); },
  kiri1(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.8, mz = z + Math.sin(a) * 0.8; conv3(mx, 1.1, mz, 1.2, 10, c, 0.22, 0.12); flash3(mx, 1.1, mz, 2.2, 0.22, c); vring3(mx, 1.1, mz, a, 0.15, 0.9, 0.3, c, 0.9); vring3(x + Math.cos(a) * 1.6, 1.1, z + Math.sin(a) * 1.6, a, 0.1, 0.6, 0.36, '#ffffff', 0.7); streak3(x, z, x + Math.cos(a) * 4, z + Math.sin(a) * 4, 0.3, 0.3, c, 1.0, 0.6); papers(mx, 1, mz, 5, 1.4); },
  kiri1w(e, x, z, c) { flash3(x, 0.8, z, 2, 0.25, c); ring3(x, z, 1.2, 0.2, 0.3, c, 0.9, true); papers(x, 0.6, z, 9, 2.4); sparks(x, 0.9, z, 8, '#ffffff', 3, 0.13, 0.4, 1); glint3(x, 1.2, z, 1.6, 0.3, '#ffffff'); },
  kiri1h(e, x, z, c) { const k = e.k || 0, s = 1 + k * 1.4; flash3(x, 1, z, 1.8 * s, 0.24 + k * 0.1, c); ring3(x, z, 0.2, 0.9 * s, 0.34, c, 0.95); xcut(x, 1.05, z, 1.8 * s, c, 0.28); sparks(x, 1, z, Math.round(8 + k * 18), c, 3 + k * 3, 0.15, 0.45, 1); glint3(x, 1.6, z, 1.2 * s, 0.35, '#ffffff'); papers(x, 1, z, Math.round(4 + k * 10), 2 + k * 2);
    if (k > 0.4) { pillar3(x, z, 0.4 * s, 3 + k * 2, 0.4, c, 0.6); sunburst3(x, z, 1.2 * s, 10, '#ffffff', 0.35, 0.1, 0.12); shake(0.15 + k * 0.25); } text3(x, 2.3, z, 'STUN ' + (e.dur || 0.5).toFixed(1) + 's', c, k > 0.5, 1.0); },
  kiri0j(e, x, z, c, h) { const C = kc(h, 1), x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id); ghost3(v, C, 0.4, 0.55); ring3(x, z, 0.3, 1.2, 0.3, C, 0.9); streak3(x, z, x1, z1, 0.8, 0.4, C, 0.5, 0.7); streak3(x, z, x1, z1, 0.2, 0.3, '#ffffff', 0.9, 0.5); sparks(x, 0.4, z, 8, C, 3, 0.14, 0.4, 1); },
  kiri0t(e, x, z, c, h) { const C = kc(h, 1), r = (e.r || 180) * S3; ring3(x, z, 0.3, r * 1.05, 0.36, C, 1); ring3(x, z, 0.2, r * 0.6, 0.26, '#ffffff', 0.7); decal3(GX.tex.swirl, x, z, r, 0.5, C, 0.6, { spin: -9, r0: r * 0.3 }); for (let i = 0; i < 3; i++) claws3(x, 0.9, z, i * 2.1 + 0.4, r * 1.5, C, 0.3); flash3(x, 0.8, z, r * 2, 0.24, C); sparks(x, 0.5, z, 16, C, 4.5, 0.16, 0.5, 1); smoke(x, 0.2, z, 6, '#c9b9a0', 0.9, 0.6, r * 0.7); shake(0.2); },
  kiri1t(e, x, z, c, h) { const C = kc(h, 1), a = e.ang, v = h && V.views.get(h.id), x1 = x + Math.cos(a) * 4.8, z1 = z + Math.sin(a) * 4.8; ghost3(v, C, 0.42, 0.55); later(0.1, () => { const w = h && V.views.get(h.id); if (w) ghost3(w, C, 0.36, 0.4); }); streak3(x, z, x1, z1, 1.0, 0.4, C, 0.6, 0.7); streak3(x, z, x1, z1, 0.25, 0.3, '#ffffff', 0.95, 0.55); for (const k of [-1, 1]) streak3(x - Math.sin(a) * k * 0.35, z + Math.cos(a) * k * 0.35, x1 - Math.sin(a) * k * 0.35, z1 + Math.cos(a) * k * 0.35, 0.1, 0.34, C, 0.9, 0.7); vring3(x + Math.cos(a) * 0.6, 1, z + Math.sin(a) * 0.6, a, 0.2, 1.0, 0.3, C, 0.8); },
  kiri1c(e, x, z, c, h) { const C = kc(h, 1); claws3(x, 1.0, z, e.ang, 2.4, C, 0.3); flash3(x, 1, z, 1.8, 0.2, C); sparks(x, 1, z, 9, C, 3.6, 0.14, 0.4, 1); },
  kiri2(e, x, z, c, h) { const C = kc(h, e.f), O = kc(h, e.f ? 0 : 1), v = h && V.views.get(h.id); ghost3(v, O, 0.5, 0.6); flash3(x, 1.5, z, 3.2, 0.3, C); flash3(x, 1.5, z, 1.6, 0.2, '#ffffff'); ring3(x, z, 0.3, 1.9, 0.42, C, 1); ring3(x, z, 1.8, 0.2, 0.3, O, 0.6, true); decal3(GX.tex.swirl, x, z, 1.5, 0.6, C, 0.7, { spin: e.f ? -11 : 9, r0: 0.4 }); pillar3(x, z, 0.55, 3.4, 0.4, C, 0.55);
    if (e.f) { sparks(x, 0.6, z, 18, C, 4.2, 0.17, 0.6, 2.4); rise3(x, z, 0.8, 12, C, 2.6, 0.6, 0.15); for (let i = 0; i < 3; i++) claws3(x, 1.3, z, i * 2.1, 2.4, C, 0.28); shake(0.15); } else { papers(x, 1.6, z, 16, 2.8); conv3(x, 1.4, z, 2, 14, C, 0.35, 0.13); glint3(x, 2.4, z, 2, 0.45, '#ffffff'); } },
  markx(e, x, z, c, h) { const C = kc(h, 1); flash3(x, 1.5, z, 1.6, 0.2, C); ring3(x, z, 0.2, 0.9, 0.26, C, 0.9); sparks(x, 1.4, z, 8, C, 3.4, 0.13, 0.4, 1.2); glint3(x, 1.8, z, 1.1, 0.26, '#ffffff'); },
  mark(e, x, z, c) { glint3(x, 2.0, z, 0.9, 0.3, c); },
  tavi0C(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; flash3(mx, 1.2, mz, 2.2, 0.2, c); vring3(mx, 1.15, mz, a, 0.1, 0.8, 0.28, c, 0.9); vring3(x + Math.cos(a) * 1.5, 1.15, z + Math.sin(a) * 1.5, a, 0.1, 0.5, 0.34, STAR2, 0.7); glint3(mx, 1.3, mz, 1.6, 0.3, '#ffffff'); stars3(mx, 1.1, mz, 8, c, 2.2, 0.5); starmap3(x, z, 0.9, 0.4, c, 6); },
  tavi0hC(e, x, z, c, h) { skyline3(x, z, c, 0.22, 0.3); flash3(x, 1, z, 2.4, 0.26, c); ring3(x, z, 0.2, 1.3, 0.32, c, 0.95); ring3(x, z, 1.2, 0.3, 0.3, STAR2, 0.6, true); starmap3(x, z, 1.1, 0.7, c, -4); stars3(x, 1, z, 14, c, 3.4, 0.6); twinkle(x, 1.4, z, 0.9, 5, c); markFx(e.tid, h, c, e.dur || 4); },
  tavi0bC(e, x, z, c, h) { const x0 = e.x0 * S3, z0 = e.y0 * S3, x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id);       // gone in a fold of stars, a line of light, and there
    ghost3(v, c, 0.5, 0.6, x0, z0); conv3(x0, 1.0, z0, 1.6, 16, c, 0.25, 0.14); starmap3(x0, z0, 1.0, 0.5, c, -8, { r0: 1.3 }); ring3(x0, z0, 1.1, 0.1, 0.26, c, 0.8, true); ghostTrail(v, c, x0, z0, x1, z1, 4);
    streak3(x0, z0, x1, z1, 0.9, 0.42, c, 0.6, 0.75); streak3(x0, z0, x1, z1, 0.4, 0.36, STAR2, 0.8, 0.55); streak3(x0, z0, x1, z1, 0.14, 0.3, '#ffffff', 1.0, 0.7); bolt3(x0, 1.1, z0, x1, 1.1, z1, '#ffffff', 0.05, 0.2, 0.18, 7);
    impactC(x, z, c, 1.25, false); xcut(x, 1.0, z, 3.2, c, 0.32); xcut(x, 1.0, z, 2.2, STAR2, 0.26); },
  tavi1C(e, x, z, c) { const a = e.ang; slash3(x, z, a, 0.46, 2.8, 0.32, c, 0.9, { thin: 1, op: 0.45 }); slash3(x, z, a, 0.46, 1.9, 0.38, STAR2, 1.0, { thin: 1, op: 0.3, edge: 0.5 }); starmap3(x, z, 1.2, 0.5, c, 7);
    for (let i = -2; i <= 2; i++) { const q = a + i * 0.17, cx = Math.cos(q), cz = Math.sin(q); glint3(x + cx * 1.0, 1.15, z + cz * 1.0, 1.1, 0.3, '#ffffff'); streak3(x + cx * 0.4, z + cz * 0.4, x + cx * 3.4, z + cz * 3.4, 0.1, 0.3, i % 2 ? STAR2 : c, 0.95, 0.6); } stars3(x + Math.cos(a) * 0.7, 1.1, z + Math.sin(a) * 0.7, 14, c, 3, 0.6); },
  tavi1rC(e, x, z, c) { ring3(x, z, 3.0, 0.3, 0.42, c, 0.9, true); ring3(x, z, 2.0, 0.2, 0.34, STAR2, 0.7, true); ring3(x, z, 1.2, 0.15, 0.26, '#ffffff', 0.6, true); starmap3(x, z, 1.8, 0.6, c, -9, { r0: 2.6 }); conv3(x, 1.0, z, 2.6, 22, c, 0.35, 0.15); glint3(x, 1.5, z, 2.2, 0.4, '#ffffff'); later(0.3, () => { flash3(x, 1.1, z, 2.6, 0.24, c); stars3(x, 1.1, z, 16, c, 3.2, 0.5); }); },
  tavi2C(e, x, z, c, h) { const x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id);       // he leaves as a comet
    ghost3(v, c, 0.55, 0.65); ring3(x, z, 0.3, 1.9, 0.42, c, 0.95); ring3(x, z, 0.2, 1.2, 0.3, '#ffffff', 0.7); starmap3(x, z, 1.6, 0.7, c, 9); pillar3(x, z, 0.26, 4.5, 0.36, c, 0.32); stars3(x, 0.7, z, 22, c, 4, 0.7); twinkle(x, 1.4, z, 1.2, 5, c);
    streak3(x, z, x1, z1, 1.3, 0.5, c, 0.5, 0.7); streak3(x, z, x1, z1, 0.6, 0.42, STAR2, 0.7, 0.55); streak3(x, z, x1, z1, 0.2, 0.34, '#ffffff', 0.95, 0.75); ghostTrail(v, c, x, z, x1, z1, 5); if (!e.again) glint3(x, 2.6, z, 2.6, 0.5, '#ffffff'); },
  tavi2lC(e, x, z, c) { impactC(x, z, c, (e.r || 190) * S3, true); slash3(x, z, 0, Math.PI, (e.r || 190) * S3, 0.34, c, 0.7, { op: 0.3, edge: 0.6 }); for (let i = 0; i < 3; i++) later(0.06 + i * 0.07, () => { const a = Math.random() * TAU, d = 0.8 + Math.random() * 1.2; starFall(x + Math.cos(a) * d, z + Math.sin(a) * d, i % 2 ? STAR2 : c); }); },
  taviPC(e, x, z, c, h) { cut3(x, 1.0, z, 3.8, 0.5, c, 0.32); cut3(x, 1.0, z, 3.8, -0.5, STAR2, 0.32); cut3(x, 1.0, z, 2.8, 0.5, '#ffffff', 0.24, 0.14); cut3(x, 1.0, z, 2.8, -0.5, '#ffffff', 0.24, 0.14); impactC(x, z, c, 1.2, false); for (let i = 0; i < 3; i++) later(0.05 * i, () => starFall(x + (Math.random() - .5) * 1.4, z + (Math.random() - .5) * 1.4, i % 2 ? STAR2 : c)); if (h) rise3(h.x * S3, h.y * S3, 0.5, 10, '#7dff9a', 1.8, 0.7); },
  hitC(e, x, z, c) { const ax = (e.ax || 0) * S3, az = (e.ay || 0) * S3, a = Math.atan2(z - az, x - ax); cut3(x, 1.0, z, e.big ? 2.8 : 2.0, (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5), c, 0.24); cut3(x, 1.0, z, 1.4, 0.2, '#ffffff', 0.18, 0.08); flash3(x, 1, z, e.big ? 1.9 : 1.2, 0.18, c); glint3(x + Math.cos(a) * 0.2, 1.3, z + Math.sin(a) * 0.2, e.big ? 1.6 : 1.0, 0.26, '#ffffff'); stars3(x, 1, z, e.big ? 12 : 6, c, 2.6, 0.45); if (e.big) ring3(x, z, 0.2, 1.0, 0.3, STAR2, 0.8); },
  castC(e, x, z, c) { starmap3(x, z, e.ult ? 2.6 : 1.3, e.ult ? 0.9 : 0.5, c, e.ult ? 6 : 4); ring3(x, z, 0.3, e.ult ? 2.4 : 1.2, 0.36, c, 0.8, true); if (e.ult) { skyline3(x, z, c, 0.3, 0.5, 0, 0.01); twinkle(x, 2.2, z, 1.6, 8, c); stars3(x, 1, z, 16, c, 3, 0.8); } },
  deathC(e, x, z, c) { starmap3(x, z, 1.8, 1.4, c, -6, { r0: 2.4, gk: 0.9, fout: 0.2 }); conv3(x, 1.0, z, 2.4, 26, c, 0.5, 0.16); later(0.45, () => { flash3(x, 1.2, z, 3.4, 0.4, '#ffffff'); pillar3(x, z, 0.5, 9, 0.9, c, 0.7); skyline3(x, z, c, 0.34, 0.8, 0, 0.01); rise3(x, z, 0.9, 40, c, 5, 1.1, 0.18); rise3(x, z, 0.6, 18, STAR2, 6.5, 0.9, 0.15); ring3(x, z, 0.3, 2.6, 0.6, c, 0.9); sunburst3(x, z, 2.2, 14, c, 0.5, 0.14, 0.12); twinkle(x, 2.4, z, 1.6, 10, c); shake(0.2); }); },
  tavi0(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; flash3(mx, 1.2, mz, 1.5, 0.18, c); vring3(mx, 1.15, mz, a, 0.1, 0.55, 0.26, c, 0.9); grit(mx, 1.1, mz, 5, c, 1.6); },
  tavi0h(e, x, z, c, h) { flash3(x, 1, z, 1.8, 0.22, c); ring3(x, z, 0.2, 1.0, 0.3, c, 0.9); sparks(x, 1, z, 8, c, 3, 0.14, 0.4, 1); glint3(x, 1.5, z, 1.4, 0.3, '#ffffff'); markFx(e.tid, h, c, e.dur || 3.5); },
  tavi0b(e, x, z, c, h) { const x0 = e.x0 * S3, z0 = e.y0 * S3, x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id);
    ghost3(v, c, 0.45, 0.55, x0, z0); grit(x0, 1.0, z0, 12, c, 2.2); ring3(x0, z0, 0.8, 0.15, 0.28, c, 0.7, true); streak3(x0, z0, x1, z1, 0.6, 0.38, c, 0.6, 0.75); streak3(x0, z0, x1, z1, 0.16, 0.28, '#ffffff', 0.95, 0.6);
    xcut(x, 1.0, z, 2.6, c, 0.3); flash3(x, 1, z, 2.4, 0.24, c); ring3(x, z, 0.2, 1.2, 0.34, c, 0.9); sparks(x, 0.9, z, 12, c, 3.6, 0.15, 0.4, 1); grit(x, 1.2, z, 8, '#ffffff', 2.4); },
  tavi1(e, x, z, c) { const a = e.ang; slash3(x, z, a, 0.44, 2.6, 0.3, c, 0.9, { thin: 1, op: 0.4 }); slash3(x, z, a, 0.44, 1.6, 0.36, '#ffffff', 1.0, { thin: 1, op: 0.25, edge: 0.5 });
    for (let i = -2; i <= 2; i++) { const q = a + i * 0.17; glint3(x + Math.cos(q) * 1.0, 1.15, z + Math.sin(q) * 1.0, 0.9, 0.28, '#ffffff'); } grit(x + Math.cos(a) * 0.6, 1.1, z + Math.sin(a) * 0.6, 8, c, 2.6); },
  tavi1r(e, x, z, c) { ring3(x, z, 2.2, 0.3, 0.4, c, 0.85, true); ring3(x, z, 1.4, 0.2, 0.3, '#ffffff', 0.5, true); glint3(x, 1.4, z, 1.6, 0.35, '#ffffff'); conv3(x, 1.0, z, 1.8, 10, c, 0.35, 0.14); },
  tavi2(e, x, z, c, h) { const x1 = e.x1 * S3, z1 = e.y1 * S3, v = h && V.views.get(h.id); ghost3(v, c, 0.5, 0.6); ring3(x, z, 0.3, 1.5, 0.4, c, 0.9); decal3(GX.tex.swirl, x, z, 1.3, 0.5, c, 0.7, { spin: 9, r0: 0.4 }); grit(x, 0.8, z, 16, c, 3.2); grit(x, 1.2, z, 8, '#ffffff', 2.4);
    streak3(x, z, x1, z1, 0.9, 0.42, c, 0.5, 0.7); streak3(x, z, x1, z1, 0.25, 0.32, '#ffffff', 0.9, 0.55); if (!e.again) glint3(x, 2.4, z, 2, 0.45, '#ffffff'); },
  tavi2l(e, x, z, c) { const r = e.r * S3; slash3(x, z, 0, Math.PI, r, 0.32, c, 0.7, { op: 0.32, edge: 0.6 }); later(0.05, () => slash3(x, z, 0, Math.PI, r * 0.7, 0.3, '#ffffff', 1.1, { thin: 1, op: 0.3, edge: 0.5 })); ring3(x, z, 0.3, r * 1.05, 0.4, c, 0.9); decal3(GX.tex.swirl, x, z, r, 0.55, c, 0.6, { spin: -10, r0: r * 0.3 });
    grit(x, 0.6, z, 22, c, 4.2); grit(x, 0.9, z, 10, '#ffffff', 3); sparks(x, 0.5, z, 10, c, r * 2.4, 0.15, 0.45, 1); smoke(x, 0.1, z, 5, '#d8cfb4', 0.5, 0.5, 0.5); FX.shake = Math.max(FX.shake, 0.1); },
  taviP(e, x, z, c, h) { cut3(x, 1.0, z, 3.2, 0.5, c, 0.3); cut3(x, 1.0, z, 2.6, 0.5, '#ffffff', 0.24, 0.14); flash3(x, 1, z, 2.6, 0.24, c); ring3(x, z, 0.2, 1.3, 0.36, c, 0.9); glint3(x, 1.6, z, 2.0, 0.4, '#ffffff'); grit(x, 1.1, z, 14, c, 3.4); if (h) rise3(h.x * S3, h.y * S3, 0.5, 10, '#7dff9a', 1.8, 0.7); },
  /* the built-in heal */
  mend(e, x, z, c) { ring3(x, z, 0.3, 1.5, 0.5, c, 0.9); ring3(x, z, 0.2, 1.15, 0.6, MEND.c2, 0.8, true); decal3(GX.tex.rune, x, z, 1.25, 0.9, c, 0.75, { spin: 2, r0: 0.4 }); pillar3(x, z, 0.6, 3.0, 0.8, c, 0.4); rise3(x, z, 0.7, 22, c, 2.0, 1.0, 0.15); rise3(x, z, 0.5, 12, MEND.c2, 1.7, 1.0, 0.13);       /* green for health, blue for the mana that comes with it */ for (let i = 0; i < 3; i++) later(i * 0.1, () => glint3(x + (Math.random() - .5) * 0.9, 0.9 + Math.random() * 1.4, z + (Math.random() - .5) * 0.9, 1.0, 0.45, '#ffffff')); },
  /* Lyra */
  lyra0c(e, x, z, c) { const mx = x + Math.cos(e.ang) * 0.7, mz = z + Math.sin(e.ang) * 0.7; flash3(mx, 1.5, mz, 1.8, 0.22, c); vring3(mx, 1.3, mz, e.ang, 0.15, 0.7, 0.3, c, 0.9); glint3(mx, 1.5, mz, 1.2, 0.3, '#ffffff'); },
  lyra0(e, x, z, c) { const r = e.r * S3; decal3(GX.tex.rune, x, z, r, 0.55, c, 0.9, { spin: 5, r0: r * 0.3, gk: 0.3 }); disc3(x, z, r * 0.3, r, 0.4, c, 0.2, true); ring3(x, z, r * 0.3, r * 1.05, 0.4, c, 0.9); flash3(x, 0.8, z, r * 1.25, 0.26, c);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.random() * 0.6; bolt3(x, 0.8, z, x + Math.cos(a) * r * 0.95, 0.15 + Math.random() * 0.5, z + Math.sin(a) * r * 0.95, c, 0.034, 0.26, 0.22, 5); }
    glint3(x, 1.0, z, 2.4, 0.4, '#ffffff'); sparks(x, 0.6, z, 14, c, r * 3, 0.16, 0.5, 0.9); },
  lyra1(e, x, z, c) { const r = e.r * S3; frostBurst(x, z, r, c); decal3(GX.tex.frost, x, z, r, 1.7, lite(c, 0.3), 0.9, { fin: 0.04, fout: 0.5, r0: r * 0.6, gk: 0.08 }); ring3(x, z, r * 0.3, r * 1.03, 0.45, c, 0.9); ring3(x, z, r * 0.2, r * 0.8, 0.6, '#ffffff', 0.5, true);
    flash3(x, 0.5, z, r * 1.4, 0.25, c); smoke(x, 0.1, z, 9, '#e8f8ff', r * 0.5, 0.9, r * 0.7); sparks(x, 0.4, z, 14, '#ffffff', r * 2.4, 0.14, 0.6, 1.4); FX.shake = Math.max(FX.shake, 0.12); },
  lyra2c(e, x, z, c) { pillar3(x, z, 0.5, 5, 0.6, c, 0.5); flash3(x, 2.2, z, 2.4, 0.35, c); glint3(x, 2.5, z, 2, 0.5, '#ffffff'); },
  /* Zephyr */
  zephyr0(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.8, mz = z + Math.sin(a) * 0.8; for (let i = 0; i < 3; i++) later(i * 0.04, () => vring3(mx + Math.cos(a) * i * 0.5, 1.15, mz + Math.sin(a) * i * 0.5, a, 0.15, 0.6 + i * 0.25, 0.3, c, 0.85)); flash3(mx, 1.2, mz, 1.8, 0.2, c); ring3(x, z, 0.3, 1.0, 0.3, c, 0.6, true); },
  zephyr1(e, x, z, c) { const r = e.r * S3; ring3(x, z, r * 1.2, r * 0.3, 0.35, c, 0.8, true); flash3(x, 1, z, r * 1.2, 0.25, c); smoke(x, 0.1, z, 6, '#dff6ff', 0.6, 0.6, r * 0.6); },
  zephyr2c(e, x, z, c) { decal3(GX.tex.rune, x, z, 1.5, 0.7, c, 0.85, { spin: -6, r0: 0.5 }); ring3(x, z, 1.8, 0.3, 0.55, c, 0.8, true); },
  /* Orin */
  orin0(e, x, z, c) { ring3(x, z, 1.9, 0.5, 0.32, c, 0.9, true); ring3(x, z, 0.3, 1.5, 0.4, c, 0.8); decal3(GX.tex.swirl, x, z, 1.5, 0.6, c, 0.8, { spin: 9, r0: 0.5 }); for (let i = 0; i < 3; i++) later(i * 0.07, () => ring3(x, z, 0.78, 0.6, 0.3, '#ffffff', 0.7, true, 0.3 + i * 0.6)); rise3(x, z, 0.7, 14, c, 2.6, 0.6, 0.13); dome3(x, z, 1.05, 0.45, c, 0.5, { sy: 1.25 }); glint3(x, 2.0, z, 1.4, 0.35, '#ffffff'); },
  orin1(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; flash3(mx, 1.2, mz, 1.8, 0.18, c); for (let i = 0; i < 3; i++) later(i * 0.05, () => vring3(mx + Math.cos(a) * i * 0.6, 1.15, mz + Math.sin(a) * i * 0.6, a, 0.1, 0.55 + i * 0.3, 0.28, c, 0.9)); streak3(x, z, x + Math.cos(a) * 3.4, z + Math.sin(a) * 3.4, 0.4, 0.3, '#ffffff', 1.1, 0.5); smoke(x, 0.1, z, 3, '#d8cfb4', 0.4, 0.4, 0.3); },
  orin2(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; slash3(x, z, a, 0.3, 2.2, 0.36, c, 0.08, { op: 0.5, flat: 1 }); for (let i = 0; i < 3; i++) later(i * 0.04, () => vring3(mx + Math.cos(a) * i * 0.5, 1.15, mz + Math.sin(a) * i * 0.5, a, 0.2, 0.8 + i * 0.4, 0.3, i % 2 ? '#8fd04a' : c, 0.85)); flash3(mx, 1.2, mz, 2.4, 0.22, c); glint3(mx, 1.3, mz, 1.8, 0.35, '#ffffff'); rise3(x, z, 0.6, 8, '#8fd04a', 1.8, 0.5, 0.12); },
  orin2h(e, x, z, c) { brambleLatch(e.tid, c, Math.max(0.3, e.dur || 0.9), !!e.held); flash3(x, 1, z, 2.2, 0.22, c); ring3(x, z, 1.5, 0.4, 0.26, '#8fd04a', 0.9, true); sparks(x, 0.9, z, 10, '#a8d86a', 3.2, 0.13, 0.4, 1); },
  orin2x(e, x, z, c) { brambleBurst(x, z, (e.r || 250) * S3, c); },
  orin1m(e, x, z, c, h) { huntMark(e.tid, e.id, c, e.dur || 4, e.until); glint3(x, 2.0, z, 1.0, 0.3, c); },
  orin1x(e, x, z, c) { flash3(x, 1.3, z, 1.9, 0.2, c); ring3(x, z, 0.2, 1.1, 0.28, c, 0.95, false, 0.9); glint3(x, 1.9, z, 1.5, 0.3, '#ffffff'); sparks(x, 1.3, z, 9, c, 3.6, 0.13, 0.4, 1.1); },
  mira0(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; slash3(x, z, a, 0.24, 1.8, 0.3, c, 0.08, { op: 0.5, flat: 1 }); vring3(mx, 1.15, mz, a, 0.12, 0.6, 0.26, c, 0.9); flash3(mx, 1.2, mz, 1.6, 0.18, c); },
  mira1c(e, x, z) { tossFx(e.x0 * S3, e.y0 * S3, x, z, 0.28); },
  mira1(e, x, z, c) { const r = e.r * S3; snapFx(x, z, c, 1.3); ring3(x, z, r * 0.3, r, 0.4, c, 0.9); decal3(GX.tex.mark, x, z, r, 0.8, c, 0.8, { spin: 2, r0: r * 0.5 }); smoke(x, 0.1, z, 7, '#cfc6b0', 0.6, 0.6, r * 0.5); debris(x, 0.1, z, 6, '#7a7468', 2.4, 0.15, 0.5); sparks(x, 0.4, z, 12, c, 3.4, 0.15, 0.5, 1.2); FX.shake = Math.max(FX.shake, 0.08); },
  mira2(e, x, z, c) { decal3(GX.tex.mark, x, z, 1.7, 1.0, c, 0.9, { spin: 2.5, r0: 0.5 }); ring3(x, z, 0.3, 1.8, 0.5, c, 0.9); pillar3(x, z, 0.6, 3.6, 0.7, c, 0.45); rise3(x, z, 0.8, 14, lite(c), 2, 0.9); for (let i = 0; i < 3; i++) later(i * 0.1, () => glint3(x + (i - 1) * 0.5, 2.6 + (i % 2) * 0.3, z, 1.3, 0.45, '#ffffff')); },
  /* Sera */
  sera0(e, x, z, c) { const r = e.r * S3; decal3(GX.tex.rune, x, z, r, 1.0, c, 0.85, { spin: 1.6, r0: r * 0.4 }); pillar3(x, z, r * 0.7, 3.2, 0.9, c, 0.3); ring3(x, z, r * 0.3, r, 0.5, c, 0.9); rise3(x, z, r * 0.9, 30, lite(c), 1.9, 1.0, 0.15);
    for (let i = 0; i < 3; i++) later(i * 0.12, () => glint3(x + (Math.random() - .5) * r, 0.8 + Math.random() * 1.6, z + (Math.random() - .5) * r, 1.1, 0.45, '#ffffff')); },
  sera1(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.7, mz = z + Math.sin(a) * 0.7; flash3(mx, 1.4, mz, 1.6, 0.2, c); vring3(mx, 1.2, mz, a, 0.12, 0.6, 0.28, c, 0.9); },
  sera1h(e, x, z, c) { bindFx(x, z, c, Math.max(0.4, e.dur || 1.2)); flash3(x, 1, z, 2.2, 0.25, c); sparks(x, 1, z, 10, c, 3, 0.14, 0.45, 1); },
  sera2(e, x, z, c) { const r = e.r * S3, P = e.pts || []; decal3(GX.tex.rune, x, z, r, 1.5, c, 0.8, { spin: 0.8, r0: r * 0.2, gk: 0.3 }); ring3(x, z, r * 0.2, r, 0.6, c, 0.9); ring3(x, z, r * 0.15, r * 0.9, 0.8, '#ffffff', 0.5, true); pillar3(x, z, 1.1, 5, 1.0, c, 0.5); flash3(x, 1.6, z, 5, 0.4, c);
    cut3(x - 1.0, 2.1, z, 3.4, 0.55, '#ffffff', 0.7, 0.9); cut3(x + 1.0, 2.1, z, 3.4, -0.55, '#ffffff', 0.7, 0.9);      // a pair of wings of light
    rise3(x, z, r * 0.9, 46, lite(c), 2.2, 1.2, 0.16);
    for (let i = 0; i < P.length; i += 2) { const px = P[i] * S3, pz = P[i + 1] * S3; pillar3(px, pz, 0.6, 3.6, 0.9, c, 0.5); ring3(px, pz, 0.2, 1.1, 0.5, c, 0.9); glint3(px, 2.5, pz, 1.5, 0.5, '#ffffff'); } },
  /* Miel */
  miel0(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.75, mz = z + Math.sin(a) * 0.75; flash3(mx, 1.5, mz, 1.5, 0.2, c); vring3(mx, 1.2, mz, a, 0.14, 0.7, 0.3, c, 0.9);       // the swarm leaving the skep
    for (let i = 0; i < 14; i++) { const q = a + (Math.random() - .5) * 0.9, sp = 3 + Math.random() * 5; FX.add.emit(mx, 1.0 + Math.random() * 0.6, mz, Math.cos(q) * sp, (Math.random() - .3) * 1.4, Math.sin(q) * sp, 0.35 + Math.random() * 0.2, 0.11, 0.02, Math.random() < 0.35 ? '#ffffff' : c, 1, 0, 1.5); } },
  miel0a(e, x, z, c) { ring3(x, z, 0.15, 0.85, 0.4, c, 0.8); rise3(x, z, 0.45, 12, lite(c), 1.7, 0.8, 0.12); glint3(x, 1.7, z, 1.0, 0.4, '#ffffff'); },       // honey left on a friend
  miel1(e, x, z, c) { const r = e.r * S3; dome3(x, z, r, 0.8, c, 0.38, { sy: 0.4 }); ring3(x, z, r * 0.25, r, 0.45, c, 0.9); decal3(GX.tex.comb, x, z, r, 0.7, c, 0.8, { r0: r * 0.5 }); rise3(x, z, r * 0.85, 22, lite(c), 1.6, 0.9, 0.13);       // the comb coming up out of the ground
    for (let i = 0; i < 3; i++) later(i * 0.1, () => glint3(x + (Math.random() - .5) * r, 0.5 + Math.random() * 0.8, z + (Math.random() - .5) * r, 1.0, 0.4, '#ffffff')); },
  miel2h(e, x, z, c) { flash3(x, 1.0, z, 1.8, 0.2, c); sparks(x, 1.0, z, 8, c, 3, 0.1, 0.3, 1); ring3(x, z, 0.9, 0.2, 0.28, c, 0.8, true, 0.6); },       // stung as the hive burst out
  miel2(e, x, z, c) { const r = e.r * S3; flash3(x, 1.4, z, 4.5, 0.35, c); ring3(x, z, 0.3, r, 0.55, c, 0.9); ring3(x, z, 0.2, r * 0.8, 0.8, '#ffffff', 0.45, true); pillar3(x, z, 0.9, 4.2, 0.8, c, 0.4); decal3(e.q ? GX.tex.comb : GX.tex.swirl, x, z, r, 1.1, c, 0.6, { spin: -3, r0: r * 0.3 });       // the whole hive out at once
    if (e.q) { later(0.12, () => ring3(x, z, r * 0.3, r * 1.05, 0.5, '#ffffff', 0.5, true, 0.5)); glint3(x, 3.0, z, 2.2, 0.6, '#fff4c8'); FX.shake = Math.max(FX.shake, 0.08); }
    for (let i = 0; i < 40; i++) { const q = Math.random() * TAU, sp = 3 + Math.random() * 5; FX.add.emit(x, 0.8 + Math.random() * 1.2, z, Math.cos(q) * sp - Math.sin(q) * 2.5, 0.5 + Math.random() * 1.5, Math.sin(q) * sp + Math.cos(q) * 2.5, 0.5 + Math.random() * 0.3, 0.13, 0.02, Math.random() < 0.3 ? '#ffffff' : c, 1, 0, 1.2); }
    FX.shake = Math.max(FX.shake, 0.1); },
  /* Hesta */
  lyra2r(e, x, z, c) {       // a Starfall has taken hold of somebody
    starBind(e.tid, c, e.dur || 2); flash3(x, 1.0, z, 2.6, 0.25, c); pillar3(x, z, 0.5, 3.4, 0.45, c, 0.45); ring3(x, z, 1.9, 0.5, 0.3, c, 0.9, true, 0.1); glint3(x, 2.4, z, 1.5, 0.4, '#ffffff'); sparks(x, 0.3, z, 10, c, 2.2, 0.13, 0.5, 2.2, -1);
    if (UI.state === 'play') snd('ice', 0.5); if (V.me && e.tid === V.me.id) text3(x, 3.0, z, 'STARBOUND', c, true, 1.1); },
  sorrel0(e, x, z, c) {       // Fade Out: the cape drawn over, and the air closes where she stood
    ring3(x, z, 1.5, 0.3, 0.32, c, 0.7, true, 0.1); ring3(x, z, 1.1, 0.2, 0.42, '#ffffff', 0.4, true, 0.6); smoke(x, 0.2, z, 6, '#cfd8cc', 0.7, 0.6, 0.5);
    for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, r = 0.9 + Math.random() * 0.6; FX.alpha.emit(x + Math.cos(a) * r, 0.2 + Math.random() * 1.4, z + Math.sin(a) * r, -Math.cos(a) * 1.9, 0.3, -Math.sin(a) * 1.9, 0.45, 0.1, 0.04, i % 3 ? '#b9a8c8' : '#dfe6c8', 0.85, 0.3, 1); } },
  sorrel1(e, x, z, c) {       // Blast Charge: thrown low, it bursts in a fan before her
    const a = e.ang, r = e.r * S3, ca = Math.cos(a), sa = Math.sin(a), mx = x + ca * r * 0.5, mz = z + sa * r * 0.5;
    slash3(x, z, a, NADE_A, r, 0.34, c, 0.08, { op: 0.34, flat: 1 }); later(0.03, () => slash3(x, z, a, NADE_A, r * 1.04, 0.26, '#ffffff', 0.1, { thin: 1, op: 0.3, edge: 0.75 }));
    flash3(mx, 0.8, mz, 4.2, 0.26, '#ffe2b0'); flash3(mx, 0.8, mz, 2.4, 0.18, '#ffffff'); ring3(mx, mz, 0.3, r * 0.55, 0.35, c, 0.9); scorch3(mx, mz, r * 0.42, 2.4);
    smoke(mx, 0.3, mz, 10, '#8a8f96', 0.9, 0.9, 0.9); sparks(mx, 0.6, mz, 18, c, 5, 0.18, 0.5, 1.2, 5); debris(mx, 0.3, mz, 10, '#7a5c3a', 3.2, 0.2, 0.7); streak3(x, z, mx, mz, 0.12, 0.14, '#ffe9b0', 0.9, 0.9); FX.shake = Math.max(FX.shake, 0.16); },
  sorrel1h(e, x, z, c) { flash3(x, 1.0, z, 1.6, 0.18, c); sparks(x, 1.0, z, 7, '#ffe2b0', 3.4, 0.13, 0.35, 1); smoke(x, 0.2, z, 3, '#d8cfb4', 0.4, 0.4, 0.3); },
  halvar0(e, x, z, c) {       // Echoes: the air beside him tears, and there are three of him
    ring3(x, z, 0.3, 2.0, 0.34, c, 0.8, true); flash3(x, 1.0, z, 2.2, 0.18, c);
    for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, r = 0.6 + Math.random() * 0.8; bolt3(x, 1.0, z, x + Math.cos(a) * r, 0.2 + Math.random() * 1.4, z + Math.sin(a) * r, c, 0.05, 0.16, 0.25, 4); } },
  halvar1(e, x, z, c) {       // Stormknuckle: he goes in behind his fist
    const a = e.ang, ca = Math.cos(a), sa = Math.sin(a), d = FIST_D * S3; vring3(x + ca * 0.4, 1.0, z + sa * 0.4, a, 0.25, 0.9, 0.22, c, 0.8); streak3(x, z, x + ca * d, z + sa * d, 0.5, 0.22, c, 0.9, 0.6); },
  halvar1h(e, x, z, c) {       // and it lands: thunder at arm's length
    const a = e.ang, ca = Math.cos(a), sa = Math.sin(a); flash3(x, 1.1, z, 3.4, 0.2, '#ffffff'); flash3(x, 1.1, z, 2.2, 0.26, c); ring3(x, z, 0.3, 1.9, 0.3, c, 0.9); vring3(x, 1.1, z, a, 0.3, 1.5, 0.24, '#ffffff', 0.8);
    for (let i = 0; i < 6; i++) { const q = a + (Math.random() - 0.5) * 1.6, r = 1.0 + Math.random() * 1.3; bolt3(x, 1.1, z, x + Math.cos(q) * r, 0.2 + Math.random() * 1.6, z + Math.sin(q) * r, i % 2 ? '#ffffff' : c, 0.06, 0.2, 0.22, 5); }
    streak3(x, z, x + ca * FIST_PUSH * S3, z + sa * FIST_PUSH * S3, 0.6, 0.25, '#ffffff', 0.6, 0.5); sparks(x, 1.1, z, 14, c, 5, 0.16, 0.4, 1); FX.shake = Math.max(FX.shake, 0.2); },
  halvar2(e, x, z, c) {       // the ram comes out of him: the storm comes down where he stands
    pillar3(x, z, 1.5, 6.5, 0.6, c, 0.7); ring3(x, z, 0.4, 3.4, 0.5, c, 0.9); ring3(x, z, 0.3, 2.2, 0.36, '#ffffff', 0.8, true); flash3(x, 1.4, z, 5.5, 0.3, '#ffffff'); scorch3(x, z, 1.5, 2.5);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + Math.random() * 0.5, r = 0.5 + Math.random() * 1.6; later(i * 0.03, () => bolt3(x + Math.cos(a) * r * 0.3, 7, z + Math.sin(a) * r * 0.3, x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r, i % 2 ? '#ffffff' : c, 0.09, 0.22, 0.14, 8)); }
    smoke(x, 0.3, z, 10, '#cfc8e0', 1.0, 0.8, 1.0); sparks(x, 1.0, z, 22, c, 5.5, 0.18, 0.6, 1.4, 4); FX.shake = Math.max(FX.shake, 0.3); },
  /* the Starherd's own: */
  halvar0S(e, x, z, c) { ring3(x, z, 0.3, 2.0, 0.34, c, 0.8, true); starmap3(x, z, 1.5, 0.6, c, 5); flash3(x, 1.0, z, 2.0, 0.18, c); glint3(x, 1.3, z, 1.8, 0.3, '#ffffff'); twinkle(x, 1.1, z, 1.4, 6, c); dustS(x, 1.0, z, 10, c, 2.4, 0.5); },       // Echoes: three of him out of one patch of sky
  halvar1S(e, x, z, c) { const a = e.ang, ca = Math.cos(a), sa = Math.sin(a), d = FIST_D * S3; vring3(x + ca * 0.4, 1.0, z + sa * 0.4, a, 0.25, 0.9, 0.22, c, 0.8); streak3(x, z, x + ca * d, z + sa * d, 0.5, 0.24, c, 0.9, 0.6); for (let i = 1; i <= 3; i++) later(i * 0.035, () => glint3(x + ca * d * i / 3.4, 1.0 + (i % 2) * 0.3, z + sa * d * i / 3.4, 0.8, 0.26, i % 2 ? '#ffffff' : c)); },       // Stormknuckle: a falling star, level
  halvar1hS(e, x, z, c) { const a = e.ang, ca = Math.cos(a), sa = Math.sin(a); flash3(x, 1.1, z, 3.4, 0.2, '#ffffff'); flash3(x, 1.1, z, 2.2, 0.26, c); ring3(x, z, 0.3, 1.9, 0.3, c, 0.9); vring3(x, 1.1, z, a, 0.3, 1.5, 0.24, '#ffffff', 0.8);
    sunburst3(x, z, 1.9, 9, c, 0.32, 0.1, 0.12); glint3(x, 1.2, z, 2.8, 0.34, '#ffffff'); twinkle(x, 1.2, z, 1.2, 5, c); starmap3(x, z, 1.2, 0.5, STAR_S, -5);
    streak3(x, z, x + ca * FIST_PUSH * S3, z + sa * FIST_PUSH * S3, 0.6, 0.25, '#ffffff', 0.6, 0.5); dustS(x, 1.1, z, 16, c, 4.6, 0.6); FX.shake = Math.max(FX.shake, 0.2); },
  halvar2S(e, x, z, c) {       // the Ram comes down out of the sky: a line of light to where he stands, and the star-map opens under him
    skyline3(x, z, c, 0.55, 0.5, 2.2, -1.6); pillar3(x, z, 1.3, 6.5, 0.6, c, 0.5); starmap3(x, z, 3.0, 1.2, c, 3, { r0: 0.6 }); ring3(x, z, 0.4, 3.4, 0.5, c, 0.9); ring3(x, z, 0.3, 2.2, 0.36, '#ffffff', 0.8, true); later(0.1, () => ring3(x, z, 0.5, 4.0, 0.6, STAR_S, 0.5, true));
    flash3(x, 1.4, z, 5.5, 0.3, '#ffffff'); glint3(x, 1.8, z, 4.2, 0.5, '#ffffff'); sunburst3(x, z, 3.0, 12, c, 0.5, 0.14, 0.12); twinkle(x, 1.6, z, 2.2, 12, c); dustS(x, 1.0, z, 30, c, 5.2, 0.9); FX.shake = Math.max(FX.shake, 0.3); },
  halvar0bS(e, x, z, c) { const a = e.ang, ca = Math.cos(a), sa = Math.sin(a), d = CHARGE_D * S3; vring3(x + ca * 0.5, 1.1, z + sa * 0.5, a, 0.4, 1.4, 0.28, c, 0.7); streak3(x, z, x + ca * d, z + sa * d, 1.1, 0.42, c, 0.08, 0.45); streak3(x, z, x + ca * d, z + sa * d, 0.4, 0.5, STAR_S, 0.1, 0.4); for (let i = 1; i <= 5; i++) later(i * 0.05, () => glint3(x + ca * d * i / 5.5 + (Math.random() - .5) * 0.6, 0.5 + Math.random() * 1.2, z + sa * d * i / 5.5 + (Math.random() - .5) * 0.6, 0.7 + Math.random() * 0.5, 0.3, i % 2 ? '#ffffff' : c)); dustS(x, 0.4, z, 8, c, 2.4, 0.5); },       // Headlong
  halvar0hS(e, x, z, c) { flash3(x, 1.0, z, 2.2, 0.18, '#ffffff'); glint3(x, 1.1, z, 1.6, 0.28, '#ffffff'); dustS(x, 1.0, z, 9, c, 3.8, 0.45); ring3(x, z, 0.2, 1.1, 0.24, c, 0.8, true); FX.shake = Math.max(FX.shake, 0.12); },
  halvar1bS(e, x, z, c) {       // Thunderbleat: the bellow goes out as a fan of starlight
    const a = e.ang, r = e.r * S3, h = e.a, ca = Math.cos(a), sa = Math.sin(a);
    slash3(x, z, a, h, r, 0.36, c, 0.08, { op: 0.3, flat: 1 }); later(0.04, () => slash3(x, z, a, h, r * 1.03, 0.3, '#ffffff', 0.1, { thin: 1, op: 0.3, edge: 0.8 })); later(0.1, () => slash3(x, z, a, h, r * 0.7, 0.3, STAR_S, 0.1, { thin: 1, op: 0.25, edge: 0.6 }));
    for (let i = 0; i < 3; i++) later(i * 0.07, () => vring3(x + ca * (0.6 + i * 1.1), 1.3, z + sa * (0.6 + i * 1.1), a, 0.4 + i * 0.3, 1.2 + i * 0.6, 0.3, i ? c : '#ffffff', 0.7));
    for (let i = 0; i < 9; i++) { const q = a + (Math.random() - 0.5) * 2 * h, d = r * (0.3 + Math.random() * 0.65); later(0.04 + d / r * 0.16, () => glint3(x + Math.cos(q) * d, 0.5 + Math.random() * 1.3, z + Math.sin(q) * d, 0.7 + Math.random() * 0.7, 0.3, i % 3 ? c : '#ffffff')); }
    FX.shake = Math.max(FX.shake, 0.14); },
  halvar2jS(e, x, z, c) { const tx = e.x1 * S3, tz = e.y1 * S3, R = SKY_AOE * S3; ring3(x, z, 0.4, 1.8, 0.3, c, 0.7); dustS(x, 0.4, z, 12, c, 3, 0.6); starmap3(tx, tz, R, 0.6, c, 4, { r0: R * 0.8 }); ring3(tx, tz, R, R * 0.25, 0.55, c, 0.75, true); ring3(tx, tz, R, R, 0.55, c, 0.4, true); },       // Skybreaker: up among them
  halvar2lS(e, x, z, c) {       // and down, as a star comes down
    const r = e.r * S3; skyline3(x, z, c, 0.5, 0.4); flash3(x, 1.0, z, r * 2.6, 0.3, '#ffffff'); flash3(x, 0.8, z, r * 3.2, 0.4, c); ring3(x, z, r * 0.2, r * 1.05, 0.42, c, 0.95); ring3(x, z, r * 0.1, r * 0.8, 0.3, '#ffffff', 0.8, true); later(0.08, () => ring3(x, z, 0.3, r * 1.3, 0.5, STAR_S, 0.55, true));
    sunburst3(x, z, r * 1.3, 16, c, 0.42, 0.16, 0.12); sunburst3(x, z, r * 0.8, 9, '#ffffff', 0.3, 0.09, 0.14); starmap3(x, z, r * 1.05, 0.9, c, 5); pillar3(x, z, r * 0.4, 5, 0.45, c, 0.55); decal3(GX.tex.crack, x, z, r * 1.0, 1.6, c, 0.8, { r0: r * 0.6, gk: 0.1, fout: 0.6 }); scorch3(x, z, r * 0.7, 3);
    dustS(x, 0.6, z, 34, c, 5.5, 0.8); twinkle(x, 1.2, z, r, 8, c); debris(x, 0.3, z, 10, '#3a3f6a', 4.2, 0.22, 0.9); FX.shake = Math.max(FX.shake, 0.4); },
  halvar0b(e, x, z, c) { const a = e.ang, ca = Math.cos(a), sa = Math.sin(a), d = CHARGE_D * S3; vring3(x + ca * 0.5, 1.1, z + sa * 0.5, a, 0.4, 1.4, 0.28, c, 0.7); streak3(x, z, x + ca * d, z + sa * d, 1.1, 0.4, c, 0.08, 0.45); smoke(x, 0.2, z, 6, '#d8cfb4', 0.7, 0.5, 0.6); debris(x, 0.2, z, 6, '#7a6a52', 2.6, 0.18, 0.6); },       // Headlong
  halvar0h(e, x, z, c) { flash3(x, 1.0, z, 2.2, 0.18, '#ffffff'); sparks(x, 1.0, z, 9, c, 4.2, 0.15, 0.4, 1.3); ring3(x, z, 0.2, 1.1, 0.24, c, 0.8, true); FX.shake = Math.max(FX.shake, 0.12); },
  halvar1b(e, x, z, c) {       // Thunderbleat: the bellow goes out before him, and the storm with it
    const a = e.ang, r = e.r * S3, h = e.a, ca = Math.cos(a), sa = Math.sin(a);
    slash3(x, z, a, h, r, 0.36, c, 0.08, { op: 0.3, flat: 1 }); later(0.04, () => slash3(x, z, a, h, r * 1.03, 0.3, '#ffffff', 0.1, { thin: 1, op: 0.3, edge: 0.8 }));
    for (let i = 0; i < 3; i++) later(i * 0.07, () => vring3(x + ca * (0.6 + i * 1.1), 1.3, z + sa * (0.6 + i * 1.1), a, 0.4 + i * 0.3, 1.2 + i * 0.6, 0.3, i ? c : '#ffffff', 0.7));
    for (let i = 0; i < 5; i++) { const q = a + (Math.random() - 0.5) * 2 * h, d = r * (0.4 + Math.random() * 0.55); bolt3(x + ca * 0.6, 1.4, z + sa * 0.6, x + Math.cos(q) * d, 0.1, z + Math.sin(q) * d, i % 2 ? '#ffffff' : c, 0.06, 0.2, 0.2, 6); }
    FX.shake = Math.max(FX.shake, 0.14); },
  halvar2j(e, x, z, c) { const tx = e.x1 * S3, tz = e.y1 * S3, R = SKY_AOE * S3; ring3(x, z, 0.4, 1.8, 0.3, '#d8cfb4', 0.7); smoke(x, 0.2, z, 8, '#d8cfb4', 0.8, 0.5, 0.8); debris(x, 0.2, z, 8, '#7a6a52', 3, 0.2, 0.6); ring3(tx, tz, R, R * 0.25, 0.55, c, 0.75, true); ring3(tx, tz, R, R, 0.55, c, 0.4, true); },       // Skybreaker: off the ground, and where he will come down
  halvar2l(e, x, z, c) {       // and down
    const r = e.r * S3; flash3(x, 1.0, z, r * 2.6, 0.3, '#ffffff'); ring3(x, z, r * 0.2, r * 1.05, 0.42, c, 0.95); ring3(x, z, r * 0.1, r * 0.8, 0.3, '#ffffff', 0.8, true); scorch3(x, z, r * 0.7, 3); pillar3(x, z, r * 0.5, 4.5, 0.4, c, 0.6);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.random() * 0.4; bolt3(x, 0.5, z, x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r, i % 2 ? '#ffffff' : c, 0.08, 0.24, 0.16, 7); }
    debris(x, 0.3, z, 16, '#6e6252', 4.6, 0.24, 0.9); smoke(x, 0.3, z, 12, '#b8b0c8', 1.1, 0.9, 1.3); sparks(x, 0.8, z, 20, c, 6, 0.18, 0.6, 1.5, 5); FX.shake = Math.max(FX.shake, 0.4); },
  sorrel2(e, x, z, c) { ring3(x, z, 1.6, 0.35, 0.4, c, 0.8, true, 0.1); glint3(x, 1.6, z, 1.6, 0.45, '#ffffff'); if (UI.state === 'play') snd('cock', 0.9); snipeSight(e.id, e.tid, c); },       // Four Rounds: she settles to it (the line to her mark is drawn by snipeSight, from whichever end is in view)
  sorrel2t(e, x, z, c) { const tv = V.views.get(e.tid), top = (tv && tv.top) || 1.7; ring3(x, z, 2.4, 0.7, 0.4, c, 0.9, true, 0.1); glint3(x, top + 0.5, z, 1.4, 0.4, c); snipeSight(e.id, e.tid, c);
    if (V.me && e.tid === V.me.id) { text3(x, top + 0.9, z, 'IN HER SIGHTS', '#ff8a6a', true, 1.2); if (UI.state === 'play') snd('deny', 0.9); } },
  sorrel2s(e, x, z, c) {       // a round leaves the long gun
    const v = V.views.get(e.id), a = e.ang; let mx = x + Math.cos(a) * 1.3, my = 1.1, mz = z + Math.sin(a) * 1.3; if (v && v.root.visible) { const m = muzzleOf(v); mx = m.x; my = m.y; mz = m.z; }
    flash3(mx, my, mz, 2.6, 0.14, '#ffffff'); flash3(mx, my, mz, 3.6, 0.2, c); vring3(mx, my, mz, a, 0.12, 0.7, 0.22, c, 0.9); sparks(mx, my, mz, 6, '#ffe9b0', 4, 0.12, 0.25, 0.6); smoke(mx, my, mz, 3, '#dfe6ea', 0.35, 0.5, 0.2);
    streak3(mx, mz, mx + Math.cos(a) * 9, mz + Math.sin(a) * 9, 0.16, 0.16, c, my, 0.8); if (V.me && e.id === V.me.id) FX.shake = Math.max(FX.shake, 0.1); },
  sorrel2h(e, x, z, c) { const a = e.ang || 0; flash3(x, 1.0, z, 2.4, 0.2, c); flash3(x, 1.0, z, 1.3, 0.12, '#ffffff'); cut3(x, 1.0, z, 2.2, -a + HP2, c, 0.2); ring3(x, z, 0.2, 1.2, 0.28, c, 0.85, true, 0.9);
    for (let i = 0; i < 9; i++) { const q = a + (Math.random() - .5) * 0.9, s = 3 + Math.random() * 4; FX.add.emit(x, 1.0, z, Math.cos(q) * s, 0.5 + Math.random() * 1.5, Math.sin(q) * s, 0.35, 0.13, 0.02, i % 3 ? c : '#ffffff', 0.95, 4, 1); } },
  hesta0(e, x, z, c) { const a = e.ang, mx = x + Math.cos(a) * 0.6, mz = z + Math.sin(a) * 0.6; ring3(x, z, 0.3, 1.3, 0.35, c, 0.8, true); smoke(x, 0.1, z, 6, '#d8cfb4', 0.6, 0.5, 0.35); vring3(mx, 1.1, mz, a, 0.3, 1.0, 0.3, c, 0.85); glint3(mx, 1.2, mz, 1.4, 0.3, '#ffffff'); },       // off she goes, the gong before her
  hesta0h(e, x, z, c) { flash3(x, 1, z, 2.0, 0.2, c); ring3(x, z, 0.2, 1.0, 0.28, '#ffffff', 0.7, true); sparks(x, 0.9, z, 9, c, 4, 0.14, 0.35, 1); vring3(x, 1.0, z, e.ang, 0.2, 0.8, 0.25, c, 0.8); },       // someone she ran through
  hesta1(e, x, z, c) {       // the gong struck: the sound goes out in rings, and a line of it runs to everyone it has called out
    const r = e.r * S3, P = e.pts || []; flash3(x, 1.2, z, 3.6, 0.3, c); decal3(GX.tex.rings, x, z, r, 0.75, c, 0.85, { r0: r * 0.25, gk: 0.45, rot: 0 });
    for (let i = 0; i < 4; i++) later(i * 0.09, () => ring3(x, z, r * 0.15, r * (1 - i * 0.05), 0.5, i % 2 ? '#ffffff' : c, 0.85 - i * 0.12, i > 0, 0.07 + i * 0.25));
    sparks(x, 1.1, z, 14, c, r * 2.4, 0.14, 0.45, 0.9); FX.shake = Math.max(FX.shake, 0.14);
    for (let i = 0; i < P.length; i += 2) { const px = P[i] * S3, pz = P[i + 1] * S3; streak3(x, z, px, pz, 0.3, 0.4, TAUNT_C, 1.0, 0.8); } },
  hesta2(e, x, z, c) { const r = e.r * S3; flash3(x, 1.8, z, 5, 0.4, c); pillar3(x, z, 0.9, 4.4, 0.8, c, 0.45); dome3(x, z, r, 0.8, c, 0.2, { sy: 0.42 }); ring3(x, z, r * 0.2, r, 0.55, c, 0.8); rise3(x, z, r * 0.9, 20, lite(c), 1.8, 1.0, 0.14); FX.shake = Math.max(FX.shake, 0.1); },       // the gong raised: the shield goes up over everyone in reach
  hesta2a(e, x, z, c) { ring3(x, z, 0.2, 0.95, 0.4, c, 0.85); pillar3(x, z, 0.5, 2.6, 0.5, c, 0.4); glint3(x, 2.0, z, 1.1, 0.4, '#ffffff'); },       // an ally comes under it
  hesta2x(e, x, z, c) { const r = e.r * S3; ring3(x, z, r * 0.9, r * 1.12, 0.4, '#ffffff', 0.8, true); shards3(x, 1.2, z, 14, c, 4.5, 0.7); flash3(x, 1.2, z, 3.5, 0.3, c); },       // worn through
  hestaR(e, x, z, c) { ring3(x, z, 1.0, 0.3, 0.4, c, 0.9, true, 1.0); glint3(x, 2.2, z, 1.3, 0.45, c); },       // the gong is full
  hestaP(e, x, z, c) { const r = e.r * S3; flash3(x, 1.1, z, 3.2, 0.28, c); decal3(GX.tex.rings, x, z, r, 0.55, c, 0.7, { r0: r * 0.2, gk: 0.5, rot: 0 }); for (let i = 0; i < 3; i++) later(i * 0.07, () => ring3(x, z, r * 0.2, r * (1 - i * 0.1), 0.42, i ? '#ffffff' : c, 0.85 - i * 0.2, i > 0, 0.08 + i * 0.3)); sparks(x, 1.0, z, 12, c, r * 2.6, 0.14, 0.4, 0.9); FX.shake = Math.max(FX.shake, 0.1); },       // and let out
};
const TAUNT_C = '#ff6a4a';       // the colour of being called out: on the line that calls, on the mark over the head
/* Bees for a place on the ground: n of them on rounds of their own within r, in three lanes that go opposite ways. With a queen, she
   is there too: twice the size, crowned, circling overhead with a glow about her. */
function hiveBees(v, a, g, r, n, s, queen) {
  const pal = a.src && a.src.look ? a.src.look.bee : null; v.bees = [];
  for (let i = 0; i < n; i++) { const m = beeMesh(s, pal), lane = i % 3; g.add(m);
    v.bees.push({ m, wing: m.children[1], s: s * (0.9 + ((i * 0.53) % 1) * 0.3), r: r * (0.3 + 0.22 * lane + 0.2 * ((i * 0.618) % 1)), y: 0.6 + lane * 0.42 + ((i * 0.37) % 1) * 0.45, w: (1.25 + ((i * 0.29) % 1) * 1.0) * (lane === 1 ? -1 : 1), ph: i * 2.4, dart: null }); }
  if (queen) { const m = beeMesh(s * 1.9, pal, true), hl = shared(halo('#ffd76a', 1.4, 0.5)); g.add(m); g.add(hl); v.queen = { m, wing: m.children[1], s: s * 1.9, hl }; }
}
/* The Queen's Flight, moment by moment. The bees come out of the skep in a widening spiral and go home the same way at the end; in
   between each keeps its round, banking into it, and every half second a few leave theirs to sting whoever of the other side is in
   reach and come back. */
function hiveSync(v, a, t, dt, x, z, fade, c) {
  const out = smooth(clamp((a.dur - a.t) / 0.7, 0, 1)) * smooth(clamp(a.t / 0.6, 0, 1)), sc = 0.3 + 0.7 * out;       // (a.t is what is left of it: out in the first 0.7s, home in the last 0.6)
  v.dartT = (v.dartT || 0) - dt;
  if (v.dartT <= 0 && out > 0.9) { v.dartT = 0.5; let n = 0; const R2 = (a.r + 40) * (a.r + 40);
    for (const u of G.units) { if (n >= 4) break; if (u.dead || u.team === a.team || u.kind === 'turret' || u.kind === 'crystal') continue; const dx = u.x - a.x, dy = u.y - a.y; if (dx * dx + dy * dy > R2) continue; const uv = V.views.get(u.id); if (!uv || !uv.o.visible) continue;
      const b = v.bees[(Math.random() * v.bees.length) | 0]; if (!b.dart) { b.dart = { u, k: 0, hit: 0 }; n++; } } }
  for (const b of v.bees) {
    const q = b.ph + t * b.w, br = b.r * out; let px = Math.cos(q) * br, py = (b.y + Math.sin(t * 5 + b.ph) * 0.18) * (0.45 + 0.55 * out) + (1 - out) * 0.7, pz = Math.sin(q) * br, face = -q - (b.w > 0 ? HP2 : -HP2), bank = b.w > 0 ? -0.4 : 0.4;
    if (b.dart) { const d = b.dart, u = d.u; d.k += dt / 0.42;
      if (d.k >= 1 || u.dead) b.dart = null;
      else { const k = Math.sin(d.k * Math.PI), tx = u.x * S3 - x, tz = u.y * S3 - z; face = -Math.atan2(tz - pz, tx - px) + (d.k > 0.5 ? Math.PI : 0); px = lerp(px, tx, k * 0.92); pz = lerp(pz, tz, k * 0.92); py = lerp(py, 1.0, k); bank = 0;
        if (!d.hit && d.k > 0.5) { d.hit = 1; sparks(u.x * S3, 1.0, u.y * S3, 4, c, 2.2, 0.08, 0.25, 1); } } }
    b.m.position.set(px, py, pz); b.m.rotation.set(bank, face, 0); b.m.scale.setScalar(b.s * sc); b.wing.scale.y = Math.cos(t * 55 + b.ph);
  }
  if (v.queen) { const Q = v.queen, qa = t * 1.5, qr = 1.05 * out; Q.m.position.set(Math.cos(qa) * qr, 2.95 + Math.sin(t * 2.2) * 0.14 - (1 - out) * 1.4, Math.sin(qa) * qr); Q.m.rotation.set(-0.35, -qa - HP2, 0); Q.m.scale.setScalar(Q.s * sc); Q.wing.scale.y = Math.cos(t * 42); Q.hl.position.copy(Q.m.position); Q.hl.scale.setScalar(1.4 * sc); }
  while (v.acc > 0.07) { v.acc -= 0.07; const b = v.bees[(Math.random() * v.bees.length) | 0], bp = b.m.position; FX.add.emit(x + bp.x, bp.y, z + bp.z, 0, -0.15, 0, 0.3, 0.07, 0.02, Math.random() < 0.3 ? '#ffffff' : c, 0.55, 0, 0); }
  if (Math.random() < dt * 6) for (const h of G.heroes) { if (h.team !== a.team || h.dead || Math.hypot(h.x - a.x, h.y - a.y) > a.r) continue; FX.add.emit(h.x * S3 + (Math.random() - .5) * 0.5, 0.4, h.y * S3 + (Math.random() - .5) * 0.5, 0, 1.5, 0, 0.7, 0.12, 0.03, '#ffe9a8', 0.9, 0, 0); }       // honey for friends
}
/* Held by a Starfall: a cage of starlight. Five bars of light stand round whoever it holds, a small star at the head of each, a ring
   joining their heads and another their feet, and a five-pointed star drawn on the ground between them; the whole of it turns slowly.
   It closes in as it takes hold, lasts while the root does and breaks into sparks when the root ends (sooner, if something frees
   them). It stands up out of the ground so that it shows over the Starfall's own light. */
function starBind(tid, c, dur) {
  const g = new THREE.Group(), star = new THREE.Group(), line = fxMat(c, 0.9), bar = fxMat(c, 0.7), N = 5, P = [], top = new THREE.Mesh(FG.ringThin, fxMat('#ffffff', 0.8)); g.add(star); g.add(top); star.position.y = 0.08;
  for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 2) / N * TAU, x0 = Math.cos(a0), z0 = Math.sin(a0), x1 = Math.cos(a1), z1 = Math.sin(a1), m = shared(new THREE.Mesh(FG.plane, line));
    m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.scale.set(Math.hypot(x1 - x0, z1 - z0), 1, 0.07); star.add(m); }
  star.add(shared(new THREE.Mesh(FG.ring, line)));
  for (let i = 0; i < N; i++) { const s = shared(new THREE.Mesh(FG.oct, glowMat('#ffffff'))), h = shared(halo(c, 0.8, 0.9)), b = shared(new THREE.Mesh(FG.beam, bar)), w = shared(new THREE.Mesh(FG.beam, glowMat('#ffffff'))); b.rotation.x = HP2; w.rotation.x = HP2; g.add(s); g.add(h); g.add(b); g.add(w); P.push({ a: i / N * TAU, s, h, b, w }); }
  g.renderOrder = 4; let done = false; const life = dur + 0.3;
  const e = fxAdd(g, life, k => {
    const v = V.views.get(tid), u = v && v.u, T = k * life, on = !!(u && !u.dead && v.root.visible) && (u.rootT > 0 || T < 0.2);
    g.visible = on;
    if (!on) { if (!done && u && T > 0.2) { done = true; if (v.root.visible && !u.dead) { const x = u.x * S3, z = u.y * S3; sparks(x, 1.0, z, 14, c, 3.6, 0.14, 0.45, 1.2); shards3(x, 1.2, z, 6, c, 3.2, 0.5); ring3(x, z, 0.4, 1.5, 0.3, c, 0.7, true, 0.1); } } return; }
    const t = V.t, grip = easeOut(Math.min(1, T / 0.25)), R = (u.r * S3 + 0.42) * (1.7 - 0.7 * grip), ht = ((v.top || 1.7) * 0.72 + 0.2) * (0.3 + 0.7 * grip), ux = u.x * S3, uz = u.y * S3, pulse = 0.78 + 0.22 * Math.sin(t * 9);
    g.position.set(ux, 0, uz); g.rotation.y = t * 1.1; star.scale.set(R, 1, R); line.opacity = 0.9 * Math.min(1, T / 0.15) * pulse; bar.opacity = 0.85 * grip * pulse; top.position.y = ht; top.scale.set(R, 1, R); top.material.opacity = 0.8 * grip;
    for (const p of P) { const px = Math.cos(p.a) * R, pz = Math.sin(p.a) * R;
      p.b.position.set(px, ht / 2, pz); p.b.scale.set(0.06, 0.06, ht); p.w.position.set(px, ht / 2, pz); p.w.scale.set(0.017, 0.017, ht);
      p.s.position.set(px, ht + 0.08, pz); p.s.scale.set(0.1, 0.22, 0.1); p.s.rotation.y = t * 4 + p.a; p.h.position.set(px, ht + 0.08, pz); }
    if (Math.random() < FX.dt * 18) { const q = Math.random() * TAU; FX.add.emit(ux + Math.cos(q) * R, 0.1 + Math.random() * ht, uz + Math.sin(q) * R, 0, 0.9 + Math.random(), 0, 0.5, 0.12, 0.02, Math.random() < 0.4 ? '#ffffff' : c, 0.9, 0, 0); }
  });
  e.mat = line; e.mat2 = bar;
}
/* Four Rounds, for the eye: a thread of light from the muzzle of her gun to her mark, and on the mark a ring that closes as each round
   comes due, with four ticks turning about it. It lasts as long as she is counting at that mark and is drawn from whichever end is in
   view (S._fx: once for a count, though both ends ask for it). */
function snipeSight(hid, tid, c) {
  const hv0 = V.views.get(hid), h = hv0 && hv0.u, S = h && h.snipe; if (!S || S._fx) return; S._fx = 1;
  const g = new THREE.Group(), beam = new THREE.Group(), rm = fxMat(c, 0.95), a = new THREE.Mesh(FG.beam, fxMat(c, 0.5)), b = new THREE.Mesh(FG.beam, fxMat('#ffffff', 0.8)), r = new THREE.Mesh(FG.ringThin, rm), r2 = new THREE.Mesh(FG.ring, fxMat(c, 0.4)), dot = shared(halo(c, 0.8, 0.9)), tick = [];
  beam.add(a); beam.add(b); g.add(beam); g.add(r); g.add(r2); g.add(dot); for (let i = 0; i < 4; i++) { const m = shared(new THREE.Mesh(FG.plane, rm)); g.add(m); tick.push(m); }
  g.renderOrder = 4;
  fxAdd(g, SNIPE_AIM + SNIPE_GAP * SNIPE_N + 0.6, () => {
    const hv = V.views.get(hid), u = hv && hv.u, tv = V.views.get(tid), tg = tv && tv.u, on = !!(u && tg && u.snipe === S && !tg.dead);
    g.visible = on; if (!on) return;
    const t = V.t, sh = hv.root.visible, st = seen(tg), tx = tg.x * S3, tz = tg.y * S3, ty = 1.0 + (tg.z || 0) * S3; let mx = u.x * S3, my = 1.15, mz = u.y * S3; if (sh) { const m = muzzleOf(hv); mx = m.x; my = m.y; mz = m.z; }
    const len = Math.hypot(tx - mx, ty - my, tz - mz), q = 1 - clamp(S.acc / SNIPE_GAP, 0, 1), fl = 0.7 + 0.3 * Math.sin(t * 34);
    beam.visible = seen(u) && len > 0.3; beam.position.set((mx + tx) / 2, (my + ty) / 2, (mz + tz) / 2); beam.lookAt(tx, ty, tz); a.scale.set(0.035, 0.035, len); b.scale.set(0.011, 0.011, len); a.material.opacity = 0.42 * fl; b.material.opacity = 0.7 * fl;
    const r0 = tg.r * S3 + 0.42, rr = r0 * (1.9 - 0.95 * q); r.visible = r2.visible = dot.visible = st; for (const m of tick) m.visible = st;
    r.position.set(tx, 0.075, tz); r.scale.set(rr, 1, rr); r2.position.set(tx, 0.07, tz); r2.scale.set(r0, 1, r0); r2.rotation.y = t * 1.6; rm.opacity = 0.55 + 0.4 * q; dot.position.set(tx, ty, tz); dot.scale.setScalar(0.45 + 0.5 * q);
    tick.forEach((m, i) => { const an = i * HP2 + t * 1.6; m.position.set(tx + Math.cos(an) * (r0 + 0.24), 0.075, tz + Math.sin(an) * (r0 + 0.24)); m.rotation.y = -an; m.scale.set(0.36, 1, 0.06); });
  });
}
/* Teleport: where he stands, light gathers for as long as he is on his way; where he is going, a gate of it stands and closes on the
   moment he arrives. Each is shown to whoever is near it, friend or foe, and both go at once if he breaks it off. */
function tpFx(e, there) {
  const c = SPELLS.teleport.c, g = new THREE.Group(), ring = new THREE.Mesh(FG.ring, fxMat(c, 0.85)), rune = new THREE.Mesh(FG.plane, fxMat(c, 0.7, { map: GX.tex.rune })), col = new THREE.Mesh(FG.cyl, fxMat(c, 0.3, { map: GX.tex.pillar }));
  ring.position.y = 0.07; rune.position.y = 0.06; g.add(ring); g.add(rune); g.add(col); g.renderOrder = 3; g.position.set(e.x * S3, 0, e.y * S3);
  const life = e.dur + 0.2;
  fxAdd(g, life, k => {
    const h = heroById(e.id), on = !!(h && h.tp && !h.dead), q = Math.min(1, k * life / e.dur), t = V.t;
    g.visible = on && nearCam(g.position.x / S3, g.position.z / S3, 400); if (!on) return;
    if (there) g.position.set(h.tp.a.x * S3, 0, h.tp.a.y * S3);
    const s = there ? 1.7 - 0.8 * q : 0.9 + 0.08 * Math.sin(t * 6); ring.scale.set(s, 1, s); ring.rotation.y = t * 2.2; rune.scale.set(s * 2.4, 1, s * 2.4); rune.rotation.y = -t * 1.4; rune.material.opacity = 0.3 + 0.5 * q; col.scale.set(s * 0.8, 1.5 + 3.5 * q, s * 0.8); col.material.opacity = 0.12 + 0.4 * q;
    if (Math.random() < FX.dt * 16) { const a = Math.random() * TAU; FX.add.emit(g.position.x + Math.cos(a) * s * 0.8, 0.05, g.position.z + Math.sin(a) * s * 0.8, 0, 2.6, 0, 0.7, 0.13, 0.03, c, 0.9, 0, 0); }
  });
}
function heroById(id) { for (const h of G.heroes) if (h.id === id) return h; return null; }

/* sim effect events -> visuals */
function ingestFx() {
  const me = V.me, mid = me ? me.id : -1;
  for (const e of G.fx) {
    const x = e.x * S3, z = e.y * S3;
    if (e.k === 'dmg') {
      if (mid < 0 || (e.src !== mid && e.tgt !== mid) || e.v < 1) continue;
      text3(x, 1.9, z, String(Math.round(e.v)), e.tgt === mid ? '#ff7a6a' : e.crit ? '#ffd76a' : e.type === 'magic' ? '#c9a4ff' : e.type === 'true' ? '#ffffff' : '#ffe9d6', e.crit); continue;
    }
    if (e.k === 'heal') { if (nearCam(e.x, e.y, 0)) for (let i = 0; i < 5; i++) FX.add.emit(x + (Math.random() - .5) * 0.7, 0.3 + Math.random() * 0.8, z + (Math.random() - .5) * 0.7, 0, 1.3, 0, 0.7, 0.16, 0.04, '#7dff9a', 0.9, -0.5, 0); if (e.tgt === mid && e.v > 15) text3(x, 2.1, z, '+' + Math.round(e.v), '#7dff9a', false, 0.9); continue; }
    if (e.k === 'mana') { if (nearCam(e.x, e.y, 0)) for (let i = 0; i < 4; i++) FX.add.emit(x + (Math.random() - .5) * 0.7, 0.3 + Math.random() * 0.8, z + (Math.random() - .5) * 0.7, 0, 1.3, 0, 0.7, 0.15, 0.04, '#6fb7ff', 0.9, -0.5, 0); if (e.tgt === mid && e.v > 8) text3(x + 0.55, 1.75, z, '+' + Math.round(e.v), '#6fb7ff', false, 0.85); continue; }
    if (e.k === 'gold') { if (e.id === mid) { text3(x, e.plate ? 3.5 : 1.3, z, '+' + e.v + 'g', '#f2c14e', false, 1.0); sparks(x, e.plate ? 2.0 : 0.6, z + (e.plate ? 0.55 : 0), 6, '#ffd76a', 1.6, 0.14, 0.6, 1.6, 7); } continue; }
    if (e.k === 'glass') { if (nearCam(e.x, e.y, 300)) { ring3(x, z, 0.3, 1.7, 0.45, '#ffd76a', 0.9, true); sparks(x, 1.5, z, 9, '#ffe9a8', 1.8, 0.12, 0.6, 1.3, 5); } if (e.id === mid) text3(x, 3.2, z, 'ULTIMATE −' + (e.v >= 9.5 ? Math.round(e.v) : +e.v.toFixed(1)) + 's', '#ffd76a', false, 1.3); continue; }       // Victor's Hourglass turns: for its bearer, how many seconds it took off
    if (e.k === 'tp' || e.k === 'tpAt') { tpFx(e, e.k === 'tpAt'); continue; }       // (wherever the camera is now: it lasts, and the camera may come)
    if (!nearCam(e.x, e.y, 300)) continue;
    if (e.k === 'sk') { const h = heroById(e.id), m = /\d/.exec(e.n), sx = h && SKINS[h.key][h.skin].fx, f = (sx && SKFX[e.n + sx]) || SKFX[e.n]; if (f) f(e, x, z, e.c || (h ? skinColor(h.key, h.skin, m ? +m[0] : 0) : '#ffffff'), h); continue; }
    let c = e.c || '#ffffff'; const r = (e.r || 100) * S3;
    if (e.id && (e.ci != null || (e.k === 'cast' && e.i < 3))) { const h = heroById(e.id); if (h) c = skinColor(h.key, h.skin, e.ci != null ? e.ci : e.i); }
    if (e.id && (e.k === 'hit' || e.k === 'cast' || e.k === 'death')) {       // a skin that dresses its own blows, casts and death
      const h = heroById(e.id), sx = h && SKINS[h.key][h.skin].fx, f = sx && SKFX[e.k + sx];
      if (f) { f(e, x, z, e.k === 'cast' && e.i < 3 ? c : skinColor(h.key, h.skin, 0), h); continue; }
    }
    switch (e.k) {
      case 'hit': flash3(x, 0.95, z, e.big ? 1.7 : 1.0, 0.14, e.big ? '#ffd76a' : '#ffffff'); sparks(x, 0.95, z, e.big ? 9 : 4, e.big ? '#ffd76a' : '#fff4d6', 3.2, 0.12, 0.28, 1);
        if (e.big) cut3(x, 1.0, z, 2.0, (Math.random() - .5) * 1.6, '#ffd76a', 0.22);
        if (e.ax != null) { const ax = e.ax * S3, az = e.ay * S3, d = Math.hypot(x - ax, z - az); slash3(ax, az, Math.atan2(e.y - e.ay, e.x - e.ax), e.hero ? 0.8 : 0.6, Math.min(2.1, d + (e.hero ? 0.35 : 0.15)), 0.16, e.hero ? c : '#ffffff', e.hero ? 0.95 : 0.6, true); } break;
      case 'spark': if (e.small) { flash3(x, 0.7, z, 0.6, 0.12, c); break; } flash3(x, 0.9, z, 1.1, 0.16, c); sparks(x, 0.9, z, 7, c, 3, 0.14, 0.35, 1); if (e.ci != null) ring3(x, z, 0.1, 0.7, 0.25, c, 0.8, true, 0.9);
        if (e.lf) { cut3(x, 0.95, z, 1.25, (Math.random() - .5) * 1.5, c, 0.17); for (let i = 0; i < 4; i++) FX.alpha.emit(x, 0.9, z, (Math.random() - .5) * 2.4, 0.6 + Math.random() * 1.2, (Math.random() - .5) * 2.4, 0.55, 0.1, 0.04, i % 2 ? '#6f9a3a' : c, 0.9, 3, 1); }       // a thrown leaf bites: a cut, and a few leaves knocked loose
        break;
      case 'burst': disc3(x, z, r * 0.3, r, 0.4, c, 0.3, true); ring3(x, z, r * 0.4, r * 1.05, 0.42, c, 0.85); flash3(x, 0.6, z, r * 1.5, 0.26, c); sparks(x, 0.5, z, 10, c, r * 3.2, 0.16, 0.5, 0.8); break;
      case 'ring': ring3(x, z, r * 0.2, r, 0.5, c, 0.9); break;
      case 'quake': quakeFx(x, z, r, c, 1); break;
      case 'slash': slash3(x, z, e.ang, e.a, r, 0.26, c); break;
      case 'beam': beamFx(x, z, e.x2 * S3, e.y2 * S3, e.w * S3 * 0.5, c); break;
      case 'strike': beam3(x + 0.5, 7, z - 0.4, x, 0.1, z, 0.16, 0.38, c, 0.9); flash3(x, 0.8, z, 3.2, 0.3, c); ring3(x, z, 0.2, 1.3, 0.4, c, 0.9); sparks(x, 0.6, z, 12, c, 4, 0.16, 0.5, 1.2); FX.shake = Math.max(FX.shake, 0.12); break;
      case 'cast': ring3(x, z, 0.25, e.ult ? 1.5 : 0.8, 0.35, c, 0.7, true); sparks(x, 0.3, z, e.ult ? 12 : 5, c, 1.4, 0.14, 0.6, 2.4, -1);
        if (e.ult) { pillar3(x, z, 0.75, 3.4, 0.6, c, 0.5); flash3(x, 1.0, z, 3.0, 0.35, c); decal3(GX.tex.rune, x, z, 1.7, 0.8, c, 0.8, { spin: 3, r0: 0.5 }); } break;
      case 'block': { const v = V.views.get(e.id), top = (v && v.top) || 1.7; flash3(x, 1.0, z, 1.5, 0.16, c); ring3(x, z, 0.72, 0.98, 0.22, c, 0.95, true, 1.0); sparks(x, 1.1, z, 6, '#ffffff', 2.6, 0.12, 0.3, 1); text3(x, top + 0.8, z, e.all ? 'IMMUNE' : 'STEADY', c, false, 0.7); break; }
      case 'totem': totemFx(e, x, z, c); break;
      case 'pierce': { const v = V.views.get(e.id), top = (v && v.top) || 1.7; shards3(x, 1.2, z, 9, c, 4.4, 0.6); ring3(x, z, 1.1, 0.4, 0.24, '#ffffff', 0.9, true, 0.9); flash3(x, 1.1, z, 2.0, 0.18, '#ffffff'); text3(x, top + 0.8, z, 'PIERCED', '#ff8a6a', false, 0.9); break; }       // a hold has gone through the totem
      case 'camo': { const h = heroById(e.id); if (!e.on && h && (V.team < 0 || h.team === V.team)) ring3(x, z, 0.3, 1.2, 0.3, '#ffffff', 0.45, true, 0.1); break; }       // out from under the cape (the going under is the skill's own effect)
      case 'echo': { const x0 = e.x0 * S3, z0 = e.y0 * S3; streak3(x0, z0, x, z, 0.45, 0.22, c, 0.9, 0.6); flash3(x, 1.0, z, 1.6, 0.18, c); ring3(x, z, 0.2, 0.9, 0.26, c, 0.7, true); smoke(x, 0.3, z, 4, '#e6e0f4', 0.6, 0.4, 0.4); break; }
      case 'echoEnd': smoke(x, 0.6, z, 7, '#e6e0f4', 0.8, 0.5, 0.6); sparks(x, 1.0, z, e.hit ? 12 : 6, c, 3.2, 0.13, 0.4, 1); ring3(x, z, 0.3, 1.1, 0.26, c, 0.6, true); if (e.hit) shards3(x, 1.1, z, 6, c, 3.4, 0.5); break;
      case 'echoHit': flash3(x, 1.0, z, 1.5, 0.16, c); sparks(x, 1.0, z, 6, c, 3.6, 0.13, 0.3, 1); cut3(x, 1.0, z, 1.5, (Math.random() - .5) * 1.4, c, 0.18); break;
      case 'beastOff': { const h = heroById(e.id), hc = h ? skinColor(h.key, h.skin, 2) : '#b9a8ff'; ring3(x, z, 2.2, 0.4, 0.4, hc, 0.7, true); smoke(x, 0.5, z, 10, '#cfc8e0', 1.0, 0.7, 0.9); flash3(x, 1.2, z, 2.6, 0.22, '#ffffff'); break; }
      case 'cleave': { const h = heroById(e.id), hc = h ? skinColor(h.key, h.skin, 2) : '#b9a8ff'; slash3(x, z, e.ang, BEAST_ARC, (BEAST_RANGE + 110) * S3, 0.18, hc, 0.9, { op: 0.4 }); break; }
      case 'squall': { const sc = ITEMS.squallsong.c; ring3(x, z, 0.2, 1.3, 0.28, sc, 0.8, true);       // Squallsong: the squall leaps from its target to whoever else it takes in
        for (const id of e.ids) { const q = V.views.get(id), u = q && q.u; if (!u) continue; const ux = u.x * S3, uz = u.y * S3; if (Math.hypot(ux - x, uz - z) > 0.05) bolt3(x, 1.1, z, ux, 1.0, uz, sc, 0.05, 0.2, 0.18, 5); flash3(ux, 1.0, uz, e.crit ? 1.9 : 1.2, 0.16, sc); sparks(ux, 1.0, uz, 5, '#e8fff8', 3, 0.12, 0.3, 1); } break; }
      case 'laststand': { const lc = ITEMS.dawnshard.c, h = heroById(e.id); ring3(x, z, 0.4, 1.8, 0.4, lc, 0.9); pillar3(x, z, 0.9, 2.6, 0.5, lc, 0.5); flash3(x, 1.1, z, 2.6, 0.24, '#ffd0dc'); if (h && h === V.me) text3(x, 3.0, z, 'LAST STAND', '#ffc2d0', false, 1.1); break; }
      case 'ruin': ring3(x, z, 1.3, 0.3, 0.3, ITEMS.ruinblade.c, 0.8, true, 0.1); flash3(x, 1.2, z, 1.6, 0.2, '#ff5d7a'); break;
      case 'tpin': { const tc = SPELLS.teleport.c; pillar3(x, z, 1.1, 6, 0.5, tc, 0.8); ring3(x, z, 0.3, 2.2, 0.4, tc, 0.9); flash3(x, 1.2, z, 3.5, 0.26, '#ffffff'); sparks(x, 1.0, z, 14, tc, 4, 0.15, 0.5, 1.6, 2); if (nearCam(e.x0, e.y0, 300)) { ring3(e.x0 * S3, e.y0 * S3, 1.4, 0.2, 0.35, tc, 0.6, true); smoke(e.x0 * S3, 0.4, e.y0 * S3, 6, '#d8d0f0', 0.8, 0.5, 0.6); } break; }
      case 'tpx': { const h = heroById(e.id); ring3(x, z, 1.0, 0.2, 0.25, '#ffffff', 0.5, true); smoke(x, 0.4, z, 5, '#d8d0f0', 0.7, 0.4, 0.5); if (h && h === V.me) text3(x, 3.0, z, 'BROKEN OFF', '#d8d0f0', false, 1.0); break; }
      case 'snipe': break;
      case 'mood': if (e.id === mid) snd('ui'); break;       // a temper changed (what it looks like is the view's business: see moodExtras)
      case 'taunt': { const v = V.views.get(e.id), top = (v && v.top) || 1.7; ring3(x, z, 1.0, 0.4, 0.3, TAUNT_C, 0.9, true, 0.1); flash3(x, top * 0.7, z, 1.6, 0.25, TAUNT_C); if (e.id === mid) { text3(x, top + 0.9, z, 'TAUNTED', '#ff8a6a', true, 1.0); if (!UI.hints.taunt && UI.state === 'play') { UI.hints.taunt = 1; hint('Taunted: until it ends, your hero can only go for whoever called it out.', 6); } } break; }       // called out: for the one it happens to, the word for it
      case 'flurry': deathMark(e.tgt, e.id, c, FLURRY_T); ring3(x, z, 1.5, 0.5, 0.3, c, 0.9, true, 0.1); glint3(x, 2.4, z, 1.3, 0.35, c); break;       // Death Mark has landed: the mark is on
      case 'flurryHit': { const last = e.n <= 0, a = (e.ang || 0) + (e.n - 1) * 0.9;       // one of the fast attacks: a cut across the marked hero, each from another side; the last one bursts
        cut3(x, 1.0, z, last ? 2.6 : 1.9, -a + HP2, c, last ? 0.26 : 0.18); cut3(x, 1.0, z, last ? 2.0 : 1.4, -a + HP2, '#ffffff', 0.12, 0.08); flash3(x, 1.0, z, last ? 2.2 : 1.3, 0.14, c); sparks(x, 1.0, z, last ? 14 : 7, c, last ? 4.5 : 3.2, 0.14, 0.4, 1);
        if (last) { ring3(x, z, 0.2, 1.7, 0.32, c, 0.9, true, 0.9); shards3(x, 1.0, z, 8, c, 3.4, 0.6); FX.shake = Math.max(FX.shake, 0.09); } break; }
      case 'plate': for (let i = e.n; i < e.n + (e.lost || 1) && i < PLATE_Y.length; i++) plateBreak(x, PLATE_Y[i], z); break;
      case 'plateOff': for (let i = 0; i < e.n && i < PLATE_Y.length; i++) { const y = PLATE_Y[i]; later(i * 0.1, () => plateBreak(x, y, z, true)); } break;
      case 'level': ring3(x, z, 0.2, 1.5, 0.8, '#ffd76a', 0.9); pillar3(x, z, 0.7, 3.6, 0.9, '#ffd76a', 0.6); decal3(GX.tex.rune, x, z, 1.3, 0.9, '#ffd76a', 0.8, { spin: 3, r0: 0.4 }); sparks(x, 0.2, z, 16, '#ffe9a0', 1.3, 0.15, 1.0, 2.6, -1.5); glint3(x, 2.6, z, 1.6, 0.6, '#ffffff'); if (e.id === mid) text3(x, 2.4, z, 'LEVEL UP', '#ffd76a', true, 1.3); break;
      case 'death': ring3(x, z, 0.3, 1.9, 0.6, c, 0.9); flash3(x, 0.9, z, 3.6, 0.4, c); for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, d = Math.random() * 0.5; FX.add.emit(x + Math.cos(a) * d, 0.2 + Math.random() * 1.2, z + Math.sin(a) * d, Math.cos(a) * 0.5, 1.2 + Math.random() * 1.6, Math.sin(a) * 0.5, 1.0 + Math.random() * 0.5, 0.2, 0.03, i % 3 ? c : '#ffffff', 1, -0.4, 0.5); } break;
      case 'revive': pillar3(x, z, 0.9, 4.2, 2.0, '#ffe08a', 0.7); ring3(x, z, 0.3, 1.8, 0.7, '#ffe08a', 0.9); decal3(GX.tex.rune, x, z, 1.6, 2.0, '#ffe08a', 0.8, { spin: 2 }); sparks(x, 0.3, z, 18, '#fff1b8', 1.6, 0.16, 1.2, 2.6, -1.2); if (e.id === mid) text3(x, 2.5, z, 'SECOND WIND', '#ffe08a', true, 1.4); break;
      case 'air': launchFx(x, z, c === '#ffffff' ? '#ffe9c4' : c, e.big); break;       // thrown into the air
      case 'land': ring3(x, z, 0.2, 0.75, 0.28, '#e6dcc0', 0.55, true, 0.07); smoke(x, 0.08, z, 3, '#d8cfb4', 0.32, 0.4, 0.3); break;       // and down again
      case 'poof': smoke(x, 0.3, z, e.big ? 7 : 3, '#e6e0d0', e.big ? 0.6 : 0.4, 0.5, 0.3); sparks(x, 0.5, z, e.big ? 10 : 4, c, 1.8, 0.13, 0.45, 1.3); break;
      case 'explode': { const b = e.big ? 2 : 1; flash3(x, 1.5 * b, z, 7 * b, 0.5, '#ffd9a0'); ring3(x, z, 0.5, 3.4 * b, 0.8, '#ffb35c', 1); ring3(x, z, 0.3, 2.4 * b, 1.0, '#ffffff', 0.6, true); disc3(x, z, 1, 3 * b, 0.7, '#ff9a5a', 0.5, true); scorch3(x, z, 2 * b, 4);
        debris(x, 0.6, z, 26 * b, '#7d8690', 3.4 * b, 0.34, 1.3); debris(x, 1.6, z, 12 * b, '#a9b1ba', 2.2 * b, 0.22, 1.1); smoke(x, 0.4, z, 14 * b, '#8a8f96', 1.3 * b, 1.6, 1.2 * b); sparks(x, 1.2, z, 30 * b, '#ffb35c', 5 * b, 0.22, 0.9, 1.4, 6); FX.shake = Math.max(FX.shake, e.big ? 0.5 : 0.28); break; }
    }
  }
  G.fx.length = 0;
}
function beamFx(x, z, x2, z2, w, c) {      // a released beam: core, sheath, gust rings, arcing lightning and a scorched line
  const a = Math.atan2(z2 - z, x2 - x), len = Math.hypot(x2 - x, z2 - z);
  beam3(x, 0.95, z, x2, 0.95, z2, w * 0.62, 0.55, c, 0.4); flash3(x, 0.95, z, w * 3.6, 0.35, c); flash3(x2, 0.95, z2, w * 3, 0.35, c);
  for (let i = 0; i < 7; i++) { const q = (i + 0.5) / 7; later(i * 0.025, () => vring3(lerp(x, x2, q), 0.95, lerp(z, z2, q), a, w * 0.6, w * 1.7, 0.4, c, 0.7)); }
  let px = x, pz = z; for (let i = 1; i <= 4; i++) { const q = i / 4, nx = lerp(x, x2, q), nz = lerp(z, z2, q); bolt3(px, 0.6 + Math.random() * 0.8, pz, nx, 0.6 + Math.random() * 0.8, nz, lite(c, 0.4), 0.05, 0.32, 0.18, 5); px = nx; pz = nz; }
  const n = 16; for (let i = 0; i < n; i++) { const q = i / n; sparks(lerp(x, x2, q), 0.9, lerp(z, z2, q), 2, c, 2.4, 0.16, 0.5, 1.2); }
  const m = flat(FG.plane, '#000000', 0.5, (x + x2) / 2, 0.056, (z + z2) / 2, { map: GX.tex.band, blending: THREE.NormalBlending }); m.rotation.y = -a; m.scale.set(len, 1, w * 1.6); m.renderOrder = 2; fxAdd(m, 2.2, k => { m.material.opacity = 0.5 * Math.min(1, (1 - k) / 0.5); });
  FX.shake = Math.max(FX.shake, 0.24);
}

/* ---------- projectiles ---------- */
function projColor(p) { const s = p.src; return p.ci != null && s && s.kind === 'hero' ? skinColor(s.key, s.skin, p.ci) : p.c || '#ffffff'; }
function projDrop(v) { v.dead = true; FX.group.remove(v.m); v.m.traverse(x => { if (x.material && (x.userData.own === 1 || (x.material.blending === THREE.AdditiveBlending && x.isMesh))) x.material.dispose(); }); if (v.chain) { FX.group.remove(v.chain); v.chain.geometry.dispose(); v.chain.material.dispose(); } }
function projView(p) {
  const g = new THREE.Group(), c = projColor(p), add = (geo, hex, sx, sy, sz) => { const m = new THREE.Mesh(geo, glowMat(hex)); m.scale.set(sx, sy, sz); g.add(m); return m; };
  const tail = (len, w, hex, op) => { const m = new THREE.Mesh(FG.plane, fxMat(hex || c, op || 0.7, { map: GX.tex.streak })); m.scale.set(len, 1, w); m.position.x = -len / 2; g.add(m); const u = m.clone(); u.material = m.material; u.rotation.x = HP2; g.add(u); m._tw = u; return m; };       // (_tw: its twin, set on edge)
  const sk = p.src && p.src.kind === 'hero' ? SKINS[p.src.key][p.src.skin] : null, look = (sk && sk.proj && sk.proj[p.look]) || p.look;       // a skin may throw something of its own
  const v = { m: g, p, look, spin: null, chain: null, c, ts: 0.14, y0: 0, rings: 0, acc: 0, cor: null };
  switch (look) {
    case 'comet': add(FG.oct, '#ffffff', 0.34, 0.1, 0.1); add(FG.oct, c, 0.5, 0.16, 0.16).material = fxMat(c, 0.7); g.add(halo(c, 1.5, 0.9)); g.add(halo('#ffffff', 0.7, 0.9)); tail(2.6, 0.42, c, 0.8); tail(1.7, 0.24, STAR2, 0.7); tail(1.0, 0.1, '#ffffff', 0.95); v.ts = 0.17; v.dust = 1; break;       // a comet
    case 'spirit': add(FG.oct, '#ffffff', 0.62, 0.05, 0.05); add(FG.oct, c, 0.85, 0.035, 0.16).material = fxMat(c, 0.75); add(FG.oct, c, 0.3, 0.16, 0.03).position.x = -0.25; g.add(halo(c, 1.3, 0.8)); tail(2.2, 0.3, c, 0.8); tail(1.2, 0.12, '#ffffff', 0.9); v.ts = 0.14; v.rings = 0.09; v.grow = 1; break;       // a spirit arrow: it swells the further it flies
    case 'ring': v.spinY = chakram(c, 0.2); g.add(v.spinY); g.add(halo(c, 1.0, 0.7)); tail(1.2, 0.26, c, 0.7); v.ts = 0.1; break;       // a ring blade, spinning flat
    case 'eclipse': {       // a small black sun that spins as it flies
      const cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.corona, color: lin(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })), moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: GX.tex.moon, color: 0x000000, depthWrite: false, transparent: true, toneMapped: false }));
      cor.scale.set(1.5, 1.5, 1); moon.scale.set(0.75, 0.75, 1); cor.renderOrder = 5; moon.renderOrder = 6; cor.userData.own = moon.userData.own = 1; g.add(cor); g.add(moon); v.cor = cor;
      tail(2.3, 0.36, c, 0.85); tail(1.2, 0.12, '#ffffff', 0.7); v.rings = 0.09; v.ts = 0.2; break; }
    case 'arrow': if (p.big) { add(FG.shaft, '#fffbe8', 1.7, 1.6, 1.6); add(FG.tip, c, 1.7, 2, 2); g.add(halo(c, 1.2, 0.8)); tail(2.2, 0.3, c, 0.8); v.rings = 0.07; v.ts = 0.14; }
      else { add(FG.shaft, '#f4efe0', 1, 1, 1); add(FG.tip, c, 1, 1, 1); g.add(halo(c, 0.5, 0.5)); tail(0.9, 0.12, c, 0.5); v.ts = 0.09; } break;
    case 'leaf': { const big = p.big ? 1.5 : 1, lb = leafBlade(c, big); g.add(lb[0]); v.spinY = lb[1]; g.add(halo(c, big > 1 ? 1.4 : 0.8, 0.75)); tail(big > 1 ? 2.2 : 1.2, big > 1 ? 0.36 : 0.2, c, 0.75); tail(big > 1 ? 1.2 : 0.7, 0.08, '#ffffff', 0.9); v.ts = big > 1 ? 0.15 : 0.1; v.leaf = p.src && p.src.skin ? 2 : 1; if (big > 1) v.rings = 0.08; break; }       // a leaf of iron, whirling (what it sheds is green, or the skin's own colour)
    case 'skip': { const lb = leafBlade(c, 0.85); g.add(lb[0]); v.spinY = lb[1]; g.add(halo(c, 0.75, 0.7)); tail(1.4, 0.17, c, 0.8); tail(0.8, 0.07, '#ffffff', 0.9); v.ts = 0.1; v.arc = 0.5; v.leaf = p.src && p.src.skin ? 2 : 1; break; }       // the same leaf on its way from one target to the next
    case 'pod': { v.spin = new THREE.Group(); const pm = (geo, hex, sx, sy, sz) => { const m = new THREE.Mesh(geo, glowMat(hex)); m.scale.set(sx, sy, sz); v.spin.add(m); return m; };
      pm(FG.sphere, '#4d5f2c', 0.2, 0.17, 0.17); pm(FG.sphere, c, 0.1, 0.1, 0.1).position.x = 0.16; for (let i = 0; i < 5; i++) { const m = pm(FG.oct, '#8fae4a', 0.035, 0.2, 0.035), a = i / 5 * TAU; m.position.set(-0.02, Math.cos(a) * 0.14, Math.sin(a) * 0.14); m.rotation.x = a; }
      g.add(v.spin); add(FG.shaft, '#e9dcc0', 0.9, 1.2, 1.2).position.x = -0.42; g.add(halo(c, 1.3, 0.8)); tail(2.0, 0.3, '#8fd04a', 0.7); tail(1.1, 0.12, c, 0.9); v.rings = 0.08; v.ts = 0.15; v.leaf = 1; break; }
    case 'seed': add(FG.oct, '#ffffff', 0.15, 0.06, 0.06); add(FG.oct, c, 0.24, 0.1, 0.1).material = fxMat(c, 0.7); g.add(halo(c, 0.9, 0.8)); tail(1.2, 0.16, '#8fd04a', 0.8); tail(0.7, 0.07, '#ffffff', 0.9); v.ts = 0.1; v.arc = 1.0; v.leaf = 1; break;
    case 'pellet': add(FG.sphere, shade(c, 0.3), 0.07, 0.07, 0.07); g.add(halo(c, 0.45, 0.7)); v.ts = 0; break;
    case 'slug': add(FG.oct, '#fff4d0', 0.26, 0.045, 0.045); g.add(halo('#ffe2b0', 0.45, 0.6)); tail(1.5, 0.09, '#ffe9b0', 0.6); v.ts = 0.05; break;       // a plain round from the long gun: small, quick, a pale line behind it
    case 'longshot': add(FG.oct, '#ffffff', 0.6, 0.07, 0.07); add(FG.oct, c, 0.9, 0.045, 0.2).material = fxMat(c, 0.7); g.add(halo(c, 1.2, 0.85)); v.tails = [[tail(3.4, 0.24, c, 0.85), 3.4], [tail(1.9, 0.09, '#ffffff', 0.95), 1.9]]; v.rings = 0.05; v.ts = 0.14; break;       // a Long Shot: the shard's own light in it
    case 'round': add(FG.oct, '#ffffff', 0.8, 0.09, 0.09); add(FG.oct, c, 1.1, 0.05, 0.26).material = fxMat(c, 0.75); g.add(halo(c, 1.7, 0.9)); v.tails = [[tail(5.0, 0.3, c, 0.9), 5.0], [tail(2.8, 0.12, '#ffffff', 0.95), 2.8]]; v.rings = 0.035; v.ts = 0.2; break;       // one of the four: a long bright line
    case 'bolt': add(FG.sphere, '#ffffff', 0.26, 0.13, 0.13); g.add(halo(c, 1.5, 0.9)); tail(1.3, 0.26, c, 0.8); v.ts = 0.24; break;
    case 'dart': v.spin = add(FG.oct, '#e8e2f5', 0.5, 0.05, 0.18); g.add(halo(c, 0.9, 0.7)); tail(1.5, 0.22, c, 0.8); v.ts = 0.12; break;
    case 'lance': add(FG.oct, '#ffffff', 0.95, 0.09, 0.09); add(FG.oct, c, 1.3, 0.05, 0.24); g.add(halo(c, 1.3, 0.6)); tail(2.4, 0.3, c, 0.7); v.rings = 0.06; v.ts = 0.2; break;
    case 'hook': add(FG.hook, '#eef2f5', 1, 1, 1); g.add(halo(c, 1.0, 0.6)); v.chain = chainStrip('#c9d0d5', false); FX.group.add(v.chain); v.ts = 0.1; break;
    case 'chain': add(FG.sphere, '#ffffff', 0.12, 0.12, 0.12); v.spin = add(FG.oct, c, 0.26, 0.26, 0.26); v.spin.material = fxMat(c, 0.6); g.add(halo(c, 1.5, 0.9)); v.chain = chainStrip(lite(c, 0.3), true); FX.group.add(v.chain); v.ts = 0.16; break;
    case 'orb': { add(FG.sphere, '#ffffff', 0.13, 0.13, 0.13); add(FG.sphere, c, 0.21, 0.21, 0.21).material = fxMat(c, 0.55); g.add(halo(c, 1.6, 0.9)); tail(1.4, 0.3, c, 0.6);
      v.spin = new THREE.Group(); for (const k of [-1, 1]) { const m = new THREE.Mesh(FG.sphere, glowMat('#ffffff')); m.scale.setScalar(0.05); m.position.set(0, k * 0.32, 0); v.spin.add(m); } g.add(v.spin); v.ts = 0.2; break; }
    case 'swarm': { v.sw = []; const pal = p.src && p.src.look ? p.src.look.bee : null;       // bees in a knot, a leader and those behind her, weaving about the line they fly
      for (let i = 0; i < 7; i++) { const m = beeMesh(i ? 0.3 : 0.38, pal), a = i / 6 * TAU; g.add(m); v.sw.push({ m, wing: m.children[1], ox: i ? -0.2 - ((i * 0.37) % 1) * 0.6 : 0.26, a, r: i ? 0.24 + ((i * 0.61) % 1) * 0.18 : 0, ph: i * 1.3 }); }
      g.add(halo(c, 1.5, 0.55)); tail(1.5, 0.3, c, 0.4); v.ts = 0.1; v.buzz = 1; break; }
    default: add(FG.sphere, shade(c, 0.4), 0.1, 0.1, 0.1); g.add(halo(c, 0.8, 0.8)); tail(0.7, 0.14, c, 0.5); v.ts = 0.12;
  }
  if (p.src && (p.src.kind === 'turret' || p.src.kind === 'crystal') && nearCam(p.src.x, p.src.y, 200)) { const y = p.src.kind === 'turret' ? 4.05 : 2.8; flash3(p.src.x * S3, y, p.src.y * S3, 2.2, 0.22, c); glint3(p.src.x * S3, y, p.src.y * S3, 1.6, 0.25, '#ffffff'); }
  FX.group.add(g); return v;
}
function syncProjs(dt) {
  const tick = ++FX.tick;
  for (const p of G.projs) {
    let v = p._v; if (!v || v.dead) { v = p._v = projView(p); FX.pv.push(v); }
    v.tick = tick;
    let y = 0.95;
    if (p.homing && p.tgt) {
      const d = Math.hypot(p.tgt.x - p.x, p.tgt.y - p.y); if (v.d0 == null) { v.d0 = Math.max(d, 1); v.y0 = p.src && p.src.kind === 'turret' ? 4.0 : p.src && p.src.kind === 'crystal' ? 2.8 : p.src && p.src.kind === 'minion' ? 0.75 : 1.05; }
      y = lerp(p.tgt.kind === 'minion' ? 0.6 : 0.95, v.y0, clamp(d / v.d0, 0, 1));
      if (v.arc) y += Math.sin(clamp(1 - d / v.d0, 0, 1) * Math.PI) * v.arc;       // a hop, not a straight line
    }
    const vis = V.team < 0 || p.team === V.team || nearCam(p.x, p.y, 0), px = p.x * S3, pz = p.y * S3;
    v.m.visible = vis; v.m.position.set(px, y, pz); v.m.rotation.y = -p.ang;
    if (v.grow) v.m.scale.setScalar(1 + (p.k || 0) * 1.1);
    if (v.tails) { v.trav = (v.trav || 0) + p.speed * dt * S3; for (const [m, len] of v.tails) { const l = Math.max(0.05, Math.min(len, v.trav)); m.scale.x = l; m.position.x = -l / 2; m._tw.scale.x = l; m._tw.position.x = -l / 2; } }       // a long line of light is paid out from the muzzle: it never reaches back behind whoever fired it
    if (v.sw) { v.age = (v.age || 0) + dt; for (const b of v.sw) { const q = b.a + v.age * 7; b.m.position.set(b.ox + Math.sin(v.age * 9 + b.ph) * 0.05, Math.cos(q) * b.r, Math.sin(q) * b.r); b.m.rotation.set(Math.sin(v.age * 6 + b.ph) * 0.25, 0, 0); b.wing.scale.y = Math.cos(v.age * 55 + b.ph); } }
    if (v.spin) v.spin.rotation.x += dt * 26; if (v.spinY) v.spinY.rotation.y += dt * 34; if (v.cor) v.cor.material.rotation -= dt * 7;
    if (v.chain) { const s = p.src; v.chain.visible = vis; chainSet(v.chain, s.x * S3 + Math.cos(p.ang) * 0.4, s.y * S3 + Math.sin(p.ang) * 0.4, px, pz, 0.95, v.look === 'hook' ? 0.15 : 0.19); }
    if (!vis || !nearCam(p.x, p.y, 200)) continue;
    if (v.ts) FX.add.emit(px + (Math.random() - .5) * 0.08, y + (Math.random() - .5) * 0.08, pz + (Math.random() - .5) * 0.08, 0, 0, 0, 0.26, v.ts, 0.02, v.c, 0.8, 0, 0);
    if (v.leaf && Math.random() < dt * 34) FX.alpha.emit(px, y, pz, (Math.random() - .5) * 1.2, 0.2 + Math.random() * 0.7, (Math.random() - .5) * 1.2, 0.5, 0.1, 0.04, v.leaf === 2 ? (Math.random() < 0.6 ? v.c : '#ffffff') : Math.random() < 0.5 ? '#6f9a3a' : '#c9d86a', 0.9, 3, 1);
    if (v.buzz && Math.random() < dt * 70) { const q = Math.random() * TAU, d = 0.12 + Math.random() * 0.34, sx = -Math.sin(p.ang), sz = Math.cos(p.ang); FX.add.emit(px + sx * Math.cos(q) * d, y + Math.sin(q) * d, pz + sz * Math.cos(q) * d, sx * (Math.random() - .5) * 3, (Math.random() - .5) * 3, sz * (Math.random() - .5) * 3, 0.22 + Math.random() * 0.16, 0.085, 0.02, Math.random() < 0.3 ? '#ffffff' : v.c, 0.95, 0, 2); }       // stragglers
    if (v.dust && Math.random() < dt * 40) FX.add.emit(px, y, pz, (Math.random() - .5) * 1.4, 0.3 + Math.random() * 0.8, (Math.random() - .5) * 1.4, 0.5, 0.13, 0.02, Math.random() < 0.4 ? STAR2 : '#ffffff', 0.95, 0.6, 1);
    if (v.rings) { v.acc += dt; if (v.acc >= v.rings) { v.acc = 0; vring3(px, y, pz, p.ang, 0.1, 0.5, 0.3, v.c, 0.7); } }
  }
  for (let i = FX.pv.length - 1; i >= 0; i--) { const v = FX.pv[i]; if (v.tick !== tick) { projDrop(v); FX.pv[i] = FX.pv[FX.pv.length - 1]; FX.pv.pop(); } }
}

/* ---------- area telegraphs and zones ---------- */
function areaColor(a) { const s = a.src; return a.ci != null && s && s.kind === 'hero' ? skinColor(s.key, s.skin, a.ci) : a.c || '#ffffff'; }
function areaView(a) {
  const g = new THREE.Group(), c = areaColor(a), hostile = V.team >= 0 && a.team !== V.team, rimC = hostile ? '#ff5a5a' : c, r = (a.r || 100) * S3;
  const v = { m: g, a, acc: 0, c }, put = (geo, hex, op, y, o) => { const m = flat(geo, hex, op, 0, y, 0, o); g.add(m); return m; };
  if (a.type === 'prop') {       // a ring blade hanging in the air where it stopped, turning slowly, waiting to be called back
    const star = a.src && a.src.kind === 'hero' && SKINS[a.src.key][a.src.skin].fx === 'C', tilt = new THREE.Group(), k = star ? starProp(c) : chakram(c, 0.21), gl = shared(halo(c, star ? 1.5 : 1.0, 0.8)); v.star = star;
    tilt.rotation.z = 0.32; tilt.position.y = 0.6; tilt.add(k); g.add(tilt); gl.position.y = 0.6; g.add(gl); v.spinY = k; v.tilt = tilt;
    v.ring = put(FG.ringThin, rimC, 0.8, 0.06); v.ring.scale.set(0.3, 1, 0.3); g.rotation.y = -a.ang; FX.group.add(g); return v;
  }
  if (a.type === 'trap') {       // a paper ward on a short stake; its owner's side sees the reach, the other side barely sees it at all
    const op = hostile ? 0.16 : 1, st = new THREE.Mesh(FG.cyl || FG.oct, fxMat('#8a6a48', 0.9 * op, { blending: THREE.NormalBlending })); st.scale.set(0.02, 0.5, 0.02); st.position.y = 0.25; g.add(st);
    v.slip = new THREE.Mesh(FG.plane, fxMat('#ffffff', 0.95 * op, { side: THREE.DoubleSide, blending: THREE.NormalBlending })); v.slip.scale.set(0.2, 1, 0.42); v.slip.rotation.x = HP2; v.slip.position.y = 0.62; g.add(v.slip);
    const dot = new THREE.Mesh(FG.oct, fxMat(c, 0.9 * op)); dot.scale.set(0.05, 0.05, 0.05); dot.position.y = 0.66; dot.position.z = 0.012; g.add(dot); v.dot = dot;
    v.ring = put(FG.ringThin, c, hostile ? 0 : 0.5, 0.06); v.ring.scale.set(r, 1, r); v.op = op; if (!hostile) { v.gl = shared(halo(c, 0.9, 0.5)); v.gl.position.y = 0.62; g.add(v.gl); }
    FX.group.add(g); return v;
  }
  if (a.type === 'beam') {
    const len = a.len * S3, w = a.w * S3;
    v.fill = put(FG.plane, c, 0.14, 0.06); v.fill.scale.set(len, 1, w); v.fill.position.x = len / 2;
    v.core = put(FG.plane, '#ffffff', 0.0, 0.07); v.core.position.x = len / 2;
    for (const k of [-1, 1]) { const e = put(FG.plane, rimC, 0.85, 0.065); e.position.set(len / 2, 0.065, k * w / 2); e.scale.set(len, 1, 0.045); }
    v.orb = put(FG.sphere, c, 0.7, 1.3); v.orb.position.x = 0.85; v.glow = shared(halo(c, 1, 0.9)); v.glow.position.set(0.85, 1.3, 0); g.add(v.glow);
    g.rotation.y = -a.ang; v.len = len; v.w = w;
  } else {
    v.fill = put(FG.disc, c, a.type === 'zone' ? 0.16 : 0.13, 0.055); v.fill.scale.set(r, 1, r);
    v.rim = put(FG.ringThin, rimC, 0.95, 0.065); v.rim.scale.set(r, 1, r);
    if (a.type === 'delay') v.grow = put(FG.disc, c, a.look === 'frost' ? 0.14 : 0.24, 0.06);
    const deco = (tex, hex, k) => { v.dec = put(FG.plane, hex, 0, 0.07, { map: tex }); v.dec.scale.set(r * 2 * (k || 1), 1, r * 2 * (k || 1)); };
    if (a.look === 'frost') deco(GX.tex.frost, lite(c, 0.4));
    else if (a.look === 'slam') deco(GX.tex.crack, c);
    else if (a.look === 'stars') { deco(GX.tex.rune, c); v.fill.material.opacity = 0.08; }
    else if (a.look === 'bramble') { deco(GX.tex.crack, hostile ? '#ff8a6a' : '#9fe05a', 1.0); v.fill.material.opacity = 0.07; }       // roots spreading under the ground
    else if (a.look === 'trap') { deco(GX.tex.mark, c, 0.8); v.trap = new THREE.Group(); v.trap.add(shared(new THREE.Mesh(FG.trap, GX.mat.trap))); for (const k of [-1, 1]) { const j = shared(new THREE.Mesh(FG.jaw, GX.mat.trap)); j.rotation.x = k * 1.45; v.trap.add(j); } v.trap.position.y = 0.06; v.trap.scale.setScalar(1.35); g.add(v.trap); v.lamp = shared(halo(c, 0.6, 0.9)); v.lamp.position.y = 0.25; g.add(v.lamp); }
    else if (a.look === 'comb') { deco(GX.tex.comb, c, 1.0); v.fill.material.opacity = 0.06; hiveBees(v, a, g, r * 0.8, 3, 0.3, false); }       // (three bees about their business over it)
    else if (a.look === 'bronze') { deco(GX.tex.rings, c, 1.0); v.fill.material.opacity = 0.05; v.dome = new THREE.Mesh(FG.dome, fxMat(c, 0.1, { map: GX.tex.hex })); v.dome.scale.set(r, r * 0.42, r); v.dome.renderOrder = 4; g.add(v.dome); }       // the shield a side shares: a low dome over the ground it covers
    else if (a.look === 'hive') { deco(GX.tex.comb, lite(c, 0.25), 1.0); v.fill.material.opacity = 0.04; hiveBees(v, a, g, r, V.q < 1 ? 9 : 14, 0.36, !!a.q); }       // the hive in the air about her: bees on their rounds at every distance out to its reach, and (the Queen's Flight) the queen over her head
    else if (a.look === 'cyclone') { deco(GX.tex.swirl, lite(c, 0.3), 1.15); v.rings = []; for (let i = 0; i < 7; i++) { const q = new THREE.Mesh(new THREE.RingGeometry(0.87, 1, 24, 1, 0, 3.4).rotateX(-HP2), fxMat(i % 2 ? '#ffffff' : lite(c, 0.2), 0.3)); q.userData.ownGeo = 1; const k = r * (0.22 + i * 0.115); q.scale.set(k, 1, k); q.position.y = 0.15 + i * 0.4; g.add(q); v.rings.push(q); } }
    else if (a.look === 'spin') { v.fill.visible = false; v.rim.visible = false; deco(GX.tex.swirl, c, 1.05); v.rings = []; for (let i = 0; i < 4; i++) { const q = new THREE.Mesh(new THREE.RingGeometry(i % 2 ? 0.94 : 0.76, 1, 24, 1, (i >> 1) * Math.PI, 1.7).rotateX(-HP2), fxMat(i % 2 ? '#ffffff' : c, 0.5)); q.userData.ownGeo = 1; const k = r * (i < 2 ? 1 : 0.82); q.scale.set(k, 1, k); q.position.y = i < 2 ? 0.85 : 1.3; g.add(q); v.rings.push(q); } }
  }
  FX.group.add(g); return v;
}
function syncAreas(t, dt) {
  const tick = FX.tick;
  for (const a of G.areas) {
    let v = a._v; if (!v || v.dead) { v = a._v = areaView(a); FX.av.push(v); }
    v.tick = tick; const g = v.m, x = a.x * S3, z = a.y * S3, r = (a.r || 100) * S3, c = v.c, near = nearCam(a.x, a.y, 400);
    g.position.set(x, 0, z); g.visible = near; if (!near) continue;
    if (a.type === 'prop') { v.ring.material.opacity = 0.5 + 0.4 * Math.sin(t * 8 + a.x); g.scale.setScalar(0.6 + 0.4 * Math.min(1, a.t / 0.3)); v.spinY.rotation.y += dt * 7; v.tilt.position.y = 0.6 + Math.sin(t * 3 + a.x) * 0.06; if (Math.random() < dt * 3) FX.add.emit(x, 0.4 + Math.random() * 0.5, z, 0, 0.5, 0, 0.6, 0.1, 0.02, c, 0.8, 0, 0); continue; }
    if (a.type === 'trap') { const arm = Math.min(1, (a.dur - a.t) / a.arm); v.slip.rotation.y = Math.sin(t * 2.4 + a.x) * 0.5; v.slip.position.y = 0.62 + Math.sin(t * 3 + a.y) * 0.03; g.scale.setScalar(0.3 + 0.7 * arm); v.ring.material.opacity = v.op < 1 ? 0 : arm < 1 ? 0.2 : 0.28 + 0.14 * Math.sin(t * 3 + a.x); v.dot.material.opacity = v.op * (0.6 + 0.4 * Math.sin(t * 5)); continue; }
    if (a.type === 'delay') {
      const k = clamp(1 - a.t / a.dur, 0, 1); v.grow.scale.set(r * k, 1, r * k); v.rim.material.opacity = 0.7 + 0.3 * Math.sin(t * 18);
      if (v.dec) { v.dec.material.opacity = 0.25 + 0.6 * k; v.dec.rotation.y = a.look === 'frost' ? t * 1.5 : a.look === 'trap' ? -t * 2 : a.look === 'bramble' ? t * 0.6 : 0; }
      if (a.look === 'frost' && Math.random() < dt * 30) { const q = Math.random() * TAU, d = Math.sqrt(Math.random()) * r; FX.add.emit(x + Math.cos(q) * d, 0.05, z + Math.sin(q) * d, 0, 0.9, 0, 0.7, 0.12, 0.03, '#e8f8ff', 0.9, 0, 0); }
      if (v.trap) { const on = a.dur - a.t > 0.28; v.trap.visible = on; v.lamp.visible = on && Math.sin(t * (6 + k * 22)) > 0; }
    } else if (a.type === 'beam') {
      const k = clamp(1 - a.t / a.dur, 0, 1); v.fill.material.opacity = 0.12 + 0.22 * k; v.core.scale.set(v.len, 1, v.w * (0.1 + 0.25 * k)); v.core.material.opacity = 0.5 * k;
      const q = 0.1 + 0.3 * k + Math.sin(t * 40) * 0.02; v.orb.scale.setScalar(q); v.glow.scale.setScalar(1 + 3.2 * k);
      const mx = x + Math.cos(a.ang) * 0.85, mz = z + Math.sin(a.ang) * 0.85; v.acc += dt; while (v.acc > 0.025) { v.acc -= 0.025; conv3(mx, 1.3, mz, 1.5, 1, c, 0.3, 0.15); }
      if (Math.random() < dt * 9) bolt3(mx, 1.3, mz, mx + (Math.random() - .5) * 1.6, 0.2 + Math.random() * 2, mz + (Math.random() - .5) * 1.6, lite(c, 0.4), 0.03, 0.14, 0.25, 4);
    } else {
      const fade = Math.min(1, (a.dur - a.t) / 0.3) * Math.min(1, Math.max(0, a.t) / 0.25 + 0.2); v.fill.material.opacity = (a.look === 'stars' ? 0.08 : 0.16) * fade; v.rim.material.opacity = 0.9 * fade;
      v.acc += dt;
      if (a.look === 'stars') { v.dec.material.opacity = 0.58 * fade; v.dec.rotation.y = t * 0.8; while (v.acc > 0.075) { v.acc -= 0.075; const q = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.92; starFall(x + Math.cos(q) * d, z + Math.sin(q) * d, Math.random() < 0.3 ? '#ffffff' : c); } if (Math.random() < dt * 16) { const q = Math.random() * TAU, d = Math.sqrt(Math.random()) * r; FX.add.emit(x + Math.cos(q) * d, 0.05, z + Math.sin(q) * d, 0, 1.4, 0, 0.7, 0.13, 0.03, c, 0.9, 0, 0); } }
      else if (a.look === 'comb') { v.dec.material.opacity = (0.46 + 0.1 * Math.sin(t * 3 + a.x)) * fade; v.dec.rotation.y = 0.3 + t * 0.1; v.fill.material.opacity = 0.06 * fade;
        for (const b of v.bees) { const q = b.ph + t * b.w * 0.6; b.m.position.set(Math.cos(q) * b.r, 0.5 + (b.y - 0.5) * 0.35 + Math.sin(t * 4 + b.ph) * 0.1, Math.sin(q) * b.r); b.m.rotation.set(0, -q - (b.w > 0 ? HP2 : -HP2), 0); b.m.scale.setScalar(b.s * Math.min(1, fade * 1.2)); b.wing.scale.y = Math.cos(t * 50 + b.ph); }
        if (v.acc > 0.1) { v.acc = 0; const q = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.92; FX.add.emit(x + Math.cos(q) * d, 0.08, z + Math.sin(q) * d, 0, 0.8 + Math.random() * 0.6, 0, 0.9, 0.13, 0.03, Math.random() < 0.3 ? '#ffffff' : c, 0.9, 0, 0); } }
      else if (a.look === 'bronze') { const pf = a.pool ? clamp(a.pool.v / a.pool.v0, 0, 1) : 1;       // (it thins as it is worn down)
        v.dec.material.opacity = (0.12 + 0.16 * pf) * fade; v.dec.rotation.y = 0; { const q = r * 2 * (0.94 + 0.06 * Math.sin(t * 4)); v.dec.scale.set(q, 1, q); } v.fill.material.opacity = 0.05 * fade; v.rim.material.opacity = (0.45 + 0.5 * pf) * fade;
        v.dome.material.opacity = (0.03 + 0.08 * pf) * fade * (0.85 + 0.15 * Math.sin(t * 5)); v.dome.rotation.y = -t * 0.3;
        if (v.acc > 0.7) { v.acc = 0; ring3(x, z, r * 0.15, r * 0.97, 0.9, c, 0.22, true, 0.08); } }
      else if (a.look === 'hive') { v.dec.material.opacity = 0.2 * fade; v.dec.rotation.y = -t * 0.45; v.fill.material.opacity = 0.04 * fade; hiveSync(v, a, t, dt, x, z, fade, c); }
      else if (a.look === 'cyclone') { v.dec.material.opacity = 0.42 * fade; v.dec.rotation.y = t * 7; v.rings.forEach((q, i) => { q.rotation.y = -t * (10 - i * 0.9) + i * 1.3; q.position.x = Math.sin(t * 3 + i * 0.8) * 0.05 * i; q.material.opacity = (i % 2 ? 0.26 : 0.36) * fade; });
        while (v.acc > 0.03) { v.acc -= 0.03; const q = Math.random() * TAU, d = r * (0.25 + Math.random() * 0.7); FX.add.emit(x + Math.cos(q) * d, 0.1 + Math.random() * 0.4, z + Math.sin(q) * d, -Math.sin(q) * 5, 2.6, Math.cos(q) * 5, 0.55, 0.16, 0.04, Math.random() < 0.5 ? '#ffffff' : c, 0.8, 0, 0.5); if (Math.random() < 0.25) FX.alpha.emit(x + Math.cos(q) * d, 0.1, z + Math.sin(q) * d, -Math.sin(q) * 4, 2.2, Math.cos(q) * 4, 0.6, 0.12, 0.08, '#b9a98a', 0.9, 3, 0.4); } }
      else if (a.look === 'spin') { v.dec.material.opacity = 0.55 * fade; v.dec.rotation.y = -t * 16; v.rings.forEach((q, i) => { q.rotation.y = -t * (i < 2 ? 21 : 17) + (i < 2 ? 0 : 1.2); q.material.opacity = (i % 2 ? 0.6 : 0.34) * fade; });
        while (v.acc > 0.03) { v.acc -= 0.03; const q = Math.random() * TAU; FX.add.emit(x + Math.cos(q) * r * 0.9, 0.85, z + Math.sin(q) * r * 0.9, -Math.sin(q) * 4, 0.3, Math.cos(q) * 4, 0.25, 0.14, 0.03, c, 1, 0, 0); if (Math.random() < 0.3) FX.alpha.emit(x + Math.cos(q) * r * 0.8, 0.08, z + Math.sin(q) * r * 0.8, -Math.sin(q) * 3, 0.8, Math.cos(q) * 3, 0.5, 0.18, 0.5, '#d8cfb4', 0.35, -0.2, 1); } }
      else if (v.acc > 0.1) { v.acc = 0; const q = Math.random() * TAU, d = Math.sqrt(Math.random()) * r; FX.add.emit(x + Math.cos(q) * d, 0.1, z + Math.sin(q) * d, 0, 1.2, 0, 0.6, 0.14, 0.03, c, 0.9, 0, 0); }
    }
  }
  for (let i = FX.av.length - 1; i >= 0; i--) { const v = FX.av[i]; if (v.tick !== tick) { v.dead = true; fxDrop(v.m); FX.av[i] = FX.av[FX.av.length - 1]; FX.av.pop(); } }
}
