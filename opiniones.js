/* Opiniones de jugadores: lectura y alta directa contra la base de datos (Supabase, clave pública).
   Las reglas de la tabla impiden editar o borrar desde aquí; las opiniones ocultas nunca se sirven. */
(function () {
  var root = document.getElementById('opiniones'); if (!root) return;
  var SALA = root.dataset.sala, URL = 'https://xmsdxugqtqrfmeuoeoxv.supabase.co/rest/v1', KEY = 'sb_publishable_b0isIy7kqGOxFB8qciSFzg_MVvABjbe';
  var H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">★</span>'; return '<span class="op-stars" aria-label="' + n + ' de 5">' + s + '</span>'; }
  function mes(iso) { if (!iso) return ''; var p = iso.split('-'); return MESES[+p[1] - 1] + ' de ' + p[0]; }
  function fecha(ts) { var d = new Date(ts); return MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  var list = root.querySelector('.op-list'), sum = root.querySelector('.op-sum'), form = root.querySelector('form'), msg = root.querySelector('.op-msg');
  function render(rows) {
    if (!rows.length) { sum.innerHTML = '<p class="note">Todavía no hay opiniones de esta sala. Sé la primera persona en dejar la tuya.</p>'; list.innerHTML = ''; return; }
    var media = rows.reduce(function (a, r) { return a + r.nota; }, 0) / rows.length;
    sum.innerHTML = '<div class="op-avg"><b>' + media.toFixed(1).replace('.', ',') + '</b>' + stars(Math.round(media)) + '<span>' + rows.length + (rows.length === 1 ? ' opinión' : ' opiniones') + ' de jugadores</span></div>';
    list.innerHTML = rows.map(function (r) {
      return '<article class="op-item"><header><strong>' + esc(r.apodo) + '</strong>' + stars(r.nota) + '<small>' + (r.jugado ? 'jugó en ' + mes(r.jugado) + ' · ' : '') + 'publicada en ' + fecha(r.creada) + '</small></header><p>' + esc(r.texto) + '</p></article>';
    }).join('');
  }
  function load() {
    fetch(URL + '/opiniones?sala_id=eq.' + encodeURIComponent(SALA) + '&select=apodo,nota,texto,jugado,creada&order=creada.desc&limit=100', { headers: H })
      .then(function (r) { return r.ok ? r.json() : []; }).then(render).catch(function () { sum.innerHTML = '<p class="note">No se han podido cargar las opiniones.</p>'; });
  }
  load();
  var doneKey = 'gps-op-' + SALA;
  try { if (localStorage.getItem(doneKey)) form.classList.add('is-done'); } catch (e) {}
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements;
    if (f.web && f.web.value) return; // campo trampa
    var nota = form.querySelector('input[name="nota"]:checked');
    var apodo = f.apodo.value.trim(), texto = f.texto.value.trim();
    var jm = f.jmes ? f.jmes.value : '', ja = f.janio ? f.janio.value : '', jugado = null;
    if (jm || ja) {
      if (!jm || !ja) return show('Elige el mes y el año en que jugaste, o deja los dos en blanco.', true);
      var hoy = new Date();
      if (+ja > hoy.getFullYear() || (+ja === hoy.getFullYear() && +jm > hoy.getMonth() + 1)) return show('Esa fecha todavía no ha llegado: revisa el mes y el año.', true);
      jugado = ja + '-' + jm;
    }
    if (!nota) return show('Elige una nota de 1 a 5.', true);
    if (apodo.length < 2) return show('Pon un nombre o apodo (mínimo 2 letras).', true);
    if (texto.length < 20) return show('Cuéntanos un poco más: mínimo 20 caracteres.', true);
    if (!f.priv.checked) return show('Marca la casilla de privacidad para publicar.', true);
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; show('Publicando…');
    fetch(URL + '/opiniones', { method: 'POST', headers: Object.assign({ 'Prefer': 'return=minimal' }, H), body: JSON.stringify({ sala_id: SALA, apodo: apodo, nota: +nota.value, texto: texto, jugado: jugado }) })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        try { localStorage.setItem(doneKey, '1'); } catch (e) {}
        form.reset(); form.classList.add('is-done'); show('Gracias. Tu opinión ya está publicada.'); load();
      })
      .catch(function () { show('No se ha podido publicar. Prueba de nuevo en un momento.', true); })
      .finally(function () { btn.disabled = false; });
  });
  var rlabels = form.querySelectorAll('.op-rate label'), rinputs = form.querySelectorAll('.op-rate input');
  function paint(n) { rlabels.forEach(function (l, i) { l.classList.toggle('on', i < n); }); }
  rinputs.forEach(function (inp, i) { inp.addEventListener('change', function () { paint(i + 1); }); });
  rlabels.forEach(function (l, i) { l.addEventListener('mouseenter', function () { paint(i + 1); }); l.addEventListener('mouseleave', function () { var c = form.querySelector('input[name="nota"]:checked'); paint(c ? +c.value : 0); }); });
  form.addEventListener('reset', function () { setTimeout(function () { paint(0); }, 0); });
  root.querySelector('.op-again') && root.querySelector('.op-again').addEventListener('click', function (e) { e.preventDefault(); form.classList.remove('is-done'); form.querySelector('textarea').focus(); });
  function show(t, err) { msg.textContent = t; msg.classList.toggle('is-err', !!err); }
})();
