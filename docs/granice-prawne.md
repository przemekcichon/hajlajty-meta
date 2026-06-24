# Granice prawne — znaki towarowe klubów, herby, wizerunek zawodników

> ⚠️ **TO NIE JEST OPINIA PRAWNA.** Dokument **roboczy/wewnętrzny** — rejestr granic
> dozwolonego użytku i materiał wyjściowy do rozmowy z prawnikiem. Żadne sformułowanie
> tutaj nie jest wiążącą poradą ani gwarancją legalności. **Decyzje wiążące podejmuje
> prawnik / właściciel** (radca prawny / rzecznik patentowy). Autorzy projektu nie są
> prawnikami. Przed komercyjnym użyciem (faza Monetyzacja) KAŻDĄ kategorię potwierdzić
> z prawnikiem.

## Po co ten dokument

Hajlajty rośnie z reprezentacji (Mundial) ku **piłce klubowej** (Faza 5 — patrz
`plan.md`, `jak-to-dziala.md`). Kluby wnoszą NOWĄ ekspozycję prawną, której dziś (tylko
reprezentacje + flagi państw) praktycznie nie ma:
- **herby / loga klubów** (znak towarowy + prawo autorskie),
- **nazwy klubów** (słowny znak towarowy),
- **zdjęcia / wizerunek zawodników** (wizerunek + prawa fotografa + RODO),
- (pośrednio) **materiały wideo** — choć tu projekt już ma zasadę: linkujemy/embedujemy
  OFICJALNE kanały, nie hostujemy.

Cel: spisać, **co robimy i czego NIE robimy**, na jakiej podstawie, i co wymaga
potwierdzenia prawnika — żeby decyzje nie były przypadkowe i żeby przy monetyzacji nie
wpaść w naruszenie.

## Kontekst projektu (ma wpływ na ocenę)

- Dziś charakter **edukacyjny/informacyjny**, niekomercyjny w warstwie treści (skróty z
  oficjalnych kanałów; redakcja prowadzona przez młodzież). To sprzyja „użytkowi
  informacyjnemu".
- ALE w planie jest faza **Monetyzacja** — komercyjne wykorzystanie **zaostrza** granicę
  (patrz niżej: użytek informacyjny vs komercyjny). Założenie robocze: **projektujemy od
  razu tak, jakby był komercyjny**, żeby nie przebudowywać pod presją.
- Aktualny model danych: reprezentacje używają **flag państw** (flagcdn), NIE herbów.
  Herby/loga to dopiero kluby (Faza 5) — czyli decyzję podejmujemy ZANIM dodamy pierwszy
  klub, nie po fakcie.

---

## Kategorie i robocza ocena ryzyka

| Kategoria | Reżim ochrony | Użytek informacyjny dozwolony? | Ryzyko | Robocza zasada projektu |
|---|---|---|---|---|
| **Flagi państw** | symbole państwowe — co do zasady poza ochroną znaków/praw autorskich | tak | niskie | używamy (flagcdn); OK |
| **Nazwa klubu** (tekst) | słowny znak towarowy | zwykle tak (identyfikacja drużyny) | niskie–średnie | używamy nazwy tekstowo do identyfikacji meczu/drużyny; bez sugestii powiązania |
| **Herb / logo klubu** (grafika) | **podwójna**: znak towarowy + prawo autorskie | bywa — ale granica cienka | **średnie–wysokie** | **DOMYŚLNIE nie używamy grafiki herbu** dopóki prawnik nie potwierdzi; rozważyć neutralne oznaczenie / nazwę tekstową / licencję |
| **Zdjęcia zawodników** | wizerunek (art. 81 pr. aut.) + prawo autorskie fotografa + RODO | wąsko, ryzykownie | **wysokie** | **DOMYŚLNIE nie używamy** dowolnych zdjęć; tylko źródła licencjonowane/oficjalne na ich warunkach, albo rezygnacja |
| **Wideo / skróty** | prawa nadawcy/klubu/ligi + warunki YouTube | embed oficjalnego źródła ≠ re-upload | średnie (mitygowane) | **tylko link/embed oficjalnych kanałów**, nigdy re-upload/hosting (zasada już w projekcie) |

