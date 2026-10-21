# LigaManager — Progreso de las mejoras UX

Bitácora de las fases descritas en `docs/ux/LigaManager_prompt_UX_por_fases.md`.
Cada fase agrega una entrada con fecha. Léela antes de empezar la fase siguiente.

---

## 2026-10-07 — Fase 1: Estilos base

**Estado:** aprobada por Roberto el 7 de octubre de 2026 y fusionada en `main` el 8 de octubre (pull request #1). Publicada en producción.

**Base:** `main` en el commit `c1958c6` (6 de octubre de 2026). Todos los hallazgos de la fase seguían vigentes.

### Qué se cambió

| Archivo | Cambio |
|---|---|
| `frontend/src/index.css` | `@config "../tailwind.config.js"` para que Tailwind v4 cargue el tema. Clases `.card`, `.badge` y `tr.table-row` en `@layer components`. `color-scheme: dark` en `:root`. |
| `frontend/tailwind.config.js` | Se agregó `brand-300`, que Login y Registro ya usaban en `hover:text-brand-300`. |
| `frontend/index.html` | `lang="es"`, título «LigaManager» y enlace de Google Fonts para Oswald. |
| `frontend/public/favicon.svg` | Ícono propio (cancha vista desde arriba) en lugar del de Vite. |
| `frontend/src/components/Layout.jsx` | Íconos SVG de Lucide en el menú en lugar de emojis. La sección activa usa `bg-brand-700`. |
| `frontend/package.json`, `package-lock.json` | Dependencia nueva: `lucide-react`. |

No se tocó `backend/` ni la base de datos. No hizo falta crear `PENDIENTES_BACKEND.md`.

### Decisiones

- **Sección activa del menú en `brand-700`, no `brand-600`.** El código pedía `bg-brand-600`, pero el texto blanco sobre ese verde da un contraste de 3,29:1. Con `brand-700` da 4,80:1 y cumple el mínimo de 4,5:1. Para volver al tono original basta cambiar esa clase en `Layout.jsx`.
- **`.card` en la capa `components`.** Así las utilidades que ya usan las pantallas (`p-0`, `py-12`) siguen mandando sobre el relleno de la tarjeta.
- **La última fila de una tabla no lleva línea inferior**, para que no se duplique con el borde de la tarjeta.

### Cómo se verificó

- `npm ci` y `npm run build` sin errores.
- `npm run lint` da los mismos 5 errores que ya existían en `main`; la fase no agrega ninguno.
- Se revisaron 11 vistas (Login, Dashboard, Campeonatos, formulario nuevo, detalle, jornada, planilla, Equipos, Jugadores, Reportes, Mantenimiento) en 1.440, 768 y 390 px, antes y después, con datos de ejemplo.
- **Límites de la verificación:** se hizo en Chromium sobre Linux, sin el backend real. Oswald se comprobó con una copia local de la fuente, porque ese entorno no alcanza Google Fonts. La barra de desplazamiento oscura se comprobó por la propiedad aplicada (`color-scheme: dark`), no a la vista en Windows. Falta confirmar ambas cosas en el navegador de Roberto.

### Efectos visibles que conviene conocer

- Las casillas sin marcar pasan de blancas a gris oscuro con borde; la casilla marcada sale en el verde de la marca.
- El selector de fecha muestra su ícono de calendario en claro; antes era oscuro sobre fondo oscuro.
- Las tarjetas ahora tienen relleno, así que el contenido del detalle del campeonato queda unos píxeles más angosto.

### Anotado para otras fases (no se arregló aquí)

- **Fase 2:** en 390 px el logo del Login llega hasta los bordes de la pantalla. En 768 px las tablas de Campeonatos y Jugadores se cortan a la derecha. El menú lateral sigue fijo.
- **Fase 5:** Oswald depende de Google Fonts. Para la cancha sin señal conviene servir la fuente desde la propia aplicación.
- **Sin fase asignada:** quedan emojis fuera del menú (pestañas, botones de la jornada, tarjetas del Dashboard, estados vacíos). La Fase 1 solo pedía los del menú.
- **Fuera del alcance UX:** los 5 errores de lint previos están en `AuthContext.jsx`, `Dashboard.jsx`, `CampeonatoDetalle.jsx`, `Jugadores.jsx` y `TabSuspensiones.jsx`.

### Siguiente paso

Hecho: fusionada en `main` el 8 de octubre. La Fase 2 sigue en `ux/fase-2-celular`.

---

## 2026-10-08 — Fase 2: Celular y tablet

**Estado:** probada por Roberto en su celular y fusionada en `main` el 8 de octubre (pull request #2). Publicada en producción.

Todos los hallazgos de la fase seguían vigentes: en 390 px el contenido quedaba en 134 px de ancho y había controles de hasta 10×16 px.

### Qué se cambió

| Archivo | Cambio |
|---|---|
| `frontend/src/components/Layout.jsx` | Por debajo de 1.024 px el menú lateral se oculta y se abre desde una barra superior con botón de menú. Se cierra al elegir una sección, con Esc o tocando fuera. Cerrado no recibe foco. Altura `h-dvh` para el navegador del celular. |
| `frontend/src/components/Modal.jsx` | Por debajo de 640 px las ventanas ocupan toda la pantalla. Encabezado fijo y contenido desplazable, para que cerrar siempre esté visible. La × tiene nombre accesible («Cerrar»). |
| `frontend/src/components/PageHeader.jsx` | Título y botón principal bajan a dos líneas si no caben; título algo menor en celular. |
| `frontend/src/index.css` | Bloque `@media (pointer: coarse)`: botones, enlaces, listas y campos de al menos 44 px; casillas de 22 px con la fila completa como área táctil; letra de 16 px en campos para que el celular no haga zoom. No aplica con mouse. |
| Páginas (`Dashboard`, `Campeonatos`, `CampeonatoDetalle`, `Equipos`, `Jugadores`, `Reportes`, `Mantenimiento`) | Margen de 16 px en celular, 24 px en tablet y 32 px en computadora. |
| `Campeonatos.jsx`, `Jugadores.jsx`, `CampeonatoDetalle.jsx` | Tablas con desplazamiento lateral y ancho mínimo, igual que las de Reportes. La columna del nombre tiene un ancho mínimo para que no se parta en muchas líneas. |
| `CampeonatoDetalle.jsx` | Cabecera de jornada, tarjeta de partido y panel de agregar equipos pasan a varias líneas cuando no caben. Pestañas con desplazamiento lateral. En pantallas táctiles, los botones de evento de la planilla bajan a una segunda línea bajo el nombre del jugador. |
| `Reportes.jsx`, `Mantenimiento.jsx` | Las pestañas ya no se encogen ni se superponen. |
| `Equipos.jsx` | El botón de eliminar se ve siempre, no solo al pasar el mouse. |
| `LoginPage.jsx`, `RegisterPage.jsx` | Logo algo menor en celular para que no toque los bordes. |

No se tocó `backend/` ni la base de datos. No hizo falta `PENDIENTES_BACKEND.md`.

### Decisiones

- **Tablas: desplazamiento lateral, no tarjetas.** Reportes ya usaba ese patrón, así que se aplicó igual a todas las tablas. Las tarjetas obligaban a rediseñar cada tabla.
- **Tamaño táctil por tipo de puntero.** El mínimo de 44 px aplica solo a pantallas táctiles. En computadora la interfaz queda igual.
- **Planilla sin rediseño.** Solo se abre a pantalla completa en celular y sus botones cumplen 44 px. El rediseño para la cancha es la Fase 5.
- **Menú hasta 1.024 px.** En una tablet vertical el menú fijo dejaba 512 px al contenido; por eso se colapsa también ahí.

### Cómo se verificó

- `npm run build` sin errores. `npm run lint`: los mismos 5 errores previos, ninguno nuevo.
- Medición automática de 15 vistas en 390 y 768 px, simulando pantalla táctil: 0 controles menores de 44 px (antes, hasta 132 en la planilla), 0 desplazamiento lateral de la página y nada cortado fuera de la pantalla. Excepciones: el enlace «Regístrate», que va dentro de una frase, y los círculos decorativos del fondo del Login, que ya estaban recortados a propósito.
- Menú probado: abre, se cierra al elegir sección, con Esc y tocando fuera, y cerrado no es alcanzable con el teclado.
- En 1.440 px las pantallas quedan iguales que antes, salvo la × de Equipos, que ahora se ve siempre.
- **Límite:** Chromium sobre Linux con datos de ejemplo. Falta probar en un celular real, sobre todo Safari en iPhone.

### Anotado para otras fases

- **Fase 3:** la ventana todavía no cierra con Esc ni tiene botón Cancelar.
- **Fase 4:** el botón de eliminar de Equipos debe pasar a un menú de acciones. Las fechas de los partidos se muestran en formato técnico («2026-10-10T10:00»).
- **Fase 5:** la planilla en celular ahora es más larga, porque cada jugador ocupa dos líneas para que los botones midan 44 px. El modo en vivo la reemplaza para la cancha.
- **Sin fase:** en las tablas con desplazamiento lateral no hay una señal visual de que hay más columnas a la derecha.

### Siguiente paso

Hecho: fusionada en `main` el 8 de octubre. La Fase 3 sigue en `ux/fase-3-ventanas`.

---

## 2026-10-08 — Fase 3: Ventanas, errores y avisos

**Estado:** aprobada por Roberto y fusionada en `main` el 8 de octubre de 2026 (pull request #3). Publicada en producción.

Los hallazgos seguían vigentes: 27 ventanas del navegador (17 `alert`, 9 `confirm` y 1 `prompt`), 41 consultas de datos de las que solo 5 manejaban el error, y unas 70 etiquetas sin asociar a su campo.

### Piezas compartidas nuevas

| Archivo | Qué hace |
|---|---|
| `frontend/src/feedback/contextos.js` | Contextos y hooks: `useAviso`, `useDialogos`, `useModal`, `mensajeDeError` y `erroresDe` (agrupa consultas que fallan). Sin componentes, para que el recargado rápido funcione. |
| `frontend/src/feedback/foco.js` | `useAtraparFoco`: lleva el foco a la ventana, lo mantiene ahí con Tab y lo devuelve al cerrar. |
| `frontend/src/components/AvisosProvider.jsx` | Avisos breves abajo de la pantalla: éxito (3,5 s) y error (7 s). Se pueden cerrar. |
| `frontend/src/components/DialogosProvider.jsx` | Ventana de confirmación (`confirmar`) y ventana para pedir un número (`pedirNumero`), en lugar de `confirm()` y `prompt()`. La confirmación empieza con el foco en «Cancelar». |
| `frontend/src/components/EstadoError.jsx` | Estado de error con «Reintentar», a página completa o compacto para formularios y secciones. |
| `frontend/src/components/AccionesFormulario.jsx` | Botones al pie de los formularios: «Cancelar» y el botón principal. |
| `frontend/src/components/Modal.jsx` | Cierra con Esc, la × o tocando fuera; si se escribió algo, pregunta «¿Descartar los cambios?». Tiene `role="dialog"` y título asociado. |
| `frontend/src/main.jsx` | Monta los avisos y diálogos. Los errores 4xx ya no se reintentan; los de red o servidor sí, hasta 3 veces. |
| `frontend/src/index.css` | Estilos `.btn-secundario` y `.btn-peligro`. |

### Qué cambió en las pantallas

- **Sin ventanas del navegador:** las 9 confirmaciones nombran lo que se va a borrar («¿Eliminar el campeonato «X»?»). Los `alert` de error pasan a avisos de error y los de éxito (calendario generado) a avisos de éxito. El minuto de la planilla se escribe en una ventana propia que dice el evento y el jugador («Gol · (9) Washington Barreto») y valida 1 a 120.
- **Avisos de éxito** al crear, editar, eliminar, inscribir, convocar, registrar eventos y cambios, y generar el calendario.
- **Estado de error con «Reintentar»** en Dashboard, Campeonatos, detalle del campeonato (y sus jornadas, grupos, tabla general y partidos de cada jornada), Equipos, Jugadores, Reportes (las cinco pestañas), Estadios y Oficiales. En los formularios, un aviso compacto cuando falla un catálogo (tipos, países, equipos, estadios, oficiales, instancias, ubicación). En el detalle, un 404 sigue diciendo «No se encontró el campeonato»; cualquier otro error muestra «Reintentar».
- **Formularios:** todos los de ventana tienen «Cancelar». La sanción de Reportes ya lo tenía y ahora usa el mismo estilo.
- **Etiquetas:** cada etiqueta está asociada a su campo con `useId()`. Estadios y Oficiales tenían campos sin etiqueta; ahora la tienen, incluida «Fecha de nacimiento», que antes no decía qué fecha era.
- **Nombres accesibles** en los botones de solo ícono: ✕ de eventos, cambios, jugadores, grupos y sanciones; botones de evento de la planilla («Gol de …»); búsqueda de jugadores; selector «Convocar como».
- **Selector de ubicación:** si falla la consulta de provincias, ya no dice «Otro país» por error.
- **Jugadores:** abrir «Editar» ahora muestra «Abriendo...» y, si falla, un aviso; antes no pasaba nada.

No se tocó `backend/` ni la base de datos. No hizo falta `PENDIENTES_BACKEND.md`.

### Decisiones

- **Planilla:** como guarda los eventos al instante, la ventana solo pregunta antes de cerrar si quedaron observaciones, estado del partido o un cambio a medio llenar sin guardar.
- **Reintentos:** con el servidor caído el error aparece a los 7 a 8 segundos, porque React Query reintenta 3 veces. Se mantuvo así porque ayuda con señal inestable en la cancha. Bajarlo a 1 reintento lo mostraría en unos 2 segundos.
- **Fase 3 no agrega confirmación al quitar un jugador de la planilla:** el plan lo pone en la Fase 5. Solo se le dio nombre accesible.

### Cómo se verificó

- `npm run build` sin errores. `npm run lint`: los mismos 5 errores previos, ninguno nuevo.
- Búsqueda en el código: 0 usos de `alert(`, `confirm(` o `prompt(`.
- Prueba automática con el backend apagado, en 390 y 1.440 px: Dashboard, Campeonatos, detalle, Equipos, Jugadores, Reportes, Estadios y Oficiales muestran «Reintentar» y ningún mensaje de lista vacía. Al volver el servidor, «Reintentar» recupera los datos.
- Prueba con fallas parciales: con el campeonato cargado y las jornadas o grupos caídos, cada sección muestra su propio error.
- Prueba de flujos con el servidor funcionando: confirmación al eliminar, Esc la cierra, aviso «Campeonato eliminado»; «Cancelar» en la ventana; aviso de descarte al cerrar con cambios y «Seguir editando» conserva lo escrito; sin cambios, Esc cierra directo; aviso «Campeonato creado»; minuto 150 rechazado y minuto 32 registrado con aviso; la planilla sin cambios cierra sin preguntar. El navegador no abrió ninguna ventana propia en toda la prueba.
- Accesibilidad en seis ventanas (campeonato, planilla, jugador, equipo, estadio, oficial): 0 etiquetas sin campo, 0 campos sin nombre, 0 botones sin nombre; todas con `role="dialog"` y título.
- En 390 y 768 px siguen en 0 los controles menores de 44 px y el desplazamiento lateral. En 1.440 px las pantallas quedan iguales, salvo el botón «Cancelar» nuevo en las ventanas.
- **Límite:** Chromium sobre Linux con datos de ejemplo.

### Anotado para otras fases

- **Fase 4:** en el formulario de jugador, la fila Fecha de nacimiento, Edad y Dorsal queda apretada en celular.
- **Fase 5:** confirmación al quitar un jugador de la planilla.
- **Sin fase:** la cabecera de cada jornada se abre tocándola, pero no es un botón, así que no se puede abrir con el teclado.

### Siguiente paso

Probar y, si se aprueba, fusionar `ux/fase-3-ventanas` a `main`. Después, Fase 4 en `ux/fase-4-pantallas`.

---

## 2026-10-08 — Fase 4: Ajustes por pantalla

**Estado:** aprobada por Roberto y fusionada en `main` el 8 de octubre de 2026 (pull request #4). Publicada en producción.

Los hallazgos seguían vigentes, con dos matices: el servidor ya permite editar campeonatos y equipos (`PUT /api/campeonatos/{id}` y `PUT /api/equipos/{id}`), y la confirmación al eliminar un campeonato ya nombraba el campeonato desde la Fase 3.

### Piezas compartidas nuevas

| Archivo | Qué hace |
|---|---|
| `frontend/src/components/MenuAcciones.jsx` | Menú «⋮» siempre visible. Se abre con toque, clic o teclado (flechas, Esc, Inicio, Fin), devuelve el foco al botón y puede mostrar una acción desactivada con su motivo. Se dibuja con posición fija para que no lo recorte una tabla con desplazamiento y sigue al botón si se desplaza la página. |
| `frontend/src/utils/fechas.js` | `formatearFecha` («sáb 10 oct 2026 · 10:00»), `formatearRango` («1 sep – 20 dic 2026») y `anioDe`. Se arman a mano para no depender del idioma del navegador. |

### Qué cambió en las pantallas

| Pantalla | Archivo | Cambio |
|---|---|---|
| Campeonatos | `pages/campeonatos/Campeonatos.jsx` | Toda la fila lleva al detalle; el nombre es un enlace con subrayado al pasar el cursor. Menú con «Ver campeonato», «Editar» y «Eliminar». «Editar» abre el mismo formulario de creación con los datos cargados y agrega el estado (Planificado, En curso, Finalizado). Columna «Fechas» en lugar de «Año». El formulario ya no pide el año: lo toma de la fecha de inicio y lo muestra debajo. Valida que Fin sea posterior a Inicio con un mensaje junto al campo. Con la lista vacía: sin contador y un solo botón, «Crear campeonato». |
| Detalle del campeonato | `pages/campeonatos/CampeonatoDetalle.jsx` | La pestaña y la jornada abierta quedan en la dirección (`?tab=jornadas&jornada=12`); al recargar o volver atrás se abre en el mismo lugar y la jornada se lleva a la vista. La cabecera de cada jornada ahora es un botón: se abre con el teclado y anuncia si está abierta. Fechas legibles en Inicio, Fin y en cada partido. |
| Equipos | `pages/equipos/Equipos.jsx` | La ✕ pasa a un menú con «Editar» y «Eliminar». «Editar» usa el mismo formulario de creación. Al renombrar un equipo se refrescan todas las pantallas que lo muestran. Lista vacía: sin contador y un solo botón. |
| Jugadores | `pages/jugadores/Jugadores.jsx` | Búsqueda sin resultados: «Sin resultados para esa búsqueda», con el texto buscado y un botón «Limpiar búsqueda». La fila Fecha de nacimiento, Edad y Dorsal queda en dos filas (la fecha ocupa todo el ancho), en los formularios de crear y editar. Lista vacía: sin contador, sin buscador y un solo botón. |
| Reportes | `pages/reportes/Reportes.jsx` | Recuerda el último campeonato elegido en ese navegador. Si no hay uno guardado y solo existe un campeonato, lo elige solo. |

### Pendientes de servidor

Anotados en `docs/ux/PENDIENTES_BACKEND.md`: la lista de campeonatos no devuelve la modalidad ni el número de jornadas. Por eso:

- La columna «Modalidad» todavía no aparece; la pantalla la muestra sola cuando la API envíe `modalidad`.
- «Eliminar» se desactiva cuando la API envíe `totalJornadas`. Mientras tanto queda activo y, si el campeonato tiene jornadas, el servidor lo rechaza y la pantalla muestra su mensaje: «No se puede eliminar: el campeonato tiene jornadas registradas.».

### Decisiones

- **Menú en la lista de campeonatos también.** El plan lo pedía en Equipos; se usó el mismo menú en Campeonatos para que «Eliminar desactivado» pueda mostrar su motivo y para no llenar la fila de botones en celular.
- **Una sola jornada abierta a la vez.** Antes se podían abrir varias. Como la jornada abierta ahora vive en la dirección, se guarda una; abrir otra cierra la anterior.
- **Los cambios de pestaña y de jornada reemplazan la dirección, no agregan pasos al historial.** Así «Atrás» sale del campeonato en lugar de recorrer las pestañas.
- **El año se sigue enviando al servidor**, calculado desde la fecha de inicio, porque la API lo pide.
- **El Dashboard no se tocó**, aunque también muestra fechas técnicas: el plan deja su ajuste para la Fase 5.

### Cómo se verificó

- `npm run build` sin errores. `npm run lint`: los mismos 5 errores previos, ninguno nuevo.
- Prueba automática en 1.440, 768 y 390 px con datos de ejemplo, con el mismo resultado en los tres tamaños:
  - Campeonatos: tocar la fila abre el detalle; el menú se abre, empieza en la primera opción, Esc lo cierra y devuelve el foco; «Eliminar» desactivado con su motivo cuando hay jornadas; «Eliminar» pide confirmación con el nombre; «Editar» carga los seis campos; una fecha de fin anterior muestra el error; al guardar se envía el año 2027 deducido de «2027-01-10» y aparece «Cambios guardados.». La lista vacía tiene un solo botón y no muestra contador.
  - Detalle: `?tab=jornadas&jornada=2` se escribe al abrir con Enter; tras recargar y tras ir a Equipos y volver, la jornada 2 sigue abierta con sus partidos. Fechas «mar 1 sep 2026» y «sáb 10 oct 2026 · 10:00».
  - Equipos: menú con «Editar» y «Eliminar»; «Editar» carga nombre y país y envía el `PUT` correcto; «Eliminar» pide confirmación.
  - Jugadores: la búsqueda «zzzz» muestra «Sin resultados para esa búsqueda» y «Limpiar búsqueda» devuelve las 12 filas.
  - Reportes: sin nada guardado no elige; tras elegir el campeonato 2 y recargar, sigue elegido; con un solo campeonato lo elige solo.
- En 390 px: 0 controles menores de 44 px y 0 desplazamiento lateral en Campeonatos, detalle (tres pestañas), Equipos, Jugadores, Reportes y Mantenimiento. Se corrigió en el camino un texto oculto del encabezado de la tabla que ensanchaba la página en celular.
- El navegador no abrió ninguna ventana propia y no hubo errores de JavaScript.
- **Límite:** Chromium sobre Linux con datos de ejemplo. No se probó contra el servidor real ni en un celular físico.

### Anotado para otras fases

- **Fase 5:** confirmación al quitar un jugador de la planilla; servir Oswald desde la propia app para usarla sin señal; fechas legibles en el Dashboard.
- **Fase 6:** `modalidad` y `totalJornadas` en la lista de campeonatos.
- **Sin fase:** nada indica que las tablas se deslizan hacia los lados en celular; quedan emojis fuera del menú (pestañas, estados vacíos, estadio y país).

### Siguiente paso

Probar y, si se aprueba, fusionar `ux/fase-4-pantallas` a `main`. Después, Fase 5 (modo en vivo: interfaz) en `ux/fase-5-en-vivo`.

---

## 2026-10-08 — Fase 5: Modo en vivo (interfaz)

**Estado:** aprobada por Roberto y fusionada en `main` el 8 de octubre de 2026 (pull request #5). Publicada en producción. Falta la prueba en un partido real.

Los hallazgos seguían vigentes. Dos datos del código que cambian el plan:

- **No existe `GET /api/partidos/{id}`.** El partido solo se lee dentro de su jornada (`GET /api/jornadas/{id}`), así que la dirección del modo en vivo lleva la jornada: `/partidos/{id}/en-vivo?jornada={idJornada}`.
- **El Dashboard no recibe la jornada del partido** (`ProximoPartidoDto` no tiene `idJornada`), así que todavía no puede abrir el modo en vivo directamente.

Ambos quedaron en `PENDIENTES_BACKEND.md`.

### Qué se construyó

Una pantalla nueva, `/partidos/{id}/en-vivo?jornada={idJornada}`, a pantalla completa y sin el menú de administración. La planilla actual sigue igual como vía de registro posterior.

| Archivo | Qué hace |
|---|---|
| `frontend/src/pages/vivo/EnVivo.jsx` | La pantalla. Encabezado fijo con marcador, reloj y último registro con «Deshacer». Tres etapas: **Convocatoria** (pasar lista con foto, selección múltiple y «Titulares» o «Suplentes»; «Quitar» pide confirmación), **Partido** (un equipo a la vez; en cancha con dorsal grande en filas de 64 px; banca y los que salieron) y **Cierre** (marcador, todos los registros por minuto y «Cerrar partido y marcarlo como jugado»). Al tocar un jugador se abre una hoja con el minuto del reloj (con − y + o escrito) y botones de 80 px: Gol, Amarilla, Roja, Gol en contra y «Cambio: sale este jugador». |
| `frontend/src/pages/vivo/reloj.js` | Reloj del partido: iniciar, pausar, reanudar, terminar cada tiempo, duración de cada tiempo (45 por defecto) y reiniciar. Se guarda en el dispositivo como hora de inicio, así que sobrevive a una recarga. El tiempo añadido se muestra «45:00 +2» y se registra como minuto 45 (o 90). |
| `frontend/src/pages/vivo/cola.js` | Cola de envío. Cada gol, tarjeta o cambio se guarda en el dispositivo y se envía en orden; sin señal reintenta al volver la conexión y cada 15 segundos. Si un envío quedó sin respuesta, antes de reenviarlo consulta el partido y, si el registro ya está, no lo manda otra vez. Lo que el servidor rechaza queda a la vista con su motivo. |
| `frontend/src/pages/vivo/pantallaEncendida.js` | Pide al navegador que no apague la pantalla mientras el modo en vivo está abierto, y lo vuelve a pedir al regresar a la pestaña. |
| `frontend/src/pages/vivo/almacen.js` | Lectura y escritura segura en el almacenamiento del navegador. |
| `frontend/src/utils/planilla.js` | Lógica de cancha y banca compartida con la planilla (`jugadoresEnCancha`, `suplentesDisponibles`, `ordenarPorDorsal`) y el marcador calculado desde los eventos, con la misma regla que el servidor. |
| `frontend/src/utils/fotos.js` | Arma la dirección de la foto del jugador, que el servidor guarda como ruta propia. |
| `frontend/src/App.jsx` | Ruta nueva, fuera del menú de administración. |

### Otros cambios

- **Detalle del campeonato** (`CampeonatoDetalle.jsx`): botón «● En vivo» en cada partido. En la planilla, quitar a un jugador ahora pide confirmación con su nombre. La lógica de cancha y banca se movió a `utils/planilla.js` sin cambios.
- **Dashboard** (`Dashboard.jsx`): las tarjetas de partido son enlaces a la pestaña Jornadas del campeonato y muestran fechas legibles. «Registrar en vivo» aparece cuando la API envíe `idJornada`.
- **Oswald local** (`main.jsx`, `index.html`, `package.json`): la fuente de títulos se sirve desde la propia app con `@fontsource/oswald`; ya no depende de Google Fonts. `index.html` tiene `theme-color` oscuro para la barra del navegador en celular.

### Alto contraste

El modo en vivo usa fondo negro, texto blanco y grises claros, y botones de color sólido con texto negro (verde, amarillo, gris claro) o blanco (rojo). No usa los grises azulados del resto de la app.

### Datos sin señal

- La jornada y los planteles se guardan en el dispositivo cada vez que llegan. Si se recarga la página sin señal, se ve la última copia con un aviso.
- La convocatoria, «Quitar», «Deshacer» de algo ya enviado y «Cerrar partido» necesitan señal y lo dicen si no la hay. «Deshacer» de algo que aún no salió funciona sin señal.
- **Límite:** sin señal, la página tiene que estar ya abierta. Cargar la app desde cero sin conexión necesitaría un *service worker*, que no se agregó en esta fase.

### Decisiones

- **Sin avisos emergentes por cada evento.** El registro aparece en la barra del último registro, arriba, y el celular vibra. Los avisos emergentes tapaban la parte de abajo de la pantalla.
- **Las tarjetas no sacan al jugador de la cancha.** Se marca «Expulsado» con una roja o dos amarillas, pero la lógica de cancha y banca se mantuvo como estaba.
- **«Deshacer» solo deshace el último registro de este dispositivo.** Para corregir otros, la planilla.
- **Las observaciones, desierto y perdido por reglamento siguen en la planilla.** El plan pone las observaciones del vocal en la Fase 8.
- **Si el inicio de sesión vence durante el partido**, la app lleva a la pantalla de ingreso, como en el resto. La cola y el reloj quedan guardados y se retoman al volver a abrir el partido.

### Cómo se verificó

- `npm run build` sin errores. `npm run lint`: los mismos 5 errores previos, ninguno nuevo.
- Prueba automática en 390 px (táctil) con un servidor simulado que guarda lo que recibe:
  - Pantalla completa sin menú. Con el reloj en 31:05, la hoja del jugador propone el minuto 32; «Gol» lo registra y el marcador pasa a 1–0; «Deshacer» lo borra del servidor y vuelve a 0–0. Un minuto cambiado a mano (40) se envía como 40.
  - Sin servidor: un gol, un cambio y una roja al jugador que entró quedan como «3 por enviar», el marcador sube y el suplente aparece en cancha. Al recargar la página sin servidor siguen el marcador, los 3 pendientes y el reloj.
  - Al volver el servidor, el primer envío llega pero su respuesta se corta: en el reintento la cola lo encuentra en el partido y no lo reenvía. Resultado: 3 eventos y 1 cambio en el servidor, sin duplicados (5 envíos en total).
  - Un rechazo del servidor (400) queda a la vista con su motivo y no se reintenta.
  - Convocatoria del visitante: 7 titulares y 2 suplentes por selección múltiple; «Quitar» pide confirmación y borra; la foto se abre en grande o dice que no hay.
  - Cierre: el resumen tiene las mismas 4 filas que el servidor (3 eventos y 1 cambio); «Cerrar partido» pide confirmación con el resultado, marca el partido como jugado y detiene el reloj.
  - Partido completo con reloj simulado, sin escribir minutos: gol al 21, amarilla en tiempo añadido del 1.er tiempo registrada al 45, gol al 56 en el 2.º tiempo.
  - Reloj real: corre, sigue corriendo tras recargar, la pausa lo detiene.
- En 390 y 768 px: 0 controles menores de 44 px (las casillas miden 22 px, pero se tocan en toda su fila de 56 px) y 0 desplazamiento lateral. En 1.440 px tampoco hay desplazamiento lateral.
- Planilla: «Quitar» pide «¿Quitar a (1) Jose Luis Garcia Veloz de la planilla?». Dashboard: «sáb 10 oct 2026 · 10:00» y, con `idJornada`, «Registrar en vivo» apunta al modo en vivo.
- Las pruebas de la Fase 4 dan el mismo resultado que antes. La app ya no pide nada a Google Fonts y los títulos siguen en Oswald.
- **Límite:** Chromium sobre Linux con datos simulados. No se probó en un celular real, a pleno sol ni contra el servidor real. Que la pantalla no se apague depende del navegador: Chrome y Safari recientes lo permiten; si no, no se nota ningún error, simplemente no aparece «Pantalla encendida».

### Anotado para otras fases

- **Fase 6:** `GET /api/partidos/{id}`, `idJornada` en el Dashboard y `fotoUrl` en la alineación (en `PENDIENTES_BACKEND.md`).
- **Fase 8:** estado del partido (sin iniciar, en vivo, cerrado), autor de cada evento, bloqueo tras el cierre, observaciones del vocal e identificador por evento para que el servidor rechace duplicados.
- **Sin fase:** cargar la app sin señal (service worker); nada indica que las tablas se deslizan hacia los lados en celular; quedan emojis fuera del menú.

### Siguiente paso

Probar en un celular y, si se aprueba, fusionar `ux/fase-5-en-vivo` a `main`. La Fase 6 resuelve `PENDIENTES_BACKEND.md` sin cambiar el esquema. Antes de dar el modo en vivo por terminado, el plan pide probarlo en un partido real.

---

## 2026-10-08 — Fase 6: Pendientes de servidor

**Estado:** aprobada por Roberto y fusionada en `main` el 9 de octubre de 2026 (pull request #6). Publicada en producción.

Resuelve todo lo anotado en `PENDIENTES_BACKEND.md` para esta fase. Ningún cambio toca el esquema de la base de datos: solo se agregan datos a respuestas que ya existían y un endpoint de lectura.

De los candidatos que el plan listaba, dos ya estaban resueltos en el código: el servidor ya permitía editar un equipo (`PUT /api/equipos/{id}`) y ya rechazaba eliminar un campeonato con jornadas.

### Qué cambió en el servidor

| Archivo | Cambio |
|---|---|
| `Application/DTOs/Campeonatos/CampeonatoDtos.cs`, `Infrastructure/Services/CampeonatoService.cs` | `GET /api/campeonatos` devuelve también `modalidad` y `totalJornadas`. |
| `Application/DTOs/Dashboard/DashboardDtos.cs`, `Infrastructure/Services/DashboardService.cs` | `idJornada` en cada próximo partido y en cada último resultado. |
| `API/Controllers/JornadasController.cs`, `Application/Interfaces/IJornadaService.cs`, `Infrastructure/Services/JornadaService.cs` | Endpoint nuevo `GET /api/partidos/{id}`, con el mismo detalle que trae cada partido de la jornada y el mismo control de acceso que el resto de los endpoints del partido. |
| `Application/DTOs/Partidos/PartidoDtos.cs`, `Application/DTOs/Equipos/EquipoDtos.cs`, `JornadaService.cs`, `EquipoService.cs` | `fotoUrl` en cada jugador de la alineación y del plantel del equipo. |

Todos los campos se agregaron al final de cada respuesta, así que el frontend anterior los ignora y nada se rompe si el servidor se publica antes que el frontend o al revés.

### Qué cambió en el frontend

- **Campeonatos y Dashboard:** no hizo falta tocarlos. Desde las fases 4 y 5 ya usan `modalidad`, `totalJornadas` e `idJornada` cuando llegan: aparece la columna «Modalidad», «Eliminar» se desactiva con jornadas, «Próxima fecha» abre la jornada exacta y muestra «Registrar en vivo».
- **Modo en vivo** (`pages/vivo/EnVivo.jsx`):
  - `?jornada=` pasa a ser opcional. Si falta, se pide el partido a `GET /api/partidos/{id}`, se completa la dirección y sigue igual. Las direcciones con `?jornada=` siguen sirviendo.
  - Las fotos se toman del plantel y de la alineación. La lista general de jugadores solo se pide si el plantel no trae fotos (servidor anterior o equipo sin ninguna foto, porque el servidor omite los campos vacíos).

### Orden de publicación

Al fusionar, Railway publica el servidor y Vercel el frontend a la vez. Como los cambios son compatibles en ambos sentidos, el orden no importa.

### Cómo se verificó

- **Servidor:** este entorno no puede descargar .NET ni paquetes NuGet, así que la compilación se hizo en GitHub Actions, en una rama temporal (`ci/verificar-fase-6`) que no forma parte del pull request. Desde este entorno no se pudo borrar: Roberto puede eliminarla en GitHub (pestaña Branches). No afecta a producción. Ahí:
  - `dotnet build` del proyecto API en Release, sin errores.
  - Un programa de prueba creó la base con el modelo de EF Core en un MySQL 8 vacío y ejecutó las consultas cambiadas (lista de campeonatos, Dashboard, partido suelto, jornada y equipo) para comprobar que se traducen a SQL. Todas terminaron sin error. Con la base vacía no se comprobaron valores, solo que las consultas funcionan.
- **Frontend:** `npm run build` sin errores; lint con los mismos 5 errores previos.
  - Modo en vivo sin `?jornada=`: pide el partido, completa la dirección y muestra los 11 en cancha. Con un id que no existe muestra «No se encontró este partido».
  - Con fotos en el plantel no pide la lista general de jugadores; sin ellas, sí.
  - Campeonatos con los campos nuevos: aparece la columna «Modalidad» y «Eliminar» queda desactivado en el campeonato con jornadas.
- **Límite:** no se probó contra la base de datos real. Conviene revisar en producción, después de publicar, que la lista de campeonatos muestre la modalidad y que el Dashboard abra la jornada correcta.

### Anotado para otras fases

- **Fase 7:** rol Vocal (requiere base de datos; primero la propuesta de diseño).
- **Fase 8:** estado del partido, autor de cada evento, bloqueo tras el cierre, observaciones del vocal e identificador por evento contra duplicados.

### Siguiente paso

Probar y, si se aprueba, fusionar `ux/fase-6-servidor` a `main`. Después, la Fase 7 empieza con una propuesta de diseño para aprobar antes de escribir código.

---

## 2026-10-09 — Fase 7: Rol Vocal

**Estado:** script `20261009_rol_vocal.sql` aplicado en Railway por Roberto y fusionada en `main` el 9 de octubre de 2026 (pull request #7). Publicada en producción.

Diseño aprobado: `docs/ux/PROPUESTA_FASES_7_8.md`, con el ajuste de Roberto al punto 1 (código del titular vigente durante el campeonato y registro solo el día del partido; enlace de una vez para el reemplazo de un día).

### Base de datos

- `backend/database/20261009_rol_vocal.sql`: agrega `VOCAL` al rol de `usuario` y crea `campeonato_vocal` (quién está habilitado, como titular o como reemplazo de un día) e `invitacion_vocal` (códigos de un solo uso; se guarda solo su hash SHA-256).
- `backend/database/20261009_rol_vocal_reversa.sql`: borra las dos tablas y quita el rol. Falla a propósito si quedan usuarios vocales, para no perder datos; el archivo explica qué hacer.
- Compatible con la versión publicada: tablas nuevas y un valor más en el ENUM.

### Servidor

| Archivo | Cambio |
|---|---|
| `API/Program.cs` | La política por defecto de `[Authorize]` rechaza el rol Vocal. Política `SoloVocal` para `/api/vocal`. Respuesta 403 con mensaje en español. |
| `API/Controllers/VocalesController.cs` | Endpoints del organizador (`/api/campeonatos/{id}/vocales`: listar, invitar, anular, quitar), públicos (`/api/invitaciones/{código}` y `…/aceptar`) y del vocal (`/api/vocal/inicio`, partido, convocatoria, eventos, cambios, cerrar y delegar un reemplazo). |
| `Infrastructure/Services/VocalService.cs` | Invitaciones, aceptación (crea la cuenta Vocal o vincula una existente), inicio del vocal, partido con planteles y cierre con observaciones. |
| `Infrastructure/Services/AccesoCampeonato.cs` | Con rol Vocal, un partido (y sus eventos, cambios y convocatoria) solo es accesible si es **hoy** en Ecuador y el vocal está habilitado hoy en su campeonato. El vocal no tiene acceso a campeonatos, jornadas, grupos ni fases. |
| `Infrastructure/Services/HoraLocal.cs` | Fecha de Ecuador (UTC−5); el servidor de Railway corre en UTC. |
| `Infrastructure/Services/DashboardService.cs` | **Corrige el hallazgo:** cada organizador ve solo sus campeonatos, equipos, jugadores y partidos. El Admin ve todo. |
| `Domain/Entities/CampeonatoVocal.cs`, `InvitacionVocal.cs`, `Usuario.cs`, `Data/LigaManagerContext.cs`, `Application/DTOs/Vocales/VocalDtos.cs` | Entidades, mapeo y DTOs. |

Las operaciones del vocal reutilizan los métodos de `JornadaService`, así que las reglas del partido (cancha y banca, desierto, reglamento, fechas del campeonato) son las mismas que para el organizador.

### Frontend

| Archivo | Cambio |
|---|---|
| `pages/campeonatos/TabVocales.jsx` | Pestaña «Vocales» en el campeonato: invitar titular o reemplazo por un día, ver habilitados, quitar (con confirmación) y anular invitaciones. |
| `components/InvitacionCreada.jsx` | Código recién creado con «Copiar código», «Copiar enlace» y «WhatsApp». |
| `pages/vocal/Invitacion.jsx` | `/invitacion` (escribir el código dictado) y `/invitacion/{código}`: crear la cuenta de vocal, entrar con una existente o, si hay sesión de organizador, pedir cerrar sesión. |
| `pages/vocal/InicioVocal.jsx` | `/vocal`: partidos de hoy con «Registrar», próximos solo para mirar y, para el titular, «No puedo ir: delegar un día». Alto contraste, sin menú de administración. |
| `pages/vivo/EnVivo.jsx`, `cola.js` | Con rol Vocal, el modo en vivo usa `/api/vocal` (una sola llamada trae partido y planteles), «Salir» vuelve a `/vocal` y el cierre pide observaciones. |
| `App.jsx`, `LoginPage.jsx`, `context/AuthContext.jsx` | Rutas nuevas; el vocal que entra a la administración va a `/vocal`; el ingreso del vocal lleva directo a sus partidos; enlace «¿Eres vocal y tienes un código?». |

### Cómo se verificó

- **Servidor, en GitHub Actions** (rama temporal `ci/verificar-fase-7`, fuera del pull request), con MySQL 8: compilación en Release; base creada con el modelo, **aplicando el script real de la Fase 7**; API corriendo de verdad; **55 pruebas de punta a punta, todas bien**:
  - invitación titular: solo el dueño del campeonato la crea; se consulta sin sesión (el código acepta minúsculas y espacios); un organizador no puede aceptarla; crea la cuenta Vocal; no sirve dos veces;
  - inicio del vocal: solo el partido de hoy de su campeonato; el de mañana como próximo; nada de otros campeonatos;
  - el vocal convoca, registra gol, tarjeta y cambio, deshace un evento y cierra con observaciones (queda jugado); no abre ni registra el partido de mañana ni el de otro campeonato;
  - **17 llamadas de la columna «no puede» devuelven 403**: ver o crear campeonatos, ver jornadas, editar, borrar o marcar partidos, registrar por la vía del organizador, equipos, jugadores, Dashboard, vocales del campeonato, estadios y oficiales;
  - reemplazo: el titular delega el día; el reemplazo ve y registra solo ese día; no puede delegar; un reemplazo de mañana no ve nada hoy;
  - invitación anulada no sirve; el organizador ve titular y reemplazos; al quitar al vocal, deja de acceder;
  - Dashboard: un organizador ve solo lo suyo; otro organizador no lee un partido ajeno.
  - Script de reversa: falla con vocales existentes (como debe), funciona después de desactivarlos, y el script se puede volver a aplicar.
- **Pantallas** (Playwright, 390 y 1.440 px, datos simulados): invitación por código escrito y por enlace, cuenta nueva que llega a `/vocal`, delegar un día con su enlace de WhatsApp, vocal redirigido desde la administración, modo en vivo del vocal contra `/api/vocal` (gol, deshacer, cierre con observaciones), invitación vencida, organizador con sesión abriendo una invitación, pestaña Vocales (invitar, copiar enlace, quitar, anular) e ingreso del vocal directo a `/vocal`. 0 controles menores de 44 px y 0 desplazamiento lateral en 390 px.
- `npm run build` sin errores; lint con los mismos 5 errores previos.
- **Límite:** no se probó contra la base de producción ni en un celular real.

### Despliegue (en este orden)

1. En Railway, conviene correr `SHOW TRIGGERS;` y confirmar que no hay triggers en `usuario`.
2. Aplicar `backend/database/20261009_rol_vocal.sql` en la base de Railway.
3. Fusionar el pull request (Railway publica el servidor y Vercel el frontend).

Si se fusiona sin aplicar el script, el servidor nuevo falla al leer las tablas de vocales.

### Anotado para otras fases

- **Fase 8:** estado del partido (sin iniciar, en vivo, cerrado), autor de cada registro, bloqueo después del cierre y protección del servidor contra duplicados.
- **Sin fase:** el servidor no limita los intentos de adivinar un código de invitación (10 caracteres de 31 símbolos, unas 8×10¹⁴ combinaciones); si se quiere, se puede agregar un límite de intentos por IP.

---

## 2026-10-09 — Fase 8: Modo en vivo, cierre y registro

**Estado:** script `20261009_registro_en_vivo.sql` aplicado en Railway por Roberto y fusionada en `main` el 9 de octubre de 2026 (pull request #8). Publicada en producción. Falta la prueba en un partido real con el vocal.

### Base de datos

- `backend/database/20261009_registro_en_vivo.sql`:
  - `partido`: `estado_registro` (SIN_INICIAR, EN_VIVO, CERRADO), `iniciado_en`, `cerrado_en` e `id_usuario_cierre`.
  - `eventopartido` y `cambio_partido`: `id_usuario_registro` e `id_cliente` (único por partido).
  - `alineacion_jugador`: `id_usuario_registro`.
  - Todo con valor por defecto o nulo: los partidos existentes quedan «sin iniciar» y sin autor.
- `backend/database/20261009_registro_en_vivo_reversa.sql`: quita todo lo anterior y conserva los goles, tarjetas, cambios y convocatorias.
- Dos detalles que encontró la prueba en MySQL real y quedaron resueltos en los scripts:
  - `id_cliente` es `VARCHAR(36)` y no `CHAR(36)`, porque el conector de MySQL lee `CHAR(36)` como Guid y el servidor fallaba al leer el partido.
  - La reversa crea un índice sobre `id_partido` antes de borrar el índice único, porque MySQL puede usar ese índice único para la clave foránea y entonces no deja borrarlo.

### Servidor

| Archivo | Cambio |
|---|---|
| `Domain/Entities/Partido.cs`, `EventoPartido.cs`, `CambioPartido.cs`, `AlineacionJugador.cs`, `Data/LigaManagerContext.cs` | Campos nuevos y su mapeo (`EstadoRegistro` con conversión al ENUM de MySQL). |
| `Application/DTOs/Partidos/PartidoDtos.cs` | El partido trae `estadoRegistro`, `iniciadoEn`, `cerradoEn` y `cerradoPor`. Cada evento, cambio y convocatoria trae `registradoPor`; eventos y cambios, su `idCliente`. Los pedidos de evento y cambio aceptan `idCliente` (opcional). `MarcarJugadoRequest` se conserva. |
| `Infrastructure/Services/JornadaService.cs` | Guarda quién registra cada cosa. Si llega un `idCliente` repetido, devuelve el partido sin crear nada (también si dos envíos llegan a la vez). El primer registro del modo en vivo o de un vocal pone el partido «en vivo». Métodos nuevos: iniciar, cerrar (observaciones, quién y cuándo, y marca jugado) y reabrir (solo el organizador). |
| `API/Controllers/JornadasController.cs` | `PUT /api/partidos/{id}/iniciar`, `/cerrar` y `/reabrir` para el organizador. |
| `API/Controllers/VocalesController.cs`, `VocalService.cs` | Con el partido cerrado, toda escritura del vocal responde **409** «El partido está cerrado…». Nuevo `PUT /api/vocal/partidos/{id}/iniciar`. El cierre del vocal usa el cierre nuevo. |

### Frontend

- **Modo en vivo** (`pages/vivo/EnVivo.jsx`, `cola.js`, `reloj.js`):
  - Cada gol, tarjeta o cambio manda su `idCliente`, y la cola lo usa para reconocer lo que ya llegó.
  - «Iniciar partido» avisa al servidor la hora de inicio.
  - Si el partido ya empezó en otro dispositivo, ofrece «Retomar desde esa hora» o «Empezar de cero».
  - Con el partido cerrado, el vocal solo ve el resumen, con «Cerrado por … a las …». No hay botones de registro ni reloj.
  - El organizador cierra con el endpoint nuevo, así que su cierre también queda registrado.
- **Detalle del campeonato** (`CampeonatoDetalle.jsx`):
  - Cada partido muestra «Registro en vivo: sin iniciar», «● En vivo desde las 10:02» o «Cerrado por Juan Vocal, 11:48», con el botón «Reabrir para el vocal» (pide confirmación).
  - Cada evento dice «registrado por …».

### Decisiones

- **Reloj solo en el dispositivo**, como se aprobó. El servidor guarda la hora de inicio; al retomarla en otro dispositivo no se cuentan las pausas, y el minuto se puede corregir en cada registro.
- **Reabrir no desmarca «jugado».** El partido sigue contando en la tabla; si el vocal agrega un gol, el marcador se recalcula.
- **El organizador no tiene bloqueo:** corrige desde la planilla en cualquier momento.

### Cómo se verificó

- **Servidor, en GitHub Actions** (rama temporal `ci/verificar-fase-8`), con MySQL 8, los scripts reales de las fases 7 y 8 aplicados y el API corriendo:
  - Las 55 pruebas de la Fase 7 siguen bien.
  - 26 pruebas nuevas, todas bien:
    - un partido empieza sin iniciar y pasa a en vivo con el primer registro del vocal;
    - el mismo evento y el mismo cambio enviados dos veces se guardan una sola vez;
    - autor de convocatorias, eventos y cambios, del vocal o del organizador;
    - el cierre deja cerrado, jugado, con autor, hora y observaciones;
    - con el partido cerrado, 7 escrituras del vocal responden 409, pero sigue viendo el resumen;
    - el vocal no puede reabrir (403);
    - el organizador corrige y borra después del cierre, reabre, el vocal vuelve a registrar, y el organizador también puede cerrar;
    - los partidos viejos quedan sin iniciar y sin autor.
  - Reversas: la de la Fase 8 quita sus columnas y conserva los eventos; la de la Fase 7 falla con vocales y funciona después de desactivarlos; los dos scripts se vuelven a aplicar.
- **Pantallas** (Playwright, 390 y 1.440 px), todas bien:
  - el vocal inicia el partido y el servidor recibe la hora;
  - el gol lleva un `idCliente` con forma de UUID;
  - al cerrar, el vocal queda en el resumen sin registro ni reloj, también tras recargar;
  - en otro dispositivo se retoma el reloj desde la hora de inicio (18:30 a las 10:20:30 con inicio a las 10:02);
  - el organizador ve «Cerrado por Juan Vocal, 11:48» y «registrado por Juan Vocal», y reabre con confirmación.
  - Además se repitieron las pruebas de las fases 5 y 7, con el mismo resultado. 0 controles menores de 44 px en 390 px.
- `npm run build` sin errores; lint con los mismos 5 errores previos.
- **Límite:** no se probó contra la base de producción ni en un partido real. El plan pide probar el modo en vivo en un partido de verdad antes de darlo por terminado.

### Despliegue (en este orden)

1. Fase 7 completa: script `20261009_rol_vocal.sql` y fusionar su pull request.
2. Aplicar `backend/database/20261009_registro_en_vivo.sql` en Railway.
3. Fusionar el pull request de la Fase 8.

Si se fusiona la Fase 8 sin su script, el servidor nuevo falla al leer los partidos.

### Pendiente

- Probar el modo en vivo en un partido real, con el vocal (pedido del plan).
- Borrar en GitHub las ramas temporales `ci/verificar-fase-6`, `ci/verificar-fase-7` y `ci/verificar-fase-8` (desde aquí no hay permiso para borrarlas).

---

## 2026-10-10 — Mejora: límite de intentos fallidos

**Estado:** aprobada por Roberto y fusionada en `main` el 10 de octubre de 2026 (pull request #9). Publicada en producción. Solo cambia el servidor; **no necesitó script de base de datos**.

### Qué se cambió

- Las rutas públicas donde se escribe un código o una clave cuentan los intentos fallidos por dirección IP:
  - **invitación** (`GET /api/invitaciones/{codigo}` y `POST …/aceptar`);
  - **inicio de sesión** (`POST /api/auth/login`).
- Con **10 fallos en 15 minutos**, esa IP queda bloqueada en ese grupo hasta que pasen los 15 minutos. Recibe 429 con el mensaje «Demasiados intentos fallidos. Espera N minutos e inténtalo de nuevo.», que las pantallas ya muestran donde aparecen los demás errores.
- Un intento correcto borra la cuenta de fallos. Los grupos son independientes: el bloqueo de invitación no impide iniciar sesión.
- La IP real se lee de `X-Forwarded-For`, que agrega el proxy de Railway. Solo cuenta el último valor, así no se puede esquivar el bloqueo poniendo otra IP delante.
- Archivos: `backend/src/LigaManager.API/Seguridad/LimiteIntentos.cs` (nuevo), `Program.cs`, `AuthController.cs`, `VocalesController.cs`.

### Decisiones

- Se cuentan solo los **fallos** (400, 401, 404), no todas las visitas, para no bloquear a varios vocales que comparten el wifi de la cancha.
- Una invitación vencida o ya usada no es un fallo: el servidor responde 200 con el motivo.
- Los contadores están en la memoria del servidor: si Railway reinicia el servicio, se borran. Basta para frenar a quien prueba códigos o claves al azar, y evita una tabla nueva.
- El registro de organizadores (`/api/auth/register`) no se limitó: no hay nada que adivinar ahí.

### Cómo se verificó

- GitHub Actions con MySQL y el API real (rama temporal `ci/verificar-limite`): **15 pruebas nuevas**, todas bien:
  - 10 códigos falsos dan 404 y el 11.º, 429 con el mensaje en español y `Retry-After` de unos 900 segundos;
  - bloqueada, ni el código correcto ni aceptar pasan; otra IP sí entra;
  - no se esquiva poniendo otra IP delante; 10 claves malas bloquean el login;
  - con 9 fallos todavía entra, y un acierto reinicia la cuenta;
  - sin `X-Forwarded-For` todo sigue funcionando.
- Se repitieron las 81 pruebas de las fases 7 y 8, todas bien.

### Pendiente

- Borrar en GitHub la rama temporal `ci/verificar-limite`.

## 2026-10-10 — Registro de avance

- Las líneas de estado de las fases 7 y 8 decían «pendiente»; ya dicen que están publicadas.

---

## 2026-10-10 — Mejora: la app abre sin señal

**Estado:** fusionada en `main` el 10 de octubre de 2026 (pull request #10). Publicada en producción. Solo cambia la página web (Vercel): **sin servidor ni base de datos**.

### Qué se cambió

- **Service worker** (`frontend/sw/sw.js`): la primera vez que se abre la app con señal, el navegador guarda en el celular todos los archivos de esa versión: JS, CSS, fuentes e íconos (19 archivos).
  - Al abrir o recargar una página, primero se intenta la red, con 4 segundos de espera. Sin señal, o con una señal tan débil que no responde, abre la copia guardada.
  - Las llamadas al servidor de Railway no pasan por ahí: los datos los sigue manejando cada pantalla.
- `vite.config.js` genera `dist/sw.js` en cada `npm run build`, con la lista de archivos y una versión calculada sobre su contenido. Al publicar en Vercel, el celular descarga la versión nueva y borra la anterior. En `npm run dev` no se usa.
- **Inicio del vocal** (`InicioVocal.jsx`): guarda una copia de sus partidos. Sin señal, muestra los partidos de hoy con el aviso «Sin conexión. Se muestra lo último que llegó.» y un botón «Reintentar». Una copia de otro día se ignora.
- **Instalar en la pantalla de inicio:** `manifest.webmanifest` y los íconos `icono-180/192/512.png` y `icono-maskable-512.png`, hechos del mismo logo. En Android: menú de Chrome → «Agregar a la pantalla principal». En iPhone: Compartir → «Agregar a inicio».

### Decisiones

- Las páginas van **primero por la red**: con señal siempre se ve la versión publicada. La copia solo se usa si la red no responde en 4 segundos.
- Las fotos de los jugadores vienen de Railway y no se guardan: sin señal se ven las iniciales.
- Sin dependencias nuevas: el service worker es un archivo propio de unas 60 líneas.

### Cómo se verificó

Pruebas con Playwright sobre `npm run build` + `vite preview`, celular a 390 px y escritorio a 1.440 px, con la red cortada de verdad:
- el service worker toma control y guarda 19 archivos;
- sin señal, la recarga de `/vocal` sale del service worker y muestra los partidos de hoy con el aviso;
- «Registrar» abre el partido con sus 11 jugadores, y la recarga directa de `/partidos/1/en-vivo` también abre;
- un gol anotado sin señal queda pendiente y se envía solo al volver la conexión;
- una copia de otro día no se usa: aparece «No se pudieron cargar tus partidos» con «Reintentar»;
- el organizador sin señal ve el menú y el error con «Reintentar» de cada pantalla;
- al publicar una versión nueva, el celular la toma en la siguiente visita, borra la anterior y sigue abriendo sin señal;
- `npm run build` sin errores; lint con los mismos 5 errores previos; 0 errores de página.

**Límite:** no se probó en un celular real ni en Vercel. Conviene probarlo en el celular: abrir la app con señal, activar el modo avión y recargar.

---

## 2026-10-10 — Mejoras: aviso «Desliza» en tablas e íconos en lugar de emojis

**Estado:** fusionada en `main` el 10 de octubre de 2026 (pull request #11). Publicada en producción. Solo cambia la página web: **sin servidor ni base de datos**.

### Tablas anchas

- Pieza nueva `frontend/src/components/TablaDesplazable.jsx`, usada en las 12 tablas con desplazamiento lateral:
  - Campeonatos y Jugadores;
  - en el detalle del campeonato, la tabla general, las posiciones por grupo y los equipos;
  - en Reportes, Posiciones, Nómina, Goleadores, las dos de Tarjetas y las dos de Suspensiones.
- Si la tabla no cabe:
  - el borde donde hay más columnas se difumina: a la derecha al inicio, y a los dos lados en el medio;
  - arriba a la derecha aparece «Desliza ››», que se va al deslizar por primera vez.
- Si cabe, no cambia nada. Medido: en 390 px aparece en todas; en 768 px solo en Jugadores; en 1.440 px en ninguna.

### Íconos

- Pieza nueva `frontend/src/components/IconoEvento.jsx` con los eventos del partido dibujados, iguales en Android, iPhone y Windows:
  - balón para el gol;
  - arco con red para el gol en contra;
  - tarjeta amarilla y roja;
  - flechas para el cambio.
- Se usan en el modo en vivo (botones, último registro, registros del cierre, goles del jugador), en la planilla, en la tarjeta del partido y en los encabezados de Tarjetas.
- El resto de emojis pasó a íconos de `lucide-react`, que la app ya usaba:
  - pestañas del campeonato, Reportes y Mantenimiento;
  - tarjetas del Dashboard;
  - estados vacíos;
  - estadio, árbitro, observaciones y equipo libre;
  - botones Planilla, Editar, Eliminar, Generar calendario y Registrar cambio.
- En la planilla, los equipos dicen «Local · …» y «Visitante · …», en lugar de 🏠 y ✈️.
- Quedan ✓, ✕ y ↩: son símbolos de texto, no emojis, y se ven igual en todos lados.
- `EmptyState` acepta un ícono (componente) o, como antes, un texto.

### Cómo se verificó

Playwright sobre `npm run build`, a 390, 768 y 1.440 px:
- Pantallas revisadas: Dashboard, Campeonatos, Jugadores, Equipos, Mantenimiento, el detalle con jornadas y la tarjeta del partido con 4 eventos, la planilla, las 4 pestañas de Reportes y el modo en vivo (partido, hoja del jugador, último registro y cierre).
- En todas: sin emojis en pantalla, sin desborde horizontal de la página y 0 errores.
- Al deslizar, la pista se va y el difuminado pasa a la izquierda; al llegar al final, solo queda el izquierdo.
- `npm run build` sin errores; lint con los mismos 5 errores previos.

---

## 2026-10-10 — Mejora: partido jugado en solo lectura en el modo en vivo

**Estado:** aplicada en la rama `mejora/jugado-solo-lectura`, creada desde `main` (`c1009a4`). Pendiente de que Roberto la pruebe y la apruebe. Cambia servidor y página web; **sin script de base de datos**.

### El problema

- Para el organizador, el modo en vivo nunca se bloqueaba, aunque el partido ya estuviera jugado.
- Para el vocal, solo se bloqueaba si el partido se había cerrado desde el modo en vivo. Si el organizador lo marcaba como jugado desde la tarjeta o la planilla, el vocal todavía podía registrar.

### Regla nueva

**Un partido jugado queda en solo lectura en el modo en vivo, para los dos, hasta que se desmarque.** Da igual cómo se marcó: cerrado en vivo, «Marcar jugado» en la tarjeta, desierto o perdido por reglamento.

- **Modo en vivo**, con el partido jugado:
  - se ve solo el resumen (marcador y registros), sin etapas, reloj ni botones de jugadores;
  - el aviso dice «Partido cerrado por … a las …» o «Partido marcado como jugado. Solo se puede ver.»;
  - el organizador tiene el botón **«Desmarcar jugado»**, con confirmación; al desmarcar vuelve a la vista del partido;
  - el vocal ve «Las correcciones las hace el organizador».
- **Tarjeta del partido:** si está jugado, el botón dice «Ver resumen» y abre el resumen; si no, sigue diciendo «● En vivo».
- **Servidor:**
  - el vocal recibe 409 («El partido ya está cerrado o marcado como jugado…») al registrar, convocar, iniciar o cerrar un partido jugado; puede seguir viéndolo;
  - desmarcar un partido cerrado lo deja otra vez en vivo y borra quién y cuándo lo cerró;
  - «Reabrir para el vocal» ahora también lo desmarca como jugado, porque si no seguiría bloqueado; el mensaje de confirmación lo explica.
- **Sin cambios:** la planilla. El organizador sigue corrigiendo un partido jugado desde ahí, sin desmarcarlo.

### Cómo se verificó

- **Servidor:** GitHub Actions con MySQL y el API real (rama temporal `ci/verificar-jugado`). 15 pruebas nuevas, todas bien:
  - desmarcar un partido cerrado lo reabre, y el vocal registra;
  - jugado desde la tarjeta, 4 escrituras del vocal dan 409, pero el vocal todavía lo ve y el organizador corrige;
  - reabrir lo desmarca, y el vocal vuelve a registrar.
  - Se repitieron las 81 pruebas de las fases 7 y 8, todas bien.
- **Pantallas:** Playwright, a 390 y 1.440 px.
  - Organizador con partido jugado: solo el resumen, sin reloj ni jugadores, con «Desmarcar jugado».
  - Al desmarcar se envía `jugado: false` y vuelven los 11 jugadores y el reloj.
  - Partido cerrado por el vocal: «Partido cerrado por Juan Vocal a las 11:48».
  - Vocal: solo el resumen, sin botón.
  - Tarjeta: «Ver resumen» o «● En vivo» según el estado.
  - 0 errores.
- `npm run build` sin errores; lint con los mismos 5 errores previos.

### Pendiente

- Borrar en GitHub la rama temporal `ci/verificar-jugado`.


## 2026-10-10 — Ajuste: sin «En vivo desde…» en partidos jugados

**Estado:** aplicado en la rama `mejora/chip-en-vivo-jugado`. Pendiente de que Roberto lo apruebe. Solo página web.

- Roberto vio «Finalizado» y «En vivo desde las 22:22» en el mismo partido (C.D.E.F Ventarrón 9-1 León F.C.). El 9 de octubre, antes del PR #12, se abrió el modo en vivo de ese partido ya jugado. Ese registro lo dejó «en vivo» y quedó así, porque no se cerró desde el modo en vivo.
- Ahora la tarjeta de un partido jugado no muestra «En vivo desde…». Si se cerró en vivo, sigue mostrando «Cerrado por …».
- Verificado con Playwright a 390 px:
  - jugado y en vivo: sin el aviso, con «Ver resumen»;
  - cerrado: «Cerrado por …», con «Ver resumen»;
  - en vivo sin jugar: «En vivo desde…», con «● En vivo».

---

## 2026-10-10 — Revisión de seguridad del servidor

**Estado:** fusionada en `main` el 10 de octubre de 2026 (pull request #14). Publicada en producción. Cambia servidor y configuración de Vercel; **sin script de base de datos y sin variables nuevas** (Railway ya tiene `JwtSettings__SecretKey`).

### Qué se revisó y resultado

| Área | Resultado |
|---|---|
| Rutas sin sesión | Solo login, registro e invitación, a propósito. ✅ |
| Permisos entre organizadores | Ataque con dos cuentas: 61 intentos de ver, cambiar, borrar o mezclar datos ajenos. Todos rechazados; los listados no muestran nada ajeno. ✅ |
| Contraseñas | Guardadas con BCrypt. ✅ |
| Consultas a la base | Todas por EF Core, sin SQL armado a mano. ✅ |
| Secretos en el historial de Git | Ninguna contraseña ni dirección de la base de producción. ✅ |
| Clave de sesión | Railway usa una propia ✅, pero la vieja seguía en el código → **corregido** |
| Mensajes de error | Devolvían el detalle técnico del error, en un JSON que podía quedar roto → **corregido** |
| Subida de fotos | Solo miraba el nombre del archivo → **corregido** |
| Encabezados de seguridad | No había → **agregados** |

### Cambios

- **Clave de sesión:** se quitó de `appsettings.json` y de `Program.cs`. Publicado (Railway o contenedor), el servidor **no arranca** sin `JwtSettings__SecretKey` o con la clave vieja. En la computadora (`dotnet run`) usa una clave de prueba y lo avisa en la consola.
- **Errores:**
  - los de la petición (400) muestran su mensaje; antes, una foto inválida daba 500;
  - los internos (500) se anotan en el registro de Railway con el detalle, y al usuario le llega «Ocurrió un error inesperado…».
- **Fotos:** se revisan los primeros bytes. Solo pasan JPG, PNG o WEBP de verdad, y se guardan con la extensión real.
- **Encabezados:**
  - en el servidor: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`;
  - en Vercel (`vercel.json`): los mismos, con `strict-origin-when-cross-origin`.

### Anotado, sin cambiar

- Ocho reportes de un campeonato ajeno responden «vacío» en vez de «no existe». No muestran datos.
- Registrar un jugador con una cédula que ya existe en otra liga responde «Ya existe un jugador con esa cédula». Revela que la cédula está registrada e impide inscribir al mismo jugador en dos ligas. **Decisión de diseño pendiente con Roberto.**
- La contraseña mínima es de 6 caracteres. Se puede subir junto con la mejora de cuentas.

### Cómo se verificó

GitHub Actions con MySQL y el API real (rama temporal `ci/verificar-permisos`):
- `prueba_permisos.py`: 61 ataques, 7 listados y la integridad de los datos de org1, todo bien.
- `prueba_seguridad.py`: encabezados; una «foto» HTML y un .exe dan 400; un PNG llamado .jpg se acepta y se guarda como .png.
- Arranque publicado: sin clave sale con error; con la clave vieja sale con error; con clave propia arranca.
- Las 81 pruebas de las fases 7 y 8, todas bien.
## 2026-10-10 — Mejora: el mismo jugador o árbitro en dos ligas

**Estado:** script `20261010_cedula_por_organizador.sql` aplicado en Railway por Roberto el 10 de octubre de 2026 (índice `idx_persona_cedula`, Non_unique = 1). Pendiente de fusionar el pull request #15.

### Decisión de Roberto

Un jugador sí puede jugar en ligas de distintos organizadores. Se eligió la opción **A: cada organizador tiene su propia ficha**. La alternativa, una ficha compartida, dejaba ver los datos del otro organizador.

### Qué cambió

- **Base de datos** (`20261010_cedula_por_organizador.sql`): `persona.cedula` deja de ser única en todo el sistema. Se cambia `uq_persona_cedula` por un índice normal, `idx_persona_cedula`.
  - La reversa (`…_reversa.sql`) solo funciona si no hay cédulas repetidas. El archivo trae la consulta para encontrarlas.
- **Servidor:**
  - Jugadores: al crear o editar, la cédula no se puede repetir **entre los jugadores del mismo organizador**. El mensaje es «Ya tienes un jugador registrado con esa cédula».
  - Árbitros: la misma regla entre los árbitros del mismo organizador. Antes, repetir una cédula daba un error del servidor.
  - Un árbitro puede tener la misma cédula que un jugador.
- Cada liga ve y edita solo su ficha: nombre, foto, dorsal e historial. Ya no se revela si la cédula existe en otra liga.

### Cómo se verificó

GitHub Actions (rama temporal `ci/verificar-cedula`), con la base en el estado de producción (`VARCHAR(20)` con `uq_persona_cedula`) y el script aplicado encima:
- el índice queda `idx_persona_cedula`, no único;
- org2 registra a un jugador que ya está en la liga de org1, cada uno ve solo su ficha y la de org1 no cambia;
- repetir la cédula dentro de la misma liga da 400, también al editar; usar una cédula que solo existe en otra liga, se permite;
- el mismo árbitro en dos ligas sí; repetido en la misma liga, 400; un árbitro con la cédula de un jugador, sí;
- reversa: con cédulas repetidas falla; resueltas, funciona, y el script se vuelve a aplicar;
- se repitieron las pruebas de permisos y seguridad, y las 81 de las fases 7 y 8, todas bien.

### Orden para publicar

1. En Railway, aplicar `backend/database/20261010_cedula_por_organizador.sql`.
2. Fusionar el PR.

Si se fusiona sin el script, el servidor nuevo deja pasar la cédula repetida y la base la rechaza con un error.

---

## 2026-10-10 — Mejora: tipo de documento (cédula, extranjero, pasaporte)

**Estado:** aplicada en la rama `mejora/tipo-documento`, creada desde `main`. Pendiente de que Roberto la apruebe. **Requiere un script en la base de datos antes de publicar.**

### Decisiones de Roberto

- Cédula ecuatoriana: 10 números **y dígito verificador**, como el Registro Civil.
- «Cédula de extranjero» = documento de otro país (cédula o DNI): solo números, de 5 a 15.
- Pasaporte: letras y números.

### Qué cambió

| Tipo | Regla |
|---|---|
| Cédula ecuatoriana | 10 números; provincia 01-24 o 30, tercer dígito menor a 6, verificador módulo 10 |
| Documento extranjero | Solo números, de 5 a 15 |
| Pasaporte | Letras y números, de 5 a 20, sin espacios ni símbolos; se guarda en mayúsculas |

- **Base de datos** (`20261010_tipo_documento.sql`): columna `persona.tipo_identificacion` ENUM('CEDULA','EXTRANJERO','PASAPORTE'), por defecto CEDULA. Al final, el script muestra cuántos documentos actuales no cumplen el formato de cédula. Reversa en `…_reversa.sql`.
- **Servidor:** `Application/Common/Identificacion.cs` valida y normaliza el documento (quita espacios y guiones).
  - Se usa al crear y editar jugadores, y al crear árbitros (en ellos, el documento sigue siendo opcional).
  - No se puede repetir el mismo **tipo y número** dentro de la liga.
  - Sin tipo, se asume cédula, para que el servidor anterior y la app vieja sigan funcionando.
  - El listado de árbitros ahora trae el documento; antes la tarjeta mostraba «Cédula:» vacía.
- **Página web:** componente `CampoDocumento` (tipo + número) en Nuevo jugador, Editar jugador y Nuevo oficial.
  - Para cédula y extranjero solo deja escribir números; para pasaporte, letras y números en mayúsculas.
  - El aviso de error sale al salir del campo y bloquea el guardado.
  - Al editar un jugador antiguo con documento inválido, pide corregirlo.
  - Nómina (tabla, Excel y PDF): la columna «Cédula» pasa a llamarse «Documento» y muestra «Pasaporte AB123…» cuando no es cédula.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-documento`), con la base como en producción y los scripts aplicados encima:
  - 12 casos de validación (letras, largo, dígito verificador, provincia, extranjero, pasaporte normalizado, tipo desconocido);
  - repetidos por tipo y número; el listado y la nómina traen el tipo;
  - editar un documento antiguo inválido se rechaza, y se puede cambiar a pasaporte;
  - árbitros con cédula inválida, con pasaporte y sin documento;
  - la reversa quita la columna;
  - se repitieron las pruebas de permisos, seguridad, cédula por organizador y las 81 de las fases 7 y 8, todas bien.
- Pantallas (Playwright, 390 y 1.440 px): limpieza de lo que se escribe, avisos, guardado bloqueado con cédula inválida, formulario de oficial, sin desborde y 0 errores.

### Orden para publicar

1. En Railway, ejecutar `backend/database/20261010_tipo_documento.sql`.
2. Fusionar el PR.

---

## 2026-10-10 — Mejora: editar oficiales y estadios; todos los países

**Estado:** aplicada en la rama `mejora/editar-oficiales-estadios`, creada desde `main`. Pendiente de que Roberto la apruebe. **Tiene un script de países (opcional, recomendado).**

### Decisión de Roberto

Países, provincias y cantones son compartidos por todos los organizadores. En lugar de una pantalla para que cada uno agregue, con riesgo de duplicados y errores visibles para todos, **se carga una sola vez la lista completa de países**. Ecuador ya tiene sus 24 provincias y 221 cantones, y los países extranjeros solo piden el país.

### Qué cambió

- **Oficiales (Mantenimiento → Oficiales):**
  - menú ⋮ en cada tarjeta, con **Editar** y **Eliminar** (con confirmación);
  - Editar trae nombre, documento, fecha y ubicación;
  - el documento usa las mismas reglas que al crear y, al editar, es opcional: vacío conserva el que tenía;
  - la tarjeta muestra «Pasaporte: …» o «Sin documento»; ya no muestra los códigos internos «AR-…».
  - Servidor: nueva ruta `PUT /api/arbitros/{id}`, solo para el dueño. Valida documento, repetidos y ubicación.
- **Estadios (Mantenimiento → Estadios):** menú ⋮ con **Editar** y **Eliminar**. El servidor ya lo permitía; faltaba la pantalla.
- **Países:**
  - script `20261010_paises_completos.sql` con los 195 países en español (193 de la ONU, más Ciudad del Vaticano y Palestina);
  - solo agrega los que faltan, sin distinguir mayúsculas ni tildes, y se puede repetir;
  - el listado pone a **Ecuador primero**, y los formularios nuevos empiezan con Ecuador elegido.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-mantenimiento`):
  - con un «Peru» sin tilde ya cargado, el script deja 195 países sin duplicarlo, también al aplicarlo dos veces; Ecuador sale primero;
  - editar un oficial cambia nombre, documento y fecha; una cédula inválida o el documento de otro oficial propio dan 400; vacío conserva el documento; org2 no puede editar ni ver cambios;
  - editar y eliminar un estadio funciona, y org2 no puede editarlo;
  - se repitieron todas las pruebas anteriores, todas bien.
- Pantallas (Playwright, 390 y 1.440 px):
  - el menú ⋮ abre Editar con todo precargado (país, provincia y cantón);
  - guardar envía el PUT correcto; Eliminar pide confirmación;
  - un oficial nuevo empieza con Ecuador; sin desborde y 0 errores.

### Orden para publicar

1. (Recomendado) En Railway, ejecutar `backend/database/20261010_paises_completos.sql`.
2. Fusionar el PR. Funciona aunque no se aplique el script; solo faltarían países.

---

## 2026-10-10 — Corrección: hora y estadio del partido

**Estado:** aplicada en la rama `mejora/partido-hora-estadio`, creada desde `main`. Pendiente de que Roberto la apruebe. Servidor y página web; **sin script de base de datos**.

### El problema (reportado por Roberto)

- Al **crear** un partido solo se podía elegir la fecha, sin la hora.
- Al **editar**, el estadio salía vacío y había que elegirlo otra vez.
- Causa: la base sí guardaba la hora, pero el servidor devolvía el partido sin ella y sin el estadio ni el árbitro elegidos (solo sus nombres).

### Qué cambió

- **Servidor:** el partido trae la fecha **con hora** («2026-11-20 15:30»), `idEstadio` e `idArbitro`. Todas las pantallas ya sabían leer la fecha con hora.
- **Crear partido:** el campo es «Fecha y hora» y es obligatorio.
- **Editar partido:** se precargan la fecha, la hora, el estadio y el árbitro.
- **Tarjeta del partido:** muestra la hora («sáb 10 oct 2026 · 15:30»). Los partidos creados antes, sin hora, siguen mostrando solo la fecha.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-partido`):
  - crear con «2026-11-20T15:30» devuelve «2026-11-20 15:30», con el estadio y el árbitro;
  - editar la hora y releer, bien;
  - el plantel por fecha sigue funcionando;
  - se repitieron todas las pruebas anteriores, todas bien.
- Pantallas (390 y 1.440 px): la tarjeta muestra la hora, Editar trae «2026-10-10T15:30» y el estadio elegido, Crear tiene el campo de fecha y hora; 0 errores.

---

## 2026-10-10 — Corrección: partido repetido en la jornada

**Estado:** aplicada en la rama `mejora/partido-repetido`, creada desde `main`. Pendiente de que Roberto la apruebe. Solo servidor; **sin script de base de datos**.

### El problema (reportado por Roberto)

Al agregar un partido salía «Ocurrió un error inesperado». Los registros de Railway mostraron la causa: `Duplicate entry '21-17-20' for key 'partido.uq_partido'`. La base no admite dos partidos con los mismos equipos (local y visitante) en una jornada, y ese partido ya existía. Se había creado antes, sin hora, cuando el formulario no la pedía.

### Qué cambió

- Al **agregar** y al **editar** (si se cambian los equipos), el servidor revisa primero si ya existe ese partido en la jornada y responde: «Ese partido ya está registrado en esta jornada (mismos equipos de local y visitante). Para cambiar la fecha, la hora o el estadio, usa «Editar» en el partido existente.».
- La vuelta, con local y visitante invertidos, sí se puede.
- **Red de seguridad:** cualquier otro registro repetido que rechace la base responde 409 con «Ya existe un registro con esos mismos datos…», en lugar del error genérico.

### Cómo se verificó

GitHub Actions, con la base de pruebas con la misma regla que producción (`uq_partido`):
- crear el mismo partido otra vez da 400 con el aviso;
- la vuelta sí se crea;
- editar un partido para que quede repetido da 400;
- se repitieron todas las pruebas anteriores (ahora cada una usa su propia jornada), todas bien.

---

## 2026-10-10 — Mejora: logos de los equipos (y fotos de jugadores en la base)

**Estado:** aplicada en la rama `mejora/logos-equipos`, creada desde `main`. Pendiente de que Roberto la apruebe. **Lleva script de base de datos:** `backend/database/20261010_imagenes_logos.sql` (reversa: `20261010_imagenes_logos_reversa.sql`). Orden: base → servidor → pantallas.

### Qué cambió

- **Dónde se guardan las imágenes:** en una tabla nueva `imagen` de MySQL, detrás de `IAlmacenImagenes`. Si algún día las imágenes pasan de ~1 GB, se cambia a Cloudflare R2 escribiendo otra clase con esa misma interfaz; el resto del código no cambia.
- Se sirven en `GET /api/imagenes/{id}` sin sesión (para que se vean en `<img>` y en el PDF), con caché de un año: el id es aleatorio y cambia si se cambia la imagen.
- **Logo del equipo:** `POST /api/equipos/{id}/logo` y `DELETE /api/equipos/{id}/logo`. Máximo 300 KB; se revisa que sea JPG, PNG o WEBP de verdad (por su contenido, no por el nombre). Al cambiar, quitar o borrar el equipo se borra la imagen anterior.
- **Fotos de jugadores:** ahora también van a la base (antes iban a una carpeta del servidor que Railway borra en cada publicación). Máximo 1 MB.
- **Pantallas:**
  - Formulario de equipo (crear y editar): campo «Logo» con vista previa, «Subir logo», «Cambiar» y «Quitar».
  - En el celular, la imagen se achica antes de subirla (logo a 256 px, foto a 512 px, en WEBP): una foto de 5 MB llega como unos pocos KB.
  - El logo se ve en las tarjetas de Equipos, la pestaña Equipos y los grupos del campeonato, las tarjetas de partido, las tablas de posiciones (campeonato y Reportes), el Dashboard, el modo en vivo (marcador, selector de equipo y cierre), el inicio del vocal y el encabezado del PDF de la nómina. El Excel no lleva logo.
  - Sin logo, o si no carga (por ejemplo sin señal), se ve un círculo con las iniciales del equipo.
- De paso: en la tarjeta del partido, en el celular, los nombres de los equipos ya no se parten en dos líneas.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-logos`):
  - subir el logo y verlo sin sesión, con caché de un año;
  - el logo llega en la lista, el partido y el Dashboard;
  - otro organizador no puede cambiarlo;
  - se rechaza un archivo que no es imagen y uno de más de 300 KB;
  - cambiar borra el anterior y quitar funciona;
  - la foto del jugador se guarda en la base, se reemplaza y se borra; se rechaza una de más de 1 MB;
  - la reversa borra la tabla;
  - se repitieron todas las pruebas anteriores, todas bien.
- Pantallas (390 y 1.440 px), con datos de ejemplo:
  - Logos e iniciales en Equipos, Dashboard, campeonato, posiciones, Reportes, modo en vivo e inicio del vocal; nada se sale de la pantalla.
  - Al crear un equipo con una imagen de 1.600 × 1.000, se subió un WEBP de 2,5 KB, y Quitar envía `DELETE`.
  - El PDF de la nómina lleva el logo (35 KB).
  - 0 errores.
- `npm run build` sin errores; `npm run lint` da los mismos 5 errores que ya había en `main`.

---

## 2026-10-10 — Mejora: fotos de los jugadores en reportes y listas

**Estado:** aplicada en la rama `mejora/fotos-reportes`, creada desde `mejora/logos-equipos` (usa su almacén de imágenes): **se fusiona después del PR de logos**. Pendiente de que Roberto la apruebe. **Sin script de base de datos.**

### Qué cambió

- **Servidor:** los reportes de goleadores, tarjetas por jugador, suspensiones (sanciones y jugadores en riesgo) traen `fotoUrl` del jugador (campo nuevo al final, opcional; compatible).
- **Pantallas:** foto en círculo junto al nombre en:
  - Jugadores (lista);
  - Reportes: Goleadores, Tarjetas, Suspensiones y Nómina;
  - la planilla del partido (titulares, suplentes y lista para convocar).
- Sin foto, o si no carga, se ven las iniciales del jugador sobre gris.
- **Formulario de jugador:** el campo de foto tiene vista previa. Al editar se ve la foto actual, y están los botones «Cambiar foto» y «Dejar la anterior».
- **PDF de la nómina:** primera columna «Foto» (las fotos se recortan cuadradas y se reducen para que el PDF pese poco; sin foto, las iniciales). El Excel no lleva imágenes.
- El modo en vivo ya mostraba las fotos; no cambió.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-fotos`):
  - los tres reportes responden y cada fila trae `fotoUrl`;
  - al ponerle foto a un goleador, aparece en Goleadores y en Tarjetas;
  - se repitieron todas las pruebas anteriores.
- Pantallas (390 y 1.440 px), con datos de ejemplo: fotos e iniciales en Jugadores, Goleadores, Tarjetas, Suspensiones, Nómina y la planilla. Editar jugador muestra la foto actual y la vista previa de la nueva. PDF de la nómina con 13 jugadores: 53 KB. 0 errores.
- `npm run build` sin errores; `npm run lint` da los mismos 5 errores que ya había en `main`.

---

## 2026-10-19 — Rol Dirigente (solo lectura) y protección de documentos

**Estado:** publicada (PR #22, fusionado el 19 de octubre; script aplicado en Railway). **Necesita script de base de datos** (`backend/database/20261019_rol_dirigente.sql`), que se ejecuta en Railway **antes** de fusionar. Diseño aprobado: `docs/ux/PROPUESTA_DIRIGENTE.md`.

### Qué cambió

- **Rol Dirigente:** el dirigente de un equipo ve el campeonato con su propia cuenta, sin poder cambiar nada.
  - El organizador lo invita desde la pestaña nueva **«Dirigentes»** del campeonato, eligiendo su equipo. El enlace sirve una vez y vence a los 7 días; se guarda solo su hash.
  - Desde la pestaña se ve quién tiene acceso, se le quita y se anulan invitaciones.
  - El dirigente crea su cuenta en `/invitacion-dirigente/{código}` y entra a `/dirigente`: su equipo, próximos partidos y resultados, jornadas, posiciones, nómina, goleadores, tarjetas y suspensiones (con descarga en PDF y Excel).
  - Una invitación nueva al mismo dirigente en el mismo campeonato cambia su equipo.
- **Permisos en el servidor:** rutas `/api/dirigente` (solo GET). Todo lo demás lo rechaza (403), igual que con el vocal. Las comprobaciones de escritura lo rechazan siempre.
- **Documentos de identidad:**
  - el dirigente recibe el documento solo de los jugadores de su equipo; de los demás llega vacío y la pantalla muestra «—» (también en PDF y Excel);
  - el vocal ya no recibe los documentos en el modo en vivo (la pantalla no los usaba);
  - el dirigente y el vocal reciben la edad, nunca la fecha de nacimiento.
- **Reportes:** reciben la ruta de sus datos, así los usan el organizador y el dirigente. Suspensiones tiene modo de solo lectura. Para el organizador no cambia nada.
- Un mismo correo no sirve para dos tipos de cuenta (organizador, vocal o dirigente).

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-dirigente`), con MySQL y el script real:
  - 75 pruebas nuevas: invitación (crear, consultar, aceptar, una sola vez, anulada, vencida, de otro organizador, equipo no inscrito), 14 rutas de administración y del vocal rechazadas con 403, lectura de los reportes iguales a los del organizador, jornadas y nóminas de otros campeonatos rechazadas, documentos solo del equipo propio, cambio de equipo, quitar acceso, cuentas cruzadas vocal/dirigente, y el vocal sin documentos;
  - todas las pruebas anteriores siguen pasando;
  - la reversa del script funciona y el script se vuelve a aplicar.
- Pantallas, en GitHub Actions con datos simulados, a 390 y 1.440 px: resumen, jornadas, posiciones, nómina propia y rival, suspensiones, invitación, pestaña Dirigentes e invitación creada; el organizador conserva documentos y «Agregar sanción»; el dirigente solo llama a `/api/dirigente` y vuelve a su pantalla si abre la administración o el modo en vivo; sin desplazamiento lateral y sin errores.
- `npm run build` sin errores; el lint da los mismos 5 errores que `main`.

---

## 2026-10-19 — Mejora: tablas con nombre fijo al deslizar y más color

**Estado:** publicada (PR #23). **Sin script de base de datos**: solo cambia la página web.

### Qué cambió

- **Nombre fijo al deslizar:** en el celular, la columna del equipo o del jugador (y su puesto o dorsal) queda fija mientras se desliza la tabla, con una sombra que la separa. Los nombres largos se cortan con «…» y el nombre completo aparece al mantener el puntero encima.
  - Tablas: Posiciones (Reportes, Grupos y tabla general), Goleadores, Tarjetas, Suspensiones, Nómina, Jugadores, Campeonatos y equipos inscritos.
- **Estilo común (clase `.tabla` en `index.css`):** encabezado con tinte azul, filas alternadas muy suaves, resaltado con el turquesa de la marca al pasar el mouse.
- **Posiciones:** una sola tabla para las tres pantallas (antes eran tres copias). Puesto en recuadro turquesa y ✓ para los clasificados, fila clasificada con tono turquesa, diferencia de goles en verde o rojo, columna de puntos resaltada.
- **Goleadores:** medallas de oro, plata y bronce para los tres primeros y una barra que muestra los goles respecto al líder. El selector «Top» ya no ocupa todo el ancho.
- **Tarjetas:** cantidades en recuadros amarillos y rojos (en gris si son 0).
- **Suspensiones:** barra de partidos cumplidos (roja mientras falta cumplir, verde al terminar) y amarillas acumuladas en recuadro amarillo.
- **Nómina:** dorsal en un círculo turquesa.
- El color siempre va acompañado del número o el texto: no es lo único que da la información.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-tablas`), con datos simulados, a 390 y 1.440 px: 56 comprobaciones. En cada tabla que se desliza en el celular, después de deslizarla hasta el final, el nombre sigue entero a la vista y aparece la sombra; sin desplazamiento lateral de la página y sin errores.
- La parte fija tiene el mismo tono que el resto de la fila (medido en las capturas).
- `npm run build` sin errores; el lint da los mismos 5 errores que `main`.

---

## 2026-10-19 — Mejora: nombres cortos de jugadores en la vista del dirigente

**Estado:** publicada (PR #24). **Sin script de base de datos**: solo cambia el servidor.

### Qué cambió

- En la vista del dirigente, cada jugador aparece con su **primer nombre y primer apellido**: «Carlos Andrés» «Mendoza Pérez» → «Carlos Mendoza».
  - Goleadores, Tarjetas, Suspensiones (sanciones y en riesgo) y Nómina, y por lo tanto también sus PDF y Excel.
  - Los apellidos con partícula se respetan: «De la Cruz Pérez» → «De la Cruz», «Del Pezo» → «Del Pezo».
- Lo hace el servidor (`Application/Common/NombreCorto.cs`) solo para el rol Dirigente; el organizador sigue viendo los nombres completos.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-nombres`), con MySQL: un jugador «Carlos Andrés De la Cruz Pérez» con una sanción.
  - El dirigente lo ve como «Carlos De la Cruz» en la nómina y en suspensiones.
  - Todos los nombres de Goleadores, Tarjetas, Suspensiones y Nómina del dirigente son el nombre corto del completo.
  - El organizador ve los nombres completos.
  - Se repitieron todas las pruebas anteriores, incluidas las 75 del rol Dirigente.
## 2026-10-19 — Corrección: sin visto de clasificados por defecto

**Estado:** publicada (PR #25). **Sin script de base de datos**: solo cambia el servidor.

### Qué cambió

- Sin fase configurada, el servidor marcaba **2 clasificados por defecto** (✓ en los dos primeros) en Reportes → Posiciones y en la tabla de cada grupo. Ahora, sin configuración, no se marca ninguno.
- El visto aparecerá solo cuando un campeonato tenga configurado cuántos clasifican (futuro módulo de configuración; hoy, una fase con `equipos_clasifican`).
- La tabla general del campeonato ya no marcaba clasificados; no cambia.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-clasificados`), con MySQL:
  - sin fase: Reportes (con y sin grupos), la tabla del grupo y la tabla general no marcan a nadie;
  - con una fase de 1 clasificado: se marca solo al primero en el grupo y en Reportes;
  - se repitieron todas las pruebas anteriores.

---

## 2026-10-19 — Mejora: amarillas acumuladas en la pestaña Tarjetas

**Estado:** aplicada en la rama `mejora/tarjetas-acumuladas`. Pendiente de que Roberto la apruebe. **Sin script de base de datos.**

### Qué cambió

- La pestaña Tarjetas mostraba solo el historial (todas las amarillas y rojas del campeonato), y podía confundirse con las que cuentan para la suspensión.
- Ahora, junto al historial, cada jugador tiene la columna **«Acumuladas»** (p. ej. «2/5»): las amarillas que cuentan para la próxima suspensión. Usa la misma regla que Suspensiones:
  - al llegar a 5 se genera la suspensión y la cuenta vuelve a 0;
  - la doble amarilla en un partido no suma (tiene su propia sanción);
  - una amarilla con roja directa en el mismo partido sí suma.
- A una amarilla de la suspensión, «Acumuladas» se resalta en ámbar.
- Una línea sobre la tabla explica la diferencia entre las dos cosas.
- La tabla por jugador ocupa más ancho para que «Acumuladas» se vea sin deslizar en la computadora.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-acumuladas`), con MySQL y partidos de prueba:
  - un jugador con 5 amarillas (suspensión), 1 más, una doble amarilla y una amarilla con roja: historial 9 amarillas y 2 rojas, acumuladas 2;
  - un jugador con 4 amarillas: acumuladas 4, igual al número que muestra «En riesgo» en Suspensiones;
  - todos los jugadores en riesgo coinciden con su columna Acumuladas;
  - se repitieron todas las pruebas anteriores.
- Pantallas a 390 y 1.440 px: «2/5» y «4/5» visibles, la explicación sobre la tabla, sin desbordes ni errores.
- `npm run build` sin errores; lint igual que `main`.

---

## 2026-10-19 — Ajuste: «Desliza» solo en pantallas táctiles

**Estado:** aplicada en la rama `mejora/desliza-solo-tactil`. Pendiente de que Roberto la apruebe. Solo la página web.

- El aviso «Desliza» de las tablas anchas ahora aparece solo en celulares y tablets (pantalla táctil). En la computadora tapaba el título de la última columna visible, y ahí ya se ven la barra de desplazamiento y el borde difuminado.
- Verificado en GitHub Actions (rama temporal `ci/verificar-desliza`): a 390 px táctil se ve; a 1.440 px con mouse no, aunque la tabla se desliza. 64 comprobaciones de pantalla bien; build correcto y lint igual que `main`.

---

## 2026-10-19 — Corrección: la doble amarilla cuenta como roja en el historial

**Estado:** aplicada en la rama `mejora/roja-doble-amarilla`. Pendiente de que Roberto la apruebe. Sin script de base de datos.

- Al registrar una doble amarilla, la roja que provoca no siempre queda como evento propio, y la pestaña Tarjetas mostraba 2 amarillas y 0 rojas.
- Ahora, en el historial por jugador y en el fair play por equipo, un partido con dos amarillas del mismo jugador suma también **1 roja**. Si la roja ya estaba registrada en ese partido, no se cuenta dos veces.
- En la tabla por jugador se indica con «(1 DA)» junto a las rojas.
- Las amarillas acumuladas no cambian: la doble amarilla sigue sin sumar a la acumulación, y Suspensiones ya la reconocía como «Doble amarilla».
- Verificado en GitHub Actions (rama temporal `ci/verificar-doble-amarilla`): doble amarilla sin roja registrada (2 amarillas, 1 roja, total 3, acumuladas 0); con roja registrada no se duplica; el fair play del equipo suma la roja; Suspensiones la muestra como «Doble amarilla». Todas las pruebas anteriores y 62 comprobaciones de pantalla bien.

---

## 2026-10-19 — Mejora: documento pendiente para jugadores

**Estado:** aplicada en la rama `mejora/documento-pendiente`. Pendiente de que Roberto la apruebe. **Necesita script de base de datos** (`backend/database/20261019_documento_pendiente.sql`), que se ejecuta en Railway **antes** de fusionar.

### Qué cambió

- Tipo de documento nuevo **«Documento pendiente»** en el formulario del jugador (crear y editar), para quien todavía no tiene su cédula a mano. Se guarda sin número y el formulario explica que se completa después.
- No cuenta para la regla de documentos repetidos: puede haber varios jugadores pendientes.
- En la **nómina** (y sus PDF y Excel) aparece «Pendiente» en ámbar; en la **lista de Jugadores**, «Doc. pendiente» junto al nombre.
- Al completarlo con Editar se valida como siempre (cédula con dígito verificador, extranjero o pasaporte).
- Solo jugadores: un oficial sin documento ya se puede guardar dejando el número vacío; el servidor rechaza «Pendiente» para oficiales.
- Dirigente: ve «Pendiente» en la nómina de su equipo; en la de los rivales, «—», como cualquier documento.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-pendiente`), con MySQL y el script real:
  - 11 pruebas: registrar pendiente con número vacío o sin enviarlo, varios pendientes sin chocar, el número que llegue se descarta, con tipo Cédula el número sigue siendo obligatorio y se valida, la nómina y la lista traen el tipo, completar la cédula, la regla de repetidos sigue funcionando, volver a dejarlo pendiente, oficiales rechazados;
  - el script agrega el tipo; la reversa se niega mientras haya jugadores pendientes y funciona cuando ya no los hay;
  - todas las pruebas anteriores siguen pasando.
- Pantallas a 390 y 1.440 px: «Pendiente» en la nómina y «Doc. pendiente» en la lista; 68 comprobaciones sin errores. Build correcto y lint igual que `main`.

---

## 2026-10-20 — Ajuste: el dirigente solo ve la nómina de su equipo

**Estado:** publicada (PR #30). Sin script de base de datos.

- Pedido de Roberto: por ahora el dirigente no debe ver las nóminas de los otros equipos.
- **Servidor:** `/api/dirigente/campeonatos/{id}/equipos/{idEquipo}` responde 404 si el equipo no es el del dirigente (antes enviaba la nómina sin documentos).
- **Pantalla:** la pestaña Nómina del dirigente muestra directamente la de su equipo, sin selector; los PDF y Excel son solo de su equipo.
- Textos actualizados en la invitación, el mensaje de WhatsApp y la pestaña Dirigentes del organizador.
- El resto de la vista del dirigente no cambia (jornadas, posiciones, goleadores, tarjetas y suspensiones de todo el campeonato).
- Verificado en GitHub Actions (rama temporal `ci/verificar-nomina-propia`): la nómina de otro equipo del campeonato responde 404 sin datos; tras cambiar de equipo, ve la nueva y ya no la anterior; todas las pruebas anteriores bien. Pantallas a 390 y 1.440 px: sin selector, con su equipo, y la página no pide nóminas de otros equipos en ninguna pestaña (82 comprobaciones).
## 2026-10-20 — Mejora: autorización de datos personales y responsabilidad de la organización

**Estado:** aplicada en la rama `mejora/privacidad-terminos`. Pendiente de que Roberto la apruebe. **Necesita script de base de datos** (`backend/database/20261020_privacidad_terminos.sql`), que se ejecuta en Railway **antes** de fusionar. Los textos los redactó Claude y conviene que los revise un abogado (LOPDP del Ecuador).

### Qué cambió

- **Autorización de datos del jugador:** al registrar un jugador, casilla obligatoria: «La organización cuenta con la autorización del jugador (o de su padre, madre o representante legal, si es menor de edad) para tratar sus datos personales». El servidor la exige y guarda cuándo y quién la registró (`persona.autorizacion_datos_en` / `_por`).
  - Jugadores ya registrados: la autorización se da por otorgada (decisión de Roberto); el script les pone la fecha de ejecución.
- **Aviso de privacidad** (`/privacidad`) y **términos de uso** (`/terminos`): páginas públicas, enlazadas en el inicio de sesión, el registro y el menú lateral.
  - Privacidad: cada organización es la responsable del tratamiento; LigaManager guarda y procesa los datos por su cuenta. Qué datos, para qué, quién los ve (organizador, vocales sin documento, dirigentes solo su nómina), conservación, derechos (LOPDP) y seguridad.
  - Términos: el reglamento, la configuración, los resultados, las sanciones y las decisiones disciplinarias son responsabilidad exclusiva de la organización; los cálculos de la app son un apoyo que la organización debe revisar; obligaciones sobre datos personales, cuentas, disponibilidad y cambios.
- **Aceptación obligatoria de los términos** (organizadores):
  - al crear la cuenta, casilla obligatoria (el servidor la exige);
  - las cuentas que ya existen ven una pantalla de aceptación antes de entrar a la administración (con «Salir» si no aceptan);
  - se guarda cuándo y qué versión (`usuario.terminos_aceptados_en` / `terminos_version`); si los términos cambian, se piden de nuevo (`Terminos.Version` en el servidor y `VERSION_TERMINOS` en la página deben coincidir).
- **Nota de responsabilidad** al pie de Posiciones, Tarjetas y Suspensiones (también en la vista del dirigente).

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-privacidad`), con MySQL y el script real:
  - 18 pruebas: los jugadores previos quedan con la autorización; sin autorización (o en falso) no se registra; con ella se guarda fecha y usuario; editar no la pide y la conserva; el organizador previo tiene términos pendientes; una versión vieja se rechaza; aceptar guarda versión y fecha; registrarse sin aceptar se rechaza y aceptando no queda pendiente; vocal y dirigente reciben 403;
  - las pruebas anteriores que crean jugadores se ajustaron para enviar la autorización; todas pasan (junto con el PR #30);
  - la reversa del script quita las cuatro columnas y el script se vuelve a aplicar.
- Pantallas a 390 y 1.440 px (122 comprobaciones): páginas de privacidad y términos, enlaces en el inicio de sesión, casilla en el registro, pantalla de aceptación (no deja entrar sin marcar; al aceptar entra), casilla obligatoria al crear jugador y nota en los tres reportes. Sin errores. Build correcto; lint igual que `main`.

---

## 2026-10-20 — Ajuste: el dirigente no ve documentos de identidad

**Estado:** aplicada en la rama `mejora/dirigente-sin-documentos`. Pendiente de que Roberto la apruebe. Sin script de base de datos.

- Pedido de Roberto: el dirigente no debe ver el número de cédula ni siquiera de su propio equipo.
- **Servidor:** la nómina del dirigente ya no lee ni envía el documento (número y tipo vacíos).
- **Pantalla:** la nómina del dirigente no tiene la columna «Documento», tampoco en el PDF ni en el Excel. El organizador la sigue viendo.
- Textos actualizados: aviso de privacidad (los dirigentes ven la nómina de su equipo sin documento) y pestaña Dirigentes.
- Verificado en GitHub Actions (rama temporal `ci/verificar-sin-documentos`): la nómina propia del dirigente llega sin documentos y con los mismos jugadores que ve el organizador; el organizador sigue viéndolos; todas las pruebas anteriores bien. Pantallas a 390 y 1.440 px: sin columna «Documento» ni cédulas en la nómina del dirigente.

---

## 2026-10-21 — Seguridad de cuentas: Recordarme, confirmar correo y restablecer contraseña

**Estado:** aplicada en la rama `mejora/seguridad-cuentas-v2`. Pendiente de que Roberto la apruebe. **Necesita script de base de datos** (`backend/database/20261021_seguridad_cuentas.sql`), que se ejecuta en Railway **antes** de fusionar. Diseño: `docs/ux/PROPUESTA_SEGURIDAD.md`.

### Qué cambió

- **Recordarme en este dispositivo** (inicio de sesión): marcada, la sesión dura 7 días y sigue al cerrar el navegador; sin marcar, 12 horas y se cierra con el navegador. Al abrir la app, una sesión vencida lleva al login.
- **Confirmar el correo** (organizadores nuevos, solo con servicio de correo): al registrarse aparece «Revisa tu correo» con «Reenviar correo»; el enlace vale 24 h y entra directo. Sin confirmar, el login dice «Confirma tu correo» y ofrece reenviarlo. Las cuentas existentes, vocales y dirigentes quedan confirmados.
- **Restablecer la contraseña** (todos, solo con servicio de correo): «¿Olvidaste tu contraseña?» → correo con enlace de 1 h → contraseña nueva dos veces → entra directo. La respuesta es siempre la misma (no revela si el correo existe).
- **Al cambiar la contraseña se cierran todas las sesiones** de la cuenta (el servidor compara la hora del token con `clave_cambiada_en`; también corta cuentas desactivadas).
- Enlaces de un solo uso (solo se guarda el hash), el último anula los anteriores; máximo 1 por minuto y 5 por día; límite de intentos en las rutas públicas.
- **Correo:** Brevo por API (`Correo__BrevoApiKey`) o envío de prueba (`Correo__Modo=Prueba`). Sin ninguno, la app funciona como antes en registro y no ofrece restablecer.
- Las invitaciones de vocal y dirigente recuerdan la sesión 7 días.

### Cómo se verificó

- GitHub Actions (rama temporal `ci/verificar-cuentas`), con MySQL, el script real y correos de prueba leídos como archivos:
  - 36 pruebas: duración de la sesión con y sin Recordarme; registro pendiente con correo que trae el enlace a la app; en la base solo el hash; 403 sin confirmar; clave equivocada no revela la cuenta; reenviar con espera de un minuto y respuesta genérica; enlace inventado, válido, reusado; olvidé la clave (genérico, mayúsculas, espera); validar, contraseña corta, guardar; la sesión anterior queda cerrada (401) y la nueva funciona; clave vieja no sirve y la nueva sí; enlace vencido; un vocal también puede restablecer;
  - el registro de la prueba de privacidad se adaptó a la confirmación; todas las pruebas anteriores bien (verificado junto con el PR #33);
  - la reversa del script funciona y el script se vuelve a aplicar.
- Pantallas a 390 y 1.440 px (194 comprobaciones): «Recordarme» guarda la sesión en sessionStorage o localStorage, sesión vencida lleva al login, correo sin confirmar ofrece reenviar, «Revisa tu correo» con espera, olvidé la clave, enlace vencido, restablecer y entrar, confirmar una sola vez. Sin errores. Build correcto; lint igual que `main`.
