# Análisis de factibilidad: Módulo "Configuración de Campeonato"

Fecha del análisis: 2026-09-21
Estado: **En suspenso** — pendiente de decisiones antes de iniciar implementación.

## Veredicto general

Es implementable sin romper nada existente. Todo lo propuesto es aditivo: una tabla
nueva (1:1 con `Campeonato`, siguiendo el mismo patrón que ya usan
`Jugador↔Persona` / `Arbitro↔Persona`), validaciones nuevas insertadas en puntos de
entrada ya identificados, y una pestaña nueva en el frontend usando el mismo patrón
que ya usan Equipos/Grupos/Jornadas. Como cada campo de configuración sería nullable,
un campeonato **sin** configuración guardada se comportaría exactamente igual que hoy
— no hay riesgo de regresión por diseño.

Hay dos puntos estructurales reales que hay que resolver antes de codificar, y
varias decisiones de diseño pendientes (ver sección final).

---

## 1. Restricciones de jugadores

- **Edad mín/máx + fecha de corte**: `Persona.FechaNac` ya existe. Hoy
  `CalcularEdad` solo se usa para *mostrar* la edad, nunca para validar — sería la
  primera vez que se usa como gate. El punto de inserción natural es
  `JugadorService.VincularEquipoAsync` (`JugadorService.cs:222-254`), que es donde
  hoy se vincula un jugador a un equipo.
- **Jugador extranjero**: viable con el esquema actual — `Equipo.IdPais` es un FK
  directo, y el país del jugador se resuelve vía `Persona → Ciudad → Pais` (patrón ya
  usado en `JugadorService.GetByIdAsync`). Sin cambios de esquema.
- **"No doble inscripción" — primer problema estructural**: `JugadorEquipo` (la
  tabla que vincula jugador↔equipo) **no tiene `IdCampeonato`**. El roster de un
  jugador es global por equipo, no por campeonato. Un equipo puede estar inscrito en
  varios campeonatos a la vez (vía `CampeonatoEquipo`), pero no hay forma de saber
  "este jugador específico está habilitado para el campeonato X pero no para el Y" —
  solo "el equipo de este jugador está en algún campeonato EnCurso". Es una
  limitación real del modelo actual, no solo falta de validación.

## 2. Restricciones de roster

- **Fecha límite de inscripción de jugadores**: directo. Se inserta en
  `CampeonatoService.AgregarEquipoAsync` (`CampeonatoService.cs:136-157`), que hoy no
  tiene ningún chequeo de fecha.
- **Máximo de jugadores por equipo**: choca con el mismo problema estructural del
  punto anterior — como el roster es global al equipo (no por campeonato), un
  "máximo por campeonato" no se puede expresar con precisión hoy. Solo podríamos
  contar el roster global del equipo (que en la práctica probablemente coincide, si
  un equipo no participa en dos torneos simultáneos con rosters distintos).
- **Mínimo de jugadores para disputar un partido**: no existe ningún chequeo similar
  hoy en `MarcarJugadoAsync` (`JornadaService.cs:344-381`) — sería 100% nuevo. Hay
  que decidir si esto **bloquea** marcar el partido como jugado, o solo advierte.

## 3. Reglas de puntuación y desempate

La lógica de puntos (3/1/0) y el orden de desempate (Pts → Pg → DG → Gf) están
**hardcodeados y duplicados en dos servicios distintos**:

- `GrupoService.GetPosicionesCampeonatoAsync` — usado cuando el campeonato NO tiene
  grupos, recalcula en vivo cada vez que se consulta.
- `JornadaService.RecalcularPosicionesAsync` — usado cuando SÍ hay grupos, persiste
  en la tabla `PosicionGrupo`, se dispara al marcar partidos/eventos.

Para que la configuración de puntos/desempate sea real, hay que parametrizar ambos
caminos de forma consistente — más trabajo de integración que riesgo de ruptura,
pero hay que tener cuidado de no desincronizarlos.

- **Desempate por tarjetas** (rojas/amarillas): `PosicionGrupo` no guarda tarjetas
  por equipo hoy — solo existen como eventos individuales por jugador/partido. Se
  puede resolver con una consulta de agregación en vivo (sin tocar el esquema de
  `PosicionGrupo`) en vez de agregar columnas nuevas que haya que mantener
  sincronizadas.

