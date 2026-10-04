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
  // desplegable de provincias de la portada (03/10): se cierra al tocar fuera o con Escape
  document.querySelectorAll('details.zonas').forEach(function (d) {
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; d.querySelector('summary').focus(); } });
    // si la lista no cabe por debajo, se desplaza la página lo justo para verla entera
    d.addEventListener('toggle', function () {
      if (!d.open) return; var l = d.querySelector('.zonas-list'); if (!l) return;
      var b = l.getBoundingClientRect(); if (b.bottom > innerHeight - 8) scrollBy({ top: b.bottom - innerHeight + 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
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

// Portada «Templo» (04/10): respaldo del revelado al hacer scroll en navegadores sin animation-timeline (Firefox, Safari antiguos).
(function () {
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) return;
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('t-io');
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.t-rise').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
})();
// 04/10: barra fija de reserva de las fichas (móvil): aparece cuando los botones de la ficha quedan por encima de la pantalla.
(function () {
  var bar = document.querySelector('.f-sticky'), act = document.querySelector('.ficha > .actions');
  if (!bar || !act || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) { var e = es[0]; bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(act);
})();
