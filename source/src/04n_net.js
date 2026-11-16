/* ============================================================
   Playing together, part one: the turns.
   No screen and no connection here: what the other machines publish is handed in (ncIn), what this one should publish is handed
   out (ncOut), and the match is stepped as far as the frames in hand allow (ncTick).

   Every machine runs the whole match and they stay together by giving every seat the same frame at the same turn (see the sim's
   netApply). A player's doings are not done at once: they are put in a frame D turns ahead of the turn the machine is playing, and
   the frames not yet known to have arrived are published again and again until every other machine says it has them (the channel
   keeps only the latest thing each machine said, so each says everything that still matters). A turn begins when the frames of
   every seat for it are in hand; a machine that lacks one waits, and the others soon wait for it in turn: the match runs at the pace
   of the slowest. Frames are never changed once published.

   D is each sender's own business. Every two seconds each machine says, for each other seat, how long it waited for that seat's
   frames and how many turns of them it had to spare (the second lowest count of the two seconds: one bad moment is not the road).
   A machine whose frames keep arriving late schedules further ahead: at once if the others had none to spare either, and
   otherwise only if it happens again within a few seconds, because one hold-up on the way is better sat out once than paid for in
   every press for the rest of the match. One whose frames arrive with turns to spare schedules less far, and remembers for a
   while where that turned out to be too little. The turns skipped when D grows repeat what was held.

   A seat goes (its page closed, or silent too long, or its player left): every machine that notices says so, with the last turn it
   has that seat's frames for, and republishes that seat's last frames for whoever has fewer. When all who remain name the same
   last turn, the seat is a bot from the turn after it, on every machine alike.
   ============================================================ */
const NC_INIT = 2;                                 // the first turns of a match are idle for every seat
const NC_D0 = 3, NC_DMIN = 2, NC_DMAX = 14;       // turns ahead a player's doings are scheduled: to begin with, at least, at most (15 turns a second)
const NC_CALM = 4000, NC_FLOOR = 20000;            // ms without trouble before it tries one turn less ahead; and for how long it will not go back under a number that going down to has just proved too low
const NC_AGAIN = 9000;                             // ms within which a second hold-up at the same seat counts as the road, not as bad luck
const NC_WIN = 96;                                 // the most of its own frames a machine keeps publishing
const NC_SILENT = 9000;                            // ms without a sign of life from a seat that is being waited for: it has gone
const NC_HASH = 30;                                // the match's fingerprint is compared every so many turns
const NC_STEP = NET_DU / DT_Q;                     // seconds to a step
const NC_ACTS = 12;                                // presses to a frame, at most
const NC_FMAX = 1000, NC_RMAX = 280, NC_RELAYS = 3; // characters of its own frames a machine publishes at once, at most; of a gone seat's; and for how many gone seats at once (what a machine may publish is bounded: see the room's presence)
const NC_OFFLINE = 8000;                           // ms a machine that knows it has no connection goes on hoping: after that it gives the match up itself (the others will have, or soon will)
const NC_STUCK = 3000;                             // ms a machine may be offered only frames of a gone seat that do not follow on from its own before it gives the match up

