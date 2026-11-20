/* ============================================================
   simulation core (no DOM). One global match state: G
   ============================================================ */
let G = null;
function rnd() { let t = (G.seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function fx(k, x, y, o) { if (G.fxOn) { const e = o ? Object.assign({ k, x, y }, o) : { k, x, y }; G.fx.push(e); } }
function skfx(h, n, x, y, o) { if (G.fxOn) G.fx.push(Object.assign({ k: 'sk', n, x, y, id: h.id }, o)); }      // a named skill effect, coloured by the caster's skin
function sfx(n, x, y) { if (G.fxOn) G.sfx.push({ n, x, y }); }
function ev(o) { o.time = G.t; G.events.push(o); if (G.events.length > 200) G.events.shift(); if (G.rec) recMark(G.rec, o); }

const MINION = {
  melee:  { hp: 1150, ad: 52, range: 110, asp: 0.9, r: 22, ms: 235, gold: 36, xp: 42, armor: 10 },
  ranged: { hp: 780,  ad: 78, range: 470, asp: 0.8, r: 20, ms: 235, gold: 30, xp: 34, armor: 5 },
  siege:  { hp: 2100, ad: 105, range: 560, asp: 0.6, r: 30, ms: 225, gold: 70, xp: 70, armor: 25 },
  lord:   { hp: 9500, ad: 330, range: 240, asp: 0.75, r: 80, ms: 215, gold: 250, xp: 300, armor: 60 },
};
const MONSTER = {
  sprite:  { name: 'Mosskin',        hp: 1250, ad: 52,  range: 110, asp: 0.9, r: 26, gold: 46,  xp: 60,  armor: 10, leash: 480 },
  warden:  { name: 'Stonehide',      hp: 2500, ad: 74,  range: 130, asp: 0.8, r: 42, gold: 78,  xp: 112, armor: 18, leash: 500 },
  skitter: { name: 'Reedskitter',    hp: 1900, ad: 44,  range: 120, asp: 0.9, r: 34, gold: 64,  xp: 84,  armor: 12, leash: 460, mend: 0.1 },
  azure:   { name: 'Azure Golem',    hp: 3300, ad: 88,  range: 130, asp: 0.8, r: 46, gold: 96,  xp: 140, armor: 20, leash: 520 },
  crimson: { name: 'Crimson Brute',  hp: 3300, ad: 88,  range: 130, asp: 0.8, r: 46, gold: 96,  xp: 140, armor: 20, leash: 520 },
  turtle:  { name: 'Riverback',      hp: 7500, ad: 140, range: 170, asp: 0.7, r: 74, gold: 0,   xp: 0,   armor: 35, leash: 560, epic: true },
  lord:    { name: 'The Shardlord',  hp: 13000, ad: 230, range: 200, asp: 0.7, r: 86, gold: 0,  xp: 0,   armor: 50, leash: 560, epic: true },
};
const XP_SHARE = [1, 0.62, 0.46, 0.38, 0.32];
const xpNeed = lv => 150 + 42 * (lv - 1);

/* ---------------- match setup ---------------- */
/* opts.mode 'duel': one hero a side on the middle lane and nothing else on the map (two turrets a side, no camps, no great beasts;
   and see duelRush).
   opts.humans: a networked match. [{ team, hero, spell, skin, role }], one for each seat, in the order every machine has them in;
   each seat's hero is moved by the frames its player sends (netApply), the other places are bots. opts.me: the seat at this
   machine (which hero the screen follows: nothing in the sim depends on it). opts.det: sines and cosines that are the same on every
   machine (see mathSet); a networked match always has it. */
function newGame(opts) {
  const duel = opts.mode === 'duel'; mathSet(!!opts.det);
  G = {
    seed: (opts.seed || 1) >>> 0, seed0: (opts.seed || 1) >>> 0, t: 0, uid: 0, fxOn: opts.fx !== false,
    units: [], heroes: [], turrets: [], crystals: [], projs: [], areas: [], camps: [], cx: null,
    fx: [], sfx: [], events: [], pending: [],
    kills: [0, 0], over: false, winner: -1, firstBlood: false,
    waveT: 10, waveN: 0, visT: 0, frontT: 0,
    player: null, diff: opts.diff == null ? 1 : opts.diff,
    input: newInput(),
    laneFront: [{}, {}], epic: { turtle: null, lord: null, turtleT: 120, lordT: 480, turtleDone: false },
    alert: [null, null], plateOff: false, plateWarn: false, orgOv: opts.org || null,       // orgOv: [blue, red] team-play levels forced on the bots (tests)
    kit: opts.kit || KIT_V, det: !!opts.det, duel, lanes: duel ? DUEL_LANES : LANE_NAMES, lanesM: duel ? DUEL_LANES : LANES_M, humans: null, net: null, botDiff: null,       // lanes: the lanes in play (lanesM: the middle one first)
    /* practice: the player alone on the map, no waves unless asked for, crystals sealed. free: no cooldowns, mana never runs out.
       sum/n/t0/last: damage the player has dealt to heroes in the current burst (a burst ends after 3 quiet seconds) */
    practice: opts.practice ? { free: false, waves: false, sum: 0, n: 0, t0: 0, last: -9 } : null,
  };
  if (G.practice) G.waveT = 1e9;
  if (duel) { G.epic.turtleDone = true; G.epic.lordT = 1e12; }       // no great beasts in a duel
  // structures
  for (const t of MAP.turrets) {
    if (duel && (t.lane !== 'mid' || t.tier === 2)) continue;       // a duel: the middle lane's outer and inner turrets only
    const s = newUnit('turret', t.team, t.x, t.y, { r: 62, maxHp: TURRET_HP[t.tier], armor: 45, mr: 45, ad: TURRET_AD[t.tier], range: TURRET_RANGE, asp: 1.0, lane: t.lane, tier: t.tier, ramp: 0, tgt: null });
    s.hp = s.maxHp; s.plate = t.tier === 1 ? PLATES * PLATE_HP : 0; G.turrets.push(s);
  }
  for (const team of [BLUE, RED]) {
    const c = newUnit('crystal', team, MAP.crystal[team].x, MAP.crystal[team].y, { r: 105, maxHp: CRYSTAL_HP, armor: 50, mr: 50, ad: CRYSTAL_AD, range: CRYSTAL_RANGE, asp: 1.0, ramp: 0, tgt: null });
    c.hp = c.maxHp; G.crystals[team] = c;
  }
  updateStructureLocks();
  // heroes
  const need = POS_KEYS;
  const fits = { top: ['Fighter'], jungle: ['Assassin', 'Fighter'], mid: ['Mage'], carry: ['Marksman'], roam: ['Tank', 'Support'] };
  /* keys: the heroes to draw from. A recording made when there were fewer is played with the heroes there were (opts.roster: how many).
     A hero with roles can be drawn for the place of any of them, and plays the role of the place it was drawn for; the player's
     hero plays the role the player chose (opts.player.role).
     A player may ask for a place (pos: one of POS_KEYS) whatever the hero: it is theirs, and the bots of their side take the places
     nobody asked for. Two players of one side may ask for the same place; the side then has more places open than bots to fill
     them, and goes without the ones it can best do without (POS_SPARE, first to last). */
  const keys = opts.roster ? HERO_KEYS.slice(0, opts.roster) : HERO_KEYS;
  const roleAt = (k, pos) => { const rs = HEROES[k].roles; if (rs) for (let i = 0; i < rs.length; i++) if (rs[i].pos === pos) return i; return -1; };
  const roleOf = (def, i) => def.roles ? Math.max(0, Math.min(def.roles.length - 1, i | 0)) : 0, posOf = (def, i) => def.roles ? def.roles[i].pos : def.pos;
  const humans = opts.humans || null; if (humans) G.humans = humans.map(() => null);
  for (const team of [BLUE, RED]) {
    const taken = {}, roster = [];
    const left = opts.practice ? [] : duel ? ['mid'] : need.slice(), cap = left.length;
    if (humans) humans.forEach((p, seat) => {       // each takes the place it asked for; one that asked for none, the place its hero is made for, or the first that is free
      if (p.team !== team || roster.length >= cap || taken[p.hero]) return;
      const def = HEROES[p.hero], ri = roleOf(def, p.role), asked = !duel && need.includes(p.pos) ? p.pos : null, want = duel ? 'mid' : posOf(def, ri), pos = asked || (left.includes(want) ? want : left[0]); taken[def.key] = 1;
      roster.push({ key: def.key, pos, seat, spell: p.spell, skin: p.skin | 0, role: ri, name: typeof p.name === 'string' && p.name ? p.name.slice(0, 14) : '' }); if (left.includes(pos)) left.splice(left.indexOf(pos), 1);
    });
    else if (team === BLUE && opts.player) {
      const def = HEROES[opts.player.hero], ri = roleOf(def, opts.player.role), pos = duel ? 'mid' : need.includes(opts.player.pos) ? opts.player.pos : posOf(def, ri); taken[def.key] = 1;
      roster.push({ key: def.key, pos, player: true, spell: opts.player.spell, role: ri });
      left.splice(left.indexOf(pos), 1);
    }
    if (opts.force && opts.force.team === team) { const def = HEROES[opts.force.key], ri = roleOf(def, opts.force.role), pos = posOf(def, ri); if (left.includes(pos)) { taken[def.key] = 1; roster.push({ key: def.key, pos, role: ri }); left.splice(left.indexOf(pos), 1); } }       // tests: put a given hero on a given side
    while (left.length > Math.max(0, cap - roster.length)) left.splice(left.indexOf(POS_SPARE.find(q => left.includes(q))), 1);       // (two players in one place: fewer bots than places)
    if (duel) { for (const pos of left) { const pick = opts.foe && team === RED && HEROES[opts.foe.hero] ? opts.foe.hero : null, pool = keys.filter(k => !taken[k]), key = pick || pool[(rnd() * pool.length) | 0]; taken[key] = 1; roster.push({ key, pos, role: pick ? roleOf(HEROES[key], opts.foe.role) : 0 }); } }       // a duel: any hero will do for the other side (or the one asked for)
    else for (const pos of left) {
      const pool = keys.filter(k => !taken[k] && (fits[pos].includes(HEROES[k].cls) || roleAt(k, pos) >= 0));
      const key = pool[(rnd() * pool.length) | 0] || keys.find(k => !taken[k]);
      taken[key] = 1; roster.push({ key, pos, role: Math.max(0, roleAt(key, pos)) });
    }
    roster.forEach((r, i) => {
      const a = i / roster.length * TAU, sp = MAP.spawn[team];
      const sk = r.player ? (opts.player.skin | 0) : r.seat != null ? Math.min(r.skin, SKINS[r.key].length - 1) : opts.skins === false ? 0 : (G.seed0 + i * 7 + team * 3 + r.key.length) % SKINS[r.key].length;
      const h = makeHero(r.key, team, sp.x + fcos(a) * 90, sp.y + fsin(a) * 90, sk);
      h.pos = r.pos; if (h.def.roles) { const ro = h.def.roles[r.role | 0]; h.role = r.role | 0; h.cls = ro.cls; h.bld = ro.build; }
      h.sting = h.cls === 'Mage';       // (a temper to begin in, for a hero who has one: a mage's is to sting)
      const d = opts.diffs ? opts.diffs[team] : team === BLUE && opts.player ? 1 : G.diff;       // (diffs: a difficulty for each side)
      if (r.player) { h.isPlayer = true; h.inp = G.input; h.spell = r.spell || h.def.spell; G.player = h; }
      else if (r.seat != null) { h.isPlayer = true; h.inp = newInput(); h.seat = r.seat; if (r.name) h.name = r.name; h.spell = SPELLS[r.spell] ? r.spell : h.def.spell; h.botDiff = d; G.humans[r.seat] = h; }       // (botDiff: how the bot plays that takes this hero over if its player goes)
      else {
        h.spell = r.pos === 'jungle' ? 'retribution' : h.def.spell; if (duel && h.spell === 'retribution') h.spell = 'execute';       // (nothing to smite in a duel)
        aiInit(h, r.pos, d);
      }
      h.retri = h.spell === 'retribution';
    });
  }
  if (humans) { G.player = opts.me != null && G.humans[opts.me] ? G.humans[opts.me] : null; G.net = { me: opts.me == null ? -1 : opts.me, turn: 0, out: [], hold: {}, gone: false }; }
  // jungle camps
  if (!duel) MAP.camps.forEach((c, i) => G.camps.push({ id: i, x: c.x, y: c.y, type: c.type, side: c.side, units: [], respT: c.type === 'small' ? 25 : 30 }));
  if (typeof aiCost === 'function') { aiCost(BLUE); aiCost(RED); }       // the bots' map of ground to stay off, made now and not in the middle of a fight
  if (opts.rec && G.player && !G.practice) G.rec = recNew(opts);
  return G;
}
function newInput() { return { mx: 0, my: 0, atk: false, atkMode: 0, fresh: false, tgtHint: null }; }
const DUEL_LANES = ['mid'], LANES_M = ['mid', 'top', 'bot'];
function newUnit(kind, team, x, y, o) {
  const u = Object.assign({
    id: ++G.uid, kind, team, x, y, r: 30, hp: 1, maxHp: 1, armor: 0, mr: 0, ad: 0, range: 120, asp: 1, ms: 0, msBase: 0,
    face: team === RED ? Math.PI * 0.75 : -Math.PI / 4, vx: 0, vy: 0, atkCd: 0, windT: 0, windup: 0.25, windTgt: null,
    buffs: [], stunT: 0, rootT: 0, tauntT: 0, tauntBy: null, shields: [], dead: false, vis: [true, true], bush: -1, revealT: 0,
    lastDmgT: -99, lastHeroHit: null, lastHeroHitT: -99, anim: rnd() * 10, atkAnim: 0, flash: 0, moving: false,
  }, o);
  G.units.push(u); return u;
}
function makeHero(key, team, x, y, skin) {
  const def = HEROES[key];
  const h = newUnit('hero', team, x, y, {
    def, key, name: def.name, skin: skin | 0, look: heroLook(key, skin), castN: 0, castI: 0, r: 36, level: 1, xp: 0, gold: 300, goldEarned: 300, items: [], itemStats: {},
    sk: [0, 0, def.freeUlt ? 1 : 0], cds: [0, 0, 0], form: 0, sp: 1, spell: def.spell, spellCd: 0, mp: 1, maxMp: 1, ap: 0,
    kills: 0, deaths: 0, assists: 0, streak: 0, multi: 0, lastKillT: -99, dmgLog: {},
    stats: { dmgHero: 0, dmgTurret: 0, taken: 0, heal: 0, cs: 0, plate: 0 }, plateAcc: 0,
    respawnT: 0, recallT: 0, dash: null, leap: null, disp: null, castLock: 0, castAnim: 0, z: 0,
    mvx: 0, mvy: 0, atkTarget: null, chase: false, aggroT: -99, lastCombatT: -99, isPlayer: false, ai: null, inp: null, seat: -1,       // inp: what its player is holding (a hero with a player); seat: which player, in a networked match
    pos: 'top', role: 0, cls: def.cls, bld: null, retri: false, melee: def.melee, pv: {}, has: {}, reviveT: 0, reviveCd: 0, wardCd: 0,       // role, cls, bld: the role it is played in, that role's class and build (heroes with more than one)
    healCd: 0, mend: null, flurry: null, actCd: 0, actN: 0, dlog: [], recap: null, re: [null, null, null], castT: [-9, -9, -9],       // re[i]: what skill i left behind for its second cast { until, ready, ... }
  });
  recalc(h); h.hp = h.maxHp; h.mp = h.maxMp;
  G.heroes.push(h); return h;
}

/* ---------------- stats ---------------- */
/* What the bag is worth. Each item's numbers are added up, a second copy of the same complete item too (KIT_V 24: canBuy), but not
   everything of a second copy counts again: its Move Speed and its penetration do not (ITEM_ONCE), and its passive does not either
   (h.has knows that an item is held, not how many of it). Parts were always free to repeat, and add up in full as they always did. */
const ITEM_ONCE = { ms: 1, ppen: 1, ppenP: 1, mpen: 1, mpenP: 1 };
function recalcItems(h) {
  const s = {}, n = {};
  for (const k of h.items) { const it = ITEMS[k], again = !it.part && n[k] === 1; n[k] = 1; for (const p in it) if (typeof it[p] === 'number' && p !== 'cost' && !(again && ITEM_ONCE[p] === 1)) s[p] = (s[p] || 0) + it[p]; }
  h.itemStats = s; h.has = {}; for (const k of h.items) h.has[k] = 1;
}
function recalc(h) {
  const b = h.def.base, l = h.level - 1, it = h.itemStats;
  let ad = 0, adP = 0, ap = 0, as = 0, armor = 0, mr = 0, ls = 0, range = 0, cdr = 0, slowMul = 1, haste = 0, noSlow = false, mpR = 0, asK = 1, asCap = 2.5;       // (asK, asCap: Inspire's)
  for (const f of h.buffs) {
    if (f.asMul) { asK *= f.asMul; if (f.asCap > asCap) asCap = f.asCap; }
    if (f.ad) ad += f.ad; if (f.adP) adP += f.adP; if (f.ap) ap += f.ap; if (f.as) as += f.as; if (f.armor) armor += f.armor; if (f.mr) mr += f.mr;
    if (f.ls) ls += f.ls; if (f.range) range += f.range; if (f.cdr) cdr += f.cdr; if (f.mpR) mpR += f.mpR;
    if (f.msMul) { if (f.msMul < 1) slowMul = Math.min(slowMul, f.msMul); else haste += f.msMul - 1; }
    if (f.noSlow) noSlow = true;
  }
  const oldMax = h.maxHp;
  const fm0 = h.form && h.def.forms ? h.def.forms : null;
  h.maxHp = b.hp + b.hpG * l + (it.hp || 0) + (fm0 && fm0.hp ? fm0.hp(h) : 0);       // (forms.hp: the Stormhorn's own)
  h.maxMp = h.def.energy ? ENERGY_MAX : b.mp + b.mpG * l + (it.mp || 0);       // (energy: Focus, a bar of one size whatever she carries)
  h.ad = (b.ad + b.adG * l + (it.ad || 0) + ad) * (1 + adP);
  h.ap = ((it.ap || 0) + ap) * (h.has.zenith ? 1.2 : 1);
  h.armor = b.armor + b.armorG * l + (it.armor || 0) + armor + (fm0 ? fm0.tough : 0);
  h.mr = b.mr + b.mrG * l + (it.mr || 0) + mr + (fm0 ? fm0.tough : 0);
  const fm = h.form && h.def.forms ? h.def.forms : null;       // the second form fights hand to hand
  h.asp = Math.min(asCap, b.as * (1 + (b.asG * l + (it.as || 0) + as + (fm ? fm.as : 0)) / 100) * asK);
  h.range = (fm ? fm.range : b.range) + range + (h.def.lethal && lethalReady(h) ? LETHAL_RANGE : 0); h.melee = fm ? true : !!h.def.melee;
  h.crit = (it.crit || 0) / 100 + (h.def.lethal && h.sk ? SNIPE_CRIT * h.sk[2] : 0); h.critDmg = h.has.reaver ? 2.2 : 1.85; h.ls = ((it.ls || 0) + ls) / 100; h.sv = (it.sv || 0) / 100;
  h.cdr = Math.min(h.has.wellspring ? WELL_CAP : CDR_CAP, ((it.cdr || 0) + cdr) / 100);
  h.ppen = it.ppen || 0; h.ppenP = (it.ppenP || 0) / 100; h.mpen = it.mpen || 0; h.mpenP = (it.mpenP || 0) / 100;
  h.hpRegen = b.hpRegen + l * 0.7 + (it.hpRegen || 0);
  h.mpRegen = h.def.energy ? ENERGY_REGEN * (h.camo ? 2 : 1) : b.mpRegen + l * 0.28 + h.maxMp * (mpR + (h.has.scepter ? 0.01 : 0));
  h.msBase = b.ms + (it.ms || 0);
  h.ms = Math.max(110, h.msBase * (1 + haste) * (noSlow ? 1 : slowMul));
  if (oldMax > 1 && h.maxHp > oldMax) h.hp += h.maxHp - oldMax;
  if (h.hp > h.maxHp) h.hp = h.maxHp; if (h.mp > h.maxMp) h.mp = h.maxMp;
}
function skillCd(s, lv) { return s.max > 1 ? lerp(s.cd[0], s.cd[1], (lv - 1) / (s.max - 1)) : s.cd[0]; }
function skillCost(s, lv) { return Math.round(s.max > 1 ? lerp(s.cost[0], s.cost[1], (lv - 1) / (s.max - 1)) : s.cost[0]); }
/* A hero with two forms keeps a second set of skills in `alt`; whichever form he is in decides what a slot casts. */
function skDef(h, i) { const s = h.def.skills[i]; return h.form && s.alt ? s.alt : s; }
function baseSk(h) { return [0, 0, h.def.freeUlt ? 1 : 0]; }       // freeUlt: the ultimate (a change of form) is known from the start
function canLevel(h, i) {
  if (h.sp < 1) return false; const s = h.def.skills[i];
  if (h.sk[i] >= s.max) return false;
  if (i === 2) return h.sk[2] < Math.floor(h.level / 4) + (h.def.freeUlt ? 1 : 0);
  return true;
}
function levelSkill(h, i) { if (!canLevel(h, i)) return false; h.sk[i]++; h.sp--; return true; }
/* What buying `key` would take: the parts of its recipe the hero already holds are used up (each held part once) and come off the price. */
function recipeUse(h, key) {
  const it = ITEMS[key], used = []; let price = it.cost;
  if (it.from) for (const c of it.from) { const i = h.items.findIndex((k, j) => k === c && !used.includes(j)); if (i >= 0) { used.push(i); price -= ITEMS[c].cost; } }
  return { price, used };
}
function itemPrice(h, key) { return recipeUse(h, key).price; }
function missingParts(h, key) { const it = ITEMS[key], have = h.items.slice(), out = []; for (const c of it.from || []) { const i = have.indexOf(c); if (i >= 0) have.splice(i, 1); else out.push(c); } return out; }
function canBuy(h, key) {
  const it = ITEMS[key]; if (!it) return false;
  const u = recipeUse(h, key);
  if (h.gold < u.price || h.items.length - u.used.length >= 6) return false;
  if (!it.part && G.kit < 24 && h.items.includes(key)) return false;       // (before kit 24: one of each complete item. Since then a second of the same may be bought, and a third: what of it counts again is recalcItems's business. Parts could always repeat.)
  if (it.boots && h.items.some((k, i) => ITEMS[k].boots && !u.used.includes(i))) return false;
  return true;
}
function buyItem(h, key) {
  if (!canBuy(h, key)) return false; const u = recipeUse(h, key);
  h.gold -= u.price; h.items = h.items.filter((k, i) => !u.used.includes(i)); h.items.push(key); recalcItems(h); recalc(h); return true;
}
/* The next purchase towards the recommended build: the item itself once it can be paid for, until then its dearest part that can.
   A part is only bought if the rest of the recipe still fits in the bag afterwards. */
function nextStep(h) {
  const k = nextBuild(h); if (!k) return null;
  if (canBuy(h, k)) return k;
  let best = null; const miss = missingParts(h, k), room = 6 - h.items.length;
  if (room < 1) return null;
  for (const c of miss) if (canBuy(h, c) && (!best || ITEMS[c].cost > ITEMS[best].cost)) best = c;
  return best;
}
function sellItem(h, slot) { const k = h.items[slot]; if (!k) return false; h.gold += Math.round(ITEMS[k].cost * 0.6); h.items.splice(slot, 1); recalcItems(h); recalc(h); return true; }
function nextBuild(h) { for (const k of (h.ai && h.ai.build) || h.bld || h.def.build) if (!h.items.includes(k)) return k; return null; }       // a bot's build answers the other side (aiBuild)
function giveGold(h, n) { h.gold += n; h.goldEarned += n; }
function giveXp(h, n) {
  if (h.level >= 15) return;
  h.xp += n;
  while (h.level < 15 && h.xp >= xpNeed(h.level)) {
    h.xp -= xpNeed(h.level); h.level++; h.sp++;
    recalc(h); h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.08); h.mp = Math.min(h.maxMp, h.mp + h.maxMp * 0.1);
    fx('level', h.x, h.y, { id: h.id });
    if (h === G.player) sfx('level', h.x, h.y);
  }
  if (h.level >= 15) h.xp = 0;
}
function shareXp(team, x, y, amt, rad, bonusFor) {
  const hs = G.heroes.filter(h => h.team === team && !h.dead && hyp(h.x - x, h.y - y) < rad);
  if (bonusFor && !hs.includes(bonusFor) && !bonusFor.dead) hs.push(bonusFor);
  if (!hs.length) return;
  const m = XP_SHARE[Math.min(hs.length, 5) - 1];
  for (const h of hs) giveXp(h, amt * m);
}

/* ---------------- queries ---------------- */
function enemiesIn(team, x, y, r) {
  const out = [];
  for (const u of G.units) {
    if (u.dead || u.team === team || u.kind === 'turret' || u.kind === 'crystal') continue;
    const dx = u.x - x, dy = u.y - y, rr = r + u.r * 0.6;
    if (dx * dx + dy * dy <= rr * rr) out.push(u);
  }
  return out;
}
function enemiesInCone(team, x, y, r, ang, half) {
  return enemiesIn(team, x, y, r).filter(u => {
    const d = hyp(u.x - x, u.y - y); if (d < u.r + 30) return true;
    let da = fatan2(u.y - y, u.x - x) - ang; da = fatan2(fsin(da), fcos(da));
    return Math.abs(da) <= half + fatan2(u.r * 0.6, d);
  });
}
function alliesIn(team, x, y, r) { return G.heroes.filter(h => h.team === team && !h.dead && hyp(h.x - x, h.y - y) <= r + h.r * 0.6); }
function nearestEnemyHero(h, tx, ty, searchR, maxFromHero) {
  let best = null, bd = 1e9;
  for (const e of G.heroes) {
    if (e.team === h.team || e.dead || !e.vis[h.team]) continue;
    if (hyp(e.x - h.x, e.y - h.y) > maxFromHero) continue;
    const d = hyp(e.x - tx, e.y - ty); if (d <= searchR && d < bd) { bd = d; best = e; }
  }
  return best;
}
function canTarget(src, t) {
  if (!t || t.dead || t.locked) return false;
  if (t.team === src.team) return false;
  if (t.team !== NEUTRAL && src.team !== NEUTRAL && !t.vis[src.team]) return false;
  return true;
}
/* how far a hero's basic attack reaches at this target. A Long Shot's extra reach (Sorrel) is in h.range while one is ready, and is
   not for turrets and crystals: it is never fired at them, and nothing is to out-reach a turret. */
function reachTo(h, t) { return h.def.lethal && (t.kind === 'turret' || t.kind === 'crystal') && lethalReady(h) ? h.range - LETHAL_RANGE : h.range; }
function minionsNear(team, x, y, r) { let n = 0; for (const u of G.units) if (u.kind === 'minion' && u.team === team && !u.dead && hyp(u.x - x, u.y - y) < r) n++; return n; }

/* ---------------- status ---------------- */
function addBuff(u, b) {
  if (u.dead) return;
  for (let i = 0; i < u.buffs.length; i++) if (u.buffs[i].k === b.k) { u.buffs[i] = b; return; }
  u.buffs.push(b);
}
/* ---------------- what killed a hero: the death recap ----------------
   Every blow a hero takes and everything that holds him down is written to his log with who did it and what it is called. G.cx is
   the skill at work right now: set while a skill's own code runs and carried by whatever it leaves behind (shots, areas, leaps,
   dashes), so damage that lands seconds later is still put down to the right skill. When he dies the last ten seconds become his
   recap. */
const RECAP_SPAN = 10;
function whoOf(u) {
  if (!u) return { wk: 'other', who: 'The wilds', key: '', skin: 0, wid: 0, team: NEUTRAL };
  if (u.kind === 'hero') return { wk: 'hero', who: u.name, key: u.key, skin: u.skin, wid: u.id, team: u.team };
  if (u.kind === 'clone') return { wk: 'hero', who: u.name, key: u.key, skin: u.skin, wid: u.owner.id, team: u.team };
  if (u.kind === 'turret') return { wk: 'turret', who: 'Turret', key: '', skin: 0, wid: 0, team: u.team };
  if (u.kind === 'crystal') return { wk: 'turret', who: 'Enemy fountain', key: '', skin: 0, wid: 0, team: u.team };
  if (u.kind === 'minion') return { wk: 'minion', who: u.mtype === 'lord' ? 'Shardlord' : 'Minions', key: u.mtype, skin: 0, wid: 0, team: u.team };
  return { wk: 'monster', who: u.name || 'Creep', key: u.mtype || '', skin: 0, wid: 0, team: NEUTRAL };
}
function hitName(src, f) {
  if (f.n) return [f.n, f.ic || 'orb'];
  if (!src) return ['Unknown', 'orb'];
  if (src.kind === 'hero') {
    const pv = src.def.passive, cx = G.cx;
    if (f.reflect) return [ITEMS.ironbark.name, ITEMS.ironbark.ic];
    if (f.skip) return [pv ? pv.name : 'Skip', pv ? pv.ic : 'arrow'];
    if (f.basic) return ['Basic attack', 'sword'];
    if (cx && cx.h === src) return [cx.n, cx.ic];
    return pv ? [pv.name, pv.ic] : ['Ability', 'orb'];
  }
  if (src.kind === 'turret') return ['Turret shot', 'tower'];
  if (src.kind === 'crystal') return ['Fountain beam', 'home'];
  if (src.kind === 'clone') return ['Echoes', 'echo'];       // (an echo's blows are put down to the skill that made it, as every blow is to its skill)
  if (src.kind === 'minion') return [src.mtype === 'lord' ? (f.basic ? 'Shardlord strike' : 'Shardlord slam') : src.mtype === 'siege' ? 'Siege minion' : src.mtype === 'ranged' ? 'Ranged minion' : 'Melee minion', 'pawn'];
  return [f.basic ? 'Attack' : 'Slam', 'claws'];
}
function logHit(src, tgt, a, abs, type, f) {
  const L = tgt.dlog, w = whoOf(src), nm = hitName(src, f);
  L.push({ t: G.t, a, abs, ty: type, n: nm[0], ic: nm[1], wk: w.wk, who: w.who, key: w.key, skin: w.skin, wid: w.wid, team: w.team, crit: f.crit === true, hp: Math.max(0, tgt.hp) });
  if (L.length > 240) L.splice(0, 80);
}
function logHold(u, cc, d, p) {       // a stun, root, slow or pull that took hold of a hero, and whose skill it was
  if (u.kind !== 'hero' || !u.dlog || !(d > 0)) return;
  const cx = G.cx, h = cx && cx.h && cx.h.team !== u.team ? cx.h : null, w = h ? whoOf(h) : null;
  u.dlog.push({ t: G.t, cc, d, p: p || 0, n: h ? cx.n : '', ic: h ? cx.ic : '', who: w ? w.who : '', key: w ? w.key : '', skin: w ? w.skin : 0, wid: w ? w.wid : 0 });
}
function makeRecap(u, kh, src, assists) {
  const k = whoOf(src || kh), log = u.dlog.filter(e => e.t >= G.t - RECAP_SPAN);       // killer: whoever struck the last blow; credit: the hero the kill went to, when that is someone else
  u.recap = { t: G.t, n: u.deaths, killer: k, credit: kh && kh !== src ? whoOf(kh) : null, assists: assists.map(a => ({ who: a.name, key: a.key, skin: a.skin, wid: a.id })), log, level: u.level, maxHp: u.maxHp, x: u.x, y: u.y };
  u.dlog = [];
}
function hasBuff(u, k) { for (const b of u.buffs) if (b.k === k) return b; return null; }
/* Two kinds of protection a hero can stand under. steady: nothing can stun, root or move him (a shield that steadies its bearer).
   immune: that, and no slow or mark sticks either (the totem). What is turned away is shown, a couple of times a second at most. */
function steadyOf(u) { if (u.kind !== 'hero') return null; for (const b of u.buffs) if (b.steady || b.immune) return b; return null; }
/* KIT_V 23: two holds go through the totem (pierce): the stun of Tempest Beam and the taunt of Brazen Call. A shield that steadies its
   bearer still turns them away; Unshaken does not, and it is shown giving way. */
function steadyFor(u, pierce) { if (!pierce) return steadyOf(u); if (u.kind !== 'hero') return null; let sb = null, im = null; for (const b of u.buffs) { if (b.immune) im = b; else if (b.steady) sb = b; } if (!sb && im) fx('pierce', u.x, u.y, { id: u.id, c: im.shell || '#ffffff' }); return sb; }
function immuneOf(u) { if (u.kind !== 'hero') return null; for (const b of u.buffs) if (b.immune) return b; return null; }
function blocked(u, b) { if (G.t - (u.blockT || -9) > 0.45) { u.blockT = G.t; fx('block', u.x, u.y, { id: u.id, c: b.shell || b.aura || '#ffffff', ci: b.ci, all: !!b.immune }); } }
function slow(u, pct, dur) { if (u.kind === 'turret' || u.kind === 'crystal' || u.dead) return; const im = immuneOf(u); if (im) { blocked(u, im); return; } if (!(u.kind === 'hero' && hasBuff(u, 'sprint') && hasBuff(u, 'sprint').noSlow)) logHold(u, 'slow', dur, pct); addBuff(u, { k: 'slow' + Math.round(pct * 100), t: dur, msMul: 1 - (u.epic ? pct * 0.4 : pct) }); }
function stun(u, dur, pierce) { if (u.kind === 'turret' || u.kind === 'crystal' || u.dead) return; const sb = steadyFor(u, pierce); if (sb) { blocked(u, sb); return; } if (u.epic) dur *= 0.35; if (u.has && u.has.wardboots) dur *= 0.75; logHold(u, 'stun', dur); u.stunT = Math.max(u.stunT, dur); u.windT = 0; if (u.kind === 'hero') { u.recallT = 0; } }
/* Thrown into the air: helpless until it comes down. It holds like a stun, and the same things shrug it off or shorten it; the height
   (u.z) is for the eye. A hero in the middle of a leap of his own is only stunned: he is in the air already. */
function knockUp(u, dur, ht) {
  if (u.kind === 'turret' || u.kind === 'crystal' || u.dead || u.locked) return false;       // (locked: a hero in the middle of being brought back, whom nothing touches)
  const sb = steadyOf(u); if (sb) { blocked(u, sb); return false; }
  if (u.epic) dur *= 0.35; if (u.has && u.has.wardboots) dur *= 0.75;
  logHold(u, 'air', dur); u.stunT = Math.max(u.stunT, dur); u.windT = 0; if (u.kind === 'hero') u.recallT = 0;
  if (!u.leap) u.air = { t: 0, dur, h: (ht || 150) * (u.epic ? 0.25 : 1), z0: u.z || 0 };
  fx('air', u.x, u.y, { id: u.id, dur, big: u.r > 45 ? 1 : 0 }); sfx('whoosh', u.x, u.y); return true;
}
function root(u, dur) { if (u.kind === 'turret' || u.kind === 'crystal' || u.dead) return; const sb = steadyOf(u); if (sb) { blocked(u, sb); return; } if (u.epic) dur *= 0.35; if (u.has && u.has.wardboots) dur *= 0.75; logHold(u, 'root', dur); u.rootT = Math.max(u.rootT, dur); if (u.kind === 'hero') { u.dash = null; u.recallT = 0; } }
/* Taunted: for a moment a unit can do nothing but come at whoever called it out and hit him with its basic attack. No skill, no
   spell, no item, no recall, no step of its own choosing. Whatever shrugs off a stun shrugs this off and whatever shortens one
   shortens this. It ends early if whoever called it out falls or cannot be touched. Returns whether it took hold. */
function taunt(u, by, dur, pierce) {
  if (u.kind === 'turret' || u.kind === 'crystal' || u.dead || u.locked || !by || by.dead || by === u) return false;
  const sb = steadyFor(u, pierce); if (sb) { blocked(u, sb); return false; }
  if (u.epic) dur *= 0.35; if (u.has && u.has.wardboots) dur *= 0.75;
  logHold(u, 'taunt', dur); u.tauntT = Math.max(u.tauntT || 0, dur); u.tauntBy = by; if (u.windTgt !== by) u.windT = 0;
  if (u.kind === 'hero') { u.dash = null; u.recallT = 0; u.atkTarget = by; u.chase = true; }
  else if (u.kind === 'minion' || u.kind === 'clone') { u.tgt = by; u.thinkT = Math.max(u.thinkT, dur); }
  else if (u.kind === 'monster') { u.aggro = by; u.calmT = 0; }
  by.revealT = Math.max(by.revealT, G.t + dur);       // (whoever is called out sees who is calling)
  fx('taunt', u.x, u.y, { id: u.id, by: by.id, dur: u.tauntT }); return true;
}
function shield(u, amt, dur) { u.shields.push({ v: amt, t: dur }); }
function shieldOf(u) { let s = 0; for (const x of u.shields) s += x.v; return s; }
function heal(src, u, amt) {
  if (u.dead) return 0;
  const hp = src && src.kind === 'hero' ? src.def.passive : null;
  if (hp && hp.healMul) amt *= hp.healMul(src, u);
  const a = Math.min(amt, u.maxHp - u.hp); u.hp += a;
  if (hp && hp.healed && a > 0) hp.healed(src, u);
  if (src && src.kind === 'hero' && src !== u) src.stats.heal += a; else if (src && src.kind === 'hero') src.stats.heal += a * 0.5;
  if (a > 8) fx('heal', u.x, u.y, { v: a, tgt: u.id, src: src ? src.id : 0 });
  return a;
}

/* ---------------- damage & death ---------------- */
function dmg(src, tgt, amt, type, f) {
  if (!tgt || tgt.dead || tgt.locked || G.over) return 0;
  if (tgt.tpG > G.t) return 0;       // (somebody is on his way to it by Teleport: it cannot be hurt until he is there)
  f = f || {};
  const structure = tgt.kind === 'turret' || tgt.kind === 'crystal';
  if (structure && !f.basic) return 0;
  let a = amt;
  if (type === 'phys') { let ar = tgt.armor; if (src) ar = ar * (1 - (src.ppenP || 0)) - (src.ppen || 0); if (f.pen) ar -= f.pen; a *= 100 / (100 + Math.max(0, ar)); }       // (pen: armour this one blow goes through: Inspire's)
  else if (type === 'magic') { let mr = tgt.mr; if (src) mr = mr * (1 - (src.mpenP || 0)) - (src.mpen || 0); a *= 100 / (100 + Math.max(0, mr)); const im = immuneOf(tgt); if (im && im.mres) a *= 1 - im.mres; }
  if (structure && src && minionsNear(src.team, tgt.x, tgt.y, tgt.range + 60) === 0) a *= 0.4;         // backdoor protection
  if (structure && src) { tgt.hitBy = src; tgt.hitT = G.t; }
  if (src) {
    if (src.kind === 'minion' && tgt.kind === 'hero') a *= 0.75;
    if (src.kind === 'hero' && tgt.kind === 'monster' && src.retri) a *= 1.25;
    if (src.kind === 'monster' && tgt.kind === 'hero' && tgt.retri) a *= 0.75;
    if (src.kind === 'hero' && tgt.kind === 'minion' && f.skill) a *= 1.1;
    if (src.kind === 'hero') {
      const pv = src.def.passive; if (pv && pv.dmgMul) a *= pv.dmgMul(src, tgt, f);
      if (src.has.giantslayer && tgt.maxHp > src.maxHp) a *= 1.1;
      if (f.skill && src.has.stormorb && tgt.hp > tgt.maxHp * 0.7) a *= 1.1;
      if (src.has.ruinblade && !structure && tgt.hp < tgt.maxHp * RUIN_AT) { const rb = hasBuff(src, 'ruin'); if (!rb) { if (f.basic && type === 'phys') a *= 1 + RUIN_K; fx('ruin', src.x, src.y, { id: src.id }); } addBuff(src, { k: 'ruin', t: RUIN_T, adP: RUIN_K }); }       // Blade of Ruin (the blow that wakes it is already the stronger for it, if it is a basic attack)
    }
  }
  if (G.duel && structure) a *= duelRush();
  let left = a;
  if (tgt.shields.length) { for (const s of tgt.shields) { const use = Math.min(s.v, left); s.v -= use; left -= use; if (left <= 0) break; } }
  if (tgt.kind === 'hero' && left >= tgt.hp && tgt.has.bastion && tgt.reviveCd <= G.t) {
    tgt.hp = 1; tgt.reviveT = 2; tgt.reviveCd = G.t + 150; tgt.locked = true; tgt.buffs = tgt.buffs.filter(b => b.k === 'azure' || b.k === 'crimson'); tgt.stunT = tgt.rootT = 0; tgt.tauntT = 0; tgt.tauntBy = null; tgt.dash = tgt.leap = tgt.disp = tgt.air = null; tgt.z = 0; tgt.windT = 0; tgt.atkTarget = null; tgt.recallT = 0; tgt.mvx = tgt.mvy = 0;
    fx('revive', tgt.x, tgt.y, { id: tgt.id }); sfx('ult', tgt.x, tgt.y); ev({ t: 'revive', id: tgt.id });
    return a;
  }
  if (tgt.plate > 0 && left > 0) left -= plateHit(src, tgt, left);
  if (tgt.dummy) left = Math.min(left, tgt.hp - 1);       // a practice dummy cannot be killed
  if (G.practice && src && src.isPlayer && tgt.kind === 'hero') { const P = G.practice; if (G.t - P.last > 3) { P.sum = 0; P.n = 0; P.t0 = G.t; } P.sum += a; P.n++; P.last = G.t; }
  tgt.hp -= left; if (!f.dot || tgt.dummy) tgt.lastDmgT = G.t; tgt.flash = 0.12; if (tgt.camo && a > 0) camoOff(tgt);       // (f.dot: the hurt of something left in the target a while ago, a sting. It does not make a fight of it: it holds up no recall, shows nobody, draws no turret)
  if (tgt.kind === 'hero' && a > 0) logHit(src, tgt, a, a - left, type, f);
  if (tgt.kind === 'hero' && tgt.has.dawnshard && tgt.hp > 0 && tgt.hp < tgt.maxHp * LAST_AT && !(tgt.lastCd > G.t)) { tgt.lastCd = G.t + LAST_CD; shield(tgt, lastShield(tgt), LAST_T); addBuff(tgt, { k: 'laststand', t: LAST_T, armor: LAST_DEF, mr: LAST_DEF, msMul: LAST_MS }); fx('laststand', tgt.x, tgt.y, { id: tgt.id, dur: LAST_T }); sfx('guard', tgt.x, tgt.y); }       // Dawnshard Blade
  if (src && src.kind === 'clone' && !src.owner.dead) { const o = src.owner; o.lastCombatT = G.t; tgt.lastHeroHit = o; tgt.lastHeroHitT = G.t; if (tgt.kind === 'hero') { tgt.dmgLog[o.id] = G.t; o.stats.dmgHero += a; } else if (structure) o.stats.dmgTurret += a; }       // (what an echo does is put down to whoever it is an echo of)
  if (src && src.kind === 'hero') {
    if (!f.dot) { src.lastCombatT = G.t; src.revealT = G.t + 1.2; tgt.lastHeroHit = src; tgt.lastHeroHitT = G.t; }       // (nor does it count as the last blow of a hero's for whoever finishes the target off: only its own kill is its own)
    if (tgt.kind === 'hero') { tgt.dmgLog[src.id] = G.t; if (!f.dot) { src.aggroT = G.t; src.aggroV = tgt; } src.stats.dmgHero += a; }
    else if (structure) src.stats.dmgTurret += a;
    if (!f.noVamp && a > 0) {
      if (f.basic && src.ls > 0) heal(src, src, a * src.ls * (structure ? 0 : 1));
      else if (f.skill && src.sv > 0) heal(src, src, a * src.sv * (tgt.kind === 'hero' ? 1 : 0.35));
    }
  }
  if (tgt.kind === 'hero') { tgt.stats.taken += a; if (!f.dot) { tgt.recallT = 0; tgt.lastCombatT = G.t; } }
  if (src && src.kind === 'hero' && !f.reflect) {
    const pv = src.def.passive;
    if (pv && pv.dealt) pv.dealt(src, tgt, a, f);
    if (f.skill) { if (pv && pv.hit) pv.hit(src, tgt, a); if (src.has.frostdiadem && tgt.hp > 0) slow(tgt, 0.2, 1.5); }
    if (tgt.kind === 'hero') {
      const tp = tgt.def.passive; if (tp && tp.hurt) tp.hurt(tgt, src, a, f);
      if (f.skill && tgt.has.spellward && tgt.wardCd <= G.t && tgt.hp > 0) { tgt.wardCd = G.t + 18; shield(tgt, 250 + 0.1 * tgt.maxHp, 3); fx('ring', tgt.x, tgt.y, { c: '#7ad0c4', r: 110 }); }
      if (f.basic && tgt.has.ironbark && tgt.hp > 0 && !src.dead) dmg(tgt, src, amt * 0.2, 'magic', { reflect: true, noVamp: true });
    }
  }
  if (tgt.kind === 'monster' && src && src.team !== NEUTRAL) { if (!tgt.aggro || tgt.aggro.dead || src.kind === 'hero') tgt.aggro = src; tgt.calmT = 0; }
  if (structure && src && (src.kind === 'hero' || tgt.kind === 'crystal' || tgt.tier === 3)) G.alert[tgt.team] = { x: tgt.x, y: tgt.y, t: G.t, tier: tgt.kind === 'crystal' ? 4 : tgt.tier, lane: tgt.lane || null };
  if (G.fxOn && a >= 1) G.fx.push({ k: 'dmg', x: tgt.x, y: tgt.y, v: a, type, crit: !!f.crit, src: src ? src.id : 0, tgt: tgt.id });
  if (tgt.hp <= 0) kill(tgt, src);
  return a;
}
/* Gold plating on an outer turret: it takes the blow before the turret does, and pays the hero who struck it for what he knocked off.
   Minions wear it down too, for nothing. Returns how much of the blow the plating took. */
function plateHit(src, t, amt) {
  const use = Math.min(t.plate, amt), n0 = Math.ceil(t.plate / PLATE_HP - 1e-9); t.plate -= use; if (t.plate < 0.01) t.plate = 0;
  const n1 = Math.ceil(t.plate / PLATE_HP - 1e-9), hero = src && src.kind === 'hero' ? src : null;
  if (hero) {
    hero.plateAcc += use * PLATE_GOLD / PLATE_HP; const g = Math.floor(hero.plateAcc + 1e-6);
    if (g > 0) { hero.plateAcc -= g; giveGold(hero, g); hero.stats.plate += g; fx('gold', t.x, t.y, { v: g, id: hero.id, plate: 1 }); if (hero === G.player) sfx('coin', t.x, t.y); }
  }
  if (n1 < n0) { fx('plate', t.x, t.y, { id: t.id, n: n1, lost: n0 - n1 }); sfx('plate', t.x, t.y); if (!n1) ev({ t: 'plateGone', team: t.team, lane: t.lane, by: hero ? hero.name : null }); }
  return use;
}
function tickPlating() {       // at PLATE_TIME whatever plating is left comes off by itself; half a minute before, it is said so
  if (G.plateOff) return;
  if (!G.plateWarn && G.t >= PLATE_TIME - 30) { G.plateWarn = true; const n = G.turrets.filter(t => t.plate > 0 && !t.dead).length; if (n) ev({ t: 'plateWarn', n }); }
  if (G.t < PLATE_TIME) return; G.plateOff = true; let n = 0;
  for (const t of G.turrets) if (t.plate > 0 && !t.dead) { n++; fx('plateOff', t.x, t.y, { id: t.id, n: Math.ceil(t.plate / PLATE_HP - 1e-9) }); t.plate = 0; }
  for (const t of G.turrets) t.plate = 0;
  if (n) sfx('plate', G.player ? G.player.x : 0, G.player ? G.player.y : 0);
  ev({ t: 'plateOff', n });
}
function kill(u, src) {
  if (u.dead) return; u.dead = true; u.hp = 0;
  let kh = src && src.kind === 'hero' ? src : src && src.kind === 'clone' && !src.owner.dead ? src.owner : null;
  if (!kh && u.lastHeroHit && G.t - u.lastHeroHitT < (u.kind === 'hero' ? 8 : 2.5)) kh = u.lastHeroHit;
  const foe = u.team === NEUTRAL ? (kh ? kh.team : -1) : 1 - u.team;
  if (u.kind === 'hero') heroDeath(u, kh, src);
  else if (u.kind === 'minion') {
    const sc = 1 + Math.min(G.t / 60, 25) * 0.02, d = MINION[u.mtype];
    if (kh) { giveGold(kh, Math.round(d.gold * sc)); kh.stats.cs++; fx('gold', u.x, u.y, { v: Math.round(d.gold * sc), id: kh.id }); }
    else for (const h of G.heroes) if (h.team === foe && !h.dead && hyp(h.x - u.x, h.y - u.y) < 950) giveGold(h, Math.round(d.gold * sc * 0.35));
    shareXp(foe, u.x, u.y, d.xp * (1 + Math.min(G.t / 60, 25) * 0.03), 1050, kh);
    fx('poof', u.x, u.y, { c: u.team === BLUE ? '#46b4ff' : '#ff5d5d' });
    if (u.mtype === 'lord') ev({ t: 'lordDown', team: u.team });
  } else if (u.kind === 'monster') monsterDeath(u, kh);
  else if (u.kind === 'clone') fx('echoEnd', u.x, u.y, { id: u.id, c: u.look.glow, hit: 1 });
  else if (u.kind === 'turret') {
    updateStructureLocks();
    for (const h of G.heroes) if (h.team === foe) giveGold(h, 90);
    if (kh) giveGold(kh, 110);
    shareXp(foe, u.x, u.y, 180, 1400, kh);
    fx('explode', u.x, u.y, {}); sfx('crash', u.x, u.y);
    ev({ t: 'turret', team: u.team, lane: u.lane, tier: u.tier, by: kh ? kh.name : null });
  } else if (u.kind === 'crystal') {
    G.over = true; G.winner = 1 - u.team; fx('explode', u.x, u.y, { big: true }); sfx('crash', u.x, u.y);
    ev({ t: 'end', winner: G.winner });
  }
}
function heroDeath(u, kh, src) {
  const vs = u.streak; u.deaths++; u.streak = 0; u.multi = 0; u.locked = false; u.reviveT = 0;
  u.respawnT = G.practice ? 3 : 4 + u.level * 1.6 + Math.min(G.t / 60, 20) * 0.7;
  const hadBuffs = ['azure', 'crimson'].filter(k => hasBuff(u, k));
  if (u.snipe) snipeEnd(u, true); if (u.camo) u.camo = false;
  if (u.tp) tpStop(u, false); if (u.form && u.def.forms.beast) beastOff(u, true);
  u.buffs = []; u.shields = []; u.stunT = u.rootT = 0; u.tauntT = 0; u.tauntBy = null; u.dash = u.leap = u.disp = u.air = null; u.recallT = 0; u.windT = 0; u.atkTarget = null; u.mvx = u.mvy = 0; u.z = 0;
  for (const r of u.re) if (r && r.pts) for (const q of r.pts) if (q.prop) q.prop.t = 0;
  u.re = [null, null, null]; u.mend = null; u.om = null; endFlurry(u); if (u.form) { u.form = 0; u.cds[0] = u.cds[1] = 0; recalc(u); }
  const E = 1 - u.team; G.kills[E]++;
  const assists = [];
  for (const h of G.heroes) if (h.team === E && h !== kh && G.t - (u.dmgLog[h.id] || -99) < 10) assists.push(h);
  u.dmgLog = {}; makeRecap(u, kh, src, assists);
  let first = false, multi = 0;
  if (kh) {
    kh.kills++; kh.streak++;
    kh.multi = G.t - kh.lastKillT < 10 ? kh.multi + 1 : 1; kh.lastKillT = G.t; multi = kh.multi;
    if (!G.firstBlood) { G.firstBlood = true; first = true; }
    giveGold(kh, 180 + Math.min(vs * 40, 200) + (first ? 100 : 0));
    fx('gold', u.x, u.y, { v: 180 + Math.min(vs * 40, 200) + (first ? 100 : 0), id: kh.id });
    for (const k of hadBuffs) grantJungleBuff(kh, k);
  }
  for (const a of assists) { a.assists++; giveGold(a, 80); }
  for (const h of assists.concat(kh ? [kh] : [])) { const pv = h.def.passive; if (pv && pv.takedown) pv.takedown(h); if (h.has.victorglass && h.cds[2] > 0) { const cut = h.cds[2] * GLASS_K; h.cds[2] -= cut; fx('glass', h.x, h.y, { id: h.id, v: cut }); } }       // (Victor's Hourglass: the glass turns)
  const xp = 110 + 28 * u.level, share = assists.concat(kh ? [kh] : []);
  if (share.length) { const m = XP_SHARE[Math.min(share.length, 5) - 1]; for (const h of share) giveXp(h, xp * m); }
  fx('death', u.x, u.y, { c: u.team === BLUE ? '#46b4ff' : '#ff5d5d', id: u.id }); sfx('death', u.x, u.y);
  ev({ t: 'kill', killer: kh ? kh.id : 0, by: kh ? kh.name : (src ? src.kind : 'the wilds'), victim: u.id, assists: assists.map(a => a.id), first, multi, streak: kh ? kh.streak : 0, shutdown: vs >= 3 });
  if (G.heroes.every(h => h.team !== u.team || h.dead)) ev({ t: 'ace', team: E });
}
function grantJungleBuff(h, type) {
  if (type === 'azure') addBuff(h, { k: 'azure', t: 80, cdr: 15, mpR: 0.012, aura: '#4f9dff' });
  else addBuff(h, { k: 'crimson', t: 80, aura: '#ff6a4a' });
}
function monsterDeath(u, kh) {
  const d = MONSTER[u.mtype], sc = 1 + Math.min(G.t / 60, 25) * 0.025;
  fx('poof', u.x, u.y, { c: '#c9d6c0', big: u.r > 40 });
  if (u.camp) { const c = u.camp; c.units = c.units.filter(m => m !== u); if (!c.units.length) c.respT = c.type === 'small' ? 70 : c.type === 'skitter' ? 75 : 90; }
  if (!kh) return;
  if (u.mtype === 'turtle' || u.mtype === 'lord') {
    const T = kh.team, big = u.mtype === 'lord';
    for (const h of G.heroes) if (h.team === T) { giveGold(h, big ? 130 : 100); giveXp(h, big ? 320 : 220); }
    giveGold(kh, 90);
    if (big) { G.epic.lord = null; G.epic.lordT = 180; G.pending.push({ t: G.t + 5, team: T }); }
    else { G.epic.turtle = null; G.epic.turtleT = 120; }
    ev({ t: 'epic', which: u.mtype, team: T, by: kh.name }); sfx('horn', u.x, u.y);
    return;
  }
  giveGold(kh, Math.round(d.gold * sc)); kh.stats.cs++;
  fx('gold', u.x, u.y, { v: Math.round(d.gold * sc), id: kh.id });
  shareXp(kh.team, u.x, u.y, d.xp * sc, 700, kh);
  if (u.mtype === 'azure' || u.mtype === 'crimson') grantJungleBuff(kh, u.mtype);
  if (d.mend && !kh.dead) { heal(kh, kh, kh.maxHp * d.mend); kh.mp = Math.min(kh.maxMp, kh.mp + kh.maxMp * d.mend); fx('ring', kh.x, kh.y, { c: '#7dffb0', r: 110 }); }
}
/* A duel does not drag on: from its sixth minute the turrets and crystals take more and more damage (twice as much at nine minutes,
   three times at twelve, five times at the most), on both sides alike. */
const DUEL_RUSH_T = 360, DUEL_RUSH_K = 1 / 180, DUEL_RUSH_MAX = 4;
function duelRush() { const t = G.t - DUEL_RUSH_T; return t <= 0 ? 1 : 1 + Math.min(t * DUEL_RUSH_K, DUEL_RUSH_MAX); }
function updateStructureLocks() {
  for (const team of [BLUE, RED]) {
    let open = false;
    for (const lane of G.lanes) {
      const ts = G.turrets.filter(t => t.team === team && t.lane === lane).sort((a, b) => a.tier - b.tier);
      let prevAlive = false;
      for (const t of ts) { t.locked = prevAlive; if (!t.dead) prevAlive = true; }
      if (!prevAlive) open = true;
    }
    if (G.crystals[team]) G.crystals[team].locked = !open || !!G.practice;
  }
}
function laneOpen(team, lane) { return G.turrets.every(t => t.team !== team || t.lane !== lane || t.dead); }
function nextStructure(team, lane) {      // the structure of `team` an attacker in `lane` must hit next
  let best = null;
  for (const t of G.turrets) if (t.team === team && t.lane === lane && !t.dead && (!best || t.tier < best.tier)) best = t;
  return best || (G.crystals[team].dead ? null : G.crystals[team]);
}

/* ---------------- movement ---------------- */
function moveUnit(u, dx, dy, step) {       // (dx,dy) unit direction; walls turn the step along themselves
  if (!wallSlide(u.x, u.y, dx * step, dy * step, 0.4)) {
    u.vx = u.vy = 0;
    if (sdAt(u.x, u.y) < -6) { const p = nearestWalkable(u.x, u.y); u.x = p.x; u.y = p.y; }      // never leave anything inside a wall
    return false;
  }
  roundPosts(u, dx, dy, step);
  const k = step > 1e-6 ? u.ms / step : 0, mx = _wx - u.x, my = _wy - u.y; u.vx = mx * k; u.vy = my * k; u.x = _wx; u.y = _wy; return mx * mx + my * my > 1e-6;
}
/* Turrets and crystals stand in the way like walls, only round: a walker that meets one is carried round its side, at half its pace at
   least however squarely it walked in, instead of being held against it. Works on the step the walls allowed, (_wx, _wy). */
function roundPosts(u, dx, dy, step) {
  const S = G.posts || (G.posts = G.turrets.concat(G.crystals));
  for (let i = 0; i < S.length; i++) {
    const t = S[i]; if (t.dead || t === u) continue;
    const rr = (u.r + t.r) * 0.9 + 0.5, ex = _wx - t.x, ey = _wy - t.y; if (ex * ex + ey * ey >= rr * rr) continue;
    let nx = u.x - t.x, ny = u.y - t.y; const n = hyp(nx, ny); if (n < 1e-3) { nx = -dx; ny = -dy; } else { nx /= n; ny /= n; }
    if (dx * nx + dy * ny >= 0) return;       // on its way out already
    const along = dy * nx - dx * ny, R = Math.max(n, rr), arc = Math.max(Math.abs(along), 0.5) * step / R;
    let side = along > 0.02 ? 1 : along < -0.02 ? -1 : (u.id & 1 ? 1 : -1);       // dead on: every walker keeps to a side of its own
    for (let k = 0; k < 2; k++, side = -side) {
      const a = side * arc, c = fcos(a), sn = fsin(a), qx = t.x + (nx * c - ny * sn) * R, qy = t.y + (nx * sn + ny * c) * R;
      if (sdAt(qx, qy) > 0.5) { _wx = qx; _wy = qy; return; }
      if (Math.abs(along) > 0.5) break;       // it picked that side itself: no turning back into its own push
    }
    return;       // a wall on that side: leave the step as the walls allowed it and squeeze by
  }
}
/* A spot to walk to must not lie under a turret or a crystal, or the walker would circle it for ever: it is moved to the nearest
   spot beside it. (A spot at the very middle of one means the thing itself is the target, and stays.) */
function postFree(q, r) {
  const S = G.posts || (G.posts = G.turrets.concat(G.crystals));
  for (let i = 0; i < S.length; i++) {
    const t = S[i]; if (t.dead) continue;
    const rr = (r + t.r) * 0.9 + 3, ex = q.x - t.x, ey = q.y - t.y, d = hyp(ex, ey); if (d >= rr) continue;
    if (d < 20) return q;
    const ux = ex / d, uy = ey / d;
    for (let k = 0; k < 8; k++) {       // straight out first, then further and further round it until the spot can be stood on
      const a = (k + 1 >> 1) * (k & 1 ? -0.7 : 0.7), c = fcos(a), sn = fsin(a), x = t.x + (ux * c - uy * sn) * rr, y = t.y + (ux * sn + uy * c) * rr;
      if (sdAt(x, y) > 1) { q.x = x; q.y = y; return q; }
    }
    return q;
  }
  return q;
}
function planPath(u, x, y) { const P = findPath(u.x, u.y, x, y); if (P) for (let i = 0; i < P.length; i++) postFree(P[i], u.r); return P; }
/* Walk to a spot, going round walls instead of pushing into them: straight when the line is clear, along a found path when it is not,
   looked at again every 0.45 s. key names the destination (a unit's id, or a negative number for a place) so a new one is planned afresh. */
function goTo(u, key, x, y, dt) {
  let c = u.cp;
  if (!c || c.id !== key || G.t > c.until) c = u.cp = { id: key, until: G.t + 0.45, i: 0, path: losWalk(u.x, u.y, x, y) ? null : planPath(u, x, y) };
  const P = c.path; let px = x, py = y;
  if (P && P.length) { c.i = pathStep(P, c.i, u.x, u.y, 50); px = P[c.i].x; py = P[c.i].y; }
  const ok = moveToward(u, px, py, dt);
  if (!ok && c.until > G.t + 0.1) c.until = G.t + 0.1;       // held up: look again at once
  return ok;
}
function chaseMove(h, t, dt) { return goTo(h, t.id, t.x, t.y, dt); }       // walk to an attack target
function moveToward(u, tx, ty, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = hyp(dx, dy); if (d < 2) return false;
  u.face = fatan2(dy, dx); u.moving = true;
  return moveUnit(u, dx / d, dy / d, Math.min(d, u.ms * dt));
}
function blink(h, x, y) { if (h.leap) { h.leap = null; h.z = 0; } h.dash = null; const p = clampWalk(h.x, h.y, x, y); h.x = p.x; h.y = p.y; h.atkTarget = null; if (h.ai) h.ai.path = null; }
function startDash(h, ang, d, speed, o) { h.dash = { ang, left: d, speed, hit: {}, o: o || {}, cx: G.cx }; h.windT = 0; h.face = ang; }
function leapTo(h, x, y, dur, onLand) { const p = clampWalk(h.x, h.y, x, y); h.leap = { x0: h.x, y0: h.y, x1: p.x, y1: p.y, t: 0, dur, onLand, cx: G.cx }; h.windT = 0; if (h.ai) h.ai.path = null; }
function pullTo(u, x, y, dur) {
  if (u.dead || u.leap || u.kind === 'turret' || u.kind === 'crystal') return;
  const sb = steadyOf(u); if (sb) { blocked(u, sb); return; }
  const p = clampWalk(u.x, u.y, x, y); u.disp = { x0: u.x, y0: u.y, x1: p.x, y1: p.y, t: 0, dur }; u.dash = null; u.windT = 0; u.recallT = 0; logHold(u, 'pull', dur);
  if (u.ai) u.ai.path = null;
}

/* ---------------- projectiles & areas ---------------- */
function lineProj(h, ang, o) {
  const p = { x: h.x + fcos(ang) * 30, y: h.y + fsin(ang) * 30, ang, vx: fcos(ang) * o.speed, vy: fsin(ang) * o.speed, left: o.range - 30, w: o.w, team: h.team, src: h, pierce: !!o.pierce, hitIds: {}, hit: o.hit, end: o.end, look: o.look || 'orb', c: o.c || '#fff', speed: o.speed, ci: o.ci, big: o.big, quiet: o.quiet, step: o.step, cx: G.cx };
  G.projs.push(p); return p;
}
function homingProj(src, tgt, speed, onHit, look, c) {
  G.projs.push({ homing: true, x: src.x, y: src.y, tgt, speed, onHit, team: src.team, src, look: look || 'shot', c: c || '#fff', ang: fatan2(tgt.y - src.y, tgt.x - src.x), h: src.kind === 'turret' || src.kind === 'crystal' ? 110 : 34, cx: G.cx });
}
/* A shot that skips on: from what it hit to the nearest enemy this chain has not touched yet, up to o.n times, o.k times weaker each
   skip (flat: not weaker at all). Never a turret or a crystal, never a hero out of sight, and a camp left in peace stays that way
   unless the chain started on a creep. o.f: how the damage counts (basic or skill). */
function ricochet(h, from, amt, o) {
  const seen = {}; seen[from.id] = 1; const wild = from.kind === 'monster';
  const hop = (src, a, left) => {
    let best = null, bd = 1e9;
    for (const u of G.units) {
      if (u.dead || u.locked || u.team === h.team || seen[u.id] || u.kind === 'turret' || u.kind === 'crystal') continue;
      if (u.kind === 'hero' && !u.vis[h.team]) continue;
      if (u.kind === 'monster' && !u.aggro && !wild) continue;
      const d = hyp(u.x - src.x, u.y - src.y) - u.r * 0.6; if (d <= o.r && d < bd) { bd = d; best = u; }
    }
    if (!best) return;
    seen[best.id] = 1;
    G.projs.push({ homing: true, skip: true, x: src.x, y: src.y, tgt: best, speed: 1500, team: h.team, src: h, look: 'skip', c: o.c || '#fff', ci: o.ci, cx: G.cx, ang: fatan2(best.y - src.y, best.x - src.x),
      onHit(t) { dmg(h, t, a, 'phys', Object.assign({ skip: true }, o.f)); sfx('tick', t.x, t.y); if (left > 1) hop(t, o.flat ? a : a * o.k, left - 1); } });
  };
  hop(from, amt, o.n);
}
/* a blade flying home to its thrower from (x, y), cutting through whatever stands in between */
function retProj(h, x, y, o) { G.projs.push({ ret: true, x, y, ang: fatan2(h.y - y, h.x - x), speed: o.speed, w: o.w, team: h.team, src: h, hitIds: {}, hit: o.hit, life: 2.4, look: o.look || 'orb', c: o.c || '#fff', ci: o.ci, cx: G.cx }); }
/* something left lying on the ground for a while (a thrown ring blade waiting to be called back): seen, never touched */
function prop(h, x, y, o) { const a = { type: 'prop', x, y, r: 0, t: o.dur, dur: o.dur, team: h.team, src: h, look: o.look, ci: o.ci, ang: o.ang || 0 }; G.areas.push(a); return a; }
function delayAoE(h, x, y, o) { G.areas.push({ type: 'delay', x, y, r: o.r, t: o.delay, dur: o.delay, team: h.team, src: h, hit: o.hit, done: o.done, c: o.c, look: o.look || 'slam', ci: o.ci, n: o.n, follow: o.follow || null, cx: G.cx }); }
function trap(h, x, y, o) { const a = { type: 'trap', x, y, r: o.r, arm: o.arm, t: o.dur, dur: o.dur, team: h.team, src: h, spring: o.spring, gone: o.gone, look: o.look, ci: o.ci, c: o.c, cx: G.cx }; G.areas.push(a); return a; }
/* Spirit marks: left by one form's skills (two at most, 8s), spent one at a time by the other form's hits for bonus magic damage. */
function markOf(e) { return e.km && e.km.until > G.t ? e.km.n : 0; }
function mark(h, e) { if (e.dead || e.kind === 'turret' || e.kind === 'crystal') return; const im = immuneOf(e); if (im) { blocked(e, im); return; } const n = Math.min(2, markOf(e) + 1); e.km = { n, until: G.t + 8, c: h.look.heron || '#8fe6ff' }; skfx(h, 'mark', e.x, e.y, { tid: e.id, dur: 8, n }); }
function useMark(h, e) {
  if (e.dead || markOf(e) < 1) return false; e.km.n--; if (e.km.n < 1) e.km.until = 0;
  skfx(h, 'markx', e.x, e.y, { tid: e.id, n: e.km.n }); dmg(h, e, 100 + 14 * h.level + 0.4 * h.ap, 'magic', { skill: true, n: 'Spirit mark', ic: 'mask' }); return true;
}
function setForm(h, f) { h.form = f; h.cds[0] = h.cds[1] = 0; h.re[0] = h.re[1] = null; h.atkTarget = null; h.windT = 0; recalc(h); }
function zone(h, x, y, o) { const a = { type: 'zone', x, y, r: o.r, t: o.dur, dur: o.dur, tick: o.tick, acc: o.tick, team: h.team, src: h, hit: o.hit, each: o.each || null, follow: o.follow || null, hold: o.hold ? { stay: o.hold.stay, root: o.hold.root, fx: o.hold.fx || null, k: 0, by: {} } : null, c: o.c, look: o.look || 'zone', ci: o.ci, cx: G.cx }; G.areas.push(a); return a; }       // hit: every enemy in it, each tick; each: once a tick, whoever is in it (what it does for its own side); hold: { stay, root }: an enemy that has been in it for `stay` seconds running is rooted for `root`, once
/* a zone that holds: by[id] is how many ticks running (n) that unit has been in it, as of which tick (k), and whether it has been held by it already */
function zoneHold(a, e) {
  const H = a.hold, s = H.by[e.id] || (H.by[e.id] = { n: 0, k: -9, held: false }); s.n = s.k === H.k - 1 ? s.n + 1 : 1; s.k = H.k;
  if (!s.held && !e.dead && (s.n - 1) * a.tick >= H.stay - 1e-6) { s.held = true; const sb = steadyOf(e); root(e, H.root); if (H.fx && !sb && e.rootT > 0) skfx(a.src, H.fx, e.x, e.y, { tid: e.id, dur: e.rootT }); }       // (fx: what it looks like on whoever it holds)
}
function beam(h, ang, o) { G.areas.push({ type: 'beam', x: h.x, y: h.y, ang, len: o.len, w: o.w, t: o.delay, dur: o.delay, team: h.team, src: h, hit: o.hit, c: o.c, look: 'beam', ci: o.ci, cx: G.cx }); }
function tickProjs(dt) {
  const P = G.projs;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; let done = !!p.kill;       // kill: taken out of the air by whoever threw it
    G.cx = p.cx || null;
    if (done) { /* gone */ } else if (p.homing) {
      const t = p.tgt;
      if (t.dead) done = true;
      else {
        const dx = t.x - p.x, dy = t.y - p.y, d = hyp(dx, dy), st = p.speed * dt;
        p.ang = fatan2(dy, dx);
        if (d <= st + t.r * 0.5) { p.onHit(t); if (!p.quiet) fx('spark', t.x, t.y, { c: p.c, small: p.look === 'pellet', id: p.ci != null ? p.src.id : 0, ci: p.ci, lf: p.look === 'leaf' || p.look === 'skip' ? 1 : 0 }); done = true; } else { p.x += dx / d * st; p.y += dy / d * st; }
      }
    } else if (p.ret) {
      const t = p.src; let st = p.speed * dt; p.life -= dt;
      if (t.dead || p.life <= 0) done = true;
      while (st > 0 && !done) {
        const dx = t.x - p.x, dy = t.y - p.y, d = hyp(dx, dy); if (d < 34) { done = true; break; }
        const s = Math.min(st, 28, d); st -= s; p.ang = fatan2(dy, dx); p.x += dx / d * s; p.y += dy / d * s;
        for (const e of enemiesIn(p.team, p.x, p.y, p.w / 2)) { if (p.hitIds[e.id]) continue; p.hitIds[e.id] = 1; p.hit(e, p); fx('spark', p.x, p.y, { c: p.c, id: p.src.id, ci: p.ci, ang: p.ang }); }
      }
    } else {
      let st = p.speed * dt;
      while (st > 0 && !done) {
        const s = Math.min(st, 28); st -= s; p.x += fcos(p.ang) * s; p.y += fsin(p.ang) * s; p.left -= s;
        if (p.step) p.step(p);
        for (const e of enemiesIn(p.team, p.x, p.y, p.w / 2)) {
          if (p.hitIds[e.id]) continue; p.hitIds[e.id] = 1; p.hit(e, p);
          if (!p.quiet) fx('spark', p.x, p.y, { c: p.c, id: p.src.id, ci: p.ci, ang: p.ang, lf: p.look === 'leaf' ? 1 : 0 });
          if (!p.pierce) { done = true; break; }
        }
        if (!done && p.left <= 0) { if (p.end) p.end(p); done = true; }
      }
    }
    if (done) { P[i] = P[P.length - 1]; P.pop(); }
  }
  G.cx = null;
}
function tickAreas(dt) {
  const A = G.areas;
  for (let i = A.length - 1; i >= 0; i--) {
    const a = A[i]; a.t -= dt; G.cx = a.cx || null;
    if (a.type === 'trap') {       // lies in wait: the first enemy to come near once it is armed springs it (a hero first, if several are there)
      if (a.t > 0 && a.dur - a.t >= a.arm) { const es = enemiesIn(a.team, a.x, a.y, a.r), e = es.find(q => q.kind === 'hero') || es[0]; if (e) { a.t = 0; a.sprung = true; a.spring(e, a); } }
      if (a.t <= 0 && a.gone) a.gone(a);
    } else if (a.type === 'delay' && a.follow) { if (a.follow.dead) a.follow = null; else { a.x = a.follow.x; a.y = a.follow.y; } }
    if (a.type === 'trap') { /* handled */ } else if (a.type === 'zone') {
      if (a.follow) { if (a.follow.dead) a.t = 0; else { a.x = a.follow.x; a.y = a.follow.y; } }
      a.acc += dt;
      if (a.acc >= a.tick && a.t > -dt) { a.acc -= a.tick; for (const e of enemiesIn(a.team, a.x, a.y, a.r)) { a.hit(e); if (a.hold) zoneHold(a, e); } if (a.hold) a.hold.k++; if (a.each) a.each(a); }
    } else if (a.t <= 0) {
      if (a.type === 'delay') { if (a.n) skfx(a.src, a.n, a.x, a.y, { r: a.r }); else fx('quake', a.x, a.y, { c: a.c, r: a.r }); sfx('thud', a.x, a.y); for (const e of enemiesIn(a.team, a.x, a.y, a.r)) a.hit(e); if (a.done) a.done(a); }
      else if (a.type === 'beam') {
        const ex = a.x + fcos(a.ang) * a.len, ey = a.y + fsin(a.ang) * a.len;
        fx('beam', a.x, a.y, { c: a.c, x2: ex, y2: ey, w: a.w, id: a.src.id, ci: a.ci }); sfx('boom', a.x, a.y);
        for (const u of G.units) {
          if (u.dead || u.team === a.team || u.kind === 'turret' || u.kind === 'crystal') continue;
          if (segDist(u.x, u.y, a.x, a.y, ex, ey) <= a.w / 2 + u.r * 0.6) a.hit(u);
        }
      }
    }
    if (a.t <= 0) { A[i] = A[A.length - 1]; A.pop(); }
  }
  G.cx = null;
}

