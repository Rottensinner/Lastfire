# Ostatnie Ognisko — rozbudowana wersja 2

Gra idle w Vue 3 + TypeScript + Vite. Płaski interfejs: zasoby po lewej, osada lub drzewko pośrodku, szczegóły po prawej. Ikony używają logicznej siatki 16 × 16. Bez backendu, płatnych usług i zewnętrznych grafik.

## Uruchomienie

Wymagany Node.js 22 lub nowszy.

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
npm run preview
```

Katalog `dist/` jest gotową stroną statyczną. Testy nie wymagają przeglądarki.

## Pierwsze kroki

1. Startujesz z sześcioma osobami. Cztery zbierają drewno, kamień, jedzenie i wodę; dwie są wolne.
2. W Odkryciach kliknij ikonę narzędzi kamiennych. Opis i przycisk badania pojawią się po prawej.
3. Po badaniu warsztat narzędzi pojawi się w osadzie. Dodaj budowę do kolejki i przydziel budowniczego.
4. Po budowie zwolnij budowniczego i przydziel go do wytwarzania narzędzi.
5. Odkryj drwala i kamieniarza. Narzędzia odblokowują pracę oraz zwiększają tempo.
6. Odkryj i zbuduj szałasy, aby przyjąć wędrowców w zakładce Wydarzenia.
7. Zwiad i obóz otworzą Stary trakt. Wyprawy przywożą nasiona, mapy i złoto. Odbierz łupy w zakładce Wyprawy.
8. Dalej wybieraj rolnictwo, obróbkę drewna, handel i metalurgię. Pełny katalog zawiera `docs/KATALOG.md`.

## Zaimplementowane systemy

- Drzewko z sześcioma kolumnami, ikonami i liniami faktycznych zależności. Węzły ujawniają się po spełnieniu wszystkich wymagań. Odkryte pozostają widoczne.
- Badania za surowce, znaleziska z wypraw i specjaliści zdobywani w wydarzeniach.
- Budynki oraz receptury pojawiają się po odblokowaniu, zamiast ujawniać cały katalog od początku.
- Osobny przydział ludzi, pauza i limit zapasu dla każdej receptury. Produkcje jednego zakładu działają równolegle.
- Narzędzia kamienne ×1,5, z brązu ×2 i żelazne ×3. Jeden komplet na pracownika. Dostępne narzędzia przechowuje magazyn; wyposażone są przypisane do konkretnego zadania.
- Automatyczne wyposażanie co pięć tików oraz ręczne wyposażanie/zdejmowanie. Przy niedoborze sprzętu pierwszeństwo mają wcześniejsze zadania w konfiguracji.
- Specjaliści dają trwałe premie osadzie i nie są osobnymi pracownikami. Cieśla wspiera drewno oraz deski, górnik kopalnię i kamieniarza, rolniczka gospodarstwo i młyn, kupiec obniża ceny zakupu.
- Mieszkańcy wyłącznie z zaakceptowanych wydarzeń. Domy zapewniają pojemność, nie produkują ludzi.
- Budowniczowie, kolejka do pięciu różnych budynków, zmiana priorytetów i anulowanie ze zwrotem materiałów. Materiały są opłacane przy dodaniu do kolejki.
- Magazyn: 200 na start i +200 na poziom. Złoto nie podlega limitowi magazynu. Powracające wyposażenie i zwrot wyposażenia pracowników mogą tymczasowo przekroczyć pojemność, aby uniknąć utraty przedmiotów.
- Rezerwy chronią materiały przed zużyciem w recepturach. Nie blokują badań, budowy, handlu ani spożycia mieszkańców.
- Wyprawy rezerwują ludzi i wyposażenie. Plecak daje +25% łupów, kamienne narzędzia +15%. Sprzęt wraca; zapasy są zużywane. Nagrody są gwarantowane, a odkrycie cyny nie zależy od losowania.
- Łupy i nadmiar zwróconych materiałów pozostają do odbioru, także przy pełnym magazynie.
- Złoto, osobne ceny zakupu/sprzedaży, ograniczony zapas kupca, zamówienia i reputacja. Dostawa i zamówienia odświeżają się co 300 tików.
- Wojsko odblokowywane przez badania: garnizon, milicja, włócznicy i łucznicy, wyposażenie, szkolenie, morale, ranni, posterunki oraz garnizony osad zależnych.
- Operacje strategiczne: patrole, rozpoznanie, eskorta, ratunek jeńców, wypędzanie szabrowników i szturm na wrogi posterunek. Zapasy są opłacane przed wymarszem, wynik zależy od siły, wyszkolenia, morale i rozpoznania.
- Straty zmniejszają populację; ranni blokują przydział do pracy aż do wyzdrowienia. Garnizon główny poprawia porządek, a oddziały w osadach zależnych podnoszą ich bezpieczeństwo.

## Tik i bilans

Jeden tik to dokładnie jedna sekunda. `advance` zbiera ułamki czasu i uruchamia całe kroki `tick`. Receptury w `data.ts` podają zużycie i produkcję na jednego pracownika / tik. Ułamki zasobów są zachowywane; komplety narzędzi przydziela się dopiero po ukończeniu pełnej sztuki.

Produkcja = suma wydajności wyposażonych i niewyposażonych pracowników × premia paleniska/specjalistów/organizacji × warunki osady. Jeśli zadanie wymaga narzędzi, niewyposażeni pracownicy nie produkują. Przy ograniczonej ilości wejścia receptura wykonuje proporcjonalną część produkcji. Przepływy są rozliczane w kolejności katalogu.

Każdy mieszkaniec zużywa 0,012 jedzenia i 0,01 wody na tik. Braki spowalniają produkcję i budowę do 25%; nikt nie umiera. Narzędzia nie mają zużycia. Bilans w panelu jest bieżącym szacunkiem tempa — dostępne materiały i limity mogą ograniczyć faktyczny wynik najbliższego tiku.

## Zapis i kompatybilność

Zapis lokalny pod kluczem `ostatnie-ognisko-v2`, co 15 sekund i przy ukryciu strony. Maksymalnie 8 godzin postępu offline. Zapis jest przypisany do adresu strony i przeglądarki. Używaj jednej karty gry.

Jeżeli v2 nie istnieje, gra odczyta wcześniejszy `ostatnie-ognisko-v1` i przeniesie zasoby, mieszkańców oraz pasujące budynki. Potrzebni poprzednicy badań są odblokowywani, stare przydziały trafiają do odpowiednich receptur, a osada dostaje 6 kamiennych kompletów. Dodawane jest schronienie, jeśli wymaga tego zachowanie populacji. Poprzedni klucz pozostaje nietknięty. Aktywne zadania ze starego modelu nie są przenoszone. Import akceptuje oba formaty; eksport zapisuje v2.

## Struktura

- `src/types.ts` — kontrakty danych.
- `src/data.ts` — zasoby, budynki, receptury, drzewka, wydarzenia, wyprawy i handel.
- `src/engine.ts` — czysta gospodarka i walidacja/migracja zapisów.
- `src/military.ts` — oddziały, wyposażenie, operacje wojskowe, posterunki i leczenie.
- `src/useGame.ts` — zegar i zapis Vue.
- `src/components/DiscoveryTree.vue` — układ i połączenia odkryć.
- `src/App.vue` — działający interfejs wszystkich systemów.
- `src/style.css` — stylistyka i układ responsywny.
- `tests/engine.test.ts` — gospodarka, populacja, narzędzia, kolejka, wyprawy, migracja i osiągalność technologii.

## Przykład rozbudowy konfiguracji

Aby dodać kolejną produkcję istniejącego surowca, dodaj recepturę w `data.ts`:

```ts
r('wood-salvage', 'Odzysk drewna', { planks: 0.1 }, { wood: 0.15 }, 'sawing')
```

Każda receptura automatycznie dostaje osobny przydział pracowników, wyposażenie, pauzę i limit. Przy zmianie katalogu dla istniejących zapisów dodaj migrację tworzącą nowe zadania; samo dopisanie konfiguracji nie aktualizuje starych stanów. Nie zmieniaj identyfikatorów bez migracji.

## Kolejne etapy

Obecna wersja nie zawiera jeszcze placówek terenowych, karawan na stałych trasach, automatycznego przenoszenia pracowników według priorytetów, zużywania narzędzi ani pór roku. Te systemy warto dodawać po przetestowaniu tempa tej gospodarki. Kod jest grywalnym przykładem, a wartości produkcji i kosztów punktem wyjścia do balansu.
