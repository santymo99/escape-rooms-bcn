/* GPS Escape · movimiento de nivel 6 con GSAP 3.15.0 (portada, guías, categorías y artículos). Reglas: skill
   diseno-escape-maps, sección 5b. Solo transform y opacity (y clip-path en la cabecera de los artículos), ease-out,
   sin scroll-jacking. Con «movimiento reducido» no se carga nada de esto (lo decide el script en línea de <head>). */
(function () {
  var d = document.documentElement;
  if (!d.classList.contains('fx') || !window.gsap) { d.classList.remove('fx'); return; }
  gsap.registerPlugin(ScrollTrigger);
  d.classList.add('fx-ok');
  var EO = 'power3.out', EX = 'expo.out';
  var $ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var body = document.body;
  var portada = !!document.querySelector('.t-hero');
  var lectura = body.classList.contains('pg-art') || body.classList.contains('pg-cat') || body.classList.contains('pg-guia');
  if (!portada && !lectura) { d.classList.remove('fx'); return; }

  // Titular por palabras, cada una sube dentro de su máscara. El texto completo queda en aria-label.
  function palabras(el) {
    if (!el || el.dataset.fx) return [];
    el.dataset.fx = '1';
    var txt = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', txt);
    el.innerHTML = txt.split(' ').map(function (w) { return '<span class="fx-w" aria-hidden="true"><span>' + w + '</span></span>'; }).join(' ');
    return $('.fx-w > span', el);
  }
  // Líneas doradas de un antetítulo
  function regla(el, tl, at) {
    if (!el) return;
    tl.fromTo(el, { '--rl': 0 }, { '--rl': 1, duration: .9, ease: EX }, at);
  }
  // Cifra que cuenta hasta su valor (el valor real ya está escrito en el HTML)
  function cuenta(el, delay) {
    var fin = parseInt((el.textContent || '').replace(/\D/g, ''), 10);
    if (!fin || fin < 10) return;
    var o = { v: 0 };
    gsap.to(o, { v: fin, duration: 1.4, delay: delay || 0, ease: 'power2.out', snap: { v: 1 }, onUpdate: function () { el.textContent = o.v; } });
  }

  // ---------- A. Portada: entrada del héroe ----------
  if (portada) {
    var hero = document.querySelector('.t-hero');
    var emb = hero.querySelector('.t-emblem'), word = hero.querySelector('.t-word');
    var h1 = hero.querySelector('h1'), lead = hero.querySelector('.lead'), zonas = hero.querySelector('.zonas');
    var reco = hero.querySelector('.n-reco-h') || (zonas && zonas.nextElementSibling);
    var w = palabras(h1);
    var tl = gsap.timeline({ defaults: { ease: EO } });
    if (emb) {
      var aro = emb.querySelector('circle');
      if (aro) { var L = 2 * Math.PI * 27.5; gsap.set(aro, { strokeDasharray: L, strokeDashoffset: L }); tl.to(aro, { strokeDashoffset: 0, duration: 1.1, ease: EX }, 0); }
      tl.fromTo(emb, { autoAlpha: 0, rotation: -120, scale: .85 }, { autoAlpha: 1, rotation: 0, scale: 1, duration: 1.2, ease: EX, transformOrigin: '50% 50%' }, 0);
    }
    if (word) tl.fromTo(word, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: .9, ease: EX }, .2);
    if (h1) { gsap.set(h1, { autoAlpha: 1 }); tl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: .7, stagger: .06 }, .35); }
    if (lead) tl.fromTo(lead, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, '-=.35');
    if (zonas) tl.fromTo(zonas, { autoAlpha: 0, y: 14, scale: .97 }, { autoAlpha: 1, y: 0, scale: 1, duration: .55, clearProps: 'transform' }, '-=.3');
    if (reco && reco !== zonas) tl.fromTo(reco, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, '-=.25');
    // brillo que cruza una vez el botón y cifra que cuenta
    var btn = zonas && zonas.querySelector('.zonas-btn');
    if (btn) {
      var sh = document.createElement('span'); sh.className = 'fx-shine'; sh.setAttribute('aria-hidden', 'true'); btn.appendChild(sh);
      tl.to(sh, { xPercent: 240, duration: 1.1, ease: 'power2.inOut' }, '-=.1');
      var n = btn.querySelector('[data-stat="salas"]'); if (n) tl.add(function () { cuenta(n); }, '<-.6');
    }
  }

  // ---------- Cabeceras de las páginas de lectura ----------
  if (lectura) {
    var head = document.querySelector('.a-head, .l-head');
    if (head) {
      var tlh = gsap.timeline({ defaults: { ease: EO } });
      // la entradilla y los datos de cabecera se quedan quietos y visibles desde el principio (son el LCP): solo se animan
      // el antetítulo y el titular
      var hr = head.querySelector('.t-rule'), ht = head.querySelector('h1');
      if (hr) { tlh.fromTo(hr, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, 0); regla(hr, tlh, 0); }
      if (ht) { var wh = palabras(ht); gsap.set(ht, { autoAlpha: 1 }); tlh.fromTo(wh, { yPercent: 110 }, { yPercent: 0, duration: .7, stagger: .045 }, .15); }
    }
  }

  // ---------- C. Artículos: la imagen de cabecera se abre como una puerta y se queda algo atrás al bajar ----------
  var fimg = body.classList.contains('pg-art') && document.querySelector('.f-hero img');
  if (fimg) {
    var r = getComputedStyle(fimg).borderRadius || '18px';
    gsap.fromTo(fimg, { clipPath: 'inset(0% 50% 0% 50% round ' + r + ')', scale: 1.12 },
      { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', scale: 1, duration: 1.3, ease: 'expo.inOut', delay: .1 });
    gsap.to(fimg, { y: 36, ease: 'none', scrollTrigger: { trigger: fimg, start: 'top top+=80', end: 'bottom top', scrub: true } });
  }

  // ---------- B. Bloques y tarjetas que entran al bajar (una vez, escalonados) ----------
  var bloques = $('.t-rise, .pg-lee .cards > *, .pg-lee .a-idx > a').filter(function (el) { return !el.closest('.t-hero'); });
  gsap.set(bloques, { autoAlpha: 0, y: 28 });
  ScrollTrigger.batch(bloques, {
    start: 'top 90%', once: true,
    // las tarjetas de una provincia oculta por el filtro (display: none) se dan por mostradas sin animación; el escalonado
    // se limita a 0,6 s en total para que una tanda grande no deje tarjetas esperando varios segundos
    onEnter: function (els) {
      var ver = els.filter(function (el) { return el.offsetParent; }), no = els.filter(function (el) { return !el.offsetParent; });
      if (no.length) gsap.set(no, { autoAlpha: 1, y: 0, overwrite: true });
      if (ver.length) gsap.to(ver, { autoAlpha: 1, y: 0, duration: .6, ease: EO, stagger: Math.min(.07, .6 / ver.length), overwrite: true });
    }
  });
  // líneas doradas de los antetítulos de cada sección
  $('.t-sec .t-rule, .pg-lee .blk .t-rule').forEach(function (el) {
    gsap.fromTo(el, { '--rl': 0 }, { '--rl': 1, duration: .9, ease: EX, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  // imágenes de las categorías: se asientan al entrar
  $('.t-sec .cat img').forEach(function (img) {
    gsap.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.1, ease: EX, scrollTrigger: { trigger: img, start: 'top 92%', once: true }, clearProps: 'transform' });
  });
  // cifra del pie de la portada
  $('.t-como [data-stat="salas"]').forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () { cuenta(el); } });
  });

  // los filtros por provincia de categorías y guías cambian la altura de la página: se recalculan los disparadores
  // y lo que ya queda a la vista tras filtrar se muestra aunque la página no se pueda desplazar (18/10: con pocas salas, por
  // ejemplo Terror · Galicia en escritorio, las tarjetas se quedaban ocultas porque no había scroll que las disparase)
  function aflorar() {
    bloques.forEach(function (el) {
      if (el.offsetParent && el.getBoundingClientRect().top < innerHeight && gsap.getProperty(el, 'autoAlpha') < 1)
        gsap.to(el, { autoAlpha: 1, y: 0, duration: .6, ease: EO, overwrite: true });
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('.zf-b, details > summary')) setTimeout(function () { ScrollTrigger.refresh(); aflorar(); }, 60); });

  // ---------- Extra: inclinación suave de las tarjetas de categoría con el ratón (solo ratón, solo escritorio) ----------
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $('.t-sec .cat').forEach(function (c) {
      gsap.set(c, { transformPerspective: 900 });
      var rx = gsap.quickTo(c, 'rotationX', { duration: .4, ease: EO }), ry = gsap.quickTo(c, 'rotationY', { duration: .4, ease: EO });
      c.addEventListener('pointermove', function (e) { var b = c.getBoundingClientRect(); ry(((e.clientX - b.left) / b.width - .5) * 7); rx(-((e.clientY - b.top) / b.height - .5) * 7); });
      c.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  }
})();
