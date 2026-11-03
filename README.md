# Tastenpfad

Eine kleine, private Web-App zum Lernen des 10-Finger-Schreibens auf deutschem QWERTZ, für iPad (mit Hardware-Tastatur) und Mac.

## Was die App kann

- 404 Lektionen in 14 Kapiteln: Grundreihe, obere und untere Reihe, Großschreibung, Satzzeichen, Zahlen, Sonderzeichen, Finger-Training, Buchstabenfolgen, häufigste Wörter, Wortschatz nach Themen, Sätze, 40 Texte, Tempo- und Ausdauerläufe
- Lektionsarten: Einführung, Kombinationen, Wörter, Genauigkeit, Tempo, Blind (ohne Tastatur), Läufe auf Zeit
- Bildschirmtastatur mit Fingerfarben und Hände-Anzeige für jedes Zeichen
- Anschläge pro Minute und Genauigkeit live, bis zu 3 Sterne pro Lektion (bestanden ab 90 %)
- Fehlerkarte und „Schwache Tasten üben“ mit Übungen aus den eigenen Fehlern
- Läuft offline und lässt sich wie eine App installieren

Der Fortschritt liegt im Browser-Speicher des jeweiligen Geräts (iPad und Mac getrennt).

## Installieren

Die App wird bei jedem Push auf `main` über GitHub Pages veröffentlicht: https://mrteamusic.github.io/10fingerschreiben/

- **iPad:** Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“
- **Mac:** Seite in Safari öffnen → Ablage → „Zum Dock hinzufügen“ (oder in Chrome: Installieren-Symbol in der Adressleiste)

## Lokal starten

```sh
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst und Styles |
| `app.js` | Lehrplan, Textgenerator, Übung, Statistik |
| `content.js` | Wortlisten, Themen, Sätze und Texte |
| `manifest.webmanifest` | App-Name, Icons, Startverhalten |
| `sw.js` | Offline-Cache. Nach Änderungen `VERSION` erhöhen |
| `icons/` | App-Icons |
