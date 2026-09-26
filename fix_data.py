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