/* ---------------- basic attacks ---------------- */
/* A flurry (Vex's Death Mark): the next few basic attacks on one marked hero come almost on top of each other, whatever his attack speed;
   then, or when the time runs out or the marked hero falls, he swings as he always does. */
function startFlurry(h, t, ci) { h.flurry = { tgt: t, n: FLURRY_N, until: G.t + FLURRY_T, ci }; h.atkCd = 0; h.windT = 0; h.atkTarget = t; h.chase = true; addBuff(t, { k: 'deathmark', t: FLURRY_T, src: h.id }); fx('flurry', t.x, t.y, { id: h.id, tgt: t.id, ci, n: FLURRY_N }); }
function flurryOf(u, t) { const f = u.flurry; if (!f) return null; if (f.n <= 0 || G.t >= f.until || f.tgt.dead) { endFlurry(u); return null; } return !t || f.tgt === t ? f : null; }
function endFlurry(u) { const f = u.flurry; if (!f) return; u.flurry = null; const t = f.tgt; if (t && t.buffs) t.buffs = t.buffs.filter(b => !(b.k === 'deathmark' && b.src === u.id)); }
function attackStep(u, t) {
  if (u.windT > 0 || u.atkCd > 0) return;
  const fl = u.flurry ? flurryOf(u, t) : null;
  u.windup = fl ? FLURRY_WIND : Math.max(0.07, (u.kind === 'hero' ? 0.26 : 0.3) / u.asp); u.windT = u.windup; u.windTgt = t; u.atkAnim = 1;
  u.face = fatan2(t.y - u.y, t.x - u.x);
}
function fireBasic(u, t) {
  u.revealT = G.t + 1.2;
  const structure = t.kind === 'turret' || t.kind === 'crystal';
  let amt = u.ad, crit = false, type = 'phys';
  const ls = u.kind === 'hero' && !!u.def.lethal && !structure && lethalReady(u);       // a Long Shot (Sorrel)
  if (u.kind === 'hero') {
    if (structure) amt = Math.max(u.ad, u.def.base.ad + u.def.base.adG * (u.level - 1) + u.ap * 0.6);
    else if (ls ? rnd() < u.crit + LETHAL_CRIT : u.crit > 0 && rnd() < u.crit) { crit = true; amt *= u.critDmg; }
  } else if (u.kind === 'minion') { if (structure) amt *= (u.mtype === 'siege' ? 2.4 : u.mtype === 'lord' ? 2.0 : 1.0); }
  else if (u.kind === 'clone') { if (structure) amt *= 0.5; }
  else if (u.kind === 'turret' || u.kind === 'crystal') {
    amt = (u.ad + Math.min(G.t / 60, 20) * 12);
    if (t.kind === 'hero') { amt *= 1 + 0.4 * Math.min(u.ramp, 4); u.ramp++; }
  }
  let ctx = null;
  if (u.kind === 'hero' && !structure) {
    ctx = { amt, magic: 0, heal: 0, slow: null, big: false, ls }; const pv = u.def.passive; if (pv && pv.basic) pv.basic(u, t, ctx); if (ctx.type) type = ctx.type;
    if (u.has.galebow) ctx.magic += 30 + 4 * u.level;
    if (u.has.quickblade) { u.pv.qb = (u.pv.qb || 0) + 1; if (u.pv.qb % 4 === 0) { ctx.amt *= 1.8; ctx.big = true; } }
    if (u.has.squallsong) { if (G.t >= Math.max(u.sqAt || 0, u.sqMin || 0)) { ctx.squall = true; u.sqAt = G.t + SQUALL_CD0; u.sqMin = G.t + SQUALL_CD1; } else u.sqAt -= SQUALL_STEP; }
    amt = ctx.amt; if (ctx.big) crit = crit || 'big';
  }
  const insp = u.kind === 'hero' ? hasBuff(u, 'inspire') : null, fl = { basic: true, crit: crit === true }; let inspH = 0;       // Inspire: this is one of its attacks
  if (insp && insp.n > 0) { fl.pen = inspirePen(u); inspH = inspireHeal(u); if (--insp.n <= 0) insp.t = 0; }
  const apply = tgt => {
    if (tgt.dead) return;
    dmg(u, tgt, amt, type, fl); if (inspH > 0 && !u.dead) heal(u, u, inspH); if (ctx && ctx.focus && !u.dead) u.mp = Math.min(u.maxMp, u.mp + ctx.focus);
    if (ctx && ctx.after) ctx.after(tgt, amt);
    if (ctx && ctx.squall && !u.dead) squall(u, tgt);
    if (ctx) { if (ctx.magic > 0 && !tgt.dead) dmg(u, tgt, ctx.magic, 'magic', { noVamp: true }); if (ctx.heal > 0 && !u.dead) heal(u, u, ctx.heal); if (ctx.slow && !tgt.dead) slow(tgt, ctx.slow[0], ctx.slow[1]); if (ctx.mark && !tgt.dead) useMark(u, tgt); }
    if (u.kind === 'hero' && !tgt.dead && hasBuff(u, 'crimson') && !structure) { dmg(u, tgt, 18 + 5 * u.level, 'true', { noVamp: true, n: 'Crimson buff', ic: 'rage' }); slow(tgt, u.melee ? 0.2 : 0.1, 1); }
  };
  const pc = G.cx; G.cx = { h: u, n: 'Basic attack', ic: 'sword' };
  if (u.range <= 260) {
    if (hyp(t.x - u.x, t.y - u.y) <= u.range + t.r + 110) { apply(t); fx('hit', t.x, t.y, { c: u.kind === 'hero' || u.kind === 'clone' ? (u.look.glow || u.look.trim) : '#ffffff', big: !!crit, ax: u.x, ay: u.y, hero: u.kind === 'hero' || u.epic, id: u.kind === 'hero' ? u.id : 0 }); sfx(u.kind === 'hero' ? 'hit' : 'tick', t.x, t.y); }
  } else {
    const sp = u.kind === 'hero' ? (ls ? 2300 : u.look.weapon === 'rifle' ? 1900 : 1500) : u.kind === 'minion' ? 1000 : 1500;
    const look = u.kind === 'turret' || u.kind === 'crystal' ? 'bolt' : u.kind === 'hero' ? (u.look.weapon === 'bow' ? 'arrow' : u.look.weapon === 'leaf' ? 'leaf' : u.look.weapon === 'rifle' ? (ls ? 'longshot' : 'slug') : 'shot') : 'pellet';
    const c = u.kind === 'hero' ? (u.look.glow || u.look.trim) : u.team === BLUE ? '#7ac8ff' : '#ff8a7a';
    homingProj(u, t, sp, apply, look, c);
    sfx(u.kind === 'hero' ? (u.look.weapon === 'rifle' ? (ls ? 'shot' : 'rifle') : 'shoot') : u.kind === 'minion' ? 'tick' : 'zap', u.x, u.y);
  }
  G.cx = pc;
}

