/* EL WERO — tablero, controles y animaciones de pelea */
(function () {
  'use strict';
  var E = window.Engine, DB = UI.DB, $ = function (s) { return document.querySelector(s); };
  var G = { st: null, me: 0, mode: 'cpu', level: 1, busy: false, queue: [], sel: null, wait: false, over: false, cfg: null };
  var PH = { main1: 'Principal', battle: 'Batalla', main2: 'Principal 2' };

  function myTurn() { return G.st && G.st.cur === G.me && !G.st.pending && G.st.winner === null; }
  function canInput() { return !G.busy && !G.wait && !G.over; }

  // ---------- inicio ----------
  function startCPU(cfg) {
    G.cfg = cfg; G.mode = 'cpu'; G.level = cfg.level; G.me = 0; G.avatar = cfg.avatar || 'pc_gamer';
    AI.reset();
    begin(E.create({ seed: (Math.random() * 1e9) | 0, first: Math.random() < .5 ? 0 : 1, players: [{ name: cfg.me, deck: cfg.deck }, { name: cfg.cpuName, deck: cfg.cpuDeck }] }));
  }
  function startNet(st, me) { G.avatar = 'caballero'; G.mode = me === 0 ? 'host' : 'guest'; G.me = me; begin(st); }
  function begin(st) {
    G.st = st; G.over = false; G.wait = false; G.sel = null; G.queue = [];
    document.querySelectorAll('.sheet,.modal').forEach(function (x) { x.remove(); });
    UI.go('game'); hideHelp(); render(G.st);
    G.busy = true;
    FX.sleep(300).then(function () {
      FX.banner(G.st.cur === G.me ? '¡TÚ EMPIEZAS!' : 'EMPIEZA ' + UI.esc(G.st.p[G.st.cur].name.toUpperCase()), 'gold', 1500); FX.sfx.turn();
      return FX.sleep(1500);
    }).then(function () { G.busy = false; after(); });
  }

  // ---------- acciones ----------
  function submit(a) {
    if (!canInput()) return;
    G.sel = null; hideHelp();
    if (G.mode === 'guest') { G.wait = true; Net.send({ t: 'act', a: a }); return; }
    var r = E.apply(G.st, G.me, a);
    if (!r.ok) { UI.toast(r.err); render(G.st); return; }
    if (G.mode === 'host') Net.send({ t: 'upd', p: G.me, a: a, st: G.st });
    enqueue(r.ev);
  }
  function onNet(m) {
    if (!G.st) return;
    if (m.t === 'act' && G.mode === 'host') {
      var r = E.apply(G.st, 1, m.a);
      if (!r.ok) { Net.send({ t: 'err', msg: r.err }); return; }
      Net.send({ t: 'upd', p: 1, a: m.a, st: G.st });
      enqueue(r.ev);
    } else if (m.t === 'upd' && G.mode === 'guest') {
      // repetimos la jugada en local para sacar las animaciones; el estado del anfitrion manda
      var r2 = E.apply(G.st, m.p, m.a);
      G.st = m.st; G.wait = false;
      enqueue(r2.ok ? r2.ev : []);
    } else if (m.t === 'err') { G.wait = false; UI.toast(m.msg); render(G.st); }
  }
  function enqueue(ev) { G.queue.push(ev); if (!G.busy) runQueue(); }
  function runQueue() {
    if (!G.queue.length) { G.busy = false; render(G.st); after(); return; }
    G.busy = true;
    var batch = G.queue.shift(), i = 0;
    (function step() {
      if (i >= batch.length) return runQueue();
      var ev = batch[i++];
      var p; try { p = play(ev); } catch (e) { console.error(e); p = null; }
      Promise.resolve(p).then(step, function (e) { console.error(e); step(); });
    })();
  }
  function after() {
    var st = G.st; if (!st) return;
    render(st);
    if (st.winner !== null) { if (!G.over) finish(); return; }
    if (st.pending && st.pending.p === G.me) return trapPrompt();
    if (G.mode === 'cpu') {
      var actor = st.pending ? st.pending.p : st.cur;
      if (actor === 1) setTimeout(cpuStep, 380 / FX.speed);
    }
  }
  function cpuStep() {
    if (G.mode !== 'cpu' || G.over || G.busy || !G.st) return;
    var st = G.st, p = st.pending ? st.pending.p : st.cur;
    if (p !== 1) return;
    var a = AI.next(st, 1);
    if (!a) return;
    var r = E.apply(st, 1, a);
    if (!r.ok) { AI.fail(st, a); setTimeout(cpuStep, 30); return; }
    enqueue(r.ev);
  }

  // ---------- render ----------
  function slotHTML(st, p, z, i) {
    var u = st.p[p][z][i], cls = 'slot ' + z, inner = '';
    if (u) {
      var c = st.c[u];
      if (z === 'mz') {
        if (c.pos === 'def') cls += ' def';
        inner = c.up ? UI.mini(c.id, { atk: E.atkOf(st, u), def: E.defOf(st, u) }) : '<div class="card back"></div>';
        if (c.eq.length) inner += '<div class="eqmark">🗡️</div>';
        if (p === G.me && st.phase === 'battle' && st.cur === G.me && E.canAttack(st, G.me, u)) cls += ' canatk';
      } else inner = c.up ? UI.mini(c.id) : '<div class="card back"></div>';
      if (G.sel && G.sel.hl && G.sel.hl.indexOf(u) >= 0) cls += G.sel.red ? ' hlr' : ' hl';
      if (G.sel && ((G.sel.chosen && G.sel.chosen.indexOf(u) >= 0) || G.sel.uid === u)) cls += ' sel';
    }
    return '<div class="' + cls + '" data-p="' + p + '" data-z="' + z + '" data-i="' + i + '"' + (u ? ' data-u="' + u + '"' : '') + '>' + inner + '</div>';
  }
  function row(st, p, z) {
    var idx = [0, 1, 2, 3, 4]; if (p !== G.me) idx.reverse();
    return idx.map(function (i) { return slotHTML(st, p, z, i); }).join('');
  }
  function info(st, p) {
    var P = st.p[p], pct = Math.max(0, Math.min(100, P.lp / 80)), mine = p === G.me;
    var av = mine ? 'art/samurai.webp' : 'art/' + (G.avatar || 'pc_gamer') + '.webp';
    return '<div class="avatar ' + (st.cur === p ? 'turn' : '') + '" style="background-image:url(' + av + ')"></div>' +
      '<div class="plate"><div class="pname">' + UI.esc(P.name) + '</div><div class="lpbox" data-lp="' + p + '"><div class="lpbar ' + (P.lp <= 2000 ? 'low' : '') + '" style="width:' + pct + '%"></div></div></div>' +
      '<div class="lpnum"><small>LP</small>' + P.lp + '</div>' +
      '<div class="pile" data-deck="' + p + '"><i class="stack"></i><b>' + P.deck.length + '</b></div>' +
      '<div class="pile gy" data-gy="' + p + '"><i class="tomb">🪦</i><b>' + P.gy.length + '</b></div>';
  }
  function render(st) {
    if (!st) return;
    var me = G.me, o = 1 - me;
    $('#oinfo').innerHTML = info(st, o);
    $('#minfo').innerHTML = info(st, me);
    $('#ohand').innerHTML = st.p[o].hand.map(function () { return '<div class="card back"></div>'; }).join('');
    $('#osz').innerHTML = row(st, o, 'sz');
    $('#omz').innerHTML = row(st, o, 'mz');
    $('#mmz').innerHTML = row(st, me, 'mz');
    $('#msz').innerHTML = row(st, me, 'sz');
    // mano en abanico
    var hand = st.p[me].hand, n = hand.length, mg = n <= 5 ? -0.8 : -Math.min(7.8, 0.8 + (n - 5) * 1.4), step = Math.min(5, 26 / Math.max(1, n));
    $('#mhand').innerHTML = hand.map(function (u, i) {
      var play = myTurn() && st.phase !== 'battle' && playable(st, u);
      var k = i - (n - 1) / 2, rot = (k * step).toFixed(1), dy = (Math.abs(k) * Math.abs(k) * 1.6).toFixed(1);
      return UI.mini(st.c[u].id, { cls: play ? 'playable' : '', attr: 'data-u="' + u + '" style="margin:0 ' + mg + 'vw;--r:' + rot + 'deg;--y:' + dy + 'px;z-index:' + (i + 1) + '"' });
    }).join('');
    var btn = '';
    if (myTurn() && !G.sel && !G.busy) {
      if (st.phase === 'main1') btn = st.turn > 1 ? '<button class="pbtn" data-act="phase">⚔ BATALLA</button>' : '<button class="pbtn" data-act="end">FIN TURNO ▸</button>';
      else if (st.phase === 'battle') btn = '<button class="pbtn" data-act="phase">FIN BATALLA ▸</button>';
      else btn = '<button class="pbtn" data-act="end">FIN TURNO ▸</button>';
    }
    var who = st.pending ? (st.pending.p === me ? '¡Responde!' : 'El rival decide…') : st.cur === me ? 'Tu turno' : (G.mode === 'cpu' ? 'La CPU piensa…' : 'Turno del rival');
    $('#mid').innerHTML = '<button class="menubtn" data-act="menu" aria-label="Menú">☰</button>' +
      '<div class="midc"><div class="phase">' + ['main1', 'battle', 'main2'].map(function (k) { return '<span class="' + (st.phase === k ? 'on' : '') + '">' + PH[k] + '</span>'; }).join('') + '</div>' +
      '<div class="turnlbl"><b>TURNO ' + st.turn + '</b> · ' + who + '</div></div>' + (btn || '<span class="pbtn ghost"></span>');
  }
  function playable(st, u) {
    var d = DB[st.c[u].id];
    if (d.kind === 'monster') return E.summonOptions(st, G.me, u).ok;
    return E.freeZone(st, G.me, 'sz') >= 0;
  }

  // ---------- toques ----------
  function onTap(e) {
    var ab = e.target.closest('[data-act]'); if (ab) return actBtn(ab.dataset.act);
    var gy = e.target.closest('[data-gy]'); if (gy) return showGY(+gy.dataset.gy);
    var slot = e.target.closest('.slot'), hc = e.target.closest('#mhand .card');
    if (G.sel) return selTap(slot);
    if (hc) return handTap(hc.dataset.u);
    if (slot && slot.dataset.u) return slotTap(slot);
  }
  function actBtn(act) {
    FX.sfx.tap();
    if (act === 'menu') return gameMenu();
    if (act === 'cancel') { G.sel = null; hideHelp(); return render(G.st); }
    if (act === 'direct') { if (!G.sel) return; var u = G.sel.uid; G.sel = null; return submit({ type: 'attack', uid: u }); }
    if (!canInput() || !myTurn()) return;
    submit({ type: act });
  }
  function sheet(uid, note, buttons) {
    var st = G.st, c = st.c[uid], d = DB[c.id];
    var m = document.createElement('div'); m.className = 'sheet';
    var stats = d.kind === 'monster' && E.zoneOf(st, uid) && c.up ? { atk: E.atkOf(st, uid), def: E.defOf(st, uid) } : {};
    m.innerHTML = '<div class="row">' + UI.mini(c.id, stats) + '<div style="flex:1"><h3>' + UI.esc(d.name) + '</h3><div class="desc"><b>[' + UI.esc(E.typeLine(d)) + ']</b><br>' + UI.esc(E.cardText(d)) + '</div>' + (note ? '<div class="desc" style="color:#ffd98a;margin-top:6px">' + note + '</div>' : '') + '</div></div><div class="acts"></div>';
    var acts = m.querySelector('.acts');
    var bg = document.createElement('div'); bg.style.cssText = 'position:fixed;inset:0;z-index:84;background:#0006';
    var close = function () { m.remove(); bg.remove(); };
    bg.onclick = close;
    buttons.concat([{ t: '🔍 Ver carta', fn: function () { UI.showCard(c.id, stats); } }, { t: 'Cerrar', small: 1, fn: function () { } }]).forEach(function (b) {
      var el = document.createElement('button'); el.className = 'btn ' + (b.cls || '') + (b.small ? ' small' : ''); if (b.small) el.style.width = '100%';
      el.textContent = b.t; if (b.dis) el.disabled = true;
      el.onclick = function () { close(); b.fn(); };
      acts.appendChild(el);
    });
    document.body.appendChild(bg); document.body.appendChild(m); FX.sfx.tap();
  }
  function handTap(uid) {
    var st = G.st, d = DB[st.c[uid].id];
    if (!canInput() || !myTurn() || st.phase === 'battle') return sheet(uid, myTurn() && st.phase === 'battle' ? 'En la fase de batalla no se juegan cartas de la mano.' : '', []);
    var b = [];
    if (d.kind === 'monster') {
      var so = E.summonOptions(st, G.me, uid), need = so.need, tx = need ? ' (sacrifica ' + need + ')' : '';
      var why = st.p[G.me].normalDone ? 'Ya invocaste un Wero este turno.' : (E.monsters(st, G.me).length < need ? 'Necesitas ' + need + ' Wero' + (need > 1 ? 's' : '') + ' en tu campo para sacrificar.' : (need ? 'Este Wero de ' + d.lvl + '★ pide ' + need + ' sacrificio' + (need > 1 ? 's' : '') + '.' : ''));
      b.push({ t: '⚔️ Invocar en ataque' + tx, cls: 'gold', dis: !so.ok, fn: function () { summonFlow(uid, need, false); } });
      b.push({ t: '🛡️ Colocar boca abajo' + tx, dis: !so.ok, fn: function () { summonFlow(uid, need, true); } });
      return sheet(uid, why, b);
    }
    var free = E.freeZone(st, G.me, 'sz') >= 0;
    if (d.kind === 'spell') {
      var needMon = d.sub === 'equipo' && !E.monsters(st, G.me).some(function (u) { return st.c[u].up; });
      b.push({ t: '✨ Activar', cls: 'gold', dis: !free || needMon, fn: function () { activateFlow(uid); } });
      b.push({ t: '⬇️ Colocar boca abajo', dis: !free, fn: function () { submit({ type: 'setST', uid: uid }); } });
      return sheet(uid, needMon ? 'Necesitas un Wero boca arriba para equiparlo.' : (!free ? 'No tienes espacio de magia/trampa.' : ''), b);
    }
    b.push({ t: '🪤 Colocar boca abajo', cls: 'gold', dis: !free, fn: function () { submit({ type: 'setST', uid: uid }); } });
    sheet(uid, 'Las trampas se activan en el turno del rival: el juego te preguntará en el momento.', b);
  }
  function summonFlow(uid, need, set) {
    if (!need) return submit({ type: 'summon', uid: uid, set: set });
    G.sel = { mode: 'tribute', uid: uid, need: need, chosen: [], set: set, hl: E.monsters(G.st, G.me) };
    help('Toca ' + need + ' Wero' + (need > 1 ? 's' : '') + ' tuyo' + (need > 1 ? 's' : '') + ' para sacrificar');
    render(G.st);
  }
  function activateFlow(uid) {
    var d = DB[G.st.c[uid].id];
    if (d.sub === 'equipo') {
      var mine = E.monsters(G.st, G.me).filter(function (u) { return G.st.c[u].up; });
      if (mine.length === 1) return submit({ type: 'activate', uid: uid, target: mine[0] });
      G.sel = { mode: 'equip', uid: uid, hl: mine }; help('¿A qué Wero se lo equipas?'); return render(G.st);
    }
    submit({ type: 'activate', uid: uid });
  }
  function slotTap(slot) {
    var st = G.st, u = slot.dataset.u, c = st.c[u], p = +slot.dataset.p;
    if (p !== G.me) { if (c.up) UI.showCard(c.id, DB[c.id].kind === 'monster' ? { atk: E.atkOf(st, u), def: E.defOf(st, u) } : null); return; }
    var d = DB[c.id], b = [];
    if (slot.dataset.z === 'mz') {
      if (canInput() && E.canAttack(st, G.me, u)) return attackFlow(u);
      if (canInput() && myTurn() && st.phase !== 'battle') {
        var lock = c.sumT === st.turn || c.posT === st.turn;
        b.push({ t: !c.up ? '🔄 Voltear boca arriba' : c.pos === 'atk' ? '🛡️ Cambiar a defensa' : '⚔️ Cambiar a ataque', dis: lock, fn: function () { submit({ type: 'changePos', uid: u }); } });
      }
      return sheet(u, lockMsg(st, c), b);
    }
    if (d.kind === 'spell' && !c.up && canInput() && myTurn() && st.phase !== 'battle') b.push({ t: '✨ Activar', cls: 'gold', fn: function () { activateFlow(u); } });
    sheet(u, d.kind === 'trap' && !c.up ? (c.setT >= st.turn ? 'Podrás usarla desde el siguiente turno del rival.' : 'Lista: se activará cuando el rival ataque o invoque.') : '', b);
  }
  function lockMsg(st, c) {
    if (st.phase === 'battle' && st.cur === G.me) return c.pos !== 'atk' || !c.up ? 'Los Weros en defensa no atacan.' : 'Este Wero ya atacó.';
    if (st.cur === G.me && (c.sumT === st.turn || c.posT === st.turn)) return 'Ya no puede cambiar de posición este turno.';
    return '';
  }
  function attackFlow(u) {
    var t = E.attackTargets(G.st, G.me, u);
    if (!t.targets.length && t.direct) return submit({ type: 'attack', uid: u });
    G.sel = { mode: 'attack', uid: u, hl: t.targets, red: true };
    help('¿A quién atacas?' + (t.direct ? ' <button class="btn small gold" data-act="direct">💥 Directo</button>' : ''));
    render(G.st);
  }
  function selTap(slot) {
    var s = G.sel; if (!slot || !slot.dataset.u) return;
    var u = slot.dataset.u;
    if (s.mode === 'tribute') {
      if (s.hl.indexOf(u) < 0) return;
      var k = s.chosen.indexOf(u); if (k >= 0) s.chosen.splice(k, 1); else s.chosen.push(u);
      FX.sfx.tap();
      if (s.chosen.length === s.need) return submit({ type: 'summon', uid: s.uid, trib: s.chosen.slice(), set: s.set });
      return render(G.st);
    }
    if (s.mode === 'attack' && s.hl.indexOf(u) >= 0) return submit({ type: 'attack', uid: s.uid, target: u });
    if (s.mode === 'equip' && s.hl.indexOf(u) >= 0) return submit({ type: 'activate', uid: s.uid, target: u });
  }
  function help(html) { var h = $('#help'); h.innerHTML = html + ' <button class="btn small" data-act="cancel">✕</button>'; h.classList.add('on'); }
  function hideHelp() { var h = $('#help'); if (h) h.classList.remove('on'); }

  function trapPrompt() {
    var st = G.st, pd = st.pending;
    if (document.querySelector('.sheet.trapq')) return;
    var title = pd.trig === 'attack'
      ? '¡' + UI.esc(DB[st.c[pd.attacker].id].name) + ' (ATK ' + E.atkOf(st, pd.attacker) + ') ataca ' + (pd.target ? 'a ' + UI.esc(DB[st.c[pd.target].id].name) : 'directo') + '!'
      : '¡El rival invocó a ' + UI.esc(DB[st.c[pd.summoned].id].name) + ' (ATK ' + E.atkOf(st, pd.summoned) + ')!';
    var m = document.createElement('div'); m.className = 'sheet trapq';
    m.innerHTML = '<h3>🪤 ¿Activar una trampa?</h3><div class="desc" style="margin-bottom:8px">' + title + '</div>' +
      pd.opts.map(function (u) { var d = DB[st.c[u].id]; return '<div class="row" style="margin:8px 0">' + UI.mini(st.c[u].id) + '<div style="flex:1"><b style="color:#ffd98a">' + UI.esc(d.name) + '</b><div class="desc">' + UI.esc(E.cardText(d)) + '</div><button class="btn small gold" data-trap="' + u + '">¡Activar!</button></div></div>'; }).join('') +
      '<button class="btn" data-trap="">No activar nada</button>';
    m.onclick = function (e) { var b = e.target.closest('[data-trap]'); if (!b) return; m.remove(); submit({ type: 'trapResp', uid: b.dataset.trap || null }); };
    document.body.appendChild(m); FX.sfx.trap(); FX.vib(60);
  }
  function showGY(p) {
    var st = G.st, list = st.p[p].gy.slice().reverse();
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<h3 style="color:#ffd98a;font-family:Georgia">Cementerio de ' + UI.esc(st.p[p].name) + '</h3><div class="grid" style="width:100%;max-height:70vh;overflow:auto;padding-bottom:10px">' + (list.map(function (u) { return UI.mini(st.c[u].id); }).join('') || '<p class="muted">Vacío</p>') + '</div><button class="btn small">Cerrar</button>';
    m.onclick = function (e) { var c = e.target.closest('.card'); if (c) return UI.showCard(c.dataset.id); m.remove(); };
    document.body.appendChild(m);
  }
  function surrender() {
    if (G.mode === 'guest') { Net.send({ t: 'act', a: { type: 'surrender' } }); return; }
    var r = E.apply(G.st, G.me, { type: 'surrender' });
    if (G.mode === 'host') Net.send({ t: 'upd', p: G.me, a: { type: 'surrender' }, st: G.st });
    enqueue(r.ev);
  }
  function gameMenu() {
    var m = document.createElement('div'); m.className = 'sheet';
    m.innerHTML = '<h3>Partida</h3><button class="btn" data-m="log">📜 Ver lo que ha pasado</button><button class="btn red" data-m="quit">🏳️ Rendirse</button><button class="btn small" style="width:100%" data-m="x">Seguir jugando</button>';
    m.onclick = function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; m.remove();
      if (b.dataset.m === 'quit') { if (G.over) return exitGame(); if (confirm('¿Rendirte?')) surrender(); }
      if (b.dataset.m === 'log') { var l = document.createElement('div'); l.className = 'modal'; l.innerHTML = '<div style="max-height:70vh;overflow:auto;width:min(92vw,460px);background:#0b1830;border:2px solid #e2b25a;border-radius:14px;padding:12px;font-size:14px;line-height:1.4">' + G.st.log.slice().reverse().map(UI.esc).join('<br>') + '</div><button class="btn small">Cerrar</button>'; l.onclick = function () { l.remove(); }; document.body.appendChild(l); }
    };
    document.body.appendChild(m);
  }

  // ---------- animaciones por evento ----------
  function slotEl(p, z, i) { return document.querySelector('.slot[data-p="' + p + '"][data-z="' + z + '"][data-i="' + i + '"]'); }
  function cardIn(p, z, i) { var s = slotEl(p, z, i); return s && s.querySelector('.card'); }
  var RC = { N: '#ffe08a', R: '#e6efff', UR: '#ffd24a', L: '#c86bff', UL: '#ffffff' };
  function play(ev) {
    var s = ev.snap, d = ev.id ? DB[ev.id] : null, el, c;
    switch (ev.t) {
      case 'draw':
        render(s);
        if (ev.p === G.me) {
          var hc = document.querySelector('#mhand .card[data-u="' + ev.uid + '"]'), dk = document.querySelector('[data-deck="' + G.me + '"]');
          if (hc && dk) { var a = FX.center(dk), b = FX.center(hc); hc.animate([{ transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px) scale(.4)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 380 / FX.speed, easing: 'cubic-bezier(.2,.8,.3,1)' }); }
          FX.sfx.draw(); return FX.sleep(260);
        }
        return FX.sleep(120);
      case 'tribute':
        ev.list.forEach(function (t) { var ce = cardIn(t.p, 'mz', t.i); if (ce) { var cc = FX.center(ce); FX.stream(cc.x, cc.y, innerWidth / 2, innerHeight / 2, 40, '#c99bff'); ce.classList.add('dissolve'); } });
        FX.sfx.whoosh(); FX.banner('¡SACRIFICIO!', 'gold', 900);
        return FX.sleep(800).then(function () { render(s); });
      case 'summon':
        var epic = ev.up && (d.lvl >= 7 || d.rar === 'L' || d.rar === 'UL');
        return (epic ? cutIn(ev, d) : Promise.resolve()).then(function () {
          render(s); el = cardIn(ev.p, 'mz', ev.i); if (!el) return;
          FX.anim(el, 'dropin', 700); c = FX.center(el);
          if (ev.up) {
            FX.rays(c.x, c.y, RC[d.rar]); FX.burst(c.x, c.y, epic ? 90 : 35, epic ? ['#ffd24a', '#fff', '#c86bff', '#4dd2ff'] : null, epic ? 11 : 7); FX.sfx.summon();
            if (ev.how === 'revive') FX.float(c.x, c.y - 20, '¡REVIVE!', 'g'); else if (ev.how === 'special') FX.float(c.x, c.y - 20, '¡ESPECIAL!', 'b');
          } else FX.sfx.tap();
          if (epic) { FX.shake(); FX.vib(70); }
          return FX.sleep(ev.up ? 600 : 300);
        });
      case 'set': render(s); FX.anim(cardIn(ev.p, 'sz', ev.i), 'dropin', 600); FX.sfx.tap(); return FX.sleep(300);
      case 'activate': return showActivation(ev).then(function () { render(s); });
      case 'effect':
        render(s); el = cardIn(ev.p, 'mz', ev.i);
        if (el) { FX.anim(el, 'pulsefx', 800); c = FX.center(el); FX.float(c.x, c.y - 30, '¡EFECTO!', 'b'); FX.burst(c.x, c.y, 25, ['#7cf', '#fff'], 6); }
        FX.sfx.spell(); return FX.sleep(650);
      case 'buff':
        render(s); el = slotEl(ev.p, 'mz', ev.i);
        if (el && ev.n) { c = FX.center(el); FX.float(c.x, c.y, (ev.n > 0 ? '+' : '') + ev.n + (ev.eq && !ev.n ? '' : ' ATK'), ev.n >= 0 ? 'g' : 'r'); FX.anim(el.querySelector('.card'), 'pulsefx', 700); }
        return FX.sleep(380);
      case 'destroy':
        if (ev.quiet) { render(s); return FX.sleep(60); }
        el = cardIn(ev.p, ev.z, ev.i);
        if (el) {
          var r = el.getBoundingClientRect(); c = FX.center(el);
          if (d.kind === 'monster' && ev.up) { var art = el.querySelector('.art'); var ar = art ? art.getBoundingClientRect() : r; el.style.visibility = 'hidden'; FX.shatter(ar, UI.artURL(d), 4, 4); }
          else el.classList.add('burn');
          FX.burst(c.x, c.y, 40, ['#ff8a2f', '#ffd24a', '#fff'], 8); FX.sfx.shatter(); FX.vib(40);
        }
        return FX.sleep(560).then(function () { render(s); });
      case 'battle': return battleScene(ev).then(function () { render(s); });
      case 'damage':
        render(s); el = document.querySelector('[data-lp="' + ev.p + '"]');
        if (el) { c = FX.center(el); FX.float(c.x, c.y + (ev.p === G.me ? -30 : 30), '-' + ev.n, 'r'); FX.shake(el); }
        if (ev.p === G.me) { FX.flash('red'); FX.vib(ev.n >= 1500 ? [60, 40, 90] : 50); }
        FX.sfx.dmg(); return FX.sleep(520);
      case 'heal':
        render(s); el = document.querySelector('[data-lp="' + ev.p + '"]');
        if (el) { c = FX.center(el); FX.float(c.x, c.y - 20, '+' + ev.n + ' LP', 'g'); FX.burst(c.x, c.y, 30, ['#6dff9a', '#fff'], 5, 4, -.05); }
        FX.sfx.heal(); return FX.sleep(450);
      case 'phase':
        render(s); if (ev.ph === 'battle') { FX.banner('⚔️ FASE DE BATALLA', 'red', 900); FX.sfx.whoosh(); return FX.sleep(700); }
        return FX.sleep(150);
      case 'turn':
        render(s); FX.banner(ev.cur === G.me ? 'TU TURNO' : 'TURNO DEL RIVAL', ev.cur === G.me ? 'gold' : '', 1100); FX.sfx.turn(); return FX.sleep(950);
      case 'search': return showMini(ev.id, ev.p === G.me ? '¡A tu mano!' : 'El rival lo tomó').then(function () { render(s); });
      case 'declare':
        render(s); el = document.querySelector('.slot[data-u="' + ev.uid + '"] .card'); if (el) FX.anim(el, 'pulsefx', 700);
        FX.banner('¡ATAQUE!', 'red', 800); FX.sfx.whoosh(); return FX.sleep(650);
      case 'negated': render(s); FX.banner('🚫 ¡ATAQUE ANULADO!', 'red', 1100); FX.sfx.shield(); return FX.sleep(900);
      case 'flip': render(s); FX.anim(cardIn(ev.p, 'mz', ev.i), 'dropin', 600); FX.sfx.summon(); return FX.sleep(450);
      case 'pos': render(s); FX.sfx.tap(); return FX.sleep(300);
      case 'field': render(s); el = document.querySelector('.slot[data-p="' + ev.p + '"][data-z="sz"] .card[data-id="' + ev.id + '"]'); if (el) { c = FX.center(el); FX.rays(c.x, c.y, '#5dffcf'); } return FX.sleep(400);
      case 'gy': render(s); return null;
      case 'win': render(s); return FX.sleep(500);
    }
    render(s);
    return null;
  }
  function cutIn(ev, d) {
    var div = document.createElement('div'); div.className = 'cutin';
    var label = d.rar === 'UL' ? '¡ULTRA LEGENDARIA!' : d.rar === 'L' ? '¡LEGENDARIA!' : (ev.how === 'tribute' ? '¡INVOCACIÓN POR SACRIFICIO!' : '¡INVOCACIÓN!');
    div.innerHTML = '<img src="' + UI.artURL(d) + '"><div class="ct"><small>' + label + '</small>' + UI.esc(d.name.toUpperCase()) + '</div>';
    div.style.animationDuration = (1.7 / FX.speed) + 's'; div.querySelector('img').style.animationDuration = (1.7 / FX.speed) + 's';
    document.body.appendChild(div); FX.sfx.epic(); FX.flash(); FX.vib([50, 30, 80]);
    FX.burst(innerWidth / 2, innerHeight / 2, 120, d.rar === 'UL' ? ['#ff4d4d', '#ffd24a', '#4dff88', '#4dd2ff', '#b84dff'] : ['#ffd24a', '#fff', '#ff8a2f'], 13);
    return FX.sleep(1650).then(function () { div.remove(); });
  }
  function showActivation(ev) {
    var w = document.createElement('div'); w.className = 'center-card';
    w.innerHTML = UI.big(ev.id) + '<div class="trapstamp ' + (ev.kind === 'spell' ? 'sp' : '') + '">' + (ev.kind === 'spell' ? '¡MAGIA!' : '¡TRAMPA!') + '</div>';
    w.querySelector('.big').style.width = 'min(64vw,40vh,320px)';
    document.body.appendChild(w);
    w.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotateY(180deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08) rotateY(0)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .8 }, { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }], { duration: 1500 / FX.speed, easing: 'ease-out', fill: 'forwards' });
    if (ev.kind === 'trap') { FX.sfx.trap(); FX.flash('red'); FX.vib([40, 30, 40]); } else { FX.sfx.spell(); FX.rays(innerWidth / 2, innerHeight / 2, '#5dffcf'); }
    FX.burst(innerWidth / 2, innerHeight / 2, 50, ev.kind === 'trap' ? ['#ff4a6a', '#fff'] : ['#5dffcf', '#fff'], 9);
    return FX.sleep(1450).then(function () { w.remove(); });
  }
  function showMini(id, text) {
    var w = document.createElement('div'); w.className = 'center-card';
    w.innerHTML = UI.big(id) + '<div class="trapstamp sp" style="font-size:24px;top:-4%">' + text + '</div>';
    w.querySelector('.big').style.width = 'min(52vw,34vh,260px)';
    document.body.appendChild(w);
    w.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .8 }, { transform: 'translate(-50%,120%) scale(.3)', opacity: 0 }], { duration: 1300 / FX.speed, fill: 'forwards' });
    FX.sfx.draw();
    return FX.sleep(1250).then(function () { w.remove(); });
  }

  // ---------- LA PELEA: los Weros salen a la arena ----------
  function anim(el, frames, ms, easing) { return el.animate(frames, { duration: ms / FX.speed, easing: easing || 'ease-out', fill: 'forwards' }).finished.catch(function () { }); }
  function countUp(el, to, ms) {
    var t0 = performance.now(); ms /= FX.speed;
    return new Promise(function (res) { (function f(t) { var k = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * k / 10) * 10; if (k < 1) requestAnimationFrame(f); else { el.textContent = to; res(); } })(t0); });
  }
  function battleScene(ev) {
    var st = ev.snap, ar = $('#arena'), A = DB[ev.aid], D = ev.direct ? null : DB[ev.did];
    var ownA = st.p[ev.p].name, ownD = st.p[1 - ev.p].name;
    ar.innerHTML = '<div class="floor"></div><div class="speed"></div>' +
      '<div class="fighter atk" id="fA"><div class="fown">' + UI.esc(ownA) + '</div><div class="fimg" style="background-image:url(' + UI.artURL(A) + ')"><div class="shieldfx"></div></div><div class="fname">' + UI.esc(A.name) + '</div><div class="fpow"><small>ATK </small><span>0</span></div></div>' +
      (D ? '<div class="fighter def" id="fD"><div class="fown">' + UI.esc(ownD) + (ev.flipped ? ' · ¡volteado!' : '') + '</div><div class="fimg" style="background-image:url(' + UI.artURL(D) + ')"><div class="shieldfx"></div></div><div class="fname">' + UI.esc(D.name) + '</div><div class="fpow"><small>' + (ev.dpos === 'atk' ? 'ATK ' : 'DEF ') + '</small><span>0</span></div></div>'
        : '<div class="lptarget" id="fD"><small>' + UI.esc(ownD) + '</small>❤️ ' + (st.p[1 - ev.p].lp) + '<small>¡ATAQUE DIRECTO!</small></div>') +
      '<div class="vs">VS</div><div class="slash"></div>';
    ar.classList.add('on');
    var fA = $('#fA'), fD = $('#fD'), vs = ar.querySelector('.vs'), sl = ar.querySelector('.slash');
    return anim(ar, [{ opacity: 0 }, { opacity: 1 }], 200).then(function () {
      FX.sfx.whoosh();
      return Promise.all([
        anim(fA, [{ transform: 'translateX(-110vw) rotate(-12deg)' }, { transform: 'translateX(4vw) rotate(3deg)', offset: .8 }, { transform: 'none' }], 450),
        anim(fD, [{ transform: 'translateX(110vw) rotate(12deg)' }, { transform: 'translateX(-4vw) rotate(-3deg)', offset: .8 }, { transform: 'none' }], 450)
      ]);
    }).then(function () {
      anim(vs, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(3) rotate(-20deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(0)', offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.8)' }], 750);
      FX.sfx.hit(); FX.vib(30);
      return Promise.all([countUp(fA.querySelector('.fpow span'), ev.atk, 500), D ? countUp(fD.querySelector('.fpow span'), ev.dval, 500) : null, FX.sleep(650)]);
    }).then(function () {
      return anim(fA, [{ transform: 'none' }, { transform: 'translate(-26px,22px) scale(.92) rotate(-6deg)' }], 220, 'ease-in');
    }).then(function () {
      ar.classList.add('dash'); FX.sfx.whoosh();
      var a = FX.center(fA), b = FX.center(fD), dx = (b.x - a.x) * .62, dy = (b.y - a.y) * .62;
      return anim(fA, [{ transform: 'translate(-26px,22px) scale(.92) rotate(-6deg)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.18) rotate(8deg)' }], 230, 'cubic-bezier(.6,0,.9,.4)');
    }).then(function () {
      var a = FX.center(fA), b = FX.center(fD), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      FX.flash(); FX.shake(ar); FX.burst(x, y, 110, ['#fff', '#ffd24a', '#ff8a2f', '#ff4a4a'], 14, 5);
      anim(sl, [{ opacity: 0, transform: 'rotate(-28deg) scaleX(0)' }, { opacity: 1, transform: 'rotate(-28deg) scaleX(1)', offset: .4 }, { opacity: 0, transform: 'rotate(-28deg) scaleX(1.2)' }], 380);
      if (D) { FX.sfx.hit(); anim(fD, [{ transform: 'none' }, { transform: 'translate(34px,-26px) rotate(10deg)', offset: .35 }, { transform: 'none' }], 420); }
      else { FX.sfx.big(); var cr = document.createElement('div'); cr.className = 'crack'; document.body.appendChild(cr); setTimeout(function () { cr.remove(); }, 1150); FX.flash('red'); anim(fD, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: .3 }, { transform: 'scale(1)' }], 500); }
      FX.vib([70, 30, 50]);
      return FX.sleep(160);
    }).then(function () {
      ar.classList.remove('dash');
      var a = FX.center(fA), b = FX.center(fD), dx = (b.x - a.x) * .62, dy = (b.y - a.y) * .62;
      return anim(fA, [{ transform: 'translate(' + (dx * .3) + 'px,' + (dy * .3) + 'px) scale(1.1)' }, { transform: 'none' }], 300);
    }).then(function () {
      var res = function (f, kill, shield, label) {
        if (shield) { FX.sfx.shield(); anim(f.querySelector('.shieldfx'), [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 0, transform: 'scale(1.2)' }], 900); var c1 = FX.center(f); FX.float(c1.x, c1.y, label, 'b'); }
        else if (kill) {
          var im = f.querySelector('.fimg'); f.classList.add('lose');
          FX.sleep(120).then(function () { var r = im.getBoundingClientRect(), url = im.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g, ''); im.style.visibility = 'hidden'; FX.shatter(r, url, 5, 5); FX.sfx.shatter(); var c2 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; FX.burst(c2.x, c2.y, 70, ['#ff8a2f', '#ffd24a', '#fff'], 10); FX.float(c2.x, c2.y, '¡DESTRUIDO!', 'r'); });
        }
      };
      if (D) {
        res(fD, ev.killD, ev.shieldD || (!ev.killD && ev.dpos === 'def'), ev.shieldD ? '¡RESISTE!' : '¡DEFENSA!');
        res(fA, ev.killA, ev.shieldA, '¡RESISTE!');
        if (!ev.killA && !ev.killD && ev.dpos === 'atk' && !ev.shieldA && !ev.shieldD) { var cc = FX.center(fD); FX.float(cc.x, cc.y, '¡EMPATE!', 'y'); }
      }
      if (ev.dmg) { var c3 = FX.center(ev.dmgTo === ev.p ? fA : fD); setTimeout(function () { FX.float(c3.x, c3.y + 40, '-' + ev.dmg + ' LP', 'r'); }, 250 / FX.speed); }
      return FX.sleep(ev.killA || ev.killD ? 1150 : 850);
    }).then(function () {
      return anim(ar, [{ opacity: 1 }, { opacity: 0 }], 250);
    }).then(function () { ar.getAnimations().forEach(function (a) { a.cancel(); }); ar.classList.remove('on'); ar.innerHTML = ''; });
  }

  // ---------- fin ----------
  function finish() {
    G.over = true;
    var win = G.st.winner === G.me;
    var coins = UI.reward(win, G.mode === 'cpu' ? 'cpu' : 'net', G.level);
    if (win) { FX.sfx.win(); FX.burst(innerWidth / 2, innerHeight / 3, 160, ['#ffd24a', '#fff', '#4dff88', '#4dd2ff', '#ff5ad5'], 14); } else FX.sfx.lose();
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="endbox ' + (win ? '' : 'lose') + '"><h1>' + (win ? '¡GANASTE!' : 'PERDISTE') + '</h1><p>+ 🪙 ' + coins + ' monedas</p></div><div class="acts"><button class="btn gold" id="rem">🔁 Revancha</button><button class="btn" id="tomenu">🏠 Menú</button></div>';
    document.body.appendChild(m);
    m.querySelector('#rem').onclick = function () { m.remove(); if (G.mode === 'cpu') { var cd = UI.cpuDeck(G.level), W = window.WERO_DATA; G.cfg.cpuDeck = cd.cards; G.cfg.cpuName = 'CPU ' + W.arch[cd.arch].icon + ' ' + W.arch[cd.arch].name; G.cfg.avatar = (W.cards.filter(function (c) { return c.arch === cd.arch && c.rar === 'UL'; })[0] || {}).art; startCPU(G.cfg); } else Net.rematch(); };
    m.querySelector('#tomenu').onclick = function () { m.remove(); exitGame(); };
  }
  function exitGame() { G.over = true; G.st = null; document.querySelectorAll('.sheet,.modal').forEach(function (x) { x.remove(); }); if (G.mode !== 'cpu') Net.close(); UI.go('home'); }
  function netLost() { if (G.over || !G.st) return; G.over = true; UI.toast('Se perdió la conexión con el rival', 3000); setTimeout(exitGame, 2500); }

  document.addEventListener('DOMContentLoaded', function () { $('#game').addEventListener('click', onTap); });
  window.Game = { submit: submit, startCPU: startCPU, startNet: startNet, onNet: onNet, netLost: netLost, G: G, render: function () { render(G.st); } };
})();
