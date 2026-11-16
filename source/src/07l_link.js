/* ============================================================
   Playing together, part three: the room, where the page is not inside Claude.

   Inside Claude the platform gives the page a room (see part two). Anywhere else on the web the page keeps one itself, and what it
   builds here is the same thing the rest of the game already talks to: rooms, in each of which every page keeps one object that the
   others see. linkOpen() gives what claude.use('room') gives. It is carried two ways.

   Through relays. Public MQTT brokers, each reached over a WebSocket: every page says its object on topics of its own, whole on
   ns/r/<room>/<page>/s and the changes in between on .../d. It listens to everyone's whole objects (ns/r/<room>/+/s), and to the
   changes of each page it knows to be at its table, one by one: never to its own, which a relay would otherwise send straight back
   to it fifteen times a second. Two relays are used at the same time and whichever copy arrives first counts, so one of them being
   slow, or away, is not felt; a third is called in when one of the two cannot be reached. Nothing is kept on a relay: a page that
   arrives asks ('G'), and those there answer with their object.

   Directly. Pages at the same table open a WebRTC data channel to each other (the relays carry the handshake), unordered and
   without waiting for what is lost, which is the quickest road between two devices there is. Once it is open, what they say goes
   straight across; the relays then carry only a sign of life, and take everything again the moment a direct line goes quiet. The
   lower of two page names calls, the higher answers.

   What a page says is either its whole object ('F', or 'G' when it also asks for the others'), or only what changed one level down
   since the last whole one ('D'), or that it has left ('B'). Each carries a number that only grows: a page takes what is newer than
   what it has, from whichever road brought it, and ignores the rest. A whole object goes out every second or so by every road, so
   nothing that gets lost stays lost; a page not heard of for a few seconds has gone.

   What arrives is read, never trusted: it is JSON or it is nothing, a name is a name of the expected shape, and a change is applied
   only to the object it was made from.
   ============================================================ */
const LINK_CFG = (() => {
  const o = (typeof window !== 'undefined' && window.SHARDFALL_LINK) || {};
  return { relays: o.relays || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'], spare: o.spare || ['wss://test.mosquitto.org:8081/mqtt'],
    ice: o.ice || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }], ns: o.ns || 'shardfall/a2/' };
})();
const LK_ID = /^p[a-z0-9]{6,20}$/, LK_ROOM = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const LK_HB = [3000, 1200], LK_TTL = [10000, 5000];       // a whole object at least this often, and a page gone after this long unheard: [the lobby, a table]
const LK_PING = 4000, LK_PONG = 4000, LK_DEAD = 9000;       // a relay is asked whether it is there this often; it is given up when the answer takes this long, or when nothing at all has come from it for this long
const LK_DPING = 200, LK_DQUIET = 500, LK_DOUBT = 2500, LK_DTRY = 12000;       // a direct line: asked this often · quiet after this long without a word (the relays take over) · and for this long after its far end asked through a relay for what it should have had · given up if not open after this long
const LK_BUF = 65536, LK_DBUF = 32768;       // bytes waiting to leave beyond which what this page says is dropped rather than queued (the next word says it all again)
const LK = { on: false, me: '', ver: 0, conns: [], rooms: new Map(), links: new Map(), timer: 0, tickT: 0, t0: 0, due: false, wasUp: false, spareOn: false, direct: true, rtc: false, wake: null, enc: null, dec: null, onNote: null,
  stat: { rout: 0, rin: 0, dout: 0, din: 0, skip: 0, full: 0, delta: 0 }, log: [] };
function lkLog(what) { LK.log.push(Math.round(performance.now()) + ' ' + what); if (LK.log.length > 60) LK.log.shift(); }       // the last things that happened to the connection, for whoever has to find out why it misbehaved

