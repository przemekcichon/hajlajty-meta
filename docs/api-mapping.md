# Mapowanie pól frontendu → api-football

Mapowanie pól z [data-inventory.md](data-inventory.md) na ścieżki w odpowiedziach
api-football (v3). Źródło ścieżek: próbki w [api-samples/](api-samples/).

**Konwencja ścieżek:** zakładamy iterację po `response[]`. Ścieżki podaję względem
pojedynczego elementu `response[i]` (np. `fixture.id`, `teams.home.name`).

**Język:** api-football zwraca nazwy po **angielsku** (drużyny, rozgrywki).
Frontend chce **polskiego** → patrz sekcja zbiorcza „Pola ręczne".

---

## Endpoint: fixtures
`GET /fixtures?league={id}&season={year}[&team={id}]` — próbka: [fixtures.jsonl](api-samples/fixtures.jsonl)

Główne źródło tożsamości meczu, wyniku, statusu i metadanych czasowych.
Jeden element `response[i]` = jeden mecz.

### 1. Tożsamość meczu
| Pole frontendu (data-inventory) | Ścieżka w API | Uwagi |
|---|---|---|
| Nazwa drużyny — gospodarz (PL) | `teams.home.name` | API zwraca EN ("Canada"). PL → mapowanie ręczne. |
| Nazwa drużyny — gość (PL) | `teams.away.name` | jw. (EN "Bosnia & Herzegovina") |
| Kod kraju — gospodarz (3-lit.) | **brak** | API ma tylko `teams.home.id` (numeryczny, np. 5529). Kod ISO3/FIFA → ręcznie. |
| Kod kraju — gość (3-lit.) | **brak** | jw. `teams.away.id` |
| Flaga/herb — gospodarz | `teams.home.logo` | URL media.api-sports.io. Frontend używa flagcdn.com → patrz „Pola ręczne". |
| Flaga/herb — gość | `teams.away.logo` | jw. |
| Slug/ID meczu | `fixture.id` (źródło) | Slug `gospodarz-gosc-RRRR-MM-DD` (polskie nazwy → ASCII) generowany RAZ — plan D1.1; `fixture.id` NIE wchodzi do slugu, to klucz API i identyfikator deduplikacji importu. |

### 2. Wynik i status
| Pole frontendu | Ścieżka w API | Uwagi |
|---|---|---|
| Wynik — bramki gospodarza | `goals.home` | `null` przed meczem |
| Wynik — bramki gościa | `goals.away` | `null` przed meczem |
| Status meczu (enum PL) | `fixture.status.short` | mapowanie ↓ |
| Minuta meczu (live) | `fixture.status.elapsed` | `null` poza LIVE; doliczony czas: `fixture.status.extra` |

**Mapowanie statusu — pełny słownik dla `lookups.php`** (`status.short` → jeden z 4
stanów PL serwisu). To **trwała decyzja mapowania** (rozstrzyga decyzję #1 z
data-inventory). Cztery stany PL: **ZAPOWIEDŹ** (przed startem) / **LIVE** (w trakcie) /
**ZAKOŃCZONY** (rozegrany) / **ODWOŁANY** (nie odbędzie się / przerwany bez wyniku).
Podstawa: zatwierdzone mapowanie grup api-football — Scheduled→ZAPOWIEDŹ, In Play→LIVE,
Finished→ZAKOŃCZONY, Postponed→ZAPOWIEDŹ, Cancelled/Abandoned/Not Played→ODWOŁANY —
rozłożone na konkretne kody `short`.

Kolumna **Minuta?** = czy render pokazuje minutę (`status.elapsed` + `status.extra`).
Tylko stany LIVE z **trwającą grą** (zegar tyka). Pozostałe LIVE to przerwy/pauzy —
render pokazuje etykietę (Przerwa / Karne / Zawieszony), nie minutę.

