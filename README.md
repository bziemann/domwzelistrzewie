# domwzelistrzewie

Aplikacja na Androida do przeglądania pomieszczeń domu w Żelistrzewie: model 3D, spacer, rzuty z wymiarami, instalacje i uwagi do każdego pokoju.

## Struktura

```
www/                 aplikacja webowa (three.js r128), opis w www/README.md
android/             projekt Android wygenerowany przez Capacitor 7
scripts/vendor.mjs   kopiuje three.js i font Manrope do www/vendor (praca offline)
scripts/rooms-index.mjs  tworzy listę pomieszczeń www/data/rooms/index.json z plików <numer>.json
.github/workflows/   automatyczna budowa APK
```

## Jak dostać APK na telefon

Najnowsza wersja (z gałęzi main), stały link do zakładki w telefonie:
https://github.com/bziemann/domwzelistrzewie/releases/latest/download/dom.apk

Każdy build jest podpisany tym samym kluczem i ma rosnący `versionCode` (numer przebiegu Actions),
więc nowe APK instaluje się na starym jako aktualizacja, bez odinstalowywania i bez utraty danych.

Klucz podpisu żyje w sekretach repo (Settings → Secrets and variables → Actions):
- `ANDROID_KEYSTORE_BASE64` – plik `.jks` zakodowany base64,
- `ANDROID_KEYSTORE_PASSWORD` – hasło keystore i klucza (alias `dom`).

Utrata klucza = kolejne APK nie zainstalują się na istniejącej aplikacji. Trzymaj kopię `.jks` i hasła poza GitHubem.
Bez sekretów workflow buduje APK debug (Actions → przebieg → Artifacts → `dom-apk`), które wymaga odinstalowania przy każdej aktualizacji.

## Praca lokalna

Wymagane: Node.js 22, JDK 21, Android Studio (Android SDK 35).

```
npm ci
npm run sync      # lista pomieszczeń + vendor + kopiowanie www do projektu Android
npm run open      # otwiera projekt w Android Studio
```

Podgląd w przeglądarce bez Androida: `npm run rooms`, potem `python -m http.server 8000 -d www` i http://localhost:8000. `npm run rooms` trzeba powtórzyć po dodaniu pliku pomieszczenia.
