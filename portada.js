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
  // Linterna (03/10): el halo de la cabecera y la luz del héroe siguen al ratón. Lo mueve el propio usuario, así que se
  // mantiene también con «movimiento reducido»; en pantallas táctiles no se activa.
  if (window.matchMedia && matchMedia('(hover: hover)').matches) {
    var hdr = document.getElementById('top'), hero = document.querySelector('.hero'), raf = 0, ev = null;
    var paint = function () {
      raf = 0; var e = ev;
      if (hdr) { var b = hdr.getBoundingClientRect(); hdr.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100).toFixed(1) + '%'); }
      if (hero) {
        var h = hero.getBoundingClientRect(), dentro = e.clientY >= h.top && e.clientY <= h.bottom;
        hero.classList.toggle('is-lit', dentro);
        if (dentro) { hero.style.setProperty('--hx', (e.clientX - h.left) + 'px'); hero.style.setProperty('--hy', (e.clientY - h.top) + 'px'); }
      }
    };
    addEventListener('pointermove', function (e) { ev = e; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { if (hero) hero.classList.remove('is-lit'); });
  }
  var top = document.getElementById('top');
  if (!top) return;
  var onScroll = function () { top.classList.toggle('is-solid', scrollY > 24); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
