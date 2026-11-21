'use strict';
/* ============================================================
   SHARDFALL ARENA — data: constants, items, spells, heroes
   ============================================================ */
const W = 6912;                       // world is W x W units
const BLUE = 0, RED = 1, NEUTRAL = 2;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
/* The length of (x, y). This is Math.hypot of two numbers written out, step for step as the browser this game was made on works it
   out (both scaled by the larger, squared, added, rooted, scaled back), so it gives the same answer there to the last bit, gives that
   same answer in every other browser as well (which matters to a recorded match played again), and takes a tenth of the time. */
function hyp(x, y) {
  x = Math.abs(x); y = Math.abs(y);
  let m = 0; if (x > m) m = x; if (y > m) m = y;
  if (m === Infinity) return Infinity; if (x !== x || y !== y) return NaN; if (m === 0) return 0;
  const a = x / m, b = y / m;
  return Math.sqrt(a * a + b * b) * m;
}
/* Sines, cosines and angles worked out in plain arithmetic (the fdlibm way: the argument brought to within an eighth of a turn, then
   a polynomial), so that every browser gets the same answer to the last bit. A browser's own Math.sin may round the last place
   differently from another engine's: nothing to a match played alone, everything to one that two machines must each play out and
   arrive at the same place. A networked match uses these (mathSet(true)); every other match uses the browser's own, as it always did,
   so what was recorded before plays as it was. The sim calls fsin, fcos and fatan2, which are the one or the other. */
const _S1 = -1.66666666666666324348e-01, _S2 = 8.33333333332248946124e-03, _S3 = -1.98412698298579493134e-04, _S4 = 2.75573137070700676789e-06, _S5 = -2.50507602534068634195e-08, _S6 = 1.58969099521155010221e-10;
const _C1 = 4.16666666666666019037e-02, _C2 = -1.38888888888741095749e-03, _C3 = 2.48015872894767294178e-05, _C4 = -2.75573143513906633035e-07, _C5 = 2.08757232129817482790e-09, _C6 = -1.13596475577881948265e-11;
const _INVPIO2 = 6.36619772367581382433e-01, _PIO2_1 = 1.57079632673412561417e+00, _PIO2_1T = 6.07710050650619224932e-11, _PIO2_2 = 6.07710050630396597660e-11, _PIO2_2T = 2.02226624879595063154e-21;
const _ATHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00], _ATLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const _AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
const _PI_HI = 3.1415926535897931160e+00, _PI_LO = 1.2246467991473531772e-16;
let _ry0 = 0, _ry1 = 0;
function _ksin(x, y, iy) { const z = x * x, v = z * x, r = _S2 + z * (_S3 + z * (_S4 + z * (_S5 + z * _S6))); return iy ? x - ((z * (0.5 * y - v * r) - y) - v * _S1) : x + v * (_S1 + z * r); }
function _kcos(x, y) { const z = x * x, r = z * (_C1 + z * (_C2 + z * (_C3 + z * (_C4 + z * (_C5 + z * _C6))))), ax = x < 0 ? -x : x; if (ax < 0.3) return 1 - (0.5 * z - (z * r - x * y)); const qx = ax > 0.78125 ? 0.28125 : ax * 0.25, hz = 0.5 * z - qx; return (1 - qx) - (hz - (z * r - x * y)); }
function _rem(x) {       // x = n quarter turns + _ry0 + _ry1, the remainder within an eighth of a turn; returns n
  let ax = x < 0 ? -x : x; if (ax > 8e5) ax -= TAU * Math.floor(ax / TAU);       // (further than the sim ever asks: whole turns off first)
  const n = Math.round(ax * _INVPIO2), t = ax - n * _PIO2_1; let w = n * _PIO2_2; const r = t - w; w = n * _PIO2_2T - ((t - r) - w);
  const y0 = r - w, y1 = (r - y0) - w; if (x < 0) { _ry0 = -y0; _ry1 = -y1; return -n; } _ry0 = y0; _ry1 = y1; return n;
}
function dsin(x) {
  if (x !== x || x === Infinity || x === -Infinity) return NaN; const ax = x < 0 ? -x : x;
  if (ax <= 0.7853981633974483) return ax < 7.450580596923828e-9 ? x : _ksin(x, 0, 0);
  switch (_rem(x) & 3) { case 0: return _ksin(_ry0, _ry1, 1); case 1: return _kcos(_ry0, _ry1); case 2: return -_ksin(_ry0, _ry1, 1); default: return -_kcos(_ry0, _ry1); }
}
function dcos(x) {
  if (x !== x || x === Infinity || x === -Infinity) return NaN; const ax = x < 0 ? -x : x;
  if (ax <= 0.7853981633974483) return ax < 7.450580596923828e-9 ? 1 : _kcos(x, 0);
  switch (_rem(x) & 3) { case 0: return _kcos(_ry0, _ry1); case 1: return -_ksin(_ry0, _ry1, 1); case 2: return -_kcos(_ry0, _ry1); default: return _ksin(_ry0, _ry1, 1); }
}
function _atan(x) {       // x >= 0
  if (x >= 7.378697629483821e19) return _ATHI[3] + _ATLO[3];
  let id = -1;
  if (x < 0.4375) { if (x < 1.862645149230957e-9) return x; }
  else if (x < 1.1875) { if (x < 0.6875) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); } }
  else if (x < 2.4375) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); } else { id = 3; x = -1 / x; }
  const z = x * x, w = z * z, s1 = z * (_AT[0] + w * (_AT[2] + w * (_AT[4] + w * (_AT[6] + w * (_AT[8] + w * _AT[10]))))), s2 = w * (_AT[1] + w * (_AT[3] + w * (_AT[5] + w * (_AT[7] + w * _AT[9]))));
  return id < 0 ? x - x * (s1 + s2) : _ATHI[id] - ((x * (s1 + s2) - _ATLO[id]) - x);
}
function datan2(y, x) {
  if (x !== x || y !== y) return NaN;
  const ny = y < 0 || (y === 0 && 1 / y < 0), nx = x < 0 || (x === 0 && 1 / x < 0);
  if (y === 0) return nx ? (ny ? -_PI_HI : _PI_HI) : y;
  if (x === 0) return ny ? -_ATHI[3] : _ATHI[3];
  const ix = x === Infinity || x === -Infinity, iy = y === Infinity || y === -Infinity;
  if (ix) { const z = iy ? (nx ? 3 * _ATHI[1] : _ATHI[1]) : (nx ? _PI_HI : 0); return ny ? -z : z; }
  if (iy) return ny ? -_ATHI[3] : _ATHI[3];
  const q = (ny ? -y : y) / (nx ? -x : x);
  if (q > 1.152921504606847e18) { const z = _ATHI[3] + 0.5 * _PI_LO; return ny ? -z : z; }       // straight up or straight down, whichever side x is on
  const z = nx && q < 8.673617379884035e-19 ? 0 : _atan(q);
  return nx ? (ny ? (z - _PI_LO) - _PI_HI : _PI_HI - (z - _PI_LO)) : (ny ? -z : z);
}
let fsin = Math.sin, fcos = Math.cos, fatan2 = Math.atan2, _mathDet = false;
function mathSet(det) { det = !!det; if (det === _mathDet) return; _mathDet = det; if (det) { fsin = dsin; fcos = dcos; fatan2 = datan2; } else { fsin = Math.sin; fcos = Math.cos; fatan2 = Math.atan2; } }
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const L = (lv, base, per) => base + per * (lv - 1);
const R = n => Math.round(n);

/* ---------------- items ---------------- */
/* Items come in two tiers. Parts are cheap and plain; a complete item is forged from the parts listed in `from` plus a fee, so its
   price drops by whatever parts the buyer already holds, and those parts are used up (their slots come free). */
const ITEMS = {
  // parts
  edge:        { name: 'Iron Edge',       cat: 'Attack',  cost: 320, ad: 14, part: true, ic: 'dagger', c: '#d9c2a8' },
  greatblade:  { name: 'Steel Greatblade', cat: 'Attack', cost: 680, ad: 30, part: true, ic: 'sword', c: '#d9c2a8' },
  lightdagger: { name: 'Light Dagger',    cat: 'Attack',  cost: 300, as: 12, part: true, ic: 'dagger', c: '#b8f06a' },
  hawkcharm:   { name: 'Hawk Charm',      cat: 'Attack',  cost: 380, crit: 8, part: true, ic: 'target', c: '#ffcf5c' },
  bloodvial:   { name: 'Blood Vial',      cat: 'Attack',  cost: 420, ad: 8, ls: 5, part: true, ic: 'vial', c: '#ff5d7a' },
  barbtip:     { name: 'Barbed Tip',      cat: 'Attack',  cost: 400, ppen: 8, part: true, ic: 'spear', c: '#ffa35c' },
  tome:        { name: 'Apprentice Tome', cat: 'Magic',   cost: 320, ap: 20, part: true, ic: 'book', c: '#9fb8ff' },
  wand:        { name: 'Spark Wand',      cat: 'Magic',   cost: 700, ap: 42, part: true, ic: 'staff', c: '#9fb8ff' },
  manashard:   { name: 'Mana Shard',      cat: 'Magic',   cost: 280, mp: 250, part: true, ic: 'gem', c: '#7aa8ff' },
  hexcharm:    { name: 'Hex Charm',       cat: 'Magic',   cost: 380, mpen: 8, part: true, ic: 'orb', c: '#d07aff' },
  hourglass:   { name: 'Sand Glass',      cat: 'Magic',   cost: 380, cdr: 5, part: true, ic: 'hourglass', c: '#f2c14e' },
  vest:        { name: 'Leather Vest',    cat: 'Defense', cost: 280, armor: 16, part: true, ic: 'armor', c: '#b08a5a' },
  chainmail:   { name: 'Chain Mail',      cat: 'Defense', cost: 600, armor: 32, part: true, ic: 'armor', c: '#c9d0d5' },
  wovencloak:  { name: 'Woven Cloak',     cat: 'Defense', cost: 280, mr: 16, part: true, ic: 'cloak', c: '#8fc8bf' },
  runemantle:  { name: 'Rune Mantle',     cat: 'Defense', cost: 600, mr: 32, part: true, ic: 'cloak', c: '#b9a8ff' },
  vitalstone:  { name: 'Vital Stone',     cat: 'Defense', cost: 320, hp: 230, part: true, ic: 'heart', c: '#ff9a8a' },
  giantbelt:   { name: "Giant's Belt",    cat: 'Defense', cost: 640, hp: 480, part: true, ic: 'heart', c: '#ff6a6a' },
  wornboots:   { name: 'Worn Boots',      cat: 'Boots',   cost: 300, ms: 25, boots: true, part: true, ic: 'boot', c: '#b08a5a' },
  // attack
  warblade:    { name: 'Warblade',        cat: 'Attack',  cost: 1850, ad: 65, cdr: 10, ic: 'sword', c: '#ff8a5c', from: ['greatblade', 'edge', 'hourglass'] },
  reaver:      { name: "Reaver's Edge",   cat: 'Attack',  cost: 2100, ad: 70, crit: 25, ic: 'sword', c: '#ffcf5c', from: ['greatblade', 'hawkcharm', 'hawkcharm'] },
  galebow:     { name: 'Gale Bow',        cat: 'Attack',  cost: 1950, ad: 25, as: 35, crit: 20, ic: 'bow', c: '#8be0c0', from: ['lightdagger', 'lightdagger', 'hawkcharm'] },
  fang:        { name: 'Vampiric Fang',   cat: 'Attack',  cost: 1900, ad: 55, ls: 18, ic: 'fang', c: '#ff5d7a', from: ['greatblade', 'bloodvial', 'edge'] },
  sunder:      { name: 'Sunder Axe',      cat: 'Attack',  cost: 2000, ad: 55, hp: 450, ppen: 25, ic: 'axe', c: '#ffa35c', from: ['greatblade', 'vitalstone', 'barbtip'] },
  giantslayer: { name: 'Giantslayer',     cat: 'Attack',  cost: 2000, ad: 55, ppenP: 35, ic: 'spear', c: '#e8e0c8', from: ['greatblade', 'barbtip', 'edge'] },
  quickblade:  { name: 'Twin Fangs',      cat: 'Attack',  cost: 1850, ad: 30, as: 45, ms: 15, ic: 'dagger', c: '#b8f06a', from: ['greatblade', 'lightdagger', 'lightdagger'] },
  // magic
  scepter:     { name: 'Arcane Scepter',  cat: 'Magic',   cost: 1800, ap: 75, mp: 400, cdr: 10, ic: 'staff', c: '#7aa8ff', from: ['wand', 'manashard', 'hourglass'] },
  stormorb:    { name: 'Stormcaller Orb', cat: 'Magic',   cost: 2150, ap: 100, mpen: 15, ic: 'orb', c: '#b98cff', from: ['wand', 'tome', 'hexcharm'] },
  voidcrystal: { name: 'Void Crystal',    cat: 'Magic',   cost: 2000, ap: 70, mpenP: 35, ic: 'gem', c: '#d07aff', from: ['wand', 'tome', 'hexcharm'] },
  soultome:    { name: 'Soul Tome',       cat: 'Magic',   cost: 1900, ap: 65, sv: 18, hp: 300, ic: 'book', c: '#ff7ab8', from: ['wand', 'tome', 'vitalstone'] },
  frostdiadem: { name: 'Frost Diadem',    cat: 'Magic',   cost: 1950, ap: 65, hp: 500, cdr: 5, ic: 'crown', c: '#8fe6ff', from: ['wand', 'vitalstone', 'hourglass'] },
  zenith:      { name: 'Zenith Staff',    cat: 'Magic',   cost: 2450, ap: 130, ic: 'staff', c: '#ffd76a', from: ['wand', 'wand', 'tome'] },
  // defense
  ironbark:    { name: 'Ironbark Plate',  cat: 'Defense', cost: 1850, armor: 60, hp: 550, ic: 'armor', c: '#c9a26a', from: ['chainmail', 'vest', 'vitalstone'] },
  spellward:   { name: 'Spellward Cloak', cat: 'Defense', cost: 1850, mr: 60, hp: 550, hpRegen: 10, ic: 'cloak', c: '#7ad0c4', from: ['runemantle', 'wovencloak', 'vitalstone'] },
  titan:       { name: "Titan's Heart",   cat: 'Defense', cost: 2000, hp: 1300, hpRegen: 25, ic: 'heart', c: '#ff6a6a', from: ['giantbelt', 'giantbelt', 'vitalstone'] },
  bastion:     { name: 'Bastion Shield',  cat: 'Defense', cost: 2100, armor: 35, mr: 35, hp: 400, cdr: 10, ic: 'shield', c: '#9db8d8', from: ['chainmail', 'runemantle', 'hourglass'] },
  totem:       { name: 'Ironwill Totem',  cat: 'Defense', cost: 2250, ad: 30, hp: 720, ic: 'totem', c: '#c4b5ff', from: ['giantbelt', 'greatblade', 'vitalstone'] },
  // boots (one pair only)
  swift:       { name: 'Swift Boots',     cat: 'Boots',   cost: 700, ms: 60, boots: true, ic: 'boot', c: '#f2c14e', from: ['wornboots'] },
  greaves:     { name: 'Iron Greaves',    cat: 'Boots',   cost: 900, ms: 40, armor: 25, boots: true, ic: 'boot', c: '#c9a26a', from: ['wornboots', 'vest'] },
  treads:      { name: 'Arcane Treads',   cat: 'Boots',   cost: 900, ms: 40, mpen: 15, boots: true, ic: 'boot', c: '#b98cff', from: ['wornboots', 'hexcharm'] },
  wardboots:   { name: 'Warded Boots',    cat: 'Boots',   cost: 900, ms: 40, mr: 25, boots: true, ic: 'boot', c: '#7ad0c4', from: ['wornboots', 'wovencloak'] },
  // added since: each new item goes at the end of this list, whatever its kind, because a recorded match knows the items by their place in it
  victorglass: { name: "Victor's Hourglass", cat: 'Magic', cost: 2050, ap: 65, mp: 300, cdr: 15, ic: 'hourturn', c: '#ffd76a', from: ['wand', 'hourglass', 'hourglass'] },
  squallsong:  { name: 'Squallsong',       cat: 'Attack', cost: 1900, as: 40, ms: 20, crit: 10, ic: 'fan', c: '#8fe6d8', from: ['lightdagger', 'lightdagger', 'hawkcharm'] },
  dawnshard:   { name: 'Dawnshard Blade',  cat: 'Attack', cost: 1950, ad: 40, as: 20, ls: 10, ic: 'comet', c: '#ff9ab0', from: ['greatblade', 'bloodvial', 'lightdagger'] },
  ruinblade:   { name: 'Blade of Ruin',    cat: 'Attack', cost: 2950, ad: 120, ms: 12, ic: 'ruin', c: '#d0425a', from: ['greatblade', 'greatblade', 'edge'] },
  wellspring:  { name: 'Wellspring Charm', cat: 'Magic',  cost: 1850, ap: 50, hp: 250, cdr: 20, ic: 'charm', c: '#7fe0d0', from: ['wand', 'vitalstone', 'hourglass'] },
};
/* The four items of KIT_V 24. Squallsong: between SQUALL_CD0 and SQUALL_CD1 seconds from one squall to the next (STEP sooner for
   each basic attack), what a squall deals, how far from its target it reaches and how many it strikes. Dawnshard Blade (Last Stand):
   left under LAST_AT of his health, a shield, LAST_DEF armour and magic resist and some speed for LAST_T, once every LAST_CD. Blade of
   Ruin: RUIN_K more Attack for RUIN_T after hurting somebody under RUIN_AT of their health. Wellspring Charm: WELL_MP of his mana
   back every WELL_T, and a higher ceiling on cooldown reduction (WELL_CAP against CDR_CAP). */
const SQUALL_CD0 = 5, SQUALL_CD1 = 2, SQUALL_STEP = 0.2, SQUALL_R = 330, SQUALL_N = 3, SQUALL_MS = 1.05;
function squallDmg(h) { return 110 + 14 * h.level; }
const LAST_AT = 0.3, LAST_T = 3, LAST_CD = 60, LAST_DEF = 25, LAST_MS = 1.15;
function lastShield(h) { return 380 + 60 * h.level; }
const RUIN_AT = 0.5, RUIN_K = 0.25, RUIN_T = 2;
const WELL_T = 10, WELL_MP = 0.15, WELL_CAP = 0.45, CDR_CAP = 0.4;
const GLASS_K = 0.3;       // Victor's Hourglass: the share of what is left of the ultimate's cooldown that a kill or an assist takes off
for (const k in ITEMS) { const it = ITEMS[k]; if (it.from) { it.fee = it.cost - it.from.reduce((s, c) => s + ITEMS[c].cost, 0); for (const c of it.from) (ITEMS[c].into || (ITEMS[c].into = [])).includes(k) || ITEMS[c].into.push(k); } }
const ITEM_PASSIVE = {
  reaver: 'Critical hits deal 220% damage instead of 185%.',
  galebow: 'Basic attacks deal 30 (+4 per level) bonus magic damage.',
  giantslayer: 'Deal 10% more damage to enemies with more max HP than you.',
  quickblade: 'Every fourth basic attack strikes twice.',
  scepter: 'Regenerate an extra 1% of your max mana every second.',
  stormorb: 'Skills deal 10% more damage to enemies above 70% HP.',
  frostdiadem: 'Your skills slow enemies by 20% for 1.5s.',
  zenith: 'Increases your total Magic Power by 20%.',
  ironbark: 'Returns 20% of basic attack damage you take to the attacker as magic damage.',
  spellward: 'When an enemy hero hits you with a skill, gain a shield of 250 (+10% max HP) for 3s. 18s cooldown.',
  titan: 'Out of combat for 5s, regenerate 1.5% of max HP every second.',
  bastion: 'Second Wind: lethal damage instead makes you untouchable for 2s, then you return with 18% HP. 150s cooldown.',
  wardboots: 'Stuns, roots and taunts on you end 25% sooner.',
  victorglass: `Turn of the Glass: a kill or an assist takes ${Math.round(GLASS_K * 100)}% off what is left of your ultimate's cooldown.`,
  squallsong: `Squall: every ${SQUALL_CD0}s, and ${SQUALL_STEP}s sooner for each basic attack you make (${SQUALL_CD1}s at the least), your next basic attack lets a squall loose: its target and up to ${SQUALL_N - 1} more enemies near it take 110 (+14 per level) magic damage, which can strike critically. Minions take double. Each squall quickens you by ${Math.round((SQUALL_MS - 1) * 100)}% for 2s.`,
  dawnshard: `Last Stand: when a blow leaves you under ${Math.round(LAST_AT * 100)}% of your health you gain a shield of 380 (+60 per level), ${LAST_DEF} Armor and Magic Resist and ${Math.round((LAST_MS - 1) * 100)}% Move Speed for ${LAST_T}s. ${LAST_CD}s cooldown.`,
  ruinblade: `Ruin: damaging an enemy who is under ${Math.round(RUIN_AT * 100)}% of their health gives you ${Math.round(RUIN_K * 100)}% more Attack for ${RUIN_T}s. A basic attack that sets it off already strikes with it.`,
  wellspring: `Wellspring: every ${WELL_T}s you regain ${Math.round(WELL_MP * 100)}% of your max mana, and your Cooldown Reduction can reach ${Math.round(WELL_CAP * 100)}% instead of ${Math.round(CDR_CAP * 100)}%.`,
};
for (const k in ITEM_PASSIVE) ITEMS[k].p = ITEM_PASSIVE[k];
/* An item with `act` is pressed, not just carried: it gets a button of its own beside the skills, and a cooldown that no stat
   shortens. dur: how long each use lasts, the first, the second, ... (the last entry from then on). */