/* ---- frames as text ---- */
const _ncF = new Float32Array(1), _ncU = new Uint32Array(_ncF.buffer), _ncRe = /^[0-9a-z]{1,7}$/;
function ncNum(s, max) { if (typeof s !== 'string' || !_ncRe.test(s)) return -1; const n = parseInt(s, 36); return n <= max ? n : -1; }
function ncF2s(v) { _ncF[0] = v; return _ncU[0].toString(36); }
function ncS2f(s) { const n = ncNum(s, 4294967295); if (n < 0) return NaN; _ncU[0] = n; return _ncF[0]; }
function ncEncAct(a) {
  switch (a[0]) {
    case A_CAST: return 'c' + a[1] + ncF2s(a[2]) + ',' + ncF2s(a[3]);
    case A_LEVEL: return 'l' + a[1]; case A_SELL: return 's' + a[1]; case A_BUY: return 'b' + ITEM_KEYS.indexOf(a[1]).toString(36);
    case A_MEND: return 'm'; case A_ITEM: return 'i'; case A_RECALL: return 'r';
  }
  return '';
}
function ncDecAct(s) {       // null: not a press this build knows (it is left out, on every machine alike)
  const k = s[0], r = s.slice(1);
  if (k === 'c') { const i = r.charCodeAt(0) - 48, p = r.slice(1).split(','); if (!(i >= 0 && i <= 3) || p.length !== 2) return null; const x = ncS2f(p[0]), y = ncS2f(p[1]); return x - x === 0 && y - y === 0 ? [A_CAST, i, x, y] : null; }
  if (k === 'l') { const i = ncNum(r, 2); return i < 0 ? null : [A_LEVEL, i]; }
  if (k === 's') { const i = ncNum(r, 5); return i < 0 ? null : [A_SELL, i]; }
  if (k === 'b') { const i = ncNum(r, ITEM_KEYS.length - 1); return i < 0 ? null : [A_BUY, ITEM_KEYS[i]]; }
  if (r === '') { if (k === 'm') return [A_MEND]; if (k === 'i') return [A_ITEM]; if (k === 'r') return [A_RECALL]; }
  return null;
}
function ncEnc1(f) { let s = (f.mc === MOVE_NONE ? '' : f.mc.toString(36)) + '.' + f.bits.toString(36) + (f.bits & 16 ? '.' + f.hint.toString(36) : ''); for (const a of f.acts) s += '!' + ncEncAct(a); return s; }
function ncDec1(s) {       // null: a frame that says nothing new (also what a frame that cannot be read counts as)
  const q = s.split('!'), h = q[0].split('.'); if (h.length < 2 || h.length > 3) return null;
  const mc = h[0] === '' ? MOVE_NONE : ncNum(h[0], 65534), bits = ncNum(h[1], 31); if (mc < 0 || bits < 0) return null;
  let hint = 0; if (bits & 16) { hint = h.length === 3 ? ncNum(h[2], 2147483647) : -1; if (hint < 0) return null; } else if (h.length === 3) return null;
  const acts = []; for (let i = 1; i < q.length && acts.length < NC_ACTS; i++) { const a = ncDecAct(q[i]); if (a) acts.push(a); }
  return { mc, bits, hint, acts };
}
/* a run of frames (null: the same as before, nothing pressed) as one string, and back. A string that cannot be read gives null. */
function ncEnc(frames, max) {       // max: the most characters, if any (frames from the first on, as many as fit: what is left out follows once these are known to have arrived)
  const parts = []; let run = 0; const flush = () => { if (run) { parts.push(run > 1 ? '=' + run.toString(36) : '='); run = 0; } };
  for (const f of frames) { if (!f) { run++; continue; } flush(); parts.push(ncEnc1(f)); }
  flush();
  if (max) { let len = 0, k = 0; while (k < parts.length && (k === 0 || len + parts[k].length + 1 <= max)) len += parts[k++].length + 1; parts.length = k; }
  return parts.join(';');
}
function ncDec(str, max) {
  if (typeof str !== 'string' || str.length > 6000) return null; const out = []; if (str === '') return out;
  for (const p of str.split(';')) {
    if (p[0] === '=') { const n = p.length === 1 ? 1 : ncNum(p.slice(1), max); if (n < 1) return null; for (let i = 0; i < n; i++) out.push(null); }
    else out.push(ncDec1(p));
    if (out.length > max) return null;
  }
  return out;
}

/* ---- a match in progress, as this machine holds it ----
   n: which match of the table this is; seats, me; D: turns ahead my doings go; T: the turn being played (stepIn steps of it done);
   fr[s]: seat s's frames from turn lo[s] on, have[s]: the last turn there is one for (for my own seat that is hi, the last I have
   published a frame for); ack[s]: the last turn of MY frames that seat s says it has; pT[s]: the turn s is at; seen[s]: when it last
   showed life (ms); here[s]: still at the table; gone[s] and the rest: see ncGone. */
