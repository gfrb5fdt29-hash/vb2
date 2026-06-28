# VB 2026 – Playoff minimalista iPhone PWA

Ez egy statikus, magyar nyelvű, iPhone-ra optimalizált PWA a FIFA World Cup 2026 playoff meccseinek áttekintéséhez.

## Frissített változat

Ebben a verzióban:

- a fejlécben „Playoff” és „VB 2026” szerepel;
- az alcím: „Minden egyenes kieséses meccs szerdától szombatig”;
- a főoldali Módszer blokk törölve lett;
- a Kockázat nézetből kikerült a büntetők része;
- a „Hosszabbítás esélye” helyett „Döntetlen esélye” látható;
- a kockázati sávok nagyobbak, rövid indoklással jelennek meg;

- a részletes kártya X gombbal, háttérre koppintással és lefele legyintéssel is bezárható;
- az országnevek magyar névvel jelennek meg az appban;
- a főoldal egyszerűbb, nincs betöltési státusz és nincs 4 nagy infódoboz;
- a meccskártyák nincsenek számozva;
- a százalékok egyértelműen „Esély” jelöléssel jelennek meg;
- az adatalap rövidebb és tisztább.

## GitHub Pages feltöltés

1. Csomagold ki a ZIP-et.
2. A tartalmát töltsd fel a GitHub repository gyökerébe.
3. A repository beállításainál kapcsold be a GitHub Pages-t.
4. Source: `Deploy from a branch`, branch: `main`, folder: `/root`.
5. A Pages URL-en az app közvetlenül megnyílik.

## Adatfájl

Az app adatforrása:

```text
data/predictions.json
```

A frontend ezt olvassa be relatív útvonalon: `./data/predictions.json`.

## JSON frissítése később

1. Cseréld le a `data/predictions.json` fájlt az új, azonos szerkezetű JSON-ra.
2. Tartsd meg a `matches[]` tömböt és a PWA-ban használt mezőket.
3. Nem kell buildelni, újracsomagolni vagy függőséget telepíteni.

## Nincs build step

Az app csak statikus fájlokból áll:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `data/predictions.json`
- `assets/` ikonok

Nincs React, Vite, Next.js, Node build vagy külső CDN.

## Hostolási ellenőrzőlista

- [x] Minden útvonal relatív.
- [x] A PWA manifest jelen van.
- [x] A service worker cache-eli az app shellt és a JSON-t.
- [x] A `data/predictions.json` érvényes JSON.
- [x] Az app mobilon safe-area kompatibilis.
- [x] GitHub Pages gyökérből hostolható.