/* ---------------- MQTT 3.1.1 over a WebSocket, as much of it as this needs ---------------- */
function mqStr(s) { const b = LK.enc.encode(s), o = new Uint8Array(b.length + 2); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function mqPkt(h, parts) {
  let n = 0; for (const p of parts) n += p.length; const len = []; let x = n;
  do { let d = x % 128; x = (x - d) / 128; if (x > 0) d |= 128; len.push(d); } while (x > 0);
  const o = new Uint8Array(1 + len.length + n); o[0] = h; o.set(len, 1); let i = 1 + len.length; for (const p of parts) { o.set(p, i); i += p.length; } return o;
}
function mqOpen(C) {
  if (C.st || !LK.on) return; C.st = 1; C.buf = null; let ws;
  try { ws = new WebSocket(C.url, 'mqtt'); } catch (e) { C.st = 0; C.tryT = performance.now() + C.wait; C.wait = Math.min(C.wait * 2, 8000); return; }
  C.ws = ws; ws.binaryType = 'arraybuffer';
  ws.onopen = () => { if (C.ws !== ws) return; C.t0 = performance.now(); mqSend(C, mqPkt(0x10, [mqStr('MQTT'), new Uint8Array([4, 2, 0, 30]), mqStr('sf' + LK.me + C.ix)]), true); };       // CONNECT: a clean session, a sign of life every 30s at least
  ws.onmessage = e => { if (C.ws !== ws) return; C.inT = performance.now(); if (e.data instanceof ArrayBuffer) mqFeed(C, new Uint8Array(e.data)); };
  ws.onclose = e => { if (C.ws === ws) mqDown(C, 'closed ' + (e && e.code || '')); }; ws.onerror = () => { if (C.ws === ws) mqDown(C, 'error'); };
  C.openT = setTimeout(() => { if (C.ws === ws && C.st === 1) mqDown(C, 'no answer'); }, 8000);
}
function mqDown(C, why) {
  const was = C.st, ws = C.ws; lkLog('relay ' + C.ix + ' down' + (was === 2 ? '' : ' (was not up)') + ': ' + (why || '')); clearTimeout(C.openT); C.ws = null; C.st = 0; C.buf = null; C.subs.clear(); C.pingAt = 0;
  if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch (e) { /* closed already */ } }
  if (LK.on) { C.tryT = performance.now() + C.wait; C.wait = Math.min(C.wait * 2, 8000); }
  if (was === 2) lkNote();
}
function mqSend(C, pkt, force) {
  const ws = C.ws; if (!ws || ws.readyState !== 1) return false;
  if (!force && ws.bufferedAmount > LK_BUF) { LK.stat.skip++; return false; }
  try { ws.send(pkt); return true; } catch (e) { return false; }
}
function mqFeed(C, chunk) {       // what comes in is cut into packets wherever the socket happened to cut it
  let b = chunk; if (C.buf) { b = new Uint8Array(C.buf.length + chunk.length); b.set(C.buf); b.set(chunk, C.buf.length); C.buf = null; }
  let i = 0;
  while (b.length - i >= 2) {
    let rl = 0, m = 1, j = i + 1, done = false;
    while (j < b.length && j < i + 5) { const d = b[j++]; rl += (d & 127) * m; m *= 128; if (!(d & 128)) { done = true; break; } }
    if (!done) { if (j >= i + 5) { mqDown(C, 'garbled'); return; } break; }
    if (rl > 200000) { mqDown(C, 'garbled'); return; }       // (nothing that long is ever sent here: the stream is not what it should be)
    if (b.length - j < rl) break;
    mqPacket(C, b[i], b.subarray(j, j + rl)); if (!C.ws) return; i = j + rl;
  }
  if (i < b.length) C.buf = b.slice(i);
}
function mqPacket(C, h, p) {
  const t = h >> 4;
  if (t === 2) { if (C.st !== 1 || p.length < 2 || p[1] !== 0) { mqDown(C, C.st === 1 ? 'refused ' + p[1] : 'garbled'); return; } clearTimeout(C.openT); C.st = 2; C.wait = 500; C.pingT = performance.now(); C.rs = [C.pingT - C.t0]; C.rtt = C.rs[0]; lkConnUp(C); }       // CONNACK (asked and answered: one trip there and back)
  else if (t === 3) {       // PUBLISH
    if (p.length < 2) return; const tl = (p[0] << 8) | p[1], off = 2 + tl + ((h >> 1) & 3 ? 2 : 0); if (off > p.length || p.length - off > 60000) return;
    lkRelayIn(LK.dec.decode(p.subarray(2, 2 + tl)), LK.dec.decode(p.subarray(off)));
  } else if (t === 13) { if (C.pingAt) { C.rs.push(performance.now() - C.pingAt); if (C.rs.length > 4) C.rs.shift(); C.rtt = Math.min.apply(null, C.rs); C.pingAt = 0; } }       // PINGRESP (the quickest of the last few: an answer can be held up behind other things on the same socket)
}
function mqSub(C, topic, off) {
  if (C.st !== 2 || (off ? !C.subs.delete(topic) : C.subs.has(topic))) return; if (!off) C.subs.add(topic); C.pid = (C.pid % 65535) + 1;
  const id = new Uint8Array([C.pid >> 8, C.pid & 255]); mqSend(C, off ? mqPkt(0xa2, [id, mqStr(topic)]) : mqPkt(0x82, [id, mqStr(topic), new Uint8Array([0])]), true);
}
function mqPub(C, topic, text, force) { if (C.st !== 2 || !mqSend(C, mqPkt(0x30, [mqStr(topic), LK.enc.encode(text)]), force)) return false; LK.stat.rout++; return true; }

