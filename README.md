# Tastenpfad

Eine kleine, private Web-App zum Lernen des 10-Finger-Schreibens auf deutschem QWERTZ, für iPad (mit Hardware-Tastatur) und Mac.

## Was die App kann

- 23 Lektionen: Grundreihe, obere und untere Reihe, Umschalt, Satzzeichen, Zahlen, ganze Sätze, dazu Wiederholungen
- Bildschirmtastatur mit Fingerfarben und Hände-Anzeige für jedes Zeichen
- Anschläge pro Minute und Genauigkeit live, bis zu 3 Sterne pro Lektion (bestanden ab 90 %)
- Fehlerkarte und „Schwache Tasten üben“ mit Übungen aus den eigenen Fehlern
- Läuft offline und lässt sich wie eine App installieren

Der Fortschritt liegt im Browser-Speicher des jeweiligen Geräts (iPad und Mac getrennt).

## Installieren

Die App wird bei jedem Push auf `main` per GitHub Actions auf GitHub Pages veröffentlicht.

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
| `index.html` | Die ganze App (HTML, CSS, JavaScript, Lektionen und Wortlisten) |
| `manifest.webmanifest` | App-Name, Icons, Startverhalten |
| `sw.js` | Offline-Cache. Nach Änderungen `VERSION` erhöhen |
| `icons/` | App-Icons |
