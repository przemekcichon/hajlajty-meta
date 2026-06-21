# Plan implementacji — hajlajty.pl

Żywy dokument. Dzieli pracę na fazy; każda faza = osobny branch/PR, osobno
testowalna. Bazuje na [CLAUDE.md](../CLAUDE.md) (Vertical Slice, git workflow,
decyzja #3 o `match_data`, Lokalizacja nazw) i [api-mapping.md](api-mapping.md).

**Status repo (punkt startowy).** Trzy artefakty mają już cienki bootstrap i pusty
`features/` (`.gitkeep`):
- `hajlajty-core/hajlajty-core.php` — bootstrap, brak logiki.
- `hajlajty-user/hajlajty-user.php` — bootstrap, brak logiki (poza zakresem tego planu).
- `hajlajty-theme/{functions.php,index.php,style.css}` — bootstrap motywu.

Każdy bootstrap musi dostać jeden mechanizm autoładowania slice'ów z `features/`
(prosty `foreach (glob(features/*/*.php))` albo jawna lista `require`). To
pierwsza, wspólna mikro-zmiana — opisana w Fazie 1 (część core) i Fazie 3 (motyw).

---

## Korekta proponowanego podziału (uzasadnienie)

Proponowany w zleceniu podział na 4 fazy zostaje. Dwie zmiany:

1. **Małe słowniki string→PL (runda, status, pozycje G/D/M/F) przenoszę z Fazy 2
   do Fazy 3 (motyw).** Powód: `match_data` trzymamy RAW/przycięty (decyzja #3 i
   sekcja C mapowania) — import NIE tłumaczy. Tłumaczenie jest wyłącznie operacją
   renderu, więc słownik należy do slice'a motywu, który go konsumuje (zasada
   „kod żyje tam, gdzie znika razem z funkcją"). W Fazie 2 nie ma konsumenta.

2. **Faza 2 to dwa niezależne slice'y, nie jeden.** `roster-seed` (terminy
   taksonomii z CSV) i `match-import` (fixtures→`match_data`) to osobne komendy
   o osobnym cyklu życia. Trzymam je jako dwa slice'y w `hajlajty-core`, z jawną
   zależnością: seed MUSI pójść przed pierwszym importem (import rozwiązuje
   `team.id`/`league.id` → term, a slug meczu potrzebuje kodu FIFA z term meta).

Dodatkowo wydzielam **Fazę 5 „później"** na rzeczy spoza MVP (standings, profil
drużyny, injuries) — żeby otwarte kwestie miały konkretne miejsce, a nie wisiały
bezterminowo.

---

## Faza 1 — `hajlajty-core`: fundament danych

Branch: `feature/faza-1-cpt-taksonomie`. Cel: model danych meczu istnieje w WP
i jest gotowy pod headless (GraphQL/REST), zanim cokolwiek importujemy.

### Slice'y i pliki (układ vertical slice)

```
hajlajty-core/
  hajlajty-core.php                     # +autoloader slice'ów (foreach glob)
  features/
    match/
      match.php                         # bootstrap slice'a: podpięcie hooków
      cpt.php                           # register_post_type('mecz') na 'init'
      permalink.php                     # struktura permalinków /mecz/...
      taxonomies.php                    # rejestracja 5 taksonomii na 'init'
      term-meta.php                     # term meta + pola w UI admina
      acf.php                           # acf_add_local_field_group() (grupa meczu)
```

Jeden slice `match` jest właścicielem CAŁEGO modelu meczu (CPT + taksonomie +
term meta + ACF) — zgodnie z CLAUDE.md: „slice 'match' rejestruje własny CPT
i taksonomie". Nie dziel taksonomii na osobny slice — są częścią tego samego
modelu i znikłyby razem z nim.

### Zakres

