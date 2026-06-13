/* ============================================================
   HAJLAJTY — components/editor-form.js
   ------------------------------------------------------------
   LOGIKA: formularz redaktora + searchable select (.csel).

   • Vanilla JS, delegacja zdarzeń w obrębie komponentu — plik
     ładowany warunkowo tylko tam, gdzie formularz występuje.
   • Wzorzec stanu pod WP Interactivity API: cały stan w
     atrybutach (aria-expanded, hidden, is-selected), wartość
     w ukrytym inpucie acf[field_skrot_channel] — gotowe do
     podmiany na dyrektywy data-wp-bind / data-wp-on.
============================================================ */
(function () {
  "use strict";

  function norm(s) {
    return (s || "").toLowerCase()
      .replace(/\u0142/g, "l")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* ---------- SEARCHABLE SELECT ---------- */
  function wireSelect(root) {
    if (root.__cselApi) return root.__cselApi;   /* idempotentne */
    var trigger = root.querySelector(".csel__trigger");
    var current = root.querySelector(".csel__current");
    var panel   = root.querySelector(".csel__panel");
    var search  = root.querySelector(".csel__search-input");
    var empty   = root.querySelector(".csel__empty");
    var hidden  = root.querySelector("input[type='hidden']");
    var options = Array.prototype.slice.call(root.querySelectorAll(".csel__option"));

    function open() {
      root.classList.add("is-open");
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      search.value = "";
      filter("");
      setTimeout(function () { search.focus(); }, 30);
    }
    function close() {
      root.classList.remove("is-open");
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
    function isOpen() { return !panel.hidden; }

    /* Filtrowanie opcji w locie (symulacja Select2/Choices.js) */
    function filter(q) {
      var query = norm(q.trim());
      var visible = 0;
      options.forEach(function (opt) {
        var hit = query === "" || norm(opt.textContent).indexOf(query) !== -1;
        opt.hidden = !hit;
        if (hit) visible++;
      });
      empty.hidden = visible !== 0;
    }

    function select(opt) {
      options.forEach(function (o) {
        var on = o === opt;
        o.classList.toggle("is-selected", on);
        o.setAttribute("aria-selected", String(on));
      });
      hidden.value = opt.dataset.value || "";
      current.textContent = opt.textContent.trim();
      current.classList.remove("csel__current--placeholder");
      close();
      trigger.focus();
      /* Zdarzenie stanowe — konsumenci (filtry pulpitu itd.) nasłuchują
         na korzeniu komponentu; wzorzec pod data-wp-on--csel:change */
      root.dispatchEvent(new CustomEvent("csel:change", {
        bubbles: true,
        detail: { value: hidden.value, label: opt.textContent.trim() }
      }));
    }

    trigger.addEventListener("click", function () { isOpen() ? close() : open(); });
    search.addEventListener("input", function () { filter(search.value); });

    /* Delegacja: klik w opcję wewnątrz listy */
    panel.addEventListener("click", function (e) {
      var opt = e.target.closest(".csel__option");
      if (opt && !opt.hidden) select(opt);
    });

    /* Klawiatura: Esc zamyka; Enter w wyszukiwarce wybiera 1. trafienie */
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { e.stopPropagation(); close(); trigger.focus(); }
      if (e.key === "Enter" && e.target === search) {
        e.preventDefault();
        var first = options.filter(function (o) { return !o.hidden; })[0];
        if (first) select(first);
      }
    });

    /* Klik poza komponentem zamyka panel */
    document.addEventListener("click", function (e) {
      if (isOpen() && !root.contains(e.target)) close();
    });

    var api = { getValue: function () { return hidden.value; } };
    root.__cselApi = api;
    return api;
  }

  /* Eksport: inne moduły (pulpit redaktora) wpinają .csel bez duplikacji */
  window.HajlajtyCsel = { wire: wireSelect };

  /* ---------- FORMULARZ ---------- */
  function wireForm(form) {
    var cselRoot = form.querySelector(".csel");
    var csel = cselRoot ? wireSelect(cselRoot) : null;
    var url = form.querySelector(".editor-form__input");
    var success = form.querySelector(".editor-form__success");

    form.addEventListener("submit", function (e) {
      e.preventDefault();   /* mock: docelowo POST przez acf_form() */
      var okUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url.value.trim());
      url.classList.toggle("is-invalid", !okUrl);
      if (!okUrl) { url.focus(); return; }
      if (csel && !csel.getValue()) {
        cselRoot.querySelector(".csel__trigger").focus();
        cselRoot.querySelector(".csel__trigger").click();
        return;
      }
      success.hidden = false;
      if (window.Hajlajty && window.Hajlajty.toast) {
        window.Hajlajty.toast({ simple: true, title: "Skrót opublikowany", duration: 2600 });
      }
    });

    url.addEventListener("input", function () {
      url.classList.remove("is-invalid");
      success.hidden = true;
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".editor-form"), wireForm);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
