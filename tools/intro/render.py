# Renderiza intro.html cuadro por cuadro (30 fps, 10 s) y arma intro.mp4 con sonido sintetizado.
import os, sys, shutil, subprocess, threading, http.server, functools, wave
import numpy as np
from playwright.sync_api import sync_playwright

ROOT, OUT = sys.argv[1], sys.argv[2]
FPS, DUR = 30, 10.0
FR = '/tmp/frames'
shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8790), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 720, 'height': 1280})
    pg.goto('http://127.0.0.1:8790/tools/intro/intro.html')
    for t in (0.3, 1.0, 2.0, 3.5, 5.0, 6.0, 7.5, 9.0):  # precargar imagenes
        pg.evaluate(f'render({t})'); pg.wait_for_timeout(250)
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
    n = int(FPS * DUR)
    for i in range(n):
        pg.evaluate(f'render({i / FPS})')
        pg.screenshot(path=f'{FR}/f{i:04d}.jpg', type='jpeg', quality=92)
    b.close()
srv.shutdown()

# ---- audio ----
SR = 44100
a = np.zeros(int(SR * DUR) + SR)
rng = np.random.default_rng(7)
def add(t, sig):
    i = int(t * SR); a[i:i + len(sig)] += sig[:max(0, len(a) - i)]
def env(n, att=.005, dec=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / att)
    return e * np.exp(-t / (dec or (n / SR / 4)))
def noise(d, lp=None):
    x = rng.standard_normal(int(SR * d))
    if lp:  # filtro paso bajo simple
        k = int(SR / lp); x = np.convolve(x, np.ones(k) / k, 'same')
    return x
def tone(f, d, f2=None, kind='sin'):
    n = int(SR * d); t = np.arange(n) / SR
    fr = f if f2 is None else f * (f2 / f) ** (t / d)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) if kind == 'sin' else np.sign(np.sin(ph)) * .5 + np.sin(ph) * .5
def boom(t, v=1):
    add(t, v * .9 * tone(70, .9, 35) * env(int(SR * .9), .002, .25))
    add(t, v * .6 * noise(.5, 600) * env(int(SR * .5), .001, .12) * 3)
def hit(t, v=1):
    add(t, v * .7 * noise(.35) * env(int(SR * .35), .001, .05))
    add(t, v * .8 * tone(110, .4, 45) * env(int(SR * .4), .001, .1))
def whoosh(t, d=.45, v=.5):
    n = int(SR * d); x = noise(d); e = np.sin(np.linspace(0, np.pi, n)) ** 2
    k = np.convolve(x, np.ones(6) / 6, 'same'); add(t, v * k * e * 2)
def shatter(t):
    for j in range(10):
        add(t + j * .025, .12 * tone(2500 + rng.random() * 3500, .15, 900) * env(int(SR * .15), .001, .04))
    add(t, .3 * noise(.5) * env(int(SR * .5), .001, .1))
def chord(t, fs, d, v=.12):
    for f in fs: add(t, v * tone(f, d, kind='sq') * env(int(SR * d), .02, d / 2.5))
# ritmo de fondo
for k in np.arange(0, 8.0, .5): add(k, .55 * tone(60, .3, 40) * env(int(SR * .3), .002, .07))
for k in np.arange(.25, 8.0, .5): add(k, .12 * noise(.08) * env(int(SR * .08), .001, .02))
add(0, .25 * tone(55, 8.0) * np.linspace(.2, 1, int(SR * 8)) * .5)
boom(.12, .8); boom(.3, .5)
for t0 in (.45, 2.6, 4.75):
    whoosh(t0, .4, .5); hit(t0 + .32, .6); whoosh(t0 + .86, .2, .7); boom(t0 + 1.0, 1); hit(t0 + 1.0, 1); shatter(t0 + 1.06)
    chord(t0 + 1.15, [523, 659, 784], .4, .05)
whoosh(6.85, 1.15, .6)
add(6.85, .15 * tone(200, 1.15, 1600) * env(int(SR * 1.15), .3, 2))
boom(8.0, 1.2)
chord(8.0, [262, 330, 392, 523], 2.0, .07); chord(8.2, [523, 659, 784, 1046], 1.8, .05)
a = a[:int(SR * DUR)]
a = a / np.max(np.abs(a)) * .9
fade = int(SR * .4); a[-fade:] *= np.linspace(1, 0, fade)
with wave.open('/tmp/intro.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/f%04d.jpg', '-i', '/tmp/intro.wav',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
                '-shortest', '-movflags', '+faststart', OUT], check=True)
print('ok', os.path.getsize(OUT))
