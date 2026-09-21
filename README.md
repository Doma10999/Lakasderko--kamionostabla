# Kamionos LED tábla tervező – V1

Önálló statikus webalkalmazás a Lakás Dekor 49×12 cm-es kamionos LED táblájához.

## Beépített szabályok

- Tábla: **490 × 120 mm**
- Bal / jobb biztonsági margó: **50 / 50 mm**
- Felső margó: **14 mm**
- Alsó margó: **5 mm**
- Hasznos terület: **390 × 101 mm**
- Gravírozás: **kontúr** vagy **telibe**
- LED: **kék, zöld, piros, fehér, RGB**
- Standard ár: **8 500 Ft**
- RGB ár: **11 150 Ft**
- ZIP export: gyártási SVG + előnézeti PNG + rendelési JSON

## Indítás

A projektet elég feltölteni egy új GitHub repóba, majd GitHub Pages / Cloudflare Pages / Workers Static Assets / Netlify alatt publikálni.

Lokálisan az `index.html` megnyitható böngészőből is. A ZIP export a JSZip CDN-t használja, ezért ehhez internetkapcsolat szükséges.

## Fontok

A projekt NEM tartalmaz fontfájlokat. Az `Arial félkövér` és `Arial Black BT` böngészős rendszerfontokra támaszkodik. A `Bevásárlás BT` és `Bunshif Konzolt BT` helyettesítő megjelenítést használ addig, amíg a pontos, licencelt fontokat külön hozzá nem adjuk.

A gyártási SVG `<text>` elemet tartalmaz. Gravírozás előtt, ha a gyártógépen nincs meg a font, a szöveget Illustratorban/CorelDRAW-ban/Inkscape-ben görbévé kell alakítani.

## Későbbi UNAS integráció

Ha a tervezőt így nyitod meg:

`https://TERVEZO-DOMAIN/?return=https%3A%2F%2Ffalmatrica-lakasdekor.hu%2FTERMEK-URL`

akkor megjelenik a **Tovább a webshophoz** gomb, és visszaküldi ezeket a query paramétereket:

- `kamionterv`
- `kamionnev`
- `kamionfont`
- `kamiongrav`
- `kamionled`
- `kamionar`

Ehhez később külön UNAS integrációs script készíthető, amikor már megvan az új domain és a végleges termékoldal.
