/* ============================================================
   HAJLAJTY — components/match-row.js
   ------------------------------------------------------------
   LOGIKA PULPITU REDAKTORA: filtry + edycja inline pasków.

   • Delegacja zdarzeń w obrębie kontenera [data-row-region] —
     moduł ładowany warunkowo tylko na stronie pulpitu.
   • Formularz inline klonowany z <template id="rowFormTpl">
     (jedno źródło markupu), selektor kanału wpinany przez
     window.HajlajtyCsel.wire (components/editor-form.js).
   • Stan w klasach/atrybutach (is-editing, data-video, is-on) —
     wzorzec 1:1 pod dyrektywy WP Interactivity API
     (data-wp-class--is-editing, data-wp-bind--hidden itd.).
   • Filtry przygotowane pod Algolię: stan = obiekt zapytania
     (competition/season/team/onlyNoVideo) — dziś filtruje DOM,
     docelowo ten sam obiekt zasila index.search().
============================================================ */
(function () {
  "use strict";

  var region = document.querySelector("[data-row-region]");
  if (!region) return;
  var tpl = document.getElementById("rowFormTpl");

  function rows() {
    return Array.prototype.slice.call(region.querySelectorAll(".match-row"));
  }
  function toast(title) {
    if (window.Hajlajty && window.Hajlajty.toast) {
      window.Hajlajty.toast({ simple: true, title: title, duration: 2400 });
    }
  }

  /* ---------------- EDYCJA INLINE ---------------- */
  function openEdit(row) {
    rows().forEach(function (r) { if (r !== row) closeEdit(r); });  /* jedna edycja naraz */
    var form = row.querySelector(".match-row__form");
    if (!form && tpl) {
      form = tpl.content.firstElementChild.cloneNode(true);
      row.appendChild(form);
      var csel = form.querySelector(".csel");
      if (csel && window.HajlajtyCsel) window.HajlajtyCsel.wire(csel);
    }
    if (!form) return;
    var url = form.querySelector(".match-row__url");
    url.value = row.dataset.url || "";
    url.classList.remove("is-invalid");
    form.hidden = false;
    row.classList.add("is-editing");
    setTimeout(function () { url.focus(); }, 30);
  }

  function closeEdit(row) {
    if (!row.classList.contains("is-editing")) return;
    row.classList.remove("is-editing");
    var form = row.querySelector(".match-row__form");
    if (form) form.hidden = true;
  }

  function saveEdit(row) {
    var form = row.querySelector(".match-row__form");
    if (!form) return;
    var url = form.querySelector(".match-row__url");
    var hidden = form.querySelector("input[type='hidden']");
    var okUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url.value.trim());
    url.classList.toggle("is-invalid", !okUrl);
    if (!okUrl) { url.focus(); return; }
    if (!hidden.value) {
      var trig = form.querySelector(".csel__trigger");
      trig.focus(); trig.click();
      return;
    }
    var label = form.querySelector(".csel__current").textContent.trim();

    /* Aktualizacja stanu paska (docelowo: POST acf/update_field) */
    row.dataset.url = url.value.trim();
    row.dataset.video = "yes";
    var src = row.querySelector(".match-row__source");
    src.innerHTML = "";
    var chip = document.createElement("span");
    chip.className = "match-row__channel";
    chip.textContent = label;
    src.appendChild(chip);
    var thumb = row.querySelector(".match-row__thumb");
    thumb.classList.add("has-video");
    thumb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

    closeEdit(row);
    applyFilters();   /* filtr „Tylko bez wideo" może ukryć zapisany pasek */
    toast("Skrót zapisany · " + label);
  }

  /* Delegacja: jeden listener obsługuje wszystkie paski regionu */
  region.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn || !region.contains(btn)) return;
    var row = btn.closest(".match-row");
    if (!row) return;
    var act = btn.dataset.action;
    if (act === "row-edit") openEdit(row);
    else if (act === "row-cancel") closeEdit(row);
    else if (act === "row-save") saveEdit(row);
  });
  region.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var row = e.target.closest(".match-row.is-editing");
      if (row) { e.stopPropagation(); closeEdit(row); }
    }
  });

  /* ---------------- FILTRY (Algolia-ready query state) ---------------- */
  var state = { competition: "", season: "", team: "", onlyNoVideo: false };

  function applyFilters() {
    var visible = 0;
    rows().forEach(function (row) {
      var ok =
        (state.competition === "" || row.dataset.competition === state.competition) &&
        (state.season === "" || row.dataset.season === state.season) &&
        (state.team === "" || (row.dataset.teams || "").split(/\s+/).indexOf(state.team) !== -1) &&
        (!state.onlyNoVideo || row.dataset.video === "no");
      row.classList.toggle("is-hidden-by-filter", !ok);
      if (ok) visible++;
    });
    var cnt = document.querySelector("[data-rows-count]");
    if (cnt) cnt.textContent = String(visible);
    var empty = document.querySelector("[data-rows-empty]");
    if (empty) empty.hidden = visible !== 0;
  }

  /* Selektory .csel (Rozgrywki / Sezon / Drużyna) */
  Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (el) {
    if (window.HajlajtyCsel) window.HajlajtyCsel.wire(el);
    el.addEventListener("csel:change", function (e) {
      state[el.dataset.filter] = e.detail.value;
      applyFilters();
    });
  });

  /* Status wideo: dwupozycyjny przełącznik [Wszystkie | Tylko bez wideo] */
  var segs = Array.prototype.slice.call(document.querySelectorAll("[data-status-seg]"));
  segs.forEach(function (seg) {
    seg.addEventListener("click", function () {
      segs.forEach(function (s) {
        var on = s === seg;
        s.classList.toggle("is-on", on);
        s.setAttribute("aria-pressed", String(on));
      });
      state.onlyNoVideo = seg.dataset.statusSeg === "no-video";
      applyFilters();
    });
  });

  applyFilters();
})();
