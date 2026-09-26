#!/usr/bin/env python3
"""Correcciones de datos confirmadas en fuente oficial (sept. 2026). Idempotente."""
import json, sys
p = sys.argv[1] if len(sys.argv) > 1 else 'data.json'
d = json.load(open(p, encoding='utf-8'))
rows = d['rank'] + d['otras']
log = []

# 1. Bizarre Escape Room: dirección confirmada en bizarrebcn.com. Sin coordenadas aún (pendiente CartoCiudad),
#    así que prec sigue en 'city' y la sala no se pinta en el mapa.
for r in rows:
    if r['local'] == 'Bizarre Escape Room' and not r['dir']:
        r['dir'] = 'Carrer de Blesa, 24, 08004 Barcelona'
        r['fuentes'] = list(dict.fromkeys((r.get('fuentes') or []) + ['https://bizarrebcn.com/']))
        log.append(f"dir Bizarre → {r['id']}")

# 2. Un solo local (misma dirección, misma web oficial): normalizar nombre.
NORM = {'Golden Pop / Addams House': 'Golden Pop', 'Elements Esplugues / Kenopsia Games': 'Elements Esplugues'}
for r in rows:
    if r['local'] in NORM:
        r['local_alt'] = r['local']; r['local'] = NORM[r['local']]
        log.append(f"local {r['local_alt']} → {r['local']} ({r['id']})")

# 3. Escape Barcelona: dos locales confirmados (escapebarcelona.com/contacto.php). La zona sigue a la dirección.
for r in rows:
    if r['local'] == 'Escape Barcelona' and 'Baró' in (r['dir'] or '') and 'Moragas' in (r['zona'] or ''):
        r['zona'] = 'Santa Coloma (local Baró)'; log.append(f"zona → local Baró ({r['id']})")


# ---------- Correcciones del 25/09/2026 (verificadas por el usuario en webs oficiales) ----------
EV = 'comprobado en web oficial, sept. 2026'
def setpos(r, lat, lon, ref):
    r['lat'], r['lon'], r['prec'], r['geo_ref'] = lat, lon, 'exact', ref
for r in rows:
    # The Hive: portal geocodificado con CartoCiudad
    if r['local'] == 'The Hive Escape Room' and r['prec'] == 'city':
        setpos(r, 41.407412, 2.176952, 'CALLE CASTILLEJOS 287, 08025 Barcelona'); log.append(f"coords The Hive ({r['id']})")
    # 26/09 (noche): las dos salas «sin ubicar», geocodificadas con CartoCiudad (portal) desde la web oficial de cada local
    if r['id'] == 'cubick-escapafantasmas' and r['prec'] == 'city':
        r['dir'] = 'Ronda de Mossèn Jacint Verdaguer, 69, 08302 Mataró'
        setpos(r, 41.544896, 2.437125, 'RONDA MOSSEN JACINT VERDAGUER 69, 08302 Mataró'); r['prec'] = 'portal'
        r['web'] = r.get('web') or 'https://mataro.cubickroomescape.es/escapafantasmas/'
        log.append(f"coords Escapafantasmas ({r['id']}) · mataro.cubickroomescape.es")
    if r['id'] == 'odisea-la-mansion' and r['prec'] == 'city':
        r['dir'] = 'Carrer de la Volta, 233, 08224 Terrassa'
        setpos(r, 41.561593, 1.999472, 'CALLE VOLTA 233, 08224 Terrassa'); r['prec'] = 'portal'
        r['web'] = r.get('web') or 'https://www.odiseaescape.com/'
        log.append(f"coords La Mansión Odisea ({r['id']}) · odiseaescape.com")
    # Bizarre: portal geocodificado; Backstab confirmada en bizarrebcn.com
    if r['local'] == 'Bizarre Escape Room' and r['prec'] == 'city':
        setpos(r, 41.372410, 2.168017, 'CALLE BLESA 24, 08004 Barcelona'); r['web'] = r.get('web') or 'https://bizarrebcn.com/'
        r['estado'], r['estado_ev'] = 'Abierto', 'sala listada en bizarrebcn.com (sept. 2026)'; log.append(f"coords Bizarre ({r['id']})")
    if r['id'] == 'bizarre-backstab': r['web'] = 'https://bizarrebcn.com/backstab-escape-room'
    # Elements Fuego: El Cetro de Fuego pasa a llamarse El Faraón (mismo puesto, mismo local)
    if r['sala'] == 'El Cetro de Fuego':
        r['sala_alt'] = r['sala']; r['sala'] = 'El Faraón'; r['estado_ev'] = 'renombrada; ' + EV; log.append('Cetro → El Faraón')
    # Insomnia: la web (insomniacorp.com) solo da Drecera de Queralt; El Cóctel del Doctor se ubica allí
    if r['local'].startswith('Insomnia') and 'Cóctel' in r['sala']:
        r['dir'] = 'Drecera de Queralt, s/n, 08600 Berga'; r['web'] = 'https://insomniacorp.com/'; log.append('Insomnia Cóctel → Queralt')
    if r['local'].startswith('Insomnia') and not r.get('web'): r['web'] = 'https://insomniacorp.com/'
    # Maximum Escape: en 2026 solo opera Girona 27; Trafalgar 17, Bruc 9 y salas sin local no son reservables
    if r['local'].startswith('Maximum Escape') and 'Girona, 27' not in (r['dir'] or ''):
        r['estado'], r['estado_ev'] = 'Cerrado', 'no aparece en el calendario de reservas de maximumescape.com (sept. 2026)'; log.append(f"Maximum cerrada: {r['sala']}")
    # Refugio 27 (Maximum Escape, Girona 27) tampoco está en el calendario de reservas (captura del usuario, 25/09/2026)
    if r['local'] == 'Maximum Escape 1' and r['sala'] == 'Refugio 27':
        r['estado'], r['estado_ev'] = 'Cerrado', 'no aparece en el calendario de reservas de maximumescape.com (sept. 2026)'; log.append('Refugio 27 cerrada')
    # Horror Box: la web ya no lista Catalepsia
    if r['local'] == 'Horror Box' and r['sala'] == 'Catalepsia':
        r['estado'], r['estado_ev'] = 'Cerrado', 'no aparece en la web oficial (sept. 2026)'; log.append('Catalepsia cerrada')
    if r['local'].startswith('Fugitivos'): r['web'] = 'https://fugitivosroomescape.com/'
    # Categorías: Misterio + Thriller + Atraco → Thriller/Misterio (decisión del 25/09/2026)
    if r['cat'] in ('Misterio', 'Thriller', 'Atraco'):
        r['cat_alt'] = r['cat']; r['cat'] = 'Thriller/Misterio'