/* ---------------- the relays ---------------- */
const lkUp = () => LK.conns.some(C => C.st === 2);
function lkConnected() { if (lkUp()) return true; const now = performance.now(); for (const L of LK.links.values()) if (L.open && now - L.rxT < 3000) return true; return false; }
function lkNote() { if (LK.onNote) try { LK.onNote(); } catch (e) { console.error(e); } }
function lkConnUp(C) {       // a relay has answered: what this page listens to is asked of it, and what this page is saying is said there
  lkLog('relay ' + C.ix + ' up');
  mqSub(C, LINK_CFG.ns + 's/' + LK.me);
  for (const R of LK.rooms.values()) { mqSub(C, R.sub); if (R.table) for (const P of R.peers.values()) mqSub(C, R.pre + P.peer + '/d'); if (R.json !== '{}') { R.ask = true; lkFlush(R, true); } }
  if (LK.wake) { const w = LK.wake; LK.wake = null; w(); }
  lkNote();
}
function lkRelayIn(topic, text) {
  const ns = LINK_CFG.ns; if (!topic.startsWith(ns)) return; const rest = topic.slice(ns.length); LK.stat.rin++;
  if (rest.startsWith('r/')) { const p = rest.split('/'); if (p.length !== 4 || (p[3] !== 's' && p[3] !== 'd') || p[2] === LK.me || !LK_ID.test(p[2])) return; const R = LK.rooms.get(p[1]); if (R) lkRoomIn(R, p[2], text, performance.now()); }
  else if (rest === 's/' + LK.me) lkSigIn(text);
}
function lkTick() {
  const now = performance.now(), gap = now - LK.tickT, up = lkUp(), mains = LK.conns.filter(C => C.main); LK.tickT = now;
  if (!LK.spareOn && now - LK.t0 > 3000 && mains.filter(C => C.st === 2).length < Math.min(2, mains.length)) { if (!LK.shortT) LK.shortT = now; else if (now - LK.shortT > 3000 || !up) LK.spareOn = true; } else LK.shortT = 0;
  for (const C of LK.conns) {
    if (C.st === 0) { if (now >= C.tryT && (C.main || LK.spareOn)) mqOpen(C); }
    else if (C.st === 2) { if (now - C.inT > LK_DEAD || (C.pingAt && now - C.pingAt > LK_PONG)) mqDown(C, 'silent'); else if (now - C.pingT > LK_PING) { C.pingT = now; if (!C.pingAt) C.pingAt = now; mqSend(C, new Uint8Array([0xc0, 0]), true); } }
  }
  const grace = gap > 2500 || (up && !LK.wasUp); LK.wasUp = up;       // (this page was asleep, or cut off: nobody is judged gone on what it missed)
  for (const R of LK.rooms.values()) {
    if (R.left) continue;
    if (grace) for (const P of R.peers.values()) P.seenT = now;
    if (R.json !== '{}' && now - R.fullT >= R.hb) lkFlush(R, true);
    if (up) for (const P of [...R.peers.values()]) if (now - P.seenT > R.ttl) lkDrop(R, P, 0);
    for (const [k, g] of R.gone) if (now - g.t > 15000) R.gone.delete(k);
  }
  lkLinkTick(now);
}

