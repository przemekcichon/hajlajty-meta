/* ============================================================
   HAJLAJTY — components/chips-drag.js
   ------------------------------------------------------------
   DRAG-TO-SCROLL dla paska chipsów (.chips-scroll) na desktopie:
   „chwyć" pasek myszką i przesuń w lewo/prawo — jak gestem na
   urządzeniu dotykowym.

   • Czysty Vanilla JS, zero zależności. Moduł nie dotyka stanu
     aplikacji (filtry/obserwowane) — operuje WYŁĄCZNIE na
     scrollLeft kontenera, więc nie gryzie się z logiką stron
     ani z przyszłymi dyrektywami WP Interactivity API.
   • ZABEZPIECZENIE PRZED PRZYPADKOWYM KLIKIEM: jeśli wskaźnik
     przesunął się > 6px, kończące przeciąganie kliknięcie w chipsa
     jest tłumione (capture phase), więc filtr się nie przełączy.
   • Ładowanie warunkowe: skrypt podpinają tylko strony z paskiem
     chipsów; przy braku .chips-scroll moduł kończy bez efektów.

   API publiczne: window.HajlajtyChipsDrag.wire(element)
============================================================ */
(function () {
  "use strict";
  if (window.HajlajtyChipsDrag) return;        // guard: jeden init

  var DRAG_THRESHOLD = 6;                       // px — poniżej to klik, nie drag

  /* Kursory grab/grabbing — wstrzykiwane przez moduł (samowystarczalność) */
  var css = document.createElement("style");
  css.textContent =
    ".chips-scroll{cursor:grab;}" +
    ".chips-scroll.is-grabbing{cursor:grabbing;user-select:none;scroll-behavior:auto;}" +
    ".chips-scroll.is-grabbing .chip{pointer-events:none;}"; /* hover-stany nie migają w trakcie dragu */
  document.head.appendChild(css);

  function wire(el) {
    if (!el || el.__chipsDragWired) return;     // idempotentne
    el.__chipsDragWired = true;

    var isDown = false;                          // przycisk wciśnięty
    var dragged = false;                         // przekroczono próg → to drag
    var startX = 0;                              // pozycja startowa wskaźnika
    var startScroll = 0;                         // scrollLeft w chwili startu

    el.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;                // tylko lewy przycisk
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScroll = el.scrollLeft;
    });

    el.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      var dx = e.pageX - startX;
      if (!dragged && Math.abs(dx) > DRAG_THRESHOLD) {
        dragged = true;
        el.classList.add("is-grabbing");
      }
      if (dragged) {
        e.preventDefault();                      // nie zaznaczaj tekstu w trakcie
        el.scrollLeft = startScroll - dx;        // pasek „klei się" do kursora
      }
    });

    function endDrag() {
      if (!isDown) return;
      isDown = false;
      el.classList.remove("is-grabbing");
      /* dragged zostaje true do nadchodzącego click — tłumimy go niżej,
         a flagę czyścimy w następnej klatce (gdy click nie nadejdzie,
         np. mouseup poza paskiem). */
      if (dragged) setTimeout(function () { dragged = false; }, 0);
    }
    el.addEventListener("mouseup", endDrag);
    el.addEventListener("mouseleave", endDrag);

    /* Po przeciąganiu NIE aktywuj chipsa (capture: przed handlerami stron) */
    el.addEventListener("click", function (e) {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    }, true);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".chips-scroll"), wire);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.HajlajtyChipsDrag = { wire: wire };
})();
