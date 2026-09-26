/* GPS Escape — mapa interactivo */
(() => {
  const CATS = {
    'Terror':          { v: '--c-terror',   label: 'Terror' },
    'Aventura':        { v: '--c-aventura', label: 'Aventura' },
    'Thriller/Misterio': { v: '--c-misterio', label: 'Thriller/Misterio' },
    'Ciencia ficción': { v: '--c-scifi',    label: 'Ciencia ficción' },
    'Histórico':       { v: '--c-historico',label: 'Histórico' },
    'Fantasía':        { v: '--c-fantasia', label: 'Fantasía' },
    'Humor':           { v: '--c-humor',    label: 'Humor' },
    'Clásico':         { v: '--c-clasico',  label: 'Clásico' }
  };
  const catVar = c => `var(${(CATS[c] || CATS['Clásico']).v})`;

  const $ = s => document.querySelector(s);
  const el = (t, cls, html) => { const n = document.createElement(t); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = n => new Intl.NumberFormat('es-ES').format(n);

  const GAPS = {
    anio: 'año de apertura', año: 'año de apertura', dificultad: 'dificultad oficial', dif: 'dificultad oficial',
    rating: 'valoración', rating_n: 'número de reseñas', reseñas: 'número de reseñas',
    actores: 'presencia de actores', idiomas: 'idiomas', precio: 'precio', duracion: 'duración',
    duración: 'duración', jugadores: 'número de jugadores', direccion: 'dirección exacta', dirección: 'dirección exacta'
  };
  const gapLabel = k => GAPS[String(k).toLowerCase()] || String(k).replace(/_/g, ' ');

  function zonaLabel(r) {
    if (!r.zona) return '';
    const z = r.zona.replace(r.municipio, '').replace(/^[\s,(–-]+|[\s,)–-]+$/g, '').trim();
    return z && z.toLowerCase() !== (r.municipio || '').toLowerCase() ? z : '';
  }

  const state = {
    data: null, rooms: [], groups: [], markers: new Map(), map: null, openLocal: null,
    cat: 'all', q: '', sel: null, view: 'map',
    f: { zona: '', players: 0, dif: '', noDif: false },
    pop: null,
    theme: (() => { try { return localStorage.getItem('gps-theme') || 'dark'; } catch (e) { return 'dark'; } })(),
    // «Ya la he jugado»: se guarda en este navegador (sin registro). No se sincroniza entre dispositivos.
    done: (() => { try { return new Set(JSON.parse(localStorage.getItem('gps-done') || '[]')); } catch (e) { return new Set(); } })(),
    hideDone: (() => { try { return localStorage.getItem('gps-hidedone') === '1'; } catch (e) { return false; } })()
  };
  const isDone = r => state.done.has(r.id);
  function toggleDone(id) {
    state.done.has(id) ? state.done.delete(id) : state.done.add(id);
    try { localStorage.setItem('gps-done', JSON.stringify([...state.done])); } catch (e) {}
  }
  function setHideDone(v) { state.hideDone = !!v; try { localStorage.setItem('gps-hidedone', v ? '1' : '0'); } catch (e) {} }

  /* ---------------- tema ---------------- */
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $('#iconTheme').innerHTML = state.theme === 'dark'
      ? '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>'
      : '<circle cx="12" cy="12" r="4.2"/><path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4"/>';
    if (state.map) {
      const style = state.theme === 'dark' ? 'dark' : 'positron';
      state.map.setStyle(`https://tiles.openfreemap.org/styles/${style}`, { diff: false });
    }
  }
  $('#btnTheme').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('gps-theme', state.theme); } catch (e) {} applyTheme(); };

  /* ---------------- helpers de datos ---------------- */
  const priceOf = r => (r.pmax ?? r.pmin ?? null);
  const DEF_F = { zona: '', players: 0, dif: '', noDif: false };
  const CAT_IMG = { 'Terror': 'terror', 'Thriller/Misterio': 'thriller', 'Aventura': 'aventura', 'Ciencia ficción': 'scifi', 'Histórico': 'historico', 'Fantasía': 'fantasia', 'Humor': 'humor', 'Clásico': 'clasico' };
  const catImg = (c, sm) => `/img/cat/${CAT_IMG[c] || 'clasico'}${sm ? '-640' : ''}.webp`;
  function fitsGroup(r, n) {
    if (!n) return true;
    if (r.jmax != null && r.jmax < n) return false;
    if (r.jmin != null && r.jmin > n && n < 8) return false;
    return true;
  }
  function matches(r, f) {
    f = f || state.f;
    if (state.cat !== 'all' && r.cat !== state.cat) return false;
    if (state.q) {
      const hay = `${r.sala} ${r.local} ${r.municipio} ${r.zona || ''} ${r.cat} ${r.tema || ''}`.toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    if (f.zona && r.comarca !== f.zona) return false;
    if (!fitsGroup(r, f.players)) return false;
    // dificultad: la sala sin dato solo entra si el usuario pide verlas (nunca se le asigna un nivel)
    if (f.dif && r.dif !== f.dif && !(f.noDif && !r.dif)) return false;
    if (state.hideDone && isDone(r)) return false;
    return true;
  }
  const activeFilterCount = () =>
    Object.keys(DEF_F).filter(k => k !== 'noDif').reduce((n, k) => n + (state.f[k] !== DEF_F[k] ? 1 : 0), 0);
  // cuántas salas pendientes quedarían si un filtro tomara otro valor
  function countWith(key, value) {
    const f = { ...state.f, [key]: value };
    return state.rooms.filter(r => matches(r, f)).length;
  }

  /* ---------------- mapa ---------------- */
  function initMap() {
    const map = new maplibregl.Map({
      container: 'map',
      style: `https://tiles.openfreemap.org/styles/${state.theme === 'dark' ? 'dark' : 'positron'}`,
      center: [2.168, 41.404], zoom: 10.6, minZoom: 8, maxZoom: 18,
      attributionControl: { compact: true }
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-left');

    // control propio: encuadra todas las salas visibles (varias añadidas quedan lejos del centro)
    class FitAll {
      onAdd() {
        const c = el('div', 'maplibregl-ctrl maplibregl-ctrl-group');
        const b = el('button', 'fit-all');
        b.type = 'button';
        b.title = 'Encuadrar todas las salas';
        b.setAttribute('aria-label', 'Encuadrar todas las salas');
        b.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 7V4.4A1.4 1.4 0 0 1 4.4 3H7M13 3h2.6A1.4 1.4 0 0 1 17 4.4V7M17 13v2.6a1.4 1.4 0 0 1-1.4 1.4H13M7 17H4.4A1.4 1.4 0 0 1 3 15.6V13"/></svg>';
        b.onclick = fitAll;
        c.appendChild(b);
        this._c = c;
        return c;
      }
      onRemove() { this._c.remove(); }
    }
    map.addControl(new FitAll(), 'bottom-left');
    state.map = map;
    map.on('load', () => { $('#sk')?.remove(); buildMarkers(); });
  }

  function fitAll() {
    const pts = [];
    state.markers.forEach(({ node, g }) => { if (node.style.display !== 'none') pts.push([g.lon, g.lat]); });
    if (pts.length < 2) return;
    const b = pts.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    state.map.fitBounds(b, { padding: { top: 46, bottom: 58, left: 46, right: 46 }, duration: 700, maxZoom: 12 });
  }

  /* ---------------- agrupación por local ----------------
     Un marcador por local físico: mismo nombre de local Y a menos de GROUP_M metros.
     El umbral absorbe artefactos de geocodificación (exact vs portal, 1-10 m) sin fusionar
     sedes reales, que en este dataset están a ≥ 240 m. Las salas con prec 'city' (centroide
     del municipio, sin dirección verificada) no se pintan: se listan como sin ubicar. */
  const GROUP_M = 50;
  const hasPos = r => r.lat != null && r.lon != null && r.prec !== 'city';
  function metres(a, b) {
    const R = 6371000, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
    const dl = (b.lon - a.lon) * Math.PI / 180;
    return R * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)));
  }
  function buildGroups() {
    const gs = [];
    state.rooms.forEach(r => {
      if (!hasPos(r)) return;
      let g = gs.find(x => x.local === r.local && metres(x, r) <= GROUP_M);
      if (!g) { g = { id: `g${gs.length}`, local: r.local, lat: r.lat, lon: r.lon, municipio: r.municipio, rooms: [] }; gs.push(g); }
      g.rooms.push(r);
      r.gid = g.id;
    });
    // el ancla del grupo es su coordenada más precisa
    gs.forEach(g => {
      const best = g.rooms.find(r => r.prec === 'exact') || g.rooms[0];
      g.lat = best.lat; g.lon = best.lon; g.dir = best.dir;
      g.web = g.rooms.map(r => r.web).find(Boolean) || null;
    });
    state.groups = gs;
  }
  // mejor sala (menor ranking; si ninguna puntúa, la primera por nombre) entre un subconjunto
  function bestOf(rooms) {
    const ranked = rooms.filter(r => r.rank).sort((a, b) => a.rank - b.rank);
    return ranked[0] || [...rooms].sort((a, b) => a.sala.localeCompare(b.sala, 'es'))[0];
  }

  function jitter(g, i) {
    // separa locales distintos que comparten portal para que todos sean pulsables
    if (!i) return [g.lon, g.lat];
    const ang = (i * 2.399963), rad = 0.00028 * (1 + Math.floor(i / 6));
    return [g.lon + rad * Math.cos(ang) * 1.34, g.lat + rad * Math.sin(ang)];
  }

  function paintMarker(m, rooms) {
    // el pin resume lo visible: número = mejor ranking entre las salas que pasan el filtro,
    // color = categoría de esa sala, badge = cuántas salas hay dentro (solo si más de una)
    const { node, g } = m;
    const best = bestOf(rooms);
    const keep = [...node.classList].filter(c => c.startsWith('maplibregl')).join(' '); // clases de MapLibre: posicionan el marcador
    node.className = keep + ' mk' + (!best.rank ? ' is-plain' : '') + (best.rank && best.rank <= 10 ? ' is-top10' : '')
      + (best.extra ? ' is-extra' : '') + (rooms.length > 1 ? ' is-multi' : '') + (rooms.every(isDone) ? ' is-done' : '') + ((state.sel && rooms.some(r => r.id === state.sel)) || state.openLocal === g.id ? ' is-sel' : '');
    node.style.setProperty('--mk', catVar(best.cat));
    // local con varias salas: un segundo disco apilado detrás (sin cifra, para no confundir con el puesto)
    node.innerHTML = (rooms.length > 1 ? '<div class="mk-stack"></div>' : '')
      + (best.rank ? `<div class="mk-pin">${best.rank}</div>` : '<div class="mk-dot"></div>');
    node.setAttribute('aria-label', `${g.local}, ${g.municipio}: ${rooms.length} ${rooms.length === 1 ? 'sala' : 'salas'}${best.rank ? `, mejor puesto nº ${best.rank}` : ''}`);
  }

  function buildMarkers() {
    if (state.markers.size) return; // idempotente: evita duplicar si 'load' y el fallback coinciden
    const byPos = new Map();
    state.groups.forEach(g => {
      const key = `${g.lat.toFixed(4)},${g.lon.toFixed(4)}`;
      const i = byPos.get(key) ?? 0; byPos.set(key, i + 1);
      const node = el('div', 'mk');
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      const open = e => { e.stopPropagation(); openGroup(g.id, true); };
      node.addEventListener('click', open);
      node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
      const mk = new maplibregl.Marker({ element: node, anchor: 'center' })
        .setLngLat(jitter(g, i)).addTo(state.map);
      const m = { mk, node, g };
      paintMarker(m, g.rooms);
      state.markers.set(g.id, m);
    });
    render();
  }

  /* ---------------- render ---------------- */
  function render() {
    const visible = state.rooms.filter(r => matches(r));
    const vis = new Set(visible.map(r => r.id));
    state.markers.forEach(m => {
      const rooms = m.g.rooms.filter(r => vis.has(r.id));
      m.node.style.display = rooms.length ? '' : 'none';
      if (rooms.length) paintMarker(m, rooms);
    });
    const nr = visible.filter(r => r.rank).length;
    const nSin = visible.filter(r => !hasPos(r)).length;
    const nLoc = new Set(visible.filter(hasPos).map(r => r.gid)).size;
    $('#counter').innerHTML = `<span id="counterN">${visible.length}</span> salas · ${nLoc} locales${nr ? ` · ${nr} puntuadas` : ''}${nSin ? ` · <span class="counter-warn">${nSin} sin ubicar</span>` : ''}${state.f.dif && !state.f.noDif ? ` · <button class="counter-link" id="showNoDif">+${state.rooms.filter(r => !r.dif && matches(r, { ...state.f, dif: '' })).length} sin dificultad publicada</button>` : ''}`;
    const snd = $('#showNoDif'); if (snd) snd.onclick = () => { state.f.noDif = true; buildQChips(); render(); };
    renderList(visible);
    if (state.sel && !vis.has(state.sel)) closeSheet();
    else if (state.openLocal && openEl === '#sheet' && !state.sel) {
      const g = state.groups.find(x => x.id === state.openLocal);
      const rooms = g.rooms.filter(r => vis.has(r.id));
      rooms.length ? ($('#sheetBody').innerHTML = groupHTML(g, rooms), bindGroupCards(g)) : closeSheet();
    }
  }


  // El campo `porque` de data.json guarda el desglose numérico (uso interno). En la ficha solo se
  // publica QUÉ se tiene en cuenta, sin puntuaciones ni pesos (decisión del 26/09).
  function whyText(r) {
    const p = String(r.porque || '');
    const parts = [];
    const rec = p.match(/Reconocimiento[^→]*→\s*(.+?)\.\s*Reseñas/);
    if (rec) {
      const srcs = rec[1].split(',').map(s => s.replace(/\s*[\d.,]+\s*$/, '').trim()).filter(Boolean);
      if (srcs.length) parts.push(`reconocimiento del sector (${srcs.join(', ')})`);
    }
    const rev = p.match(/\(([\d.,]+)\s*ponderado sobre\s*(\d+)\s*reseñas?\)/);
    if (rev) parts.push(`reseñas contrastadas (${rev[1].replace('.', ',')} de media ponderada sobre ${nf(Number(rev[2]))})`);
    else if (r.rpond && r.rn) parts.push(`reseñas contrastadas (${String(r.rpond).replace('.', ',')} sobre ${nf(r.rn)})`);
    if (r.dur) parts.push(`duración (${r.dur} min)`);
    if (r.jmax) parts.push(`comodidad para grupos (hasta ${r.jmax} jugadores)`);
    if (!parts.length) return '';
    const s = parts.join('; ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  function pill(txt, cls) { return txt ? `<span class="pill ${cls || ''}">${esc(txt)}</span>` : ''; }

  function renderList(visible) {
    const wrap = $('#list'); wrap.innerHTML = '';
    const pend = visible.filter(r => r.rank).sort((a, b) => a.rank - b.rank);
    const done = visible.filter(r => !r.rank).sort((a, b) => a.sala.localeCompare(b.sala, 'es'));

    const nTop = state.rooms.filter(r => r.rank).length;
    const nExtra = state.rooms.filter(r => !r.rank).length;
    const counts = {}; state.rooms.forEach(r => counts[r.cat] = (counts[r.cat] || 0) + 1);
    const tiles = Object.keys(CATS).filter(k => counts[k]).sort((a, b) => counts[b] - counts[a]).map(k =>
      `<button class="cat-tile${state.cat === k ? ' is-active' : ''}" data-cat="${esc(k)}" style="--mk:${catVar(k)}">
         <img src="${catImg(k, true)}" alt="" loading="lazy" decoding="async" />
         <span class="cat-tile-txt"><strong>${esc(CATS[k].label)}</strong><small>${counts[k]} ${counts[k] === 1 ? 'sala' : 'salas'}</small></span>
       </button>`).join('');
    const nDone = state.rooms.filter(isDone).length;
    const head = el('div', 'list-head', `
      <div class="rk-head">
        <div class="rk-title">
          <h2>El ranking</h2>
          <p>Las ${nTop} salas más recomendadas de la provincia, ordenadas. Las otras ${nExtra} del inventario van debajo, sin número.</p>
        </div>
        <div class="played${nDone ? ' has-some' : ''}">
          <div class="played-txt">
            <strong>${nDone ? `Has jugado ${nDone} · te quedan ${state.rooms.length - nDone}` : 'Marca las que ya has jugado'}</strong>
            <span>${nDone ? 'Se guardan en este navegador. ' : 'Abre una sala y pulsa «Ya la he jugado»: '}Así descubres las que te quedan por hacer.</span>
          </div>
          <label class="switch"><input type="checkbox" id="hideDone"${state.hideDone ? ' checked' : ''}${nDone ? '' : ' disabled'} /><span class="switch-ui" aria-hidden="true"></span>Ocultar jugadas</label>
        </div>
      </div>
      <div class="cat-grid" id="catGrid">${tiles}</div>`);
    wrap.appendChild(head);
    const hd = head.querySelector('#hideDone'); if (hd) hd.onchange = () => { setHideDone(hd.checked); render(); };
    head.querySelectorAll('.cat-tile').forEach(t => t.onclick = () => {
      state.cat = state.cat === t.dataset.cat ? 'all' : t.dataset.cat; closePop(); buildChips(); buildQChips(); render();
    });

    if (!pend.length && !done.length) {
      wrap.appendChild(el('div', 'empty', '<strong>Sin resultados</strong>Prueba a relajar algún filtro.'));
      return;
    }
    pend.forEach(r => wrap.appendChild(card(r)));
    // puestos vacantes: salas cerradas que conservan su número hasta la próxima edición del ranking
    // (solo cuando se ve el ranking completo, para no confundir con los filtros)
    if (pend.length === nTop) {
      state.data.rank.filter(r => r.rank && r.estado === 'Cerrado').forEach(r => {
        const hole = el('div', 'card card-hole', `<div class="card-n">${r.rank}</div>
          <div class="card-main">
            <div class="card-title">Puesto vacante</div>
            <div class="card-sub">${esc(r.sala)} · ${esc(r.local)} · cerrada${r.estado_ev ? ` — ${esc(r.estado_ev)}` : ''}. Se mantiene el número hasta la próxima edición del ranking.</div>
          </div>`);
        const next = [...wrap.querySelectorAll('.card')].find(c => !c.classList.contains('card-hole') && Number(c.querySelector('.card-n').textContent) > r.rank);
        next ? wrap.insertBefore(hole, next) : wrap.appendChild(hole);
      });
    }
    if (done.length) {
      wrap.appendChild(el('div', 'list-sep', `<span>Resto del inventario (${done.length})</span>`));
      done.forEach(r => wrap.appendChild(card(r)));
    }
    wrap.appendChild(el('div', 'list-foot', `<strong>¿Falta tu escape room?</strong><span>Si tienes una sala que no está en el mapa o ves un dato que no cuadra, cuéntanoslo: lo revisamos a mano.</span><a class="btn-gold" href="/contacto/">Escríbenos →</a>`));
  }

  function card(r) {
    const b = el('button', 'card' + (!r.rank ? ' is-plain' : '') + (isDone(r) ? ' is-done' : ''));
    b.style.setProperty('--mk', catVar(r.cat));
    const price = r.pmin != null ? `${fmtPrice(r)} /pers.` : null;
    b.innerHTML = `<div class="card-n">${r.rank || '·'}</div>
      <img class="card-img" src="${catImg(r.cat, true)}" alt="" loading="lazy" decoding="async" />
      <div class="card-main">
        <div class="card-title">${esc(r.sala)}</div>
        <div class="card-sub">${esc(r.local)} · ${esc(r.municipio)}</div>
        <div class="card-meta">
          ${pill(r.cat, 'pill--cat')}
          ${r.jmin != null ? pill(`${r.jmin}-${r.jmax} jug.`) : ''}
          ${r.dur ? pill(`${r.dur} min`) : ''}
          ${price ? pill(price) : ''}
          ${r.dif ? pill(r.dif) : ''}
          ${r.rpond && r.rn ? pill(`★ ${String(r.rpond).replace('.', ',')} (${nf(r.rn)})`) : ''}
          ${r.premios ? pill('Premiada', 'pill--gold') : ''}
          ${r.extra ? pill('51+', 'pill--extra') : ''}
          ${isDone(r) ? pill('✓ Jugada', 'pill--done') : ''}
          ${!hasPos(r) ? pill('Ubicación no confirmada', 'pill--warn') : ''}
        </div>
      </div>`;
    b.onclick = () => { setView('map'); select(r.id, true); };
    return b;
  }

  function fmtPrice(r) {
    const f = n => `${String(n).replace('.', ',')} €`;
    if (r.pmin != null && r.pmax != null && r.pmax !== r.pmin) return `${f(r.pmin)}-${f(r.pmax)}`;
    return f(r.pmin ?? r.pmax);
  }

  /* ---------------- ficha ---------------- */
  function select(id, fly) {
    state.sel = id;
    const r = state.rooms.find(x => x.id === id);
    state.markers.forEach(m => m.node.classList.toggle('is-sel', m.g.id === r.gid));
    if (fly && hasPos(r)) flyTo(r.lon, r.lat);
    const g = r.gid ? state.groups.find(x => x.id === r.gid) : null;
    const siblings = g ? g.rooms.filter(x => x.id !== r.id && matches(x)) : [];
    const back = siblings.length
      ? `<button class="d-back" type="button" id="dBack">← ${esc(g.local)} · ${siblings.length + 1} salas</button>` : '';
    $('#sheetBody').innerHTML = back + detailHTML(r);
    const dd = $('#sheetBody .d-done'); if (dd) dd.onclick = () => { toggleDone(r.id); render(); if (state.sel === r.id) select(r.id, false); };
    if (siblings.length) $('#dBack').onclick = () => openGroup(g.id, false);
    openSheet('#sheet');
  }

  function flyTo(lon, lat) {
    const wide = innerWidth >= 860;
    state.map.easeTo({ center: [lon, lat], zoom: Math.max(state.map.getZoom(), 13.6), duration: 620,
      padding: wide ? { right: 460, top: 0, bottom: 0, left: 0 } : { bottom: Math.round(innerHeight * 0.45), top: 0, left: 0, right: 0 } });
  }

  /* ---------------- panel de local ---------------- */
  function openGroup(gid, fly) {
    const g = state.groups.find(x => x.id === gid);
    const rooms = g.rooms.filter(r => matches(r));
    if (!rooms.length) return;
    if (rooms.length === 1) { select(rooms[0].id, fly); return; } // una sola sala visible: directo a la ficha
    state.sel = null; state.openLocal = gid;
    state.markers.forEach(m => m.node.classList.toggle('is-sel', m.g.id === gid));
    if (fly) flyTo(g.lon, g.lat);
    $('#sheetBody').innerHTML = groupHTML(g, rooms);
    bindGroupCards(g);
    openSheet('#sheet');
  }

  function groupHTML(g, rooms) {
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
    const hidden = g.rooms.length - rooms.length;
    const cats = [...new Set(rooms.map(r => r.cat))];
    const zl = zonaLabel(rooms[0]);
    return `
      <div class="d-eyebrow">${pill(`${g.rooms.length} ${g.rooms.length === 1 ? 'sala' : 'salas'}`, 'pill--gold')}${cats.map(c => `<span class="pill pill--cat" style="--mk:${catVar(c)}">${esc(c)}</span>`).join('')}</div>
      <h2 class="d-title">${esc(g.local)}</h2>
      <div class="d-local">${esc(g.municipio)}${zl ? ` · ${esc(zl)}` : ''}</div>
      ${g.dir ? `<p class="d-addr">${esc(g.dir)}</p>` : ''}
      ${g.web ? `<p class="d-web">Web del local: <a href="${esc(g.web)}" target="_blank" rel="noopener">${esc(host(g.web))}</a></p>` : ''}
      <div class="g-list" id="gList"></div>
      ${hidden ? `<p class="d-gaps">${hidden} ${hidden === 1 ? 'sala más de este local no cumple' : 'salas más de este local no cumplen'} los filtros activos.</p>` : ''}`;
  }
  function bindGroupCards(g) {
    const box = $('#gList'); if (!box) return;
    const rooms = g.rooms.filter(r => matches(r));
    const ranked = rooms.filter(r => r.rank).sort((a, b) => a.rank - b.rank);
    const rest = rooms.filter(r => !r.rank).sort((a, b) => a.sala.localeCompare(b.sala, 'es'));
    [...ranked, ...rest].forEach(r => { const c = card(r); c.onclick = () => select(r.id, false); box.appendChild(c); });
  }

  function cell(dt, dd, small) {
    if (dd == null || dd === '') return '';
    return `<div class="d-cell"><dt>${esc(dt)}</dt><dd>${esc(dd)}${small ? `<small>${esc(small)}</small>` : ''}</dd></div>`;
  }

  function detailHTML(r) {
    const dif = r.dif || null;
    const difSmall = [r.dif_raw && r.dif_raw !== r.dif ? `publicada como «${r.dif_raw}»` : '',
                      r.edad ? `edad ${r.edad}` : ''].filter(Boolean).join(' · ');
    const rating = r.rpond ? `★ ${String(r.rpond).replace('.', ',')} / 5` : null;
    const ratingSmall = r.rmodo === 'ponderado'
      ? `nota ponderada sobre ${nf(r.rn)} reseñas${r.robs ? ` (media bruta ${String(r.robs.toFixed(2)).replace('.', ',')})` : ''}`
      : 'sin reseñas suficientes: se le asigna la media del sector';
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((r.dir || `${r.local} ${r.municipio}`) + ', España')}`;
    const cells = [
      cell('Precio p.p.', r.pmin != null ? fmtPrice(r) : null, r.ptxt),
      cell('Jugadores', r.jmin != null ? `${r.jmin}-${r.jmax}` : null),
      cell('Duración', r.dur ? `${r.dur} min` : null),
      cell('Dificultad', dif, difSmall),
      cell('Valoración', rating, ratingSmall),
      cell('Estado', r.estado === 'Abierto' ? 'En funcionamiento' : (r.estado && r.estado !== 'n.a.' ? r.estado : null),
           r.estado === 'Abierto' ? (r.estado_ev || 'reservas activas en su web') : null),
      cell('Año', r.anio ? `${r.anio}${r.anio_aprox ? ' (aprox.)' : ''}` : null),
      cell('Actores', r.actores === true ? 'Sí, en directo' : (r.actores === false ? 'No' : null)),
      cell('Idiomas', r.idiomas)
    ].filter(Boolean).join('');

    const precLabel = { exact: 'Portal exacto verificado', portal: 'Portal verificado', street: 'Precisión de calle', city: 'Ubicación no confirmada: no aparece en el mapa hasta verificar sus coordenadas' }[r.prec] || null;

    return `
      <div class="d-eyebrow">
        <span class="d-rank${!r.rank ? ' is-plain' : ''}" style="--mk:${catVar(r.cat)}">${r.rank || '·'}</span>
        <span class="pill pill--cat" style="--mk:${catVar(r.cat)}">${esc(r.cat || '—')}</span>

        ${r.extra ? pill('Fuera del top 50', 'pill--extra') : ''}
        ${r.lejana ? pill('Fuera del radio de 20 min') : ''}
        ${!hasPos(r) ? pill('Ubicación no confirmada', 'pill--warn') : ''}
      </div>
      <h2 class="d-title">${esc(r.sala)}</h2>
      <div class="d-local">${esc(r.local)} · ${esc(r.municipio)}${zonaLabel(r) ? ` · ${esc(zonaLabel(r))}` : ''}</div>
      ${r.tema ? `<p class="d-tema">${esc(r.tema)}</p>` : ''}
      ${r.porque && r.rank && whyText(r) ? `<div class="d-why"><strong>Qué cuenta para su puesto ${r.rank}</strong>${esc(whyText(r))}</div>` : ''}
      <button type="button" class="d-done${isDone(r) ? ' is-on' : ''}" data-done="${esc(r.id)}"><span class="d-done-ic" aria-hidden="true">✓</span>${isDone(r) ? 'Ya la has jugado · quitar marca' : 'Ya la he jugado'}</button>
      <dl class="d-grid">${cells}</dl>
      ${r.premios ? `<div class="d-sec"><h3>Reconocimientos</h3><p>${esc(r.premios)}</p></div>` : ''}
      <div class="d-sec">
        <h3>Ubicación</h3>
        <p class="d-addr">${esc(r.dir || 'Dirección exacta no publicada por el local')}</p>
        ${precLabel ? `<p class="d-prec">${esc(precLabel)}${r.geo_ref && r.prec !== 'exact' ? ` · referencia: ${esc(r.geo_ref)}` : ''}</p>` : ''}
      </div>
      <div class="d-actions">
        ${r.web_sala ? `<a class="btn btn-primary" href="${esc(r.web_sala)}" target="_blank" rel="noopener">Reservar esta sala</a>`
          : (r.web ? `<a class="btn btn-primary" href="${esc(r.web)}" target="_blank" rel="noopener">Web oficial</a>` : '')}
        <a class="btn" href="${esc(gmaps)}" target="_blank" rel="noopener">Cómo llegar</a>
      </div>
      ${r.web ? `<p class="d-web">Web del local: <a href="${esc(r.web)}" target="_blank" rel="noopener">${esc(host(r.web))}</a>${r.url && r.url !== r.web ? ` · ficha: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(host(r.url))}</a>` : ''}</p>`
        : (r.url ? `<p class="d-web">El local no publica web propia · ficha: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(host(r.url))}</a></p>` : '')}
      ${r.fuentes?.length ? `<div class="d-src"><h3>Fuentes contrastadas</h3><ol>${r.fuentes.map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, '').slice(0, 68))}</a></li>`).join('')}</ol></div>` : ''}
      ${r.faltan?.length ? `<p class="d-gaps">Datos que el local no publica: ${esc(r.faltan.map(gapLabel).join(', '))}.</p>` : ''}`;
  }

  /* ---------------- sheets ---------------- */
  let openEl = null;
  function openSheet(sel) {
    if (openEl && openEl !== sel) $(openEl).hidden = true;
    openEl = sel; $(sel).hidden = false; $('#scrim').hidden = false;
    $(sel).querySelector('.sheet-body').scrollTop = 0;
  }
  function closeAll() { if (openEl) $(openEl).hidden = true; openEl = null; $('#scrim').hidden = true; }
  function closeSheet() {
    closeAll(); state.sel = null; state.openLocal = null;
    state.markers.forEach(({ node }) => node.classList.remove('is-sel'));
  }
  $('#scrim').onclick = () => { if (openEl === '#sheet') closeSheet(); else closeAll(); };
  $('#sheetClose').onclick = closeSheet;
  $('#legendClose').onclick = closeAll;
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.pop) { closePop(); return; }
    openEl === '#sheet' ? closeSheet() : closeAll();
  });

  // arrastrar hacia abajo para cerrar (móvil)
  document.querySelectorAll('.sheet').forEach(sheet => {
    let y0 = null;
    const grab = sheet.querySelector('.sheet-grab');
    grab.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
    grab.addEventListener('touchmove', e => {
      if (y0 == null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    grab.addEventListener('touchend', e => {
      const dy = (e.changedTouches[0].clientY - (y0 ?? 0));
      sheet.style.transform = '';
      if (dy > 90) { sheet.id === 'sheet' ? closeSheet() : closeAll(); }
      y0 = null;
    });
  });

  /* ---------------- vistas ---------------- */
  function setView(v) {
    state.view = v;
    $('#mapWrap').hidden = v !== 'map';
    $('#listView').hidden = v !== 'list';
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
    if (v === 'map' && state.map) state.map.resize();
  }
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => setView(t.dataset.view));

  /* ---------------- chips ---------------- */
  function buildChips() {
    const counts = {};
    state.rooms.forEach(r => counts[r.cat] = (counts[r.cat] || 0) + 1);
    const box = $('#chips'); box.innerHTML = '';
    const mk = (key, label, color) => {
      const c = el('button', 'chip' + (state.cat === key ? ' is-active' : ''),
        `${color ? `<span class="dot" style="--dot:${color}"></span>` : ''}${esc(label)}`);
      c.onclick = () => { state.cat = key; closePop(); buildChips(); buildQChips(); render(); };
      box.appendChild(c);
    };
    mk('all', 'Todas');
    Object.keys(CATS).filter(k => counts[k]).sort((a, b) => counts[b] - counts[a])
      .forEach(k => mk(k, `${CATS[k].label} ${counts[k]}`, catVar(k)));
  }

  /* ------------- filtros rápidos (segunda fila) ------------- */
  const QF = [
    {
      key: 'zona', label: 'Zona', hint: 'Comarca del local.',
      opts: [['', 'Toda la provincia']], short: v => v
    },
    {
      key: 'players', label: 'Jugadores', hint: 'Solo salas donde ese grupo entra dentro del mínimo y el máximo.',
      opts: [[0, 'Cualquiera'], [2, '2 personas'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7'], [8, '8 o más']],
      short: v => (v === 8 ? '8+' : `${v}`) + ' pers.'
    },
    {
      key: 'dif', label: 'Dificultad', hint: '',
      opts: [['', 'Cualquiera'], ['Fácil', 'Fácil'], ['Media', 'Media'], ['Media-Alta', 'Media-Alta'], ['Alta', 'Alta'], ['Muy alta', 'Muy alta']],
      short: v => v
    }
  ];

  function buildQChips() {
    const box = $('#qchips'); box.innerHTML = '';
    QF.forEach(def => {
      const on = state.f[def.key] !== DEF_F[def.key];
      const c = el('button', 'chip chip--f' + (on ? ' is-on' : ''),
        `${esc(on ? def.short(state.f[def.key]) : def.label)}<svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>`);
      c.setAttribute('aria-expanded', state.pop === def.key ? 'true' : 'false');
      c.onclick = e => { e.stopPropagation(); togglePop(def, c); };
      box.appendChild(c);
    });
    if (activeFilterCount() || state.cat !== 'all' || state.q) {
      const cl = el('button', 'chip chip--clear', 'Limpiar');
      cl.onclick = e => { e.stopPropagation(); closePop(); resetFilters(); };
      box.appendChild(cl);
    }
  }

  function closePop() {
    state.pop = null;
    $('#pop').hidden = true;
    $('#qchips').querySelectorAll('.chip--f').forEach(c => c.setAttribute('aria-expanded', 'false'));
  }

  function togglePop(def, chip) {
    if (state.pop === def.key) { closePop(); return; }
    state.pop = def.key;
    const pop = $('#pop');
    $('#popTitle').textContent = def.label;
    $('#popHint').textContent = def.hint;
    const box = $('#popOpts'); box.innerHTML = '';
    def.opts.forEach(([v, lab]) => {
      const n = countWith(def.key, v);
      const sel = state.f[def.key] === v;
      const b = el('button', 'pop-opt' + (sel ? ' is-sel' : '') + (n === 0 && !sel ? ' is-void' : ''),
        `<span>${esc(lab)}</span><em>${n}</em>`);
      b.onclick = () => {
        state.f[def.key] = v;
        if (def.key === 'dif' && !v) state.f.noDif = false;
        closePop(); buildQChips(); render();
      };
      box.appendChild(b);
    });
    if (def.key === 'dif') {
      const nd = state.rooms.filter(r => !r.dif && matches(r, { ...state.f, dif: '' })).length;
      const t = el('button', 'pop-opt pop-opt--toggle' + (state.f.noDif ? ' is-sel' : ''),
        `<span>Mostrar también las que no publican dificultad</span><em>${nd}</em>`);
      t.onclick = () => { state.f.noDif = !state.f.noDif; closePop(); buildQChips(); render(); };
      box.appendChild(t);
    }
    pop.hidden = false;
    // alinear con el chip sin salirse de la pantalla
    const r = chip.getBoundingClientRect();
    const w = pop.offsetWidth;
    const left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${r.bottom + 6}px`;
    $('#qchips').querySelectorAll('.chip--f').forEach(c => c.setAttribute('aria-expanded', 'false'));
    chip.setAttribute('aria-expanded', 'true');
  }

  addEventListener('click', e => {
    if (state.pop && !e.target.closest('#pop') && !e.target.closest('#qchips')) closePop();
  });
  addEventListener('resize', closePop);

  /* ---------------- buscador ---------------- */
  $('#search').oninput = e => { state.q = e.target.value.trim().toLowerCase(); buildQChips(); render(); };

  /* ---------------- filtros ---------------- */
  $('#btnLegend').onclick = () => openSheet('#legend');
  function resetFilters() {
    state.f = { ...DEF_F };
    state.cat = 'all'; state.q = '';
    $('#search').value = '';
    buildChips(); buildQChips(); render();
  }

  /* ---------------- leyenda ---------------- */
  function buildLegend(meta) {
    const counts = {};
    state.rooms.forEach(r => counts[r.cat] = (counts[r.cat] || 0) + 1);
    $('#legendCats').innerHTML = Object.keys(CATS).filter(k => counts[k])
      .map(k => `<div class="lg-item"><span class="lg-swatch" style="background:${catVar(k)}"></span>${esc(CATS[k].label)} (${counts[k]})</div>`).join('');
    $('#legendNote').textContent = `Datos contrastados el ${meta.generado} sobre un inventario de ${meta.total} salas físicas del área de Barcelona (sin VR, sin online y sin juegos al aire libre). Cada marcador es un local: el número es el mejor puesto de sus salas y la cifra pequeña, cuántas salas tiene. Las coordenadas se han verificado portal a portal con el geocodificador oficial de CartoCiudad (IGN); las salas cuya dirección no está confirmada no se pintan en el mapa y aparecen en la lista como «Ubicación no confirmada».`;
  }

  /* ---------------- arranque ---------------- */
  const sk = el('div', 'skeleton', '<div class="sk-inner"><div class="sk-dots"><i></i><i></i><i></i></div>Cargando salas…</div>');
  sk.id = 'sk'; $('#mapWrap').appendChild(sk);

  // data.js (cargado como script) permite abrir el archivo con doble clic; data.json queda como respaldo
  const load = window.ESCAPE_DATA ? Promise.resolve(window.ESCAPE_DATA) : fetch('/data.json?v=2').then(r => r.json());
  load.then(d => {
    state.data = d;
    // las salas con estado 'Cerrado' se conservan en data.json como historial pero no se publican
    state.rooms = [...d.rank, ...d.otras].filter(r => r.estado !== 'Cerrado');
    buildGroups();
    const qcat = new URLSearchParams(location.search).get('cat'); if (qcat && CATS[qcat]) state.cat = qcat;
    $('#lgN').textContent = state.rooms.filter(r => r.rank).length; $('#lgX').textContent = state.rooms.filter(r => !r.rank).length;
    const sinDif = state.rooms.filter(r => !r.dif).length;
    const qdif = QF.find(x => x.key === 'dif');
    qdif.hint = `${sinDif} de las ${state.rooms.length} salas no publican dificultad; puedes añadirlas a la vista con la última opción.`;
    const niveles = new Set(state.rooms.map(r => r.dif).filter(Boolean));
    qdif.opts = [['', 'Cualquiera'], ...['Fácil', 'Media', 'Media-Alta', 'Alta', 'Muy alta'].filter(v => niveles.has(v)).map(v => [v, v])];
    const qz = QF.find(x => x.key === 'zona');
    const zc = {}; state.rooms.forEach(r => { if (r.comarca) zc[r.comarca] = (zc[r.comarca] || 0) + 1; });
    qz.opts = [['', 'Toda la provincia'], ...Object.keys(zc).sort((a, b) => zc[b] - zc[a]).map(z => [z, z])];
    buildChips(); buildQChips(); buildLegend(d.meta); applyTheme();
    render(); // el ranking no depende del mapa: si las teselas fallan, la lista sigue estando
    initMap();
    // red de seguridad: si el mapa no emite 'load' (teselas bloqueadas o sin WebGL)
    setTimeout(() => { if (!state.markers.size && state.map) { $('#sk')?.remove(); try { buildMarkers(); } catch (e) { console.error(e); } } }, 9000);
  }).catch(err => {
    console.error('Fallo al arrancar el mapa:', err);
    $('#sk').innerHTML = '<div class="sk-inner">No se han podido cargar los datos. Recarga la página.</div>';
  });

  // Linterna: el halo de la cabecera sigue al puntero (solo con ratón; en táctil queda fijo)
  if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    const tb = document.querySelector('.topbar');
    tb.addEventListener('pointermove', e => { const b = tb.getBoundingClientRect(); tb.style.setProperty('--mx', `${((e.clientX - b.left) / b.width * 100).toFixed(1)}%`); }, { passive: true });
  }
})();
