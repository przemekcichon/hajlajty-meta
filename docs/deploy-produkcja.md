# Wdrożenie na produkcję — checklista pierwszego uruchomienia

Dokument operacyjny (deploy/ops, NIE kod). Opisuje **jednorazowy bootstrap** świeżej
produkcji, gdy NIE przenosimy bazy przez backup, bo dane meczowe lecą z api-football,
a flagi z flagcdn. Po tym bootstrapie świeżość danych utrzymuje cron — jego
konfiguracja systemowa jest w osobnym dokumencie: **`docs/cron-produkcja.md`**.

## Najważniejsze (przeczytaj najpierw): cron NIE bootstrapuje

Crony **odświeżają** dane, ale na pustej bazie nie mają czego odświeżać — „brama
budżetowa" sprawia, że robią **zero zapytań do API**, dopóki dane nie istnieją:

- `hajlajty_live_import_tick` (~1 min) — odświeża LIVE + domyka FT meczów, **które
  już są w bazie**; NIE tworzy meczów.
- `hajlajty_standings_import_tick` (hourly) — odświeża **tylko** rozgrywki z już
  zapisanym `standings_<sezon>`.
- `hajlajty_team_stats_import_tick` (daily) — odświeża **tylko** drużyny z już
  zapisanym `team_stats_<liga>_<sezon>`.

Wniosek: **seed + pierwsze importy + flush + strony to kroki RĘCZNE, jednorazowe.**
Dopiero po nich cron zaczyna mieć sens. Wszystkie trzy eventy napędza JEDEN wpis
systemowego crona z `cron-produkcja.md` (`wp cron event run --due-now`).

## Co jedzie czym

- **WP Pusher** → kod: wtyczka `hajlajty-core`, motyw `hajlajty-theme` (i CSV seeda
  w `features/roster-seed/data/`, bo to część repo). To wszystko, co jedzie z repo.
