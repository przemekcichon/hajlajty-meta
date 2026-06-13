# hajlajty.pl — kontekst projektu

Serwis z zapowiedziami, live'ami i skrótami wideo meczów (start: Mundial 2026,
potem piłka klubowa). "Spotify dla skrótów meczowych". Dane meczowe z api-football,
linki do YouTube i kanał dodawane ręcznie.

## Charakter projektu (czytaj najpierw)
Hajlajty to projekt EDUKACYJNY — mini-redakcja sportowa prowadzona przez dzieci
i nastolatków uczących się współpracy z AI. To zmienia kryterium „dobrej" decyzji:
- Rozwiązanie musi być zrozumiałe i obsługiwalne przez początkujących
  redaktorów-nastolatków, nie tylko przez dewelopera.
- Każda funkcja zostawia ścieżkę „najpierw ręcznie, potem z AI" — tryb ręczny
  to nie tymczasowy hack, tylko docelowy sposób nauki.
- Prostota ma DWÓCH adresatów: dewelopera (kod) i młodego redaktora (panel).
  Gdy decyzja jest niejednoznaczna, wybieramy wariant zrozumiały dla redaktora.

## Decyzje architektoniczne (NIE zmieniaj ich bez pytania)
1. WordPress jako baza danych + klasyczny motyw PHP. ŻADNEGO FSE, bloków
   Gutenberga z danymi, Elementora ani Timbera.
2. Podział: plugin `hajlajty-core` (CPT, taksonomie, import z api-football,
   funkcje pomocnicze) + klasyczny motyw (tylko szablony i style).
3. Dane meczowe (oś czasu, składy, statystyki) trzymamy w JEDNYM polu meta
   jako JSON (surowy/przycięty payload z api-football). Bez repeaterów ACF,
   bez rozbijania na dziesiątki pól meta. Szablony robią json_decode i renderują.
4. Publiczne taksonomie (filtry/chipy): drużyna, rozgrywki, sezon, kanał —
   wszystko jako taksonomie WP. Link do YouTube → pole ACF (nie filtrujemy
   po nim). `status_wideo` NIE jest tu taksonomią — patrz decyzja #9.
5. Post content zostaje na ręczne opisy/zapowiedzi, nie na dane.
6. Przyszła migracja do Next.js + WPGraphQL: rejestruj CPT/taksonomie
   z `show_in_graphql => true`, dane mają być czytelne bez parsowania HTML.