function ncNew(n, seats, me, now) {
  const M = { n, seats, me, D: NC_D0, T: 0, stepIn: 0, acc: 0, fr: [], lo: [], have: [], hi: NC_INIT - 1, ack: [], pT: [], seen: [], here: [], wf: [],
    gone: [], bel: [], dropAt: [], out: false, lost: false, left: false, bad: null, hashes: [], their: [], hh: null,       // out: the match goes on without this machine (lost: because it fell too far behind)
    waitSeat: -1, waitMs: 0, wAcc: [], waited: [], sAcc: [], slack: [], late: [], spare: [], winT: now, dT: now, calmT: now, lastF: null,
    hb: 0, hbT: now, dirty: true, fresh: true, pubT: 0, turns: 0, stalls: 0, stuck: [], offline: false, offT: 0, cut: false, floorD: 0, floorT: now - NC_FLOOR,
    wn: 1, wnOf: [], rep: [], lateAt: [], sA2: [], sN: [], upT: now, downT: now - NC_AGAIN };       // wn: which two seconds this machine's report is of · wnOf[s]: the last report read from seat s, rep[s]: and not acted on yet · lateAt[s]: when s last said it had waited for this machine       // offline: this machine knows it has no connection just now (cut: and gave the match up over it)       // fresh: there is a frame of its own that has not been published yet
  for (let s = 0; s < seats; s++) { M.fr.push([]); M.lo.push(NC_INIT); M.have.push(NC_INIT - 1); M.ack.push(NC_INIT - 1); M.pT.push(0); M.seen.push(now); M.here.push(true); M.wf.push(-1);
    M.gone.push(false); M.bel.push({}); M.dropAt.push(-1); M.their.push(null); M.wAcc.push(0); M.waited.push(0); M.sAcc.push(99); M.slack.push(99); M.late.push(0); M.spare.push(99); M.stuck.push(0); M.wnOf.push(0); M.rep.push(false); M.lateAt.push(now - NC_AGAIN); M.sA2.push(99); M.sN.push(0); }
  return M;
}
function ncGet(M, s, t) { const i = t - M.lo[s]; return i >= 0 && i < M.fr[s].length ? M.fr[s][i] : null; }
function ncActive(M, s) { return !M.gone[s]; }
/* frames of seat s from turn `lo` on, as another machine has them: those that follow on from what is in hand are taken, the rest are known already */
function ncTake(M, s, lo, arr) {
  let got = 0; if (!arr || !(lo >= NC_INIT)) return 0;
  for (let i = 0; i < arr.length; i++) { const t = lo + i; if (t <= M.have[s]) continue; if (t !== M.have[s] + 1) break; M.fr[s].push(arr[i]); M.have[s] = t; got++; }
  return got;
}
/* ---- what another machine published: d is its match object (as ncOut makes them); who knows what is not trusted, only read ---- */
function ncIn(M, s, d, now) {
  if (!d || typeof d !== 'object' || d.n !== M.n || s === M.me || !(s >= 0 && s < M.seats)) return;
  M.seen[s] = now; const S = M.seats, int = v => typeof v === 'number' && v === (v | 0);
  if (int(d.t) && d.t > M.pT[s]) M.pT[s] = d.t;
  M.wf[s] = int(d.wf) && d.wf >= 0 && d.wf < S ? d.wf : -1;
  if (d.q === 1) ncGone(M, s);
  if (Array.isArray(d.g)) for (let g = 0; g < S; g++) {       // the seats it holds to have gone, and the last turn it has each one's frames for (-1: not gone)
    const b = d.g[g]; if (!int(b) || b < 0) continue;
    if (g === M.me) { if (!M.out && !M.gone[s]) { M.out = true; M.bad = null; M.dirty = true; M.fresh = true; } continue; }       // the others have gone on without this machine (and from there its match is no longer theirs: no alarm about that)
    ncGone(M, g); M.bel[s][g] = b;
    let r = null; if (Array.isArray(d.rl)) for (const q of d.rl) if (Array.isArray(q) && q[0] === g) { r = q; break; }       // (its last frames of that seat, for whoever has fewer: [seat, from which turn, the frames])
    if (r && int(r[1]) && M.dropAt[g] < 0) {
      if (ncTake(M, g, r[1], ncDec(r[2], 64))) { M.dirty = true; M.stuck[g] = 0; }
      else if (r[1] > M.have[g] + 1 && !M.stuck[g]) M.stuck[g] = now;       // what it offers does not follow on from what this machine has
    }
  }
  if (M.gone[s]) return;       // (a seat that has gone says nothing more that counts: not its frames, not what it has, and above all not its fingerprints, which are of a match of its own from the turn it was dropped)
  if (int(d.lo)) {
    if (d.lo > M.have[s] + 1) { if (!M.out) { M.out = true; M.lost = true; M.dirty = true; M.fresh = true; } return; }       // it has stopped repeating frames this machine never got: there is no catching up from here
    if (ncTake(M, s, d.lo, ncDec(d.f, NC_WIN + 8))) M.dirty = true;
  }
  if (Array.isArray(d.a) && int(d.a[M.me]) && d.a[M.me] > M.ack[s] && d.a[M.me] <= M.hi) M.ack[s] = d.a[M.me];
  if (int(d.wn) && d.wn !== M.wnOf[s]) {       // a report of two seconds this machine has not read yet: read once
    M.wnOf[s] = d.wn; M.rep[s] = true; M.late[s] = Array.isArray(d.w) && d.w[M.me] >= 0 ? +d.w[M.me] || 0 : 0; M.spare[s] = Array.isArray(d.sl) && int(d.sl[M.me]) ? d.sl[M.me] : 99;
  }
  if (!M.out && Array.isArray(d.hh) && int(d.hh[0]) && int(d.hh[1])) { M.their[s] = d.hh; ncHashCheck(M, s); }
}
/* whether this machine has a connection, as far as it can tell. Without one, the others' silence means nothing (it is this machine
   that is missing, not they), so nobody is given up for it; and their clocks start afresh when it is back. */
