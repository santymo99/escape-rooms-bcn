# PROYECTO — Web pública de escape rooms de la provincia de Barcelona
Estado a 25/09/2026. Sustituye a cualquier versión anterior de PROYECTO.md.
Léelo entero antes de responder. No reabras decisiones ya tomadas.

## Qué es
Web estática, pública e independiente: mapa + ranking de escape rooms físicos de la provincia de Barcelona,
con datos verificados uno a uno (premios TERPECA, Escape Room Awards, GibaEscape, reseñas con media bayesiana).
Regla innegociable: NUNCA inventar ni estimar datos (puntuaciones, premios, precios, coordenadas, estado).
Si falta, se deja vacío y se dice. Mejor un mapa pequeño y fiable que grande con salas cerradas.
El mapa personal del usuario (/original) NO se toca nunca.

## Dónde vive (ya montado, no hay que volver a configurar nada)
- Web publicada: https://mapsescape.netlify.app (Netlify, gratis, pública).
- Código y datos: repositorio GitHub `santymo99/escape-rooms-bcn`, rama `main`. Netlify publica solo
  cada vez que el repositorio cambia (≈1 minuto).
- Llave de escritura: el token `github_pat_…` está en las instrucciones del Proyecto. El usuario NO quiere
  tocar GitHub ni Netlify; toda actualización la hace Claude.

## Cómo actualizar la web (procedimiento que funciona)
El contenedor de bash de Claude no tiene internet; el sandbox de Higgsfield sí (git, node, python3, curl,
Playwright). Pasos, en `sandbox_exec`:
1. `git clone https://x-access-token:<TOKEN>@github.com/santymo99/escape-rooms-bcn.git repo`
2. Editar con python3/sed. Para datos, añadir reglas a `fix_data.py` y ejecutarlo (`python3 fix_data.py data.json`):
   regenera `data.json` y `data.js`. Es idempotente.
3. Subir el número `?v=N` en `mapa.html` e `index.html` cuando cambien app.js/styles.css/data.js (caché).
4. `git add -A && git commit -m "…" && git push origin main`.
5. Comprobar en un navegador real (Playwright en el sandbox) que los marcadores caen dentro del mapa.
El sandbox se borra ~10 s después de cada llamada: encadenar los pasos en un solo comando o usar background.
NO intentar meter archivos en el sandbox por trozos base64: lo bloquea. Todo se edita dentro del clon.
Las páginas publicadas como artefacto de Claude no sirven (bloquean las teselas del mapa).

## Archivos del repositorio
- `index.html` = `mapa.html` (la web). `app.js`, `styles.css`, `data.js` (datos como script, permite abrir con
  doble clic), `data.json` (misma información), `fix_data.py` (correcciones de datos, con fuente y fecha).
- Fuera del repositorio, en el contexto del Proyecto: `candidatas_2026-09-25.json` (44 salas nuevas sin verificar,
  Bloque B del informe Escape Room Lover) y `verificar_estado_2026-09-25.csv` (147 salas actuales sin estado,
  en 94 locales). Si faltan, se regeneran desde el informe original que está también en el Proyecto.
- `PROYECTO.md`: este documento.

## Datos: estructura y decisiones cerradas
- `data.json`: `{rank: [...], otras: [...], meta}`. Campos por sala: id, local, sala, municipio, dir, lat, lon,
  prec (exact|portal|street|city), geo_ref, cat, rank, extra, estado, estado_ev, web, url, fuentes, precio,
  duración, jugadores, dificultad, etc. `local_alt`, `sala_alt`, `cat_alt` guardan nombres antiguos.
- Categorías vigentes: Terror, Thriller/Misterio (fusión de Misterio + Thriller + Atraco, decidida 25/09),
  Aventura, Ciencia ficción, Fantasía, Histórico, Humor, Clásico. Infantiles no entran. Apocalíptico → Thriller/Misterio.
- Estado: `Abierto` solo con evidencia (calendario de reservas activo en web oficial o reseñas recientes);
  `Cerrado` se conserva en data.json como historial pero NO se publica (app.js las filtra);
  `null` = no confirmado (se muestra, sin afirmar nada).
- Salas con `prec: city` (sin dirección verificada) no se pintan en el mapa; aparecen en la lista como
  "Ubicación no confirmada". Hoy son 3: Cubick–Verdaguer (Escapafantasmas), Odisea (La Mansión), Lighthouse.
