# LigaManager — Temporadas, configuración y etapas del campeonato (propuesta para aprobar)

**Fecha:** 14 de octubre de 2026 (versión 3: se suman temporadas y configuración previa). **Estado:** diseño para que Roberto lo apruebe. Todavía no se programó nada.

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
| Modalidades | **Solo Fútbol e Indor.** Otra modalidad que ya exista en la base (por ejemplo, Fútbol 7) sigue funcionando en sus campeonatos, pero no se ofrece en los nuevos. |

## A. Campeonato y temporadas

**Idea:** el **campeonato** es la competencia que se repite cada año (por ejemplo, «Liga Barrial Recuspro — Senior»). Cada edición es una **temporada** («2026», «2027», «Apertura 2026», «Clausura 2026»…). Primero se crea el campeonato y después se le agregan temporadas.

**¿Es viable?** Sí. Hoy cada «campeonato» de la app ya funciona como una temporada: tiene año, fechas, equipos, jornadas y estado. Solo hace falta un nivel arriba que las agrupe:

```
Liga Barrial Recuspro — Senior          ← campeonato (nuevo)
 ├─ Temporada 2025  (Finalizada · campeón: Ventarrón)
 ├─ Temporada 2026  (En curso)          ← lo que hoy la app llama «campeonato»
 └─ Temporada 2027  (Planificada)
```

**Qué aporta:**

- **«Nueva temporada» a partir de la anterior.** Se copian:
  - los equipos inscritos (se pueden quitar o agregar);
  - la configuración (sección B);
  - los vocales titulares, si se elige.

  No se copian los partidos, las jornadas ni las sanciones cumplidas.
- **Historial:**
  - campeones por temporada;
  - goleadores e historial de cada equipo en el campeonato;
  - tabla histórica (opcional, más adelante).
- **Suspensiones pendientes:**
  - el organizador elige si **pasan a la temporada siguiente**: «Arrastrar suspensiones pendientes: Sí / No»;
  - por defecto Sí, como en la mayoría de los reglamentos.
- **Jugadores:** no cambia nada. Los jugadores ya pertenecen a un equipo con fechas desde y hasta, así que siguen igual entre temporadas.

**En pantalla:**

- **Campeonatos:** lista de campeonatos, cada uno con su temporada actual destacada.
- Al entrar a un campeonato, un **selector de temporada** muestra todo lo de hoy (equipos, grupos, jornadas, vocales), filtrado por la temporada elegida.
- Los reportes se filtran por temporada; por defecto, la actual.

**Campeonatos que ya existen:** cada uno se convierte en un campeonato con **una temporada**, que conserva su nombre y su año. El organizador puede después **juntar** temporadas sueltas en un mismo campeonato (por ejemplo, «Senior 2025» y «Senior 2026»).

## B. Configuración de la temporada antes de iniciarla

Al crear una temporada (o con **Editar → Configuración**) se definen sus reglas. Los valores iniciales vienen de la **modalidad** elegida (**Fútbol** o **Indor**), o de la temporada anterior si se usa «Nueva temporada».

| Sección | Qué se configura | Por defecto |
|---|---|---|
| **Juego** | Jugadores en cancha · minutos por tiempo · número de tiempos | Según la modalidad (Fútbol: 11 jugadores, 45 min, 2 tiempos · Indor: valores a confirmar por Roberto) |
| **Cambios** | Máximo por partido o ilimitados · si un jugador puede volver a entrar | Fútbol: 5 cambios, sin reingreso · Indor: ilimitados, con reingreso |
| **Puntos** | Ganado · empatado · perdido | 3 · 1 · 0 |
| **Tabla** | Orden de desempate (sección 4) · equipos con visto ✓ (o «Ninguno») | El propuesto · Ninguno |
| **Disciplina** | Amarillas para suspensión · fechas por roja, por doble amarilla y por acumulación · arrastrar suspensiones a la temporada siguiente | 5 · 2 · 1 · 1 · Sí (son los valores fijos de hoy) |
| **Etapa 1** | Formato: todos contra todos o grupos · número de grupos · una vuelta o ida y vuelta · clasifican por grupo | Todos contra todos, una vuelta |
| **Faltas acumuladas** (indor) | Activar · cada cuántas faltas hay tiro libre sin barrera | Desactivado |

