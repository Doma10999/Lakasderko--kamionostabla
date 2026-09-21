# Kamionos LED tábla tervező – V3

Önálló Lakás Dekor tervező a 49 × 12 cm-es kamionos LED táblához.

## Fő működés

- Tábla: **490 × 120 mm**
- Bal / jobb biztonsági margó: **50 / 50 mm**
- Felső margó: **14 mm**
- Alsó margó: **5 mm**
- Hasznos terület: **390 × 101 mm**
- Gravírozás: **Kontúr gravírozás** vagy **Telibe gravírozott**
- LED: **Kék, Zöld, Piros, Fehér, RGB**
- Standard ár: **8 500 Ft**
- RGB ár: **11 150 Ft**
- A terv mentésekor készül:
  - **SVG 1.1 gyártási fájl**
  - **JPG előnézeti kép**
  - **ZIP csomag**
  - **00_TERV_ADATOK.txt**
- Az SVG fájl neve mindig a tervazonosító, például: `KL-260921-ABC123.svg`
- A terv a Lakás Dekor tervezői e-mail címére kerül elküldésre.
- A **Terv módosítása** ugyanabban a böngészőben visszatölti a korábban elmentett tervállapotot.

## UNAS integráció

Termékoldal:

`https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat`

Cikkszám:

`FL340481`

Tervező:

`https://lakasderko--kamionostabla.lakasdekor.workers.dev/`

Az UNAS script fájl:

`UNAS-integracio-bemasolhato.js`

Beillesztés: **body end**, minden oldalon.

### UNAS termék beállítások

1. Választható tulajdonság: **LED színe**
   - Kék: +0 Ft
   - Zöld: +0 Ft
   - Piros: +0 Ft
   - Fehér: +0 Ft
   - RGB: +2 650 Ft

2. Választható tulajdonság: **Gravírozás**
   - Kontúr gravírozás: +0 Ft
   - Telibe gravírozott: +0 Ft

3. Szövegbeviteli termékparaméter: **Tervazonosító**
   - a vásárlónak nem kell kitöltenie
   - a script automatikusan kitölti
   - a rendelésben megmarad

A LED és gravírozás natív UNAS változatként marad, ezért a választás bekerül a kosárba és a végleges rendelésbe is. A termékoldalon a script ezeket vizuálisan elrejti, mert a vevő a tervezőben választja ki őket.

## Fontok

Az **Arial félkövér** és **Arial Black BT** görbévé alakítható a gyártási SVG-ben a jelenlegi fontfájlokkal.

A **Bevásárlás BT** és **Bunshif Konzolt BT** jelenleg helyettesítő előnézetet használ. A pontos gyártási SVG-hez ezek eredeti, használható fontfájljai szükségesek.