# ---------- Estado confirmado por el usuario el 25/09/2026 (calendario de reservas activo en la web oficial) ----------
EV2 = 'calendario de reservas activo en la web oficial, comprobado por el usuario el 25/09/2026'
OK_LOCALES = ('Criogenic Barcelona', 'Unreal Vilapicina', 'Vortex', 'Rowka')
for r in rows:
    if (r['local'] in OK_LOCALES or (r['local'].startswith('Abduction ') and r['municipio'] == 'Badalona')) and r['estado'] != 'Abierto':
        r['estado'], r['estado_ev'] = 'Abierto', EV2; log.append(f"Abierto: {r['local']} / {r['sala']}")
    # Abduction: todas las salas de Badalona comparten web oficial (captura del calendario, 25/09/2026)
    if r['local'].startswith('Abduction ') and r['municipio'] == 'Badalona' and not r.get('web'):
        r['web'] = 'https://www.abduction.es/badalona/'

# ---------- Encargo 2 (25/09/2026): 94 locales cotejados por el usuario + 22 candidatas confirmadas ----------
# Ficheros en encargo2/: estados_2026-09-25.jsonl (por local: evidencia + estado por sala) y candidatas_2026-09-25.jsonl.
# Tipos: cal = calendario de reservas con horas · rev = reseñas recientes, sin calendario visible · null = sin confirmar · cer = cerrada.
import os, math
E2 = os.path.join(os.path.dirname(os.path.abspath(p)), 'encargo2')
FECHA2 = ' (comprobado por el usuario, 25/09/2026)'
PREF = {'cal': 'calendario de reservas activo. ', 'rev': 'reseñas recientes; sin calendario visible. ', 'null': 'sin confirmar: ', 'cer': ''}
if os.path.isdir(E2):
    byname = {}
    for r in rows: byname.setdefault((r['local'], r['sala']), []).append(r)
    faltan = []
    for line in open(os.path.join(E2, 'estados_2026-09-25.jsonl'), encoding='utf-8'):
        e = json.loads(line)
        for sala, tipo in e['salas'].items():
            rs = byname.get((e['local'], sala))
            if not rs: faltan.append(f"{e['local']} / {sala}"); continue
            for r in rs:
                nuevo = {'cal': 'Abierto', 'rev': 'Abierto', 'null': None, 'cer': 'Cerrado'}[tipo]
                if r['estado'] != nuevo: log.append(f"estado {r['estado']} → {nuevo}: {e['local']} / {sala}")
                r['estado'], r['estado_ev'] = nuevo, PREF[tipo] + e['ev'] + FECHA2
    if faltan: print('SIN EMPAREJAR:', faltan)
    # ---------- Correcciones del usuario el 26/09/2026 (capturas de pantalla) ----------
    FECHA3 = ' (captura aportada por el usuario, 26/09/2026)'
    BIZ = 'botón de reserva activo para Backstab, Circus, Toys y Moorder en bizarrebcn.com; sin calendario de horas visible'
    OV = {('Vortex', 'Apophis'): 'calendario de reservas activo. Calendario Escape Room Director de octubre de 2026 con días y horas disponibles en vortexescape.com',
          ('Bizarre Escape Room', 'Circus'): BIZ, ('Bizarre Escape Room', 'Backstab'): BIZ, ('Bizarre Escape Room', 'Moorder'): BIZ,
          ('Bizarre Escape Room', 'Toys'): BIZ + '; opinión ERL de 10/2025'}
    for (loc, sala), ev in OV.items():
        for r in byname.get((loc, sala), []):
            r['estado'], r['estado_ev'] = 'Abierto', ev + FECHA3; log.append(f"Abierto (26/09): {loc} / {sala}")
    # Maximum: el horario online (26/09/2026) solo lista Gángsters y La Mazmorra; Alkabán sigue en la web → sin confirmar; Oscuridad y Zen Room no aparecen → Cerrado.
    # candidatas: entran en "otras", sin puesto; nombre de local unificado con el ya mapeado a ≤50 m
    def dist(a, b, c, e_): return 6371000 * math.acos(min(1, math.sin(math.radians(a))*math.sin(math.radians(c)) + math.cos(math.radians(a))*math.cos(math.radians(c))*math.cos(math.radians(e_-b))))
    ids = {r['id'] for r in rows}
    plantilla = {k: None for k in d['otras'][0].keys()}
    for line in open(os.path.join(E2, 'candidatas_2026-09-25.jsonl'), encoding='utf-8'):
        c = json.loads(line)
        if c['id'] in ids: continue
        c.pop('c2', None)
        if not c.get('rating'): c['rating'] = None
        if not c.get('rating_n'): c['rating_n'] = None
        if c['rating'] is None: c['rating_src'] = None
        c['estado_ev'] = c['estado_ev'] + FECHA2
        cerca = [r for r in rows if r.get('lat') and r['prec'] != 'city' and dist(c['lat'], c['lon'], r['lat'], r['lon']) <= 50 and r['local'][:6].lower() == c['local'][:6].lower()]
        if cerca and cerca[0]['local'] != c['local']:
            c['local_alt'], c['local'] = c['local'], cerca[0]['local']; log.append(f"candidata: local {c['local_alt']} → {c['local']}")
        mismo = [r for r in rows if r['municipio'] == c['municipio'] and r.get('zona_g')]
        c['zona_g'] = mismo[0]['zona_g'] if mismo else 'Resto de la provincia'
        c['lejana'] = mismo[0].get('lejana', True) if mismo else True
        c['coche'] = mismo[0].get('coche') if mismo else None
        c['zona'] = mismo[0].get('zona') if mismo else None
        rec = dict(plantilla); rec.update(c); rec['extra'] = False; rec['rank'] = None; rec['rvol'] = []; rec['faltan'] = [k for k in ('anio', 'dificultad', 'premios', 'actores', 'idiomas') if not rec.get(k)]
        d['otras'].append(rec); rows.append(rec); ids.add(rec['id']); log.append(f"candidata añadida: {rec['local']} / {rec['sala']}")
    d['meta']['total'] = len(rows); d['meta']['n_otras'] = len(d['otras']); d['meta']['generado'] = '2026-09-26'