7. Permalinki ustalamy raz i na zawsze (przeżyją migrację headless).
8. Prostota > elastyczność. Nie dodawaj abstrakcji "na przyszłość".
9. `status_wideo` NIE jest osobnym polem ani taksonomią — to POCHODNA obecności
   `field_skrot_url` (mecz ma skrót ⟺ pole wypełnione). Wypada z listy
   publicznych taksonomii (zostają: drużyna, rozgrywki, sezon, kanał).
   Filtrowanie „ma wideo" istnieje TYLKO w adminie, w ramach narzędzia Algolii
   (patrz „Wyszukiwanie i filtry").

## Stack
WordPress, ACF PRO, klasyczny motyw PHP, frontend przeniesiony z Claude Design.

## Git workflow (przestrzegaj ZAWSZE)
1. Nigdy nie commituj bezpośrednio do main. Każda faza/zadanie = osobny branch
   o nazwie typu: feature/faza-1-cpt-taksonomie, fix/import-duplikaty.
2. Commity małe i atomowe — jedna logiczna zmiana = jeden commit. Nie łącz
   refaktoru z nową funkcjonalnością w jednym commicie.
3. Format komunikatów: Conventional Commits po angielsku
   (feat:, fix:, refactor:, docs:, chore:). Pierwsza linia max ~70 znaków,
   potem pusta linia i opis: CO zmieniono i DLACZEGO (decyzje, odrzucone
   alternatywy). Komunikat ma być zrozumiały bez czytania diffa.
4. Po pierwszym commicie na branchu utwórz PR przez `gh pr create` (draft).
   Po KAŻDYM kolejnym commicie zaktualizuj opis PR przez `gh pr edit` tak,
   aby zawsze odzwierciedlał aktualny pełny stan brancha: cel, lista zmian,
   decyzje podjęte po drodze, co pozostało do zrobienia (checklista).
5. Przed rozpoczęciem pracy: `git status` i upewnij się, że jesteś na
   właściwym branchu wyciągniętym z aktualnego main.
6. Nie mergujesz PR-ek samodzielnie — merge to zawsze moja decyzja.
7. Nigdy: force push na współdzielone branche, `git add .` bez sprawdzenia
   co wchodzi, commitowanie sekretów (klucz api-football → .env / wp-config,
   plik w .gitignore).
8. Po merge'u PR-a (moja decyzja) — sprzątanie lokalne, stały krok:
   `git checkout main` → `git pull --ff-only` → `git branch -d <branch>`
   (bezpieczny wariant, odmówi jeśli niezmergowany) → `git fetch --prune`.
   Jeśli zdalny branch nie zniknął przy merge'u: `git push origin --delete
   <branch>` i ponowny `git fetch --prune`. Na końcu `git status` ma pokazać
   czysty main zsynchronizowany z origin.

## Wtyczka hajlajty-user (ulubione / obserwowane / powiadomienia)
1. Osobny plugin, niezależny od hajlajty-core i od motywu.
2. Trwała wartość = backend: model danych użytkownika + REST API endpointy
  (z autoryzacją przez nonce). To przeżywa migrację do Next.js.
3. Warstwa frontowa (reakcja na kliknięcie) jest TYMCZASOWA i wymienna.
  Wybór tech: Interactivity API (WP 6.5+, uwaga: nazwa to "Interactivity API",
  NIE "Interactions API") vs minimalny vanilla JS — DO DECYZJI po researchu.
  Domyślnie preferuj prostszą i spójniejszą z klasycznym motywem opcję.
4. Rozważyć: czy "obserwowane" i "powiadomienia" są w MVP, czy w fazie późniejszej.

## Architektura kodu: Vertical Slice (obowiązuje w każdym repo)
Organizujemy kod według FUNKCJI (feature), nie według typów technicznych.
Powód: czytelność dla człowieka i spójny kontekst dla LLM-a — cała jedna
funkcja w jednym miejscu.

ROBIMY TAK:
- Katalog = funkcja/slice, np. features/match-import/, features/favorites/.
  W slice'u leży WSZYSTKO, czego ta funkcja potrzebuje: rejestracja hooków,
  logika, ewentualny REST controller, zapis do bazy, szablony pomocnicze.
- Slice jest właścicielem swoich rzeczy: slice "match" rejestruje własny CPT
  i taksonomie; slice "favorites" jest właścicielem swojej tabeli/meta i
  swoich endpointów REST.

NIE ROBIMY TAK:
- Podziału na katalogi-warstwy typu /hooks, /post-types, /rest, /helpers,
  gdzie jedna funkcja jest rozsmarowana po wielu katalogach.

GRANICE I REALIA WORDPRESSA (przestrzegaj):
- Slice'y żyją WEWNĄTRZ pojedynczego artefaktu (plugin albo motyw).
  hajlajty-core, hajlajty-user i motyw to osobne repozytoria/artefakty —
  to jest granica nadrzędna wobec slice'ów, nie łam jej w imię "czystości".
- Każdy plugin ma cienki bootstrap (główny plik wtyczki), który tylko ładuje
  slice'y. Żadnej logiki biznesowej w bootstrapie.
- Rejestracja CPT/taksonomii/REST i tak musi wisieć na właściwych hookach WP
  (init, rest_api_init) — slice rejestruje swoje rzeczy SAM, na tych hookach.
- Wspólny, naprawdę współdzielony util może istnieć (np. shared/), ale to
  wyjątek — domyślnie kod należy do slice'a. Nie twórz "shared" na zapas.
- Jeśli używamy autoloadingu (composer PSR-4), namespace musi odwzorowywać
  podział na slice'y.

Zasada rozstrzygająca wątpliwość: "czy ten kod zniknie razem z tą funkcją?"
Jeśli tak — należy do jej slice'a. Jeśli służy wszystkim — dopiero wtedy shared.

## Lokalizacja nazw (EN z API → PL) — decyzja
api-football zwraca nazwy po angielsku. NIE budujemy słownika EN→PL po stringach.
- DRUŻYNY (reprezentacje, docelowo kluby): drużyna = term taksonomii "drużyna".
  PL nazwa = nazwa termu. Kod FIFA + api team.id = term meta. Import łączy mecz
  z drużyną po team.id → term (NIGDY po nazwie EN). Roster tworzony raz (seed
  CSV w docs/); EN nazwa to tylko ściągawka przy seedowaniu, nigdzie niezapisywana.
- ROZGRYWKI: analogicznie — term taksonomii "rozgrywki", PL nazwa = nazwa termu,
  league.id = term meta. Garść pozycji — można utworzyć ręcznie w WP admin.
- FAZY/RUNDY (league.round) + małe słowniki strukturalne (status, pozycje
  G/D/M/F): mały stały lookup string→PL w PHP. Jedyne miejsce na dosłowną mapę —
  bo round nie ma stabilnego ID, jest tylko stringiem.
Zasada: encje (drużyna, rozgrywki) tłumaczy się przez resolucję po stabilnym ID
do termu o polskiej nazwie; małe słowniki — przez lookup w kodzie.