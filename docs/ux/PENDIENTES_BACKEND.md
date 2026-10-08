# LigaManager — Pendientes de servidor

Lo que las fases 1 a 5 necesitan de la API y no se improvisó en el frontend. Se resuelve en la Fase 6, sin cambiar el esquema de la base de datos.

| Pantalla | Qué falta | Para qué | Anotado en |
|---|---|---|---|
| Campeonatos (lista) | `modalidad` (nombre) en cada elemento de `GET /api/campeonatos` (`CampeonatoListDto`). Hoy solo trae `tipoPartido`. | Mostrar la columna «Modalidad». La pantalla ya la muestra sola cuando el dato llegue. | Fase 4 |
| Campeonatos (lista) | `totalJornadas` en cada elemento de `GET /api/campeonatos`. | Desactivar «Eliminar» en los campeonatos con jornadas, con el motivo a la vista. Hoy el servidor rechaza el borrado y la pantalla muestra su mensaje. La pantalla ya usa el dato cuando llegue. | Fase 4 |

Ambos campos se pueden calcular en `CampeonatoService.GetAllAsync` con un `Include` de la modalidad y un conteo de `Jornadas`; no requieren columnas nuevas.
