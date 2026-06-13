/* ============================================================
   HAJLAJTY — components/cards.js
   ------------------------------------------------------------
   MODULARNA LOGIKA KART (serce / dzwonek / countdown).

   • Generyczna: działa dla każdej karty .card--preview /
     .card--live / .card--highlight bez znajomości stron.
   • Delegacja zdarzeń W OBRĘBIE KONTENERA komponentów
     ([data-card-region]) — plik można ładować warunkowo tylko
     tam, gdzie karty występują.
   • Stan w localStorage — TE SAME klucze co warstwa globalna
     (hajlajty:saved / hajlajty:reminders), więc serca i dzwonki
     trzymają stan między starymi a zrefaktoryzowanymi stronami.

   MAPA NA WP INTERACTIVITY API (docelowo w WordPressie):
     data-card-fav   → data-wp-on--click="actions.toggleFav"
                       + data-wp-class--is-on="state.isFav"
     data-card-bell  → data-wp-on--click="actions.toggleBell"
                       + data-wp-class--is-on="state.hasReminder"
     data-kickoff    → data-wp-watch="callbacks.tickCountdown"
     [data-card-region] → granica store'a (data-wp-interactive).

   API publiczne:
     HajlajtyCards.mount(rootElement?)  — ręczny montaż regionu
     (auto-mount na DOMContentLoaded dla [data-card-region]).
============================================================ */
(function () {
  "use strict";
  if (window.HajlajtyCards) return;            // guard: jeden init

  var KEY = { saved: "hajlajty:saved", reminders: "hajlajty:reminders" };

  /* ---------- store ---------- */
  function loadSet(key) {
    try {
      var raw = localStorage.getItem(key);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
  }
  function saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) {}
  }
  var state = { saved: loadSet(KEY.saved), reminders: loadSet(KEY.reminders) };

  /* ---------- helpers ---------- */
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function cardOf(node) { return node.closest("[data-card-id]"); }
  function idOf(node) {
    var card = cardOf(node);
    return card ? card.getAttribute("data-card-id") : null;
  }
  function toast(title) {
    /* Jeśli strona ładuje globalną warstwę toastów — użyj jej; bez niej moduł
       działa dalej (graceful degradation). */
    if (window.Hajlajty && window.Hajlajty.toast) {
      window.Hajlajty.toast({ simple: true, title: title, duration: 2600 });
    }
  }

  /* ---------- render (store → DOM), wzorzec Interactivity API ---------- */
  function renderFav(btn) {
    var on = state.saved.has(idOf(btn));
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("title", on ? "W Ulubionych" : "Dodaj do ulubionych");
    btn.setAttribute("aria-label", on ? "Usuń z ulubionych" : "Dodaj do ulubionych");
  }
  function renderBell(btn) {
    var on = state.reminders.has(idOf(btn));
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    var txt = btn.querySelector("[data-bell-text]");
    if (txt) txt.textContent = on ? "Przypomnienie włączone" : "Przypomnij mi";
  }
  function renderRegion(root) {
    $$("[data-card-fav]", root).forEach(renderFav);
    $$("[data-card-bell]", root).forEach(renderBell);
  }

  /* ---------- akcje ---------- */
  function toggleFav(btn) {
    var id = idOf(btn);
    if (!id) return;
    if (state.saved.has(id)) { state.saved.delete(id); toast("Usunięto z Ulubionych"); }
    else { state.saved.add(id); toast("Dodano do Ulubionych"); }
    saveSet(KEY.saved, state.saved);
    $$("[data-card-fav]").forEach(function (b) { if (idOf(b) === id) renderFav(b); });
  }
  function toggleBell(btn) {
    var id = idOf(btn);
    if (!id) return;
    if (state.reminders.has(id)) { state.reminders.delete(id); toast("Przypomnienie wyłączone"); }
    else { state.reminders.add(id); toast("Przypomnienie ustawione"); }
    saveSet(KEY.reminders, state.reminders);
    $$("[data-card-bell]").forEach(function (b) { if (idOf(b) === id) renderBell(b); });
  }

  /* ---------- countdown (.card--preview[data-kickoff]) ---------- */
  var MONTHS = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca",
                "sierpnia","września","października","listopada","grudnia"];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  var counters = [];

  function wireCountdowns(root) {
    $$("[data-kickoff]", root).forEach(function (card) {
      if (card.__cardCountdown) return;        // idempotentne
      card.__cardCountdown = true;
      var box = card.querySelector("[data-countdown]");
      if (!box) return;
      var d = new Date(card.getAttribute("data-kickoff"));
      var when = card.querySelector("[data-when]");
      if (when) {
        when.textContent = "Pierwszy gwizdek · " + d.getDate() + " " + MONTHS[d.getMonth()] +
          ", godz. " + pad(d.getHours()) + ":" + pad(d.getMinutes());
      }
      counters.push({
        target: d.getTime(), box: box,
        d: box.querySelector("[data-d]"), h: box.querySelector("[data-h]"),
        m: box.querySelector("[data-m]"), s: box.querySelector("[data-s]")
      });
    });
  }
  function tick() {
    var now = Date.now();
    counters.forEach(function (c) {
      var diff = Math.max(0, c.target - now);
      var sec = Math.floor(diff / 1000);
      if (c.d) c.d.textContent = pad(Math.floor(sec / 86400));
      if (c.h) c.h.textContent = pad(Math.floor((sec % 86400) / 3600));
      if (c.m) c.m.textContent = pad(Math.floor((sec % 3600) / 60));
      if (c.s) c.s.textContent = pad(sec % 60);
      c.box.classList.toggle("is-soon", diff > 0 && diff < 86400000);
    });
  }
  var ticking = false;
  function startTicker() {
    if (ticking || !counters.length) return;
    ticking = true;
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- montaż regionu (delegacja na kontenerze) ---------- */
  function mount(root) {
    root = root || document;
    $$("[data-card-region]", root === document ? document : root.parentNode || document)
      .concat(root !== document && root.hasAttribute && root.hasAttribute("data-card-region") ? [root] : [])
      .forEach(function (region) {
        if (region.__cardsMounted) return;     // idempotentne
        region.__cardsMounted = true;
        /* JEDEN listener na region — nie per przycisk. Faza capture +
           stopPropagation: klik w kontrolkę nie nawiguje karty. */
        region.addEventListener("click", function (e) {
          var fav = e.target.closest("[data-card-fav]");
          if (fav) { e.preventDefault(); e.stopPropagation(); toggleFav(fav); return; }
          var bell = e.target.closest("[data-card-bell]");
          if (bell) { e.preventDefault(); e.stopPropagation(); toggleBell(bell); return; }
        }, true);
        renderRegion(region);
        wireCountdowns(region);
      });
    startTicker();
  }

  /* ---------- auto-mount ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mount(); });
  } else {
    mount();
  }

  window.HajlajtyCards = { mount: mount };
})();
