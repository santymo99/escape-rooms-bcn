# PROYECTO — Web pública de escape rooms de la provincia de Barcelona
Estado a 26/09/2026 (noche). Sustituye a cualquier versión anterior de PROYECTO.md.
Léelo entero antes de responder. No reabras decisiones ya tomadas.

## Qué es
Web estática, pública e independiente: mapa + ranking de escape rooms físicos de la provincia de Barcelona,
con datos verificados uno a uno. Regla innegociable: NUNCA inventar ni estimar datos (puntuaciones, premios,
precios, coordenadas, estado). Si falta, se deja vacío y se dice. Mejor un mapa pequeño y fiable que grande
con salas cerradas. El mapa personal del usuario (/original) NO se toca nunca.

## Dónde vive (ya montado, no hay que volver a configurar nada)
- Nombre público: **GPS ESCAPE** (decidido 26/09 tras descubrir que «EscapeMaps» es una empresa de Madrid con
  escapemaps.es y marca en uso; ver sección «Nombre y dominio»). Logo: rosa de los vientos con ojo de cerradura.
- Dominios: `gpsescape.es` (principal) y `gpsescape.com` (alias), registrados en DonDominio el 26/09 con renovación
  automática. DNS ya apuntando a Netlify (ANAME apex → apex-loadbalancer.netlify.com, www → mapsescape.netlify.app).
  A última hora del 26/09 Red.es aún no había publicado la delegación del .es; cuando resuelva, «Retry DNS
  verification» en Netlify → Domain management para que emita el certificado. Mientras: https://mapsescape.netlify.app.
- Código y datos: repositorio GitHub `santymo99/escape-rooms-bcn`, rama `main`. Netlify publica cada vez que
  el repositorio cambia (≈1 minuto). Netlify Forms activado (formulario `alta-sala`).
- Llave de escritura: el token `github_pat_…` está en las instrucciones del Proyecto. El usuario NO quiere
  tocar GitHub ni Netlify; toda actualización la hace Claude.

## Cómo actualizar la web (procedimiento que funciona)
El contenedor de bash de Claude no tiene internet; el sandbox de Higgsfield sí (git, node, python3, curl,
Playwright con `NODE_PATH=$(npm root -g)`). Pasos, en `sandbox_exec`:
1. `git clone https://x-access-token:<TOKEN>@github.com/santymo99/escape-rooms-bcn.git repo` y
   `git config user.email/user.name` (sin esto el commit falla).
2. Editar con python3/sed. Para datos, añadir reglas a `fix_data.py` y ejecutarlo (`python3 fix_data.py data.json`):
   regenera `data.json` y `data.js`. Es idempotente.
3. Subir el número `?v=N` en `barcelona/index.html` cuando cambien app.js (hoy v=26) / styles.css (v=21) / data.js (v=17).
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
- `index.html` = portada (estática, solo tema oscuro, `portada.css`, cifras desde `stats.js`). `barcelona/index.html`
  = el mapa (app.js, styles.css, data.js; rutas absolutas `/img/...`). `contacto/` (formulario Netlify `alta-sala`) y
  `gracias/`. `_redirects`: /mapa.html y /mapa → /barcelona/. `stats.js` lo regenera `fix_data.py`.
- `qa/logos.html` y `qa/direcciones.html`: páginas de prueba de diseño (no enlazadas). `qa/*.png`: capturas.
- `app.js`, `styles.css`, `data.js`, `data.json`, `fix_data.py` (todas las correcciones de datos, con fuente y fecha).
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
- Ranking: es NUESTRO y **su criterio no se publica**: ni pesos, ni fórmula, ni fuentes ponderadas en ninguna pantalla
  (decisión del 26/09). La web solo dice que las salas se revisan a mano y que hay N salas ordenadas; la ficha muestra
  «Qué cuenta para su puesto N» en prosa (generado desde el campo `porque`, sin cifras). Internamente la fórmula sigue
  por definir (pendiente 6). Hasta la próxima edición no se renumera ni se mete nadie en un hueco: una sala cerrada
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

## Nombre y dominio (26/09)
- El nombre inicial ESCAPE MAPS se descartó: existe EscapeMaps (S.L.), escape room al aire libre en Madrid, con
  escapemaps.es activo y presencia desde hace años; escapemaps.com es de un tercero desde 2005. Regla nueva: antes de
  fijar cualquier nombre, comprobar dominios (.es en dominios.es, .com por RDAP) y homónimos en el sector.