/* ---------------- Halvar: his echoes, and the Stormhorn ----------------
   An echo is a unit of its own (kind 'clone'): it has health, can be hit and killed, and is seen or not as a hero would be. It
   carries enough of what a hero carries (key, skin, look, def, castN, castI, ...) for the view to draw it as him. It hits what he
   hits, or failing that whoever of theirs is nearest it, and never strays far from him; what it does is put down to him (dmg, kill).
   It is worth nothing to whoever kills it. */
function echoesOf(h) { const out = []; for (const u of G.units) if (u.kind === 'clone' && u.owner === h && !u.dead) out.push(u); return out; }
function echoEnd(u) { if (u.dead) return; u.dead = true; u.hp = 0; fx('echoEnd', u.x, u.y, { id: u.id, c: u.look.glow }); }
function echoSpawn(h, x, y, lv, slot) {
  const u = newUnit('clone', h.team, x, y, { owner: h, key: h.key, skin: h.skin, look: h.look, def: h.def, name: h.name, level: h.level, r: 34, slot, lv,
    maxHp: Math.round(h.maxHp * ECHO_HP), armor: h.armor, mr: h.mr, ad: h.ad * echoAd(lv), asp: h.asp, range: h.range, ms: h.ms * 1.06, msBase: h.ms * 1.06, melee: true, face: h.face,
    life: ECHO_T, tgt: null, thinkT: 0, dash: null, leap: null, form: 0, castN: 0, castI: 0, castAnim: 0, z: 0, mp: 1, maxMp: 1, pv: {}, has: {}, recallT: 0, reviveT: 0 });
  u.hp = Math.max(1, u.maxHp * (h.hp / h.maxHp)); u.bush = h.bush; u.vis = [h.vis[0], h.vis[1]];
  fx('echo', u.x, u.y, { id: u.id, x0: h.x, y0: h.y, c: h.look.glow }); return u;
}
function echoFist(u, e, amt) {       // his Stormknuckle found somebody: the echo goes for the same one
  if (u.dead || u.stunT > 0 || u.disp || u.air || e.dead) return; const d = hyp(e.x - u.x, e.y - u.y); if (d > ECHO_FIST_R) return;
  const ang = fatan2(e.y - u.y, e.x - u.x); u.tgt = e; u.castN++; u.castI = 1; u.castAnim = 0.3;
  startDash(u, ang, d + FIST_PUSH + 60, 1700, { w: 60, aim: e, stopOn: q => q === e, hit(q) { if (q === e) { dmg(u, e, amt, 'phys', { skill: true, n: 'Echoes', ic: 'echo' }); fx('echoHit', e.x, e.y, { c: u.look.glow, ang }); } } });
}
function tickEcho(u, dt) {
  const h = u.owner; u.life -= dt;
  if (u.life <= 0 || h.dead || h.form) { echoEnd(u); return; }
  if (u.castAnim > 0) u.castAnim -= dt;
  if (u.stunT > 0 || u.disp || u.air) { u.dash = null; return; }
  if (u.dash) { const q = u.dash.o.aim; if (q && !q.dead) u.dash.ang = fatan2(q.y - u.y, q.x - u.x); stepDash(u, dt); return; }       // (it runs at whoever he struck, wherever the blow has sent them)
  const side = h.face + (u.slot ? 2.3 : -2.3);
  if (hyp(u.x - h.x, u.y - h.y) > ECHO_LEASH + 240) { const p = nearestWalkable(h.x + fcos(side) * 100, h.y + fsin(side) * 100); u.x = p.x; u.y = p.y; u.tgt = null; u.windT = 0; u.cp = null; }       // left behind (he flickered, or went home): it is beside him again
  u.thinkT -= dt;
  if (u.thinkT <= 0 || (u.tgt && !canTarget(u, u.tgt))) {
    u.thinkT = 0.25; let t = null; const ht = h.atkTarget;
    if (u.tauntT > 0 && u.tauntBy && !u.tauntBy.dead) t = u.tauntBy;
    else if (ht && canTarget(u, ht) && hyp(ht.x - h.x, ht.y - h.y) < ECHO_LEASH) t = ht;
    else { let bd = 1e9; for (const e of G.units) { if (e.team === NEUTRAL || e.kind === 'turret' || e.kind === 'crystal' || !canTarget(u, e) || hyp(e.x - h.x, e.y - h.y) > ECHO_LEASH) continue; let d = hyp(e.x - u.x, e.y - u.y) - e.r; if (d > ECHO_SEEK) continue; if (e.kind !== 'hero') d += 300; if (d < bd) { bd = d; t = e; } } }
    u.tgt = t;
  }
  const t = u.tgt;
  if (t) {
    const d = hyp(t.x - u.x, t.y - u.y) - t.r;
    if (d <= u.range) { u.face = fatan2(t.y - u.y, t.x - u.x); attackStep(u, t); }
    else if (u.windT <= 0 && u.rootT <= 0) chaseMove(u, t, dt);
  } else if (u.rootT <= 0) {
    const x = h.x + fcos(side) * 105, y = h.y + fsin(side) * 105;
    if (hyp(x - u.x, y - u.y) > 46) goTo(u, -7 - u.slot, x, y, dt); else u.face = h.face;
  }
}
/* The Stormhorn. On: his echoes go, his own two cooldowns are noted (they go on running while he is the ram), the ram's skills are
   ready, he is bigger and has more health (recalc: forms.hp). Off: when its time is up (his passive's tick) or he falls; his own
   cooldowns are what they would have come down to, and only now does the ultimate's start. */