const ITEM_ACTIVE = {
  totem: { name: 'Unshaken', cd: 90, dur: [6, 5, 4], mres: 0.6, c: '#c4b5ff',
    desc: "Clears every slow, root and mark on you. For 6s nothing can stun, root, slow, pull, taunt or mark you, and magic damage you take is cut by 60%. Two things go through it all the same: the stun of Zephyr's Tempest Beam and the taunt of Hesta's Brazen Call. Each use lasts 1s less than the one before, down to 4s. It cannot be pressed while you are stunned or taunted.",
    fn(h, A, dur) {
      let n = 0; const keep = []; for (const b of h.buffs) { if (b.msMul && b.msMul < 1) n++; else keep.push(b); } h.buffs = keep;
      if (h.rootT > 0) { h.rootT = 0; n++; } if (h.km && h.km.until > G.t) { h.km.until = 0; n++; } if (h.om && h.om.until > G.t) { h.om.until = 0; n++; }
      addBuff(h, { k: 'unshaken', t: dur, dur, immune: true, mres: A.mres, shell: A.c });
      fx('totem', h.x, h.y, { id: h.id, c: A.c, n, dur }); sfx('guard', h.x, h.y); sfx('ult', h.x, h.y);
    } },
};
for (const k in ITEM_ACTIVE) ITEMS[k].act = ITEM_ACTIVE[k];
const STAT_LABEL = {
  ad: ['Attack', ''], ap: ['Magic Power', ''], hp: ['HP', ''], mp: ['Mana', ''], armor: ['Armor', ''], mr: ['Magic Resist', ''],
  as: ['Attack Speed', '%'], crit: ['Crit Chance', '%'], ls: ['Lifesteal', '%'], sv: ['Spell Vamp', '%'], cdr: ['Cooldown Reduction', '%'],
  ms: ['Move Speed', ''], ppen: ['Armor Pen', ''], ppenP: ['Armor Pen', '%'], mpen: ['Magic Pen', ''], mpenP: ['Magic Pen', '%'],
  hpRegen: ['HP Regen', '/s'],
};
function itemStatText(it) {
  const out = [];
  for (const k in STAT_LABEL) if (it[k]) out.push('+' + it[k] + STAT_LABEL[k][1] + ' ' + STAT_LABEL[k][0]);
  return out;
}
const BUILDS = {
  Tank:     ['greaves', 'ironbark', 'spellward', 'titan', 'bastion', 'sunder'],
  Fighter:  ['greaves', 'warblade', 'totem', 'sunder', 'ironbark', 'fang'],
  Assassin: ['swift', 'warblade', 'totem', 'giantslayer', 'reaver', 'fang'],
  Mage:     ['treads', 'scepter', 'stormorb', 'voidcrystal', 'zenith', 'frostdiadem'],
  Marksman: ['swift', 'galebow', 'reaver', 'totem', 'fang', 'giantslayer'],
  Support:  ['wardboots', 'scepter', 'frostdiadem', 'soultome', 'bastion', 'titan'],
};

/* ---------------- class base stats ---------------- */
const CLASS_BASE = {
  Tank:     { hp: 2900, hpG: 235, mp: 430, mpG: 36, ad: 112, adG: 7.0,  armor: 28, armorG: 4.2, mr: 16, mrG: 2.2, as: 0.82, asG: 1.2, range: 150, ms: 255, hpRegen: 10, mpRegen: 3.2 },
  Fighter:  { hp: 2650, hpG: 205, mp: 400, mpG: 32, ad: 122, adG: 9.5,  armor: 23, armorG: 3.6, mr: 12, mrG: 1.8, as: 0.90, asG: 1.6, range: 150, ms: 260, hpRegen: 9,  mpRegen: 3.0 },
  Assassin: { hp: 2450, hpG: 170, mp: 400, mpG: 32, ad: 128, adG: 11,   armor: 19, armorG: 3.0, mr: 10, mrG: 1.5, as: 0.95, asG: 1.8, range: 150, ms: 268, hpRegen: 8,  mpRegen: 3.0 },
  Mage:     { hp: 2350, hpG: 150, mp: 520, mpG: 46, ad: 104, adG: 5.0,  armor: 16, armorG: 2.6, mr: 10, mrG: 1.5, as: 0.80, asG: 1.0, range: 540, ms: 248, hpRegen: 6,  mpRegen: 4.2 },
  Marksman: { hp: 2300, hpG: 150, mp: 400, mpG: 30, ad: 116, adG: 10,   armor: 16, armorG: 2.6, mr: 10, mrG: 1.5, as: 0.95, asG: 2.4, range: 590, ms: 245, hpRegen: 6,  mpRegen: 2.8 },
  Support:  { hp: 2570, hpG: 172, mp: 520, mpG: 44, ad: 104, adG: 5.0,  armor: 18, armorG: 2.8, mr: 12, mrG: 1.8, as: 0.80, asG: 1.0, range: 520, ms: 252, hpRegen: 7,  mpRegen: 4.4 },
};
/* structures: a turret reaches just past a marksman's range (590 + the turret's own radius), no further */
const TURRET_RANGE = 540, CRYSTAL_RANGE = 620;
/* what a turret is made of: health and the weight of its shot, by tier (1 the outer turret, 3 the one at the base), and the crystal's own */
const TURRET_HP = [0, 6900, 8000, 9100], TURRET_AD = [0, 430, 460, 490], CRYSTAL_HP = 12500, CRYSTAL_AD = 520;
/* Vex's Death Mark: the marked hero is his for FLURRY_N basic attacks, each FLURRY_WIND in the swing and FLURRY_GAP apart, within FLURRY_T seconds */
const FLURRY_N = 3, FLURRY_T = 4, FLURRY_WIND = 0.09, FLURRY_GAP = 0.13;
/* Kaela's Triple Cadence: each cut steps up to CAD_STEP forward (no further than the first enemy in the way) and sweeps CAD_REACH around
   her, CAD_ARC to either side of where she faces.
   The next cut must follow within CAD_WIN seconds and no sooner than CAD_GAP. The third is a leap instead of a step: CAD_JUMP seconds
   in the air, CAD_HOP high, and what the blow hits when she comes down on the ground is thrown CAD_LIFT high for CAD_AIR seconds. */
const CAD_STEP = 150, CAD_REACH = 215, CAD_ARC = 1.05, CAD_WIN = 3, CAD_GAP = 0.3, CAD_AIR = 0.8, CAD_LIFT = 150, CAD_JUMP = 0.34, CAD_HOP = 150;
function cadDmg(h, lv, n) { return n >= 3 ? L(lv, 135, 30) + 0.6 * h.ad : L(lv, 95, 22) + 0.45 * h.ad; }
function cadence(h, lv, ang, n) {       // cut n of three
  const last = n >= 3, amt = cadDmg(h, lv, n), seen = {};
  const cut = e => { if (seen[e.id]) return; seen[e.id] = 1; dmg(h, e, amt, 'phys', { skill: true }); const up = last && !e.dead && knockUp(e, CAD_AIR, CAD_LIFT); skfx(h, 'kaela0h', e.x, e.y, { ang, st: n, up: up ? 1 : 0 }); };
  const sweep = () => { skfx(h, 'kaela0c', h.x, h.y, { ang, st: n, r: CAD_REACH, a: CAD_ARC }); for (const e of enemiesInCone(h.team, h.x, h.y, CAD_REACH, ang, CAD_ARC)) cut(e); };
  const ca = fcos(ang), sa = fsin(ang), ahead = e => { const dx = e.x - h.x, dy = e.y - h.y; return dx * ca + dy * sa > 0.5 * hyp(dx, dy); };       // in her way: within 60 degrees of where she is going
  const touch = h.rootT > 0 ? [] : enemiesIn(h.team, h.x, h.y, 70), stay = h.rootT > 0 || touch.some(ahead);
  if (last) {       // the leap: up, and down on the ground in front of the first enemy in her way (or straight down, held fast or already up against one)
    let d = stay ? 0 : CAD_STEP;
    if (!stay) for (const e of enemiesIn(h.team, h.x + ca * CAD_STEP * 0.5, h.y + sa * CAD_STEP * 0.5, CAD_STEP * 0.5 + 75)) if (ahead(e)) d = Math.min(d, Math.max(0, (e.x - h.x) * ca + (e.y - h.y) * sa - (72 + e.r * 0.6)));
    const x0 = h.x, y0 = h.y; leapTo(h, h.x + ca * d, h.y + sa * d, CAD_JUMP, () => { for (const e of enemiesIn(h.team, h.x, h.y, 70)) cut(e); sweep(); }); h.leap.h = CAD_HOP;
    skfx(h, 'kaela0', x0, y0, { ang, st: n, d: hyp(h.leap.x1 - x0, h.leap.y1 - y0), t: CAD_JUMP }); return;
  }
  skfx(h, 'kaela0', h.x, h.y, { ang, st: n, d: stay ? 0 : CAD_STEP });
  if (h.rootT > 0) sweep();       // held fast, she cuts where she stands
  else if (stay) { for (const e of touch) cut(e); sweep(); }       // already up against someone: no step
  else startDash(h, ang, CAD_STEP, 1500, { w: 70, hit: cut, stopOn: ahead, end: sweep });       // the step stops at the first enemy in her way, so she cuts from in front of him
  if (!last) h.re[0] = { until: G.t + CAD_WIN, ready: G.t + CAD_GAP, n: n + 1, of: 3, hold: true };
}
/* gold plating: the outer turret of every lane wears PLATES plates of PLATE_HP until PLATE_TIME. The plating takes every blow first, and a hero
   is paid PLATE_GOLD for each plate's worth of it that he knocks off himself; whatever is still on at PLATE_TIME crumbles, unpaid */
const PLATES = 4, PLATE_HP = 500, PLATE_GOLD = 100, PLATE_TIME = 300;
const POS_OF = { Tank: 'roam', Fighter: 'top', Assassin: 'jungle', Mage: 'mid', Marksman: 'carry', Support: 'roam' };
/* The five places of a side. top: the EXP lane, alone; jungle: the camps; mid: the middle lane; carry: the Gold lane; roam: with the
   carry at first, then wherever the fight is. POS_SPARE: the order a side goes without them when it has fewer bots than open places. */
const POS_KEYS = ['top', 'jungle', 'mid', 'carry', 'roam'], POS_SPARE = ['roam', 'jungle', 'carry', 'top', 'mid'];
/* Miel's two tempers. With an allied hero within TEND_R of her she tends: what she heals and shields is TEND_K times stronger. With
   none she stings: her skills hit STING_K times harder. Her comb stands COMB_T seconds and is COMB_R across; the hive flies HIVE_T
   seconds, HIVE_R around her. */
const TEND_R = 600, TEND_K = 1.2, STING_K = 1.2, COMB_R = 250, COMB_T = 4, HIVE_R = 430, HIVE_T = 5;
/* As of KIT_V 22 the temper is the player's to choose (h.sting, changed with toggleMood: a press of its own, A_MOOD); a bot still
   goes by the company it is in, as everyone did before. HIVE_T2: how long the Queen's Flight lasts as of the same kit. */
const HIVE_T2 = 6;
function tendNear(h) { for (const a of G.heroes) if (a !== h && a.team === h.team && !a.dead && hyp(a.x - h.x, a.y - h.y) <= TEND_R) return true; return false; }
function tending(h) { return G.kit >= 22 && h.isPlayer ? !h.sting : tendNear(h); }
/* Her stings. Every enemy that Stinger Flight goes through keeps a sting for STING_T seconds: each second it takes stingDmg and it is
   STING_SLOW slower. A flight that hits a stung enemy adds another sting (STING_MAX at most) and starts the time of all of them
   again; the hurt and the slow are both as many times over as there are stings. (u.sg, on the stung: n stings until `until`, the
   next hurt at `next`, by whom, at what level of the skill, and cx, the skill to put it down to in a recap.)
   The hurt is of the lingering kind (dmg's f.dot): it is no blow, so it holds up no recall, gives her away to nobody, draws no
   turret on her, and whoever else finishes a stung enemy off has not done it for her.
   This came with KIT_V 20: a match recorded before it is played again without (G.kit). */
const STING_T = 8, STING_MAX = 3, STING_SLOW = 0.06;
/* Lyra's Starfall, as of KIT_V 21: the stars fall for STARFALL_T seconds, and an enemy that has been under them for STARFALL_STAY
   seconds without a break is rooted for STARFALL_ROOT, once for each Starfall (see zone's hold). */
const STARFALL_T = 5, STARFALL_STAY = 1.5, STARFALL_ROOT = 2;
function stingDmg(h, lv) { return L(lv, 5, 1.8) + 0.025 * h.ap; }
function sting(h, e, lv) {
  if (e.dead || e.kind === 'turret' || e.kind === 'crystal' || immuneOf(e)) return;
  const s = e.sg && e.sg.until > G.t && e.sg.by === h.id ? e.sg : null, n = Math.min(STING_MAX, (s ? s.n : 0) + 1);
  e.sg = { n, until: G.t + STING_T, next: s ? s.next : G.t + 1, by: h.id, lv, cx: G.cx };
  slow(e, STING_SLOW * n, 1.2);
}
function stingTick(u) {       // (called for every stung unit, every step)
  const s = u.sg; if (u.dead) { u.sg = null; return; }
  if (G.t >= s.next) {
    s.next += 1; const h = unitById(s.by);
    if (h) { const pc = G.cx; G.cx = s.cx || null; dmg(h, u, s.n * stingDmg(h, s.lv), 'magic', { skill: true, dot: true }); if (!u.dead) slow(u, STING_SLOW * s.n, 1.2); G.cx = pc; }
  }
  if (u.sg === s && (u.dead || G.t >= s.until)) u.sg = null;
}

/* ---------------- battle spells ---------------- */
/* Bram's Shield Rush as of KIT_V 22. RUSH_AGAIN: how long after the charge its second cast, Heave, can be made; HEAVE_R, HEAVE_A: how
   far in front of him Heave reaches and how wide to either side (radians); HEAVE_T: how long it keeps them in the air. */
const RUSH_AGAIN = 4, HEAVE_R = 270, HEAVE_A = 1.15, HEAVE_T = 1;
/* Inspire: for INSPIRE_T seconds the next INSPIRE_N basic attacks are quicker (INSPIRE_AS times, and up to INSPIRE_CAP a second, past
   the usual limit of 2.5), go through some armour and give back some health. */
const INSPIRE_T = 5, INSPIRE_N = 8, INSPIRE_AS = 1.55, INSPIRE_CAP = 4.2;
function inspirePen(h) { return 8 + h.level; }
function inspireHeal(h) { return 60 + 0.15 * h.ad + 0.15 * h.ap; }
/* Hesta's gong. CALL_R: how far Brazen Call reaches; POOL_R, POOL_T: the reach and the life of the shield her side shares; RING_MAX:
   how many Rings the gong holds before her next basic attack lets them out; PEAL_R: how far that peal carries. */
const CALL_R = 300, POOL_R = 480, POOL_T = 5, RING_MAX = 4, PEAL_R = 300;
function callT(lv, kit) { return kit < 22 ? L(lv, 0.9, 0.1) : L(lv, 1.5, 0.4); }       // how long Brazen Call holds a hero: 1.5 to 3.5s as of KIT_V 22 (0.9 to 1.4 before; a description gives no kit and says today's)
function ringAdd(h) { if (h.dead) return; const n = h.pv.n || 0; if (n >= RING_MAX) return; h.pv.n = n + 1; if (n + 1 === RING_MAX) skfx(h, 'hestaR', h.x, h.y, {}); }
function pealAmt(h) { return 40 + 0.05 * h.maxHp; }
function peal(h) {       // the gong let out: a blow to everyone near her, and a shield for her of as much
  const amt = pealAmt(h); skfx(h, 'hestaP', h.x, h.y, { r: PEAL_R }); sfx('gong', h.x, h.y);
  for (const e of enemiesIn(h.team, h.x, h.y, PEAL_R)) { dmg(h, e, amt, 'magic', { n: 'Resound', ic: 'gong' }); slow(e, 0.3, 1); }
  shield(h, amt, 3);
}
/* KIT_V 23. Tempest Beam's stun, by the level of the skill: 1 to 1.4s (half a second before; a description gives no kit and says today's). */
function beamStun(lv, kit) { return kit < 23 ? 0.5 : L(lv, 1.0, 0.2); }
/* Sorrel. ENERGY_*: her Focus, the bar others fill with mana: its size, what comes back each second by itself and what a basic attack
   that hits returns. LETHAL_*: the Long Shot: how long unhurt before one is ready, how much further it reaches, how much likelier it
   is to strike critically, what it deals of an attack's damage and what more it does to minions and creeps. CAMO_*: Fade Out: how long, and from how near she is seen
   all the same. NADE_*: Blast Charge: reach, half its angle, how far it throws and how far she springs back. SNIPE_*: Four Rounds:
   how many, the wait before the first and between them, how far, what each unfired one takes off the cooldown, the Focus one gives
   back, how wide a round is, how fast, and the crit chance each level of the skill gives all her attacks. */
const ENERGY_MAX = 100, ENERGY_REGEN = 2, ENERGY_HIT = 5;
const LETHAL_T = 5, LETHAL_RANGE = 150, LETHAL_CRIT = 0.3, LETHAL_K = 1.15, LETHAL_PVE = 1.4;
const CAMO_T = 3, CAMO_SEE = 190;
const NADE_R = 420, NADE_A = 0.6, NADE_PUSH = 230, NADE_HOP = 250;
const SNIPE_N = 4, SNIPE_GAP = 0.5, SNIPE_AIM = 0.5, SNIPE_R = 1500, SNIPE_REFUND = 0.1, SNIPE_FOCUS = 10, SNIPE_W = 64, SNIPE_SPEED = 3200, SNIPE_CRIT = 0.05;
function snipeDmg(h, lv, e) { return L(lv, 150, 60) + 0.45 * h.ad + 0.05 * (e.maxHp - e.hp); }
/* a Long Shot is ready: a skill has just been cast, or she has gone LETHAL_T seconds without a blow landing on her or firing one */
function lethalReady(h) { return !!h.pv.arm || G.t - Math.max(h.lastDmgT, h.pv.shot == null ? -99 : h.pv.shot) >= LETHAL_T; }
/* Fade Out. h.camo: she is under the cloak. Their side sees her only from CAMO_SEE or while something shows her (tickVision), so
   nothing can single her out; what covers ground still catches her. It ends with its time, with her own shot or cast, or with
   any blow that lands on her; her skill's cooldown only runs once it has ended (tickHero). */
function camoOn(h, lv) { addBuff(h, { k: 'camo', t: CAMO_T, msMul: 1.3, ad: L(lv, 30, 12) }); h.camo = true; h.revealT = 0; h.vis[1 - h.team] = false; fx('camo', h.x, h.y, { id: h.id, on: 1 }); }
function camoOff(h) { if (!h.camo) return; h.camo = false; h.buffs = h.buffs.filter(b => b.k !== 'camo'); fx('camo', h.x, h.y, { id: h.id, on: 0 }); }
/* Teleport (KIT_V 24): TP_T standing still, then he is beside the turret, crystal or minion of his own side that he chose (the one
   nearest the spot he pointed at, within TP_PICK of it). Until he arrives what he is coming to cannot be hurt (tpG). Broken off (by
   his own feet, or by a stun, a taunt or a throw) it gives TP_BACK of its cooldown back. */
const TP_T = 3, TP_CD = 75, TP_BACK = 30, TP_PICK = 520;
function tpAnchor(h, tx, ty) {
  let best = null, bd = TP_PICK;
  const see = u => { if (u.dead || u.team !== h.team) return; const d = hyp(u.x - tx, u.y - ty); if (d < bd) { bd = d; best = u; } };
  for (const u of G.turrets) see(u); for (const u of G.crystals) see(u); for (const u of G.units) if (u.kind === 'minion') see(u);
  return best;
}
function tpStart(h, a) { h.tp = { t: TP_T, a }; a.tpG = G.t + TP_T + 0.1; h.atkTarget = null; h.chase = false; h.windT = 0; h.recallT = 0; h.mvx = h.mvy = 0; fx('tp', h.x, h.y, { id: h.id, aid: a.id, x1: a.x, y1: a.y, dur: TP_T }); fx('tpAt', a.x, a.y, { id: h.id, aid: a.id, dur: TP_T }); sfx('holy', h.x, h.y); sfx('holy', a.x, a.y); }
function tpStop(h, back) { const T = h.tp; if (!T) return; h.tp = null; if (T.a.tpG) T.a.tpG = 0; if (back) { h.spellCd = Math.max(0, h.spellCd - TP_BACK); fx('tpx', h.x, h.y, { id: h.id }); } }
function tpTick(h, dt) {       // true while he stands there on his way
  const T = h.tp, a = T.a;
  if (a.dead || h.mvx || h.mvy || (h.atkTarget && h.chase)) { tpStop(h, true); return false; }
  T.t -= dt; if (T.t > 0) return true;
  const sp = MAP.spawn[h.team], d = hyp(sp.x - a.x, sp.y - a.y) || 1, off = a.r + h.r + 30, p = nearestWalkable(a.x + (sp.x - a.x) / d * off, a.y + (sp.y - a.y) / d * off), x0 = h.x, y0 = h.y;
  tpStop(h, false); h.x = p.x; h.y = p.y; h.face = fatan2(a.y - sp.y, a.x - sp.x); if (h.ai) h.ai.path = null;
  for (let i = 1; i <= 3; i++) addBuff(h, { k: 'tp' + i, t: i, msMul: 1.2 });       // (three that end one after another: 60% more speed, fading over three seconds)
  fx('tpin', h.x, h.y, { id: h.id, x0, y0 }); sfx('skill', h.x, h.y); return false;
}
/* Halvar (KIT_V 24). ECHO_*: his echoes: how many, how long, how far to either side of him they appear, how far from him they may
   go and how far they look for somebody to hit, what they have of his health, how near one must be to follow his Stormknuckle;
   echoAd: what a blow of theirs is of his Attack. FIST_*: Stormknuckle's run, its reach to either side, how far it throws, and
   what an echo's following blow is of his own. BEAST_*: the Stormhorn: how long, how big, how far its blows reach, the armour and
   magic resist and the speed it adds, the share of a blow that reaches the others in front of him and how wide "in front" is;
   beastHp: the health it adds. Then the ram's three skills, and what his blood mends of the health he is missing every second. */
