/* ============================================================
   bot AI: laning, jungling, fighting, retreating, objectives
   ============================================================ */
const AI_RETREAT = { Tank: 0.24, Fighter: 0.27, Assassin: 0.3, Mage: 0.32, Marksman: 0.32, Support: 0.3 };
function aiInit(h, pos, diff) {
  const lane = pos === 'top' ? 'top' : pos === 'mid' || pos === 'jungle' ? 'mid' : 'bot';
  h.ai = { pos, lane, homeLane: lane, P: DIFFS[diff], org: G.orgOv ? G.orgOv[h.team] : DIFFS[diff].org || 0, plan: '', build: null, buildT: 0, think: rnd() * 0.4, mode: 'lane', goal: null, tgt: null, kite: null,
    path: null, pi: 0, pg: null, repT: 0, stuckT: 0, sx: h.x, sy: h.y, jit: 0, jx: 0, jy: 0, wantMove: false, retreatAt: AI_RETREAT[h.cls || h.def.cls] };
}
function aiDead(h) { aiShop(h); aiLevel(h); }
function aiShop(h) {       // parts first, then the item they make
  const a = h.ai; if (a && a.org > 0 && !G.practice && G.t >= a.buildT) { a.buildT = G.t + 20; a.build = aiBuild(h); }
  for (let n = 0; n < 4; n++) { const k = nextStep(h); if (!k || !buyItem(h, k)) break; }
}
function aiLevel(h) {
  let guard = 0;
  while (h.sp > 0 && guard++ < 8) {
    if (canLevel(h, 2)) { levelSkill(h, 2); continue; }
    const p = h.sk[0] <= h.sk[1] ? 0 : 1;
    if (!levelSkill(h, p) && !levelSkill(h, 1 - p)) break;
  }
}
function aiPower(u) { return (0.35 + u.hp / u.maxHp) * (1 + u.level * 0.18 + u.items.length * 0.28); }
function aiFoes(h, r) {
  const out = [];
  for (const e of G.heroes) if (e.team !== h.team && !e.dead && e.vis[h.team]) { const d = hyp(e.x - h.x, e.y - h.y); if (d < r) { e._d = d; out.push(e); } }
  return out.sort((p, q) => p._d - q._d);
}
// enemy structure that would shoot a hero of `team` standing at (x,y)
function turretThreat(team, x, y, pad, me) {
  for (const s of G.turrets) {
    if (s.team === team || s.dead) continue;
    const d = hyp(s.x - x, s.y - y); if (d > s.range + pad) continue;
    if (me && s.tgt === me) return s;
    if (laneSd(x, y) <= -pad) continue;       // turrets leave the woods alone
    if (minionsNear(team, s.x, s.y, s.range) === 0) return s;
  }
  const c = G.crystals[1 - team];
  if (!c.dead && hyp(c.x - x, c.y - y) < c.range + pad && laneSd(x, y) > -pad && (minionsNear(team, c.x, c.y, c.range) === 0 || (me && c.tgt === me))) return c;
  return null;
}
function nearOwnTurret(h) { for (const s of G.turrets) if (s.team === h.team && !s.dead && hyp(s.x - h.x, s.y - h.y) < s.range - 100 && laneSd(h.x, h.y) > 0) return true; return false; }

/* team-level calls, refreshed once a second */
function aiTeam() {
  G.team = G.team || [{}, {}];
  for (const T of [BLUE, RED]) {
    const mine = G.heroes.filter(h => h.team === T), alive = mine.filter(h => !h.dead).length;
    const foeAlive = G.heroes.filter(h => h.team !== T && !h.dead).length;
    const avg = mine.reduce((s, h) => s + h.level, 0) / mine.length;
    const tm = G.team[T];
    tm.alive = alive; tm.foeAlive = foeAlive; tm.avg = avg;
    // group push
    let lane = null, best = 4;
    if (G.t > 480) for (const n of G.lanesM) { const c = G.turrets.filter(t => t.team === 1 - T && t.lane === n && !t.dead).length; if (c < best) { best = c; lane = n; } }
    tm.push = lane; tm.pushAll = G.t > 840 || best === 0;
    // lord call
    const lord = G.epic.lord;
    if (!lord || lord.dead || alive < 3) tm.lord = false;
    else if (!tm.lord && avg >= 8 && alive >= 4 && (alive > foeAlive || (avg >= 10 && rnd() < 0.08))) tm.lord = true;
    // summoned lord escort
    tm.escort = null; tm.escortU = null;
    for (const u of G.units) if (u.kind === 'minion' && u.mtype === 'lord' && u.team === T && !u.dead) { tm.escort = u.lane; tm.escortU = u; }
    tm.org = 0; if (!G.practice) for (const h of mine) if (h.ai && h.ai.org > tm.org) tm.org = h.ai.org;
    if (G.pending.length) tm.healT = G.t + 2;       // a Shardlord has just fallen and will march in a moment: time to go home and come back whole
    if (tm.org > 0) teamPlan(T, tm); else tm.call = null;
  }
}

/* ============================================================
   Team play. Once a second each side's bots take stock together and may make a call: a plan with a place, a purpose and the bots
   it is for. A bot on a call follows it ahead of its own laning (never ahead of its own survival), and the call is over when it
   has done its work, gone wrong or run out of time. ai.org says how much of this a bot does: 0 none (every bot for itself),
   1 the great beasts, sieges and falling back together, 2 ganks, counters and caution as well, 3 the same, sharper.
   A human on the team is never on a call (he is told of it and counted when he is there).
   ============================================================ */