function beastOn(h, lv) {
  for (const u of echoesOf(h)) echoEnd(u);
  h.pv.keep = { t: G.t, c: [h.cds[0], h.cds[1]] }; h.pv.bt = G.t + BEAST_T; h.pv.sky = false;
  h.form = 1; h.r = BEAST_R; h.cds[0] = h.cds[1] = 0; h.re = [null, null, null]; h.windT = 0;
  addBuff(h, { k: 'beast', t: BEAST_T + 0.5, msMul: BEAST_MS }); recalc(h);
}
function beastOff(h, dead) {
  if (!h.form) return; const k = h.pv.keep, s = h.def.skills[2];
  h.form = 0; h.r = 36; h.re = [null, null, null]; h.windT = 0; h.buffs = h.buffs.filter(b => b.k !== 'beast');
  for (let i = 0; i < 2; i++) h.cds[i] = k ? Math.max(0, k.c[i] - (G.t - k.t)) : 0;
  h.cds[2] = skillCd(s, h.sk[2]) * (1 - h.cdr); h.pv.keep = null;
  recalc(h); if (!dead) { fx('beastOff', h.x, h.y, { id: h.id }); sfx('skill', h.x, h.y); }
}
/* Squallsong: the squall its bearer's basic attack lets loose at t and whoever else of theirs is nearest t */
function squall(h, t) {
  let a = squallDmg(h), crit = false; if (h.crit > 0 && rnd() < h.crit) { a *= h.critDmg; crit = true; }
  const hit = t.dead ? [] : [t], near = [];
  for (const e of G.units) {
    if (e === t || e.dead || e.locked || e.team === h.team || e.kind === 'turret' || e.kind === 'crystal') continue;
    if ((e.kind === 'hero' || e.kind === 'clone') && !e.vis[h.team]) continue;
    if (e.kind === 'monster' && !e.aggro && t.kind !== 'monster') continue;
    const d = hyp(e.x - t.x, e.y - t.y) - e.r * 0.6; if (d <= SQUALL_R) near.push([d, e]);
  }
  near.sort((p, q) => p[0] - q[0] || p[1].id - q[1].id); for (let i = 0; i < near.length && hit.length < SQUALL_N; i++) hit.push(near[i][1]);
  fx('squall', t.x, t.y, { id: h.id, ids: hit.map(e => e.id), crit });
  for (const e of hit) dmg(h, e, e.kind === 'minion' ? a * 2 : a, 'magic', { noVamp: true, crit, n: 'Squall', ic: 'fan' });
  addBuff(h, { k: 'squall', t: 2, msMul: SQUALL_MS });
}
/* ---------------- per-unit tick ---------------- */
function tickCommon(u, dt) {
  if (u.stunT > 0) u.stunT -= dt; if (u.rootT > 0) u.rootT -= dt;
  if (u.tauntT > 0) { u.tauntT -= dt; const by = u.tauntBy; if (u.tauntT <= 0 || !by || by.dead || by.locked) { u.tauntT = 0; u.tauntBy = null; if (u.kind === 'hero' && u.atkTarget === by) { u.atkTarget = null; u.chase = false; } } }
  if (u.flash > 0) u.flash -= dt; if (u.atkAnim > 0) u.atkAnim -= dt * 3 * Math.max(1, u.asp);
  if (u.shields.length) { for (const s of u.shields) { if (s.pool) s.t = s.by.dead ? 0 : s.until - G.t; else s.t -= dt; } u.shields = u.shields.filter(s => s.t > 0 && s.v > 0.5); }       // (pool: a shield shared by several, in each one's list: it keeps its own time, and goes with whoever raised it)
  if (u.sg) stingTick(u);
  if (u.buffs.length) { let ch = false; for (const b of u.buffs) { b.t -= dt; if (b.sh && !(b.sh.v > 0.5 && b.sh.t > 0)) b.t = 0; if (b.t <= 0) ch = true; } if (ch) u.buffs = u.buffs.filter(b => b.t > 0); }       // sh: gone with the shield it came with
  if (u.kind !== 'hero' && u.msBase) { let m = 1; for (const b of u.buffs) if (b.msMul && b.msMul < m) m = b.msMul; u.ms = u.msBase * m; }
  if (u.disp) {
    const d = u.disp; d.t += dt; const k = Math.min(1, d.t / d.dur);
    u.x = lerp(d.x0, d.x1, k); u.y = lerp(d.y0, d.y1, k); if (k >= 1) u.disp = null;
  }
  if (u.air) {       // thrown up: over the top and down again
    const a = u.air; a.t += dt; const k = a.t / a.dur;
    if (k >= 1) { u.air = null; if (!u.leap) u.z = 0; fx('land', u.x, u.y, { id: u.id }); sfx('thud', u.x, u.y); }
    else if (!u.leap) u.z = a.z0 * (1 - k) + 4 * k * (1 - k) * a.h;
  }
  if (u.windT > 0) {
    const t = u.windTgt;
    if (!t || t.dead || t.locked || u.stunT > 0 || u.disp || (t.camo && u.kind !== 'turret' && u.kind !== 'crystal' && !t.vis[u.team])) u.windT = 0;
    else { u.windT -= dt; if (u.windT <= 0) {
      const fl = u.flurry ? flurryOf(u, t) : null;
      fireBasic(u, t);
      if (fl) { fl.n--; fx('flurryHit', t.x, t.y, { id: u.id, ci: fl.ci, n: fl.n, ang: u.face }); if (fl.n > 0 && !t.dead) u.atkCd = FLURRY_GAP; else { endFlurry(u); u.atkCd = Math.max(0.05, 1 / u.asp - 0.26 / u.asp); } }       // the last of them: back to his own pace
      else u.atkCd = Math.max(0.05, 1 / u.asp - u.windup);
    } }
  } else if (u.atkCd > 0) u.atkCd -= dt;
  u.moving = false; u.vx = u.vy = 0;
}
/* What a turret or crystal may shoot: whoever is inside its range AND standing on lane or base ground. The woods are out of bounds
   to it, however close. The one exception is whoever is hitting it: that it answers, from a little further out too. */
