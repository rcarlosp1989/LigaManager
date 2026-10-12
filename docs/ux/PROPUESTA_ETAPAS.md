# LigaManager — Etapas del campeonato (propuesta para aprobar)

**Fecha:** 12 de octubre de 2026. **Estado:** diseño para que Roberto lo revise. Todavía no se programó nada.

## El problema

- El visto (✓) de la tabla marca siempre a los **2 primeros**: la cantidad de clasificados no se puede configurar desde la app.
- **En un campeonato sin grupos, la tabla suma todos los partidos jugados**, también los de cuartos, semifinal y final.
- No existen las eliminatorias: no hay cruces, ni marcador global de ida y vuelta, ni penales.
- El desempate de la tabla no coincide con el reglamento. Hoy es: puntos → partidos ganados → diferencia de goles → goles a favor.

## Decisiones de Roberto

| Tema | Decisión |
|---|---|
| Cómo se arma el campeonato | **Una etapa a la vez.** Al terminar una etapa se crea la siguiente, y se configura en ese momento. |
| Automático o manual | **Plantillas automáticas** (calendario y cruces sugeridos) **y siempre la opción de hacerlo a mano.** |
| Cruce de ida y vuelta | Pasa el que tenga **mejor diferencia de goles en los dos partidos** (marcador global). **Si siguen empatados: penales.** |
| Desempate en la tabla | **Puntos → diferencia de goles → más goles a favor → menos goles en contra → fair play.** |
| Caso real | 8 equipos todos contra todos, **pasan los 8**, y luego cruces **1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5**. |

## Cómo funciona

### 1. Etapas

- Cada campeonato tiene una o más etapas, en orden: «Fase regular», «Cuartos de final», «Semifinal», «Final», «Liguilla»…
- Cada jornada pertenece a una etapa.
- Los campeonatos que ya existen quedan con una sola etapa, «Fase regular», que contiene todas sus jornadas. **Para ellos no cambia nada**, salvo el nuevo orden de desempate (ver «Efectos visibles»).

Hay dos tipos de etapa:

| Tipo | Qué es | Se configura |
|---|---|---|
| **Tabla** | Todos contra todos, con grupos o sin ellos. Tiene tabla de posiciones. | **Equipos que clasifican** (por grupo): define cuántos llevan el ✓. Puede ser «todos». |
| **Eliminatoria** | Cruces entre dos equipos. No tiene tabla. | **Ida y vuelta** (sí/no) y **qué pasa si el global queda empatado**: penales (por defecto) o pasa el mejor ubicado. |

### 2. Crear la siguiente etapa

En la pestaña Jornadas del campeonato, encima de la lista, hay un selector de etapas:

```
[ Fase regular ✓ ]  [ Cuartos de final ]  [ + Nueva etapa ]
```

Al tocar **«+ Nueva etapa»** se abre un formulario corto:

1. **Nombre:** se elige de una lista (Cuartos, Semifinal, Final, Tercer puesto, Liguilla) o se escribe otro.
2. **Tipo:** Eliminatoria o Tabla.
3. **Equipos:** vienen marcados los clasificados (✓) de la etapa anterior. Se pueden quitar o agregar.
4. **Si es Eliminatoria:**
   - **Ida y vuelta** (sí/no).
   - **Si el global queda empatado:** penales, o pasa el mejor ubicado.
   - **Cruces sugeridos**, que se pueden cambiar con dos listas por cruce:

     | Cruce | Local en la ida | Visitante en la ida |
     |---|---|---|
     | 1 | 8.º Sin Zapatos | 1.º Ventarrón |
     | 2 | 5.º León | 4.º Chicos Plásticos |
     | 3 | 7.º Palmeiras | 2.º San Juan |
     | 4 | 6.º Agremiados | 3.º Fosforito |

     - El **mejor ubicado juega la vuelta de local**. Eso también se puede cambiar.
     - Viniendo de otra eliminatoria, se sugiere **ganador del cruce 1 contra ganador del cruce 2**, y **3 contra 4**. El orden de arriba (1v8 con 4v5, y 2v7 con 3v6) arma la llave clásica.
   - **Fechas:** fecha de la ida y fecha de la vuelta, para todos los cruces. Después se editan partido por partido, como hoy (hora, estadio, árbitro).
5. **Si es Tabla** (por ejemplo, una liguilla):
   - Equipos que clasifican.
   - Después se usa el **«Generar calendario»** de siempre: todos contra todos, una vuelta o ida y vuelta.
6. **Opción manual:** el botón **«Crear sin cruces»** crea solo la etapa; los partidos se agregan a mano, como hoy.

El botón «+ Nueva etapa» está siempre disponible. La app **avisa** si la etapa anterior tiene partidos sin jugar, pero no lo impide.

### 3. Cómo se ven los cruces

En una etapa eliminatoria, la pestaña muestra los cruces con su marcador global:

```
Cruce 1   Ventarrón 2-1 · 1-1  Sin Zapatos     Global 3-2 → pasa Ventarrón
Cruce 2   Chicos P. 0-1 · 2-1  León            Global 2-2 · Penales 4-3 → pasa Chicos P.
Cruce 3   San Juan  1-0 · —    Palmeiras       Falta la vuelta
```