---

## 1. Herby / loga klubów

**Jak chronione (wg artykułu Grant Thornton — źródło niżej):** herb może mieć
**podwójną ochronę** — jednocześnie prawo autorskie (jako projekt graficzny, ochrona
automatyczna od stworzenia) **i** prawo ochronne na znak towarowy (rejestracja w UPRP /
EUIPO).

**Kiedy co do zasady WOLNO (użytek informacyjny / nominatywny):** gdy herb pojawia się
WYŁĄCZNIE po to, by *„rzetelnie poinformować o klubie, który jest bohaterem materiału"*,
a NIE do oznaczania własnych usług/towarów. To bliskie zasadzie użycia nominatywnego
(identyfikacja cudzego znaku, by wskazać, o kim mowa) — dopuszczalne, jeśli zgodne z
uczciwymi praktykami i nie sugeruje powiązania/sponsoringu.

**Kiedy NIE WOLNO / ryzyko:**
- **komercyjne wykorzystanie** (gadżety, koszulki, grafiki promujące wydarzenie,
  reklama) — *„Zgoda właściciela herbu jest przede wszystkim potrzebna, gdy następuje
  komercyjne wykorzystanie emblematu"*;
- **funkcja znaku** — gdy herb użyty tak, że może pełnić funkcję oznaczenia (np. na
  grafice promo), wciąż może być potrzebna zgoda;
- **wprowadzanie w błąd** co do właściciela znaku / źródła usług.
- **Konsekwencje:** żądanie zaprzestania + usunięcia skutków, odszkodowanie, wydanie
  bezpodstawnych korzyści, roszczenia z czynu nieuczciwej konkurencji.

**Robocza zasada projektu:** dopóki prawnik nie potwierdzi konkretnego scenariusza —
**nie umieszczamy grafiki herbu** jako elementu UI/brandu. Drużynę identyfikujemy
**nazwą tekstową** (i ewentualnie neutralnym placeholderem). Herb tylko gdyby był
ewidentnie informacyjny i potwierdzony, albo na podstawie licencji/porozumienia (art.
wskazuje praktykę porozumień, np. Wisła Kraków).

## 2. Nazwy klubów

Nazwa (słowny znak towarowy) użyta **informacyjnie**, do identyfikacji drużyny w meczu/
skrócie, jest co do zasady mniej ryzykowna niż grafika herbu — to klasyczny użytek
nominatywny. **Zasada:** używamy nazwy tekstowo; nie stylizujemy jej na logo klubu, nie
sugerujemy oficjalnego powiązania/partnerstwa.

## 3. Zdjęcia / wizerunek zawodników

**Najwyższe ryzyko — trzy nakładające się reżimy:**
1. **Wizerunek** (art. 81 ustawy o prawie autorskim): rozpowszechnianie wizurnku co do
   zasady wymaga zgody. Wyjątki (m.in. osoba powszechnie znana w związku z pełnieniem
   funkcji publicznych/zawodowych; osoba jako szczegół większej całości) **istnieją, ale
   są wąskie i ocenne** — nie zakładać ich automatycznie.
2. **Prawo autorskie fotografa**: samo zdjęcie to odrębny utwór — potrzebna licencja/
   zgoda autora/agencji, niezależnie od wizerunku.
3. **RODO**: wizerunek to dane osobowe — podstawa przetwarzania, obowiązki informacyjne.

**Robocza zasada projektu:** **domyślnie NIE używamy** dowolnych zdjęć zawodników.
Jeśli zdjęcia będą potrzebne (np. profile klubowe) — wyłącznie ze źródeł
**licencjonowanych** (agencja fotograficzna, materiały prasowe na ich warunkach,
zasoby na licencji wprost dopuszczającej taki użytek) ALBO rezygnujemy. Decyzja i model
licencyjny — do prawnika przed wdrożeniem.

