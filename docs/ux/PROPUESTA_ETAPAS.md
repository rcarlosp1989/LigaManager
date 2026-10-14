# LigaManager — Etapas del campeonato (propuesta para aprobar)

**Fecha:** 14 de octubre de 2026 (versión 2). **Estado:** diseño para que Roberto lo apruebe. Todavía no se programó nada.

## Decisiones de Roberto

| Tema | Decisión |
|---|---|
| Cómo avanza el campeonato | Al terminar una etapa, el organizador toca **«Iniciar siguiente etapa»**. La app muestra a los **clasificados** y el organizador elige cómo armar la etapa siguiente. |
| Cómo se arman los cruces | **Automático por posición** (1 vs último, 2 vs penúltimo…), **sorteo hecho por la app** o **manual**, con cualquier cantidad de equipos. |
| Liguilla (nueva fase de grupos) | También se puede: **automática en serpentina**, por sorteo o manual. |
| Lo que configura el organizador en cada etapa | Partido único o ida y vuelta, cómo se define el cruce, clasificados por grupo y orden de desempate. |
| Cruce de ida y vuelta | Pasa el de **mejor global** (diferencia de goles en los dos partidos). **Si persiste el empate: penales.** También se puede elegir «pasa el mejor ubicado». |
| Desempate en la tabla | El propuesto, que se puede cambiar (ver abajo). |
| Visto ✓ | Configurable en cada campeonato; puede ser **«Ninguno»**. |
| Cantidad de equipos | **La decide el organizador.** La app no impone 4, 8, 16 ni 32; solo avisa si una ronda queda impar. |
| Sorteo | **Bien hecho y sin dudas** (ver «Sorteo»). |

## 1. Etapas

- Un campeonato es una serie de etapas: «Fase regular», «Octavos», «Cuartos», «Semifinal», «Final», «Liguilla»…
- Cada jornada pertenece a una etapa, y **cada tabla solo cuenta los partidos de su etapa.**
  - Hoy, un campeonato sin grupos suma también los partidos de la eliminatoria; con esto se corrige.
- Hay dos tipos de etapa:
  - **Tabla:** todos contra todos, con grupos o sin ellos.
  - **Eliminatoria:** cruces.
- Los campeonatos que ya existen quedan con una sola etapa, «Fase regular». Para ellos no cambia nada, salvo el desempate nuevo.

## 2. «Iniciar siguiente etapa»

**Paso 1 — Clasificados.** La app muestra la **tabla general de clasificados**: los N primeros de cada grupo, ordenados con el desempate de la tabla general. El organizador puede **quitar o agregar** equipos, por ejemplo cuando hay una sanción o un retiro.

**Paso 2 — Tipo y configuración de la etapa:**

| | Eliminatoria | Liguilla (grupos) |
|---|---|---|
| Nombre | Octavos, Cuartos, Semifinal, Final, Tercer puesto, u otro escrito | Liguilla, Hexagonal, Cuadrangular, u otro escrito |
| Partidos | Único / ida y vuelta | Una vuelta / ida y vuelta |
| Definición | Global → penales (por defecto) · Global → pasa el mejor ubicado | Clasifican N por grupo · orden de desempate |
| Armado | **Por posición** · **Sorteo** · **Manual** | **Serpentina** · **Sorteo** · **Manual** |

**Paso 3 — Vista previa editable.** Se ven los cruces o los grupos armados, y se pueden mover equipos antes de confirmar. Las fechas de ida y vuelta se aplican a todos los cruces, y después se edita partido por partido (hora, estadio, árbitro).

**Paso 4 — Confirmar.** Se crean la etapa, sus jornadas y los partidos.

- **«Deshacer etapa»** está disponible mientras no se haya jugado ningún partido de esa etapa.
- Las etapas siguientes (cuartos, semifinal, final) se arman igual, a partir de los **ganadores** de la anterior.

### Armado automático por posición

- La regla es 1 vs N, 2 vs N-1…, y funciona con cualquier cantidad par de equipos.
- Para la ronda siguiente, los cruces se ordenan como una **llave clásica**: con 16 equipos, el ganador de 1v16 juega contra el de 8v9, y así los dos primeros solo pueden encontrarse en la final.
- El **mejor ubicado juega la vuelta de local**.
- **Ronda impar** (por ejemplo, 12 → 6 → 3): la app **solo avisa** y ofrece, sin imponer, **pase directo** para los mejores ubicados, o armar esa ronda a mano.

### Liguilla en serpentina

Los equipos se reparten por posición en zigzag para que los grupos queden parejos. Ejemplo con 8 equipos en 2 grupos:
- Grupo A: 1.º, 4.º, 5.º, 8.º
- Grupo B: 2.º, 3.º, 6.º, 7.º

Luego se usa «Generar calendario», como hoy.

## 3. Sorteo hecho por la app (sin dudas)

**Cómo se configura**
- **Con bombos o sin bombos.** Ejemplo con bombos: los 1.º de grupo en el bombo 1 y los 2.º en el bombo 2; cada cruce es un equipo del bombo 1 contra uno del bombo 2.
- **Restricción opcional:** que no se crucen dos equipos del mismo grupo en la primera ronda. Es lo habitual.
- En liguilla: los bombos reparten un equipo de cada bombo por grupo.

