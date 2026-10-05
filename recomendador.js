// 05/10: «Recomiéndame un escape room». Todo ocurre en el navegador: los datos son los de las fichas publicadas
// (recomendador/salas.js) y la ubicación, si la das, no sale de tu dispositivo. Sin notas de Google ni datos inventados.
(function () {
  var D = window.GPS_RECO; if (!D) return;
  var Z = {}; D.zonas.forEach(function (z) { Z[z.s] = z; });
  D.salas.forEach(function (s) { var c = D.cats[s.c] || D.cats['Clásico']; s.u = '/' + s.z + '/sala/' + s.i + '/'; s.v = c[1];
    s.img = s.o ? '/img/salas/' + s.i + '-640.webp' : '/img/cat/' + c[0] + '-640.webp'; });
  var CAT = { 'Terror': 'de terror', 'Aventura': 'de aventura', 'Thriller/Misterio': 'de thriller y misterio', 'Ciencia ficción': 'de ciencia ficción',
    'Histórico': 'histórica', 'Fantasía': 'de fantasía', 'Humor': 'de humor', 'Infantil': 'infantil' };
  var FACIL = ['Baja', 'Media-Baja', 'Media', 'Adaptable'], DIFICIL = ['Media-Alta', 'Alta', 'Muy alta'];
  var S = { z: '', km: 25, n: 4, d: 0, m: [], c: [], p: 0, l: 'hab', me: null }, verTodos = false;
  var form = document.getElementById('reco'), out = document.getElementById('recoOut'), geoMsg = document.getElementById('recoGeo');
  if (!form || !out) return;
  var q = new URLSearchParams(location.search);
  if (q.get('z') && Z[q.get('z')]) S.z = q.get('z');
  if (q.get('n')) S.n = Math.max(2, Math.min(6, +q.get('n') || 4));
  if (q.get('c')) S.c = q.get('c').split(',').filter(function (c) { return CAT[c]; });
  if (q.get('p')) S.p = +q.get('p') || 0;
  if ([60, 75, 90, 91].indexOf(+q.get('d')) >= 0) S.d = +q.get('d');
  if (q.get('m') && S.z) S.m = q.get('m').split('|').filter(function (m) { return D.salas.some(function (s) { return s.z === S.z && s.m === m; }); });
  if (['prin', 'hab', 'exp'].indexOf(q.get('l')) >= 0) S.l = q.get('l');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(x) { return String(Math.round(x * 100) / 100).replace('.', ',') + ' €'; }
  function paint() {
    form.querySelectorAll('[data-k]').forEach(function (b) {
      var k = b.dataset.k, v = b.dataset.v, on;
      if (k === 'z') on = S.z === v;
      else if (k === 'c') on = v === '' ? S.c.length === 0 : S.c.indexOf(v) >= 0;
      else on = String(S[k]) === v;
      b.setAttribute('aria-pressed', String(on));
    });
    form.querySelector('.reco-km').hidden = S.z !== 'cerca';
    form.querySelectorAll('[data-mk]').forEach(function (b) { var v = b.dataset.mk; b.setAttribute('aria-pressed', String(v === '' ? S.m.length === 0 : S.m.indexOf(v) >= 0)); });
  }
  // 05/10: municipios de la provincia elegida (opcional), para quien no quiere moverse a cualquier sitio y no da su ubicación
  var muniBox = document.getElementById('recoMuni');
  function munis() {
    if (!muniBox) return;
    if (!S.z || S.z === 'cerca') { muniBox.hidden = true; muniBox.innerHTML = ''; return; }
    var n = {}; D.salas.forEach(function (s) { if (s.z === S.z) n[s.m] = (n[s.m] || 0) + 1; });
    var L = Object.keys(n).sort(function (a, b) { return n[b] - n[a] || a.localeCompare(b, 'es'); });
    if (L.length < 2) { muniBox.hidden = true; muniBox.innerHTML = ''; return; }
    var corto = L.length > 12 && !verTodos, V = corto ? L.slice(0, 10) : L;
    S.m.forEach(function (m) { if (V.indexOf(m) < 0) V.push(m); });
    muniBox.innerHTML = '<p class="reco-sub">¿Hasta dónde os movéis? <small>Marcad los municipios que os van bien. Si no marcáis ninguno, vale toda la provincia.</small></p><div class="reco-row">' +
      '<button type="button" class="reco-chip" data-mk="" aria-pressed="false">Toda la provincia</button>' +
      V.map(function (m) { return '<button type="button" class="reco-chip" data-mk="' + esc(m) + '" aria-pressed="false">' + esc(m) + ' <small>' + n[m] + '</small></button>'; }).join('') +
      (corto ? '<button type="button" class="reco-chip reco-more" data-mall="1">Ver los ' + L.length + ' municipios</button>' : '') + '</div>';
    muniBox.hidden = false; paint();
  }
  function km(a, b) { var R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
  function pick(st) {
    var L = [];
    D.salas.forEach(function (s) {
      var dist = null;
      if (st.z === 'cerca') { if (!st.me || s.x == null || s.y == null) return; dist = km(st.me, [s.y, s.x]); if (dist > st.km) return; }
      else if (st.z && s.z !== st.z) return;
      if (s.a == null || s.b == null) return;
      if (st.n >= 6 ? s.b < 6 : (st.n < s.a || st.n > s.b)) return;
      if (st.m.length && st.m.indexOf(s.m) < 0) return;
      if (st.d === 91 ? (!s.d || s.d <= 90) : (st.d && (!s.d || s.d > st.d))) return;
      if (st.c.length && st.c.indexOf(s.c) < 0) return;
      if (st.p && (s.p == null || s.p > st.p)) return;
      if (st.l === 'prin') { if (FACIL.indexOf(s.f) < 0) return; if (s.c === 'Terror' && st.c.indexOf('Terror') < 0) return; }
      if (st.l === 'exp' && (s.f === 'Baja' || s.f === 'Media-Baja')) return;
      var sc = s.r ? 1 - (s.r - 1) / Z[s.z].t * 0.7 : 0.15;
      if (st.l === 'prin' && s.d && s.d <= 75) sc += 0.1;
      if (st.l === 'exp' && DIFICIL.indexOf(s.f) >= 0) sc += 0.15;
      if (dist != null) sc -= dist / 250;
      L.push({ s: s, sc: sc, dist: dist });
    });
    L.sort(function (a, b) { return b.sc - a.sc; });
    var res = [], porLocal = {};
    for (var i = 0; i < L.length && res.length < 5; i++) { var k = L[i].s.l + '|' + L[i].s.m; if ((porLocal[k] || 0) >= 2) continue; porLocal[k] = (porLocal[k] || 0) + 1; res.push(L[i]); }
    return { res: res, total: L.length };
  }
  function why(o, st) {
    var s = o.s, w = [], z = Z[s.z];
    w.push(st.n >= 6 ? 'Admite hasta ' + s.b + ' jugadores: os vale si sois 6 o más.' : 'Admite de ' + s.a + ' a ' + s.b + ' jugadores: sois ' + st.n + ', encaja.');
    if (st.m.length) w.push('Está en ' + s.m + ', uno de los sitios que marcasteis.');
    if (st.d) w.push('Dura ' + s.d + ' minutos, lo que queríais.');
    if (st.c.length) w.push('Es una sala ' + CAT[s.c] + ', lo que buscáis.');
    if (s.p != null) w.push(eur(s.p) + ' por persona en grupo de ' + (s.q || 4) + (st.p ? ', dentro de vuestro presupuesto.' : '.'));
    if (st.l === 'prin') w.push('Dificultad ' + s.f.toLowerCase() + (s.d && s.d <= 75 ? ' y ' + s.d + ' minutos' : '') + ': buena para empezar.');
    else if (st.l === 'exp' && DIFICIL.indexOf(s.f) >= 0) w.push('Dificultad ' + s.f.toLowerCase() + ': para equipos con experiencia.');
    else if (s.f) w.push('Dificultad ' + s.f.toLowerCase() + '.');
    if (s.r) w.push('N.º ' + s.r + ' del top ' + z.t + ' ' + z.de + '.' + (s.pr ? ' Reconocida en ' + s.pr + '.' : ''));
    else w.push('No tiene puesto en el top (está en el directorio), pero cumple todo lo que pedís.');
    if (o.dist != null) w.push('A ' + String(o.dist.toFixed(1)).replace('.', ',') + ' km de ti, en línea recta.');
    return w;
  }
  function relax(st) {
    var r = [];
    if (st.m.length) r.push(['m', [], 'Toda la provincia']);
    if (st.d) r.push(['d', 0, 'Cualquier duración']);
    if (st.p) r.push(['p', 0, 'Sin límite de presupuesto']);
    if (st.c.length) r.push(['c', [], 'Cualquier temática']);
    if (st.l !== 'hab') r.push(['l', 'hab', 'Nivel: jugadores habituales']);
    if (st.z === 'cerca' && st.km < 50) r.push(['km', 50, 'Hasta 50 km']);
    return r;
  }
  function run(scroll) {
    if (S.z === 'cerca' && !S.me) { geoMsg.textContent = 'Primero necesito tu ubicación: pulsa «Cerca de mí» y acepta el permiso.'; return; }
    var p = new URLSearchParams(); if (S.z && S.z !== 'cerca') p.set('z', S.z); p.set('n', S.n); if (S.m.length && S.z !== 'cerca') p.set('m', S.m.join('|')); if (S.d) p.set('d', S.d); if (S.c.length) p.set('c', S.c.join(',')); if (S.p) p.set('p', S.p); p.set('l', S.l);
    history.replaceState(null, '', location.pathname + '?' + p.toString());
    var R = pick(S), h = '', rl = relax(S);
    if (!R.res.length) h = '<div class="reco-head"><p class="t-rule">Sin resultados</p><h2>Ninguna sala cumple todo a la vez</h2><p class="note">Prueba a soltar alguna condición:</p>';
    else h = '<div class="reco-head"><p class="t-rule">Mi recomendación</p><h2>' + (R.res.length === 5 ? 'Cinco salas para vosotros' : (R.res.length === 1 ? 'Una sala para vosotros' : R.res.length + ' salas para vosotros')) + '</h2>' +
      (R.res.length < 5 ? '<p class="note">Solo ' + (R.total === 1 ? 'hay una sala que cumple' : 'hay ' + R.total + ' salas que cumplen') + ' todo lo que pedís. Si soltáis alguna condición saldrán más:</p>' : '');
    if (R.res.length < 5 && rl.length) h += '<div class="reco-relax">' + rl.map(function (x, i) { return '<button type="button" class="reco-chip" data-relax="' + i + '">' + esc(x[2]) + '</button>'; }).join('') + '</div>';
    h += '</div><ol class="reco-list">';
    R.res.forEach(function (o, i) {
      var s = o.s, z = Z[s.z];
      h += '<li class="reco-card" style="--i:' + i + ';--c:var(' + s.v + ')"><a class="reco-img" href="' + s.u + '" tabindex="-1" aria-hidden="true"><img src="' + s.img + '" alt="" loading="lazy" decoding="async" /></a>' +
        '<div class="reco-body"><p class="reco-n" aria-hidden="true">' + (i + 1) + '</p><h3><a href="' + s.u + '">' + esc(s.s) + '</a></h3>' +
        '<p class="reco-meta">' + esc(s.l) + ' · ' + esc(s.m) + '</p>' +
        '<p class="reco-facts"><span class="reco-cat">' + esc(s.c) + '</span>' + (s.d ? '<span>' + s.d + ' min</span>' : '') + '<span>' + s.a + '–' + s.b + ' jugadores</span>' +
        (s.p != null ? '<span>' + eur(s.p) + '/persona</span>' : '') + (s.r ? '<span class="reco-rank">N.º ' + s.r + ' ' + esc(z.de) + '</span>' : '') + '</p>' +
        '<p class="reco-why-t">Por qué te la recomiendo</p><ul class="reco-why">' + why(o, S).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<p class="reco-act"><a class="btn" href="' + s.u + '">Ver la ficha</a>' + (s.w ? '<a class="btn btn--ghost" href="' + esc(s.w) + '" rel="noopener nofollow" target="_blank">Reservar en su web <span aria-hidden="true">↗</span></a>' : '') + '</p></div></li>';
    });
    h += '</ol>';
    if (R.res.length) h += '<p class="reco-share"><button type="button" class="reco-chip" id="recoShare">Copiar el enlace de esta recomendación</button></p>';
    out.innerHTML = h; out.hidden = false;
    out.querySelectorAll('[data-relax]').forEach(function (b) { b.onclick = function () { var x = rl[+b.dataset.relax]; S[x[0]] = x[1]; paint(); run(true); }; });
    var sh = document.getElementById('recoShare'); if (sh) sh.onclick = function () { var u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { sh.textContent = 'Enlace copiado'; }, function () { window.prompt('Copia este enlace:', u); }); };
    if (scroll) out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  form.addEventListener('click', function (e) {
    var mk = e.target.closest('[data-mk]'), ma = e.target.closest('[data-mall]');
    if (ma) { verTodos = true; munis(); var f = muniBox.querySelector('[data-mk]:nth-of-type(12)'); if (f) f.focus(); return; }
    if (mk) { var v0 = mk.dataset.mk; if (v0 === '') S.m = []; else { var j = S.m.indexOf(v0); j >= 0 ? S.m.splice(j, 1) : S.m.push(v0); } paint(); return; }
    var b = e.target.closest('[data-k]'); if (!b) return;
    var k = b.dataset.k, v = b.dataset.v;
    if (k === 'z' && v === 'cerca') {
      S.z = 'cerca'; S.m = []; munis(); paint();
      if (!navigator.geolocation) { geoMsg.textContent = 'Este navegador no permite usar tu ubicación. Elige una zona.'; return; }
      geoMsg.textContent = 'Buscando tu ubicación…';
      navigator.geolocation.getCurrentPosition(function (pos) { S.me = [pos.coords.latitude, pos.coords.longitude]; geoMsg.textContent = 'Ubicación lista. Solo se usa en tu dispositivo para medir distancias.'; },
        function () { S.me = null; S.z = ''; paint(); geoMsg.textContent = 'No he podido usar tu ubicación. Elige una zona.'; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
      return;
    }
    if (k === 'z') { S.z = S.z === v ? '' : v; S.m = []; verTodos = false; geoMsg.textContent = ''; munis(); }
    else if (k === 'c') { if (v === '') S.c = []; else { var i = S.c.indexOf(v); i >= 0 ? S.c.splice(i, 1) : S.c.push(v); } }
    else S[k] = (k === 'l') ? v : +v;
    paint();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
  munis(); paint();
  if (q.get('n')) run(false);
})();
