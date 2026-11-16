/* ============================================================
   3D graphics core (three.js): renderer, lights, baked low-poly
   geometry, shared materials, procedural textures
   ============================================================ */
const S3 = 0.01, WM = W * S3, TILT = 0.8;      // metres per sim unit · world size in metres · sin(camera pitch)
const TIME = { value: 0 };
const GX = { ok: false, r: null, scene: null, cam: null, sun: null, hemi: null, tex: {}, mat: {}, shadows: true, maxAniso: 1 };

function hash2(a, b, k) { let h = (a * 374761393 + b * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function shade(hex, f) {       // f<0 darker, f>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | (b | 0)).toString(16).slice(1);
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function vnoise(x, y, k) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, k), b = hash2(xi + 1, yi, k), c = hash2(xi, yi + 1, k), d = hash2(xi + 1, yi + 1, k);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const seg01 = (u, a, b) => u <= a ? 0 : u >= b ? 1 : (u - a) / (b - a);
function angLerp(a, b, t) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return a + d * t; }

/* colours are authored in sRGB; three r128 lights in linear space */
const _linC = new Map();
function lin(c) { let v = _linC.get(c); if (!v) { v = new THREE.Color(c); v.convertSRGBToLinear(); _linC.set(c, v); } return v; }

/* ---------- geometry baking: many primitives -> one vertex-coloured mesh ---------- */
let _M4, _Q4, _E3, _P3, _S3v;
class PB {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(g, c, o) {
    o = o || {};
    if (g.index) { const t = g.toNonIndexed(); g.dispose(); g = t; }
    const s = o.s || 1;
    _E3.set(o.rx || 0, o.ry || 0, o.rz || 0); _Q4.setFromEuler(_E3);
    _M4.compose(_P3.set(o.x || 0, o.y || 0, o.z || 0), _Q4, _S3v.set((o.sx || 1) * s, (o.sy || 1) * s, (o.sz || 1) * s));
    g.applyMatrix4(_M4);
    if (o.flat) g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { if (P[i] < y0) y0 = P[i]; if (P[i] > y1) y1 = P[i]; }
    const a = lin(c), b = o.c2 ? lin(o.c2) : a, sh = o.sh == null ? 0.8 : o.sh, dy = (y1 - y0) || 1;
    for (let i = 0; i < P.length; i += 3) {
      const t = (P[i + 1] - y0) / dy, k = sh + (1 - sh) * t;
      this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]);
      this.c.push((a.r + (b.r - a.r) * t) * k, (a.g + (b.g - a.g) * t) * k, (a.b + (b.b - a.b) * t) * k);
    }
    g.dispose(); return this;
  }
  box(w, h, d, c, o) { return this.add(new THREE.BoxGeometry(w, h, d), c, o); }
  cyl(rt, rb, h, c, o, n) { return this.add(new THREE.CylinderGeometry(rt, rb, h, n || 8, 1), c, o); }
  tube(rt, rb, h, c, o, n) { return this.add(new THREE.CylinderGeometry(rt, rb, h, n || 8, 1, true), c, o); }
  sph(r, c, o, ws, hs) { return this.add(new THREE.SphereGeometry(r, ws || 10, hs || 8), c, o); }
  dome(r, c, o, th, ws, hs) { return this.add(new THREE.SphereGeometry(r, ws || 12, hs || 6, 0, TAU, 0, th || Math.PI / 2), c, o); }
  cone(r, h, c, o, n) { return this.add(new THREE.ConeGeometry(r, h, n || 7, 1), c, o); }
  ico(r, c, o, det) { return this.add(new THREE.IcosahedronGeometry(r, det || 0), c, Object.assign({ flat: true }, o)); }
  oct(r, c, o) { return this.add(new THREE.OctahedronGeometry(r, 0), c, Object.assign({ flat: true }, o)); }
  dod(r, c, o) { return this.add(new THREE.DodecahedronGeometry(r, 0), c, Object.assign({ flat: true }, o)); }
  tor(R, t, c, o, rs, ts, arc) { return this.add(new THREE.TorusGeometry(R, t, rs || 5, ts || 12, arc || TAU), c, o); }
  get empty() { return this.p.length === 0; }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); return g;
  }
  mesh(mat, shadow) { const m = new THREE.Mesh(this.geo(), mat); m.castShadow = shadow !== false; return m; }
}
/* A leaf of metal: flat, a point at either end, widest a third of the way up, a ridge down the middle. It runs along +Y from the origin,
   `len` long, `wid` across (X) and `th` thick at the ridge (Z). Flat-shaded, ready for PB.add or a mesh of its own. */
