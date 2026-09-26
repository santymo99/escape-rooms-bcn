# PROYECTO — Web pública de escape rooms de la provincia de Barcelona
Estado a 26/09/2026. Sustituye a cualquier versión anterior de PROYECTO.md.
Léelo entero antes de responder. No reabras decisiones ya tomadas.

## Qué es
Web estática, pública e independiente: mapa + ranking de escape rooms físicos de la provincia de Barcelona,
con datos verificados uno a uno. Regla innegociable: NUNCA inventar ni estimar datos (puntuaciones, premios,
precios, coordenadas, estado). Si falta, se deja vacío y se dice. Mejor un mapa pequeño y fiable que grande
con salas cerradas. El mapa personal del usuario (/original) NO se toca nunca.

## Dónde vive (ya montado, no hay que volver a configurar nada)
- Web publicada: https://mapsescape.netlify.app (Netlify, gratis, pública).
- Código y datos: repositorio GitHub `santymo99/escape-rooms-bcn`, rama `main`. Netlify publica cada vez que
  el repositorio cambia (≈1 minuto).
- Llave de escritura: el token `github_pat_…` está en las instrucciones del Proyecto. El usuario NO quiere
  tocar GitHub ni Netlify; toda actualización la hace Claude.

## Cómo actualizar la web (procedimiento que funciona)
El contenedor de bash de Claude no tiene internet; el sandbox de Higgsfield sí (git, node, python3, curl,
Playwright con `NODE_PATH=$(npm root -g)`). Pasos, en `sandbox_exec`:
1. `git clone https://x-access-token:<TOKEN>@github.com/santymo99/escape-rooms-bcn.git repo` y
   `git config user.email/user.name` (sin esto el commit falla).
2. Editar con python3/sed. Para datos, añadir reglas a `fix_data.py` y ejecutarlo (`python3 fix_data.py data.json`):
   regenera `data.json` y `data.js`. Es idempotente.
3. Subir el número `?v=N` en `mapa.html` e `index.html` cuando cambien app.js/styles.css/data.js (hoy v=16).
4. `git add -A && git commit -m "…" && git push origin main`.
5. Comprobar en navegador real (Playwright en el sandbox): `#brandSub`, nº de `.mk`, `.card-hole`.
Límites del sandbox: se borra ~10 s después de cada llamada salvo que haya un comando en background
(`sleep 840` mantiene la sesión 15 min); cada comando ≤ 16.000 caracteres; `timeout_seconds` ≤ 120.
Para meter ficheros de texto: heredoc `cat > f <<'EOF'` en trozos ≤ 15.000 caracteres, con el background
activo (base64 por trozos NO: lo bloquea). Hacer clone + edición + push en el MISMO comando o dentro de la
misma sesión de background; si la sesión caduca antes del push, se pierde todo (pasó el 25/09).
Playwright NO sirve para leer widgets de reserva (van en iframes de terceros: Turitop, Stripe…): el cotejo
de estado lo hace el usuario a mano. Las páginas publicadas como artefacto de Claude no sirven (bloquean teselas).

## Archivos del repositorio
- `index.html` = `mapa.html` (la web). `app.js`, `styles.css`, `data.js`, `data.json`, `fix_data.py`
  (todas las correcciones de datos, con fuente y fecha).
- `encargo2/estados_2026-09-25.jsonl` (94 locales: evidencia + estado por sala, cotejado por el usuario) y
  `encargo2/candidatas_2026-09-25.jsonl` (22 salas nuevas confirmadas). `fix_data.py` los lee.
- En el contexto del Proyecto: informe Escape Room Lover, `candidatas` y `verificar_estado` rellenados, resumen
  "Encargo 2 — resultado". `PROYECTO.md`: este documento.

## Datos: estructura y decisiones cerradas
- `data.json`: `{rank: [...], otras: [...], meta}`. Campos por sala: id, local, sala, municipio, dir, lat, lon,
  prec (exact|portal|street|city), geo_ref, cat, rank, extra, estado, estado_ev, web, url, fuentes, precio,
  duración, jugadores, dificultad, etc. `local_alt`, `sala_alt`, `cat_alt` guardan nombres antiguos.
- Categorías: Terror, Thriller/Misterio (fusión de Misterio + Thriller + Atraco), Aventura, Ciencia ficción,
  Fantasía, Histórico, Humor, Clásico. Infantiles no entran. Apocalíptico → Thriller/Misterio.
- Estado (regla cerrada el 26/09):
  · `Abierto` con calendario de reservas con horas, botón de reserva operativo, o reseñas recientes
    (Escape Room Lover desde 10/2025 o reseñas fechadas en 2026 en la web). `estado_ev` dice cuál de las dos
    ("calendario de reservas activo…" / "reseñas recientes; sin calendario visible…") y la ficha lo muestra.
  · `null` = sin confirmar: sala listada en la web sin fecha, web que no carga o bloquea, o sala que NO aparece
    en un horario online que sí funciona (caso Refugio 27 y Alkabán de Maximum). Se muestra sin afirmar nada.
  · `Cerrado` = aviso de cierre, dominio caído/en venta o sala retirada de la web oficial. Se conserva en
    data.json como historial pero NO se publica (app.js la filtra).
- Ranking: es NUESTRO (factores: TERPECA, GibaEscape, Escape Room Lover, Google, etc.); la fórmula está por
  definir (pendiente 4). Hasta la próxima edición no se renumera ni se mete nadie en un hueco: una sala cerrada
  con puesto se muestra como "Puesto vacante" (tarjeta gris `.card-hole`, solo con el ranking completo visible).
  Hoy los huecos son 74 (Endurance II) y 78 (Forbidden room). El 65 volvió a ocuparlo Refugio 27 (sin confirmar).
  Las salas nuevas entran en `otras`, sin puesto, hasta que haya fórmula.