- Cada partido sigue teniendo su tarjeta de siempre (planilla, en vivo, editar), dentro de su jornada.
- **Penales:** al marcar como jugado el último partido de un cruce, si el global quedó empatado y la regla es penales, la app pide el marcador de penales. Se puede corregir después.
- **Pasar a mano:** el organizador puede elegir quién pasa con «Definir a mano», por ejemplo cuando hay una sanción. Siempre manda sobre el cálculo automático.

### 4. Tabla de posiciones y desempate

- La tabla **solo cuenta los partidos de su etapa.** Con esto se corrige que se sumen los de la eliminatoria.
- Nuevo orden de desempate, para todas las tablas:
  1. Puntos
  2. Diferencia de goles
  3. Goles a favor (más)
  4. Goles en contra (menos)
  5. Fair play: menos puntos por tarjetas (amarilla = 1, roja = 3, igual que el reporte de Tarjetas)
- El ✓ marca a los N primeros, con el N de la etapa (por grupo, si tiene grupos).
- En Reportes → Posiciones se elige la etapa; por defecto, la última de tipo Tabla.
- Goleadores, Tarjetas y Suspensiones siguen contando **todo el campeonato** (todas las etapas). Las suspensiones pasan de una etapa a la siguiente.

## Base de datos (borrador; el script y su reversa van con el PR)

```sql
-- Etapas: se aprovecha la tabla fase_campeonato, que ya existe y no se usaba.
ALTER TABLE fase_campeonato
  ADD COLUMN nombre VARCHAR(60) NOT NULL DEFAULT 'Fase regular',
  ADD COLUMN ida_y_vuelta TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN empate_global ENUM('PENALES','MEJOR_UBICADO') NOT NULL DEFAULT 'PENALES',
  MODIFY id_instancia INT NULL;
-- «formato»: GRUPOS = etapa de Tabla · ELIMINACION_DIRECTA = Eliminatoria.
-- «equipos_clasifican»: el N del ✓. Se usan las columnas que ya existen.

ALTER TABLE jornada ADD COLUMN id_fase INT NULL, ADD FOREIGN KEY (id_fase) REFERENCES fase_campeonato(id_fase);
ALTER TABLE grupo   ADD COLUMN id_fase INT NULL, ADD FOREIGN KEY (id_fase) REFERENCES fase_campeonato(id_fase);

CREATE TABLE cruce (
  id_cruce        INT AUTO_INCREMENT PRIMARY KEY,
  id_fase         INT NOT NULL,   -- FK fase_campeonato (ON DELETE CASCADE)
  orden           INT NOT NULL,
  id_equipo_a     INT NOT NULL,   -- el mejor ubicado (juega la vuelta de local)
  id_equipo_b     INT NOT NULL,
  posicion_a      INT NULL,       -- puesto en la etapa anterior (para «mejor ubicado»)
  posicion_b      INT NULL,
  penales_a       INT NULL,
  penales_b       INT NULL,
  id_ganador_manual INT NULL,     -- «Definir a mano»
  UNIQUE (id_fase, orden)
);
ALTER TABLE partido ADD COLUMN id_cruce INT NULL, ADD FOREIGN KEY (id_cruce) REFERENCES cruce(id_cruce) ON DELETE SET NULL;

-- Datos que ya existen: cada campeonato recibe su etapa «Fase regular», con 2 clasificados
-- (como hoy), y todas sus jornadas y grupos pasan a esa etapa.
-- Si ya hay filas en fase_campeonato, se respetan.
```

- Todo es nuevo u opcional, así que **el servidor anterior sigue funcionando** con el script aplicado.
- Orden de publicación: base de datos → servidor → pantallas.
- La reversa borra `cruce` y las columnas nuevas, y deja `fase_campeonato` como estaba.

## Efectos visibles en los campeonatos actuales

- **Desempate nuevo:** si dos equipos están empatados en puntos, el orden de la tabla puede cambiar. Antes, el segundo criterio eran los partidos ganados; ahora es la diferencia de goles.
- **Si un campeonato ya tiene partidos de eliminatoria** cargados como jornadas normales, esos partidos van a seguir sumando en la tabla hasta que se pasen a una etapa nueva. La app permitirá mover una jornada a otra etapa (Editar jornada → Etapa).

## Plan de trabajo (por partes, un PR cada una)

1. **Etapas y tabla:**
   - etapas en la base;
   - selector de etapas y «+ Nueva etapa», solo con creación manual;
   - tabla filtrada por etapa;
   - «Equipos que clasifican»;
   - desempate nuevo, con fair play;
   - mover una jornada de etapa.
2. **Eliminatorias:**
   - cruces sugeridos con vista previa;
   - ida y vuelta;
   - marcador global y penales;
   - «Definir a mano»;
   - cruces de la siguiente ronda.
3. **Reportes:** elegir la etapa en Posiciones, y la llave en PDF (opcional).

## Para después (no entra ahora)

- Orden de desempate configurable por campeonato.
- Puntos de bonificación.
- Mejores terceros.
- Gol de visitante.
- Reglas por modalidad: minutos por tiempo, cambios, faltas acumuladas.