const ECHO_N = 2, ECHO_T = 8, ECHO_GAP = 95, ECHO_LEASH = 760, ECHO_SEEK = 560, ECHO_HP = 0.35, ECHO_FIST_R = 640;
function echoAd(lv) { return L(lv, 0.3, 0.04); }
const FIST_D = 330, FIST_W = 75, FIST_PUSH = 210, FIST_ECHO = 0.4;
const BEAST_T = 12, BEAST_R = 52, BEAST_RANGE = 190, BEAST_TOUGH = 18, BEAST_MS = 1.12, BEAST_CLEAVE = 0.6, BEAST_ARC = 1.0;
function beastHp(lv) { return L(lv, 500, 350); }
const CHARGE_D = 540, CHARGE_W = 95, CHARGE_UP = 0.7, BELLOW_R = 430, BELLOW_A = 0.62, SKY_R = 620, SKY_AOE = 270, SKY_STUN = 1, RAM_REGEN = 0.016;
const SPELLS = {
  flicker: {
    name: 'Flicker', ic: 'blink', c: '#ffd76a', cd: 90, range: 420, cast: 'point', ind: { t: 'circle', r: 60 }, noRoot: true,
    desc: 'Teleport a short distance toward your aim.',
    fn(h, lv, tx, ty) { const x0 = h.x, y0 = h.y; blink(h, tx, ty); skfx(h, 'spF', h.x, h.y, { x0, y0, c: '#ffd76a' }); },
  },
  sprint: {
    name: 'Sprint', ic: 'boot', c: '#8be0c0', cd: 75, cast: 'self', ind: { t: 'self', r: 0 },
    desc: 'Gain 45% movement speed for 6 seconds and shrug off slows.',
    fn(h) { addBuff(h, { k: 'sprint', t: 6, msMul: 1.45, noSlow: true }); skfx(h, 'spS', h.x, h.y, { c: '#8be0c0' }); },
  },
  aegis: {
    name: 'Aegis', ic: 'shield', c: '#9db8d8', cd: 80, cast: 'self', ind: { t: 'self', r: 0 },
    desc: 'Gain a shield of 700 (+60 per level) for 4 seconds.',
    fn(h) { shield(h, 700 + 60 * h.level, 4); skfx(h, 'spA', h.x, h.y, { c: '#cfe4ff' }); },
  },
  execute: {
    name: 'Execute', ic: 'skull', c: '#ff5d5d', cd: 80, range: 520, cast: 'point', ind: { t: 'circle', r: 150 }, heroTarget: true,
    desc: 'Deal 350 (+45 per level) true damage plus 12% of missing HP to a nearby enemy hero.',
    fn(h, lv, tx, ty) {
      const t = nearestEnemyHero(h, tx, ty, 260, 620); if (!t) return false;
      skfx(h, 'spE', t.x, t.y, { c: '#ff5d5d' });
      dmg(h, t, executeDmg(h, t), 'true', { skill: true, noVamp: true });
    },
  },
  inspire: {
    name: 'Inspire', ic: 'inspire', c: '#ff8a4a', cd: 75, cast: 'self', ind: { t: 'self', r: 0 },
    desc: `For ${INSPIRE_T} seconds your next ${INSPIRE_N} basic attacks come 55% faster, past the usual limit on attack speed. Each one ignores 8 (+1 per level) of the target's Armor and restores 60 (+15% Attack, +15% Magic) health.`,
    fn(h) { addBuff(h, { k: 'inspire', t: INSPIRE_T, n: INSPIRE_N, asMul: INSPIRE_AS, asCap: INSPIRE_CAP, aura: '#ff8a4a' }); skfx(h, 'spI', h.x, h.y, { c: '#ff8a4a' }); },
  },
  retribution: {
    name: 'Retribution', ic: 'smite', c: '#f2c14e', cd: 35, range: 480, cast: 'point', ind: { t: 'circle', r: 120 },
    desc: 'Deal 600 (+70 per level) true damage to a creep or minion. You deal 25% more damage to creeps and take 25% less from them.',
    fn(h, lv, tx, ty) {
      let best = null, bd = 1e9;
      for (const u of G.units) {
        if (u.dead || (u.kind !== 'monster' && u.kind !== 'minion') || u.team === h.team) continue;
        if (hyp(u.x - h.x, u.y - h.y) > 560 + u.r) continue;
        const d = hyp(u.x - tx, u.y - ty) - (u.kind === 'monster' ? 150 + u.r : 0);
        if (d < bd) { bd = d; best = u; }
      }
      if (!best) return false;
      skfx(h, 'spR', best.x, best.y, { c: '#f2c14e' });
      dmg(h, best, retriDmg(h), 'true', { skill: true, noVamp: true });
    },
  },
  teleport: {
    name: 'Teleport', ic: 'gate', c: '#b9a8ff', cd: TP_CD, cast: 'map', ind: { t: 'self', r: 0 },
    desc: `Choose one of your side's turrets, your crystal or one of your minions on the map. Stand still for ${TP_T}s and you arrive beside it, running 60% faster for a moment (it fades over 3s). What you are coming to cannot be hurt until you are there. Moving, or being stunned, taunted or thrown, breaks it off and gives back ${TP_BACK}s of the cooldown.`,
    fn(h, lv, tx, ty) { const a = tpAnchor(h, tx, ty); if (!a) return false; tpStart(h, a); },
  },
};
/* the heal every hero carries beside Recall, whatever battle spell was picked */
const MEND = { name: 'Heal', ic: 'heal', c: '#7dff9a', c2: '#6fb7ff', cd: 60, dur: 3, pct: 0.18, mp: 0.18, n: 6, desc: 'Restore 18% of your max HP and 18% of your max mana over 3 seconds. Every hero has it.' };
function executeDmg(h, t) { return 350 + 45 * h.level + 0.12 * (t.maxHp - t.hp); }
function retriDmg(h) { return 600 + 70 * h.level; }

/* ---------------- heroes ----------------
   skill: { name, ic, c, max, cd:[first,last], cost:[first,last], range, cast:'dir'|'point'|'self',
            ind:{t:'line',w}|{t:'circle',r}|{t:'cone',a}|{t:'self',r}, ai:{...}, desc(lv), fn(h,lv,tx,ty,ang) }
   two: what the same button does on its second cast, while the first one left something to follow up (h.re[i]): free, no cooldown of
        its own; anything it does not name is taken from the skill itself.
   three: the same for a third cast (h.re[i].n === 3). A follow-up marked hold keeps the skill's cooldown from running until the
        chain is over: finished, or left to lapse. */
/* ---- Odile (KIT_V 25) ----
   GW: Glasswalk. She is out of the world (locked: nothing touches her; away: nor is she seen) from the cast until she steps out:
   GW_FIRST to the first cut, GW_GAP between cuts, GW_OUT after the last. A cut finds somebody not cut yet within GW_HOP of the last
   one cut; with nobody new in reach, the first of them again (or whoever of those cut is nearest, if the first is gone), for GW_SAME of it. Minions and monsters take GW_PVE times as much.
   AN: Anneal, the kneel. KEEN: the edge it leaves. QS: Quicksilver. TWIN: Second Image, the passive. */
const GW_RANGE = 560, GW_PICK = 300, GW_HOP = 470, GW_N = 4, GW_FIRST = 0.14, GW_GAP = 0.19, GW_OUT = 0.14, GW_SAME = 0.25, GW_PVE = 1.5, GW_ARM = 0.12,
  AN_T = 4, AN_TICK = 0.5, AN_DR = 0.55, AN_DR_T = 0.28, AN_READY = 0.35, KEEN_T = 5,
  QS_T = 7, QS_MORE = 7, QS_CUT = 0.7, TWIN_N = 4, TWIN_K = 0.5, TWIN_GAP = 0.13, TWIN_HOLD = 4;