function guards(s, u) { const d = hyp(u.x - s.x, u.y - s.y); return d <= s.range + u.r && laneSd(u.x, u.y) > 0; }
function answers(s, u) { return s.hitBy === u && G.t - s.hitT < 2.5 && hyp(u.x - s.x, u.y - s.y) <= s.range + 400; }
/* and whoever has just hurt one of its own heroes on its ground, from just outside it too: stepping into the trees does not make a dive safe */
function defends(s, e) { const v = e.aggroV; return e.kind === 'hero' && G.t - e.aggroT < 2 && !!v && !v.dead && v.team === s.team && guards(s, v) && hyp(e.x - s.x, e.y - s.y) <= s.range + 150; }
function tickStructure(s, dt) {
  let t = s.tgt;
  if (t && (t.dead || !(guards(s, t) || answers(s, t) || defends(s, t)))) t = null;
  if (!t || t.kind !== 'hero') {
    for (const e of G.heroes) if (e.team !== s.team && !e.dead && G.t - e.aggroT < 2 && (guards(s, e) || defends(s, e))) { t = e; break; }
  }
  if (!t) {
    let bd = 1e9;
    const U = G.units;
    for (let i = 0; i < U.length; i++) { const u = U[i]; if (u.dead || u.team === s.team || (u.kind !== 'minion' && u.kind !== 'clone')) continue; const dx = u.x - s.x, dy = u.y - s.y, lim = s.range + u.r; if (dx * dx + dy * dy > lim * lim * 1.000001) continue; const d = hyp(dx, dy); if (d < bd && d <= lim && guards(s, u)) { bd = d; t = u; } }       // (the plain squares first: most of the map is nowhere near)
    if (!t) for (const u of G.heroes) { if (u.team === s.team || u.dead) continue; const d = hyp(u.x - s.x, u.y - s.y); if (d < bd && d <= s.range + u.r && guards(s, u)) { bd = d; t = u; } }
    if (!t && s.hitBy && !s.hitBy.dead && answers(s, s.hitBy)) t = s.hitBy;
  }
  if (t !== s.tgt) { s.tgt = t; s.ramp = 0; }
  if (t) attackStep(s, t);
}
function tickMinion(m, dt) {
  if (m.stunT > 0 || m.disp) return;
  m.thinkT -= dt;
  if (m.thinkT <= 0 || (m.tgt && (m.tgt.dead || m.tgt.locked))) {
    m.thinkT = 0.3 + rnd() * 0.1; let best = null, bd = 1e9;
    const ar = m.mtype === 'lord' ? 620 : 540;
    for (const u of G.units) {
      if (u.dead || u.team === m.team || u.team === NEUTRAL || u.locked) continue;
      if (u.kind === 'hero' && !u.vis[m.team]) continue;
      let d = hyp(u.x - m.x, u.y - m.y) - u.r; if (d > ar) continue;
      if (u.kind === 'hero') d += 260; else if (u.kind === 'turret' || u.kind === 'crystal') d += (m.mtype === 'siege' || m.mtype === 'lord') ? -200 : 120;
      if (d < bd) { bd = d; best = u; }
    }
    if (!best && m.tgt) m.wp = nextWp(m.path, m.x, m.y);
    m.tgt = best;
  }
  const t = m.tgt;
  if (t) {
    const d = hyp(t.x - m.x, t.y - m.y) - t.r;
    if (d <= m.range) { m.face = fatan2(t.y - m.y, t.x - m.x); attackStep(m, t); }
    else if (m.windT <= 0 && m.rootT <= 0) chaseMove(m, t, dt);
  } else if (m.rootT <= 0) {
    const P = m.path.p; let w = P[m.wp];
    if (hyp(w.x - m.x, w.y - m.y) < 150 && m.wp < P.length - 1) w = P[++m.wp];
    goTo(m, -2 - m.wp, w.x + m.ox, w.y + m.oy, dt);       // back to the lane round the walls after a chase took it off it
  }
}
function nextWp(path, x, y) {
  const pr = progOf(path, x, y);
  for (let i = 1; i < path.p.length; i++) if (path.cum[i] > pr + 60) return i;
  return path.p.length - 1;
}
function tickMonster(m, dt) {
  if (m.stunT > 0 || m.disp) return;
  const d = MONSTER[m.mtype], t = m.aggro;
  const far = hyp(m.x - m.hx, m.y - m.hy);
  if (t && (t.dead || far > d.leash || hyp(t.x - m.hx, t.y - m.hy) > d.leash + 380)) { m.aggro = null; }
  if (m.aggro) {
    m.calmT += dt; if (m.calmT > 6) { m.aggro = null; return; }
    const tt = m.aggro, dd = hyp(tt.x - m.x, tt.y - m.y) - tt.r;
    if (dd <= m.range) { m.face = fatan2(tt.y - m.y, tt.x - m.x); attackStep(m, tt); }
    else if (m.windT <= 0 && m.rootT <= 0) chaseMove(m, tt, dt);
    if (m.mtype === 'lord') { m.slamT -= dt; if (m.slamT <= 0) { m.slamT = 6; delayAoE(m, tt.x, tt.y, { delay: 1.0, r: 260, c: '#c070ff', hit(e) { dmg(m, e, m.ad * 1.6, 'magic', {}); slow(e, 0.3, 1.5); } }); } }
  } else {
    if (far > 20) { m.ms = m.msBase * 1.5; goTo(m, -1, m.hx, m.hy, dt); }
    if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.12 * dt);
  }
}