function laneAt(x, y) { let best = null, bd = 430; for (const n of LANE_NAMES) { const d = polyDist(x, y, MAP.lanes[n]); if (d < bd) { bd = d; best = n; } } return best; }
function nearStruct(team, x, y) { let best = G.crystals[team].dead ? null : G.crystals[team], bd = best ? hyp(best.x - x, best.y - y) : 1e9; for (const s of G.turrets) if (s.team === team && !s.dead) { const d = hyp(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } return best; }
function rallyAt(T, m) { const b = MAP.spawn[T], d = hyp(b.x - m.x, b.y - m.y) || 1; return nearestWalkable(m.x + (b.x - m.x) / d * 400, m.y + (b.y - m.y) / d * 400); }
function teamPlan(T, tm) {
  const E = 1 - T, mine = G.heroes.filter(h => h.team === T), foes = G.heroes.filter(h => h.team === E);
  const up = mine.filter(h => !h.dead), fit = up.filter(h => h.ai && h.ai.org > 0 && h.hp / h.maxHp > 0.5 && h.ai.mode !== 'retreat');
  // what is known of them: where each was last seen, and how many are alive and out of sight
  const seen = tm.seen || (tm.seen = {}); let unseen = 0;
  for (const e of foes) { if (e.dead) { seen[e.id] = null; continue; } if (e.vis[T]) seen[e.id] = { x: e.x, y: e.y, t: G.t }; else if (!seen[e.id] || G.t - seen[e.id].t > 4) unseen++; }
  tm.unseen = unseen;
  tm.lordWait = false;
  let c = tm.call;
  tm.lordSoon = tm.org >= 2 && !G.epic.lord && G.epic.lordT < 50 && tm.avg >= 7.8 && !tm.escort;       // the Shardlord is less than a minute off: no time for adventures
  if (c) { const why = tm.escort ? 'march' : tm.lordSoon && G.epic.lordT <= LORD_SETUP[tm.org] && c.type !== 'lord' && c.type !== 'defend' ? 'lordtime' : callOver(T, tm, c, up, foes); if (why) { callEnd(T, tm, c, why); c = tm.call; if (why === 'lordtime') tm.callT = 0; } }
  if (!c && G.t >= (tm.callT || 0)) { c = pickCall(T, tm, up, fit, foes); if (c) callStart(T, tm, c); }
  if (c && (c.type === 'lord' || c.type === 'defend')) for (const h of fit) if (!c.members.includes(h) && (c.type === 'defend' || hyp(h.x - MAP.lord.x, h.y - MAP.lord.y) < 4400)) c.members.push(h);       // whoever is fit again joins
  if (c && c.type === 'lord' && c.phase === 'gather') tm.lordWait = true;
  if (c && c.phase === 'gather') {
    let n = 0; for (const h of c.members) if (!h.dead && hyp(h.x - c.x, h.y - c.y) < 640) n++;
    for (const h of up) if (!h.ai && hyp(h.x - c.x, h.y - c.y) < 800) n++;       // a human who has come along counts
    if (c.type === 'lord') {       // the Shardlord is taken when it is there and enough of us are: four, or three with more of us standing than of them
      const l = G.epic.lord; if (l && !l.dead) { if (!c.upT) c.upT = G.t; const adv = up.length - foes.filter(e => !e.dead).length; if ((n >= 4 && adv >= 0) || (n >= 3 && adv >= 1) || (n >= 2 && adv >= 2) || (n >= 3 && l.aggro && l.aggro.team === 1 - T)) c.phase = 'go'; }       // or they have started on it with us standing there
    } else if (n >= c.need || G.t - c.t0 > 15) c.phase = 'go';
  }
}
function callStart(T, tm, c) { c.t0 = G.t; c.team = T; tm.call = c; tm.calls = (tm.calls || 0) + 1; ev({ t: 'call', team: T, type: c.type, which: c.which || null, lane: c.lane || null, who: c.tgt ? c.tgt.name : null, x: c.x, y: c.y, n: c.members.length }); }
function callEnd(T, tm, c, why) {
  tm.call = null; tm.callT = G.t + 2; const q = tm.org >= 3 ? 0.75 : 1;
  { const w = tm.why || (tm.why = {}), k = c.type + ':' + why; w[k] = (w[k] || 0) + 1; }       // how calls ended, for the record
  if (c.type === 'gank') { tm.gankT = G.t + (why === 'done' ? 16 : 26) * q; tm.ganks = (tm.ganks || 0) + 1; if (why === 'done') tm.gankKills = (tm.gankKills || 0) + 1; }
  if (c.type === 'counter') tm.counterT = G.t + 12;
  if (c.type === 'lord' && why !== 'done') tm.lordT = G.t + 22; if (c.type === 'turtle' && why !== 'done') tm.turtleT = G.t + 22;
  if (c.type === 'gank' && why === 'done' && !tm.escort) {       // he is down: his lane is open for a moment, so the same bots lean on it
    const m = c.members.filter(h => !h.dead && h.hp / h.maxHp > 0.4); if (m.length) callStart(T, tm, { type: 'push', lane: c.lane, members: m, until: G.t + 14, x: c.x, y: c.y });
  }
}
/* why a call is over, or null while it stands */
function callOver(T, tm, c, up, foes) {
  if (G.t > c.until) return 'time';
  const E = 1 - T, live = c.members.filter(h => !h.dead && h.hp / h.maxHp > 0.3 && h.ai.mode !== 'retreat'), foeUp = foes.filter(e => !e.dead);
  const power = (list, x, y, r) => { let p = 0; for (const u of list) if (hyp(u.x - x, u.y - y) < r) p += aiPower(u); return p; };
  switch (c.type) {
    case 'gank': {
      const t = c.tgt; if (t.dead) return 'done';
      const s = tm.seen[t.id]; if (!s || G.t - s.t > 3.5) return 'lost';
      if (!c.gankers.some(h => live.includes(h))) return 'hurt';
      c.x = s.x; c.y = s.y;
      const st = nearStruct(E, t.x, t.y); if (st && hyp(t.x - st.x, t.y - st.y) < st.range + 50 && !(tm.org >= 3 && t.hp / t.maxHp < 0.28)) return 'safe';
      const them = foeUp.filter(e => e.vis[T]); if (power(them, t.x, t.y, 850) > power(up, t.x, t.y, 1500) * 1.35) return 'odds';
      return null;
    }
    case 'lord': case 'turtle': {
      const m = G.epic[c.type];
      if (c.type === 'lord' && !m) return c.upT ? (G.pending.some(p => p.team === T) ? 'done' : 'lost') : null;       // waiting for it at the pit
      if (!m || m.dead) return 'done';
      if (c.type === 'lord') {
        if (c.phase === 'gather') return c.upT && G.t - c.upT > 35 ? 'thin' : null;
        if (live.length < 2) return 'hurt';
        const them = foeUp.filter(e => e.vis[T]), pt = power(them, m.x, m.y, 1100); if (pt > 0 && pt > power(live, m.x, m.y, 1500) * 1.3) return 'odds';
        return null;
      }
      if (live.length < Math.max(2, c.need - 1)) return 'hurt';
      const them = foeUp.filter(e => e.vis[T]), pt = power(them, m.x, m.y, 1100); if (pt > 0 && pt > power(live, m.x, m.y, 1300) * 1.25) return 'odds';
      return null;
    }
    case 'contest': {
      const m = G.epic[c.which]; if (!m || m.dead) return 'done'; if (live.length < 2) return 'hurt';
      if (!m.aggro && G.t - c.t0 > 6 && !foeUp.some(e => e.vis[T] && hyp(e.x - m.x, e.y - m.y) < 1200)) return 'clear';
      return null;
    }
    case 'defend': { if (c.unit.dead) return 'done'; const st = nextStructure(T, c.lane); if (!st) return 'done'; c.x = st.x; c.y = st.y; return null; }
    case 'siege': return up.length - foeUp.length < 1 || !live.length ? 'even' : null;
    case 'push': return live.length ? null : 'hurt';
    case 'counter': { const p = c.ally; if (p.dead || !live.length) return 'hurt'; c.x = p.x; c.y = p.y; return G.t - c.t0 > 3 && !foeUp.some(e => e.vis[T] && hyp(e.x - p.x, e.y - p.y) < 1000) ? 'clear' : null; }
    case 'regroup': return up.length - foeUp.length >= -1 ? 'even' : null;
  }
  return 'time';
}
/* the lane to lean on with numbers in hand: where a wave of ours is nearest to something of theirs that can be hit, the weaker the better */
function siegeLane(T) {
  let best = null, bs = 1e9;
  for (const n of G.lanes) { const st = nextStructure(1 - T, n); if (!st || st.locked) continue; const f = G.laneFront[T][n], path = LANE_PATH[T][n];
    const gap = f ? Math.max(0, progOf(path, st.x, st.y) - f.prog) : 5000, s = gap + (st.hp + (st.plate || 0)) / st.maxHp * 1400 - (st.kind === 'crystal' ? 2500 : 0); if (s < bs) { bs = s; best = n; } }
  return best;
}
function siegers(fit, lane) { return fit.filter(h => h.ai.pos === 'jungle' || h.ai.pos === 'roam' || h.ai.homeLane === lane); }       // who leans on a lane: its own bots and those with no lane of their own to keep
const LORD_SETUP = [-1, -1, 30, 34];       // seconds before the Shardlord comes that a team starts to set up for it, by how organised it is (Easy bots wait until it is there)
function pickCall(T, tm, up, fit, foes) {
  const org = tm.org, E = 1 - T, foeUp = foes.filter(e => !e.dead), adv = up.length - foeUp.length;
  if (tm.escort || G.pending.some(p => p.team === T)) return null;       // our own Shardlord is marching, or about to: going with it is the plan
  const near = (list, x, y, r) => list.filter(h => hyp(h.x - x, h.y - y) < r);
  const theirsAt = (x, y, r) => { let n = 0; for (const e of foeUp) { const s = tm.seen[e.id]; if (s && G.t - s.t < 5 && hyp(s.x - x, s.y - y) < r) n++; } return n; };
  let wait = 99; for (const e of foes) if (e.dead && e.respawnT < wait) wait = e.respawnT;       // how soon the first of their fallen is back
  // 0. their Shardlord is marching on us: everyone to the lane it is in, to stand at the structure it will reach first and bring it down there
  for (const u of G.units) if (u.kind === 'minion' && u.mtype === 'lord' && u.team === E && !u.dead) { const st = nextStructure(T, u.lane); if (st) return { type: 'defend', lane: u.lane, unit: u, x: st.x, y: st.y, members: up.filter(h => h.ai && h.ai.org > 0), until: G.t + 150 }; }
  // 1. they have started on one of the great beasts: fight them for it if as many of us can get there, else take something of theirs meanwhile
  const contest = which => {
    const m = G.epic[which]; if (!m || m.dead || !m.aggro || m.aggro.team !== E || m.hp > m.maxHp * 0.93) return null;
    const big = which === 'lord', seen = theirsAt(m.x, m.y, 950), there = Math.max(big ? 3 : 1, seen), us = big ? near(fit, m.x, m.y, 3400) : near(fit, m.x, m.y, 2600).filter(h => h.ai.pos === 'jungle' || h.ai.pos === 'mid' || h.ai.pos === 'top');
    if (us.length >= 2 && (us.length >= there || (big && us.length >= 3 && us.length >= seen - 1 && m.hp < m.maxHp * 0.6))) return { type: 'contest', which, x: m.x, y: m.y, members: us, until: G.t + 24 };       // the Shardlord wears them down: one fewer of us will do once it has
    if (big && fit.length >= 2) { const lane = siegeLane(T), who = lane ? siegers(fit, lane) : []; if (who.length) { const st = nextStructure(E, lane); return { type: 'siege', lane, members: who, until: G.t + 20, x: st.x, y: st.y, trade: true }; } }
    return null;
  };
  if (org >= 2) { const q = contest('lord'); if (q) return q; }
  // 2. the Shardlord: be at the pit when it comes (it decides most matches), and take it with four of ours there, or three and more of us standing than of them
  const lord = G.epic.lord, pit = MAP.lord, lordUp = !!lord && !lord.dead;
  if ((lordUp ? !lord.aggro : G.epic.lordT <= LORD_SETUP[org]) && G.t >= (tm.lordT || 0) && tm.avg >= 7.8) {
    // whoever of ours is near enough to be there in time; the hurt go home first and come back whole (see aiDecide), so they count
    const us = up.filter(h => h.ai && h.ai.org > 0 && (hyp(h.x - pit.x, h.y - pit.y) < 4400 || h.ai.mode === 'retreat')), far = theirsAt(pit.x, pit.y, 2600) === 0;
    if (us.length >= 3 && (!lordUp || (us.length >= 4 ? adv >= 0 : adv >= 1 || tm.avg >= 10 || (far && tm.avg >= 9)))) { const r = rallyAt(T, pit); return { type: 'lord', x: r.x, y: r.y, members: us, need: 3, phase: 'gather', until: G.t + 75 + (lordUp ? 0 : G.epic.lordT) }; }
  }
  if (tm.lordSoon) return null;       // nothing else is started with the Shardlord this close
  if (org >= 2) { const q = contest('turtle'); if (q) return q; }
  // 3. Riverback: two or more of ours near it and fewer of theirs
  const tur = G.epic.turtle;
  if (tur && !tur.dead && !tur.aggro && G.t >= (tm.turtleT || 0)) {
    const us = near(fit, tur.x, tur.y, 3000).filter(h => h.ai.pos === 'jungle' || h.ai.pos === 'mid' || h.ai.pos === 'top'), lv = us.reduce((s, h) => s + h.level, 0);
    if (us.length >= 2 && lv >= 7 && (us.some(h => h.retri) || us.length >= 3) && theirsAt(tur.x, tur.y, 1500) < us.length) { const r = rallyAt(T, tur); return { type: 'turtle', x: r.x, y: r.y, members: us, need: 2, phase: 'gather', until: G.t + 45 }; }
  }
  // 4. one of ours is being ganked (two or more of theirs on him in a lane): the jungler or roamer goes, if that evens it
  if (org >= 2 && G.t >= (tm.counterT || 0)) for (const p of up) {
    if (p.hp / p.maxHp < 0.3 || G.t - p.lastHeroHitT > 2.5 || !laneAt(p.x, p.y)) continue;
    const them = foeUp.filter(e => e.vis[T] && hyp(e.x - p.x, e.y - p.y) < 850).length, mates = near(up, p.x, p.y, 850).length; if (them < 2 || them <= mates) continue;
    const come = fit.filter(h => (h.ai.pos === 'jungle' || h.ai.pos === 'roam') && h !== p && hyp(h.x - p.x, h.y - p.y) > 850 && hyp(h.x - p.x, h.y - p.y) < 2500).slice(0, 2);
    if (come.length && mates + come.length >= them) return { type: 'counter', ally: p, lane: laneAt(p.x, p.y), x: p.x, y: p.y, members: come, until: G.t + 9 };
  }
  // 5. a gank of our own
  if (org >= 2) { const g = pickGank(T, tm, up, fit, foeUp); if (g) return g; }
  // 6. two more of us standing than of them: knock something down before they are back
  if (adv >= 2 && G.t > 150 && fit.length >= 2 && wait > 7) { const lane = siegeLane(T), who = lane ? siegers(fit, lane) : []; if (who.length) { const st = nextStructure(E, lane); return { type: 'siege', lane, members: who, until: G.t + clamp(wait + 5, 10, 26), x: st.x, y: st.y }; } }
  // 7. two fewer: keep back and keep together until they are not
  if (adv <= -2 && G.t > 480 && up.some(h => h.ai)) return { type: 'regroup', members: up.filter(h => h.ai && h.ai.org > 0), until: G.t + 14, x: MAP.spawn[T].x, y: MAP.spawn[T].y };
  return null;
}
/* Whom to gank: someone of theirs in a lane, in sight, away from his turret and his friends, with one of ours near him or the wave at
   his feet, and the jungler (on Hard the roamer too) close enough to arrive while it still matters. The further he has
   come forward and the less health he has, the better. */
function pickGank(T, tm, up, fit, foeUp) {
  if (G.t < 70 || G.t < (tm.gankT || 0) || (Math.floor(G.t) & 1) !== T) return null;       // (looked for every other second, the two sides on alternate ones: measuring the walks is the dearest thing the team brain does)
  const E = 1 - T, org = tm.org;
  const gk = fit.filter(h => (h.ai.pos === 'jungle' || (org >= 3 && h.ai.pos === 'roam')) && h.hp / h.maxHp > 0.62 && h.mp / h.maxMp > 0.3 && G.t - h.lastDmgT > 1.5);
  if (!gk.length) return null;
  const cand = [];
  for (const e of foeUp) {
    if (!e.vis[T] || e.locked) continue;
    const lane = laneAt(e.x, e.y); if (!lane) continue;
    const st = nearStruct(E, e.x, e.y), dT = st ? hyp(e.x - st.x, e.y - st.y) - st.range : 2000; if (dT < 240) continue;
    const path = LANE_PATH[T][lane], prog = progOf(path, e.x, e.y) / path.len;       // 0 at our end of the lane, 1 at theirs
    let friends = 0; for (const o of foeUp) if (o !== e && o.vis[T] && hyp(o.x - e.x, o.y - e.y) < 780) friends++;
    const here = up.filter(h => hyp(h.x - e.x, h.y - e.y) < 950 && h.hp / h.maxHp > 0.42), come = gk.filter(h => !here.includes(h) && hyp(h.x - e.x, h.y - e.y) < 3300).sort((p, q) => hyp(p.x - e.x, p.y - e.y) - hyp(q.x - e.x, q.y - e.y)).slice(0, 2);
    if (!come.length) continue;
    const us = here.length + come.length, them = 1 + friends; if (us <= them || (!here.length && e.hp / e.maxHp > 0.5)) continue;
    const sc = (1 - e.hp / e.maxHp) * 2 + (0.6 - prog) * 3.2 + (us - them) * 0.7 + Math.min(1, dT / 900) * 0.6 - hyp(come[0].x - e.x, come[0].y - e.y) / 3200 - (here.length ? 0 : 0.7) + (e.stunT > 0 || e.rootT > 0 ? 0.4 : 0);
    const ls = nextStructure(E, lane), pE = progOf(path, e.x, e.y), dL = ls ? progOf(path, ls.x, ls.y) - ls.range - pE : 3000;       // how far he has to run up his lane to be under cover
    if (sc > (org >= 3 ? 1.1 : 1.3) && dL > 240) cand.push({ sc, e, lane, ls, dL, path, come, here, edge: us - them });
  }
  /* Can it work at all? He needs `flee` seconds to the cover of his turret once he runs, and he runs when he sees what is coming. So either
     the ganker has a way round to the road behind him (by the river, or from further up the lane); or someone of ours is on him already,
     the ganker is there within a couple of seconds of when he could be home, and the further he has to run the more health he may
     still have (our laner is hitting him all the way). Anything else is a walk for nothing. The walks are measured along the paths. */
  cand.sort((p, q) => q.sc - p.sc);
  for (const k of cand.slice(0, 2)) {
    const e = k.e, g = k.come[0], ms = Math.max(200, g.ms), mE = Math.max(200, e.ms), flee = k.dL / mE, held = e.stunT > 0.5 || e.rootT > 0.5 ? 1 : 0, pE = progOf(k.path, e.x, e.y);
    // a place on the road behind him that the ganker can walk to without coming near him on the way (so, unseen until he is there): the nearest such, nine seconds off at most
    let cut = null, tc = 9;
    for (let d = 450, n = 0; d <= k.dL - 20 && n < 3; d += 450, n++) { const q = pointAlong(k.path, pE + d); if (hyp(q.x - g.x, q.y - g.y) / ms >= tc) continue; const t = pathLen(g, q.x, q.y, e, 720) / ms; if (t < tc) { tc = t; cut = q; } }
    const lim = flee + 2 + held, direct = cut ? 0 : hyp(e.x - g.x, e.y - g.y) / ms > lim ? 99 : pathLen(g, e.x, e.y) / ms; if (!cut && !(k.here.length && direct <= flee + 2 + held && e.hp / e.maxHp <= 0.45 + 0.1 * flee + (k.edge >= 2 ? 0.15 : 0) + held * 0.2)) continue;
    return { type: 'gank', lane: k.lane, tgt: e, x: e.x, y: e.y, cut, gankers: k.come, members: k.come.concat(k.here.filter(h => h.ai && h.ai.org > 0 && h.hp / h.maxHp > 0.4)), until: G.t + Math.max(13, (cut ? tc : direct) + 7) };
  }
  return null;
}
/* how long the walk is, along the path a bot would take; with `by`, a walk that passes within `r` of him does not count (it is no way round him) */
function pathLen(h, x, y, by, r) { const P = findPath(h.x, h.y, x, y, aiCost(h.team)); if (!P) return 1e9; let l = 0, px = h.x, py = h.y; for (const q of P) { if (by && segDist(by.x, by.y, px, py, q.x, q.y) < r) return 1e9; l += hyp(q.x - px, q.y - py); px = q.x; py = q.y; } return l; }
/* A bot on a call. True: the call has said what it does this turn. False: nothing for it right now, the bot's own rules go on. */
const LANE_WORD = { top: 'top', mid: 'mid', bot: 'bottom' };
function aiCall(h, c, foes, hpF, late) {
  const a = h.ai, T = h.team, nf = foes[0] || null;
  if (late && (c.type === 'gank' || c.type === 'counter')) return false;
  switch (c.type) {
    case 'gank': {
      const t = c.tgt, s = G.team[T].seen[t.id]; if (!s || t.dead) return false;
      const d = hyp(s.x - h.x, s.y - h.y), mine = c.gankers.includes(h);
      if (nf && nf !== t && nf._d < 520 && d > 700) return false;       // someone else of theirs is in the way: the ordinary rules deal with him
      a.plan = 'Ganking ' + LANE_WORD[c.lane];
      /* The way in. Whoever comes from the river or from further up the lane goes for the road behind him, between him and his turret, and
         only then at him: he runs for home when he sees he is outnumbered, and home is then through us. From our own side there is
         no getting behind him unseen, so it is straight at him. */
      let cut = null;
      if (mine && c.cut) { const path = LANE_PATH[T][c.lane]; if (hyp(c.cut.x - h.x, c.cut.y - h.y) < 160 || (laneAt(h.x, h.y) === c.lane && progOf(path, h.x, h.y) > progOf(path, s.x, s.y) + 100)) c.cut = null; else cut = c.cut; }       // once on the road behind him: at him
      if (t.vis[T] && d < (cut ? 640 : 980)) {
        if (turretThreat(T, t.x, t.y, -30, h) && !(a.P.dive && t.hp / t.maxHp < 0.28 && hpF > 0.55)) { a.goal = { x: h.x, y: h.y }; return true; }       // he made his turret: not under it
        let ready = 0; for (const m of c.members) if (!m.dead && hyp(m.x - t.x, m.y - t.y) < 1080) ready++;
        if (mine || ready >= 2 || d < 430) { a.tgt = t; a.mode = 'fight'; aiCombat(h, t, foes); return true; }       // the laner goes in when help is there, not before
        return false;
      }
      if (!mine) return false;       // the laner keeps his lane until then
      a.goal = cut || { x: s.x, y: s.y }; return true;
    }
    case 'counter': {       // to the ally; once there, whoever is on him is fought by the ordinary rules
      if (hyp(c.x - h.x, c.y - h.y) < 750 || (nf && nf._d < 600)) return false;
      a.plan = 'Countering a gank on ' + c.ally.name; a.goal = { x: c.x, y: c.y }; return true;
    }
    case 'defend': {       // to the structure their Shardlord is making for; once it is there, it comes down before anything else
      const m = c.unit; if (!m || m.dead) return false;
      if (!late && nf && nf._d < (h.melee ? 420 : 340)) return false;       // one of theirs on top of us: the ordinary rules
      a.plan = 'Defending against the Shardlord';
      if (hyp(m.x - h.x, m.y - h.y) < 820 && hyp(m.x - c.x, m.y - c.y) < 1000) { a.tgt = m; a.mode = 'fight'; aiPve(h, m); return true; }
      if (hyp(c.x - h.x, c.y - h.y) > 640) { const b = MAP.spawn[T], d = hyp(b.x - c.x, b.y - c.y) || 1; a.goal = { x: c.x + (b.x - c.x) / d * 210, y: c.y + (b.y - c.y) / d * 210 }; return true; }
      return false;       // there before it: the wave and whoever comes with it, by the ordinary rules
    }
    case 'lord': case 'turtle': case 'contest': {
      const which = c.which || c.type, m = G.epic[which], pit = MAP[which], wait = c.type === 'lord' && !m;
      if (wait) { if (G.epic.lordT > hyp(c.x - h.x, c.y - h.y) / Math.max(200, h.ms) * 1.3 + 4) return false; }       // not there yet: at the pit when it comes, leaving the lane no sooner than the walk takes
      else if (!m || m.dead) return false;
      // heroes first, by the ordinary rules, but only those who are in it: on the way one who is on top of us, at the pit whoever has come to the pit.
      // (Whoever of theirs is merely in sight, in a lane near by, is not worth leaving a beast half done for: it heals.)
      if (!late && (hyp(pit.x - h.x, pit.y - h.y) > 1300 ? nf && nf._d < 320 : foes.some(e => e._d < 430 || hyp(e.x - pit.x, e.y - pit.y) < 720))) return false;
      a.plan = wait ? 'Setting up for the Shardlord' : c.type === 'contest' ? 'Contesting ' + (c.which === 'lord' ? 'the Shardlord' : 'Riverback') : c.type === 'lord' ? (c.phase === 'gather' ? 'Gathering for the Shardlord' : 'Taking the Shardlord') : 'Taking Riverback';
      if (wait || (c.type !== 'contest' && c.phase === 'gather')) { a.goal = { x: c.x, y: c.y }; return true; }
      if (hyp(m.x - h.x, m.y - h.y) > 900) { a.goal = { x: m.x, y: m.y }; return true; }
      a.tgt = m; aiPve(h, m); return true;
    }
  }
  return false;       // siege, push and regroup shape the ordinary rules instead (lane, caution): see aiDecide
}
/* A telegraphed blow about to land where the bot stands (anything of theirs, or a beast's, that marks the ground first): the way out
   of it, if there is time to walk there. Each bot notices each such blow or does not, once: the sharper the bot, the likelier. */
function aiDanger(h) {
  const org = h.ai.org; if (org < 2 || h.rootT > 0 || h.stunT > 0) return null;
  for (const z of G.areas) {
    if (z.type === 'zone' && z.hold && z.team !== h.team && z.t > 0.3 && z.r) {       // ground that roots whoever stays on it: out by the nearest edge, if that can be reached before it holds (and if this bot has taken it in)
      const s = z.hold.by[h.id]; if (s && s.held) continue; const dx = h.x - z.x, dy = h.y - z.y, d = hyp(dx, dy), out = z.r + h.r * 0.6 + 25; if (d >= out) continue;
      const k = z._dz || (z._dz = {}); if (k[h.id] == null) k[h.id] = rnd() < (org >= 3 ? 0.9 : 0.55); if (!k[h.id]) continue;
      const left = z.hold.stay - (s && s.k >= z.hold.k - 1 ? (s.n - 1) * z.tick : 0); if ((out - d) / Math.max(120, h.ms * 0.7) > left + 0.15) continue;       // too deep in it: no use running
      if (d > 6) return { x: dx / d, y: dy / d }; const b = MAP.spawn[h.team], l = hyp(b.x - h.x, b.y - h.y) || 1; return { x: (b.x - h.x) / l, y: (b.y - h.y) / l };
    }
    if (z.type !== 'delay' || z.team === h.team || !(z.t > 0.1) || !z.r) continue;
    const dx = h.x - z.x, dy = h.y - z.y, d = hyp(dx, dy), out = z.r + h.r * 0.6 + 25; if (d >= out) continue;
    const k = z._dz || (z._dz = {}); if (k[h.id] == null) k[h.id] = rnd() < (org >= 3 ? 0.9 : 0.55); if (!k[h.id]) continue;
    if ((out - d) / Math.max(120, h.ms) > z.t + 0.12) continue;       // too deep in it: no use running
    if (d > 6) return { x: dx / d, y: dy / d }; const b = MAP.spawn[h.team], l = hyp(b.x - h.x, b.y - h.y) || 1; return { x: (b.x - h.x) / l, y: (b.y - h.y) / l };
  }
  return null;
}
/* What a bot buys. It starts from its class's build and answers the other side with it: resist against a side that deals mostly
   magic, armour against one that does not, the boots to match; a piece of safety for a carry once someone over there is fed; armour
   or resist piercing moved up when they have two or more heroes who are hard to bring down; and the Ironwill Totem only when they have
   the crowd control to make it worth pressing. What is already in the bag (or begun) is never thrown over. */
const defMagic = d => G.kit >= 22 ? d.magic : d.magic21, defCc = d => G.kit >= 22 ? d.ccN : d.ccN21;       // what a hero is to play against, by the kit of the match
function aiBuild(h) {
  const base = (h.bld || h.def.build).slice(), cls = h.cls || h.def.cls, foes = G.heroes.filter(e => e.team !== h.team); if (!foes.length) return base;       // (bld, cls: the build and class of the role it is played in)
  let phys = 0, magic = 0, cc = 0, tough = 0, fed = null;
  for (const e of foes) { const w = 1 + e.goldEarned / 5000 + e.kills * 0.12, m = defMagic(e.def); magic += w * m; phys += w * (1 - m); cc += defCc(e.def); if (e.def.cls === 'Tank' || (e.def.cls === 'Fighter' && e.items.some(k => ITEMS[k].armor >= 30 || ITEMS[k].hp >= 500))) tough++; if (e.kills >= 4 && e.kills >= e.deaths * 2 && (!fed || e.kills > fed.kills)) fed = e; }
  const ms = magic / (magic + phys), swap = (from, to) => { const i = base.indexOf(from); if (i >= 0 && !base.includes(to)) base[i] = to; }, up = (k, to) => { const i = base.indexOf(k); if (i > to) { base.splice(i, 1); base.splice(to, 0, k); } };
  if (cls !== 'Mage') { if (ms >= 0.58 && (cls === 'Tank' || cls === 'Fighter' || cls === 'Support' || ms >= 0.75)) for (const b of ['greaves', 'swift']) swap(b, 'wardboots'); else if (ms <= 0.3 && (cls === 'Tank' || cls === 'Fighter' || cls === 'Support')) swap('wardboots', 'greaves'); }
  if (base.includes('ironbark') && base.includes('spellward')) { if (ms > 0.5) up('spellward', base.indexOf('ironbark')); }
  else if (ms > 0.62) swap('ironbark', 'spellward'); else if (ms < 0.25) swap('spellward', 'ironbark');
  if (base.includes('totem') && cc <= 2) swap('totem', cls === 'Marksman' ? 'quickblade' : cls === 'Assassin' ? 'sunder' : 'titan');
  if (tough >= 2) { if (cls === 'Mage') up('voidcrystal', 2); else if (cls === 'Marksman' || cls === 'Assassin' || cls === 'Fighter') { if (!base.includes('giantslayer') && !base.includes('sunder')) base[5] = 'giantslayer'; up(base.includes('giantslayer') ? 'giantslayer' : 'sunder', 2); } }
  if (fed && (cls === 'Marksman' || cls === 'Mage' || cls === 'Assassin')) { const k = defMagic(fed.def) > 0.5 ? 'spellward' : 'bastion'; if (!base.includes(k)) base[4] = k; }
  // what is owned keeps its place, and so does the item being saved for if a part of it is already in the bag
  const mine = h.items.filter(k => !ITEMS[k].part), cur = (h.ai.build || h.bld || h.def.build).find(k => !mine.includes(k)), begun = cur && missingParts(h, cur).length < (ITEMS[cur].from || []).length ? [cur] : [];
  const out = mine.slice(); for (const k of begun.concat(base)) if (!out.includes(k) && out.length < 6 && !(ITEMS[k].boots && out.some(q => ITEMS[q].boots))) out.push(k);
  return out;
}

/* Counting out her four rounds, a bot does nothing else; unless somebody is right on top of her, and then he gets the charge in his
   face (which breaks the count off, and looses a round as it does) or, with no charge to throw, she goes under her cape and away. */
function aiSnipe(h) {
  let e = null, ed = 300; for (const q of G.heroes) if (q.team !== h.team && !q.dead && q.vis[h.team]) { const d = hyp(q.x - h.x, q.y - h.y); if (d < ed) { ed = d; e = q; } }
  if (!e || rnd() >= h.ai.P.skill * 0.5) return;
  const s1 = skDef(h, 1), l1 = h.sk[1]; if (l1 && h.cds[1] <= 0 && h.mp >= skillCost(s1, l1)) { castSkill(h, 1, e.x, e.y); return; }
  const s0 = skDef(h, 0), l0 = h.sk[0]; if (l0 && h.cds[0] <= 0 && !h.camo && h.mp >= skillCost(s0, l0)) castSkill(h, 0, h.x, h.y);
}
function aiTick(h, dt) {
  const a = h.ai; h.mvx = h.mvy = 0; h.atkTarget = null; h.chase = false;
  if (h.snipe) { aiSnipe(h); return; }
  a.think -= dt;
  if (a.think <= 0) { a.think = a.P.think * (0.75 + rnd() * 0.5); aiDecide(h); if (h.dead) return; }
  if (h.recallT > 0 || h.dash || h.leap) return;
  a.repT -= dt; a.stuckT += dt;
  if (a.stuckT > 0.8) {
    if (a.wantMove && hyp(h.x - a.sx, h.y - a.sy) < 14 && h.rootT <= 0 && h.stunT <= 0) { a.path = null; a.jit = 0.3; const an = rnd() * TAU; a.jx = fcos(an); a.jy = fsin(an); }
    a.sx = h.x; a.sy = h.y; a.stuckT = 0; a.wantMove = false;
  }
  if (a.jit > 0) { a.jit -= dt; h.mvx = a.jx; h.mvy = a.jy; return; }
  if (a.org >= 2) { const dz = aiDanger(h); if (dz) { h.mvx = dz.x; h.mvy = dz.y; a.wantMove = true; return; } }       // out from under a blow that marks the ground first
  const fl = h.flurry ? flurryOf(h) : null, ft = fl && canTarget(h, fl.tgt) && hyp(fl.tgt.x - h.x, fl.tgt.y - h.y) < h.range + 340 ? fl.tgt : null;       // a marked hero in reach gets the flurry before anything else
  const t = ft || (a.tgt && canTarget(h, a.tgt) ? a.tgt : null);
  if (t) {
    const d = hyp(t.x - h.x, t.y - h.y) - t.r, rg = reachTo(h, t);
    if (d <= rg - 8 || (h.windT > 0 && d <= rg + 70)) {
      if (!ft && a.kite && h.windT <= 0 && h.atkCd > 0.2) { aiSteer(h, a.kite.x, a.kite.y); return; }
      h.atkTarget = t; return;
    }
    aiSteer(h, t.x, t.y); return;
  }
  if (a.goal && hyp(a.goal.x - h.x, a.goal.y - h.y) > 45) aiSteer(h, a.goal.x, a.goal.y);
}
/* Ground a bot of `team` would rather not cross on its way somewhere: what their turrets and crystal watch, and above all their fountain.
   Its paths go round it where there is a way round. Worked out again whenever one of their turrets has fallen. */
let ROAD_G = null;       // which nav cells are road or base ground (what turrets watch): worked out once, it never changes
function roadGrid() { if (!ROAD_G) { ROAD_G = new Uint8Array(NN * NN); for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) if (laneSd((i + .5) * NC, (j + .5) * NC) > -40) ROAD_G[j * NN + i] = 1; } return ROAD_G; }
function aiCost(team) {
  const C = G.aiCost || (G.aiCost = [null, null]), E = 1 - team, R = roadGrid(); let key = G.crystals[E].dead ? 1 : 0;
  for (const s of G.turrets) if (s.team === E) key = key * 2 + (s.dead ? 1 : 0);
  const c = C[team]; if (c && c.key === key) return c.g;
  const g = new Float32Array(NN * NN);
  const zone = (x, y, r, v, road) => {
    const i0 = Math.max(0, Math.floor((x - r) / NC)), i1 = Math.min(NN - 1, Math.floor((x + r) / NC)), j0 = Math.max(0, Math.floor((y - r) / NC)), j1 = Math.min(NN - 1, Math.floor((y + r) / NC));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = (i + .5) * NC, cy = (j + .5) * NC, k = j * NN + i; if (g[k] < v && (!road || R[k]) && hyp(cx - x, cy - y) < r) g[k] = v; }
  };
  for (const s of G.turrets) if (s.team === E && !s.dead) zone(s.x, s.y, s.range + 50, 7, true);
  const cr = G.crystals[E]; if (!cr.dead) zone(cr.x, cr.y, cr.range + 50, 7, true);
  zone(MAP.spawn[E].x, MAP.spawn[E].y, 640, 40, false);
  C[team] = { key, g }; return g;
}
function aiPath(h, x, y) { if (!h.ai.org) return planPath(h, x, y); const P = findPath(h.x, h.y, x, y, aiCost(h.team)); if (P) for (let i = 0; i < P.length; i++) postFree(P[i], h.r); return P; }
const _steerPt = { x: 0, y: 0 };
function aiSteer(h, x, y) {
  const a = h.ai; a.wantMove = true;
  _steerPt.x = x; _steerPt.y = y; postFree(_steerPt, h.r); x = _steerPt.x; y = _steerPt.y;       // never steer for a spot under a turret
  const d = hyp(x - h.x, y - h.y); let px = x, py = y;
  if (d > 110 || !losWalk(h.x, h.y, x, y)) {
    if (!a.path || a.repT <= 0 || hyp(a.pg.x - x, a.pg.y - y) > 140) {
      a.path = (d < 620 && losWalk(h.x, h.y, x, y)) ? [{ x, y }] : (aiPath(h, x, y) || [{ x, y }]);
      a.pi = 0; a.pg = { x, y }; a.repT = 0.9 + rnd() * 0.4;
    }
    a.pi = pathStep(a.path, a.pi, h.x, h.y, 55);
    px = a.path[a.pi].x; py = a.path[a.pi].y;
  }
  const dx = px - h.x, dy = py - h.y, l = hyp(dx, dy);
  if (l > 1) { h.mvx = dx / l; h.mvy = dy / l; }
}