- **NIE jedzie z repo** (skonfiguruj na prodzie ręcznie):
  - **ACF PRO** — osobna, płatna wtyczka (UI pól: `skrot_url` meczu, `league_id`/
    `season` strony tabeli). Zainstaluj i aktywuj.
  - **Klucz api-football** — w `wp-config.php` (nie w repo, decyzja #7/sekrety).
  - **Dane** — nie ma backupu; lecą z API + 5 ręcznych skrótów (niżej).

Zakładamy root WordPressa `/home/www/public_html` i WP-CLI jako właściciel
`public_html` (jak w `cron-produkcja.md`). Komendy `wp` poniżej dla zwięzłości bez
`--path` — uruchamiaj z roota WP albo dołóż `--path=/home/www/public_html`.

---

## 0. Wymagania wstępne

1. Wtyczka `hajlajty-core` i motyw `hajlajty-theme` **aktywne** (po WP Pusher).
2. **ACF PRO** aktywne.
3. **Klucz api-football** w `wp-config.php` (powyżej „That's all, stop editing!"):
   ```php
   define( 'HAJLAJTY_APIFOOTBALL_KEY', 'twoj_klucz_api_sports' );
   ```
   Bez tego import rzuci czytelny błąd („Brak klucza API…"). Host: API-Sports
   bezpośredni, nagłówek `x-apisports-key`.
4. Sanity: `wp plugin list` (core + ACF aktywne), `wp theme list` (theme aktywny).

## 1. Seed katalogu (drużyny + rozgrywki)

Tworzy termy taksonomii `druzyna` (z `api_id`, `fifa_code`) i `rozgrywki` (z
`league_id`) z CSV w pluginie. **Bez tego nic się nie zresolwuje** (import nie zmapuje
meczów/tabel/statystyk do termów, slug meczu nie ma polskiej nazwy).

```bash
wp hajlajty seed --dry-run   # podgląd: co powstanie / zostanie odrzucone
wp hajlajty seed             # właściwy zapis (idempotentny — można powtarzać)
```
Weryfikacja: `wp term list druzyna --fields=term_id,name | head` oraz
`wp term list rozgrywki --fields=term_id,name` (znajdź `league_id` rozgrywki w
`features/roster-seed/data/leagues.csv` — potrzebny niżej; dla MŚ to `1`).

## 2. Flush permalinków

CPT `mecz`, archiwa list (`/na-zywo/`, `/zapowiedzi/`, `/skroty/`) i archiwum termu
`druzyna` (`/druzyna/{slug}/` = Profil kraju) potrzebują przeliczonych reguł rewrite.

```bash
wp rewrite flush
```

## 3. Pierwszy import danych (bootstrap)

Tworzy dane i „rejestruje" pary, które potem cron sam odświeża. Użyj realnego
`league_id` (z kroku 1) i sezonu (MŚ 2026 → `--league=1 --season=2026`).

```bash
# 3a. Mecze (posty CPT „mecz" jako zapowiedzi) — bez tego live-cron nie ma czego śledzić:
wp hajlajty import --league=1 --season=2026

# 3b. Tabela grup (MVP-d/e) — zasila /tabele-grup/ + grupowanie Reprezentacji + widżet grupy w profilu:
wp hajlajty standings --league=1 --season=2026

# 3c. Statystyki drużyn (MVP-f) — zasila widżet statystyk na Profilu kraju:
wp hajlajty team-stats --league=1 --season=2026
```
Weryfikacja:
- `wp post list --post_type=mecz --format=count` (>0),
- `wp term meta get <ID_rozgrywki> standings_2026` (niepuste),
- `wp term meta get <ID_druzyny> team_stats_1_2026` (niepuste; np. drużyna z grupy).

> Uwaga: dla turnieju o stałym terminarzu (MŚ) import meczów odpalasz **raz**
> (pełna lista). Live-cron uzupełnia potem wynik/minutę/FT. Nowe mecze nie powstają
> automatycznie — po ewentualnych zmianach terminarza powtórz `import`.

## 4. Strony redaktora (Pages)

Sidebar i stopka linkują na **stałe slugi** — muszą się zgadzać. W każdej: WP Admin →
Strony → Dodaj, ustaw slug i szablon (Atrybuty strony → Szablon), opublikuj.

| Strona | Slug | Szablon (Template Name) | Dodatkowo |
|---|---|---|---|
| Terminarz | `terminarz` | **Terminarz turnieju** | — |
| Tabele grup | `tabele-grup` | **Tabela rozgrywek** | pola strony: `league_id=1`, `season=2026` |
| Reprezentacje | `reprezentacje` | **Reprezentacje** | — |

Po utworzeniu stron: ponowny `wp rewrite flush` (gdyby permalinki stron nie łapały).

## 5. Treść redakcyjna (skróty wideo)

Skróty (`skrot_url` + taksonomia `kanal`) to dane redakcyjne na postach meczów — **nie
ma ich w backupie** i nie lecą z API. Po imporcie meczów (krok 3a) posty są nowe, więc
**re-wpisz ręcznie** lokalnie dodane skróty (na starcie: ~5 filmów):
WP Admin → Mecze → wybierz mecz → pole „Link do skrótu (YouTube)" + przypisz `kanal`.
Mecz z wypełnionym `skrot_url` automatycznie trafia na listę „Skróty" (decyzja #9).

## 6. Cron systemowy (świeżość)

Pełna konfiguracja: **`docs/cron-produkcja.md`** (wyłączenie WP-Cron na requestach +
wpis OS-crona `* * * * * … wp cron event run --due-now`). Ten **jeden** wpis napędza
WSZYSTKIE trzy eventy. Weryfikacja, że są zaplanowane:

```bash
wp cron event list --fields=hook,schedule,next_run_relative
```
Szukaj trzech hooków:
- `hajlajty_live_import_tick` — `hajlajty_one_minute`,
- `hajlajty_standings_import_tick` — `hourly`,
- `hajlajty_team_stats_import_tick` — `daily`.

(Jeśli któregoś brak: wejdź na dowolną stronę — eventy rejestrują się na `init`.)

## 7. Weryfikacja końcowa (przejście po froncie)

- `/` (strona główna), `/na-zywo/`, `/zapowiedzi/`, `/skroty/` — listy meczów + chipy/szukajka.
- `/terminarz/` — mecze w dniach. `/tabele-grup/` — 12 grup A–L.
- `/reprezentacje/` — drużyny pogrupowane A–L (seed „A1" z tabeli).
- `/druzyna/<slug>/` (np. drużyny z zaimportowanymi `team_stats`) — Profil: hero,
  statystyki, tabela grupy, nadchodzące/ostatnie/live mecze; layout jak single (drawer).
- Flagi (flagcdn) ładują się, brak błędów PHP.

## Granica: jednorazowo vs cyklicznie

- **Jednorazowo (ten dokument):** seed → flush → pierwsze importy → strony → skróty.
- **Cyklicznie (cron, `cron-produkcja.md`):** live (wynik/minuta/FT), godzinowy refresh
  tabel, dzienny refresh statystyk — **tylko dla danych już raz zaimportowanych**.
