# LigaManager — Progreso de las mejoras UX

Bitácora de las fases descritas en `docs/ux/LigaManager_prompt_UX_por_fases.md`.
Cada fase agrega una entrada con fecha. Léela antes de empezar la fase siguiente.

---

## 2026-10-07 — Fase 1: Estilos base

**Estado:** aplicada en la rama `ux/fase-1-estilos`. Pendiente de que Roberto la pruebe y la apruebe. No se fusionó ni se publicó.

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

Probar la Fase 1 y, si se aprueba, fusionar la rama. Después, Fase 2 en una rama nueva `ux/fase-2-celular`.
