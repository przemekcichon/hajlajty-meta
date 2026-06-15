# Inwentaryzacja danych — Hajlajty 2.0

Źródło: analiza 21 plików HTML z katalogu `design/` (2026-06-12).  
Format: każdy wiersz = jeden atrybut danych; kolumna "Filtrowanie" = "TAK" jeśli istnieje UI do filtrowania/sortowania po tym polu.

**Skróty widoków:**
| Symbol | Widok |
|--------|-------|
| SG | Strona Główna |
| SK | Skróty (lista skrótów wideo) |
| SM | Skrót Meczu (pojedynczy) |
| NZ | Na Żywo (lista) |
| ML | Mecz na Żywo (pojedynczy) |
| ZL | Zapowiedzi (lista) |
| ZM | Zapowiedź Meczu (pojedynczy) |
| TT | Terminarz Turnieju |
| TG | Tabele Grup |
| REP | Reprezentacje (lista krajów) |
| PB | Profil Belgii (profil kraju/drużyny) |
| TH | Twoje Hajlajty (feed użytkownika) |
| UL | Ulubione |
| OB | Obserwowane |
| MK | Moje Konto |
| US | Ustawienia |
| BL | Bramka Logowania |
| PR | Panel Redaktora |
| PuR | Pulpit Redaktora |

---

## 1. Dane meczu — tożsamość

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Nazwa drużyny — gospodarz (pełna, po polsku) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | TAK (chip/dropdown) | Np. "Polska", "Brazylia" |
| Nazwa drużyny — gość (pełna, po polsku) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | TAK (chip/dropdown) | |
| Kod kraju — gospodarz (3-literowy) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | TAK (data-team) | ISO 3-literowy: POL, BRA, ARG... |
| Kod kraju — gość (3-literowy) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | TAK (data-team) | |
| Flaga/herb — gospodarz | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PB, PR, PuR | NIE | flagcdn.com, h=18–30px |
| Flaga/herb — gość | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | NIE | |
| Slug/ID meczu | SG, SK, SM, TH, UL | NIE | Format: "skrot-FRA-CRO"; data-card-id |

---

## 2. Dane meczu — wynik i status

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Wynik — bramki gospodarza | SG, SK, SM, NZ, ML, ZL, TT, TH, UL, PR, PuR | NIE | |
| Wynik — bramki gościa | SG, SK, SM, NZ, ML, ZL, TT, TH, UL, PR, PuR | NIE | |
| Status meczu | SG, SK, SM, NZ, ML, ZL, ZM, TT, TH, UL, PR, PuR | TAK (PuR: "Z wideo"/"Bez wideo") | Enum: ZAKOŃCZONY / LIVE / ZAPOWIEDŹ; DO USTALENIA czy "ODWOŁANY" |
| Minuta meczu (live) | SG, NZ, ML | NIE | Np. "67'"; tylko dla statusu LIVE |

---

## 3. Dane meczu — metadane czasowe i kontekst

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Data i godzina kickoffu (ISO 8601) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TH, UL, PR, PuR | TAK (sortowanie po dacie) | Wyświetlane jako "Dziś · czwartek, 11 czerwca", "14:00" |
| Nazwa rozgrywek (turniej/liga) | SG, SK, SM, NZ, ML, ZL, ZM, TT, TG, TH, UL, PR, PuR | TAK (dropdown) | Np. "Mundial 2026", "Ekstraklasa", "Liga Narodów" |
| Sezon | SK, TT, PR, PuR | TAK (dropdown) | Np. "2026", "2025/26" |
| Faza / etap rozgrywek | SG, TT, TG, ZM | NIE | Np. "Faza grupowa", "Grupa C" |

---

## 4. Dane live — wydarzenia meczowe

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Minuta eventu | ML | NIE | Np. "23'", "51'" |
| Typ eventu | ML | NIE | Enum: bramka ⚽ / żółta kartka 🟨 / czerwona kartka 🟥 / zmiana ↔ |
| Imię i nazwisko — główny zawodnik eventu | ML | NIE | Strzelec, kartkowany, schodzący |
| Imię i nazwisko — zawodnik pomocniczy | ML | NIE | Asystent przy bramce; DO USTALENIA czy zawsze obecny |

---

## 5. Dane live — statystyki

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Posiadanie piłki (%) | ML | NIE | Osobno dla każdej drużyny |
| Strzały (łącznie) | ML | NIE | |
| Strzały celne | ML | NIE | |
| Faule | ML | NIE | |
| Rzuty rożne | ML | NIE | |
| Żółte kartki (łączna liczba) | ML | NIE | |
| Czerwone kartki (łączna liczba) | ML | NIE | |
| Podania (łącznie / celność %) | ML | NIE | DO USTALENIA, widoczne w designie jako placeholder |

---

