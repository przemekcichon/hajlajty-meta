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
| Slug/ID meczu | `fixture.id` (źródło) | Slug "skrot-FRA-CRO" jest pochodny/ręczny; `fixture.id` to klucz API i identyfikator deduplikacji importu. |

### 2. Wynik i status
| Pole frontendu | Ścieżka w API | Uwagi |
|---|---|---|
| Wynik — bramki gospodarza | `goals.home` | `null` przed meczem |
| Wynik — bramki gościa | `goals.away` | `null` przed meczem |
| Status meczu (enum PL) | `fixture.status.short` | mapowanie ↓ |
| Minuta meczu (live) | `fixture.status.elapsed` | `null` poza LIVE; doliczony czas: `fixture.status.extra` |

**Mapowanie statusu** (`status.short` → enum frontendu, wg odpowiedzi #1 z data-inventory):
| API `short` | API `long` | Enum frontendu |
|---|---|---|
| `NS` | Not Started | ZAPOWIEDŹ |
| `TBD` | Time To Be Defined | ZAPOWIEDŹ |
| `1H`,`HT`,`2H`,`ET`,`BT`,`P`,`LIVE`,`INT` | First Half / Halftime / Second Half / Extra Time / Break / Penalty / Live | LIVE |
| `FT`,`AET`,`PEN` | Match Finished (+ ET / + Penalties) | ZAKOŃCZONY |
| `PST` | Match Postponed | ZAPOWIEDŹ (z nową datą) |
| `CANC` | Match Cancelled | ODWOŁANY |
| `ABD` | Match Abandoned | ODWOŁANY |
| `AWD`,`WO` | Technical Loss / WalkOver | ODWOŁANY / DO USTALENIA |
| `SUSP` | Match Suspended | DO USTALENIA (LIVE czy ZAPOWIEDŹ?) |

> Próbka ma tylko `2H` i `NS`. Pełna lista kodów wg dokumentacji API (decyzja #1).
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
| `subst` | Substitution {n} | zmiana ↔ — **brak w próbce**; dla zmian `player`/`assist` to wchodzący/schodzący → DO USTALENIA który jest który (patrz Pytania) |
| `Var` | (np. Goal cancelled) | brak w enumie frontendu → pomijać lub DO USTALENIA |

> Dla eventu bramki `assist` bywa wypełniony (`S. Kolasinac`) lub `null` — obsłużyć oba.
> Pole 6 data-inventory „Eventy zawodnika na karcie składu / Minuta zmiany" jest pochodne:
> agregujemy te same eventy per `player.id` przy renderowaniu składu (lineups).

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