/* ---------------- heroes ---------------- */
/* A passive with two tempers that its player chooses between (Miel's hive, as of KIT_V 22): the press that changes it. It can be
   made whatever else the hero is doing; the temper then keeps for MOOD_GAP seconds before it can be changed again. */
const MOOD_GAP = 1;
function canMood(h) { const ps = h.def.passive; return !!(ps && ps.toggle) && G.kit >= 22 && !h.dead && !(h.reviveT > 0) && !G.over && !(G.t < (h.moodT || 0)); }
function toggleMood(h) { if (!canMood(h)) return false; h.sting = !h.sting; h.moodT = G.t + MOOD_GAP; fx('mood', h.x, h.y, { id: h.id, m: h.sting ? 1 : 0 }); return true; }
function startRecall(h) { if (h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.dash || h.leap) return false; h.recallT = 6; h.atkTarget = null; h.windT = 0; fx('recall', h.x, h.y, { id: h.id }); return true; }
/* the second cast skill i is waiting for, if any: within its window, after whatever had to land first, and not while a refreshed
   skill is to be thrown again before its follow-up (more) */
function recastOf(h, i) { const r = h.re[i]; return r && r.until > G.t && !(r.ready > G.t) && !(r.more && h.cds[i] <= 0 && h.mp >= skillCost(skDef(h, i), h.sk[i])) ? r : null; }
/* A chain of casts on one button (hold): its cooldown waits while the chain is open, and between two of its presses the button is
   neither a fresh cast nor yet the next one. stageDef: what the button casts for the follow-up it has waiting. */
function chainHold(h, i) { const r = h.re[i]; return !!(r && r.hold && r.until > G.t); }
function stageDef(s0, re) { return re ? (re.n === 3 && s0.three) || s0.two || s0 : s0; }
function castMend(h) {       // the built-in heal
  if (h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.healCd > 0 || G.over || (h.hp >= h.maxHp - 1 && h.mp >= h.maxMp - 1)) return false;       // nothing to restore: it is not spent
  h.healCd = MEND.cd; h.mend = { n: MEND.n, acc: 0 }; addBuff(h, { k: 'mend', t: MEND.dur, aura: MEND.c });
  skfx(h, 'mend', h.x, h.y, { c: MEND.c }); sfx('holy', h.x, h.y); return true;
}
/* The item a hero can press (one at most is of any use: the first in the bag), whether it can be pressed now, and pressing it. */
function activeItem(h) { for (const k of h.items) if (ITEMS[k].act) return k; return null; }
function itemReady(h) { return !!activeItem(h) && !h.dead && !(h.reviveT > 0) && !(h.stunT > 0) && !(h.tauntT > 0) && !(h.actCd > 0) && !G.over; }
function useItem(h) {
  if (!itemReady(h)) return false;
  const A = ITEMS[activeItem(h)].act, dur = A.dur[Math.min(h.actN, A.dur.length - 1)];
  A.fn(h, A, dur); h.actCd = A.cd; h.actN++; h.revealT = G.t + 1.2; if (h.camo) camoOff(h); return true;
}
function castSkill(h, i, tx, ty) {
  if (h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.disp || (h.castLock > 0 && !(h.snipe && i !== 2)) || G.over) return false;       // (in the middle of Four Rounds her other two skills are hers to break it off with, and her battle spell is hers to use)
  const f0 = h.form;
  if ((h.dash || h.leap) && !(h.def.fluid && i < 3)) return false;       // a fluid hero throws and flashes in the middle of his own dash
  const sp = i === 3, s0 = sp ? SPELLS[h.spell] : skDef(h, i);
  const lv = sp ? 1 : h.sk[i]; if (lv < 1) return false;
  const re = sp ? null : recastOf(h, i), s = stageDef(s0, re);
  if (!re && !sp && chainHold(h, i)) return false;       // between two presses of a chain: not yet
  if (!re && (sp ? h.spellCd : h.cds[i]) > 0) return false;
  const cost = sp || re ? 0 : skillCost(s0, lv); if (h.mp < cost) return false;
  if (s.noRoot && h.rootT > 0) return false;
  let dx = tx - h.x, dy = ty - h.y, d = hyp(dx, dy);
  if (!(d > 1)) { dx = fcos(h.face); dy = fsin(h.face); d = 1; tx = h.x + dx; ty = h.y + dy; }
  const ang = fatan2(dy, dx);
  if (s.cast === 'point' && s.range && d > s.range) { tx = h.x + dx / d * s.range; ty = h.y + dy / d * s.range; }
  { const pc = G.cx; G.cx = { h, n: s.name, ic: s.ic, c: s.c }; const went = s.fn(h, lv, tx, ty, ang, re); G.cx = pc; if (went === false) return false; }
  if (h.tp && !sp) tpStop(h, true);
  h.mp -= cost; if (h.camo && !s.hush) camoOff(h);       // (whatever she casts from under her cape, but the cape itself, brings her out from under it)
  if (re) { if (h.re[i] === re) h.re[i] = null; } else if (sp) h.spellCd = s.cd; else h.cds[i] = s0.cdNow != null ? s0.cdNow : skillCd(s0, lv) * (1 - h.cdr);
  if (s.cast !== 'self') h.face = ang;
  if (!re && !sp) h.castT[i] = G.t;
  h.recallT = 0; h.windT = 0; h.castAnim = 0.3; h.castN++; h.castI = re ? i + (s.stage === 3 ? 10 : 4) : f0 && !sp && h.def.skills[i].alt ? i + 7 : i; if (!s.hush) h.revealT = G.t + 1.2; h.lastCombatT = G.t;       // castI 4..6: the second cast of skill 0..2; 10..12: the third
  if (!sp) { const pv = h.def.passive; if (pv && pv.cast) pv.cast(h, i); }
  const big = !!s0.ult && !re && !s0.swap;
  fx('cast', h.x, h.y, { c: s.c, id: h.id, ult: big, i }); sfx(s.snd || (big ? 'ult' : 'skill'), h.x, h.y); if (s.snd && big) sfx('ult', h.x, h.y);
  return true;
}
function acquire(h, mode, inRangeOnly) {
  let best = null, bs = 1e9; const reach = inRangeOnly ? h.range : h.range + 420;
  for (const u of G.units) {
    if (!canTarget(h, u)) continue;
    const d = hyp(u.x - h.x, u.y - h.y) - u.r; if (d > (inRangeOnly ? reachTo(h, u) : reach)) continue;
    if (inRangeOnly && u.kind === 'monster' && !u.aggro) continue;
    if (inRangeOnly && (u.kind === 'turret' || u.kind === 'crystal') && laneSd(h.x, h.y) <= 0) continue;       // standing idle in the woods never picks a fight with a turret
    let sc = d;
    if (mode === 1) sc = (u.kind === 'minion' || u.kind === 'monster') ? u.hp * 0.2 + d * 0.2 - 2000 : d;
    else if (mode === 2) sc = (u.kind === 'turret' || u.kind === 'crystal') ? d - 2000 : d;
    else if (u.kind === 'hero' || u.kind === 'clone') sc = d - (d <= h.range + 220 ? 2000 : 0) + (u.hp / u.maxHp) * 150;
    if (sc < bs) { bs = sc; best = u; }
  }
  return best;
}
function playerControl(h) {
  const I = h.inp; h.mvx = I.mx; h.mvy = I.my;
  const moving = I.mx || I.my;
  if (h.atkTarget && (!canTarget(h, h.atkTarget) || hyp(h.atkTarget.x - h.x, h.atkTarget.y - h.y) > h.range + 900)) h.atkTarget = null;
  if (moving) { h.atkTarget = null; h.chase = false; I.fresh = false; return; }
  if (h.camo && h.atkTarget && !h.chase) h.atkTarget = null;       // (a target Sorrel fell to shooting at by herself is let go under her cape: see below)
  const fl = h.flurry ? flurryOf(h) : null, ft = fl && canTarget(h, fl.tgt) && hyp(fl.tgt.x - h.x, fl.tgt.y - h.y) < h.range + 340 ? fl.tgt : null;       // a marked hero close by: the flurry is for him
  if (I.atk || I.fresh) {
    if (!h.atkTarget || I.fresh) { const hint = I.tgtHint && canTarget(h, I.tgtHint) ? I.tgtHint : null; h.atkTarget = hint || (I.atkMode === 0 && ft) || acquire(h, I.atkMode, false); }
    I.fresh = false; I.tgtHint = null; h.chase = true;
  } else if (ft && h.recallT <= 0) { h.atkTarget = ft; h.chase = true; }
  else if (!h.atkTarget && h.recallT <= 0 && !h.camo) { h.atkTarget = acquire(h, 0, true); h.chase = false; }       // (under her cape Sorrel shoots when she is told to, not because somebody walked into reach: a shot gives her away)
}
/* Four Rounds (Sorrel's ultimate). h.snipe = { tgt, n: rounds left, acc: time to the next, lv }. She stands and counts them out at one
   hero, who is kept in sight for it; whatever takes hold of her, or losing her mark, cuts it short (and so does she, with either of
   her other skills: snipeBreak). A round flies at its mark and follows them (step), a little past SNIPE_R at most: it goes by minions
   and creeps and stops in the first enemy hero it meets, so only somebody in the way, or a great deal of distance, saves the mark. */
