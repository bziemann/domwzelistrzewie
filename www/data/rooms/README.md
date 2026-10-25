# Pomieszczenia jako dane

Każde zaprojektowane pomieszczenie to jeden plik `<numer>.json` (np. `1.08.json`), dopisany do listy w `index.json`. Kod aplikacji się nie zmienia: `js/room-builder.js` buduje z pliku model 3D, a `js/app.js` rzut, instalacje i uwagi.

Wszystkie wymiary są w **centymetrach**, w lokalnym układzie pokoju: `x` i `z` od punktu `origin`, `y` od gotowej podłogi.

## Pola pliku

| Pole | Znaczenie |
|---|---|
| `id`, `level` | numer pomieszczenia z `data/house.js` i kondygnacja (0 parter, 1 poddasze) |
| `origin` | gdzie w układzie domu (cm) leży lokalny punkt (0,0) pokoju |
| `start` | pozycja kamery po wejściu do pokoju (`x`, `z` lokalnie, `yaw` w radianach) |
| `variants` | warianty wyposażenia: klucz → etykieta przycisku (obecnie obsługiwane dwa) |
| `elements` | elementy 3D, opis niżej |
| `plan` | rzut 2D: obrys, ściany, drzwi, okno, skos, wymiary, meble (`items.common` + `items.<wariant>`) |
| `points` | punkty instalacji: gniazda, włączniki, sterowniki, oświetlenie |
| `lights` | źródła światła zapalane w trybie „Noc”, opis niżej |
| `ownDoors` | opcjonalnie: oznaczenia otworów drzwiowych z `data/house.js` (np. `["D05"]`), w których pokój ma własne drzwi; aplikacja nie dorysuje tam białego skrzydła. Drzwi typu `door` na zawiasie w otworze są wykrywane same |
| `notes` | sekcje uwag (`warn: true` wyróżnia sekcję na czerwono) |

## Elementy 3D

Każdy element ma `t` (typ) i `g` (grupa): `common` (zawsze widoczny), klucz wariantu (`A`, `B`) albo `id` elementu `toggle` (ruchoma część).

| `t` | Pola |
|---|---|
| `box` | `x`, `y`, `z` jako `[od, do]`, kolor `c` (`#RRGGBB`) |
| `cyl` | walec: promień `r`, wysokość `h`, środek `at: [x, y, z]`, `c` |
| `rod` | drążek w szafie: `x: [od, do]`, `y`, `z` |
| `door` | skrzydło na zawiasie: `hinge: [x, y, z]`, `len`, `h`, `axis` (`x`/`z`), `dir` (±1), `ang` (stopnie), `kind` (`w` = front szafy, przełączany przyciskiem „Szafy”), opcjonalnie `open`, `handle`, `handleY`, `handleLen`, `c` |
| `toggle` | ruchoma część otwierana kliknięciem: `id`, `kind`, `slide: [x, y, z]` (przesunięcie po otwarciu) |
| `tris` | dowolna powierzchnia z trójkątów: `tris: [[[x,y,z],[x,y,z],[x,y,z]], …]`, `c`, `double` |
| `floorImage` | obraz na podłodze (dywan): `x`, `z` jako `[od, do]`, `y`, `img` (ścieżka do pliku w `assets/`) |

Opcjonalnie dla `box` i `cyl`: `click` (kliknięcie otwiera wskazany `toggle`), `emissive` + `emissiveIntensity` (świecenie stałe), `glow: true` (świeci tylko w nocy, np. klosz lampy), `shadow: false`.

## Światła (`lights`)

Przycisk **Pora: Dzień / Noc** działa w każdym pomieszczeniu. W nocy za oknami jest ciemno, a zapalają się światła pomieszczenia, w którym jesteś. W dzień są zgaszone.

| Pole | Znaczenie |
|---|---|
| `id` | dowolny identyfikator, najlepiej zgodny z punktem w `points` (np. `c1` plafon) |
| `kind` | `ceiling` plafon (aplikacja rysuje okrągłą oprawę), `wall` kinkiet (rysuje małą oprawę na ścianie), `lamp` lampa zbudowana z elementów (oprawy nie rysuje, klosz oznacz `glow: true`) |
| `at` | `[x, y, z]`: dla `ceiling` punkt na suficie, dla `wall` punkt na ścianie, dla `lamp` miejsce żarówki |
| `n` | tylko `wall`: kierunek od ściany do pokoju, `+x`, `-x`, `+z` albo `-z` |
| `r` | tylko `ceiling`: promień oprawy (domyślnie 20) |
| `g` | grupa jak w elementach: światło świeci tylko w widocznym wariancie (domyślnie `common`) |
| `power`, `dist` | opcjonalnie: siła (domyślnie `ceiling` 1, `wall` 0,5, `lamp` 0,4) i zasięg w cm (650 / 350 / 250) |

Pomieszczenie bez `lights` (także jeszcze niezaprojektowane) dostaje automatycznie plafony na osi obrysu, jeden na każde rozpoczęte 4 m długości. Wyjątki dla pomieszczeń bez pliku można wpisać w `data/house.js` (`rooms[].lights`, współrzędne domu) — tak oświetlone są schody 0.09.

Wydajność: aplikacja nie dodaje świateł do sceny. W nocy przenosi 6 istniejących świateł punktowych do opraw bieżącego pomieszczenia (pierwsze 6 wg `power`), pozostałe oprawy w domu tylko świecą. Dlatego pomieszczenie może mieć dowolnie wiele wpisów, ale realnie oświetla je najwyżej 6.