**Cuándo se puede cambiar:**

- **Antes de que se juegue el primer partido:** todo se puede cambiar.
- **Ya iniciada la temporada:**
  - se sigue pudiendo cambiar, pero la app **avisa** qué se recalcula (tabla, suspensiones);
  - cada cambio queda registrado con fecha y usuario;
  - jugadores en cancha, minutos y cambios solo afectan a los partidos que todavía no se jugaron.

**Dónde se usa cada regla:**

- **Reloj en vivo:** arranca con los minutos de la temporada, no siempre en 45.
- **Planilla y modo en vivo:** respetan el máximo de titulares y de cambios, y permiten o no el reingreso.
- **Tabla:** usa los puntos y el desempate de la temporada.
- **Suspensiones:** usan las reglas de disciplina de la temporada. Hoy son iguales para todos los campeonatos.

**Configuración → Modalidades** (menú del organizador): ahí se editan los valores por defecto de cada modalidad, que se copian a cada temporada nueva. Cambiar una modalidad **no** modifica las temporadas que ya existen.

**Asistente al crear la temporada** (3 pasos, todos con valores ya llenados):

1. **Datos:** nombre, año, fechas, modalidad.
2. **Reglas:** juego, cambios, puntos, disciplina; se puede saltar y quedan los valores por defecto.
3. **Formato de la etapa 1:** todos contra todos o grupos, vueltas, clasificados.

Después se inscriben los equipos y se genera el calendario, como hoy.

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

**Temporadas y configuración:**
- Tabla nueva **`torneo`** (el «campeonato» que agrupa temporadas): nombre, organizador, modalidad por defecto.
- `campeonato` (que pasa a mostrarse como «temporada»):
  - `id_torneo`;
  - `nombre_temporada`;
  - reglas: `jugadores_en_cancha`, `minutos_por_tiempo`, `num_tiempos`, `cambios_maximos` (vacío = ilimitados), `permite_reingreso`, `puntos_ganado` / `puntos_empate` / `puntos_perdido`, `orden_desempate`, `clasifican_visto`;
  - reglas de disciplina (`amarillas_para_suspension`…), `arrastrar_suspensiones`, faltas acumuladas.
- `modalidaddeportiva`: los mismos valores por defecto (ya tiene jugadores por lado, minutos y número de tiempos; se agregan cambios y reingreso).
- Tabla **`cambio_configuracion`**: historial de cambios de reglas con la temporada iniciada (fecha, usuario, qué cambió).
- **Datos que ya existen:** cada campeonato recibe su `torneo` con el mismo nombre. Sus reglas se llenan con los valores de hoy: puntos 3·1·0, disciplina 5·2·1·1, minutos y jugadores de su modalidad, y cambios ilimitados (como ahora). Así **nada cambia** hasta que el organizador lo ajuste.
- **Nota:** en la base, la tabla se sigue llamando `campeonato`, para no romper nada; solo cambia lo que se ve en pantalla.

**Etapas:**

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

1. **Temporadas:**
   - el nivel «campeonato → temporadas»;
   - selector de temporada;
   - «Nueva temporada» copiando equipos y configuración;
   - juntar temporadas sueltas.
2. **Configuración de la temporada:**
   - asistente al crear y «Editar → Configuración»;
   - Configuración → Modalidades;
   - reglas usadas en el reloj, la planilla, los cambios, la tabla y las suspensiones;
   - historial de cambios.
3. **Etapas y tabla:**
   - etapas;
   - tabla por etapa;
   - visto configurable;
   - desempate nuevo con fair play;
   - mover una jornada a otra etapa.
4. **«Iniciar siguiente etapa» con eliminatoria:**
   - clasificados;
   - armado por posición o manual;
   - ida y vuelta, global, penales;
   - «Definir a mano»;
   - rondas siguientes.
5. **Liguilla:** serpentina, manual y calendario.
6. **Sorteo:** bombos, en vivo, código de garantía, historial y acta en PDF.
7. **Reportes:** por temporada y por etapa, llave en PDF e historial del campeonato.

## Para después

- Puntos de bonificación.
- Gol de visitante.
- Tabla histórica de todas las temporadas.
- Ascensos y descensos entre categorías.