## 6. Składy

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Numer zawodnika (koszulka) | ML, ZM | NIE | |
| Imię i nazwisko zawodnika | ML, ZM | NIE | |
| Pozycja zawodnika | ML, ZM | NIE | Skróty: Br / O / P / N — DO USTALENIA pełna lista |
| Czy w pierwszym składzie / rezerwowy | ML, ZM | NIE | Diagram boiska vs. ławka |
| Status nieobecności | ML, ZM | NIE | Enum: Kontuzja / Zawieszenie; DO USTALENIA inne |
| Eventy zawodnika w meczu (bramka/kartka/zmiana) | ML | NIE | Ikona na karcie zawodnika |
| Minuta zmiany | ML | NIE | Przy zawodniku na ławce lub wchodzącym |

---

## 7. Dane wideo / skrótu

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| URL YouTube (lub Video ID) | SM, SG, SK, TH, UL, PR, PuR | NIE | ACF: `field_skrot_url`; obsługa watch/youtu.be/embed |
| Czas trwania wideo | SG, SK, SM, TH, UL | NIE | Format MM:SS, np. "9:24" |
| Kanał / nadawca | SG, SK, SM, TH, UL, PR, PuR | TAK (taksonomia) | **Taksonomia `kanal`** (CLAUDE.md #4, jedna z 4 publicznych taksonomii — jak `druzyna`/`rozgrywki`/`sezon`). NIE pole ACF: `field_skrot_channel` NIE istnieje i nie ma powstać. Render czyta przez `get_the_terms($post_id, 'kanal')`, nie `get_field`. Przypisanie kanału = redakcyjne (term zaznaczany przy meczu), NIE z importu (Faza 2). |
| Data/czas publikacji wideo | SG, SK, SM, TH, UL | NIE | Wyświetlana relatywnie: "2 godz. temu", "wczoraj" |

---

## 8. Dane odliczania (Zapowiedź Meczu)

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Pozostałe dni do meczu | ZM | NIE | Wyliczane z daty kickoffu |
| Pozostałe godziny | ZM | NIE | |
| Pozostałe minuty | ZM | NIE | |
| Pozostałe sekundy | ZM | NIE | |

---

## 9. Tabele grupowe

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Pozycja w tabeli | TG, PB | NIE | Numer porządkowy |
| Flaga + nazwa kraju | TG | TAK (zakładki grup) | |
| Punkty | TG, PB | NIE | "pkt" |
| Mecze rozegrane | TG | NIE | |
| Wygrane | TG | NIE | |
| Remisy | TG | NIE | |
| Przegrane | TG | NIE | |
| Bramki zdobyte | TG | NIE | |
| Bramki stracone | TG | NIE | |
| Różnica bramek | TG | NIE | DO USTALENIA czy kolumna jest w designie wprost czy wyliczana |
| Oznaczenie grupy | TG, ZM, TT | TAK (zakładki: A–H) | DO USTALENIA ile grup (Mundial 2026 ma 12 grup?) |

---

## 10. Profil drużyny / reprezentacji

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Nazwa kraju (pełna) | REP, PB | TAK (wybór na liście REP) | |
| Flaga / herb | REP, PB | NIE | |
| Kod FIFA (3-literowy) | REP, PB | NIE | |
| Ostatnie mecze drużyny | PB | NIE | Lista meczów z wynikami |
| Bieżące wyniki/forma | PB | NIE | DO USTALENIA szczegóły pól |

---

## 11. Dane użytkownika — konto

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| E-mail | BL, MK | NIE | Login + wyświetlany w profilu |
| Hasło | BL, MK | NIE | Maskowane, z toggle show/hide |
| Nazwa użytkownika / ksywka | MK | NIE | |
| Imię | MK | NIE | |
| Nazwisko | MK | NIE | |

---

## 12. Preferencje użytkownika

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Motyw (ciemny/jasny) | US, (globalny) | NIE | localStorage: "hajlajty:theme"; wartości: "dark"/"light" |
| Rozmiar czcionki | US | NIE | DO USTALENIA — widoczny suwak/opcje bez jasnych wartości |
| Język interfejsu | US | NIE | DO USTALENIA — polski domyślny, brak innych opcji w designie |

---

## 13. Dane relacyjne użytkownika

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Obserwowane drużyny (lista) | OB, TH, SG, SK, NZ, ZL | TAK (toggle "Obserwowane" we wszystkich listach) | data-card-bell / `aria-pressed`; globalny filtr "pokaż tylko obserwowane" |
| Ulubione skróty (lista) | UL, SG, SK, TH | NIE (widok UL filtruje z definicji) | data-card-fav; serce |
| Zapisane / przypomnienia | ZM, ZL | NIE | data-card-bell na zapowiedziach; DO USTALENIA różnica między "ulubione" a "zapisane" |

---

## 14. Dane redaktorskie (CMS)

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Status publikacji wideo | PuR | TAK ("Z wideo" / "Bez wideo") | Pole boolowskie pochodne od field_skrot_url |
| Inline edit: URL YouTube | PuR | NIE | Edytowalne bezpośrednio w wierszu listy |
| Inline edit: Kanał | PuR | NIE | Dropdown w wierszu listy |
| Rola użytkownika (editor/admin) | PR, PuR, MK | TAK (widoczność panelu) | CSS class: `.is-admin`; menu: `.user-menu__item--editor` |

---

## 15. Stan aplikacji (nie-persistentne)

| Pole | Widoki | Filtrowanie | Uwagi |
|------|--------|-------------|-------|
| Stan auth: zalogowany/wylogowany | wszystkie | NIE | `data-auth="in"/"out"` na `<html>` |
| Aktywny motyw | wszystkie | NIE | `data-theme="dark"/"light"` na `<html>` |
| Aktywny ekran (login) | BL | NIE | `data-screen="signin"` |
| Bieżąca strona paginacji | PuR | NIE | Tylko w Pulpicie Redaktora |

---

## Pytania DO USTALENIA

1. **Status meczu "ODWOŁANY"** — czy mecz może być odwołany/przełożony? Jeśli tak, czy to osobny status enum?

ODPOWIEDŹ: Możemy wprowadzić status "ODWOŁANY". Przełożony to raczej "ZAPOWIEDŹ" z nową datą, ale odwołany to osobny stan. W designie nie ma tego uwzględnionego, więc trzeba będzie dodać ikonę/oznaczenie dla odwołanych meczów. Tutaj link do dokumentacji API football, gdzie jest pole "status" z wartościami enum: https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures. Mapowanie powinno być takie:

Scheduled → ZAPOWIEDŹ
In Play → LIVE
Finished → ZAKOŃCZONY
Postponed → ZAPOWIEDŹ (z nową datą)
Cancelled → ODWOŁANY
Abandoned → ODWOŁANY
Not Played → ODWOŁANY

2. **Asystent przy bramce** — czy pole "asystent" eventu jest zawsze obecne w danych z api-football i czy wyświetlamy je w UI?

ODPOWIEDŹ: Pole "assist" w API football jest opcjonalne i może być null, jeśli nie ma asysty przy bramce. W UI możemy wyświetlać asystenta tylko wtedy, gdy pole jest obecne i nie jest null. Jeśli pole jest null, po prostu nie pokazujemy informacji o asyście dla tego eventu.

Można podejrzeć w pliczku @docs/api-samples/fixture-events.json. Jest jeden goll i jest asysta, więc pole jest obecne. Ale trzeba będzie obsłużyć przypadek, gdy asysty nie ma (null) i wtedy nie wyświetlać tej informacji.

3. **Pozycje zawodników** — jakie są pełne skróty/nazwy? Design pokazuje Br/O/P/N — czy to wystarczy, czy potrzebujemy bardziej szczegółowych pozycji (np. lewoskrzydłowy)?

ODPOWIEDŹ: W pliku @docs/api-samples/fixture-lineups.json widać, że pozycje zawodników nie są szczegółowe. Mamy: G -> Goalkeeper, D -> Defender, M -> Midfielder, F -> Forward. Więc skróty Br/O/P/N w designie są po prostu tłumaczeniem tych pozycji na polski: Br (Bramkarz), O (Obrońca), P (Pomocnik), N (Napastnik). Możemy na tym poprzestać, skoro API nie dostarcza bardziej szczegółowych pozycji. Jeśli w przyszłości pojawią się bardziej szczegółowe dane, możemy wtedy rozważyć aktualizację skrótów.

4. **Statystyki meczu** — "Podania / celność %" widoczne w designie jako placeholder — czy na pewno je wyświetlamy z api-football? Jakie dokładnie pola z API mają być widoczne?

ODPOWIEDŹ: Poniżej tablica z polami statystyk z API football, które możemy wyświetlić (wartości przykładowe z pliku @docs/api-samples/fixture-statistics.json):
statistics: [{
            type: "Shots on Goal"
            value: 1
        } {
            type: "Shots off Goal"
            value: 3
        } {
            type: "Total Shots"
            value: 7
        } {
            type: "Blocked Shots"
            value: 3
        } {
            type: "Shots insidebox"
            value: 6
        } {
            type: "Shots outsidebox"
            value: 1
        } {
            type: "Fouls"
            value: 4
        } {
            type: "Corner Kicks"
            value: 9
        } {
            type: "Offsides"
            value: 1
        } {
            type: "Ball Possession"
            value: "66%"
        } {
            type: "Yellow Cards"
            value: 1
        } {
            type: "Red Cards"
            value: null
        } {
            type: "Goalkeeper Saves"
            value: 2
        } {
            type: "Total passes"
            value: 249
        } {
            type: "Passes accurate"
            value: 186
        } {
            type: "Passes %"
            value: "75%"
        } {
            type: "expected_goals"
            value: "0.57"
        } {
            type: "goals_prevented"
            value: "0.10"
        }]

W designie mamy tego mniej ale możemy wziąć wszystkie tylko przetłumaczone na polski i wyświetlić te, które są dostępne. Kluczowe to "Total passes", "Passes accurate" i "Passes %" dla podania/celność. Możemy też rozważyć dodanie innych statystyk, jeśli są istotne i mieszczą się w UI.

5. **Różnica bramek w tabeli** — czy kolumna "różnica bramek" ma być osobną kolumną w TG czy wyliczaną wyłącznie po stronie PHP?

ODPOWIEDŹ: Szczerze to ja nie widzę gdzie to zostało użyte. W designie w tabeli grupowej mam kolumny: Mecze (M), Zwycięstwa (Z), Remisy (R), Porażki (P), i coś to mam skrót BR. i wskazanie jest np 7:2 co pierwsze zakładam że to bramki zdobyte a drugie stracone. Więc nie widzę pozycji różnica bramek. 

6. **Oznaczenie grup (liczba)** — Mundial 2026 ma 12 grup (A–L), nie 8 (A–H) jak w designie. Czy design jest uproszczony, czy ograniczamy się do 8 grup?

ODPOWIEDŹ: Design jest uproszczony, ale musimy uwzględnić 12 grup. Oznaczenie grup będzie literowe od A do L. 

7. **Rozmiar czcionki w Ustawieniach** — suwak bez oznaczonych wartości. Jakie wartości? (np. 14px/16px/18px?)

ODPOWIEDŹ: Tak 14px, 16px, 18px to rozsądne wartości. 

8. **Język interfejsu** — czy planujemy wielojęzyczność od startu, czy tylko PL?

ODPOWIEDŹ: Tylko polski od startu, być może dodamy potem ukraiński, ale na pewno nie od razu.

9. **"Zapisane" vs "Ulubione"** — design ma zarówno ikony serca (ulubione) jak i dzwonka (przypomnienia), ale widok "Ulubione" wydaje się zawierać tylko serca. Czy "Zapisane" to osobna kolekcja, czy to tożsame?

ODPOWIEDŹ: Nie ma zapisanych. Jeśli gdzieś się ostały w designie to przez pomyłkę. Mamy tylko "Ulubione" z sercem. Dzwonek jest tylko do zapowiedzi i to jest przypomnienie, ale nie ma osobnego widoku "Zapisane". Więc "Zapisane" to po prostu przypomnienia na zapowiedziach, a "Ulubione" to skróty wideo. Są też obserwowane drużyny, ale to osobna kategoria.

10. **Forma drużyny / Profil kraju** — widok `Profil Belgia` pokazuje "bieżące wyniki" i "formę" — jakie konkretnie pola? Ostatnie N meczów z wynikami? Wskaźnik formy (litery: W/D/L)?

ODPOWIEDŹ: Ja widzę w profilu kraju Zapowiedzi nadchodzących meczów, ostatnie wyniki w postaci skrótów z mininonych meczów, kadrę, tabelę grupową i statystyki drużyny a w nich Średnia goli na mecz, posiadanie piłki, czyste konta, kartki (żółte). Szczerze to te statystyki drużyny to wymysł AI. Sprawdź pliczek @docs/api-samples/team-statistics.jsonl i zobacz jakie dane są tam dostępne. Możemy wyświetlić te, które są istotne i mieszczą się w UI. Formę drużyny możemy odpuścić. Po prostu pokażemy statystyki z danych rozgrywek, które są dostępne w API football. Zaproponuj coś. 

11. **Paginacja Pulpitu Redaktora** — ile wyników na stronę? Czy jest wyszukiwarka tekstowa (nie tylko filtry)?

ODPOWIEDŹ: Tylko filtry, bez wyszukiwarki. Wyników na stronę może być 10 lub 20, zależy jak dużo danych jest w bazie. Możemy zacząć od 10 i potem dostosować w zależności od potrzeb.

12. **Kanały nadawców** — lista w designie jest stała (5 pozycji). Czy to taksonomia (elastyczna) czy stałe pole ACF select? Czy spodziewamy się nowych kanałów w przyszłości?

ODPOWIEDŹ: Jak najbardziej spodziewamy się nowych kanałów, więc najlepiej zrobić to jako taksonomię w WordPressie. W ten sposób redaktorzy będą mogli dodawać nowe kanały bez potrzeby aktualizacji kodu. W designie możemy mieć dropdown z istniejącymi kanałami, ale backend powinien być elastyczny.