/* ---------------- a room ---------------- */
function lkFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k in o) lkFreeze(o[k]); } return o; }
function lkRoomNew(name) {
  const tb = name === 'lobby' ? 0 : 1, R = { name, table: !!tb, hb: LK_HB[tb], ttl: LK_TTL[tb], pre: LINK_CFG.ns + 'r/' + name + '/', topic: LINK_CFG.ns + 'r/' + name + '/' + LK.me + '/s', topicD: LINK_CFG.ns + 'r/' + name + '/' + LK.me + '/d', sub: LINK_CFG.ns + 'r/' + name + '/+/s', mine: {}, json: '{}', v: 0, fv: 0, fobj: null, fullT: 0, relayT: 0, pubT: 0, flushT: 0, ansT: 0, askT: 0,
    said: false, ask: false, left: false, changed: true, peers: new Map(), gone: new Map(), fns: new Set(), self: null, list: null, api: null };
  lkSelf(R); R.list = Object.freeze([R.self]); R.api = lkRoomApi(R); LK.rooms.set(name, R);
  for (const C of LK.conns) mqSub(C, R.sub);
  return R;
}
function lkSelf(R) { R.self = Object.freeze({ peer: LK.me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: true, presence: lkFreeze(JSON.parse(R.json)), updatedAt: Date.now() }); }
function lkRoomApi(R) {
  const o = {
    presence(patch) {
      if (R.left) return Promise.reject({ code: 'invalid_argument', message: 'this room has been left' });
      if (patch && typeof patch === 'object') for (const k in patch) { if (patch[k] === null || patch[k] === undefined) delete R.mine[k]; else R.mine[k] = patch[k]; }
      const w = R.pubT + 15 - performance.now(); if (w <= 0) lkFlush(R); else if (!R.flushT) R.flushT = setTimeout(() => lkFlush(R), w);
      return Promise.resolve();
    },
    peers: () => R.list,
    onPeers(fn) { R.fns.add(fn); R.changed = true; lkSoon(); return () => { R.fns.delete(fn); }; },
    connected: lkConnected,
  };
  if (!R.table) o.join = name => { if (typeof name !== 'string' || !LK_ROOM.test(name) || name === 'lobby') return Promise.reject({ code: 'invalid_argument', message: 'not a name for a room' }); const old = LK.rooms.get(name); if (old) lkLeave(old); return Promise.resolve(lkRoomNew(name).api); };
  else { o.name = R.name; o.leave = () => { lkLeave(R); return Promise.resolve(); }; }
  return Object.freeze(o);
}
function lkLeave(R) {
  if (R.left) return; R.left = true; clearTimeout(R.flushT); clearTimeout(R.ansT); if (R.said) lkSayAll(R, 'B' + (++LK.ver));
  for (const C of LK.conns) { mqSub(C, R.sub, true); for (const P of R.peers.values()) mqSub(C, R.pre + P.peer + '/d', true); } R.fns.clear(); if (LK.rooms.get(R.name) === R) LK.rooms.delete(R.name); lkLinkCheck();
}
/* what changed one level down between two objects with the same keys: { d: { key: { changed } }, x: { key: [removed] } }, or null where it cannot be said that way */
function lkDiff(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return null; let d = null, x = null;
  for (const k of kb) {
    if (!(k in a)) return null; const p = a[k], q = b[k];
    if (!p || !q || typeof p !== 'object' || typeof q !== 'object' || Array.isArray(p) || Array.isArray(q)) { if (JSON.stringify(p) !== JSON.stringify(q)) return null; continue; }
    let dk = null, xk = null;
    for (const s in q) { if (q[s] === undefined) continue; if (JSON.stringify(q[s]) !== JSON.stringify(p[s])) (dk || (dk = {}))[s] = q[s]; }
    for (const s in p) if (!(s in q) || q[s] === undefined) (xk || (xk = [])).push(s);
    if (dk) (d || (d = {}))[k] = dk; if (xk) (x || (x = {}))[k] = xk;
  }
  return d || x ? (x ? (d ? { d, x } : { x }) : { d }) : null;
}
function lkApply(base, dx) {
  if (!base || !dx || typeof dx !== 'object') return null; const d = dx.d, x = dx.x, o = {}, plain = v => v && typeof v === 'object' && !Array.isArray(v); for (const k in base) o[k] = base[k];
  if (d !== undefined) { if (!plain(d)) return null; for (const k in d) { const b = base[k], q = d[k]; if (!plain(b) || !plain(q)) return null; const t = {}; for (const s in b) t[s] = b[s]; for (const s in q) t[s] = lkFreeze(q[s]); o[k] = t; } }
  if (x !== undefined) { if (!plain(x)) return null; for (const k in x) { const b = base[k], q = x[k]; if (!plain(b) || !Array.isArray(q)) return null; let t = o[k]; if (t === b) { t = {}; for (const s in b) t[s] = b[s]; o[k] = t; } for (const s of q) if (typeof s === 'string') delete t[s]; } }
  for (const k in o) if (o[k] && typeof o[k] === 'object') Object.freeze(o[k]);
  return Object.freeze(o);
}
function lkFlush(R, force) {       // says this page's object in the room if it has changed (force: says it whole anyway: a sign of life, or an answer)
  clearTimeout(R.flushT); R.flushT = 0; if (R.left) return; const now = performance.now(), json = JSON.stringify(R.mine); let changed = false;
  if (json !== R.json) { const none = R.json === '{}'; R.json = json; R.v = ++LK.ver; changed = true; lkSelf(R); R.changed = true; lkSoon(); if (R.table && none !== (json === '{}')) lkLinkCheck(); }
  if (json === '{}') { if (R.said) { R.said = false; lkSayAll(R, 'B' + (++LK.ver)); } return; }       // (nothing to say: the others need not keep this page on their list)
  if (!changed && !force) return;
  const hello = !R.said || R.ask; let msg = null, must = hello || !!force || now - R.relayT >= R.hb;       // must: this one goes through the relays whoever is listening there (a first word, an answer, the sign of life)
  if (!must && R.table && R.fobj && now - R.fullT < R.hb) { const dx = lkDiff(R.fobj, R.mine); if (!dx) must = true; else { const s = JSON.stringify(dx); if (s.length + 24 < json.length) { msg = 'D' + R.v + ',' + R.fv + '\n' + s; LK.stat.delta++; } } }
  if (!msg) { msg = (hello ? 'G' : 'F') + R.v + '\n' + json; R.fv = R.v; R.fobj = JSON.parse(json); R.fullT = now; R.ask = false; LK.stat.full++; } else must = false;
  R.said = true; R.pubT = now; lkSay(R, msg, must);
}
const lkLive = (L, now) => L.open && now - L.rxT <= LK_DQUIET && now >= L.doubtT;       // a direct line that is open and has not gone quiet
function lkSay(R, msg, must) {       // by the direct lines where they are open; through the relays too unless everyone else at the table is heard from directly (must: through the relays in any case)
  let all = R.table && R.peers.size > 0 && LK.links.size > 0;
  if (R.table && LK.links.size > 0) { const now = performance.now(), dm = R.name + '\n' + msg; for (const P of R.peers.values()) { const L = LK.links.get(P.peer); if (!L || !L.open || !lkDirectSend(L, dm) || !lkLive(L, now)) all = false; } }
  if (must || (!all && R.peers.size > 0)) { const topic = msg[0] === 'D' ? R.topicD : R.topic; for (const C of LK.conns) mqPub(C, topic, msg, must); if (must) R.relayT = performance.now(); }
}
function lkSayAll(R, msg) { for (const C of LK.conns) mqPub(C, R.topic, msg, true); if (R.table) for (const P of R.peers.values()) { const L = LK.links.get(P.peer); if (L && L.open) lkDirectSend(L, R.name + '\n' + msg); } }
function lkAnswer(R) { if (!R.ansT && !R.left) R.ansT = setTimeout(() => { R.ansT = 0; if (!R.left && R.json !== '{}') lkFlush(R, true); }, R.table ? 4 : 20 + Math.random() * 100); }       // (in the lobby, where there may be many: not all at the same instant)
function lkAsk(R, now) { if (now - R.askT < 400) return; R.askT = now; lkSayAll(R, 'H'); }
function lkSet(R, P, v, state) { P.v = v; P.state = state; P.obj = Object.freeze({ peer: P.peer, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: true, presence: state, updatedAt: Date.now() }); R.changed = true; lkSoon(); }
function lkDrop(R, P, v) { R.peers.delete(P.peer); if (v) R.gone.set(P.peer, { v, t: performance.now() }); R.changed = true; lkSoon(); if (R.table) { for (const C of LK.conns) mqSub(C, R.pre + P.peer + '/d', true); lkLinkCheck(); } }
function lkRoomIn(R, peer, text, now, direct) {       // a word from someone in the room, by whichever road
  if (R.left || text.length > 20000 || text.indexOf('__proto__') >= 0) return; const k = text[0]; let P = R.peers.get(peer);
  if (k === 'H') { if (!direct) { const L = LK.links.get(peer); if (L && L.open) L.doubtT = now + LK_DOUBT; } lkAnswer(R); return; }       // (asked through a relay by someone with a direct line to this page: the line is not bringing it what this page says)
  if (k === 'B') { const v = +text.slice(1); if (!(v > 0)) return; const g = R.gone.get(peer); if (!g || g.v < v) R.gone.set(peer, { v, t: now }); if (P && v >= P.v) lkDrop(R, P, v); return; }
  const nl = text.indexOf('\n'); if (nl < 2 || (k !== 'F' && k !== 'G' && k !== 'D')) return; const head = text.slice(1, nl), c = head.indexOf(','), v = +(c < 0 ? head : head.slice(0, c));
  if (!(v > 0) || v !== Math.floor(v)) return; const g = R.gone.get(peer); if (g && v <= g.v) return;       // (said before it left)
  if (k === 'D') {
    const bv = +head.slice(c + 1); if (c < 1 || !(bv > 0)) return;
    if (!P) { lkAsk(R, now); return; }       // (someone this page has not heard whole yet)
    P.seenT = now; if (v <= P.v) return;
    if (bv !== P.bv) { if (bv > P.bv) { P.pend = { v, bv, body: text.slice(nl + 1) }; lkAsk(R, now); } return; }       // made from a whole object this page has not got (yet): kept until it has
    lkDelta(R, P, v, text.slice(nl + 1)); return;
  }
  if (k === 'G') lkAnswer(R);
  if (!P) { if (R.peers.size >= 40) return; P = { peer, v: 0, bv: 0, base: null, state: null, obj: null, seenT: now, pend: null }; }
  P.seenT = now; if (v < P.v) return;
  if (v > P.v) { let s; try { s = JSON.parse(text.slice(nl + 1)); } catch (e) { return; } if (!s || typeof s !== 'object' || Array.isArray(s)) return; const isNew = !P.obj; lkSet(R, P, v, lkFreeze(s)); if (isNew) { R.peers.set(peer, P); if (R.table) { for (const C of LK.conns) mqSub(C, R.pre + peer + '/d'); lkLinkCheck(); } } }
  if (!P.obj) return; P.bv = P.v; P.base = P.state;
  const q = P.pend; if (q) { P.pend = null; if (q.bv === P.bv && q.v > P.v) lkDelta(R, P, q.v, q.body); }
}
function lkDelta(R, P, v, body) { let dx; try { dx = JSON.parse(body); } catch (e) { return; } const s = lkApply(P.base, dx); if (s) lkSet(R, P, v, s); }
function lkSoon() { if (LK.due) return; LK.due = true; (typeof queueMicrotask === 'function' ? queueMicrotask : f => Promise.resolve().then(f))(lkDeliver); }
function lkDeliver() {       // those listening to a room are told who is in it, once for everything that has just changed
  LK.due = false;
  for (const R of [...LK.rooms.values()]) if (R.changed && !R.left) {
    R.changed = false; const list = [R.self]; for (const P of R.peers.values()) list.push(P.obj); R.list = Object.freeze(list);
    const ch = Object.freeze({ peers: R.list, joined: [], left: [], updated: [] }); for (const f of [...R.fns]) try { f(ch); } catch (e) { console.error(e); }
  }
}

