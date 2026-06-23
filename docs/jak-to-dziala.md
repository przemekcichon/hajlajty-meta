# Jak to działa (end-to-end) + jak dodać kolejną ligę

Dokument **powrotny / orientacyjny**. Czytaj po przerwie, żeby w 10 minut odzyskać
obraz całości i wiedzieć, **z jakiego pułapu startujesz** przy rozszerzaniu na nowe
ligi (piłka klubowa). To MAPA — szczegóły są w dokumentach źródłowych (niżej), tu
jest przepływ i wskazówki „gdzie szukać / co dotknąć".

> Stan na: czerwiec 2026 (MVP na produkcję — Mundial 2026). Jeśli czytasz to później,
> sprawdź `git log` i sekcję „Co działa dziś" — mogła się zdezaktualizować.

## Mapa dokumentów (źródła prawdy — czytaj je, nie pamięć)

| Dokument | Po co |
|---|---|
| `CLAUDE.md` (każde repo) | **Konstytucja** — decyzje architektoniczne #1–#10, git workflow, charakter projektu. Najwyższy priorytet. |
| `docs/plan.md` | Plan faz + **Faza 5** (piłka klubowa, tabele ligowe, nawigacja wieloturniejowa) — szczegóły rozszerzeń. |
| `docs/ground-truth-mvp.md` | **Kontrakt danych** producent→konsument (kształty `match_data`, klucze meta, sygnatury helperów). |
| `docs/data-inventory.md` | Inwentarz pól danych (skąd co leci, gdzie ląduje). |
| `docs/api-mapping.md` | Mapowania RAW api-football → PL (statusy, rundy, pozycje). |
| `docs/deploy-produkcja.md` | Checklista pierwszego wdrożenia (seed → flush → importy → strony). |
| `docs/cron-produkcja.md` | Systemowy cron na prodzie (1 wpis napędza 3 eventy). |

## Architektura w pigułce

Trzy osobne artefakty (repozytoria), granica między nimi jest NADRZĘDNA wobec slice'ów:

- **`hajlajty-core`** (wtyczka) — model danych + import z api-football. CPT, taksonomie,
  term/post meta, importy (fixtures/standings/teams-stats), seed, crony.
- **`hajlajty-theme`** (motyw klasyczny PHP) — render (READ-ONLY z danych core).
  Listy, single meczu (live/FT/zapowiedź), terminarz, tabele grup, reprezentacje/profil,
  filtr (chipsbar+szukajka), overlaye live.
- **`hajlajty-user`** (przyszła wtyczka, Faza 4) — konto/ulubione/obserwowane. Jeszcze nie ma.

Wewnątrz każdego artefaktu kod organizujemy w **vertical slices** (`features/<funkcja>/`).
Motyw NIGDY nie woła gated-WP_CLI helperów core — trzyma własne, równoważne resolucje
(ta sama konwencja meta `api_id`/`league_id`). Patrz CLAUDE.md.

## Model danych (skrót — pełny kontrakt w ground-truth-mvp.md)

- **Taksonomie** (po nich front FILTRUJE/GRUPUJE):
  - `druzyna` — term = pełna PL nazwa; term meta `api_id` (= api-football `team.id`),
    `fifa_code` (3 litery, do flag flagcdn).
  - `rozgrywki` — term meta `league_id` (= api-football `league.id`).
  - `sezon`, `kanal`.
