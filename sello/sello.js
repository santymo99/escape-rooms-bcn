  addEventListener('DOMContentLoaded', function () {
    var S = window.SELLO_SALAS || [], q = document.getElementById('sello-q'), res = document.getElementById('sello-res'),
        out = document.getElementById('sello-out'), img = document.getElementById('sello-img'), cod = document.getElementById('sello-cod'),
        tit = document.getElementById('sello-tit'), B = 'https://gpsescape.es';
    function n(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    function elegir(x) {
      var id = x[0];
      img.src = '/sello/' + id + '.svg'; img.alt = 'Sello de ' + x[1];
      tit.textContent = x[1] + ' (' + x[2] + '): n.º ' + x[4] + ' del top ' + x[5] + ' de ' + x[3];
      cod.value = '<a href="' + B + x[6] + '" target="_blank" rel="noopener"><img src="' + B + '/sello/' + id + '.svg" alt="' + esc(x[1]) + ': sala del top de escape rooms de ' + esc(x[3]) + ' en GPS Escape" width="160" height="214" loading="lazy" /></a>';
      out.hidden = false; res.innerHTML = '';
      if (/^\/sello\//.test(location.pathname)) try { history.replaceState(null, '', '?sala=' + id); } catch (e) {}
    }
    function buscar() {
      var t = n(q.value.trim()); res.innerHTML = '';
      if (t.length < 2) return;
      S.filter(function (x) { return n(x[1] + ' ' + x[2]).indexOf(t) >= 0; }).slice(0, 8).forEach(function (x) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.textContent = x[1] + ' · ' + x[2] + ' · ' + x[3];
        b.addEventListener('click', function () { elegir(x); }); li.appendChild(b); res.appendChild(li);
      });
      if (!res.children.length) res.innerHTML = '<li class="sello-nada">No hay ninguna sala del top con ese nombre.</li>';
    }
    q.addEventListener('input', buscar);
    document.getElementById('sello-copiar').addEventListener('click', function () {
      var bt = this;
      function a_mano() { cod.closest('details').open = true; cod.focus(); cod.select(); bt.textContent = 'Selecciónalo y cópialo'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cod.value).then(function () { bt.textContent = 'Copiado ✓'; setTimeout(function () { bt.textContent = 'Copiar el código'; }, 2500); }, a_mano);
      else a_mano();
    });
    var m = location.search.match(/[?&]sala=([^&]+)/);
    if (m) { var x = S.filter(function (s) { return s[0] === decodeURIComponent(m[1]); })[0]; if (x) { q.value = x[1]; elegir(x); } }
  });
