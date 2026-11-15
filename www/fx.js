/* EL WERO — efectos: sonido sintetizado, particulas, textos flotantes */
(function () {
  'use strict';
  var FX = {}, AC = null;
  FX.speed = 1; FX.sound = true; FX.vibe = true;
  FX.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms / FX.speed); }); };
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  FX.unlock = function () { ac(); };
  function tone(f, d, type, vol, slide, delay) {
    var a = ac(); if (!a || !FX.sound) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d);
    g.gain.setValueAtTime(vol || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  function noise(d, vol, f1, f2, delay) {
    var a = ac(); if (!a || !FX.sound) return;
    var t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
    var s = a.createBufferSource(); s.buffer = b;
    var fl = a.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(f1 || 1000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = .8;
    var g = a.createGain(); g.gain.setValueAtTime(vol || .3, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t);
  }
  FX.sfx = {
    tap: function () { tone(660, .05, 'triangle', .08); },
    draw: function () { noise(.12, .12, 3000, 6000); },
    summon: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, .25, 'triangle', .12, null, i * .06); }); noise(.4, .08, 800, 4000); },
    epic: function () { tone(110, 1.2, 'sawtooth', .15, 55); [392, 523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, .5, 'square', .06, null, .1 + i * .07); }); noise(1, .15, 300, 3000); },
    whoosh: function () { noise(.35, .25, 400, 3500); },
    hit: function () { noise(.25, .55, 2000, 200); tone(90, .35, 'sine', .5, 40); tone(180, .12, 'square', .12, 60); },
    big: function () { noise(.6, .6, 1500, 100); tone(60, .7, 'sine', .7, 30); },
    shatter: function () { for (var i = 0; i < 6; i++) tone(2000 + Math.random() * 3000, .12, 'triangle', .05, 800, i * .03); noise(.4, .25, 6000, 2000); },
    spell: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, .35, 'sine', .1, null, i * .05); }); },
    trap: function () { tone(880, .12, 'square', .12); tone(660, .12, 'square', .12, null, .13); tone(880, .12, 'square', .12, null, .26); tone(440, .4, 'sawtooth', .1, 220, .39); },
    heal: function () { [659, 880, 1318].forEach(function (f, i) { tone(f, .4, 'sine', .1, null, i * .08); }); },
    dmg: function () { tone(220, .3, 'sawtooth', .15, 80); },
    win: function () { [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { tone(f, .3, 'triangle', .14, null, i * .12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, .45, 'sawtooth', .1, null, i * .2); }); },
    shield: function () { tone(1200, .5, 'sine', .15, 2400); tone(600, .5, 'triangle', .1, 300); },
    turn: function () { tone(523, .12, 'triangle', .1); tone(784, .2, 'triangle', .1, null, .1); },
    rare: function (r) { var n = { R: 2, UR: 3, L: 5, UL: 8 }[r] || 1; for (var i = 0; i < n; i++) tone(700 + i * 180, .3, 'sine', .1, null, i * .07); if (r === 'UL' || r === 'L') noise(.8, .15, 1000, 8000); }
  };
  FX.vib = function (ms) { if (FX.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };

  var cv, cx, parts = [], running = false;
  function ensureCanvas() {
    if (cv) return;
    cv = document.getElementById('fxc'); cx = cv.getContext('2d');
    var rs = function () { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    rs(); addEventListener('resize', rs);
  }
  FX.burst = function (x, y, n, colors, spd, size, grav) {
    ensureCanvas(); colors = colors || ['#ffd24a', '#fff', '#ff8a2f'];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (spd || 8) * (.3 + Math.random());
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: .012 + Math.random() * .025, s: (size || 4) * (.5 + Math.random()), c: colors[i % colors.length], g: grav == null ? .15 : grav });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
  FX.stream = function (x1, y1, x2, y2, n, color) {
    ensureCanvas();
    for (var i = 0; i < n; i++) parts.push({ x: x1 + (Math.random() - .5) * 40, y: y1 + (Math.random() - .5) * 40, tx: x2, ty: y2, life: 1, dec: .02, s: 3 + Math.random() * 3, c: color || '#b98aff', home: true, d: Math.random() * 20 });
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    cx.globalCompositeOperation = 'lighter';
    parts = parts.filter(function (p) {
      if (p.home) { if (p.d > 0) { p.d--; } else { p.x += (p.tx - p.x) * .12; p.y += (p.ty - p.y) * .12; } }
      else { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .98; }
      p.life -= p.dec;
      if (p.life <= 0) return false;
      cx.globalAlpha = Math.max(0, p.life); cx.fillStyle = p.c;
      cx.beginPath(); cx.arc(p.x, p.y, p.s, 0, 7); cx.fill();
      return true;
    });
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  FX.center = function (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r }; };
  FX.float = function (x, y, text, cls) {
    var d = document.createElement('div'); d.className = 'float ' + (cls || 'y'); d.textContent = text;
    d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.animationDuration = (1.1 / FX.speed) + 's';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1200 / FX.speed);
  };
  FX.banner = function (text, cls, ms) {
    var d = document.createElement('div'); d.className = 'banner ' + (cls || ''); d.innerHTML = '<span class="strip">' + text + '</span>';
    d.style.animationDuration = ((ms || 1200) / 1000 / FX.speed) + 's';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, (ms || 1200) / FX.speed);
  };
  FX.flash = function (cls) { var d = document.createElement('div'); d.className = 'flash ' + (cls || ''); document.body.appendChild(d); setTimeout(function () { d.remove(); }, 400); };
  FX.shake = function (el) { el = el || document.getElementById('game'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 500); };
  FX.rays = function (x, y, color) {
    var d = document.createElement('div'); d.className = 'rays'; d.style.left = x + 'px'; d.style.top = y + 'px'; if (color) d.style.setProperty('--rc', color);
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1000);
  };
  FX.anim = function (el, cls, ms) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, ms || 800); };
  FX.shatter = function (rect, img, cols, rows) {
    cols = cols || 4; rows = rows || 4;
    var w = rect.width / cols, h = rect.height / rows, out = [];
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var p = document.createElement('div'); p.className = 'piece';
      p.style.left = (rect.left + i * w) + 'px'; p.style.top = (rect.top + j * h) + 'px'; p.style.width = w + 'px'; p.style.height = h + 'px';
      if (img) { p.style.backgroundImage = 'url(' + img + ')'; p.style.backgroundSize = rect.width + 'px ' + rect.height + 'px'; p.style.backgroundPosition = (-i * w) + 'px ' + (-j * h) + 'px'; }
      else p.style.background = '#e2b25a';
      document.body.appendChild(p);
      var dx = (i - cols / 2 + .5) * (60 + Math.random() * 120), dy = (j - rows / 2 + .5) * (60 + Math.random() * 120) + 80;
      p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + ((Math.random() - .5) * 540) + 'deg) scale(.4)', opacity: 0 }], { duration: (700 + Math.random() * 400) / FX.speed, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      out.push(p);
    }
    setTimeout(function () { out.forEach(function (p) { p.remove(); }); }, 1300 / FX.speed);
  };
  window.FX = FX;
})();