const gwBase = lv => L(lv, 150, 34), GW_AD = 0.85;
const gwDmg = (h, lv) => gwBase(lv) + GW_AD * h.ad;
const anHeal = lv => L(lv, 62, 24);       // a second, before what her wounds add (as much again at death's door)
const KEEN_AD = 0.22, keenBase = lv => L(lv, 22, 9);
const keenDmg = (h, lv) => keenBase(lv) + KEEN_AD * Math.max(0, h.ad - (h.def.base.ad + h.def.base.adG * (h.level - 1)));       // (+22% of the Attack she has beyond her own)
const qsMs = lv => L(lv, 0.3, 0.08), qsAs = lv => L(lv, 35, 20);
const HEROES = {
  bram: {
    name: 'Bram', title: 'Oathbound Warden', cls: 'Tank', spell: 'aegis', melee: true, rate: [9, 4, 7, 5],
    look: { body: '#5f7387', trim: '#e0b04a', skin: '#e2b792', hair: '#4a3323', hat: 'helm', weapon: 'shield', cape: '#31506e' },
    skills: [
      /* As of KIT_V 22 the charge no longer stops at the first hero: it sweeps everything in its way along to where it ends (each one
         is carried the rest of the way from where it was met, at the pace of the charge), and for RUSH_AGAIN seconds the skill has a
         second cast, Heave, that throws whatever is in front of him into the air. Before, it stunned the first hero it struck. */
      { name: 'Shield Rush', ic: 'dash', c: '#e0b04a', max: 6, cd: [9, 7], cost: [60, 85], range: 440, cast: 'dir', noRoot: true,
        ind: { t: 'line', w: 120 }, ai: { t: 'gap', esc: true, thru22: true },
        desc: lv => `Charge forward behind the shield. Every enemy in the way takes ${L(lv, 130, 30)} (+40% Attack) damage and is pushed along to the end of the charge. Within ${RUSH_AGAIN}s cast again to heave the shield up: enemies in front of you take ${L(lv, 140, 30)} (+40% Attack) damage and are thrown into the air for ${HEAVE_T}s.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'bram0', h.x, h.y, { ang });
          if (G.kit < 22) {
            startDash(h, ang, 440, 1150, { w: 70, stopOnHero: true, hit(e) {
              dmg(h, e, L(lv, 220, 50) + 0.6 * h.ad, 'phys', { skill: true });
              if (e.kind === 'hero') stun(e, 0.8); else slow(e, 0.4, 1);
              skfx(h, 'bram0h', e.x, e.y, { ang });
            } });
            return;
          }
          const c = fcos(ang), s = fsin(ang);
          startDash(h, ang, 440, 1150, { w: 80, hit(e) {
            dmg(h, e, L(lv, 130, 30) + 0.4 * h.ad, 'phys', { skill: true });
            const left = h.dash ? h.dash.left : 0; if (!e.dead && !e.epic && left > 8) pullTo(e, e.x + c * left, e.y + s * left, left / 1150);       // swept along: the rest of the way, at his pace
            skfx(h, 'bram0h', e.x, e.y, { ang, push: 1 });
          } });
          h.re[0] = { until: G.t + RUSH_AGAIN + 0.4 };       // (the charge itself takes 0.4s of it)
        },
        two: { name: 'Heave', ic: 'heave', cast: 'dir', range: HEAVE_R, noRoot: false, ind: { t: 'cone', a: HEAVE_A }, ai: { t: 'heave', r: HEAVE_R },
          desc: lv => `Heave the shield up: enemies in front of you take ${L(lv, 140, 30)} (+40% Attack) damage and are thrown into the air for ${HEAVE_T}s.`,
          fn(h, lv, tx, ty, ang) {
            skfx(h, 'bram0u', h.x, h.y, { ang, r: HEAVE_R });
            for (const e of enemiesInCone(h.team, h.x, h.y, HEAVE_R, ang, HEAVE_A)) { dmg(h, e, L(lv, 140, 30) + 0.4 * h.ad, 'phys', { skill: true }); if (!e.dead) knockUp(e, HEAVE_T, 170); }
          } } },
      { name: 'Bulwark', ic: 'shield', c: '#9db8d8', max: 6, cd: [11, 8.5], cost: [70, 95], cast: 'self',
        ind: { t: 'self', r: 320 }, ai: { t: 'shield', r: 320 },
        desc: lv => `Gain a shield of ${L(lv, 300, 70)} (+8% max HP) for 3.5s. Nearby enemies take ${L(lv, 120, 35)} (+40% Attack) magic damage and are slowed 35% for 2s.`,
        fn(h, lv) {
          shield(h, L(lv, 300, 70) + 0.08 * h.maxHp, 3.5);
          skfx(h, 'bram1', h.x, h.y, { r: 320 });
          for (const e of enemiesIn(h.team, h.x, h.y, 320)) { dmg(h, e, L(lv, 120, 35) + 0.4 * h.ad, 'magic', { skill: true }); slow(e, 0.35, 2); }
        } },
      { name: 'Earthsplitter', ic: 'quake', c: '#ffb35c', max: 3, cd: [45, 35], cost: [120, 160], range: 650, cast: 'point', noRoot: true, ult: true,
        ind: { t: 'circle', r: 340 }, ai: { t: 'point', r: 340, delay: 0.45, ult: true },
        desc: lv => `Leap to the target area. On landing deal ${L(lv, 380, 180)} (+90% Attack, +6% max HP) damage and stun enemies for 1.2s.`,
        fn(h, lv, tx, ty) {
          leapTo(h, tx, ty, 0.45, () => {
            skfx(h, 'bram2', h.x, h.y, { r: 340 }); sfx('boom', h.x, h.y);
            for (const e of enemiesIn(h.team, h.x, h.y, 340)) { dmg(h, e, L(lv, 380, 180) + 0.9 * h.ad + 0.06 * h.maxHp, 'phys', { skill: true }); stun(e, 1.2); }
          });
          skfx(h, 'bram2a', h.leap.x1, h.leap.y1, { r: 340, x0: h.x, y0: h.y });
        } },
    ],
  },
  thorn: {
    name: 'Thorn', title: 'Chainbreaker', cls: 'Tank', spell: 'flicker', melee: true, rate: [9, 5, 9, 3],
    look: { body: '#4c6b52', trim: '#b9c2c8', skin: '#c99a78', hair: '#2b2b2b', hat: 'horn', weapon: 'chain', cape: '#2d4034' },
    skills: [
      { name: 'Grapple', ic: 'hook', c: '#b9c2c8', max: 6, cd: [14, 11.5], cost: [70, 95], range: 850, cast: 'dir',
        ind: { t: 'line', w: 90 }, ai: { t: 'line', speed: 1500 },
        desc: lv => `Hurl a chain. The first enemy hit takes ${L(lv, 200, 50)} (+50% Attack) magic damage, is dragged to you and stunned briefly.`,
        fn(h, lv, tx, ty, ang) {
          lineProj(h, ang, { speed: 1500, range: 850, w: 90, look: 'hook', c: '#b9c2c8', ci: 0, hit(e) {
            dmg(h, e, L(lv, 200, 50) + 0.5 * h.ad, 'magic', { skill: true }); skfx(h, 'thorn0h', e.x, e.y, { x2: h.x, y2: h.y });
            if (!e.dead && !e.epic) { const a = fatan2(e.y - h.y, e.x - h.x); pullTo(e, h.x + fcos(a) * 110, h.y + fsin(a) * 110, 0.28); stun(e, 0.6); }
          } });
        } },
      { name: 'Tremor', ic: 'quake', c: '#8fd17a', max: 6, cd: [9, 7], cost: [60, 85], cast: 'self',
        ind: { t: 'self', r: 320 }, ai: { t: 'self', r: 320, wave: true },
        desc: lv => `Slam the ground: nearby enemies take ${L(lv, 170, 40)} (+50% Attack) magic damage and are slowed 45% for 2s. Gain ${L(lv, 20, 5)} Armor and Magic Resist for 4s.`,
        fn(h, lv) {
          skfx(h, 'thorn1', h.x, h.y, { r: 320 });
          addBuff(h, { k: 'tremor', t: 4, armor: L(lv, 20, 5), mr: L(lv, 20, 5) });
          for (const e of enemiesIn(h.team, h.x, h.y, 320)) { dmg(h, e, L(lv, 170, 40) + 0.5 * h.ad, 'magic', { skill: true }); slow(e, 0.45, 2); }
        } },
      { name: 'Maelstrom', ic: 'vortex', c: '#6fe0b0', max: 3, cd: [50, 40], cost: [120, 160], cast: 'self', ult: true,
        ind: { t: 'self', r: 420 }, ai: { t: 'self', r: 400, ult: true },
        desc: lv => `Drag every enemy within reach to your side, dealing ${L(lv, 300, 150)} (+80% Attack) magic damage and stunning for ${L(lv, 1.0, 0.2).toFixed(1)}s.`,
        fn(h, lv) {
          const pts = []; sfx('boom', h.x, h.y);
          for (const e of enemiesIn(h.team, h.x, h.y, 420)) {
            if (pts.length < 16) pts.push(e.x, e.y);
            dmg(h, e, L(lv, 300, 150) + 0.8 * h.ad, 'magic', { skill: true });
            if (!e.dead && !e.epic) { const a = fatan2(e.y - h.y, e.x - h.x); pullTo(e, h.x + fcos(a) * 130, h.y + fsin(a) * 130, 0.3); }
            stun(e, L(lv, 1.0, 0.2));
          }
          skfx(h, 'thorn2', h.x, h.y, { r: 420, pts });
        } },
    ],
  },
  kaela: {
    name: 'Kaela', title: 'Crimson Duelist', cls: 'Fighter', spell: 'execute', melee: true, rate: [6, 7, 6, 7], wings: true,
    look: { body: '#a23b3b', trim: '#f0d9a0', skin: '#edc6a2', hair: '#e9e2d5', hat: 'tail', weapon: 'sword', cape: '#5c1f27' },
    skills: [
      { name: 'Triple Cadence', ic: 'cut1', c: '#ff8a5c', max: 6, cd: [9, 7], cost: [50, 75], range: CAD_STEP + CAD_REACH, cast: 'dir', chain: 3,
        ind: { t: 'step', d: CAD_STEP, w: 150, r: CAD_REACH, a: CAD_ARC }, ai: { t: 'near', r: 320, wave: true, step: CAD_STEP },
        desc: lv => `Step in and cut, up to three times, each within ${CAD_WIN}s of the last. The first two cuts deal ${L(lv, 95, 22)} (+45% Attack) damage each; for the third she leaps and comes down on the ground for ${L(lv, 135, 30)} (+60% Attack), throwing enemies into the air for ${CAD_AIR}s. The cooldown starts when the combo ends.`,
        fn(h, lv, tx, ty, ang) { cadence(h, lv, ang, 1); },
        two: { tag: 'Second cut', ic: 'cut2', ai: { t: 'chain', r: 320, step: CAD_STEP },
          desc: lv => `Step in and cut again for ${L(lv, 95, 22)} (+45% Attack) damage. One more press follows: a leap that comes down on the ground and throws enemies into the air.`,
          fn(h, lv, tx, ty, ang) { cadence(h, lv, ang, 2); } },
        three: { tag: 'Falling blow', ic: 'cut3', ai: { t: 'chain', r: 320, step: CAD_STEP },
          desc: lv => `Leap and come down on the ground for ${L(lv, 135, 30)} (+60% Attack) damage, throwing enemies in front of her into the air for ${CAD_AIR}s.`,
          fn(h, lv, tx, ty, ang) { cadence(h, lv, ang, 3); } } },
      { name: 'Lunging Strike', ic: 'dash', c: '#ffcf5c', max: 6, cd: [10, 8], cost: [55, 80], range: 400, cast: 'dir', noRoot: true,
        ind: { t: 'line', w: 110 }, ai: { t: 'gap', esc: true },
        desc: lv => `Dash through enemies for ${L(lv, 180, 45)} (+70% Attack) damage, then gain ${L(lv, 30, 6)}% Attack Speed for 4s.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'kaela1', h.x, h.y, { ang });
          startDash(h, ang, 400, 1250, { w: 75, hit(e) { dmg(h, e, L(lv, 180, 45) + 0.7 * h.ad, 'phys', { skill: true }); skfx(h, 'kaela1h', e.x, e.y, { ang }); } });
          addBuff(h, { k: 'lunge', t: 4, as: L(lv, 30, 6) });
        } },
      { name: 'Bloodrage', ic: 'rage', c: '#ff5d5d', max: 3, cd: [50, 40], cost: [100, 140], cast: 'self', ult: true,
        ind: { t: 'self', r: 280 }, ai: { t: 'buff', ult: true },
        desc: lv => `Erupt for ${L(lv, 150, 100)} (+60% Attack) damage, then rage for 7s: +${L(lv, 40, 20)} Attack, +${L(lv, 25, 10)}% Lifesteal, +20% Move Speed. Wings of light stay on her back for as long as the rage lasts.`,
        fn(h, lv) {
          skfx(h, 'kaela2', h.x, h.y, { r: 280 });
          for (const e of enemiesIn(h.team, h.x, h.y, 280)) dmg(h, e, L(lv, 150, 100) + 0.6 * h.ad, 'phys', { skill: true });
          addBuff(h, { k: 'rage', t: 7, dur: 7, ad: L(lv, 40, 20), ls: L(lv, 25, 10), msMul: 1.2, aura: '#ff5d5d', ci: 2 });
        } },
    ],
  },
  rook: {
    name: 'Rook', title: 'Mountain Breaker', cls: 'Fighter', spell: 'sprint', melee: true, rate: [8, 6, 6, 4],
    look: { body: '#7a5a3a', trim: '#d9d2c4', skin: '#b98a66', hair: '#d9d2c4', hat: 'bald', weapon: 'hammer', cape: null },
    skills: [
      { name: 'Ground Slam', ic: 'quake', c: '#ffb35c', max: 6, cd: [6.5, 5], cost: [45, 70], range: 320, cast: 'point',
        ind: { t: 'circle', r: 230 }, ai: { t: 'point', r: 230, delay: 0.35, wave: true },
        desc: lv => `Smash the ground ahead: ${L(lv, 250, 55)} (+90% Attack) damage and a 40% slow for 1.5s.`,
        fn(h, lv, tx, ty) {
          delayAoE(h, tx, ty, { delay: 0.35, r: 230, c: '#ffb35c', ci: 0, n: 'rook0', hit(e) { dmg(h, e, L(lv, 250, 55) + 0.9 * h.ad, 'phys', { skill: true }); slow(e, 0.4, 1.5); } });
        } },
      { name: 'Warcry', ic: 'cry', c: '#ffd76a', max: 6, cd: [12, 9.5], cost: [60, 85], cast: 'self',
        ind: { t: 'self', r: 0 }, ai: { t: 'buff', esc: true },
        desc: lv => `Roar: gain a shield of ${L(lv, 250, 60)} (+7% max HP) and 30% Move Speed for 3s.`,
        fn(h, lv) { shield(h, L(lv, 250, 60) + 0.07 * h.maxHp, 3); addBuff(h, { k: 'warcry', t: 3, msMul: 1.3 }); skfx(h, 'rook1', h.x, h.y, { ang: h.face }); } },
      { name: 'Whirlwind', ic: 'spin', c: '#ff8a5c', max: 3, cd: [45, 35], cost: [110, 150], cast: 'self', ult: true,
        ind: { t: 'self', r: 300 }, ai: { t: 'self', r: 280, ult: true },
        desc: lv => `Spin for 3.5s, striking everything around you for ${L(lv, 110, 50)} (+45% Attack) damage every 0.5s while moving 15% faster.`,
        fn(h, lv) {
          addBuff(h, { k: 'whirl', t: 3.5, msMul: 1.15, spin: true }); skfx(h, 'rook2', h.x, h.y, { r: 300 });
          zone(h, h.x, h.y, { dur: 3.5, r: 300, tick: 0.5, follow: h, look: 'spin', c: '#ff8a5c', ci: 2, hit(e) { dmg(h, e, L(lv, 110, 50) + 0.45 * h.ad, 'phys', { skill: true }); } });
        } },
    ],
  },
  vex: {
    name: 'Vex', title: 'Dusk Stalker', cls: 'Assassin', spell: 'retribution', melee: true, rate: [3, 9, 3, 9],
    look: { body: '#3b3552', trim: '#b98cff', skin: '#d8b79c', hair: '#1d1a2b', hat: 'hood', weapon: 'dagger', cape: '#272238' },
    skills: [
      { name: 'Shadow Dart', ic: 'dart', c: '#b98cff', max: 6, cd: [7, 5], cost: [50, 75], range: 780, cast: 'dir',
        ind: { t: 'line', w: 70 }, ai: { t: 'line', speed: 1500 },
        desc: lv => `Throw a blade that deals ${L(lv, 275, 64)} (+90% Attack) damage to the first enemy hit and slows it 40% for 1.5s.`,
        fn(h, lv, tx, ty, ang) {
          lineProj(h, ang, { speed: 1500, range: 780, w: 70, look: 'dart', c: '#b98cff', ci: 0, hit(e) { dmg(h, e, L(lv, 275, 64) + 0.9 * h.ad, 'phys', { skill: true }); slow(e, 0.4, 1.5); skfx(h, 'vex0h', e.x, e.y, { ang }); } });
        } },
      { name: 'Blink Strike', ic: 'blink', c: '#d0b0ff', max: 6, cd: [9.5, 7], cost: [60, 85], range: 430, cast: 'point', noRoot: true,
        ind: { t: 'circle', r: 220 }, ai: { t: 'gap', esc: true, land: true },
        desc: lv => `Vanish and reappear at the target spot, slashing nearby enemies for ${L(lv, 200, 50)} (+80% Attack) damage.`,
        fn(h, lv, tx, ty) {
          const x0 = h.x, y0 = h.y;
          blink(h, tx, ty);
          skfx(h, 'vex1', h.x, h.y, { x0, y0, r: 220 });
          for (const e of enemiesIn(h.team, h.x, h.y, 220)) dmg(h, e, L(lv, 200, 50) + 0.8 * h.ad, 'phys', { skill: true });
        } },
      { name: 'Death Mark', ic: 'skull', c: '#ff5d7a', max: 3, cd: [40, 30], cost: [100, 140], range: 600, cast: 'point', noRoot: true, ult: true, heroTarget: true,
        ind: { t: 'circle', r: 150 }, ai: { t: 'target', ult: true, finisher: true },
        desc: lv => `Leap onto an enemy hero and strike for ${L(lv, 400, 200)} (+120% Attack) plus 24% of their missing HP. They are marked for ${FLURRY_T}s: your next ${FLURRY_N} basic attacks on the marked hero come in a flurry, one on the heels of the other, and then your attack speed is back to normal.`,
        fn(h, lv, tx, ty) {
          const t = nearestEnemyHero(h, tx, ty, 280, 700); if (!t) return false;
          const a = fatan2(h.y - t.y, h.x - t.x);
          const x0 = h.x, y0 = h.y;
          blink(h, t.x + fcos(a) * 90, t.y + fsin(a) * 90);
          skfx(h, 'vex2', t.x, t.y, { x0, y0, x1: h.x, y1: h.y }); sfx('boom', t.x, t.y);
          dmg(h, t, L(lv, 400, 200) + 1.2 * h.ad + 0.24 * (t.maxHp - t.hp), 'phys', { skill: true });
          if (!t.dead) startFlurry(h, t, 2);
        } },
    ],
  },
  tavi: {
    /* fluid: his skills can be cast in the middle of his own dash, with no pause between casts, so the whole kit chains */
    name: 'Tavi', title: 'Dune Strider', cls: 'Assassin', spell: 'retribution', melee: true, fluid: true, rate: [3, 10, 4, 10],
    look: { body: '#1d5c63', trim: '#e8b24a', skin: '#b07a52', hair: '#1c1614', hat: 'wrap', weapon: 'ring', cape: '#d9b77a', glow: '#ffd76a', wrap: '#efe4cc', sash: '#c2452d', blade: '#e9f1f4', pants: '#3b3229', boot: '#2a2320' },
    skills: [
      { name: 'Glint', ic: 'ringblade', c: '#ffd76a', max: 6, cd: [9, 6.5], cost: [45, 70], range: 820, cast: 'dir',
        ind: { t: 'line', w: 70 }, ai: { t: 'line', speed: 2100 },
        desc: lv => `Hurl a ring blade. The first enemy hit takes ${L(lv, 185, 44)} (+60% Attack) damage and is marked for 4s. Cast again at any moment, even mid-dash, to flash to the marked enemy and strike for ${L(lv, 145, 38)} (+60% Attack).`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'tavi0', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 2100, range: 820, w: 70, look: 'ring', c: '#ffd76a', ci: 0, hit(e) {
            dmg(h, e, L(lv, 185, 44) + 0.6 * h.ad, 'phys', { skill: true });
            if (!e.dead && !h.dead) { h.re[0] = { until: G.t + 4, tgt: e }; skfx(h, 'tavi0h', e.x, e.y, { tid: e.id, dur: 4 }); }
          } });
        },
        two: { name: 'Mirage Step', ic: 'blink', cast: 'self', noRoot: true, ind: { t: 'self', r: 0 }, ai: { t: 'mark' },
          desc: lv => `Flash to the marked enemy and strike for ${L(lv, 145, 38)} (+60% Attack) damage.`,
          fn(h, lv, tx, ty, ang, re) {
            const t = re.tgt; if (!t || t.dead || hyp(t.x - h.x, t.y - h.y) > 1500) { h.re[0] = null; return false; }
            const a = fatan2(h.y - t.y, h.x - t.x), x0 = h.x, y0 = h.y;
            blink(h, t.x + fcos(a) * (t.r + 50), t.y + fsin(a) * (t.r + 50)); h.face = fatan2(t.y - h.y, t.x - h.x);
            skfx(h, 'tavi0b', t.x, t.y, { x0, y0, x1: h.x, y1: h.y });
            dmg(h, t, L(lv, 145, 38) + 0.6 * h.ad, 'phys', { skill: true });
          } } },
      { name: 'Ring Scatter', ic: 'scatter', c: '#59e0d0', max: 6, cd: [11, 8.5], cost: [55, 80], range: 600, cast: 'dir',
        ind: { t: 'cone', a: 0.4 }, ai: { t: 'line', speed: 1700, wave: true, r: 520 },
        desc: lv => `Scatter five ring blades in a fan. Each deals ${L(lv, 105, 27)} (+40% Attack) damage; extra hits on the same enemy deal 30%. They hang in the air for 5s: cast again at any moment, even while they still fly, to call them back through everything in their way for ${L(lv, 86, 24)} (+35% Attack) each.`,
        fn(h, lv, tx, ty, ang) {
          const hm = {}, old = h.re[1] && h.re[1].until > G.t ? h.re[1].pts : [], pts = old.slice(), re = { until: G.t + 5, ready: G.t + 0.12, pts };
          skfx(h, 'tavi1', h.x, h.y, { ang });
          for (const q of old) if (q.prop) q.prop.t = q.prop.dur = 5;       // blades already out wait for the new ones
          for (let i = -2; i <= 2; i++) {
            const a = ang + i * 0.17, q = { x: h.x + fcos(a) * 600, y: h.y + fsin(a) * 600, prop: null, proj: null }; pts.push(q);
            q.proj = lineProj(h, a, { speed: 1700, range: 600, w: 60, pierce: true, look: 'ring', c: '#59e0d0', ci: 1, quiet: i !== 0,
              hit(e) { const m = hm[e.id] ? 0.3 : 1; hm[e.id] = 1; dmg(h, e, (L(lv, 105, 27) + 0.4 * h.ad) * m, 'phys', { skill: true }); },
              end(p) { q.proj = null; q.x = p.x; q.y = p.y; if (h.re[1] && h.re[1].pts.includes(q) && !h.dead) q.prop = prop(h, q.x, q.y, { dur: h.re[1].until - G.t, look: 'ring', ci: 1, ang: a }); } });
          }
          h.re[1] = re;
        },
        two: { name: 'Gather', ic: 'recall', cast: 'self', noRoot: false, ind: { t: 'self', r: 0 }, ai: { t: 'recall' },
          desc: lv => `Call every ring blade back to you, from the air or from where it hangs. Each deals ${L(lv, 86, 24)} (+35% Attack) damage to enemies in its way and slows them 25% for 1s; extra hits on the same enemy deal 30%.`,
          fn(h, lv, tx, ty, ang, re) {
            const hm = {}; skfx(h, 'tavi1r', h.x, h.y, { n: re.pts.length });
            for (const q of re.pts) {
              let x = q.x, y = q.y;
              if (q.proj) { x = q.proj.x; y = q.proj.y; q.proj.kill = true; q.proj = null; }       // still flying: it turns round where it is
              if (q.prop) q.prop.t = 0;
              retProj(h, x, y, { speed: 2000, w: 70, look: 'ring', c: '#59e0d0', ci: 1, hit(e) { const m = hm[e.id] ? 0.3 : 1; hm[e.id] = 1; dmg(h, e, (L(lv, 86, 24) + 0.35 * h.ad) * m, 'phys', { skill: true }); slow(e, 0.25, 1); } });
            }
          } } },
      { name: 'Sandstride', ic: 'stride', c: '#ffb86a', max: 3, cd: [42, 32], cost: [80, 120], range: 470, cast: 'point', noRoot: true, ult: true,
        ind: { t: 'circle', r: 190 }, ai: { t: 'gap', ult: true, esc2: true },
        desc: lv => `Dash to the target spot, striking nearby enemies for ${L(lv, 135, 88)} (+50% Attack) damage, and instantly refresh Glint and Ring Scatter; blades already out stay out. Within 5s you can cast it again to dash once more. You can throw and flash in the middle of the dash.`,
        fn(h, lv, tx, ty) {
          const x0 = h.x, y0 = h.y;
          leapTo(h, tx, ty, 0.18, () => { skfx(h, 'tavi2l', h.x, h.y, { r: 190 }); for (const e of enemiesIn(h.team, h.x, h.y, 190)) dmg(h, e, L(lv, 135, 88) + 0.5 * h.ad, 'phys', { skill: true }); });
          skfx(h, 'tavi2', x0, y0, { x1: h.leap.x1, y1: h.leap.y1 });
          h.cds[0] = h.cds[1] = 0;
          const r1 = h.re[1]; if (r1 && r1.until > G.t) { r1.more = true; r1.until = G.t + 5; for (const q of r1.pts) if (q.prop) q.prop.t = q.prop.dur = 5; }       // blades still out: they wait, and the next cast throws five more before they come home
          h.re[2] = { until: G.t + 5, ready: G.t + 0.2 };
        },
        two: { ai: { t: 'gap2' },
          desc: lv => `Dash once more, striking nearby enemies for ${L(lv, 135, 88)} (+50% Attack) damage.`,
          fn(h, lv, tx, ty) {
            const x0 = h.x, y0 = h.y;
            leapTo(h, tx, ty, 0.18, () => { skfx(h, 'tavi2l', h.x, h.y, { r: 190 }); for (const e of enemiesIn(h.team, h.x, h.y, 190)) dmg(h, e, L(lv, 135, 88) + 0.5 * h.ad, 'phys', { skill: true }); });
            skfx(h, 'tavi2', x0, y0, { x1: h.leap.x1, y1: h.leap.y1, again: 1 });
          } } },
    ],
  },
  kiri: {
    /* Two forms. Heron (0): a ranged caster who sets wards and looses one long arrow. Tiger (1): hand to hand, a leap and a dash.
       The ultimate swaps form, is known from level 1 (freeUlt) and makes the new form's two skills ready at once. */
    name: 'Kiri', title: 'Twin-Mask Medium', cls: 'Mage', cls2: 'Assassin', spell: 'flicker', rate: [3, 9, 8, 10], freeUlt: true,
    forms: { names: ['Heron', 'Tiger'], range: 165, as: 25, tough: 16 },       // the Tiger: hand to hand, quicker hands, a thicker hide
    base: Object.assign({}, CLASS_BASE.Mage, { hp: 2480, hpG: 165, ad: 108, armor: 18, armorG: 2.9, as: 0.86, range: 520, ms: 256 }),
    look: { body: '#f2efe6', trim: '#d8483a', skin: '#f0cfae', hair: '#1d1a24', hat: 'mask', weapon: 'charm', cape: '#2f7f86', glow: '#8fe6ff', heron: '#8fe6ff', tiger: '#ff8a3c', sash: '#d8483a', pants: '#27323a', boot: '#1c2228' },
    skills: [
      { name: 'Paper Ward', ic: 'ward', c: '#8fe6ff', max: 6, cd: [9, 7], cost: [60, 85], range: 680, cast: 'point',
        ind: { t: 'circle', r: 160 }, ai: { t: 'point', r: 200, delay: 0.8, wave: true },
        desc: lv => `Heron: set a ward on the ground (three at most, 40s). The first enemy to come near is caught, heroes before anything else: slowed 70% for 1s, then it bursts for ${L(lv, 250, 58)} (+80% Magic) damage around them and marks everyone hit.`,
        fn(h, lv, tx, ty) {
          const p = nearestWalkable(tx, ty), W0 = h.wards || (h.wards = []);
          while (W0.length >= 3) { const o = W0.shift(); o.gone = null; o.t = 0; }
          const a = trap(h, p.x, p.y, { r: 150, arm: 0.6, dur: 40, look: 'ward', ci: 0, spring(e) { wardBurst(h, lv, e); }, gone(a) { const i = W0.indexOf(a); if (i >= 0) W0.splice(i, 1); } });
          W0.push(a); skfx(h, 'kiri0', p.x, p.y, { x0: h.x, y0: h.y });
        },
        alt: { name: 'Pounce', ic: 'pounce', c: '#ff8a3c', cd: [7, 5.5], cost: [40, 60], range: 430, noRoot: true,
          ind: { t: 'circle', r: 180 }, ai: { t: 'gap', wave: true },
          desc: lv => `Tiger: leap to a spot, striking for ${L(lv, 240, 54)} (+90% Magic) damage, and gain a shield of ${L(lv, 170, 48)} (+60% Magic) for 3s. Each enemy hit spends one of its marks.`,
          fn(h, lv, tx, ty) {
            const x0 = h.x, y0 = h.y; shield(h, L(lv, 170, 48) + 0.6 * h.ap, 3);
            leapTo(h, tx, ty, 0.24, () => { skfx(h, 'kiri0t', h.x, h.y, { r: 180 }); for (const e of enemiesIn(h.team, h.x, h.y, 180)) { dmg(h, e, L(lv, 240, 54) + 0.9 * h.ap, 'magic', { skill: true }); useMark(h, e); } });
            skfx(h, 'kiri0j', x0, y0, { x1: h.leap.x1, y1: h.leap.y1 });
          } } },
      { name: 'Far Flight', ic: 'longshot', c: '#b8f0ff', max: 6, cd: [12, 9], cost: [80, 110], range: 1500, cast: 'dir',
        ind: { t: 'line', w: 70 }, ai: { t: 'line', speed: 1500, far: true },
        desc: lv => `Heron: loose a spirit arrow a very long way. The first enemy hit is marked, takes ${L(lv, 230, 52)} (+60% Magic) damage and is stunned 0.5s; the further it flew, the more of both, up to double damage and a 2.5s stun. An arrow that passes over one of your wards carries its burst along. A long hit quickens you for 2s.`,
        fn(h, lv, tx, ty, ang) {
          const ox = h.x, oy = h.y; skfx(h, 'kiri1', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1500, range: 1500, w: 70, look: 'spirit', c: '#b8f0ff', ci: 1,
            step(p) { p.k = clamp(hyp(p.x - ox, p.y - oy) / 1350, 0, 1); if (!p.ward && h.wards) for (const a of h.wards) if (a.t > 0 && hyp(a.x - p.x, a.y - p.y) < 90) { p.ward = true; a.t = 0; skfx(h, 'kiri1w', a.x, a.y, { ang }); break; } },
            hit(e, p) {
              const k = p.k || 0; dmg(h, e, (L(lv, 230, 52) + 0.6 * h.ap) * (1 + k), 'magic', { skill: true }); stun(e, 0.5 + 2 * k); mark(h, e);
              skfx(h, 'kiri1h', e.x, e.y, { k, ang: p.ang, tid: e.id, dur: 0.5 + 2 * k });
              if (p.ward && !e.dead) wardBurst(h, lv, e);
              if (k > 0.45 && !h.dead) addBuff(h, { k: 'farflight', t: 2, msMul: 1.25 });
            } });
        },
        alt: { name: 'Rake', ic: 'claws', c: '#ffb35c', cd: [10, 8], cost: [50, 70], range: 480, noRoot: true,
          ind: { t: 'line', w: 100 }, ai: { t: 'gap', esc: true, wave: true },
          desc: lv => `Tiger: rush through enemies for ${L(lv, 240, 54)} (+100% Magic) damage. Each enemy hit spends one of its marks, and spending a mark makes Rake ready again at once.`,
          fn(h, lv, tx, ty, ang) {
            skfx(h, 'kiri1t', h.x, h.y, { ang });
            startDash(h, ang, 480, 1500, { w: 95, hit(e) { dmg(h, e, L(lv, 240, 54) + 1.0 * h.ap, 'magic', { skill: true }); skfx(h, 'kiri1c', e.x, e.y, { ang }); if (useMark(h, e)) { h.cds[1] = 0; h.pv.rakeT = G.t; } } });
          } } },
      { name: 'Tiger Mask', ic: 'mask', c: '#ff8a3c', max: 4, cd: [5, 3.8], cost: [20, 20], cast: 'self', noRoot: true, ult: true, swap: true,
        ind: { t: 'self', r: 0 }, ai: { t: 'form' },
        desc: lv => `Turn the mask: become the Tiger. You fight hand to hand with 16 more armor and magic resist, your attacks hit for ${L(lv, 22, 14)} (+35% Magic) extra magic damage and spend marks, Pounce and Rake are ready at once, and you run 30% faster for 1s. Known from level 1; each level shortens the wait and sharpens the claws.`,
        fn(h, lv) { setForm(h, 1); addBuff(h, { k: 'maskturn', t: 1, msMul: 1.3 }); skfx(h, 'kiri2', h.x, h.y, { f: 1 }); },
        alt: { name: 'Heron Mask', ic: 'mask', c: '#8fe6ff',
          desc: lv => `Turn the mask back: become the Heron. Paper Ward and Far Flight are ready at once, and you run 30% faster for 1s.`,
          fn(h, lv) { setForm(h, 0); addBuff(h, { k: 'maskturn', t: 1, msMul: 1.3 }); skfx(h, 'kiri2', h.x, h.y, { f: 0 }); } } },
    ],
  },
  lyra: {
    name: 'Lyra', title: 'Starbound Arcanist', cls: 'Mage', spell: 'flicker', melee: false, rate: [3, 9, 6, 4],
    look: { body: '#3e5aa8', trim: '#ffd76a', skin: '#f0cdb0', hair: '#f3e9c9', hat: 'hat', weapon: 'staff', cape: '#263a73', glow: '#9fc3ff' },
    skills: [
      { name: 'Arc Bolt', ic: 'orb', c: '#7aa8ff', max: 6, cd: [6, 4.5], cost: [65, 90], range: 820, cast: 'dir',
        ind: { t: 'line', w: 80 }, ai: { t: 'line', speed: 1250, wave: true },
        desc: lv => `Launch a bolt that bursts on the first enemy hit, dealing ${L(lv, 300, 70)} (+100% Magic) damage in a small area.`,
        fn(h, lv, tx, ty, ang) {
          const boom = p => {
            skfx(h, 'lyra0', p.x, p.y, { r: 190 });
            for (const e of enemiesIn(h.team, p.x, p.y, 190)) dmg(h, e, L(lv, 300, 70) + 1.0 * h.ap, 'magic', { skill: true });
          };
          skfx(h, 'lyra0c', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1250, range: 820, w: 80, look: 'orb', c: '#7aa8ff', ci: 0, quiet: true, hit(e, p) { boom(p); }, end: boom });
        } },
      { name: 'Frost Ring', ic: 'frost', c: '#8fe6ff', max: 6, cd: [11, 9], cost: [80, 105], range: 700, cast: 'point',
        ind: { t: 'circle', r: 210 }, ai: { t: 'point', r: 210, delay: 0.7 },
        desc: lv => `After 0.7s a ring of frost erupts: ${L(lv, 220, 50)} (+70% Magic) damage and enemies are rooted for ${L(lv, 1.2, 0.1).toFixed(1)}s.`,
        fn(h, lv, tx, ty) {
          delayAoE(h, tx, ty, { delay: 0.7, r: 210, c: '#8fe6ff', look: 'frost', ci: 1, n: 'lyra1', hit(e) { dmg(h, e, L(lv, 220, 50) + 0.7 * h.ap, 'magic', { skill: true }); root(e, L(lv, 1.2, 0.1)); } });
        } },
      { name: 'Starfall', ic: 'star', c: '#ffd76a', max: 3, cd: [45, 35], cost: [140, 180], range: 800, cast: 'point', ult: true,
        ind: { t: 'circle', r: 330 }, ai: { t: 'point', r: 330, delay: 0.3, ult: true },
        desc: lv => `Call down stars for ${STARFALL_T}s. Enemies inside take ${L(lv, 110, 50)} (+30% Magic) damage every 0.5s and are slowed 30%, and whoever stays under them for ${STARFALL_STAY}s is rooted for ${STARFALL_ROOT}s (once for each Starfall).`,
        fn(h, lv, tx, ty) {
          skfx(h, 'lyra2c', h.x, h.y, { tx, ty }); const late = G.kit >= 21;       // (before KIT_V 21 the stars fell for three seconds and held nobody)
          zone(h, tx, ty, { dur: late ? STARFALL_T : 3, r: 330, tick: 0.5, look: 'stars', c: '#ffd76a', ci: 2, hold: late ? { stay: STARFALL_STAY, root: STARFALL_ROOT, fx: 'lyra2r' } : null, hit(e) { dmg(h, e, L(lv, 110, 50) + 0.3 * h.ap, 'magic', { skill: true }); slow(e, 0.3, 0.7); } });
        } },
    ],
  },
  zephyr: {
    name: 'Zephyr', title: 'Stormcaller', cls: 'Mage', spell: 'aegis', melee: false, rate: [4, 8, 8, 3],
    look: { body: '#2f8f8a', trim: '#e8f6f2', skin: '#d6ae8c', hair: '#e8f6f2', hat: 'crown', weapon: 'orb', cape: '#1c5a58', glow: '#8ff0e0' },
    skills: [
      { name: 'Gale Lance', ic: 'wind', c: '#8ff0e0', max: 6, cd: [6.5, 5], cost: [60, 85], range: 950, cast: 'dir',
        ind: { t: 'line', w: 70 }, ai: { t: 'line', speed: 1700, wave: true },
        desc: lv => `Fire a lance of wind that pierces every enemy in a line for ${L(lv, 250, 60)} (+85% Magic) damage.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'zephyr0', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1700, range: 950, w: 70, pierce: true, look: 'lance', c: '#8ff0e0', ci: 0, hit(e) { dmg(h, e, L(lv, 250, 60) + 0.85 * h.ap, 'magic', { skill: true }); } });
        } },
      { name: 'Cyclone', ic: 'vortex', c: '#6fd0ff', max: 6, cd: [12, 10], cost: [85, 110], range: 650, cast: 'point',
        ind: { t: 'circle', r: 230 }, ai: { t: 'point', r: 230, delay: 0.2 },
        desc: lv => `Summon a cyclone for 3s. Enemies inside take ${L(lv, 60, 16)} (+18% Magic) damage every 0.5s and are slowed 45%.`,
        fn(h, lv, tx, ty) {
          skfx(h, 'zephyr1', tx, ty, { r: 230 });
          zone(h, tx, ty, { dur: 3, r: 230, tick: 0.5, look: 'cyclone', c: '#6fd0ff', ci: 1, hit(e) { dmg(h, e, L(lv, 60, 16) + 0.18 * h.ap, 'magic', { skill: true }); slow(e, 0.45, 0.7); } });
        } },
      { name: 'Tempest Beam', ic: 'beam', c: '#c8fff4', max: 3, cd: [48, 38], cost: [150, 190], range: 1300, cast: 'dir', ult: true,
        ind: { t: 'line', w: 180 }, ai: { t: 'line', speed: 2600, ult: true, r: 1150 },
        desc: lv => `Channel for 0.6s, then unleash a huge beam: ${L(lv, 480, 240)} (+130% Magic) damage and a ${beamStun(lv).toFixed(1)}s stun to everything in its path. The Ironwill Totem does not turn this stun away.`,
        fn(h, lv, tx, ty, ang) {
          h.castLock = 0.6;
          skfx(h, 'zephyr2c', h.x, h.y, { ang });
          beam(h, ang, { delay: 0.6, len: 1300, w: 180, c: '#c8fff4', ci: 2, hit(e) { dmg(h, e, L(lv, 480, 240) + 1.3 * h.ap, 'magic', { skill: true }); stun(e, beamStun(lv, G.kit), G.kit >= 23); } });
        } },
    ],
  },
  orin: {
    /* a warden of the thornwood who throws leaves of iron: what he throws skips from one enemy to the next (weapon 'leaf') */
    name: 'Orin', title: 'Ironleaf Warden', cls: 'Marksman', spell: 'flicker', melee: false, rate: [5, 8, 6, 2],
    look: { body: '#3b2f27', trim: '#d08a3e', skin: '#e2b792', hair: '#4f3320', hat: 'wreath', weapon: 'leaf', cape: '#2e5a3d', glow: '#b8f06a', blade: '#93a69d', pants: '#27352e', boot: '#2e241d' },
    skills: [
      { name: "Hunter's Poise", ic: 'poise', c: '#8be0c0', max: 6, cd: [15, 12], cost: [60, 85], cast: 'self',
        ind: { t: 'self', r: 0 }, ai: { t: 'shield', r: 640, esc: true },
        desc: lv => `Steady yourself behind a shield of ${L(lv, 260, 60)} (+60% Attack) for 5s. While it holds you move 20% faster, attack ${L(lv, 20, 6)}% faster and cannot be stunned, rooted or pulled, and 25% of the damage you deal is added to it (10% against anything but a hero), up to half your max HP.`,
        fn(h, lv) {
          h.shields = h.shields.filter(q => q.k !== 'poise');
          const sh = { v: L(lv, 260, 60) + 0.6 * h.ad, t: 5, k: 'poise' }; h.shields.push(sh);
          addBuff(h, { k: 'poise', t: 5, msMul: 1.2, as: L(lv, 20, 6), steady: true, sh, aura: '#8be0c0', ci: 0 });
          skfx(h, 'orin0', h.x, h.y, {});
        } },
      { name: 'Barbed Throw', ic: 'cripple', c: '#b8f06a', max: 6, cd: [8, 6], cost: [55, 80], range: 900, cast: 'dir',
        ind: { t: 'line', w: 70 }, ai: { t: 'line', speed: 1700, wave: true },
        desc: lv => `Hurl a heavy barbed leaf through every enemy in a line for ${L(lv, 220, 50)} (+90% Attack) damage and a 60% slow for 1s. Whatever it hits is marked for 4s: your next basic attack on a marked enemy spends the mark, and its skips do not weaken.`,
        fn(h, lv, tx, ty, ang) {
          let first = true; skfx(h, 'orin1', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1700, range: 900, w: 70, pierce: true, look: 'leaf', big: 1, c: '#b8f06a', ci: 1, hit(e) {
            const a = L(lv, 220, 50) + 0.9 * h.ad; dmg(h, e, a, 'phys', { skill: true }); slow(e, 0.6, 1); orinMark(h, e);
            if (first) { first = false; ricochet(h, e, a * 0.6, { n: 4, k: 0.8, r: 340, f: { skill: true }, c: '#b8f06a', ci: 1 }); }
          } });
        } },
      { name: 'Bramble Snare', ic: 'bramble', c: '#ffcf5c', max: 3, cd: [44, 36], cost: [110, 150], range: 950, cast: 'dir', ult: true, heroTarget: true,
        ind: { t: 'line', w: 90 }, ai: { t: 'line', speed: 1500, ult: true, r: 900, hero: true },
        desc: lv => `Throw a seed pod that flies past minions and creeps and catches the first enemy hero in its path, rooting them for 1.4s. After 0.9s it bursts into thorns for ${L(lv, 300, 150)} (+90% Attack) damage around them, and seeds leap to every other enemy hero close by, to root them and burst in turn. A second burst on the same enemy deals 40%. It does nothing unless it finds a hero.`,
        fn(h, lv, tx, ty, ang) {
          const S = { got: {}, hm: {}, n: 0 }; let live = true; skfx(h, 'orin2', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1500, range: 950, w: 90, pierce: true, quiet: true, look: 'pod', c: '#ffcf5c', ci: 2, hit(e, p) {
            if (!live || e.kind !== 'hero') return; live = false; p.left = 0; S.got[e.id] = 1; orinSnare(h, lv, e, S);
          } });
        } },
    ],
  },
  mira: {
    name: 'Mira', title: 'Wildwood Trapper', cls: 'Marksman', spell: 'sprint', melee: false, rate: [3, 8, 6, 5],
    look: { body: '#8a5a2b', trim: '#8be0c0', skin: '#c99a78', hair: '#2f2a25', hat: 'feather', weapon: 'bow', cape: '#5a3a1c' },
    skills: [
      { name: 'Triple Shot', ic: 'arrows', c: '#8be0c0', max: 6, cd: [6.5, 5], cost: [50, 75], range: 760, cast: 'dir',
        ind: { t: 'cone', a: 0.22 }, ai: { t: 'line', speed: 1600, wave: true },
        desc: lv => `Fire three arrows. Each deals ${L(lv, 180, 45)} (+75% Attack) damage; extra hits on the same target deal 35%.`,
        fn(h, lv, tx, ty, ang) {
          const hm = {}; skfx(h, 'mira0', h.x, h.y, { ang });
          for (let i = -1; i <= 1; i++) lineProj(h, ang + i * 0.2, { speed: 1600, range: 760, w: 55, look: 'arrow', c: '#8be0c0', ci: 0, hit(e) {
            const m = hm[e.id] ? 0.35 : 1; hm[e.id] = 1; dmg(h, e, (L(lv, 180, 45) + 0.75 * h.ad) * m, 'phys', { skill: true });
          } });
        } },
      { name: 'Snare Trap', ic: 'trap', c: '#ffb35c', max: 6, cd: [12, 9.5], cost: [60, 85], range: 620, cast: 'point',
        ind: { t: 'circle', r: 180 }, ai: { t: 'point', r: 180, delay: 0.9 },
        desc: lv => `Toss a trap that springs after 0.9s: ${L(lv, 150, 40)} (+50% Attack) damage and a 1.3s root.`,
        fn(h, lv, tx, ty) {
          skfx(h, 'mira1c', tx, ty, { x0: h.x, y0: h.y });
          delayAoE(h, tx, ty, { delay: 0.9, r: 180, c: '#ffb35c', look: 'trap', ci: 1, n: 'mira1', hit(e) { dmg(h, e, L(lv, 150, 40) + 0.5 * h.ad, 'phys', { skill: true }); root(e, 1.3); } });
        } },
      { name: 'Eagle Eye', ic: 'eye', c: '#ffd76a', max: 3, cd: [46, 30], cost: [100, 140], cast: 'self', ult: true,
        ind: { t: 'self', r: 0 }, ai: { t: 'buff', ult: true },
        desc: lv => `For ${L(lv, 8, 2)}s gain +${L(lv, 150, 50)} attack range, +${L(lv, 50, 25)} Attack and 25% Attack Speed. Each level makes it last 2s longer and come back 8s sooner.`,
        fn(h, lv) { addBuff(h, { k: 'eagle', t: L(lv, 8, 2), range: L(lv, 150, 50), ad: L(lv, 50, 25), as: 25, aura: '#ffd76a', ci: 2 }); skfx(h, 'mira2', h.x, h.y, {}); } },
    ],
  },
  sera: {
    name: 'Sera', title: 'Dawn Chorister', cls: 'Support', spell: 'aegis', melee: false, rate: [5, 4, 8, 3],
    look: { body: '#e6dcc4', trim: '#f2c14e', skin: '#f0cdb0', hair: '#c9773a', hat: 'halo', weapon: 'wand', cape: '#b89a5a', glow: '#fff1b8' },
    skills: [
      { name: 'Mending Light', ic: 'heal', c: '#8ff0a8', max: 6, cd: [8, 6.5], cost: [70, 95], range: 650, cast: 'point',
        ind: { t: 'circle', r: 260 }, ai: { t: 'heal', r: 260 },
        desc: lv => `Bless an area: allies are healed for ${L(lv, 220, 54)} (+60% Magic) and enemies take ${L(lv, 120, 30)} (+40% Magic) damage. You are always healed for half.`,
        fn(h, lv, tx, ty) {
          skfx(h, 'sera0', tx, ty, { r: 260 });
          const amt = L(lv, 220, 54) + 0.6 * h.ap; let self = false;
          for (const a of alliesIn(h.team, tx, ty, 260)) { heal(h, a, amt); if (a === h) self = true; }
          if (!self) heal(h, h, amt * 0.5);
          for (const e of enemiesIn(h.team, tx, ty, 260)) dmg(h, e, L(lv, 120, 30) + 0.4 * h.ap, 'magic', { skill: true });
        } },
      { name: 'Binding Chain', ic: 'chain', c: '#ffe08a', max: 6, cd: [11, 9], cost: [70, 95], range: 800, cast: 'dir',
        ind: { t: 'line', w: 80 }, ai: { t: 'line', speed: 1400 },
        desc: lv => `Cast a chain of light. The first enemy hit takes ${L(lv, 180, 45)} (+60% Magic) damage and is rooted for 1.4s.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'sera1', h.x, h.y, { ang });
          lineProj(h, ang, { speed: 1400, range: 800, w: 80, look: 'chain', c: '#ffe08a', ci: 1, hit(e) { dmg(h, e, L(lv, 180, 45) + 0.6 * h.ap, 'magic', { skill: true }); root(e, 1.4); if (!e.dead && e.rootT > 0) skfx(h, 'sera1h', e.x, e.y, { dur: e.rootT }); } });
        } },
      { name: 'Sanctuary', ic: 'halo', c: '#fff1b8', max: 3, cd: [55, 45], cost: [140, 180], cast: 'self', ult: true,
        ind: { t: 'self', r: 520 }, ai: { t: 'allyAoE', r: 520, ult: true },
        desc: lv => `Allies around you are healed for ${L(lv, 180, 110)} (+50% Magic), shielded for ${L(lv, 440, 210)} (+100% Magic) for 4s and gain 25% Move Speed.`,
        fn(h, lv) {
          const pts = [];
          for (const a of alliesIn(h.team, h.x, h.y, 520)) {
            if (a.kind === 'hero') pts.push(a.x, a.y);
            heal(h, a, L(lv, 180, 110) + 0.5 * h.ap); shield(a, L(lv, 440, 210) + 1.0 * h.ap, 4);
            addBuff(a, { k: 'sanct', t: 3, msMul: 1.25 });
          }
          skfx(h, 'sera2', h.x, h.y, { r: 520, pts });
        } },
    ],
  },
  /* Two roles. roles[i]: a class and a place on the map; the one she is played in decides which lane her side leaves to her, what she
     is advised to buy and how careful a bot is with her. What she can do is the same in both: every skill has something for friends
     and something for foes, and her passive leans one way or the other with the company she is in.
     Heroes are only ever added after the last one: a recording made before one existed is played with the heroes there were then. */
  miel: {
    name: 'Miel', title: 'Amber Hivekeeper', cls: 'Support', cls2: 'Mage', spell: 'flicker', melee: false, rate: [4, 7, 5, 3],
    roles: [{ cls: 'Support', pos: 'roam', does: 'Keeps the carry alive in the bottom lane and follows the fights.' }, { cls: 'Mage', pos: 'mid', does: 'Holds the middle lane alone and stings whoever comes into reach.' }],
    base: { hp: 2460, hpG: 160, mp: 520, mpG: 45, ad: 104, adG: 5.0, armor: 17, armorG: 2.7, mr: 11, mrG: 1.6, as: 0.80, asG: 1.0, range: 530, ms: 250, hpRegen: 6.5, mpRegen: 4.3 },
    look: { body: '#f1e6c8', trim: '#e9a21f', skin: '#edc9a4', hair: '#4a2f1c', hat: 'veil', weapon: 'skep', cape: '#8a5a1c', glow: '#ffc94a', band: '#3a2a1a', straw: '#d9a441', pants: '#6a4a26', boot: '#3a2a1a', tend: '#fff0b0', sting: '#ff6a2a', bee: ['#ffc233', '#2a1a0e'] },       // (bee: the colours of her bees, body and bands)
    skills: [
      { name: 'Stinger Flight', ic: 'sting', c: '#ffb52e', max: 6, cd: [7.5, 5.5], cost: [65, 90], range: 880, cast: 'dir',
        ind: { t: 'line', w: 100 }, ai: { t: 'line', speed: 1500, wave: true },
        desc: lv => `Send the swarm out in a line. It goes through every enemy in its way for ${L(lv, 210, 46)} (+70% Magic) damage and slows them 30% for 1.5s. Each one keeps a sting for ${STING_T}s: ${+L(lv, 5, 1.8).toFixed(1)} (+2.5% Magic) damage a second and ${Math.round(STING_SLOW * 100)}% slower. Stings add up, ${STING_MAX} at most, and each new one starts their time again. It leaves honey on each allied hero it passes: ${L(lv, 90, 22)} (+25% Magic) health.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'miel0', h.x, h.y, { ang });
          const fed = {};
          lineProj(h, ang, { speed: 1500, range: 880, w: 100, look: 'swarm', c: '#ffb52e', ci: 0, pierce: true,
            hit(e) { dmg(h, e, L(lv, 210, 46) + 0.7 * h.ap, 'magic', { skill: true }); slow(e, 0.3, 1.5); if (G.kit >= 20) sting(h, e, lv); },
            step(p) { for (const a of G.heroes) if (a !== h && a.team === h.team && !a.dead && !fed[a.id] && hyp(a.x - p.x, a.y - p.y) <= p.w / 2 + a.r) { fed[a.id] = 1; heal(h, a, L(lv, 90, 22) + 0.25 * h.ap); skfx(h, 'miel0a', a.x, a.y, { tid: a.id }); } } });
        } },
      { name: 'Honeycomb', ic: 'comb', c: '#ffd76a', max: 6, cd: [13, 10.5], cost: [80, 105], range: 650, cast: 'point',
        ind: { t: 'circle', r: COMB_R }, ai: { t: 'comb', r: COMB_R },
        desc: lv => `Raise a comb of honey on the ground for ${COMB_T}s. Allied heroes standing on it as it rises, you among them, are shielded for ${L(lv, 170, 45)} (+45% Magic). While it stands, allies on it regain ${L(lv, 22, 6)} (+6% Magic) health every 0.5s, and enemies on it are slowed 35% and take ${L(lv, 24, 7)} (+8% Magic) damage every 0.5s.`,
        fn(h, lv, tx, ty) {
          const k = tending(h) ? TEND_K : 1;
          for (const a of alliesIn(h.team, tx, ty, COMB_R)) shield(a, (L(lv, 170, 45) + 0.45 * h.ap) * k, COMB_T);
          skfx(h, 'miel1', tx, ty, { r: COMB_R, dur: COMB_T });
          zone(h, tx, ty, { dur: COMB_T, r: COMB_R, tick: 0.5, look: 'comb', c: '#ffd76a', ci: 1,
            hit(e) { dmg(h, e, L(lv, 24, 7) + 0.08 * h.ap, 'magic', { skill: true }); slow(e, 0.35, 0.7); },
            each(a) { for (const p of alliesIn(h.team, a.x, a.y, a.r)) heal(h, p, L(lv, 22, 6) + 0.06 * h.ap); } });
        } },
      { name: "Queen's Flight", ic: 'crown', c: '#ff9a2e', max: 3, cd: [50, 40], cost: [140, 180], cast: 'self', ult: true,
        ind: { t: 'self', r: HIVE_R }, ai: { t: 'self', r: HIVE_R, ult: true, mend: true },
        desc: lv => `The queen leads the whole hive out around you for ${HIVE_T2}s and you move 25% faster. As it bursts out, enemies within reach take ${L(lv, 100, 55)} (+30% Magic) damage, are slowed 40% for 1.5s and keep a sting, and allied heroes within reach, you among them, regain ${L(lv, 50, 30)} (+12% Magic) health. Then every 0.5s enemies within reach take ${L(lv, 50, 26)} (+15% Magic) damage and are slowed 25%, and allies regain ${L(lv, 32, 15)} (+8% Magic) health.`,
        fn(h, lv) {
          if (G.kit < 22) {       // as it was: five seconds of the hive about her, and no more
            addBuff(h, { k: 'hive', t: HIVE_T, msMul: 1.2 });
            skfx(h, 'miel2', h.x, h.y, { r: HIVE_R, dur: HIVE_T });
            zone(h, h.x, h.y, { dur: HIVE_T, r: HIVE_R, tick: 0.5, follow: h, look: 'hive', c: '#ff9a2e', ci: 2,
              hit(e) { dmg(h, e, L(lv, 50, 26) + 0.15 * h.ap, 'magic', { skill: true }); slow(e, 0.2, 0.7); },
              each(a) { for (const p of alliesIn(h.team, a.x, a.y, a.r)) heal(h, p, L(lv, 32, 15) + 0.08 * h.ap); } });
            return;
          }
          addBuff(h, { k: 'hive', t: HIVE_T2, msMul: 1.25 });
          skfx(h, 'miel2', h.x, h.y, { r: HIVE_R, dur: HIVE_T2, q: 1 });
          for (const e of enemiesIn(h.team, h.x, h.y, HIVE_R)) {       // the burst: a blow, a slow and a sting for everyone in reach
            dmg(h, e, L(lv, 100, 55) + 0.3 * h.ap, 'magic', { skill: true });
            if (!e.dead) { slow(e, 0.4, 1.5); sting(h, e, Math.max(1, h.sk[0])); skfx(h, 'miel2h', e.x, e.y, { tid: e.id }); }
          }
          for (const p of alliesIn(h.team, h.x, h.y, HIVE_R)) { heal(h, p, L(lv, 50, 30) + 0.12 * h.ap); if (p !== h) skfx(h, 'miel0a', p.x, p.y, { tid: p.id }); }
          zone(h, h.x, h.y, { dur: HIVE_T2, r: HIVE_R, tick: 0.5, follow: h, look: 'hive', c: '#ff9a2e', ci: 2,
            hit(e) { dmg(h, e, L(lv, 50, 26) + 0.15 * h.ap, 'magic', { skill: true }); slow(e, 0.25, 0.7); },
            each(a) { for (const p of alliesIn(h.team, a.x, a.y, a.r)) heal(h, p, L(lv, 32, 15) + 0.08 * h.ap); } }).q = 1;       // (q: the queen is out, for the eye)
        } },
    ],
  },
  /* A tank who makes herself the target. Her gong is her shield and her voice: struck, it calls out everyone near her, and whoever is
     called out can do nothing but come at her; raised, it puts one shield over her whole side, which they all share. */
  hesta: {
    name: 'Hesta', title: 'Brazen Herald', cls: 'Tank', spell: 'aegis', melee: true, rate: [9, 3, 9, 5],
    look: { body: '#2f6f6a', trim: '#d99a4a', skin: '#c9906c', hair: '#2a1a16', hat: 'crest', weapon: 'gong', cape: '#9a3d24', glow: '#ffcf7a', metal: '#c98a3c', pants: '#3a2c26', boot: '#4a3626', plume: '#c9482a' },
    skills: [
      { name: 'Onrush', ic: 'dash', c: '#e8a04c', max: 6, cd: [10, 8], cost: [55, 80], range: 460, cast: 'dir', noRoot: true,
        ind: { t: 'line', w: 135 }, ai: { t: 'gap', esc: true, thru: true },
        desc: lv => `Run forward behind the gong, through whatever stands in the way. Every enemy she runs through takes ${L(lv, 150, 36)} (+50% Attack) damage and is slowed 40% for 1.5s.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'hesta0', h.x, h.y, { ang });
          startDash(h, ang, 460, 1150, { w: 85, hit(e) { dmg(h, e, L(lv, 150, 36) + 0.5 * h.ad, 'phys', { skill: true }); slow(e, 0.4, 1.5); skfx(h, 'hesta0h', e.x, e.y, { ang }); } });
        } },
      { name: 'Brazen Call', ic: 'gong', c: '#ffcf7a', max: 6, cd: [14, 11], cost: [70, 95], cast: 'self',
        ind: { t: 'self', r: CALL_R }, ai: { t: 'self', r: CALL_R },
        desc: lv => `Strike the gong. Enemies within reach take ${L(lv, 100, 28)} (+40% Attack) magic damage and are taunted for ${callT(lv).toFixed(1)}s: they can do nothing but come at her and hit her with basic attacks. The Ironwill Totem does not turn this taunt away. She gains ${L(lv, 24, 6)} Armor and Magic Resist for 3s.`,
        fn(h, lv) {
          const pts = [];
          addBuff(h, { k: 'brazen', t: 3, armor: L(lv, 24, 6), mr: L(lv, 24, 6) });
          for (const e of enemiesIn(h.team, h.x, h.y, CALL_R)) {
            dmg(h, e, L(lv, 100, 28) + 0.4 * h.ad, 'magic', { skill: true });
            if (!e.dead && taunt(e, h, callT(lv, G.kit), G.kit >= 23) && e.kind === 'hero') { ringAdd(h); if (pts.length < 16) pts.push(e.x, e.y); }
          }
          skfx(h, 'hesta1', h.x, h.y, { r: CALL_R, pts });
        } },
      { name: 'Stand as One', ic: 'linked', c: '#ffe2a8', max: 3, cd: [55, 45], cost: [130, 170], cast: 'self', ult: true,
        ind: { t: 'self', r: POOL_R }, ai: { t: 'allyAoE', r: POOL_R, ult: true, rally: true },
        desc: lv => `Raise the gong. For ${POOL_T}s she and every allied hero within reach of her stand under one shield of ${L(lv, 700, 450)} (+20% of her max HP) that they all share: whatever would hurt any of them comes off it first. An ally who steps out of reach leaves it, and one who steps in joins it.`,
        fn(h, lv) {
          /* one shield object in the list of everyone it covers: what any of them is hit for comes off the same number. It keeps its own
             time (until) and goes with her; sync puts it on whoever of her side is in reach and takes it off whoever is not. */
          const pool = { v: L(lv, 700, 450) + 0.2 * h.maxHp, t: POOL_T, until: G.t + POOL_T, pool: true, by: h }; pool.v0 = pool.v;
          const sync = a => {
            const on = pool.v > 0.5;
            for (const p of G.heroes) {
              if (p.team !== h.team || p.dead) continue;
              const i = p.shields.indexOf(pool), inR = on && hyp(p.x - h.x, p.y - h.y) <= POOL_R + p.r * 0.6;
              if (inR && i < 0) { p.shields.push(pool); if (p !== h) skfx(h, 'hesta2a', p.x, p.y, { tid: p.id }); } else if (!inR && i >= 0) p.shields.splice(i, 1);
            }
            if (a && !on) { a.t = 0; skfx(h, 'hesta2x', h.x, h.y, { r: POOL_R }); }       // worn through: it is over
          };
          sync(null);
          skfx(h, 'hesta2', h.x, h.y, { r: POOL_R, dur: POOL_T });
          zone(h, h.x, h.y, { dur: POOL_T, r: POOL_R, tick: 0.2, follow: h, look: 'bronze', c: '#ffe2a8', ci: 2, hit() {}, each: sync }).pool = pool;
        } },
    ],
  },
  sorrel: {
    /* a gamekeeper of the high moor with a shardlock long gun. She has Focus where others have mana (energy), a first shot that
       counts (lethal: the Long Shot), a cloak to vanish under, a charge for whoever comes too close, and four rounds for one
       enemy a long way off. */
    name: 'Sorrel', title: 'Shardlock Sniper', cls: 'Marksman', spell: 'inspire', melee: false, rate: [2, 9, 4, 6], energy: true, lethal: true,
    base: { hp: 2300, hpG: 150, mp: ENERGY_MAX, mpG: 0, ad: 118, adG: 10.5, armor: 15, armorG: 2.5, mr: 10, mrG: 1.5, as: 0.95, asG: 2.4, range: 590, ms: 245, hpRegen: 6, mpRegen: 0 },
    look: { body: '#55624a', trim: '#c9a24a', skin: '#e0b08c', hair: '#a4502c', hat: 'cap', weapon: 'rifle', cape: '#a8452e', glow: '#7fd8ff', metal: '#8a8f98', wood: '#4a3222', pants: '#3a3530', boot: '#2e2620' },
    skills: [
      { name: 'Fade Out', ic: 'fade', c: '#9fe0c8', max: 6, cd: [5, 2.5], cost: [20, 20], cast: 'self', hush: true,
        ind: { t: 'self', r: 0 }, ai: { t: 'camo', esc: true },
        desc: lv => `Vanish under the cloak for ${CAMO_T}s. Enemies cannot see you or single you out unless they stand right beside you, though whatever covers the ground still catches you. While it lasts you move 30% faster, have +${L(lv, 30, 12)} Attack and regain Focus twice as fast. It ends when you attack, cast or are hurt, and its cooldown only starts when it ends. Under it you hold your fire until you press attack. Cast during Four Rounds, it breaks off the count and looses one round at once.`,
        fn(h, lv) { camoOn(h, lv); recalc(h); if (h.snipe) snipeBreak(h); skfx(h, 'sorrel0', h.x, h.y, {}); } },
      { name: 'Blast Charge', ic: 'charge', c: '#ffb35c', max: 6, cd: [12, 9], cost: [30, 30], range: NADE_R, cast: 'dir',
        ind: { t: 'cone', a: NADE_A }, ai: { t: 'near', r: NADE_R - 100, esc: true, back: true, peel: (h, lv) => L(lv, 150, 40) + 0.5 * h.ad },
        desc: lv => `Throw a charge that bursts in front of you: enemies in the blast take ${L(lv, 150, 40)} (+50% Attack) damage and are knocked back, and you spring back from it yourself. Cast during Four Rounds, it breaks off the count and looses one round at once.`,
        fn(h, lv, tx, ty, ang) {
          if (h.snipe) snipeBreak(h); camoOff(h);
          const c = fcos(ang), s = fsin(ang); skfx(h, 'sorrel1', h.x, h.y, { ang, r: NADE_R });
          for (const e of enemiesInCone(h.team, h.x, h.y, NADE_R, ang, NADE_A)) {
            dmg(h, e, L(lv, 150, 40) + 0.5 * h.ad, 'phys', { skill: true });
            if (!e.dead && !e.epic) { const dx = e.x - h.x, dy = e.y - h.y, d = hyp(dx, dy) || 1; pullTo(e, e.x + dx / d * NADE_PUSH, e.y + dy / d * NADE_PUSH, 0.24); skfx(h, 'sorrel1h', e.x, e.y, {}); }
          }
          if (h.rootT <= 0) { leapTo(h, h.x - c * NADE_HOP, h.y - s * NADE_HOP, 0.3, () => {}); h.leap.h = 70; }       // (held fast, she throws it all the same and stays where she is)
        } },
      { name: 'Four Rounds', ic: 'rounds', c: '#7fd8ff', max: 3, cd: [44, 36], cost: [40, 40], range: SNIPE_R, cast: 'point', ult: true, heroTarget: true,
        ind: { t: 'circle', r: 150 }, ai: { t: 'snipe', ult: true },
        desc: lv => `Take aim at one enemy hero, who is shown to your side for as long as you do, and count out ${SNIPE_N} rounds at them, one every ${SNIPE_GAP}s. You stand still for it. Each round follows its mark and deals ${L(lv, 150, 60)} (+45% Attack) damage plus 5% of the health its mark has lost, and gives you back ${SNIPE_FOCUS} Focus. A round stops in the first enemy hero it meets, so another hero can stand in its way. If the count is cut short, each round not fired takes ${Math.round(SNIPE_REFUND * 100)}% off the cooldown. Learned, it also makes every basic attack of yours ${Math.round(SNIPE_CRIT * 100 * lv)}% likelier to strike critically.`,
        fn(h, lv, tx, ty) {
          const t = nearestEnemyHero(h, tx, ty, 330, SNIPE_R + 80); if (!t) return false;
          camoOff(h);
          h.snipe = { tgt: t, n: SNIPE_N, acc: SNIPE_AIM, lv }; h.castLock = SNIPE_AIM + 0.1; h.atkTarget = null;
          for (const e of G.heroes) if (e.team !== h.team && !e.dead && hyp(e.x - h.x, e.y - h.y) <= SNIPE_R) e.revealT = Math.max(e.revealT, G.t + 2);       // through the glass she sees whoever is out there
          skfx(h, 'sorrel2', h.x, h.y, { tid: t.id }); skfx(h, 'sorrel2t', t.x, t.y, { tid: t.id });       // (one where she stands, one where her mark does: each is drawn only for whoever is looking there)
        } },
    ],
  },
  halvar: {
    /* a drover of the high passes with a storm-ram's spirit in the shard on his breastbone. As a man (0) he calls up echoes of
       himself, who fight beside him as units of their own (kind 'clone': echoSpawn, tickEcho), and drives a fist of thunder into
       whoever he reaches. As the Stormhorn (1) he is the ram itself for a while: bigger, harder to kill, with three skills of its
       own (alt) and blows that take in whoever else stands in front of him. Unlike Kiri's masks the second form is on a clock
       (forms.beast): beastOn and beastOff, not setForm. His own two skills go on cooling in the meantime, and the ultimate's
       cooldown only starts once he is a man again (cdNow: what a cast leaves on the button instead of the skill's cooldown). */
    name: 'Halvar', title: 'Stormhorn Drover', cls: 'Fighter', spell: 'sprint', melee: true, rate: [7, 7, 6, 6],
    forms: { names: ['Man', 'Stormhorn'], range: BEAST_RANGE, as: 0, tough: BEAST_TOUGH, beast: true, hp: h => beastHp(h.sk[2]) },
    base: Object.assign({}, CLASS_BASE.Fighter, { hp: 2600, ms: 262 }),
    look: { body: '#4a5a72', trim: '#c98a4a', skin: '#d9a47c', hair: '#6e2f22', hat: 'none', weapon: 'fists', cape: null, glow: '#b9a8ff', fur: '#e9e2d0', fleece: '#a9a4bc', horn: '#d8cfe8', hide: '#3a4256', pants: '#3b3440', boot: '#2a2228' },
    skills: [
      { name: 'Echoes', ic: 'echo', c: '#b9a8ff', max: 6, cd: [15, 12], cost: [60, 85], cast: 'self',
        ind: { t: 'self', r: 0 }, ai: { t: 'buff' },
        desc: lv => `Call up ${ECHO_N} echoes of yourself for ${ECHO_T}s. Each has ${Math.round(ECHO_HP * 100)}% of your health, is as hurt as you are, and strikes whatever you are fighting for ${Math.round(echoAd(lv) * 100)}% of your Attack. As they appear the three of you change places, so nobody can be sure which is you. They can be hit and killed, and they go when their time is up, when you fall or when you become the Stormhorn.`,
        fn(h, lv) {
          for (const u of echoesOf(h)) echoEnd(u);
          const a = h.face + Math.PI / 2, x0 = h.x, y0 = h.y, spots = [1, 0, -1].map(k => nearestWalkable(x0 + fcos(a) * ECHO_GAP * k, y0 + fsin(a) * ECHO_GAP * k));
          const me = (rnd() * 3) | 0; let n = 0;
          for (let i = 0; i < 3; i++) if (i !== me) echoSpawn(h, spots[i].x, spots[i].y, lv, n++);
          if (me !== 1) { h.x = spots[me].x; h.y = spots[me].y; if (h.ai) h.ai.path = null; }       // (he is one of the three, and which of them is drawn afresh every time)
          skfx(h, 'halvar0', x0, y0, { ang: h.face });
        },
        alt: { name: 'Headlong', ic: 'ramcharge', c: '#d8cfe8', cd: [6.5, 5], cost: [30, 40], cast: 'dir', range: CHARGE_D, noRoot: true,
          ind: { t: 'line', w: CHARGE_W + 10 }, ai: { t: 'line', speed: 1300, esc: true, wave: true },
          desc: lv => `Stormhorn: charge ${CHARGE_D} with your head down. Everyone in the way takes ${L(lv, 170, 38)} (+70% Attack) damage and is thrown into the air for ${CHARGE_UP}s.`,
          fn(h, lv, tx, ty, ang) {
            skfx(h, 'halvar0b', h.x, h.y, { ang });
            startDash(h, ang, CHARGE_D, 1300, { w: CHARGE_W, hit(e) { dmg(h, e, L(lv, 170, 38) + 0.7 * h.ad, 'phys', { skill: true }); if (!e.dead) knockUp(e, CHARGE_UP, 120); skfx(h, 'halvar0h', e.x, e.y, { ang }); } });
          } } },
      { name: 'Stormknuckle', ic: 'fist', c: '#e6dcff', max: 6, cd: [9, 6.5], cost: [50, 75], range: FIST_D, cast: 'dir', noRoot: true,
        ind: { t: 'line', w: FIST_W + 10 }, ai: { t: 'line', speed: 1500, r: FIST_D + 90 },
        desc: lv => `Lunge ${FIST_D} with a fist full of thunder. The first enemy you meet takes ${L(lv, 200, 46)} (+90% Attack) damage and is knocked back. Each of your echoes that is near enough follows with a blow of its own at the same enemy, for ${Math.round(FIST_ECHO * 100)}% of that.`,
        fn(h, lv, tx, ty, ang) {
          skfx(h, 'halvar1', h.x, h.y, { ang });
          startDash(h, ang, FIST_D, 1500, { w: FIST_W, stopOn: () => true, hit(e) {
            const a = L(lv, 200, 46) + 0.9 * h.ad; dmg(h, e, a, 'phys', { skill: true });
            if (!e.dead && !e.epic) pullTo(e, e.x + fcos(ang) * FIST_PUSH, e.y + fsin(ang) * FIST_PUSH, 0.22);
            skfx(h, 'halvar1h', e.x, e.y, { ang, tid: e.id });
            for (const u of echoesOf(h)) echoFist(u, e, a * FIST_ECHO);
          } });
        },
        alt: { name: 'Thunderbleat', ic: 'bellow', c: '#b9a8ff', cd: [7, 5.5], cost: [35, 45], cast: 'dir', range: BELLOW_R, noRoot: false,
          ind: { t: 'cone', a: BELLOW_A }, ai: { t: 'near', r: BELLOW_R - 110, wave: true },
          desc: lv => `Stormhorn: a bellow with the storm in it. Everyone in front of you takes ${L(lv, 190, 42)} (+60% Attack) damage and is slowed 45% for 2s.`,
          fn(h, lv, tx, ty, ang) {
            skfx(h, 'halvar1b', h.x, h.y, { ang, r: BELLOW_R, a: BELLOW_A });
            for (const e of enemiesInCone(h.team, h.x, h.y, BELLOW_R, ang, BELLOW_A)) { dmg(h, e, L(lv, 190, 42) + 0.6 * h.ad, 'phys', { skill: true }); slow(e, 0.45, 2); }
          } } },
      { name: 'Stormhorn', ic: 'ram', c: '#b9a8ff', max: 3, cd: [60, 48], cdNow: 0.6, cost: [100, 140], cast: 'self', ult: true,
        ind: { t: 'self', r: 0 }, ai: { t: 'beast', ult: true },
        desc: lv => `Let the ram out: for ${BEAST_T}s you are the Stormhorn. You gain ${beastHp(lv)} health, ${BEAST_TOUGH} Armor and Magic Resist and ${Math.round((BEAST_MS - 1) * 100)}% Move Speed, your blows reach further and strike everyone in front of you (the others for ${Math.round(BEAST_CLEAVE * 100)}%), and your three skills become the ram's own, ready at once. Your echoes go. The cooldown starts when you are a man again.`,
        fn(h, lv) { beastOn(h, lv); skfx(h, 'halvar2', h.x, h.y, { dur: BEAST_T }); },
        alt: { name: 'Skybreaker', ic: 'skyfall', c: '#e6dcff', cd: [30, 30], cdNow: null, cost: [0, 0], cast: 'point', range: SKY_R, noRoot: true,
          ind: { t: 'circle', r: SKY_AOE }, ai: { t: 'point', r: SKY_AOE, delay: 0.5, ult: true },
          desc: lv => `Stormhorn, once each time you take the form: leap up to ${SKY_R} away and come down horns first. Everyone within ${SKY_AOE} takes ${L(lv, 320, 130)} (+100% Attack) damage and is stunned for ${SKY_STUN}s.`,
          fn(h, lv, tx, ty) {
            if (h.pv.sky) return false; h.pv.sky = true; const x0 = h.x, y0 = h.y;
            leapTo(h, tx, ty, 0.55, () => { skfx(h, 'halvar2l', h.x, h.y, { r: SKY_AOE }); for (const e of enemiesIn(h.team, h.x, h.y, SKY_AOE)) { dmg(h, e, L(lv, 320, 130) + 1.0 * h.ad, 'phys', { skill: true }); stun(e, SKY_STUN); } });
            h.leap.h = 240; skfx(h, 'halvar2j', x0, y0, { x1: h.leap.x1, y1: h.leap.y1 });
          } } },
    ],
  },
  odile: {
    /* a duellist out of the glassworks, with a blade of rose glass and a looking glass slung on her back. Glasswalk takes her into
       the glass (h.gw: gwStart, gwTick, gwEnd), where nothing can reach her while she cuts whoever stands near the one she went
       for. Anneal is a kneel (h.med: anStart, anTick, anEnd) that mends her and turns blows, and whenever it ends her edge is keen
       for a while (the buff 'keen': true damage on her basic attacks). Quicksilver (the buff 'quick') is speed of foot and of
       hand that a takedown lengthens. Her passive counts her basic attacks: every fourth, her reflection strikes with her
       (h.twin: twinStrike), and each one takes a second off Glasswalk. */
    name: 'Odile', title: 'Silverglass Duelist', cls: 'Assassin', spell: 'retribution', melee: true, rate: [4, 9, 2, 8], kneel: true,
    build: ['swift', 'quickblade', 'galebow', 'totem', 'reaver', 'fang'],
    base: Object.assign({}, CLASS_BASE.Assassin, { as: 1.0, asG: 2.2 }),
    look: { body: '#4a5a7c', trim: '#dbe3f0', skin: '#e3b99a', hair: '#4b2654', hat: 'none', weapon: 'glassblade', cape: null, glow: '#ff8fc0', blade: '#ffd9ea', mirror: '#dfe8f5', pants: '#2c3548', boot: '#1f2533', acc: '#ff8fc0', sash: '#e0679c' },
    skills: [
      { name: 'Glasswalk', ic: 'facets', c: '#ff8fc0', max: 6, cd: [14, 11], cost: [55, 80], range: GW_RANGE, cast: 'point', noRoot: true,
        ind: { t: 'circle', r: 130 }, ai: { t: 'target', any: true, wave: true },
        desc: lv => `Step into the glass at an enemy (the one nearest where it is aimed, or nearest her). For most of a second nothing can touch her while she cuts up to ${GW_N} enemies standing near one another, one after the other, for ${gwBase(lv)} (+${Math.round(GW_AD * 100)}% Attack) each, half as much again to minions and monsters. With nobody new in reach the cut goes to the first of them again, for a quarter of that. She steps out beside the first, or, if the skill is pressed again while she is in the glass, back where she went in. Each of her basic attacks takes 1s off its cooldown.`,
        needs(h, tx, ty) { return !!gwPick(h, tx, ty, 80); },       // (asked before a press is sent, in a networked match: a little more reach than the cast will have, for the steps she takes meanwhile)
        fn(h, lv, tx, ty) { const t = gwPick(h, tx, ty); if (!t) return false; gwStart(h, t, lv); },
        two: { name: 'Turn Back', ic: 'back', c: '#ff8fc0', cast: 'self', quiet: true, hush: true, ind: { t: 'self', r: 0 }, ai: { t: 'none' },       // (quiet: a choice made, not a cast)
          desc: lv => `Pressed while she is in the glass: she will step out where she went in, not beside the enemy. Pressed once more: beside the enemy after all.`,
          fn(h) { return gwTurn(h); } } },
      { name: 'Anneal', ic: 'kneel', c: '#e9f0ff', max: 6, cd: [20, 15], cost: [60, 85], range: 0, cast: 'self',
        ind: { t: 'self', r: 0 }, ai: { t: 'kneel' },
        desc: lv => `Kneel for up to ${AN_T}s. She mends ${anHeal(lv)} health a second, more the worse she is hurt (twice that at death's door), and takes ${Math.round(AN_DR * 100)}% less damage (${Math.round(AN_DR_T * 100)}% less from turrets). Moving, attacking, casting or pressing it again ends it. When it ends her edge is keen for ${KEEN_T}s: her basic attacks deal ${keenBase(lv)} (+${Math.round(KEEN_AD * 100)}% of her bonus Attack) true damage on top. While she kneels, Quicksilver and a keen edge do not run down, and each second counts as an attack for Second Image.`,
        fn(h, lv) { anStart(h, lv); },
        two: { name: 'Rise', ic: 'rise', cast: 'self', ind: { t: 'self', r: 0 }, ai: { t: 'none' },
          desc: lv => `Stand up at once, her edge keen for ${KEEN_T}s.`,
          fn(h) { if (!h.med) { h.re[1] = null; return false; } anEnd(h); } } },
      { name: 'Quicksilver', ic: 'quick', c: '#ffd0e4', max: 3, cd: [60, 48], cost: [100, 140], range: 0, cast: 'self', ult: true,
        ind: { t: 'self', r: 0 }, ai: { t: 'buff', ult: true },
        desc: lv => `For ${QS_T}s she moves ${Math.round(qsMs(lv) * 100)}% faster, attacks ${qsAs(lv)}% faster and cannot be slowed. A kill or an assist while it lasts adds ${QS_MORE}s. Once it is learned, every kill or assist also takes ${Math.round(QS_CUT * 100)}% off what is left of Glasswalk's and Anneal's cooldowns.`,
        fn(h, lv) { qsStart(h, lv); } },
    ],
  },
};
/* passives: small hooks the sim calls (basic, cast, hit, hurt, dmgMul, takedown, healMul, healed; tick: every step he is alive) */
const PASSIVES = {
  bram: { name: 'Oathguard', ic: 'shield', c: '#e0b04a',
    desc: 'After casting a skill, his next basic attack within 5s deals bonus magic damage equal to 4% of his max HP and heals him for the same amount.',
    cast(h) { h.pv.charge = G.t + 5; },
    basic(h, t, ctx) { if (h.pv.charge > G.t) { h.pv.charge = 0; ctx.magic += 0.04 * h.maxHp; ctx.heal += 0.04 * h.maxHp; ctx.big = true; } } },
  thorn: { name: 'Ironhide', ic: 'armor', c: '#b9c2c8',
    desc: 'Each time an enemy hero damages him he gains 4 Armor and Magic Resist for 4s, stacking up to 6 times.',
    hurt(h) { if (G.t - (h.pv.t || -9) < 0.45) return; h.pv.t = G.t; const b = hasBuff(h, 'ironhide'), n = Math.min(6, (b ? b.n : 0) + 1); addBuff(h, { k: 'ironhide', t: 4, n, armor: 4 * n, mr: 4 * n }); } },
  kaela: { name: 'Blade Dance', ic: 'slash', c: '#ff8a5c',
    desc: 'Every third basic attack strikes for 60% more damage and heals her for 5% of her missing HP.',
    basic(h, t, ctx) { h.pv.n = (h.pv.n || 0) + 1; if (h.pv.n % 3 === 0) { ctx.amt *= 1.6; ctx.heal += 0.05 * (h.maxHp - h.hp); ctx.big = true; } } },
  rook: { name: "Mountain's Weight", ic: 'quake', c: '#ffb35c',
    desc: 'His basic attacks deal bonus physical damage equal to 2.5% of his max HP.',
    basic(h, t, ctx) { ctx.amt += 0.025 * h.maxHp; } },
  vex: { name: 'Opportunist', ic: 'skull', c: '#b98cff',
    desc: 'Deals 15% more damage to enemies below 40% HP. A kill or assist refunds half of his skill cooldowns.',
    dmgMul(h, t) { return t.hp < t.maxHp * 0.4 ? 1.15 : 1; },
    takedown(h) { for (let i = 0; i < 3; i++) h.cds[i] *= 0.5; } },
  kiri: { name: 'Two Faces', ic: 'mask', c: '#8fe6ff',
    desc: 'She wears two masks. Heron skills leave a spirit mark on what they hit (two at most, 8s). In Tiger form her attacks and skills each spend one mark for bonus magic damage of 100 (+14 per level, +40% Magic).',
    basic(h, t, ctx) { if (h.form) { ctx.magic += L(h.sk[2], 22, 14) + 0.35 * h.ap; ctx.claw = true; if (markOf(t) > 0) ctx.mark = true; } } },
  tavi: { name: 'Tempo', ic: 'slash', c: '#ffd76a', stacks: 4,
    desc: 'Every skill he casts, second casts included, adds Tempo, up to 4. At 4 his next basic attack spends it: it deals bonus damage equal to 14% of the target\'s missing HP and heals him for 60% of that bonus.',
    cast(h) { h.pv.n = Math.min(4, (h.pv.n || 0) + 1); },
    basic(h, t, ctx) { if ((h.pv.n || 0) < 4) return; h.pv.n = 0; const b = Math.min(0.14 * (t.maxHp - t.hp), t.kind === 'hero' ? 1e9 : 450); ctx.amt += b; ctx.heal += b * 0.6; ctx.big = true; skfx(h, 'taviP', t.x, t.y, {}); } },
  lyra: { name: 'Overcharge', ic: 'star', c: '#ffd76a',
    desc: 'Every third skill she casts is overcharged and deals 20% more damage.',
    cast(h) { h.pv.n = (h.pv.n || 0) + 1; if (h.pv.n % 3 === 0) addBuff(h, { k: 'overcharge', t: 3.4, aura: '#ffd76a' }); },
    dmgMul(h, t, f) { return f.skill && hasBuff(h, 'overcharge') ? 1.2 : 1; } },
  zephyr: { name: 'Tailwind', ic: 'wind', c: '#8ff0e0',
    desc: 'Hitting an enemy hero with a skill grants him 25% Move Speed for 2s and restores 2% of his max mana.',
    hit(h, t) { if (t.kind === 'hero') { addBuff(h, { k: 'tailwind', t: 2, msMul: 1.25 }); h.mp = Math.min(h.maxMp, h.mp + h.maxMp * 0.02); } } },
  orin: { name: 'Leafskip', ic: 'ricochet', c: '#d08a3e',
    desc: "The iron leaves he throws skip. A basic attack or a skill that hits jumps on to up to 4 more enemies close by, one after another: the first skip deals 50% of an attack's damage (60% of a skill's) and each skip after it 20% less. Nothing skips off a turret.",
    basic(h, t, ctx) { ctx.after = (e, amt) => { const flat = orinMarked(h, e); if (flat) { e.om.until = 0; skfx(h, 'orin1x', e.x, e.y, {}); } ricochet(h, e, amt * 0.5, { n: 4, k: 0.8, r: 340, flat, f: { basic: true }, c: h.look.glow || h.look.trim }); }; },
    dealt(h, t, a) { const b = hasBuff(h, 'poise'); if (b && a > 0) b.sh.v = Math.min(h.maxHp * 0.5, b.sh.v + a * (t.kind === 'hero' ? 0.25 : 0.1)); } },
  mira: { name: 'Barbed Arrows', ic: 'arrow', c: '#8be0c0',
    desc: 'Her basic attacks slow by 15% for 1s and deal 20% more damage to slowed or rooted enemies.',
    basic(h, t, ctx) { if (t.rootT > 0 || t.buffs.some(b => b.msMul && b.msMul < 1)) ctx.amt *= 1.2; ctx.slow = [0.15, 1]; } },
  sera: { name: 'Grace', ic: 'heal', c: '#8ff0a8',
    desc: 'Her heals are 25% stronger on allies below 40% HP, and allies she heals gain 15% Move Speed for 2s.',
    healMul(h, t) { return t.hp < t.maxHp * 0.4 ? 1.25 : 1; },
    healed(h, t) { if (t !== h) addBuff(t, { k: 'grace', t: 2, msMul: 1.15 }); } },
  miel: { name: 'Tend and Sting', ic: 'bee', c: '#ffc94a', toggle: true,       // (toggle: the temper is changed by a press of its own, see toggleMood)
    desc: 'The hive has two tempers, and which it is in is yours to choose. Tending: her heals and shields are 20% stronger. Stinging: her skills deal 20% more damage. Change it with the temper button at any time; it then keeps for a second before it can change again.',
    moods: [{ name: 'Tending', ic: 'heart', look: 'tend' }, { name: 'Stinging', ic: 'sting', look: 'sting' }], mood(h) { return tending(h) ? 0 : 1; },       // (which of the two she is in: for the view to show)
    healMul(h) { return tending(h) ? TEND_K : 1; },
    dmgMul(h, t, f) { return f.skill && !tending(h) ? STING_K : 1; } },
  hesta: { name: 'Resound', ic: 'gong', c: '#ffcf7a', stacks: RING_MAX,
    desc: `Blows ring in her gong. Each time an enemy hero damages her, and each enemy hero she taunts, adds a Ring, up to ${RING_MAX}. At ${RING_MAX} her next basic attack strikes the gong and spends them: enemies within reach of her take 40 (+5% of her max HP) magic damage and are slowed 30% for 1s, and she is shielded for the same amount for 3s.`,
    hurt(h, src, a, f) { if ((f && f.dot) || G.t - (h.pv.t || -9) < 0.5) return; h.pv.t = G.t; ringAdd(h); },
    basic(h, t, ctx) { if ((h.pv.n || 0) < RING_MAX) return; h.pv.n = 0; ctx.big = true; peal(h); } },
  sorrel: { name: 'Still Hand', ic: 'scope', c: '#7fd8ff', stacks: 1, quiet: true,       // (quiet: full, it shows on her gun and her attack button, not as a ring on the ground under her)
    desc: `She has Focus where others have mana: ${ENERGY_MAX} at most, quick to come back, and a basic attack that hits returns ${ENERGY_HIT}. When she has gone ${LETHAL_T}s without being hurt, her next basic attack is a Long Shot: it reaches ${LETHAL_RANGE} further, is ${Math.round(LETHAL_CRIT * 100)}% likelier to strike critically, deals ${Math.round(LETHAL_K * 100)}% of an attack's damage as true damage (${Math.round((LETHAL_PVE - 1) * 100)}% more again to minions and creeps) and returns twice the Focus. Casting any skill readies a Long Shot at once.`,
    cast(h) { h.pv.arm = true; },
    basic(h, t, ctx) { if (h.camo) camoOff(h); if (ctx.ls) { h.pv.arm = false; h.pv.shot = G.t; ctx.type = 'true'; ctx.amt *= LETHAL_K; if (t.kind !== 'hero') ctx.amt *= LETHAL_PVE; ctx.big = true; ctx.focus = ENERGY_HIT * 2; } else ctx.focus = ENERGY_HIT; } },
  halvar: { name: 'Ramsblood', ic: 'ram', c: '#b9a8ff',
    desc: `Every second he mends ${RAM_REGEN * 100}% of the health he is missing, twice that as the Stormhorn. As the Stormhorn his basic attacks also strike everyone else in front of him, for ${Math.round(BEAST_CLEAVE * 100)}% of the blow.`,
    tick(h, dt) { if (h.form && G.t >= h.pv.bt) beastOff(h); h.hp = Math.min(h.maxHp, h.hp + (h.maxHp - h.hp) * RAM_REGEN * (h.form ? 2 : 1) * dt); },
    basic(h, t, ctx) { if (h.form) ctx.after = (tgt, amt) => { for (const e of enemiesInCone(h.team, h.x, h.y, h.range + 110, h.face, BEAST_ARC)) if (e !== tgt) dmg(h, e, amt * BEAST_CLEAVE, 'phys', { n: 'Stormhorn', ic: 'ram' }); fx('cleave', h.x, h.y, { id: h.id, ang: h.face }); }; } },
  odile: { name: 'Second Image', ic: 'twin', c: '#ff8fc0', stacks: 3,
    desc: `Every fourth basic attack her reflection strikes with her: a second blow a moment later for ${Math.round(TWIN_K * 100)}% of the damage, with whatever rides on her blows. The count is lost ${TWIN_HOLD}s after her last attack. Each basic attack also takes 1s off Glasswalk's cooldown.`,
    basic(h, t, ctx) {
      if (h.cds[0] > 0) h.cds[0] = Math.max(0, h.cds[0] - 1);
      const n = G.t > (h.pv.tu || 0) ? 0 : (h.pv.n || 0); h.pv.tu = G.t + TWIN_HOLD;
      const kb = hasBuff(h, 'keen'); if (kb) ctx.tru = keenDmg(h, kb.lv);
      if (n >= TWIN_N - 1) { h.pv.n = 0; ctx.twin = true; } else h.pv.n = n + 1;
    },
    tick(h, dt) { if (h.pv.n && G.t > h.pv.tu) h.pv.n = 0; if (h.twin && G.t >= h.twin.at) twinStrike(h); },
    takedown(h) {
      if (h.sk[2] < 1) return;
      for (let i = 0; i < 2; i++) h.cds[i] *= 1 - QS_CUT;
      const b = hasBuff(h, 'quick'); if (b) { b.t += QS_MORE; fx('quickMore', h.x, h.y, { id: h.id, v: QS_MORE }); }
    } },
};
/* a sprung ward (or an arrow that carried one): it clings to its catch for a second, then bursts around them */
function wardBurst(h, lv, e) {
  slow(e, 0.7, 1); skfx(h, 'kiri0l', e.x, e.y, { tid: e.id, dur: 1 });
  delayAoE(h, e.x, e.y, { r: 210, delay: 1, follow: e, look: 'ward', ci: 0, n: 'kiri0x', hit(u) { dmg(h, u, L(lv, 250, 58) + 0.8 * h.ap, 'magic', { skill: true }); mark(h, u); } });
}
/* Orin's mark, left by Crippling Shot for 4s: his next basic attack on a marked enemy spends it and its skips keep their full strength */
function orinMark(h, e) {
  if (e.dead || e.kind === 'turret' || e.kind === 'crystal') return;
  const im = immuneOf(e); if (im) { blocked(e, im); return; }
  e.om = { until: G.t + 4, by: h.id }; skfx(h, 'orin1m', e.x, e.y, { tid: e.id, dur: 4, until: e.om.until });
}
function orinMarked(h, e) { return !!(e.om && e.om.until > G.t && e.om.by === h.id); }
/* Bramble Snare on a hero: the pod clings and roots; 0.9s later it bursts around them and throws a seed at every other enemy hero
   within reach, which does the same there. S belongs to the whole cast: who has been caught, who has been hurt, how many bursts. */
