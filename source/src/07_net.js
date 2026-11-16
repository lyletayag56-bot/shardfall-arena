/* ============================================================
   Playing together, part two: the room, the table, the screens.

   The page's "room" reaches whoever has this page open right now: inside Claude it is the platform's (window.claude.use('room')),
   anywhere else on the web the page keeps one itself (linkOpen(), part three), and from here on the two are the same thing. Each page keeps one object there that
   the others see (its presence), and that is all this uses: nothing is sent as a message, so nothing needs a sender's rights.
   In the room itself a page says only that it is here and which table it is at (L). A table is a room within the room, joined by its
   code ('t-' + code); where the platform has no such rooms the table shares the lobby and is told apart by its code (and a table
   one of whose pages must share is shared by all of them). At the table a page says who it is, its side, hero and whether it is
   ready (T), the host adds the settings and, to start, the seats and the seed (T.go), and during a match everyone adds what the
   turn exchange needs (T.m, see ncOut). What a page may keep there is small and plain (4 KiB of JSON, names for keys, short
   strings), which is why the turn exchange bounds what it says and says it in lists.

   What the others say is never trusted, only read: names are stripped to letters and digits, heroes and levels are looked up, and a
   frame that cannot be read is no frame.

   NET.ok: 0 not asked yet, 1 connected, -1 this view cannot connect. chan: the table (null: not at one). P: the pages at the table,
   as read. hs: this page hosts. go: what the host started. M: the match in progress, as the turn exchange holds it (ncNew).
   ============================================================ */
const NETV = 4;       // (what the pages say to one another, as a number: pages of different numbers do not sit at one table)
const NET_AWAY = 6000;        // ms the page of a seat may be missing from the table during a match before the seat counts as gone (connections are refreshed now and then, and that is no leaving)
const NET_GO_MS = 15000;      // ms the host keeps saying how a match started
const NET_BYTES = 3900;       // the most a page may keep in a room is 4 KiB
const NET = { ok: 0, busy: false, room: null, chan: null, named: false, code: null, me: null, nick: '', team: 0, ready: false, pt: 0, hs: 0, ht: 0, cfg: { md: 'team', df: [1, 1] },
  go: null, goT: 0, lastN: 0, quitN: 0, P: [], host: null, hostT: 0, tables: [], here: 0, since: 0, M: null, seats: null, abs: [], prev: new Map(), pubT: 0, note: '', off: [], sig: '', lsig: '',
  waitShown: false, offT: 0, warned: false, timer: 0, say: null, look: true, web: false, want: null, down: false, dnT: 0, pingT: 0 };
const NET_SITE = typeof SITE_URL === 'string' && /^https:\/\//.test(SITE_URL) ? SITE_URL : '';       // where the page lives on the open web, if it does (said to those whom Claude's room does not take)
const netNick = s => (typeof s === 'string' ? s : '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
const netCode = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; };
const netName = p => p.me ? p.nm + ' (you)' : p.nm;
const netBytes = s => { if (s.length * 3 <= NET_BYTES) return 0; try { return new TextEncoder().encode(s).length; } catch (e) { return s.length * 3; } };       // (0: surely small enough)
function netPut(ch, patch) { try { const p = ch.presence(patch); if (p && p.catch) p.catch(e => { if (e && e.code === 'invalid_argument' && !NET.warned) { NET.warned = true; console.warn('Shardfall: the room refused what this page said:', e.message); } }); } catch (e) { /* not now */ } }

/* ---------------- the room ---------------- */
function netConnect() {
  if (NET.ok !== 0 || NET.busy) return; NET.busy = true;
  const C = window.claude; let pr = null; NET.web = !(C && typeof C.use === 'function');       // (inside Claude: the platform's room. Anywhere else: the page's own)
  try { pr = NET.web ? linkOpen() : C.use('room'); } catch (e) { pr = null; }
  Promise.resolve(pr).then(r => {
    NET.busy = false;
    if (!r || typeof r.presence !== 'function' || typeof r.onPeers !== 'function') { NET.ok = -1; NET.want = null; netRender(true); return; }
    NET.room = r; NET.ok = 1; NET.since = performance.now(); NET.look = true; NET.down = false; NET.dnT = 0;
    if (NET.web) { LK.onNote = () => { if (NET.chan && !NET.M) { netSay(); netRender(); } }; linkDirect(UI.direct !== false); }       // (a line opened or lost: the table hears how many this page has, and shows it)
    try { r.onPeers(c => netLobbyPeers(c && c.peers || []), () => netLost()); } catch (e) { NET.ok = -1; }
    if (!NET.timer) NET.timer = setInterval(netTick, 1000);
    setTimeout(() => { NET.look = false; netRender(); }, 2600);       // (the others in the room answer over a second or two: nobody is "alone" before that)
    netLobbySay(); netRender(true);
    if (NET.want) { const c = NET.want; NET.want = null; netSit(c, false); }       // (the page was opened by a table's invite link)
  }, () => { NET.busy = false; NET.ok = -1; NET.want = null; netRender(true); });
}
function netLost() {       // this view has been cut off for good (until the page is opened again)
  if (NET.ok === -1) return; NET.ok = -1;
  if (NET.M) netStop('The connection was lost, and the match goes on without this device.', 2); else { netOff(true); netRender(true); }
}
function netLobbySay() {       // what everyone with the page open sees of this one: only while the sheet is open or a table is held
  if (!NET.room || NET.ok !== 1) return; const on = NET.chan || !$('mp').hidden;
  const L = on ? { v: NETV, sim: SIM_NAME, nm: NET.nick, tb: NET.code || '', sh: NET.chan && !NET.named ? 1 : 0, hs: NET.chan && NET.hs ? 1 : 0, md: NET.cfg.md, st: NET.M ? 1 : 0 } : null, sig = JSON.stringify(L);
  if (sig === NET.lsig) return; NET.lsig = sig; netPut(NET.room, { L });
}
function netLobbyPeers(peers) {
  let here = 0, share = false; const T = new Map();
  for (const p of peers) {
    if (!p || p.kind === 'agent') continue; here++; if (p.sameTab) NET.me = p.peer;
    const L = p.presence && p.presence.L; if (!L || typeof L !== 'object' || typeof L.tb !== 'string' || !/^[a-z0-9]{3,8}$/.test(L.tb)) continue;
    if (L.tb === NET.code && L.sh === 1 && !p.sameTab) share = true;
    let t = T.get(L.tb); if (!t) T.set(L.tb, t = { code: L.tb, n: 0, host: '', md: 'team', st: 0, ok: true }); t.n++; if (L.st === 1) t.st = 1;
    if (L.hs === 1) { t.host = netNick(L.nm) || 'Someone'; t.md = L.md === 'duel' ? 'duel' : 'team'; t.ok = L.v === NETV && L.sim === SIM_NAME; }
  }
  NET.here = here; NET.tables = [...T.values()].filter(t => t.host).sort((a, b) => a.code < b.code ? -1 : 1);
  if (share && NET.chan && NET.named && !NET.M && !NET.busy) netShareNow();       // someone at this table cannot use a room of its own: the whole table moves to the lobby
  if (!NET.chan) netRender();
}
function netTick() {       // once a second: what depends on time passing
  const now = performance.now();
  if (NET.web && NET.ok === 1 && NET.room) {       // the page's own room: out of reach for a while is said, and how each player at the table is heard is kept up to date
    const dn = !NET.room.connected(); if (!dn) NET.dnT = 0; else if (!NET.dnT) NET.dnT = now; const show = dn && now - NET.dnT > 2500;
    if (show !== NET.down) { NET.down = show; netRender(true); } else if (NET.chan && !NET.M) { if (netLines() !== NET.dlSaid) netSay(); netRender(); }       // (and the table hears how many direct lines this page has, whenever that changes)
  }
  if (NET.chan && !NET.M && !NET.hs && !NET.busy && now - NET.hostT > 3000) {       // the host has gone: the first of those left takes the table over
    const ok = NET.P.filter(p => p.ok);
    if (ok.some(p => p.me) && !ok.some(p => p.hs)) { const first = ok.reduce((a, b) => a.peer < b.peer ? a : b); if (first.me) { NET.hs = 1; NET.ht = Date.now(); NET.go = null; netSay(); netLobbySay(); netRender(true); } }
  }
}
/* ---------------- a table ---------------- */
/* On the open web a table has a link of its own (the page's address and '#t-' and the table's code): whoever opens it sits down at
   that table, and whoever is first there keeps it. The address bar shows it while this page is at a table. */
