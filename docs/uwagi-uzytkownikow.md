# Uwagi użytkowników — rejestr

Żywy rejestr uwag/feedbacku z produkcji. Każda uwaga: **zgłoszenie** (co napisał
użytkownik), **analiza** (o co naprawdę chodzi), **kierunek** (propozycja zmiany),
**lokalizacja** (gdzie w kodzie), **status**. Dopisuj nowe na górze listy.

**Statusy:** `NOWE` · `DO ROZWAŻENIA` · `ZAAKCEPTOWANE` (kierunek przyjęty, czeka na
realizację) · `W TOKU` · `ZROBIONE` (z linkiem do PR) · `ODRZUCONE` (z powodem).

> Realizacja = osobny branch + PR w `hajlajty-theme` (zwykle render). Rejestr nie jest
> miejscem na zmiany kodu — tylko na decyzje i namiary.

---

## U1 — Karta skrótu: mylący czas względny „X temu"

- **Zgłoszenie:** karty skrótów pokazują, kiedy skrót dodano, ale w formie „22 godziny
  temu" (bez „Dodano…") — można pomyśleć, że WTEDY odbył się mecz. Dodatkowo „kiedy
  skrót dodano" ma znikomą wartość informacyjną. Lepsza byłaby **data i godzina emisji**.
- **Analiza:** karta liczy czas względny od publikacji skrótu (ACF `skrot_published_at`,
  fallback: data wpisu) i wypisuje „… temu". Brak etykiety + format względny mylą z
  czasem meczu. Najbardziej informacyjny datum dla oglądającego to **kiedy odbył się
  mecz** (mamy płaską meta `kickoff`).
- **Kierunek (propozycja):** zastąpić „X temu" **bezwzględną datą+godziną meczu**
  (`kickoff`, czas PL przez `wp_date`), np. „24 cze 2026, 20:00". Spójne z propozycją U2
  (dzień/data zamiast czasu względnego).
- **DO DOPRECYZOWANIA:** „emisja" = **data meczu** (`kickoff`) czy **data publikacji
  skrótu** (`skrot_published_at`)? Założenie robocze: data meczu (najwięcej wartości;
  zgodne z uwagą o znikomej wartości czasu uploadu). Potwierdzić.
- **Lokalizacja:** `hajlajty-theme/features/match-lists/partials/card-skrot.php`
  (zmienna `$ago` → `.vcard__meta`).
- **Status:** `ZAAKCEPTOWANE` (po doprecyzowaniu „emisji").

## U2 — Karta zapowiedzi: usunąć „(czasu PL)", dodać dzień tygodnia

- **Zgłoszenie:** karty zapowiedzi mają datę, godzinę i „(czasu PL)". „Czasu PL" jest
  zbędne; w jego miejsce przydałby się **dzień tygodnia**, żeby nie sięgać do kalendarza.
- **Analiza:** dziś `wp_date('j M Y · H:i')` + dopisek „(czasu PL)". Dzień tygodnia
  realnie pomaga („sob, 24 cze · 20:00”). „Czasu PL” i tak wynika z `wp_date` (strefa WP).
- **Kierunek (propozycja):** format z **dniem tygodnia** (skrót PL, np. „sob"), bez
  „(czasu PL)". Sprawdzić spójność z innymi miejscami pokazującymi termin:
  `single-ns.php` (zapowiedź single) i terminarz — czy ujednolicić.
- **Lokalizacja:** `hajlajty-theme/features/match-lists/partials/card-zapowiedz.php`
  (`$when_label`, „(czasu PL)"); ew. `features/match-display/partials/single-ns.php`.
- **Status:** `ZAAKCEPTOWANE`.

## U3 — Długie nazwy reprezentacji rozjeżdżają teksty (krótka nazwa + tooltip)

- **Zgłoszenie:** niektóre reprezentacje mają długą nazwę (np. „Republika Południowej
  Afryki", „Demokratyczna Republika Konga") i rozjeżdżają teksty w niektórych miejscach.
  Propozycja **do rozważenia** (też pod kątem wydajności): dodać jedną meta „krótka
  nazwa" + tooltip z długą, używane w ciasnych miejscach (karta zapowiedzi, tabela).
- **Analiza:** część miejsc już ma `text-overflow: ellipsis` + `title` (np. tabela grup,
  karty drużyn — dodane przy MVP-g). Ellipsis ratuje układ, ale ucina „w połowie słowa".
  Kuratorska **krótka nazwa** (np. „RPA", „Korea Płd.") czyta się lepiej niż ucięcie.
  Dotyka modelu danych (CLAUDE.md #3/#4 — term meta `druzyna`).
- **Opcje:**
  - **A. Nowa term meta `nazwa_krotka`** (kuratorska; kolumna w seed CSV `teams.csv`),
    render używa jej w ciasnych miejscach + `title` = pełna nazwa. Plus: czytelność.
    Minus: nowe pole + uzupełnienie seeda. Wydajnościowo znikome (term meta czytane i tak).
  - **B. Bez zmian danych:** wszędzie CSS `ellipsis` + `title` = pełna nazwa. Plus: zero
    danych. Minus: ucięcie bywa brzydkie/niejednoznaczne.
- **Wydajność:** dokładanie jednej term meta jest tanie (czytane razem z `api_id`/
  `fifa_code`); to NIE jest problem wydajności, raczej decyzja „kuratorska nazwa vs
  ellipsis". Grupa płaskich meta ma być mała (#3), ale to term meta opisowa, nie klucz
  zapytań — mieści się w modelu.
- **Lokalizacja (gdyby A):** core `features/roster-seed/data/teams.csv` (kolumna) +
  `features/match/term-meta.php` (rejestracja) + render w theme (karty/tabela/profil).
- **Status:** `DO ROZWAŻENIA` (wybór A vs B należy do właściciela).

## U4 — Mecz na żywo: oś czasu / składy / statystyki jak w skrócie

- **Zgłoszenie:** w meczu NA ŻYWO oś czasu, składy i statystyki powinny wyglądać **tak
  samo jak w skrócie meczu** (widok zakończony/FT).
- **Analiza:** `single-live.php` i `single-ft.php` renderują te sekcje osobno i mogą się
  różnić markupem/stylem (live ma m.in. żywy fragment `live-fragment.php` dla osi/
  statystyk + własne składy inline). Cel: **wizualna spójność** osi/składów/statystyk
  między live a FT. To refaktor pod DRY — najlepiej wspólne partiale dla tych trzech
  sekcji, używane przez oba widoki (z live = wariant odświeżany).
- **Kierunek (propozycja):** wyodrębnić wspólny markup osi czasu / składów / statystyk i
  współdzielić między `single-live` a `single-ft` (uważać na żywą podmianę fragmentu w
  live — kotwice `.hajlajty-live` + poller). Najpierw zdiagnozować realne różnice
  (porównać oba single), potem ujednolicić.
- **Lokalizacja:** `hajlajty-theme/features/match-display/partials/` — `single-live.php`,
  `single-ft.php`, `live-fragment.php`; style w `assets/styles/match-single.css`.
- **Status:** `ZAAKCEPTOWANE` (kierunek), wymaga refaktoru — większy niż U1/U2.