| API `short` | API `long` | grupa API | Stan PL | Minuta? | Komentarz |
|---|---|---|---|---|---|
| `TBD`  | Time To Be Defined            | Scheduled  | ZAPOWIEDŹ   | —   | termin meczu jeszcze nieustalony |
| `NS`   | Not Started                   | Scheduled  | ZAPOWIEDŹ   | —   | przed pierwszym gwizdkiem |
| `1H`   | First Half / Kick Off         | In Play    | LIVE        | TAK | pierwsza połowa, zegar tyka |
| `HT`   | Halftime                      | In Play    | LIVE        | nie | przerwa — etykieta „Przerwa" |
| `2H`   | Second Half / 2nd Half Started| In Play    | LIVE        | TAK | druga połowa, zegar tyka |
| `ET`   | Extra Time                    | In Play    | LIVE        | TAK | dogrywka, zegar tyka |
| `BT`   | Break Time                    | In Play    | LIVE        | nie | przerwa przed/między dogrywką |
| `P`    | Penalty In Progress           | In Play    | LIVE        | nie | rzuty karne — etykieta „Karne" |
| `SUSP` | Match Suspended               | In Play    | LIVE        | nie | zawieszony (zegar zamrożony) |
| `INT`  | Match Interrupted             | In Play    | LIVE        | nie | chwilowo przerwany |
| `LIVE` | In Progress                   | In Play    | LIVE        | nie | generyczny live (bardzo rzadki) — wg API `elapsed`/half-time NIEdostępne, więc render daje etykietę „Na żywo" bez minuty |
| `FT`   | Match Finished                | Finished   | ZAKOŃCZONY  | —   | koniec w regulaminowym czasie |
| `AET`  | Match Finished After Extra Time | Finished | ZAKOŃCZONY  | —   | koniec po dogrywce |
| `PEN`  | Match Finished After Penalty  | Finished   | ZAKOŃCZONY  | —   | koniec po karnych |
| `PST`  | Match Postponed               | Postponed  | ZAPOWIEDŹ   | —   | przełożony → ZAPOWIEDŹ z nową datą (nie ODWOŁANY) |
| `CANC` | Match Cancelled               | Cancelled  | ODWOŁANY    | —   | odwołany |
| `ABD`  | Match Abandoned               | Abandoned  | ODWOŁANY    | —   | przerwany bez dokończenia |
| `AWD`  | Technical Loss                | Not Played | ODWOŁANY    | —   | walkower techniczny — mecz się nie odbył |
| `WO`   | WalkOver                      | Not Played | ODWOŁANY    | —   | walkower — mecz się nie odbył |

> **Trwająca gra (Minuta? = TAK):** `1H`, `2H`, `ET`. Tylko tu render dokleja
> minutę z `status.elapsed` (+ `status.extra` jako doliczony). Pozostałe stany LIVE
> to albo pauzy z zamrożonym zegarem (`HT`/`BT`/`P`/`SUSP`/`INT`), albo `LIVE`,
> gdzie wg API `elapsed` jest NIEdostępny — wszystkie dostają etykietę zamiast minuty.
>
> **Uwaga implementacyjna dla `lookups.php`:** kod nieznany / nieobecny w tabeli →
> bezpieczny fallback (proponowane: ZAPOWIEDŹ, bez minuty), żeby nowy kod API nie
> wywrócił renderu. Słownik trzyma WSZYSTKIE kody enuma — nie tylko te z próbek.
>
> Próbka ma tylko `2H` i `NS`. Pełna lista to enum statusów fixtures z dokumentacji
> api-football v3 (sekcja Fixtures → status). `LIVE` jako `short` pojawia się rzadko
> (część lig); pozostałe kody są standardowe.
> Frontend live używa też `score.halftime`, `score.fulltime`, `score.extratime`, `score.penalty` — dostępne w fixtures.