- Arsys (26/09): el usuario contrató por error un «Cambio de Registrador» de escapemaps.es (traslado imposible, no es
  titular) más registro de escapemaps.eu y extras. Se envió solicitud de desistimiento (14 días, TRLGDCU y cláusula
  4.12 de las condiciones). NO tramitar «baja» desde el Área de Cliente hasta que respondan (sería cese voluntario sin
  devolución). Si deniegan la devolución del .eu, marcar «baja en la próxima renovación» para que no cobre en 2027.
- Nuevo nombre GPS ESCAPE; dominios gpsescape.es/.com en DonDominio (ver «Dónde vive»). Logo definitivo: rosa de los
  vientos con ojo de cerradura (elegido entre tres bocetos en qa/logos.html).

## Portada, imágenes y diseño (26/09)
- Arquitectura decidida: `/` = portada con la imagen siempre visible y un botón por zona (hoy solo «Provincia de
  Barcelona»); cada zona futura tendrá SU PROPIO mapa y datos (`/madrid/` con su data.js), nunca el mismo mapa. El
  filtro se llama «Zona» en todos los mapas; cada mapa decide qué son sus zonas (comarcas en Barcelona).
- Portada: hero con la bóveda, «Elige tu mapa», CTA de Barcelona con cifras de stats.js, ocho categorías con foto
  (enlazan a `/barcelona/?cat=…`, que app.js lee), «Cómo puntuamos» sin porcentajes, pie «¿Falta tu escape room?» →
  /contacto/. Pendiente: mosaico de zonas con foto cuando haya una segunda zona; «top 5» descartado por ahora.
- Dirección de diseño elegida (qa/direcciones.html): **Linterna + Neón**. Linterna: halo dorado en la cabecera que
  sigue al cursor, logo con parpadeo único al cargar, números del ranking en Clash Display dorados y luminosos, cada
  tarjeta con un haz tenue del color de su categoría. Neón: chips de categoría con borde/brillo de su color (activa =
  fondo de color), tarjetas de categoría con borde y degradado de su color. Referencias del usuario: cabecera de
  Escape Room Lover (elegir ciudad primero), sobriedad de udia.es, «más color» pero con diseño propio; GibaEscape es
  el ejemplo de lo que NO quiere (primitivo). Quiere «dinámico, llamativo y práctico», no básico.
- Tema oscuro por defecto en el mapa (localStorage `gps-theme`); el claro sigue en el botón. La portada es solo oscura.
- Cabecera del mapa: logo, píldora «Provincia de Barcelona ▾» (vuelve a `/#mapas`), buscador, tema. Sin la frase
  «Encuentra escape rooms». En móvil: dos filas de cabecera y dos carriles de filtros siempre visibles.
- Pines: un local con varias salas lleva un disco apilado detrás del pin (sin cifra, para no confundir con el puesto).
- Ranking: cabecera compacta («El ranking» + una frase) y bloque «Marca las que ya has jugado»; sin párrafo de criterio.
- «Ya la he jugado»: botón en la ficha; se guarda en localStorage (`gps-done`), sin registro y sin sincronizar entre
  dispositivos (aceptado). Salas jugadas atenuadas en lista y pines; interruptor «Ocultar jugadas» (`gps-hidedone`).
  Texto para el usuario: «Marca las que ya has jugado y descubre las que te quedan».
- Formulario «¿Falta tu escape room?» (`/contacto/`, Netlify Forms, nombre/local/temática/dificultad/municipio/
  dirección/web/correo/comentarios) enlazado desde el pie de la portada y del ranking. Notificación por correo:
  activarla en Netlify → Forms → Notifications (pendiente, lo hace Claude en el Chrome del usuario si se lo pide).
- Datos personales del mapa original que NO se publican: minutos en coche desde casa (`coche`), «Fuera del radio de
  20 min» (`lejana`). Cifras del desglose (`porque`) tampoco: la ficha muestra «Qué cuenta para su puesto N» en prosa
  (fuentes de reconocimiento, media ponderada y nº de reseñas, duración, jugadores máx.), sin puntuaciones.
