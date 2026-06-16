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
- Kontekst: 1 plik listowy (Skróty lub Na Żywo) + Strona Główna.
- Weryfikacja: archiwum listuje, karty zgodne z `design/`, brak N+1, brak PHP
  notice (`WP_DEBUG=true`). `assets` ładują się z motywu (nie z `design/`).

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
- **Terminarz Turnieju** → osobno tuż po Fazie 3 (dane już z importu).
- **Tabele Grup** → Faza 5 (standings).
- **Reprezentacje / Profil kraju** → faza po Fazie 5.
- **Ulubione / Obserwowane / Konto / Ustawienia** → Faza 4 (`hajlajty-user`).
- **Panel Redaktora** → faza `hajlajty-editor` (na koniec).

---

## Faza 4 — wyszukiwanie: publiczne (front) i redakcyjne (Algolia)

Cel: zrealizować ROZDZIAŁ wyszukiwania z CLAUDE.md. To dwa niezależne światy,
osobne branche/PR-y i osobne slice'y. NIE mieszamy ich kodu.

### 4A — Publiczne (front): natywne taksonomie + lekki własny JS

Branch: `feature/faza-4a-front-filtry`. Celowo proste, headless-friendly (te same
dane pójdą przez WPGraphQL). BEZ FacetWP, BEZ Algolii.

```
hajlajty-theme/features/
  filters/
    filters.php                         # bootstrap
    query.php                           # pre_get_posts: kontekstowa lista (tax_query)
    ui.php                              # render chipsbara + pola wyszukiwarki
    assets/filters.js                   # live-filtrowanie kart (vanilla JS)
    partials/chips-bar.php
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
  z decyzją dla `hajlajty-user`). Potwierdź, że vanilla JS wystarcza na MVP.
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

- **`/standings`** — tabele grupowe (data-inventory §9, widok TG) + **litera
  grupy A–L** (12 grup, decyzja #6). Źródło litery (`/standings` vs ręcznie)
  rozstrzygamy tutaj. Próbki: brak (dograć).
- **`/teams/statistics`** — profil drużyny/reprezentacji (§10, widok PB).
  Próbka `teams-statistics.jsonl` jest. Najpierw wybór pól wg odpowiedzi #10
  (zaproponować realny zestaw z danych API: śr. goli, posiadanie, czyste konta,
  kartki — to, co faktycznie jest w próbce). Forma drużyny — odpuszczona.
- **`/injuries`** — status nieobecności (Kontuzja/Zawieszenie, §6). Alternatywa:
  pole ręczne ACF. Decyzja przy realizacji.
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

---

## Otwarte kwestie z mapowania (przypisanie do faz)

| Kwestia | Źródło | Faza | Status / akcja |
|---|---|---|---|
| Kierunek `subst` (player/assist = wchodzący/schodzący?) | mapping §events | **Faza 2** | ROZSTRZYGNIĘTE empirycznie: `player`=WCHODZĄCY, `assist`=SCHODZĄCY. Transform przepisuje surowo (zero relabelingu); mapowanie etykiet = render (Faza 3). |
| Oznaczenie własnej bramki / karnego / niewykorzystanego karnego | mapping §events | **Faza 3** | Decyzja UI: czy i jak oznaczać `Own Goal`/`Penalty`/`Missed Penalty`. Dane są; brak w designie. |
| Eventy `Var` (np. Goal cancelled) | mapping §events | **Faza 3** | Pomijać czy pokazywać. Domyślnie: pomijać (brak w enumie designu). |
| Czas trwania wideo (źródło) | mapping A2 | **Faza 1** (pole) / **Faza 5** (pobieranie) | Rozstrzygnięte: źródłem YouTube Data API. Faza 1 definiuje pole ACF; slice pobierający = faza danych zewnętrznych (Faza 5). Do tego czasu ręcznie. Klucz YT w `.env`. |
| `/standings` (tabele grup) | mapping A5 | **Faza 5** | później. |
| Litera grupy A–L (12 grup) | mapping A5, §3 | **Faza 5** | później; razem ze standings. |
| `/teams/statistics` (profil drużyny) | mapping A5 | **Faza 5** | później; najpierw dobór pól. |
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

---

## Backlog — poza fazami

Pozycje bez przypisania do żadnej fazy (nie ciążą na MVP, nie mają jeszcze
własnego slice'a). Przenosimy do konkretnej fazy, gdy dojrzeją.

- **Nieobecni / pauzujący zawodnicy** — brak pola w czterech zmapowanych
  endpointach; źródło: `/injuries` lub pole ręczne, do ustalenia. Nie przypisane
  do żadnej fazy.