# ---------- Edición 2 del ranking (26/09/2026, encargo 3): top 100 con las salas jugadas ----------
# Fuente: encargo3/top100_2026-09-26.jsonl (resultado del encargo 3, revisado por el usuario).
# Regla fijada el 26/09: Room Escapers = media de las notas de los reseñadores en la reseña de la sala
# (no el «Score» de la tabla de Barcelona). Los huecos 74 y 78 desaparecen: es una edición nueva.
import os as _os, re as _re
_E3 = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'encargo3', 'top100_2026-09-26.jsonl')
if _os.path.exists(_E3):
    _top = [json.loads(l) for l in open(_E3, encoding='utf-8') if l.strip()]
    _byid = {r['id']: r for r in rows}
    _new = {t['id']: t for t in _top}
    _URL10 = 'https://10escapes.com/ganadores25/'
    for r in rows:
        t = _new.get(r['id'])
        if not t:
            if r.get('rank'): log.append(f"ranking ed.2: sale del top 100 → {r['id']} (antes #{r['rank']})")
            r['rank'] = None
            continue
        r['rank'] = t['rank']
        porque = t['porque']
        m = _re.search(r'\((#\d+) en 2025, añadido\)', porque)
        if m:
            porque = _re.sub(r'\s*\(#\d+ en 2025, añadido\)', '', porque)
            extra = f"{m.group(1)} en la lista general de 10 Escapes 2025"
            if '10 Escapes' not in (r.get('premios') or ''):
                r['premios'] = ((r.get('premios') or '').rstrip('; ') + '; ' + extra).strip('; ')
            r['fuentes'] = list(dict.fromkeys((r.get('fuentes') or []) + [_URL10]))
        r['porque'] = porque
        ms = _re.match(r'Puntuación ([\d.]+)/100', porque)
        if ms: r['score'] = float(ms.group(1))
        if t.get('premios'):
            r['premios'] = t['premios']
            r['fuentes'] = list(dict.fromkeys(t.get('fuentes') or []))
        if isinstance(r.get('faltan'), list) and 'premios' in r['faltan'] and r.get('premios'):
            r['faltan'] = [x for x in r['faltan'] if x != 'premios']
    # estado confirmado por el usuario el 26/09/2026
    _OK = {'jug-brutal-hotel-hello', 'jug-fear-factory-el-orfanato', 'jug-unreal-gava-vikingos', 'jug-fear-escape-zombie-outbreak',
           'witching-hour-jugueteria-maldita', 'cadena-perpetua-evasion-campo-14', 'fear-factory-in'}
    for r in rows:
        if r['id'] in _OK and r.get('estado') != 'Abierto':
            r['estado'] = 'Abierto'; r['estado_ev'] = 'Sigue abierta: confirmado por el usuario el 26/09/2026.'
            log.append(f"estado Abierto (usuario 26/09) → {r['id']}")
        if r['id'] == 'jug-oniric-dia-d' and r.get('estado') != 'Cerrado':
            r['estado'] = 'Cerrado'; r['estado_ev'] = 'Cerrada: confirmado por el usuario el 26/09/2026.'
            log.append("estado Cerrado (usuario 26/09) → jug-oniric-dia-d")
    # Confirmación del usuario (26/09/2026, noche) de las 8 salas del top con estado null:
    _OK2 = {'cubick-scubick-doo', 'katharsis-hora-de-las-bestias', 'witching-hour-orient-express', 'la-clau-until-dawn'}
    _EV2 = {'insomnia-coctel-del-doctor': 'Sigue abierta (reserva con mucha antelación): confirmado por el usuario el 26/09/2026.',
            'odisea-evermore': 'Abierta: la web solo admite reservas a partir de enero de 2027 (comprobado por el usuario el 26/09/2026).'}
    _CERR2 = {'kidnapped-in-bcn-el-secuestro': 'Sin posibilidad de reservar: la web dice que están trabajando en Kidnapped in Bcn 2 (comprobado por el usuario el 26/09/2026).',
              'maximum-refugio-27': 'La sala sigue en la web del local pero no admite reservas (comprobado por el usuario el 26/09/2026).'}
    for r in rows:
        if r['id'] in _OK2 and r.get('estado') != 'Abierto':
            r['estado'] = 'Abierto'; r['estado_ev'] = 'Sigue abierta: confirmado por el usuario el 26/09/2026.'; log.append(f"estado Abierto → {r['id']}")
        if r['id'] in _EV2 and r.get('estado') != 'Abierto':
            r['estado'] = 'Abierto'; r['estado_ev'] = _EV2[r['id']]; log.append(f"estado Abierto → {r['id']}")
        if r['id'] in _CERR2 and r.get('estado') != 'Cerrado':
            r['estado'] = 'Cerrado'; r['estado_ev'] = _CERR2[r['id']]; log.append(f"estado Cerrado → {r['id']}")
    # Las cerradas salen del top y entran las siguientes por puntuación (Nathael 53,4 y Game-On 52,6, puntuación
    # de la edición 1, sin cambios en el encargo 3). Se renumera por puntuación; empate → conserva el orden previo.
    _ENTRAN = ['cubick-nathael', 'la-clau-game-on']
    _prev = {r['id']: r['rank'] for r in rows if r.get('rank')}
    _cand = [r for r in rows if (r.get('rank') or r['id'] in _ENTRAN) and r.get('estado') != 'Cerrado' and r.get('score')]
    _cand.sort(key=lambda r: (-r['score'], _prev.get(r['id'], 999)))
    for r in rows: r['rank'] = None
    for i, r in enumerate(_cand[:100], 1): r['rank'] = i
    # recolocar: d['rank'] = las 100 por puesto; el resto a d['otras']
    _all = rows
    d['rank'] = sorted([r for r in _all if r.get('rank')], key=lambda r: r['rank'])
    d['otras'] = [r for r in _all if not r.get('rank')]
    rows = d['rank'] + d['otras']
    d['meta']['n_rank'] = len(d['rank']); d['meta']['n_otras'] = len(d['otras']); d['meta']['total'] = len(rows)
    d['meta']['edicion'] = '2 (26/09/2026)'
    assert len(d['rank']) == 100 and [r['rank'] for r in d['rank']] == list(range(1, 101)), 'ranking ed.2 incompleto'
    log.append(f"ranking ed.2 aplicado: {len(d['rank'])} puestos")

