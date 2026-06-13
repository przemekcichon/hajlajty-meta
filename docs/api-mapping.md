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