### 3. Metadane czasowe i kontekst
| Pole frontendu | Ścieżka w API | Uwagi |
|---|---|---|
| Data i godzina kickoffu (ISO 8601) | `fixture.date` | "2026-06-12T19:00:00+00:00"; `fixture.timestamp` (unix) jako alternatywa |
| Nazwa rozgrywek (PL) | `league.name` | API EN ("World Cup"). PL "Mundial 2026" → mapowanie ręczne. `league.id` jako klucz. |
| Sezon | `league.season` | int (2026) |
| Faza / etap rozgrywek | `league.round` | "Group Stage - 1" (EN, numer kolejki). PL + nazwa fazy → mapowanie ręczne. |
| Oznaczenie grupy (A–L) | **brak w fixtures** | `round` daje tylko numer kolejki, nie literę grupy. Grupa → ze `standings` lub ręcznie (patrz „Pola ręczne"). |

### Dane meczu obecne w fixtures, a NIEUŻYWANE przez frontend
(kandydaci do wycięcia — szczegóły w sekcji zbiorczej na końcu)
`fixture.referee`, `fixture.timezone`, `fixture.periods`, `fixture.venue` (id/name/city),
`league.country`, `league.logo`, `league.flag`, `league.standings`,
`teams.home.winner` / `teams.away.winner` (pochodne od wyniku).

---

## Endpoint: events
`GET /fixtures/events?fixture={id}` — próbka: [fixtures-events.jsonl](api-samples/fixtures-events.jsonl)

Oś czasu wydarzeń meczu (widok ML). Jeden element `response[i]` = jedno wydarzenie,
posortowane wg czasu. Frontend renderuje je po stronie drużyny wg `team.id`.

### 4. Wydarzenia meczowe
| Pole frontendu (data-inventory) | Ścieżka w API | Uwagi |
|---|---|---|
| Minuta eventu | `time.elapsed` | int; doliczony czas: `time.extra` (np. 45+1) |
| Typ eventu (enum) | `type` + `detail` | mapowanie ↓ |
| Imię i nazwisko — główny zawodnik | `player.name` | "J. Lukic" (skrócone imię z API) |
| Imię i nazwisko — zawodnik pomocniczy | `assist.name` | `null` gdy brak asysty → nie wyświetlać (decyzja #2) |
| (przypisanie do drużyny) | `team.id` | po której stronie osi renderować event |

**Mapowanie typu eventu** (`type` + `detail` → enum frontendu):
| API `type` | API `detail` (przykłady) | Enum frontendu |
|---|---|---|
| `Goal` | Normal Goal / Penalty / Own Goal | bramka ⚽ (own goal/karny → DO USTALENIA oznaczenie) |
| `Goal` | Missed Penalty | DO USTALENIA (czy pokazywać niewykorzystany karny) |
| `Card` | Yellow Card | żółta kartka 🟨 |
| `Card` | Red Card | czerwona kartka 🟥 |
| `subst` | Substitution {n} | zmiana ↔ — `player`/`player_id` = SCHODZĄCY, `assist`/`assist_id` = WCHODZĄCY (ustalone empirycznie w 3bi — patrz nota niżej). `detail` numeruje zmiany per drużyna narastająco (struktura recyklowana z eventu gola — stąd nazwa „assist"). |
| `Var` | (np. Goal cancelled) | brak w enumie frontendu → pomijać lub DO USTALENIA |

> Dla eventu bramki `assist` bywa wypełniony (`S. Kolasinac`) lub `null` — obsłużyć oba.
> Pole 6 data-inventory „Eventy zawodnika na karcie składu / Minuta zmiany" jest pochodne:
> agregujemy te same eventy per `player.id` przy renderowaniu składu (lineups).

> **Kierunek `subst` (ustalony empirycznie w 3bi).** W evencie `type="subst"`
> api-football trzyma SCHODZĄCEGO w `player`/`player_id`, a WCHODZĄCEGO w
> `assist`/`assist_id` (struktura recyklowana z eventu gola). Kierunek ustalony
> empirycznie w 3bi przez JOIN ze składami (`player_id` trafia do `startXI`
> ⇒ `player` = schodzący). UWAGA: odwrotnie niż nominalna dokumentacja
> api-football — obowiązuje obserwacja na danych. **Import przepisuje oba pola
> SUROWO — niczego nie relabeluje.** Mapowanie na etykiety „wchodzi/schodzi"
> (`player`→schodzący, `assist`→wchodzący) to wyłącznie operacja RENDERU
> (Faza 3). Dlatego dla eventów `subst` w `match_data` zostaje też `assist_id`
> (łącznik WCHODZĄCEGO ze składem `lineups`) — przy bramkach `assist.id` jest
> wycinany.

### Dane events obecne w API, a NIEUŻYWANE przez frontend
`team.name`, `team.logo` (redundancja z fixtures — przypisanie po `team.id`),
`player.id`, `assist.id` (chyba że potrzebne do łączenia z lineups → patrz niżej),
`comments` (np. "Tripping" — powód kartki; możliwy bonus, ale nie ma go w designie).

---

## Endpoint: lineups
`GET /fixtures/lineups?fixture={id}` — próbka: [fixteres-lineups.jsonl](api-samples/fixteres-lineups.jsonl)

Składy obu drużyn (widoki ML, ZM). `response[]` ma **2 elementy** (po jednym na drużynę).
Każdy zawiera `team`, `formation`, `startXI[]`, `substitutes[]`, `coach`.

### 6. Składy
| Pole frontendu (data-inventory) | Ścieżka w API | Uwagi |
|---|---|---|
| Numer zawodnika (koszulka) | `startXI[].player.number` / `substitutes[].player.number` | int |
| Imię i nazwisko zawodnika | `startXI[].player.name` | tu PEŁNE imię ("Maxime Crépeau"); w events skrócone ("A. Johnston") → łączyć po `player.id` |
| Pozycja zawodnika | `…player.pos` | G/D/M/F → Br/O/P/N (decyzja #3): G=Bramkarz, D=Obrońca, M=Pomocnik, F=Napastnik |
| Czy w pierwszym składzie / rezerwowy | (która tablica) | element `startXI[]` = pierwszy skład; `substitutes[]` = ławka |
| Eventy zawodnika w meczu | (z events) | brak w lineups; agregować eventy po `player.id` z `/fixtures/events` |
| Minuta zmiany | (z events) | brak w lineups; z eventu `type=subst` w `/fixtures/events` |
| Status nieobecności (Kontuzja/Zawieszenie) | **brak w lineups** | osobny endpoint `/injuries` lub pole ręczne → patrz „Pola ręczne" |

**Wsparcie diagramu boiska** (data-inventory: „Diagram boiska vs. ławka"):
- `formation` — np. "4-4-2" (układ).
- `startXI[].player.grid` — pozycja na siatce "rząd:kolumna" (np. "2:4"); `null` dla rezerwowych.

### Dane lineups obecne w API, a NIEUŻYWANE przez frontend
`team.colors` (kolory koszulek bramkarz/gracz — design nie używa kolorów drużyn),
`coach` (id/name/photo — brak trenera w designie; ewentualny bonus),
`team.name`/`team.logo` (redundancja z fixtures), `player.id` (potrzebny tylko do
łączenia z events, nie do wyświetlenia).

---

## Endpoint: statistics
`GET /fixtures/statistics?fixture={id}` — próbka: [fixtures-statistics.jsonl](api-samples/fixtures-statistics.jsonl)

Statystyki meczu per drużyna (widok ML). `response[]` ma **2 elementy** (po drużynie).
Każdy: `team` + `statistics[]` — **tablica par `{type, value}`** (nie nazwane pola!).
Mapowanie odbywa się po stringu `type`. `value` bywa int, stringiem ("66%", "0.57") lub `null`.

### 5. Statystyki
| Pole frontendu (data-inventory) | `type` w API | Uwagi |
|---|---|---|
| Posiadanie piłki (%) | `Ball Possession` | string z `%` ("66%") |
| Strzały (łącznie) | `Total Shots` | int |
| Strzały celne | `Shots on Goal` | int |
| Faule | `Fouls` | int |
| Rzuty rożne | `Corner Kicks` | int |
| Żółte kartki (łączna liczba) | `Yellow Cards` | int |
| Czerwone kartki (łączna liczba) | `Red Cards` | `null` gdy 0 → traktować jak 0 |
| Podania (łącznie) | `Total passes` | int |
| Podania (celność %) | `Passes %` | string z `%`; surowe: `Passes accurate` (int) |

**Pozostałe `type` dostępne w API** (decyzja #4 — można wyświetlić przetłumaczone, jeśli zmieszczą się w UI):
`Shots off Goal`, `Blocked Shots`, `Shots insidebox`, `Shots outsidebox`, `Offsides`,
`Goalkeeper Saves`, `expected_goals` (xG), `goals_prevented`.

> **Uwaga do importu/storage:** `statistics` to tablica par — przy zapisie do `match_data`
> przekształcamy ją w obiekt kluczowany po `type` (WSZYSTKIE typy, nie tylko wybrane),
> żeby szablon nie szukał liniowo po tablicy. Selekcję „które pokazać" robi render
> (Faza 3). Wartości `%`/xG zostają stringami — parsowanie/format w PHP. Patrz Sekcja C.

### Dane statistics obecne w API, a NIEUŻYWANE przez frontend
`team.name`/`team.logo` (redundancja). Reszta typów (xG, insidebox/outsidebox itp.)
jest opcjonalna — domyślnie wycinamy te, których design nie pokazuje (patrz sekcja zbiorcza #2).

---
---

# Sekcje zbiorcze

## A. Pola frontendu, których NIE MA w API → ręczne / ACF / taksonomie / inny endpoint

Te pola nie wynikają z czterech zmapowanych endpointów. Pogrupowane wg źródła.

### A1. Mapowanie ręczne na encjach WordPressa (nie per mecz!)
Tłumaczenie encji (drużyny, rozgrywki) to **resolucja po stabilnym ID do termu o polskiej
nazwie** — NIE słownik EN→PL po stringach. PL nazwa = **nazwa termu** taksonomii; `team.id`
/ `league.id` oraz kod FIFA żyją w **term meta**. Import łączy mecz z encją po
`team.id` / `league.id` (NIGDY po nazwie EN). Roster drużyn tworzymy **raz** (seed CSV
w [docs/](.)); nazwa EN to tylko ściągawka przy seedowaniu — nigdzie nie zapisywana.
Małe słowniki strukturalne (faza z `league.round`, status, pozycje G/D/M/F) → mały stały
lookup string→PL w PHP (round nie ma stabilnego ID, jest tylko stringiem).
Pełna decyzja: sekcja „Lokalizacja nazw" w CLAUDE.md.

| Pole | Gdzie trzymać | Uwagi |
|---|---|---|
| Nazwa drużyny (PL) | **nazwa termu** taksonomii „drużyna" | API daje EN; resolucja po `team.id` |
| `team.id` (klucz łączący) | term meta taksonomii „drużyna" | jedyny stabilny łącznik mecz→drużyna |
| Kod kraju/FIFA 3-lit. (POL, BRA…) | term meta taksonomii „drużyna" | brak w API; potrzebny do `data-team` i do flagi |
| Flaga (flagcdn.com) | pochodna kodu kraju | URL budowany z kodu; API daje tylko herb `teams.*.logo` |
| Nazwa rozgrywek (PL, „Mundial 2026") | **nazwa termu** taksonomii „rozgrywki" | API daje EN „World Cup"; resolucja po `league.id` |
| `league.id` (klucz łączący) | term meta taksonomii „rozgrywki" | stabilny łącznik mecz→rozgrywki |
| Nazwa fazy (PL) | lookup string→PL w PHP | z `league.round` „Group Stage - 1"; round = string bez stabilnego ID |

### A2. Pola ACF (per mecz, ręczne)
| Pole | ACF | Uwagi |
|---|---|---|
| URL YouTube / Video ID | `field_skrot_url` | decyzja CLAUDE.md #4 |
| Czas trwania wideo | ACF | MM:SS; źródło docelowe: YouTube Data API (slice fazy danych zewnętrznych), do tego czasu ręcznie — CLAUDE.md, plan D1.5 |
| Kanał / nadawca | **taksonomia** (nie ACF) | decyzja #12: elastyczna taksonomia, nie stałe pole |
| Data/czas publikacji wideo | ACF | wyświetlana relatywnie |

### A3. Taksonomie (pola filtrowalne — decyzja CLAUDE.md #4)
Drużyny, rozgrywki, sezon, kanał. `status_wideo` NIE jest taksonomią — to
pochodna obecności `field_skrot_url` (CLAUDE.md decyzja #9); „ma wideo" jako
kryterium istnieje tylko w adminie (Algolia). Status meczu enum — pochodny
z `fixture.status.short`, nie taksonomia (listy publiczne stałe per widok).

### A4. Pola pochodne (wyliczane w PHP, nie przechowywane)
| Pole | Z czego |
|---|---|
| Slug meczu „francja-chorwacja-2026-06-12" | z polskich nazw drużyn (ASCII) + daty fixture'a; generowany RAZ — plan D1.1 |
| Odliczanie dni/godz./min/sek (ZM) | z `fixture.date` |
| Status enum PL | z `fixture.status.short` (tabela mapująca) |
| Pozycje Br/O/P/N | z `player.pos` (G/D/M/F) |
| Minuta zmiany / eventy zawodnika na karcie składu | z `/events` po `player.id` |

### A5. Z INNYCH endpointów api-football (poza zakresem tego mapowania)
| Obszar frontendu (data-inventory) | Endpoint | Status |
|---|---|---|
| Tabele grupowe (sekcja 9, TG) | `/standings` | osobne, późniejsze zadanie |
| Litera grupy A–L (decyzja #6) | `/standings` (lub ręcznie) | osobne, późniejsze zadanie — źródło (`/standings` vs ręcznie) rozstrzygniemy tam |
| Profil drużyny: statystyki (sekcja 10, PB) | `/teams/statistics` | osobne, późniejsze zadanie; próbka `teams-statistics.jsonl` już jest |
| Status nieobecności: Kontuzja/Zawieszenie (sekcja 6) | `/injuries` | niezmapowane; alternatywnie pole ręczne |
| Ostatnie mecze / forma drużyny (sekcja 10) | `/fixtures` (po drużynie) | ten sam endpoint, inne zapytanie |

### A6. Spoza api-football w ogóle
Sekcje 11–15 data-inventory: konto/preferencje/relacje użytkownika (WP users +
plugin hajlajty-user), dane redaktorskie (WP/CMS), stan aplikacji (frontend).

---

## B. Dane z API nieużywane przez frontend → wyciąć przed zapisem do `match_data`

Cel: `match_data` ma nie puchnąć (decyzja CLAUDE.md #3). Wycinamy podczas importu:

**fixtures:** `fixture.referee`, `fixture.timezone`, `fixture.periods`,
`fixture.venue` (id/name/city), `league.country`, `league.logo`, `league.flag`,
`league.standings`, `teams.*.winner` (pochodne od wyniku), `teams.*.logo`
(herb mamy z term meta), URL-e `…logo`.

**events:** `team.name`, `team.logo` (zostaje samo `team.id` do przypisania strony),
`comments`. `assist.id` — wycinany dla bramek/kartek, ale **zostaje dla `subst`**
(łącznik wchodzącego ze składem). `player.id` — **zostaje** (łączenie ze składami:
eventy zawodnika na karcie składu).

**lineups:** `team.name`/`team.logo` (zostaje sam `team.id`). Z `coach` zostaje
TYLKO `name` (główka składu) — `coach.id`/`coach.photo` wycinane. `player.id`
zostaje (łączenie z events). UWAGA: `team.colors` NIE jest już wycinane — od 3bi
zostaje w `match_data.lineups` (render maluje barwy koszulek: primary/number/border).

**statistics:** `team.name`/`team.logo` (redundancja — zostaje sam `team.id` →
strona). Typów statystyk **NIE wycinamy**: import zapisuje WSZYSTKIE `type`
zwrócone przez API (obiekt keyed by `type`). Selekcja „które pokazać" przeniesiona
do renderu (Faza 3) — spójnie z `events`/`lineups` (też nie filtrujemy przy
imporcie) i z decyzją #6 (filtr przy imporcie wymuszałby re-import przy zmianie UI).

**globalnie:** `get`, `parameters`, `errors`, `paging`, `results` (koperta odpowiedzi) —
nigdy nie zapisujemy; bierzemy tylko `response`.

---

## C. Propozycja finalnego kształtu `match_data` (pole meta, JSON)

Zgodnie z decyzją CLAUDE.md #3: **JEDNO** pole meta `match_data` = przycięty payload
z api-football; szablony robią `json_decode` i renderują. Pola **filtrowalne**
(drużyny, rozgrywki, sezon, kanał; `status_wideo` to pochodna `skrot_url`,
nie taksonomia — decyzja #9) i **PL nazwy/kody** NIE są tutaj —
żyją w taksonomiach / term meta / ACF, żeby się nie duplikować i być filtrowalne.

`match_data` trzyma to, co dynamiczne i niefiltrowalne: rdzeń meczu, oś czasu,
składy, statystyki. Struktura blisko API (przycięta), z dwoma świadomymi odstępstwami:
`statistics` jako obiekt kluczowany (nie tablica par) i strony jako `home`/`away`.

```json
{
  "fixture_id": 1539000,
  "kickoff": "2026-06-12T19:00:00+00:00",
  "round": "Group Stage - 1",
  "status": { "short": "2H", "elapsed": 48, "extra": null },
  "goals": { "home": 0, "away": 1 },
  "score": {
    "halftime":  { "home": 0,    "away": 1 },
    "fulltime":  { "home": null, "away": null },
    "extratime": { "home": null, "away": null },
    "penalty":   { "home": null, "away": null }
  },
  "teams": {
    "home": { "api_id": 5529 },
    "away": { "api_id": 1113 }
  },
  "events": [
    {
      "minute": 21, "extra": null, "side": "away",
      "type": "Goal", "detail": "Normal Goal",
      "player": "J. Lukic", "player_id": 77037,
      "assist": "S. Kolasinac"
    }
  ],
  "lineups": {
    "home": {
      "formation": "4-4-2",
      "startXI":     [ { "id": 51274, "name": "Maxime Crépeau", "number": 16, "pos": "G", "grid": "1:1" } ],
      "substitutes": [ { "id": 51148, "name": "Dayne St. Clair", "number": 1,  "pos": "G", "grid": null } ]
    },
    "away": { "formation": "…", "startXI": [], "substitutes": [] }
  },
  "statistics": {
    "home": { "Ball Possession": "66%", "Total Shots": 7, "Shots on Goal": 1, "Fouls": 4, "Corner Kicks": 9, "Yellow Cards": 1, "Red Cards": null, "Total passes": 249, "Passes %": "75%" },
    "away": { "Ball Possession": "34%", "Total Shots": 6, "Shots on Goal": 3, "Fouls": 10, "Corner Kicks": 1, "Yellow Cards": 2, "Red Cards": null, "Total passes": 135, "Passes %": "64%" }
  }
}
```

> **`statistics` w przykładzie pokazuje 9 typów — przykład skrócony.** Import
> zapisuje WSZYSTKIE typy zwrócone przez API (keyed by `type`), nie tylko te z UI.

**Uwagi do kształtu:**
- `teams.{home,away}.api_id` to jedyny ślad drużyny w `match_data` — łącznik do termu
  taksonomii „drużyna" (skąd PL nazwa, kod, flaga). Bez duplikowania nazw.
- `status.short` jest tu, bo live potrzebuje surowego kodu i minuty; enum PL i tak
  liczymy w PHP. Status wideo (filtr) to osobna taksonomia.
- `events[].side` = "home"/"away" wyliczone z `team.id` przy imporcie (mniej danych
  niż powtarzać `team.id`). `player_id` **zostaje** — design pokazuje eventy zawodnika
  na karcie składu, więc agregacja eventów per `player.id` (łącznik events↔lineups)
  jest realnie używana.
- `statistics` — **wszystkie typy zwrócone przez API**, jako obiekt kluczowany po
  `type`. Klucz = `type` VERBATIM z API (mieszany case zostaje: `"Ball Possession"`,
  `"expected_goals"`, `"goals_prevented"`). Import NIE wycina ani NIE tłumaczy typów
  — selekcja „które pokazać", etykiety PL i format wartości to operacje RENDERU
  (Faza 3; zakaz słownika EN→PL po stringach przy imporcie — „Lokalizacja nazw").
  Wartości surowe, zero koercji: `7` (int), `"66%"` (string), `null`, `"0.57"`
  (string). Jedyne odstępstwo od API: tablica par `{type,value}` → obiekt keyed
  by `type` (szablon nie szuka liniowo).
- Sekcje opcjonalne: dla meczu-zapowiedzi `events`/`lineups`/`statistics` mogą nie
  istnieć — szablon sprawdza obecność klucza.

> **Decyzja:** `match_data` trzyma strukturę **RAW/przyciętą** (jak wyżej), blisko API —
> NIE w pełni znormalizowaną/przetłumaczoną. Zgodnie z decyzją CLAUDE.md #3 i zasadą
> „zero abstrakcji na zapas". PL nazwy/kody i pola filtrowalne tu nie wchodzą — żyją
> w taksonomiach / term meta / ACF.
