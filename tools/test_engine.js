// Simula muchas partidas CPU vs CPU para detectar errores y medir balance
const fs = require('fs'), path = require('path'), vm = require('vm');
const www = path.join(__dirname, '..', 'www');
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(www, 'cards.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(www, 'engine.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(www, 'ai.js'), 'utf8'));
const W = globalThis.WERO_DATA, E = globalThis.Engine, AI = globalThis.AI;
E.setDB(W.cards);

function archDeck(ak, seed) {
  const c = W.cards.filter(x => x.arch === ak || x.arch === 'neutral');
  let s = seed; const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const mons = c.filter(x => x.kind === 'monster'), lo = mons.filter(x => x.lvl <= 4), hi = mons.filter(x => x.lvl > 4);
  const sp = c.filter(x => x.kind !== 'monster');
  const d = [];
  while (d.length < 17) d.push(lo[Math.floor(r() * lo.length)].id);
  while (d.length < 24) d.push(hi[Math.floor(r() * hi.length)].id);
  while (d.length < 40) d.push(sp[Math.floor(r() * sp.length)].id);
  return d;
}
const decks = Object.entries(W.starters).map(([k, v]) => [k, v.cards]);
['aventura', 'atletas', 'artistas', 'rescate', 'oficios'].forEach((k, i) => decks.push([k, archDeck(k, 77 + i)]));

const N = +(process.argv[2] || 400);
const wins = {}, games = {}; let turns = 0, errs = 0, stuck = 0;
const evTypes = {};
for (let g = 0; g < N; g++) {
  const a = decks[g % decks.length], b = decks[(g * 3 + 1) % decks.length];
  const st = E.create({ seed: 1000 + g, first: g % 2, players: [{ name: a[0], deck: a[1] }, { name: b[0], deck: b[1] }] });
  AI.reset();
  let steps = 0;
  while (st.winner === null && steps < 3000) {
    steps++;
    const p = st.pending ? st.pending.p : st.cur;
    const act = AI.next(st, p);
    if (!act) { console.log('AI sin accion', st.phase, st.pending); break; }
    const r = E.apply(st, p, act);
    if (!r.ok) { AI.fail(st, act); if (r.err.startsWith('Error')) { errs++; console.log('ERR', r.err, JSON.stringify(act)); } }
    else r.ev.forEach(e => { evTypes[e.t] = (evTypes[e.t] || 0) + 1; });
    if (st.turn > 200) break;
  }
  if (st.winner === null) stuck++;
  turns += st.turn;
  games[a[0]] = (games[a[0]] || 0) + 1; games[b[0]] = (games[b[0]] || 0) + 1;
  if (st.winner === 0) wins[a[0]] = (wins[a[0]] || 0) + 1;
  if (st.winner === 1) wins[b[0]] = (wins[b[0]] || 0) + 1;
}
console.log('partidas', N, 'errores', errs, 'atoradas', stuck, 'turnos prom', (turns / N).toFixed(1));
Object.keys(games).forEach(k => console.log(k.padEnd(10), 'gana', ((wins[k] || 0) / games[k] * 100).toFixed(0) + '%', 'de', games[k]));
console.log(evTypes);
let empty = 0; W.cards.forEach(c => { const t = E.cardText(c); if (!t || t.length < 8) { empty++; console.log('sin texto', c.id, c.name); } });
console.log('textos vacios', empty);
console.log(E.cardText(W.cards[46]), '|', E.cardText(W.cards[400]), '|', E.cardText(W.cards[390]));