function aiDecide(h) {
  const a = h.ai, P = a.P, T = h.team, tm = (G.team && G.team[T]) || {}, org = a.org;
  aiShop(h); aiLevel(h);
  a.tgt = null; a.kite = null; a.goal = null; a.plan = '';
  const hpF = h.hp / h.maxHp, mpF = h.def.energy ? 1 : h.mp / h.maxMp, home = MAP.spawn[T], dHome = hyp(h.x - home.x, h.y - home.y);       // (Focus is never a reason to go home)
  const foes = aiFoes(h, 1100), nf = foes[0] || null;
  if (h.recallT > 0) { a.plan = 'Recalling'; if (nf && nf._d < 650) h.recallT = 0; else return; }
  if (h.healCd <= 0 && dHome > 500 && (hpF < 0.45 || (hpF < 0.62 && G.t - h.lastDmgT < 4))) castMend(h);       // the built-in heal, once it is worth most of its worth
  aiItem(h, foes);
  aiSupport(h);
  if (aiRecast(h, null, foes, true)) return;
  const call = org && tm.call && tm.call.members.includes(h) ? tm.call : null;

  let fp = 0, mp = aiPower(h);
  for (const e of foes) if (e._d < 950) fp += aiPower(e);
  for (const p of G.heroes) if (p.team === T && p !== h && !p.dead && hyp(p.x - h.x, p.y - h.y) < 850) mp += aiPower(p) * 0.85;
  if (nearOwnTurret(h)) mp += 1.6;

  // ---- the Shardlord is half a minute off, or one has just fallen and will march: whoever is hurt goes home now and comes back whole ----
  const careful = org && tm.lordSoon;
  if (org && a.mode !== 'retreat' && !nf && dHome > 1500 && G.t - h.lastDmgT > 2 && (((tm.lordSoon || tm.lordWait) && (hpF < 0.42 || ((hpF < 0.58 || mpF < 0.25) && (tm.lordWait ? !G.epic.lord : G.epic.lordT > 16)))) || (G.t < (tm.healT || 0) && hpF < 0.6))) a.mode = 'retreat';

  // ---- retreat ----
  if (a.mode === 'retreat') { if (hpF > 0.85 && mpF > 0.55) a.mode = 'lane'; }
  else if (hpF < a.retreatAt + (careful ? 0.1 : 0) || (hpF < 0.45 && fp > mp * 1.5) || (mpF < 0.1 && hpF < 0.6 && !nf)) {
    if (!(tm.pushAll && hpF > 0.18 && G.crystals[1 - T].hp < G.crystals[1 - T].maxHp * 0.35)) a.mode = 'retreat';
  }
  if (a.mode === 'retreat') {
    a.plan = 'Falling back';
    if (nf && nf._d < 520) aiEscape(h, nf);
    else if (nf && h.def.lethal) aiCloak(h);       // (Sorrel: nobody near enough to throw the charge at, but somebody near enough to shoot her: out of their sight)
    if (hpF < 0.4 && G.t - h.lastDmgT < 1.2) aiSpell(h, nf, 'hurt');
    if (dHome < 400) { a.goal = home; if (nf && nf._d < h.range + 200) a.tgt = nf; return; }
    if (!nf && G.t - h.lastDmgT > 2.2 && dHome > 1500) { startRecall(h); return; }
    a.goal = home; return;
  }

  // ---- defend the base ----
  const al = G.alert[T]; let alarm = !!al && G.t - al.t < 5 && (al.tier >= 3 || hyp(al.x - h.x, al.y - h.y) < 2400);
  /* A bot that plays as a team does not drop what the team is doing for every turret that is being hit somewhere: with our Shardlord on
     the march only the crystal calls it back (the march is worth more than a turret), at the pit only the base. What is right
     beside it, it always helps with. */
  if (alarm && org && hyp(al.x - h.x, al.y - h.y) > 1300) { if (tm.escort) alarm = al.tier >= 4; else if (call && (call.type === 'lord' || call.type === 'contest' || call.type === 'defend')) alarm = al.tier >= 3 && call.type !== 'defend'; }
  if (alarm) {
    if (hyp(al.x - h.x, al.y - h.y) > 700) {
      a.plan = 'Defending';
      if (dHome > 3200 && al.tier >= 4 && !nf && G.t - h.lastDmgT > 2) { startRecall(h); return; }
      a.goal = { x: al.x, y: al.y }; if (!nf) return;
    }
  }

  // ---- never inside their fountain: it kills in four seconds and heals whoever stands on it ----
  const es = MAP.spawn[1 - T];
  if (org && hyp(h.x - es.x, h.y - es.y) < 660) { const cr = G.crystals[1 - T], d = hyp(cr.x - es.x, cr.y - es.y) || 1; a.goal = { x: es.x + (cr.x - es.x) / d * 1300, y: es.y + (cr.y - es.y) / d * 1300 }; a.plan = 'Out of their fountain'; return; }

  // ---- a call of the team's ----
  if (call && aiCall(h, call, foes, hpF)) return;

  /* ---- a structure of theirs whose fire is on something of ours comes down before anyone standing by it: their crystal always (that is
     the match), a turret while our Shardlord is at it (that is what the Shardlord is for) ---- */
  if (org && hpF > a.retreatAt + 0.08) {
    const cr = G.crystals[1 - T]; let st = null;
    if (!cr.dead && !cr.locked && hyp(cr.x - h.x, cr.y - h.y) < 1150 && (cr.hp < cr.maxHp * 0.6 || (tm.escortU && hyp(tm.escortU.x - cr.x, tm.escortU.y - cr.y) < 800) || !(nf && nf._d < 420))) st = cr;
    else if (tm.escortU) { const q = nextStructure(1 - T, tm.escort); if (q && q.kind === 'turret' && !q.locked && hyp(q.x - h.x, q.y - h.y) < 1000 && hyp(tm.escortU.x - q.x, tm.escortU.y - q.y) < q.range + 80 && !(nf && nf._d < 320)) st = q; }
    if (st && st.tgt !== h && minionsNear(T, st.x, st.y, st.range) >= 1) { a.tgt = st; a.mode = 'fight'; a.plan = st.kind === 'crystal' ? 'Breaking the crystal' : 'Bringing the turret down'; return; }
  }

  // ---- fight ----
  if (nf) {
    let tgt = null, ts = 1e9;
    for (const e of foes) {
      if (e._d > 900 || (org && hyp(e.x - es.x, e.y - es.y) < 720)) continue;       // nobody is fought on his own fountain
      let s = e.hp / e.maxHp + e._d / 1800;
      if (org >= 2) {       // the one the others are already on, the one who cannot get away, the one the call is about
        let on = 0; for (const p of G.heroes) if (p.team === T && p !== h && !p.dead && p.ai && p.ai.tgt === e) on++;
        s -= 0.2 * Math.min(on, 2); if (e.stunT > 0.3 || e.rootT > 0.3 || e.tauntT > 0.3) s -= 0.12; if (call && call.tgt === e) s -= 0.5;       // (taunted: as good as held)
      }
      if (s < ts) { ts = s; tgt = e; }
    }
    if (tgt) {
      const tF = tgt.hp / tgt.maxHp;
      const cover = turretThreat(T, tgt.x, tgt.y, -40, h);
      const killable = tF < 0.28 && hpF > 0.35;
      let engage = mp * P.aggro >= fp * (careful ? 1.2 : 0.95) || killable;       // with the Shardlord a minute off, only the fights that are clearly ours
      if (cover && !(P.dive && killable && hpF > 0.6)) engage = false;
      if (engage && org >= 2 && !killable) {       // nobody is chased past a turret of theirs that still stands: the way back leads under it
        const ln = laneAt(tgt.x, tgt.y), q = ln && nextStructure(1 - T, ln);
        if (q && q.kind === 'turret') { const path = LANE_PATH[T][ln]; if (progOf(path, tgt.x, tgt.y) > progOf(path, q.x, q.y) + 120 && progOf(path, h.x, h.y) < progOf(path, tgt.x, tgt.y) + 200) engage = false; }
      }
      if (engage && call && call.type === 'regroup' && !killable && !nearOwnTurret(h)) engage = false;       // the team is short: fights at home only
      if (engage) {
        a.tgt = tgt; a.mode = 'fight'; a.plan = 'Fighting ' + tgt.name;
        aiCombat(h, tgt, foes);
        if (!h.melee) { const m = foes.find(e => e.melee && e._d < 330); if (m) { const an = fatan2(h.y - m.y, h.x - m.x); const kx = h.x + fcos(an) * 220, ky = h.y + fsin(an) * 220; if (walkable(kx, ky)) a.kite = { x: kx, y: ky }; } }
        return;
      }
      if (fp > mp * P.aggro * 1.25 && nf._d < 700) {
        a.plan = 'Backing off';
        if (nf._d < 380 && hpF < 0.55) aiEscape(h, nf);
        else aiPoke(h, tgt, foes);
        a.goal = home; return;
      }
      if (h.def.lethal && aiLongShot(h, tgt, foes)) return;
      aiPoke(h, tgt, foes);
    }
  }
  a.mode = 'lane';

  // ---- standing in turret fire with no cover ----
  if (turretThreat(T, h.x, h.y, 40, h)) { a.goal = home; a.plan = 'Out of turret fire'; return; }

  // ---- the call again: there was someone of theirs about, but nothing the fight rules wanted done about him ----
  if (call && aiCall(h, call, foes, hpF, true)) return;

  // ---- objectives ----
  const ep = org ? null : aiEpic(h, hpF, tm);       // bots that play as a team take the great beasts on a call, together
  if (ep) { a.tgt = ep; aiPve(h, ep); return; }

  // ---- role ----
  a.lane = a.homeLane;
  const lean = call && !tm.escort && (call.type === 'siege' || call.type === 'push');
  if (lean) { a.lane = call.lane; a.plan = (call.type === 'siege' ? 'Sieging ' : 'Pushing ') + LANE_WORD[call.lane]; }
  else if (tm.escort && (org || a.pos !== 'carry' || tm.escort === a.homeLane)) { a.lane = tm.escort; a.plan = 'Escorting the Shardlord'; }
  else if (call && call.type === 'defend') { a.lane = call.lane; a.plan = 'Defending against the Shardlord'; }
  else if (tm.push && (tm.pushAll || a.pos === 'jungle' || a.pos === 'mid' || a.pos === 'roam')) a.lane = tm.push;
  if (al && G.t - al.t < 5 && al.lane && (alarm || !org)) a.lane = al.lane;
  if (a.pos === 'jungle' && !tm.pushAll && !tm.escort && !lean && aiJungle(h, hpF)) { a.plan = 'Clearing the jungle'; return; }
  if (!a.plan) a.plan = (call && call.type === 'regroup' ? 'Holding ' : 'Laning ') + LANE_WORD[a.lane];
  aiLane(h, hpF, mpF, call);
}

