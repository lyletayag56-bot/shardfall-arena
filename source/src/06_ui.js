/* ============================================================
   UI: menus, HUD, input (touch + keyboard/mouse), audio, main loop
   ============================================================ */
const $ = id => document.getElementById(id);
const F = 'fill="currentColor" stroke="none"';
const ICONS = {
  dash: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>',
  bee: `<ellipse ${F} cx="12" cy="14.5" rx="4" ry="5.5"/><path stroke="#0d1b21" stroke-width="1.7" d="M8.4 13h7.2M8.6 16.2h6.8"/><circle ${F} cx="12" cy="6.7" r="2"/><path d="M12 20v2M10.6 5l-1.300-2M13.4 5l1.300-2"/><path d="M8.5 11C5 11.500 2.500 10 2.500 8s3-2.500 6 .5M15.500 11c3.500.5 6-1 6-3s-3-2.500-6 .5"/>`,
  sting: `<path ${F} d="M21.500 2.500l-4.300 10.700-6.400-6.400z"/><circle ${F} cx="9.6" cy="14.4" r="1.900"/><circle ${F} cx="5.800" cy="18.200" r="1.500"/><circle ${F} cx="13" cy="19" r="1.300"/><circle ${F} cx="4" cy="12.500" r="1.100"/>`,
  comb: `<path ${F} d="M12 4.300l3.800 2.200v4.400L12 13.100l-3.800-2.200V6.500z"/><path d="M8.200 10.900l3.800 2.200v4.400l-3.800 2.200-3.800-2.200v-4.400zM15.800 10.900l3.800 2.200v4.400l-3.800 2.200-3.800-2.200v-4.400z"/>`,
  shield: `<path ${F} d="M12 2.5l8 3v6c0 5.2-3.4 8.6-8 10-4.6-1.4-8-4.8-8-10v-6z"/>`,
  quake: `<path ${F} d="M12 2l2.4 6.2L21 6l-4 5.6 5 3.9-6.4.6L14 22l-2-5.8L10 22l-1.6-5.9L2 15.5l5-3.9L3 6l6.6 2.2z"/>`,
  slash: `<path ${F} d="M3 19c7 0 15-6 16-15 2.5 9-4.5 18-16 15z"/>`,
  rage: `<path ${F} d="M12 2c1 4 6 6.500 6 12a6 6 0 0 1-12 0c0-3 2-4.200 2-7 2 1 3 2.200 3 4 1-3 1-6 1-9z"/>`,
  dart: `<path ${F} d="M21 3l-3.500 10-5 4-2.500-2.500 4-5z"/><path d="M9 15l-5 5"/>`,
  target: '<circle cx="12" cy="12" r="7.500"/><circle cx="12" cy="12" r="2.500"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  vial: `<path d="M9.500 3h5M10.500 3v5.500L6 18a2.500 2.500 0 0 0 2.300 3.500h7.400A2.500 2.500 0 0 0 18 18l-4.500-9.500V3"/><path ${F} d="M8.200 15h7.600l1.400 3.200a1.500 1.500 0 0 1-1.400 2.300H8.200a1.500 1.500 0 0 1-1.400-2.300z"/>`,
  hourglass: `<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/><path ${F} d="M9.500 18.500l2.500-3 2.500 3z"/>`,
  hourturn: `<path d="M9 7.500h6M9 16.500h6M9.700 7.500c0 2.600 2.300 3 2.300 4.500s-2.300 1.900-2.300 4.500M14.300 7.500c0 2.600-2.300 3-2.300 4.500s2.300 1.900 2.300 4.500"/><path d="M3.800 9.500A8.600 8.600 0 0 1 12 3.400M20.200 14.500A8.600 8.600 0 0 1 12 20.600"/><path ${F} d="M12 1.900l2.100 1.500-2.100 1.500zM12 22.100l-2.100-1.500 2.100-1.500zM10.900 15.700l1.100-1.300 1.100 1.300z"/>`,
  ward: `<path ${F} d="M8 3h8v12l-4 3-4-3z"/><path d="M12 18v3.500M10 7h4M10 10.500h4"/>`,
  longshot: `<path d="M3 21L18 6"/><path ${F} d="M21 3l-1.500 7-5.500-5.500z"/><path d="M3 21l1-4M3 21l4-1M8 16l1.500 1.500M11 13l1.500 1.500"/>`,
  mask: `<path d="M5 5c4-2 10-2 14 0 .5 7-2 13-7 15.500C7 18 4.500 12 5 5z"/><path ${F} d="M7.500 9.500c1.500-.8 2.700-.5 3.500.500-1.200.800-2.400.800-3.500-.500zM16.500 9.500c-1.500-.8-2.700-.5-3.500.500 1.200.800 2.400.800 3.500-.500z"/><path d="M10 15.500h4"/>`,
  claws: '<path d="M5 3c1 6 3 11 7 17M11 2.500c.5 6 2 11 5.500 16.500M17 3.500c0 4.500 1 8.500 3 12.500"/>',
  pounce: `<path d="M4 18c2-8 7-12 14-12"/><path ${F} d="M20.500 5.500l-6-.500 3.500 4.500z"/><path d="M4 21h6M13 21h3"/>`,
  blink: `<path ${F} d="M12 2l2.200 7.800L22 12l-7.800 2.200L12 22l-2.200-7.800L2 12l7.800-2.200z"/>`,
  skull: `<path ${F} fill-rule="evenodd" d="M12 3a8 8 0 0 0-5 14.200V20h10v-2.800A8 8 0 0 0 12 3zM9 9.500a2.200 2.200 0 1 0 0 4.400 2.200 2.200 0 0 0 0-4.400zm6 0a2.200 2.200 0 1 0 0 4.400 2.200 2.200 0 0 0 0-4.400z"/>`,
  orb: `<circle ${F} cx="12" cy="12" r="5.500"/><circle cx="12" cy="12" r="9.500"/>`,
  frost: '<path d="M12 2v20M3.300 7l17.400 10M3.300 17L20.700 7M9 4l3 2.500L15 4M9 20l3-2.500 3 2.500"/>',
  star: `<path ${F} d="M12 2l3 6.600 7.200.800-5.400 4.900 1.500 7.100L12 17.800 5.700 21.400l1.500-7.100L1.800 9.400 9 8.600z"/>`,
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  vortex: '<path d="M12 12a1.500 1.500 0 0 1 3 0 4 4 0 0 1-7.500 1.500A7 7 0 0 1 18 7.500 9.500 9.500 0 0 1 21 15"/><path d="M3 9.500a9.500 9.500 0 0 0 9 12"/>',
  beam: '<path stroke-width="5" d="M4 12h17"/><path d="M3 5l4 3M3 19l4-3"/>',
  arrow: '<path d="M4 20L20 4M20 4h-7M20 4v7"/>',
  arrows: '<path d="M12 21V4M12 4l-3 3M12 4l3 3M5 20L7.500 8M7.500 8l-3 2M7.500 8l2 3M19 20L16.500 8M16.500 8l3 2M16.500 8l-2 3"/>',
  trap: `<path ${F} d="M3 15a9 9 0 0 1 18 0l-2.200-3-2.300 3-2.200-3-2.300 3-2.300-3-2.200 3-2.300-3z"/><path d="M3 19h18"/>`,
  eye: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle ${F} cx="12" cy="12" r="3"/>`,
  heal: `<path ${F} d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>`,
  chain: '<rect x="2.500" y="7" width="11" height="6" rx="3"/><rect x="10.500" y="11" width="11" height="6" rx="3"/>',
  halo: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M12 13v8M7 14l-2 6M17 14l2 6"/>',
  hook: '<path stroke-width="2.500" d="M14 2v12a5 5 0 0 1-10 0v-1l-2 2M14 2h4"/>',
  cry: `<path ${F} d="M3 9v6h3l7 5V4L6 9z"/><path d="M16.500 8.500a5 5 0 0 1 0 7M19.500 5.500a9 9 0 0 1 0 13"/>`,
  spin: '<path d="M4 12a8 8 0 0 1 14-5.300M20 12a8 8 0 0 1-14 5.300M18 3v4h-4M6 21v-4h4"/>',
  boot: `<path ${F} d="M7 3h6v9l7 3.500V20H5v-5l2-2z"/>`,
  smite: `<path ${F} d="M13.500 2L4 14h6l-1.500 8L19 10h-6z"/>`,
  sword: `<path ${F} d="M20.500 3.500l-1 5.500-9 9-4-4 9-9z"/><path d="M4 20l3-3M5 14l5 5"/>`,
  bow: '<path d="M6 3c9 2 14 8 15 18M6 3l15 18M3 21L16 8M16 8h-4M16 8v4"/>',
  fang: `<path ${F} d="M6 3h12l-2 8-4 10-4-10z"/>`,
  axe: `<path ${F} d="M13 3c4 0 7 3 7 7-3-1-5-1-7 1z"/><path stroke-width="2.500" d="M13 4L5 21"/>`,
  spear: `<path ${F} d="M21 3l-2 7-5-5z"/><path stroke-width="2.500" d="M16 8L3 21"/>`,
  dagger: `<path ${F} d="M19 3l-2 9-5 2-2-2 2-5z"/><path d="M8 13l3 3M6 18l3-3M4 20l2-2"/>`,
  staff: `<circle ${F} cx="17" cy="6" r="3.500"/><path stroke-width="2.500" d="M14.500 8.500L4 20"/>`,
  gem: `<path ${F} d="M12 2l8 7-8 13L4 9z"/>`,
  book: `<path ${F} d="M3 4h7a2.500 2.500 0 0 1 2 1.500A2.500 2.500 0 0 1 14 4h7v15h-7l-2 1.500-2-1.500H3z"/>`,
  crown: `<path ${F} d="M3 19l-1-12 6 5 4-8 4 8 6-5-1 12z"/>`,
  armor: `<path ${F} d="M6 3l6 2.500L18 3l3 5-3 3v10H6V11L3 8z"/>`,
  cloak: `<path ${F} d="M12 3c3 0 5 2 5 4l3 14H4L7 7c0-2 2-4 5-4z"/>`,
  heart: `<path ${F} d="M12 21S3 14.500 3 8.500A4.800 4.800 0 0 1 12 6a4.800 4.800 0 0 1 9 2.500C21 14.500 12 21 12 21z"/>`,
  pawn: `<circle ${F} cx="12" cy="7" r="3.800"/><path ${F} d="M5.500 21c0-5.500 3-9 6.500-9s6.500 3.500 6.500 9z"/>`,
  tower: `<path ${F} d="M6 21V10L5 9V4h3v2h2.500V4h3v2H16V4h3v5l-1 1v11z"/>`,
  home: '<path d="M3 11.500l9-8 9 8M6 10v10h12V10"/>',
  pause: `<path ${F} d="M6 4h4v16H6zM14 4h4v16h-4z"/>`,
  play: `<path ${F} d="M7 4l13 8-13 8z"/>`,
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  flag: `<path d="M5 21V3.500"/><path ${F} d="M5 4h13l-3 4 3 4H5z"/>`,
  x: '<path d="M5 5l14 14M19 5L5 19"/>',
  coin: `<circle ${F} cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.500" stroke="#7a5a10"/>`,
  vs: '<path d="M4 5l7 14 2-6M20 5h-5v5h5v5h-6"/>',
  ringblade: '<circle cx="12" cy="12" r="6.200"/><circle cx="12" cy="12" r="2.200"/><path d="M12 5.800V2.500M6.600 15.100l-2.900 1.700M17.400 15.100l2.900 1.700"/>',
  scatter: '<path d="M12 21.500L5.500 11M12 21.500L8.700 8M12 21.500V7M12 21.500l3.300-13.500M12 21.500L18.500 11"/><circle cx="4.500" cy="9" r="1.700"/><circle cx="8.200" cy="5.800" r="1.700"/><circle cx="12" cy="4.600" r="1.700"/><circle cx="15.800" cy="5.800" r="1.700"/><circle cx="19.500" cy="9" r="1.700"/>',
  stride: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/><path d="M8 8.500l3.500 3.500L8 15.500M12.500 8.500L16 12l-3.500 3.500"/>',
  recall: '<path d="M3 4l6 6M9 5v5H4M21 4l-6 6M15 5v5h5M12 22v-8M9 17l3-3 3 3"/>',
  totem: `<path ${F} d="M9 2.5h6l2.6 15H6.4z"/><path d="M3.5 20.5h17"/><path stroke="#0d1b21" stroke-width="1.7" d="M12 6v8.5M9.6 8.4h4.8M10.2 11.6h3.6"/>`,
  ricochet: `<path d="M2.5 18l5.5-9.5 5 7 2.6-5.2"/><path ${F} d="M21.4 2.6c-4.2.2-6.5 2.4-6.6 6.4 4.1-.1 6.4-2.3 6.6-6.4z"/><circle ${F} cx="8" cy="8.5" r="1.6"/><circle ${F} cx="13" cy="15.5" r="1.6"/>`,       // a thrown leaf, skipping
  poise: `<path d="M12 2.8l7.5 2.8v5.6c0 4.9-3.2 8.1-7.5 9.5-4.3-1.4-7.5-4.6-7.5-9.5V5.6z"/><path ${F} d="M12 6.8l3.9 5.1h-2.4v4.3h-3v-4.3H8.1z"/>`,
  cripple: `<path d="M3.5 20.5L15 9"/><path ${F} d="M21.4 2.6c-4.8.1-7.6 2.8-7.7 7.6 4.8-.1 7.5-2.9 7.7-7.6z"/><circle cx="8.6" cy="15.4" r="3.7"/><path d="M5.2 12l-2.2-2.2M12 18.8l2.2 2.2"/>`,
  cut1: `<path ${F} d="M3 19c7 0 15-6 16-15 2.5 9-4.5 18-16 15z"/>`,
  cut2: `<path ${F} opacity=".4" d="M3 19c7 0 15-6 16-15 2.5 9-4.5 18-16 15z"/><path ${F} d="M21 19c-7 0-15-6-16-15-2.5 9 4.5 18 16 15z"/>`,
  cut3: `<path ${F} d="M11.5 19.2l-5.600-7.400h3.500c.4-4.600 3-8 8.600-10.100-3.200 3.100-4.400 6.200-4.300 10.100h3.400z"/><path d="M2.500 21.500h19M4.500 17.500l-2-2M19.500 17.500l2-2"/>`,
  bramble: `<circle ${F} cx="12" cy="12" r="3.1"/><path d="M12 2.6c2.1 2.3 2.1 4.3 0 6.3M12 21.4c-2.1-2.3-2.1-4.3 0-6.3M2.6 12c2.3-2.1 4.3-2.1 6.3 0M21.4 12c-2.3 2.1-4.3 2.1-6.3 0"/><path d="M5.4 5.4l3.2 3.2M18.6 5.4l-3.2 3.2M5.4 18.6l3.2-3.2M18.6 18.6l-3.2-3.2"/>`,
};
function icon(name, color) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${color ? ` style="color:${color}"` : ''}>${(ICONS[name] || ICONS.orb).replace(/(\d)\.(\d)00/g, '$1.$2')}</svg>`; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = { state: 'menu', paused: false, ended: false, hero: 'kaela', spell: 'execute', diff: 0, skins: {}, roles: {}, nav: null, mute: false, touch: false,       // roles: which of its roles each hero that has more than one is played in
  keys: {}, mouse: { x: 0, y: 0 }, aimKey: -1, joy: { id: null, x: 0, y: 0, cx: 0, cy: 0 }, sk: null, atkPtr: 0, mouseAtk: false,
  banners: [], bannerT: 0, last: {}, hints: {}, hintT: 0, lastT: 0, demoT: 0, demoFocus: null, shopCat: 'For you', boardHold: false, endT: 0, refreshT: 0,
  pan: null, panK: 3, aimCam: true };       // panK: how far the view goes for a finger's travel when the battlefield is dragged · aimCam: the camera leans after a long aim
const PAN_MIN = 0.5, PAN_MAX = 6, PAN_STEP = 0.25;
function prefs(save) {
  try {
    if (save) localStorage.setItem('shardfall', JSON.stringify({ hero: UI.hero, spell: UI.spell, diff: UI.diff, mute: UI.mute, zoom: V.zoomK, skins: UI.skins, roles: UI.roles, nick: UI.nick || undefined, direct: UI.direct === false ? false : undefined, flip: LAND.flip, pan: UI.panK, aimCam: UI.aimCam, wd: UI.wd || undefined }));
    else { const p = JSON.parse(localStorage.getItem('shardfall') || '{}'); if (HEROES[p.hero]) UI.hero = p.hero; if (SPELLS[p.spell]) UI.spell = p.spell; if (DIFFS[p.diff]) UI.diff = p.diff; UI.mute = !!p.mute; LAND.flip = !!p.flip; if (p.zoom > 0.7 && p.zoom < 1.35) V.zoomK = p.zoom; if (p.pan >= PAN_MIN && p.pan <= PAN_MAX) UI.panK = +p.pan; if (p.aimCam === false) UI.aimCam = false; if (p.direct === false) UI.direct = false; if (typeof p.nick === 'string') UI.nick = p.nick.replace(/[^\p{L}\p{N} _.\-]/gu, '').slice(0, 14); if (Array.isArray(p.wd) && DIFFS[p.wd[0]] && DIFFS[p.wd[1]]) UI.wd = [p.wd[0] | 0, p.wd[1] | 0]; if (p.skins && typeof p.skins === 'object') for (const k of HERO_KEYS) { const n = p.skins[k] | 0; if (n > 0 && n < SKINS[k].length) UI.skins[k] = n; }
      if (p.roles && typeof p.roles === 'object') for (const k of HERO_KEYS) { const n = p.roles[k] | 0, rs = HEROES[k].roles; if (rs && n > 0 && n < rs.length) UI.roles[k] = n; } }
  } catch (e) { /* storage unavailable: defaults are fine */ }
}

/* ---------------- audio ---------------- */
const AU = { ctx: null, master: null, last: {} };
function auInit() { if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; } try { const C = window.AudioContext || window.webkitAudioContext; AU.ctx = new C(); AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.32; AU.master.connect(AU.ctx.destination); const n = AU.ctx.sampleRate, b = AU.ctx.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; AU.noise = b; } catch (e) { AU.ctx = null; } }
function tone(f0, f1, dur, type, vol, delay) {
  const c = AU.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q, delay) {
  const c = AU.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * 0.5, dur + 0.02);
}
const SND = {
  hit: v => { noise(0.07, 0.5 * v, 1700, 1.2); tone(190, 80, 0.07, 'triangle', 0.3 * v); },
  tick: v => noise(0.03, 0.12 * v, 2400, 2),
  shoot: v => tone(760, 320, 0.09, 'triangle', 0.16 * v),
  zap: v => { tone(300, 980, 0.13, 'sawtooth', 0.12 * v); noise(0.1, 0.15 * v, 3000, 3); },
  skill: v => { noise(0.2, 0.3 * v, 900, 0.8); tone(420, 700, 0.18, 'sine', 0.22 * v); },
  ult: v => { tone(180, 760, 0.45, 'sawtooth', 0.16 * v); noise(0.5, 0.35 * v, 600, 0.6); tone(90, 60, 0.5, 'sine', 0.4 * v); },
  boom: v => { tone(130, 38, 0.35, 'sine', 0.6 * v); noise(0.3, 0.45 * v, 300, 0.7); },
  thud: v => { tone(110, 45, 0.22, 'sine', 0.45 * v); noise(0.15, 0.25 * v, 500, 0.8); },
  crash: v => { noise(0.9, 0.7 * v, 220, 0.5); tone(90, 28, 0.8, 'sine', 0.6 * v); noise(0.4, 0.3 * v, 2600, 1, 0.05); },
  death: v => { tone(420, 70, 0.55, 'triangle', 0.3 * v); noise(0.3, 0.2 * v, 700, 1); },
  level: v => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.22 * v, i * 0.07)); },
  gold: v => { tone(1320, 1320, 0.07, 'square', 0.07 * v); tone(1760, 1760, 0.1, 'square', 0.07 * v, 0.06); },
  coin: v => { tone(1568, 1568, 0.05, 'triangle', 0.12 * v); tone(2093, 2093, 0.1, 'triangle', 0.1 * v, 0.045); },
  plate: v => { tone(1180, 620, 0.2, 'square', 0.07 * v); tone(1760, 1760, 0.26, 'triangle', 0.14 * v, 0.015); tone(2640, 2640, 0.3, 'sine', 0.07 * v, 0.03); noise(0.14, 0.34 * v, 3600, 2.4); noise(0.3, 0.2 * v, 700, 0.8, 0.04); },
  horn: v => { tone(110, 104, 1.1, 'sawtooth', 0.22 * v); tone(165, 156, 1.1, 'sawtooth', 0.16 * v); },
  ui: v => tone(880, 1100, 0.05, 'sine', 0.14 * v),
  deny: v => tone(180, 140, 0.09, 'square', 0.08 * v),
  kill: v => { tone(660, 660, 0.1, 'triangle', 0.25 * v); tone(990, 990, 0.2, 'triangle', 0.25 * v, 0.09); },
  whoosh: v => { noise(0.2, 0.32 * v, 1300, 0.6); tone(520, 170, 0.18, 'sine', 0.1 * v); },
  slash: v => { noise(0.1, 0.42 * v, 3200, 1.4); tone(1300, 420, 0.09, 'triangle', 0.12 * v); },
  slam: v => { tone(150, 42, 0.3, 'sine', 0.55 * v); noise(0.22, 0.4 * v, 380, 0.7); },
  roar: v => { tone(150, 92, 0.5, 'sawtooth', 0.2 * v); tone(226, 140, 0.45, 'sawtooth', 0.1 * v); noise(0.45, 0.3 * v, 420, 0.6); },
  guard: v => { tone(520, 680, 0.2, 'triangle', 0.2 * v); tone(780, 1020, 0.24, 'sine', 0.12 * v, 0.04); noise(0.12, 0.2 * v, 1900, 2); },
  chain: v => { for (let i = 0; i < 4; i++) tone(1500 + i * 130, 1100, 0.045, 'square', 0.05 * v, i * 0.035); noise(0.16, 0.25 * v, 2600, 2.2); },
  dark: v => { tone(260, 88, 0.24, 'sawtooth', 0.14 * v); noise(0.2, 0.26 * v, 520, 1); },
  bolt: v => { tone(480, 1500, 0.13, 'sawtooth', 0.1 * v); tone(960, 1900, 0.1, 'sine', 0.1 * v, 0.02); noise(0.1, 0.15 * v, 3200, 3); },
  ice: v => { tone(1900, 2700, 0.16, 'sine', 0.13 * v); tone(2400, 3300, 0.14, 'triangle', 0.08 * v, 0.05); noise(0.16, 0.2 * v, 4200, 3); },
  wind: v => { noise(0.45, 0.3 * v, 760, 0.5); noise(0.3, 0.16 * v, 2200, 0.8, 0.06); },
  thunder: v => { noise(0.6, 0.5 * v, 170, 0.6); tone(74, 40, 0.55, 'sine', 0.4 * v); tone(300, 1200, 0.5, 'sawtooth', 0.06 * v); },
  holy: v => { [784, 1175, 1568].forEach((f, i) => tone(f, f, 0.3, 'sine', 0.15 * v, i * 0.06)); },
  buzz: v => { tone(196, 262, 0.3, 'sawtooth', 0.075 * v); tone(211, 281, 0.3, 'sawtooth', 0.065 * v); tone(392, 524, 0.22, 'square', 0.02 * v, 0.02); noise(0.22, 0.1 * v, 2600, 2.5); },       // two notes a little apart: the beat between them is the buzz
  arrow: v => { tone(920, 300, 0.13, 'triangle', 0.2 * v); noise(0.09, 0.26 * v, 2800, 2); },
  eclipse: v => { tone(74, 44, 0.6, 'sine', 0.4 * v); tone(880, 1480, 0.32, 'triangle', 0.07 * v, 0.04); tone(1320, 660, 0.4, 'sine', 0.05 * v, 0.1); noise(0.45, 0.16 * v, 5200, 4, 0.02); },
  win: v => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.4, 'triangle', 0.25 * v, i * 0.13)); },
  lose: v => { [392, 349, 311, 262].forEach((f, i) => tone(f, f, 0.5, 'triangle', 0.25 * v, i * 0.2)); },
};
const SND_GAP = { coin: 0.07, plate: 0.1, eclipse: 0.08, hit: 0.05, tick: 0.09, shoot: 0.06, zap: 0.1, skill: 0.05, boom: 0.08, thud: 0.08, whoosh: 0.05, slash: 0.05, slam: 0.06, arrow: 0.05, wind: 0.08, chain: 0.06, dark: 0.05, bolt: 0.05, ice: 0.06, holy: 0.06, buzz: 0.08 };
function snd(n, v) {
  if (UI.mute || !AU.ctx || AU.ctx.state !== 'running' || !SND[n]) return;
  const now = AU.ctx.currentTime; if (now - (AU.last[n] || -9) < (SND_GAP[n] || 0.02)) return; AU.last[n] = now;
  try { SND[n](v == null ? 1 : v); } catch (e) { /* ignore audio hiccups */ }
}
function playWorldSfx() {
  if (RP.on) { for (const s of RP.sfx) { const d = hyp(s.x - V.cam.x, s.y - V.cam.y); if (d < 1300) snd(s.n, (1 - d / 1500) * 0.8); } RP.sfx.length = 0; G.sfx.length = 0; return; }
  for (const s of G.sfx) { const d = hyp(s.x - V.cam.x, s.y - V.cam.y); if (d > 1300) continue; let v = 1 - d / 1500; if (s.n === 'level') v = 1; snd(s.n, v * (UI.state === 'menu' || (UI.state === 'watch' && UI.w.speed >= 4) ? 0 : 1)); }
  G.sfx.length = 0;
}

/* ---------------- menu ---------------- */
const GFX_NAMES = ['Low', 'Medium', 'High'], CAM_STEPS = [[0.84, 'Near'], [1, 'Standard'], [1.2, 'Far']];
const camName = () => (CAM_STEPS.find(c => Math.abs(c[0] - V.zoomK) < 0.05) || [0, 'Custom'])[1];
const SK_KEYS = ['Q', 'E', 'R'], SK_LABEL = ['Skill 1', 'Skill 2', 'Ultimate'];
function skillsHtml(def, lvFn) {
  const p = def.passive;
  return (p ? `<div class="sk" style="--c:${p.c}"><div class="ii">${icon(p.ic, p.c)}</div><div><b>${esc(p.name)}<small>Passive</small></b><p>${esc(p.desc)}</p></div></div>` : '') + def.skills.map((s, i) => [s, s.alt].filter(Boolean).map((q, f) => `<div class="sk${f ? ' alt' : ''}" style="--c:${q.c}"><div class="ii">${icon(q.ic, q.c)}</div><div><b>${esc(q.name)}<small>${SK_LABEL[i]}${s.alt ? ' · ' + def.forms.names[f] : ''}</small></b><p>${esc(q.desc(lvFn ? lvFn(i) : 1))}</p></div></div>`).join('')).join('');
}
function buildMenu() {
  $('roster').innerHTML = HERO_KEYS.map(k => { const d = HEROES[k]; return `<button class="hc" data-h="${k}" aria-pressed="false"><img src="${portrait(k, UI.skins[k])}" alt=""><b>${d.name}</b><small${d.cls2 ? ' class="dual"' : ''}>${d.cls2 ? d.cls + ' / ' + d.cls2 : d.cls}</small></button>`; }).join('');
  $('roster').addEventListener('click', e => { const b = e.target.closest('.hc'); if (!b) return; UI.hero = b.dataset.h; UI.spell = HEROES[UI.hero].spell; snd('ui'); syncMenu(); });
  $('spells').innerHTML = Object.keys(SPELLS).map(k => `<button class="chip" data-s="${k}" aria-pressed="false"><span class="ii">${icon(SPELLS[k].ic, SPELLS[k].c)}</span>${SPELLS[k].name}</button>`).join('');
  $('spells').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; UI.spell = b.dataset.s; snd('ui'); syncMenu(); });
  $('diffs').innerHTML = DIFFS.map((d, i) => `<button class="chip plain" data-d="${i}" aria-pressed="false">${d.name}</button>`).join('');
  $('diffs').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; UI.diff = +b.dataset.d; snd('ui'); syncMenu(); });
  $('skins').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; UI.skins[UI.hero] = +b.dataset.k; snd('ui'); const im = document.querySelector(`.hc[data-h="${UI.hero}"] img`); if (im) im.src = portrait(UI.hero, UI.skins[UI.hero]); syncMenu(); });
  $('dhead').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; UI.roles[UI.hero] = +b.dataset.r; snd('ui'); syncMenu(); });
  $('btnStart').addEventListener('click', () => { auInit(); startMatch(); });
  $('btnWatch').addEventListener('click', () => { auInit(); snd('ui'); openReps(); });
  $('btnWatchBots').addEventListener('click', () => { auInit(); $('reps').hidden = true; startWatch(); });
  $('btnRep').addEventListener('click', () => { if (UI.lastRep) startPlayback(UI.lastRep); });
  $('repList').addEventListener('click', e => {
    const w = e.target.closest('[data-w]'), x = e.target.closest('[data-x]');
    if (w) { const q = REPS.list.find(r => r.id === +w.dataset.w); if (q && simPlays(q.sim)) { auInit(); startPlayback(q); } return; }
    if (x) { if (x.classList.contains('arm')) { repsDel(+x.dataset.x); snd('ui'); } else { for (const o of document.querySelectorAll('#repList .del.arm')) { o.classList.remove('arm'); o.innerHTML = icon('x'); } x.classList.add('arm'); x.textContent = 'Delete?'; } }       // (the page cannot ask "are you sure": the button asks, and a second press answers)
  });
  $('btnHow').addEventListener('click', () => { const h = $('how'); h.hidden = !h.hidden; $('btnHow').setAttribute('aria-expanded', String(!h.hidden)); if (!h.hidden) h.scrollIntoView({ block: 'nearest', behavior: HAS_TOUCH ? 'auto' : 'smooth' }); });       // a browser ignores taps while it glides a page itself
  syncMenu();
}
const LANE_TEXT = { top: 'Top lane', jungle: 'Jungle', mid: 'Mid lane', carry: 'Bottom lane', roam: 'Bottom lane, roaming' };
const roleIx = k => { const rs = HEROES[k].roles; return rs ? Math.min(rs.length - 1, UI.roles[k] | 0) : 0; };       // the role a hero is set to be played in (0 for a hero with one)
function syncMenu() {
  const d = HEROES[UI.hero];
  document.querySelectorAll('.hc').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.h === UI.hero)));
  document.querySelectorAll('#spells .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === UI.spell)));
  document.querySelectorAll('#diffs .chip').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === UI.diff)));
  $('spellDesc').textContent = SPELLS[UI.spell].desc + ' ' + SPELLS[UI.spell].cd + 's cooldown.';
  const R4 = ['Durability', 'Offense', 'Control', 'Mobility'];
  const sk = UI.skins[UI.hero] | 0;
  showcaseSet(UI.hero, sk);
  $('skins').innerHTML = SKINS[UI.hero].map((s, i) => { const L = heroLook(UI.hero, i); return `<button class="chip${s.epic ? ' epic' : ''}" data-k="${i}" aria-pressed="${i === sk}"><span class="sw" style="background:linear-gradient(135deg,${L.body} 0 50%,${L.trim} 50% 100%)"></span>${esc(s.name)}${s.epic ? '<em>Epic</em>' : ''}</button>`; }).join('');
  const ri = roleIx(UI.hero), ro = d.roles && d.roles[ri];       // a hero with two roles: which to play is chosen here, and decides the lane and the build
  $('dhead').innerHTML = `<h3>${d.name}</h3><p>${esc(d.title)}</p>` + (ro ? `<div class="roles" role="group" aria-label="Role to play ${d.name} in"><span>Play as</span>${d.roles.map((r, i) => `<button class="chip plain" data-r="${i}" aria-pressed="${i === ri}">${r.cls}</button>`).join('')}</div><p><b>${ro.cls}</b> · ${LANE_TEXT[ro.pos]}</p><p class="does">${esc(ro.does)}</p>`
    : `<p><b>${d.cls2 ? d.cls + ' / ' + d.cls2 : d.cls}</b> · ${LANE_TEXT[d.pos]}</p>`);
  $('detail').innerHTML = `<div class="rates">${R4.map((n, i) => `<div class="rate"><span>${n}</span><i style="--v:${d.rate[i]}"></i></div>`).join('')}</div>
    <div class="skl">${skillsHtml(d)}</div>`;
  prefs(true);
}

/* ---------------- match flow ---------------- */
function startDemo() {
  newGame({ seed: (Math.random() * 1e9) | 0, fx: true, diff: 1 });
  for (let i = 0; i < 900; i++) step(1 / 30);          // skip ahead so the lanes are already fighting
  G.fx.length = 0; G.sfx.length = 0; G.events.length = 0;
  V.team = -1; V.me = null; V.aim = null; UI.demoFocus = null; UI.demoT = 0; if (GX.ok) worldSide(false);
  V.cam.x = W / 2; V.cam.y = W / 2;
}
const myT = () => (G && G.player ? G.player.team : BLUE);       // the side this screen is on: blue, unless a networked match has put its player on red
function enterPlay() {       // the screen side of starting any kind of match
  netAway(); watchOff();
  const me = G.player; V.team = me.team; V.me = me; V.aim = null; V.cam.x = me.x; V.cam.y = me.y; V.peek = null; if (GX.ok) worldSide(me.team === RED);       // a player on the red team sees their own side in the allies' colour
  UI.state = 'play'; UI.paused = false; UI.ended = false; UI.last = {}; UI.banners = []; UI.bannerT = 0; UI.hints = {}; UI.sk = null; UI.q = null; UI.aimKey = -1; UI.keys = {}; UI.mouseAtk = false; UI.nav = null; UI.prio = null; UI.tap2 = null;
  $('menu').hidden = true; $('end').hidden = true; $('hud').hidden = false; $('feed').innerHTML = ''; $('announce').innerHTML = '';
  for (const id of ['shop', 'board', 'pause', 'prac', 'recap']) $(id).hidden = true;
  endReplay(); recReset(); UI.pan = null; $('btnLastRecap').hidden = true; UI.lastRep = null;
  $('vig').className = ''; $('btnPrac').hidden = !G.practice; $('pracInfo').hidden = !G.practice;
  buildHud(); viewResize($('cv')); mmInit($('mm')); fitTop();
}
function startMatch() {
  UI.mode = 'std';
  newGame({ seed: (Math.random() * 1e9) | 0, fx: true, diff: UI.diff, rec: true, player: { hero: UI.hero, spell: UI.spell, skin: UI.skins[UI.hero] | 0, role: roleIx(UI.hero) } });       // rec: the match is recorded, to be watched again
  enterPlay(); const me = G.player;
  banner('Welcome to Shardfall', 'Minions march in 10 seconds', '#f2c14e');
  hint(me.pos === 'jungle' ? 'You are the jungler. Clear the creep camps in your jungle, then help a lane.' : me.pos === 'roam' ? 'You are the support. Head to the bottom lane with your carry and keep them alive. Learn a skill with the gold +.' : `Head to the ${LANE_TEXT[me.pos].toLowerCase()} and follow your minions. Learn a skill with the gold +.`, 10);
  snd('horn');
}
/* ---------------- practice ---------------- */
/* UI.prac holds what the player has set, so it carries over when they switch hero or come back later. */
const PRAC_SPOTS = { mid: () => [W / 2 - 210, W / 2 + 210], base: () => [MAP.spawn[BLUE].x, MAP.spawn[BLUE].y], enemy: () => { const t = G.turrets.find(t => t.team === RED && t.lane === 'mid' && !t.dead) || G.crystals[RED]; return [t.x - 480, t.y + 480]; } };
function pracDummies() { const c = W / 2, k = Math.SQRT1_2; for (const [a, b] of [[170, 0], [330, 150], [330, -150]]) spawnDummy(c + (a - b) * k * 0.9 - 40, c - (a + b) * k * 0.9 + 40); }
function startPractice() {
  const P = UI.prac || (UI.prac = { level: 15, gold: 15000, free: false, waves: false });
  newGame({ seed: (Math.random() * 1e9) | 0, fx: true, diff: UI.diff, practice: true, player: { hero: UI.hero, spell: UI.spell, skin: UI.skins[UI.hero] | 0, role: roleIx(UI.hero) } });
  const me = G.player; pracLevel(me, P.level, true); me.gold = P.gold; G.practice.free = P.free; if (P.waves) pracWaves(true);
  const s = PRAC_SPOTS.mid(); pracGo(me, s[0], s[1]); me.face = -Math.PI / 4; pracDummies();
  enterPlay();
  banner('Practice', me.name + ' · level ' + me.level, '#f2c14e');
  hint(HAS_TOUCH ? 'Three dummies ahead: they cannot die. Tap Practice at the top to set level and gold, switch hero, or turn cooldowns off.' : 'Three dummies ahead: they cannot die. Press T (or the Practice button at the top) to set level and gold, switch hero, or turn cooldowns off.', 12);
  snd('horn');
}
function pracRoster() { buildTeams(); }
function renderPrac() {
  const me = G.player, P = UI.prac;
  $('pHeroes').innerHTML = HERO_KEYS.map(k => `<button data-h="${k}" aria-pressed="${k === me.key}"><img src="${portrait(k, UI.skins[k] | 0)}" alt="">${esc(HEROES[k].name)}</button>`).join('');
  setTxt('pLv', me.level); setTxt('pGold', Math.floor(me.gold).toLocaleString('en-US'));
  $('pFree').setAttribute('aria-pressed', String(G.practice.free)); $('pWaves').setAttribute('aria-pressed', String(G.practice.waves));
  const dn = G.heroes.filter(h => h.dummy && !h.friend).length, sn = G.heroes.filter(h => h.spar).length, fn = G.heroes.filter(h => h.friend).length;
  setTxt('pTargets', (dn ? dn + (dn === 1 ? ' dummy' : ' dummies') : 'No dummies') + (sn ? ', ' + sn + (sn === 1 ? ' sparring bot' : ' sparring bots') : '') + (fn ? ', ' + fn + (fn === 1 ? ' friend' : ' friends') : '') + ' on the map. New ones appear in front of you, a friend at your side. Dummies heal up three seconds after the last hit; a friend is on your team, cannot die, and goes back to half health three seconds after the last heal, so you can see what yours give.');
  document.querySelectorAll('#prac [data-lv]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lv === me.level)));
}
function pracSetLevel(lv, manual) {
  const me = G.player; pracLevel(me, lv, !manual); UI.prac.level = me.level; for (const h of G.heroes) if (h.dummy) { pracLevel(h, me.level, true); if (h.friend) h.hp = h.hpWas = h.maxHp * 0.5; } else if (h.spar) { h.level = me.level; h.sp = h.level; h.sk = [0, 0, 0]; for (let k = 0; k < 4 && h.sp > 0; k++) aiLevel(h); recalc(h); h.hp = h.maxHp; }
  UI.last = {}; buildHud(); renderPrac(); fx('level', me.x, me.y, { id: me.id }); snd('level');
}
function bindPractice() {
  $('btnPractice').addEventListener('click', () => { auInit(); startPractice(); });
  $('btnPrac').addEventListener('click', () => { snd('ui'); openModal('prac'); });
  const me = () => G.player, ahead = d => { const m = me(); return [m.x + Math.cos(m.face) * d, m.y + Math.sin(m.face) * d]; };
  $('prac').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !G || !G.practice) return; const m = me(), P = UI.prac;
    if (b.dataset.h) { if (b.dataset.h !== m.key) { UI.hero = b.dataset.h; UI.spell = HEROES[UI.hero].spell; syncMenu(); startPractice(); openModal('prac'); } return; }
    if (b.dataset.lv) { pracSetLevel(+b.dataset.lv); return; }
    if (b.dataset.g) { const g = b.dataset.g; m.gold = g === 'max' ? 99999 : g === '0' ? 0 : Math.min(99999, m.gold + +g); P.gold = m.gold; snd('gold'); renderPrac(); return; }
    switch (b.id) {
      case 'pLvDn': pracSetLevel(m.level - 1); break;
      case 'pLvUp': pracSetLevel(m.level + 1); break;
      case 'pSkReset': pracSetLevel(m.level, true); closeModal('prac'); hint('Skill points are back: tap the gold + on a skill (or press 1, 2, 3) to place them.', 7); break;
      case 'pSell': while (m.items.length) sellItem(m, 0); P.gold = m.gold; snd('gold'); UI.last = {}; renderPrac(); break;
      case 'pShop': openModal('shop'); break;
      case 'pFree': G.practice.free = P.free = !G.practice.free; snd('ui'); renderPrac(); break;
      case 'pWaves': pracWaves(!G.practice.waves); P.waves = G.practice.waves; snd('ui'); renderPrac(); break;
      case 'pDummy': { if (G.heroes.length >= 9) { snd('deny'); break; } const p = ahead(300); spawnDummy(p[0], p[1]); pracRoster(); snd('ui'); renderPrac(); break; }
      case 'pSpar': { if (G.heroes.length >= 9) { snd('deny'); break; } const p = ahead(520); spawnSpar(p[0], p[1]); pracRoster(); snd('ui'); renderPrac(); break; }
      case 'pFriend': { if (G.heroes.length >= 9) { snd('deny'); break; } spawnFriend(m.x + Math.cos(m.face + 2.2) * 190, m.y + Math.sin(m.face + 2.2) * 190); pracRoster(); snd('ui'); renderPrac(); break; }
      case 'pClear': pracClear(); pracRoster(); snd('ui'); renderPrac(); break;
      case 'pCamps': pracCamps(); snd('ui'); break;
      case 'pHeal': pracRefresh(m); snd('holy'); fx('ring', m.x, m.y, { c: '#7dffb0', r: 130 }); break;
      case 'pMid': case 'pBase': case 'pEnemy': { const s = PRAC_SPOTS[b.id === 'pMid' ? 'mid' : b.id === 'pBase' ? 'base' : 'enemy'](); pracGo(m, s[0], s[1]); V.cam.x = m.x; V.cam.y = m.y; UI.nav = null; closeModal('prac'); snd('skill'); break; }
    }
  });
}
function endMatch() {
  endReplay(); $('recap').hidden = true;
  if (UI.state === 'play') UI.lastRep = keepMatch(false);
  UI.ended = true; UI.endT = 2.6; V.aim = null; UI.sk = null;
  const c = G.crystals[1 - G.winner]; V.peek = { x: c.x, y: c.y };
  snd(G.winner === myT() || !G.player ? 'win' : 'lose');
}
function showEnd() {
  const win = G.winner === myT(), me = G.player, B = UI.state === 'watch' ? UI.pb : null, done = G.over, T0 = myT();       // B: this was a recording; it may stop short of the end (the match was left)
  $('endT').textContent = !done ? 'End of the recording' : me ? (win ? 'Victory' : 'Defeat') : (win ? 'Blue team wins' : 'Red team wins'); $('endT').className = !done ? '' : me ? (win ? 'win' : 'lose') : (win ? 'blue' : 'red');
  $('endM').textContent = `${B ? 'Replay · ' : ''}${fmtTime(G.t)} · ${G.kills[T0]} ${G.kills[T0] === 1 ? 'kill' : 'kills'} to ${G.kills[1 - T0]} · ${typeof netEndSay === 'function' && netEndSay() || (me ? DIFFS[G.diff].name + ' enemies' : wdSay(UI.w && UI.w.diffs || [G.diff, G.diff]))}${done ? '' : ' · you left the match here'}`;
  $('btnAgain').textContent = B ? 'Watch again' : NET.M ? 'Back to the table' : me ? 'Play again' : 'Watch another'; $('btnMenu').textContent = NET.M ? 'Leave' : me && !B ? 'Change hero' : 'Menu';
  $('btnRep').hidden = !(UI.state === 'play' && UI.lastRep);
  $('endTbl').innerHTML = boardHtml(true); $('end').hidden = false;
  for (const id of ['shop', 'board', 'pause']) $(id).hidden = true;
}
function toMenu() {
  if (NET.M) { netLeaveMatch(); setTimeout(() => { if (!NET.M && NET.chan && $('mp').hidden) { netOff(); netLobbySay(); } }, 700); }       // a networked match is left for good: the others are told, a bot takes the hero, and the seat at the table is given up
  if (UI.state === 'play' && G && G.rec && !G.over) keepMatch(true);       // a match that is left is kept as far as it went
  endReplay(); watchOff(); UI.state = 'menu'; UI.paused = false; $('hud').hidden = true; $('menu').hidden = false; for (const id of ['shop', 'board', 'pause', 'end', 'prac', 'recap', 'reps', 'duel']) $(id).hidden = true;
  $('vig').className = ''; $('netWait').hidden = true; startDemo();
}
const fmtTime = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function mvpScore(h) { return h.kills * 3 + h.assists * 1.5 - h.deaths * 1.5 + h.stats.dmgHero / 2500 + h.stats.dmgTurret / 1200 + h.stats.heal / 4000; }
function boardHtml(full) {
  let mvp = null; if (full) for (const h of G.heroes) if (h.team === G.winner && (!mvp || mvpScore(h) > mvpScore(mvp))) mvp = h;
  const T0 = myT(), row = h => `<tr class="${h.team === T0 ? 'a' : 'e'}${h === G.player ? ' me' : ''}"><td><div class="who"><img src="${portrait(h.key, h.skin)}" alt="">${h === G.player ? 'You' : esc(h.name)}${h === mvp ? '<span class="tag">MVP</span>' : ''}</div></td><td>${h.level}</td><td>${h.kills} / ${h.deaths} / ${h.assists}</td><td>${h.stats.cs}</td><td>${(h.goldEarned / 1000).toFixed(1)}k</td>${full ? `<td>${Math.round(h.stats.dmgHero / 100) / 10}k</td><td>${Math.round(h.stats.dmgTurret / 100) / 10}k</td>` : ''}<td><span class="mini">${h.items.map(k => `<span class="ii">${icon(ITEMS[k].ic, ITEMS[k].c)}</span>`).join('')}</span></td></tr>`;
  const head = `<tr><th>Hero</th><th>Lvl</th><th>K / D / A</th><th>CS</th><th>Gold</th>${full ? '<th>Hero dmg</th><th>Turret dmg</th>' : ''}<th>Items</th></tr>`;
  const n = full ? 8 : 6, wd = !G.player && !G.practice && UI.state === 'watch' && UI.w && UI.w.diffs, lv = T => wd ? ' (' + DIFFS[wd[T]].name + ')' : '';       // bots watched: each side's level beside its name
  return `<table class="tbl">${head}<tr class="sep"><td colspan="${n}" style="color:var(--ally)">${G.player || G.practice ? 'Your team' : 'Blue team' + lv(BLUE)} · ${G.kills[T0]}</td></tr>${G.heroes.filter(h => h.team === T0).map(row).join('')}<tr class="sep"><td colspan="${n}" style="color:var(--enemy)">${G.player || G.practice ? 'Enemy team' : 'Red team' + lv(RED)} · ${G.kills[1 - T0]}</td></tr>${G.heroes.filter(h => h.team === 1 - T0).map(row).join('')}</table>`;
}

/* ---------------- HUD ---------------- */
function buildTeams() {       // the portraits beside the score: whoever is on the map now
  const me = G.player;
  for (const [id, T] of [['tmA', myT()], ['tmE', 1 - myT()]]) $(id).innerHTML = G.heroes.filter(h => h.team === T).map(h => `<div class="tp${h === me ? ' me' : ''}" data-id="${h.id}" title="${esc(h.name)}"><img src="${portrait(h.key, h.skin)}" alt=""><i></i><span></span></div>`).join('');
  UI.tps = Array.from(document.querySelectorAll('.tp')).map(el => ({ el, h: G.heroes.find(h => h.id === +el.dataset.id), hp: -1, tx: null }));
}
/* The three skill buttons, for the form the hero is in now. A two-form hero's buttons are redrawn each time she changes. */
function skillButtons() {
  const me = G.player, look = me.look;
  for (let i = 0; i < 3; i++) {
    const s = skDef(me, i), c = me.def.forms ? (i === 2 ? (me.form ? look.heron : look.tiger) : me.form ? look.tiger : look.heron) || s.c : skinColor(me.key, me.skin, i), b = $('bS' + i);
    b.innerHTML = icon(s.ic) + `<span class="cd"></span><span class="cdn"></span><span class="pips">${'<i></i>'.repeat(s.max)}</span>` + `<span class="key">${SK_KEYS[i]}</span>`; b.style.setProperty('--c', c); b.setAttribute('aria-label', s.name);
    b.classList.remove('armed', 'st3'); if (s.two) b.insertAdjacentHTML('beforeend', icon(s.two.ic).replace('<svg', '<svg class="alt"'));       // what the button shows while its second cast waits
    if (s.three) b.insertAdjacentHTML('beforeend', icon(s.three.ic).replace('<svg', '<svg class="alt alt3"'));       // and its third
    if (s.chain) b.insertAdjacentHTML('beforeend', `<span class="chn">${'<i></i>'.repeat(s.chain)}</span>`);       // a chain: one pip a press
  }
  for (const k in UI.last) if (/^[a-zA-Z]+[012]$/.test(k)) delete UI.last[k];       // everything remembered about those buttons is stale
}
/* A passive with two tempers (Miel's hive: tending or stinging): which it is in is a badge on the portrait of the status plate. */
function moodTag(h) {
  const ps = h && !h.dead ? h.def.passive : null, md = ps && ps.moods, k = md ? h.id * 4 + ps.mood(h) : -1; if (UI.last.mood === k) return; UI.last.mood = k;
  const el = $('stMood'); el.hidden = k < 0; if (k < 0) return;
  const m = md[k & 3]; el.style.setProperty('--c', heroLook(h.key, h.skin)[m.look] || ps.c); el.innerHTML = icon(m.ic); el.title = m.name; el.setAttribute('aria-label', ps.name + ': ' + m.name);
}
function buildHud() {
  const me = G.player, d = me.def;
  $('stImg').src = portrait(me.key, me.skin);
  const btn = (id, ic, c, key, extra) => { $(id).innerHTML = icon(ic) + (extra || '') + (key ? `<span class="key">${key}</span>` : ''); $(id).style.setProperty('--c', c); };
  skillButtons(); UI.last.form = me.form;
  const sp = SPELLS[me.spell]; btn('bSp', sp.ic, sp.c, 'F', '<span class="cd"></span><span class="cdn"></span>'); $('bSp').setAttribute('aria-label', sp.name);
  btn('bHl', MEND.ic, MEND.c, 'G', '<span class="cd"></span><span class="cdn"></span>'); $('bHl').setAttribute('aria-label', MEND.name + ': ' + MEND.desc);
  $('bIt').hidden = true; $('bIt').classList.remove('live', 'idle'); UI.last.itk = null;
  const ps = d.passive && d.passive.stacks; $('bAtk').classList.remove('charged');
  btn('bRc', 'home', '#9fd8ff', 'B'); btn('bAtk', 'sword', '#fff', 'Space', ps ? `<span class="pips stk">${'<i></i>'.repeat(ps)}</span>` : ''); delete UI.last.mood; btn('bMin', 'pawn', '#e8f0ee', 'C'); btn('bTur', 'tower', '#e8f0ee', 'V');
  $('btnBoard').innerHTML = icon('list'); $('btnPause').innerHTML = icon('pause'); $('btnPrac').innerHTML = icon('target') + '<span>Practice</span>'; $('coin').innerHTML = icon('coin', '#f2c14e');
  document.querySelectorAll('.x').forEach(b => b.innerHTML = icon('x'));
  $('stItems').innerHTML = '<div class="slot"></div>'.repeat(6);
  buildTeams();
}
function setTxt(id, v) { if (UI.last[id] !== v) { UI.last[id] = v; $(id).textContent = v; } }
/* The top row sorts itself out by measuring, whatever the screen, the fonts and the figures: the scoreboard sits in the middle when there is room
   between the minimap and the buttons at the right; if not it slides towards the freer side, then gives up size (small tiles), then the team
   portraits, and last the K / D / A plate. Run when a match starts, when the window changes, and when a figure gains a digit. */
const TOP_FITS = [[], ['tB'], ['tA'], ['tA', 'tB'], ['tA', 'tB', 'tD']], TOP_GAP = 10, TOP_SLIDE = 40;       // it would sooner shrink than sit far off the middle
function fitTop() {
  if (UI.state === 'menu' || RP.on) return;
  const cl = $('app').classList, c = $('topC'), r = $('topR'), m = $('mmWrap');
  cl.remove('tA', 'tB', 'tD'); c.style.left = '';
  if (cl.contains('port') || !c.offsetWidth || !r.offsetWidth) return;       // the upright layout anchors the scoreboard beside the minimap by itself
  const mid = c.offsetLeft;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < TOP_FITS.length; i++) {       // first a place near the middle; failing that, any place at all
    cl.remove('tA', 'tB', 'tD'); for (const k of TOP_FITS[i]) cl.add(k);
    const w = c.offsetWidth, lo = m.offsetLeft + m.offsetWidth + TOP_GAP, hi = r.offsetLeft - TOP_GAP, x0 = mid - w / 2, x = clamp(x0, lo, Math.max(lo, hi - w));
    if (w <= hi - lo && (pass || Math.abs(x - x0) <= TOP_SLIDE) || pass && i === TOP_FITS.length - 1) { c.style.left = Math.abs(x - x0) < 0.5 ? '' : Math.round(x + w / 2) + 'px'; return; }
  }
}
function setCls(el, c, on, key) { if (UI.last[key] !== on) { UI.last[key] = on; el.classList.toggle(c, on); } }
function updateHud(dt) {
  const me = G.player;
  setTxt('gold', Math.floor(me.gold)); setTxt('scA', G.kills[me.team]); setTxt('scE', G.kills[1 - me.team]); setTxt('clock', fmtTime(G.t));
  if (G.practice) { const P = G.practice, live = G.t - P.last < 3, tx = P.n ? `Practice · ${live ? 'burst' : 'last burst'} <b>${Math.round(P.sum).toLocaleString('en-US')}</b> damage in ${Math.max(0.1, P.last - P.t0).toFixed(1)}s` + (P.free ? ' · no cooldowns' : '') : 'Practice' + (P.free ? ' · no cooldowns' : ' · hit a dummy to measure a burst'); if (UI.last.pi !== tx) { UI.last.pi = tx; $('pracInfo').innerHTML = tx; } }
  { const f = me.flurry && !me.dead && me.flurry.n > 0 && me.flurry.until > G.t ? me.flurry.n : 0; if (UI.last.fl !== f) { UI.last.fl = f; const b = $('bAtk'); b.classList.toggle('fl', f > 0); if (f) b.dataset.n = f; else delete b.dataset.n; } }       // fast attacks in hand: the attack button says how many
  const kda = `${me.kills} / ${me.deaths} / ${me.assists}`; setTxt('kda', kda); setTxt('stLv', me.level);
  const tk = kda.length * 100 + ('' + G.kills[BLUE]).length * 10 + ('' + G.kills[RED]).length; if (UI.last.tk !== tk && !RP.on) { UI.last.tk = tk; fitTop(); }       // a figure gained a digit: the top row is measured again
  const hp = Math.max(0, me.hp), hpF = hp / me.maxHp;
  $('stHp').firstChild.style.transform = `scaleX(${hpF.toFixed(3)})`; $('stMp').firstChild.style.transform = `scaleX(${(me.mp / me.maxMp).toFixed(3)})`;
  $('stXp').firstChild.style.transform = `scaleX(${me.level >= 15 ? 1 : (me.xp / xpNeed(me.level)).toFixed(3)})`;
  const hs = Math.ceil(hp) + ' / ' + Math.round(me.maxHp), ms = Math.floor(me.mp) + ' / ' + Math.round(me.maxMp);
  if (UI.last.hs !== hs) { UI.last.hs = hs; $('stHp').lastChild.textContent = hs; } if (UI.last.ms !== ms) { UI.last.ms = ms; $('stMp').lastChild.textContent = ms; }
  const ik = me.items.join(',');
  if (UI.last.ik !== ik) { UI.last.ik = ik; $('stItems').innerHTML = Array.from({ length: 6 }, (_, i) => me.items[i] ? `<div class="slot ii${ITEMS[me.items[i]].part ? ' part' : ''}" title="${esc(ITEMS[me.items[i]].name)}">${icon(ITEMS[me.items[i]].ic, ITEMS[me.items[i]].c)}</div>` : '<div class="slot"></div>').join(''); if (!$('shop').hidden) renderShop(); }
  // skills
  if (UI.last.form !== me.form) { skillButtons(); UI.last.form = me.form; $('tip').hidden = true; }
  for (let i = 0; i < 4; i++) {
    const b = $(i < 3 ? 'bS' + i : 'bSp'), sp = i === 3, s = sp ? SPELLS[me.spell] : skDef(me, i), lv = sp ? 1 : me.sk[i];
    const re = sp || me.dead ? null : recastOf(me, i) || (chainHold(me, i) ? me.re[i] : null);       // its next cast is waiting (or, in a chain, about to be): the button is lit, shows what it will do and how long is left
    const cd = re ? 0 : sp ? me.spellCd : me.cds[i], full = sp ? s.cd : skillCd(s, Math.max(1, lv)) * (1 - me.cdr);
    const p = cd > 0 ? clamp(cd / full, 0, 1) : 0, pk = Math.round(p * 100);
    if (!sp && s.chain) { const st = re ? re.n - 1 : 0, key = st * 2 + (re ? 1 : 0); if (UI.last['ch' + i] !== key) { UI.last['ch' + i] = key; b.classList.toggle('st3', !!re && re.n === 3); const pp = b.lastElementChild.children; for (let j = 0; j < pp.length; j++) pp[j].className = j < st ? 'f' : j === st && re ? 'n' : ''; } }       // how many cuts are made, and which is next
    if (!sp) { setCls(b, 'armed', !!re, 'ar' + i); if (re) { const w = Math.round(clamp((re.until - G.t) / (re.span || (re.span = re.until - G.t)), 0, 1) * 50) / 50; if (UI.last['w' + i] !== w) { UI.last['w' + i] = w; b.style.setProperty('--w', w); } } }
    if (UI.last['p' + i] !== pk) { UI.last['p' + i] = pk; b.children[1].style.setProperty('--p', p.toFixed(3)); }
    const n = cd > 0 ? (cd < 1 ? cd.toFixed(1) : String(Math.ceil(cd))) : '';
    if (UI.last['n' + i] !== n) { UI.last['n' + i] = n; b.children[2].textContent = n; }
    if (!sp) {
      setCls(b, 'locked', lv < 1, 'lk' + i); setCls(b, 'nomana', lv > 0 && !re && cd <= 0 && me.mp < skillCost(s, lv), 'nm' + i);
      if (UI.last['lv' + i] !== lv) { UI.last['lv' + i] = lv; const pp = b.children[3].children; for (let j = 0; j < pp.length; j++) pp[j].className = j < lv ? 'f' : ''; }
      const cl = canLevel(me, i) && !me.dead; if (UI.last['up' + i] !== cl) { UI.last['up' + i] = cl; $('u' + i).hidden = !cl; }
    }
  }
  {       // the built-in heal, and what a stacking passive has gathered
    const b = $('bHl'), cd = me.healCd, p = cd > 0 ? clamp(cd / MEND.cd, 0, 1) : 0, pk = Math.round(p * 100), n = cd > 0 ? String(Math.ceil(cd)) : '';
    if (UI.last.hlp !== pk) { UI.last.hlp = pk; b.children[1].style.setProperty('--p', p.toFixed(3)); } if (UI.last.hln !== n) { UI.last.hln = n; b.children[2].textContent = n; }
    setCls(b, 'idle', cd <= 0 && (me.dead || me.hp >= me.maxHp - 1), 'hli');
    const ps = me.def.passive && me.def.passive.stacks;
    moodTag(me);
    if (ps) { const k = me.dead ? 0 : Math.min(ps, me.pv.n || 0); if (UI.last.stk !== k) { UI.last.stk = k; const pp = $('bAtk').querySelector('.stk').children; for (let j = 0; j < pp.length; j++) pp[j].className = j < k ? 'f' : ''; $('bAtk').classList.toggle('charged', k >= ps); } }
  }
  {       // the pressed item: its button is only there while one is in the bag
    const k = activeItem(me), b = $('bIt');
    if (UI.last.itk !== k) {
      UI.last.itk = k; b.hidden = !k; delete UI.last.itp; delete UI.last.itn; delete UI.last.itl;
      if (k) { const it = ITEMS[k]; b.innerHTML = icon(it.ic) + '<span class="cd"></span><span class="cdn"></span><span class="key">Z</span>'; b.style.setProperty('--c', it.c); b.setAttribute('aria-label', it.name + ': ' + it.act.name); b.classList.remove('live');
        if (!UI.hints.act) { UI.hints.act = 1; hint(it.name + ': press its button left of your skills' + (UI.touch ? '' : ' (Z)') + ' in a fight. For ' + it.act.dur[0] + ' seconds nothing can stun, root or slow you.', 9); } }
    }
    if (k) {
      const A = ITEMS[k].act, cd = me.actCd, on = me.dead ? null : hasBuff(me, 'unshaken'), p = cd > 0 && !on ? clamp(cd / A.cd, 0, 1) : 0, pk = Math.round(p * 200), n = on || cd <= 0 ? '' : String(Math.ceil(cd));
      if (UI.last.itp !== pk) { UI.last.itp = pk; b.children[1].style.setProperty('--p', p.toFixed(3)); }
      if (UI.last.itn !== n) { UI.last.itn = n; b.children[2].textContent = n; }
      setCls(b, 'live', !!on, 'itl'); if (on) { const w = Math.round(clamp(on.t / on.dur, 0, 1) * 50) / 50; if (UI.last.itw !== w) { UI.last.itw = w; b.style.setProperty('--w', w); } }
      setCls(b, 'idle', cd <= 0 && !on && (me.dead || me.stunT > 0), 'iti');
    }
  }
  // quick buy
  const pk = prioItem(me), nb = pk ? stepTo(me, pk) : nextStep(me), can = !!nb, wait = !can && pk ? prioWait(me, pk) : '', qk = can ? nb + ':' + itemPrice(me, nb) + (pk ? '*' : '') : wait ? pk + '|' + wait : '';       // towards the item the player put first, if any
  if (UI.last.qk !== qk) { UI.last.qk = qk; const q = $('quick'); q.hidden = !can && !wait; q.classList.toggle('wait', !can && !!wait); q.classList.toggle('prio', !!pk); q.dataset.k = can ? nb : '';
    if (can) { const it = ITEMS[nb], pr = itemPrice(me, nb); q.innerHTML = `<span class="ii">${icon(it.ic, it.c)}</span><span>${esc(it.name)}<br><small>${it.part ? 'Part' : pr < it.cost ? 'Forge' : 'Buy'} · ${pr}g</small></span>`; q.setAttribute('aria-label', `Buy ${it.name} for ${pr} gold`); if (!UI.hints.buy) { UI.hints.buy = 1; hint('You can afford ' + it.name + (nb !== wantItem(me) ? ', a part of ' + ITEMS[wantItem(me)].name : '') + '. Tap the gold chip under your purse to buy it.', 7); } }
    else if (wait) { const it = ITEMS[pk]; q.innerHTML = `<span class="ii">${icon(it.ic, it.c)}</span><span>${esc(it.name)}<br><small>${wait}</small></span>`; q.setAttribute('aria-label', `${it.name}, your priority: ${wait}. Opens the shop`); } }
  // team portraits: health and respawn timers (enemy health only while they are in sight)
  for (const p of UI.tps) {
    const h = p.h, tx = h.dead ? String(Math.ceil(h.respawnT)) : '';
    if (h.team === me.team || h.dead || h.vis[me.team]) { const f = h.dead ? 0 : Math.round(h.hp / h.maxHp * 25) / 25; if (p.hp !== f) { p.hp = f; p.el.style.setProperty('--h', f); } }
    if (p.tx !== tx) { p.tx = tx; p.el.lastChild.textContent = tx; p.el.classList.toggle('dead', h.dead); }
  }
  // death & low hp
  const dead = me.dead && !G.over, shown = dead && !RP.on;
  if (UI.last.dead !== shown) { UI.last.dead = shown; $('dead').hidden = !shown; if (shown) { const rc = me.recap; $('deadBy').textContent = rc ? recapLine(rc) : ''; delete UI.last.cr; $('hint').hidden = true; UI.hintT = 0; } }
  if (shown) { setTxt('deadT', Math.ceil(me.respawnT)); const cr = canReplay(); if (UI.last.cr !== cr) { UI.last.cr = cr; $('btnReplay').disabled = !cr; } }
  if (RP.on) { const c = RP.clip, len = Math.max(0.1, c.t1 - RP.from), pk = Math.round(clamp((RP.t - RP.from) / len, 0, 1) * 200) / 200, tl = c.death - RP.t, tx = tl > 0.05 ? '-' + tl.toFixed(1) + 's' : 'slain';
    if (UI.last.rpp !== pk) { UI.last.rpp = pk; $('rpl').style.setProperty('--p', pk); } setTxt('rplT', tx); }
  const vc = RP.on ? 'rp' : dead ? 'dead' : hpF < 0.3 ? 'low' : ''; if (UI.last.vc !== vc) { UI.last.vc = vc; $('vig').className = vc; }
  if (!UI.hints.plate && !G.plateOff && !me.dead) for (const s of G.turrets) if (s.plate > 0 && s.team !== me.team && !s.dead && hyp(s.x - me.x, s.y - me.y) < 880) { UI.hints.plate = 1; hint('Gold plating: every hit you land on this turret pays you gold. It is gone at 5:00.', 8); break; }
  if (me.sp > 0 && me.level > 1 && !UI.hints.lv) { UI.hints.lv = 1; hint(UI.touch ? 'Level up! Tap a gold + to improve a skill.' : 'Level up! Tap a gold + (or press 1, 2, 3) to improve a skill.', 6); }
  tickBanners(dt);
  UI.refreshT -= dt;
  if (UI.refreshT <= 0) { UI.refreshT = 0.5; if (!$('board').hidden) $('boardT').innerHTML = boardHtml(false); if (!$('shop').hidden) syncShop(); }
}
function tickBanners(dt) {       // banners & hints
  if (UI.bannerT > 0) { UI.bannerT -= dt; if (UI.bannerT <= 0) $('announce').innerHTML = ''; }
  if (UI.bannerT <= 0.5 && UI.banners.length) { const b = UI.banners.shift(), T0 = myT(), duel = b.k && b.v ? `<div class="duel"><img class="${b.k.team === T0 ? 'a' : 'e'}" src="${portrait(b.k.key, b.k.skin)}" alt="">${icon('sword')}<img class="${b.v.team === T0 ? 'a' : 'e'} out" src="${portrait(b.v.key, b.v.skin)}" alt=""></div>` : ''; $('announce').innerHTML = `${duel}<div class="big" style="color:${b.c}">${esc(b.big)}</div>${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ''}`; UI.bannerT = 2.4; }
  if (UI.hintT > 0) { UI.hintT -= dt; if (UI.hintT <= 0) $('hint').hidden = true; }
}
/* ---------------- death recap and replay ---------------- */
const DTY = { magic: ['Magic', 'var(--dv-magic)'], phys: ['Physical', 'var(--dv-phys)'], true: ['True', 'var(--dv-true)'] }, DTY_ORDER = ['magic', 'phys', 'true'];
const fmtN = v => Math.round(v).toLocaleString('en-US'), pct = (v, t) => t > 0 ? Math.round(v / t * 100) + '%' : '0%', ago = d => d < 0.05 ? '0.0s' : '-' + d.toFixed(1) + 's';
function recapData(rc) {       // the log summed up: by damage type, by who dealt it (largest first), and under each by what it was
  const hits = rc.log.filter(e => !e.cc), holds = rc.log.filter(e => e.cc), by = { magic: 0, phys: 0, true: 0 }, groups = new Map(); let tot = 0, abs = 0;
  for (const e of hits) {
    tot += e.a; abs += e.abs; by[e.ty] += e.a;
    const gk = e.wk === 'hero' ? 'h' + e.wid : e.wk + ':' + e.who; let g = groups.get(gk);
    if (!g) { g = { wk: e.wk, who: e.who, key: e.key, skin: e.skin, a: 0, by: { magic: 0, phys: 0, true: 0 }, ab: new Map() }; groups.set(gk, g); }
    g.a += e.a; g.by[e.ty] += e.a;
    let ab = g.ab.get(e.n); if (!ab) { ab = { n: e.n, ic: e.ic, a: 0, hits: 0, crits: 0, by: { magic: 0, phys: 0, true: 0 } }; g.ab.set(e.n, ab); }
    ab.a += e.a; ab.hits++; if (e.crit) ab.crits++; ab.by[e.ty] += e.a;
  }
  const src = [...groups.values()].sort((a, b) => b.a - a.a); for (const g of src) g.ab = [...g.ab.values()].sort((a, b) => b.a - a.a);
  return { hits, holds, tot, abs, by, src, span: hits.length ? rc.t - hits[0].t : 0 };
}
const slayerName = k => k.wk === 'hero' || k.wk === 'monster' ? k.who : k.wk === 'minion' ? (k.who === 'Minions' ? 'a minion' : 'the ' + k.who) : k.who === 'Turret' ? 'a turret' : 'the ' + k.who.replace(/^The /, '').toLowerCase();
function recapLine(rc) { const d = recapData(rc); return 'Slain by ' + slayerName(rc.killer) + (d.tot >= 1 ? ' · ' + fmtN(d.tot) + ' damage in ' + Math.max(0.1, d.span).toFixed(1) + 's' : ''); }
function whoPic(w, cls) { return w.wk === 'hero' && w.key ? `<img src="${portrait(w.key, w.skin)}" alt="">` : `<span class="ii">${icon(w.wk === 'turret' ? (w.who === 'Turret' ? 'tower' : 'home') : w.wk === 'minion' ? 'pawn' : w.wk === 'monster' ? 'claws' : 'skull')}</span>`; }
/* one whole split into its damage types: a thin bar with nothing written on it, the figures in the text beside it */
function segBar(by, total, thin, widthPct) {
  const parts = DTY_ORDER.filter(k => by[k] > 0.5), say = parts.map(k => `${DTY[k][0]} ${fmtN(by[k])} (${pct(by[k], total)})`).join(', ');
  return `<div class="seg${thin ? ' thin' : ''}" role="img" aria-label="${esc(say)}"${widthPct != null ? ` style="width:${Math.max(3, widthPct).toFixed(1)}%"` : ''}>` + parts.map(k => `<i style="flex:${Math.max(1, Math.round(by[k]))} 1 0;background:${DTY[k][1]}" title="${DTY[k][0]}: ${fmtN(by[k])} (${pct(by[k], total)})"></i>`).join('') + '</div>';
}
function holdText(e) { return e.cc === 'air' ? `Thrown into the air for ${e.d.toFixed(1)}s` : e.cc === 'stun' ? `Stunned for ${e.d.toFixed(1)}s` : e.cc === 'root' ? `Rooted for ${e.d.toFixed(1)}s` : e.cc === 'pull' ? 'Pulled off your feet' : `Slowed by ${Math.round(e.p * 100)}% for ${e.d.toFixed(1)}s`; }
function recapHtml(rc) {
  const d = recapData(rc), k = rc.killer, cr = rc.credit, as = rc.assists, top = d.src.length ? d.src[0].a : 1;
  const helpers = as.map(a => a.who), who = k.wk === 'hero' ? k.who : k.wk === 'minion' && k.who === 'Minions' ? 'A minion' : k.who;
  const sub = [cr ? 'the kill went to ' + cr.who : '', helpers.length ? 'with ' + (helpers.length > 1 ? helpers.slice(0, -1).join(', ') + ' and ' + helpers[helpers.length - 1] : helpers[0]) : ''].filter(Boolean).join(' · ');
  let h = `<div class="rc-top"><div class="rc-k">${whoPic(k)}<div><small>Slain by</small><b>${esc(who)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>`
    + `<div class="rc-n"><b>${fmtN(d.tot)}</b><small>damage in ${Math.max(0.1, d.span).toFixed(1)}s · at ${fmtTime(rc.t)} · level ${rc.level}</small></div></div>`;
  if (d.tot < 1) return h + '<p class="rc-note">Nothing was recorded in the ten seconds before this death.</p>';
  h += segBar(d.by, d.tot, false) + '<ul class="rc-leg">' + DTY_ORDER.filter(t => d.by[t] > 0.5).map(t => `<li><i class="sw" style="background:${DTY[t][1]}"></i>${DTY[t][0]}<b>${fmtN(d.by[t])}</b>${pct(d.by[t], d.tot)}</li>`).join('') + '</ul>';
  h += '<h3>Who dealt it</h3><div class="rc-src">' + d.src.map(g => {
    const rows = g.ab.map(a => { const ts = DTY_ORDER.filter(t => a.by[t] > a.a * 0.08); return `<li><span class="ii">${icon(a.ic)}</span><span class="an">${esc(a.n)}<em>${a.hits > 1 ? '×' + a.hits : ''}${a.crits ? ' · ' + (a.crits > 1 ? a.crits + ' crits' : 'crit') : ''}</em></span><span class="ty">${ts.map(t => `<i class="sw" style="background:${DTY[t][1]}"></i>`).join('')}${ts.map(t => DTY[t][0]).join(' + ')}</span><b>${fmtN(a.a)}</b></li>`; }).join('');
    return `<div class="rc-row"><div class="hd">${whoPic(g)}<b>${esc(g.who)}</b><span class="fig"><b>${fmtN(g.a)}</b>${pct(g.a, d.tot)}</span></div>${segBar(g.by, g.a, true, g.a / top * 100)}<ul class="rc-ab">${rows}</ul></div>`;
  }).join('') + '</div>';
  if (d.holds.length) {       // the same hold by the same skill is said once, with its time added up
    const m = new Map(); for (const e of d.holds) { const key = e.cc + '|' + e.wid + '|' + e.n + '|' + Math.round(e.p * 100); const o = m.get(key); if (o) o.d += e.d; else m.set(key, Object.assign({}, e)); }
    h += '<h3>What held you</h3><ul class="rc-cc">' + [...m.values()].map(e => `<li>${holdText(e)}${e.who ? ` <span>by ${esc(e.who)}${e.n ? ' · ' + esc(e.n) : ''}</span>` : ''}</li>`).join('') + '</ul>';
  }
  if (d.abs >= 1) h += `<p class="rc-note">Your shields soaked ${fmtN(d.abs)} of it.</p>`;
  h += `<div class="rc-act"><button class="btn sm go" id="rcReplay"${canReplay() ? '' : ' disabled'}>Watch replay</button><button class="btn sm" id="rcMore" aria-expanded="false">Blow by blow</button></div>`;
  h += '<table class="rc-log" id="rcLog" hidden><thead><tr><th>When</th><th>From</th><th>What</th><th>Type</th><th class="r">Damage</th><th class="r">Health left</th></tr></thead><tbody>' + rc.log.map(e => e.cc
    ? `<tr class="hold"><td>${ago(rc.t - e.t)}</td><td>${esc(e.who || '')}</td><td colspan="4">${holdText(e)}${e.n ? ' · ' + esc(e.n) : ''}</td></tr>`
    : `<tr><td>${ago(rc.t - e.t)}</td><td>${esc(e.who)}</td><td>${esc(e.n)}${e.crit ? ' (crit)' : ''}</td><td><i class="sw" style="background:${DTY[e.ty][1]}"></i>${DTY[e.ty][0]}</td><td class="r">${fmtN(e.a)}</td><td class="r">${fmtN(e.hp)}</td></tr>`).join('') + '</tbody></table>';
  return h;
}
function openRecap() { const rc = G.player && G.player.recap; if (!rc || UI.ended) { snd('deny'); return; } if (UI.paused) closeModal('pause'); $('rcBody').innerHTML = recapHtml(rc); UI.recapN = rc.n; openModal('recap'); $('rcBody').scrollTop = 0; snd('ui'); }
/* The replay can be watched while waiting to respawn (cut at the front so that it ends in time), and at any time in practice. */
function replayAvail() { const me = G.player; return G.practice ? 1e9 : me.dead ? me.respawnT - 0.6 : 0; }
function canReplay() { const c = REC.clip, me = G.player; return !!(c && me && c.n === me.deaths && !RP.on && !UI.ended && !G.over && replayAvail() >= 2.5); }
function startReplay() {
  if (!canReplay()) { snd('deny'); return; }
  const rc = G.player.recap; V.slayer = rc ? rc.killer.wid || (rc.credit ? rc.credit.wid : 0) : 0;
  for (const m of ['shop', 'board', 'pause', 'prac', 'recap']) if (!$(m).hidden) closeModal(m);
  clearInput(); V.peek = null; V.showRange = false; UI.pan = null; replayStart(REC.clip, G.practice ? null : replayAvail());
  $('app').classList.add('rp'); $('rpl').hidden = false; $('rpl').style.setProperty('--d', clamp((RP.clip.death - RP.from) / Math.max(0.1, RP.clip.t1 - RP.from), 0, 1).toFixed(3)); delete UI.last.rpp; snd('ui');
}
function endReplay() { if (!RP.on) return; replayStop(); $('app').classList.remove('rp'); $('rpl').hidden = true; fitTop(); }       // the top row was not measured while the replay had the screen
function banner(big, sub, c, k, v) { UI.banners.push({ big, sub, c: c || '#fff', k, v }); if (UI.banners.length > 4) UI.banners.splice(0, UI.banners.length - 4); }
function hint(t, dur) { if (UI.last.dead) return; $('hint').textContent = t; $('hint').hidden = false; UI.hintT = dur; }       // not while the death overlay holds the middle of the screen
const MULTI = ['', '', 'Double kill', 'Triple kill', 'Quadra kill', 'Penta kill'];
function drainEvents() {
  const me = G.player, byId = id => G.heroes.find(h => h.id === id), T0 = myT();
  for (const e of G.events) {
    if (e.t === 'kill') {
      const v = byId(e.victim), k = byId(e.killer), allyKill = v.team !== T0;
      const fe = document.createElement('div'); fe.className = 'fe';
      fe.innerHTML = (k ? `<span class="${k.team === T0 ? 'a' : 'e'}" style="display:flex;align-items:center;gap:5px"><img src="${portrait(k.key, k.skin)}" alt="">${k === me ? 'You' : esc(k.name)}</span>` : `<span style="color:var(--mute)">${esc(e.by === 'turret' ? 'Turret' : e.by === 'minion' ? 'Minions' : e.by === 'monster' ? 'Creeps' : 'Crystal')}</span>`) + icon('sword') + `<span class="${v.team === T0 ? 'a' : 'e'}" style="display:flex;align-items:center;gap:5px">${v === me ? 'You' : esc(v.name)}<img src="${portrait(v.key, v.skin)}" alt=""></span>`;
      const f = $('feed'); f.appendChild(fe); while (f.children.length > 4) f.removeChild(f.firstChild); setTimeout(() => fe.remove(), 6000);
      const col = allyKill ? '#46b4ff' : '#ff5d5d';
      if (e.first) banner('First blood', k ? `${k === me ? 'You' : k.name} drew first blood` : '', col, k, v);
      else if (e.multi >= 2) banner(MULTI[Math.min(e.multi, 5)], k === me ? 'You are on fire' : k.name, col, k, v);
      else if (v === me) banner('You have been slain', k ? 'by ' + k.name : '', '#ff5d5d', k, v);
      else if (k === me) banner('Enemy slain', 'You took down ' + v.name, '#5fe08a', k, v);
      else if (e.shutdown) banner('Shut down', v.name + "'s streak is over", col, k, v);
      else if (e.streak === 3 || e.streak === 5 || e.streak >= 7) banner(e.streak >= 7 ? 'Unstoppable' : e.streak === 5 ? 'Rampage' : 'Killing spree', k === me ? 'You' : k.name, col, k, v);
      else if (k) banner(allyKill ? 'Enemy slain' : 'Ally slain', `${k.name} took down ${v === me ? 'you' : v.name}`, col, k, v);
      if (k === me || e.assists.includes(me.id)) snd('kill');
    } else if (e.t === 'turret') banner(e.team === T0 ? 'Turret lost' : 'Turret destroyed', (e.lane === 'mid' ? 'Mid' : e.lane === 'top' ? 'Top' : 'Bottom') + ' lane' + (e.tier === 3 ? ' · base exposed' : ''), e.team === T0 ? '#ff5d5d' : '#46b4ff');
    else if (e.t === 'rush') banner('The walls weaken', 'Turrets and crystals take more damage from here on', '#f2c14e');
    else if (e.t === 'left') { const h = byId(e.id); if (h && h !== me) banner(h.name + ' has left', 'A bot plays on in ' + (h.team === T0 ? 'your' : 'their') + ' place', '#f2c14e'); }
    else if (e.t === 'spawn') banner(e.which === 'lord' ? 'The Shardlord wakes' : 'Riverback has surfaced', e.which === 'lord' ? 'Slay it in the lower river to make it march for you' : 'Upper river · gold and experience for the whole team', '#c070ff');
    else if (e.t === 'epic') banner(e.which === 'lord' ? 'Shardlord slain' : 'Riverback slain', (e.team === T0 ? 'Your team' : 'The enemy') + ' claims the reward', e.team === T0 ? '#46b4ff' : '#ff5d5d');
    else if (e.t === 'lordSummon') banner(e.team === T0 ? 'The Shardlord marches for you' : 'The Shardlord marches against you', (e.lane === 'mid' ? 'Mid' : e.lane === 'top' ? 'Top' : 'Bottom') + ' lane', e.team === T0 ? '#46b4ff' : '#ff5d5d');
    else if (e.t === 'plateWarn') banner('Plating falls in 30 seconds', 'Last gold on the outer turrets', '#f2c14e');
    else if (e.t === 'plateOff') { if (e.n) banner('The gold plating is gone', 'Outer turrets stand bare from here on', '#f2c14e'); }
    else if (e.t === 'ace' && !G.duel) banner(e.team === T0 ? 'Enemy team wiped out' : 'Your team was wiped out', e.team === T0 ? 'Push now' : '', e.team === T0 ? '#f2c14e' : '#ff5d5d');
    else if (e.t === 'call' && e.team === T0 && !G.practice) { const tx = callText(e); if (tx) { feedLine(`<span class="a" style="display:flex;align-items:center;gap:5px">${icon('flag')}Team</span><span>${esc(tx)}</span>`, 7000); if (!UI.hints.call) { UI.hints.call = 1; hint('Your team has made a call: ' + tx.toLowerCase() + '. Calls show at the right. Go along and you are counted in.', 8); } } }
  }
  G.events.length = 0;
}
function feedLine(html, ms) { const fe = document.createElement('div'); fe.className = 'fe'; fe.innerHTML = html; const f = $('feed'); f.appendChild(fe); while (f.children.length > 4) f.removeChild(f.firstChild); setTimeout(() => fe.remove(), ms || 6000); }
/* what a team's call is, in a few words (from the call itself, or from the event that announced it) */
const LANE_SAY = { top: 'top', mid: 'mid', bot: 'bottom' };
function callText(c) {
  const L = LANE_SAY[c.lane] || '', who = c.tgt ? c.tgt.name : c.who;
  switch (c.type) {
    case 'gank': return 'Ganking ' + L + (who ? ': ' + who : '');
    case 'counter': return 'Answering a gank ' + L;
    case 'lord': return !G.epic.lord ? 'Setting up for the Shardlord' : c.phase === 'gather' ? 'Gathering for the Shardlord' : 'Taking the Shardlord';
    case 'turtle': return c.phase === 'gather' ? 'Gathering for Riverback' : 'Taking Riverback';
    case 'contest': return 'Contesting ' + (c.which === 'lord' ? 'the Shardlord' : 'Riverback');
    case 'siege': return 'Sieging ' + L;
    case 'push': return 'Pushing ' + L;
    case 'regroup': return 'Falling back together';
    case 'defend': return 'Defending ' + L + ' against the Shardlord';
  }
  return '';
}

/* ---------------- shop ---------------- */
const CATS = ['For you', 'Attack', 'Magic', 'Defense', 'Boots'];
/* One item in the shop: the item itself (tap to buy; what is still owed after the parts in the bag), and under it either the parts
   it is forged from (each its own button) or, for a part, what it builds into. */
/* ---------------- an item put first ----------------
   UI.prio: the key of the item the player has marked in the shop (the Prioritize button on its card, or two presses on a card that
   cannot be bought yet), or null. While it is set the quick-buy chip works towards that item instead of the recommended build: the
   item itself once it can be paid for, until then its dearest part that can (as nextStep does for the build); with nothing of it
   in reach the chip stays up, dimmed, saying how much gold is still missing. Buying the item ends it, marking it again takes it
   back, another item takes its place, and a new match starts without one. It is the player's own note: the sim knows nothing of it. */
function prioItem(me) {       // the marked item, for as long as it is still to be had
  const k = UI.prio; if (!k) return null; const it = ITEMS[k];
  if (!it || (!it.part && me.items.includes(k))) { UI.prio = null; return null; }
  return k;
}
function prioBlocked(me, k) { const it = ITEMS[k]; return !!it.boots && me.items.some(q => ITEMS[q].boots && !(it.from || []).includes(q)); }       // a second pair of boots is never to be had
function stepTo(me, k) {       // the purchase towards item k that can be made now, or null
  if (canBuy(me, k)) return k;
  if (me.items.length >= 6) return null; let best = null;
  for (const c of missingParts(me, k)) if (canBuy(me, c) && (!best || ITEMS[c].cost > ITEMS[best].cost)) best = c;
  return best;
}
function wantItem(me) { return prioItem(me) || nextBuild(me); }
function wantStep(me) { const k = prioItem(me); return k ? stepTo(me, k) : nextStep(me); }
function prioWait(me, k) {       // nothing of it can be bought yet: what the chip says meanwhile
  const u = recipeUse(me, k), parts = missingParts(me, k); if (me.items.length - u.used.length >= 6 && (me.items.length >= 6 || !parts.length)) return 'Bag full';
  let c = u.price; if (me.items.length < 6) for (const q of parts) c = Math.min(c, ITEMS[q].cost);
  return Math.max(1, Math.ceil(c - me.gold)) + 'g to go';
}
function prioToggle(k) {
  const me = G.player, it = ITEMS[k]; if (!me || !it || UI.state !== 'play') return;
  if (UI.prio === k) UI.prio = null;
  else if ((!it.part && me.items.includes(k)) || prioBlocked(me, k)) { snd('deny'); return; }
  else UI.prio = k;
  snd('ui'); UI.last.qk = null;
  if (!$('shop').hidden) { const y = $('items').closest('.body').scrollTop; renderShop(); $('items').closest('.body').scrollTop = y; }
}
function bought(k) { if (k === UI.prio) UI.prio = null; UI.tap2 = null; }       // (a marked part is marked until it is bought once)
function itemCard(k) {
  const it = ITEMS[k];
  const rc = it.from ? `<div class="rc">${it.from.map(c => `<button class="pt" data-k="${c}" aria-label="Buy ${esc(ITEMS[c].name)}"><span class="ii">${icon(ITEMS[c].ic, ITEMS[c].c)}</span><span>${esc(ITEMS[c].name)}</span><i></i></button>`).join('')}<small>+ ${it.fee} gold to forge</small></div>`
    : it.into ? `<div class="rc"><small>Builds into ${it.into.map(c => esc(ITEMS[c].name)).join(', ')}</small></div>` : '';
  return `<div class="itw${it.part ? ' part' : ''}" data-k="${k}"><button class="it" data-k="${k}"><span class="ii">${icon(it.ic, it.c)}</span><b>${esc(it.name)}</b><span class="pr"></span><span class="st">${itemStatText(it).join(' · ')}${it.p ? `<em>${esc(it.p)}</em>` : ''}${it.act ? `<em class="act"><u>Press</u> ${esc(it.act.name)}: ${esc(it.act.desc)} ${it.act.cd}s cooldown.</em>` : ''}</span></button>${rc}<button class="pri" data-p="${k}" aria-pressed="false">${icon('star')}<span>Prioritize</span></button></div>`;
}
function renderShop() {
  const me = G.player;
  $('cats').innerHTML = CATS.map(c => `<button class="chip plain" data-c="${c}" aria-pressed="${c === UI.shopCat}">${c}</button>`).join('');
  $('inv').innerHTML = Array.from({ length: 6 }, (_, i) => { const k = me.items[i]; return k ? `<button class="slot ii${ITEMS[k].part ? ' part' : ''}" data-i="${i}" data-s="Sell ${Math.round(ITEMS[k].cost * 0.6)}" aria-label="Sell ${esc(ITEMS[k].name)}" title="${esc(ITEMS[k].name)}">${icon(ITEMS[k].ic, ITEMS[k].c)}</button>` : '<div class="slot ii"></div>'; }).join('') + '<p>Tap one of your items twice to sell it for 60% of its price. Parts are used up when you forge the item they belong to. One pair of boots only.</p>';
  const pk = prioItem(me), how = '<p class="note">Press an item to buy it. To have one first that you cannot pay for yet, press its <b>Prioritize</b> or press the item twice: the gold chip under your purse then works towards it before anything else.</p>';
  if (UI.shopCat === 'For you') $('items').innerHTML = (pk ? '<p class="note">Put first: the gold chip under your purse works towards this before the rest of your build.</p>' + itemCard(pk) : '')
    + '<p class="note">Your recommended build, in order. Buy the parts as you can afford them: each one comes off the price of the item it belongs to. To have another item first, press its <b>Prioritize</b> or press the item twice.</p>' + (me.bld || me.def.build).filter(k => k !== pk).map(itemCard).join('')
    + Object.keys(ITEMS).filter(k => ITEMS[k].act && !(me.bld || me.def.build).includes(k) && k !== pk).map(k => '<p class="note">Not in your build, but any hero can carry it: the one item you press.</p>' + itemCard(k)).join('');
  else { const all = Object.keys(ITEMS).filter(k => ITEMS[k].cat === UI.shopCat), parts = all.filter(k => ITEMS[k].part), full = all.filter(k => !ITEMS[k].part); $('items').innerHTML = how + '<h3>Parts</h3>' + parts.map(itemCard).join('') + '<h3>Complete items</h3>' + full.map(itemCard).join(''); }
  syncShop();
}
function syncShop() {
  const me = G.player, nb = wantItem(me), ns = wantStep(me), pk = prioItem(me); setTxt('shopGold', Math.floor(me.gold) + ' gold');
  document.querySelectorAll('#items .itw').forEach(w => {
    const k = w.dataset.k, it = ITEMS[k], own = !it.part && me.items.includes(k), can = canBuy(me, k), price = itemPrice(me, k), b = w.firstChild, pr = b.querySelector('.pr');
    w.classList.toggle('own', own); w.classList.toggle('can', can); w.classList.toggle('no', !can && !own); w.classList.toggle('rec', k === nb || k === ns); b.disabled = own; w.classList.toggle('prio', k === pk); { const q = w.querySelector('.pri'), on = k === pk; q.hidden = own; if (q.getAttribute('aria-pressed') !== String(on)) { q.setAttribute('aria-pressed', String(on)); q.lastChild.textContent = on ? 'Priority' : 'Prioritize'; } }
    const txt = own ? 'Owned' : price < it.cost ? `<s>${it.cost}</s>${price}` : String(it.cost); if (pr.innerHTML !== txt) pr.innerHTML = txt;
    if (it.from) { const have = me.items.slice(); w.querySelectorAll('.pt').forEach(c => { const ck = c.dataset.k, i = have.indexOf(ck), has = i >= 0 || own; if (i >= 0) have.splice(i, 1); c.classList.toggle('have', has); c.classList.toggle('can', !has && canBuy(me, ck)); c.classList.toggle('next', !has && ck === ns && k === nb); c.disabled = has; const t = has ? '✓' : String(ITEMS[ck].cost), e = c.lastChild; if (e.textContent !== t) e.textContent = t; }); }
  });
}
function openModal(id) { for (const m of ['shop', 'board', 'pause', 'prac', 'recap']) if (m !== id) $(m).hidden = true; $(id).hidden = false; if (id === 'prac') renderPrac(); if (id === 'shop') renderShop(); if (id === 'board') $('boardT').innerHTML = boardHtml(false); if (id === 'pause') { const me = UI.state === 'play' ? G.player : null, net = !!NET.M; UI.paused = true; $('pauseH').textContent = net ? 'Menu' : 'Paused'; $('btnResume').textContent = net ? 'Back to the match' : 'Resume'; $('pauseNet').hidden = !net; $('btnLastRecap').hidden = !(me && me.recap); $('pauseSkWrap').hidden = !me; $('rowAimCam').hidden = !me; $('btnQuit').textContent = me ? 'Leave match' : 'Stop watching'; $('pauseWd').hidden = !(UI.state === 'watch' && !UI.pb); wdShow(); $('panNote').textContent = me ? 'How far the view travels when you drag the battlefield. Drag towards what you want to see; let go to return.' : 'How far the view travels when you drag the battlefield. Drag towards what you want to see.'; if (me) $('pauseSk').innerHTML = skillsHtml(me.def, i => Math.max(1, me.sk[i])); $('btnSound').textContent = UI.mute ? 'Sound off' : 'Sound on'; $('btnGfx').textContent = 'Graphics: ' + GFX_NAMES[V.q]; $('btnCam').textContent = 'Camera: ' + camName(); showCamPrefs(); } clearInput(id !== 'pause'); }
function setPan(v, save) { UI.panK = clamp(Math.round(v / PAN_STEP) * PAN_STEP, PAN_MIN, PAN_MAX); showCamPrefs(); if (save) prefs(true); }
function showCamPrefs() { const s = $('slPan'), v = +UI.panK.toFixed(2); s.style.setProperty('--f', ((UI.panK - PAN_MIN) / (PAN_MAX - PAN_MIN)).toFixed(4)); s.setAttribute('aria-valuenow', v); s.setAttribute('aria-valuetext', v + ' times'); $('outPan').textContent = v + '×'; $('btnPanDn').disabled = UI.panK <= PAN_MIN; $('btnPanUp').disabled = UI.panK >= PAN_MAX; const b = $('btnAimCam'); b.textContent = 'Aim camera: ' + (UI.aimCam ? 'On' : 'Off'); b.setAttribute('aria-pressed', String(UI.aimCam)); }
function closeModal(id) { $(id).hidden = true; if (id === 'pause') UI.paused = false; }

/* ---------------- screen frame: phones always play in landscape ----------------
   A phone held upright gets the whole game turned a quarter turn (it is then held sideways like any MOBA), whatever the device's own
   rotation lock or the app showing this page does. Everything that reads the screen goes through lpt/lrect, which answer in the
   game's own frame. */
const LAND = { on: false, flip: false, w: 0, h: 0, W0: 0, H0: 0 };      // flip: turned the other way round, for phones held with the top to the right
function isPhone() { const m = window.matchMedia; return !!(m && (m('(pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && m('(hover: none)').matches))); }
function layoutApp() {
  const app = $('app'), st = app.style, W0 = window.innerWidth || document.documentElement.clientWidth, H0 = window.innerHeight || document.documentElement.clientHeight;
  const on = isPhone() && H0 > W0 * 1.02;
  LAND.on = on; LAND.W0 = W0; LAND.H0 = H0; LAND.w = on ? H0 : W0; LAND.h = on ? W0 : H0;
  if (on) { st.position = 'fixed'; st.left = st.top = '0'; st.width = H0 + 'px'; st.height = W0 + 'px'; st.transformOrigin = '0 0'; st.transform = LAND.flip ? `translate(0,${H0}px) rotate(-90deg)` : `translate(${W0}px,0) rotate(90deg)`; }
  else st.position = st.left = st.top = st.width = st.height = st.transformOrigin = st.transform = '';
  st.setProperty('--vw', LAND.w / 100 + 'px'); st.setProperty('--vh', LAND.h / 100 + 'px');
  const c = app.classList; c.toggle('land', on); c.toggle('flip', on && LAND.flip); c.toggle('ts', HAS_TOUCH); c.toggle('ph', isPhone()); if ($('btnFlip')) $('btnFlip').hidden = !on; c.toggle('w940', LAND.w <= 940); c.toggle('w820', LAND.w <= 820); c.toggle('w720', LAND.w <= 720); c.toggle('h460', LAND.h <= 460); c.toggle('port', LAND.h > LAND.w);
}
function lpt(cx, cy, out) { if (!LAND.on) { out.x = cx; out.y = cy; } else if (LAND.flip) { out.x = LAND.H0 - cy; out.y = cx; } else { out.x = cy; out.y = LAND.W0 - cx; } return out; }      // screen point -> game frame
function lrect(el) {
  const r = el.getBoundingClientRect(); if (!LAND.on) return r;
  return LAND.flip ? { left: LAND.H0 - r.bottom, top: r.left, right: LAND.H0 - r.top, bottom: r.right, width: r.height, height: r.width } : { left: r.top, top: LAND.W0 - r.right, right: r.bottom, bottom: LAND.W0 - r.left, width: r.height, height: r.width };
}

/* One finger or the mouse on a control. On a touch screen every finger is followed on its own through touch events, so a control keeps
   working whatever else is being held; mouse and pen use pointer events. h.down(p, e) may return false to ignore the press;
   p = { id, type, x, y } in the game's frame; then h.move(p) and h.up(p, cancelled). */
const HAS_TOUCH = 'ontouchstart' in window, PRESSES = [];
function press(el, h) {
  const live = new Map(), put = (p, src) => lpt(src.clientX, src.clientY, p); el._press = true; PRESSES.push({ live, h });
  if (HAS_TOUCH) {
    el.addEventListener('touchstart', e => { for (const t of e.changedTouches) { const p = put({ id: 't' + t.identifier, type: 'touch', x: 0, y: 0 }, t); if (h.down(p, e) !== false) live.set(p.id, p); } if (e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', e => { for (const t of e.changedTouches) { const p = live.get('t' + t.identifier); if (p && h.move) h.move(put(p, t), e); } if (e.cancelable) e.preventDefault(); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { const p = live.get('t' + t.identifier); if (p) { live.delete(p.id); if (h.up) h.up(put(p, t), e.type === 'touchcancel'); } } if (e.cancelable) e.preventDefault(); };
    el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end);
  }
  el.addEventListener('pointerdown', e => {
    if (HAS_TOUCH && e.pointerType === 'touch') return;
    const p = put({ id: 'p' + e.pointerId, type: e.pointerType || 'mouse', x: 0, y: 0 }, e); if (h.down(p, e) === false) return;
    live.set(p.id, p); try { el.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
  });
  el.addEventListener('pointermove', e => { const p = live.get('p' + e.pointerId); if (p && h.move) h.move(put(p, e), e); });
  const pend = e => { const p = live.get('p' + e.pointerId); if (p) { live.delete(p.id); if (h.up) h.up(put(p, e), e.type === 'pointercancel'); } };
  el.addEventListener('pointerup', pend); el.addEventListener('pointercancel', pend);
}
/* Touch screens raise `click` for a lone finger only, and scroll natively for a lone finger only: with the stick held, no other button or
   list would answer. Here every finger's tap becomes a click of its own and every finger can scroll a list (with a glide), in either frame. */
function bindTaps() {
  if (!HAS_TOUCH) return;
  const T = new Map(), CLICK = 'button, [data-close], #stItems, a[href], .tp, #stPort'; let lastEl = null, lastT = 0, glide = 0;
  const canScroll = (e, ax) => { const cs = getComputedStyle(e); return ax ? /auto|scroll/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 2 : /auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2; };
  const scrollers = t => { let sy = null, sx = null; for (let e = t; e && e.id !== 'app' && e.nodeType === 1; e = e.parentElement) { if (!sy && canScroll(e, 0)) sy = e; if (!sx && canScroll(e, 1)) sx = e; } return sy || sx ? { sy, sx } : null; };
  document.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) { const sc = e.target.closest && e.target.closest('.sl') ? null : scrollers(e.target); T.set(t.identifier, { el: e.target, x0: t.clientX, y0: t.clientY, moved: false, sc, l: lpt(t.clientX, t.clientY, {}), t: performance.now(), vx: 0, vy: 0 }); if (sc) cancelAnimationFrame(glide); }
    if (e.cancelable) e.preventDefault();       // no browser gesture (zoom, page scroll, long-press menu) may start from inside the game
  }, { passive: false, capture: true });
  document.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      const p = T.get(t.identifier); if (!p) continue;
      if (!p.moved && hyp(t.clientX - p.x0, t.clientY - p.y0) > (p.sc ? 10 : 24)) p.moved = true;       // a thumb in a hurry slides a little: only a list reads that as a scroll
      if (p.sc && p.moved) { const l = lpt(t.clientX, t.clientY, {}), now = performance.now(), dt = Math.max(4, now - p.t), dx = l.x - p.l.x, dy = l.y - p.l.y; if (p.sc.sy) p.sc.sy.scrollTop -= dy; if (p.sc.sx) p.sc.sx.scrollLeft -= dx; p.vx = p.vx * 0.5 + dx / dt * 0.5; p.vy = p.vy * 0.5 + dy / dt * 0.5; p.l = l; p.t = now; }
    }
    if (e.cancelable) e.preventDefault();       // nothing here may pan or zoom the page
  }, { passive: false, capture: true });
  const end = e => {
    for (const t of e.changedTouches) {
      const p = T.get(t.identifier); if (!p) continue; T.delete(t.identifier);
      if (e.type === 'touchcancel') continue;
      if (p.moved) {
        if (p.sc && performance.now() - p.t < 90 && hyp(p.vx, p.vy) > 0.25) {       // let go while moving: glide to a stop
          let vx = p.vx, vy = p.vy, last = performance.now(); const sc = p.sc;
          const run = now => { const dt = Math.min(40, now - last); last = now; if (sc.sy) sc.sy.scrollTop -= vy * dt; if (sc.sx) sc.sx.scrollLeft -= vx * dt; const k = Math.pow(0.9972, dt); vx *= k; vy *= k; if (hyp(vx, vy) > 0.03) glide = requestAnimationFrame(run); };
          glide = requestAnimationFrame(run);
        }
        continue;
      }
      const field = p.el.closest && p.el.closest('input'), act = document.activeElement;       // a field to type in (a player's name): the tap that the game swallowed must still put the cursor there, and a tap elsewhere take it away
      if (field) { if (e.cancelable) e.preventDefault(); field.focus(); continue; }
      if (act && act.tagName === 'INPUT') act.blur();
      const a = p.el.closest && p.el.closest(CLICK), at = document.elementFromPoint(t.clientX, t.clientY), b = at && at.closest(CLICK);
      if (!a || a !== b || a._press) continue;
      if (e.cancelable) e.preventDefault(); lastEl = a; lastT = performance.now(); a.click();
    }
  };
  document.addEventListener('touchend', end, { passive: false, capture: true }); document.addEventListener('touchcancel', end, { capture: true });
  // a finger whose lift never arrived (a system gesture took it, the page lost the screen) must not leave the stick or a button held down
  const sweep = e => {
    const on = new Set(); for (const t of e.touches) on.add('t' + t.identifier);
    for (const pr of PRESSES) for (const [id, p] of pr.live) if (id[0] === 't' && !on.has(id)) { pr.live.delete(id); if (pr.h.up) pr.h.up(p, true); }
    for (const id of T.keys()) if (!on.has('t' + id)) T.delete(id);
  };
  for (const n of ['touchstart', 'touchend', 'touchcancel']) document.addEventListener(n, sweep);
  // a browser that also raises its own click for the same tap must not fire the button twice
  document.addEventListener('click', e => { if (e.isTrusted && lastEl && performance.now() - lastT < 700 && lastEl.contains(e.target)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  document.addEventListener('gesturestart', e => e.preventDefault());
}

/* ---------------- input ---------------- */
/* drop whatever is being held. soft = a panel opened over the game (shop, scoreboard): only aiming is dropped, the hero keeps walking under the finger or key that holds it */
function clearInput(soft) {
  UI.aimKey = -1; UI.sk = null; UI.q = null; V.aim = null; $('cancel').hidden = true; $('cancel').classList.remove('hot'); if (soft) return;
  UI.nav = null; UI.keys = {}; UI.joy.id = null; UI.joy.x = UI.joy.y = 0; UI.mouseAtk = false; UI.atkPtr = 0; if (G && !G.pb) { G.input.atk = false; G.input.mx = G.input.my = 0; }       // (a recording's hands are its own)
  $('joy').classList.add('idle'); $('joyKnob').style.transform = ''; $('joy').style.left = $('joy').style.top = '';
}
function skillOf(i) { const me = G.player; if (i === 3) return SPELLS[me.spell]; const s = skDef(me, i); return stageDef(s, recastOf(me, i) || (chainHold(me, i) ? me.re[i] : null)); }       // what the button would cast right now (or, between two presses of a chain, next)
function skillReady(i) { const me = G.player; if (!me || me.dead || G.over) return false; if (i === 3) return me.spellCd <= 0; if (me.sk[i] > 0 && recastOf(me, i)) return true; return me.sk[i] > 0 && !chainHold(me, i) && me.cds[i] <= 0 && me.mp >= skillCost(skDef(me, i), me.sk[i]); }
function doMend() { if (UI.paused || UI.ended) return; if (!act(A_MEND)) snd('deny'); }
function doItem() { if (UI.paused || UI.ended || !G.player) return; if (act(A_ITEM)) $('tip').hidden = true; else snd('deny'); }       // the pressed item
/* where the player's hero is for aiming and for the view: in a networked match, where it is about to be (see netAhead) */
const myX = me => (AH.on && me === G.player ? AH.x : me.x), myY = me => (AH.on && me === G.player ? AH.y : me.y);
function autoTarget(i) {
  const me = G.player, s = skillOf(i), rng = s.range || 300;
  if (s.cast === 'self') return { x: myX(me), y: myY(me) };
  if (s.ai && s.ai.t === 'heal') { let b = me, bf = me.hp / me.maxHp; for (const p of G.heroes) if (p.team === me.team && !p.dead && hyp(p.x - me.x, p.y - me.y) < rng + 120) { const f = p.hp / p.maxHp; if (f < bf) { bf = f; b = p; } } return { x: b.x, y: b.y }; }
  if (s.ai && s.ai.t === 'comb') { let b = null, bf = 0.68; for (const p of G.heroes) if (p.team === me.team && !p.dead && hyp(p.x - me.x, p.y - me.y) < rng + 120) { const f = p.hp / p.maxHp; if (f < bf) { bf = f; b = p; } } if (b) return { x: b.x, y: b.y }; }       // ground that mends friends and hurts foes: under whoever of hers is hurt most, if anyone is; else on the enemy, as below
  let best = null, bd = 1e9; const pad = s.cast === 'point' ? (s.ind.r || 0) * 0.6 : 80;
  for (const e of G.heroes) if (e.team !== me.team && !e.dead && e.vis[me.team]) { const d = hyp(e.x - me.x, e.y - me.y); if (d <= rng + pad + (s.heroTarget ? 120 : 0) && d < bd) { bd = d; best = e; } }
  if (!best && !s.heroTarget) for (const u of G.units) { if ((u.kind !== 'minion' && u.kind !== 'monster') || !canTarget(me, u)) continue; const d = hyp(u.x - me.x, u.y - me.y); if (d <= rng + pad && d < bd) { bd = d; best = u; } }
  if (best) { const lead = s.ai && s.ai.speed ? bd / s.ai.speed : 0.12; return { x: best.x + best.vx * lead, y: best.y + best.vy * lead }; }
  const d = s.cast === 'point' ? rng * 0.7 : rng, fa = AH.on ? AH.face : me.face; return { x: myX(me) + Math.cos(fa) * d, y: myY(me) + Math.sin(fa) * d };
}
function doCast(i, x, y) {
  if (UI.paused || UI.ended) return; const me = G.player;
  if (act(A_CAST, i, x, y)) { $('tip').hidden = true; UI.q = null; }
  else if (!me.dead && (me.dash || me.leap || me.castLock > 0) && skillReady(i)) UI.q = { i, x, y, until: G.t + 0.45 };       // busy for a moment: it goes off as soon as he can
  else snd('deny');
}
/* A press that comes a moment early is kept and cast the instant it can be, so a combo never drops an input: the second cast of a
   skill pressed while its first is still on the way (the mark has not landed yet), or anything pressed in the middle of a dash.
   mouse: aim where the pointer is when it fires (keyboard), otherwise at the nearest target (touch). */
function soon(i) { const me = G.player; if (!me || me.dead || i > 2 || me.sk[i] < 1) return false; const r = me.re[i]; return !!(r && r.until > G.t) || (skDef(me, i).two && G.t - me.castT[i] < 0.6) || (me.cds[i] > 0 && me.cds[i] < 0.3); }
function queueCast(i, mouse) { if (!soon(i)) return false; UI.q = { i, mouse, until: G.t + 0.6 }; return true; }
function runQueue() {
  const q = UI.q; if (!q) return; const me = G.player;
  if (G.t > q.until || me.dead || UI.ended) { UI.q = null; return; }
  if (!skillReady(q.i)) return;
  let x = q.x, y = q.y;
  if (x == null) { const s = skillOf(q.i); if (s.cast === 'self') { x = me.x; y = me.y; } else if (q.mouse) { const w = s2w(UI.mouse.x, UI.mouse.y); x = w.x; y = w.y; } else { const t = autoTarget(q.i); x = t.x; y = t.y; } }
  if (act(A_CAST, q.i, x, y)) { UI.q = null; $('tip').hidden = true; }
}
function aimFromDrag(p) {
  const me = G.player, s = p.s, rng = s.range || 300; let wx = p.ux, wy = p.uy / TILT; const l = hyp(wx, wy) || 1; wx /= l; wy /= l;
  const k = s.cast === 'point' ? Math.max(0.12, p.k) : 1; return { x: myX(me) + wx * rng * k, y: myY(me) + wy * rng * k };
}
function showTip(i) {
  const me = G.player, s = skillOf(i), sp = i === 3, lv = sp ? 1 : Math.max(1, me.sk[i]);
  $('tip').innerHTML = `<b>${esc(s.name)}</b>${esc(sp ? s.desc : s.desc(lv))}<small>${sp ? s.cd + 's cooldown' : s.stage ? (s.tag || (s.stage === 3 ? 'Third cast' : 'Second cast')) + ' · free' : `Level ${me.sk[i]} / ${s.max} · ${skillCost(s, lv)} mana · ${(skillCd(s, lv) * (1 - me.cdr)).toFixed(1)}s cooldown`}</small>`;
  $('tip').hidden = false;
}
function showItemTip() { const k = activeItem(G.player); if (!k) return; const it = ITEMS[k], A = it.act, d = A.dur[Math.min(G.player.actN, A.dur.length - 1)]; $('tip').innerHTML = `<b>${esc(A.name)}</b>${esc(A.desc)}<small>${esc(it.name)} · ${A.cd}s cooldown · no mana · next use lasts ${d}s</small>`; $('tip').hidden = false; }
function showMendTip() { $('tip').innerHTML = `<b>${esc(MEND.name)}</b>${esc(MEND.desc)}<small>${MEND.cd}s cooldown · no mana</small>`; $('tip').hidden = false; }
function bindInput() {
  const cv = $('cv');
  window.addEventListener('contextmenu', e => { if (UI.state !== 'menu') e.preventDefault(); });
  // keyboard
  window.addEventListener('keydown', e => {
    if (UI.state === 'watch') { watchKey(e, e.key.length === 1 ? e.key.toLowerCase() : e.key); return; }
    if (UI.state === 'menu') { if (e.key === 'Escape') { if (!$('reps').hidden) closeModal('reps'); else if (!$('duel').hidden) $('duel').hidden = true; } return; }
    if (UI.state !== 'play') return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (RP.on) { if (k === 'Escape' || k === ' ' || k === 'Enter') { e.preventDefault(); endReplay(); } return; }       // a replay only listens for "enough"
    if (k === 'Tab') { e.preventDefault(); if (!UI.boardHold && !UI.ended) { UI.boardHold = true; openModal('board'); } return; }
    if (k === 'Escape') { if (UI.aimKey >= 0) { UI.aimKey = -1; V.aim = null; return; } for (const m of ['shop', 'board', 'pause', 'prac', 'recap']) if (!$(m).hidden) { closeModal(m); return; } if (!UI.ended) openModal('pause'); return; }
    if (UI.ended) return;
    if (k === 'n' && !e.repeat) { if (!$('recap').hidden) closeModal('recap'); else if (G.player.recap) openRecap(); return; }
    if (k === 'p') { $('shop').hidden ? openModal('shop') : closeModal('shop'); return; }
    if (k === 't' && G.practice) { $('prac').hidden ? openModal('prac') : closeModal('prac'); return; }
    if (UI.paused || e.repeat) { if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault(); return; }
    if (UI.touch) { UI.touch = false; document.body.classList.remove('touch'); }
    UI.keys[k] = true;
    const si = { q: 0, e: 1, r: 2, f: 3 }[k];
    if (si != null) { if (!skillReady(si)) { if (!queueCast(si, true)) snd('deny'); return; } const s = skillOf(si); if (s.cast === 'self') doCast(si, G.player.x, G.player.y); else UI.aimKey = si; return; }
    if (k === '1' || k === '2' || k === '3') { if (act(A_LEVEL, +k - 1)) snd('level'); return; }
    if (k === 'b') { act(A_RECALL); return; }
    if (k === 'g') { doMend(); return; }
    if (k === 'z') { doItem(); return; }
    if (k === ' ') { e.preventDefault(); G.input.fresh = true; G.input.atkMode = 0; }
    if (k === 'c') { G.input.fresh = true; G.input.atkMode = 1; } if (k === 'v') { G.input.fresh = true; G.input.atkMode = 2; }
    if (k.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; UI.keys[k] = false;
    if (k === 'Tab') { UI.boardHold = false; closeModal('board'); return; }
    if (UI.state !== 'play') return;
    const si = { q: 0, e: 1, r: 2, f: 3 }[k];
    if (si != null && UI.aimKey === si) { UI.aimKey = -1; V.aim = null; const w = s2w(UI.mouse.x, UI.mouse.y); doCast(si, w.x, w.y); }
  });
  window.addEventListener('blur', () => { if (UI.state === 'play') clearInput(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && UI.state !== 'menu' && !UI.paused && !UI.ended && !NET.M) openModal('pause'); });       // (a networked match cannot be paused: whoever looks away is waited for a few seconds, then a bot plays on for them)
  // mouse on the battlefield
  const canvasDown = e => {
    if (UI.state !== 'play' || UI.paused || UI.ended) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0 && e.button !== 2) return;
      if (e.button === 2 && UI.aimKey >= 0) { UI.aimKey = -1; V.aim = null; return; }
      lpt(e.clientX, e.clientY, UI.mouse);
      const w = s2w(UI.mouse.x, UI.mouse.y), me = G.player;
      if (me.dead) return;
      const best = pickTarget(UI.mouse.x, UI.mouse.y, e.button === 2 ? 30 : 64);
      if (e.button === 2 && !best) {          // right-click the ground: walk there
        const g = postFree(nearestWalkable(w.x, w.y), me.r); UI.nav = { path: planPath(me, g.x, g.y) || [g], i: 0 };
        fxPing(g.x, g.y); return;
      }
      UI.nav = null; if (e.button === 0) UI.mouseAtk = true; G.input.fresh = true; G.input.atkMode = 0; G.input.tgtHint = best;
    }
  };
  cv.addEventListener('pointerdown', canvasDown);
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') lpt(e.clientX, e.clientY, UI.mouse); });
  window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) UI.mouseAtk = false; });
  // joystick: the first finger in the left zone owns the stick until it lifts
  const jz = $('joyZone'), joy = $('joy'), knob = $('joyKnob'), J = UI.joy;
  const setTouch = p => { if (p.type !== 'mouse' && !UI.touch) { UI.touch = true; document.body.classList.add('touch'); } };
  press(jz, {
    down(p, e) {
      if (p.type === 'mouse') { canvasDown(e); return false; }
      setTouch(p); if (J.id != null) return false;
      J.id = p.id; J.cx = p.x; J.cy = p.y; joy.style.left = p.x + 'px'; joy.style.top = p.y + 'px'; joy.classList.remove('idle');
    },
    move(p) {
      if (p.id !== J.id) return; const R = joy.offsetWidth * 0.38 || 50; let dx = p.x - J.cx, dy = p.y - J.cy; const d = hyp(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; } knob.style.transform = `translate(${dx}px,${dy}px)`;
      if (d < R * 0.18) { J.x = J.y = 0; } else { J.x = dx / R; J.y = dy / R; }
    },
    up(p) { if (p.id !== J.id) return; J.id = null; J.x = J.y = 0; knob.style.transform = ''; joy.classList.add('idle'); joy.style.left = ''; joy.style.top = ''; },
  });
  // attack buttons
  [['bAtk', 0], ['bMin', 1], ['bTur', 2]].forEach(([id, mode]) => {
    const b = $(id);
    press(b, {
      down(p) { setTouch(p); UI.atkPtr = p.id; G.input.atkMode = mode; G.input.fresh = true; b.classList.add('on'); },
      up(p) { if (UI.atkPtr === p.id) UI.atkPtr = 0; b.classList.remove('on'); },
    });
  });
  // skills: tap to cast at the nearest target, or drag to aim and let go
  ['bS0', 'bS1', 'bS2', 'bSp'].forEach((id, i) => {
    const b = $(id);
    press(b, {
      down(p) {
        setTouch(p); if (UI.sk || UI.paused || UI.ended) return false;
        if (!skillReady(i)) { if (!queueCast(i, false)) snd('deny'); return false; }
        UI.sk = { id: p.id, i, s: skillOf(i), x0: p.x, y0: p.y, drag: false, ux: 0, uy: 0, k: 0, cancel: false }; b.classList.add('on');
      },
      move(p) {
        const k = UI.sk; if (!k || k.id !== p.id) return; const dx = p.x - k.x0, dy = p.y - k.y0, d = hyp(dx, dy);
        if (!k.drag && d > 12 && k.s.cast !== 'self') { k.drag = true; $('cancel').hidden = false; }
        if (k.drag) { const R = Math.max(46, b.offsetWidth); k.ux = dx / (d || 1); k.uy = dy / (d || 1); k.k = Math.min(1, d / R); const c = lrect($('cancel')); k.cancel = p.x >= c.left - 10 && p.x <= c.right + 10 && p.y >= c.top - 10 && p.y <= c.bottom + 10; $('cancel').classList.toggle('hot', k.cancel); }
      },
      up(p, cancelled) {
        const k = UI.sk; if (!k || k.id !== p.id) return; UI.sk = null; b.classList.remove('on'); $('cancel').hidden = true; $('cancel').classList.remove('hot'); V.aim = null;
        if (cancelled || !G.player || G.player.dead) return;
        if (k.drag) { if (!k.cancel) { const t = aimFromDrag(k); doCast(i, t.x, t.y); } } else { const t = autoTarget(i); doCast(i, t.x, t.y); }
      },
    });
    b.addEventListener('mouseenter', () => { if (!UI.touch && UI.state === 'play') showTip(i); }); b.addEventListener('mouseleave', () => { $('tip').hidden = true; });
  });
  for (let i = 0; i < 3; i++) $('u' + i).addEventListener('click', () => { if (UI.state === 'play' && act(A_LEVEL, i)) snd('level'); });
  $('bRc').addEventListener('click', () => { if (!UI.paused && !UI.ended) act(A_RECALL); });
  $('bIt').addEventListener('click', doItem); $('bIt').addEventListener('mouseenter', () => { if (!UI.touch && UI.state === 'play') showItemTip(); }); $('bIt').addEventListener('mouseleave', () => { $('tip').hidden = true; });
  $('bHl').addEventListener('click', doMend); $('bHl').addEventListener('mouseenter', () => { if (!UI.touch && UI.state === 'play') showMendTip(); }); $('bHl').addEventListener('mouseleave', () => { $('tip').hidden = true; });
  // minimap peek
  const mw = $('mmWrap'); let mmId = null;
  const peek = p => { const r = lrect(mw), x = clamp((p.x - r.left) / r.width, 0, 1) * W, y = clamp((p.y - r.top) / r.height, 0, 1) * W;
    if (UI.state === 'watch') { if (UI.ended) return; const w = UI.w; w.mode = 'free'; w.x = x; w.y = y; V.cam.x = x; V.cam.y = y; watchButtons(); } else V.peek = { x, y }; };       // watching: the view goes there and stays
  press(mw, { down(p) { if (mmId != null) return false; mmId = p.id; peek(p); }, move(p) { if (p.id === mmId) peek(p); }, up(p) { if (p.id === mmId) { mmId = null; if (!UI.ended && UI.state !== 'watch') V.peek = null; } } });
  /* Looking around: a finger dragged across the open battlefield sends the view the way the finger goes (drag right to see what lies
     to the right), UI.panK screens' worth for the finger's travel, and the camera returns to the hero when it lifts. The offset is kept
     from the hero, so he can walk while the look is held. The stick's corner and every button keep their own touches, so this is what
     the rest of the screen does; a mouse does the same with its middle button held. */
  press(cv, {
    down(p, e) {
      if (UI.state === 'menu' || UI.ended || UI.paused || RP.on || UI.pan || mmId != null) return false;
      const watching = UI.state === 'watch';
      if (p.type === 'mouse') { if (!e || (watching ? e.button === 2 : e.button !== 1)) return false; e.preventDefault(); } else setTouch(p);
      UI.pan = { id: p.id, x0: p.x, y0: p.y, ox: 0, oy: 0, on: false, cx: V.cam.x, cy: V.cam.y, w: watching };
    },
    move(p) {
      const P = UI.pan; if (!P || P.id !== p.id) return;
      if (!P.on) { if (hyp(p.x - P.x0, p.y - P.y0) < 9) return; P.on = true; P.x0 = p.x; P.y0 = p.y; if (P.w) { const w = UI.w; P.cx = V.cam.x; P.cy = V.cam.y; w.mode = 'free'; watchButtons(); } }       // a finger that only rests there moves nothing
      const k = UI.panK / V.z; P.ox = (p.x - P.x0) * k; P.oy = (p.y - P.y0) * k / TILT;       // screen travel to ground travel: V.z pixels to a unit across, TILT of that up the screen
      if (P.w) { const w = UI.w; w.x = clamp(P.cx + P.ox, 0, W); w.y = clamp(P.cy + P.oy, 0, W); }       // watching: the view stays where it is dragged to
    },
    up(p, cancelled) { const P = UI.pan; if (!P || P.id !== p.id) return; UI.pan = null; if (P.w && !P.on && !cancelled && UI.state === 'watch') { const h = watchPick(p.x, p.y, 70); if (h) { watchFocus(h, true); snd('ui'); } } },       // a tap on a hero: follow him
  });
  cv.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); }); cv.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });       // no autoscroll cursor on a middle-button drag
  // buttons
  $('btnShop').addEventListener('click', () => { snd('ui'); openModal('shop'); });
  $('stItems').addEventListener('click', () => { if (UI.state !== 'play') return; snd('ui'); openModal('shop'); });
  // watching: the buttons, the portraits at the top (follow that hero), the plate at the bottom (the next hero)
  $('btnAuto').addEventListener('click', () => { if (UI.state !== 'watch') return; watchAuto(UI.w.mode !== 'auto'); snd('ui'); });
  $('btnSpeed').addEventListener('click', () => { if (UI.state !== 'watch') return; watchSpeed(); snd('ui'); });
  $('topC').addEventListener('click', e => { const t = e.target.closest('.tp'); if (!t || UI.state !== 'watch' || UI.ended) return; const h = G.heroes.find(q => q.id === +t.dataset.id); if (h) { watchFocus(h, true); snd('ui'); } });
  $('stPort').addEventListener('click', () => { if (UI.state !== 'watch' || UI.ended) return; const L = G.heroes, i = L.indexOf(UI.w.focus); watchFocus(L[(i + 1) % L.length], true); snd('ui'); });
  $('quick').addEventListener('click', () => { if (UI.state !== 'play') return; const k = $('quick').dataset.k; if (!k) { if (!UI.paused && !UI.ended) { snd('ui'); openModal('shop'); } } else if (act(A_BUY, k)) { bought(k); snd('gold'); UI.last.qk = null; } });       // (dimmed, it is what is being saved for: the shop opens)
  $('btnBoard').addEventListener('click', () => { snd('ui'); openModal('board'); });
  $('btnPause').addEventListener('click', () => { snd('ui'); openModal('pause'); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m && m.id !== 'end') closeModal(m.id); }));
  $('btnResume').addEventListener('click', () => closeModal('pause'));
  $('btnRecap').addEventListener('click', openRecap); $('btnLastRecap').addEventListener('click', openRecap);
  $('btnReplay').addEventListener('click', startReplay); $('btnSkip').addEventListener('click', () => { endReplay(); snd('ui'); });
  $('rcBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'rcReplay') startReplay(); else if (b.id === 'rcMore') { const t = $('rcLog'); t.hidden = !t.hidden; b.setAttribute('aria-expanded', String(!t.hidden)); if (!t.hidden) t.scrollIntoView({ block: 'nearest' }); snd('ui'); } });
  $('btnSound').addEventListener('click', () => { UI.mute = !UI.mute; $('btnSound').textContent = UI.mute ? 'Sound off' : 'Sound on'; prefs(true); if (!UI.mute) { auInit(); snd('ui'); } });
  $('btnGfx').addEventListener('click', () => { setQuality((V.q + 2) % 3, true); $('btnGfx').textContent = 'Graphics: ' + GFX_NAMES[V.q]; snd('ui'); });
  $('btnCam').addEventListener('click', () => { const i = CAM_STEPS.findIndex(c => Math.abs(c[0] - V.zoomK) < 0.05); V.zoomK = CAM_STEPS[(i + 1) % CAM_STEPS.length][0]; viewResize(cv); $('btnCam').textContent = 'Camera: ' + camName(); prefs(true); snd('ui'); });
  /* Drag sensitivity. Not a browser's own slider: on a touch screen every touch is taken at the document (bindTaps), so a built-in
     slider never hears the finger. This one is followed like the stick and the skill buttons are, in either frame, and has a step
     button at each end for a thumb that would sooner tap. */
  { const sl = $('slPan'), at = p => { const r = lrect(sl), pad = 13; setPan(PAN_MIN + clamp((p.x - r.left - pad) / Math.max(1, r.width - pad * 2), 0, 1) * (PAN_MAX - PAN_MIN)); };
    press(sl, { down(p) { sl.classList.add('on'); at(p); }, move(p) { at(p); }, up() { sl.classList.remove('on'); prefs(true); } });
    sl.addEventListener('keydown', e => { const d = { ArrowLeft: -PAN_STEP, ArrowDown: -PAN_STEP, ArrowRight: PAN_STEP, ArrowUp: PAN_STEP, PageDown: -1, PageUp: 1 }[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); setPan(UI.panK + d, true); } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); e.stopPropagation(); setPan(e.key === 'Home' ? PAN_MIN : PAN_MAX, true); } });
    $('btnPanDn').addEventListener('click', () => { setPan(UI.panK - PAN_STEP, true); snd('ui'); }); $('btnPanUp').addEventListener('click', () => { setPan(UI.panK + PAN_STEP, true); snd('ui'); }); }
  $('btnAimCam').addEventListener('click', () => { UI.aimCam = !UI.aimCam; showCamPrefs(); prefs(true); snd('ui'); });
  cv.addEventListener('wheel', e => { if (UI.state === 'menu' || UI.paused) return; V.zoomK = clamp(V.zoomK * (e.deltaY > 0 ? 1.07 : 0.935), 0.78, 1.3); viewResize(cv); }, { passive: true });
  $('btnFull').addEventListener('click', () => { try { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else { const p = d.documentElement.requestFullscreen && d.documentElement.requestFullscreen(); if (p && p.then) p.then(() => { const o = screen.orientation; if (o && o.lock) { const q = o.lock('landscape'); if (q && q.catch) q.catch(() => { /* not lockable here: the turned frame covers it */ }); } }, () => { $('btnFull').textContent = 'Full screen unavailable'; }); else if (!p) $('btnFull').textContent = 'Full screen unavailable'; } } catch (e) { $('btnFull').textContent = 'Full screen unavailable'; } });
  $('btnFlip').addEventListener('click', () => { LAND.flip = !LAND.flip; prefs(true); layoutApp(); viewResize(cv); snd('ui'); });
  $('btnQuit').addEventListener('click', toMenu); $('btnMenu').addEventListener('click', toMenu); $('btnAgain').addEventListener('click', () => { if (NET.M) netStop(''); else if (UI.state !== 'watch') { if (UI.mode === 'duel') startDuel(); else startMatch(); } else if (UI.pb) startPlayback(UI.pb.e); else startWatch(); });
  $('cats').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; UI.shopCat = b.dataset.c; renderShop(); });
  $('items').addEventListener('click', e => {
    const p = e.target.closest('button.pri'); if (p) { prioToggle(p.dataset.p); return; }
    const b = e.target.closest('.pt, .it'); if (!b) return; const k = b.dataset.k, card = b.classList.contains('it'), now = performance.now(), t2 = UI.tap2;
    if (act(A_BUY, k)) { bought(k); snd('gold'); const y = $('items').closest('.body').scrollTop; renderShop(); $('items').closest('.body').scrollTop = y; }
    else if (card && t2 && t2.k === k && now - t2.t < 480) { UI.tap2 = null; prioToggle(k); }       // pressed twice and not to be bought yet: it is put first (or taken back)
    else { UI.tap2 = card ? { k, t: now } : null; snd('deny'); }
  });
  $('inv').addEventListener('click', e => { const b = e.target.closest('button.slot'); if (!b) return; if (b.classList.contains('sell')) { act(A_SELL, +b.dataset.i); snd('gold'); renderShop(); } else { document.querySelectorAll('#inv .sell').forEach(x => x.classList.remove('sell')); b.classList.add('sell'); } });
  let rz = 0; const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layoutApp(); viewResize(cv); if (UI.state !== 'menu') { mmInit($('mm')); fitTop(); } }); };
  try { if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => fitTop()); } catch (e) {}       // the real fonts are narrower or wider than the stand-ins: measure again once they are in
  window.addEventListener('resize', onResize); window.addEventListener('orientationchange', onResize); if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
  bindTaps();
}
function readInput() {
  const I = G.input, K = UI.keys, J = UI.joy;
  let x = (K.d || K.ArrowRight ? 1 : 0) - (K.a || K.ArrowLeft ? 1 : 0), y = (K.s || K.ArrowDown ? 1 : 0) - (K.w || K.ArrowUp ? 1 : 0);
  if (J.x || J.y) { x = J.x; y = J.y / TILT; }
  const me = G.player;
  I.atk = !!(UI.atkPtr || UI.mouseAtk || K[' '] || K.c || K.v);
  if (x || y || I.atk || I.fresh || me.dead || me.recallT > 0) UI.nav = null;
  V.showRange = I.atk;
  if (UI.nav) {
    const N = UI.nav; N.i = pathStep(N.path, Math.min(N.i, N.path.length - 1), me.x, me.y, 40); const q = N.path[N.i];
    if (N.i >= N.path.length - 1 && hyp(q.x - me.x, q.y - me.y) < 14) UI.nav = null; else { x = q.x - me.x; y = q.y - me.y; }
  }
  const l = hyp(x, y); if (l > 0.01) { I.mx = x / l; I.my = y / l; } else { I.mx = I.my = 0; }
  if (UI.aimKey >= 0) { if (me.dead || !skillReady(UI.aimKey)) { UI.aimKey = -1; V.aim = null; } else { const w = s2w(UI.mouse.x, UI.mouse.y), s = skillOf(UI.aimKey); let ax = w.x, ay = w.y; if (s.cast === 'point' && s.range) { const d = hyp(ax - me.x, ay - me.y); if (d > s.range) { ax = me.x + (ax - me.x) / d * s.range; ay = me.y + (ay - me.y) / d * s.range; } } V.aim = { s, x: ax, y: ay, cancel: false }; } }
  else if (UI.sk) { const p = UI.sk; if (p.drag) { const t = aimFromDrag(p); V.aim = { s: p.s, x: t.x, y: t.y, cancel: p.cancel }; } else if (p.s.cast === 'self') V.aim = { s: p.s, x: myX(me), y: myY(me), cancel: false }; else V.aim = null; }
  else V.aim = null;
}

/* Aim camera. While a skill is aimed by dragging its button and its reach runs off the usable screen, the camera leans the way of the
   aim: just far enough to bring the end of the reach into view, and never so far that the hero himself leaves it. It works on the ground
   with the camera's own projection: how far the screen reaches from its middle along a direction (less a margin) is found by trying
   points, and that reach is the same wherever the camera stands. A skill that fits the screen moves nothing. */
const _ap = { x: 0, y: 0 }, _aps = { x: 0, y: 0 };
function screenReach(dx, dy, ml, mr, mt, mb) {       // sim units from the camera's target along (dx, dy) that stay on screen, less margins (fractions of the width at left and right, of the height above and below)
  let lo = 0, hi = 2400; const cx = V.cam.x, cy = V.cam.y, x0 = V.vw * ml, x1 = V.vw * (1 - mr), y0 = V.vh * mt, y1 = V.vh * (1 - mb);
  for (let i = 0; i < 10; i++) {
    const t = (lo + hi) / 2, ahead = 0.64 + V.dist - 0.6 * dy * t * S3 > 0.5;       // a point on the ground behind the camera projects to nonsense: it is simply off screen
    const on = ahead && w2s((cx + dx * t) * S3, 0, (cy + dy * t) * S3, _aps) && _aps.x >= x0 && _aps.x <= x1 && _aps.y >= y0 && _aps.y <= y1; if (on) lo = t; else hi = t;
  }
  return lo;
}
function aimPan(me, dt) {       // how far from the hero the camera should stand for the aim in hand (sim units); nothing unless a long aim is being dragged
  const a = V.aim, p = UI.sk; _ap.x = _ap.y = 0;
  if (!UI.aimCam || !a || !p || !p.drag || a.s.cast === 'self' || me.dead || !GX.ok) return _ap;
  p.at = (p.at || 0) + dt; const w = smooth(clamp((p.at - 0.06) / 0.24, 0, 1)); if (w <= 0) return _ap;       // a quick flick of a cast is over before the view has moved; an aim that is held gets the lean
  const vx = a.x - me.x, vy = a.y - me.y, len = hyp(vx, vy); if (len < 1) return _ap; const dx = vx / len, dy = vy / len;
  const need = len - screenReach(dx, dy, 0.09, 0.12, 0.15, 0.2); if (need <= 12) return _ap;       // the end of the reach is on screen already
  const d = Math.min(need, screenReach(-dx, -dy, 0.14, 0.25, 0.3, 0.2)) * w; _ap.x = dx * d; _ap.y = dy * d; return _ap;       // ...but he stays on it too, and clear of the buttons at the right
}


/* ---------------- watching a match between two teams of bots ----------------
   The same match, sim and renderer, with nobody at the controls and both sides in sight. The view is led by a director that follows
   whatever is most worth seeing (a fight, a great beast being taken, a team gathering on a call, a base under attack). Tapping a
   portrait or a hero follows that hero instead; dragging the battlefield or pressing the minimap looks around freely; Auto hands the
   view back. UI.w: mode 'auto' | 'hero' | 'free', focus (the hero followed), x,y (where a free view looks), speed. */
const WATCH_SPEEDS = [1, 2, 4], PB_SPEEDS = [1, 2, 4, 8];
function watchEnter(me) {       // the screen side of starting to watch: me is the player's hero when it is a recording of his match, null for bots
  netAway();
  V.team = -1; V.me = me; V.aim = null; V.peek = null; V.focus = me; V.showRange = false; V.cam.x = me ? me.x : W / 2; V.cam.y = me ? me.y : W / 2; if (GX.ok) worldSide(false);
  UI.state = 'watch'; UI.paused = false; UI.ended = false; UI.last = {}; UI.banners = []; UI.bannerT = 0; UI.hints = {}; UI.sk = null; UI.q = null; UI.aimKey = -1; UI.keys = {}; UI.nav = null; UI.pan = null; UI.mouseAtk = false;
  UI.w = { mode: me ? 'hero' : 'auto', focus: me, x: V.cam.x, y: V.cam.y, speed: me ? 1 : UI.w && WATCH_SPEEDS.includes(UI.w.speed) ? UI.w.speed : 1, pickT: 0, heldT: 0, hold: 0, diffs: null };
  endReplay(); const cl = $('app').classList; cl.add('watch'); cl.toggle('pb', !!me); cl.remove('seek');
  $('menu').hidden = true; $('end').hidden = true; $('hud').hidden = false; $('feed').innerHTML = ''; $('announce').innerHTML = ''; $('hint').hidden = true; $('vig').className = '';
  for (const id of ['shop', 'board', 'pause', 'prac', 'recap', 'reps']) $(id).hidden = true;
  for (const id of ['btnAuto', 'btnSpeed', 'wCalls', 'wInfo']) $(id).hidden = false; $('pbBar').hidden = !me; $('pbWait').hidden = true;
  $('btnBoard').innerHTML = icon('list'); $('btnPause').innerHTML = icon('pause'); document.querySelectorAll('.x').forEach(b => b.innerHTML = icon('x'));
  $('btnAuto').innerHTML = icon('eye') + '<span>Auto</span>'; $('stItems').innerHTML = '<div class="slot"></div>'.repeat(6);
  buildTeams(); watchButtons(); wdTags(); viewResize($('cv')); mmInit($('mm')); fitTop();
}
/* The bots' skill, a level for each side. UI.wd: the levels chosen for watched matches, [blue, red] (nothing until one is picked: both
   sides then play at the menu's Enemy skill). UI.w.diffs: the levels the two sides of the match on the screen are at. A pick while
   bots are being watched changes their heads there and then: how fast they think, how well they aim and use their skills, how
   much they play as a team (the team's own level follows from its members). A recording of a played match is not to be changed. */
function wdGet() { return UI.wd ? UI.wd.slice() : [UI.diff, UI.diff]; }
function wdHtml() { return [BLUE, RED].map(T => `<div class="wd ${T === BLUE ? 'a' : 'e'}" role="group" aria-label="${T === BLUE ? 'Blue' : 'Red'} bots"><b>${T === BLUE ? 'Blue' : 'Red'}</b>${DIFFS.map((d, i) => `<button class="chip plain" data-t="${T}" data-d="${i}" aria-pressed="false">${d.name}</button>`).join('')}</div>`).join(''); }
function wdShow() { const live = UI.state === 'watch' && UI.w && UI.w.diffs, cur = live || wdGet(); document.querySelectorAll('.wdr .chip').forEach(b => b.setAttribute('aria-pressed', String(cur[+b.dataset.t] === +b.dataset.d))); }
function wdSay(d, sep) { return d[BLUE] === d[RED] ? DIFFS[d[BLUE]].name + ' bots' : `Blue ${DIFFS[d[BLUE]].name}${sep || ', '}Red ${DIFFS[d[RED]].name}`; }
function wdTags() { const d = UI.w && UI.w.diffs; for (const [id, T] of [['wcA', BLUE], ['wcE', RED]]) { const el = $(id).querySelector('.lv'); el.textContent = d ? DIFFS[d[T]].name : ''; el.hidden = !d; } }
function wdApply(T, d) { for (const h of G.heroes) if (h.team === T && h.ai) { h.ai.P = DIFFS[d]; h.ai.org = DIFFS[d].org || 0; } UI.w.diffs[T] = d; wdTags(); }
function wdPick(T, d) {
  const live = UI.state === 'watch' && !UI.pb && !UI.ended && !!G && !G.over && !!UI.w.diffs, cur = live ? UI.w.diffs.slice() : wdGet(); if (!DIFFS[d] || cur[T] === d) return;
  cur[T] = d; UI.wd = cur; prefs(true); snd('ui');
  if (live) { wdApply(T, d); banner((T === BLUE ? 'Blue' : 'Red') + ' bots: ' + DIFFS[d].name, 'from here on', T === BLUE ? '#46b4ff' : '#ff5d5d'); }
  wdShow();
}
function startWatch() {
  const d = wdGet();
  newGame({ seed: (Math.random() * 1e9) | 0, fx: true, diff: d[RED], diffs: d }); UI.pb = null;
  watchEnter(null); UI.w.diffs = d; wdTags();
  banner('Blue against Red', wdSay(d, ' · ') + ' · minions march in 10 seconds', '#f2c14e');
  hint((HAS_TOUCH ? 'The director follows the action. Tap a portrait or a hero to follow them, drag to look around, tap Auto to hand the view back.' : 'The director follows the action. Click a portrait or a hero to follow them, drag to look around, press A for Auto and Space to pause.') + ' The pause menu changes either side’s skill level.', 12);
  snd('horn');
}
function watchOff() { $('app').classList.remove('watch', 'pb', 'seek'); for (const id of ['btnAuto', 'btnSpeed', 'wCalls', 'wInfo', 'pbBar', 'pbWait']) $(id).hidden = true; $('status').classList.remove('e'); $('status').hidden = false; V.focus = null; UI.pb = null; }
function watchButtons() { const w = UI.w; $('btnAuto').setAttribute('aria-pressed', String(w.mode === 'auto')); const b = $('btnSpeed'); b.textContent = w.speed + '×'; b.classList.toggle('fast', w.speed > 1); b.setAttribute('aria-label', 'Match speed: ' + w.speed + ' times'); }
function watchFocus(h, byHand) {       // follow this hero; byHand: the viewer chose, so the director lets go
  const w = UI.w; if (!h) return; if (byHand) { w.mode = 'hero'; watchButtons(); }
  if (w.focus !== h) { w.focus = h; w.heldT = 0; V.focus = h; }
  if (hyp(h.x - V.cam.x, h.y - V.cam.y) > 2000) { V.cam.x = h.x; V.cam.y = h.y; }       // far away: a cut, not a flight across the map
}
function watchAuto(on) { const w = UI.w; w.mode = on ? 'auto' : w.focus ? 'hero' : 'free'; w.pickT = 0; if (on) w.heldT = 99; watchButtons(); }
function watchSpeed(d) { const w = UI.w, S = UI.pb ? PB_SPEEDS : WATCH_SPEEDS, i = S.indexOf(w.speed); w.speed = S[d == null ? (i + 1) % S.length : clamp(i + d, 0, S.length - 1)]; watchButtons(); }
/* how much there is to see around a hero right now */
function watchScore(h) {
  if (h.dead) return -1e9;
  let s = 0; const since = G.t - h.lastCombatT; if (since < 1.2) s += 2.2; else if (since < 4) s += 1;
  let foes = 0, mates = 0, low = 0;
  for (const o of G.heroes) { if (o === h || o.dead) continue; const d = hyp(o.x - h.x, o.y - h.y); if (d > 950) continue; if (o.team !== h.team) { foes++; if (o.hp / o.maxHp < 0.4) low++; } else mates++; }
  s += Math.min(foes, 4) * 1.1 + Math.min(mates, 4) * 0.35 + low * 0.5; if (foes && h.hp / h.maxHp < 0.4) s += 0.6;
  for (const k of ['lord', 'turtle']) { const m = G.epic[k]; if (m && !m.dead && m.aggro && hyp(m.x - h.x, m.y - h.y) < 800) s += k === 'lord' ? 3 : 1.8; }
  const t = h.atkTarget; if (t && !t.dead) { if (t.kind === 'crystal') s += 4; else if (t.kind === 'turret') s += 1.2 + (t.hp < t.maxHp * 0.35 ? 0.8 : 0); }
  const tm = G.team && G.team[h.team], c = tm && tm.call;
  if (c && c.members.includes(h)) s += c.type === 'gank' && c.gankers.includes(h) ? 1.6 : 0.8;
  if (tm && tm.escortU && hyp(tm.escortU.x - h.x, tm.escortU.y - h.y) < 800) s += 1.4;
  if (h.recallT > 0) s -= 1.5;
  return s;
}
function watchDirect(dt) {
  const w = UI.w; w.heldT += dt; if (w.hold > 0) w.hold -= dt;
  if (w.mode !== 'auto' || w.hold > 0) return;
  const f = w.focus; w.pickT -= dt; if (w.pickT > 0 && f && !f.dead) return; w.pickT = 0.6;
  let best = null, bs = -1e9, next = null, ns = -1e9;
  for (const h of G.heroes) { const sc = watchScore(h); if (sc > bs) { bs = sc; best = h; } if (h !== f && sc > ns) { ns = sc; next = h; } }
  const cur = f && !f.dead ? watchScore(f) : -1e9;
  if (!f || f.dead || (best !== f && (bs > cur + 2.4 || (w.heldT > 5 && bs > cur + 0.9)))) watchFocus(best);       // something clearly better, or a little better after a while
  else if (w.heldT > 14 && cur < 2.5 && next) watchFocus(next);       // nothing much anywhere: move on, so every lane gets its turn
}
function watchPick(px, py, maxPx) {       // the hero under a tap
  let best = null, bd = maxPx;
  for (const h of G.heroes) { if (h.dead || !w2s(h.x * S3, 1.0, h.y * S3, _aps)) continue; const d = Math.hypot(_aps.x - px, (_aps.y - py) * 0.7) - h.r * V.z * 0.7; if (d < bd) { bd = d; best = h; } }
  return best;
}
function watchFrame(dt) {
  const w = UI.w, B = UI.pb, t0 = performance.now();
  if (B) pbWant(dt);
  if (B && B.seek) { pbSeekSlice(); drawMinimap(); watchHud(dt); return; }       // jumping to another moment of a recording: nothing is drawn until it is there
  const sp = UI.paused || (B && B.held) ? 0 : w.speed;
  if (sp) { if (B) pbAdvance(dt * sp); else simulate(dt * sp); }
  if (!UI.ended) {
    watchDirect(dt);
    const K = UI.keys, kx = (K.ArrowRight ? 1 : 0) - (K.ArrowLeft ? 1 : 0), ky = (K.ArrowDown ? 1 : 0) - (K.ArrowUp ? 1 : 0);
    if ((kx || ky) && !UI.paused) { if (w.mode !== 'free') { w.mode = 'free'; w.x = V.cam.x; w.y = V.cam.y; watchButtons(); } const v = 1500 * (V.zoomK || 1) * dt; w.x = clamp(w.x + kx * v, 0, W); w.y = clamp(w.y + ky * v / TILT, 0, W); }       // the arrow keys move the view
  }
  let tx = w.x, ty = w.y, rate = 12; const f = w.focus;
  if (V.peek) { tx = V.peek.x; ty = V.peek.y; rate = 10; }       // the match is over: the crystal that fell
  else if (w.mode !== 'free' && f) {
    if (f.dead) { tx = V.cam.x; ty = V.cam.y; if (w.mode === 'auto' && !w.deadSeen) { w.deadSeen = 1; w.hold = 1.3; } }       // he fell: stay on the spot a moment
    else { w.deadSeen = 0; let cx = f.x, cy = f.y, n = 1; for (const o of G.heroes) if (o !== f && !o.dead && o.team !== f.team && hyp(o.x - f.x, o.y - f.y) < 850) { cx += o.x; cy += o.y; n++; }       // him, leaning towards whoever he is fighting
      tx = f.x + (cx / n - f.x) * 0.4; ty = f.y + (cy / n - f.y) * 0.4; rate = 5; w.x = tx; w.y = ty; if (hyp(tx - V.cam.x, ty - V.cam.y) > 2600) { V.cam.x = tx; V.cam.y = ty; } }       // (back from the dead at the far end of the map: a cut)
  }
  const k = Math.min(1, dt * rate); V.cam.x += (tx - V.cam.x) * k; V.cam.y += (ty - V.cam.y) * k;
  renderFrame(dt * sp);
  drawMinimap(); watchHud(dt); drainWatch(); playWorldSfx();
  if (G.over && !UI.ended) endMatch();
  else if (B && !UI.ended && G.pb.i >= B.rec.steps) { UI.ended = true; UI.endT = 0.9; }       // the recording stops where the match was left
  if (UI.ended && UI.endT > 0) { UI.endT -= dt; if (UI.endT <= 0) showEnd(); }
  if (B && UI.pb === B) { B.spareT -= dt; pbSpares(clamp(13 - (performance.now() - t0), 2, sp ? 8 : 12)); }       // the spare runs get what this frame has left of its time
}
function watchHud(dt) {
  const w = UI.w, f = w.focus;
  setTxt('scA', G.kills[BLUE]); setTxt('scE', G.kills[RED]); setTxt('clock', fmtTime(G.t));
  const tk = ('' + G.kills[BLUE]).length * 10 + ('' + G.kills[RED]).length; if (UI.last.tk !== tk) { UI.last.tk = tk; fitTop(); }
  for (const p of UI.tps) {
    const h = p.h, tx = h.dead ? String(Math.ceil(h.respawnT)) : '', fr = h.dead ? 0 : Math.round(h.hp / h.maxHp * 25) / 25, on = h === f;
    if (p.hp !== fr) { p.hp = fr; p.el.style.setProperty('--h', fr); }
    if (p.tx !== tx) { p.tx = tx; p.el.lastChild.textContent = tx; p.el.classList.toggle('dead', h.dead); }
    if (p.foc !== on) { p.foc = on; p.el.classList.toggle('foc', on); }
  }
  if (UI.last.wOn !== !!f) { UI.last.wOn = !!f; $('status').hidden = !f; $('wInfo').hidden = !f; }
  if (f) {       // the plate at the bottom is whoever is being followed
    if (UI.last.wf !== f.id) { UI.last.wf = f.id; $('stImg').src = portrait(f.key, f.skin); $('status').classList.toggle('e', f.team === RED); const n = $('wName'); n.textContent = f === G.player ? f.name + ' · you' : f.name; n.className = f.team === BLUE ? 'a' : 'e'; delete UI.last.ik; delete UI.last.hs; delete UI.last.ms; }
    setTxt('stLv', f.level); moodTag(f);
    const hp = f.dead ? 0 : Math.max(0, f.hp), mp = f.dead ? 0 : f.mp;
    $('stHp').firstChild.style.transform = `scaleX(${(hp / f.maxHp).toFixed(3)})`; $('stMp').firstChild.style.transform = `scaleX(${(mp / f.maxMp).toFixed(3)})`;
    $('stXp').firstChild.style.transform = `scaleX(${f.level >= 15 ? 1 : (f.xp / xpNeed(f.level)).toFixed(3)})`;
    const hs = Math.ceil(hp) + ' / ' + Math.round(f.maxHp), ms = Math.floor(mp) + ' / ' + Math.round(f.maxMp);
    if (UI.last.hs !== hs) { UI.last.hs = hs; $('stHp').lastChild.textContent = hs; } if (UI.last.ms !== ms) { UI.last.ms = ms; $('stMp').lastChild.textContent = ms; }
    const ik = f.items.join(',');
    if (UI.last.ik !== ik) { UI.last.ik = ik; $('stItems').innerHTML = Array.from({ length: 6 }, (_, i) => f.items[i] ? `<div class="slot ii${ITEMS[f.items[i]].part ? ' part' : ''}" title="${esc(ITEMS[f.items[i]].name)}">${icon(ITEMS[f.items[i]].ic, ITEMS[f.items[i]].c)}</div>` : '<div class="slot"></div>').join(''); }
    setTxt('wStat', `${f.kills} / ${f.deaths} / ${f.assists} · ${(f.goldEarned / 1000).toFixed(1)}k`);
    setTxt('wPlan', f.dead ? 'Back in ' + Math.ceil(f.respawnT) : f.ai ? f.ai.plan || '' : f === G.player && G.pb ? pbDid() : '');
  }
  for (const [id, T] of [['wcA', BLUE], ['wcE', RED]]) {       // what each team is up to
    const tm = G.team && G.team[T], c = tm && tm.call, tx = c ? callText(c) : tm && tm.escort ? 'Marching ' + LANE_SAY[tm.escort] + ' with the Shardlord' : tm && tm.pushAll ? 'All in' : 'In their lanes';
    if (UI.last[id] !== tx) { UI.last[id] = tx; const el = $(id); el.lastChild.textContent = tx; el.classList.toggle('idle', !c && !(tm && (tm.escort || tm.pushAll))); }
  }
  if (UI.pb) pbHud();
  tickBanners(dt);
  UI.refreshT -= dt; if (UI.refreshT <= 0) { UI.refreshT = 0.5; if (!$('board').hidden) $('boardT').innerHTML = boardHtml(false); }
}
const TEAM_SAY = ['Blue', 'Red'], TEAM_HEX = ['#46b4ff', '#ff5d5d'];
function drainWatch() {
  const byId = id => G.heroes.find(h => h.id === id), ln = l => (l === 'mid' ? 'Mid' : l === 'top' ? 'Top' : 'Bottom') + ' lane';
  for (const e of G.events) {
    if (e.t === 'kill') {
      const v = byId(e.victim), k = byId(e.killer), col = TEAM_HEX[1 - v.team];
      feedLine((k ? `<span class="${k.team === BLUE ? 'a' : 'e'}" style="display:flex;align-items:center;gap:5px"><img src="${portrait(k.key, k.skin)}" alt="">${k.name}</span>` : `<span style="color:var(--mute)">${esc(e.by === 'turret' ? 'Turret' : e.by === 'minion' ? 'Minions' : e.by === 'monster' ? 'Creeps' : 'Crystal')}</span>`) + icon('sword') + `<span class="${v.team === BLUE ? 'a' : 'e'}" style="display:flex;align-items:center;gap:5px">${v.name}<img src="${portrait(v.key, v.skin)}" alt=""></span>`);
      if (e.first) banner('First blood', k ? k.name + ' drew first blood' : '', col, k, v);
      else if (e.multi >= 2 && k) banner(MULTI[Math.min(e.multi, 5)], k.name, col, k, v);
      else if (e.shutdown) banner('Shut down', v.name + "'s streak is over", col, k, v);
      else if (k && (e.streak === 3 || e.streak === 5 || e.streak >= 7)) banner(e.streak >= 7 ? 'Unstoppable' : e.streak === 5 ? 'Rampage' : 'Killing spree', k.name, col, k, v);
      if (UI.w.mode === 'auto' && k && !k.dead && v === UI.w.focus) { UI.w.hold = 1.2; UI.w.pickT = 0; }
    } else if (e.t === 'turret') banner('Turret destroyed', TEAM_SAY[1 - e.team] + ' takes it · ' + ln(e.lane) + (e.tier === 3 ? ' · base exposed' : ''), TEAM_HEX[1 - e.team]);
    else if (e.t === 'spawn') banner(e.which === 'lord' ? 'The Shardlord wakes' : 'Riverback has surfaced', e.which === 'lord' ? 'Lower river · it marches for whoever slays it' : 'Upper river · gold and experience for a whole team', '#c070ff');
    else if (e.t === 'epic') banner(e.which === 'lord' ? 'Shardlord slain' : 'Riverback slain', TEAM_SAY[e.team] + ' claims the reward', TEAM_HEX[e.team]);
    else if (e.t === 'lordSummon') banner('The Shardlord marches for ' + TEAM_SAY[e.team], ln(e.lane), TEAM_HEX[e.team]);
    else if (e.t === 'plateOff') { if (e.n) banner('The gold plating is gone', 'Outer turrets stand bare from here on', '#f2c14e'); }
    else if (e.t === 'ace') banner(TEAM_SAY[1 - e.team] + ' team wiped out', '', TEAM_HEX[e.team]);
    else if (e.t === 'call') { const tx = callText(e); if (tx) feedLine(`<span class="${e.team === BLUE ? 'a' : 'e'}" style="display:flex;align-items:center;gap:5px">${icon('flag')}${TEAM_SAY[e.team]}</span><span>${esc(tx)}</span>`, 5000); }
  }
  G.events.length = 0;
}
function watchKey(e, k) {       // the keyboard while watching
  if (k === 'Tab') { e.preventDefault(); if (!UI.boardHold && !UI.ended) { UI.boardHold = true; openModal('board'); } return; }
  if (k === 'Escape') { for (const m of ['board', 'pause']) if (!$(m).hidden) { closeModal(m); return; } if (!UI.ended) openModal('pause'); return; }
  if (UI.ended) return;
  const B = UI.pb;
  if (B && !UI.paused && !e.repeat && (k === ' ' || k === 'k')) { e.preventDefault(); pbHold(); snd('ui'); return; }       // a recording: Space stops it where it is, to look around
  if (k === ' ') { e.preventDefault(); if (e.repeat) return; if (UI.paused) closeModal('pause'); else openModal('pause'); return; }
  if (UI.paused) return;
  if (B && (k === 'j' || k === 'l' || k === 'Home')) { e.preventDefault(); if (k === 'Home') { if (!e.repeat) pbSeek(0); } else pbJump(k === 'j' ? -PB_JUMP : PB_JUMP); return; }
  if (k.startsWith('Arrow')) { e.preventDefault(); UI.keys[k] = true; return; }
  if (e.repeat) return;
  if (k === 'a') { watchAuto(UI.w.mode !== 'auto'); snd('ui'); return; }
  if (k === '+' || k === '=') { watchSpeed(1); snd('ui'); return; } if (k === '-' || k === '_') { watchSpeed(-1); snd('ui'); return; }
  if (k >= '0' && k <= '9') { const i = k === '0' ? 9 : +k - 1, h = G.heroes.filter(q => q.team === (i < 5 ? BLUE : RED))[i % 5]; if (h) { watchFocus(h, true); snd('ui'); } }
}

/* ---------------- recordings of the player's own matches ----------------
   Every match the player plays is recorded by the sim (what went into it, nothing else: see "recording a match" there) and kept: the
   last six, on this device, in the browser's database for this page where it will have one (a private window may not: then they
   last until the page is closed). REPS.list, newest first: { id, when, hero, skin, diff, win (true, false, or null for a match that
   was left), t, k, d, a, sim, rec }. A recording only plays on the build of the sim that made it (sim). */
const REPS = { list: [], db: null, max: 6, state: 0, asked: false };       // state: 0 the database has not answered yet, 1 kept in it, 2 this session only
function repOk(e) { return !!(e && e.id && e.rec && e.rec.dt && e.rec.ev && e.rec.chk && e.rec.steps > 0 && e.rec.opts && HEROES[e.hero]); }
function repsWrite(e) { if (!REPS.db) return; try { REPS.db.transaction('reps', 'readwrite').objectStore('reps').put(e); } catch (_) { /* not kept: it is still there until the page closes */ } }
function repsTrim() { while (REPS.list.length > REPS.max) { const o = REPS.list.pop(); if (REPS.db) try { REPS.db.transaction('reps', 'readwrite').objectStore('reps').delete(o.id); } catch (_) { /* fine */ } } }
function repsOpen() {
  if (REPS.asked) return; REPS.asked = true;
  const no = () => { if (!REPS.state) { REPS.state = 2; repsShow(); } };
  setTimeout(no, 4000);       // (some private windows never answer)
  try {
    const rq = indexedDB.open('shardfall-arena', 1);
    rq.onupgradeneeded = () => { try { rq.result.createObjectStore('reps', { keyPath: 'id' }); } catch (_) { /* there already */ } };
    rq.onerror = e => { if (e && e.preventDefault) e.preventDefault(); no(); };
    rq.onsuccess = () => {
      try {
        const db = rq.result, all = db.transaction('reps', 'readonly').objectStore('reps').getAll();
        all.onsuccess = () => {
          const mine = REPS.list.slice(), have = new Set(mine.map(e => e.id));       // matches finished before the database answered
          for (const e of all.result || []) if (repOk(e) && !have.has(e.id)) REPS.list.push(e);
          REPS.list.sort((a, b) => b.id - a.id); REPS.db = db; REPS.state = 1; repsTrim(); for (const e of mine) if (REPS.list.includes(e)) repsWrite(e); repsShow();
        };
        all.onerror = e => { if (e && e.preventDefault) e.preventDefault(); no(); };
      } catch (_) { no(); }
    };
  } catch (_) { no(); }
}
function repsPut(e) { REPS.list.unshift(e); repsTrim(); repsWrite(e); repsShow(); }
function repsDel(id) { const i = REPS.list.findIndex(e => e.id === id); if (i < 0) return; REPS.list.splice(i, 1); if (REPS.db) try { REPS.db.transaction('reps', 'readwrite').objectStore('reps').delete(id); } catch (_) { /* fine */ } if (UI.lastRep && UI.lastRep.id === id) { UI.lastRep = null; $('btnRep').hidden = true; } repsShow(); }
/* the match that has just ended, or is being left, goes on the list */
function keepMatch(left) {
  const rec = recTake(); if (!rec) return null; G.rec = null;
  if (rec.steps < 600 || (left && G.t < 45)) return null;       // nothing worth keeping
  const me = G.player, now = Date.now(), e = { id: REPS.list.some(q => q.id === now) ? now + 1 : now, when: now, hero: me.key, skin: me.skin, role: me.role, duel: G.duel ? 1 : undefined, diff: G.diff, win: left ? null : G.winner === BLUE, t: G.t, k: me.kills, d: me.deaths, a: me.assists, sim: rec.sim, rec };
  repsPut(e); return e;
}
function repWhen(t) { try { const d = new Date(t); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } }
function repsShow() {
  if ($('reps').hidden) return;
  $('repList').innerHTML = REPS.list.length ? REPS.list.map(e => {
    const d = HEROES[e.hero], can = simPlays(e.sim), ro = d.roles && d.roles[e.role | 0], res = e.win == null ? 'Left at ' + fmtTime(e.t) : e.win ? 'Victory' : 'Defeat';
    return `<div class="rep${can ? '' : ' old'}" data-id="${e.id}"><img src="${portrait(e.hero, e.skin)}" alt=""><div class="rt"><b class="${e.win == null ? '' : e.win ? 'w' : 'l'}">${res}</b><span>${e.duel ? '1v1 · ' : ''}${esc(d.name)}${ro ? ' (' + ro.cls + ')' : ''} · ${e.k} / ${e.d} / ${e.a} · ${fmtTime(e.t)} · ${DIFFS[e.diff] ? DIFFS[e.diff].name : ''}</span><small>${esc(repWhen(e.when))}${can ? '' : ' · from an older version of the game: it cannot be played any more'}</small></div><button class="btn sm" data-w="${e.id}"${can ? '' : ' disabled'}>Watch</button><button class="del" data-x="${e.id}" aria-label="Delete this recording">${icon('x')}</button></div>`;
  }).join('') : '<div class="repempty">No matches yet. Play one and it is kept here to watch again: where you went, what the enemy was doing where you could not see, how each fight went.</div>';
  $('repNote').textContent = REPS.list.length ? `The last ${REPS.max} matches are kept${REPS.state === 1 ? ', on this device only' : REPS.state === 2 ? ' until this page is closed (this browser is not letting the page keep anything)' : ''}.` : '';
  $('repBots').textContent = 'Five against five, each side at the level given it here. A director follows the action.'; wdShow();
}
function openReps() { repsOpen(); $('reps').hidden = false; document.querySelectorAll('.x').forEach(b => b.innerHTML = icon('x')); repsShow(); }

/* ---------------- watching a recording ----------------
   The sim runs the match again from its recording (pbOpen, pbStep) and the watching view shows it: the view starts on the player's own
   hero, both sides are in sight, the director and the free view are there as for bots. UI.pb: e (the list entry), rec, acc (match
   time owed to the sim), held (stopped where it is, to look around), seek ({ to, from }: on its way to another moment), drag (the
   time under a finger on the bar, or -1).
   Going forward is running the sim without drawing it. There is no going back in a sim, and a match cannot be copied (it is full of
   functions that hold on to its units), so two more runs of the same recording are kept going behind the one on the screen
   (B.spare: G objects, about half a minute and two minutes behind). Going back a little is taking over the nearest of them that has
   not passed the moment and running it on to it, which takes no time to speak of; the one taken is replaced by a new run from the
   start, brought up in the time each frame has to spare. Going back further than they reach is a new run from the start, with a
   plate saying how far it has got. The run that was on the screen before a jump back is not thrown away either (B.ahead): it
   waits where it is, and going forward again to that moment or past it takes it up again, the run left behind becoming a spare.
   B.want: where the 15-second buttons have asked to go (presses in quick succession add up). */
const PB_JUMP = 15, PB_LAG = [32, 110], PB_LEAD = 8;
function bindWd() { for (const id of ['wdSheet', 'wdPause']) { const el = $(id); el.innerHTML = wdHtml(); el.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) wdPick(+b.dataset.t, +b.dataset.d); }); } wdShow(); }
function startPlayback(e) {
  if (!e || !simPlays(e.sim)) return;
  pbOpen(e.rec); const me = G.player;
  watchEnter(me); UI.w.diffs = [1, G.diff]; wdTags();
  UI.pb = { e, rec: e.rec, acc: 0, held: false, seek: null, drag: -1, drift: false, spare: [], spareT: 1.5, ahead: null, want: -1, wantT: 0 };
  $('pbBack').textContent = '−' + PB_JUMP; $('pbFwd').textContent = '+' + PB_JUMP; pbMarks();
  const tr = $('pbTrack'); tr.setAttribute('aria-valuemax', Math.round(e.rec.t)); tr.setAttribute('aria-valuenow', 0);
  banner('Replay', `${me.name} · ${e.win == null ? 'left at ' + fmtTime(e.t) : e.win ? 'victory' : 'defeat'} in ${fmtTime(e.t)}`, '#f2c14e');
  hint((HAS_TOUCH ? 'Your match again, from anywhere. The view starts on you: tap another hero to follow them, or Auto for the director. ' : 'Your match again, from anywhere. The view starts on you: click another hero to follow them, or press A for the director. ') + 'Drag the bar to jump, or use −15 and +15. A long jump takes a few seconds.', 12);
  snd('horn');
}
function pbMarks() {       // kills (the player's own stand taller), turrets, the great beasts
  const B = UI.pb, T = B.rec.t || 1, me = G.player.id;
  $('pbMarks').innerHTML = B.rec.marks.map(m => `<i class="${m.k === 'kill' ? 'k' + (m.by === me || m.on === me ? ' me' : '') : m.k === 'turret' ? 't' : m.k === 'lord' ? 'l' : 'r'}${m.team === BLUE ? '' : ' e'}" style="left:${(clamp(m.t / T, 0, 1) * 100).toFixed(2)}%"></i>`).join('');
}
function pbHold(on) { const B = UI.pb; if (!B) return; B.held = on == null ? !B.held : !!on; }
function pbAdvance(dt) {       // dt seconds of the match, as near as its own steps allow: a step is taken once half of it is owed
  const B = UI.pb, P = G.pb, r = B.rec, t0 = performance.now(); B.acc = Math.min(B.acc + dt, 0.5); let n = 0;
  while (P.i < r.steps && !G.over) { const s = r.dt[P.i] / DT_Q; if (B.acc < s * 0.5) break; if (!pbStep()) break; B.acc -= s; if (++n >= 48 || (n >= 8 && performance.now() - t0 > 14)) { if (B.acc > 0) B.acc = 0; break; } }       // (what a slow device cannot run in a frame is let go: the match slows down)
}
function pbTake(g) {       // another run of the recording takes the screen (a new one from its first step if none is given); whoever was being followed still is
  const B = UI.pb, w = UI.w, fid = w.focus ? w.focus.id : 0;
  if (g) G = g; else pbOpen(B.rec);
  B.acc = 0; UI.ended = false; UI.endT = 0; V.peek = null; $('end').hidden = true;
  V.me = G.player; w.focus = G.heroes.find(h => h.id === fid) || G.player; V.focus = w.focus; w.hold = 0; w.pickT = 0; w.deadSeen = 0;
  UI.last = {}; buildTeams(); watchButtons();
}
function pbQuiet(g) { g.fx.length = 0; g.sfx.length = 0; g.events.length = 0; }
function pbSpareNew() { const m = G; let g = null; try { g = pbOpen(UI.pb.rec); g.fxOn = false; } finally { G = m; } return g; }       // (a run nobody sees makes no effects)
function pbSpareRun(g, to, ms) {       // a spare run brought on towards match time `to`, for ms of this frame at most
  const m = G, t0 = performance.now(); G = g;
  try { let n = 0; while (g.t < to && pbStep()) if ((++n & 7) === 0 && performance.now() - t0 >= ms) break; } finally { pbQuiet(g); G = m; }
}
function pbSpares(ms) {       // every frame: the spare runs kept at their distances behind, the nearest first
  const B = UI.pb, S = B.spare, t0 = performance.now();
  if (B.ahead && B.ahead.t <= G.t) B.ahead = null;       // the screen has come to where the old run waited: it is of no more use
  if (S.length < PB_LAG.length && B.spareT <= 0) { B.spareT = 0.5; S.push(pbSpareNew()); return; }       // (setting up a match is a frame's work by itself)
  if (S.length > 1 && S[0].t < S[1].t) S.reverse();
  for (let i = 0; i < S.length; i++) { const to = G.t - PB_LAG[i], left = ms - (performance.now() - t0); if (left < 0.3) break; if (S[i].t < to) pbSpareRun(S[i], to, left); }
}
function pbShelve(g) { pbQuiet(g); g.fxOn = false; return g; }       // a run that leaves the screen: it makes no more effects
function pbSeek(t) {
  const B = UI.pb; if (!B) return; t = clamp(t, 0, B.rec.t); B.want = -1;
  const from = B.seek ? B.seek.from : G.t, S = B.spare, old = G;
  if (t < G.t - 0.25) {       // back: the nearest spare run that has not passed the moment, or a new start
    let k = -1; for (let i = 0; i < S.length; i++) if (S[i].t <= t && (k < 0 || S[i].t > S[k].t)) k = i;
    pbTake(k < 0 ? null : S.splice(k, 1)[0]); B.spareT = 0.3;
    if (!B.ahead || old.t > B.ahead.t) B.ahead = pbShelve(old);       // the run that was on the screen waits where it is, in case the way leads back there
    for (let i = S.length - 1; i >= 0; i--) if (S[i].t > t) S.splice(i, 1);       // a spare that is ahead of the screen now is no spare: new ones are started behind it
  } else {
    if (UI.ended) return;
    const a = B.ahead;
    if (a && a.t > G.t && a.t <= t) {       // forward to where the old run waits, or past it: it takes the screen again, and this one falls in behind
      B.ahead = null; pbTake(a); S.push(pbShelve(old));
      if (S.length > PB_LAG.length) { let m = 0; for (let i = 1; i < S.length; i++) if (S[i].t < S[m].t) m = i; S.splice(m, 1); }
    }
  }
  G.fxOn = false; B.seek = { to: t, from, base: G.t, t0: performance.now() }; $('app').classList.add('seek');
}
function pbSeekSlice() {       // a frame's worth of the way there (more of the frame once the plate is up: nothing else is being drawn)
  const B = UI.pb, S = B.seek, t0 = performance.now(), ms = t0 - S.t0 > 150 ? 30 : 13; let more = true;
  while (more && G.t < S.to && performance.now() - t0 < ms) { for (let k = 0; k < 16 && more && G.t < S.to; k++) more = pbStep(); pbQuiet(G); }
  if (more && G.t < S.to) {
    if (performance.now() - S.t0 > 150) { $('pbWait').hidden = false; setTxt('pbWaitT', (S.to < S.from - 0.25 ? 'Back to ' : 'On to ') + fmtTime(S.to)); $('pbWaitP').style.transform = `scaleX(${clamp((G.t - S.base) / Math.max(0.1, S.to - S.base), 0, 1).toFixed(3)})`; }
    return;
  }
  B.seek = null; B.acc = 0; G.fxOn = true; $('app').classList.remove('seek'); $('pbWait').hidden = true;
  V.cut = true; fxClear(); $('feed').innerHTML = ''; $('announce').innerHTML = ''; UI.banners.length = 0; UI.bannerT = 0;       // nothing of where it was is carried over
  const f = UI.w.focus; if (f && UI.w.mode !== 'free') { V.cam.x = f.x; V.cam.y = f.y; }
}
function pbJump(d) {       // the 15-second buttons and keys: presses in quick succession add up, and the jump is made once they stop
  const B = UI.pb; if (!B) return; const from = B.want >= 0 ? B.want : B.seek ? B.seek.to : G.t;
  if (UI.ended && d > 0) return;
  B.want = clamp(from + d, 0, B.rec.t); B.wantT = 0.24; B.drag = -1; pbTipAt(B.want);
}
function pbWant(dt) { const B = UI.pb; if (B.want < 0) return; B.wantT -= dt; if (B.wantT > 0) return; const t = B.want; B.want = -1; $('pbTip').hidden = true; UI.last.pbp = -1; if (Math.abs(t - G.t) > 0.3 || B.seek) pbSeek(t); }
const PB_ACT = { [A_MEND]: 'Heal', [A_RECALL]: 'Recalling', [A_SELL]: 'Sold an item' };
function pbDid() {       // what the player last did, for a moment, on his plate
  const d = G.pb.did, me = G.player; if (!d || !d.ok || G.t - d.t > 1.6) return '';
  if (d.k === A_CAST) return d.a === 3 ? SPELLS[me.spell].name : skDef(me, d.a).name;
  if (d.k === A_LEVEL) return 'Learned ' + skDef(me, d.a).name;
  if (d.k === A_BUY) return 'Bought ' + ITEMS[d.a].name;
  if (d.k === A_ITEM) { const k = activeItem(me); return k ? ITEMS[k].act.name : 'Item'; }
  return PB_ACT[d.k] || '';
}
function pbHud() {
  const B = UI.pb, T = B.rec.t || 1, p = clamp(G.t / T, 0, 1), q = Math.round(p * 2000);
  if (UI.last.pbp !== q) { UI.last.pbp = q; $('pbFill').style.transform = `scaleX(${p.toFixed(4)})`; if (B.drag < 0 && B.want < 0) $('pbThumb').style.left = (p * 100).toFixed(2) + '%'; }
  setTxt('pbTime', fmtTime(G.t) + ' / ' + fmtTime(T));
  const sec = Math.floor(G.t); if (UI.last.pbs !== sec) { UI.last.pbs = sec; const tr = $('pbTrack'); tr.setAttribute('aria-valuenow', sec); tr.setAttribute('aria-valuetext', fmtTime(G.t) + ' of ' + fmtTime(T)); }
  const held = B.held ? 1 : 0; if (UI.last.pbh !== held) { UI.last.pbh = held; const b = $('pbPlay'); b.innerHTML = icon(held ? 'play' : 'pause'); b.setAttribute('aria-label', held ? 'Play' : 'Pause'); }
  if (G.pb.desync >= 0 && !B.drift) { B.drift = true; hint('This replay has drifted from what was recorded (a browser update can do that): from here on it may not be what happened.', 10); }
}
function pbAt(p) { const r = lrect($('pbTrack')); return clamp((p.x - r.left) / Math.max(1, r.width), 0, 1) * UI.pb.rec.t; }
function pbSnap(t) {       // a tap on a mark, or next to one, goes to a few seconds before it: what led to it is the thing to see (the player's own marks first)
  const B = UI.pb, tol = 9 / Math.max(1, lrect($('pbTrack')).width) * B.rec.t, me = G.player.id; let best = null, bd = tol;
  for (const m of B.rec.marks) { const d = Math.abs(m.t - t) * (m.k === 'kill' && (m.by === me || m.on === me) ? 0.6 : 1); if (d < bd) { bd = d; best = m; } }
  return best ? Math.max(0, best.t - PB_LEAD) : t;
}
function pbTipAt(t) { const k = clamp(t / (UI.pb.rec.t || 1), 0, 1) * 100, tip = $('pbTip'); $('pbThumb').style.left = k.toFixed(2) + '%'; tip.hidden = false; tip.textContent = fmtTime(t); tip.style.left = clamp(k, 4, 96).toFixed(2) + '%'; }
function pbDragShow() { pbTipAt(UI.pb.drag); }
function bindPlayback() {
  $('pbPlay').addEventListener('click', () => { if (UI.pb && !UI.ended) { pbHold(); snd('ui'); } });
  $('pbBack').addEventListener('click', () => { if (UI.pb) { snd('ui'); pbJump(-PB_JUMP); } });
  $('pbFwd').addEventListener('click', () => { if (UI.pb) { snd('ui'); pbJump(PB_JUMP); } });
  press($('pbTrack'), {
    down(p) { const B = UI.pb; if (!B || B.drag >= 0 || UI.paused) return false; if (p.type !== 'mouse' && !UI.touch) { UI.touch = true; document.body.classList.add('touch'); } B.want = -1; B.drag = pbAt(p); B.dragX = p.x; B.tap = true; pbDragShow(); },
    move(p) { const B = UI.pb; if (B && B.drag >= 0) { if (Math.abs(p.x - B.dragX) > 7) B.tap = false; B.drag = pbAt(p); pbDragShow(); } },
    up(p, cancelled) { const B = UI.pb; if (!B || B.drag < 0) return; const t = B.tap ? pbSnap(B.drag) : B.drag; B.drag = -1; $('pbTip').hidden = true; UI.last.pbp = -1; if (!cancelled) pbSeek(t); },
  });
  $('pbTrack').addEventListener('keydown', e => { const B = UI.pb; if (!B) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); pbJump(e.key === 'ArrowLeft' ? -PB_JUMP : PB_JUMP); } });
}

/* ---------------- loop ---------------- */
/* The sim, in steps that are whole counts of 1/7200 s (so that a match can be recorded as a byte a step): 1/30 s at most and four to a
   frame. What is left of a frame is carried to the next; what four steps cannot hold is let go, as before (the game slows down
   rather than skipping). */
function simulate(dt) {
  let acc = (UI.simAcc || 0) + dt, n = 0;
  while (n++ < 4) { const du = Math.min(DU_MAX, Math.floor(acc * DT_Q + 1e-6)); if (du < 4) break; tick(du); acc -= du / DT_Q; }
  UI.simAcc = acc < 1 / 30 ? acc : 0;
  if (UI.state === 'play') recTick(dt);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - UI.lastT) / 1000 || 0.016, 0.001, 0.1); UI.lastT = now;
  frameStep(dt);
}
function frameStep(dt) {       // one turn of the game, dt seconds long: the sim, then whatever is on screen (the live game or a recording), then the HUD
  AH.on = false;       // (only a networked match in progress has a forecast of the player's hero: see netAhead, below)
  if (UI.state === 'play') {
    const me = G.player;
    if (NET.M) { if (!UI.ended && !RP.on && !UI.paused) { readInput(); runQueue(); } else { const I = G.input; I.mx = I.my = 0; I.atk = false; } netFrame(dt); if (!NET.M) return; netAhead(); }       // a networked match does not stop for a menu: the hero stands still while one is open
    else if (!UI.paused) { if (!UI.ended && !RP.on) { readInput(); runQueue(); } simulate(dt); }
    if (RP.on && (UI.ended || G.over || (!G.practice && !me.dead))) endReplay();       // back on his feet, or the match is over: the live game takes the screen again
    if (RP.on) { if (!replayFrame(UI.paused && !NET.M ? 0 : dt)) endReplay(); }
    if (!RP.on) {
      let tx = myX(me), ty = myY(me), rate = 9; const P = UI.pan;
      if (V.peek) { tx = V.peek.x; ty = V.peek.y; rate = 10; }       // the minimap is held, or the match is over
      else if (P && P.on) { tx = clamp(myX(me) + P.ox, 0, W); ty = clamp(myY(me) + P.oy, 0, W); rate = 22; }       // the battlefield is being dragged
      else { const a = aimPan(me, dt); if (a.x || a.y) { tx = clamp(tx + a.x, 0, W); ty = clamp(ty + a.y, 0, W); rate = 7; } }       // a long aim: lean after it
      const k = Math.min(1, dt * rate); V.cam.x += (tx - V.cam.x) * k; V.cam.y += (ty - V.cam.y) * k;
      renderFrame(UI.paused && !NET.M ? 0 : dt);
    }
    drawMinimap(); updateHud(dt); drainEvents(); playWorldSfx();
    if (G.over && !UI.ended) endMatch();
    if (UI.ended && UI.endT > 0) { UI.endT -= dt; if (UI.endT <= 0) showEnd(); }
  } else if (UI.state === 'watch') watchFrame(dt);
  else {
    simulate(dt);
    UI.demoT -= dt;
    if (UI.demoT <= 0 || !UI.demoFocus || UI.demoFocus.dead) { let b = null; for (const h of G.heroes) if (!h.dead && (!b || h.lastCombatT > b.lastCombatT)) b = h; UI.demoFocus = b || G.heroes[0]; UI.demoT = 7; }
    const f = UI.demoFocus, k = Math.min(1, dt * 2.5); V.cam.x += (f.x + V.vw * 0.12 / V.z - V.cam.x) * k; V.cam.y += (f.y - V.cam.y) * k;
    renderFrame(dt); G.events.length = 0; G.sfx.length = 0;
    if (G.over || G.t > 1500) startDemo();
  }
}
function boot() {
  prefs(false);
  UI.touch = isPhone(); document.body.classList.toggle('touch', UI.touch); layoutApp();
  let ok = false; try { ok = viewInit($('cv')); } catch (e) { ok = false; if (window.console) console.error(e); }
  $('loading').hidden = true;
  if (!ok) { $('nogl').hidden = false; return; }
  viewResize($('cv')); buildMenu(); bindInput(); bindPractice(); bindPlayback(); bindWd(); bindNet(); repsOpen(); startDemo(); $('menu').hidden = false;
  UI.lastT = performance.now(); requestAnimationFrame(frame);
  setTimeout(netFromLink, 200);       // (opened by a table's invite link: straight to that table)
}
prefs(false); layoutApp();      // turn the frame before anything is drawn, so the loading screen is already the right way round
const bootSoon = () => requestAnimationFrame(() => setTimeout(boot, 30));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(bootSoon); else bootSoon();