## 4. Materiały wideo / skróty

Reżim inny niż znaki: prawa nadawcy/ligi/klubu + warunki platformy (YouTube). Projekt
**już** stosuje bezpieczniejszą ścieżkę: **link/embed do OFICJALNYCH kanałów**, bez
re-uploadu i bez hostowania treści u siebie. **Zasada do utrzymania:** żadnego pobierania/
ponownego wgrywania; tylko oficjalne źródła; respektować warunki osadzania YouTube.

---

## Podstawy prawne (do potwierdzenia z prawnikiem — NIE wyczerpujące)

- **Ustawa o prawie autorskim i prawach pokrewnych** — m.in. ochrona utworu graficznego
  (herb); **art. 81** (wizerunek); **art. 29** (prawo cytatu); dozwolony użytek.
- **Prawo własności przemysłowej** — znaki towarowe (rejestracja UPRP); zakres ochrony i
  granice (użycie informacyjne/opisowe/nominatywne).
- **Rozporządzenie UE o znaku towarowym (EUTMR)** — m.in. ograniczenia skutków znaku
  (użycie wskazujące/odniesieniowe zgodne z uczciwymi praktykami); EUIPO.
- **Ustawa o zwalczaniu nieuczciwej konkurencji** — wprowadzanie w błąd, pasożytnictwo.
- **RODO** — wizerunek jako dane osobowe.

## Źródła

- Grant Thornton, *„Herb klubu piłkarskiego – kiedy wolno z niego korzystać?"* —
  https://grantthornton.pl/publikacja/herb-klubu-pilkarskiego-kiedy-wolno-z-niego-korzystac/
  (podwójna ochrona herbu; użytek informacyjny vs komercyjny; ryzyka i konsekwencje;
  rekomendacje dla klubów).
- *(dopisywać kolejne: orzecznictwo, stanowiska UPRP/EUIPO, regulaminy lig, warunki YT.)*

## Otwarte pytania do prawnika (lista robocza)

1. Czy informacyjne pokazanie **grafiki herbu** klubu w karcie meczu/profilu (bez promo,
   bez sugestii powiązania) mieści się w dozwolonym użyciu — przy charakterze
   **komercyjnym** serwisu (Monetyzacja)? Jeśli granicznie — jakie warunki muszą być
   spełnione (rozmiar, kontekst, brak funkcji znaku)?
2. **Nazwa klubu** tekstowo — czy bezpieczna bez ograniczeń, czy są wyjątki (np. ligi/
   znaki szczególnie egzekwowane)?
3. **Zdjęcia zawodników** — jaki model jest dopuszczalny (agencja? licencja CC-jaka?
   materiały prasowe?) i jak spełnić RODO (podstawa, obowiązek informacyjny)?
4. **Embed YouTube** — czy obecny model (link/embed oficjalnych kanałów) jest
   wystarczający, czy potrzebne dodatkowe zgody/oznaczenia źródła?
5. Czy **różnicować** podejście reprezentacje vs kluby (federacje vs kluby — inni
   właściciele praw, inne ryzyko egzekwowania)?
6. Jak udokumentować **politykę reagowania** na żądania właścicieli praw (takedown).

## Log decyzji (uzupełniać po konsultacjach)

| Data | Kategoria | Decyzja | Podstawa / kto potwierdził |
|---|---|---|---|
| 2026-06 | wideo | tylko embed oficjalnych kanałów, bez re-uploadu | zasada projektowa (#9/#10), do potwierdzenia prawnika |
| 2026-06 | herby klubów | domyślnie BEZ grafiki herbu do czasu opinii prawnej | robocza, ten dokument |
| 2026-06 | zdjęcia zawodników | domyślnie NIE używamy (tylko licencjonowane/oficjalne) | robocza, ten dokument |
