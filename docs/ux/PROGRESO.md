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

**Estado:** aplicada en la rama `ux/fase-2-celular`, creada desde `main` con la Fase 1 ya fusionada (`13bf5f6`). Pendiente de que Roberto la pruebe y la apruebe.

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

Probar en un celular real y, si se aprueba, fusionar `ux/fase-2-celular` a `main`. Después, Fase 3 en `ux/fase-3-ventanas`.
