# Ground-truth: Faza MVP (na produkcję)

Wierny opis REALNEGO stanu kodu/danych pod pod-slice'y **MVP-a..g** (plan:
[docs/plan.md](plan.md) sekcja „Faza MVP", linie 766–851). Cel: kolejne sesje
wykonawcze NIE zgadują — każde twierdzenie wiąże się z `plik:linia` albo wynikiem
polecenia.

## Jak czytać ten dokument
- **FAKT** — sprawdzone w kodzie/próbce; podany `plik:linia`.
- **LUKA** — brak próbki / endpointu / pola; wymaga decyzji albo dograniа źródła.
- **RUNTIME** — nie da się potwierdzić bez żywego WP (Local poza shellem agenta);
  podana komenda do wklejenia przez człowieka.

Ścieżki plików — prefiks repo (granica artefakt↔artefakt z CLAUDE.md):
- **theme:** `…/themes/hajlajty-theme/`
- **core:** `…/plugins/hajlajty-core/`
- **meta:** `…/hajlajty-meta/` (ten dokument + docs/ + design/)

## Stan repo na moment ground-truth (git fetch wykonany)
- **meta:** `origin/main` = `7fdd479` (merge PR#29, teams-only 4A). Sekcja
  „Faza MVP" istnieje TYLKO na branchu `docs/plan-mvp-launch` (PR#30, **DRAFT,
  niezmergowana** — commity `4ae5ab1` + `8f7034e`). Ten dokument i jego branch
  `docs/ground-truth-mvp` są **stackowane na PR#30** (cytaty `plan.md:766+` są
  poprawne dopiero z treścią PR#30). Po zmianie numeracji linii w PR#30 —
  zweryfikować cytaty.