function aiLane(h, hpF, mpF, call) {
  const a = h.ai, T = h.team, lane = a.lane, path = LANE_PATH[T][lane];
  const st = nextStructure(1 - T, lane), front = G.laneFront[T][lane];
  const tanking = st ? minionsNear(T, st.x, st.y, st.range) : 0;
  /* How far up the lane it will go. A bot that plays as a team stays on its own half when the team has been told to keep back, and
     does not cross the middle hurt and alone while two or more of theirs are out of sight: that is how ganks happen. */
  let cap = 1e9;
  if (a.org) { const tm = G.team[T], back = call && call.type === 'regroup';
    if (back) cap = path.len * 0.46;
    else if (call && call.type === 'defend') cap = progOf(path, call.x, call.y) + 320;
    else if (a.org >= 2 && tm.unseen >= 2 && G.t > 60 && !tm.pushAll && hpF < 0.62 && !G.heroes.some(p => p.team === T && p !== h && !p.dead && hyp(p.x - h.x, p.y - h.y) < 900)) cap = path.len * 0.5 - 100; }
  if (cap < 1e8 && a.plan.startsWith('Laning')) a.plan = 'Laning ' + LANE_WORD[lane] + ', warily';
  if (call && call.type === 'defend') { const m = call.unit; if (!m.dead && hyp(m.x - h.x, m.y - h.y) < 820 && hyp(m.x - call.x, m.y - call.y) < 1000) { a.tgt = m; aiPve(h, m); return; } }
  if (st && !st.locked && cap > 1e8 && tanking >= 1 && hyp(st.x - h.x, st.y - h.y) < 1500 && (tanking >= 2 || hpF > 0.5 || st.hp < st.maxHp * 0.25)) {
    // clear minions only if they are on top of us; otherwise hit the structure
    a.tgt = st; return;
  }
  let best = null, bs = 1e9;
  for (const u of G.units) {
    if (u.kind !== 'minion' || u.team === T || u.dead || !u.vis[T]) continue;
    const d = hyp(u.x - h.x, u.y - h.y); if (d > 820) continue;
    if (st && tanking === 0 && hyp(u.x - st.x, u.y - st.y) < st.range - h.range + 70) continue;
    if (cap < 1e8 && progOf(path, u.x, u.y) > cap + h.range) continue;
    const s = u.hp * 0.5 + d; if (s < bs) { bs = s; best = u; }
  }
  if (best) { a.tgt = best; aiWave(h, best, mpF); return; }
  let want;
  if (front) want = front.prog - (h.melee ? 30 : 230);
  else { const own = nextStructure(T, lane); want = (own ? progOf(path, own.x, own.y) : 300) + 60; }
  if (st && tanking === 0) want = Math.min(want, progOf(path, st.x, st.y) - st.range - 170);
  if (want > cap) want = cap;
  a.goal = pointAlong(path, Math.max(want, 280));
}
function aiJungle(h, hpF) {
  const a = h.ai, T = h.team;
  if (hpF < 0.42) return false;
  let best = null, bd = 1e9;
  for (const c of G.camps) { if ((c.side !== T && c.side !== NEUTRAL) || !c.units.length) continue; const d = hyp(c.x - h.x, c.y - h.y) + (c.side === NEUTRAL ? 700 : 0); if (d < bd) { bd = d; best = c; } }       // the river skitters are anyone's, a little out of the way
  if (!best) { a.lane = G.duel ? 'mid' : LANE_NAMES[(Math.floor(G.t / 25) + h.id) % 3]; return false; }
  let m = best.units[0]; for (const u of best.units) if (u.hp < m.hp) m = u;
  a.tgt = m; aiPve(h, m); return true;
}
function aiEpic(h, hpF, tm) {
  const a = h.ai, E = G.epic; if (hpF < 0.55) return null;
  const t = E.turtle;
  if (t && !t.dead && (a.pos === 'jungle' || a.pos === 'mid') && h.level >= 4 && hyp(t.x - h.x, t.y - h.y) < 3000) return t;
  const l = E.lord;
  if (l && !l.dead && tm.lord && hyp(l.x - h.x, l.y - h.y) < 4200) return l;
  return null;
}

