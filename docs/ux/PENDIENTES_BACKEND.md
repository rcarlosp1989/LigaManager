# LigaManager — Pendientes de servidor

Lo que las fases 1 a 5 necesitaron de la API y no se improvisó en el frontend.

## Resueltos en la Fase 6 (8 de octubre de 2026)

| Pantalla | Qué faltaba | Cómo quedó |
|---|---|---|
| Campeonatos (lista) | `modalidad` en `GET /api/campeonatos` | Agregado. La columna «Modalidad» aparece sola. |
| Campeonatos (lista) | `totalJornadas` en `GET /api/campeonatos` | Agregado. «Eliminar» se desactiva con jornadas. |
| Modo en vivo | `GET /api/partidos/{id}` | Endpoint nuevo. `?jornada=` pasa a ser opcional en el modo en vivo. |
| Dashboard | `idJornada` en próximos partidos y últimos resultados | Agregado. Abre la jornada exacta y muestra «Registrar en vivo». |
| Modo en vivo | `fotoUrl` en la alineación y en el plantel del equipo | Agregado. Ya no hace falta pedir la lista completa de jugadores. |

## Resuelto en la Fase 8 (9 de octubre de 2026)

- **Eventos sin duplicados en el servidor.** El modo en vivo manda un `idCliente` por cada gol, tarjeta o cambio, y el servidor no vuelve a crear uno que ya llegó (columna `id_cliente` con índice único por partido). La revisión que hace la cola antes de reintentar se mantiene como segunda protección.