function orinSnare(h, lv, e, S) {
  if (e.dead) return;
  root(e, 1.4); skfx(h, 'orin2h', e.x, e.y, { tid: e.id, dur: 0.9, held: e.rootT > 0 }); sfx('chain', e.x, e.y);
  const base = () => L(lv, 300, 150) + 0.9 * h.ad;
  delayAoE(h, e.x, e.y, { r: 250, delay: 0.9, follow: e, look: 'bramble', c: '#ffcf5c', ci: 2, n: 'orin2x',
    hit(u) { const m = S.hm[u.id] ? 0.4 : 1; S.hm[u.id] = 1; dmg(h, u, base() * m, 'phys', { skill: true }); },
    done(a) {
      if (!S.n++) ricochet(h, e, base() * 0.6, { n: 4, k: 0.8, r: 340, f: { skill: true }, c: '#ffcf5c', ci: 2 });
      for (const u of G.heroes) {
        if (u.team === h.team || u.dead || u.locked || S.got[u.id] || hyp(u.x - a.x, u.y - a.y) > 430) continue;
        S.got[u.id] = 1;
        G.projs.push({ homing: true, x: a.x, y: a.y, tgt: u, speed: 1150, team: h.team, src: h, look: 'seed', c: '#ffcf5c', ci: 2, cx: G.cx, ang: fatan2(u.y - a.y, u.x - a.x), quiet: true, onHit(t) { orinSnare(h, lv, t, S); } });
      }
    } });
}
const HERO_KEYS = Object.keys(HEROES);
/* ---------------- skins ----------------
   Index 0 is the hero's own look. A skin overrides parts of the palette (look), recolours the three skills (sk),
   bolts extra pieces onto the model (parts) and may leave a faint trail of motes (aura). Purely cosmetic. */
