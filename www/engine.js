/* EL WERO — motor de reglas (deterministico, sirve para CPU y multijugador) */
(function (root) {
  'use strict';
  var DB = {};
  function setDB(cards) { DB = {}; cards.forEach(function (c) { DB[c.id] = c; }); }
  function def(st, uid) { return DB[st.c[uid].id]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function rnd(st) { // mulberry32
    var t = (st.rng = (st.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(st, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd(st) * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  // 1-4 estrellas: sin sacrificio; 5-7: 1 sacrificio; 8-10: 2 sacrificios
  function tributesFor(lvl) { return lvl <= 4 ? 0 : (lvl <= 7 ? 1 : 2); }

  function create(opts) {
    var st = { v: 1, rng: (opts.seed | 0) || 12345, turn: 1, cur: opts.first || 0, phase: 'main1', winner: null,
      p: [], c: {}, next: 1, pending: null, log: [] };
    opts.players.forEach(function (pl, i) {
      var P = { name: pl.name || ('Jugador ' + (i + 1)), lp: 8000, deck: [], hand: [], gy: [], mz: [null, null, null, null, null], sz: [null, null, null, null, null], normalDone: false };
      pl.deck.forEach(function (id) { if (!DB[id]) return; var u = 'u' + (st.next++); st.c[u] = newInst(u, id, i); P.deck.push(u); });
      st.p.push(P);
    });
    st.p.forEach(function (P) { shuffle(st, P.deck); });
    var ev = [];
    for (var k = 0; k < 5; k++) { drawOne(st, 0, ev, true); drawOne(st, 1, ev, true); }
    return st;
  }
  function newInst(u, id, owner) { return { uid: u, id: id, o: owner, pos: 'atk', up: true, aB: 0, dB: 0, tA: 0, tD: 0, grow: 0, sumT: 0, posT: 0, setT: 0, atks: 0, shUsed: false, eq: [], eqOf: null }; }

  function opp(p) { return 1 - p; }
  function zoneOf(st, uid) {
    for (var p = 0; p < 2; p++) {
      var i = st.p[p].mz.indexOf(uid); if (i >= 0) return { p: p, z: 'mz', i: i };
      i = st.p[p].sz.indexOf(uid); if (i >= 0) return { p: p, z: 'sz', i: i };
    }
    return null;
  }
  function monsters(st, p) { return st.p[p].mz.filter(function (u) { return u; }); }
  function stCards(st, p) { return st.p[p].sz.filter(function (u) { return u; }); }
  function hasKw(st, uid, kw) {
    var d = def(st, uid); if (d.eff && d.eff[kw]) return true;
    var c = st.c[uid];
    for (var i = 0; i < c.eq.length; i++) { var e = def(st, c.eq[i]).eff[0]; if (e[kw]) return true; }
    return false;
  }
  function staticBonus(st, uid, which) {
    var c = st.c[uid], d = def(st, uid), p = c.o, b = 0;
    if (!c.up) return 0;
    var mine = monsters(st, p);
    if (which === 'a') {
      mine.forEach(function (u) {
        if (u === uid || !st.c[u].up) return;
        var dd = def(st, u);
        if (dd.eff && dd.eff.aura && dd.arch === d.arch) b += dd.eff.aura;
      });
      if (d.eff && d.eff.synergy) {
        var n = mine.filter(function (u) { return u !== uid && st.c[u].up && def(st, u).arch === d.arch; }).length;
        b += n * d.eff.synergy;
      }
    }
    stCards(st, p).forEach(function (u) {
      var sc = st.c[u]; if (!sc.up) return; var dd = def(st, u);
      if (dd.kind === 'spell' && dd.sub === 'campo') { var e = dd.eff[0]; if (e.all || dd.arch === d.arch) b += (which === 'a' ? e.atk : e.def); }
    });
    c.eq.forEach(function (u) { var e = def(st, u).eff[0]; b += (which === 'a' ? e.atk : e.def) || 0; });
    return b;
  }
  function atkOf(st, uid) { var c = st.c[uid]; return Math.max(0, def(st, uid).atk + c.aB + c.tA + staticBonus(st, uid, 'a')); }
  function defOf(st, uid) { var c = st.c[uid]; return Math.max(0, def(st, uid).df + c.dB + c.tD + staticBonus(st, uid, 'd')); }

  function emit(st, ev, e) { e.snap = clone(st); ev.push(e); }
  function logm(st, s) { st.log.push(s); if (st.log.length > 60) st.log.shift(); }

  function drawOne(st, p, ev, silent) {
    var P = st.p[p];
    if (!P.deck.length) { if (!silent && st.winner === null) { st.winner = opp(p); logm(st, P.name + ' se quedó sin cartas.'); emit(st, ev, { t: 'win', p: opp(p), why: 'deck' }); } return false; }
    var u = P.deck.shift(); P.hand.push(u);
    if (!silent) emit(st, ev, { t: 'draw', p: p, uid: u });
    return true;
  }
  function damage(st, p, n, ev, src) {
    if (n <= 0 || st.winner !== null) return;
    st.p[p].lp = Math.max(0, st.p[p].lp - n);
    logm(st, st.p[p].name + ' recibe ' + n + ' de daño.');
    emit(st, ev, { t: 'damage', p: p, n: n, lp: st.p[p].lp, src: src || '' });
    if (st.p[p].lp <= 0) { st.winner = opp(p); emit(st, ev, { t: 'win', p: opp(p), why: 'lp' }); }
  }
  function heal(st, p, n, ev) { if (st.winner !== null) return; st.p[p].lp += n; logm(st, st.p[p].name + ' recupera ' + n + ' LP.'); emit(st, ev, { t: 'heal', p: p, n: n, lp: st.p[p].lp }); }

  function toGY(st, uid) {
    var c = st.c[uid], z = zoneOf(st, uid);
    if (z) st.p[z.p][z.z][z.i] = null;
    var h = st.p[c.o].hand.indexOf(uid); if (h >= 0) st.p[c.o].hand.splice(h, 1);
    if (c.eqOf && st.c[c.eqOf]) { var m = st.c[c.eqOf]; m.eq = m.eq.filter(function (x) { return x !== uid; }); }
    var eqs = c.eq.slice(); c.eq = []; c.eqOf = null;
    resetInst(c);
    st.p[c.o].gy.push(uid);
    eqs.forEach(function (e) { if (zoneOf(st, e)) toGY(st, e); });
  }
  function resetInst(c) { c.aB = 0; c.dB = 0; c.tA = 0; c.tD = 0; c.grow = 0; c.atks = 0; c.shUsed = false; c.pos = 'atk'; c.up = true; }

  function destroy(st, uid, ev, how, quiet) {
    var z = zoneOf(st, uid); if (!z) return;
    var d = def(st, uid), c = st.c[uid];
    emit(st, ev, { t: 'destroy', p: z.p, z: z.z, i: z.i, id: c.id, up: c.up, quiet: !!quiet, how: how });
    toGY(st, uid);
    logm(st, d.name + ' fue destruido.');
    emit(st, ev, { t: 'gy', p: c.o, id: c.id });
    if (d.kind === 'monster' && d.eff && st.winner === null) {
      if (d.eff.deathDraw) for (var k = 0; k < d.eff.deathDraw; k++) drawOne(st, c.o, ev);
      if (d.eff.deathRecruit) recruitFromDeck(st, c.o, d.arch, d.eff.deathRecruit, ev);
    }
  }
  function freeZone(st, p, z) { return st.p[p][z].indexOf(null); }

  function placeMonster(st, p, uid, pos, up, ev, how, trib) {
    var i = freeZone(st, p, 'mz'); if (i < 0) return false;
    var P = st.p[p], h = P.hand.indexOf(uid); if (h >= 0) P.hand.splice(h, 1);
    var g = P.gy.indexOf(uid); if (g >= 0) P.gy.splice(g, 1);
    var dk = P.deck.indexOf(uid); if (dk >= 0) P.deck.splice(dk, 1);
    var c = st.c[uid]; resetInst(c); c.pos = pos; c.up = up; c.sumT = st.turn; c.posT = 0;
    P.mz[i] = uid;
    emit(st, ev, { t: 'summon', p: p, i: i, id: c.id, uid: uid, up: up, how: how, trib: trib || [] });
    if (up) logm(st, P.name + ' invoca ' + def(st, uid).name + '.');
    return true;
  }

  function recruitFromDeck(st, p, arch, maxLvl, ev) {
    if (freeZone(st, p, 'mz') < 0) return;
    var best = null;
    st.p[p].deck.forEach(function (u) { var d = def(st, u); if (d.kind === 'monster' && d.lvl <= maxLvl && d.arch === arch) { if (!best || d.atk > def(st, best).atk) best = u; } });
    if (best && placeMonster(st, p, best, 'atk', true, ev, 'special')) { shuffle(st, st.p[p].deck); onSummon(st, best, ev); }
  }

  function strongestEnemy(st, p, max, faceUpOnly) {
    var best = null, bv = -1;
    monsters(st, opp(p)).forEach(function (u) {
      if (faceUpOnly && !st.c[u].up) return;
      var a = atkOf(st, u); if (max != null && a > max) return;
      if (a > bv) { bv = a; best = u; }
    });
    return best;
  }
  function archOk(sd, dd, useArch) { return !useArch || sd.arch === 'neutral' || dd.arch === sd.arch; }
  function runOps(st, p, src, ops, ev, ctx) {
    ctx = ctx || {};
    var sd = DB[st.c[src].id];
    for (var k = 0; k < ops.length; k++) {
      if (st.winner !== null) return ctx;
      var o = ops[k], u, n, zz;
      switch (o.op) {
        case 'draw': for (n = 0; n < o.n; n++) drawOne(st, p, ev); break;
        case 'heal': heal(st, p, o.n, ev); break;
        case 'burn': damage(st, opp(p), o.n, ev, 'burn'); break;
        case 'debuffStrongest': u = strongestEnemy(st, p, null, true); if (u) { st.c[u].aB -= o.n; zz = zoneOf(st, u); emit(st, ev, { t: 'buff', p: zz.p, i: zz.i, n: -o.n }); } break;
        case 'debuffAll': monsters(st, opp(p)).forEach(function (m) { if (!st.c[m].up) return; st.c[m].aB -= o.n; var z2 = zoneOf(st, m); emit(st, ev, { t: 'buff', p: z2.p, i: z2.i, n: -o.n }); }); break;
        case 'destroyStrongest': u = strongestEnemy(st, p, o.max, false); if (u) destroy(st, u, ev, 'effect'); break;
        case 'destroyAllEnemyMonsters': monsters(st, opp(p)).forEach(function (m) { if (zoneOf(st, m)) destroy(st, m, ev, 'effect'); }); break;
        case 'destroyAllMonsters': monsters(st, p).concat(monsters(st, opp(p))).forEach(function (m) { if (zoneOf(st, m)) destroy(st, m, ev, 'effect'); }); break;
        case 'destroyDefEnemies': monsters(st, opp(p)).forEach(function (m) { if (zoneOf(st, m) && st.c[m].pos === 'def') destroy(st, m, ev, 'effect'); }); break;
        case 'destroyEnemyST':
          var list = stCards(st, opp(p)).sort(function (a, b) { return (st.c[a].up ? 1 : 0) - (st.c[b].up ? 1 : 0); });
          list.slice(0, o.n).forEach(function (s) { if (zoneOf(st, s)) destroy(st, s, ev, 'effect'); });
          break;
        case 'searchArch':
          var best = null;
          st.p[p].deck.forEach(function (d) { var dd = def(st, d); if (dd.kind === 'monster' && dd.lvl <= o.maxLvl && archOk(sd, dd, true)) { var bd = best && def(st, best); if (!best || dd.lvl > bd.lvl || (dd.lvl === bd.lvl && dd.atk > bd.atk)) best = d; } });
          if (best) { st.p[p].deck.splice(st.p[p].deck.indexOf(best), 1); st.p[p].hand.push(best); shuffle(st, st.p[p].deck); emit(st, ev, { t: 'search', p: p, id: st.c[best].id, uid: best }); }
          break;
        case 'reviveBest':
          if (freeZone(st, p, 'mz') < 0) break;
          var rb = null;
          st.p[p].gy.forEach(function (g) { var dd = def(st, g); if (dd.kind === 'monster' && dd.lvl <= o.maxLvl && archOk(sd, dd, o.arch)) { if (!rb || dd.atk > def(st, rb).atk) rb = g; } });
          if (rb && placeMonster(st, p, rb, 'atk', true, ev, 'revive')) onSummon(st, rb, ev);
          break;
        case 'teamBuff': monsters(st, p).forEach(function (m) { if (!st.c[m].up) return; st.c[m].tA += o.n; var z3 = zoneOf(st, m); emit(st, ev, { t: 'buff', p: z3.p, i: z3.i, n: o.n }); }); break;
        case 'ssFromHand':
          if (freeZone(st, p, 'mz') < 0) break;
          var hb = null;
          st.p[p].hand.forEach(function (h) { var dd = def(st, h); if (dd.kind === 'monster' && dd.lvl <= o.maxLvl && archOk(sd, dd, o.arch)) { if (!hb || dd.atk > def(st, hb).atk) hb = h; } });
          if (hb && placeMonster(st, p, hb, 'atk', true, ev, 'special')) onSummon(st, hb, ev);
          break;
        case 'negate': ctx.negated = true; break;
        case 'negateEnd': ctx.negated = true; ctx.endBattle = true; break;
        case 'destroyAttacker': if (ctx.attacker && zoneOf(st, ctx.attacker)) { destroy(st, ctx.attacker, ev, 'effect'); ctx.negated = true; } break;
        case 'debuffAttacker': if (ctx.attacker && zoneOf(st, ctx.attacker)) { st.c[ctx.attacker].aB -= o.n; zz = zoneOf(st, ctx.attacker); emit(st, ev, { t: 'buff', p: zz.p, i: zz.i, n: -o.n }); } break;
        case 'reflectHalf': if (ctx.attacker && zoneOf(st, ctx.attacker)) damage(st, opp(p), Math.floor(atkOf(st, ctx.attacker) / 100) * 50, ev, 'reflect'); break;
        case 'destroyAllAtkEnemies': monsters(st, opp(p)).forEach(function (m) { if (zoneOf(st, m) && st.c[m].pos === 'atk') destroy(st, m, ev, 'effect'); }); ctx.negated = true; break;
        case 'destroySummoned': if (ctx.summoned && zoneOf(st, ctx.summoned)) destroy(st, ctx.summoned, ev, 'effect'); break;
        case 'debuffSummoned': if (ctx.summoned && zoneOf(st, ctx.summoned)) { st.c[ctx.summoned].aB -= o.n; zz = zoneOf(st, ctx.summoned); emit(st, ev, { t: 'buff', p: zz.p, i: zz.i, n: -o.n }); } break;
      }
    }
    return ctx;
  }
  function onSummon(st, uid, ev) {
    var d = def(st, uid);
    if (d.eff && d.eff.onSummon && st.c[uid].up && st.winner === null) {
      var z = zoneOf(st, uid);
      emit(st, ev, { t: 'effect', p: z.p, i: z.i, id: d.id });
      runOps(st, st.c[uid].o, uid, d.eff.onSummon, ev);
    }
  }

  function canNormal(st, p) { return st.cur === p && !st.pending && st.winner === null && (st.phase === 'main1' || st.phase === 'main2'); }
  function summonOptions(st, p, uid) {
    var d = def(st, uid); var need = tributesFor(d.lvl);
    var mine = monsters(st, p);
    return { need: need, ok: canNormal(st, p) && !st.p[p].normalDone && st.p[p].hand.indexOf(uid) >= 0 && d.kind === 'monster' && mine.length >= need && (need > 0 || freeZone(st, p, 'mz') >= 0) };
  }
  function attackTargets(st, p, uid) {
    var en = monsters(st, opp(p));
    var taunts = en.filter(function (u) { return st.c[u].up && def(st, u).eff && def(st, u).eff.taunt; });
    var t = taunts.length ? taunts : en;
    var direct = en.length === 0 || (hasKw(st, uid, 'direct') && !taunts.length);
    return { targets: t, direct: direct };
  }
  function canAttack(st, p, uid) {
    if (st.cur !== p || st.phase !== 'battle' || st.pending || st.winner !== null) return false;
    var c = st.c[uid], z = c && zoneOf(st, uid); if (!c || c.o !== p || !z || z.z !== 'mz') return false;
    if (c.pos !== 'atk' || !c.up) return false;
    var max = hasKw(st, uid, 'double') ? 2 : 1;
    return c.atks < max;
  }
  function eligibleTraps(st, p, trig, ctx) {
    var out = [];
    st.p[p].sz.forEach(function (u) {
      if (!u) return; var c = st.c[u], d = def(st, u);
      if (d.kind !== 'trap' || c.up || c.setT >= st.turn || d.trig !== trig) return;
      if (trig === 'summon') { var e = d.eff[0]; if (e.op === 'destroySummoned' && atkOf(st, ctx.summoned) < e.minAtk) return; }
      out.push(u);
    });
    return out;
  }

  function apply(st, p, a) {
    var ev = [];
    var r;
    try { r = doAct(st, p, a, ev); } catch (e) { return { ok: false, err: 'Error: ' + e.message, ev: [] }; }
    if (r) return { ok: false, err: r, ev: [] };
    return { ok: true, ev: ev };
  }
  function doAct(st, p, a, ev) {
    if (st.winner !== null) return 'La partida terminó.';
    var P = st.p[p], c, d, z;
    if (a.type === 'surrender') { st.winner = opp(p); st.pending = null; emit(st, ev, { t: 'win', p: opp(p), why: 'surrender' }); return; }
    if (st.pending) {
      if (a.type !== 'trapResp' || st.pending.p !== p) return 'Esperando respuesta de trampa.';
      return resolvePending(st, a.uid || null, ev);
    }
    switch (a.type) {
      case 'summon': {
        var opt = summonOptions(st, p, a.uid); if (!opt.ok) return 'No se puede invocar.';
        var trib = (a.trib || []).filter(function (u, i, arr) { return arr.indexOf(u) === i && P.mz.indexOf(u) >= 0; });
        if (trib.length !== opt.need) return 'Necesitas ' + opt.need + ' sacrificio(s).';
        var tinfo = trib.map(function (u) { var zz = zoneOf(st, u); return { p: p, i: zz.i, id: st.c[u].id }; });
        trib.forEach(function (u) { toGY(st, u); });
        if (tinfo.length) emit(st, ev, { t: 'tribute', p: p, list: tinfo });
        P.normalDone = true;
        var set = !!a.set;
        placeMonster(st, p, a.uid, set ? 'def' : 'atk', !set, ev, trib.length ? 'tribute' : 'normal', tinfo);
        if (set) { logm(st, P.name + ' coloca un Wero boca abajo.'); return; }
        onSummon(st, a.uid, ev);
        if (st.winner !== null || !zoneOf(st, a.uid)) return;
        var tr = eligibleTraps(st, opp(p), 'summon', { summoned: a.uid });
        if (tr.length) st.pending = { p: opp(p), trig: 'summon', summoned: a.uid, opts: tr };
        return;
      }
      case 'setST': {
        if (!canNormal(st, p)) return 'Ahora no.';
        if (P.hand.indexOf(a.uid) < 0) return 'No está en tu mano.';
        d = def(st, a.uid); if (d.kind === 'monster') return 'Los Weros se colocan con Invocar.';
        var i = freeZone(st, p, 'sz'); if (i < 0) return 'No hay espacio de magia/trampa.';
        P.hand.splice(P.hand.indexOf(a.uid), 1); P.sz[i] = a.uid; c = st.c[a.uid]; c.up = false; c.setT = st.turn;
        emit(st, ev, { t: 'set', p: p, i: i, id: c.id });
        return;
      }
      case 'activate': {
        if (!canNormal(st, p)) return 'Ahora no.';
        c = st.c[a.uid]; if (!c || c.o !== p) return 'No es tu carta.';
        d = def(st, a.uid); if (d.kind !== 'spell') return 'Solo las magias se activan así.';
        z = zoneOf(st, a.uid); var inHand = P.hand.indexOf(a.uid) >= 0;
        if (!inHand && !(z && z.z === 'sz' && !c.up)) return 'No se puede activar.';
        var e0 = d.eff[0], persistent = d.sub === 'equipo' || d.sub === 'campo';
        var target = null;
        if (d.sub === 'equipo') {
          target = a.target && P.mz.indexOf(a.target) >= 0 && st.c[a.target].up ? a.target : null;
          if (!target) { var mm = monsters(st, p).filter(function (u) { return st.c[u].up; }); if (!mm.length) return 'Necesitas un Wero boca arriba para equipar.'; target = mm.sort(function (x, y) { return atkOf(st, y) - atkOf(st, x); })[0]; }
        }
        var si;
        if (inHand) { si = freeZone(st, p, 'sz'); if (si < 0) return 'No hay espacio de magia/trampa.'; P.hand.splice(P.hand.indexOf(a.uid), 1); P.sz[si] = a.uid; }
        else si = z.i;
        c.up = true;
        emit(st, ev, { t: 'activate', p: p, i: si, id: c.id, kind: 'spell' });
        logm(st, P.name + ' activa ' + d.name + '.');
        if (d.sub === 'equipo') {
          c.eqOf = target; st.c[target].eq.push(a.uid);
          var zt = zoneOf(st, target); emit(st, ev, { t: 'buff', p: p, i: zt.i, n: e0.atk || e0.def || 0, eq: true });
        } else if (d.sub === 'campo') {
          emit(st, ev, { t: 'field', p: p, id: c.id });
        } else {
          runOps(st, p, a.uid, d.eff, ev);
        }
        if (!persistent && zoneOf(st, a.uid)) { toGY(st, a.uid); emit(st, ev, { t: 'gy', p: p, id: c.id }); }
        return;
      }
      case 'changePos': {
        if (!canNormal(st, p)) return 'Ahora no.';
        c = st.c[a.uid]; z = c && zoneOf(st, a.uid); if (!c || !z || z.p !== p || z.z !== 'mz') return 'No es tu Wero.';
        if (c.sumT === st.turn || c.posT === st.turn) return 'Ya no puede cambiar de posición este turno.';
        c.posT = st.turn;
        if (!c.up) { c.up = true; c.pos = 'atk'; emit(st, ev, { t: 'flip', p: p, i: z.i, id: c.id }); onSummon(st, a.uid, ev); }
        else { c.pos = c.pos === 'atk' ? 'def' : 'atk'; emit(st, ev, { t: 'pos', p: p, i: z.i, id: c.id, pos: c.pos }); }
        return;
      }
      case 'phase': {
        if (st.cur !== p) return 'No es tu turno.';
        if (st.phase === 'main1') {
          if (st.turn === 1) return 'En el primer turno no se puede atacar.';
          st.phase = 'battle';
        } else if (st.phase === 'battle') st.phase = 'main2';
        else return endTurn(st, ev);
        emit(st, ev, { t: 'phase', ph: st.phase });
        return;
      }
      case 'end': if (st.cur !== p) return 'No es tu turno.'; return endTurn(st, ev);
      case 'attack': {
        if (!canAttack(st, p, a.uid)) return 'Ese Wero no puede atacar.';
        var at = attackTargets(st, p, a.uid);
        if (a.target) { if (at.targets.indexOf(a.target) < 0) return 'Objetivo inválido.'; }
        else if (!at.direct) return 'No puedes atacar directo.';
        st.c[a.uid].atks++;
        var tr2 = eligibleTraps(st, opp(p), 'attack', {});
        if (tr2.length) { st.pending = { p: opp(p), trig: 'attack', attacker: a.uid, target: a.target || null, opts: tr2 }; emit(st, ev, { t: 'declare', p: p, uid: a.uid, target: a.target || null }); return; }
        battle(st, a.uid, a.target || null, ev);
        return;
      }
    }
    return 'Acción desconocida.';
  }

  function resolvePending(st, trapUid, ev) {
    var pd = st.pending;
    if (trapUid && pd.opts.indexOf(trapUid) < 0) return 'Trampa inválida.';
    st.pending = null;
    var ctx = { attacker: pd.attacker, summoned: pd.summoned };
    if (trapUid) {
      var c = st.c[trapUid], z = zoneOf(st, trapUid), d = def(st, trapUid);
      c.up = true;
      emit(st, ev, { t: 'activate', p: pd.p, i: z.i, id: c.id, kind: 'trap' });
      logm(st, st.p[pd.p].name + ' activa la trampa ' + d.name + '.');
      runOps(st, pd.p, trapUid, d.eff, ev, ctx);
      if (zoneOf(st, trapUid)) { toGY(st, trapUid); emit(st, ev, { t: 'gy', p: pd.p, id: c.id }); }
    }
    if (st.winner !== null) return;
    if (pd.trig === 'attack') {
      if (ctx.endBattle && st.phase === 'battle') { st.phase = 'main2'; emit(st, ev, { t: 'phase', ph: 'main2' }); }
      if (ctx.negated) { emit(st, ev, { t: 'negated' }); return; }
      if (!zoneOf(st, pd.attacker)) return;
      var tg = pd.target && zoneOf(st, pd.target) ? pd.target : null;
      if (pd.target && !tg) return;
      battle(st, pd.attacker, tg, ev);
    }
  }

  function battle(st, A, D, ev) {
    var p = st.c[A].o, q = opp(p), ca = st.c[A], za = zoneOf(st, A);
    var a = atkOf(st, A);
    var info = { t: 'battle', p: p, ai: za.i, aid: ca.id, atk: a, direct: !D };
    if (!D) {
      info.dmg = a; info.dmgTo = q; emit(st, ev, info);
      logm(st, def(st, A).name + ' ataca directo.');
      damage(st, q, a, ev, 'battle');
      return;
    }
    var cd = st.c[D], zd = zoneOf(st, D);
    var wasDown = !cd.up;
    cd.up = true;
    info.di = zd.i; info.did = cd.id; info.dpos = cd.pos; info.flipped = wasDown;
    var killA = false, killD = false, dmgTo = null, dmg = 0;
    if (cd.pos === 'atk') {
      var dv = atkOf(st, D); info.dval = dv;
      if (a > dv) { killD = true; dmgTo = q; dmg = a - dv; }
      else if (a < dv) { killA = true; dmgTo = p; dmg = dv - a; }
      else { killA = killD = true; }
    } else {
      var df = defOf(st, D); info.dval = df;
      if (a > df) { killD = true; if (hasKw(st, A, 'pierce')) { dmgTo = q; dmg = a - df; } }
      else if (a < df) { dmgTo = p; dmg = df - a; }
    }
    if (killD && hasKw(st, D, 'shield') && !cd.shUsed) { cd.shUsed = true; killD = false; info.shieldD = true; }
    if (killA && hasKw(st, A, 'shield') && !ca.shUsed) { ca.shUsed = true; killA = false; info.shieldA = true; }
    info.killA = killA; info.killD = killD; info.dmg = dmg; info.dmgTo = dmgTo;
    emit(st, ev, info);
    logm(st, def(st, A).name + ' ataca a ' + def(st, D).name + '.');
    if (dmg && dmgTo !== null) damage(st, dmgTo, dmg, ev, 'battle');
    if (st.winner !== null) return;
    if (killD) destroy(st, D, ev, 'battle', true);
    if (killA) destroy(st, A, ev, 'battle', true);
    if (killD && !killA && zoneOf(st, A) && st.winner === null) {
      var e = def(st, A).eff || {};
      if (e.winGrow) { ca.aB += e.winGrow; emit(st, ev, { t: 'buff', p: p, i: za.i, n: e.winGrow }); }
      if (e.winBurn) damage(st, q, e.winBurn, ev, 'burn');
      if (e.winDraw) drawOne(st, p, ev);
    }
  }

  function endTurn(st, ev) {
    var p = st.cur;
    monsters(st, p).forEach(function (u) {
      var c = st.c[u], d = def(st, u); if (!c.up || !d.eff) return;
      if (d.eff.endHeal) heal(st, p, d.eff.endHeal, ev);
      if (d.eff.endGrow && c.grow < 1000) { var g = Math.min(d.eff.endGrow, 1000 - c.grow); c.grow += g; c.aB += g; var z = zoneOf(st, u); emit(st, ev, { t: 'buff', p: p, i: z.i, n: g }); }
    });
    if (st.winner !== null) return;
    for (var q = 0; q < 2; q++) monsters(st, q).forEach(function (u) { var c = st.c[u]; c.tA = 0; c.tD = 0; c.atks = 0; c.shUsed = false; });
    st.p[p].normalDone = false;
    st.cur = opp(p); st.turn++; st.phase = 'main1';
    emit(st, ev, { t: 'turn', cur: st.cur, turn: st.turn });
    drawOne(st, st.cur, ev);
  }

  // ---------- texto de cartas ----------
  function ARCHN(a) { var W = root.WERO_DATA; return (W && W.arch[a]) ? W.arch[a].name : a; }
  function opText(o, d) {
    var arch = d.arch === 'neutral' ? 'Wero' : 'Wero de ' + ARCHN(d.arch);
    switch (o.op) {
      case 'draw': return 'roba ' + (o.n === 1 ? '1 carta' : o.n + ' cartas');
      case 'heal': return 'ganas ' + o.n + ' LP';
      case 'burn': return 'inflige ' + o.n + ' de daño al rival';
      case 'debuffStrongest': return 'el Wero rival boca arriba con más ATK pierde ' + o.n + ' ATK';
      case 'debuffAll': return 'todos los Weros rivales boca arriba pierden ' + o.n + ' ATK';
      case 'destroyStrongest': return o.max ? 'destruye al Wero rival con más ATK que tenga ' + o.max + ' o menos' : 'destruye al Wero rival con más ATK';
      case 'destroyAllEnemyMonsters': return 'destruye todos los Weros del rival';
      case 'destroyAllMonsters': return 'destruye TODOS los Weros del campo';
      case 'destroyDefEnemies': return 'destruye todos los Weros rivales en posición de defensa';
      case 'destroyEnemyST': return o.n >= 99 ? 'destruye todas las magias y trampas del rival' : 'destruye ' + (o.n === 1 ? '1 magia/trampa' : o.n + ' magias/trampas') + ' del rival (primero las boca abajo)';
      case 'searchArch': return 'agrega a tu mano un ' + arch + ' de nivel ' + o.maxLvl + ' o menos desde tu mazo';
      case 'reviveBest': return 'invoca desde tu cementerio al ' + (o.arch ? arch : 'Wero') + ' con más ATK de nivel ' + o.maxLvl + ' o menos';
      case 'teamBuff': return 'tus Weros boca arriba ganan ' + o.n + ' ATK hasta el final del turno';
      case 'ssFromHand': return 'invoca desde tu mano, sin sacrificios, al ' + (o.arch ? arch : 'Wero') + ' con más ATK de nivel ' + o.maxLvl + ' o menos';
      case 'equip': var s = 'Equipa a uno de tus Weros: gana ' + (o.atk ? o.atk + ' ATK' : '') + (o.atk && o.def ? ' y ' : '') + (o.def ? o.def + ' DEF' : '');
        if (o.pierce) s += ', y hace daño perforante'; if (o.double) s += ', y puede atacar dos veces'; if (o.shield) s += ', y una vez por turno no puede ser destruido en batalla'; return s;
      case 'fieldAura': return 'Se queda en el campo: ' + (o.all || d.arch === 'neutral' ? 'todos tus Weros' : 'tus Weros de ' + ARCHN(d.arch)) + ' ganan ' + o.atk + ' ATK y ' + o.def + ' DEF';
      case 'negate': return 'anula el ataque';
      case 'negateEnd': return 'anula el ataque y termina la fase de batalla';
      case 'destroyAttacker': return 'destruye al Wero atacante';
      case 'debuffAttacker': return 'el Wero atacante pierde ' + o.n + ' ATK';
      case 'reflectHalf': return 'el rival recibe daño igual a la mitad del ATK del atacante';
      case 'destroyAllAtkEnemies': return 'destruye todos los Weros rivales en posición de ataque';
      case 'destroySummoned': return 'destruye a ese Wero';
      case 'debuffSummoned': return 'ese Wero pierde ' + o.n + ' ATK';
    }
    return '';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function cardText(d) {
    if (d.kind === 'monster') {
      var e = d.eff || {}, parts = [];
      if (e.onSummon) parts.push('Al ser invocado o volteado: ' + e.onSummon.map(function (o) { return opText(o, d); }).join('; ') + '.');
      if (e.pierce) parts.push('Perforante: si ataca a un Wero en defensa, la diferencia se resta a los LP del rival.');
      if (e.double) parts.push('Puede atacar dos veces por turno.');
      if (e.direct) parts.push('Puede atacar directo aunque el rival tenga Weros.');
      if (e.shield) parts.push('Una vez por turno no puede ser destruido en batalla.');
      if (e.taunt) parts.push('Mientras esté boca arriba, el rival solo puede atacar a Weros con este efecto.');
      if (e.aura) parts.push('Tus otros Weros de ' + ARCHN(d.arch) + ' ganan ' + e.aura + ' ATK.');
      if (e.synergy) parts.push('Gana ' + e.synergy + ' ATK por cada otro Wero de ' + ARCHN(d.arch) + ' que controles.');
      if (e.winGrow) parts.push('Cuando destruye a un Wero en batalla, gana ' + e.winGrow + ' ATK.');
      if (e.winBurn) parts.push('Cuando destruye a un Wero en batalla, inflige ' + e.winBurn + ' de daño.');
      if (e.winDraw) parts.push('Cuando destruye a un Wero en batalla, roba 1 carta.');
      if (e.deathDraw) parts.push('Si es destruido, roba ' + e.deathDraw + (e.deathDraw > 1 ? ' cartas.' : ' carta.'));
      if (e.deathRecruit) parts.push('Si es destruido, invoca desde tu mazo al Wero de ' + ARCHN(d.arch) + ' con más ATK de nivel ' + e.deathRecruit + ' o menos.');
      if (e.endHeal) parts.push('Al final de tu turno ganas ' + e.endHeal + ' LP.');
      if (e.endGrow) parts.push('Al final de tu turno gana ' + e.endGrow + ' ATK (máx. +1000).');
      var t = tributesFor(d.lvl);
      if (!parts.length) parts.push('Wero normal: sin efecto, pero con más fuerza.');
      if (t) parts.push('Requiere ' + t + ' sacrificio' + (t > 1 ? 's' : '') + '.');
      return parts.join(' ');
    }
    if (d.kind === 'spell') {
      if (d.sub === 'equipo' || d.sub === 'campo') return opText(d.eff[0], d) + '.';
      return cap(d.eff.map(function (o) { return opText(o, d); }).join('; ')) + '.';
    }
    var e0 = d.eff[0];
    var trig = d.trig === 'attack' ? 'Cuando un Wero rival ataca: ' : (e0.op === 'destroySummoned' && e0.minAtk ? 'Cuando el rival invoca un Wero con ' + e0.minAtk + ' ATK o más: ' : 'Cuando el rival invoca un Wero: ');
    return trig + d.eff.map(function (o) { return opText(o, d); }).join('; ') + '.';
  }
  function typeLine(d) {
    if (d.kind === 'monster') { var hasE = Object.keys(d.eff || {}).length > 0; return ARCHN(d.arch).toUpperCase() + ' / ' + (hasE ? 'EFECTO' : 'NORMAL'); }
    if (d.kind === 'spell') return 'MAGIA' + (d.sub === 'equipo' ? ' DE EQUIPO' : d.sub === 'campo' ? ' DE CAMPO' : '') + (d.arch !== 'neutral' ? ' · ' + ARCHN(d.arch).toUpperCase() : '');
    return 'TRAMPA' + (d.arch !== 'neutral' ? ' · ' + ARCHN(d.arch).toUpperCase() : '');
  }

  var API = { setDB: setDB, create: create, apply: apply, clone: clone, atkOf: atkOf, defOf: defOf, tributesFor: tributesFor,
    summonOptions: summonOptions, attackTargets: attackTargets, canAttack: canAttack, eligibleTraps: eligibleTraps,
    monsters: monsters, zoneOf: zoneOf, freeZone: freeZone, hasKw: hasKw, cardText: cardText, typeLine: typeLine,
    getDB: function () { return DB; }, def: def };
  root.Engine = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
