// 05/10: «Tu pasaporte de escape rooms» (opción B del usuario): sin cuentas. Las salas jugadas se guardan en este navegador
// (clave «gps-done», la misma del botón «Ya la he jugado») y se pueden pasar a otro dispositivo con un enlace (#p=…).
(function () {
  var D = window.GPS_RECO, root = document.getElementById('pasaporte'); if (!D || !root) return;
  var Z = {}, BY = {}; D.zonas.forEach(function (z) { Z[z.s] = z; });
  D.salas.forEach(function (s) { BY[s.i] = s; var c = D.cats[s.c] || D.cats['Clásico']; s.u = '/' + s.z + '/sala/' + s.i + '/'; s.v = c[1];
    s.img = s.o ? '/img/salas/' + s.i + '-640.webp' : '/img/cat/' + c[0] + '-640.webp'; });
  var LAB = { 'Thriller/Misterio': 'thriller y misterio', 'Ciencia ficción': 'ciencia ficción', 'Infantil': 'infantil' };
  function lab(c) { return LAB[c] || c.toLowerCase(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem('gps-done') || '[]'); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem('gps-done', JSON.stringify(a)); return true; } catch (e) { return false; } }
  // Enlace corto y estable: cada sala, 5 caracteres (FNV-1a de su identificador en base 36). No depende del orden de los datos.
  function hh(t) { var h = 2166136261; for (var k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; } return ('0000' + (h % 60466176).toString(36)).slice(-5); }
  var H = {}; D.salas.forEach(function (s) { (H[hh(s.i)] = H[hh(s.i)] || []).push(s.i); });
  function enc(ids) { return ids.map(hh).join(''); }
  function dec(t) { var o = []; for (var k = 0; k + 5 <= t.length; k += 5) (H[t.substr(k, 5)] || []).forEach(function (i) { if (o.indexOf(i) < 0) o.push(i); }); return o.length ? o : null; }
  var shared = null, m = location.hash.match(/^#p=([0-9a-z]+)/); if (m) shared = dec(m[1]);
  function render() {
    var mine = load().filter(function (i) { return BY[i]; }), ids = shared || mine, h = '';
    if (shared) {
      var nuevas = shared.filter(function (i) { return mine.indexOf(i) < 0; }).length;
      h += '<div class="pp-banner"><p><strong>Pasaporte compartido</strong> con ' + shared.length + (shared.length === 1 ? ' sala' : ' salas') + '.</p><p class="pp-acts">' +
        (nuevas ? '<button type="button" class="btn" id="ppImport">Añadir ' + (nuevas === 1 ? 'esa sala' : 'las ' + nuevas + ' salas nuevas') + ' a mi pasaporte</button>' : '<span class="note">Ya tienes todas en tu pasaporte.</span>') +
        '<a class="btn btn--ghost" href="/pasaporte/" id="ppMine">Ver el mío</a></p></div>';
    }
    if (!ids.length) {
      h += '<div class="pp-empty"><p class="t-rule">Pasaporte en blanco</p><h2>Aún no has marcado ninguna sala</h2><p>En la ficha de cada sala, o en el mapa al abrirla, pulsa <strong>«Ya la he jugado»</strong>. Aquí verás cuántas llevas de cada provincia, qué te falta y cuál podría ser tu próxima partida.</p><p class="pp-acts"><a class="btn" href="/#mapas">Elegir provincia</a><a class="btn btn--ghost" href="/recomendador/">Recomiéndame una sala</a></p></div>';
      root.innerHTML = h; bind(); return;
    }
    var set = {}; ids.forEach(function (i) { set[i] = 1; });
    var sel = ids.map(function (i) { return BY[i]; });
    // sellos e hitos
    var hitos = [1, 5, 10, 25, 50, 100], n = ids.length, sig = hitos.filter(function (x) { return x > n; })[0];
    h += '<div class="pp-total"><p class="pp-big">' + n + '</p><p>' + (n === 1 ? 'sala jugada' : 'salas jugadas') + (sig ? ' · te faltan ' + (sig - n) + ' para el sello de ' + sig : '') + '</p>' +
      '<div class="pp-sellos" aria-hidden="true">' + hitos.map(function (x) { return '<span class="pp-sello' + (n >= x ? ' is-on' : '') + '" title="' + x + ' salas">' + x + '</span>'; }).join('') + '</div></div>';
    // por zona
    var zonas = D.zonas.map(function (z) {
      var todas = D.salas.filter(function (s) { return s.z === z.s; }), jug = todas.filter(function (s) { return set[s.i]; });
      var top10 = todas.filter(function (s) { return s.r && s.r <= 10; }), t10 = top10.filter(function (s) { return set[s.i]; }).length;
      return { z: z, todas: todas, jug: jug, top10: top10.length, t10: t10 };
    }).filter(function (x) { return x.jug.length; }).sort(function (a, b) { return b.jug.length - a.jug.length; });
    h += '<div class="pp-zonas">' + zonas.map(function (x) {
      var pct = Math.round(x.jug.length / x.todas.length * 100);
      return '<article class="pp-zona"><h3>' + esc(x.z.n) + '</h3><p class="pp-n">Has jugado <b>' + x.jug.length + '</b> de ' + x.todas.length + '</p>' +
        '<div class="pp-bar" role="img" aria-label="' + pct + ' % completado"><span style="width:' + Math.max(pct, 2) + '%"></span></div><p class="pp-pct">' + pct + ' % completado</p>' +
        (x.top10 ? '<p class="pp-t10">' + (x.t10 === x.top10 ? '¡Todas las ' + x.top10 + ' mejores!' : 'Has hecho <b>' + x.t10 + '</b> de las ' + x.top10 + ' mejores') + '</p>' : '') + '</article>';
    }).join('') + '</div>';
    // categorías
    var cats = {}; sel.forEach(function (s) { cats[s.c] = (cats[s.c] || 0) + 1; });
    var orden = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
    var zPrin = zonas[0].z.s, disp = {}; D.salas.forEach(function (s) { if (s.z === zPrin) disp[s.c] = 1; });
    var faltan = Object.keys(disp).filter(function (c) { return !cats[c] && c !== 'Clásico'; });
    h += '<div class="pp-cats"><h3>Lo que más juegas</h3><p>' + orden.map(function (c) { return '<span class="pp-cat" style="--c:var(' + D.cats[c][1] + ')">' + esc(c) + ' <b>' + cats[c] + '</b></span>'; }).join('') + '</p>' +
      (faltan.length ? '<p class="note">Te falta probar ' + faltan.slice(0, 3).map(lab).join(', ').replace(/, ([^,]*)$/, ' y $1') + ' en ' + esc(Z[zPrin].n) + '.</p>' : '') + '</div>';
    // próxima partida: las mejor colocadas que aún no has jugado en tu provincia principal, empezando por tu categoría favorita
    if (!shared) {
      var fav = orden[0], pend = D.salas.filter(function (s) { return s.z === zPrin && s.r && !set[s.i]; }).sort(function (a, b) { return (b.c === fav) - (a.c === fav) || a.r - b.r; }).slice(0, 3);
      if (pend.length) h += '<div class="pp-next"><p class="t-rule">Tu próxima partida podría ser</p><div class="pp-next-list">' + pend.map(function (s) {
        return '<a class="pp-next-c" href="' + s.u + '" style="--c:var(' + s.v + ')"><img src="' + s.img + '" alt="" loading="lazy" decoding="async" /><span><b>' + esc(s.s) + '</b><small>N.º ' + s.r + ' ' + esc(Z[s.z].de) + ' · ' + esc(s.c) + '</small></span></a>';
      }).join('') + '</div></div>';
    }
    // lista
    h += '<div class="pp-lista"><h3>' + (shared ? 'Sus salas' : 'Tus salas') + '</h3>' + zonas.map(function (x) {
      return '<h4>' + esc(x.z.n) + '</h4><ul>' + x.jug.sort(function (a, b) { return (a.r || 999) - (b.r || 999) || a.s.localeCompare(b.s, 'es'); }).map(function (s) {
        return '<li><a href="' + s.u + '">' + esc(s.s) + '</a> <small>' + esc(s.l) + (s.r ? ' · n.º ' + s.r : '') + '</small>' + (shared ? '' : ' <button type="button" class="pp-x" data-x="' + esc(s.i) + '" aria-label="Quitar ' + esc(s.s) + ' del pasaporte">Quitar</button>') + '</li>';
      }).join('') + '</ul>';
    }).join('') + '</div>';
    if (!shared) h += '<div class="pp-share"><p class="t-rule">Llévatelo a otro dispositivo</p><p>Sin cuentas: copia este enlace y ábrelo en el otro móvil u ordenador para añadir tus salas, o compártelo para enseñar tu pasaporte.</p>' +
      '<p class="pp-acts"><button type="button" class="btn" id="ppCopy">Copiar el enlace de mi pasaporte</button></p><p class="note">Se guarda solo en este navegador: si borras los datos de navegación, se pierde. Guarda el enlace de vez en cuando.</p></div>';
    root.innerHTML = h; bind();
  }
  function bind() {
    var imp = document.getElementById('ppImport');
    if (imp) imp.onclick = function () { var a = load(); shared.forEach(function (i) { if (a.indexOf(i) < 0) a.push(i); }); save(a); shared = null; history.replaceState(null, '', '/pasaporte/'); render(); };
    var mine = document.getElementById('ppMine'); if (mine) mine.onclick = function (e) { e.preventDefault(); shared = null; history.replaceState(null, '', '/pasaporte/'); render(); };
    var cp = document.getElementById('ppCopy');
    if (cp) cp.onclick = function () { var u = location.origin + '/pasaporte/#p=' + enc(load().filter(function (i) { return BY[i]; }));
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { cp.textContent = 'Enlace copiado'; }, function () { window.prompt('Copia este enlace:', u); }); };
    root.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = function () { save(load().filter(function (i) { return i !== b.dataset.x; })); render(); }; });
  }
  render();
})();