function leafGeo(len, wid, th, n) {
  n = n || 9; const P = [], W = t => wid / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85), Hh = t => th / 2 * (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(t, 0.8)));
  const quad = (a, b, c, d) => P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, y0 = t0 * len, y1 = t1 * len, w0 = W(t0), w1 = W(t1), h0 = Hh(t0), h1 = Hh(t1);
    quad([-w0, y0, 0], [0, y0, h0], [0, y1, h1], [-w1, y1, 0]); quad([0, y0, h0], [w0, y0, 0], [w1, y1, 0], [0, y1, h1]);
    quad([w0, y0, 0], [0, y0, -h0], [0, y1, -h1], [w1, y1, 0]); quad([0, y0, -h0], [-w0, y0, 0], [-w1, y1, 0], [0, y1, -h1]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
}
function bone(name, x, y, z, parent) { const g = new THREE.Group(); g.name = name; g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }

/* ---------- materials ---------- */
function rimInject(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>',
    'float rimK = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);\n\tgl_FragColor.rgb += vec3(0.5, 0.58, 0.7) * pow(rimK, 3.0) * 0.45;\n\t#include <tonemapping_fragment>');
}
function charMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.06 });
  m.onBeforeCompile = rimInject; return m;
}
function swayInject(amp, base) {
  return sh => {
    sh.uniforms.uTime = TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 swp = (instanceMatrix * vec4(position, 1.0)).xyz;
      #else
        vec3 swp = (modelMatrix * vec4(position, 1.0)).xyz;
      #endif
      float swv = sin(uTime * 1.6 + swp.x * 0.9 + swp.z * 0.7) * 0.6 + sin(uTime * 2.7 + swp.x * 1.9 - swp.z * 0.4) * 0.4;
      float swh = max(0.0, position.y - ${base.toFixed(3)});
      transformed.x += swv * ${amp.toFixed(3)} * swh; transformed.z += swv * ${(amp * 0.6).toFixed(3)} * swh;`);
  };
}
function glowMat(hex) {
  const k = 'g' + hex; let m = GX.mat[k];
  if (!m) m = GX.mat[k] = new THREE.MeshBasicMaterial({ color: lin(hex), toneMapped: false });
  return m;
}
function fxMat(hex, opacity, o) {      // additive, one per effect so opacity can animate
  return new THREE.MeshBasicMaterial(Object.assign({ color: lin(hex), transparent: true, opacity: opacity == null ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }, o));
}
function halo(hex, size, opacity) {
  const k = 's' + hex + (opacity || 1); let m = GX.mat[k];
  if (!m) m = GX.mat[k] = new THREE.SpriteMaterial({ map: GX.tex.glow, color: lin(hex), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity || 1, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, o) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); Object.assign(t, o || {}); t.needsUpdate = true; return t;
}
function makeFxTextures() {
  GX.tex.glow = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.55)'); r.addColorStop(0.6, 'rgba(255,255,255,0.13)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  // soft band: bright centre line fading to both edges (beams, slashes)
  GX.tex.band = canvasTex(8, 64, (g) => { const r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 8, 64); });
  // pillar: opaque at the bottom, gone at the top
  GX.tex.pillar = canvasTex(8, 64, (g) => { const r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = r; g.fillRect(0, 0, 8, 64); });
  // ground disc with a bright rim
  GX.tex.disc = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0.10)'); r.addColorStop(0.7, 'rgba(255,255,255,0.22)'); r.addColorStop(0.93, 'rgba(255,255,255,0.75)'); r.addColorStop(0.985, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  // soft dark blob (fallback shadows)
  GX.tex.blob = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.6, 'rgba(0,0,0,0.3)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  /* ---- skill-effect textures: white on transparent, tinted by the material ---- */
  const HPI = Math.PI / 2, circ = (g, r, w, a) => { g.globalAlpha = a == null ? 1 : a; g.lineWidth = w; g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); g.globalAlpha = 1; };
  // arcane circle: rings, tick marks, a hexagram and six small seals
  // a star chart: rings, ticks and a few constellations
  GX.tex.starmap = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; let s = 11; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (const [r, w, a] of [[122, 2.5, 1], [112, 1, 0.6], [78, 1.2, 0.5], [40, 1, 0.45]]) { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); }
    g.globalAlpha = 0.8; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r0 = i % 4 ? 114 : 108; g.lineWidth = i % 4 ? 1 : 2.2; g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * 121, 128 + Math.sin(a) * 121); g.stroke(); }
    for (let c = 0; c < 5; c++) { const a0 = c / 5 * TAU + R(), pts = []; let a = a0, r = 50 + R() * 40; for (let i = 0; i < 4; i++) { pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); a += 0.18 + R() * 0.3; r = clamp(r + (R() - .5) * 46, 22, 104); }
      g.globalAlpha = 0.55; g.lineWidth = 1.2; g.beginPath(); pts.forEach((q, i) => g[i ? 'lineTo' : 'moveTo'](q[0], q[1])); g.stroke();
      g.globalAlpha = 1; pts.forEach((q, i) => { const k = i === 1 ? 4.6 : 2.4; g.beginPath(); g.moveTo(q[0], q[1] - k * 1.8); g.lineTo(q[0] + k * 0.45, q[1] - k * 0.45); g.lineTo(q[0] + k * 1.8, q[1]); g.lineTo(q[0] + k * 0.45, q[1] + k * 0.45); g.lineTo(q[0], q[1] + k * 1.8); g.lineTo(q[0] - k * 0.45, q[1] + k * 0.45); g.lineTo(q[0] - k * 1.8, q[1]); g.lineTo(q[0] - k * 0.45, q[1] - k * 0.45); g.closePath(); g.fill(); }); }
    g.globalAlpha = 0.7; for (let i = 0; i < 40; i++) { const a = R() * TAU, r = R() * 118; g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 0.6 + R() * 1.1, 0, TAU); g.fill(); }
    g.globalAlpha = 1; const rg = g.createRadialGradient(128, 128, 0, 128, 128, 124); rg.addColorStop(0, 'rgba(255,255,255,0.16)'); rg.addColorStop(1, 'rgba(255,255,255,0.03)'); g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill();
  });
  GX.tex.rune = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    circ(g, 122, 5); circ(g, 107, 2, 0.8); circ(g, 68, 3, 0.9); circ(g, 30, 2, 0.8);
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; g.lineWidth = i % 3 ? 2 : 5; g.beginPath(); g.moveTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); g.lineTo(128 + Math.cos(a) * 119, 128 + Math.sin(a) * 119); g.stroke(); }
    g.lineWidth = 3; for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = k * Math.PI / 3 + i * TAU / 3 - HPI; g[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); } g.closePath(); g.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = 128 + Math.cos(a) * 87, y = 128 + Math.sin(a) * 87; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 124); r.addColorStop(0, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0.05)'); g.fillStyle = r; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill();
  });
  // radial ground cracks
  GX.tex.crack = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    let s = 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 11; i++) {
      let a = i / 11 * TAU + R() * 0.4, x = 128, y = 128; const len = 62 + R() * 62;
      g.beginPath(); g.moveTo(x, y);
      for (let d = 0; d < len; d += 13) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * 13; y += Math.sin(a) * 13; g.lineTo(x, y); if (R() < 0.38) { const b = a + (R() < .5 ? 1 : -1) * (0.5 + R() * 0.5), l = 10 + R() * 22; g.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l); g.moveTo(x, y); } }
      g.lineWidth = 2.2 + R() * 3.6; g.stroke();
    }
    g.globalCompositeOperation = 'destination-in'; const r = g.createRadialGradient(128, 128, 10, 128, 128, 126); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.72, 'rgba(0,0,0,0.9)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  });
  // four spiral arms
  GX.tex.swirl = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 64; i++) {
      const t = i / 64, a = arm * HPI + t * 4.2, r = 12 + t * 110, a2 = a + 0.085, r2 = r + 1.8, e = Math.sin(t * Math.PI);
      g.globalAlpha = 0.12 + e * 0.8; g.lineWidth = 1.5 + e * 9; g.beginPath(); g.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); g.lineTo(128 + Math.cos(a2) * r2, 128 + Math.sin(a2) * r2); g.stroke();
    }
  });
  // snowflake seal
  GX.tex.frost = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.translate(128, 128);
    for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -114); g.stroke(); g.lineWidth = 3.5; for (const [d, l] of [[38, 26], [68, 32], [94, 18]]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(0, -d); g.lineTo(k * l, -d - l * 0.8); g.stroke(); } g.restore(); }
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.stroke();
    g.lineWidth = 2; g.globalAlpha = 0.75; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 58, Math.sin(a) * 58); } g.closePath(); g.stroke();
    g.globalAlpha = 0.1; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill();
  });
  // crosshair seal (marks and focus effects)
  GX.tex.mark = canvasTex(128, 128, g => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 54, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 35, 0, TAU); g.stroke();
    g.lineWidth = 6; for (let i = 0; i < 4; i++) { const a = i * HPI; g.beginPath(); g.moveTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); g.lineTo(64 + Math.cos(a) * 63, 64 + Math.sin(a) * 63); g.stroke(); }
    g.beginPath(); g.moveTo(64, 49); g.lineTo(75, 64); g.lineTo(64, 79); g.lineTo(53, 64); g.closePath(); g.fill();
  });
  // honeycomb for shields (tiles)
  GX.tex.hex = canvasTex(128, 128, g => {
    g.strokeStyle = '#fff'; g.lineWidth = 2.4; const w = 32, rr = w / Math.sqrt(3), sy = 32 / (rr * 1.5);
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) { const cx = col * w + (row & 1 ? w / 2 : 0), cy = row * 32; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy); } g.closePath(); g.stroke(); }
    g.globalAlpha = 0.14; g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  GX.tex.hex.repeat.set(10, 3);
  // a round of honeycomb: cells out to the rim, some of them full
  GX.tex.comb = canvasTex(256, 256, g => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineJoin = 'round'; const rr = 21, w = rr * Math.sqrt(3);
    let s = 11; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) {
      const cx = 128 + col * w + (row & 1 ? w / 2 : 0), cy = 128 + row * rr * 1.5, d = Math.hypot(cx - 128, cy - 128); if (d > 110) continue;
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * (rr - 1.5), cy + Math.sin(a) * (rr - 1.5)); } g.closePath();
      g.globalAlpha = R() < 0.3 ? 0.42 : 0.1; g.fill(); g.globalAlpha = 0.95 - d / 110 * 0.35; g.lineWidth = 3; g.stroke();
    }
  });
  // chain links (tiles along its length)
  GX.tex.chain = canvasTex(64, 16, g => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 3.2; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(16 + i * 32, 8, 11, 5, 0, 0, TAU); g.stroke(); g.fillRect(27 + i * 32, 6, 10, 4); } g.fillRect(-5, 6, 10, 4); }, { wrapS: THREE.RepeatWrapping });
  // streak: fades in along its length, soft across
  const grad = (w, h, fn) => canvasTex(w, h, g => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = 255 * clamp(fn(x / (w - 1), Math.abs(y - (h - 1) / 2) / ((h - 1) / 2)), 0, 1); } g.putImageData(im, 0, 0); });
  GX.tex.streak = grad(128, 32, (u, v) => Math.pow(u, 1.6) * Math.pow(1 - v, 1.5));
  // plume: a feather of light, root to tip along its length: a bright quill, soft vanes with a grain to them, gone by the tip
  GX.tex.plume = grad(128, 32, (u, v) => { const quill = Math.max(0, 1 - v * 7) * 0.3 * (1 - u * 0.5), vane = (1 - Math.pow(v, 2.4)) * (0.84 + 0.16 * Math.sin(u * 52 + v * 7)); return Math.min(1, u * 18) * Math.pow(1 - u, 0.3) * Math.min(1, vane * 0.95 + quill); });
  // cut: a lens that tapers to a point at both ends
  GX.tex.cut = grad(128, 32, (u, v) => { const e = 1 - Math.pow(Math.abs(u * 2 - 1), 1.5), k = v / Math.max(0.02, e); return k >= 1 ? 0 : Math.pow(1 - k, 1.3) * (0.4 + 0.6 * e); });
  // eclipse: a corona (a ring of fire with flares) and the dark disc that sits in it; shatter: straight cracks, as in glass
  GX.tex.corona = canvasTex(256, 256, g => {
    g.translate(128, 128);
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * TAU + (hash2(i, 3, 7) - .5) * 0.2, len = 18 + hash2(i, 5, 9) * hash2(i, 8, 1) * 60, w = 0.035 + hash2(i, 9, 2) * 0.05;
      const gr = g.createRadialGradient(0, 0, 50, 0, 0, 50 + len); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(Math.cos(a - w) * 50, Math.sin(a - w) * 50); g.lineTo(Math.cos(a) * (50 + len), Math.sin(a) * (50 + len)); g.lineTo(Math.cos(a + w) * 50, Math.sin(a + w) * 50); g.closePath(); g.fill();
    }
    const r = g.createRadialGradient(0, 0, 44, 0, 0, 86); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.14, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 86, 0, TAU); g.fill();
  });
  GX.tex.moon = canvasTex(128, 128, g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.72, 'rgba(0,0,0,1)'); r.addColorStop(0.8, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  GX.tex.shatter = canvasTex(256, 256, g => {
    g.translate(128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round'; const N = 13, A = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + (hash2(i, 1, 4) - .5) * 0.3; A.push(a); g.lineWidth = 1.2 + hash2(i, 2, 5) * 2.4; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      for (let r = 8, k = 0; r < 118; k++) { r += 14 + hash2(i, k, 6) * 22; const b = a + (hash2(i, k, 3) - .5) * 0.16, q = Math.min(r, 122); g.lineTo(Math.cos(b) * q, Math.sin(b) * q); }
      g.stroke();
    }
    g.lineWidth = 1.4;
    for (const rr of [34, 62, 95]) for (let i = 0; i < N; i++) { if (hash2(i, rr, 8) < 0.35) continue; const a = A[i], b = A[(i + 1) % N] + (i === N - 1 ? TAU : 0), q = rr * (0.85 + hash2(i, rr, 2) * 0.3), q2 = q * (0.9 + hash2(i, rr, 5) * 0.2); g.beginPath(); g.moveTo(Math.cos(a) * q, Math.sin(a) * q); g.lineTo(Math.cos(b) * q2, Math.sin(b) * q2); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; const r = g.createRadialGradient(0, 0, 30, 0, 0, 126); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(-128, -128, 256, 256);
  });
  // four-point sparkle
  GX.tex.star = canvasTex(64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.4)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? 3.5 : 31; g[i ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * q, 32 + Math.sin(a) * q); } g.closePath(); g.fill();
  });
}

/* ---------- renderer ---------- */
function gfxInit(cv) {
  if (typeof THREE === 'undefined') return false;
  let r;
  try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }); } catch (e) { return false; }
  if (!r.getContext()) return false;
  _M4 = new THREE.Matrix4(); _Q4 = new THREE.Quaternion(); _E3 = new THREE.Euler(); _P3 = new THREE.Vector3(); _S3v = new THREE.Vector3();
  GX.r = r; GX.ok = true;
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.NoToneMapping;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(new THREE.Color('#1e4a30'), 1);
  GX.maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy());
  makeFxTextures();
  const sc = GX.scene = new THREE.Scene();
  GX.hemi = new THREE.HemisphereLight(lin('#e6f1ff'), lin('#6c8a5c'), 0.74); sc.add(GX.hemi);
  const sun = GX.sun = new THREE.DirectionalLight(lin('#fff2d8'), 0.86);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc2 = sun.shadow.camera; sc2.left = -13; sc2.right = 13; sc2.top = 13; sc2.bottom = -13; sc2.near = 2; sc2.far = 60;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  sc.add(sun); sc.add(sun.target);
  GX.cam = new THREE.PerspectiveCamera(32, 1, 0.5, 140);
  GX.mat.vc = new THREE.MeshLambertMaterial({ vertexColors: true });
  GX.mat.vcFlat = new THREE.MeshLambertMaterial({ vertexColors: true });
  GX.mat.vcGhost = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false });
  { const o = { vertexColors: true, roughness: 0.4, metalness: 0.15, emissive: lin('#8a5c12'), emissiveIntensity: 0.6 };       // turret plating: gold that glows a little of itself
    GX.mat.gold = new THREE.MeshStandardMaterial(o); GX.mat.goldGhost = new THREE.MeshStandardMaterial(Object.assign({ transparent: true, opacity: 0.3, depthWrite: false }, o)); }
  return true;
}
const SUN_OFF = { x: -6.5, y: 14, z: 7.5 };
function sunFollow(tx, tz) {
  // keep the shadow frustum centred on the view, snapped to shadow texels so edges do not crawl
  const sun = GX.sun, L = Math.hypot(SUN_OFF.x, SUN_OFF.y, SUN_OFF.z), tex = 26 / sun.shadow.mapSize.x;
  const dx = -SUN_OFF.x / L, dy = -SUN_OFF.y / L, dz = -SUN_OFF.z / L;                 // light direction
  let rx = dz, rz = -dx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;            // right = dir x up(0,1,0) flattened
  const ux = -dy * rz, uy = rx * dz - rz * dx, uz = dy * rx;                           // up = right x dir (unit, since both are)
  const pr = Math.round((tx * rx + tz * rz) / tex) * tex, pu = Math.round((tx * ux + tz * uz) / tex) * tex;
  // rebuild a point on the ground plane with those snapped light-space coordinates
  const det = rx * uz - rz * ux; const sx2 = (pr * uz - rz * pu) / det, sz2 = (rx * pu - pr * ux) / det;
  sun.target.position.set(sx2, 0, sz2); sun.position.set(sx2 + SUN_OFF.x, SUN_OFF.y, sz2 + SUN_OFF.z);
  sun.target.updateMatrixWorld();
}
