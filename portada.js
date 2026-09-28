(function () {
  var s = window.GPS_STATS; if (s) {
    document.querySelectorAll('[data-stat]').forEach(function (e) { var v = s[e.dataset.stat]; if (v != null) e.textContent = v; });
    document.querySelectorAll('[data-cat]').forEach(function (e) { var v = s.cats && s.cats[e.dataset.cat]; if (v != null) e.textContent = v; });
  }
  // menú «Mapas»
  document.querySelectorAll('.menu').forEach(function (menu) {
    var btn = menu.querySelector('.menu-btn'), list = menu.querySelector('.menu-list');
    function close() { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); var open = list.hidden; list.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });
  var top = document.getElementById('top');
  if (!top) return;
  var onScroll = function () { top.classList.toggle('is-solid', scrollY > 24); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