function ncConn(M, up, now) {
  if (up) { if (M.offline) { M.offline = false; for (let s = 0; s < M.seats; s++) M.seen[s] = now; } }
  else if (!M.offline) { M.offline = true; M.offT = now; }
}
function ncGone(M, s) { if (M.gone[s] || s === M.me) return; M.gone[s] = true; M.dirty = true; M.fresh = true; }
/* a seat that has gone becomes a bot once everyone who remains names the same last turn of its frames */
function ncSettle(M) {
  for (let g = 0; g < M.seats; g++) {
    if (!M.gone[g] || M.dropAt[g] >= 0) continue; let all = true;
    for (let s = 0; s < M.seats && all; s++) if (s !== M.me && s !== g && !M.gone[s] && M.bel[s][g] !== M.have[g]) all = false;
    if (all) { M.dropAt[g] = M.have[g] + 1; M.dirty = true; }
  }
}
function ncHashCheck(M, s) { const h = M.their[s]; if (!h || M.bad || M.out || M.gone[s]) return; for (const q of M.hashes) if (q[0] === h[0]) { if (q[1] !== h[1]) { M.bad = { turn: h[0], seat: s }; M.dirty = true; } return; } }
/* ---- what this machine publishes ---- */
function ncOut(M) {
  let lo = M.hi + 1; for (let s = 0; s < M.seats; s++) if (s !== M.me && !M.gone[s] && M.ack[s] + 1 < lo) lo = M.ack[s] + 1;
  if (lo < M.hi + 1 - NC_WIN) lo = M.hi + 1 - NC_WIN; if (lo < M.lo[M.me]) lo = M.lo[M.me];
  const mine = M.fr[M.me], o = { n: M.n, t: M.T, hb: M.hb, lo, f: ncEnc(mine.slice(lo - M.lo[M.me]), NC_FMAX), a: M.have.slice(), w: M.waited.slice(), sl: M.slack.slice(), wn: M.wn, wf: M.waitSeat };
  if (M.hh) o.hh = M.hh; if (M.left || M.out) o.q = 1;       // (q: this machine is no longer playing this match, whether it chose to go or lost touch)
  let g = null, rl = null, nr = 0;
  for (let s = 0; s < M.seats; s++) if (M.gone[s]) {
    if (!g) { g = []; for (let q = 0; q < M.seats; q++) g.push(-1); } g[s] = M.have[s];
    if (M.dropAt[s] < 0 && nr < NC_RELAYS) {       // its last frames, from the first that someone who remains still lacks
      let need = M.have[s]; for (let q = 0; q < M.seats; q++) if (q !== M.me && q !== s && !M.gone[q]) { const b = M.bel[q][s]; need = Math.min(need, b == null ? M.have[s] - 48 : b); }
      const from = Math.max(M.lo[s], need + 1, M.have[s] - 47);
      if (from <= M.have[s]) { (rl || (rl = [])).push([s, from, ncEnc(M.fr[s].slice(from - M.lo[s]), NC_RMAX)]); nr++; }
    }
  }
  if (g) o.g = g; if (rl) o.rl = rl;
  M.dirty = false; M.fresh = false; return o;
}
/* ---- my own frame for a turn D ahead ---- */
function ncPush(M, f) { M.fr[M.me].push(f); M.hi++; M.have[M.me] = M.hi; M.dirty = true; M.fresh = true; }
function ncSample(M) {
  const I = G.input, N = G.net, want = M.T + M.D;
  if (want <= M.hi) return;                                                           // scheduled less far ahead than before: this turn's doings go with the next frame
  while (M.hi + 1 < want) ncPush(M, null);                                            // further ahead than before: the turns between repeat what was held
  const f = { mc: moveCode(I), bits: inputBits(I), hint: I.tgtHint ? I.tgtHint.id : 0, acts: N.out.splice(0) }, L = M.lastF;
  if (I.mx || I.my) I.fresh = false; else if (I.atk || I.fresh) { I.fresh = false; I.tgtHint = null; }       // (what the hero's own control would have used up, had it been done at once)
  ncPush(M, L && !f.acts.length && !(f.bits & 2) && L.mc === f.mc && L.bits === f.bits && L.hint === f.hint ? null : f); M.lastF = f;
}
/* which seat's frame for turn t is not in hand yet (-1: none, the turn can be played) */
function ncMissing(M, t) {
  for (let s = 0; s < M.seats; s++) { if (M.dropAt[s] >= 0 && t >= M.dropAt[s]) continue; if (M.have[s] < t) return s; }
  return -1;
}
function ncBegin(M) {
  const t = M.T, frames = [];
  if (!M.out && !M.left) ncSample(M);
  for (let s = 0; s < M.seats; s++) { if (M.dropAt[s] === t) netGone(s); frames.push(M.dropAt[s] >= 0 && t >= M.dropAt[s] ? null : t < NC_INIT ? null : ncGet(M, s, t)); }
  for (let s = 0; s < M.seats; s++) if (s !== M.me && !M.gone[s]) { const sp = M.have[s] - t; M.sN[s]++; if (sp < M.sAcc[s]) { M.sA2[s] = M.sAcc[s]; M.sAcc[s] = sp; } else if (sp < M.sA2[s]) M.sA2[s] = sp; }
  netApply(frames);
}
function ncEnd(M) {
  M.T++; M.turns++; const t = M.T;
  if (t % NC_HASH === 0) { const h = simHash() | 0; M.hashes.push([t, h]); if (M.hashes.length > 8) M.hashes.shift(); M.hh = [t, h]; M.dirty = true; for (let s = 0; s < M.seats; s++) if (s !== M.me) ncHashCheck(M, s); }
  for (let s = 0; s < M.seats; s++) {       // frames that are done with: all but my own that are not known to have arrived, and a gone seat's last ones while they may be asked for
    let keep = t; if (s === M.me) { for (let q = 0; q < M.seats; q++) if (q !== s && !M.gone[q] && M.ack[q] + 1 < keep) keep = M.ack[q] + 1; if (keep < M.hi + 1 - NC_WIN) keep = M.hi + 1 - NC_WIN; }
    else if (M.gone[s] && M.dropAt[s] < 0) keep = Math.min(keep, M.have[s] - 47);
    const cut = keep - M.lo[s]; if (cut > 0) { M.fr[s].splice(0, cut); M.lo[s] += cut; }
  }
}
/* ---- time passes: dt seconds of it, at `now` ms. The match is stepped as far as it may be; returns the number of steps taken ---- */
function ncTick(M, dt, now) {
  let n = 0; if (M.out || M.bad || G.over) return 0;
  if (M.offline && now - M.offT > NC_OFFLINE) { M.out = true; M.cut = true; M.dirty = true; M.fresh = true; return 0; }
  if (now - M.hbT >= 400) { M.hbT = now; M.hb = (M.hb + 1) % 100000; M.dirty = true; }
  for (let s = 0; s < M.seats; s++) { if (!M.here[s]) ncGone(M, s); if (M.stuck[s] && M.dropAt[s] < 0 && now - M.stuck[s] > NC_STUCK) { M.out = true; M.lost = true; M.dirty = true; M.fresh = true; return 0; } }
  ncSettle(M);
  let lead = 0; for (let s = 0; s < M.seats; s++) if (s !== M.me && !M.gone[s] && M.pT[s] - M.T > lead) lead = M.pT[s] - M.T;
  M.acc = Math.min(M.acc + dt * (lead >= 3 ? 1.5 : lead >= 2 ? 1.2 : 1), 0.35);       // behind the others: a little faster than the clock until it has caught up
  const most = lead >= 2 ? 6 : 3; let waiting = -1;
  while (M.acc >= NC_STEP && n < most && !G.over) {
    if (M.stepIn === 0) { waiting = ncMissing(M, M.T); if (waiting >= 0) break; ncBegin(M); }
    step(NC_STEP); n++; M.acc -= NC_STEP;
    if (++M.stepIn >= NET_STEPS) { M.stepIn = 0; ncEnd(M); }
  }
  if (waiting >= 0) {
    if (M.acc > NC_STEP * 1.5) M.acc = NC_STEP * 1.5;
    if (M.waitSeat !== waiting) { M.waitSeat = waiting; M.dirty = true; } M.waitMs += dt * 1000; M.wAcc[waiting] += dt * 1000; if (n === 0) M.stalls++;
    if (!M.gone[waiting] && !M.offline && now - M.seen[waiting] > NC_SILENT) ncGone(M, waiting);
  } else if (M.waitSeat >= 0 && n > 0) { M.waitSeat = -1; M.waitMs = 0; M.dirty = true; }
  if (now - M.winT >= 2000) {       // what the last two seconds were like, for the others to read
    M.winT = now; M.wn = M.wn % 99999 + 1; for (let s = 0; s < M.seats; s++) { M.waited[s] = Math.round(M.wAcc[s]); M.wAcc[s] = 0; M.slack[s] = M.sN[s] >= 8 ? M.sA2[s] : M.sAcc[s]; M.sAcc[s] = M.sA2[s] = 99; M.sN[s] = 0; } M.dirty = true;
  }
  if (!M.out) {       // how far ahead to schedule, from what the others have just reported
    let up = 0, calm = true, any = false, others = 0;
    for (let s = 0; s < M.seats; s++) {
      if (s === M.me || M.gone[s]) continue; others++; if (M.late[s] > 100 || M.spare[s] < 2) calm = false; if (!M.rep[s]) continue; M.rep[s] = false; any = true;
      if (M.late[s] > 100) { const again = now - M.lateAt[s] < NC_AGAIN; M.lateAt[s] = now; if (M.spare[s] <= 0 || again) up = Math.max(up, M.late[s] > 700 && M.spare[s] <= 0 ? 2 : 1); }       // (waited, and had nothing to spare either: the road is longer than D. Waited twice in a few seconds: it keeps happening)
    }
    if (!calm || !others) M.calmT = now;
    if (up && lead < 2 && M.D < NC_DMAX && now - M.upT > 1200) { M.D = Math.min(NC_DMAX, M.D + up); M.upT = now; M.calmT = now; if (now - M.downT < NC_AGAIN) { M.floorD = M.D; M.floorT = now; } }       // (further ahead straight after going down: that number was too low, and is left alone for a while)
    else if (any && now - M.calmT > NC_CALM && M.D > NC_DMIN && !(now - M.floorT < NC_FLOOR && M.D <= M.floorD)) { M.D--; M.downT = now; M.calmT = now; }
  }
  return n;
}
/* whom the match is really waiting for: the seat this machine lacks a frame from may itself be waiting for another */
function ncWaitingFor(M) { let s = M.waitSeat, k = 0; while (s >= 0 && s !== M.me && !M.gone[s] && M.wf[s] >= 0 && M.wf[s] !== s && k++ < M.seats) s = M.wf[s]; return s; }
