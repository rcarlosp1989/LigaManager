# LigaManager — Pendientes de servidor

Lo que las fases 1 a 5 necesitan de la API y no se improvisó en el frontend. Se resuelve en la Fase 6, sin cambiar el esquema de la base de datos.

| Pantalla | Qué falta | Para qué | Anotado en |
|---|---|---|---|
| Campeonatos (lista) | `modalidad` (nombre) en cada elemento de `GET /api/campeonatos` (`CampeonatoListDto`). Hoy solo trae `tipoPartido`. | Mostrar la columna «Modalidad». La pantalla ya la muestra sola cuando el dato llegue. | Fase 4 |
| Campeonatos (lista) | `totalJornadas` en cada elemento de `GET /api/campeonatos`. | Desactivar «Eliminar» en los campeonatos con jornadas, con el motivo a la vista. Hoy el servidor rechaza el borrado y la pantalla muestra su mensaje. La pantalla ya usa el dato cuando llegue. | Fase 4 |
| Modo en vivo | `GET /api/partidos/{id}` con el mismo detalle que trae cada partido en `GET /api/jornadas/{id}`. | Que la dirección del modo en vivo sea solo `/partidos/{id}/en-vivo`. Hoy necesita `?jornada=` porque el partido solo se puede leer dentro de su jornada. Con el endpoint nuevo, `?jornada=` pasa a ser opcional y las direcciones guardadas siguen sirviendo. | Fase 5 |
| Dashboard | `idJornada` en cada elemento de `proximosPartidos` y `ultimosResultados` (`ProximoPartidoDto`, `UltimoResultadoDto`). | Que «Próxima fecha» abra la jornada exacta del partido y muestre «Registrar en vivo». La pantalla ya los usa en cuanto lleguen; hoy lleva a la pestaña Jornadas del campeonato. | Fase 5 |
| Modo en vivo | `fotoUrl` en `AlineacionJugadorDto` y en `JugadorEnEquipoDto`. | Mostrar la foto al pasar lista sin pedir la lista completa de jugadores (`GET /api/jugadores`), que es lo que se hace hoy. | Fase 5 |

Los dos campos de Campeonatos se pueden calcular en `CampeonatoService.GetAllAsync` con un `Include` de la modalidad y un conteo de `Jornadas`; no requieren columnas nuevas. Los de la Fase 5 salen de tablas que ya existen (`Partidos`, `Jornadas`, `Personas.FotoUrl`).

Para la Fase 8 (requieren cambios de esquema, no van en la Fase 6):

- **Eventos sin duplicados en el servidor.** La cola del modo en vivo evita reenviar lo que ya llegó consultando el partido antes de reintentar. La protección completa es que el cliente mande un identificador por evento y el servidor rechace el repetido; eso necesita una columna nueva.