# ---------- Comarca (asignación oficial de la Generalitat; geografía, no dato de sala) ----------
COMARCA = {
 'Barcelona':'Barcelonès','Badalona':'Barcelonès',"L'Hospitalet de Llobregat":'Barcelonès','Santa Coloma de Gramenet':'Barcelonès',
 'Mataró':'Maresme','Calella':'Maresme','Pineda de Mar':'Maresme','Arenys de Mar':'Maresme',
 'Terrassa':'Vallès Occidental','Sabadell':'Vallès Occidental','Montcada i Reixac':'Vallès Occidental','Ripollet':'Vallès Occidental',
 'Rubí':'Vallès Occidental','Cerdanyola del Vallès':'Vallès Occidental','Sant Cugat del Vallès':'Vallès Occidental','Les Fonts':'Vallès Occidental',
 'Cornellà de Llobregat':'Baix Llobregat','El Prat de Llobregat':'Baix Llobregat','Esplugues de Llobregat':'Baix Llobregat','Sant Boi de Llobregat':'Baix Llobregat',
 'Pallejà':'Baix Llobregat','Sant Feliu de Llobregat':'Baix Llobregat','Gavà':'Baix Llobregat','Sant Andreu de la Barca':'Baix Llobregat',
 'Castelldefels':'Baix Llobregat','Esparreguera':'Baix Llobregat','Olesa de Montserrat':'Baix Llobregat',
 'Granollers':'Vallès Oriental','Les Franqueses del Vallès':'Vallès Oriental','Mollet del Vallès':'Vallès Oriental',
 'Berga':'Berguedà','Gironella':'Berguedà','Vilanova i la Geltrú':'Garraf','Manresa':'Bages','Sant Fruitós de Bages':'Bages',
 "Sant Sadurní d'Anoia":'Alt Penedès','Vilafranca del Penedès':'Alt Penedès','Igualada':'Anoia',
}
sin_comarca = set()
for r in rows:
    c = COMARCA.get(r['municipio'])
    if c: r['comarca'] = c
    else: r['comarca'] = None; sin_comarca.add(r['municipio'])
if sin_comarca: print('SIN COMARCA:', sorted(sin_comarca))

json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
open(p.replace('.json', '.js'), 'w', encoding='utf-8').write('/* generado desde data.json — no editar a mano */\nwindow.ESCAPE_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('\n'.join(log) or 'sin cambios')

# stats.js: cifras para la portada (no carga data.js entero)
_pub = [r for r in d['rank'] + d['otras'] if r.get('estado') != 'Cerrado']
_cats = {}
for r in _pub: _cats[r['cat']] = _cats.get(r['cat'], 0) + 1
_stats = {'salas': len(_pub), 'puntuadas': len([r for r in _pub if r.get('rank')]), 'municipios': len({r.get('municipio') for r in _pub if r.get('municipio')}), 'cats': _cats}
open('stats.js', 'w', encoding='utf-8').write('/* generado por fix_data.py — no editar a mano */\nwindow.GPS_STATS = ' + json.dumps(_stats, ensure_ascii=False) + ';\n')