- **CPT `mecz`** — jeden wpis na mecz (zapowiedź→live→skrót to stany, nie typy):
  - **płaska meta** (klucze zapytań SQL): `fixture_id` (dedup), `kickoff` (`Y-m-d H:i:s`
    UTC — sort/okno), `status` (kod `fixture.status.short` — filtr list/okna live).
  - **`match_data`** (jeden JSON): oś czasu (`events`), składy (`lineups` + `colors`,
    `coach.name`), statystyki, wynik, `teams.{home,away}.api_id`. Render robi `json_decode`.
  - **ACF**: `skrot_url` (link YT — obecność = „ma wideo"), `skrot_duration`, `skrot_published_at`.
- **Dane pochodne** (term meta, klucze dynamiczne):
  - `standings_<sezon>` na termie `rozgrywki` — tabela grup (MVP-d).
  - `team_stats_<liga>_<sezon>` na termie `druzyna` — statystyki drużyny (MVP-f).

**Łączenie ZAWSZE po stabilnym ID** (`api_id`/`league_id`), NIGDY po nazwie ani term_id
(pułapka: term „Belgia" ma term_id 5, ale api_id 1).

## Przepływ end-to-end (cały proces)

```
                       ┌──────────────────────────────────────────────┐
  api-football  ──────▶│ hajlajty-core (import)                         │
  + flagcdn            │  seed (CSV→termy) · import fixtures · standings │
  (zewnętrzne)         │  · teams-stats · crony (świeżość)              │
                       └───────────────┬──────────────────────────────┘
                                       │ zapis: CPT mecz + meta + term meta
                                       ▼
                       ┌──────────────────────────────────────────────┐
                       │ WordPress DB (źródło prawdy)                   │
                       └───────────────┬──────────────────────────────┘
                                       │ READ-ONLY
                                       ▼
                       ┌──────────────────────────────────────────────┐
  redaktor ───────────▶│ hajlajty-theme (render)  +  redakcja:         │
  (5 skrótów, strony)  │  listy/single/terminarz/tabele/reprezentacje  │
                       │  · filtr · overlaye live · poller 30 s         │
                       └──────────────────────────────────────────────┘
```

**Bootstrap (jednorazowo, ręcznie — `deploy-produkcja.md`):**
1. `wp hajlajty seed` — z CSV powstają termy `druzyna`+`rozgrywki` (z `api_id`/`league_id`).
2. `wp rewrite flush` — reguły rewrite (CPT, archiwa, `/druzyna/{slug}/`).
3. `wp hajlajty import --league --season` — tworzy posty meczów (zapowiedzi).
4. `wp hajlajty standings --league --season` — zapisuje `standings_<sezon>`.
5. `wp hajlajty team-stats --league --season` — zapisuje `team_stats_<liga>_<sezon>`.
6. Strony redaktora (slugi stałe): `terminarz`, `tabele-grup` (+ meta league_id/season),
   `reprezentacje`.
7. Redaktor wpisuje `skrot_url` + `kanal` na meczach (jedyna treść ręczna; #10).

**Świeżość (cyklicznie, cron — `cron-produkcja.md`):**
- `hajlajty_live_import_tick` (~1 min) — **w oknie meczowym** [kickoff−180 min,
  kickoff+5 min] odświeża live i auto-domyka FT (gdy mecz znika z `live=all`); poza
  oknem zero zapytań (+ stale-FT na zawieszone). Wynik/minuta/FT ~natychmiast.
- `hajlajty_standings_import_tick` (**hourly**) — odświeża tabele już zaimportowane.
- `hajlajty_team_stats_import_tick` (**daily**) — odświeża statystyki już zaimportowane.
- KLUCZOWE: crony tylko ODŚWIEŻAJĄ. Na pustej bazie robią zero (brama budżetowa).
  Bootstrap musi pójść pierwszy. Pochodne (tabela/statystyki) NIE są natychmiastowe
  po meczu — lagują do ~1h / ~1 dnia.

## Co działa dziś (baseline na produkcję)

Na `main` w obu repo (czerwiec 2026):
- Import: fixtures (+ live cron/auto-FT), standings (MVP-d), teams-stats (MVP-f), seed.
- Front listy: `/na-zywo/`, `/zapowiedzi/`, `/skroty/`, strona główna; filtr drużyn
  (chipsbar + szukajka, sticky na desktopie).
- Single meczu: warianty zapowiedź / live / FT / odwołany; **overlaye live** (gol/kartka/
  zmiana, barwa drużyny z `match_data`, auto-kontrast); poller 30 s.
- Terminarz turnieju (MVP-c), Tabele grup (MVP-e).
- **Reprezentacje + Profil kraju (MVP-g)** — lista grup A–L, profil = archiwum termu
  `druzyna` (`/druzyna/{slug}/`), layout jak single; widżety: statystyki, tabela grupy,
  nadchodzące/ostatnie/live mecze, selekcjoner.

Wszystko **mono-turniejowe** (Mundial 2026, format grup A–L).

## Jak dodać kolejną ligę (piłka klubowa) — pułap startowy

Cel docelowy serwisu (PEWNIK, plan.md): skróty KLUBOWE w wielu ligach/sezonach. Model
danych JUŻ to udźwignie (skaluje na sezony/ligi). Dziel pracę na **gotowe** vs **do zrobienia**.

### ✅ Gotowe (działa league-agnostycznie — wystarczy dane)
- **Seed** — dopisz kluby i ligi do `hajlajty-core/features/roster-seed/data/teams.csv`
  i `leagues.csv` (PL nazwa + `api_id`/`league_id`), `wp hajlajty seed`.
- **Import meczów** — `wp hajlajty import --league=<id> --season=<rok>` działa dla każdej ligi.
- **Listy / single / live / terminarz** — render jest league-agnostyczny.
- **Filtr po drużynach**, flagi, statusy — bez zmian.
- **Profil drużyny** (`/druzyna/{slug}/`) — renderuje się dla dowolnego termu `druzyna`.

### ⚠️ Do zrobienia (Faza 5 — szczegóły i decyzje w `plan.md` „## Faza 5")
1. **Tabela LIGOWA (import):** `standings-import/transform.php` filtruje dziś
   `^Group ([A-L])$` (WC-specyficzne). Liga = JEDNA tabela (`group` = nazwa ligi/null) →
   dziś odpada (zero grup → błąd). Trzeba dodać gałąź „tabela ligowa" (+ marker
   `group|league`), zapis pod tym samym `standings_<sezon>`.
2. **Tabela ligowa (render):** wariant pojedynczej tabeli obok kart-grup (standings-view).
   Mechanizm redaktora WSPÓLNY (strona + szablon „Tabela rozgrywek" + meta league_id/season).
3. **teams-view — wybór bloba:** `get_team_stats` / `find_standings` biorą PIERWSZY
   `team_stats_*` / `standings_*`. Drużyna w wielu ligach/sezonach → arbitralne.
   Dodać deterministyczny wybór (bieżący sezon / kontekst). Patrz TODO w
   `hajlajty-theme/features/teams-view/data.php`.
4. **Profil klubu jest WIELO-rozgrywkowy:** MVP-g/Reprezentacje to „mundialowy" wariant
   (jedna rozgrywka, grupy). Klub (Barça: La Liga + LM + Puchar) wymaga sekcji
   per-rozgrywka. „Tabela" ma sens tylko w kontekście (rozgrywka, sezon).
5. **Nawigacja wieloturniejowa (IA):** strony-hub per (rozgrywka, sezon) — np.
   `/laliga-2024/`, picker sezonu, sidebar recency/piny. Cała decyzja IA już spisana
   w `plan.md` Faza 5 (Model A — strona-hub, URL = źródło prawdy kontekstu).
6. **Chipsbar:** dziś tylko drużyny. Dojdą chipy `rozgrywki`/`sezon` — przy okazji
   rozstrzygnąć notatkę „filtr: zaznaczony chip vs tekst (AND/OR)" (plan.md Faza 5).
7. **Render dużych lig** (~380 meczów/sezon): bez paginacji JS — serwer-render +
   `loading="lazy"` + `content-visibility:auto` (plan.md).
8. **Czas trwania skrótu** (YouTube Data API) i **Algolia** (wyszukiwanie redakcyjne) —
   osobne slice'y Fazy 5.

### Kolejność rozsądnego ataku (sugestia)
Najpierw to, co odblokowuje treść klubową bez wielkiej przebudowy:
1. Seed klubów/lig + import meczów klubowych → **skróty klubowe działają od razu**
   (listy/filtr/single są gotowe). To największa wartość najmniejszym kosztem.
2. Potem tabela ligowa (import transform + render).
3. Potem profil wielo-rozgrywkowy + nawigacja hub (większa robota IA).

## Pułap startowy po przerwie — „zacznij tutaj"

1. `git log --oneline -15` w obu repo — co weszło od ostatniego razu.
2. Sprawdź, czy MVP jest na produkcji (PR-y zmergowane? — patrz `gh pr list`).
3. Przeczytaj `plan.md` „## Faza 5" — to jest plan rozszerzeń (już szczegółowy).
4. Pierwszy konkret pod nowe ligi: **import klubowy** (seed CSV + `wp hajlajty import`)
   — sprawdź na 1 lidze (np. Ekstraklasa/La Liga), czy skróty/listy/profil działają.
5. Dopiero potem ruszaj tabele ligowe i nawigację wieloturniejową (Faza 5, pkt 1–5 wyżej).

> Zasada przy każdej zmianie: czytaj KOD i `ground-truth-mvp.md`, nie pamięć. Trzymaj
> git workflow (branch + PR, atomowe commity). Merge to zawsze decyzja właściciela.
