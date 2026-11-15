/* EL WERO — rival CPU */
(function (root) {
  'use strict';
  var E = root.Engine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var tried = {};
  function key(st, a) { return st.turn + ':' + a.type + ':' + (a.uid || '') + ':' + (a.target || ''); }
  function markFail(st, a) { tried[key(st, a)] = 1; }
  function ok(st, a) { return !tried[key(st, a)]; }
  function D(st, u) { return E.def(st, u); }
  function mons(st, p) { return E.monsters(st, p); }

  function spellScore(st, p, u) {
    var d = D(st, u), en = mons(st, 1 - p), my = mons(st, p), s = 0;
    var P = st.p[p];
    if (d.sub === 'equipo') return my.some(function (m) { return st.c[m].up; }) ? 4 : -1;
    if (d.sub === 'campo') return my.some(function (m) { return st.c[m].up && (d.arch === 'neutral' || D(st, m).arch === d.arch); }) ? 3 : -1;
    d.eff.forEach(function (o) {
      switch (o.op) {
        case 'draw': s += P.hand.length <= 6 && P.deck.length > 5 ? 5 : 0; break;
        case 'heal': s += P.lp <= 8000 - o.n / 2 ? 3 : 0.5; break;
        case 'burn': s += 4; break;
        case 'debuffStrongest': case 'debuffAll': s += en.some(function (m) { return st.c[m].up; }) ? 4 : 0; break;
        case 'destroyStrongest': s += en.some(function (m) { return o.max == null || E.atkOf(st, m) <= o.max; }) ? 6 : 0; break;
        case 'destroyAllEnemyMonsters': s += en.length ? 4 + en.length * 2 : 0; break;
        case 'destroyAllMonsters':
          var ev = en.reduce(function (t, m) { return t + E.atkOf(st, m); }, 0), mv = my.reduce(function (t, m) { return t + E.atkOf(st, m); }, 0);
          s += ev > mv + 800 ? 7 : -5; break;
        case 'destroyDefEnemies': s += en.some(function (m) { return st.c[m].pos === 'def'; }) ? 5 : 0; break;
        case 'destroyEnemyST': s += st.p[1 - p].sz.some(function (x) { return x; }) ? 5 : 0; break;
        case 'searchArch': s += 3; break;
        case 'reviveBest': s += E.freeZone(st, p, 'mz') >= 0 && P.gy.some(function (g) { return D(st, g).kind === 'monster' && D(st, g).lvl <= o.maxLvl; }) ? 5 : 0; break;
        case 'teamBuff': s += (st.phase === 'main1' && st.turn > 1 && my.some(function (m) { return st.c[m].up && st.c[m].pos === 'atk'; })) ? 2 : 0; break;
        case 'ssFromHand': s += E.freeZone(st, p, 'mz') >= 0 && P.hand.some(function (h) { return D(st, h).kind === 'monster' && D(st, h).lvl <= o.maxLvl && D(st, h).lvl > 4; }) ? 6 : 0; break;
      }
    });
    return s;
  }
  function val(st, u) { var c = st.c[u]; return c.up ? Math.max(E.atkOf(st, u), c.pos === 'def' ? E.defOf(st, u) * 0.7 : 0) : 1200; }
  function enemyMax(st, p) { return mons(st, 1 - p).reduce(function (m, u) { return Math.max(m, st.c[u].up ? E.atkOf(st, u) : 1500); }, 0); }

  function bestSummon(st, p) {
    var P = st.p[p]; if (P.normalDone) return null;
    var my = mons(st, p).slice().sort(function (a, b) { return val(st, a) - val(st, b); });
    var enMax = enemyMax(st, p);
    var best = null, bv = -1e9;
    P.hand.forEach(function (u) {
      var d = D(st, u); if (d.kind !== 'monster') return;
      var need = E.tributesFor(d.lvl);
      if (my.length < need) return;
      if (need === 0 && E.freeZone(st, p, 'mz') < 0) return;
      var trib = my.slice(0, need);
      var v = Math.max(d.atk, d.df * 0.8) + (Object.keys(d.eff || {}).length ? 300 : 0) + d.lvl * 30 - trib.reduce(function (t, x) { return t + val(st, x) * 0.9; }, 0);
      if (need && v < 300) return;
      if (v > bv) { bv = v; best = { uid: u, trib: trib, set: d.lvl <= 4 && d.atk < enMax }; }
    });
    return best;
  }

  function bestAttack(st, p) {
    var my = mons(st, p).filter(function (u) { return E.canAttack(st, p, u); }).sort(function (a, b) { return E.atkOf(st, b) - E.atkOf(st, a); });
    for (var k = 0; k < my.length; k++) {
      var u = my[k], a = E.atkOf(st, u), t = E.attackTargets(st, p, u), best = null, bs = 0;
      if (t.direct && !mons(st, 1 - p).length) { var d0 = { type: 'attack', uid: u }; if (ok(st, d0)) return d0; continue; }
      t.targets.forEach(function (x) {
        var c = st.c[x], v, s;
        v = !c.up ? 1500 : (c.pos === 'atk' ? E.atkOf(st, x) : E.defOf(st, x));
        if (a <= v) return;
        s = (c.pos === 'atk' && c.up) ? a : v * 0.8 + 100;
        if (s > bs) { bs = s; best = x; }
      });
      if (t.direct && (!best || a > bs)) { var dA = { type: 'attack', uid: u }; if (ok(st, dA)) return dA; }
      if (best) { var aA = { type: 'attack', uid: u, target: best }; if (ok(st, aA)) return aA; }
    }
    return null;
  }

  function trapResp(st, p) {
    var pd = st.pending, opts = pd.opts.slice();
    var pick = function (order) { for (var i = 0; i < order.length; i++) for (var j = 0; j < opts.length; j++) if (D(st, opts[j]).eff.some(function (o) { return o.op === order[i]; })) return opts[j]; return null; };
    if (pd.trig === 'summon') {
      var a = E.atkOf(st, pd.summoned);
      return { type: 'trapResp', uid: a >= 1700 ? pick(['destroySummoned', 'debuffSummoned']) : null };
    }
    var atk = E.atkOf(st, pd.attacker), danger;
    if (!pd.target) danger = atk >= 900;
    else { var c = st.c[pd.target]; var v = c.pos === 'atk' ? E.atkOf(st, pd.target) : E.defOf(st, pd.target); danger = atk > v; }
    if (!danger) return { type: 'trapResp', uid: null };
    var atkers = mons(st, 1 - p).filter(function (m) { return st.c[m].pos === 'atk'; }).length;
    var order = atkers >= 2 ? ['destroyAllAtkEnemies', 'destroyAttacker', 'reflectHalf', 'negateEnd', 'negate', 'debuffAttacker', 'heal'] : ['destroyAttacker', 'reflectHalf', 'destroyAllAtkEnemies', 'negateEnd', 'negate', 'debuffAttacker', 'heal'];
    return { type: 'trapResp', uid: pick(order) };
  }

  function next(st, p) {
    if (st.winner !== null) return null;
    if (st.pending) return st.pending.p === p ? trapResp(st, p) : null;
    if (st.cur !== p) return null;
    var P = st.p[p], a;
    if (st.phase === 'main1' || st.phase === 'main2') {
      var cand = P.hand.concat(P.sz.filter(function (u) { return u && !st.c[u].up; })).filter(function (u) { return D(st, u).kind === 'spell'; });
      var bs = 0, bu = null;
      cand.forEach(function (u) { var s = spellScore(st, p, u); if (s > bs && ok(st, { type: 'activate', uid: u })) { bs = s; bu = u; } });
      if (bu && bs >= 2) return { type: 'activate', uid: bu };
      var sm = bestSummon(st, p);
      if (sm) { a = { type: 'summon', uid: sm.uid, trib: sm.trib, set: sm.set }; if (ok(st, a)) return a; }
      if (st.phase === 'main1') {
        var fd = mons(st, p).filter(function (u) { var c = st.c[u]; return !c.up && c.sumT !== st.turn && c.posT !== st.turn && D(st, u).atk >= 1500; });
        if (fd.length) { a = { type: 'changePos', uid: fd[0] }; if (ok(st, a)) return a; }
        var em = enemyMax(st, p);
        var dd = mons(st, p).filter(function (u) { var c = st.c[u]; return c.up && c.pos === 'def' && c.sumT !== st.turn && c.posT !== st.turn && E.atkOf(st, u) > em; });
        if (dd.length) { a = { type: 'changePos', uid: dd[0] }; if (ok(st, a)) return a; }
      }
      var tr = P.hand.filter(function (u) { return D(st, u).kind === 'trap'; });
      if (tr.length && E.freeZone(st, p, 'sz') >= 0) { a = { type: 'setST', uid: tr[0] }; if (ok(st, a)) return a; }
      if (st.phase === 'main1' && st.turn > 1 && mons(st, p).some(function (u) { return st.c[u].pos === 'atk' && st.c[u].up; })) return { type: 'phase' };
      if (st.phase === 'main2') {
        var enMax = mons(st, 1 - p).reduce(function (m, x) { return Math.max(m, st.c[x].up ? E.atkOf(st, x) : 0); }, 0);
        var weak = mons(st, p).filter(function (u) { var c = st.c[u]; return c.up && c.pos === 'atk' && c.sumT !== st.turn && c.posT !== st.turn && E.atkOf(st, u) < enMax && E.defOf(st, u) > E.atkOf(st, u); });
        if (weak.length) { a = { type: 'changePos', uid: weak[0] }; if (ok(st, a)) return a; }
      }
      return { type: 'end' };
    }
    if (st.phase === 'battle') { a = bestAttack(st, p); return a || { type: 'phase' }; }
    return { type: 'end' };
  }
  var AI = { next: next, fail: markFail, reset: function () { tried = {}; } };
  root.AI = AI;
  if (typeof module !== 'undefined') module.exports = AI;
})(typeof window !== 'undefined' ? window : globalThis);
