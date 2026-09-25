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

json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
open(p.replace('.json', '.js'), 'w', encoding='utf-8').write('/* generado desde data.json — no editar a mano */\nwindow.ESCAPE_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('\n'.join(log) or 'sin cambios')