- Salas con `prec: city` no se pintan; aparecen en la lista como "Ubicación no confirmada".
- Coordenadas: CartoCiudad (IGN), portal exacto. Nunca estimar.
- Precio por persona de las candidatas: precio de grupo de ERL dividido entre jugadores máx.; `ptxt` lo dice.
- Cifras actuales: 228 salas publicadas · 157 locales · 91 puntuadas · 161 abiertas · 67 sin confirmar ·
  19 cerradas ocultas.

## Mapa: cómo funciona la agrupación (encargo 1, cerrado)
- Un marcador por local físico: mismo nombre de `local` Y a ≤ 50 m. Las candidatas se unificaron así:
  "Quimera Escape 1" → Quimera Escape, "The City 1" → The City Escape Room (nombre antiguo en `local_alt`).
- El pin muestra el mejor puesto de las salas que pasan el filtro, color de su categoría y cifra de salas.
  Al pulsar: una sala → ficha; varias → panel del local. Botón "← Local · N salas" para volver.
- Locales distintos en el mismo portal se separan con jitter. Pares "probables" sin verificar siguen separados:
  Escape Republik/Unreal Horta, Soul Games/NextXzone, Plastic Robot/Bajo Segunda, Start Play/Elements Aire.
- Bug ya corregido (no repetir): al repintar un marcador conservar las clases `maplibregl-*` y NO poner
  `position` en `.mk`.

## Correcciones de datos aplicadas (todas en fix_data.py, con fuente)
25/09: Bizarre → Blesa 24; The Hive → Castillejos 287; Golden Pop y Elements Esplugues un solo local; Escape
Barcelona = dos locales; El Cetro de Fuego → El Faraón (#51); El Cóctel del Doctor → Drecera de Queralt;
Maximum solo opera Girona 27; Catalepsia Cerrado; Fugitivos web nueva. Abduction Badalona (6 salas), Criogenic,
Unreal Vilapicina, Rowka abiertas.
26/09 (encargo 2): 145 estados de 94 locales aplicados; 17 salas pasan a Cerrado (El templo perdido,
Endurance II, Forbidden room, Sherlock Holmes, Alkatraz Classic, SWAT Kids, La Cabaña, Virus Z, Hogwarts,
Temps Límit ×2, Kairos, Lighthouse, Hospital Abandonado, Hotel Overlook, Nave Ulysses, Catalepsia);
Refugio 27 y Alkabán → sin confirmar; Oscuridad y Zen Room siguen Cerrado (no están en el horario de Maximum).
Vortex/Apophis y las cuatro de Bizarre abiertas por capturas del usuario del 26/09. 22 candidatas añadidas
(C3 El Faraón ya era la #51; C2 El viaje mágico fuera hasta aclarar si es La Biblioteca Mágica; C43 Biohazard
descartada). "Probablemente cerrados" (Intríngulis, Matetó, Escapelandsp, Barcelona Escape Room L'H, Scap&Go,
Sala Koala, Katharsis) quedan como sin confirmar: sin aviso de cierre no se marcan Cerrado.

## Pendiente (en orden de valor por hora del usuario; dispone de 5-8 h semanales)
1. Portada real (`index.html` distinto del mapa) y páginas temáticas de ranking para SEO. Antes, el usuario
   decide: (a) nombre público y frase de qué es la web; (b) dominio propio (10-15 €/año) o mapsescape.netlify.app;
   (c) qué páginas temáticas (categoría, municipio, "mejores de terror"…).
2. Dudas de datos abiertas: El viaje mágico (C2) vs La Biblioteca Mágica; Space Escape vs "Salvar la Galaxia"
   (El Cubo); Escape Food Junior; Cadena Perpetua (URL correcta cadenaperpetuaroom.com, sin revisar);
   salas nuevas de locales mapeados sin confirmar como físicas: The City (Academia de cocina, La lanzadera,
   La agencia), Run Away (Boom Escape), Cubick Verdaguer, Abduction Radio y Abduction Studio (Badalona).
3. 67 salas sin confirmar: segunda pasada cuando el usuario tenga tiempo, de cinco en cinco. Las 17 candidatas
   no confirmadas del informe ERL siguen fuera.
4. Fórmula del ranking (factores, pesos, media bayesiana, fecha de corte) y regla de reedición. Hasta entonces
   no se recalcula ni se renumera. Al reeditar, los huecos desaparecen solos.
5. Registro de usuarios: descartado de momento. WordPress: descartado.

## Cómo trabaja el usuario (respetar)
- Antes de cada tarea, dos líneas con qué se va a hacer y por qué. Corregir el rumbo al principio.
- Opciones con pros y contras cuando hay que decidir, no una recomendación disfrazada.
- Errores señalados directamente, antes de ejecutar. Sin condescendencia.
- No quiere archivos ni zips: la entrega es la web actualizada. No quiere entrar en GitHub ni Netlify.
- Las comprobaciones que dependen de él, de cinco en cinco, por el chat; responde con capturas si hace falta.
- Diseño: se extiende la identidad del mapa (superficies casi negras, dorado #e1af4a, Clash Display / Satoshi,
  tema claro/oscuro con tokens CSS). No inventar otra.
- Cerca del final de cada conversación: actualizar PROYECTO.md en el repositorio y darle una copia con fecha
  para el contexto del Proyecto.