- Coordenadas: CartoCiudad (IGN), portal exacto. Nunca estimar.
- Cifras actuales: 216 salas publicadas · 143 locales · 92 puntuadas · 9 cerradas ocultas.

## Mapa: cómo funciona la agrupación (encargo 1, cerrado)
- Un marcador por local físico: mismo nombre de `local` Y a ≤ 50 m (absorbe artefactos de geocodificación
  sin fusionar sedes reales; la primera sede real distinta está a 244 m).
- El pin muestra el mejor puesto de las salas que pasan el filtro activo, color de su categoría y una cifra
  pequeña con cuántas salas quedan dentro. Al pulsar: si una sola sala cumple, abre su ficha; si varias,
  panel del local con lista y aviso de las ocultas por filtros. Botón "← Local · N salas" para volver.
- Locales distintos en el mismo portal se separan con jitter. Pares "probables" sin verificar se dejan como
  locales separados: Escape Republik/Unreal Horta, Soul Games/NextXzone, Plastic Robot/Bajo Segunda,
  Start Play/Elements Aire.
- Bug ya corregido (no repetir): al repintar un marcador hay que conservar las clases `maplibregl-*` del
  elemento y NO poner `position` en `.mk`.

## Correcciones de datos aplicadas (todas en fix_data.py, con fuente)
Bizarre → Blesa 24 (coords exactas, Backstab confirmada); The Hive → Castillejos 287 (coords exactas);
Golden Pop y Elements Esplugues como un solo local; Escape Barcelona = dos locales (Moragas 18 y Baró 17);
El Cetro de Fuego → El Faraón (puesto 51); El Cóctel del Doctor → Drecera de Queralt (insomniacorp.com);
Maximum Escape: solo opera Girona 27 → 7 salas de Trafalgar 17 / Bruc 9 / sin local + Refugio 27 (era puesto 65)
marcadas Cerrado; Catalepsia (Horror Box) Cerrado; Fugitivos web nueva fugitivosroomescape.com.
Confirmado con dos sedes: Emotion!, Fugitivos, Quimera, Horror Box.

## Pendiente (en orden de valor por hora del usuario; dispone de 5-8 h semanales)
1. DECISIÓN del usuario: el ranking tiene un hueco en el 65 (Refugio 27). ¿Dejar el salto o renumerar 66→93
   con rerank.py? No hecho aún.
2. Cotejo de estado por local (encargo 2, punto 1). Claude puede abrir webs, pero el calendario de reservas
   es un widget que solo se ve en navegador real: lo mira el usuario, o Claude con Playwright en el sandbox
   (probar). Lote actual pendiente de respuesta: Criogenic Barcelona, Unreal Vilapicina, Vortex (Terrassa),
   Abduction 2 (Badalona), Rowka (Terrassa). Después, el resto de `verificar_estado_2026-09-25.csv`
   (28 locales con salas puntuadas primero).
3. Candidatas nuevas (`candidatas_2026-09-25.json`): solo entran con coordenadas de portal y estado confirmado.
   Prioridad: las 12 con reseña 2025-2026 y web activa. 9 tienen categoría a revisar.
4. Salas nuevas en locales ya mapeados (coords conocidas, falta confirmar que son salas físicas):
   The City (Academia de cocina, La lanzadera, La agencia), Run Away (Boom Escape), Elements Aire (La reina
   roja, El perfume), Cubick Verdaguer (8 salas anunciadas, constan 6+1), El Cubo ("Salvar la Galaxia" ¿= Space Escape?).
5. Portada (`index.html` de verdad, hoy es el mapa), páginas de ranking temáticas para SEO, y dominio propio
   si el usuario quiere (Netlify permite conectar uno).

## Cómo trabaja el usuario (respetar)
- Antes de cada tarea, dos líneas con qué se va a hacer y por qué. Corregir el rumbo al principio.
- Opciones con pros y contras cuando hay que decidir, no una recomendación disfrazada.
- Errores señalados directamente, antes de ejecutar. Sin condescendencia.
- No quiere archivos ni zips: la entrega es la web actualizada. No quiere entrar en GitHub ni Netlify.
- Le gusta que las comprobaciones que dependen de él se le pidan de cinco en cinco, por el chat.
- Diseño: se extiende la identidad del mapa (superficies casi negras, dorado #e1af4a, Clash Display / Satoshi,
  tema claro/oscuro con tokens CSS). No inventar otra.
- Cerca del final de cada conversación: actualizar PROYECTO.md en el repositorio y darle una copia con fecha
  para el contexto del Proyecto.
