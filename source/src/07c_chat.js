/* ============================================================
   Playing together, part four: a few words.

   In a match with other players a line can be said to one's own side or to everyone. It travels with what a page says at the table
   anyway (T.ch: its last few lines, each with the match's number, a number of its own, whom it is for and the words; kept there for
   some seconds so that it cannot be missed), and every page shows the lines it has not shown yet. A line for one side goes to
   every page and is shown only by that side: it keeps a plan off the other team's screens, it is not a secret.

   What is typed is cut to 80 characters and loses whatever does not show; what arrives is read the same way and put on the page as
   text, never as markup. Whoever would rather not read any of it can mute it.
   ============================================================ */
const CHAT_MAX = 80, CHAT_KEEP = 12000, CHAT_SHOW = 9000;       // characters to a line · ms a line stays in what its page says · ms it stays on the screen
const CHAT_QUICK = [['Attack together!', 'Fall back!', 'Defend the turret', 'Take the beast', 'On my way', 'Careful, they are missing', 'Help me here', 'Well played!'], ['Good luck, have fun!', 'Well played!', 'Nice one', 'Good game!']];       // [for the team, for everyone]
const CHAT = { n: 0, out: [], seen: [], lines: [], to: 0, open: false, mute: false, lastT: 0, burst: [], shown: 0, rT: 0 };
const chatText = s => Array.from((typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, CHAT_MAX).join('');
const chatOn = () => !!NET.M && UI.state === 'play' && !!G.humans && G.humans.length > 1;       // there is someone to talk to
function chatReset() {       // a match begins (or ends): nothing said, nothing shown
  CHAT.out = []; CHAT.seen = (G.humans || []).map(() => 0); CHAT.lines = []; CHAT.open = false; CHAT.to = G.duel ? 1 : 0; CHAT.burst = [];
  $('btnChat').hidden = !chatOn(); $('chatBox').hidden = true; $('chatBar').hidden = true; chatRender();
}
/* ---- saying ---- */
function chatSay(to, text) {
  const M = NET.M, now = performance.now(); text = chatText(text); if (!M || M.out || !text || !chatOn()) return false;
  CHAT.burst = CHAT.burst.filter(t => now - t < 10000); if (now - CHAT.lastT < 700 || CHAT.burst.length >= 5) { snd('deny'); return false; }       // (not a flood)
  CHAT.lastT = now; CHAT.burst.push(now); to = to === 1 || G.duel ? 1 : 0;
  CHAT.out.push({ m: M.n, n: ++CHAT.n, to, text, until: now + CHAT_KEEP }); if (CHAT.out.length > 3) CHAT.out.shift();
  chatLine(M.me, to, text); netSay(); return true;
}
function chatOut(now) { if (CHAT.out.length && now >= CHAT.out[0].until) CHAT.out = CHAT.out.filter(c => now < c.until); return CHAT.out.length ? CHAT.out.map(c => [c.m, c.n, c.to, c.text]) : null; }       // what goes into T.ch
/* ---- hearing: the lines a page at the table says it has said, those not shown yet ---- */
function chatIn(seat, ch) {
  const M = NET.M; if (!M || !Array.isArray(ch) || seat === M.me || !(seat >= 0 && seat < CHAT.seen.length)) return; const me = G.humans[M.me], h = G.humans[seat]; if (!me || !h) return;
  for (const q of ch.slice(0, 4)) {
    if (!Array.isArray(q) || q[0] !== M.n) continue; const n = q[1] | 0; if (!(n > CHAT.seen[seat])) continue; CHAT.seen[seat] = n;
    const text = chatText(q[3]), to = q[2] === 1 ? 1 : 0; if (text && (to === 1 || h.team === me.team) && !CHAT.mute) chatLine(seat, to, text);
  }
}
/* ---- on the screen ---- */
function chatLine(seat, to, text) {
  const h = G.humans[seat], me = G.player, mine = !!NET.M && seat === NET.M.me; if (!h) return;
  CHAT.lines.push({ t: performance.now(), who: mine ? 'You' : h.name, ally: !me || h.team === me.team, to, text }); if (CHAT.lines.length > 40) CHAT.lines.shift();
  if (!mine) snd('ui'); chatRender();
}
function chatRows(el, rows) {
  el.textContent = '';
  for (const l of rows) { const d = document.createElement('div'), k = document.createElement('i'), w = document.createElement('b'); d.className = 'cl ' + (l.ally ? 'a' : 'e'); k.textContent = l.to ? 'All' : 'Team'; w.textContent = l.who; d.append(k, w, document.createTextNode(l.text)); el.appendChild(d); }
}
function chatRender() {
  const log = $('chatLog'), now = performance.now(), recent = CHAT.lines.filter(l => now - l.t < CHAT_SHOW).slice(-5); CHAT.shown = recent.length;
  if (CHAT.open) { log.hidden = true; const hist = $('chatBox').querySelector('.chist'); if (hist) { const rows = CHAT.lines.slice(-6); chatRows(hist, rows); hist.hidden = !rows.length; hist.scrollTop = 1e6; } }
  else { chatRows(log, recent); log.hidden = !recent.length; }
}
function chatTick(now) { if (now - CHAT.rT < 500) return; CHAT.rT = now; if (!CHAT.open && CHAT.shown && CHAT.lines.filter(l => now - l.t < CHAT_SHOW).length !== CHAT.shown) chatRender(); }       // lines leave the screen after a while
function chatPanel() {
  const el = $('chatBox'), duel = !!G.duel; if (duel) CHAT.to = 1;
  el.innerHTML = `<div class="ch"><div class="chips" role="group" aria-label="Who hears it">${duel ? '' : `<button class="chip plain a" data-to="0" aria-pressed="${CHAT.to === 0}">Team</button>`}<button class="chip plain" data-to="1" aria-pressed="${CHAT.to === 1}">All</button></div><button class="chip plain" data-type>Type…</button><button class="chip plain" data-mute aria-pressed="${CHAT.mute}">${CHAT.mute ? 'Muted' : 'Mute'}</button><button class="x" data-x aria-label="Close chat">${icon('x')}</button></div>`
    + `<div class="chist" hidden></div><div class="cq">${CHAT_QUICK[CHAT.to].map((q, i) => `<button class="chip plain" data-q="${i}">${esc(q)}</button>`).join('')}</div>`
    + (CHAT.mute ? `<p class="meta">Muted: what the others say is not shown. They still see what you say.</p>` : '');
  el.hidden = false; chatRender();
}
function chatOpen() { if (!chatOn()) return; CHAT.open = true; chatPanel(); }
function chatClose() { CHAT.open = false; $('chatBox').hidden = true; chatRender(); }
/* typing: a bar across the top of the screen the way the device is held (the game's own frame may be turned), so the words read upright above the keyboard */
function chatType(to) {
  if (!chatOn() || UI.ended) return; if (to != null) CHAT.to = to; if (G.duel) CHAT.to = 1; chatClose(); clearInput();
  const b = $('chatTo'); b.textContent = CHAT.to ? 'All' : 'Team'; b.className = CHAT.to ? 'all' : 'team'; $('chatBar').hidden = false; const inp = $('chatIn'); inp.value = ''; inp.focus();
}
function chatTypeEnd(send) { const bar = $('chatBar'), inp = $('chatIn'); if (bar.hidden) return; const v = inp.value; bar.hidden = true; inp.value = ''; inp.blur(); if (send && chatText(v)) chatSay(CHAT.to, v); }
function bindChat() {
  $('btnChat').innerHTML = icon('chat');
  $('btnChat').addEventListener('click', () => { snd('ui'); if (CHAT.open) chatClose(); else chatOpen(); });
  $('chatBox').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.to != null) { CHAT.to = +d.to ? 1 : 0; snd('ui'); chatPanel(); }
    else if (d.q != null) { const q = CHAT_QUICK[CHAT.to][+d.q]; if (q && chatSay(CHAT.to, q)) chatClose(); }
    else if (d.type != null) { snd('ui'); chatType(); }
    else if (d.mute != null) { CHAT.mute = !CHAT.mute; snd('ui'); chatPanel(); }
    else if (d.x != null) { snd('ui'); chatClose(); }
  });
  const inp = $('chatIn');
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); chatTypeEnd(true); } else if (e.key === 'Escape') { e.preventDefault(); chatTypeEnd(false); } });
  inp.addEventListener('keyup', e => e.stopPropagation());
  inp.addEventListener('blur', () => setTimeout(() => { if (!$('chatBar').hidden && document.activeElement !== inp) chatTypeEnd(false); }, 250));       // (a tap elsewhere puts it away: Send is quicker than that)
  $('chatSend').addEventListener('click', () => chatTypeEnd(true)); $('chatX').addEventListener('click', () => chatTypeEnd(false));
  $('chatTo').addEventListener('click', () => { if (G.duel) return; CHAT.to = CHAT.to ? 0 : 1; const b = $('chatTo'); b.textContent = CHAT.to ? 'All' : 'Team'; b.className = CHAT.to ? 'all' : 'team'; inp.focus(); });
}