function snipeShot(h, S) {
  const t = S.tgt, ang = fatan2(t.y - h.y, t.x - h.x), lv = S.lv, def = h.def.skills[2], pc = G.cx; let live = true;
  S.n--; h.face = ang; h.castN++; h.castI = 6; h.revealT = Math.max(h.revealT, G.t + 1.2);
  G.cx = { h, n: def.name, ic: def.ic, c: def.c };
  lineProj(h, ang, { speed: SNIPE_SPEED, range: SNIPE_R + 200, w: SNIPE_W, pierce: true, quiet: true, look: 'round', c: def.c, ci: 2,
    step(p) { if (live && !t.dead && !t.locked) p.ang = fatan2(t.y - p.y, t.x - p.x); }, hit(e, p) {
    if (!live || e.kind !== 'hero') return; live = false; p.left = 0;
    dmg(h, e, snipeDmg(h, lv, e), 'phys', { skill: true }); if (!h.dead) h.mp = Math.min(h.maxMp, h.mp + SNIPE_FOCUS);
    skfx(h, 'sorrel2h', e.x, e.y, { ang: p.ang, tid: e.id });
  } });
  G.cx = pc; skfx(h, 'sorrel2s', h.x, h.y, { ang, left: S.n }); sfx('shot', h.x, h.y);
}
function snipeEnd(h, cut) {
  const S = h.snipe; if (!S) return; h.snipe = null; h.castLock = cut ? 0 : 0.15;
  if (S.n > 0) h.cds[2] *= 1 - SNIPE_REFUND * S.n;
  fx('snipe', h.x, h.y, { id: h.id, left: S.n });
}
function snipeBreak(h) { const S = h.snipe; if (!S) return; if (S.n > 0 && !S.tgt.dead && !S.tgt.locked) snipeShot(h, S); snipeEnd(h, true); }
function snipeTick(h, dt) {
  const S = h.snipe, t = S.tgt;
  if (h.stunT > 0 || h.tauntT > 0 || h.disp || h.leap || h.dash || h.air || h.reviveT > 0 || t.dead || t.locked) { snipeEnd(h, true); return; }
  t.revealT = Math.max(t.revealT, G.t + 0.5); h.revealT = Math.max(h.revealT, G.t + 0.6); h.face = fatan2(t.y - h.y, t.x - h.x); if (h.castLock < 0.12) h.castLock = 0.12;
  S.acc -= dt; if (S.acc <= 0) { S.acc += SNIPE_GAP; snipeShot(h, S); if (S.n <= 0) snipeEnd(h, false); }
}
/* ---------------- practice tools ---------------- */
function autoSkills(h) { let g = 0; while (h.sp > 0 && g++ < 40) { if (canLevel(h, 2)) levelSkill(h, 2); else { const i = h.sk[0] <= h.sk[1] ? 0 : 1; if (!levelSkill(h, i) && !levelSkill(h, 1 - i)) break; } } }
/* set a hero's level outright. auto: spend the skill points at once (ultimate first, the other two evenly); otherwise they are handed back to place by hand */
function pracLevel(h, lv, auto) {
  if (h.form && h.def.forms.beast) beastOff(h, true);
  h.level = clamp(lv | 0, 1, 15); h.xp = 0; h.sk = baseSk(h); h.sp = h.level; h.form = 0; h.cds = [0, 0, 0]; h.re = [null, null, null];
  if (auto) autoSkills(h);
  recalc(h); h.hp = h.maxHp; h.mp = h.maxMp;
}
const DUMMY_KEYS = ['bram', 'orin', 'lyra', 'kaela'];
function spawnDummy(x, y, key) {       // an enemy hero that never acts and cannot die; it heals up after three quiet seconds
  const p = nearestWalkable(x, y), n = G.heroes.filter(u => u.dummy).length, h = makeHero(key || DUMMY_KEYS[n % DUMMY_KEYS.length], RED, p.x, p.y, 0);
  h.dummy = true; h.name = 'Dummy'; h.pos = 'mid'; h.retri = false; h.gold = 0; h.face = fatan2(G.player.y - p.y, G.player.x - p.x);
  pracLevel(h, G.player.level, true); return h;
}
function spawnFriend(x, y, key) {       // an ally that never acts and cannot die, kept at half health: what a heal gives it shows, and three quiet seconds later it is wounded again
  const p = nearestWalkable(x, y), n = G.heroes.filter(u => u.friend).length, h = makeHero(key || DUMMY_KEYS[(n + 1) % DUMMY_KEYS.length], BLUE, p.x, p.y, 0);
  h.dummy = true; h.friend = true; h.name = 'Friend'; h.pos = 'mid'; h.retri = false; h.gold = 0; h.face = fatan2(G.player.y - p.y, G.player.x - p.x);
  pracLevel(h, G.player.level, true); h.hp = h.hpWas = h.maxHp * 0.5; h.quietT = 0; return h;
}
function spawnSpar(x, y, key) {       // a real bot to fight: same level as the player, comes back three seconds after it falls
  const p = nearestWalkable(x, y), pool = HERO_KEYS.filter(k => k !== G.player.key), h = makeHero(key || pool[(rnd() * pool.length) | 0], RED, p.x, p.y, 0);
  h.spar = true; h.pos = 'mid'; h.spell = h.def.spell; h.retri = h.spell === 'retribution'; aiInit(h, 'mid', G.diff);
  h.level = G.player.level; h.sp = h.level; h.sk = baseSk(h); for (let k = 0; k < 4 && h.sp > 0; k++) aiLevel(h); recalc(h); h.hp = h.maxHp; h.mp = h.maxMp; return h;
}
function pracClear() {       // every enemy hero leaves the map, and every friend
  for (const h of G.heroes) if (h.team === RED || h.friend) { h.dead = true; h.gone = true; }
  G.heroes = G.heroes.filter(h => !h.gone); G.units = G.units.filter(u => !u.gone);
  for (const a of G.areas) if (a.src && a.src.gone) a.t = 0; G.projs = G.projs.filter(p => !(p.src && p.src.gone) && !(p.tgt && p.tgt.gone));
}
function pracWaves(on) { G.practice.waves = !!on; G.waveT = on ? 2 : 1e9; if (!on) for (const u of G.units) if (u.kind === 'minion') u.dead = true; }
function pracCamps() { for (const c of G.camps) if (!c.units.length) c.respT = 0; }
function pracRefresh(h) { h.cds = [0, 0, 0]; h.spellCd = 0; h.healCd = 0; h.actCd = 0; h.actN = 0; h.hp = h.maxHp; h.mp = h.maxMp; h.stunT = h.rootT = 0; h.tauntT = 0; h.tauntBy = null; }
function pracGo(h, x, y) { const p = nearestWalkable(x, y); h.x = p.x; h.y = p.y; h.dash = h.leap = h.disp = h.air = null; h.z = 0; h.recallT = 0; h.atkTarget = null; h.vx = h.vy = 0; }
function tickHero(h, dt) {
  if (G.practice) {
    if (h.isPlayer && G.practice.free && !h.dead) { h.cds[0] = h.cds[1] = h.cds[2] = 0; h.spellCd = 0; h.healCd = 0; h.actCd = 0; h.actN = 0; h.mp = h.maxMp; }
    if (h.friend) {       // (whatever has mended or hurt it shows as a jump in its health: three seconds after the last of those it goes back to half)
      const half = h.maxHp * 0.5; if (Math.abs(h.hp - h.hpWas) > h.maxHp * 0.004 || G.t - h.lastDmgT < 0.1) h.quietT = G.t + 3;
      if (G.t >= h.quietT && h.hp !== half) { const d = h.maxHp * dt * 0.8; h.hp = h.hp > half ? Math.max(half, h.hp - d) : Math.min(half, h.hp + d); }
      h.hpWas = h.hp;
    } else if (h.dummy && G.t - h.lastDmgT > 3 && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * dt * 1.5);
  }
  for (let i = 0; i < 3; i++) if (h.cds[i] > 0 && !chainHold(h, i) && !(i === 0 && h.camo)) h.cds[i] -= dt;       // cooldowns never stop (a fallen hero comes back with its skills as rested as the wait allowed), except that a chain's only starts once the chain is over
  if (h.spellCd > 0) h.spellCd -= dt; if (h.healCd > 0) h.healCd -= dt; if (h.actCd > 0) h.actCd -= dt;
  if (h.dead) {
    h.respawnT -= dt;
    if (h.ai) aiDead(h);
    if (h.respawnT <= 0) { const sp = G.practice && h.isPlayer ? { x: W / 2 - 210, y: W / 2 + 210 } : MAP.spawn[h.team]; h.dead = false; h.x = sp.x + (rnd() - .5) * 120; h.y = sp.y + (rnd() - .5) * 120; recalc(h); h.hp = h.maxHp; h.mp = h.maxMp; h.vis = [true, true]; h.lastDmgT = -99; if (h.ai) { h.ai.path = null; h.ai.mode = 'lane'; } fx('ring', h.x, h.y, { c: '#fff', r: 120 }); }
    return;
  }
  recalc(h);
  { const pv = h.def.passive; if (pv && pv.tick) pv.tick(h, dt); }
  if (h.has.wellspring && !h.def.energy) { if (h.wsT == null) h.wsT = G.t + WELL_T; else if (G.t >= h.wsT) { h.wsT = G.t + WELL_T; const mp = Math.min(h.maxMp - h.mp, h.maxMp * WELL_MP); if (mp > 0.5) { h.mp += mp; fx('mana', h.x, h.y, { v: mp, tgt: h.id }); } } }       // Wellspring Charm
  if (h.tp && (h.stunT > 0 || h.tauntT > 0 || h.disp || h.air || h.reviveT > 0)) tpStop(h, true);
  if (h.def.lethal) { if (h.camo && !hasBuff(h, 'camo')) camoOff(h); h.pv.n = lethalReady(h) ? 1 : 0; if (h.snipe) snipeTick(h, dt); }       // Sorrel: the cloak's time is up; a Long Shot is ready (shown as a passive that is full); her four rounds
  if (h.reviveT > 0) {
    h.reviveT -= dt; h.mvx = h.mvy = 0; h.atkTarget = null;
    if (h.reviveT <= 0) { h.locked = false; h.hp = Math.max(h.hp, h.maxHp * 0.18); shield(h, h.maxHp * 0.1, 3); h.lastDmgT = G.t; fx('ring', h.x, h.y, { c: '#ffe08a', r: 200 }); if (h.ai) { h.ai.path = null; h.ai.mode = 'retreat'; } }
    return;
  }
  if (h.castAnim > 0) h.castAnim -= dt; if (h.castLock > 0) h.castLock -= dt;
  if (h.mend) { const m = h.mend; m.acc -= dt; if (m.acc <= 0) { m.acc += MEND.dur / MEND.n; heal(h, h, h.maxHp * MEND.pct / MEND.n); const mp = Math.min(h.maxMp - h.mp, h.maxMp * MEND.mp / MEND.n); if (mp > 0.5) { h.mp += mp; fx('mana', h.x, h.y, { v: mp, tgt: h.id }); } if (--m.n <= 0) h.mend = null; } }
  // regen & fountain
  const sp = MAP.spawn[h.team], dsp = hyp(h.x - sp.x, h.y - sp.y);
  const ooc = G.t - h.lastCombatT > 5 ? 2.2 : 1;
  h.hp = Math.min(h.maxHp, h.hp + (h.hpRegen * ooc + (h.has.titan && ooc > 1 ? h.maxHp * 0.015 : 0)) * dt); h.mp = Math.min(h.maxMp, h.mp + h.mpRegen * ooc * dt);
  if (dsp < 430) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.16 * dt); h.mp = Math.min(h.maxMp, h.mp + h.maxMp * 0.16 * dt); }
  const es = MAP.spawn[1 - h.team];
  if (hyp(h.x - es.x, h.y - es.y) < 520) { h.fountT = (h.fountT || 0) + dt; if (h.fountT > 0.25) { h.fountT = 0; dmg(G.crystals[1 - h.team], h, h.maxHp * 0.06, 'true', {}); if (h.dead) return; } }
  // forced movement
  if (h.leap) {
    const l = h.leap; l.t += dt; const k = Math.min(1, l.t / l.dur);
    h.x = lerp(l.x0, l.x1, k); h.y = lerp(l.y0, l.y1, k); h.z = fsin(k * Math.PI) * (l.h || 130); h.moving = true;
    if (k >= 1) { h.leap = null; h.z = 0; G.cx = l.cx || null; l.onLand(); G.cx = null; }
    return;
  }
  if (h.disp) return;
  if (h.stunT > 0) { h.dash = null; return; }
  if (h.dash) { stepDash(h, dt); return; }
  if (h.tauntT > 0) { h.mvx = h.mvy = 0; h.atkTarget = h.tauntBy; h.chase = true; }       // called out: at whoever did it, and nothing else (a player's stick and a bot's plans wait)
  else if (h.isPlayer) playerControl(h); else if (h.ai) aiTick(h, dt); else { h.mvx = h.mvy = 0; h.atkTarget = null; }       // a dummy just stands there
  if (h.dead) return;
  if (h.castLock > 0) return;
  if (h.tp && tpTick(h, dt)) return;       // on his way by Teleport: he stands where he is
  // recall
  const wantMove = (h.mvx || h.mvy) && h.rootT <= 0;
  if (h.recallT > 0) {
    if (h.mvx || h.mvy || h.atkTarget && h.chase) h.recallT = 0;
    else { h.recallT -= dt; if (h.recallT <= 0) { h.x = sp.x; h.y = sp.y; h.recallT = 0; if (h.ai) h.ai.path = null; fx('ring', h.x, h.y, { c: '#9fd8ff', r: 140 }); sfx('skill', h.x, h.y); } return; }
  }
  if (h.mvx || h.mvy) {
    h.windT = 0;
    if (wantMove) {
      h.face = fatan2(h.mvy, h.mvx); h.moving = true;
      const ok = moveUnit(h, h.mvx, h.mvy, h.ms * dt);
      if (h.ai && (!ok || h.vx * h.mvx + h.vy * h.mvy < h.ms * 0.3) && h.ai.repT > 0.12) h.ai.repT = 0.12;       // a bot held up by a wall plans its way again at once
    }
  } else if (h.atkTarget && (canTarget(h, h.atkTarget) || (h.tauntT > 0 && h.atkTarget === h.tauntBy))) {
    const t = h.atkTarget, d = hyp(t.x - h.x, t.y - h.y) - t.r, rg = reachTo(h, t);
    if (d <= rg) { h.face = fatan2(t.y - h.y, t.x - h.x); attackStep(h, t); }
    else if (h.windT > 0 && d <= rg + 90) { /* finishing the swing */ }
    else if (h.chase && h.rootT <= 0) { h.windT = 0; chaseMove(h, t, dt); }
  }
}
function stepDash(h, dt) {
  const d = h.dash; let st = Math.min(d.left, d.speed * dt); const c = fcos(d.ang), s = fsin(d.ang);
  h.moving = true; h.face = d.ang; G.cx = d.cx || null;
  while (st > 0 && h.dash) {
    const q = Math.min(st, 22);
    if (!wallSlide(h.x, h.y, c * q, s * q, 0) || (_wx - h.x) * c + (_wy - h.y) * s < q * 0.35) { d.left = 0; break; }      // a dash glances along a wall and stops when it runs into one
    h.x = _wx; h.y = _wy; st -= q; d.left -= q;
    if (d.o.hit) for (const e of enemiesIn(h.team, h.x, h.y, d.o.w || 60)) {
      if (d.hit[e.id]) continue; d.hit[e.id] = 1; d.o.hit(e);
      if ((d.o.stopOnHero && e.kind === 'hero') || (d.o.stopOn && d.o.stopOn(e))) { d.left = 0; st = 0; break; }
    }
  }
  if (h.dash === d && d.left <= 0.5) { h.dash = null; if (d.o.end) d.o.end(); }
  G.cx = null;
}

/* ---------------- spawning ---------------- */
function spawnWave() {
  G.waveN++;
  const min = G.t / 60, sc = 1 + Math.min(min, 30) * 0.065 + Math.max(0, min - 12) * 0.05;
  for (const team of [BLUE, RED]) for (const lane of G.lanes) {
    const path = LANE_PATH[team][lane];
    const types = ['melee', 'melee', 'melee', 'ranged'];
    if (G.waveN % 3 === 0) types.push('siege');
    const open = laneOpen(1 - team, lane);
    if (open) types.push('siege');
    types.forEach((ty, i) => spawnMinion(team, lane, ty, path, 240 - i * 55, sc * (open ? 1.35 : 1), (i % 2 ? 1 : -1) * 28));
  }
}
function spawnMinion(team, lane, ty, path, along, sc, side) {
  const d = MINION[ty], p = pointAlong(path, along);
  const q = pointAlong(path, along + 30), nx = -(q.y - p.y) / 30, ny = (q.x - p.x) / 30;
  const m = newUnit('minion', team, p.x + nx * side, p.y + ny * side, { mtype: ty, lane, path, wp: 1, r: d.r, maxHp: d.hp * sc, ad: d.ad * sc, armor: d.armor, mr: d.armor, range: d.range, asp: d.asp, msBase: d.ms, ms: d.ms, thinkT: rnd() * 0.3, tgt: null, ox: nx * side, oy: ny * side, epic: ty === 'lord' });
  m.hp = m.maxHp; m.wp = nextWp(path, m.x, m.y); return m;
}
function spawnMonster(type, x, y, camp) {
  const d = MONSTER[type], sc = 1 + Math.min(G.t / 60, 25) * 0.05;
  const m = newUnit('monster', NEUTRAL, x, y, { mtype: type, name: d.name, r: d.r, maxHp: d.hp * sc, ad: d.ad * sc, armor: d.armor, mr: d.armor, range: d.range, asp: d.asp, msBase: 250, ms: 250, hx: x, hy: y, aggro: null, calmT: 0, camp: camp || null, epic: !!d.epic, slamT: 4, face: Math.PI / 2 });
  m.hp = m.maxHp; return m;
}
function tickSpawns(dt) {
  G.waveT -= dt; if (G.waveT <= 0) { G.waveT += 30; spawnWave(); }
  for (const c of G.camps) {
    if (c.units.length) continue;
    c.respT -= dt;
    if (c.respT <= 0) {
      if (c.type === 'small') c.units = [spawnMonster('sprite', c.x - 45, c.y - 10, c), spawnMonster('sprite', c.x + 45, c.y + 20, c)];
      else c.units = [spawnMonster(c.type, c.x, c.y, c)];
    }
  }
  const E = G.epic;
  if (!E.turtle && !E.turtleDone) {
    if (G.t > 470) E.turtleDone = true;
    else { E.turtleT -= dt; if (E.turtleT <= 0) { E.turtle = spawnMonster('turtle', MAP.turtle.x, MAP.turtle.y); ev({ t: 'spawn', which: 'turtle' }); } }
  }
  if (!E.lord) { E.lordT -= dt; if (E.lordT <= 0) { E.lord = spawnMonster('lord', MAP.lord.x, MAP.lord.y); ev({ t: 'spawn', which: 'lord' }); sfx('horn', MAP.lord.x, MAP.lord.y); } }
  for (let i = G.pending.length - 1; i >= 0; i--) {
    const p = G.pending[i]; if (G.t < p.t) continue; G.pending.splice(i, 1);
    // march down the lane where the enemy has the fewest turrets left
    let lane = 'mid', best = 9;
    for (const n of ['mid', 'top', 'bot']) { const c = G.turrets.filter(t => t.team === 1 - p.team && t.lane === n && !t.dead).length; if (c < best && c > 0) { best = c; lane = n; } }
    if (best === 9) lane = 'mid';
    const sc = 1 + Math.min(G.t / 60, 30) * 0.04;
    spawnMinion(p.team, lane, 'lord', LANE_PATH[p.team][lane], 260, sc, 0);
    ev({ t: 'lordSummon', team: p.team, lane });
  }
}
function tickVision() {
  for (const u of G.units) if (!u.dead && (u.kind === 'hero' || u.kind === 'minion' || u.kind === 'clone')) u.bush = bushAt(u.x, u.y);
  for (const T of [BLUE, RED]) {
    const viewers = G.units.filter(u => u.team === T && !u.dead && u.kind !== 'monster');
    for (const e of G.units) {
      if (e.team !== 1 - T || e.dead) continue;
      if (e.kind !== 'hero' && e.kind !== 'minion' && e.kind !== 'clone') { e.vis[T] = true; continue; }
      let seen = false;
      for (const v of viewers) {
        const sr = v.kind === 'hero' ? 980 : v.kind === 'minion' ? 720 : 900;
        const dx = v.x - e.x, dy = v.y - e.y, d2 = dx * dx + dy * dy;
        if (d2 > sr * sr) continue;
        if (e.camo ? d2 < CAMO_SEE * CAMO_SEE || e.revealT > G.t : e.bush < 0 || v.bush === e.bush || d2 < 190 * 190 || e.revealT > G.t) { seen = true; break; }
      }
      e.vis[T] = seen;
    }
  }
}
function tickFronts() {
  for (const T of [BLUE, RED]) for (const lane of G.lanes) {
    let best = null, bp = -1, n = 0; const path = LANE_PATH[T][lane];
    for (const u of G.units) {
      if (u.kind !== 'minion' || u.team !== T || u.lane !== lane || u.dead) continue;
      const p = progOf(path, u.x, u.y); n++; if (p > bp) { bp = p; best = u; }
    }
    G.laneFront[T][lane] = best ? { prog: bp, x: best.x, y: best.y, n } : null;
  }
}
/* Units that overlap push one another apart. Every pair is looked at, in the order of the list, so the positions, radii and kinds are
   laid out in plain arrays first: the pairs that have nothing to do with one another (nearly all of them) cost next to nothing. The
   arithmetic and its order are what they always were. C: 0 dead, 1 a turret or a crystal, 2 a hero, 3 a hero in a leap or a dash
   (nothing moves it), 4 anything else. */
let _sepN = 0, _sepX = null, _sepY = null, _sepR = null, _sepC = null;
function separate() {
  const U = G.units, n = U.length;
  if (n > _sepN) { _sepN = n + 64; _sepX = new Float64Array(_sepN); _sepY = new Float64Array(_sepN); _sepR = new Float64Array(_sepN); _sepC = new Uint8Array(_sepN); }
  const X = _sepX, Y = _sepY, R = _sepR, C = _sepC;
  for (let i = 0; i < n; i++) { const u = U[i]; X[i] = u.x; Y[i] = u.y; R[i] = u.r; C[i] = u.dead ? 0 : u.kind === 'turret' || u.kind === 'crystal' ? 1 : u.kind === 'hero' ? (u.leap || u.dash ? 3 : 2) : 4; }
  for (let i = 0; i < n; i++) {
    const ca = C[i]; if (ca === 0 || ca === 3) continue;
    const sa = ca === 1, ra = R[i];
    for (let j = i + 1; j < n; j++) {
      const cb = C[j]; if (cb === 0) continue;
      const sb = cb === 1;
      if (sa ? sb : !sb && (ca === 2 || cb === 2 || cb === 3)) continue;      // two structures; or a hero and a unit: heroes slip through units
      const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = (ra + R[j]) * (sa || sb ? 0.9 : 0.8), d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01, push = (rr - d), ux = dx / d, uy = dy / d;
      if (sa) { if (cb !== 3) { const b = U[j]; nudge(b, ux * push, uy * push); X[j] = b.x; Y[j] = b.y; } }
      else if (sb) { const a = U[i]; nudge(a, -ux * push, -uy * push); X[i] = a.x; Y[i] = a.y; }
      else { const a = U[i], b = U[j]; nudge(a, -ux * push * 0.5, -uy * push * 0.5); nudge(b, ux * push * 0.5, uy * push * 0.5); X[i] = a.x; Y[i] = a.y; X[j] = b.x; Y[j] = b.y; }
    }
  }
}
function nudge(u, dx, dy) { if (u.disp) return; if (wallSlide(u.x, u.y, dx, dy, 0)) { u.x = _wx; u.y = _wy; } }

