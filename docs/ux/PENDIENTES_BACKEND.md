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

## Para la Fase 8 (requieren cambios de esquema)

- **Eventos sin duplicados en el servidor.** La cola del modo en vivo evita reenviar lo que ya llegó consultando el partido antes de reintentar. La protección completa es que el cliente mande un identificador por evento y el servidor rechace el repetido; eso necesita una columna nueva.
