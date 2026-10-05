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

// 05/10: «Ya la he jugado» también en la ficha estática (misma clave gps-done que el mapa y el pasaporte). Sin JS, el botón no aparece.
(function () {
  var b = document.querySelector('.f-done'); if (!b) return;
  var id = b.getAttribute('data-done'), t = b.querySelector('.f-done-t');
  function get() { try { return JSON.parse(localStorage.getItem('gps-done') || '[]'); } catch (e) { return null; } }
  if (get() === null) return;
  function paint() { var on = get().indexOf(id) >= 0; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); t.textContent = on ? 'Jugada · está en tu pasaporte' : 'Ya la he jugado'; }
  b.hidden = false; paint();
  b.addEventListener('click', function () { var a = get() || [], i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id);
    try { localStorage.setItem('gps-done', JSON.stringify(a)); } catch (e) {} paint(); });
})();

// 05/10: vídeo de la portada. Solo escritorio (≥1024 px), después de cargar la foto y en un momento libre; nunca con ahorro
// de datos, 2G/3G o movimiento reducido. Se pausa fuera de pantalla y con la pestaña oculta. Si algo falla, queda la foto.
(function () {
  var img = document.querySelector('.t-hero .hero-img'), pic = img && img.closest('picture'); if (!pic) return;
  var c = navigator.connection || {};
  if (!window.matchMedia || !matchMedia('(min-width: 1024px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches || c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '')) return;
  function go() {
    var w = document.createElement('div'), v = document.createElement('video'), ancho = window.innerWidth * (window.devicePixelRatio || 1);
    w.className = 'hero-vidw'; w.setAttribute('aria-hidden', 'true');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('tabindex', '-1');
    v.src = '/img/portada-video-' + (ancho > 1400 ? 1920 : 1280) + '.mp4';
    w.appendChild(v); pic.insertAdjacentElement('afterend', w);
    v.addEventListener('playing', function () {
      try { var ai = img.getAnimations && img.getAnimations()[0], av = v.getAnimations && v.getAnimations()[0]; if (ai && av) av.currentTime = ai.currentTime; } catch (e) {}
      w.classList.add('is-on');
    }, { once: true });
    v.addEventListener('error', function () { w.remove(); }, { once: true });
    var vis = true, play = function () { if (vis && !document.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; play(); }).observe(w);
    document.addEventListener('visibilitychange', play); play();
  }
  function idle() { (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(go, { timeout: 3000 }); }
  if (img.complete && document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
})();

// 05/10: el enlace al recomendador baja por debajo del desplegable de provincias cuando se abre (ver portada.css, --zl).
(function () {
  var d = document.querySelector('.t-hero details.zonas'), list = d && d.querySelector('.zonas-list'), reco = document.querySelector('.t-hero .t-reco');
  if (!d || !list || !reco) return;
  function medir() { if (!d.open) { reco.style.removeProperty('--zl'); var c0 = document.getElementById('categorias'); if (c0) c0.style.marginTop = ''; return; }
    var lr = list.getBoundingClientRect(), rr = reco.getBoundingClientRect(), t = rr.top - (d.open ? (parseFloat(reco.style.getPropertyValue('--zl')) || 0) : 0);
    var zl = Math.max(0, Math.round(lr.bottom + 16 - t)); reco.style.setProperty('--zl', zl + 'px');
    // «Categorías» baja lo justo para dejar 56 px de aire bajo el enlace
    var cat = document.getElementById('categorias'), cr = cat && cat.querySelector('.t-rule, h2');
    if (cat && cr) { cat.style.marginTop = '0px'; var hueco = cr.getBoundingClientRect().top - (t + rr.height + zl); cat.style.marginTop = Math.max(0, Math.round(56 - hueco)) + 'px'; } }
  d.addEventListener('toggle', function () { requestAnimationFrame(medir); setTimeout(medir, 280); });  // segunda medida tras la animación de la lista
  window.addEventListener('resize', function () { if (d.open) medir(); });
})();