const SKINS = {
  bram: [
    { name: 'Oathbound' },
    { name: 'Emberforged', look: { body: '#4f3d3a', trim: '#ff9a3c', cape: '#8a2414', acc: '#ffb35c', metal: '#4a4040', pants: '#2e2422', boot: '#3a2c28', wglow: '#ff8a2e', glow: '#ffb35c' },
      sk: ['#ff9a3c', '#ffc46a', '#ff5a2e'], parts: ['pauldrons', 'plume'], aura: '#ff7a2e' },
    { name: 'Glacier Sentinel', look: { body: '#c4dcec', trim: '#4fc3f7', cape: '#2a6f9a', acc: '#bff0ff', metal: '#e8f4fb', pants: '#587890', boot: '#7fa2ba', wglow: '#8fe6ff', glow: '#bff0ff' },
      sk: ['#8fe6ff', '#bff0ff', '#4fb8ff'], parts: ['shards', 'spines'], aura: '#bff0ff' },
  ],
  thorn: [
    { name: 'Chainbreaker' },
    { name: 'Abyssal Reaver', look: { body: '#1f4a5c', trim: '#6fe6d6', cape: '#12303c', metal: '#2f6074', beard: '#12303c', pants: '#16323c', boot: '#1c3a44', wglow: '#6fe6d6', glow: '#6fe6d6' },
      sk: ['#6fe6d6', '#4fc3f7', '#3f8fff'], parts: ['visor', 'spines'], aura: '#6fe6d6' },
    { name: 'Sunforged', look: { body: '#b8862e', trim: '#fff1b8', cape: '#8a2a1c', metal: '#e8c868', beard: '#f4ead2', pants: '#6a4a1c', boot: '#8a6424', wglow: '#ffd76a', glow: '#ffe08a' },
      sk: ['#ffd76a', '#ffb35c', '#fff1b8'], parts: ['banner', 'gem'], aura: '#ffd76a' },
  ],
  kaela: [
    { name: 'Crimson Duelist' },
    { name: 'Moonblade', look: { body: '#2b3a6b', trim: '#cfe0ff', hair: '#dfe9ff', cape: '#18203f', blade: '#bfe0ff', acc: '#7ab8ff', wglow: '#7ab8ff', glow: '#9fc8ff', pants: '#1c2238', boot: '#232a45' },
      sk: ['#7ab8ff', '#cfe0ff', '#5f8fff'], parts: ['scarf', 'gem'], aura: '#9fc8ff', wing: 'mote' },
    { name: 'Blossom Ronin', look: { body: '#f4eee8', trim: '#ff8fb0', hair: '#3a2a3a', cape: '#d9567f', blade: '#ffe9f1', acc: '#ff8fb0', wglow: '#ff9ac0', glow: '#ffb3cc', pants: '#5a3a4a', boot: '#3a2a32' },
      sk: ['#ff9ac0', '#ffc8dc', '#ff5d8f'], parts: ['banner', 'scarf'], aura: '#ffb3cc', wing: 'petal' },
  ],
  rook: [
    { name: 'Mountain Breaker' },
    { name: 'Magma Breaker', look: { body: '#3a2a26', trim: '#ff7a2e', hair: '#ff9a3c', skin: '#8f6e5c', metal: '#3a302c', wglow: '#ff5a1e', glow: '#ff9a3c', pants: '#2a2020', boot: '#1f1818' },
      sk: ['#ff7a2e', '#ffb35c', '#ff4a1e'], parts: ['pauldrons', 'gem'], aura: '#ff7a2e' },
    { name: 'Stormforged', look: { body: '#3f5f8a', trim: '#ffe36a', hair: '#e8f0ff', metal: '#9fb4d0', wglow: '#8fd0ff', glow: '#bfe4ff', pants: '#2c4263', boot: '#22324c' },
      sk: ['#8fd0ff', '#ffe36a', '#5fb0ff'], parts: ['pauldrons', 'shards'], aura: '#bfe4ff' },
  ],
  vex: [
    { name: 'Dusk Stalker' },
    { name: 'Crimson Phantom', look: { body: '#2a1418', trim: '#ff4a5a', cape: '#1a0c10', blade: '#ffd0d4', wglow: '#ff3a4a', glow: '#ff6a78' },
      sk: ['#ff4a5a', '#ff8a94', '#ff2a3a'], parts: ['scarf'], aura: '#ff4a5a' },
    { name: 'Neon Circuit', look: { body: '#10262b', trim: '#3dffd0', cape: '#0b1a1e', blade: '#d8fff6', wglow: '#3dffd0', glow: '#7dffe0' },
      sk: ['#3dffd0', '#7df9ff', '#b6ff5c'], parts: ['visor', 'spines'], aura: '#3dffd0' },
    /* Epic: nothing here is a recolour. fx: its own effect for every skill, hit, death and recall; clips and style: its own moves;
       proj: its own missile; hover: it never touches the ground. */
    { name: 'Eclipse Herald', epic: true, look: { body: '#15101f', trim: '#ffc45a', cape: '#0a0712', blade: '#fff3d0', wglow: '#ffb238', glow: '#ffd98a', pants: '#0f0b18', boot: '#1a1326', acc: '#ff7a2e', belt: '#8a5a1e', fore: '#231a33', crescent: 1 },
      sk: ['#ffc45a', '#ff8a3c', '#fff1c4'], parts: ['corona', 'wingblades', 'eclipsed'], aura: '#ffc45a',
      fx: 'E', clips: ['hurlE', 'riftE', 'eclipseE'], style: 'reap', hover: 0.2, stride: 0.2, proj: { dart: 'eclipse' } },
  ],
  kiri: [
    { name: 'Twin-Mask Medium' },
    { name: 'Midnight Festival', look: { body: '#232a52', trim: '#ffd27a', cape: '#7a2f6b', sash: '#ffd27a', heron: '#ff9ad2', tiger: '#b48cff', glow: '#ff9ad2', pants: '#141832', boot: '#0f1226', hair: '#f1e9ff' },
      sk: ['#ff9ad2', '#ffc4e6', '#b48cff'], parts: ['gem', 'scarf'], aura: '#ff9ad2' },
    { name: 'Snow Crane', look: { body: '#ffffff', trim: '#c9272d', cape: '#cfe6f2', sash: '#c9272d', heron: '#bfe9ff', tiger: '#ffd23c', glow: '#bfe9ff', pants: '#3a4654', boot: '#28323c', hair: '#e9eef2' },
      sk: ['#bfe9ff', '#e6f7ff', '#ffd23c'], parts: ['gem', 'ruff'], aura: '#bfe9ff' },
  ],
  tavi: [
    { name: 'Dune Strider' },
    { name: 'Night Caravan', look: { body: '#1b1f3d', trim: '#c9d2ff', cape: '#12152b', wrap: '#2c3166', sash: '#6b4fd6', blade: '#dfe4ff', glow: '#a99bff', wglow: '#a99bff', pants: '#141832', boot: '#0f1226' },
      sk: ['#c9d2ff', '#9a8cff', '#ff9ae0'], parts: ['gem', 'scarf'], aura: '#a99bff' },
    { name: 'Oasis Sentinel', look: { body: '#f1ece0', trim: '#ffd23c', cape: '#157a5e', wrap: '#1f8a6b', sash: '#0f5f4a', blade: '#f4fff6', glow: '#6dffc0', wglow: '#6dffc0', pants: '#cfc6ae', boot: '#6a5a3a' },
      sk: ['#ffd23c', '#6dffc0', '#ffe9a0'], parts: ['pauldrons', 'gem'], aura: '#6dffc0' },
    /* epic: a runner between the stars. Its own head and blades (look.comet), a halo and streamers, and its own effects for every
       skill, attack, cast, recall and death (fx 'C'); what he throws flies as comets and hangs as stars joined in a constellation. */
    { name: 'Starfall Courier', epic: true, look: { body: '#141a3c', trim: '#6fe9ff', cape: '#3b2f8f', wrap: '#1c2350', sash: '#6a4fd6', blade: '#f4fbff', glow: '#6fe9ff', wglow: '#8ff0ff', pants: '#0e1230', boot: '#0a0d24', acc: '#ff7ad9', hair: '#0b0e22', comet: 1 },
      sk: ['#6fe9ff', '#b9a8ff', '#ff9ae6'], parts: ['starhalo', 'cometcape', 'constellation'], aura: '#6fe9ff', fx: 'C', hover: 0.12, stride: 0.55, proj: { ring: 'comet' } },
  ],
  lyra: [
    { name: 'Starbound' },
    { name: 'Solstice Oracle', look: { body: '#f2ead8', trim: '#ffb347', hair: '#7a3f1e', cape: '#c9642a', glow: '#ffd76a', pants: '#c9b890', boot: '#8a5a2b' },
      sk: ['#ffb347', '#ffe08a', '#ff8a3c'], parts: ['halo', 'gem'], aura: '#ffd76a' },
    { name: 'Void Scholar', look: { body: '#2a1f45', trim: '#d07aff', hair: '#e8e0ff', cape: '#150f26', glow: '#ff6ad5', pants: '#1c1530', boot: '#150f26' },
      sk: ['#d07aff', '#ff6ad5', '#9a5cff'], parts: ['shards', 'gem'], aura: '#d07aff' },
  ],
  zephyr: [
    { name: 'Stormcaller' },
    { name: 'Thunder Sovereign', look: { body: '#2c2f6b', trim: '#ffd76a', hair: '#fff3c0', cape: '#191b45', glow: '#ffe36a', pants: '#1c1e4a', boot: '#ffe9a0' },
      sk: ['#ffe36a', '#fff3c0', '#ffc23c'], parts: ['pauldrons', 'halo'], aura: '#ffe36a' },
    { name: 'Aurora Drifter', look: { body: '#12324a', trim: '#7dffb5', hair: '#c9ffe4', cape: '#3a1f5c', glow: '#7dffb5', pants: '#0e2638', boot: '#c9ffe4' },
      sk: ['#7dffb5', '#c58aff', '#5ce0ff'], parts: ['scarf', 'shards'], aura: '#7dffb5' },
  ],
  orin: [
    { name: 'Ironleaf Warden' },
    { name: 'Petalfall', look: { body: '#efe2e7', trim: '#e3b057', hair: '#f6eef0', cape: '#a13d62', blade: '#fff3f8', wglow: '#ff8fc4', glow: '#ffb3d6', pants: '#5a3848', boot: '#3d2632' },
      sk: ['#ff9ac8', '#ffd0e6', '#ffe08a'], parts: ['scarf', 'gem'], aura: '#ffc2dd' },
    { name: 'Cinderleaf', look: { body: '#2a2224', trim: '#ff6a2e', hair: '#1a1416', cape: '#6a1810', acc: '#ffb35c', blade: '#4a3530', wglow: '#ff7a2e', glow: '#ff9a3c', pants: '#1f1a1c', boot: '#1a1416' },
      sk: ['#ff7a2e', '#ffb35c', '#ff4a1e'], parts: ['shards', 'scarf'], aura: '#ff7a2e' },
  ],
  mira: [
    { name: 'Wildwood Trapper' },
    { name: 'Jade Huntress', look: { body: '#1f6a55', trim: '#f2d27a', hair: '#1c1c1c', cape: '#0f3f33', wood: '#2a5a48', wglow: '#7dffb5', glow: '#a8ffd0', pants: '#143f33', boot: '#0f2f26' },
      sk: ['#7dffb5', '#f2d27a', '#3de0a0'], parts: ['crown', 'gem'], aura: '#7dffb5' },
    { name: 'Starlight Scout', look: { body: '#232a5c', trim: '#cfe0ff', hair: '#e6ecff', cape: '#141838', wood: '#3a4380', wglow: '#cfe0ff', glow: '#cfe0ff', pants: '#181d42', boot: '#10142e' },
      sk: ['#cfe0ff', '#9fb8ff', '#fff3c0'], parts: ['shards', 'scarf'], aura: '#cfe0ff' },
  ],
  sera: [
    { name: 'Dawn Chorister' },
    { name: 'Twilight Seraph', look: { body: '#2c2440', trim: '#b98cff', hair: '#e0d6ff', cape: '#1a1430', glow: '#d6a8ff', wing: '#4a3d73', halo: '#b98cff', wingN: 5, pants: '#1f1930', boot: '#3a2f5c' },
      sk: ['#b98cff', '#ff9ae0', '#8f6aff'], parts: ['gem'], aura: '#b98cff' },
    { name: 'Verdant Dryad', look: { body: '#eef2e2', trim: '#6fc45a', hair: '#3f8a4a', cape: '#3f7a3a', glow: '#b8ff8a', wing: '#a8d98a', halo: '#b8ff8a', pants: '#b9c9a0', boot: '#5a7a3a' },
      sk: ['#8fe07a', '#d8ffa0', '#5fc45a'], parts: ['antlers', 'scarf'], aura: '#b8ff8a' },
  ],
  miel: [
    { name: 'Amber Hivekeeper' },
    { name: 'Royal Jelly', look: { body: '#3a2456', trim: '#ffd76a', hair: '#f1e4ff', hat: 'tiara', cape: '#241238', glow: '#d59bff', band: '#ffd76a', straw: '#8a5fd0', veil: '#d9c2f5', glove: '#5a3f86', wood: '#4a3470', pants: '#2a1a40', boot: '#1c1030', tend: '#f1e4ff', sting: '#ff6ad0', bee: ['#ffd76a', '#4a2a7a'] },
      sk: ['#c98cff', '#ffd76a', '#ff8fe0'], aura: '#d59bff' },
    { name: 'Frost Apiary', look: { body: '#e6f3fa', trim: '#6fc3e8', hair: '#dfeaf2', cape: '#2f6f96', glow: '#aee9ff', band: '#2f6f96', straw: '#cfe9f5', veil: '#f4fbff', glove: '#7fa9c0', wood: '#5c7f96', pants: '#5c8298', boot: '#35586c', tend: '#e8fbff', sting: '#4fa8ff', bee: ['#e6f6ff', '#2f6f96'] },
      sk: ['#8fe0ff', '#dff6ff', '#6fb8ff'], aura: '#aee9ff' },
  ],
  hesta: [
    { name: 'Brazen Herald' },
    { name: 'Storm Drum', look: { body: '#27305e', trim: '#cfd8ff', hair: '#e8ecff', cape: '#141a3c', metal: '#8fa3e6', glow: '#9fd0ff', plume: '#6f9bff', pants: '#161b3a', boot: '#20264a', wglow: '#9fd0ff' },
      sk: ['#9fd0ff', '#dfe9ff', '#7fa8ff'], parts: ['pauldrons', 'gem'], aura: '#9fd0ff' },
    { name: 'Lantern Festival', look: { body: '#a3241f', trim: '#ffd76a', hair: '#1a1210', cape: '#f2a23a', metal: '#f2c14e', glow: '#ffe08a', plume: '#ffd76a', pants: '#5a1814', boot: '#3a1210', wglow: '#ffb347' },
      sk: ['#ffb347', '#ffe08a', '#ff7a4a'], parts: ['banner', 'scarf'], aura: '#ffd76a' },
  ],
  sorrel: [
    { name: 'Shardlock Sniper' },
    { name: 'Snowline Scout', look: { body: '#e4ecf2', trim: '#7fb0d8', hair: '#f1f4f7', cape: '#3d6f9c', glow: '#bfeaff', metal: '#c9d6e2', wood: '#8a97a6', pants: '#8ea2b4', boot: '#566a7c', wglow: '#bfeaff' },
      sk: ['#bfeaff', '#8fc8ff', '#e8f8ff'], parts: ['gem'], aura: '#bfeaff' },
    { name: 'Ember Poacher', look: { body: '#2b2424', trim: '#ff8a3c', hair: '#161212', cape: '#7a1f14', glow: '#ffb35c', metal: '#4a4040', wood: '#2a1c18', pants: '#1c1717', boot: '#141010', wglow: '#ff7a2e' },
      sk: ['#ff9a4a', '#ffc46a', '#ff5a2e'], parts: ['visor'], aura: '#ff7a2e' },
  ],
  halvar: [
    { name: 'Stormhorn Drover' },
    { name: 'Snowpass Drover', look: { body: '#dfe7ee', trim: '#7fb0d8', hair: '#f2f4f6', glow: '#bfeaff', fur: '#ffffff', fleece: '#e6eef5', horn: '#eaf6ff', hide: '#8fa6bb', pants: '#8ea2b4', boot: '#566a7c' },
      sk: ['#bfeaff', '#e8f8ff', '#8fc8ff'], parts: ['gem'], aura: '#bfeaff' },
    { name: 'Greenmoor Drover', look: { body: '#3f5a3c', trim: '#d9b45a', hair: '#2a1c14', glow: '#a8f08a', fur: '#cdbf9a', fleece: '#8f9a80', horn: '#e9f5c9', hide: '#2e3a2a', pants: '#2f2a22', boot: '#1f1a14' },
      sk: ['#a8f08a', '#e3ffc9', '#6fd86a'], parts: ['visor'], aura: '#a8f08a' },
    /* epic: a drover of the night sky. His sheepskin is the dark between the stars with stars caught in it and the Ram's own few
       pinned across his chest; the ram he becomes is that constellation walking, gold-horned; and what is thunder in the other
       three is starlight here: its own effect for every skill, for his blows and his recall (fx 'S'). */
    { name: 'Starherd Drover', epic: true, look: { body: '#1b2150', trim: '#f2d27a', hair: '#e9eeff', glow: '#ffe9a8', wglow: '#fff3c4', fur: '#2b3478', fleece: '#232c6c', horn: '#f2d27a', hide: '#11163c', pants: '#12163a', boot: '#0b0e26', acc: '#9fb4ff', stars: 1 },
      sk: ['#ffe9a8', '#fff6d8', '#9fb4ff'], parts: ['starherd'], aura: '#ffe9a8', fx: 'S' },
  ],
  odile: [
    { name: 'Silverglass Duelist' },
    { name: 'Smokeglass Duelist', look: { body: '#4a3a32', trim: '#d9a55a', hair: '#e8e0d0', glow: '#ffb45a', blade: '#ffe2b8', mirror: '#8a7a6c', pants: '#2e2522', boot: '#1c1614', acc: '#ffb45a', sash: '#c9782e' },
      sk: ['#ffb45a', '#ffe8c8', '#ffd08a'], parts: ['scarf'], aura: '#ffb45a' },
    { name: 'Seaglass Duelist', look: { body: '#2a6068', trim: '#e6f4ef', hair: '#f0f4f2', glow: '#7ff0d0', blade: '#d9fff2', mirror: '#bfe8de', pants: '#1c4046', boot: '#102528', acc: '#7ff0d0', sash: '#3fb89c' },
      sk: ['#7ff0d0', '#effff9', '#b8ffe8'], parts: ['gem'], aura: '#7ff0d0' },
  ],
};
const _looks = {};
function heroLook(key, skin) { const k = key + (skin | 0); return _looks[k] || (_looks[k] = Object.assign({}, HEROES[key].look, (SKINS[key][skin | 0] || {}).look)); }
function skinColor(key, skin, i) { const s = SKINS[key][skin | 0]; return (s && s.sk && s.sk[i]) || HEROES[key].skills[i].c; }
/* distinct cast sounds per skill (0 = default) */
const SKILL_SND = { bram: ['whoosh', 'guard', 0, 'slam'], thorn: ['chain', 'slam', 0], kaela: ['slash', 'whoosh', 'roar', 'slash', 0, 0, 0, 0, 0, 'slash'], rook: ['whoosh', 'roar', 'wind'], vex: ['dark', 'dark', 0], kiri: ['holy', 'arrow', 'wind', 0, 0, 0, 'whoosh', 'slash', 'roar'], tavi: ['arrow', 'slash', 'whoosh', 'whoosh', 'chain', 'whoosh'],
  lyra: ['bolt', 'ice', 0], zephyr: ['wind', 'wind', 'thunder'], orin: ['guard', 'slash', 'whoosh'], mira: ['arrow', 0, 'holy'], sera: ['holy', 'chain', 'holy'], miel: ['buzz', 'holy', 'buzz'], hesta: ['whoosh', 'gong', 'gong'], sorrel: ['wind', 'boom', 'cock'], halvar: ['holy', 'slam', 'roar', 0, 0, 0, 'whoosh', 'roar', 'slam'], odile: ['slash', 'holy', 'wind'] };