- Imágenes (Higgsfield, gpt_image_2_5, medium): `img/portada.webp` y `img/cat/<slug>.webp` (1280) + `-640`. Criterio:
  interior cerrado sin ventanas, mecánica de sala visible sin candados absurdos, dos jugadores de espaldas o perfil
  (ropa actual salvo Aventura/Histórico con vestuario y Ciencia ficción con mono), luz cálida protagonista, bordes
  tranquilos, sin texto; solo Terror y Thriller en penumbra. Ediciones sobre la aprobada con image_references. Job IDs:
  aventura 467b909e-a497-4493-8f81-023a1dc3452e · humor b02c63b8-41b0-4951-b10f-2874c432b200 · terror
  43bb466a-b364-40a4-ad10-99a508947e20 · historico 60744788-4deb-4746-9e16-a7042d9c0971 · scifi
  96437179-ed39-4be6-ad54-37d5402b5c2f · fantasia bb20ecb2-14bd-4bf7-a638-f2652fbec569 · thriller
  bd887945-6a6f-41af-9fc6-e8b95f89ec31 · clasico 7ebaa980-db62-41dd-8f6f-2281f86f75b2 · portada
  99566f9d-acf9-4790-88cf-057560beb1c5. Conversión en sandbox_exec con ImageMagick (el contenedor no llega a cloudfront).
- Verificación visual: Playwright en el sandbox para estructura; capturas reales con Claude in Chrome (el navegador del
  panel se desconecta a menudo). Rótulo «Powered by Netlify»: iframe que inyecta Netlify (plan gratuito), no es nuestro.
- Dudas de datos vistas hoy: El Secreto de los Krugger «desde 195 €/pers.» parece precio de grupo; las dos salas «sin
  ubicar» son Escapafantasmas (Cubick – Verdaguer, Mataró) y La Mansión Odisea (Odisea Escape, Terrassa).

## Pendiente (en orden de valor por hora del usuario; dispone de 5-8 h semanales)
1. Dominio: verificar DNS en Netlify cuando Red.es publique gpsescape.es; comprobar HTTPS y redirecciones (.com y
   netlify.app → gpsescape.es). Activar notificación por correo de Netlify Forms. Seguir la respuesta de Arsys.
2. Diseño (bloque 3): aplicar Linterna+Neón también a la ficha y al panel de local; página de categoría y de zona
   estáticas para SEO; revisar móvil a 390 px con capturas reales; rendimiento (data.js 450 KB retrasa el mapa 6-8 s).
3. Encargo 3 · completar el top 100 (puestos 92-100): el usuario quiere 100 salas puntuadas. NO se pueden asignar
   puestos sin datos. Prompt preparado con los 91 desgloses y las 137 candidatas para que una IA busque avales
   verificables y proponga 9 con el mismo criterio: https://d2ol7oe51mr4n9.cloudfront.net/user_3IxMv0DBoTGoMxxItIPCGmfMJYN/38f48bb0-d92c-4653-9b48-375bb0dfa8f5.md
   El resultado (JSON con id, rank, porque, premios, fuentes) se aplica vía fix_data.py; el usuario aprueba antes.
   El enlace de la portada dice «Ver el ranking»; pasará a «Ver top 100» cuando sean 100.
4. Ranking (dato): la descripción de las fichas la escribe el usuario; revisar precios sospechosos y los «porque».
4. Dudas de datos abiertas: El viaje mágico (C2) vs La Biblioteca Mágica; Space Escape vs "Salvar la Galaxia"
   (El Cubo); Escape Food Junior; Cadena Perpetua (URL correcta cadenaperpetuaroom.com, sin revisar);
   salas nuevas de locales mapeados sin confirmar como físicas: The City (Academia de cocina, La lanzadera,
   La agencia), Run Away (Boom Escape), Cubick Verdaguer, Abduction Radio y Abduction Studio (Badalona).
5. 67 salas sin confirmar: segunda pasada cuando el usuario tenga tiempo, de cinco en cinco. Las 17 candidatas
   no confirmadas del informe ERL siguen fuera.
6. Fórmula del ranking (factores, pesos, media bayesiana, fecha de corte) y regla de reedición. Hasta entonces
   no se recalcula ni se renumera. Al reeditar, los huecos desaparecen solos.
7. Registro de usuarios: descartado de momento (lo de «jugadas» va sin registro). WordPress: descartado.

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
