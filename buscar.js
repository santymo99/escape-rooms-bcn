/* 27/11 (usuario): buscador de salas en la cabecera. A partir de 3 letras sugiere salas y locales con su municipio y
   provincia y lleva a la ficha. El índice (/buscar-data.js, lo genera build_pages.py) solo se descarga al tocar el buscador. */
(function () {
  var box = document.querySelector('.bus');
  if (!box) return;
  var btn = box.querySelector('.bus-btn'), inp = box.querySelector('.bus-in'), res = box.querySelector('.bus-res');
  var data = null, cargando = null, sel = -1, items = [];
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function cargar() {
    if (data || cargando) return cargando;
    cargando = new Promise(function (ok, ko) {
      var sc = document.createElement('script'); sc.src = box.getAttribute('data-src'); sc.async = true;
      sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc);
    }).then(function () {
      data = (window.GPS_BUS || []).map(function (x) { return { s: x[0], l: x[1], m: x[2], z: x[3], u: x[4], ns: norm(x[0]), nl: norm(x[1]), nm: norm(x[2]) }; });
      if (inp.value) buscar();
    }).catch(function () { cargando = null; });
    return cargando;
  }
  function puntua(x, q) {
    var re = new RegExp('(^|[^a-z0-9])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (x.ns.indexOf(q) === 0) return 0;
    if (re.test(x.ns)) return 1;
    if (x.nl.indexOf(q) === 0 || re.test(x.nl)) return 2;
    if (x.ns.indexOf(q) > -1) return 3;
    if (x.nl.indexOf(q) > -1) return 4;
    if (x.nm.indexOf(q) === 0) return 5;
    return -1;
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function pinta(lista, q) {
    while (res.firstChild) res.removeChild(res.firstChild);
    items = []; sel = -1;
    if (q.length < 3) {
      res.appendChild(el('li', 'bus-msg', 'Escribe al menos 3 letras del nombre de la sala o del local.'));
    } else if (!data) {
      res.appendChild(el('li', 'bus-msg', 'Buscando…'));
    } else if (!lista.length) {
      var li = el('li', 'bus-msg'); li.appendChild(document.createTextNode('No encontramos «' + inp.value.trim() + '». Si es tu sala y está abierta, '));
      var a = el('a', null, 'escríbenos'); a.href = '/contacto/'; li.appendChild(a); li.appendChild(document.createTextNode(' y la revisamos.'));
      res.appendChild(li);
    } else {
      lista.forEach(function (x, i) {
        var li = el('li'); li.setAttribute('role', 'option'); li.id = 'bus-o' + i;
        var a = el('a'); a.href = x.u; a.tabIndex = -1;
        a.appendChild(el('strong', null, x.s));
        var lugar = x.m === x.z ? x.m : x.m + ', ' + x.z;
        a.appendChild(el('small', null, x.l + ' · ' + lugar));
        li.appendChild(a); res.appendChild(li); items.push(li);
      });
    }
    res.hidden = false; inp.setAttribute('aria-expanded', 'true'); box.classList.add('is-res');
  }
  function buscar() {
    var q = norm(inp.value.trim());
    if (!q) { cierra(); return; }
    if (q.length < 3 || !data) { pinta([], q); if (!data) cargar(); return; }
    var out = [];
    for (var i = 0; i < data.length; i++) { var p = puntua(data[i], q); if (p > -1) out.push([p, data[i]]); }
    out.sort(function (a, b) { return a[0] - b[0] || a[1].s.localeCompare(b[1].s, 'es'); });
    pinta(out.slice(0, 8).map(function (o) { return o[1]; }), q);
  }
  function cierra() { res.hidden = true; inp.setAttribute('aria-expanded', 'false'); box.classList.remove('is-res'); sel = -1; inp.removeAttribute('aria-activedescendant'); }
  function marca(n) {
    if (!items.length) return;
    sel = (n + items.length) % items.length;
    items.forEach(function (li, i) { li.classList.toggle('is-sel', i === sel); });
    inp.setAttribute('aria-activedescendant', items[sel].id);
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  function abre() { box.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); cargar(); setTimeout(function () { inp.focus(); }, 30); }
  function plega() { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); cierra(); }
  btn.addEventListener('click', function () { box.classList.contains('is-open') ? plega() : abre(); });
  inp.addEventListener('focus', function () { cargar(); if (inp.value.trim()) buscar(); });
  btn.addEventListener('pointerenter', cargar);
  inp.addEventListener('input', buscar);
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); marca(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marca(sel - 1); }
    else if (e.key === 'Enter') { var li = items[sel > -1 ? sel : 0]; if (li) { e.preventDefault(); location.href = li.querySelector('a').href; } }
    else if (e.key === 'Escape') { if (!res.hidden) cierra(); else { plega(); btn.focus(); } }
  });
  document.addEventListener('pointerdown', function (e) { if (!box.contains(e.target) && box.classList.contains('is-open')) plega(); });
})();