**Cómo se hace**
- **En vivo y paso a paso:** botón **«Sacar siguiente»**. Cada equipo sale de su bombo con una animación corta y aparece en su cruce o grupo. Se puede proyectar en la reunión de delegados.
- **Azar real:** lo hace el **servidor**, con el generador aleatorio seguro del sistema (el mismo que se usa para contraseñas y códigos). Nadie, ni el organizador, puede elegir el resultado.
- **Verificable:**
  - Antes de empezar, la app muestra un **código de garantía**: la huella (SHA-256) de la semilla secreta del sorteo. Ese código queda fijado y se puede anotar o fotografiar.
  - Al terminar, se revela la semilla. Cualquiera puede comprobar que la huella coincide y que, con esa semilla, salen exactamente esos cruces. Así se demuestra que el resultado no se cambió a mitad del sorteo.
- **No se puede repetir a escondidas:**
  - Cada sorteo queda registrado: fecha y hora, usuario, bombos, restricciones, código de garantía, semilla y resultado.
  - Si el organizador lo **repite**, el anterior **no se borra**: queda como «anulado», con el motivo que escriba. El historial se ve en la etapa.
- **Acta del sorteo en PDF:** campeonato, etapa, fecha y hora, quién lo hizo, bombos, resultado en orden de salida, código de garantía y semilla. Se puede compartir con los delegados.

## 4. Tabla de posiciones y desempate

**Por defecto** (el organizador puede cambiar el orden por etapa):

| Dentro de un grupo | Tabla general de clasificados (equipos de grupos distintos) |
|---|---|
| 1. Puntos | 1. Puntos |
| 2. Diferencia de goles | 2. Diferencia de goles |
| 3. Goles a favor | 3. Goles a favor |
| 4. Partidos ganados | 4. Partidos ganados |
| 5. Partido entre ellos | — (muchos no se enfrentaron) |
| 6. Fair play (amarilla = 1, roja = 3) | 5. Fair play |
| 7. Sorteo | 6. Sorteo |

- No se incluyen «goles en contra» ni «partidos perdidos», porque nunca desempatan después de los criterios anteriores (ver el análisis del 13 de octubre).
- **Base de la propuesta:** Mundial 2026 (mejores terceros: puntos, diferencia de goles, goles a favor, fair play), Libertadores 2026 (partido entre ellos y fair play), Champions 2025/26 (fair play con amarilla 1 y roja 3).
- El visto ✓ marca a los N clasificados de la etapa. Con «Ninguno», no aparece.
- Si el empate llega hasta «Sorteo», la app avisa y el organizador lo resuelve con el sorteo de la app o a mano.

## 5. Cruces en pantalla

```
Cruce 1   Ventarrón 2-1 · 1-1  Sin Zapatos    Global 3-2 → pasa Ventarrón
Cruce 2   Chicos P. 0-1 · 2-1  León           Global 2-2 · Penales 4-3 → pasa Chicos P.
Cruce 3   San Juan  1-0 · —    Palmeiras      Falta la vuelta
```

- **Penales:** al marcar como jugado el último partido de un cruce, si el global quedó empatado, la app pide el marcador de penales.
- **«Definir a mano»:** el organizador puede elegir quién pasa (por ejemplo, por una sanción). Siempre manda sobre el cálculo.
- En la ronda siguiente se ve «Ganador cruce 1» hasta que se conoce el equipo.
- Goleadores, tarjetas y suspensiones cuentan **todo el campeonato**: las suspensiones pasan de una etapa a otra.

## 6. Base de datos (borrador; el script y su reversa van con el PR)

- `fase_campeonato`, que ya existe y nunca se usó:
  - `nombre`, `ida_y_vuelta`, `empate_global` (PENALES / MEJOR_UBICADO);
  - el orden de desempate, como texto;
  - `id_instancia` pasa a opcional.
- `jornada.id_fase` y `grupo.id_fase`: la etapa a la que pertenecen.
- `campeonato.clasifican_visto`: el N del ✓; 0 = ninguno.
- **`cruce`:**
  - etapa y orden;
  - los dos equipos y su posición en la etapa anterior;
  - penales y ganador manual;
  - de qué cruces vienen los equipos, para «Ganador cruce 1».
- `partido.id_cruce`.
- **`sorteo`:**
  - etapa, usuario y fecha;
  - configuración (bombos y restricciones);
  - huella, semilla y resultado;
  - estado (vigente / anulado) y motivo.
- **Datos que ya existen:** cada campeonato recibe su etapa «Fase regular» y todas sus jornadas y grupos pasan a ella.
- Todo es nuevo u opcional, así que **el servidor anterior sigue funcionando** con el script aplicado. Orden de publicación: base → servidor → pantallas.

## 7. Plan de trabajo (un PR por parte)

1. **Etapas y tabla:**
   - etapas en la base y en pantalla;
   - tabla por etapa;
   - visto configurable («Ninguno»);
   - desempate nuevo con fair play;
   - mover una jornada a otra etapa.
2. **«Iniciar siguiente etapa» con eliminatoria:**
   - clasificados;
   - armado por posición o manual;
   - ida y vuelta, global, penales;
   - «Definir a mano»;
   - rondas siguientes.
3. **Liguilla:** serpentina, manual y calendario.
4. **Sorteo:** bombos, en vivo, código de garantía, historial y acta en PDF.
5. **Reportes:** Posiciones por etapa y llave en PDF.

## Para después

- Puntos de bonificación.
- Gol de visitante.
- Reglas por modalidad: minutos, cambios, faltas acumuladas.
