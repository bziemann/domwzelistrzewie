# Dom w 3D — model kondygnacji i pomieszczeń

Aplikacja w przeglądarce: wybór kondygnacji, rzut z podkładem projektu, wejście do pomieszczeń, spacer po całym domu (ze schodami), rzuty z wymiarami, instalacje i uwagi.

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
js/room-108.js      moduł zaprojektowanego pomieszczenia 1.08: meble 3D, warianty, rzut, instalacje, uwagi
js/app.js           silnik: scena 3D, spacer z kolizjami i schodami, rzuty, nawigacja
assets/*.png        podkłady z projektu (rzut parteru i poddasza)
```

Układ współrzędnych (cm): `x` od ściany wschodniej (lewa krawędź rzutu), `z` od ściany południowej (górna krawędź rzutu). Poziom poddasza: +320 cm.

## Dodanie kolejnego pomieszczenia (z Claude)

Każde zaprojektowane pomieszczenie to jeden plik `js/room-<numer>.js` zbudowany jak `js/room-108.js`:

- `origin` — gdzie w układzie domu leży lokalny punkt (0,0) pokoju,
- `build(api)` — meble 3D (w metrach, układ lokalny),
- `plan` — obrys, ściany, wymiary i meble do rzutu 2D (cm, układ lokalny),
- `points` — gniazda, włączniki, sterowniki,
- `notes` — uwagi i ustalenia.

Po dodaniu pliku dopisz go w `index.html` przed `js/app.js`:

```html
<script src="js/room-1.09.js"></script>
```

Meble ze szkicu architekta dla tego pomieszczenia usuń z `data/house.js` (pole `furniture`, wpisy z `room: "1.09"`).

### Tekst do wklejenia w nowej rozmowie

> Projektujemy pomieszczenie [numer] w moim domu. W wiedzy Projektu są: PDF projektu, kod aplikacji (index.html, data/house.js, js/app.js, js/room-108.js) i uwagi. Zacznij od pytań o to pomieszczenie, nie zgaduj. Wynik dostarcz jako nowy moduł `js/room-[numer].js` zgodny z `js/room-108.js`, w układzie współrzędnych z `data/house.js`.

## Założenia modelu

- Wymiary odczytane z wektorowego PDF projektu (rzuty A-1, A-2) — dokładność ok. ±2 cm.
- Poddasze: ścianka kolankowa 160 cm, dach 38°, sufit 265 cm (w projekcie 285 cm).
- Schody uproszczone do dwóch biegów i spocznika.
- Meble poza 1.08 to szkic z rysunku architekta.
