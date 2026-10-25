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
| `points` | punkty instalacji; kategoria `c`: `sock` gniazda, `sw` włączniki, `ctl` sterowniki, `light` oświetlenie, `net` sieć, `pow` zasilanie urządzeń, `ac` klimatyzacja, `water` woda i odpływ, `vent` wentylacja |
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

Opcjonalnie dla `box` i `cyl`: `click` (kliknięcie otwiera wskazany `toggle`), `emissive` + `emissiveIntensity` (świecenie), `shadow: false`.