- **theme:** `main` = `6a8985b` (merge PR#10, 4A front-filtry). Zawiera całe 3a–3e
  (w tym 3e-iii poller — ✓) i 4A.
- **core:** `main` = `2998a87` (merge PR#9, auto-FT stale-live). Zawiera całe
  Fazy 1–2 + 3e-i/ii/iv-a (import, live-import, cron live, auto/stale-FT).

---

## STAN OGÓLNY — powłoka, slice'y, wzorce

### Autoloader slice'ów (oba repo, identyczny wzorzec)
- **theme:** [functions.php:37-42](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/functions.php) —
  `glob( features/* )`, dla każdego katalogu `require_once` punktu wejścia o nazwie
  katalogu (`features/layout/layout.php`). Cienki bootstrap, zero logiki.
- **core:** analogicznie w `hajlajty-core.php`. **FAKT:** nowy slice = nowy katalog
  + plik `<katalog>.php`, bez edycji bootstrapu.

### Slice'y obecne na `main`
**theme/features:** `layout/`, `filters/`, `match-display/`, `match-lists/`.
**core/features:** `match/`, `match-import/`, `roster-seed/`.

### Wzorzec enqueue (theme)
- **Globalne (slice `layout`):** [layout.php:25-58](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/layout.php).
  Kolejność przez zależności: `hajlajty-tokens` → `hajlajty-base` → `hajlajty-layout`
  (CSS); `hajlajty-layout` (JS, w stopce). Wersjonowanie `filemtime` z fallbackiem
  `'0.1.0'`. **Manrope** z Google Fonts (`version = null`).
- **Widokowe (slice `match-display`):** [match-display.php:31-64](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/match-display.php).
  Tylko `is_singular('mecz')`. `hajlajty-match-single` (CSS, dep `hajlajty-layout`),
  `hajlajty-match-display` (JS), a poller `hajlajty-live-refresh` (JS, dep
  `hajlajty-match-display`) **tylko gdy płaska meta `status` ∈ kody live**
  (`hajlajty_status_live_codes()`).
- **Konwencja dla NOWEGO widoku MVP (c/e/g):** własny slice z punktem wejścia
  enqueue'ującym swoje zasoby warunkowo (wzorzec jak `match-display`), CSS z dep
  `'hajlajty-layout'`, wersjonowanie `filemtime`.

### Hooki powłoki (punkty rozszerzenia)
- **`hajlajty_topbar_center`** — [header.php:46](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/header.php).
  Środkowa kolumna topbara; slice `filters` wstrzykuje tu wyszukiwarkę drużyn na
  listach. Brak wpięcia = pusta kolumna (single, nowe widoki).
- **`body_class`** — slice `filters` dodaje `hajlajty-has-search` TYLKO na listach
  ([filters.php:32,41-43](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/filters/filters.php)).
  Poza tym żaden slice nie dokłada klas body — `body_class()` w
  [header.php:25](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/header.php)
  daje natywne klasy WP.

### Szablony w roocie (theme)
`single-mecz.php`, `archive-mecz.php`, `front-page.php`, `index.php`. Każdy woła
powłokę przez `get_template_part('features/layout/partials/header')` → treść →
footer. **Powłoka:** [header.php](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/header.php)
otwiera dokument + topbar + `.shell` + sidebar + `.content`; footer domyka.

---

## DECYZJE WIĄŻĄCE dotykające MVP (z CLAUDE.md + plan.md)
- **#3 / grupa 3 meta:** dane renderowane → `match_data` (JSON); klucze
  wyszukiwania/sortowania na poziomie SQL → płaska meta (`fixture_id`, `kickoff`,
  `status`). Nowe pole MVP-d/f: domyślnie do `match_data`, płaskie tylko po
  udowodnieniu potrzeby `WP_Query`/SQL.
- **#4 / #9:** filtry publiczne = taksonomie (`druzyna`, `rozgrywki`, `sezon`,
  `kanal`). „Ma wideo" = pochodna `skrot_url` (nie taksonomia).
- **#6 (permalink):** schemat meczu `/mecz/{gospodarz}-{gosc}-{RRRR-MM-DD}`, slug
  budowany RAZ przy insert. Nowe widoki MVP (terminarz/grupy/reprezentacje) mają
  WŁASNE URL-e — **bez kolizji** z `/mecz/…` (plan MVP, §reprezentacje).
- **#10 (mecze tylko z importu):** żadnych ręcznych danych meczowych. MVP NIE dodaje
  ręcznego wprowadzania; standings/teams-statistics przyjdą z importu (core).
- **Vertical slice + granica artefakt↔artefakt:** tory danych (MVP-d, MVP-f) =
  core; tory widoku (a,b,c,e,g) = theme. Slice posiada swoje rzeczy.
- **USTALENIA Fazy MVP (plan:768-851):** MVP świadomie BEZ rejestracji/logowania
  i BEZ panelu redaktora. `hajlajty-user`, `hajlajty-editor`, 4B (Algolia) — PO MVP.

---

## MVP-a — Trim afordancji konta + sidebar (theme, slice `layout`)
Branch sugerowany: `feature/mvp-trim-launchowy`. Zero danych, zero zależności.

### ⚠️ KOREKTA ZAŁOŻENIA PLANU (kluczowa)
Plan ([plan.md:806-811](plan.md)) zakłada: „z decyzji 3b/3c akcje kibica NIE były
portowane na karty/single, więc realna powierzchnia = głównie ikona Profil".
**To NIEPRAWDA dla single.** Grep całego motywu (`fav|bell|ulubione|przypomnij|
obserwuj|user-menu|chip-follow`) pokazuje, że przyciski kibica **SĄ wyrenderowane
na single** jako inertny markup `data-*` (placeholder pod Fazę 4 / `hajlajty-user`):

| Miejsce | Co renderuje się dziś | `plik:linia` |
|---|---|---|
| Topbar „Profil" | `<button class="icon-btn" aria-label="Profil">` (ikona) | [header.php:54-56](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/header.php) |
| single **NS** | `.hf-actions` → `hf-btn--fav` „Dodaj do ulubionych" **+** `hf-btn--remind` „Przypomnij mi" | [single-ns.php:105-115](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/single-ns.php) |
| single **LIVE** | `.hf-actions` → `hf-btn--fav` „Dodaj do ulubionych" (bez remind) | [single-live.php:92-98](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/single-live.php) |
| single **CANC** | `.hf-actions` → `hf-btn--fav` „Dodaj do ulubionych" (bez remind) | [single-canc.php:83-89](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/single-canc.php) |
| single **FT** | **brak** przycisku — tylko komentarz „NIE portujemy #followBtn" | [single-ft.php:356](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/single-ft.php) |
| Sidebar grupa „Twoje" | 3× `<a class="nav-link" href="#">` (Obserwowane/Ulubione/Ustawienia) | [sidebar.php:53-58](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/sidebar.php) |

**FAKT — KARTY są czyste.** Żaden card partial (`card-live`, `card-zapowiedz`,
`card-skrot`) NIE renderuje fav/bell/follow — potwierdzone komentarzami i gripem
(np. [card-zapowiedz.php:4](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-lists/partials/card-zapowiedz.php)
„BEZ .card__fav / .card__bell"). Powierzchnia trimu to **topbar + 3 single
partials + sidebar**, NIE karty.

**FAKT — warstwa zachowania nie jest podpięta.** `hajlajty-fav.js` (design) NIE
jest enqueue'owany; przyciski są inertne. `match-display.js` jawnie NIE portuje
`#followBtn/#favBtn` ([match-display.js:7-9](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/assets/js/match-display.js)).
Styl `.hf-btn--fav` żyje w `match-single.css:395-414` (komentarz: „STOPGAP 3c,
warstwa zachowania należy do hajlajty-user").

### Zakres trimu MVP-a (READ-ONLY wobec danych)
1. **Ukryć ikonę „Profil"** w topbarze ([header.php:54-56](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/header.php)).
2. **Ukryć `.hf-actions`** na single-ns / single-live / single-canc (fav + remind).
   „Schować, NIE usuwać" — markup wraca z `hajlajty-user`. Decyzja wykonawcza
   (do potwierdzenia w MVP-a): czy komentować markup, opakować warunkiem, czy ukryć
   CSS-em. Spójność z „wracają z hajlajty-user" sugeruje przełącznik/komentarz,
   nie kasowanie.
3. **Sidebar grupa „Twoje" → boks-teaser „wkrótce"** (plan: wariant TEASER,
   [plan.md:812-816](plan.md)): zamiast 3 martwych linków jeden miękki boks „✨ Twoje
   Hajlajty — … budujemy to teraz!" + plakietka „Już wkrótce". Wzorzec treści:
   `design/Hajlajty - Twoje Hajlajty.html` (mały plik, 1.3 KB).
4. **Równolegle** (zależy od c/e/g): linki grupy „Mundial 2026"
   ([sidebar.php:46-51](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/sidebar.php),
   dziś `href="#"`) → realne URL-e, gdy ich strony powstaną.

**Uwaga slice:** sidebar/header należą do slice'a `layout`; `.hf-actions` należą
do `match-display` (single partials). Trim dotknie **dwóch slice'ów** w jednym
branchu MVP-a — to OK (jeden artefakt = theme), ale wykonawca ma o tym wiedzieć.

---

## MVP-b — Efekty eventów live (theme, `match-display` + fragment 3e-iii)
Branch: własny. Zależy od 3e-iii (✓ `main`) i `match_data`. ZERO nowego źródła.

### Co już działa (3e-iii — fundament, ✓ merged)
- **REST route:** `GET /wp-json/hajlajty/v1/mecz/{id}/live` (regex `\d+`),
  `permission_callback => __return_true`, zwraca **surowy HTML** (nie JSON),
  `Cache-Control: max-age=15`, `X-Robots-Tag: noindex`; 404 dla nie-`mecz`/nie-publish
  ([rest-live.php:29-98](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/rest-live.php)).
  Endpoint NIE woła api-football — czyta bieżący `match_data` z bazy.
- **Fragment renderuje partial:** `features/match-display/partials/live-fragment.php`
  ([rest-live.php:50-62](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/rest-live.php)).
  Ten sam partial woła single-live (jedno źródło znacznika).
- **Trzy kotwice DOM** (`part=all`): `#hajlajty-live-board` (telebim: wynik +
  minuta/etykieta), `#hajlajty-live-timeline` (oś), `#hajlajty-live-stats`
  ([live-fragment.php:72-267](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/live-fragment.php)).
  Każdy `<div class="hajlajty-live" data-match data-live="1|0">`; board dodatkowo
  `data-endpoint` ([live-fragment.php:67-69,96](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/live-fragment.php)).
- **Poller:** [live-refresh.js](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/assets/js/live-refresh.js).
  `INTERVAL_MS = 30000` (30 s, D3.8), `MAX_FAILS = 5` → cichy stop. Start tylko gdy
  `data-live="1"`. Co tick: `fetch` → `applyFragment(html)` zamienia kotwice
  **`target.replaceWith(node)`** (wymiana całych węzłów po `id`) → `dispatchEvent
  CustomEvent("hajlajty:live-updated")` → `if (live === "0") stop()`. Pomija tick
  gdy `document.hidden`; odświeża natychmiast po powrocie do karty.
- **Sygnał stopu:** `data-live` na ODŚWIEŻONYM fragmencie = `'1'` gdy
  `status.short ∈ hajlajty_status_live_codes()`, inaczej `'0'`
  ([live-fragment.php:41,66](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/live-fragment.php)).
- **Re-animacja słupków:** `match-display.js` nasłuchuje `hajlajty:live-updated` →
  `animateStats()` ([match-display.js:50-54,19-27](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/assets/js/match-display.js)).
  **To jedyny dziś efekt po podmianie.** Brak golPop/scoreBump/cardFlip.

### Kształt `events[]` w `match_data` (źródło efektów)
Z core ([transform.php](../../hajlajty20/app/public/wp-content/plugins/hajlajty-core/features/match-import/transform.php)
`hajlajty_import_map_events`) każdy element ma:
`minute`, `extra`, `side` (`home`/`away`), `type`, `detail`, `player`, `player_id`
(zawsze), `assist`, **`assist_id` tylko dla `subst`** (przy golach/kartkach `assist.id`
wycinany — api-mapping §events, [api-mapping.md:299-302](api-mapping.md)).

Render osi liczy semantyczny `key` przez `hajlajty_lookup_event(type, detail)`
([lookups.php:124-166](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/lookups.php)):
`goal` / `penalty_goal` / `own_goal` / `missed_penalty` (Goal),
`yellow` / `red` / `second_yellow` (Card), `subst`, `var`, `other`.
Narastający wynik + flaga `counts` liczone w `hajlajty_build_timeline`
([derive.php:77-141](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/derive.php)).
Render eventu: `.tl-item` → `.tl-node[.is-goal]` z emoji (⚽/🟨/🟥/⇄/❌)
([live-fragment.php:149-221](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/live-fragment.php)).
Telebim: `.board__score .board__nums .n` (gole) + `.board__min`
([live-fragment.php:97-126](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/partials/live-fragment.php)).

### Wzorzec animacji w designie (`design/Hajlajty - Mecz na Żywo.html`)
**FAKT** (Explore po pliku):
- `@keyframes scoreBump` (~L736) → klasa `.board__nums .n.is-bump` (skala+kolor wyniku).
- `@keyframes golPop` (~L755) → `.ev.is-active .gol` (overlay gola).
- `@keyframes cardFlip` (~L765) → `.ev.is-active .card-graphic` (overlay kartki).
- Odpalane **SYMULACJĄ**: przyciski `.demo-btn[data-demo=goal-home|goal-away|
  card-yellow|card-red|sub]` (~L1132) → JS (~L1684) woła `goal()/card()/sub()`,
  dokłada `.is-active` (overlay ~2600 ms) + `bump()` na wyniku; minuta tyka
  `setInterval` co 7 s. Overlaye: `.ev--goal/.ev--card/.ev--sub`.

### Zadanie MVP-b (z planu) + wnioski wykonawcze
Plan ([plan.md:799-805,832-835](plan.md)): port golPop/scoreBump/cardFlip + efekt
zmiany, ale odpalane **REALNYM zdarzeniem z odświeżanego fragmentu**, BEZ symulacji
/przycisków demo.

**LUKA/PUNKT ZAPALNY (do rozstrzygnięcia w MVP-b):** poller robi
`target.replaceWith(node)` — wymianę CAŁYCH węzłów, **bez diffowania**. Żeby odpalić
efekt „nowy gol/kartka", trzeba wykryć RÓŻNICĘ między starym a nowym fragmentem
(np. nowy `.tl-item` na osi albo zmiana liczby w `.board__nums`). Dziś jedyny
sygnał po podmianie to event `hajlajty:live-updated` (bez ładunku). Opcje
wykonawcze: (a) porównać wynik/liczbę eventów przed/po w `live-refresh.js` i
przekazać deltę w `CustomEvent.detail`; (b) policzyć diff w listenerze
`match-display.js`. Wariant (a) trzyma logikę pollingu w jednym pliku — rekomendacja
do potwierdzenia w MVP-b. **Zero nowego źródła danych** — efekt liczony z
`events[]`/`goals` w już pobieranym fragmencie.

---

## MVP-c — Terminarz turnieju (theme)
Branch: własny. **Dane JUŻ z importu — zero nowego źródła.** Niezależny (równolegle
z a/b). Aktywuje sidebar link „Terminarz turnieju". Render READ-ONLY; reużycie kart
i helperów slice'a `match-lists` + chipsbara slice'a `filters`. Sekcja pogłębiona do
poziomu KONTRAKTU po ground-truth MVP-c (2026-06) — decyzje 1–6 zatwierdzone.

### Decyzje MVP-c (PODJĘTE — wiążące)
1. **URL = Page Template** (bez rewrite/flush). Plik z nagłówkiem
   `Template Name: Terminarz turnieju`; człowiek tworzy Stronę w WP admin (slug
   rekom. `terminarz`). Link sidebara rozwiązywany dynamicznie (np.
   `get_page_by_path()` → `get_permalink()`), bez twardego URL.
2. **Grupowanie PO DNIU** — klucz dnia = `substr( kickoff, 0, 10 )` z płaskiej meta
   `kickoff` (UTC); nagłówek dnia `wp_date` (PL). Markup wg designu (niżej).
3. **NOWY `WP_Query`** (NIE reużywa stanów `pre_get_posts`): `post_type=mecz`,
   `meta_query` `kickoff EXISTS`, `orderby` `kick` ASC, `posts_per_page=-1`,
   `no_found_rows=true`. Wszystkie stany w jednym ciągu, grupowane po dniu w PHP.
   Powód: `pre_get_posts` zna tylko `live/zapowiedzi/skroty` — nie „wszystkie chrono".
4. **BEZ litery grupy A–L** — `card__phase` = sama faza/kolejka z `round`
   (`hajlajty_lookup_round`). „Grupa X" przychodzi z MVP-d/e.
5. **Wybór karty per stan** (przez `hajlajty_lookup_status($status)['state']`,
   patrz niżej). FT bez `skrot_url` i `CANC` → **nowa karta wyniku** (`card-wynik`):
   redaktor widzi, co uzupełnić, zanim powstanie panel redaktora.
6. **Chipsbar drużyn — terminarz JAK ARCHIWUM.** Reużycie slice'a `filters`
   (chipsbar + topbar-search + body class) — szczegóły i KOSZT w „Kontrakt filtra".

### Co daje import (FAKT, kontrakt odczytu)
- **`kickoff`** — płaska meta, UTC `Y-m-d H:i:s` (sort leksykograficzny =
  chronologiczny; NIGDY `_num`). [post-meta.php](../../hajlajty20/app/public/wp-content/plugins/hajlajty-core/features/match/post-meta.php).
  **Opcjonalne:** może nie istnieć (wpis bez kickoffa) → query wymaga `kickoff EXISTS`.
- **`status`** — płaska meta, surowy `status.short` (np. `NS`/`1H`/`FT`/`CANC`).
  [post-meta.php]. Mapa → stan: `hajlajty_lookup_status` (niżej).
- **`match_data.round`** — surowy string (np. „Group Stage - 1"); render PL
  `hajlajty_lookup_round` ([lookups.php:213-240](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/lookups.php)).
  **Opcjonalne:** może być null/nieznane → fallback surowy string / pusta faza.
- **`match_data.goals`** `{home,away}` — wynik (int lub null gdy brak). Źródło dla
  karty wyniku (decyzja 5).
- **Drużyny** — taksonomia `druzyna` ×2 (po `api_id`); nazwa PL = nazwa termu, flaga
  z term meta `fifa_code` przez `hajlajty_flag_url`. **Opcjonalne:** term może nie
  istnieć (seed gap) → helper zwraca `—`/pusty (null-safe w renderze).

### Helpery i karty do reużycia (sygnatury — FAKT)
- `hajlajty_match_lists_resolve_terms( array $post_ids ): array`
  ([terms.php:35](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-lists/terms.php))
  — batch (zero N+1); zwraca per `post_id` ⇒ `{ home: WP_Term|null, away:
  WP_Term|null, rozgrywki: string[], sezon: string[], kanal: string[] }`.
- `hajlajty_match_lists_card_filter_attrs( array $entry ): string` ([terms.php:166])
  — string `data-*` dla karty (klucze filtra: `data-teams`, `data-rozgrywki`,
  `data-sezon`, `data-kanal`, `data-team-names`). `$entry` = wpis z resolvera.
- `hajlajty_match_lists_team_code/_team_name( $term ): string` ([terms.php:130,144]).
- `hajlajty_get_match_data( $post_id ): array` — dekoduje `match_data`.
- `hajlajty_lookup_status( ?string $short ): array{state,show_minute,live_label}` —
  `state ∈ {ZAPOWIEDZ, LIVE, ZAKONCZONY, ODWOLANY}` ([lookups.php:36-72](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-display/lookups.php)).
- `hajlajty_lookup_round`, `hajlajty_flag_url` — jw.
- **Karty** (`features/match-lists/partials/card-*.php`) biorą `$args`:
  `post_id`, `terms` (wpis z resolvera), opcj. `data` (domyślnie
  `hajlajty_get_match_data`) — [card-zapowiedz.php:25-30]. Stany: `card-live`,
  `card-zapowiedz`, `card-skrot`.

### Wybór karty per stan (decyzja 5 — matryca)
| `state` (z `hajlajty_lookup_status`) | warunek | karta |
|---|---|---|
| `LIVE` | — | `card-live` |
| `ZAPOWIEDZ` | — | `card-zapowiedz` |
| `ZAKONCZONY` | niepuste `skrot_url` (ACF) | `card-skrot` (wideo) |
| `ZAKONCZONY` | brak `skrot_url` | **`card-wynik`** (NOWA) — drużyny + wynik z `match_data.goals` + faza + link |
| `ODWOLANY` | — | **`card-wynik`** ze statusem „Odwołany" (bez wyniku) |

`card-wynik.php` — JEDYNY nowy render MVP-c; minimalny, na istniejących klasach
(wzór `.vcard` z designu bez miniatury wideo). „Ma wideo" = niepuste `skrot_url`
(pochodna #9), czytane jak na listach.

### Kontrakt filtra (chipsbar) — ⚠️ koszt reużycia (FAKT)
Slice `filters` bramkuje WSZYSTKO przez `hajlajty_filters_is_list_view()` =
`is_post_type_archive('mecz') || is_front_page()` ([ui.php:28-30](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/filters/ui.php)).
Strona z Page Template to **ani archiwum, ani front** → trzy punkty NIE odpalą się
same dla terminarza:
1. `hajlajty_filters_render_search()` (pole w topbarze) — self-gated [ui.php:37].
2. `hajlajty_filters_body_class()` `hajlajty-has-search` (grid topbara) [filters.php:41-46].
3. `hajlajty_filters_enqueue()` (filters.css/js) — gate **zduplikowany inline**
   `is_post_type_archive('mecz') || is_front_page()` [filters.php:57].
`hajlajty_filters_render_bar()` ([ui.php:60](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/filters/ui.php))
NIE self-gate'uje — wołają go szablony list (archive-mecz.php:54-55), więc terminarz
też może go wywołać; ale bez (1)–(3) chipsbar jest martwy (brak CSS/JS/has-search).
- **Analogicznie `match-lists`**: `hajlajty_match_lists_enqueue()` ([match-lists.php:190](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/match-lists/match-lists.php))
  ma TEN SAM gate inline → bez niego strona terminarza NIE dostanie styli kart
  (`card-preview.css`, `match-lists.css`, `match-lists.js`).
- **KONSEKWENCJA / DECYZJA dla MVP-c:** reużycie chipsbara + kart na Page Template
  WYMAGA nauczenia obu slice'ów, że terminarz to „list view". Rekomendacja (DRY):
  jeden predykat „widok-listy-meczów" konsultowany przez wszystkie gate'y, rozszerzony
  o `is_page_template('<terminarz>')`. Dziś literał `archive||front` jest powtórzony
  3× (match-lists:190, filters:57, filters `is_list_view` ui:29) — przy okazji zwęzić
  do jednego źródła. To **świadomy, minimalny cross-slice edit** (match-lists + filters)
  — wąski wyjątek od „nie ruszaj tych slice'ów"; prompt wykonawczy MVP-c musi go dopuścić.
  Alternatywa (terminarz sam enqueue'uje cudze assety) = duplikacja + sięganie w cudze
  ścieżki → ODRZUCONA.

### Zasoby / enqueue terminarza
- Własny `assets/styles/terminarz.css` (layout sekcji dnia/siatki, na tokenach),
  enqueue warunkowo na stronie (`is_page_template`), wzorzec slice'a (filemtime).
- Style kart + filtra: patrz „Kontrakt filtra" — przez rozszerzenie gate'ów, nie
  duplikację.

### URL / Page Template (FAKT)
- WP 4.7+ skanuje nagłówek `Template Name` w CAŁYM motywie (też podkatalogi) →
  plik szablonu MOŻE żyć w slice. Jeśli skan zawiedzie: fallback `page-terminarz.php`
  w roocie motywu delegujący do partiala slice'a. **Runtime do potwierdzenia**:
  czy szablon w podkatalogu pojawia się w „Atrybuty strony → Szablon".
- **Aktywacja linku sidebara:** [sidebar.php:48](../../hajlajty20/app/public/wp-content/themes/hajlajty-theme/features/layout/partials/sidebar.php)
  (grupa „Mundial 2026", dziś `href="#"`). MVP-c podmienia TYLKO „Terminarz turnieju"
  na URL strony (dynamicznie) — świadome, minimalne dotknięcie slice'a `layout`;
  „Tabele grup"/„Reprezentacje" zostają `#` do MVP-e/g.

### Wzorzec designu (FAKT)
- `design/Hajlajty - Terminarz Turnieju.html`: grupowanie **po dniu**, sekcja
  `<section class="schedule-day" data-day>` → `.schedule-day__head`
  (`.schedule-section__title` „Sobota, 6 czerwca 2026" + `.schedule-day__count`
  „4 mecze") → `.schedule-grid[data-filterable]`. Karty per stan: `.vcard`
  (zakończony/skrót), `.live-card` (live), `.card--preview` (zapowiedź z countdown).
- `design/Hajlajty - Terminarz Modularny (wzorzec).html`: czysty layout
  (`<main data-card-region>` + sekcje dni); karty jako autonomiczne komponenty.

### Luki / decyzje otwarte (do prompta wykonawczego)
- **Cross-slice gate** (patrz „Kontrakt filtra") — prompt MVP-c MUSI dopuścić edycję
  gate'ów w `match-lists` + `filters`; inaczej chipsbar i style kart nie zadziałają.
- **Umiejscowienie pliku szablonu** (slice vs root) — wg wyniku runtime skanu.
- **`card-wynik` markup** — minimalny, do złożenia z istniejących klas (bez nowego
  systemu stylów).
- **Istniejący kod terminarza:** BRAK (sprawdzone) — nowy szablon/render.

---

## MVP-d — Import `/standings` + litera grupy A–L (core, slice danych)
Branch: własny (core). Warunek MVP-e. Może iść równolegle do a/b/c.

### ✅ Próbka `/standings` dograna — BLOKER zdjęty
**FAKT:** [docs/api-samples/standings.jsonl](api-samples/standings.jsonl) (World Cup
2026, `league=1&season=2026`, 2678 linii). Wcześniejsza LUKA („Próbki: brak",
plan:783-786) — zamknięta. Kształt potwierdzony gripem:

```
response[0].league.standings  // TABLICA TABLIC — jedna wewnętrzna tablica = jedna grupa
  standings[i] = [ { wiersz drużyny }, … ]
    wiersz: rank, team{id,name,logo}, points, goalsDiff, group:"Group A",
            form:"WW", status:"same", description:"Round of 32" (strefa awansu),
            all{played,win,draw,lose,goals{for,against}}, home{…}, away{…}, update
```

Pełne pokrycie kolumn TG (data-inventory §9): `rank`→pozycja, `team`→flaga+nazwa
(po `team.id`), `points`→pkt, `all.played/win/draw/lose`→M/Z/R/P, `all.goals.for/
against`→bramki, `goalsDiff`→różnica bramek (**jest wprost** — domyka „DO USTALENIA"
z §9). `description` = strefa (np. „Round of 32") → kolor wiersza `.qual`/`.play`.

**ANOMALIA do obsługi w MVP-d** (FAKT, `uniq -c`): tablica ma **13 wewnętrznych
tablic** — 12× `"Group A".."Group L"` po 4 drużyny (48 wierszy) **+ 1× `"Group
Stage"` z 12 wierszami** (prawdopodobnie zbiorczy ranking, np. 3. miejsc / agregat).
MVP-d musi **odfiltrować** „Group Stage" (render tylko 12 grup A–L), np. warunkiem
`preg_match('/^Group [A-L]$/', $group)`.

### Co widok TG potrzebuje (data-inventory §9, [data-inventory.md:129-143](data-inventory.md))
Pozycja, flaga+nazwa kraju, punkty, M/Z/R/P (rozegrane/wygrane/remisy/przegrane),
bramki zdobyte+stracone, różnica bramek (DO USTALENIA czy kolumna wprost),
oznaczenie grupy A–L (12 grup — Mundial 2026). To są pola, które `/standings`
ma dostarczyć (do weryfikacji na próbce).

### Litera grupy A–L — źródło rozstrzygnięte próbką (decyzja zapisu zostaje)
**FAKT:** `fixtures` daje tylko `round` (numer kolejki), NIE literę grupy
([api-mapping.md:103](api-mapping.md)). Próbka standings **dostarcza literę wprost**:
`standings[i][j].group = "Group A"` na drużynę, łączoną z termem `druzyna` po
`team.id` → `api_id`. To zamyka pytanie „`/standings` vs ręcznie" (plan:838-839) na
korzyść **`/standings`** (litera przychodzi tym samym importem co tabela).

**DECYZJA do podjęcia w MVP-d — GDZIE zapisać literę** (reguła #3):
- jeśli front FILTRUJE po grupie (zakładki A–L w TG/REP) → kandydat na **term meta
  drużyny** (`group_letter`) lub taksonomię (jeśli ma być natywny `tax_query`);
- jeśli tylko render tabeli → wystarczy odczyt z zapisanego standings (`match_data`-
  analog dla tabeli / osobna meta tabeli grupy).
  Litera „A"..„L" = `substr` z `group` po prefiksie „Group ". Wybór miejsca zapisu
  należy do MVP-d (zależy, czy REP/TG robią natywny filtr WP czy render po stronie JS).

### Struktura designu (FAKT, Explore — `design/Hajlajty - Tabele Grup.html`)
`<article class="group-card" data-group="A" data-label="Grupa A">` →
`.group-card__head` (`.group-badge` „A" + `.group-card__title` + `.group-card__meta`
„Rozegrane 3/3") → `<table class="standings">`. Kolumny: `#`(pos) / Drużyna(team:
`.std-team` flaga+`.nm`) / `M` / `Z` / `R` / `P` / `Br.`(gf, format „7:2") / `Pkt`(pts).
Wiersze: `.qual` (awans), `.play` (baraż), brak klasy (odpada).

---

## MVP-e — Tabele grup (theme)
Branch: własny. **Zależy od MVP-d** (standings + litera). Aktywuje sidebar
„Tabele grup". Render READ-ONLY z danych zapisanych przez MVP-d. Wzorzec markupu:
sekcja MVP-d wyżej (`.group-card`/`.standings`). Reużyć flagę z term meta
`fifa_code` + `hajlajty_flag_url` (slice match-display `flags.php`). **Nie startować
przed MVP-d** (brak danych i niezdefiniowany kształt).

---

## MVP-f — Import `/teams/statistics` + dobór pól (core, slice danych)
Branch: własny (core). Warunek MVP-g. Może iść równolegle do MVP-d.

### Próbka JEST — `docs/api-samples/teams-statistics.jsonl` (FAKT)
Przykład: World Cup 2026, team 1113 (Bosnia & Herzegovina), z 1 meczu. Koperta
`get/parameters/errors/results/paging` (wycinana — §B mappingu). **`response` —
pola najwyższego poziomu** (potwierdzone gripem po wcięciu):

| Pole | Zawartość (skrót) |
|---|---|
| `league` | id/name/country/logo/flag/season |
| `team` | id/name/logo |
| `form` | string liter W/D/L (np. „D") |
| `fixtures` | `played/wins/draws/loses` × `{home,away,total}` |
| `goals` | `for`/`against` × `total`/`average`/`minute`(przedziały)/`under_over` |
| `biggest` | najwyższe wygrane/porażki/serie |
| `clean_sheet` | `{home,away,total}` |
| `failed_to_score` | `{home,away,total}` |
| `penalty` | skuteczność karnych |
| `lineups` | tablica formacji z liczbą gier (`[{formation, played}]`) |
| `cards` | żółte/czerwone wg przedziałów minut |

### Co widok PB/REP potrzebuje (data-inventory §10, [data-inventory.md:147-156](data-inventory.md))
Nazwa kraju (pełna), flaga/herb, kod FIFA, ostatnie mecze drużyny (lista z
wynikami), bieżące wyniki/forma (**DO USTALENIA szczegóły** — pyt. 10
[data-inventory.md:318](data-inventory.md): ile ostatnich meczów? wskaźnik W/D/L?).

### Dobór pól — zadanie MVP-f (plan:843-844)
**DECYZJA przed MVP-g:** które pola z `teams-statistics` realnie zapisać (wg #10 i
designu „Profil Belgia"). Design PB pokazuje (FAKT, Explore): hero (flaga, selekcjoner,
chipy „Grupa G"/„26 zawodników"/„FIFA #8"), nadchodzące mecze (`.up-card`),
ostatnie wyniki (`.vcard`), **kadra** (`.squad-block` po pozycjach G/D/M/F),
widget tabeli grupy, widget statystyk (`.stat-row` ze słupkami).
**LUKA:** `teams/statistics` **NIE daje kadry imiennej** (`lineups` = formacje, nie
zawodnicy) ani „selekcjonera/26 zawodników" — to inne endpointy/źródła. Zakres pól
PB do uzgodnienia w MVP-f: część designu PB może wymagać `/players`/`squad` LUB
zostać przycięta na MVP. **Selekcjoner** jest dostępny w `match_data.lineups.*.coach.name`
(z meczu), nie w teams-statistics — do rozważenia jako źródło.

---

## MVP-g — Reprezentacje / Profil kraju (theme)
Branch: własny. **Zależy od MVP-f.** Aktywuje sidebar „Reprezentacje". Strona drużyny
= osobny widok, własny URL (bez kolizji z `/mecz/…`, #7 — plan:845-846).

### Struktura designu (FAKT, Explore)
- **Reprezentacje** (`design/Hajlajty - Reprezentacje.html`): sekcje po grupie
  `<section class="team-section" data-group="A" id="grupa-A">` → `.team-section__head`
  (`.group-badge` + tytuł + meta „4 reprezentacje") → `.teams-grid` → `.team-card`
  (flaga `.team-card__flag`, `.team-card__name`, `.team-seed` „A1", `.team-coach`
  selekcjoner, `.team-btn` „Zobacz profil", `.team-fav` follow).
  **Uwaga MVP-a/trim:** `.team-fav` to afordancja konta — przy porcie chować
  (spójnie z trimem) lub pominąć do `hajlajty-user`.
- **Profil Belgia** (`design/Hajlajty - Profil Belgia.html`): hero + 2 kolumny.
  Main: nadchodzące mecze / ostatnie wyniki / kadra po pozycjach. Side: widget
  tabeli grupy (`.gtable`) + widget statystyk (`.stat-row`).

### Zależności danych (LUKA — uzgodnić w MVP-f, przed MVP-g)
- Lista grup A–L + przypisanie drużyn do grup → z MVP-d (litera grupy).
- Statystyki profilu → MVP-f (`teams/statistics`).
- Kadra imienna / selekcjoner / seed pozycji w grupie → **NIE w MVP-f source** (patrz
  LUKA wyżej). Zakres PB na MVP do przycięcia/uzgodnienia.
- URL strony drużyny — do zaprojektowania (nie istnieje dziś żaden CPT/route dla
  drużyny; `druzyna` to taksonomia, ma archiwum termu — kandydat na bazę URL, do
  decyzji w MVP-g; nie koliduje z `/mecz/`).

---

## LUKI / BLOKERY (zbiorczo)
1. **✅ ZDJĘTE — próbka `/standings`:** dograna jako
   [docs/api-samples/standings.jsonl](api-samples/standings.jsonl). MVP-d/e
   odblokowane; kształt + pokrycie kolumn TG opisane w sekcji MVP-d.
2. **Litera grupy A–L:** źródło rozstrzygnięte (`standings[].group`, łączone po
   `team.id`); zostaje decyzja **gdzie zapisać** (term meta vs taksonomia vs odczyt
   z tabeli) — w MVP-d, wg tego czy front robi natywny `tax_query`. Plus: MVP-d musi
   **odfiltrować pseudo-grupę „Group Stage"** (13. wewnętrzna tablica, 12 wierszy).
3. **MVP-b diff zdarzeń:** poller wymienia całe węzły, brak mechanizmu wykrycia
   „nowego" eventu — wykonawca MVP-b musi dodać diff (rekomendacja: delta w
   `CustomEvent.detail` z `live-refresh.js`).
4. **Zakres Profilu drużyny (MVP-g):** `teams/statistics` NIE pokrywa kadry imiennej
   ani „26 zawodników/selekcjoner" wprost — uzgodnić przycięcie pól w MVP-f.
5. **Forma/ostatnie mecze (PB):** szczegóły pól „bieżące wyniki/forma" DO USTALENIA
   (data-inventory pyt. 10). `form` (litery W/D/L) jest w teams-statistics; „ostatnie
   mecze z wynikami" = inne zapytanie `fixtures` po drużynie (A5).
6. **Korekta planu MVP-a:** fav/remind SĄ na single-ns/live/canc (nie tylko ikona
   Profil) — powierzchnia trimu większa niż zakładał plan:806-810.
7. **MVP-c grupowanie:** po dniu (design) czy po kolejce (plan dopuszcza oba) — do
   potwierdzenia.
8. **Różnica bramek w TG:** kolumna wprost czy wyliczana — DO USTALENIA
   (data-inventory §9).

## DO POTWIERDZENIA RUNTIME (komendy do wklejenia w „Open Site Shell" Locala)
Agent nie ma dostępu do runtime (Local poza shellem). Człowiek uruchamia i wkleja wynik.

- **RUNTIME-1 — ✅ WYKONANE:** próbka `/standings` dograna jako
  [docs/api-samples/standings.jsonl](api-samples/standings.jsonl)
  (`league=1&season=2026`). Kształt opisany w sekcji MVP-d. Bloker zdjęty.

- **RUNTIME-2 — potwierdzić działanie endpointu live (3e-iii) na realnym meczu**
  (fundament MVP-b). Dla istniejącego posta meczu o statusie live:
  ```
  curl -s -o /dev/null -w "%{http_code}\n" "<HOME_URL>/wp-json/hajlajty/v1/mecz/<ID>/live"
  ```
  Oczekiwane: `200` dla live (fragment z `data-live="1"`), `404` dla nieistniejącego.

- **RUNTIME-3 — sprawdzić obecność płaskiej meta `status` i `kickoff`** na wpisach
  (czy import je zapisał — warunek list i pollera):
  ```
  wp post meta get <ID> status
  wp post meta get <ID> kickoff
  ```
  Oczekiwane: surowy kod (np. `1H`/`FT`) i `Y-m-d H:i:s` UTC.
