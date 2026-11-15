/* EL WERO — menus, coleccion, decks, sobres */
(function () {
  'use strict';
  var W = window.WERO_DATA, E = window.Engine;
  E.setDB(W.cards);
  var DB = {}; W.cards.forEach(function (c) { DB[c.id] = c; });
  var RN = { N: 'Normal', R: 'Rara', UR: 'Ultra Rara', L: 'Legendaria', UL: 'Ultra Legendaria' };
  var RORD = { N: 0, R: 1, UR: 2, L: 3, UL: 4 };
  var MAXC = { N: 3, R: 3, UR: 3, L: 2, UL: 1 };
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var S;
  function load() {
    try { S = JSON.parse(localStorage.getItem('elwero_save') || 'null'); } catch (e) { S = null; }
    if (!S) S = { name: '', coins: 500, coll: {}, decks: [], active: 0, starter: null, stats: { w: 0, l: 0 }, opt: {} };
    S.opt = S.opt || {}; if (S.opt.speed == null) S.opt.speed = 1; if (S.opt.sound == null) S.opt.sound = true; if (S.opt.vibe == null) S.opt.vibe = true;
    applyOpt();
  }
  function save() { try { localStorage.setItem('elwero_save', JSON.stringify(S)); } catch (e) { } }
  function applyOpt() { FX.speed = S.opt.speed; FX.sound = S.opt.sound; FX.vibe = S.opt.vibe; }
  function owned(id) { return S.opt.free ? 3 : (S.coll[id] || 0); }
  function addCard(id, n) { S.coll[id] = (S.coll[id] || 0) + (n || 1); }
  function ownedUnique() { return Object.keys(S.coll).filter(function (k) { return S.coll[k] > 0; }).length; }

  var OPI = { equip: '🗡️', fieldAura: '🏟️', draw: '🃏', heal: '💖', burn: '🔥', debuffStrongest: '📉', debuffAll: '📉', destroyStrongest: '💥', destroyAllEnemyMonsters: '☄️', destroyAllMonsters: '🌋', destroyDefEnemies: '🔨', destroyEnemyST: '🌪️', searchArch: '🔍', reviveBest: '✨', teamBuff: '📣', ssFromHand: '🌀',
    negate: '🚫', negateEnd: '⛔', destroyAttacker: '⚡', debuffAttacker: '🪤', reflectHalf: '🪞', destroyAllAtkEnemies: '🌋', destroySummoned: '🕳️', debuffSummoned: '🦟' };
  function icon(d) { var o = d.eff[0]; if (o.op === 'equip' && !o.atk) return '🛡️'; return OPI[o.op] || '⭐'; }
  function artHTML(d) {
    if (d.kind === 'monster') return '<img src="art/' + d.art + '.webp" loading="lazy" alt="">';
    var a = W.arch[d.arch];
    return '<div class="emo" style="background:radial-gradient(circle,' + a.color + 'aa,#0000 70%)">' + icon(d) + '</div>';
  }
  function artURL(d) { return d.kind === 'monster' ? 'art/' + d.art + '.webp' : null; }
  function stars(n) { return n ? new Array(n + 1).join('★') : ''; }
  function mini(id, o) {
    o = o || {}; var d = DB[id]; if (!d) return '';
    if (o.back) return '<div class="card back ' + (o.cls || '') + '" ' + (o.attr || '') + '></div>';
    var st;
    if (d.kind === 'monster') {
      var a = o.atk != null ? o.atk : d.atk, df = o.def != null ? o.def : d.df;
      var ca = a > d.atk ? 'up' : a < d.atk ? 'dn' : '', cd = df > d.df ? 'up' : df < d.df ? 'dn' : '';
      st = '<div class="st"><span class="' + ca + '">' + a + '</span><small>DEF <span class="' + cd + '">' + df + '</span></small></div>';
    } else st = '<div class="st ty">' + (d.kind === 'spell' ? 'MAGIA' : 'TRAMPA') + '</div>';
    return '<div class="card k-' + d.kind + ' r-' + d.rar + ' ' + (o.cls || '') + '" data-id="' + id + '" ' + (o.attr || '') + '>' +
      '<div class="nm">' + esc(d.name.replace('El Wero ', '')) + '</div>' +
      (d.kind === 'monster' ? '<div class="lv">' + stars(d.lvl) + '</div>' : '') +
      '<div class="arch">' + W.arch[d.arch].icon + '</div>' +
      '<div class="art">' + artHTML(d) + '</div><span class="rb ' + d.rar + '">' + d.rar + '</span>' + st +
      (o.cnt != null ? '<div class="cnt">x' + o.cnt + '</div>' : '') + (o.extra || '') + '</div>';
  }
  function big(id, o) {
    o = o || {}; var d = DB[id];
    var rc = { N: '#ccc', R: '#dfe7f2', UR: '#ffd24a', L: 'linear-gradient(90deg,#b84dff,#4dd2ff)', UL: 'linear-gradient(90deg,#ff4d4d,#ffd24a,#4dff88,#4dd2ff,#b84dff)' }[d.rar];
    var foot = d.kind === 'monster' ? 'ATK / ' + (o.atk != null ? o.atk : d.atk) + ' &nbsp; DEF / ' + (o.def != null ? o.def : d.df) : (d.kind === 'spell' ? 'MAGIA' : 'TRAMPA');
    var num = parseInt(id.slice(1), 10);
    return '<div class="big k-' + d.kind + ' r-' + d.rar + '"><div class="rtag" style="background:' + rc + ';color:#111">' + RN[d.rar] + '</div>' +
      '<div class="bt">' + esc(d.name.toUpperCase()) + '</div>' +
      '<div class="bs">' + (d.kind === 'monster' ? stars(d.lvl) : W.arch[d.arch].icon) + '</div>' +
      '<div class="ba">' + artHTML(d) + '</div>' +
      '<div class="bn">' + String(num).padStart(3, '0') + '/600</div>' +
      '<div class="bx"><b>[' + esc(E.typeLine(d)) + ']</b><i>' + esc(d.flav) + '</i><p>' + esc(E.cardText(d)) + '</p><div class="bf">' + foot + '</div></div></div>';
  }
  function showCard(id, o, actions) {
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = big(id, o) + '<div class="acts"></div>';
    var acts = m.querySelector('.acts');
    (actions || []).forEach(function (a) { var b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.t; b.onclick = function (ev) { ev.stopPropagation(); m.remove(); a.fn(); }; acts.appendChild(b); });
    var c = document.createElement('button'); c.className = 'btn small'; c.textContent = 'Cerrar'; c.style.width = '100%'; c.onclick = function () { m.remove(); }; acts.appendChild(c);
    m.onclick = function (e) { if (e.target === m) m.remove(); };
    document.body.appendChild(m); FX.sfx.tap();
  }
  function toast(t, ms) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, ms || 1800); }

  var curScreen = 'home';
  function go(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    $('#' + id).classList.add('on'); curScreen = id;
    var r = RENDER[id]; if (r) r();
  }
  // boton "atras" de Android: true = lo manejo yo, false = salir de la app
  window.androidBack = function () {
    var open = document.querySelectorAll('.modal,.sheet');
    if (open.length) { var top = open[open.length - 1]; if (!top.classList.contains('trapq')) { top.remove(); document.querySelectorAll('div[style*="z-index:84"]').forEach(function (x) { x.remove(); }); } return true; }
    if (curScreen === 'game') { if (window.Game && Game.G.sel) { Game.G.sel = null; Game.render(); document.getElementById('help').classList.remove('on'); } return true; }
    if (curScreen === 'deckedit') { go('decks'); return true; }
    if (curScreen !== 'home' && curScreen !== 'starter') { if (curScreen === 'lobby' && window.Net) Net.close(); go('home'); return true; }
    return false;
  };
  function topbar(title, backTo) { return '<div class="topbar"><button class="back" onclick="UI.go(\'' + (backTo || 'home') + '\')">‹</button><h2>' + title + '</h2><div class="coins">🪙 ' + S.coins + '</div></div>'; }

  var RENDER = {};
  RENDER.home = function () {
    if (!S.starter) return go('starter');
    var bg = ['samurai', 'pc_gamer', 'tacos_cantimpalo', 'astronauta', 'formula_1', 'cantante', 'bombero', 'ingeniero'];
    $('#home').innerHTML = '<div class="home-weros">' + bg.map(function (a, i) { return '<img src="art/' + a + '.webp" style="left:' + ((i % 4) * 25 + (i > 3 ? 8 : -4)) + '%;top:' + (i > 3 ? 70 : 2) + '%;animation-delay:-' + i + 's">'; }).join('') + '</div>' +
      '<div class="logo"><div class="suits">♠ ♥ ♦ ♣</div><div class="t1">EL WERO</div><div class="t2">JUEGO DE CARTAS</div></div>' +
      '<div class="menu"><div style="text-align:center;margin-bottom:6px"><span class="coins">🪙 ' + S.coins + '</span> &nbsp; <span class="coins">🏆 ' + S.stats.w + ' · 💀 ' + S.stats.l + '</span></div>' +
      '<button class="btn gold" onclick="UI.cpuMenu()">⚔️ Jugar contra la CPU</button>' +
      '<button class="btn" onclick="UI.go(\'lobby\')">🌐 Multijugador en línea</button>' +
      '<button class="btn" onclick="UI.go(\'decks\')">🃏 Mis decks</button>' +
      '<button class="btn" onclick="UI.go(\'coll\')">📚 Colección (' + (S.opt.free ? 600 : ownedUnique()) + '/600)</button>' +
      '<button class="btn" onclick="UI.go(\'packs\')">🎁 Sobres</button>' +
      '<div style="display:flex;gap:8px"><button class="btn" onclick="UI.go(\'rules\')">📖 Cómo jugar</button><button class="btn" onclick="UI.go(\'settings\')">⚙️ Ajustes</button></div></div>';
  };
  RENDER.starter = function () {
    var h = '<div class="topbar"><h2>Elige tu deck inicial</h2></div><div class="scroll"><p class="muted" style="padding:0 16px">Empiezas con uno de estos 3 decks de 40 cartas. Después consigues más Weros abriendo sobres.</p>';
    Object.keys(W.starters).forEach(function (k) {
      var s = W.starters[k], boss = s.cards.filter(function (id) { return DB[id].rar === 'L'; })[0] || s.cards[0];
      h += '<div class="starter" onclick="UI.pickStarter(\'' + k + '\')">' + mini(boss) + '<div><h3>' + W.arch[k].icon + ' ' + s.name + '</h3><p>' + s.desc + '</p><p style="margin-top:6px;color:#ffd98a;font-weight:800">Toca para elegir</p></div></div>';
    });
    $('#starter').innerHTML = h + '</div>';
  };
  function pickStarter(k) {
    var s = W.starters[k];
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div style="max-width:420px;text-align:center"><h2 style="color:#ffd98a;font-family:Georgia">' + W.arch[k].icon + ' ' + s.name + '</h2><p>' + s.desc + '</p><input id="nmin" placeholder="Tu nombre de jugador" maxlength="16" style="width:100%;padding:12px;border-radius:12px;border:2px solid #e2b25a;background:#0b1830;color:#fff;font-size:18px;text-align:center"></div><div class="acts"><button class="btn gold" id="okst">¡Elegir este deck!</button><button class="btn small" style="width:100%" id="nost">Ver otros</button></div>';
    document.body.appendChild(m);
    m.querySelector('#nmin').value = S.name || '';
    m.querySelector('#nost').onclick = function () { m.remove(); };
    m.querySelector('#okst').onclick = function () {
      S.name = (m.querySelector('#nmin').value || 'Wero').trim().slice(0, 16);
      S.starter = k; s.cards.forEach(function (id) { addCard(id); });
      S.decks.push({ name: s.name, cards: s.cards.slice() }); S.active = S.decks.length - 1; save(); m.remove();
      FX.sfx.win(); toast('¡Bienvenido, ' + S.name + '! Tienes 500 monedas para abrir sobres.', 2600); go('home');
    };
  }

  var F = { arch: '', kind: '', rar: '', own: '', q: '' };
  function filtered() {
    return W.cards.filter(function (c) {
      if (F.arch && c.arch !== F.arch) return false;
      if (F.kind && c.kind !== F.kind) return false;
      if (F.rar && c.rar !== F.rar) return false;
      if (F.own === '1' && !owned(c.id)) return false;
      if (F.own === '0' && owned(c.id)) return false;
      if (F.q && c.name.toLowerCase().indexOf(F.q.toLowerCase()) < 0) return false;
      return true;
    });
  }
  function filterBar() {
    var o = function (v, t, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + t + '</option>'; };
    var h = '<div class="filters"><input placeholder="Buscar…" value="' + esc(F.q) + '" data-f="q" style="width:110px">';
    h += '<select data-f="arch">' + o('', 'Arquetipo', F.arch) + Object.keys(W.arch).map(function (k) { return o(k, W.arch[k].icon + ' ' + W.arch[k].name, F.arch); }).join('') + '</select>';
    h += '<select data-f="kind">' + o('', 'Tipo', F.kind) + o('monster', 'Weros', F.kind) + o('spell', 'Magias', F.kind) + o('trap', 'Trampas', F.kind) + '</select>';
    h += '<select data-f="rar">' + o('', 'Rareza', F.rar) + Object.keys(RN).map(function (k) { return o(k, RN[k], F.rar); }).join('') + '</select>';
    h += '<select data-f="own">' + o('', 'Todas', F.own) + o('1', 'Las tengo', F.own) + o('0', 'Me faltan', F.own) + '</select></div>';
    return h;
  }
  function bindFilters(root, cb) {
    root.querySelectorAll('[data-f]').forEach(function (el) {
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () { F[el.dataset.f] = el.value; cb(); });
    });
  }
  RENDER.coll = function () {
    var root = $('#coll');
    root.innerHTML = topbar('Colección') + filterBar() + '<div class="scroll"><div class="grid" id="cgrid"></div></div>';
    bindFilters(root, drawGrid); drawGrid();
    function drawGrid() {
      var g = $('#cgrid');
      g.innerHTML = filtered().map(function (c) { var n = owned(c.id); return mini(c.id, { cls: n ? '' : 'locked', cnt: n || null }); }).join('') || '<p class="muted">Nada con esos filtros.</p>';
      g.onclick = function (e) { var el = e.target.closest('.card'); if (el) showCard(el.dataset.id); };
    }
  };

  function deckErrors(cards) {
    var errs = [], cnt = {};
    if (cards.length < 40) errs.push('Faltan ' + (40 - cards.length) + ' cartas (mínimo 40).');
    if (cards.length > 60) errs.push('Máximo 60 cartas.');
    cards.forEach(function (id) { cnt[id] = (cnt[id] || 0) + 1; });
    Object.keys(cnt).forEach(function (id) {
      var d = DB[id]; if (!d) return;
      if (cnt[id] > MAXC[d.rar]) errs.push(d.name + ': máximo ' + MAXC[d.rar] + ' copias (' + RN[d.rar] + ').');
      else if (cnt[id] > owned(id)) errs.push('No tienes suficientes copias de ' + d.name + '.');
    });
    return errs;
  }
  RENDER.decks = function () {
    var h = topbar('Mis decks') + '<div class="scroll">';
    S.decks.forEach(function (dk, i) {
      var err = deckErrors(dk.cards), cover = dk.cards.slice().sort(function (a, b) { return RORD[DB[b].rar] - RORD[DB[a].rar]; })[0];
      h += '<div class="dk ' + (i === S.active ? 'act' : '') + '">' + (cover ? mini(cover) : '<div class="card back" style="--w:58px"></div>') +
        '<div class="info"><b>' + esc(dk.name) + '</b><div>' + dk.cards.length + ' cartas · ' + (err.length ? '⚠️ ' + esc(err[0]) : '✅ Listo para jugar') + '</div>' +
        '<button class="btn small gold" onclick="UI.setActive(' + i + ')">' + (i === S.active ? '★ Activo' : 'Usar') + '</button>' +
        '<button class="btn small" onclick="UI.editDeck(' + i + ')">Editar</button>' +
        '<button class="btn small" onclick="UI.dupDeck(' + i + ')">Copiar</button>' +
        (S.decks.length > 1 ? '<button class="btn small red" onclick="UI.delDeck(' + i + ')">🗑</button>' : '') + '</div></div>';
    });
    h += '<div style="padding:10px 12px"><button class="btn gold" onclick="UI.newDeck()">➕ Nuevo deck</button></div></div>';
    $('#decks').innerHTML = h;
  };
  var EDIT = null;
  function editDeck(i) { EDIT = { i: i, name: S.decks[i].name, cards: S.decks[i].cards.slice() }; go('deckedit'); }
  RENDER.deckedit = function () {
    var root = $('#deckedit');
    root.innerHTML = '<div class="topbar"><button class="back" id="dkback">‹</button><h2><input id="dkname" value="' + esc(EDIT.name) + '" style="background:transparent;border:none;border-bottom:1px solid #e2b25a;color:#ffd98a;font:800 18px system-ui;width:100%"></h2><div class="coins" id="dkcount"></div></div>' +
      '<div class="decklist" id="dklist"></div>' + filterBar() + '<div class="scroll"><div class="grid" id="dkgrid"></div></div>' +
      '<div class="deckbar"><button class="btn small" id="dkauto">✨ Auto-armar</button><button class="btn small red" id="dkclear">Vaciar</button><div style="flex:1;font-size:12px;color:#ffb3a8;min-width:100px" id="dkerr"></div><button class="btn small gold" id="dksave">Guardar</button></div>';
    bindFilters(root, drawGrid);
    $('#dkback').onclick = function () { go('decks'); };
    $('#dkname').oninput = function () { EDIT.name = this.value; };
    $('#dkclear').onclick = function () { EDIT.cards = []; drawAll(); };
    $('#dkauto').onclick = function () { var a = F.arch && F.arch !== 'neutral' ? F.arch : bestArch(); EDIT.cards = autoDeck(a); drawAll(); toast('Deck de ' + W.arch[a].name + ' armado con tus mejores cartas'); };
    $('#dksave').onclick = function () {
      var e = deckErrors(EDIT.cards);
      S.decks[EDIT.i] = { name: (EDIT.name || 'Mi deck').slice(0, 24), cards: EDIT.cards.slice() }; save();
      toast(e.length ? 'Guardado, pero aún no está listo: ' + e[0] : '¡Deck guardado y listo!'); go('decks');
    };
    drawAll();
    function drawAll() { drawList(); drawGrid(); }
    function drawList() {
      $('#dklist').innerHTML = EDIT.cards.slice().sort(sortFn).map(function (id) { return mini(id); }).join('') || '<p class="muted" style="margin:30px auto">Toca cartas abajo para agregarlas</p>';
      $('#dklist').onclick = function (e) { var el = e.target.closest('.card'); if (!el) return; var k = EDIT.cards.indexOf(el.dataset.id); if (k >= 0) EDIT.cards.splice(k, 1); FX.sfx.tap(); drawAll(); };
      var m = EDIT.cards.filter(function (id) { return DB[id].kind === 'monster'; }).length;
      $('#dkcount').textContent = EDIT.cards.length + ' (' + m + ' Weros)';
      var e = deckErrors(EDIT.cards); $('#dkerr').textContent = e[0] || '✅ Listo (toca una carta de arriba para quitarla)';
    }
    function drawGrid() {
      var g = $('#dkgrid');
      g.innerHTML = filtered().filter(function (c) { return owned(c.id); }).map(function (c) { var used = EDIT.cards.filter(function (x) { return x === c.id; }).length; return mini(c.id, { cnt: (owned(c.id) - used) + '', cls: used >= Math.min(owned(c.id), MAXC[c.rar]) ? 'locked' : '' }); }).join('') || '<p class="muted">Sin cartas con esos filtros.</p>';
      g.onclick = function (e) {
        var el = e.target.closest('.card'); if (!el) return; var id = el.dataset.id;
        showCard(id, null, [{ t: '➕ Agregar al deck', cls: 'gold', fn: function () {
          var used = EDIT.cards.filter(function (x) { return x === id; }).length;
          if (used >= MAXC[DB[id].rar]) return toast('Máximo ' + MAXC[DB[id].rar] + ' copias de una carta ' + RN[DB[id].rar]);
          if (used >= owned(id)) return toast('No tienes más copias');
          if (EDIT.cards.length >= 60) return toast('Máximo 60 cartas');
          EDIT.cards.push(id); drawAll();
        } }]);
      };
    }
  };
  function sortFn(a, b) { var A = DB[a], B = DB[b], k = { monster: 0, spell: 1, trap: 2 }; return k[A.kind] - k[B.kind] || (B.lvl || 0) - (A.lvl || 0) || RORD[B.rar] - RORD[A.rar] || (a < b ? -1 : 1); }
  function bestArch() {
    var sc = {}; W.cards.forEach(function (d) { var n = owned(d.id); if (n && d.arch !== 'neutral') sc[d.arch] = (sc[d.arch] || 0) + n * (1 + RORD[d.rar]); });
    return Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; })[0] || 'guerreros';
  }
  function autoDeck(arch, pool) {
    pool = pool || owned;
    var cands = W.cards.filter(function (c) { return (c.arch === arch || c.arch === 'neutral') && pool(c.id) > 0; });
    var score = function (c) { return RORD[c.rar] * 400 + (c.atk || 0) + (c.arch === arch ? 300 : 0) + (Object.keys(c.eff || {}).length ? 150 : 0); };
    var taken = {};
    var pick = function (list, n) { var out = []; list.sort(function (a, b) { return score(b) - score(a); }).forEach(function (c) { var k = Math.min(pool(c.id), MAXC[c.rar]) - (taken[c.id] || 0); for (var i = 0; i < k && out.length < n; i++) { out.push(c.id); taken[c.id] = (taken[c.id] || 0) + 1; } }); return out; };
    var d = pick(cands.filter(function (c) { return c.kind === 'monster' && c.lvl <= 4; }), 17)
      .concat(pick(cands.filter(function (c) { return c.kind === 'monster' && c.lvl >= 5 && c.lvl <= 7; }), 4))
      .concat(pick(cands.filter(function (c) { return c.kind === 'monster' && c.lvl >= 8; }), 3))
      .concat(pick(cands.filter(function (c) { return c.kind === 'spell'; }), 9))
      .concat(pick(cands.filter(function (c) { return c.kind === 'trap'; }), 7));
    if (d.length < 40) d = d.concat(pick(W.cards.filter(function (c) { return pool(c.id) > 0; }), 40 - d.length));
    return d.slice(0, 40);
  }
  function cpuDeck(level) {
    var arches = Object.keys(W.arch).filter(function (k) { return k !== 'neutral'; });
    var arch = arches[Math.floor(Math.random() * arches.length)];
    var allow = level === 0 ? { N: 1, R: 1 } : level === 1 ? { N: 1, R: 1, UR: 1 } : { N: 1, R: 1, UR: 1, L: 1, UL: 1 };
    return { arch: arch, cards: autoDeck(arch, function (id) { return allow[DB[id].rar] ? 3 : 0; }) };
  }

  RENDER.packs = function () {
    var h = topbar('Sobres') + '<div class="scroll" style="text-align:center">' +
      '<div class="pack"><div class="ptop"></div><div class="pimg"></div><div class="plbl">Sobre General</div></div>' +
      '<p class="muted" style="padding:0 16px">9 cartas: 5 Normales, 2 Raras, 1 Rara o Ultra Rara y 1 brillante (Ultra Rara, Legendaria o Ultra Legendaria).</p>' +
      '<div style="padding:0 16px"><button class="btn gold" onclick="UI.buyPack(\'\')">Abrir sobre · 🪙 100</button></div><h3 style="color:#ffd98a;font-family:Georgia;margin-top:24px">Sobres de arquetipo · 🪙 150</h3><div style="padding:0 12px 30px">';
    Object.keys(W.arch).forEach(function (k) { if (k === 'neutral') return; h += '<button class="btn" style="border-color:' + W.arch[k].color + '" onclick="UI.buyPack(\'' + k + '\')">' + W.arch[k].icon + ' ' + W.arch[k].name + '</button>'; });
    $('#packs').innerHTML = h + '</div></div>';
  };
  function rollPack(arch) {
    var pool = W.cards.filter(function (c) { return !arch || c.arch === arch || c.arch === 'neutral'; });
    var by = function (r) { var l = pool.filter(function (c) { return c.rar === r; }); return l[Math.floor(Math.random() * l.length)].id; };
    var out = [], i;
    for (i = 0; i < 5; i++) out.push(by('N'));
    out.push(by('R')); out.push(by('R'));
    out.push(by(Math.random() < .3 ? 'UR' : 'R'));
    var x = Math.random(); out.push(by(x < .08 ? 'UL' : x < .3 ? 'L' : 'UR'));
    return out;
  }
  function buyPack(arch) {
    var cost = arch ? 150 : 100;
    if (S.coins < cost && !S.opt.free) return toast('Te faltan monedas. ¡Gana partidas para conseguir más!');
    if (!S.opt.free) S.coins -= cost;
    var cards = rollPack(arch); var isNew = cards.map(function (id) { return !S.coll[id]; });
    cards.forEach(function (id) { addCard(id); }); save();
    var m = document.createElement('div'); m.className = 'modal';
    var col = arch ? W.arch[arch].color : '';
    m.innerHTML = '<div class="pack ' + (arch ? 'arch' : '') + '" style="--pc:' + col + '"><div class="ptop"></div><div class="pimg"></div><div class="plbl">' + (arch ? W.arch[arch].icon + ' ' + W.arch[arch].name : 'Sobre General') + '</div></div><p class="muted">Toca el sobre para abrirlo</p>';
    document.body.appendChild(m);
    var pk = m.querySelector('.pack');
    pk.onclick = function () {
      pk.onclick = null; FX.sfx.whoosh(); pk.classList.add('shakeit');
      setTimeout(function () {
        pk.classList.add('open'); FX.flash(); FX.sfx.big();
        setTimeout(function () {
          m.innerHTML = '<div class="pull">' + cards.map(function (id, i) { var d = DB[id]; return '<div class="slotp">' + (isNew[i] ? '<span class="newtag" style="display:none">NUEVA</span>' : '') + '<div class="flip g-' + d.rar + '" data-i="' + i + '" style="animation-delay:' + (i * .07) + 's"><div class="f1"></div><div class="f2">' + mini(id) + '</div></div></div>'; }).join('') + '</div><p class="muted">Toca cada carta para voltearla</p><div class="acts"><button class="btn" id="flipall">Voltear todas</button><button class="btn gold" id="pkok">Listo</button></div>';
          var flipOne = function (el) {
            if (el.classList.contains('done')) { showCard(cards[+el.dataset.i]); return; }
            el.classList.add('done'); var d = DB[cards[+el.dataset.i]];
            var nt = el.parentNode.querySelector('.newtag'); if (nt) nt.style.display = 'block';
            FX.sfx.rare(d.rar);
            if (RORD[d.rar] >= 2) { var c = FX.center(el); FX.rays(c.x, c.y, d.rar === 'UR' ? '#ffd24a' : d.rar === 'L' ? '#c86bff' : '#ffffff'); FX.burst(c.x, c.y, d.rar === 'UL' ? 120 : 50, d.rar === 'UL' ? ['#ff4d4d', '#ffd24a', '#4dff88', '#4dd2ff', '#b84dff'] : null, 9); }
            if (d.rar === 'UL') { FX.flash(); FX.banner('¡ULTRA LEGENDARIA!', 'gold', 1800); FX.vib([80, 40, 120]); }
            else if (d.rar === 'L') { FX.banner('¡LEGENDARIA!', 'gold', 1500); FX.vib(60); }
          };
          m.querySelectorAll('.flip').forEach(function (el) { el.onclick = function () { flipOne(el); }; });
          m.querySelector('#flipall').onclick = function () { m.querySelectorAll('.flip:not(.done)').forEach(function (el, i) { setTimeout(function () { flipOne(el); }, i * 160); }); };
          m.querySelector('#pkok').onclick = function () { m.remove(); go('packs'); };
        }, 450);
      }, 1000);
    };
    RENDER.packs();
  }

  RENDER.rules = function () {
    $('#rules').innerHTML = topbar('Cómo jugar') + '<div class="scroll rules">' +
      '<h3>🎯 Objetivo</h3>Cada jugador empieza con <b>8000 LP</b>. Gana quien deje al rival en 0, o si el rival ya no puede robar carta.' +
      '<h3>🔄 Tu turno</h3>Robas 1 carta (quien empieza no roba ni ataca en su primer turno). Luego: <b>Principal</b> → <b>Batalla</b> → <b>Principal 2</b> → <b>Fin</b>.' +
      '<h3>⭐ Invocar Weros</h3>Una invocación normal por turno. <b>1 a 4 estrellas</b>: sin sacrificio. <b>5 a 7 estrellas</b>: sacrificas 1 Wero tuyo. <b>8 a 10 estrellas</b>: sacrificas 2. Puedes invocarlo en ataque o colocarlo boca abajo en defensa.' +
      '<h3>⚔️ Batalla</h3>Ataque contra ataque: el de menor ATK se destruye y su dueño recibe la diferencia. Contra un Wero en defensa: si tu ATK es mayor lo destruyes (sin daño, salvo perforante); si es menor, tú recibes la diferencia. Si el rival no tiene Weros, atacas directo.' +
      '<h3>✨ Magias</h3>Se activan en tu fase principal. Las <b>de equipo</b> se quedan pegadas a un Wero; las <b>de campo</b> dan poder a tu arquetipo mientras sigan en el campo.' +
      '<h3>🪤 Trampas</h3>Se colocan boca abajo y funcionan desde el turno siguiente, cuando el rival ataca o invoca. ¡El juego te pregunta en ese momento!' +
      '<h3>💎 Rarezas</h3><b>Normal</b>, <b>Rara</b>, <b>Ultra Rara</b>, <b>Legendaria</b> y <b>Ultra Legendaria</b>. Máximo 3 copias por carta, 2 de las Legendarias y 1 de las Ultra Legendarias. Decks de 40 a 60 cartas.' +
      '<h3>🧩 Arquetipos</h3>' + Object.keys(W.arch).filter(function (k) { return k !== 'neutral'; }).map(function (k) { return W.arch[k].icon + ' <b>' + W.arch[k].name + '</b>'; }).join(' · ') + '. Muchas cartas se potencian con Weros del mismo arquetipo: júntalos para hacer combos.' +
      '<h3>🌐 Multijugador</h3>Uno crea la sala y le pasa el código de 4 letras al otro. Cada quien juega con su deck activo.</div>';
  };
  RENDER.settings = function () {
    $('#settings').innerHTML = topbar('Ajustes') + '<div class="scroll settings">' +
      '<label>Nombre <input id="opname" value="' + esc(S.name) + '" maxlength="16" style="background:#0b1830;color:#fff;border:1px solid #e2b25a;border-radius:8px;padding:6px;width:50%"></label>' +
      '<label>Sonido <input type="checkbox" id="opsound" ' + (S.opt.sound ? 'checked' : '') + '></label>' +
      '<label>Vibración <input type="checkbox" id="opvibe" ' + (S.opt.vibe ? 'checked' : '') + '></label>' +
      '<label>Animaciones rápidas <input type="checkbox" id="opfast" ' + (S.opt.speed > 1 ? 'checked' : '') + '></label>' +
      '<label>Modo libre: todas las 600 cartas (para probar) <input type="checkbox" id="opfree" ' + (S.opt.free ? 'checked' : '') + '></label>' +
      '<div style="padding:12px"><button class="btn red" id="opreset">Borrar progreso</button></div></div>';
    $('#opname').oninput = function () { S.name = this.value.slice(0, 16); save(); };
    $('#opsound').onchange = function () { S.opt.sound = this.checked; applyOpt(); save(); };
    $('#opvibe').onchange = function () { S.opt.vibe = this.checked; applyOpt(); save(); };
    $('#opfast').onchange = function () { S.opt.speed = this.checked ? 2 : 1; applyOpt(); save(); };
    $('#opfree').onchange = function () { S.opt.free = this.checked; save(); };
    $('#opreset').onclick = function () { if (confirm('¿Seguro? Se borran tus cartas, decks y monedas.')) { localStorage.removeItem('elwero_save'); load(); go('home'); } };
  };

  function activeDeck() { var d = S.decks[S.active]; return d && !deckErrors(d.cards).length ? d : null; }
  function cpuMenu() {
    var d = activeDeck(); if (!d) { toast('Tu deck activo no está completo. Revísalo en Mis decks.'); return go('decks'); }
    var m = document.createElement('div'); m.className = 'sheet';
    m.innerHTML = '<h3>Elige al rival</h3><div class="desc">Juegas con: <b>' + esc(d.name) + '</b></div>' +
      '<button class="btn" data-l="0">😊 Fácil · gana 🪙 80</button><button class="btn" data-l="1">😎 Normal · gana 🪙 150</button><button class="btn gold" data-l="2">🔥 Difícil · gana 🪙 250</button><button class="btn small" style="width:100%" data-l="x">Cancelar</button>';
    document.body.appendChild(m);
    m.onclick = function (e) {
      var b = e.target.closest('[data-l]'); if (!b) return; m.remove(); if (b.dataset.l === 'x') return;
      var lv = +b.dataset.l, cd = cpuDeck(lv);
      Game.startCPU({ me: S.name || 'Tú', deck: d.cards, cpuName: 'CPU ' + W.arch[cd.arch].icon + ' ' + W.arch[cd.arch].name, cpuDeck: cd.cards, level: lv });
    };
  }
  function reward(win, mode, level) {
    var c = mode === 'cpu' ? (win ? [80, 150, 250][level] : 30) : (win ? 200 : 60);
    S.coins += c; if (win) S.stats.w++; else S.stats.l++; save(); return c;
  }

  RENDER.lobby = function () {
    var d = activeDeck();
    $('#lobby').innerHTML = topbar('Multijugador') + '<div class="scroll"><div class="lobby">' +
      '<p class="muted">Juega contra otro teléfono por internet. Cada uno usa su deck activo.</p>' +
      '<p>Tu deck: <b style="color:#ffd98a">' + (d ? esc(d.name) : '⚠️ incompleto, revisa Mis decks') + '</b></p>' +
      '<button class="btn gold" id="lbhost"' + (d ? '' : ' disabled') + '>🏠 Crear sala</button>' +
      '<div style="margin:18px 0 6px;text-align:center;color:#ffd98a;font-weight:800">— o únete con un código —</div>' +
      '<input id="lbcode" class="codein" maxlength="4" placeholder="CÓDIGO" autocomplete="off"><button class="btn" id="lbjoin"' + (d ? '' : ' disabled') + '>🔗 Unirme</button>' +
      '<div id="lbstatus" style="margin-top:16px;text-align:center"></div></div></div>';
    $('#lbhost').onclick = function () { Net.host(S.name || 'Wero', d.cards, lobbyStatus); };
    $('#lbjoin').onclick = function () { var c = $('#lbcode').value.trim().toUpperCase(); if (c.length !== 4) return toast('El código tiene 4 letras'); Net.join(c, S.name || 'Wero', d.cards, lobbyStatus); };
  };
  function lobbyStatus(html) { var el = $('#lbstatus'); if (el) el.innerHTML = html; }

  window.UI = { go: go, mini: mini, big: big, showCard: showCard, toast: toast, DB: DB, RN: RN, RORD: RORD, artURL: artURL, pickStarter: pickStarter,
    setActive: function (i) { S.active = i; save(); RENDER.decks(); },
    editDeck: editDeck, newDeck: function () { S.decks.push({ name: 'Deck ' + (S.decks.length + 1), cards: [] }); save(); editDeck(S.decks.length - 1); },
    dupDeck: function (i) { S.decks.push({ name: S.decks[i].name + ' (copia)', cards: S.decks[i].cards.slice() }); save(); RENDER.decks(); },
    delDeck: function (i) { if (!confirm('¿Borrar "' + S.decks[i].name + '"?')) return; S.decks.splice(i, 1); S.active = Math.min(S.active, S.decks.length - 1); save(); RENDER.decks(); },
    buyPack: buyPack, cpuMenu: cpuMenu, reward: reward, save: save, state: function () { return S; }, esc: esc, autoDeck: autoDeck, cpuDeck: cpuDeck, deckErrors: deckErrors };

  document.addEventListener('DOMContentLoaded', function () {
    load();
    document.body.addEventListener('pointerdown', function () { FX.unlock(); }, { once: true });
    go('home');
  });
})();
