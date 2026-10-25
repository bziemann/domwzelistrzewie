# Dom w 3D — model kondygnacji i pomieszczeń

Aplikacja w przeglądarce: wybór kondygnacji, rzut z podkładem projektu, wejście do pomieszczeń, spacer po całym domu (ze schodami), tryb dzień/noc z oświetleniem pomieszczeń, rzuty z wymiarami, instalacje i uwagi. Wszystkie drzwi wewnętrzne są białe i otwierają się kliknięciem.

## Uruchomienie lokalnie

Potrzebny jest prosty serwer plików (przeglądarki blokują część funkcji przy otwieraniu pliku bezpośrednio z dysku).

1. Rozpakuj archiwum do folderu.
2. W tym folderze uruchom jedną z komend:
   - Python: `python -m http.server 8000`
   - Node.js: `npx serve .`
3. Otwórz w przeglądarce: `http://localhost:8000`

Aplikacja działa bez internetu: three.js r128 i font Manrope leżą w `vendor/` (kopiuje je `npm run vendor` z katalogu głównego repozytorium).

## Struktura

```
index.html          interfejs i style
data/house.js       dane domu: ściany, otwory, pomieszczenia, schody, dach, meble ze szkicu architekta (cm)
data/rooms/*.json   zaprojektowane pomieszczenia jako dane: meble 3D, warianty, rzut, instalacje, uwagi
js/room-builder.js  wczytuje data/rooms i buduje z nich modele 3D
js/plan-zoom.js     przybliżanie i przesuwanie rzutu kondygnacji (pinch, kółko myszy, przyciski)
js/app.js           silnik: scena 3D, spacer z kolizjami i schodami, rzuty, nawigacja
assets/*.png        podkłady z projektu (rzut parteru i poddasza)
```

Układ współrzędnych (cm): `x` od ściany wschodniej (lewa krawędź rzutu), `z` od ściany południowej (górna krawędź rzutu). Poziom poddasza: +320 cm.

## Dodanie kolejnego pomieszczenia (z Claude)

Każde zaprojektowane pomieszczenie to plik z danymi `data/rooms/<numer>.json`, bez kodu. Format opisuje `data/rooms/README.md`, wzorem jest `data/rooms/1.08.json`.

1. Dodaj plik `data/rooms/1.09.json`.
2. Dopisz numer do listy w `data/rooms/index.json`: `["1.08", "1.09"]`.
3. Usuń meble ze szkicu architekta dla tego pomieszczenia z `data/house.js` (pole `furniture`, wpisy z `room: "1.09"`).

### Tekst do wklejenia w nowej rozmowie

> Projektujemy pomieszczenie [numer] w moim domu. Kod aplikacji jest w repozytorium (format pomieszczenia: www/data/rooms/README.md, wzór: www/data/rooms/1.08.json, układ domu: www/data/house.js). Zacznij od pytań o to pomieszczenie, nie zgaduj. Wynik dostarcz jako nowy plik `www/data/rooms/[numer].json` zgodny z `1.08.json`.

## Założenia modelu

- Wymiary odczytane z wektorowego PDF projektu (rzuty A-1, A-2) — dokładność ok. ±2 cm.
- Poddasze: ścianka kolankowa 160 cm, dach 38°, sufit 265 cm (w projekcie 285 cm).
- Schody uproszczone do dwóch biegów i spocznika.
- Meble poza 1.08 to szkic z rysunku architekta.
