/* ============================================================
   HAJLAJTY — globalna warstwa „Ulubione” + „Przypomnij mi” + Toast
   ------------------------------------------------------------
   Jeden plik dołączany na każdej podstronie:
       <script src="hajlajty-fav.js" defer></script>
   Wstrzykuje własne style (zero nowych zmiennych — korzysta z tokenów
   :root z arkusza strony) i obsługuje deklaratywnie:
     • [data-fav]          → serce „Ulubione” na kartach / pod playerem
     • [data-remind]       → dzwonek „Przypomnij mi”
   Stan trzymany w localStorage (te same klucze, co panel „Twoje”):
     hajlajty:saved        → Set ID skrótów / meczów w Ulubionych
     hajlajty:reminders    → Set ID meczów z włączonym przypomnieniem
   Wzorzec zgodny z WordPress Interactivity API: jeden store → render().
============================================================ */
(function () {
  "use strict";
  if (window.__hajlajtyFav) return;        // guard: jeden init na stronę
  window.__hajlajtyFav = true;

  var KEY = { saved: "hajlajty:saved", reminders: "hajlajty:reminders" };

  /* ---- ikony (spójne z resztą serwisu) ---- */
  var ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5 4.2 12.7a4.7 4.7 0 0 1 6.6-6.6l1.2 1.2 1.2-1.2a4.7 4.7 0 0 1 6.6 6.6z"/></svg>',
    bell:  '<svg viewBox="0 0 24 24"><path d="M18 8.4A6 6 0 0 0 6 8.4c0 6.6-2.6 8.6-2.6 8.6h17.2S18 15 18 8.4"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    live:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ---- styl warstwy (wstrzykiwany) ---- */
  var CSS = '' +
  '.hf-fav{position:absolute;top:10px;right:10px;z-index:3;width:34px;height:34px;display:grid;place-items:center;border-radius:var(--r-pill);background:oklch(0 0 0 / 0.5);color:#fff;border:1px solid oklch(1 0 0 / 0.16);backdrop-filter:blur(2px);transition:background var(--t-fast),color var(--t-fast),transform var(--t-fast);}' +
  '.hf-fav svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-fav:hover{background:oklch(0 0 0 / 0.72);}' +
  '.hf-fav:active{transform:scale(0.9);}' +
  '.hf-fav.is-on{color:var(--live);}' +
  '.hf-fav.is-on svg{fill:currentColor;}' +
  '.up-card{position:relative;}' +
  /* serce na karcie zapowiedzi — równe 16px od narożnika */
  '.up-card .hf-fav{top:16px;right:16px;}' +
  '.live-card .thumb .hf-fav{top:10px;right:10px;}' +
  '.live-card .live-minute{right:54px;}' +
  /* wariant „miękki” na jasnych kartach bez miniatury (np. zapowiedzi) */
  '.hf-fav--soft{background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border);backdrop-filter:none;}' +
  '.hf-fav--soft:hover{background:var(--surface-hover);color:var(--text);}' +
  '.hf-fav--soft.is-on{background:var(--accent-soft);color:var(--live);border-color:transparent;}' +
  /* duży przycisk „Dodaj do ulubionych” pod playerem (16:9) */
  '.hf-actions{display:flex;flex-wrap:wrap;gap:var(--space-2xs);margin-top:var(--space-md);}' +
  '.hf-btn{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:48px;padding:0 20px;border-radius:var(--r-pill);background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-weight:700;font-size:14.5px;font-family:inherit;cursor:pointer;transition:background var(--t-fast),color var(--t-fast),border-color var(--t-fast),transform var(--t-fast);}' +
  '.hf-btn svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-btn:hover{border-color:var(--border-strong);background:var(--surface-hover);}' +
  '.hf-btn:active{transform:scale(0.98);}' +
  '.hf-btn--fav.is-on{background:var(--accent-soft);border-color:transparent;color:var(--live);}' +
  '.hf-btn--fav.is-on svg{fill:currentColor;}' +
  '.hf-btn--remind.is-on{background:var(--accent-soft);border-color:transparent;color:var(--accent-strong);}' +
  '[data-theme="dark"] .hf-btn--remind.is-on{color:var(--accent);}' +
  '.hf-btn--remind.is-on svg{fill:currentColor;}' +
  /* dzwonek „Przypomnij mi” na kartach zapowiedzi (przejęcie .up-card__btn) */
  '.up-card__btn.is-on{background:var(--accent-soft);color:var(--accent-strong);}' +
  '[data-theme="dark"] .up-card__btn.is-on{color:var(--accent);}' +
  '.up-card__btn.is-on svg{fill:currentColor;}' +
  /* ---- TOAST ----
     JEDEN element naraz (logika single-instance w JS). Kontener nie ma stałej
     szerokości — pojedynczy dymek sam dopasowuje gabaryt do treści (max-content)
     i jest wyśrodkowany u dołu ekranu. */
  '.hf-toasts{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:400;display:flex;flex-direction:column;align-items:center;gap:10px;width:auto;max-width:calc(100vw - 32px);pointer-events:none;}' +
  '.hf-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:13px;padding:14px 14px 14px 16px;border-radius:var(--r-lg);background:var(--bg-elev);border:1px solid var(--border);box-shadow:var(--shadow);transform:translateY(24px);opacity:0;transition:transform .34s var(--ease),opacity .34s var(--ease);max-width:calc(100vw - 32px);}' +
  '.hf-toast.is-in{transform:none;opacity:1;}' +
  /* minimalny komunikat potwierdzający — KAPSUŁKA: pełen pill-radius, szerokość
     dobrana do tekstu (max-content) + stały, estetyczny padding poziomy. */
  '.hf-toast--simple{justify-content:center;text-align:center;width:max-content;max-width:calc(100vw - 32px);padding:13px 24px;border-radius:var(--r-pill);background:oklch(0.98 0.004 250);border:1px solid oklch(0.2 0.01 250 / 0.12);box-shadow:0 8px 24px -10px oklch(0.2 0.04 250 / 0.4);}' +
  '.hf-toast--simple .hf-toast__title{color:oklch(0.24 0.012 250);font-weight:700;font-size:14px;white-space:nowrap;}' +
  /* wariant z dodatkowym opisem / CTA wraca do czytelnej karty (nie kapsułki) */
  '.hf-toast--simple.hf-toast--stack{flex-direction:column;align-items:flex-start;justify-content:flex-start;text-align:left;gap:5px;width:min(420px,calc(100vw - 32px));border-radius:var(--r-lg);padding:15px 20px;}' +
  '.hf-toast--simple.hf-toast--stack .hf-toast__title{white-space:normal;}' +
  '.hf-toast--simple .hf-toast__msg{color:oklch(0.46 0.01 250);font-size:13px;line-height:1.45;}' +
  '.hf-toast--simple .hf-toast__cta{margin-top:4px;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:var(--r-pill);background:var(--accent);color:var(--accent-ink);font-weight:800;font-size:12.5px;text-decoration:none;transition:filter var(--t-fast),transform var(--t-fast);}' +
  '.hf-toast--simple .hf-toast__cta:hover{filter:brightness(1.05);}' +
  '.hf-toast--simple .hf-toast__cta:active{transform:scale(0.97);}' +
  '.hf-toast--simple .hf-toast__cta svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-toast__ic{flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center;border-radius:var(--r-pill);background:var(--live-soft);color:var(--live);}' +
  '.hf-toast__ic svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-toast--ok .hf-toast__ic{background:var(--accent-soft);color:var(--accent-strong);}' +
  '[data-theme="dark"] .hf-toast--ok .hf-toast__ic{color:var(--accent);}' +
  '.hf-toast__body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px;padding-top:1px;}' +
  '.hf-toast__title{font-weight:800;font-size:14px;letter-spacing:-0.01em;color:var(--text);text-wrap:pretty;}' +
  '.hf-toast__msg{font-size:13px;color:var(--text-muted);line-height:1.45;text-wrap:pretty;}' +
  '.hf-toast__cta{margin-top:6px;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:var(--r-pill);background:var(--live);color:#fff;font-weight:800;font-size:12.5px;text-decoration:none;transition:transform var(--t-fast),filter var(--t-fast);}' +
  '.hf-toast--ok .hf-toast__cta{background:var(--accent);color:var(--accent-ink);}' +
  '.hf-toast__cta:hover{filter:brightness(1.06);}' +
  '.hf-toast__cta:active{transform:scale(0.97);}' +
  '.hf-toast__cta svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-toast__close{flex:0 0 auto;width:30px;height:30px;display:grid;place-items:center;border-radius:var(--r-pill);background:none;border:none;color:var(--text-faint);cursor:pointer;transition:background var(--t-fast),color var(--t-fast);}' +
  '.hf-toast__close svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}' +
  '.hf-toast__close:hover{background:var(--surface-2);color:var(--text);}' +
  '@media (prefers-reduced-motion: reduce){.hf-toast{transition:opacity .2s;transform:none;}}' +

  /* ====================================================================
     NIESTANDARDOWE PASKI PRZEWIJANIA (desktop)
     • zawsze widoczne (nie znikaj\u0105 w spoczynku),
     • odrobin\u0119 szersze ni\u017c standardowe,
     • suwak ciemny/wtapiaj\u0105cy si\u0119 w t\u0142o \u2192 ja\u015bniejszy dopiero po najechaniu,
     • bez g\u00f3rnych/dolnych strza\u0142ek (scrollbar-buttons).
     Tokeny per-motyw; !important neutralizuje starą logikę .is-scrolling. */
  '[data-theme="dark"]{--hf-sb:oklch(1 0 0 / 0.13);--hf-sb-hover:oklch(1 0 0 / 0.34);}' +
  '[data-theme="light"]{--hf-sb:oklch(0.3 0.02 250 / 0.20);--hf-sb-hover:oklch(0.3 0.02 250 / 0.44);}' +
  '@media (min-width:1100px){' +
    '.sidebar,.content{scrollbar-width:auto;scrollbar-color:var(--hf-sb) transparent;}' +
    '.sidebar::-webkit-scrollbar,.content::-webkit-scrollbar{width:12px;height:12px;}' +
    '.sidebar::-webkit-scrollbar-track,.content::-webkit-scrollbar-track{background:transparent;}' +
    '.sidebar::-webkit-scrollbar-thumb,.content::-webkit-scrollbar-thumb{background:var(--hf-sb) !important;border-radius:999px;border:3px solid transparent;background-clip:padding-box !important;min-height:40px;transition:background var(--t-med);}' +
    '.sidebar::-webkit-scrollbar-thumb:hover,.content::-webkit-scrollbar-thumb:hover{background:var(--hf-sb-hover) !important;}' +
    '.sidebar::-webkit-scrollbar-button,.content::-webkit-scrollbar-button{display:none !important;width:0;height:0;}' +
    '.sidebar::-webkit-scrollbar-corner,.content::-webkit-scrollbar-corner{background:transparent;}' +
  '}' +

  /* ---- KARTY KLIKALNE (nawigacja prototypu) ---- */
  '.live-card,.up-card,.vcard,.team-card,.card--preview{cursor:pointer;}';

  function injectCSS() {
    if (document.getElementById("hf-style")) return;
    var s = document.createElement("style");
    s.id = "hf-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---- STORE ---- */
  function loadSet(key) {
    try { var raw = localStorage.getItem(key); if (raw) return new Set(JSON.parse(raw)); } catch (e) {}
    return new Set();
  }
  function saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) {}
  }
  var state = { saved: loadSet(KEY.saved), reminders: loadSet(KEY.reminders) };

  /* ---- TOAST ---- */
  var host = null;
  function toastHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement("div");
    host.className = "hf-toasts";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }
  var current = null;   // jedyny aktywny dymek (single-instance)
  function killCurrent() {
    if (current) {
      if (current.__timer) clearTimeout(current.__timer);
      if (current.parentNode) current.parentNode.removeChild(current);
      current = null;
    }
  }
  function toast(opts) {
    opts = opts || {};
    /* LOGIKA JEDNEGO ELEMENTU: nowy dymek NATYCHMIAST nadpisuje poprzedni —
       powiadomienia nigdy się nie kumulują ani nie układają jedno nad drugim. */
    killCurrent();
    var el = document.createElement("div");
    el.setAttribute("role", "status");
    if (opts.simple) {
      // komunikat potwierdzający: ciemny tekst na jasnym tle
      el.className = "hf-toast hf-toast--simple";
      var scta = opts.ctaText
        ? '<a class="hf-toast__cta" href="' + (opts.ctaHref || "#") + '">' + opts.ctaText +
          '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></a>'
        : "";
      if (opts.msg || scta) {
        el.className += " hf-toast--stack";
        el.innerHTML =
          '<span class="hf-toast__title">' + (opts.title || "") + '</span>' +
          (opts.msg ? '<span class="hf-toast__msg">' + opts.msg + '</span>' : "") +
          scta;
      } else {
        el.innerHTML = '<span class="hf-toast__title">' + (opts.title || "") + '</span>';
      }
    } else {
      el.className = "hf-toast" + (opts.kind === "ok" ? " hf-toast--ok" : "");
      var cta = opts.ctaText
        ? '<a class="hf-toast__cta" href="' + (opts.ctaHref || "#") + '">' + opts.ctaText +
          '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></a>'
        : "";
      el.innerHTML =
        '<span class="hf-toast__ic">' + (opts.icon || ICON.live) + '</span>' +
        '<div class="hf-toast__body">' +
          '<span class="hf-toast__title">' + (opts.title || "") + '</span>' +
          (opts.msg ? '<span class="hf-toast__msg">' + opts.msg + '</span>' : "") +
          cta +
        '</div>' +
        '<button class="hf-toast__close" type="button" aria-label="Zamknij powiadomienie">' + ICON.close + '</button>';
    }
    toastHost().appendChild(el);
    current = el;
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    function dismiss() {
      if (!el.parentNode) return;
      el.classList.remove("is-in");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 360);
      if (el.__timer) clearTimeout(el.__timer);
      if (current === el) current = null;
    }
    var closeBtn = el.querySelector(".hf-toast__close");
    if (closeBtn) closeBtn.addEventListener("click", dismiss);
    if (opts.duration !== 0) el.__timer = setTimeout(dismiss, opts.duration || 5200);
    return el;
  }

  /* ---- RENDER ---- */
  function favNodes()    { return Array.prototype.slice.call(document.querySelectorAll("[data-fav]")); }
  function remindNodes() { return Array.prototype.slice.call(document.querySelectorAll("[data-remind]")); }

  function renderFav(node) {
    var id = node.getAttribute("data-fav");
    var on = state.saved.has(id);
    node.classList.toggle("is-on", on);
    node.classList.toggle("is-active", on);   // zgodność z istniejącym .fav-btn.is-active
    node.setAttribute("aria-pressed", String(on));
    var lbl = node.getAttribute("data-label") || "skrót";
    var hasText = node.querySelector(".hf-btn__txt, .icon-action__txt");
    if (hasText) hasText.textContent = on ? "W Ulubionych" : "Dodaj do ulubionych";
    else node.setAttribute("aria-label", on ? ("Usuń z Ulubionych: " + lbl) : ("Dodaj do Ulubionych: " + lbl));
    node.setAttribute("title", on ? "W Ulubionych" : "Dodaj do ulubionych");
  }
  function renderRemind(node) {
    var id = node.getAttribute("data-remind");
    var on = state.reminders.has(id);
    node.classList.toggle("is-on", on);
    node.setAttribute("aria-pressed", String(on));
    var txt = node.querySelector(".hf-btn__txt") || node.querySelector("[data-remind-text]");
    if (txt) txt.textContent = on ? "Przypomnienie włączone" : "Przypomnij mi";
    node.setAttribute("title", on ? "Przypomnienie włączone" : "Przypomnij mi");
  }
  function renderAll() {
    favNodes().forEach(renderFav);
    remindNodes().forEach(renderRemind);
  }

  /* ---- AKCJE ---- */
  function toggleFav(node) {
    var id = node.getAttribute("data-fav");
    if (!id) return;
    var lbl = node.getAttribute("data-label") || "skrót";
    if (state.saved.has(id)) {
      state.saved.delete(id);
      toast({ simple: true, title: "Usunięto z ulubionych", duration: 2600 });
    } else {
      state.saved.add(id);
      toast({ simple: true, title: "Dodano do ulubionych", duration: 2600 });
    }
    saveSet(KEY.saved, state.saved);
    favNodes().forEach(function (n) { if (n.getAttribute("data-fav") === id) renderFav(n); });
  }

  var SIM = {}; // symulowane „mecz się rozpoczął” per ID (demo)
  function toggleRemind(node) {
    var id = node.getAttribute("data-remind");
    if (!id) return;
    var lbl = node.getAttribute("data-label") || "ten mecz";
    if (state.reminders.has(id)) {
      state.reminders.delete(id);
      if (SIM[id]) { clearTimeout(SIM[id]); delete SIM[id]; }
      toast({ simple: true, title: "Przypomnienie wyłączone", duration: 2600 });
    } else {
      state.reminders.add(id);
      toast({ simple: true, title: "Przypomnienie ustawione", msg: "Powiadomimy Cię, gdy mecz się rozpocznie. Znajdziesz je w sekcji „Ulubione” → Nadchodzące przypomnienia.", ctaText: "Zobacz Ulubione", ctaHref: "Hajlajty - Ulubione.html", duration: 6000 });
      // DEMO: po chwili symulujemy pierwszy gwizdek
      SIM[id] = setTimeout(function () {
        delete SIM[id];
        if (!state.reminders.has(id)) return;
        toast({
          icon: ICON.live, duration: 9000,
          title: "Mecz, który śledzisz, właśnie się rozpoczął!",
          msg: lbl + " — pierwszy gwizdek przed chwilą.",
          ctaText: "Przejdź do LIVE", ctaHref: "Hajlajty - Mecz na Żywo.html"
        });
      }, 6000);
    }
    saveSet(KEY.reminders, state.reminders);
    remindNodes().forEach(function (n) { if (n.getAttribute("data-remind") === id) renderRemind(n); });
  }

  /* ---- DELEGACJA ---- */
  document.addEventListener("click", function (e) {
    var fav = e.target.closest("[data-fav]");
    if (fav) { e.preventDefault(); e.stopPropagation(); toggleFav(fav); return; }
    var rem = e.target.closest("[data-remind]");
    if (rem) { e.preventDefault(); e.stopPropagation(); toggleRemind(rem); return; }
  }, true);

  /* ---- OBSERWOWANE: prosty komunikat po przełączeniu lornetki/oka ----
     Nasłuch w fazie bąbelkowania (po obsłudze przez skrypt strony), więc
     stan (aria-pressed / .is-active) jest już zaktualizowany. */
  document.addEventListener("click", function (e) {
    var ob = e.target.closest('[data-action="toggle-observe"]');
    if (!ob) return;
    setTimeout(function () {
      var on = ob.getAttribute("aria-pressed") === "true" || ob.classList.contains("is-active");
      toast({ simple: true, title: on ? "Dodano do obserwowanych" : "Usunięto z obserwowanych", duration: 2600 });
    }, 0);
  });

  /* ---- API publiczne ---- */
  window.Hajlajty = window.Hajlajty || {};
  window.Hajlajty.toast = toast;
  window.Hajlajty.render = renderAll;
  window.Hajlajty.icons = ICON;

  /* ---- AUTO-DEKORACJA GLOBALNYCH KART MECZU ----
     Każda karta (live / zapowiedź / skrót) dostaje serce w rogu, a karta
     zapowiedzi — dodatkowo dzwonek „Przypomnij mi”. ID wyprowadzane stabilnie
     z drużyn + tytułu, więc stan trzyma się między stronami. */
  function slug(s) { return (s || "").toLowerCase().replace(/\u0142/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function cardLabel(card) {
    var t = card.querySelector(".vcard__title");
    if (t) return t.textContent.trim();
    var names = card.querySelectorAll(".up-team .name, .live-score .team .nm, .live-score .team");
    if (names.length >= 2) return names[0].textContent.trim() + " – " + names[1].textContent.trim();
    return (card.getAttribute("data-teams") || "mecz").trim();
  }
  function cardId(card, kind) {
    if (card.dataset.matchId) return card.dataset.matchId;
    var id = kind + "-" + slug((card.getAttribute("data-teams") || "") + "-" + cardLabel(card)).slice(0, 40);
    card.dataset.matchId = id;
    return id;
  }
  function makeHeart(id, label, soft) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "hf-fav" + (soft ? " hf-fav--soft" : "");
    b.setAttribute("data-fav", id);
    b.setAttribute("data-label", label);
    b.innerHTML = ICON.heart;
    return b;
  }
  function autoDecorate() {
    // LIVE + SKRÓTY → serce w miniaturze
    Array.prototype.forEach.call(document.querySelectorAll(".live-card, .vcard"), function (card) {
      if (card.hasAttribute("data-no-fav") || card.querySelector(".hf-fav")) return;
      var thumb = card.querySelector(".thumb");
      if (!thumb) return;
      if (getComputedStyle(thumb).position === "static") thumb.style.position = "relative";
      var kind = card.classList.contains("live-card") ? "live" : "skrot";
      thumb.appendChild(makeHeart(cardId(card, kind), cardLabel(card), false));
    });
    // ZAPOWIEDZI → serce (miękkie) + dzwonek „Przypomnij mi”
    Array.prototype.forEach.call(document.querySelectorAll(".up-card"), function (card) {
      var id = cardId(card, "up");
      var label = cardLabel(card);
      if (!card.hasAttribute("data-no-fav") && !card.querySelector(".hf-fav")) {
        card.appendChild(makeHeart(id, label, true));
      }
      var btn = card.querySelector(".up-card__btn");
      if (btn && !btn.hasAttribute("data-remind")) {
        btn.setAttribute("data-remind", id);
        btn.setAttribute("data-label", label);
        btn.innerHTML = ICON.bell + ' <span class="hf-btn__txt" data-remind-text>Przypomnij mi</span>';
      }
    });
  }

  /* ====================================================================
     NAWIGACJA PROTOTYPU — spina podstrony w jeden klikalny przepływ.
     • Karty meczowe / reprezentacji → dedykowany szablon podstrony.
     • Pozycje menu w sidebarze → właściwe widoki HTML.
     Czysty Vanilla JS + delegacja (zgodne z WordPress Interactivity API). */
  var PAGE = {
    home:          "Hajlajty - Strona Główna.html",
    /* Strony POJEDYNCZEGO meczu (watch pages) — cel kliknięcia w KARTĘ */
    live:          "Hajlajty - Mecz na Żywo.html",
    up:            "Hajlajty - Zapowiedź Meczu.html",
    skrot:         "Hajlajty - Skrót Meczu.html",
    /* Strony KATEGORII (listy zbiorcze) — cel kliknięcia w MENU boczne */
    catLive:       "Hajlajty - Na Żywo.html",
    catUp:         "Hajlajty - Zapowiedzi.html",
    catSkrot:      "Hajlajty - Skróty.html",
    belgia:        "Hajlajty - Profil Belgia.html",
    terminarz:     "Hajlajty - Terminarz Turnieju.html",
    tabele:        "Hajlajty - Tabele Grup.html",
    reprezentacje: "Hajlajty - Reprezentacje.html",
    obserwowane:   "Hajlajty - Obserwowane.html",
    ulubione:      "Hajlajty - Ulubione.html",
    ustawienia:    "Hajlajty - Ustawienia.html"
  };

  function nrm(s) {
    return (s || "").toLowerCase().replace(/\u0142/g, "l")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ").trim();
  }

  /* Mapa: fragment etykiety pozycji menu → docelowy widok.
     UWAGA: „mecz na zywo” (strona pojedynczego meczu) musi być SPRAWDZANE
     przed „na zywo”, bo etykieta zawiera ten sam fragment. Pozycje kategorii
     prowadzą do stron LIST, nie do pojedynczych meczów. */
  var NAVMAP = [
    ["strona glowna", PAGE.home],
    ["mecz na zywo",  PAGE.live],
    ["na zywo",       PAGE.catLive],
    ["zapowiedzi",    PAGE.catUp],
    ["skroty",        PAGE.catSkrot],
    ["terminarz",     PAGE.terminarz],
    ["tabele",        PAGE.tabele],
    ["reprezentacje", PAGE.reprezentacje],
    ["obserwowane",   PAGE.obserwowane],
    ["ulubione",      PAGE.ulubione],
    ["ustawienia",    PAGE.ustawienia]
  ];

  function wireSidebar() {
    Array.prototype.forEach.call(document.querySelectorAll(".sidebar .nav-link"), function (a) {
      var txt = nrm(a.textContent);
      for (var i = 0; i < NAVMAP.length; i++) {
        if (txt.indexOf(NAVMAP[i][0]) !== -1) { a.setAttribute("href", NAVMAP[i][1]); break; }
      }
    });
    /* „Zobacz profil” → uniwersalny mock-up profilu (Belgia) */
    Array.prototype.forEach.call(document.querySelectorAll('.team-btn'), function (a) {
      var h = a.getAttribute("href");
      if (!h || h === "#") a.setAttribute("href", PAGE.belgia);
    });
  }

  function cardDest(card) {
    if (card.classList.contains("live-card")) return PAGE.live;
    if (card.classList.contains("up-card"))   return PAGE.up;
    if (card.classList.contains("card--preview")) return PAGE.up;   /* moduł komponentowy */
    if (card.classList.contains("vcard"))      return PAGE.skrot;
    if (card.classList.contains("team-card"))  return PAGE.belgia;  // uniwersalny mock-up
    return null;
  }

  /* Klik w kartę (poza sercem / dzwonkiem / przyciskiem obserwowania) → podstrona.
     Faza bąbelkowania: kontrolki [data-fav]/[data-remind] są obsłużone wcześniej
     (capture + stopPropagation w delegacji powyżej) i tu nie docierają. */
  function wireCards() {
    document.addEventListener("click", function (e) {
      if (e.target.closest('[data-fav],[data-remind],[data-card-fav],[data-card-bell],[data-action="toggle-observe"],.team-fav,.hf-fav,.hf-toast,.hf-toasts,.chip,.chips-arrow,.icon-btn')) return;
      var card = e.target.closest(".live-card,.up-card,.vcard,.team-card,.card--preview");
      if (!card) return;
      var dest = cardDest(card);
      if (!dest) return;
      e.preventDefault();
      window.location.href = dest;
    });
  }

  /* ---- START ---- */
  function boot() { injectCSS(); autoDecorate(); renderAll(); wireSidebar(); wireCards(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