/* ---------------- the direct lines ---------------- */
function lkLinkCheck() {       // a line is wanted to everyone at a table with this page, and to nobody else
  const want = new Map(); for (const R of LK.rooms.values()) if (R.table && !R.left && R.json !== '{}') for (const P of R.peers.values()) want.set(P.peer, R.name);
  for (const [peer, L] of [...LK.links]) if (!want.has(peer) || !LK.direct || !LK.rtc) lkLinkClose(L, true);
  if (LK.direct && LK.rtc) for (const [peer, room] of want) { let L = LK.links.get(peer); if (!L) { L = { peer, room, pc: null, dc: null, open: false, sid: '', rxT: 0, doubtT: 0, pingT: 0, t0: 0, tries: 0, nextT: 0, cq: [], have: false, n: 0, seen: new Set(), rtt: 0, mine: {}, theirs: {} }; LK.links.set(peer, L); } L.room = room; }
}
function lkLinkClose(L, forget) {
  const pc = L.pc, dc = L.dc, was = L.open; L.pc = null; L.dc = null; L.open = false;
  if (dc) { dc.onopen = dc.onmessage = dc.onclose = dc.onerror = null; try { dc.close(); } catch (e) { /* closed already */ } }
  if (pc) { pc.onicecandidate = pc.onconnectionstatechange = pc.oniceconnectionstatechange = pc.ondatachannel = null; try { pc.close(); } catch (e) { /* closed already */ } }
  if (forget) LK.links.delete(L.peer); if (was) lkNote();
}
function lkLinkFail(L, told) {       // the line did not open, or has broken: the caller tries again after a while (longer each time)
  if (!told && L.pc && lkUp()) lkSig(L, { t: 'x' });
  lkLog('line ' + L.peer.slice(1, 5) + (L.open ? ' broke' : ' did not open') + (told ? ' (told)' : '') + (L.pc && !L.open ? ' · mine: ' + lkKinds(L.mine || {}) + ' · theirs: ' + lkKinds(L.theirs || {}) : '')); lkLinkClose(L, false); L.tries++; L.nextT = performance.now() + Math.min(1500 * Math.pow(2, L.tries), 60000);
}
/* which kinds of address a device offered for a direct line: counted, for the details view (the addresses themselves are not kept) */
function lkKind(c, o) { const p = String(c).split(' '), i = p.indexOf('typ'), t = i > 0 ? p[i + 1] : '?', a = p[4] || ''; o[t] = (o[t] || 0) + 1; if (a.indexOf(':') >= 0) o.v6 = (o.v6 || 0) + 1; else if (/\.local$/.test(a)) o.named = (o.named || 0) + 1; }
const lkKinds = o => { const k = Object.keys(o).filter(x => x !== 'v6' && x !== 'named').map(x => x + ' ' + o[x]).join(', '); return (k || 'none') + (o.v6 ? ' (' + o.v6 + ' v6)' : '') + (o.named ? ' (' + o.named + ' by name)' : ''); };
function lkLinkPc(L) {
  let pc; try { pc = new RTCPeerConnection({ iceServers: LINK_CFG.ice }); } catch (e) { LK.rtc = false; return null; }
  L.pc = pc; L.t0 = performance.now(); L.cq = []; L.have = false; L.n = 0; L.seen.clear(); L.mine = {}; L.theirs = {};
  pc.onicecandidate = e => { if (L.pc !== pc) return; if (e.candidate && e.candidate.candidate) { lkKind(e.candidate.candidate, L.mine); lkSig(L, { t: 'c', n: L.n++, c: e.candidate.candidate, m: e.candidate.sdpMid, l: e.candidate.sdpMLineIndex }); } else if (!e.candidate) lkLog('line ' + L.peer.slice(1, 5) + ' offers: ' + lkKinds(L.mine)); };
  pc.oniceconnectionstatechange = () => { if (L.pc === pc) lkLog('line ' + L.peer.slice(1, 5) + ' ice ' + pc.iceConnectionState); };
  pc.onconnectionstatechange = () => { if (L.pc !== pc) return; lkLog('line ' + L.peer.slice(1, 5) + ' ' + pc.connectionState); if (pc.connectionState === 'failed' || pc.connectionState === 'closed') lkLinkFail(L); };
  pc.ondatachannel = e => { if (L.pc === pc) lkLinkChan(L, e.channel); };
  return pc;
}
function lkLinkChan(L, dc) {
  L.dc = dc;
  dc.onopen = () => { if (L.dc !== dc) return; lkLog('line ' + L.peer.slice(1, 5) + ' open · mine: ' + lkKinds(L.mine) + ' · theirs: ' + lkKinds(L.theirs)); L.open = true; L.rxT = performance.now(); L.doubtT = 0; L.pingT = 0; L.tries = 0; for (const R of LK.rooms.values()) if (R.table && !R.left && R.json !== '{}' && R.peers.has(L.peer)) lkFlush(R, true); lkNote(); };
  dc.onmessage = e => { if (L.dc === dc && typeof e.data === 'string') lkDirectIn(L, e.data); };
  dc.onclose = dc.onerror = () => { if (L.dc === dc) lkLinkFail(L); };
}
function lkLinkCall(L) {       // this page calls: a channel that keeps no order and repeats nothing, and an offer sent through the relays
  lkLinkClose(L, false); const pc = lkLinkPc(L); if (!pc) return; L.sid = Math.random().toString(36).slice(2, 10); lkLog('line ' + L.peer.slice(1, 5) + ' calling');
  try { lkLinkChan(L, pc.createDataChannel('sf', { ordered: false, maxRetransmits: 0 })); } catch (e) { lkLinkFail(L, true); return; }
  pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => { if (L.pc === pc) lkSig(L, { t: 'o', sdp: pc.localDescription.sdp }); }).catch(() => { if (L.pc === pc) lkLinkFail(L, true); });
}
function lkSigTo(peer, sid, o) { o.f = LK.me; o.s = sid; const text = JSON.stringify(o), topic = LINK_CFG.ns + 's/' + peer; for (const C of LK.conns) mqPub(C, topic, text, true); }
function lkSig(L, o) { lkSigTo(L.peer, L.sid, o); }
function lkAtTable(peer) { for (const R of LK.rooms.values()) if (R.table && !R.left && R.peers.has(peer)) return true; return false; }
function lkCands(L) { const pc = L.pc; for (const o of L.cq.splice(0)) pc.addIceCandidate({ candidate: String(o.c), sdpMid: o.m == null ? null : String(o.m), sdpMLineIndex: o.l == null ? null : o.l | 0 }).catch(() => { /* one that does not fit is no loss */ }); }
function lkSigIn(text) {       // the handshake of a direct line, from someone at a table with this page (from anyone else it is nothing)
  let o; try { o = JSON.parse(text); } catch (e) { return; }
  if (!o || typeof o !== 'object' || typeof o.f !== 'string' || typeof o.s !== 'string' || typeof o.t !== 'string' || o.s.length > 16 || !LK_ID.test(o.f)) return;
  const L = LK.links.get(o.f);
  if (!L || !LK.direct || !LK.rtc) { if (o.t === 'o' && lkAtTable(o.f)) lkSigTo(o.f, o.s, { t: 'n' }); return; }       // (this page opens no direct lines: the caller is told, and need not keep trying)
  if (o.t === 'r') { if (LK.me < o.f && !L.pc) { L.nextT = 0; L.tries = 0; } return; }       // (the other page takes direct lines again)
  if (o.t === 'o') {
    if (LK.me < o.f || L.sid === o.s || typeof o.sdp !== 'string') return;       // (the lower name calls; a second copy of the same offer, by the other relay, is the same offer)
    lkLinkClose(L, false); const pc = lkLinkPc(L); if (!pc) return; L.sid = o.s; lkLog('line ' + L.peer.slice(1, 5) + ' answering');
    pc.setRemoteDescription({ type: 'offer', sdp: o.sdp }).then(() => { if (L.pc !== pc) return; L.have = true; lkCands(L); return pc.createAnswer().then(a => pc.setLocalDescription(a)).then(() => { if (L.pc === pc) lkSig(L, { t: 'a', sdp: pc.localDescription.sdp }); }); }).catch(() => { if (L.pc === pc) lkLinkFail(L); });
    return;
  }
  if (o.s !== L.sid || !L.pc) return; const key = o.t + (o.n | 0); if (L.seen.has(key)) return; L.seen.add(key); const pc = L.pc;
  if (o.t === 'a') { if (LK.me > o.f || typeof o.sdp !== 'string') return; pc.setRemoteDescription({ type: 'answer', sdp: o.sdp }).then(() => { if (L.pc === pc) { L.have = true; lkCands(L); } }).catch(() => { if (L.pc === pc) lkLinkFail(L); }); }
  else if (o.t === 'c') { if (typeof o.c !== 'string' || L.cq.length > 60) return; lkKind(o.c, L.theirs); L.cq.push(o); if (L.have) lkCands(L); }
  else if (o.t === 'x') lkLinkFail(L, true);
  else if (o.t === 'n') { lkLog('line ' + L.peer.slice(1, 5) + ' not wanted there'); lkLinkClose(L, false); L.nextT = performance.now() + 300000; }
}
function lkDirectSend(L, text) {
  const dc = L.dc; if (!L.open || !dc || dc.readyState !== 'open') return false; if (dc.bufferedAmount > LK_DBUF) { LK.stat.skip++; return false; }
  try { dc.send(text); LK.stat.dout++; return true; } catch (e) { return false; }
}
function lkDirectIn(L, text) {
  const now = performance.now(), k = text[0]; L.rxT = now; LK.stat.din++;
  if (k === '?') { lkDirectSend(L, '!' + text.slice(1)); return; }       // "are you there": answered as it came
  if (k === '!') { const r = now - (+text.slice(1)); if (r >= 0 && r < 10000) L.rtt = L.rtt ? L.rtt * 0.7 + r * 0.3 : r; return; }
  const nl = text.indexOf('\n'); if (nl < 1) return; const R = LK.rooms.get(text.slice(0, nl)); if (R && R.table) lkRoomIn(R, L.peer, text.slice(nl + 1), now, true);
}
function lkLinkTick(now) {
  for (const L of LK.links.values()) {
    if (L.open) { if (now - L.pingT >= LK_DPING) { L.pingT = now; lkDirectSend(L, '?' + now); } }
    else if (L.pc) { if (now - L.t0 > LK_DTRY) lkLinkFail(L); }
    else if (LK.me < L.peer && now >= L.nextT && lkUp()) lkLinkCall(L);
  }
}