const netHash = () => { const m = /^#t-([a-z0-9]{3,8})$/.exec(location.hash || ''); return m ? m[1] : ''; };
const netLink = code => location.href.split('#')[0] + '#t-' + code;
function netHashSet(code) { if (!NET.web || netHash() === (code || '')) return; try { history.replaceState(null, '', code ? '#t-' + code : location.href.split('#')[0]); } catch (e) { /* the address stays as it is */ } }
function netFromLink() {
  const c = netHash(); if (!c || window.claude || NET.M || NET.busy || NET.code === c || UI.state !== 'menu') return;
  if (NET.chan) netOff();
  if (NET.ok === 1) { netOpen(true); netSit(c, false); } else if (NET.ok === 0) { NET.want = c; netOpen(true); }
}
function netShare(room) { return { shared: true, presence: p => room.presence(p), peers: () => room.peers(), onPeers: (f, e) => room.onPeers(f, e), connected: () => room.connected(), leave: () => room.presence({ T: null }) }; }
function netListen(ch) { try { NET.off.push(ch.onPeers(c => netTablePeers(c && c.peers || []), () => { if (NET.chan === ch && !ch.shared) netTableLost(); })); } catch (e) { /* the lobby says so, if it is that */ } }
async function netSit(code, host, md) {
  if (NET.chan || NET.busy || NET.ok !== 1) return; NET.busy = true; NET.note = ''; netRender(true);
  let ch = null, err = '';
  if (typeof NET.room.join === 'function') for (let k = 0; k < 2 && !ch; k++) {       // (a join that fails for now is tried once more; one that is not allowed, never)
    try { ch = await NET.room.join('t-' + code); } catch (e) { ch = null; err = e && e.code || 'upstream_error'; if (err !== 'upstream_error' && err !== 'limit_reached') break; if (k === 0) await new Promise(r => setTimeout(r, 700)); }
  }
  NET.busy = false; if (NET.ok !== 1) { netRender(true); return; }
  if (ch && (typeof ch.presence !== 'function' || typeof ch.onPeers !== 'function')) { ch = null; err = ''; }
  if (!ch && err && err !== 'not_permitted') { NET.note = 'The table could not be opened just now. Try again in a moment.'; netRender(true); return; }
  NET.named = !!ch; if (!ch) ch = netShare(NET.room);
  NET.chan = ch; NET.code = code; NET.hs = host ? 1 : 0; NET.ht = host ? Date.now() : 0; NET.ready = false; NET.pt = Date.now(); NET.prev = new Map(); NET.P = []; NET.go = null; NET.lastN = NET.seen && NET.seen.code === code ? NET.seen.n : 0; NET.quitN = 0; NET.M = null; NET.host = host ? NET.me : null; NET.hostT = performance.now();       // (a table come back to: the matches already seen there are not begun again)
  if (host) NET.cfg = { md: md === 'duel' ? 'duel' : 'team', df: [1, DIFFS[UI.diff] ? UI.diff : 1] };
  netListen(ch); netSay(); netLobbySay(); netHashSet(code); netRender(true);
}
function netShareNow() {
  const ch = NET.chan; for (const f of NET.off.splice(0)) try { f(); } catch (e) { /* gone already */ }
  try { netPut(ch, { T: null }); const p = ch.leave(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* gone already */ }
  NET.chan = netShare(NET.room); NET.named = false; NET.prev = new Map(); NET.hostT = performance.now();
  netListen(NET.chan); netSay(); netLobbySay();
}
function netTableLost() { if (NET.ok !== 1) return; netStop(NET.M ? 'The connection to the table was lost, and the match goes on without this device.' : 'The connection to the table was lost. You can join it again from the list.', 2); }
function netMine() {       // this page's own row at the table, as it stands now (what the room sends back says the same a moment later)
  const p = NET.P.find(q => q.me), h = UI.hero; if (!p) return;
  p.nm = netNick(NET.nick) || 'Player'; p.tm = NET.team; p.h = h; p.k = UI.skins[h] | 0; p.sp = UI.spell; p.r = roleIx(h); p.rd = NET.ready; p.pt = NET.pt; p.st = !!NET.M; p.hs = !!NET.hs;
  NET.P.sort((a, b) => a.pt - b.pt || (a.peer < b.peer ? -1 : 1));
}
function netSay() {       // this page's place at the table, and during a match its part in the turn exchange
  if (!NET.chan) return; const h = UI.hero, M = NET.M, now = performance.now(); if (!M) netMine();
  const T = { v: NETV, sim: SIM_NAME, c: NET.code, nm: NET.nick, tm: NET.team, h, k: UI.skins[h] | 0, sp: UI.spell, r: roleIx(h), rd: NET.ready ? 1 : 0, pt: NET.pt, st: M ? 1 : 0, ln: NET.lastN };
  if (NET.web) T.dl = NET.dlSaid = netLines();
  if (NET.hs) { T.hs = 1; T.ht = NET.ht; T.cfg = NET.cfg; if (NET.go && now - NET.goT < NET_GO_MS) T.go = NET.go; }
  if (M) { T.m = ncOut(M); const ch = chatOut(now); if (ch) T.ch = ch; } else if (NET.quitN) T.m = { n: NET.quitN, q: 1 };
  if (T.go && T.m && netBytes(JSON.stringify(T)) > NET_BYTES) delete T.go;       // (cannot be while a match starts: what a match says only grows with trouble, later)
  if (T.ch && netBytes(JSON.stringify(T)) > NET_BYTES) delete T.ch;       // (the turns come first)
  NET.pubT = now; netPut(NET.chan, { T });
}
function netTablePeers(peers) {
  if (!NET.chan) return; const now = performance.now(), P = [];
  for (const p of peers) {
    if (!p || p.kind === 'agent') continue; if (p.sameTab) NET.me = p.peer;
    const T = p.presence && p.presence.T; if (!T || typeof T !== 'object' || T.c !== NET.code || typeof p.peer !== 'string') continue;
    P.push({ peer: p.peer, me: !!p.sameTab, raw: p.presence, T, nm: netNick(T.nm) || 'Player', tm: T.tm === 1 ? 1 : 0, h: HEROES[T.h] ? T.h : HERO_KEYS[0], k: T.k | 0, sp: SPELLS[T.sp] ? T.sp : null, r: T.r | 0, rd: T.rd === 1, pt: +T.pt || 0,
      ok: T.v === NETV && T.sim === SIM_NAME, hs: T.hs === 1, ht: +T.ht || 0, st: T.st === 1, ln: Math.min(Math.max(T.ln | 0, 0), 1e9) });
  }
  P.sort((a, b) => a.pt - b.pt || (a.peer < b.peer ? -1 : 1)); NET.P = P;
  let host = null; for (const p of P) if (p.hs && p.ok && (!host || p.ht < host.ht || (p.ht === host.ht && p.peer < host.peer))) host = p;
  if (host) NET.hostT = now;
  if (host && !host.me && NET.hs) { NET.hs = 0; NET.go = null; netSay(); netLobbySay(); }       // two hosts: the earlier keeps the table
  NET.host = host ? host.peer : NET.hs ? NET.me : null;
  if (host && !host.me) { const c = host.T.cfg, df = c && Array.isArray(c.df) ? c.df : []; if (c && typeof c === 'object') { const md = c.md === 'duel' ? 'duel' : 'team'; if (md !== NET.cfg.md) { NET.cfg = { md, df: NET.cfg.df }; netLobbySay(); } NET.cfg = { md, df: [DIFFS[df[0]] ? df[0] : 1, DIFFS[df[1]] ? df[1] : 1] }; } }
  const go = host && host.T.go; if (go && typeof go === 'object' && (go.n | 0) > NET.lastN && !NET.M) netGo(go);
  const M = NET.M;
  if (M) { for (let s = 0; s < M.seats; s++) { if (s === M.me) continue; const p = P.find(q => q.peer === NET.seats[s]); if (p && NET.prev.get(p.peer) !== p.raw) { NET.prev.set(p.peer, p.raw); if (p.T.m) ncIn(M, s, p.T.m, now); if (p.T.ch) chatIn(s, p.T.ch); } } }
  else netRender();
}
/* the seats as the table has them: for each side, who sits (in the order they sat down), and whose hero is already taken on that side */
function netSeats() {
  const cap = NET.cfg.md === 'duel' ? 1 : 5, S = [[], []], out = [];
  for (const p of NET.P) { const side = S[p.tm]; p.clash = side.some(q => q.h === p.h); if (side.length < cap && p.ok) side.push(p); else { p.clash = false; out.push(p); } }
  return { S, out, cap };
}
function netCanStart() {
  const { S } = netSeats(), all = S[0].concat(S[1]);
  if (!all.length) return 'Nobody is seated.';
  const c = all.find(p => p.clash); if (c) return `${c.me ? 'You' : c.nm} must pick another hero: that one is taken on ${c.me ? 'your' : 'their'} side.`;
  const b = NET.P.find(p => p.st); if (b) return b.me ? 'Your last match is still open.' : `${b.nm} has not come back from the last match yet.`;
  const w = all.find(p => !p.rd && p.peer !== NET.host); if (w) return w.me ? 'Say that you are ready.' : `Waiting for ${w.nm} to be ready.`;
  return '';
}
const netLines = () => { let n = 0; for (const p of NET.P) if (!p.me && linkInfo(p.peer).open) n++; return n; };       // how many of the others at the table this page has a direct line to that is worth the name
/* quick turns (see part one) are for a table where everyone seated reaches everyone else by a short direct line: the host knows its own lines, and every page says how many it has */
function netQuick(all) {
  if (!NET.web || all.length < 2 || NET.P.length !== all.length) return false;       // (with someone at the table who is not seated, the count of lines says too little)
  for (const p of all) { if (p.me) { if (netLines() < all.length - 1) return false; continue; } const v = linkInfo(p.peer); if (!v.open || !(v.rtt > 0 && v.rtt <= 110) || (p.T.dl | 0) < all.length - 1) return false; }
  return true;
}
function netHostStart() {
  if (!NET.hs || NET.M || netCanStart()) return; const { S } = netSeats(), seats = [];
  for (const p of S[0].concat(S[1])) seats.push([p.peer, p.tm, p.h, Math.min(Math.max(p.k, 0), SKINS[p.h].length - 1), p.sp || HEROES[p.h].spell, p.r, p.nm]);
  let n = NET.lastN; for (const p of NET.P) if (p.ln > n) n = p.ln;       // (a number no page at the table has seen: whoever hosts)
  const go = NET.go = { n: n + 1, seed: ((Math.random() * 2147483646) | 0) + 1, md: NET.cfg.md, df: NET.cfg.df.slice(), ts: netQuick(S[0].concat(S[1])) ? 1 : 2, seats }; NET.goT = performance.now();
  setTimeout(() => { if (NET.go === go) { NET.go = null; if (NET.chan && !NET.M) netSay(); } }, NET_GO_MS + 200);
  netSay(); netGo(go);
}
/* ---------------- a match ---------------- */
function netGo(go) {
  const n = go.n | 0, duel = go.md === 'duel', seats = Array.isArray(go.seats) ? go.seats : [], humans = [], peers = [], cnt = [0, 0], taken = [{}, {}];
  if (n <= NET.lastN) return; NET.lastN = n; NET.seen = { code: NET.code, n };
  if (UI.state !== 'menu') { netSay(); return; }       // (something else is on this screen: the others will play on without this page)
  let ok = seats.length > 0 && seats.length <= (duel ? 2 : 10);
  for (const q of seats) {       // (what a host says is read like anything else: a start that makes no sense is no start)
    if (!ok) break; if (!Array.isArray(q) || typeof q[0] !== 'string' || q[0].length > 80 || !HEROES[q[2]] || peers.includes(q[0])) { ok = false; break; }
    const tm = q[1] === 1 ? 1 : 0, d = HEROES[q[2]]; if (++cnt[tm] > (duel ? 1 : 5) || taken[tm][q[2]]) { ok = false; break; } taken[tm][q[2]] = 1;
    peers.push(q[0]); humans.push({ team: tm, hero: q[2], skin: Math.min(Math.max(q[3] | 0, 0), SKINS[q[2]].length - 1), spell: SPELLS[q[4]] ? q[4] : d.spell, role: Math.min(Math.max(q[5] | 0, 0), (d.roles ? d.roles.length : 1) - 1), name: netNick(q[6]) || 'Player' });
  }
  if (!ok) { netSay(); return; }
  const me = peers.indexOf(NET.me);
  if (me < 0) { NET.note = 'A match has just started at this table. You can join the next one.'; netSay(); netRender(true); return; }
  const df = [DIFFS[go.df && go.df[0]] ? go.df[0] : 1, DIFFS[go.df && go.df[1]] ? go.df[1] : 1];
  newGame({ seed: (go.seed >>> 0) || 1, fx: true, det: true, mode: duel ? 'duel' : undefined, diff: df[1], diffs: df, humans, me });
  if (!G.player) { NET.note = 'This page could not be seated in the match.'; startDemo(); netSay(); netRender(true); return; }
  const mine = humans.filter(h => h.team === humans[me].team).length, foes = humans.length - mine;
  NET.seats = peers; NET.M = ncNew(n, humans.length, me, performance.now(), go.ts === 1 ? 1 : 2);       // (ts 1: a match of quick turns, the host having found everyone joined by direct lines)
  if (NET.web) { const M = NET.M; let ms = 0, all = peers.length > 1; for (const q of peers) if (q !== NET.me) { const v = linkInfo(q); if (!v.direct) all = false; if (v.ms > ms) ms = v.ms; } if (all && ms > 0) M.D = Math.min(NC_D0 * M.k, Math.max(NC_DMIN, Math.ceil((ms / 2 + 25) / M.turn) + 1)); }       // (with a direct line to everyone, how short the road is, is known already: no need to begin a turn further ahead than it takes)
  NET.abs = humans.map(() => 0); NET.prev = new Map(); NET.ready = false; NET.quitN = 0; NET.note = ''; NET.waitShown = false; NET.offT = 0; NET.say = { duel, df, n: humans.length, foes };
  UI.mode = 'net'; $('mp').hidden = true; enterPlay();
  banner(duel ? '1v1 · Mid lane' : foes ? 'Friends against friends' : 'Playing together', duel ? (foes ? 'Against ' + humans[1 - me].name : 'Break their turrets, then the crystal') : `${humans.length} ${humans.length === 1 ? 'player' : 'players'} · bots fill the other places`, '#f2c14e');
  hint((G.player.team === RED ? 'Your side starts at the top right this time: your own team is still the blue one on your screen. ' : '') + (duel ? 'One lane, two turrets and the crystal. ' : mine > 1 ? 'Your friends are on your side. ' : '') + 'Your hero answers the stick at once. Skills and attacks land a moment after the press, on every screen at the same time: that is what keeps everyone in the same match.', 11);
  snd('horn'); chatReset(); netSay(); netLobbySay();
}
function netEndSay() { const s = NET.M && NET.say; return !s ? '' : s.duel ? (s.foes ? '1v1 against a friend' : '1v1') : `${s.n} ${s.n === 1 ? 'player' : 'players'}, ${wdSay(s.df)}`; }
/* Where this player's own hero is about to be.
   In a networked match what a player does is done some turns later, on every machine at once, and a hero that only starts to walk a
   third of a second after the stick is pushed feels like wading. So this player's own hero is not drawn where the match has it now
   but where the match will have it once everything already sent has been done: from where it stands, walked through the frames of
   its own that are waiting their turn (the walls and turrets in the way as the sim has them), and then a little further on the
   stick as it is held this instant, which is the part not yet sent. The view, the camera and the aiming all take that place for
   the hero's. Nothing in the match is touched by it: it is a forecast, and where it turns out wrong (a stun, a slow, a wall of
   someone's making) the figure is drawn back to the truth over a few frames.
   It stops at a frame that carries a cast: the hero will stand there to cast, and what the cast does to it is not guessed at.
   AH.on: there is a forecast this frame (x, y: the place; face: the heading held; moving: it differs from where the hero stands). */
const AH = { on: false, x: 0, y: 0, face: 0, moving: false, u: { x: 0, y: 0, r: 0, id: 0 }, sampT: 0, hi: -1 };
function netAhead() {
  const M = NET.M, me = G.player; AH.on = false; AH.moving = false;
  if (!M || !me || !me.isPlayer || M.out || G.over || me.dead || me.leap || me.disp || me.dash || me.air || me.reviveT > 0) return AH;
  const now = performance.now(); if (M.hi !== AH.hi) { AH.hi = M.hi; AH.sampT = now; }       // (when this machine last put a frame of its own on the way)
  const w0 = _wx, w1 = _wy, g0 = _sgx, g1 = _sgy, U = AH.u, sp = me.ms * NC_STEP;       // the sim's own scratch values are put back as they were
  U.x = me.x; U.y = me.y; U.r = me.r; U.id = me.id;
  let lock = me.castLock > 0 ? me.castLock : 0, stun = me.stunT > 0 ? me.stunT : 0, root = me.rootT > 0 ? me.rootT : 0, mx = me.inp.mx, my = me.inp.my, hx = mx, hy = my, cast = false;
  const walk = k => {       // k of a step, on the heading held
    if (stun > 0) { stun -= NC_STEP * k; return; } if (lock > 0) { lock -= NC_STEP * k; return; }
    if ((mx || my) && root <= 0 && wallSlide(U.x, U.y, mx * sp * k, my * sp * k, 0.4)) { roundPosts(U, mx, my, sp * k); U.x = _wx; U.y = _wy; }
    if (root > 0) root -= NC_STEP * k;
  };
  let t = M.T; if (M.stepIn > 0) { for (let k = M.stepIn; k < M.steps; k++) walk(1); t++; }       // what is left of the turn being played
  for (; t <= M.hi && !cast; t++) {       // the frames of its own that wait their turn
    const f = t >= M.init ? ncGet(M, M.me, t) : null;
    if (f) { for (const a of f.acts) if (a[0] === A_CAST || a[0] === A_RECALL) cast = true; if (cast) break; if (f.mc === MOVE_NONE) mx = my = 0; else { const a = f.mc * (TAU / 65536); mx = fcos(a); my = fsin(a); } if (mx || my) { hx = mx; hy = my; } }
    for (let k = 0; k < M.steps; k++) walk(1);
  }
  if (!cast && !G.net.out.some(a => a[0] === A_CAST || a[0] === A_RECALL) && !UI.paused && !UI.ended) {       // and the stick as it is held now, for the part of a turn since the last frame went
    const I = G.input, l = hyp(I.mx, I.my);
    if (l > 0) { mx = I.mx / l; my = I.my / l; hx = mx; hy = my; walk(Math.min(M.steps, (now - AH.sampT) / 1000 / NC_STEP)); } else if (mx || my) { /* the stick was let go: nothing further */ }
  }
  _wx = w0; _wy = w1; _sgx = g0; _sgy = g1;
  AH.x = U.x; AH.y = U.y; AH.moving = Math.abs(U.x - me.x) + Math.abs(U.y - me.y) > 2; AH.face = hx || hy ? fatan2(hy, hx) : me.face; AH.on = true;
  return AH;
}
/* one frame of a networked match, in place of simulate(): the turns that can be played are played, and this page's part is published */
function netFrame(dt) {
  const M = NET.M, now = performance.now(); if (!M) return;
  for (let s = 0; s < M.seats; s++) { if (s === M.me || !M.here[s]) continue; if (NET.P.some(p => p.peer === NET.seats[s])) NET.abs[s] = 0; else if (!NET.abs[s]) NET.abs[s] = now; else if (now - NET.abs[s] > NET_AWAY) M.here[s] = false; }       // a page that has been gone from the table for some seconds has gone
  const up = !NET.chan || !NET.chan.connected || NET.chan.connected(); if (up) NET.offT = 0; else { if (!NET.offT) NET.offT = now; NET.abs.fill(0); }
  ncConn(M, up, now); ncTick(M, dt, now); recTick(dt);
  if (NET.web && NET.named && M.waitMs > 200 && !M.out) linkAsk('t-' + NET.code);       // (kept waiting by another page: it is asked, by every road, for what it should have said)
  const since = now - NET.pubT; if ((M.fresh && since >= 10) || (M.dirty && since >= 110) || since >= 400) netSay();       // a new frame of its own goes out at once (the room itself sends at most thirty times a second); the rest (what has arrived, a sign of life) can wait a little
  const off = NET.offT > 0 && now - NET.offT > 2000, w = M.waitMs > 700 ? ncWaitingFor(M) : -1, show = (w >= 0 || off) && !G.over && !M.out, key = off ? -2 : w;
  if (show !== NET.waitShown || (show && UI.last.nw !== key)) { NET.waitShown = show; UI.last.nw = key; const el = $('netWait'); el.hidden = !show; if (show) { const h = G.humans[w]; el.textContent = off ? 'Reconnecting…' : w === M.me || !h ? 'Waiting for the others…' : 'Waiting for ' + h.name + '…'; } }
  if (now - NET.pingT > 1000) netPing(now);
  chatTick(now);
  if (M.bad) netStop(`The match went out of step between the players at ${fmtTime(M.bad.turn * M.turn / 1000)} and could not go on. That should not happen: if it does again, everyone reloading the page is the first thing to try.`);
  else if (M.out) netStop(M.cut ? 'This device was without a connection for too long, and a bot has taken your hero.' : M.lost ? 'This device fell too far behind the match, and a bot has taken your hero.' : 'The others lost touch with this device for too long, and a bot has taken your hero.');
}
/* how the other players of the match are heard, said small on the HUD: the slowest of them, there and back (as the turn exchange
   itself has measured it, or until it has, as the link reckons), and on the open web whether that is by a direct line */
function netPing(now) {
  const M = NET.M, el = $('netPing'); NET.pingT = now; let ms = 0, n = 0, direct = NET.web, sure = true;
  if (M) for (let s = 0; s < M.seats; s++) {
    if (s === M.me || M.gone[s] || !M.here[s]) continue; n++; let v = M.lat[s] > 0 ? M.lat[s] * 2 + 10 : 0;
    if (NET.web) { const q = linkInfo(NET.seats[s]); if (!q.direct) direct = false; if (!v) { v = q.ms; if (!q.direct) sure = false; } }
    if (v > ms) ms = v;
  }
  const show = n > 0 && ms > 0, key = show ? (direct ? 'd' : 'r') + (sure ? '' : '~') + Math.round(ms / 5) : ''; if (key === UI.last.np) return; UI.last.np = key; el.hidden = !show; if (!show) return;
  el.className = 'plate ' + (ms <= 110 ? 'g' : ms <= 240 ? 'y' : 'r'); el.innerHTML = `<i></i>${sure ? '' : '~'}${Math.round(ms)}<small>ms${NET.web && !direct ? ' · relay' : ''}</small>`;
  el.setAttribute('aria-label', (NET.web ? (direct ? 'Direct lines to the other players' : 'Through the relay') + ', about ' : 'About ') + Math.round(ms) + ' milliseconds there and back'); NET.via = { direct, ms };
}
/* the match is over for this page (it ended, was left, or cannot go on): back to the menu, with the table open if it is still held */
function netStop(msg, gone) {
  const M = NET.M; NET.M = null; $('netWait').hidden = true; NET.waitShown = false; $('netPing').hidden = true; UI.last.np = ''; chatReset(); if (M && !G.over) NET.quitN = M.n; NET.ready = false; NET.note = msg || '';
  if (gone) netOff(gone === 2); else netSay();       // (2: the table's room has ended by itself, there is nothing left to say in it)
  netLobbySay(); if (UI.state === 'play') toMenu();
  if (msg || (NET.ok === 1 && NET.chan)) { $('mp').hidden = false; document.querySelectorAll('#mp .x').forEach(b => b.innerHTML = icon('x')); netRender(true); netLobbySay(); }
}
function netLeaveMatch() { const M = NET.M; if (!M) return; if (!G.over) NET.quitN = M.n; NET.M = null; $('netWait').hidden = true; NET.waitShown = false; $('netPing').hidden = true; UI.last.np = ''; chatReset(); NET.ready = false; netSay(); netLobbySay(); }       // (what it says from here on: that it has left that match)
function netOff(dead) {
  for (const f of NET.off.splice(0)) try { f(); } catch (e) { /* gone already */ }
  const ch = NET.chan; NET.chan = null; NET.code = null; NET.P = []; NET.hs = 0; NET.go = null; NET.ready = false; NET.host = null; NET.M = null; NET.quitN = 0; netHashSet('');
  if (ch && !(dead && !ch.shared)) try { netPut(ch, { T: null }); if (!ch.shared) { const p = ch.leave(); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* gone already */ }
}
function netAway() { if (NET.chan && !NET.M) { netOff(); NET.note = ''; netLobbySay(); } if (!NET.M) $('mp').hidden = true; }       // something else is started on this page: its seat at a table is given up
function netLeaveTable() { if (NET.M) netLeaveMatch(); netOff(); NET.note = ''; netLobbySay(); netRender(true); }
function netClose() { if (NET.chan && !NET.M) netOff(); NET.note = ''; $('mp').hidden = true; netLobbySay(); }
function netOpen(quiet) {
  if (!quiet) { auInit(); snd('ui'); } if (!NET.nick) NET.nick = netNick(UI.nick) || 'Player ' + (10 + ((Math.random() * 90) | 0));
  $('duel').hidden = true; $('mp').hidden = false; document.querySelectorAll('#mp .x').forEach(b => b.innerHTML = icon('x'));
  if (NET.ok === 0) netConnect(); else netLobbySay(); netRender(true);
}
/* ---------------- the sheet ---------------- */
const NET_MD = { team: '5v5', duel: '1v1 · Mid lane' };
function netRender(force) {
  const el = $('mpBody'); if (!el || $('mp').hidden) return;
  let h = ''; const note = NET.note ? `<p class="mpnote">${esc(NET.note)}</p>` : '';
  const site = NET_SITE ? `<a href="${esc(NET_SITE)}" target="_blank" rel="noopener">${esc(NET_SITE.replace(/^https:\/\//, '').replace(/\/$/, ''))}</a>` : '';
  if (NET.ok === -1) h = note + (NET.web
    ? `<p class="mpbig">The other players could not be reached.</p><p class="meta">Playing together goes through a relay on the internet, and this device could not reach one just now. Check the connection, then try again. Some school and office networks block it: mobile data or another Wi-Fi usually works.</p><div class="row"><button class="btn go" data-retry>Try again</button></div>`
    : `<p class="mpbig">This view could not be connected to other players.</p><p class="meta">Playing together here needs everyone to be signed in to Claude and to have this page shared with them directly, by name or by email. Opening it from a public link does not connect people to one another.${site ? ' On the open page nobody needs to sign in: ' + site + '.' : ' If that is how you opened it, ask whoever owns the page to share it with you by name, then open it again.'}</p>`)
    + `<p class="meta">Everything else works here as always: a match against bots, the 1v1 against a bot, practice, replays.</p>`;
  else if (NET.ok === 0 || NET.busy) h = `<p class="mpbig">Connecting…</p>`;
  else if (!NET.chan) {
    const T = NET.tables, oth = NET.here - 1;
    const down = NET.down ? `<p class="mpnote">The connection has dropped. Trying to get it back…</p>` : '';
    h = `<div class="mpme"><label for="mpNick">Your name</label><input id="mpNick" maxlength="14" value="${esc(NET.nick)}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"></div>` + note + down
      + `<div><p class="eyebrow">Tables open now</p><div class="mptables">${T.length ? T.map(t => `<div class="mpt"><div><b>${esc(t.host)}’s table</b><span>${NET_MD[t.md]} · ${t.n} ${t.n === 1 ? 'player' : 'players'}${t.st ? ' · playing now' : ''}${t.ok ? '' : ' · another version of the page'}</span></div><button class="btn sm go" data-join="${t.code}"${t.ok ? '' : ' disabled'}>Join</button></div>`).join('') : `<p class="meta">${NET.look ? 'Looking for open tables…' : `None yet. Host one, and it shows here for everyone who has this page open and has pressed Friends (${oth <= 0 ? 'nobody else has the page open right now' : oth === 1 ? 'one other person has the page open right now' : oth + ' other people have the page open right now'}).`}</p>`}</div></div>`
      + (NET.web && T.some(t => !t.ok) ? `<p class="mpnote">A table here is on another copy of the page than yours: one of the two is older. <button class="btn sm" data-fresh>Get the newest page</button></p>` : '')
      + `<div class="row"><button class="btn go" data-host="team">Host a 5v5</button><button class="btn" data-host="duel">Host a 1v1</button></div>`
      + `<p class="meta">In a 5v5 each player picks a side: all on one side is your team against bots, on both sides is friends against friends, and bots fill whatever places are left. A 1v1 is two players on the middle lane. ${NET.web ? 'Anyone who opens this page and presses Friends sees the open tables. To bring your friends straight to yours, send them the invite link you get at the table.' : 'Your friends need this page shared with them by name and to be signed in; a public link is not enough.' + (site ? ' On the open page nobody needs to sign in: ' + site + '.' : '')}</p>`
      + (NET.web ? `<div class="mpdir"><button class="chip plain" data-direct aria-pressed="${UI.direct !== false}">Direct lines: ${UI.direct !== false ? 'on' : 'off'}</button><span class="meta">Players at one table connect their devices straight to each other where they can, which is what makes a match quick. It lets those devices see each other’s network address. Off: everything goes through the relay, slower.</span></div>` : '');
  } else {
    const { S, out } = netSeats(), host = NET.P.find(p => p.peer === NET.host), duel = NET.cfg.md === 'duel', why = netCanStart(), hs = !!NET.hs;
    const lv = t => hs ? `<div class="mplv" role="group" aria-label="${t ? 'Red' : 'Blue'} bots">${DIFFS.map((d, i) => `<button class="chip plain" data-df="${t}" data-d="${i}" aria-pressed="${NET.cfg.df[t] === i}">${d.name}</button>`).join('')}</div>` : `<small>${DIFFS[NET.cfg.df[t]].name}</small>`;
    const via = p => { if (!NET.web || p.me) return ''; const v = linkInfo(p.peer), ms = v.ms > 0 ? ' ' + Math.max(10, Math.round(v.ms / 10) * 10) + ' ms' : ''; return v.direct ? ' · direct' + ms : ' · relay' + (ms ? ' ~' + ms.trim() : ''); };
    const seat = p => `<div class="mps${p.me ? ' me' : ''}${p.rd ? ' rd' : ''}${p.clash ? ' bad' : ''}"><img src="${portrait(p.h, Math.min(Math.max(p.k, 0), SKINS[p.h].length - 1))}" alt=""><div><b>${esc(netName(p))}${p.peer === NET.host ? '<em>Host</em>' : ''}</b><span>${esc(HEROES[p.h].name)}${HEROES[p.h].roles ? ' · ' + HEROES[p.h].roles[Math.min(Math.max(p.r, 0), HEROES[p.h].roles.length - 1)].cls : ''}${p.clash ? ' · taken on this side' : ''}${via(p)}</span></div><i>${p.st ? 'Playing' : p.rd && p.peer !== NET.host ? 'Ready' : ''}</i></div>`;
    const bots = t => duel ? (S[t].length ? '' : S[1 - t].length ? `<div class="mps bot"><div><b>A bot</b><span>plays this side</span></div>${lv(t)}</div>` : `<div class="mps bot"><div><b>Empty</b></div></div>`) : `<div class="mps bot"><div><b>${5 - S[t].length} ${5 - S[t].length === 1 ? 'bot' : 'bots'}</b></div>${S[t].length < 5 ? lv(t) : ''}</div>`;
    const side = (t, nm) => `<div class="mptm ${t ? 'e' : 'a'}"><h3>${nm}</h3>${S[t].map(seat).join('')}${bots(t)}</div>`;
    h = `<div class="mphead"><div><b>${host ? esc(host.me ? 'Your table' : host.nm + '’s table') : 'Table'}</b><span>${NET_MD[NET.cfg.md]} · ${NET.web ? 'send your friends the link below' : 'your friends find it under Friends'}</span></div>${hs ? `<div class="chips" role="group" aria-label="Kind of match">${['team', 'duel'].map(k => `<button class="chip plain" data-md="${k}" aria-pressed="${NET.cfg.md === k}">${k === 'team' ? '5v5' : '1v1'}</button>`).join('')}</div>` : ''}</div>` + note + (NET.down ? `<p class="mpnote">The connection has dropped. Trying to get it back…</p>` : '')
      + (NET.web ? `<div class="mplink"><span>Invite link</span><code id="mpLink">${esc(netLink(NET.code))}</code><button class="btn sm" data-copy>${NET.copied ? 'Copied' : 'Copy'}</button>${typeof navigator.share === 'function' ? '<button class="btn sm" data-share>Share</button>' : ''}</div>` : '')
      + `<div class="mpteams">${side(0, 'Blue')}${side(1, 'Red')}</div>`
      + (out.length ? `<p class="meta">Not seated: ${out.map(p => esc(netName(p)) + (p.ok ? '' : ' (another version of the page)')).join(', ')}. ${duel ? 'A 1v1 has one seat a side.' : 'A side has five seats.'}</p>` : '')
      + (NET.web && NET.P.some(p => !p.ok) ? `<p class="mpnote">Not everyone here has the same copy of the page, and only the same copies can play together. Whoever has the older one should get the newest. <button class="btn sm" data-fresh>Get the newest page</button></p>` : '')
      + `<div class="row mpgo"><div class="chips" role="group" aria-label="Your side">${[0, 1].map(t => `<button class="chip plain ${t ? 'e' : 'a'}" data-tm="${t}" aria-pressed="${NET.team === t}">${t ? 'Red' : 'Blue'}</button>`).join('')}</div>${hs ? `<button class="btn go" data-start${why ? ' disabled' : ''}>Start the match</button>` : `<button class="btn${NET.ready ? ' on' : ' go'}" data-ready aria-pressed="${NET.ready}">${NET.ready ? 'Ready ✓' : 'I am ready'}</button>`}<span class="meta" role="status">${esc(hs ? (why || (NET.P.length > 1 ? 'Everyone is ready.' : 'Start alone against bots, or wait for your friends.')) : why ? (host ? host.nm : 'The host') + ' starts the match when everyone is ready. ' + why : 'Everyone is ready: ' + (host ? host.nm : 'the host') + ' can start the match.')}</span></div>`
      + `<div class="mpmine"><p class="eyebrow">Your hero</p><div class="pheroes mph">${HERO_KEYS.map(k => `<button data-hero="${k}" aria-pressed="${k === UI.hero}"${S[NET.team].some(p => !p.me && p.h === k) ? ' class="tk"' : ''}><img src="${portrait(k, UI.skins[k] | 0)}" alt="">${esc(HEROES[k].name)}</button>`).join('')}</div>`
      + (HEROES[UI.hero].roles ? `<div class="roles" role="group" aria-label="Role to play ${HEROES[UI.hero].name} in"><span>Play as</span>${HEROES[UI.hero].roles.map((r, i) => `<button class="chip plain" data-role="${i}" aria-pressed="${i === roleIx(UI.hero)}">${r.cls}</button>`).join('')}</div>` : '')
      + `<div class="mpopt"><div class="chips" role="group" aria-label="Skin">${SKINS[UI.hero].map((k, i) => `<button class="chip plain" data-skin="${i}" aria-pressed="${i === (UI.skins[UI.hero] | 0)}">${esc(k.name)}</button>`).join('')}</div><div class="chips" role="group" aria-label="Battle spell">${Object.keys(SPELLS).map(k => `<button class="chip plain" data-spell="${k}" aria-pressed="${k === UI.spell}">${esc(SPELLS[k].name)}</button>`).join('')}</div></div></div>`
      + `<div class="row"><button class="btn" data-leave>Leave the table</button><span class="meta">Closing this sheet leaves the table too.</span></div>`;
  }
  if (NET.web && NET.ok === 1) {       // how this page is connected, in a line; and for whoever needs to find out why it misbehaves, the last things that happened
    const q = linkStatus(), up = q.relays.filter(r => r.up), ms = up.filter(r => r.ms > 0).map(r => r.ms + ' ms').join(', ');
    h += `<div class="mpconn"><span class="meta">Relays reached: ${up.length} of ${q.relays.length}${ms ? ' (' + ms + ')' : ''}${NET.chan && q.lines.length ? ' · direct lines: ' + q.lines.filter(l => l.state === 'direct').length + ' of ' + q.lines.length : ''}</span><button class="chip plain" data-diag aria-pressed="${!!NET.diag}">Details</button></div>`
      + (NET.diag ? `<pre class="mplog">${esc(`page ${q.me.slice(1, 5)} · ${SIM_NAME} · v${NETV} · direct lines ${q.direct ? 'on' : 'off'}${q.rtc ? '' : ' (this browser has none)'}\nrelays ${q.relays.map((r, i) => (i + 1) + (r.spare ? ' spare' : '') + ': ' + (r.up ? 'up' + (r.ms ? ' ' + r.ms + ' ms' : '') : 'down')).join(' · ')}\n${q.lines.map(l => 'line to ' + l.peer.slice(1, 5) + ': ' + l.state + (l.ms ? ' ' + l.ms + ' ms' : '') + (l.tries ? ' (tries ' + l.tries + ')' : '')).join('\n')}${q.lines.length ? '\n' : ''}sent ${q.stat.rout} by relay, ${q.stat.dout} direct · got ${q.stat.rin} by relay, ${q.stat.din} direct · dropped ${q.stat.skip}\n${q.log.slice(-22).join('\n')}`)}</pre>` : '');
  }
  if (!force && h === NET.sig) return; NET.sig = h;
  const f = document.activeElement, typing = f && f.id === 'mpNick', pos = typing ? f.selectionStart : 0, sc = el.scrollTop;
  if (typing && !force) return;       // (the list under a name being typed is redrawn when the typing is done)
  el.innerHTML = h; el.scrollTop = sc;
  if (typing) { const n = $('mpNick'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* fine */ } } }
}
function bindNet() {
  $('btnFriends').addEventListener('click', () => netOpen());
  $('btnDuel').addEventListener('click', () => { auInit(); snd('ui'); duelRender(); $('duel').hidden = false; document.querySelectorAll('#duel .x').forEach(b => b.innerHTML = icon('x')); });
  $('mpX').addEventListener('click', netClose);
  window.addEventListener('hashchange', netFromLink); bindChat();
  const el = $('mpBody');
  el.addEventListener('input', e => { if (e.target.id === 'mpNick') { NET.nick = netNick(e.target.value); UI.nick = NET.nick; prefs(true); netLobbySay(); } });
  el.addEventListener('change', e => { if (e.target.id === 'mpNick') { e.target.value = NET.nick = netNick(e.target.value) || 'Player'; UI.nick = NET.nick; prefs(true); netLobbySay(); NET.sig = ''; } });
  el.addEventListener('focusout', e => { if (e.target.id === 'mpNick') setTimeout(() => netRender(true), 0); });
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return; const d = b.dataset;
    if (d.host) { snd('ui'); netSit(netCode(), true, d.host); }
    else if (d.join) { snd('ui'); netSit(d.join, false); }
    else if (d.leave != null) { snd('ui'); netLeaveTable(); }
    else if (d.tm) { NET.team = +d.tm ? 1 : 0; NET.pt = Date.now(); NET.ready = false; snd('ui'); netSay(); netRender(true); }
    else if (d.hero) { if (HEROES[d.hero]) { UI.hero = d.hero; UI.spell = HEROES[UI.hero].spell; NET.ready = false; snd('ui'); syncMenu(); netSay(); netRender(true); } }
    else if (d.role) { UI.roles[UI.hero] = +d.role; NET.ready = false; snd('ui'); syncMenu(); netSay(); netRender(true); }
    else if (d.skin) { if (SKINS[UI.hero][+d.skin]) { UI.skins[UI.hero] = +d.skin; const im = document.querySelector(`.hc[data-h="${UI.hero}"] img`); if (im) im.src = portrait(UI.hero, UI.skins[UI.hero]); snd('ui'); syncMenu(); netSay(); netRender(true); } }
    else if (d.spell) { if (SPELLS[d.spell]) { UI.spell = d.spell; snd('ui'); syncMenu(); netSay(); netRender(true); } }
    else if (d.ready != null) { netMine(); netSeats(); const me = NET.P.find(p => p.me); if (me && me.clash && !NET.ready) { snd('deny'); return; } NET.ready = !NET.ready; snd('ui'); netSay(); netRender(true); }
    else if (d.md && NET.hs) { NET.cfg = { md: d.md === 'duel' ? 'duel' : 'team', df: NET.cfg.df }; snd('ui'); netSay(); netLobbySay(); netRender(true); }
    else if (d.df && NET.hs) { const df = NET.cfg.df.slice(); df[+d.df ? 1 : 0] = DIFFS[+d.d] ? +d.d : 1; NET.cfg = { md: NET.cfg.md, df }; snd('ui'); netSay(); netRender(true); }
    else if (d.start != null && NET.hs) { if (netCanStart()) snd('deny'); else netHostStart(); }
    else if (d.diag != null) { NET.diag = !NET.diag; snd('ui'); netRender(true); }
    else if (d.fresh != null) { try { location.replace(location.href.split('#')[0].split('?')[0] + '?r=' + Date.now().toString(36) + (location.hash || '')); } catch (e1) { location.reload(); } }       // (asked for under a new name, so that no stale copy is handed back; the table's link is kept)
    else if (d.retry != null) { snd('ui'); if (NET.ok === -1) { NET.ok = 0; netConnect(); netRender(true); } }
    else if (d.direct != null) { UI.direct = UI.direct === false; snd('ui'); prefs(true); linkDirect(UI.direct); netRender(true); }
    else if (d.copy != null && NET.code) {       // the invite link, onto the clipboard (where that is refused, it is selected so that it can be copied by hand)
      const u = netLink(NET.code), done = () => { NET.copied = true; netRender(true); setTimeout(() => { NET.copied = false; netRender(true); }, 1600); };
      const pick = () => { try { const r = document.createRange(); r.selectNodeContents($('mpLink')); const g = getSelection(); g.removeAllRanges(); g.addRange(r); } catch (e2) { /* it can still be read */ } };
      snd('ui'); try { navigator.clipboard.writeText(u).then(done, pick); } catch (e1) { pick(); }
    }
    else if (d.share != null && NET.code) { snd('ui'); try { const pr = navigator.share({ title: 'Shardfall Arena', text: 'Join my table in Shardfall Arena', url: netLink(NET.code) }); if (pr && pr.catch) pr.catch(() => {}); } catch (e1) { /* not shared */ } }
  });
  // the 1v1 against a bot
  $('duelFoe').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.duelFoe = b.dataset.foe || null; snd('ui'); duelRender(); });
  $('duelLv').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; UI.diff = +b.dataset.d; snd('ui'); syncMenu(); duelRender(); });
  $('btnDuelGo').addEventListener('click', () => { auInit(); $('duel').hidden = true; startDuel(); });
  $('btnDuelFriend').addEventListener('click', () => netOpen());
}
function duelRender() {
  const d = HEROES[UI.hero];
  $('duelYou').innerHTML = `<img src="${portrait(UI.hero, UI.skins[UI.hero] | 0)}" alt=""><div><b>${esc(d.name)}</b><span>${esc(d.roles ? d.roles[roleIx(UI.hero)].cls : d.cls)} · ${esc(SPELLS[UI.spell].name)} · chosen on the menu</span></div>`;
  $('duelFoe').innerHTML = `<button data-foe="" aria-pressed="${!UI.duelFoe}"><span class="any">?</span>Any</button>` + HERO_KEYS.map(k => `<button data-foe="${k}" aria-pressed="${k === UI.duelFoe}"><img src="${portrait(k, 0)}" alt="">${esc(HEROES[k].name)}</button>`).join('');
  $('duelLv').innerHTML = DIFFS.map((q, i) => `<button class="chip plain" data-d="${i}" aria-pressed="${i === UI.diff}">${q.name}</button>`).join('');
}
function startDuel() {
  UI.mode = 'duel';
  newGame({ seed: (Math.random() * 1e9) | 0, fx: true, diff: UI.diff, mode: 'duel', rec: true, player: { hero: UI.hero, spell: UI.spell, skin: UI.skins[UI.hero] | 0, role: roleIx(UI.hero) }, foe: UI.duelFoe && HEROES[UI.duelFoe] ? { hero: UI.duelFoe, role: 0 } : undefined });
  enterPlay(); const foe = G.heroes.find(h => h.team !== G.player.team);
  banner('1v1 · Mid lane', 'Against ' + foe.name + ' · ' + DIFFS[G.diff].name, '#f2c14e');
  hint('One lane, one opponent. Break their two turrets, then the crystal. There is no jungle and there are no great beasts here.', 10); snd('horn');
}
