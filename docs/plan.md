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

Branch: `feature/faza-3-motyw`. Cel: front renderuje dane z `match_data` +
taksonomii. Tu mieszka tłumaczenie RAW→PL (słowniki).

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
      lookups.php                       # string→PL: runda, status, pozycje G/D/M/F
      partials/                         # karty/sekcje z design/components
    layout/
      layout.php                        # header/footer/nawigacja, enqueue tokens+base
  assets/                               # przeniesione z design/ (css/js/img)
```

> Uwaga WP: `single-mecz.php`/`archive-mecz.php`/`front-page.php` MUSZĄ leżeć w
> roocie motywu (hierarchia szablonów WP ich tam szuka). Logikę/partiale trzymamy
> w slice'ach; pliki-szablony w roocie tylko `get_template_part()` do slice'a.

### Zakres

- `hajlajty_get_match_data( $post_id )` — `get_post_meta` + `json_decode`,
  zwraca tablicę/obiekt; jedno miejsce dostępu (helper z A4/A.).
- Pochodne liczone w PHP (A4): status enum PL, pozycje Br/O/P/N, slug, eventy
  zawodnika agregowane per `player_id`, odliczanie z `fixture.date`.
- `lookups.php`: mapy string→PL (runda „Group Stage - 1"→„Faza grupowa, kolejka 1";
  status `short`→enum PL; G/D/M/F→Br/O/P/N). **Słownik statusów = pełna tabela
  mapowania w [api-mapping.md](api-mapping.md) (sekcja „Mapowanie statusu")** —
  źródło prawdy dla `lookups.php`: każdy kod `short`→1 z 4 stanów PL (ZAPOWIEDŹ/
  LIVE/ZAKOŃCZONY/ODWOŁANY) + flaga „pokaż minutę" (`1H`/`2H`/`ET`) + fallback dla
  nieznanego kodu. Implementacja `lookups.php` realizuje tę tabelę w tej fazie.
- Przeniesienie designu: tokens.css/base.css → globalny enqueue; komponenty
  (`card-*`, `match-row`, `chip-follow`, `user-menu`, `editor-form`, `pagination`)
  → partiale + ich CSS/JS. Flagi/herby z flagcdn.com po kodzie FIFA z term meta.
- Mapowanie widoków designu → szablony: Strona Główna→`front-page.php`;
  Skróty/Zapowiedzi/Na Żywo→`archive-mecz.php` (warianty wg statusu); Skrót
  Meczu/Mecz na Żywo/Zapowiedź Meczu→`single-mecz.php` (warianty wg statusu).

### Decyzje wymagające zatwierdzenia

- **D3.1 — Jeden `single-mecz.php` z wariantami statusu, czy trzy osobne
  szablony?** Propozycja: jeden szablon, gałęzie wg statusu enum (LIVE pokazuje
  events/stats, ZAPOWIEDŹ pokazuje odliczanie+składy, ZAKOŃCZONY pokazuje
  wideo+stats). Mniej duplikacji. OK?
- **D3.2 — Lista (Skróty/Zapowiedzi/Na Żywo) = jeden `archive-mecz.php`
  filtrowany po statusie, czy osobne page-template?** Propozycja: archiwum +
  query var statusu. Spójne z Fazą 4. OK?
- **D3.3 — Format tekstu rundy PL.** „Group Stage - 1" → jak dokładnie? („Faza
  grupowa" vs „Faza grupowa — 1. kolejka"). Litera grupy NIE jest w `round`
  (Faza 5/standings). Doprecyzuj docelowy string.

### Weryfikacja, że działa

- Po imporcie 1 meczu: `single-mecz.php` renderuje wynik, oś czasu, składy,
  statystyki — wizualnie zgodnie z `design/` (porównanie ze screenshotami).
- Zapowiedź: odliczanie działa, brak sekcji live.
- Archiwum listuje mecze, karty zgodne z `card-*`.
- Brak PHP notice/warning (`WP_DEBUG=true`); brak zapytań N+1 na liście
  (jeden `WP_Query`, dane z `match_data`).
- `assets` ładują się z motywu (nie z `design/`).

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
| Status `SUSP`/`AWD`/`WO` (mapowanie enum) | mapping §status | **Faza 3** | Doprecyzować mapę. Bazowa mapa wg odpowiedzi #1 (Scheduled/In Play/Finished/Postponed/Cancelled/Abandoned/Not Played). |

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
- D1.3 (UPPER `fifa_code`), D2.1/D2.3/D2.4/D2.5, D3.1–D3.3, D4.1–D4.3 oraz
  pozycje z tabeli „Otwarte kwestie z mapowania" (przypisane do faz jak były:
  `subst` → Faza 2; standings / `teams-statistics` / injuries → Faza 5).
