# Prueba el juego en Chromium headless: menus, partida vs CPU completa (ambos lados con IA),
# sobres, y multijugador simulado (dos paginas conectadas por un relevo local).
import os, sys, time, threading, http.server, functools
from playwright.sync_api import sync_playwright

WWW = sys.argv[1]
OUT = '/tmp/shots'; os.makedirs(OUT, exist_ok=True)
PORT = 8765
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=WWW))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/index.html'

errors = []
def watch(page, tag):
    page.on('pageerror', lambda e: errors.append(f'[{tag}] pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'[{tag}] console.{m.type}: {m.text}') if m.type == 'error' else None)

DRIVE = """
(me) => {
  const G = Game.G; if (!G.st || G.over || G.busy || G.wait) return 'idle';
  const st = G.st; const actor = st.pending ? st.pending.p : st.cur;
  if (actor !== me) return 'wait';
  document.querySelectorAll('.sheet.trapq').forEach(x=>x.remove());
  for (let k=0;k<20;k++){
    const a = AI.next(st, me); if (!a) return 'none';
    const r = Engine.apply(Engine.clone(st), me, a);
    if (!r.ok) { AI.fail(st, a); continue; }
    Game.submit(a); return a.type;
  }
  return 'stuck';
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, device_scale_factor=2, has_touch=True)
    pg = ctx.new_page(); watch(pg, 'cpu')
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{OUT}/01_starter.png')
    pg.click('.starter >> nth=1'); pg.fill('#nmin', 'Edgar'); pg.click('#okst'); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{OUT}/02_home.png')
    pg.click('text=🎁 Sobres'); pg.wait_for_timeout(300)
    pg.click('text=Abrir sobre'); pg.wait_for_timeout(300); pg.click('.modal .pack'); pg.wait_for_timeout(2200)
    pg.click('#flipall'); pg.wait_for_timeout(2600)
    pg.screenshot(path=f'{OUT}/03_pack.png')
    pg.click('#pkok'); pg.wait_for_timeout(300)
    pg.click('.screen.on .back'); pg.wait_for_timeout(300)
    pg.click('text=📚 Colección'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/04_coll.png')
    pg.click('#cgrid .card >> nth=46'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/05_bigcard.png')
    pg.click('.modal >> text=Cerrar'); pg.click('.screen.on .back'); pg.wait_for_timeout(300)
    pg.click('text=🃏 Mis decks'); pg.wait_for_timeout(300); pg.click('text=Editar'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/06_deckedit.png')
    pg.click('#dkback'); pg.click('.screen.on .back'); pg.wait_for_timeout(300)
    pg.click('text=⚔️ Jugar contra la CPU'); pg.click('[data-l="2"]'); pg.wait_for_timeout(2400)
    pg.screenshot(path=f'{OUT}/07_board.png')
    shots = {'battle': False, 'cutin': False, 'act': False, 'direct': False}
    t0 = time.time(); n = 0
    while time.time() - t0 < 300:
        if pg.evaluate("Game.G.over"): break
        if not shots['battle'] and pg.evaluate("!!document.querySelector('#arena.on .fighter.def')"):
            pg.wait_for_timeout(1000); pg.screenshot(path=f'{OUT}/08_battle.png'); shots['battle'] = True
        if not shots['direct'] and pg.evaluate("!!document.querySelector('#arena.on .lptarget')"):
            pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/08b_direct.png'); shots['direct'] = True
        if not shots['cutin'] and pg.evaluate("!!document.querySelector('.cutin')"):
            pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/09_cutin.png'); shots['cutin'] = True
        if not shots['act'] and pg.evaluate("!!document.querySelector('.center-card .trapstamp')"):
            pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/10_activate.png'); shots['act'] = True
        pg.evaluate(DRIVE, 0); n += 1
        pg.wait_for_timeout(60)
        if n == 40: pg.screenshot(path=f'{OUT}/11_midgame.png')
        if all(shots.values()): pg.evaluate("FX.speed=5")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/12_end.png')
    res = pg.evaluate("({over:Game.G.over, winner:Game.G.st&&Game.G.st.winner, turn:Game.G.st&&Game.G.st.turn, lp:Game.G.st&&Game.G.st.p.map(x=>x.lp)})")
    print('CPU game:', res, 'shots', shots, 'secs', int(time.time()-t0))

    h = ctx.new_page(); g = ctx.new_page(); watch(h, 'host'); watch(g, 'guest')
    for x in (h, g):
        x.goto(URL); x.wait_for_timeout(500)
    queue = {'h': [], 'g': []}
    h.expose_function('relayOut', lambda m: queue['g'].append(m))
    g.expose_function('relayOut', lambda m: queue['h'].append(m))
    for x in (h, g):
        x.evaluate("""() => { Net.send = (m) => window.relayOut(JSON.parse(JSON.stringify(m)));
          window.__recv = (m) => { if (m.t==='start') Game.startNet(m.st,1); else Game.onNet(m); };
          FX.speed = 6; }""")
    h.evaluate("""() => { const W=WERO_DATA;
        const st = Engine.create({seed: 99, first: 1, players:[{name:'Anfitrión', deck: W.starters.guerreros.cards},{name:'Invitado', deck: W.starters.gamers.cards}]});
        Net.send({t:'start', st}); Game.startNet(st, 0); }""")
    t0 = time.time(); steps = 0; desync = 0; checks = 0
    SNAP = "JSON.stringify(Game.G.st && {t:Game.G.st.turn,lp:Game.G.st.p.map(x=>x.lp),c:Game.G.st.cur,h:Game.G.st.p.map(x=>x.hand.length),m:Game.G.st.p.map(x=>x.mz)})"
    while time.time() - t0 < 300:
        for key, pgx in (('h', h), ('g', g)):
            while queue[key]:
                pgx.evaluate("(m)=>window.__recv(m)", queue[key].pop(0))
        if h.evaluate("Game.G.over") and g.evaluate("Game.G.over"): break
        h.evaluate(DRIVE, 0); g.evaluate(DRIVE, 1); steps += 1
        if steps % 20 == 0 and not queue['g'] and not queue['h'] and not g.evaluate("Game.G.busy||Game.G.wait"):
            checks += 1
            if h.evaluate(SNAP) != g.evaluate(SNAP): desync += 1
        if steps == 60: g.screenshot(path=f'{OUT}/13_guest_view.png')
        h.wait_for_timeout(40)
    print('NET game: host', h.evaluate("({over:Game.G.over,w:Game.G.st&&Game.G.st.winner,turn:Game.G.st&&Game.G.st.turn})"),
          'guest', g.evaluate("({over:Game.G.over,w:Game.G.st&&Game.G.st.winner,turn:Game.G.st&&Game.G.st.turn})"), 'checks', checks, 'desync', desync)
    g.screenshot(path=f'{OUT}/14_guest_end.png')
    b.close()
srv.shutdown()
print('ERRORES:', len(errors))
for e in errors[:30]: print(e)