for (const k of HERO_KEYS) HEROES[k].passive = PASSIVES[k];
for (const k of HERO_KEYS) {
  const d = HEROES[k]; d.key = k; d.base = d.base || CLASS_BASE[d.cls]; d.build = d.build || BUILDS[d.cls]; d.pos = POS_OF[d.cls];       // (build: a hero's own, where the class's would not suit: Odile's is all speed of hand)
  if (d.roles) for (const r of d.roles) r.build = BUILDS[r.cls];       // (the first role is the hero's own class: its lane and build are the hero's)
  d.skills.forEach((s, i) => { s.snd = SKILL_SND[k][i] || null; if (s.three) s.three = Object.assign({}, s, s.three, { two: null, three: null, stage: 3, snd: SKILL_SND[k][i + 9] || s.snd }); if (s.two) s.two = Object.assign({}, s, s.two, { two: null, three: null, stage: 2, snd: SKILL_SND[k][i + 3] || s.snd }); if (s.alt) s.alt = Object.assign({}, s, s.alt, { alt: null, two: null, form: 1, snd: SKILL_SND[k][i + 6] || s.snd }); });
}

/* These two numbers as they stood for every hero up to KIT_V 21. They are read off the skills as written, so rewriting a skill moves
   them; a match of an older kit is played by the numbers its bots went by then (defMagic, defCc). */
