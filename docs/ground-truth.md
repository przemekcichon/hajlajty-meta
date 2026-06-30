# Ground-truth — kontrakt na start fazy/poprawki (prompt roboczy)

Ten plik opisuje **proces ground-truth** i gotowy prompt do niego. To NIE są
decyzje architektoniczne (te mieszkają w `CLAUDE.md`) — to **proces pracy**:
szablon, który stosujesz na start realizacji punktu planu, żeby nie odtwarzać go
z pamięci za każdym razem. (Gdyby z czasem doszły inne powtarzalne prompty, ten
plik może urosnąć w ich zbiór.)

**Zasada przewodnia:** źródłem prawdy jest **kod na dysku**, nie pamięć czatu ani
plan. Każda faza/poprawka zaczyna się od zderzenia tego, co zamierzamy zrobić, z
tym, co realnie jest w repo — zanim cokolwiek napiszemy.

---

## Prompt: Ground-truth kontrakt na start fazy

Każda faza, która konsumuje dane/struktury wyprodukowane przez wcześniejszą fazę
(np. render czyta to, co zapisał import), zaczyna się od inwentaryzacji „jak
jest naprawdę". Cel: **dokładne identyfikatory i kształt danych skopiowane z
realnego kodu**, żeby nowy kod czytał dokładnie to, co stary zapisał — nie to,
co wydaje nam się, że zapisał.

Szablon poniżej. Część **STAŁA** zostaje bez zmian w każdej fazie; część
**ZMIENNĄ** (placeholdery `{...}`) wypełniasz pod konkretną fazę.

### Część STAŁA (kopiuj dosłownie)

> Zadanie TYLKO DO ODCZYTU — nie zmieniaj plików, nie rób brancha, nie commituj.
>
> Zanim zacznę {FAZA}, potrzebuję „ground-truth kontraktu" — DOKŁADNE
> identyfikatory i kształt danych skopiowane z realnego kodu (nie z pamięci, nie
> z planu). {KONSUMENT} musi czytać dokładnie to, co {PRODUCENT} zapisał.
>
> Wymagania na odpowiedź:
> - Każdy identyfikator (klucz, nazwa pola, slug, meta_key, nazwa funkcji) jako
>   LITERAŁ w backtickach — przepisany z kodu, nie z pamięci.
> - Kształt danych jako skomentowany przykładowy JSON (skrócone tablice OK) —
>   to kontrakt dla konsumenta.
> - Zaznacz, KTÓRE pola/sekcje są opcjonalne (mogą nie istnieć / być null) i
>   przy jakim warunku — to najczęstsze źródło błędów w renderze.
> - Wypisz sygnatury reużywalnych helperów z wcześniejszych faz.
> - Sprawdź i podaj wprost: czy istnieje JUŻ jakikolwiek kod robiący to, co ma
>   robić ta faza (Tak/Nie + gdzie).
> - BEZ propozycji zmian — czysty zrzut stanu faktycznego. Czytaj kod, nie pamięć.

### Część ZMIENNA (wypełnij pod fazę)

Doprecyzuj, co dokładnie inwentaryzujemy w tej fazie:

- `{FAZA}` — nazwa/numer fazy, np. „Fazę 3 (render)".
- `{PRODUCENT}` / `{KONSUMENT}` — kto zapisał dane, kto je teraz czyta
  (np. „import" → „szablony motywu").
- `{CO INWENTARYZUJEMY}` — lista konkretnych slice'ów / plików / struktur do
  przeczytania i opisania, np.:
  - kształt struktury danych (pełne zagnieżdżenia + typy wartości),
  - meta keys / rejestracje (dokładne nazwy + typy),
  - pola ACF (nazwy + sposób odczytu),
  - taksonomie (slugi + term meta + funkcje WP do pobrania),
  - helpery do reużycia (sygnatury),
  - istniejący kod robiący tę funkcję (tak/nie/gdzie).

---

### Przykład wypełnienia

- **Faza 2 (import):** ground-truth dotyczył kształtu, jaki `transform.php` ma
  wyprodukować dla `match_data` — kontrakt między mapowaniem API a zapisem do
  meta. `{PRODUCENT}` = api-football, `{KONSUMENT}` = `transform.php` + zapis meta.
- **Faza 3 (render):** ground-truth dotyczył dokładnego kształtu `match_data`,
  meta keys, pól ACF i taksonomii, jakie realnie produkuje import — żeby szablony
  motywu czytały dokładnie to, co import zapisał. `{PRODUCENT}` = slice importu,
  `{KONSUMENT}` = szablony renderujące.
