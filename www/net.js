/* EL WERO — multijugador en linea (PeerJS: conexion directa entre telefonos con codigo de sala) */
(function () {
  'use strict';
  var N = { peer: null, conn: null, role: null, name: '', deck: [], guest: null, status: function () { } };
  var ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  function code4() { var s = ''; for (var i = 0; i < 4; i++) s += ABC[Math.floor(Math.random() * ABC.length)]; return s; }
  function pid(code) { return 'elwero-juego-' + code.toLowerCase(); }
  function errText(e) {
    var t = e && e.type;
    if (t === 'peer-unavailable') return 'No existe una sala con ese código (o ya se cerró).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Sin conexión al servidor de salas. Revisa tu internet.';
    if (t === 'browser-incompatible') return 'Este teléfono no soporta el modo en línea.';
    return 'Error de conexión (' + (t || 'desconocido') + ').';
  }
  function close() {
    try { if (N.conn) N.conn.close(); } catch (e) { }
    try { if (N.peer) N.peer.destroy(); } catch (e) { }
    N.conn = null; N.peer = null; N.role = null;
  }
  function wire(c) {
    N.conn = c;
    c.on('data', onData);
    c.on('close', function () { if (N.conn === c) { N.conn = null; Game.netLost(); } });
    c.on('error', function () { });
  }
  function onData(m) {
    if (!m || !m.t) return;
    if (m.t === 'hello' && N.role === 'host') { N.guest = { name: String(m.name || 'Rival').slice(0, 16), deck: (m.deck || []).slice(0, 60) }; return startHost(); }
    if (m.t === 'start' && N.role === 'guest') { N.status(''); return Game.startNet(m.st, 1); }
    if (m.t === 'rematch' && N.role === 'host') return startHost();
    Game.onNet(m);
  }
  function startHost() {
    var DB = Engine.getDB();
    var gd = N.guest.deck.filter(function (id) { return DB[id]; });
    if (gd.length < 40) { send({ t: 'err', msg: 'El deck del invitado no es válido.' }); return; }
    var st = Engine.create({ seed: (Math.random() * 1e9) | 0, first: Math.random() < .5 ? 0 : 1, players: [{ name: N.name, deck: N.deck }, { name: N.guest.name, deck: gd }] });
    send({ t: 'start', st: st });
    N.status('');
    Game.startNet(st, 0);
  }
  function newPeer(id) { var o = { debug: 0 }; return id ? new Peer(id, o) : new Peer(o); }
  function host(name, deck, status) {
    close(); N.role = 'host'; N.name = name; N.deck = deck.slice(); N.status = status;
    var code = code4(), tries = 0;
    status('<p class="muted">Creando sala…</p>');
    (function attempt() {
      var p = N.peer = newPeer(pid(code));
      p.on('open', function () {
        status('<p class="muted">Tu código de sala:</p><div class="code">' + code + '</div><p class="muted">Pásaselo a tu rival para que se una.<br>⏳ Esperando rival…</p>');
      });
      p.on('connection', function (c) {
        if (N.conn) { c.on('open', function () { c.close(); }); return; }
        wire(c);
      });
      p.on('error', function (e) {
        if (e.type === 'unavailable-id' && tries++ < 5) { try { p.destroy(); } catch (x) { } code = code4(); return attempt(); }
        status('<p style="color:#ff8a7a">' + errText(e) + '</p>');
      });
      p.on('disconnected', function () { try { if (N.peer === p) p.reconnect(); } catch (x) { } });
    })();
  }
  function join(code, name, deck, status) {
    close(); N.role = 'guest'; N.name = name; N.deck = deck.slice(); N.status = status;
    status('<p class="muted">Conectando con la sala ' + code + '…</p>');
    var p = N.peer = newPeer();
    p.on('open', function () {
      var c = p.connect(pid(code), { reliable: true, serialization: 'json' });
      wire(c);
      c.on('open', function () { status('<p class="muted">¡Conectado! Empezando la partida…</p>'); c.send({ t: 'hello', name: name, deck: N.deck }); });
      setTimeout(function () { if (N.role === 'guest' && (!N.conn || !N.conn.open)) status('<p style="color:#ff8a7a">No se pudo conectar. Revisa el código e inténtalo otra vez.</p>'); }, 15000);
    });
    p.on('error', function (e) { status('<p style="color:#ff8a7a">' + errText(e) + '</p>'); });
  }
  function send(m) { if (N.conn && N.conn.open) N.conn.send(m); }
  function rematch() {
    if (!N.conn || !N.conn.open) { UI.toast('El rival ya se desconectó'); return UI.go('home'); }
    if (N.role === 'host') startHost(); else { send({ t: 'rematch' }); UI.toast('Pidiendo revancha…'); }
  }
  window.Net = { host: host, join: join, send: send, close: close, rematch: rematch };
})();