- **CPT `mecz`**: `show_in_graphql => true`, `graphql_single_name`/`graphql_plural_name`,
  `show_in_rest => true`, `has_archive => true`, `supports` = `title`, `editor`
  (post content = ręczne opisy/zapowiedzi, decyzja #5), `thumbnail`.
- **Taksonomie** (4 publiczne; wszystkie `show_in_graphql => true`,
  `show_in_rest => true`, `hierarchical` wg sensu):
  - `druzyna` (nie-hierarchiczna funkcjonalnie, ale dajemy hierarchical=true dla
    czytelnego UI checkboxów) — term meta: `fifa_code`, `api_id`.
  - `rozgrywki` — term meta: `league_id`.
  - `sezon` — termy „2026", „2025/26".
  - `kanal` — nadawca skrótu (decyzja #12: elastyczna taksonomia).
  - **NIE ma taksonomii `status_wideo`** — „ma wideo" to pochodna obecności
    `skrot_url` (CLAUDE.md decyzja #9), nie taksonomia. Patrz D1.4.
- **Term meta + UI**: pola edytowalne na ekranie terminu (add/edit form hooks
  `{tax}_add_form_fields`, `{tax}_edit_form_fields`, zapis na `created_{tax}`/
  `edited_{tax}`). `register_term_meta` z `show_in_rest`/`show_in_graphql`.
- **ACF (grupa per mecz, sekcja A2)** rejestrowana **kodem** przez
  `acf_add_local_field_group()` (wersjonowalne, migracja-safe — NIE klikane w
  adminie bez eksportu): `skrot_url` (URL/Video ID), `skrot_duration` (MM:SS),
  `skrot_published_at` (datetime). Kanał = taksonomia, NIE pole ACF.
  Faza 1 tylko DEFINIUJE pole `skrot_duration`; jego automatyczne wypełnianie
  z YouTube Data API to osobny slice w fazie danych zewnętrznych (Faza 5) —
  do tego czasu pole wypełniane ręcznie. Patrz D1.5.

### Decyzje wymagające zatwierdzenia

- **D1.1 — Struktura permalinków: ROZSTRZYGNIĘTE (raz i na zawsze, decyzja #7).**
  Schemat: `/mecz/{gospodarz}-{gosc}-{RRRR-MM-DD}`, gdzie {gospodarz}/{gosc} to
  PEŁNE polskie nazwy serwisowe drużyn (nazwa termu) transliterowane do ASCII,
  np. `/mecz/francja-chorwacja-2026-06-12`. Kolejność gospodarz-gość z fixture'a.
  BEZ `fixture.id` w URL (żyje w `match_data`/meta jako klucz dedup). Slug
  generowany RAZ przy tworzeniu wpisu — NIE regenerowany przy re-imporcie ani
  przy zmianie nazwy drużyny (stabilność linku > aktualność). Odrzucone:
  kody FIFA w slugu (mniej czytelne dla redaktora-nastolatka niż polska nazwa),
  samo `fixture.id` (brzydkie, nie-SEO), `%postname%` bez schematu (kolizje).
- **D1.2 — Nazwa CPT i slug: POTWIERDZONE.** `post_type = 'mecz'`, rewrite slug
  `mecz`. Przeżywa migrację headless.
- **D1.3 — Term meta drużyny: `fifa_code` 3-literowy.** Po D1.1 `fifa_code` NIE
  trafia już do slugu (slug = polskie nazwy). Służy wyłącznie designowi:
  `data-team`/herby/flagi (np. flagcdn po kodzie). Przechowujemy UPPER (`POL`),
  spójnie z `data-team` z designu. OK?
- **D1.4 — `status_wideo`: ROZSTRZYGNIĘTE — pochodna, nie taksonomia.**
  Konflikt w źródłach (CLAUDE.md mówił „taksonomia", data-inventory #14 „pole
  pochodne") rozstrzygnięty na korzyść pochodnej (CLAUDE.md decyzja #9):
  `status_wideo` NIE jest osobnym polem ani taksonomią — to pochodna obecności
  `skrot_url` (mecz ma skrót ⟺ pole wypełnione). Publicznie NIM nie filtrujemy.
  Kryterium „ma wideo" istnieje wyłącznie w adminie, w narzędziu Algolii (Faza 4,
  slice synchronizacji indeksu). W Fazie 1 nie ma więc nic do zrobienia poza
  NIE rejestrowaniem tej taksonomii.
- **D1.5 — `skrot_duration`: ROZSTRZYGNIĘTE — źródłem YouTube Data API.**
  Docelowo czas trwania pobieramy z YouTube Data API (klucz YT w `.env`, nigdy
  w repo/na froncie). Faza 1 tylko DEFINIUJE pole ACF `skrot_duration`; samo
  pobieranie to osobny vertical slice w fazie danych zewnętrznych (Faza 5).
  Do czasu tego slice'a pole wypełniane ręcznie (MM:SS) — ścieżka „najpierw
  ręcznie, potem z AI/API" (charakter projektu).

### Weryfikacja, że działa

- Aktywacja wtyczki bez błędów; `wp post-type list` pokazuje `mecz`;
  `wp taxonomy list` pokazuje 5 taksonomii.
- Ręczne utworzenie meczu w adminie: widać pola ACF, można przypisać terminy.
- Utworzenie terminu drużyny: pola `fifa_code`/`api_id` zapisują się (sprawdź
  `wp term meta get`).
- `/wp-json/wp/v2/mecz` zwraca CPT; jeśli WPGraphQL zainstalowany — typ `Mecz`
  i taksonomie widoczne w schemacie (`graphql` IDE). Bez WPGraphQL: wystarczy,
  że flagi `show_in_graphql` są ustawione (weryfikacja kodu).
- `flush_rewrite_rules` na aktywacji; przykładowy permalink renderuje 404→200
  po zapisaniu meczu (na razie z domyślnym szablonem).

---

## Faza 2 — seed rosteru + import z api-football

Branch: `feature/faza-2-seed-import`. Cel: dane drużyn/rozgrywek w taksonomiach
(seed) i komenda importu fixtures→`match_data`, odpalana cronem.

### Slice'y i pliki

```
hajlajty-core/features/
  roster-seed/
    roster-seed.php                     # bootstrap slice'a
    cli.php                             # WP-CLI: wp hajlajty seed
    data/teams.csv                      # PL nazwa, fifa_code, api_id
    data/leagues.csv                    # PL nazwa, league_id, sezon
  match-import/
    match-import.php                    # bootstrap slice'a
    cli.php                             # WP-CLI: wp hajlajty import
    client.php                          # cienki klient HTTP api-football (klucz z env)
    transform.php                       # API → match_data (sekcja C mapowania)
    schedule.php                        # logika „co odświeżyć teraz" (cron-driven)
```

### Zakres — seed

- `wp hajlajty seed --file=...` (domyślnie czyta `data/*.csv` z slice'a).
  Tworzy/aktualizuje termy taksonomii `druzyna`/`rozgrywki`; **idempotentne**,
  resolucja po `api_id`/`league_id` (NIGDY po nazwie). Nazwa termu = PL nazwa,
  `fifa_code`/`api_id`/`league_id` → term meta.
- CSV to źródło prawdy seeda; nazwa EN tylko jako komentarz/ściągawka, nie zapis
  (Lokalizacja nazw, CLAUDE.md).

### Zakres — import

- `wp hajlajty import [--league=] [--season=] [--fixture=] [--live]` woła
  kolejno `fixtures` → `fixtures/events` → `fixtures/lineups` →
  `fixtures/statistics`, transformuje do `match_data` wg **sekcji C** mapowania:
  - przycięcie koperty i pól nieużywanych (sekcja B),
  - `statistics` jako **obiekt kluczowany po `type`** (tylko typy z listy UI),
    wartości `%`/xG zostają stringami,
  - `events[].side` = `home`/`away` wyliczone z `team.id`; `player_id` **zostaje**,
  - `player_id` zostaje też w `lineups` (łączenie events↔skład),
  - sekcje `events`/`lineups`/`statistics` opcjonalne (zapowiedź ich nie ma).
- **Dedup po `fixture.id`**: szukamy istniejącego posta po meta `fixture_id`;
  jeśli jest — update, jak nie — insert. Slug ustawiany raz przy insert
  (polskie nazwy drużyn z termów, transliteracja do ASCII + data, kolejność
  gospodarz-gość z fixture'a — D1.1); kolejne importy NIE nadpisują slug, tak
  samo zmiana nazwy drużyny go nie regeneruje.
- **Przypisanie taksonomii** przy imporcie: `druzyna` (×2, resolucja po
  `teams.{home,away}.id`), `rozgrywki` (po `league.id`), `sezon` (po
  `league.season`). `status_wideo`/`kanal` NIE z importu (redaktorskie).
- **Klucz api-football**: z `wp-config`/env, nigdy w repo (CLAUDE.md, .gitignore).

### Strategia harmonogramu (konkret do zatwierdzenia)

- **Prawdziwy cron systemowy** woła `wp hajlajty import` (NIE goły WP-Cron —
  `define('DISABLE_WP_CRON', true)` na prod). Crontab jest „głupi" i stały;
  inteligencja („co odświeżyć") siedzi w `schedule.php`.
- Propozycja kadencji (jeden wpis crona co minutę, komenda sama decyduje):
  - **brak meczów w oknie** → no-op (tani SELECT, zero zapytań do API),
  - **okno okołomeczowe** (mecz w statusie LIVE lub kickoff w ±15 min) →
    odśwież TYLKO te fixtures, co 60 s (events/stats/lineups + goals/status),
  - **mecze najbliższych 48 h** (zapowiedzi) → odśwież metadane raz na 6 h,
  - **świeżo zakończone** (FT < 3 h temu) → jeszcze 1–2 odświeżenia, potem stop.
- Limit zapytań api-football (plan) → log liczby calli; przy zbliżaniu się do
  limitu komenda przerywa z ostrzeżeniem.

### Decyzje wymagające zatwierdzenia

- **D2.1 — Gdzie żyje CSV seeda?** Proponuję canonical w slice'u
  `roster-seed/data/` (plugin samowystarczalny dla komendy), nie w `docs/`
  (osobny artefakt). `docs/` może mieć kopię referencyjną. OK?
- **D2.2 — Zawartość CSV: POTWIERDZONE — dostarcza użytkownik.** Roster (CSV
  per liga: PL nazwa, `fifa_code`, `api_id`, `league_id`, sezon) dostarcza
  użytkownik. Seed go tylko konsumuje (idempotentnie, resolucja po ID).
- **D2.3 — Cron na Local (dev) vs prod.** Local (Flywheel) zwykle nie ma
  systemowego crona. Propozycja: dev = ręczne `wp hajlajty import` / opcjonalnie
  WP-Cron; prod = systemowy crontab. Potwierdź, że dev-flow ręczny wystarcza.
- **D2.4 — Kadencja 60 s / 6 h / okno ±15 min** — wartości do akceptacji
  (kompromis świeżość vs limit API).
- **D2.5 — Kierunek `subst` (player/assist = wchodzący/schodzący?)** — patrz
  Otwarte kwestie. To realny blocker transformacji eventów zmian; rozstrzygamy
  empirycznie w TEJ fazie (mamy zakończony mecz ze zmianami).

### Weryfikacja, że działa

- `wp hajlajty seed --dry-run` → lista termów do utworzenia; po realnym seedzie
  `wp term list druzyna` pokazuje PL nazwy, `wp term meta get` zwraca `api_id`.
- Re-run seeda nie tworzy duplikatów (idempotencja).
- `wp hajlajty import --fixture={id}` na próbce/realnym ID → powstaje 1 post
  `mecz`, `match_data` = poprawny JSON wg sekcji C (porównaj z
  [api-samples/](api-samples/)); taksonomie przypisane; slug =
  gospodarz-gosc-RRRR-MM-DD (polskie nazwy transliterowane do ASCII).
- Druga próba importu tego samego `fixture.id` → update, nie duplikat
  (sprawdź `wp post list --post_type=mecz --meta_key=fixture_id`).
- Import zapowiedzi (status `NS`) → `match_data` bez `events`/`lineups`/`stats`.
- Symulacja crona: ręczne odpalenie `schedule.php`-logic w trybie „brak okna" →
  zero calli do API.

---

## Faza 3 — motyw: szablony i przeniesienie designu

Branch: `feature/faza-3-motyw`. Cel: front renderuje publiczne widoki meczu z
`match_data` + taksonomii (TYLKO odczyt). Tu mieszka tłumaczenie RAW→PL (słowniki).

Render to za duży kawałek na jeden prompt (`design/` ~10K linii HTML), więc dzielimy
go na pod-etapy 3a–3d na JEDNYM branchu (jak Faza 2: seed→import→transform). Każdy
pod-etap jest osobno weryfikowalny i pracuje na wąskim kontekście (1–2 pliki HTML
naraz, nie 21). Kolejność wymuszona zależnością: 3a (logika) → 3b (szkielet + pierwszy
wariant single) → 3c (reszta wariantów) → 3d (listy).

### Slice'y i pliki

```
hajlajty-theme/
  functions.php                         # +autoloader slice'ów
  single-mecz.php                       # WP szuka single-{cpt}.php w root motywu
  archive-mecz.php
  front-page.php
  features/
    match-display/
      match-display.php                 # bootstrap: helpery + enqueue
      helpers.php                       # hajlajty_get_match_data() i pochodne
      lookups.php                       # string→PL: runda, status, pozycje, eventy, statystyki
      partials/                         # karty/sekcje z design/components
    layout/
      layout.php                        # header/footer/nawigacja, enqueue tokens+base
  assets/                               # przeniesione z design/ (css/js/img)
```

> Uwaga WP: `single-mecz.php`/`archive-mecz.php`/`front-page.php` MUSZĄ leżeć w
> roocie motywu (hierarchia szablonów WP ich tam szuka). Logikę/partiale trzymamy
> w slice'ach; pliki-szablony w roocie tylko `get_template_part()` do slice'a.

Przeniesienie designu: `tokens.css`/`base.css` → globalny enqueue; komponenty
(`card-*`, `match-row`, `pagination`) → partiale + ich CSS/JS. Flagi/herby z
flagcdn.com po kodzie FIFA z term meta. Kanał = taksonomia (`get_the_terms`), NIE
pole ACF. Render jest READ-ONLY — bez `editor-form` (→ faza `hajlajty-editor`), bez
`chip-follow`/`user-menu` (→ `hajlajty-user`, Faza 4).

### 3a — Fundament (zero HTML, czysta logika PHP)

- `hajlajty_get_match_data( $post_id )` — `get_post_meta` + `json_decode`; jedno
  miejsce dostępu do danych meczu.
- WŁASNY helper `api_id`→term drużyny (`get_terms` + `meta_query`, WSADOWO by
  uniknąć N+1). Helpery `hajlajty_import_*` są niedostępne na froncie (ground-truth
  Fazy 2) — render ma swój.
- `lookups.php` — słowniki string→PL:
  - status `short`→stan PL: 1:1 z [api-mapping.md](api-mapping.md) („Mapowanie
    statusu") — 4 stany (ZAPOWIEDŹ/LIVE/ZAKOŃCZONY/ODWOŁANY) + flaga „pokaż minutę"
    (`1H`/`2H`/`ET`) + fallback ZAPOWIEDŹ dla nieznanego kodu;
  - pozycje `G`/`D`/`M`/`F`→`Br`/`O`/`P`/`N`;
  - typy eventów (`type`+`detail`)→enum UI PL;
  - etykiety statystyk EN→PL;
  - runda `round`→PL (patrz D3.3).
- Weryfikacja: helpery zwracają poprawne PL dla próbki `match_data` realnego meczu.

### 3b — Szkielet motywu + single (wariant ZAKOŃCZONY/skrót)

- `functions.php` autoloader; `layout` (header/footer/nawigacja, enqueue
  tokens+base); `single-mecz.php` w roocie → `get_template_part` do slice'a
  `match-display`.
- **Scaffolding 4 stanów:** `single-mecz.php` wprowadza rozgałęzienie wg stanu
  (D3.1), ale 3b IMPLEMENTUJE tylko ZAKOŃCZONY; ZAPOWIEDŹ/LIVE/ODWOŁANY = jawne
  `TODO` (→ 3c).
- Wariant ZAKOŃCZONY renderuje:
  - **Nagłówek (ibar):** wideo (ze `skrot_url`) + wynik (`goals.*` — autorytatywny).
  - **Oś czasu** z narastającym wynikiem (pochodna ↓) + **statystyki**.
  - **Składy (lineups):** half-pitch z rozkładem zawodników po `pos` + `grid`;
    lista ławki; wskaźniki zdarzeń przy zawodniku (gol / żółta / czerwona / zmiana)
    z agregacji eventów (pochodna ↓).
  - **Prawy aside „inne mecze":**
    - „Inne skróty" — prosty `WP_Query`: `post_type=mecz`, niepuste `skrot_url`,
      te same `rozgrywki`, stan ZAKOŃCZONY, bez bieżącego posta, sort po meta
      `kickoff` malejąco, limit ~4; karty reużywają komponentu `card-highlight`.
    - „Polecane dla Ciebie" (personalizacja) → Faza 4 (`hajlajty-user`); w 3b
      POMINIĘTA.
    - Tytuł sekcji BEZ litery grupy (`round` nie niesie litery — patrz STUB-y ↓).
- **Pochodne — nowy plik `features/match-display/derive.php`** (czyste funkcje,
  bez WP/HTML, jak `lookups.php`):
  - **Indeks zdarzeń zawodnika:** `events[]` → mapa `player_id` →
    `{gole, żółta, czerwona, zszedł:?minuta, wszedł:?minuta}` — łącznik
    events↔lineups (zasila wskaźniki przy składzie).
  - **Oś czasu z bieżącym wynikiem:** `events[]` chronologicznie z narastającym
    wynikiem przy bramkach. Reguły: `own_goal` liczy się dla PRZECIWNIKA;
    `missed_penalty` NIE liczy; VAR-anulowany gol = znany brak (`TODO`, spójnie
    z api-mapping „VAR DO USTALENIA"). `goals.*` pozostaje autorytatywnym wynikiem
    nagłówka (ibar) — oś tylko ilustruje przebieg.
  - Mały helper ekstrakcji **YouTube ID** ze `skrot_url` (facade `data-yt`).
- **STUB-y / świadome pominięcia** (dane wycięte przy imporcie lub spoza 4
  zmapowanych endpointów — realne uzupełnienie w 3bi / Fazie 5):
  - Trener: STUB (placeholder) — realne po 3bi.
  - Kolory koszulek: STUB `home=accent`, `away=neutral` — realne (per fixture) po 3bi.
  - Litera grupy: POMINIĘTA (`round` = tylko numer kolejki; źródło `/standings`,
    mapping A5).
  - Powód kartki na osi: POMINIĘTY (`comments` wycięte przy imporcie).
  - Blok „Nieobecni / pauzujący": POMINIĘTY w całości (patrz Backlog).
- Kontekst: 1 plik HTML (Skrót Meczu).
- Weryfikacja: realny mecz FT renderuje się wizualnie zgodnie z `design/`; oś czasu
  i wskaźniki przy składzie zgadzają się z `events`; aside „inne skróty" listuje
  bez N+1.

### 3bi — Fix danych: kolory koszulek + trener (dwurepo)

Krótki pod-krok korygujący kontrakt danych pod realne STUB-y z 3b. Dwa repo,
osobne PR-y, kolejność wymuszona zależnością.

- **hajlajty-core (import, `transform.php`):** PRZESTAŃ wycinać `team.colors`
  i `coach` z `lineups` — zachowaj w `match_data.lineups` (kolory per strona;
  trener: `name`). [DECYZJA WŁAŚCICIELA — pytanie otwarte: czy dołożyć też
  `events[].comments` (powód kartki, ten sam mechanizm wycięcia)? Zostawione jako
  pytanie w PR, NIE implementowane domyślnie.]
- **Re-import meczu 11:** upsert po `fixture_id` → aktualizuje `match_data`; slug
  i `post_date` NIETKNIĘTE (stabilność linku, decyzja #7 / wariant B).
- **Powrót do renderu 3b (motyw):** podmiana STUB-ów kolorów/trenera na realne dane.
- Weryfikacja: `match_data.lineups.{home,away}` meczu 11 zawiera kolory i trenera;
  render pokazuje realne wartości zamiast STUB-ów; slug i `post_date` bez zmian.

### 3c — Pozostałe warianty single (gałęzie tego samego `single-mecz.php` wg statusu)

- Implementuje gałęzie ZAPOWIEDŹ / LIVE / ODWOŁANY scaffoldingu z 3b. Składy
  (half-pitch) i agregacja zdarzeń per `player_id` POWSTAŁY w 3b — 3c je REUŻYWA,
  nie buduje od nowa.
- LIVE (oś czasu + statystyki + minuta), ZAPOWIEDŹ (odliczanie + składy gdy są),
  ODWOŁANY (oznaczenie meczu odwołanego). Kontekst: HTML Mecz na Żywo + Zapowiedź Meczu.
- Odliczanie (ZAPOWIEDŹ) liczone z płaskiej meta `kickoff` (UTC) → czas polski w
  renderze (NIE z `fixture.date`; wariant B, fix PR #3 hajlajty-core).
- UWAGA: wariant ODWOŁANY NIE MA wzorca w `design/` — projektujemy go sami,
  minimalnie (oznaczenie „mecz odwołany" zamiast sekcji live/wideo, spójnie z
  tokenami designu).
- Weryfikacja: zapowiedź (NS, `publish` dzięki wariantowi B) pokazuje odliczanie
  bez sekcji live.

### 3d — Archiwum + strona główna

- `archive-mecz.php` (jeden, query var statusu — D3.2), `front-page.php`. Karty
  `card-*`.
- Sortowanie listy po meta `kickoff` (`orderby meta_value`), bez N+1 (jeden
  `WP_Query`).
- UWAGA — stan LIVE listy to PLACEHOLDER (domknięcie → §3e): brak płaskiej meta
  statusu, więc lista „Na żywo" i sekcja LIVE na home filtrują po OKNIE czasowym
  wokół `kickoff` (~150 min), NIE po realnym statusie. Skutki przybliżenia: mecz
  `FT` potrafi wisieć na liście do ~150 min po kickoffie, a mecz w dogrywce/karnych
  >150 min od kickoffu z niej znika. Świadome do czasu §3e. (Listy zmieniają
  przynależność dynamicznie przy każdym ładowaniu — `kickoff` vs „teraz" — więc
  reklasyfikacja po kickoffie NIE wymaga importu; to single zależy od `match_data`.)
- Kontekst: 1 plik listowy (Skróty lub Na Żywo) + Strona Główna.
- Weryfikacja: archiwum listuje, karty zgodne z `design/`, brak N+1, brak PHP
  notice (`WP_DEBUG=true`). `assets` ładują się z motywu (nie z `design/`).

### 3e — Live auto-refresh (PRZYSZŁY slice — NIE implementowany w 3c)

3c renderuje stan LIVE STATYCZNIE: minuta z `status.elapsed`, wynik z `goals`,
oś/składy/statystyki z `match_data` — wszystko z ostatniego importu, odświeża się
dopiero przy F5. 3e dokłada dwie warstwy (serwer + front), świadomie rozdzielone
i obie z osobnym uzasadnieniem budżetowym:

**Warstwa serwerowa — pętla importu danych live.**
- Źródło: `fixtures?live=all` (lista trwających meczów jednym żądaniem), parametr
  `league` WIELOWARTOŚCIOWY (`league=1-2-39…`) pod przyszłe rozgrywki klubowe —
  nie pojedyncze `fixture` w pętli. Sekcje live: statystyki z `/fixtures/statistics`,
  składy z `/fixtures/players` (UWAGA niżej), zdarzenia z `/fixtures/events`.
- Kadencja API: dane live aktualizują się co ~15 s — to GÓRNA granica sensownego
  odpytywania, nie cel sam w sobie.
- **Budżet vs ślepy polling:** ~7500 żądań/dobę (plan) vs 5760 kwadransów/dobę
  (24 h × 60 min ÷ 15 s). Ślepy polling co 15 s przez całą dobę zjadłby cały
  budżet na puste odpytania (mecze grają kilka godzin dziennie, nie 24 h). DLATEGO:
  preferowane HARMONOGRAMOWANIE odpytań z terminarzy rozgrywek (znamy `kickoff`
  z importu) — pollujemy `fixtures?live=all` TYLKO w oknach, gdy realnie trwają
  mecze śledzonych lig, a nie bez przerwy.
- **Magazyn pośredni:** rozważyć zapis świeżych danych live do TRANSIENTÓW
  (`set_transient`, TTL ~rząd minut), NIE przepisywać `post_meta` `match_data`
  co 15 s — to setki zapisów do `wp_postmeta` na mecz i niepotrzebne wersjonowanie.
  Po `FT` jeden finalny zapis do `match_data` utrwala stan końcowy (kontrakt 3b/3c).
- **Kontrakt danych — twardy wymóg:** kształt danych live MUSI być zgodny z
  istniejącym `match_data` (transform.php, Faza 2), żeby render 3c działał bez
  zmian. Punkt zapalny: `/fixtures/players` (źródło live składów) vs obecne
  `/fixtures/lineups` (import 3b) — inny kształt pól zawodnika; 3e musi
  zmapować `players` do tego samego kształtu `lineups{ formation, colors, coach,
  startXI[], substitutes[] }`, co `hajlajty_import_map_lineups`, albo świadomie
  rozszerzyć kontrakt (decyzja przy 3e).

**Filtrowanie LIST po realnym statusie (domknięcie placeholdera 3d).**
- Listy 3d (`/na-zywo/` + sekcja LIVE na home) decydują „co jest live" po OKNIE
  czasowym wokół `kickoff` (~150 min) — przybliżenie, bo nie ma płaskiego pola
  statusu, po którym `WP_Query` mógłby filtrować na poziomie SQL.
- 3e ma to zastąpić: dodać PŁASKĄ meta `status` (grupa 3 wg #3 — uzasadnienie:
  klucz FILTRA na poziomie `WP_Query`, nie tylko render → kwalifikuje się do grupy
  płaskich meta) zapisywaną przy imporcie i przy pętli live, i przełączyć
  `pre_get_posts` (slice `match-lists`) oraz sekcje `front-page.php` z okna
  czasowego na `meta_query` po statusie.
- WAŻNE: sam auto-refresh `match_data` (warstwa serwerowa niżej) NIE poprawi
  przynależności list — odświeży single i treść kart (minuta/wynik), ale o tym,
  KTÓRE mecze trafiają na „Na żywo", dalej zdecyduje filtr zapytania. Dlatego
  płaska meta `status` jest osobnym, świadomym elementem zakresu 3e, nie pochodną
  pętli live.

**Warstwa front-end — auto-refresh widoku (to jest „3e" w wąskim sensie).**
- Rekomendacja **B1: polling FRAGMENTU HTML renderowanego po stronie PHP** —
  klient co N s pobiera odświeżony wycinek (telebim + oś + statystyki) wyrenderowany
  tym samym kodem co 3c i podmienia go w DOM. Bez budowania równoległego renderera
  w JS (jedno źródło prawdy znacznika), headless-friendly (fragment = ten sam
  partial). Alternatywy (JSON + render w JS, WebSocket/SSE) — odrzucone na tym
  etapie jako nadmiarowe dla prostoty i spójności z klasycznym motywem.
- Brak teatru z designu „na żywo" (overlaye goli, podbijanie minuty w JS, przyciski
  demo) — 3c świadomie ich nie portuje; jeśli wrócą, to jako efekt na realnym
  zdarzeniu z odświeżonego fragmentu, nie symulacja.

#### Podział 3e na pod-slice'y (kolejność wymuszona zależnością)

Każdy pod-slice = osobny branch + PR, jak 3a–3d. Filozofia „najpierw ręcznie":
automatyczny harmonogram jest OSTATNI (3e-iv-a/b), nie pierwszy. Pod-slice'y rosną od
najtańszego (domknięcie placeholdera bez live-API) do najbogatszego (automatyzacja).

- **3e-i — Płaska meta `status` + filtr list po statusie (domyka placeholder 3d).**
  - hajlajty-core: istniejący `wp hajlajty import` dopisuje PŁASKĄ meta `status`
    (grupa 3, patrz D3.4) obok `match_data.status`; jednorazowy backfill wpisów już
    zaimportowanych.
  - hajlajty-theme: `pre_get_posts` (slice `match-lists`) i sekcje `front-page.php`
    przechodzą z OKNA czasowego (~150 min wokół `kickoff`) na `meta_query` po
    `status`.
  - Zależności: 3d na `main` (✓ zmergowane). NIE wymaga live-API — używa statusu
    z normalnego importu (świeży po imporcie; pętla live dokłada świeżość w 3e-ii).
  - Weryfikacja: po imporcie wpisy mają płaską `status`; `/na-zywo/` listuje TYLKO
    mecze o statusie LIVE; mecz po `FT` natychmiast wypada z „Na żywo" (koniec
    sztucznego okna 150 min); zapowiedzi/skróty bez regresji.

- **3e-ii — Core: ręczna komenda live-import (`wp hajlajty import-live`).**
  - hajlajty-core, w slice `match-import` (NIE osobny `match-live` — patrz niżej):
    komenda `wp hajlajty import-live` → `fixtures?live=<league-ids śledzonych lig>`
    → każdy element (ten sam kształt co zwykły `fixtures`) karmi istniejące
    `hajlajty_import_process_fixture()`. Zapis do `match_data` + płaskiej `status`
    jak przy zwykłym imporcie; składy live z `/fixtures/lineups` (D3.6 — bez
    `/fixtures/players`). Render BEZ zmian (czyta świeży `match_data`).
  - DWIE różnice wobec zwykłego importu: (a) tylko ŚLEDZONE LIGI (`live=<ids>` z
    term meta `league_id`, nie `live=all` globalnie — inaczej proces pobiera detale
    setek nietrackowanych meczów, marnotrawstwo API); (b) UPDATE-ONLY (pre-check po
    `fixture_id` — tworzenie wpisów zostaje przy zwykłym imporcie).
  - RĘCZNA, bez crona (D3.7). Bez transientów/overlay (D3.5 → 3e-iv-b): komenda
    ręczna = niska częstotliwość, więc zapis `match_data` wprost wystarcza.
  - SLICE: `import-live` żyje w `match-import`, bo reużywa jego client/transform/
    upsert — to import z innym źródłem fixture'a; osobny slice dodałby tylko
    zależność między slice'ami (korekta pierwotnego „nowy slice match-live").
  - OGRANICZENIE (domknięcie 3e-iv-a): mecz tuż po `FT` znika z `live=…`, więc
    import-live go nie sfinalizuje — status zostaje na ostatniej wartości live.
    Finalizacja ręczna przez `wp hajlajty import --fixture=<id>` (lub `--league
    --season`) po meczu; auto-finalizacja przychodzi w 3e-iv-a.
  - Zależności: 3e-i (płaska `status` w `process_fixture`). Kod nie koliduje.
  - Weryfikacja: `wp hajlajty import-live` w trakcie meczu → mecz wpada na
    `/na-zywo/`, `single-live` + karty po F5 pokazują realną minutę/wynik.

- **3e-iii — Theme: auto-refresh frontu (polling fragmentu HTML, rekomendacja B1).
  (✓ zmergowane na `main`.)**
  - REST route renderujący FRAGMENT widoku live (telebim + oś + statystyki) TYM
    SAMYM partialem co 3c; mały JS polluje co N s i podmienia wycinek w DOM (D3.8).
  - Zależności: 3e-ii (świeży `match_data`) + 3c (`single-live` na `main`).
  - Weryfikacja: otwarty mecz live odświeża telebim/oś bez F5; po `FT` polling się
    zatrzymuje (status ≠ LIVE); brak równoległego renderera w JS (jedno źródło
    znacznika).
  - ZWERYFIKOWANE runtime: endpoint 200/404; podmiana fragmentu bez F5 (Test A);
    pełna pętla `import-live` → front. Świeżość danych w trakcie i finalizacja FT
    nadal RĘCZNE — pełny hands-off dopiero w 3e-iv-a (cron + auto-FT).

3e-iv ROZBITE na dwa pod-slice'y (decyzja porządkująca, 2026-06): 3e-iv-a daje
hands-off live minimalnym kosztem i ryzykiem (samo core), 3e-iv-b to najtrudniejszy
kawałek (transienty + overlay = kontrakt CROSS-REPO). Ta sama logika „najpierw
prościej", którą rozbito całe 3e. Operacyjne decyzje rozkładają się między a i b.

- **3e-iv-a — Core: zautomatyzowany live-import w oknach (WP-Cron) + auto-FT
  (OPCJONALNE, na końcu).**
  - Zastępuje ręczne odpalanie `import-live` zaplanowanym WP-Cronem, ale TYLKO w
    OKNACH wokół znanych `kickoff` śledzonych lig (budżet API — nie ślepy polling
    24/7). Cron ORKIESTRUJE istniejącą komendę, nie kopiuje pipeline'u. Robimy
    DOPIERO gdy tryb ręczny (3e-ii/3e-iii) się sprawdzi.
  - Auto-finalizacja FT: mecz znikający z `live=…` domykany targetowanym
    `fixtures?id=<id>` (istniejąca ścieżka `import --fixture`) → zapis `FT` do
    `match_data` + płaskiej `status` → poller 3e-iii dostaje `data-live="0"` i milknie.
  - BEZ transientów — zapis wprost do `match_data` jak w 3e-ii (transienty dopiero
    w 3e-iv-b, gdy realna kadencja crona to uzasadni — D3.5).
  - Wyłącznie hajlajty-core; ręczne `import-live` i `import --fixture` zostają działające.
  - USTALENIA (2026-06, po ground-truth):
    - (0) REFAKTOR-FIRST: logika importu (`hajlajty_import_process_fixture`,
      orkiestracja live, `_tracked_leagues`, `_find_post_by_fixture_id`) jest dziś
      ZA guardem `if ( ! WP_CLI ) return;` w cli.php/cli-live.php → niedostępna dla
      callbacku crona. Pierwszy commit 3e-iv-a wydziela ją do pliku ładowanego
      ZAWSZE (slice `match-import`), zwracającą strukturalny wynik; komendy WP-CLI
      zostają cienkimi wrapperami. Bez tego cron nie ma czego wywołać.
    - (1) KADENCJA ~1 min (własny `cron_schedules`). „~15 s" NIEOSIĄGALNE przez
      WP-Cron (request-driven; granulacja OS-crona min 1 min) — dla redakcji i
      pollera (30 s) w pełni wystarcza. W Local WP-Cron jest request-driven
      (`DISABLE_WP_CRON` niezdefiniowane, `wp cron test` OK); PEWNA kadencja na
      prod wymaga systemowego crona bijącego `wp cron event run --due-now`
      (kod działa na WP-Cron; reszta to ops/deploy, udokumentowane).
    - (2) OKNO: cron odświeża, gdy istnieje śledzony mecz z `kickoff ∈
      [teraz−180 min, teraz+5 min]` i jeszcze nie `FT`; poza oknem zero zapytań
      do live-API. Pojedynczy mecz zamyka auto-FT.
    - (3) AUTO-FT bez nowego magazynu stanu: porównaj posty DB-live (płaska meta
      `status` ∈ kody live, reuse 3e-i) z bieżącym zbiorem `live=all`; mecz
      obecny w DB-live, a nieobecny w `live=all` → domknij targetowanym
      `fixtures?id=<id>` i zapisz cokolwiek API zwróci (idempotentne; `HT` → no-op,
      `FT/AET/PEN` → finalizacja → poller dostaje `data-live="0"` i milknie).
    - (4) STALE-FT (korekta po runtime 3e-iv-a, 2026-06): samo AUTO-FT (3) działa
      TYLKO, gdy tik trafi w OKNO (2). Gdy żaden tik nie odpali się w oknie — na
      Localu brak nocnego ruchu napędzającego WP-Cron; na prodzie luka systemowego
      crona dłuższa niż okno po zniknięciu meczu z `live=all` — mecz wypada z
      `live=all` nieobserwowany i WISI na ostatnim statusie In-Play (poller bije
      dalej, front pokazuje live) aż do ręcznego `import --fixture`. Ujawnił to
      realny przypadek: mecz rozpoczęty w nocy zawisł na `2H`. Domknięcie: tik
      POZA oknem dokłada stale-FT — jeśli istnieje post z płaską `status` ∈ kody
      live i `kickoff` starszym niż DOLNA granica okna (teraz − 180 min; żaden
      mecz tyle nie trwa → status utknął), domyka go targetowanym `fixtures?id`
      (TEN SAM finalizator co AUTO-FT), BEZ `live=all`. Budżet: poza oknem API
      dotykamy TYLKO gdy realnie coś wisi (pusta lista zawieszonych = zero
      zapytań); zbiór sam się opróżnia po `FT`. Bez nowego magazynu stanu (spójne
      z (3)); odpowiedź wciąż In-Play (rzadkie `SUSP/INT`) → retry w kolejnym tiku
      aż do statusu terminalnego — ograniczone w praktyce. Ścieżka W OKNIE bez
      zmian (tam AUTO-FT i tak domyka zawieszone, bo są nieobecne w `live=all`).
  - Zależności: 3e-ii (`import-live`) + 3e-iii (poller — żeby `data-live="0"`
    faktycznie zatrzymał front po FT).
  - Weryfikacja: cron odpala live-import TYLKO w oknach meczowych śledzonych lig;
    poza oknami zero zapytań do live-API; mecz po gwizdku sam dostaje `FT`, poller
    milknie. STALE-FT: mecz zawieszony w statusie live (kickoff > 180 min temu)
    domyka się w kolejnym tiku poza oknem; gdy nic nie wisi — poza oknem zero
    zapytań do API.

- **3e-iv-b — Transienty + overlay renderu → PRZENIESIONE DO FAZY 5** (decyzja
  2026-06). Uzasadnienie 3e-iv-b było wyłącznie CZĘSTOTLIWOŚCIOWE (D3.5): transienty
  bronią przed setkami zapisów `match_data` przy cronie ~15 s. Ale 3e-iv-a ustaliło
  kadencję ~1 min — i to jest kadencja PRODUKCYJNA (crontab `* * * * *`), nie
  ograniczenie Locala. Przy ~1 min bezpośredni zapis `match_data` (~120 zapisów na
  mecz, zwykłe `update_post_meta` bez rewizji) jest tani, więc warunek z D3.5 NIE
  zachodzi — budowanie transientów byłoby abstrakcją „na zapas" (CLAUDE.md #8).
  Transienty wracają dopiero przy świadomym wyborze kadencji SUB-MINUTOWEJ (wymaga
  innego harmonogramu niż crontab) lub przy zmierzonej presji zapisów. Pełny opis
  techniczny i warunek wejścia: Faza 5.

### Decyzje wymagające zatwierdzenia (3e)

- **D3.4 — Co trzyma płaska meta `status`? ROZSTRZYGNIĘTE: SUROWY `status.short`**
  (np. `1H`/`FT`), NIE enum 4-stanowy. Korekta pierwotnej propozycji enuma: mapa
  `short→stan` żyje w MOTYWIE (`lookups.php`); zapis enuma wymagałby DRUGIEJ kopii
  tej mapy w core → duplikacja między repo. Core trzyma kod surowo (wierny API),
  motyw wyprowadza zbiór kodów „live" ze swojej jedynej mapy
  (`hajlajty_status_live_codes`); listy filtrują `status IN (kody live)`. Jedno
  źródło prawdy mapowania.
- **D3.5 — Magazyn danych live. ROZSTRZYGNIĘTE: zapis WPROST do `match_data`**
  (jak zwykły import); transienty + overlay renderu ODROCZONE. Powód: rationale
  „nie zapisuj co poll" jest CZĘSTOTLIWOŚCIOWE — bije dopiero przy cronie ~15 s.
  Komenda 3e-ii jest RĘCZNA (niska częstotliwość), więc bezpośredni zapis wystarcza
  i jest prostszy (render bez zmian, zero kontraktu klucza transientu między repo).
  **AKTUALIZACJA (2026-06):** także 3e-iv-a pisze WPROST do `match_data` — kadencja
  crona to ~1 min (crontab, RÓWNIEŻ na produkcji), nie ~15 s, więc warunek
  częstotliwościowy nie zachodzi i przy starcie. Transienty przeniesione z 3e-iv-b
  do **Fazy 5**; wracają tylko przy świadomej kadencji sub-minutowej (inny
  harmonogram niż crontab) lub zmierzonej presji zapisów.
- **D3.6 — Składy live. ROZSTRZYGNIĘTE: bez `/fixtures/players`.** Po obejrzeniu
  próbki: element `fixtures?live=…` ma ten sam kształt co zwykły `fixtures`, a
  składy live dostarcza `/fixtures/lineups` (już mapowane przez
  `hajlajty_import_map_lineups`, podpięte w `process_fixture`). 3e-ii reużywa
  istniejącą ścieżkę — zero nowego mapowania, „punkt zapalny" znika.
- **D3.7 — Tryb uruchamiania: RĘCZNY najpierw. ROZSTRZYGNIĘTE** —
  `wp hajlajty import-live` (3e-ii), cron dopiero w 3e-iv-a. Zgodne z „najpierw
  ręcznie" i z realiami dev (agent pisze kod, człowiek odpala runtime).
- **D3.8 — Transport frontu (3e-iii): REST** (`/wp-json/hajlajty/v1/mecz/{id}/live`),
  nie admin-ajax — headless-friendly, spójne z decyzją #6 (migracja do WPGraphQL).
  Interwał pollingu N ≈ 30 s (front nie musi gonić kadencji API 15 s). Wartości do
  akceptacji.

### Decyzje podjęte

- **D3.1 — JEDEN `single-mecz.php` z gałęziami wg 4 stanów** (nie 3 — doszedł
  ODWOŁANY). Mniej duplikacji niż osobne szablony. Podjęte.
- **D3.2 — JEDEN `archive-mecz.php` + query var statusu** (Skróty/Zapowiedzi/Na
  Żywo to warianty jednego archiwum). Spójne z Fazą 4. Podjęte.
- **D3.3 — Format rundy PL:** grupowe „Group Stage - N"→„Faza grupowa — N.
  kolejka"; pucharowe wg listy (1/16, 1/8, ćwierćfinał, półfinał, mecz o 3.
  miejsce, finał) z FALLBACKIEM na surowy string dla nieznanej rundy. Podjęte.

### Poza zakresem Fazy 3

Render Fazy 3 to publiczne widoki meczu (odczyt). Pozostałe widoki designu mają
wskazany dom; szczegółowy zakres każdej z tych faz powstaje, gdy są bliskie (zero
abstrakcji na zapas również w planowaniu):
- **Terminarz Turnieju, Tabele Grup, Reprezentacje / Profil kraju** → wciągnięte
  do **Fazy MVP — na produkcję** (decyzja 2026-06: to widoki potrzebne na launch,
  nie „później"). Reprezentacje: 4A ich NIE tworzy (chip filtruje karty, nie buduje
  strony drużyny — brak kolizji URL-i, patrz USTALENIA 4A); strona drużyny powstaje
  jako osobny widok w Fazie MVP. Grupy/Reprezentacje ciągną za sobą źródła
  `/standings` i `/teams/statistics` (były Faza 5 — patrz tam).
- **Ulubione / Obserwowane / Konto / Ustawienia** → Faza 4 (`hajlajty-user`),
  PO MVP (MVP bez rejestracji). W sidebarze do tego czasu boks „wkrótce" (Faza MVP).
- **Panel Redaktora** → faza `hajlajty-editor`, PO MVP (do launchu redakcja w WP admin).

---

## Faza 4 — wyszukiwanie: publiczne (front) i redakcyjne (Algolia)

Cel: zrealizować ROZDZIAŁ wyszukiwania z CLAUDE.md. To dwa niezależne światy,
osobne branche/PR-y i osobne slice'y. NIE mieszamy ich kodu.

### 4A — Publiczne (front): natywne taksonomie + lekki własny JS

Branch: `feature/faza-4a-front-filtry`. Celowo proste, headless-friendly (te same
dane pójdą przez WPGraphQL). BEZ FacetWP, BEZ Algolii.

> **BRAMKA PRZED-PRODUKCYJNA (decyzja 2026-06).** 4A (wyszukiwarka po DRUŻYNACH +
> chipsbar) to MINIMUM przed wyjściem na produkcję — bez tego front nie ma
> podstawowej nawigacji po treści. Faza 3 (szablony + live: 3e-i…3e-iv-a +
> stale-FT) jest domknięta; 4A jest NASTĘPNYM krokiem implementacyjnym. 4B
> (Algolia, redakcyjne) zostaje PO MVP. Kolejność na launch: 4A → ops wdrożenia
> (klucz API, seed, crontab wg `cron-produkcja.md`) → produkcja.

```
hajlajty-theme/features/
  filters/
    filters.php                         # cienki bootstrap + enqueue (widoki LIST)
    normalize.php                       # normalizator nazw PL (kontrakt PHP↔JS)
    ui.php                              # chipsbar + pole + modal mobile + pigułka filtra
    assets/filters.js                   # lepki filtr kliencki (vanilla JS, sessionStorage)
    assets/filters.css                  # style paska/chipów/modalu (port z designu)
    partials/chips-bar.php              # chipy DRUŻYN (teams-only — patrz (e))
```

Zakres:
- **Wyszukiwarka tekstowa: tylko po DRUŻYNACH.** Pole nad listą zawęża widoczne
  karty po nazwie drużyny (klient, live).
- **Chipsbar pod headerem** — chipy z publicznych taksonomii (drużyna, rozgrywki,
  sezon, kanał) zbudowane z `design/components/chip-follow`, `chips-drag`.
- **Live-filtrowanie kart wg KONTEKSTU strony** — serwer dostarcza kontekstową
  listę (archiwum drużyny/rozgrywek/sezonu przez `pre_get_posts` → `tax_query`),
  JS zawęża już wyrenderowane karty bez przeładowania.
- **Kliknięcie chipsa = TRWAŁY filtr** — utrzymuje się nawet po wyczyszczeniu
  pola tekstowego (chip i tekst to dwa niezależne, łączone (AND) kryteria).
- BEZ statusu meczu jako filtra publicznego i BEZ `status_wideo` (pochodna,
  decyzja #9) — to kryteria redakcyjne (4B).

USTALENIA 4A (2026-06, po ground-truth + doprecyzowaniu — WARIANT LEKKI, na stałe):
- (a+d) FILTR LEPKI KLIENCKI, BEZ dedykowanych archiwów taksonomii. Chip NIE
  nawiguje i NIE tworzy strony drużyny — filtruje karty AKTUALNEGO widoku
  klient-side i TRZYMA się przy przełączaniu stron (`sessionStorage`), aż go
  odznaczysz. Multi-select: OR w obrębie taksonomii (Francja LUB Niemcy). Na 4A
  chipy mają JEDNĄ taksonomię (drużyna — patrz (e)), więc „AND między taksonomiami"
  wraca dopiero z rozgrywkami/sezonem w Fazie 5 (`filters.js` już obsługuje wiele
  taksonomii — to dołożenie chipów, nie zmiana logiki). Tekst łączony AND z chipami.
  Serwer renderuje pełną listę stanu — JS tylko ZAWĘŻA istniejące karty. BEZ
  `query.php`/`tax_query`, BEZ SERWEROWEGO filtrowania list (jedyna zmiana zapytania
  = zdjęcie stronicowania archiwów — patrz (f)), BEZ szablonów archiwum taksonomii,
  BEZ nowych rewrite (więc bez flush). Dedykowane strony drużyny/grup = przyszłość
  („Reprezentacje", „Grupy"), nie 4A.
- WIDOCZNOŚĆ: chipsbar + pole szukania na WIDOKACH LIST (home + /na-zywo/,
  /zapowiedzi/, /skroty/; w przyszłości terminarz/grupy/reprezentacje). NIGDY na
  single (skrót/zapowiedź/live) — enqueue wyklucza `is_singular('mecz')`.
- (b) DATA-* NA KARTACH: `data-teams="{HOME_FIFA} {AWAY_FIFA}"` +
  `data-rozgrywki`/`data-sezon`/`data-kanal` (slugi) na karcie; `data-filterable`
  na siatce. Źródło: rozszerzony batch-resolver (zero N+1); `card-skrot` używa
  już-przekazanego `$args['terms']`. Zero drugiego renderera, zero zapytań per karta.
- (c) SZUKANIE PO DRUŻYNACH Z OGONKAMI: `data-team-names` = znormalizowane nazwy PL
  home+away; mały normalizator PL w PHP (slice `filters`) + port JS z designu
  (ł→l + NFD); dopasowanie substring. Szukamy po nazwach PL, nie po FIFA.
- (e) ZAKRES CHIPÓW = TYLKO DRUŻYNY (decyzja 2026-06). Chipsbar i modal mają wyłącznie
  chipy drużyn; rozgrywki i sezon jako chipy → Faza 5 (karty już niosą `data-rozgrywki`/
  `data-sezon`, więc to dołożenie chipów, nie zmiana danych); kanał świadomie NIE jest
  filtrem publicznym. Przycisk „Wyczyść filtry" zastąpiony PIGUŁKĄ aktywnego filtra
  (nazwy filtrowanych drużyn + czyszczenie), wspólną dla desktopu i mobile.
- (f) ARCHIWA BEZ STRONICOWANIA (decyzja 2026-06, korekta wcześniejszego „BEZ zmian
  w `pre_get_posts`"). Filtr jest KLIENCKI — widzi tylko karty obecne w DOM. Przy
  stronicowaniu trafienia ze strony 2+ byłyby nieosiągalne, a strona 1 mogłaby
  fałszywie pokazać „brak wyników". Dlatego `pre_get_posts` (slice `match-lists`)
  wymusza na zapytaniu archiwum `posts_per_page = -1` + `no_found_rows`, a
  `archive-mecz.php` zdejmuje `the_posts_pagination` — serwer renderuje KOMPLET
  stanu na jednej stronie, JS filtruje całość. To JEDYNE dotknięcie `pre_get_posts`
  w 4A: nadal BEZ `tax_query`/serwerowego filtra, BEZ nowych rewrite, bez flush
  (reguły `/page/N/` zostają nieszkodliwe przy `-1`). Świadomie BEZ capa (cap po
  przekroczeniu po cichu wróciłby do tego samego błędu). Dla Mundialu (≲104 mecze/
  lista) komplet w DOM jest tani; rewizja przy piłce klubowej → stronicowanie +
  filtr serwerowy/Algolia (4B).
- SLICE: nowy `hajlajty-theme/features/filters/` = warstwa filtra (ui.php chipsbar +
  pole, partials/chips-bar.php, assets/filters.js — lepki filtr w `sessionStorage`).
  Render list bez zmian (slice `match-lists`, poza dołożeniem data-* do kart).
  Granica vertical slice zachowana.

### 4B — Redakcyjne (admin): Algolia + slice synchronizacji indeksu

Branch: `feature/faza-4b-algolia` (osobny PR, po MVP front-u). Rosnące narzędzie
kwerend dla redakcji. Indeks Algolii = POCHODNA, NIGDY źródło prawdy.

```
hajlajty-core/features/
  algolia-sync/
    algolia-sync.php                    # bootstrap
    client.php                          # klient Algolia (klucze z wp-config/.env)
    indexer.php                         # CPT/taksonomie/match_data → rekord indeksu
    hooks.php                           # push przy save_post/acf/save_post i imporcie
```

Zakres:
- Synchronizacja do indeksu przy zapisie posta i przy imporcie (Faza 2).
  Rekord = pochodna z CPT/taksonomii/`match_data` (NIE odwrotnie).
- Narzędzie kwerend dostępne TYLKO dla zalogowanych (admin). Tu żyją kwerendy
  rosnące: drużyny, rozgrywki, sezon, „ma wideo" (z `skrot_url`) → docelowo
  zawodnicy, gole itd.
- Klucze Algolii w `wp-config`/`.env`, nigdy w repo ani na froncie.

### Decyzje wymagające zatwierdzenia

- **D4.1 — Publiczny front: lekki vanilla JS (live-filtrowanie) zamiast czystego
  reloadu.** Przyjęte: serwer renderuje kontekstową listę, JS zawęża karty bez
  przeładowania; chipy trwałe. Interactivity API ewentualnie później (spójnie
  z decyzją dla `hajlajty-user`). **POTWIERDZONE (2026-06): vanilla JS na MVP 4A.**
- **D4.2 — Status MECZU (ZAPOWIEDŹ/LIVE/ZAKOŃCZONY)** — pochodna z
  `fixture.status.short`, nie taksonomia. Listy publiczne są stałe per widok
  (Na Żywo/Zapowiedzi/Skróty), więc status meczu NIE jest publicznym filtrem
  użytkownika. Filtrowanie po statusie/„ma wideo" → narzędzie Algolii (4B).
- **D4.3 — Algolia: zakres startowy indeksu.** Które pola wpuszczamy do rekordu
  na start (tytuł, drużyny, rozgrywki, sezon, kanał, `skrot_url` jako flaga,
  data)? Reszta dochodzi iteracyjnie.

### Weryfikacja, że działa

- 4A: wpisanie nazwy drużyny zawęża karty na żywo; chip drużyny zostaje aktywny
  po wyczyszczeniu pola tekstowego; kombinacja chip + tekst działa (AND).
- 4A: archiwum drużyny/rozgrywek/sezonu ładuje właściwą kontekstową listę
  (serwerowo); brak SQL spoza `WP_Query`; pusty wynik → komunikat, nie błąd.
- 4B: zapis/import meczu aktualizuje rekord w indeksie Algolii; usunięcie posta
  usuwa rekord; narzędzie kwerend niedostępne dla niezalogowanych.

---

## Faza MVP — na produkcję: treści turniejowe + trim launchowy

Bramka po 4A i ostatni krok przed wejściem na produkcję (decyzja 2026-06). ZAKRES
MVP zawężony świadomie: BEZ rejestracji/logowania, BEZ panelu redaktora „z
prawdziwego zdarzenia" (redakcja wzbogaca mecze w WP admin jak dotąd — CLAUDE.md
#10). W zamian MVP MUSI dostać trzy widoki turniejowe (były „później") i kosmetyczny
trim, który chowa to, czego MVP jeszcze nie obsługuje.

Każdy widok/trim = osobny slice/branch + PR (jak dotąd). Render READ-ONLY z
importu/`match_data`/taksonomii; wzorce w `design/` (strony już istnieją).

### Treści turniejowe (wciągnięte z Fazy 5 / „po Fazie 5")

- **Terminarz turnieju.** ŹRÓDŁO STYLU = `design/Hajlajty - Terminarz Turnieju.html`
  (pełny plik): pełnoekranowa powłoka aplikacji z TRWAŁYM, domyślnie widocznym
  sidebarem (jak home/archiwa), nagłówek `.page-head` (eyebrow + tytuł + lead +
  legenda stanów), karty `.vcard`/`.live-card`/`.card--preview`. Plik „Terminarz
  Modularny (wzorzec)" to TYLKO referencja architektury (delegacja kart,
  `data-card-region`) — NIE źródło wyglądu (inne klasy kart, minimalny chrome).
  Dane JUŻ z importu (`fixtures` → kickoff, rozgrywki, drużyny) — zero nowego
  źródła. Lista meczów pogrupowana po dniu/kolejce. Link sidebara „Mundial 2026" → realny.
- **Tabele grup** (`design/Hajlajty - Tabele Grup.html`, widok TG). ⚠️ WYMAGA
  `/standings` — ŹRÓDŁO WCIĄGNIĘTE z Fazy 5 do MVP (patrz Faza 5 / mapping A5). Z
  nim przychodzi **litera grupy A–L** (12 grup, decyzja #6) — domyka pominięcie
  litery grupy z 3b. Najpierw slice importu standings (core), potem widok (motyw).
- **Reprezentacje / Profil kraju** (`design/Hajlajty - Reprezentacje.html` +
  „Profil Belgia"). ⚠️ WYMAGA `/teams/statistics` — ŹRÓDŁO WCIĄGNIĘTE z Fazy 5
  (próbka `teams-statistics.jsonl` jest; najpierw dobór pól wg odpowiedzi #10).
  Strona drużyny to osobny widok — bez kolizji URL z permalinkiem meczu (#7).

KONSEKWENCJA (zapisana świadomie): wciągnięcie STRON wciąga ich DANE. Sloty
`/standings` i `/teams/statistics` przestają być „później" — stają się
zależnością MVP. Faza 5 zachowuje je tylko jako zapis + to, co ZOSTAJE później
(injuries, forma, YouTube duration, transienty live).

### Trim launchowy (kosmetyka pod brak konta/edytora)

- **(1) Efekty eventów na single LIVE.** Port z prototypu (`design/Hajlajty - Mecz
  na Żywo.html`): `@keyframes golPop` (gol), `scoreBump` (wynik), `cardFlip`
  (kartka) + efekt zmiany. W prototypie odpalane SYMULACJĄ (`data-demo`); w MVP
  mają być reakcją na REALNE zdarzenie z odświeżanego fragmentu live (3e-iii) —
  bez symulacji/przycisków demo. Domyka świadome pominięcie „teatru live" z 3c/3e.
  Slice: rozszerzenie `match-display` (single-live) + ewentualnie fragment REST
  3e-iii; ZERO nowego źródła danych (efekt na bazie zdarzeń z `match_data`).
- **(2) Schowanie afordancji konta.** Do czasu `hajlajty-user`: ukryć ikonę
  „Profil" w topbarze (`layout/partials/header.php`) oraz przyciski kibica „dodaj
  do ulubionych"/„przypomnij mi" (fav/bell). UWAGA: z decyzji 3b/3c akcje kibica
  NIE były portowane na karty/single, więc realna powierzchnia = głównie ikona
  Profil; przy implementacji zweryfikować, czy fav/bell nie wyciekły gdzie indziej.
  „Schować", NIE usuwać — wracają z `hajlajty-user`.
- **(3) Sidebar „Twoje" → boks „wkrótce" (decyzja 2026-06, wariant TEASER).** Trzy
  martwe linki (Obserwowane/Ulubione/Ustawienia, dziś `href="#"`) zastąpione jednym
  miękkim boksem-teaserem: „✨ Twoje Hajlajty — ulubione mecze, obserwowane drużyny
  i konto: budujemy to teraz!" + plakietka „Już wkrótce". Informuje I buduje
  oczekiwanie (spójne z charakterem projektu), zamiast wyglądać na zepsute.
  Odrzucone: wyszarzone linki z tagiem „wkrótce" (słabszy komunikat) i jedna
  dyskretna linijka (za mało „zapowiada"). Boks znika i wraca jako realne linki z
  `hajlajty-user`. Równolegle: linki grupy „Mundial 2026" (Terminarz/Grupy/
  Reprezentacje) z `#` → realne URL-e, gdy ich strony powstaną wyżej.

### Podział na pod-slice'y (branch + PR, kolejność wymuszona zależnością)

Każdy pod-slice = osobny branch + PR (jak 3a–3e). Filozofia „najpierw prościej":
najpierw tani trim dający „launch look", potem widoki niezależne od nowych danych,
na końcu pary import→widok. Repo w nawiasie (granica artefakt↔artefakt).

- **MVP-a — Trim afordancji konta + sidebar (motyw, slice `layout`).** Punkty trimu
  (2) i (3): ukrycie ikony „Profil"/fav-bell + zamiana grupy „Twoje" na boks-teaser
  „wkrótce". Zero danych, zero zależności — najtańsze, daje od razu produkcyjny
  wygląd. (Branch np. `feature/mvp-trim-launchowy`.)
- **MVP-b — Efekty eventów live (motyw, `match-display` + fragment 3e-iii).** Punkt
  trimu (1): `golPop`/`scoreBump`/`cardFlip` + zmiana, na REALNYM zdarzeniu z
  odświeżanego fragmentu. Zależy od 3e-iii (✓ na main) i `match_data` — ZERO nowego
  źródła. Niezależny od a/c.
- **MVP-c — Terminarz turnieju (motyw).** Dane już z importu (`fixtures`); zero
  nowego źródła. Niezależny — może iść równolegle z a/b. Aktywuje link sidebara.
- **MVP-d — Import `/standings` + litera grupy A–L (core, slice danych).** Warunek
  MVP-e; rozstrzyga źródło litery (`/standings` vs ręcznie). Może startować
  równolegle do a/b/c (osobne repo).
- **MVP-e — Tabele grup (motyw).** Zależy od MVP-d (standings + litera). Aktywuje
  link sidebara. UWAGA renderu: strefę wiersza (`.qual`/`.play`) wyznaczaj po
  POZYCJI (`rank`) / obecności niepustego `zone`, NIE przez string-match na `zone`
  — string różni się między edycjami turnieju (2026 „Round of 32" vs 2022
  „Promotion - World Cup (Play Offs)"). MVP-d zapisuje `zone` SUROWO; interpretacja
  należy do renderu (patrz pamięć projektu „standings-zone-varies").
- **MVP-f — Import `/teams/statistics` + dobór pól wg #10 (core, slice danych).**
  Warunek MVP-g. Może startować równolegle do MVP-d.
- **MVP-g — Reprezentacje / Profil kraju (motyw).** Zależy od MVP-f. Strona drużyny
  jako osobny widok (bez kolizji URL z meczem, #7). Aktywuje link sidebara.

Łańcuchy zależności: **d→e** (standings→grupy), **f→g** (statystyki→reprezentacje);
**a, b, c** niezależne. Dwa tory danych (d, f) w core mogą iść równolegle do toru
motywu. Po komplecie → ops wdrożenia (klucz API, seed, crontab wg
`cron-produkcja.md`) → produkcja.

### Po MVP (potwierdzenie, bez zmian zakresu)

- **`hajlajty-user`** (Faza 4: ulubione/obserwowane/konto + rejestracja) — PO MVP.
- **`hajlajty-editor`** (panel redaktora) — PO MVP; do launchu redakcja w WP admin.
- **4B (Algolia, redakcyjne)** — PO MVP (jak dotąd).

---

## Faza — `hajlajty-editor`: pulpit redaktora (zapis skrótu)

Redakcyjne wzbogacanie zaimportowanego meczu (CLAUDE.md #10): redaktor-nastolatek
dodaje `skrot_url` + kanał. Mecze powstają WYŁĄCZNIE z importu (Faza 2) — ta faza
NIE tworzy danych meczowych, tylko edytuje dwa redakcyjne atrybuty istniejącego wpisu.
Zależy od Fazy 1 (pola ACF skrótu istnieją) i Fazy 3 (front edytora: komponent
`editor-form` z designu).

### Warstwa zapisu = `acf_form()` (decyzja)

Zapis pól skrótu idzie przez **`acf_form()`** — natywny frontendowy formularz ACF —
**NIE przez własny REST endpoint**. ACF obsługuje render pól + walidację + nonce +
zapis (`update_field`) dla `skrot_url` / `skrot_duration` / `skrot_published_at`.
Upraszcza fazę: nie budujemy własnej logiki zapisu dla pól ACF.

> **KOREKTA wcześniejszego ustalenia „REST endpoint zapisujący `skrot_url`".**
> Zapis pól skrótu = `acf_form()`, nie własny REST. Wzorzec `hajlajty-user`
> („trwały backend REST + wymienna warstwa frontowa") dotyczył ulubionych/
> obserwowanych — tam zapisujemy WŁASNY model danych użytkownika, więc REST
> z autoryzacją przez nonce ma sens. Tutaj zapisujemy do ISTNIEJĄCYCH pól ACF
> na CPT mecz, więc `acf_form()` jest właściwym, prostszym narzędziem.

### Decyzje wymagające zatwierdzenia

- **D — przypisanie taksonomii `kanal` przez `acf_form()`** (rozstrzygnąć przy
  starcie fazy). `acf_form` natywnie obsługuje POLA ACF, a `kanal` to taksonomia.
  Dwie opcje:
  - **(a)** pole ACF typu „taxonomy" wskazujące na `kanal`, wpięte w ten sam
    `acf_form` — całość jednym formularzem, czystsze. **Domyślnie preferowane.**
  - **(b)** osobny element wyboru termu poza ACF + własny zapis przypisania.
  - Zweryfikować przy starcie fazy: czy ACF taxonomy field POPRAWNIE zapisuje
    przypisanie termu do posta (nie tylko jako meta).

### Poza `acf_form` (osobna warstwa)

`acf_form()` to pojedynczy formularz EDYCJI jednego meczu — NIE lista. Dlatego
osobną warstwą nad nim są:
- **Lista „z wideo / bez wideo"** — `status_wideo` jako POCHODNA obecności
  `skrot_url` (CLAUDE.md #9), nie pole/taksonomia.
- **Paginacja pulpitu redaktora** (PuR).

---

## Faza 5 — „później" (poza MVP)

Branch(e) osobne, gdy ruszymy. Cel: zebrać tu wszystko odłożone, żeby nie
ciążyło na MVP. Każde to przyszły osobny slice + PR.

- **`/standings`** — ✅ ZREALIZOWANE w „Fazie MVP" jako slice core
  `features/standings-import/` (MVP-d, PR hajlajty-core#11): import 12 grup A–L do
  meta `standings_<sezon>` na termie `rozgrywki`; litera = część wiersza tabeli
  (źródło rozstrzygnięte: `/standings`, nie ręcznie). Próbka dograna
  (`api-samples/standings.jsonl`). **Odłożone follow-upy (post-MVP-d, do rozważenia
  tutaj — NIE blokery):**
  - **Cron odświeża zakończone turnieje w nieskończoność.** Raz zaimportowany,
    zamrożony sezon (np. WŚ 2022) jest re-fetchowany co godzinę bez końca
    (1 zapytanie/para/h). Dla MVP (1 liga × ~2 sezony, ~48/dzień z puli 7500)
    nieszkodliwe, ale to stały, rosnący z czasem koszt API bez wartości dla sezonów
    zakończonych. Do rozważenia: nie odświeżać sezonu starszego niż X / „zamrożenie"
    tabeli po wykryciu końca turnieju (np. wszystkie statusy mecze FT). NIE w MVP-d.
  - **Kadencja crona — ZAAKCEPTOWANE odstępstwo, do ew. rewizji stratega.** Prompt
    MVP-d #7 kazał „mirror cadence fixtures", ale realny cron fixtures
    (`match-import/cron.php`) to live-polling z oknami meczowymi + stale-FT (custom
    interwał `hajlajty_one_minute`) — mechanizm nieprzenośny na wolno zmienne
    standings. MVP-d użył wbudowanego `hourly` + bramy budżetowej (odświeża TYLKO
    pary z istniejącym `standings_<sezon>`; świeża instalacja = 0 zapytań) — zgodne
    z #8 (bez custom-interwału na zapas). Decyzja kadencyjna należy do stratega, gdyby
    koszt/świeżość zaczęły uwierać (sprzężone z follow-upem o zakończonych turniejach).
- **`/teams/statistics`** — ⚠️ WCIĄGNIĘTE DO „Fazy MVP — na produkcję" (wymaga go
  widok Reprezentacje/Profil). Profil drużyny/reprezentacji (§10, widok PB).
  Próbka `teams-statistics.jsonl` jest. Najpierw wybór pól wg odpowiedzi #10
  (zaproponować realny zestaw z danych API: śr. goli, posiadanie, czyste konta,
  kartki — to, co faktycznie jest w próbce). Forma drużyny — odpuszczona.
- **`/injuries`** — status nieobecności (Kontuzja/Zawieszenie, §6). Alternatywa:
  pole ręczne ACF. Decyzja przy realizacji. Tu wraca też **blok „Nieobecni /
  pauzujący"** pominięty w 3b — brak pola w czterech zmapowanych endpointach,
  więc czeka na to samo źródło (`/injuries` lub pole ręczne).
- **Ostatnie mecze / forma** (§10) — ten sam `/fixtures`, inne zapytanie (po
  drużynie). Razem z profilem drużyny.
- **Czas trwania wideo z YouTube Data API** (D1.5) — slice fazy danych
  zewnętrznych: pobiera `skrot_duration` po Video ID z `skrot_url`. Klucz YT
  w `.env`. Do tego czasu pole ręczne.
- **Dedykowana rola „Redaktor Hajlajty"** — własna rola WP z OGRANICZONYMI
  uprawnieniami: dostęp do meczów i wpisów (tworzenie/edycja), BEZ pełnego
  admina — bez kodu, wtyczek i ustawień. Wprost pod charakter projektu
  (redaktorzy-nastolatkowie pracują bezpiecznie, bez ryzyka rozbicia instalacji).
- **Auto-ingest wideo z kanałów YouTube + dopasowanie LLM** (przyszła osobna
  faza) — automatyczne wciąganie nowych filmów z obserwowanych kanałów YouTube
  i dopasowywanie skrótu do właściwego meczu po TYTULE przez LLM. Nadbudowa nad
  ręcznym dodawaniem `skrot_url` (ścieżka „najpierw ręcznie, potem z AI").
- **Transienty + overlay renderu danych live (było 3e-iv-b, CROSS-REPO)** —
  przeniesione tu z Fazy 3 (decyzja 2026-06). **Warunek wejścia (żaden = nie
  robimy):** świadoma kadencja SUB-MINUTOWA (~15 s) na produkcji — która wymaga
  innego harmonogramu niż crontab (systemd timer / wrapper ze `sleep`, bo crontab
  nie zejdzie poniżej 1 min) — LUB zmierzona presja zapisów do `wp_postmeta`. Przy
  obecnej kadencji ~1 min (crontab, też na prodzie) zapis WPROST do `match_data`
  wystarcza i jest prostszy. Gdy warunek zajdzie: dane live lądują w TRANSIENCIE
  (TTL rzędu minut), render NAKŁADA transient na `match_data` w JEDYNYM punkcie
  odczytu (`hajlajty_get_match_data`), więc `single-live` i endpoint REST 3e-iii
  dostają świeże dane bez zmian; finalny `match_data` zapisujemy RAZ po `FT`.
  CROSS-REPO: klucz transientu = KONTRAKT między hajlajty-core (zapis) a
  hajlajty-theme (odczyt/overlay) — nazwa/TTL/kształt jawnie po obu stronach;
  granica artefakt↔artefakt. DO ROZSTRZYGNIĘCIA przy realizacji: wzorzec nazwy
  klucza (per fixture/post), TTL, kształt (cały `match_data` czy tylko pola
  live-zmienne), reguła nakładania na `match_data`. Zależność: 3e-iv-a (✓).
- **Chipy filtra: ROZGRYWKI + SEZON (rozszerzenie 4A)** — w 4A publiczny chipsbar
  jest TYLKO po drużynach (decyzja 2026-06). Chipy rozgrywek i sezonu wracają
  tutaj: dołożyć je do `partials/chips-bar.php` (z etykietami grup) i do `TAXES`
  w `filters.js`; karty już niosą `data-rozgrywki`/`data-sezon` (slice match-lists,
  zero zmian po stronie danych). KANAŁ świadomie NIE jest filtrem publicznym
  (brak wartości dla użytkownika) — zostaje wyłącznie taksonomią redakcyjną
  (źródło skrótu) i ewentualnym filtrem w narzędziu Algolii (4B).

---

## Otwarte kwestie z mapowania (przypisanie do faz)

| Kwestia | Źródło | Faza | Status / akcja |
|---|---|---|---|
| Kierunek `subst` (player/assist = wchodzący/schodzący?) | mapping §events | **Faza 2** | ROZSTRZYGNIĘTE empirycznie: `player`=WCHODZĄCY, `assist`=SCHODZĄCY. Transform przepisuje surowo (zero relabelingu); mapowanie etykiet = render (Faza 3). |
| Oznaczenie własnej bramki / karnego / niewykorzystanego karnego | mapping §events | **Faza 3** | Decyzja UI: czy i jak oznaczać `Own Goal`/`Penalty`/`Missed Penalty`. Dane są; brak w designie. |
| Eventy `Var` (np. Goal cancelled) | mapping §events | **Faza 3** | Pomijać czy pokazywać. Domyślnie: pomijać (brak w enumie designu). |
| Czas trwania wideo (źródło) | mapping A2 | **Faza 1** (pole) / **Faza 5** (pobieranie) | Rozstrzygnięte: źródłem YouTube Data API. Faza 1 definiuje pole ACF; slice pobierający = faza danych zewnętrznych (Faza 5). Do tego czasu ręcznie. Klucz YT w `.env`. |
| `/standings` (tabele grup) | mapping A5 | **Faza MVP** | ✅ ZREALIZOWANE — slice core `features/standings-import/` (MVP-d, PR core#11); zapis `standings_<sezon>` na termie `rozgrywki`. Follow-upy crona → Faza 5. |
| Litera grupy A–L (12 grup) | mapping A5, §3 | **Faza MVP** | ✅ ZREALIZOWANE (MVP-d) — źródło `/standings` (`group` → litera `^Group ([A-L])$`), zapisana jako część wiersza tabeli. |
| `/teams/statistics` (profil drużyny) | mapping A5 | **Faza MVP** | wciągnięte z Fazy 5 — widok Reprezentacje/Profil; najpierw dobór pól. |
| `/injuries` (status nieobecności) | mapping A5 | **Faza 5** | później / ew. pole ręczne. |
| Statystyki rozszerzone (xG, insidebox itd.) | mapping §statistics | **Faza 2/3** | Import: które `type` wpuścić do `match_data`. Wg odpowiedzi #4 — wziąć wszystkie dostępne, tłumaczyć i pokazać te, co się mieszczą. Lista typów do zatwierdzenia. |
| Status `SUSP`/`AWD`/`WO` (mapowanie enum) | mapping §status | **Faza 3** | ROZSTRZYGNIĘTE: pełna mapa kod→stan PL w [api-mapping.md](api-mapping.md) („Mapowanie statusu"). `SUSP`/`INT`→LIVE, `AWD`/`WO`→ODWOŁANY. `lookups.php` (3a) realizuje ją 1:1. |

---

## Zależności między fazami

- Faza 2 (import) wymaga Fazy 1 (CPT/taksonomie/term meta istnieją).
- Faza 2: seed PRZED importem (slug + resolucja po ID potrzebują term meta).
- Faza 3 (render) wymaga danych z Fazy 2 (choć szablony można szkicować na
  ręcznie wpisanym meczu z Fazy 1).
- Faza 4 wymaga taksonomii (Faza 1) i list/archiwum (Faza 3).
- Faza 5 niezależna, ruszamy po MVP.

## Pytania ogólne — status

ROZSTRZYGNIĘTE:
- **CPT = `mecz`** (D1.2). Nazwa i slug `mecz`, przeżywa migrację.
- **WPGraphQL — później.** W Fazie 1 tylko ustawiamy flagi `show_in_graphql`
  i weryfikujemy przez REST; instalację WPGraphQL i realny test schematu
  odkładamy na czas migracji headless (nie blokuje MVP).
- **ACF — rejestracja KODEM** (`acf_add_local_field_group`), nie klikana
  w adminie (wersjonowalne, migracja-safe).
- **Roster CSV — dostarcza użytkownik** (D2.2), CSV per liga; seed konsumuje.
- D1.1 permalink, D1.4 `status_wideo`, D1.5 czas wideo — rozstrzygnięte powyżej.

POZOSTAJĄ DO ZATWIERDZENIA (nie blokują rozpoczęcia Fazy 1):
- D1.3 (UPPER `fifa_code`), D2.1/D2.3/D2.4/D2.5, D4.1–D4.3 oraz
  pozycje z tabeli „Otwarte kwestie z mapowania" (przypisane do faz jak były:
  `subst` → Faza 2; standings / `teams-statistics` / injuries → Faza 5).
  D3.1–D3.3 — PODJĘTE (patrz „Faza 3 → Decyzje podjęte").
