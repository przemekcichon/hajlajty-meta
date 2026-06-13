/* ============================================================
   HAJLAJTY — components/chip-follow.js
   ------------------------------------------------------------
   SYNCHRONIZACJA STANU OBSERWOWANIA → WSKAŹNIKI NA CHIPSACH.

   Jedno źródło prawdy: localStorage "hajlajty:follows" (ten sam
   klucz, którym posługują się wszystkie strony serwisu). Moduł:

     • na starcie nadaje .is-followed + data-followed="true"
       KAŻDEMU chipsowi [data-team] obserwowanej reprezentacji
       (pasek .chips-scroll ORAZ klony w mobilnym modalu);
     • działa w OBIE strony: każda interakcja zmieniająca stan
       obserwowania (oko na karcie drużyny, profil reprezentacji,
       chips w trybie „Obserwowane”, oko w wyszukiwarce) kończy się
       ponowną synchronizacją — odznaczenie natychmiast gasi ikonę;
     • nasłuchuje zdarzenia "storage" — zmiana w innej karcie
       przeglądarki też aktualizuje wskaźniki.

   Wzorzec deklaratywny (WP Interactivity API ready): JS dotyka
   wyłącznie klasy/atrybutu stanu; wygląd wynika z CSS
   (components/chip-follow.css). Docelowe mapowanie:
       data-followed → data-wp-class--is-followed="state.isFollowed"

   API publiczne: window.HajlajtyChipFollow.sync()
============================================================ */
(function () {
  "use strict";
  if (window.HajlajtyChipFollow) return;        // guard: jeden init

  var KEY = "hajlajty:follows";
  /* Domyślny zestaw obserwowanych przy braku zapisu — identyczny
     z logiką stron (Strona Główna, kategorie, Terminarz…). */
  var DEFAULTS = ["POL", "BRA", "ARG", "ESP"];

  function readObserved() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw !== null) return new Set(JSON.parse(raw));
    } catch (e) {}
    return new Set(DEFAULTS);
  }

  /* ---------- render: store → DOM (deklaratywnie, bez innych skutków) ---------- */
  function sync() {
    var observed = readObserved();
    var chips = document.querySelectorAll(".chip[data-team]");
    Array.prototype.forEach.call(chips, function (chip) {
      var on = observed.has(chip.getAttribute("data-team"));
      chip.classList.toggle("is-followed", on);
      if (on) chip.setAttribute("data-followed", "true");
      else chip.removeAttribute("data-followed");
    });
  }

  /* ---------- triggery ponownej synchronizacji ----------
     Delegacja na dokumencie (faza bubble, po handlerach stron):
     każdy klik mogący zmienić stan obserwowania → sync po
     domknięciu bieżącego cyklu zdarzeń. */
  var RESYNC_SELECTOR = [
    ".chip[data-team]",                  // chips (tryb „Obserwowane” kuruje listę)
    "[data-action='toggle-observed']",   // oko w wyszukiwarce (nagłówek + modal)
    "[data-action='toggle-observe']",    // oko na karcie drużyny
    ".team-fav",                         // serce/oko kart reprezentacji
    "[data-follow]",                     // przycisk „Obserwuj” na stronie profilu
    "[data-action='apply-search']",      // zatwierdzenie modalu (commit stanu)
    "[data-action='close-search']"       // anulowanie modalu (rollback stanu)
  ].join(",");

  document.addEventListener("click", function (e) {
    if (!e.target.closest(RESYNC_SELECTOR)) return;
    setTimeout(sync, 0);
  });

  /* Inna karta przeglądarki zmieniła obserwowane → odśwież wskaźniki */
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) sync();
  });

  /* ---------- start (skrypty stron już sklonowały chipsy do modalu) ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  window.HajlajtyChipFollow = { sync: sync };
})();