## 4. Estado del campeonato (bloqueo al pasar a EnCurso)

El enum `EstadoCampeonato` (Planificado/EnCurso/Finalizado) ya existe, pero **hoy no
se usa para bloquear nada en ningún lado** — es puramente decorativo. No hay
precedente que extender; sería lógica de gating completamente nueva, pero directa de
escribir.

## 5. Frontend

Agregar la pestaña "⚙️ Configuración" es trivial: mismo patrón exacto que ya usan
Equipos/Grupos/Jornadas (arreglo de tabs + bloque condicional) en
`CampeonatoDetalle.jsx`.

## 6. Base de datos

Nunca se ha usado un tipo `JSON` en este proyecto (las migraciones son archivos
`.sql` aplicados a mano). MySQL lo soporta bien, así que no es un bloqueo técnico,
solo sería la primera vez que se usa ese patrón aquí — alternativa más simple sería
guardar el orden como texto separado por comas.

---

## Resumen: reutilizable vs. net-new

**Reutilizable / existente:**
- Lógica de puntos 3/1/0 y desempate Pts→Pg→DG→Gf (duplicada en 2 archivos, fácil
  de ubicar y parametrizar).
- Enum `EstadoCampeonato` (sin uso de gating todavía, pero ya está en el modelo).
- Cadena de derivación Jugador→País (Persona→Ciudad→Pais) y `Equipo.IdPais`.
- `AgregarEquipoAsync` (CampeonatoService) y `VincularEquipoAsync`/`CreateAsync`
  (JugadorService) como puntos de inserción claros para las validaciones nuevas.
- Patrón de tabs en `CampeonatoDetalle.jsx`.
- Convención de migraciones manuales en `.sql` y el patrón EF Core 1:1
  (`Jugador↔Persona` / `Arbitro↔Persona`) como plantilla directa para
  `ConfiguracionCampeonato`.

**Net-new / riesgo real de integración:**
- `JugadorEquipo` no tiene `IdCampeonato` — la membresía de roster es por equipo
  global, no por equipo-por-campeonato. Este es el vacío estructural más grande:
  el máximo de roster por campeonato y la doble inscripción precisa no se pueden
  implementar correctamente contra el esquema actual sin agregar una columna
  `IdCampeonato` a `JugadorEquipo` o una nueva entidad de relación.
- Ninguna lógica existente usa `EstadoCampeonato` para bloquear nada — toda la
  validación por fecha límite / bloqueo al pasar a EnCurso es lógica nueva sin
  precedente.
- `PosicionGrupo` no agrega tarjetas amarillas/rojas — un desempate por tarjetas
  necesita o columnas nuevas + lógica de población en ambos caminos de recálculo, o
  una consulta de agregación en vivo contra `EventoPartido`.
- Sin precedente de columna `JSON` en el historial de migraciones — si el orden de
  desempate se guarda como arreglo, sería el primer uso de ese patrón en el
  proyecto.
- La detección de doble inscripción solo es posible hoy a nivel grueso ("el equipo
  está en un campeonato EnCurso"); la detección precisa por jugador-por-campeonato
  requiere la misma relación net-new mencionada arriba.

---

## Decisiones pendientes antes de codificar

1. **Doble inscripción / máximo de roster por campeonato**: ¿aceptamos la
   aproximación con el esquema actual (roster global del equipo, sin distinguir por
   campeonato), o se agrega una relación nueva para que sea preciso por campeonato?
   Esto último es más correcto pero es un cambio de esquema más grande (nueva tabla
   de inscripción jugador-campeonato, o columna `IdCampeonato` en `JugadorEquipo`).
2. **Mínimo de jugadores para jugar**: ¿bloquea marcar el partido como "jugado", o
   solo muestra una advertencia?
3. **Desempate por tarjetas**: ¿calculado en vivo (consulta de agregación) o
   columnas persistidas en `PosicionGrupo`?
4. **Formato de `criterios_desempate`**: ¿columna `JSON` nativa de MySQL, o texto
   simple separado por comas?

Con las respuestas a estos cuatro puntos se puede armar el plan de implementación
concreto.
