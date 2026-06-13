/* ============================================================
   HAJLAJTY — components/user-menu.js
   ------------------------------------------------------------
   LOGIKA DROPDOWNU UŻYTKOWNIKA: toggle, klik poza, Esc.
   Stan wyłącznie w atrybutach (aria-expanded, hidden) —
   wzorzec 1:1 pod WP Interactivity API (data-wp-bind--hidden,
   data-wp-on--click). Moduł ładowany warunkowo na stronach
   z nagłówkiem zawierającym .user-menu.
============================================================ */
(function () {
  "use strict";

  var menus = Array.prototype.slice.call(document.querySelectorAll(".user-menu"));
  if (!menus.length) return;

  function wire(menu) {
    var btn = menu.querySelector(".user-menu__btn");
    var panel = menu.querySelector(".user-menu__panel");
    if (!btn || !panel) return;

    function open()  { panel.hidden = false; btn.setAttribute("aria-expanded", "true"); }
    function close() { panel.hidden = true;  btn.setAttribute("aria-expanded", "false"); }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.hidden ? open() : close();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !menu.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { close(); btn.focus(); }
    });
  }

  menus.forEach(wire);
})();