/* ---------------- main step ---------------- */
function step(dt) {
  if (G.over) return;
  if (G.det !== _mathDet) mathSet(G.det);       // (more than one match can be alive at a time: each is stepped with its own arithmetic)
  G.t += dt;
  if (G.duel && !G.rushSaid && G.t >= DUEL_RUSH_T) { G.rushSaid = true; ev({ t: 'rush' }); }
  tickSpawns(dt); tickPlating();
  G.visT -= dt; if (G.visT <= 0) { G.visT = 0.2; tickVision(); }
  G.frontT -= dt; if (G.frontT <= 0) { G.frontT = 0.4; tickFronts(); }
  G.teamT = (G.teamT || 0) - dt; if (G.teamT <= 0) { G.teamT = 1; aiTeam(); }
  if (G.t > 10 && !G.practice) { G.goldAcc = (G.goldAcc || 0) + 2.4 * dt; if (G.goldAcc >= 1) { const g = Math.floor(G.goldAcc); G.goldAcc -= g; for (const h of G.heroes) giveGold(h, g); } }
  const U = G.units;
  for (let i = 0; i < U.length; i++) {
    const u = U[i];
    if (u.kind === 'hero') { if (!u.dead) tickCommon(u, dt); tickHero(u, dt); continue; }
    if (u.dead) continue;
    tickCommon(u, dt);
    if (u.kind === 'minion') tickMinion(u, dt);
    else if (u.kind === 'clone') tickEcho(u, dt);
    else if (u.kind === 'monster') tickMonster(u, dt);
    else tickStructure(u, dt);
    if (G.over) return;
  }
  tickProjs(dt); tickAreas(dt);
  separate();
  // cleanup
  let w = 0;
  for (let i = 0; i < U.length; i++) { const u = U[i]; if (!u.dead || u.kind === 'hero') U[w++] = u; }
  U.length = w;
}


/* ---------------- recording a match, and playing a recording ----------------
   A match is recorded as what went into it and nothing else: the options it was made with, how long every step was, and what the
   player did before each step (which way the stick pointed, what was pressed). Run again from the same start with the same steps and
   the same inputs, the sim does exactly what it did the first time: the bots draw the same numbers and make the same choices. So a
   recording is small (a hundred kilobytes or so for a quarter of an hour), and playing one is the match itself happening again, to
   be looked at from anywhere.

   For that to hold, nothing from outside may reach the sim except through here: step lengths go through tick() (whole counts of
   1/7200 s, 240 at most, a byte each), the player's doings through act(), and the six fields of G.input are read off before every step.
   The stick's direction is kept as one of 65535 headings, and the sim is given the heading that was written down, not the one that
   was measured. Every 256 steps a checksum of the heroes and of the random number state is noted; a playback that no longer matches
   it has drifted (another browser version rounding a sine differently would do it) and says so.

   rec (while recording): dt, ev: growing byte buffers; chk: the checksums; steps; last: the step of the last event written; shadow of
   G.input as the last step left it; marks: kills, turrets and beasts for the timeline.
   A finished recording: { v, sim, opts: { seed, diff, player }, steps, t, dt, ev, chk, marks, over, winner }.
   pb (while playing one): rec, i: the step to run next, e: read position in ev, next: the step the next event belongs to. */
const DT_Q = 7200, DU_MAX = 240, MOVE_NONE = 65535, REC_V = 1, ROSTER_0 = 12;
const KIT_V = 24, KIT_0 = 19;       // which state of the heroes' skills a match is played by (G.kit): a recording says its own, and one that says none is from before there was more than one (KIT_0). 24: Halvar, four more items and the Teleport spell (nothing an older match has is changed by them). 20: Miel's stings. 21: Lyra's Starfall falls for longer, and holds whoever stays under it. 22: Bram's Shield Rush sweeps along what it meets and has a second cast; Hesta's taunt holds longer; Miel's temper is her player's to choose and her Queen's Flight bursts out and lasts longer. 23: the stun of Zephyr's Tempest Beam holds longer, and it and the taunt of Hesta's Brazen Call go through the totem.
const A_CAST = 1, A_MEND = 2, A_ITEM = 3, A_LEVEL = 4, A_RECALL = 5, A_BUY = 6, A_SELL = 7, A_INPUT = 8, A_MOOD = 9;
const ITEM_KEYS = Object.keys(ITEMS);
const SIM_NAME = typeof SIM_ID === 'string' ? SIM_ID : 'dev';       // which build of the sim: a recording only plays on a sim that runs the match exactly as the one that made it did
const SIM_SAME = { '9afb2ff4': 1, '3c2d709d': 1, '454b2863': 1, 'faf86074': 1, '977f94e6': 1, 'c575d909': 1, '7bf6a433': 1, '2b64e130': 1, 'ed914bb2': 1 };       // older sims that this one runs exactly as, with the heroes they had (test/same_sim.js): Versions 16 to 18 (twelve heroes), Version 19 (thirteen, and its recordings say so), and the two after it, whose recordings say which state of the skills they were played by
function simPlays(id) { return id === SIM_NAME || SIM_SAME[id] === 1; }
const _cvF = new Float32Array(1), _cvD = new Float64Array(1), _cvB = new Uint8Array(_cvF.buffer), _cvU = new Uint32Array(_cvD.buffer);
function bufNew(n) { return { a: new Uint8Array(n), n: 0 }; }
function bufPut(b, v) { if (b.n >= b.a.length) { const a = new Uint8Array(b.a.length * 2); a.set(b.a); b.a = a; } b.a[b.n++] = v; }
function bufVar(b, v) { while (v >= 128) { bufPut(b, (v % 128) | 128); v = Math.floor(v / 128); } bufPut(b, v); }       // a whole number, seven bits to a byte
function bufF32(b, v) { _cvF[0] = v; bufPut(b, _cvB[0]); bufPut(b, _cvB[1]); bufPut(b, _cvB[2]); bufPut(b, _cvB[3]); }
function moveSet(I, mc) { if (mc === MOVE_NONE) { I.mx = I.my = 0; } else { const a = mc * (TAU / 65536); I.mx = fcos(a); I.my = fsin(a); } }
function moveCode(I) { if (!I.mx && !I.my) return MOVE_NONE; const c = Math.round(fatan2(I.my, I.mx) / TAU * 65536) & 65535; return c === MOVE_NONE ? 0 : c; }
/* a fingerprint of the match as it stands: every hero's place and health to the last bit, and how many random numbers have been drawn */
function simHash() {
  let x = G.seed | 0; const mix = v => { x = Math.imul(x ^ v, 0x9E3779B1); x ^= x >>> 15; }, bits = v => { _cvD[0] = v; mix(_cvU[0] | 0); mix(_cvU[1] | 0); };
  for (const h of G.heroes) { bits(h.x); bits(h.y); bits(h.hp); bits(h.mp); mix(h.gold | 0); mix(h.level * 4096 + h.kills * 64 + h.deaths); }
  mix(G.units.length); mix(G.projs.length); mix(G.uid); bits(G.t);
  return x >>> 0;
}
function recNew(opts) {
  return { dt: bufNew(16384), ev: bufNew(8192), chk: [], steps: 0, last: 0, mc: MOVE_NONE, bits: 0, hint: 0, marks: [],
    opts: Object.assign({ seed: G.seed0, diff: G.diff, roster: opts.roster || HERO_KEYS.length, kit: G.kit, player: Object.assign({ hero: opts.player.hero, spell: opts.player.spell, skin: opts.player.skin | 0, role: opts.player.role | 0 }, POS_KEYS.includes(opts.player.pos) ? { pos: opts.player.pos } : null) }, opts.mode === 'duel' ? { mode: 'duel', foe: opts.foe ? { hero: opts.foe.hero, role: opts.foe.role | 0 } : null } : null) };
}
function recEv(R, k) { bufVar(R.ev, R.steps - R.last); R.last = R.steps; bufPut(R.ev, k); }
function recMark(R, o) {       // what the timeline of a recording shows
  if (o.t === 'kill') { const v = G.heroes.find(h => h.id === o.victim); R.marks.push({ t: G.t, k: 'kill', team: v ? 1 - v.team : 0, by: o.killer || 0, on: o.victim }); }
  else if (o.t === 'turret') R.marks.push({ t: G.t, k: 'turret', team: 1 - o.team });
  else if (o.t === 'epic') R.marks.push({ t: G.t, k: o.which, team: o.team });
}
function inputBits(I) { return (I.atk ? 1 : 0) | (I.fresh ? 2 : 0) | ((I.atkMode & 3) << 2) | (I.tgtHint ? 16 : 0); }
/* one step of the live match, du/7200 seconds long */
function tick(du) {
  const R = G.over ? null : G.rec, I = G.input, mc = moveCode(I); moveSet(I, mc);       // (a match that is over does not move: nothing more is written down)
  if (R) {
    const bits = inputBits(I), hint = I.tgtHint ? I.tgtHint.id : 0;
    if (mc !== R.mc || bits !== R.bits || hint !== R.hint) { recEv(R, A_INPUT); bufPut(R.ev, mc & 255); bufPut(R.ev, mc >> 8); bufPut(R.ev, bits); if (hint) bufVar(R.ev, hint); }
    bufPut(R.dt, du);
  }
  step(du / DT_Q);
  if (R) { R.steps++; R.mc = mc; R.bits = inputBits(I); R.hint = I.tgtHint ? I.tgtHint.id : 0; if ((R.steps & 255) === 0) R.chk.push(simHash()); }
}
/* whatever the player does to the match: cast (skill, x, y), heal, use the item, learn a skill, recall, buy (item key), sell (slot) */
function act(k, a, b, c) {
  const me = G.player; if (!me) return false;
  if (G.pb && !G.pb.doing) return false;       // a recording is played back, not played with: only what it holds is done
  if (k === A_CAST) { b = Math.fround(+b || 0); c = Math.fround(+c || 0); }       // aimed where the recording will say it was aimed
  if (G.net) return netAct(me, k, a, b, c);       // a networked match: the press is sent, and done on every machine at the same step
  const R = G.rec;
  if (R) { recEv(R, k); if (k === A_CAST) { bufPut(R.ev, a); bufF32(R.ev, b); bufF32(R.ev, c); } else if (k === A_LEVEL || k === A_SELL) bufPut(R.ev, a); else if (k === A_BUY) bufPut(R.ev, ITEM_KEYS.indexOf(a)); }
  return actFor(me, k, a, b, c);
}
function actFor(h, k, a, b, c) {
  switch (k) {
    case A_CAST: return castSkill(h, a, b, c);
    case A_MEND: return castMend(h);
    case A_ITEM: return useItem(h);
    case A_LEVEL: return levelSkill(h, a);
    case A_RECALL: return startRecall(h);
    case A_BUY: return buyItem(h, a);
    case A_SELL: return sellItem(h, a);
    case A_MOOD: return toggleMood(h);
  }
  return false;
}
/* ---------------- a networked match ----------------
   Every machine runs the whole match, bots and all, and they stay together because each gives every seat the same frame at the same
   turn and takes the same steps (NET_STEPS of NET_DU/7200 s to a turn, 15 turns a second). A frame is what one player held and
   pressed in one turn: { mc: where the stick pointed (moveCode), bits: what was held (inputBits), hint: the unit singled out, acts:
   [[k, a, b, c], ...] the presses, as act() takes them }. What a player does is not done at once: it is put in the frame for a turn
   a few turns ahead (the net layer's business), by which time every machine has it. G.net: me (the seat at this machine), turn
   (the next turn to play), out (presses waiting for the next frame), hold (kinds of press not taken again until the last has been
   done: buying twice because the first has not shown yet). */
const NET_DU = 240, NET_STEPS = 2, NET_HOLD = { [A_BUY]: 1, [A_SELL]: 1, [A_LEVEL]: 1 };
function actCan(h, k, a) {       // would this go through if it were done now? (so that a press is answered at once: it is done a moment later)
  switch (k) {
    case A_CAST: { if (h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.disp || G.over) return false; const sp = a === 3; if (sp) return !(h.spellCd > 0); if (!(h.sk[a] >= 1)) return false; if (recastOf(h, a)) return true; if (chainHold(h, a) || h.cds[a] > 0) return false; return h.mp >= skillCost(skDef(h, a), h.sk[a]); }
    case A_MEND: return !(h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.healCd > 0 || G.over || (h.hp >= h.maxHp - 1 && h.mp >= h.maxMp - 1));
    case A_ITEM: return itemReady(h);
    case A_LEVEL: return canLevel(h, a);
    case A_RECALL: return !(h.dead || h.reviveT > 0 || h.stunT > 0 || h.tauntT > 0 || h.dash || h.leap);
    case A_BUY: return canBuy(h, a);
    case A_SELL: return !!h.items[a];
    case A_MOOD: return canMood(h);
  }
  return false;
}
function netAct(me, k, a, b, c) {
  const N = G.net; if (N.gone || G.over || !me.isPlayer || N.out.length >= 12 || !actCan(me, k, a) || (NET_HOLD[k] && N.hold[k])) return false;
  if (NET_HOLD[k]) N.hold[k] = true; N.out.push(k === A_CAST ? [k, a, b, c] : [k, a]); return true;
}
/* the frames of one turn, done to the match: frames[seat], or null for a seat with nothing new (a hero whose player has gone is a bot by then) */
function netApply(frames) {
  const N = G.net, H = G.humans;
  for (let s = 0; s < H.length; s++) {
    const h = H[s], f = frames[s]; if (!h || !h.isPlayer || !f) continue;
    const I = h.inp; moveSet(I, f.mc); I.atk = !!(f.bits & 1); I.fresh = !!(f.bits & 2); I.atkMode = (f.bits >> 2) & 3; I.tgtHint = f.bits & 16 ? unitById(f.hint) : null;
    for (const q of f.acts) { actFor(h, q[0], q[1], q[2], q[3]); if (s === N.me && NET_HOLD[q[0]]) N.hold[q[0]] = false; }
  }
  N.turn++;
}
/* a seat whose player has gone: a bot takes the hero over, on every machine at the same turn */
function netGone(seat) {
  const h = G.humans[seat]; if (!h || !h.isPlayer) return;
  h.isPlayer = false; h.inp = null; h.left = true; if (h.spell === 'retribution' && h.pos !== 'jungle') h.spell = h.def.spell === 'retribution' ? 'execute' : h.def.spell;
  aiInit(h, h.pos, h.botDiff == null ? 1 : h.botDiff); if (seat === G.net.me) G.net.gone = true;
  ev({ t: 'left', id: h.id, seat });
}
/* the recording so far, as something that can be kept and played; the match goes on being recorded */
function recTake() {
  const R = G.rec; if (!R) return null;
  return { v: REC_V, sim: SIM_NAME, opts: R.opts, steps: R.steps, t: G.t, dt: R.dt.a.slice(0, R.steps), ev: R.ev.a.slice(0, R.ev.n), chk: Uint32Array.from(R.chk), marks: R.marks.slice(), over: G.over, winner: G.winner };
}
function pbOpen(rec) {       // the same match from the start, with the recording in the player's place
  newGame({ seed: rec.opts.seed, diff: rec.opts.diff, player: rec.opts.player, roster: rec.opts.roster || ROSTER_0, kit: rec.opts.kit || KIT_0, mode: rec.opts.mode, foe: rec.opts.foe || undefined, fx: true });       // (a recording that does not say how many heroes there were is from when there were ROSTER_0)
  G.pb = { rec, i: 0, e: 0, next: -1, at: 0, desync: -1, did: null, doing: false }; pbNext(G.pb);
  return G;
}
function pbVar(P) { const a = P.rec.ev; let v = 0, m = 1, b; do { b = a[P.e++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; }
function pbNext(P) { if (P.e >= P.rec.ev.length) { P.next = -1; return; } P.at += pbVar(P); P.next = P.at; }
function unitById(id) { for (const u of G.units) if (u.id === id) return u; for (const u of G.turrets) if (u.id === id) return u; for (const u of G.crystals) if (u.id === id) return u; return null; }
function pbEvent(P) {       // the event at the read position, done to the match
  const a = P.rec.ev, k = a[P.e++], I = G.input; P.doing = true;
  if (k === A_INPUT) { const mc = a[P.e] | (a[P.e + 1] << 8), bits = a[P.e + 2]; P.e += 3; moveSet(I, mc); I.atk = !!(bits & 1); I.fresh = !!(bits & 2); I.atkMode = (bits >> 2) & 3; I.tgtHint = bits & 16 ? unitById(pbVar(P)) : null; }
  else if (k === A_CAST) { const i = a[P.e++]; _cvB[0] = a[P.e]; _cvB[1] = a[P.e + 1]; _cvB[2] = a[P.e + 2]; _cvB[3] = a[P.e + 3]; const x = _cvF[0]; _cvB[0] = a[P.e + 4]; _cvB[1] = a[P.e + 5]; _cvB[2] = a[P.e + 6]; _cvB[3] = a[P.e + 7]; const y = _cvF[0]; P.e += 8; const ok = act(A_CAST, i, x, y); P.did = { k, a: i, ok, t: G.t }; }
  else if (k === A_LEVEL || k === A_SELL) { const i = a[P.e++], ok = act(k, i); P.did = { k, a: i, ok, t: G.t }; }
  else if (k === A_BUY) { const key = ITEM_KEYS[a[P.e++]], ok = act(k, key); P.did = { k, a: key, ok, t: G.t }; }
  else { const ok = act(k); P.did = { k, a: 0, ok, t: G.t }; }
  P.doing = false; pbNext(P);
}
/* one recorded step; false once the recording has run out (or the match in it is over) */
function pbStep() {
  const P = G.pb, r = P.rec; if (G.over) return false;
  if (P.i >= r.steps) return false;
  while (P.next === P.i) pbEvent(P);
  step(r.dt[P.i] / DT_Q); P.i++;
  if (P.i >= r.steps) while (P.next === P.i) pbEvent(P);       // (so the match ends as it was left)
  if ((P.i & 255) === 0) { const n = (P.i >> 8) - 1; if (n < r.chk.length && r.chk[n] !== simHash() && P.desync < 0) P.desync = P.i; }
  return true;
}
