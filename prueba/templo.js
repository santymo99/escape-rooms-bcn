// PRUEBA 04/10: respaldo del revelado al hacer scroll en navegadores sin animation-timeline (Firefox, Safari antiguos).
(function () {
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) return;
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('t-io');
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.t-rise').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
})();
// PRUEBA 04/10 (3): selector de tipografía y de fondo; se recuerda en la URL (?fuente=…&fondo=…) para poder compartirlo.
(function () {
  var q = new URLSearchParams(location.search), H = document.documentElement;
  var F = [['michroma', 'Michroma'], ['zodiak', 'Zodiak'], ['cabinet', 'Cabinet'], ['shoulders', 'Big Shoulders']];
  var B = [['nada', 'Liso'], ['dorado', 'A · Dorados'], ['brujula', 'B · Brújula'], ['boveda', 'C · Bóveda']];
  function set(k, v) { if (k === 'fuente') { if (v === 'michroma') H.removeAttribute('data-font'); else H.setAttribute('data-font', v); } else { if (v === 'nada') H.removeAttribute('data-fondo'); else H.setAttribute('data-fondo', v); }
    q.set(k, v); history.replaceState(null, '', location.pathname + '?' + q.toString()); paint(); }
  var box = document.createElement('div'); box.className = 't-pick'; box.setAttribute('aria-label', 'Selector de la prueba');
  function row(lbl, k, opts) { return '<div><span>' + lbl + '</span>' + opts.map(function (o) { return '<button type="button" data-k="' + k + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  box.innerHTML = '<button type="button" class="x" aria-label="Plegar el selector">–</button>' + row('Tipografía', 'fuente', F) + row('Fondo', 'fondo', B);
  function paint() { box.querySelectorAll('button[data-k]').forEach(function (b) { var cur = q.get(b.dataset.k) || (b.dataset.k === 'fuente' ? 'michroma' : 'nada'); b.setAttribute('aria-pressed', String(cur === b.dataset.v)); }); }
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.classList.contains('x')) { box.classList.toggle('is-min'); b.textContent = box.classList.contains('is-min') ? '+' : '–'; return; } set(b.dataset.k, b.dataset.v); });
  document.body.appendChild(box);
  set('fuente', q.get('fuente') || 'michroma'); set('fondo', q.get('fondo') || 'nada');
})();