const DEF_21 = { bram: [0.2222222222222222, 2], thorn: [0.6666666666666666, 2], kaela: [0, 3], rook: [0, 0], vex: [0, 0], tavi: [0, 0], kiri: [1, 1], lyra: [1, 2], zephyr: [1, 1], orin: [0, 2], mira: [0, 1], sera: [1, 1], miel: [1, 0], hesta: [0.2857142857142857, 1] };
/* What each hero is to play against, worked out from its own skills: magic is the share of its damage that is magic (0..1), ccN how
   many of its skills stun, root, pull or throw. The bots read these when they choose what to buy. */
for (const k of HERO_KEYS) {
  const d = HEROES[k], caster = d.cls === 'Mage' || d.cls === 'Support'; let m = 0, p = caster ? 0 : 1.5, cc = 0;
  for (const s of d.skills) for (const q of [s, s.two, s.three, s.alt]) { if (!q) continue; const src = String(q.fn); m += (src.match(/'magic'/g) || []).length; p += (src.match(/'phys'/g) || []).length; if (/stun|root|pull|into the air|knock|taunt/i.test(q.desc(1))) cc++; }
  d.magic = m + p > 0 ? m / (m + p) : caster ? 1 : 0; if (caster && d.magic < 0.6) d.magic = 0.6; d.ccN = cc;
  { const q = DEF_21[k]; d.magic21 = q ? q[0] : d.magic; d.ccN21 = q ? q[1] : d.ccN; }
}
/* difficulty presets for bots */
const DIFFS = [
  { name: 'Easy',   think: 0.55, aim: 0.45, skill: 0.45, aggro: 0.75, dive: false, farm: 0.6,  org: 1 },       // org: how much the bots play as a team (see teamPlan)
  { name: 'Normal', think: 0.32, aim: 0.22, skill: 0.75, aggro: 1.0,  dive: false, farm: 0.85, org: 2 },
  { name: 'Hard',   think: 0.18, aim: 0.08, skill: 0.95, aggro: 1.2,  dive: true,  farm: 1.0,  org: 3 },
];
