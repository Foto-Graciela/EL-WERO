# EL WERO · Juego de Cartas

Juego de cartas estilo duelo para Android con 600 cartas de El Wero: Weros, Magias y Trampas en 5 rarezas (Normal, Rara, Ultra Rara, Legendaria y Ultra Legendaria), 8 arquetipos, 3 decks iniciales, sobres, editor de decks, rival CPU y multijugador en línea con código de sala.

- `www/` — el juego (HTML/JS). Se puede abrir en el navegador.
- `android/` — envoltura Android (WebView) que empaqueta `www/` como APK.
- `tools/` — generador de las 600 cartas, recorte de arte y pruebas.
- Cada push compila la APK en GitHub Actions; las etiquetas `v*` publican un Release.