/* ---------------- what the rest of the game uses ---------------- */
/* → a promise of the room, as claude.use('room') gives it, or of null where this page cannot reach a relay */
function linkOpen() {
  if (typeof WebSocket !== 'function' || typeof TextEncoder !== 'function' || typeof TextDecoder !== 'function') return Promise.resolve(null);
  if (!LK.on) {
    LK.on = true; LK.enc = new TextEncoder(); LK.dec = new TextDecoder(); LK.rtc = typeof RTCPeerConnection === 'function'; LK.t0 = LK.tickT = performance.now(); LK.spareOn = false; LK.shortT = 0; LK.wasUp = false;
    if (!LK.me) { let s = 'p'; const A = 'abcdefghijklmnopqrstuvwxyz0123456789', b = new Uint8Array(11); try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < b.length; i++) b[i] = (Math.random() * 256) | 0; } for (const x of b) s += A[x % 36]; LK.me = s; }
    LK.conns = LINK_CFG.relays.map(u => [u, true]).concat(LINK_CFG.spare.map(u => [u, false])).map(([url, main], ix) => ({ url, ix, main, ws: null, st: 0, buf: null, pid: 0, tryT: 0, wait: 500, inT: 0, pingT: 0, pingAt: 0, rtt: 0, rs: [], t0: 0, openT: 0, subs: new Set() }));
    LK.timer = setInterval(lkTick, 250);
    if (!LK.bound) {
      LK.bound = true; const kick = () => { if (!LK.on) return; for (const C of LK.conns) { if (C.st === 0) { C.tryT = 0; C.wait = 500; } else if (C.st === 2) C.pingT = 0; } };
      window.addEventListener('online', kick); document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
      window.addEventListener('pagehide', () => { for (const R of LK.rooms.values()) if (R.said) { R.said = false; lkSayAll(R, 'B' + (++LK.ver)); } });       // (a page being closed says so: the others need not wait to find out)
    }
    for (const C of LK.conns) if (C.main) mqOpen(C);
  }
  const R = LK.rooms.get('lobby') || lkRoomNew('lobby');
  return new Promise(res => {
    if (lkUp()) { res(R.api); return; }
    const t = setTimeout(() => { if (LK.wake === w) { LK.wake = null; linkClose(); res(null); } }, 10000), w = () => { clearTimeout(t); res(R.api); }; LK.wake = w;
  });
}
function linkClose() {       // everything is let go of (a later linkOpen starts afresh)
  if (!LK.on) return; for (const R of [...LK.rooms.values()]) lkLeave(R);
  LK.on = false; clearInterval(LK.timer); for (const L of [...LK.links.values()]) lkLinkClose(L, true); for (const C of LK.conns) mqDown(C); LK.conns = []; LK.rooms.clear();
}
function linkDirect(on) {       // whether this page opens direct lines at all
  const was = LK.direct; LK.direct = !!on; if (!LK.on) return; lkLinkCheck();
  if (on && !was) for (const L of LK.links.values()) { if (LK.me > L.peer) lkSigTo(L.peer, '', { t: 'r' }); else L.nextT = 0; }
}
/* how this page hears a page at its table: { direct, ms } (ms: there and back, 0 where not known) */
function linkInfo(peer) { const L = LK.links.get(peer), now = performance.now(); if (L && lkLive(L, now)) return { direct: true, ms: L.rtt }; let r = 0; for (const C of LK.conns) if (C.st === 2 && C.rtt && (!r || C.rtt < r)) r = C.rtt; return { direct: false, ms: r * 2 }; }
/* how the connection stands, for the player to read (and to tell whoever has to find out why it misbehaves) */
function linkStatus() {
  const now = performance.now(), relays = LK.conns.filter(C => C.main || C.st || LK.spareOn).map(C => ({ up: C.st === 2, ms: Math.round(C.rtt), spare: !C.main })), lines = [];
  for (const L of LK.links.values()) lines.push({ peer: L.peer, state: lkLive(L, now) ? 'direct' : L.open ? 'quiet' : L.pc ? 'opening' : now < L.nextT && L.tries ? 'failed' : 'waiting', ms: Math.round(L.rtt), tries: L.tries });
  return { me: LK.me, rtc: LK.rtc, direct: LK.direct, relays, lines, stat: LK.stat, log: LK.log };
}
/* this page is waiting for something a page at its table should have said by now: it asks, through the relays as well, and whoever is asked that way says everything again by every road */
function linkAsk(name) { const R = LK.rooms.get(name); if (R && !R.left) lkAsk(R, performance.now()); }
