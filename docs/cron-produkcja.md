# Cron na produkcji — uruchomienie automatycznego live-importu

Dokument operacyjny (deploy/ops, NIE kod). Opisuje, co zrobić na serwerze
produkcyjnym, żeby automatyczny live-import + auto-finalizacja FT (slice
`match-import` w hajlajty-core, pod-slice 3e-iv-a) faktycznie biły **co minutę**.
Kod jest gotowy i czeka na to bicie — sam się o nie nie zatroszczy.

## Dlaczego to w ogóle potrzebne (przeczytaj najpierw)

WordPressowy cron (**WP-Cron**) NIE jest prawdziwym cronem systemowym. Odpala się
tylko **przy ruchu na stronie** — przy okazji czyjejś wizyty WordPress sprawdza,
czy są zaległe zadania, i je wykonuje. Konsekwencje:

- Bez ruchu zadania **nie ruszą** (to dlatego na lokalnym Localu event trzeba
  było wymuszać ręcznie przez `wp cron event run`).
- Kadencja jest **niepewna**: przy małym ruchu zadanie „co minutę" może odpalić
  się raz na kilka–kilkanaście minut, a w nocy wcale.

Dla live-importu (świeży wynik/minuta w trakcie meczu) to za mało. Rozwiązanie:
przejąć bicie przez **systemowy cron OS-a**, który co minutę woła WP-CLI, a
WP-Cronowi na requestach odebrać tę rolę (żeby nie dublować).

To jest jednorazowa konfiguracja serwera, nie zmiana w kodzie.

## Co dokładnie robi event (dla kontekstu)

- Hook eventu: `hajlajty_live_import_tick`, harmonogram `hajlajty_one_minute` (60 s).
- Przy każdym tiku **najpierw sprawdza okno meczowe**: czy jest śledzony mecz z
  `kickoff ∈ [teraz−180 min, teraz+5 min]` i jeszcze nie zakończony.
  - Poza oknem → wychodzi natychmiast, **zero zapytań do api-football**.
  - W oknie → odświeża dane live (`live=all`) i domyka mecze po gwizdku (FT).
- Czyli systemowy cron bije co minutę „na sucho", a do API dzwoni tylko w oknach
  wokół meczów. Budżet API jest pod kontrolą niezależnie od częstotliwości bicia.

## Kroki na produkcji

Zakładamy root WordPressa: `/home/www/public_html` (podmień na swój).

### 1. Wyłącz WP-Cron na requestach

W `wp-config.php` (powyżej linii `/* That's all, stop editing! */`):

```php
define( 'DISABLE_WP_CRON', true );
```

Bez tego event odpalałby się i z systemowego crona, i przy ruchu na stronie —
czasem dwa razy. Z tym `define` masz **jedno, pewne źródło bicia**: systemowy cron.

### 2. Ustal realne ścieżki i użytkownika

Crontab startuje z ubogim `PATH` (zwykle `/usr/bin:/bin`), więc samo `wp` się nie
znajdzie — trzeba podać pełne ścieżki. Sprawdź:

```bash
which wp      # np. /usr/local/bin/wp   (jeśli to wp-cli.phar — patrz niżej)
which php     # np. /usr/bin/php
ps aux | grep php-fpm | grep -v grep   # pod jakim USEREM chodzi PHP (np. www, www-data)
```

> WP-CLI ma chodzić jako **właściciel `public_html`** (ten sam user co PHP-FPM),
> NIE jako root. Jako root WP-CLI odmawia działania bez `--allow-root`, a pliki
> z importu dostałyby złego właściciela. Wpis idzie do crontaba tego usera.

### 3. Wpis do crontaba

Edytuj crontab właściwego użytkownika:

```bash
crontab -u www -e        # albo zwykłe `crontab -e` zalogowany jako ten user
```

Wpis (podmień ścieżki na te z kroku 2):

```cron
* * * * * /usr/bin/php /usr/local/bin/wp cron event run --due-now --path=/home/www/public_html >/dev/null 2>&1
```

- `* * * * *` — co minutę.
- `--due-now` — wykonaj wszystkie zaległe zadania teraz.
- `--path=…` — root WordPressa (gdzie leży `wp-load.php`).
- `>/dev/null 2>&1` — wyrzuca output, żeby cron nie wysyłał maila po każdym
  przebiegu.

**Wariant z logiem** (gdy chcesz podglądać przebiegi importu, linie
`[hajlajty-import] …`) — zamiast wyciszać, przekieruj do pliku:

```cron
* * * * * /usr/bin/php /usr/local/bin/wp cron event run --due-now --path=/home/www/public_html >> /home/www/cron-hajlajty.log 2>&1
```

Pamiętaj wtedy o rotacji tego pliku (logrotate), żeby nie puchł w nieskończoność.

#### Jeśli `wp` to `wp-cli.phar`

Gdy `which wp` pokazuje `.phar` (albo `wp` w ogóle nie ma globalnie), wołaj jawnie
przez php:

```cron
* * * * * /usr/bin/php /ścieżka/do/wp-cli.phar cron event run --due-now --path=/home/www/public_html >/dev/null 2>&1
```

## Weryfikacja po wdrożeniu

1. **WP-Cron wyłączony na requestach** — w „Site Health" nie powinno być już
   ostrzeżeń o zaległym cronie zależnym od ruchu; `DISABLE_WP_CRON` aktywne:
   ```bash
   wp config get DISABLE_WP_CRON --path=/home/www/public_html
   ```
2. **Event istnieje i ma kadencję 1 min**:
   ```bash
   wp cron event list --fields=hook,schedule,next_run_relative --path=/home/www/public_html
   ```
   Szukaj `hajlajty_live_import_tick` / `hajlajty_one_minute`.
3. **Systemowy cron faktycznie bije** — po ~2–3 min `next_run_relative` dla
   eventu nie powinien zalegać (nie rośnie do minut wstecz). Albo dorzuć tymczasowo
   wariant z logiem i sprawdź, że plik `cron-hajlajty.log` przyrasta co minutę.
4. **Okno działa** — w trakcie realnego meczu śledzonej ligi w logu pojawia się
   `cron live-import w oknie: zaktualizowano N, …`; poza oknem brak linii
   `Limit api-football` (zero zapytań do API).

## Częste pułapki

- **„Nic się nie dzieje"** → najpewniej `wp`/`php` nie w PATH crona. Użyj PEŁNYCH
  ścieżek (krok 2). Test ręczny tym samym wpisem: zaloguj się jako user crona i
  wklej całą komendę — musi przejść bez „command not found".
- **Mail od crona po każdym przebiegu** → brakuje `>/dev/null 2>&1` (albo
  przekierowania do logu).
- **Zadanie odpala się 2×** → nie ustawiłeś `DISABLE_WP_CRON` (krok 1), więc bije
  i systemowy cron, i ruch na stronie.
- **Błąd uprawnień / „YIKES! ... as root"** → crontab wpisany rootowi zamiast
  użytkownikowi strony (krok 2).
- **Zła `--path`** → wskaż katalog z `wp-load.php` (root WP), nie katalog wyżej
  ani `wp-content`.

## Granica: co jest kodem, a co ops

- **Kod** (hajlajty-core, PR 3e-iv-a): rejestracja eventu, harmonogram 1 min, gate
  okna, live-import, auto-FT. Działa na WP-Cronie — nie wie i nie musi wiedzieć,
  kto go bije.
- **Ops/deploy** (ten dokument): zapewnienie pewnego bicia co minutę przez
  systemowy cron + wyłączenie WP-Cron na requestach. To konfiguracja serwera,
  robiona raz przy wdrożeniu, poza repo z kodem.