/* ---------------- skill use ---------------- */
function aiAim(h, t, speed, delay) {
  const P = h.ai.P, d = hyp(t.x - h.x, t.y - h.y), tt = (speed ? d / speed : 0) + (delay || 0), k = clamp(1 - P.aim * 1.3, 0, 1), err = P.aim * d * 0.22;
  return { x: t.x + t.vx * tt * k + (rnd() - .5) * 2 * err, y: t.y + t.vy * tt * k + (rnd() - .5) * 2 * err };
}
/* a skill that steps forward as it strikes: would the step carry her into turret fire she is not under yet? */
function stepsIntoFire(h, tx, ty, step) { const d = hyp(tx - h.x, ty - h.y) || 1, x = h.x + (tx - h.x) / d * step, y = h.y + (ty - h.y) / d * step; return !!turretThreat(h.team, x, y, 40, h) && !turretThreat(h.team, h.x, h.y, 40, h); }
/* The next cut of a chain: at whatever she is fighting, once the step and the sweep reach it; and with its time nearly out, at it
   anyway if one more step would close the gap. */
function aiChain(h, i, re, A, t) {
  if (!t || t.dead || t.kind === 'turret' || t.kind === 'crystal' || h.ai.mode === 'retreat') return false;
  const d = hyp(t.x - h.x, t.y - h.y), lastCall = re.until - G.t < 0.55;
  if (d > A.r + t.r * 0.5 && !(lastCall && d < A.r + (A.step || 0) + 100)) return false;
  if (A.step && h.rootT <= 0 && stepsIntoFire(h, t.x, t.y, A.step)) return false;
  return castSkill(h, i, t.x, t.y);
}
/* second casts: flash to a marked enemy, call thrown blades home, leap again. only = just the ones that cost nothing to try */
function aiRecast(h, t, foes, only) {
  const hpF = h.hp / h.maxHp;
  for (let i = 0; i < 3; i++) {
    const re = recastOf(h, i); if (!re) continue;
    const s = skDef(h, i), A = stageDef(s, re).ai;
    if (A.t === 'chain') { if (t && aiChain(h, i, re, A, t)) return true; continue; }
    if (A.t === 'recall') {       // blades on the ground: call them once something stands between them and us
      let heroes = 0, other = 0;
      for (const u of G.units) {
        if (u.dead || u.team === h.team || u.kind === 'turret' || u.kind === 'crystal' || (u.kind === 'hero' && !u.vis[h.team]) || hyp(u.x - h.x, u.y - h.y) > 900) continue;
        for (const q of re.pts) if (segDist(u.x, u.y, (q.proj || q).x, (q.proj || q).y, h.x, h.y) <= 35 + u.r * 0.6) { if (u.kind === 'hero') heroes++; else other++; break; }
      }
      if ((heroes || other >= 2 || (other && re.until - G.t < 0.7)) && castSkill(h, i, h.x, h.y)) return true;
    } else if (only) continue;
    else if (A.t === 'mark') {
      const m = re.tgt; if (!m || m.dead || m !== t) continue;
      if (turretThreat(h.team, m.x, m.y, 40, h) && !(h.ai.P.dive && m.kind === 'hero' && m.hp / m.maxHp < 0.3 && hpF > 0.6)) continue;
      if (m.kind === 'hero' && hpF < 0.35) continue;
      if (hyp(m.x - h.x, m.y - h.y) - m.r > h.range + 40 && castSkill(h, i, m.x, m.y)) return true;
    } else if (A.t === 'heave') {       // whatever the charge swept along is in front of him now: up it goes (at a hero if there is one, at anything as the chance runs out)
      let best = null, bd = 1e9; for (const e of enemiesIn(h.team, h.x, h.y, A.r)) { const d = hyp(e.x - h.x, e.y - h.y) - (e.kind === 'hero' ? 400 : 0) - (e === t ? 200 : 0); if (d < bd) { bd = d; best = e; } }
      if (best && (best.kind === 'hero' || re.until - G.t < 1.2) && castSkill(h, i, best.x, best.y)) return true;
    } else if (A.t === 'gap2' && t && t.kind === 'hero') {
      const d = hyp(t.x - h.x, t.y - h.y);
      if (d > h.range + 110 && d <= s.range + h.range && t.hp / t.maxHp < 0.45 && hpF > 0.35 && h.rootT <= 0 && !turretThreat(h.team, t.x, t.y, 40, h) && castSkill(h, i, t.x, t.y)) return true;
    }
  }
  return false;
}
function aiCombat(h, t, foes) {
  const a = h.ai; if (rnd() > a.P.skill) return;
  if (aiRecast(h, t, foes)) return;
  const d = hyp(t.x - h.x, t.y - h.y), hpF = h.hp / h.maxHp, tF = t.hp / t.maxHp;
  for (const i of [2, 0, 1]) {
    const s = skDef(h, i), lv = h.sk[i]; if (!lv || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;
    const A = s.ai; let c = null;
    if (A.ult && !(tF < 0.8 || foes.length >= 2 || hpF < 0.5)) continue;
    switch (A.t) {
      case 'line': if (d <= (A.r || s.range) * (A.far ? 0.72 : 0.9)) { c = aiAim(h, t, A.speed, 0); if (A.far && (!shotClear(h, c) || (d > 640 && t.moving && !(t.stunT > 0 || t.rootT > 0 || t.ms < t.msBase * 0.7)))) c = null; } break;       // a very long shot is only worth it at something standing still or slowed
      case 'point': if (d <= s.range + A.r * 0.4) c = aiAim(h, t, 0, A.delay * 0.6); break;
      case 'near': if (d <= A.r + t.r * 0.5 && !(A.step && h.rootT <= 0 && stepsIntoFire(h, t.x, t.y, A.step)) && !(A.peel && !((t.melee && d < 300) || d < 220 || hpF < 0.5 || t.hp < A.peel(h, lv) * 0.7))) c = { x: t.x, y: t.y }; break;       // (peel: a skill kept for whoever is on top of her, for when she is hurt, or for a kill)
      case 'self': if (d <= A.r * 0.85) c = { x: h.x, y: h.y }; break;
      case 'comb':       // ground that is good for friends and bad for foes: between the target and a friend who is at it, if there is one, so that it holds both; else under the target
        if (d <= s.range + A.r * 0.4) { let fr = null, fd = A.r * 1.5; for (const p of G.heroes) if (p !== h && p.team === h.team && !p.dead) { const q = hyp(p.x - t.x, p.y - t.y); if (q < fd && hyp(p.x - h.x, p.y - h.y) < s.range + A.r) { fd = q; fr = p; } }
          c = fr ? { x: (fr.x + t.x) / 2, y: (fr.y + t.y) / 2 } : aiAim(h, t, 0, 0.25); }
        break;
      case 'gap': if (A.thru || (A.thru22 && G.kit >= 22)) { if (d > h.range + 40 && d <= s.range + 70 && h.rootT <= 0 && !turretThreat(h.team, t.x, t.y, 40, h) && !turretThreat(h.team, h.x + (t.x - h.x) / d * s.range, h.y + (t.y - h.y) / d * s.range, 40, h)) c = { x: t.x, y: t.y }; break; }       // (thru: a run that goes through its target and on: from where it still reaches him, and not if it ends under a turret)
        if (d > h.range + 70 && d <= s.range + h.range + 60 && h.rootT <= 0 && !turretThreat(h.team, t.x, t.y, 40, h)) c = { x: t.x, y: t.y }; break;
      case 'kite': if (d <= h.range + 120 && h.rootT <= 0) { const an = fatan2(h.y - t.y, h.x - t.x) + (rnd() < .5 ? 1 : -1) * (d < 300 ? 0.4 : 1.2); const x = h.x + fcos(an) * 280, y = h.y + fsin(an) * 280; if (walkable(x, y)) c = { x, y }; } break;
      case 'buff': if (d <= h.range + 260) c = { x: h.x, y: h.y }; break;
      case 'camo': if (!h.camo && !lethalReady(h) && d <= h.range + 240) c = { x: h.x, y: h.y }; break;       // under the cloak for the next Long Shot, whenever one is not ready
      case 'snipe': if (t.kind === 'hero' && d > (t.melee ? 450 : 330) && d <= s.range * 0.8 && (tF < 0.6 || t.stunT > 0.3 || t.rootT > 0.3) && !foes.some(e => e !== t && e._d < 420)
        && (d - t.r > h.range + 40 || 4 * snipeDmg(h, lv, t) > 2.2 * h.ad * h.asp * (1 + h.crit * (h.critDmg - 1)))) c = { x: t.x, y: t.y }; break;       // four rounds for somebody hurt or held, from where nobody is on top of her; and only at somebody her gun cannot reach anyway, or while they come to more than the shots she would fire in their place
      case 'shield': if (d <= A.r || (hpF < 0.6 && d < 650)) c = { x: h.x, y: h.y }; break;
      case 'allyAoE':       // (rally: a shield for the whole side, raised as the fight is joined: a friend within its reach, two of theirs at hand, and somebody already hurt)
        if (A.rally && d <= 620 && foes.length >= 2) { let fr = 0, hurt = hpF < 0.8; for (const p of G.heroes) if (p !== h && p.team === h.team && !p.dead && hyp(p.x - h.x, p.y - h.y) <= A.r) { fr++; if (p.hp / p.maxHp < 0.8) hurt = true; } if (fr >= 1 && hurt) c = { x: h.x, y: h.y }; }
        break;
      case 'target': if (d <= s.range && (!A.finisher || tF < 0.62)) c = { x: t.x, y: t.y }; break;
      case 'form':       // two masks: go in as the Tiger once the far skills are spent on a marked, stunned or weak target; back out when the claws are spent or it gets too hot
        if (!h.form) { if (d <= 540 && hpF > 0.45 && (h.cds[0] > 0.5 && h.cds[1] > 0.5 || d < 260) && (t.stunT > 0.4 || (markOf(t) > 0 && tF < 0.8) || tF < 0.4) && foes.length <= 2 && hpF > tF - 0.25 && !turretThreat(h.team, t.x, t.y, 40, h)) c = { x: h.x, y: h.y }; }
        else if ((h.cds[0] > 1 && h.cds[1] > 1) || hpF < 0.33 || d > 700 || (foes.length > 2 && hpF < 0.6)) c = { x: h.x, y: h.y };
        break;
    }
    if (c && castSkill(h, i, c.x, c.y)) return;
  }
  aiSpell(h, t, 'fight');
}
/* The totem: pressed once a fight is on and there is something to shrug off. Caught by a slow or a root with an enemy hero near;
   or hurt by a hero while outnumbered or already worn down; or going into two or more of them. Never on creeps or minions. */
function aiItem(h, foes) {
  if (!itemReady(h) || rnd() > h.ai.P.skill) return;
  const nf = foes[0]; if (!nf || nf._d > 760) return;
  let near = 0; for (const e of foes) if (e._d < 720) near++;
  const hpF = h.hp / h.maxHp, held = h.rootT > 0.3 || h.buffs.some(b => b.msMul && b.msMul <= 0.72 && b.t > 0.5);
  const hot = G.t - h.lastHeroHitT < 1.5 && G.t - h.lastDmgT < 1.5;
  if (hpF < 0.12) return;       // too late to matter
  if (held || (hot && (near >= 2 || hpF < 0.7)) || (h.ai.mode === 'fight' && near >= 2 && nf._d < 540)) useItem(h);
}
/* Sorrel when she is not in a fight but somebody of theirs is about: four rounds for one of them who is badly hurt, from far enough
   off; a Long Shot for whoever is within its reach, which is further than most of them can answer from; and the cloak to ready the
   next one. Never from inside the reach of a turret of theirs, which would answer for whoever she shot. */
function aiLongShot(h, t, foes) {
  const P = h.ai.P, u = skDef(h, 2), ul = h.sk[2];
  if (ul && h.cds[2] <= 0 && h.mp >= skillCost(u, ul) && !foes.some(e => e._d < 450)) { const low = foes.find(e => e.hp / e.maxHp < 0.45 && e._d <= SNIPE_R * 0.7); if (low && rnd() < P.skill && castSkill(h, 2, low.x, low.y)) return true; }
  for (const s of G.turrets) if (s.team !== h.team && !s.dead && hyp(s.x - h.x, s.y - h.y) <= s.range + h.r + 70) return false;
  const c = G.crystals[1 - h.team]; if (c && !c.dead && hyp(c.x - h.x, c.y - h.y) <= (c.range || 0) + h.r + 70) return false;
  const d = hyp(t.x - h.x, t.y - h.y) - t.r;
  if (lethalReady(h)) { if (d <= h.range - 20) { h.ai.tgt = t; return true; } return false; }
  const s = skDef(h, 0), lv = h.sk[0];
  if (lv && h.cds[0] <= 0 && !h.camo && h.mp >= skillCost(s, lv) + 45 && d <= h.range + LETHAL_RANGE + 40 && rnd() < P.skill) castSkill(h, 0, h.x, h.y);
  return false;
}
function aiCloak(h) { const s = skDef(h, 0), lv = h.sk[0]; if (lv && s.ai.t === 'camo' && h.cds[0] <= 0 && !h.camo && h.mp >= skillCost(s, lv)) castSkill(h, 0, h.x, h.y); }
function aiPoke(h, t, foes) {
  const a = h.ai; if (rnd() > a.P.skill * 0.6 || h.mp / h.maxMp < 0.35) return;
  const d = hyp(t.x - h.x, t.y - h.y);
  for (const i of [0, 1]) {
    const s = skDef(h, i), lv = h.sk[i], A = s.ai; if (!lv || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;
    if (A.t === 'line' && s.range >= 700 && d <= s.range * (A.far ? 0.72 : 0.9)) { const c = aiAim(h, t, A.speed, 0); if (A.far && !shotClear(h, c)) continue; if (castSkill(h, i, c.x, c.y)) return; }
    if (A.t === 'point' && s.range >= 600 && d <= s.range + A.r * 0.3) { const c = aiAim(h, t, 0, A.delay * 0.6); if (castSkill(h, i, c.x, c.y)) return; }
  }
}
function aiSupport(h) {
  if (h.stunT > 0) return;
  for (let i = 0; i < 3; i++) {
    const s = skDef(h, i), lv = h.sk[i], A = s.ai; if (!lv || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;
    if (A.t === 'heal' || A.t === 'comb') {
      let best = null, bf = 0.68;
      for (const p of G.heroes) if (p.team === h.team && !p.dead && hyp(p.x - h.x, p.y - h.y) < s.range + A.r * 0.5) { const f = p.hp / p.maxHp; if (f < bf) { bf = f; best = p; } }
      if (best && castSkill(h, i, best.x, best.y)) return;
    } else if (A.t === 'allyAoE' || A.mend) {       // (mend: a skill for a fight that also mends whoever is near her: worth it for that alone when they are hurt enough)
      let low = 0, crit = 0;
      for (const p of alliesIn(h.team, h.x, h.y, A.r)) { const f = p.hp / p.maxHp; if (f < 0.6 && G.t - p.lastDmgT < 3) low++; if (f < 0.32 && G.t - p.lastDmgT < 3) crit++; }
      if ((low >= 2 || crit >= 1) && castSkill(h, i, h.x, h.y)) return;
    }
  }
}
/* nothing of theirs stands in the way of a shot that stops at the first thing it meets */
function shotClear(h, c) { for (const u of G.units) { if (u.team === h.team || u.dead || u.kind === 'hero' || u.kind === 'turret' || u.kind === 'crystal') continue; if (segDist(u.x, u.y, h.x, h.y, c.x, c.y) < u.r + 40 && hyp(u.x - h.x, u.y - h.y) < hyp(c.x - h.x, c.y - h.y)) return false; } return true; }
function aiWave(h, m, mpF) {
  if (h.form && h.def.forms && h.cds[2] <= 0 && h.cds[0] > 0.5 && h.cds[1] > 0.5 && castSkill(h, 2, h.x, h.y)) return;       // claws spent on the wave: back to range
  for (let i = 0; i < 2; i++) { const re = recastOf(h, i); if (re) { const A = stageDef(skDef(h, i), re).ai; if (A.t === 'chain' && aiChain(h, i, re, A, m)) return; } }       // a chain begun on the wave is finished on it
  const a = h.ai; if (mpF < 0.5 || rnd() > 0.45 * a.P.farm) return;
  const d = hyp(m.x - h.x, m.y - h.y);
  for (const i of [0, 1]) { const s = skDef(h, i), lv = h.sk[i]; if (lv && s.ai.t === 'camo' && h.cds[i] <= 0 && !h.camo && !lethalReady(h) && h.mp >= skillCost(s, lv) + 45 && d <= h.range + 120 && castSkill(h, i, h.x, h.y)) return; }       // (the cloak, for the next Long Shot at the wave; with the Focus for a fight kept back)
  let n = 0; for (const u of G.units) if (u.kind === 'minion' && u.team !== h.team && !u.dead && hyp(u.x - m.x, u.y - m.y) < 260) n++;
  if (n < 3) return;
  if (h.def.forms && !h.form && h.cds[2] <= 0 && d < 520 && !G.heroes.some(e => e.team !== h.team && !e.dead && hyp(e.x - h.x, e.y - h.y) < 760) && !turretThreat(h.team, m.x, m.y, 40, h)) { castSkill(h, 2, h.x, h.y); return; }       // nobody about: clear the wave with the claws
  for (const i of [0, 1]) {
    const s = skDef(h, i), lv = h.sk[i], A = s.ai; if (!lv || !A.wave || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;
    if ((A.t === 'self' || A.t === 'near') ? d <= A.r : d <= (s.range || 300) * 0.9) { if (castSkill(h, i, m.x, m.y)) return; }
  }
}
function aiPve(h, m) {
  const d = hyp(m.x - h.x, m.y - h.y) - m.r, mpF = h.mp / h.maxMp;
  if (h.spell === 'retribution' && h.spellCd <= 0 && d < 480 && (m.hp <= retriDmg(h) || (!m.epic && m.hp > retriDmg(h) * 1.6 && m.r > 40))) { if (castSkill(h, 3, m.x, m.y)) return; }
  if (aiRecast(h, m, [])) return;
  if (mpF < 0.3 || rnd() > h.ai.P.skill) return;
  for (const i of m.epic ? [2, 0, 1] : [0, 1]) {
    const s = skDef(h, i), lv = h.sk[i], A = s.ai; if (!lv || A.hero || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;       // hero: a skill that does nothing to a creep
    let ok = false;
    if (A.t === 'line' || A.t === 'point') ok = d <= (s.range || 300) * 0.85;
    else if (A.t === 'near' || A.t === 'self') ok = d <= A.r * 0.8;
    else if (A.t === 'camo') ok = !h.camo && !lethalReady(h) && d <= h.range + 120;
    else if (A.t === 'buff' && !A.ult) ok = d <= h.range + 60;
    else if (A.t === 'buff' && m.epic) ok = d <= h.range + 60;
    if (ok && castSkill(h, i, m.x, m.y)) return;
  }
}
function aiEscape(h, foe) {
  const home = MAP.spawn[h.team];
  let ax = home.x - h.x, ay = home.y - h.y; const l = hyp(ax, ay) || 1; ax /= l; ay /= l;
  if (h.ai.path && h.ai.path[h.ai.pi]) { const p = h.ai.path[h.ai.pi], pl = hyp(p.x - h.x, p.y - h.y); if (pl > 30) { ax = (p.x - h.x) / pl; ay = (p.y - h.y) / pl; } }
  const u = skDef(h, 2);       // an ultimate that is a leap gets a hero out as well as in
  if (u.ai.esc2 && h.rootT <= 0 && h.sk[2] > 0 && h.hp / h.maxHp < 0.4 && (recastOf(h, 2) || (h.cds[2] <= 0 && h.mp >= skillCost(u, h.sk[2]))) && castSkill(h, 2, h.x + ax * u.range, h.y + ay * u.range)) return;
  if (h.rootT <= 0) for (const i of h.def.lethal ? [1, 0] : [0, 1]) {       // (Sorrel: the charge first, then the cape; the other way about the charge would only bring her out from under it)
    const s = skDef(h, i), lv = h.sk[i]; if (!lv || !s.ai.esc || h.cds[i] > 0 || h.mp < skillCost(s, lv)) continue;
    if (s.cast === 'self') { if (castSkill(h, i, h.x, h.y)) return; continue; }
    if (s.ai.back) { const fd = foe ? hyp(foe.x - h.x, foe.y - h.y) : 1e9; if (fd < s.range && !(h.camo && fd > 220) && castSkill(h, i, h.x - ax * 200, h.y - ay * 200)) return; continue; }       // (back: thrown at whoever is after her, it carries her the other way; not from under her cape at somebody who cannot see her)
    const r = s.range || 350, p = clampWalk(h.x, h.y, h.x + ax * r, h.y + ay * r);
    if (hyp(p.x - h.x, p.y - h.y) > r * 0.5 && castSkill(h, i, h.x + ax * r, h.y + ay * r)) return;
  }
  aiSpell(h, foe, 'flee', ax, ay);
}
function aiSpell(h, t, ctx, ax, ay) {
  if (h.spellCd > 0) return;
  const hpF = h.hp / h.maxHp;
  switch (h.spell) {
    case 'flicker': if (ctx === 'flee' && hpF < 0.3 && t && t._d < 450 && h.rootT <= 0) castSkill(h, 3, h.x + ax * 420, h.y + ay * 420); break;
    case 'sprint': if ((ctx === 'flee' && hpF < 0.4) || (ctx === 'fight' && t && t.hp / t.maxHp < 0.3 && hyp(t.x - h.x, t.y - h.y) > h.range + 80)) castSkill(h, 3, h.x, h.y); break;
    case 'aegis': if (hpF < 0.42 && G.t - h.lastDmgT < 1.2) castSkill(h, 3, h.x, h.y); break;
    case 'inspire': if (ctx === 'fight' && t && t.kind === 'hero' && hpF > 0.2 && hyp(t.x - h.x, t.y - h.y) - t.r <= h.range + 60) castSkill(h, 3, h.x, h.y); break;
    case 'execute': if (ctx === 'fight' && t && hyp(t.x - h.x, t.y - h.y) < 560 && t.hp + shieldOf(t) <= executeDmg(h, t) * 0.95) castSkill(h, 3, t.x, t.y); break;
  }
}
