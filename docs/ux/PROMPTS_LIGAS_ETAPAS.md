# LigaManager — Prompts por fases: Ligas, categorías, temporadas, configuración y etapas

**Para qué sirve:** son los textos que hay que pegar en Claude Code, dentro de VS Code, para programar el diseño de `docs/ux/PROPUESTA_ETAPAS.md` (versión 4) **primero en tu computadora**, con tu base local, y solo después subirlo.

**Cómo usarlo:**
1. Abre la carpeta del proyecto en VS Code y abre Claude Code.
2. Pega el **PROMPT BASE** una sola vez, al empezar cada sesión de trabajo.
3. Pega **una fase a la vez**, en orden. No pases a la siguiente hasta que la anterior esté probada por ti y fusionada en `main`.
4. Cada fase termina con Claude **deteniéndose y esperando tu aprobación**.

---

## PROMPT BASE (pegar primero, en cada sesión)

```text
Eres el desarrollador de LigaManager. Yo (Roberto) soy el dueño; no soy programador.
Háblame en español claro, sin jerga.

PROYECTO
- Backend: .NET 9 (ASP.NET Core + EF Core, MySQL), carpeta backend/.
- Frontend: React + Vite + Tailwind, carpeta frontend/.
- Producción: API en Railway, MySQL 9.4 en Railway, frontend en Vercel.
- Repositorio: GitHub rcarlosp1989/LigaManager.

DOCUMENTOS QUE DEBES LEER ANTES DE TOCAR NADA
- docs/ux/PROPUESTA_ETAPAS.md   (el diseño aprobado que vamos a programar)
- docs/ux/PROGRESO.md           (bitácora: cómo se ha trabajado y qué existe)
- backend/database/             (scripts SQL fechados: así se cambia la base, NO hay migraciones de EF)

REGLAS QUE NO SE NEGOCIAN
1. Una rama por fase (nombre indicado en cada fase). NUNCA hagas commit ni push a main.
   Yo pruebo y yo fusiono.
2. La base de datos se cambia SOLO con scripts SQL en backend/database/:
   - un script AAAAMMDD_nombre.sql y su reversa AAAAMMDD_nombre_reversa.sql;
   - todo debe ser ADITIVO: columnas nuevas NULL o con DEFAULT, tablas nuevas.
     Nada de DROP ni RENAME de columnas o tablas que ya existen.
   - el servidor ANTERIOR debe seguir funcionando con el script aplicado
     (así puedo aplicar el script antes de publicar el código);
   - los datos que ya existen deben quedar funcionando IGUAL que hoy;
   - al final del script, consultas de comprobación (SELECT) que yo pueda leer.
   Antes de escribir el script, muéstrame el diseño de las tablas y ESPERA mi OK.
3. Nunca ejecutes nada contra la base de producción (Railway). Solo contra la base LOCAL.
4. Nunca pongas contraseñas, claves ni secretos en el código.
5. Textos de pantalla en español. Mantén el estilo visual actual (tema oscuro,
   componentes existentes como Modal, MenuAcciones, TablaDesplazable, EstadoError).
6. Compatibilidad: los DTO nuevos agregan campos AL FINAL con valor por defecto,
   para no romper el frontend anterior.
7. Antes de dar por terminada una fase:
   - backend: `dotnet build` sin errores;
   - frontend: `npm run build` y `npm run lint` (no agregar errores nuevos de lint;
     hoy hay 5 que ya existían);
   - correr las PRUEBAS DE REGRESIÓN (ver abajo) y las pruebas nuevas de la fase;
   - revisar las pantallas tocadas en celular (390 px) y computadora (1440 px);
   - agregar una entrada con fecha en docs/ux/PROGRESO.md (qué cambió, cómo se verificó);
   - explicarme en palabras simples qué probar yo, paso a paso.
8. Si algo del diseño no se puede hacer como está escrito, o encuentras un riesgo,
   DETENTE y pregúntame. No improvises decisiones de reglas del torneo.

CUIDADOS CONOCIDOS
- La base tiene TRIGGERS que mantienen la tabla de posiciones (posicion_grupo).
  Antes de cambiar cómo se calcula la tabla, ejecuta `SHOW TRIGGERS;` en la base
  local, lee cada uno y dime qué hacen. Ningún cambio puede dejar dos cálculos
  peleando entre sí (trigger y código).
- En appsettings.json la base local se llama `liga_manager`; el respaldo puede
  traer otro nombre (`ligamanager` o `railway`). Ajusta la cadena de conexión
  LOCAL con variables de entorno o appsettings.Development.json (sin subirlo).
- El servicio de Railway «harmonious-learning» siempre falla: ignóralo.

PRUEBAS DE REGRESIÓN (lo que ya funciona y NO se puede romper)
Con la base local y la app corriendo, comprobar al final de cada fase:
- Registrar organizador e iniciar sesión.
- Crear y editar un campeonato (o temporada), inscribir y quitar equipos.
- Crear grupos, asignar equipos, generar calendario.
- Crear jornada, agregar, editar y eliminar partido (fecha, hora, estadio, árbitro).
- Planilla: convocar, eventos (gol, autogol, tarjetas), cambios, marcar jugado.
- Modo en vivo como organizador y como vocal (invitación por código).
- Tabla de posiciones (con y sin grupos) y Reportes: Posiciones, Nómina (PDF y
  Excel), Goleadores, Tarjetas, Suspensiones (también la sanción manual).
- Equipos con logo, jugadores con foto, mantenimiento de árbitros y estadios.
- Dashboard.
Si existen las pruebas automáticas en Python de la carpeta ci/ (rama
ci/verificar-fotos), úsalas también contra la API local.
```

---

## FASE 0 — Revisar el entorno local (una sola vez)

Roberto ya tiene la app y la base funcionando en su computadora. Esta fase solo revisa que la base local esté **al día** con producción y deja un respaldo para poder volver atrás.

```text
FASE 0: revisar el entorno local. No cambies código de la app en esta fase.
Ya tengo la app y la base de datos funcionando en mi computadora.

1. Revisa que la base LOCAL tenga aplicados todos los scripts de
   backend/database/ que ya están en producción (los de octubre: registro en vivo,
   rol vocal, cédula por organizador, tipo de documento, países completos,
   imágenes/logos). Para cada uno, comprueba si sus tablas o columnas existen en mi
   base local, dime cuáles faltan y aplícalos SOLO en la base local, en orden de fecha.
2. Antes de aplicar nada, haz un respaldo de mi base local (mysqldump con
   --routines --triggers) y dime dónde quedó y cómo restaurarlo.
   El archivo .sql no se sube a GitHub: confirma que está en .gitignore.
3. Confirma que la API (dotnet run) y el frontend (npm run dev) arrancan contra la
   base local y que puedo entrar y ver mis campeonatos.
4. Ejecuta `SHOW TRIGGERS;` en la base local y explícame qué hace cada trigger.
5. Trae a una carpeta local las pruebas en Python de ci/ (rama ci/verificar-fotos)
   y prepara un comando para correrlas contra la API local. No las subas a main.
6. Escribe en docs/ux/LOCAL.md (sin contraseñas) cómo levantar todo y cómo restaurar
   el respaldo de la base local.

Al terminar: dime qué encontraste y espera.
```

*Opcional:* si en algún momento quieres probar con los datos reales de producción, se puede traer una copia de la base de Railway a tu PC (solo lectura sobre Railway). No es obligatorio.

---

## FASE 1 — Liga → Categoría → Temporada

```text
FASE 1 del diseño (docs/ux/PROPUESTA_ETAPAS.md, sección A y plan punto 1).
Rama: mejora/ligas-categorias (desde main actualizado).

Objetivo: agregar los niveles Liga y Categoría encima de lo que hoy se llama
«campeonato», que pasa a mostrarse como «Temporada». Nada de reglas ni etapas
todavía.

1. Diseño de base (muéstramelo y espera mi OK antes del script):
   - tabla `liga` (nombre, logo opcional, ciudad, organizador, fechas);
   - tabla `categoria` (liga, nombre, modalidad);
   - `campeonato.id_categoria` NULL al principio, con FK;
   - `campeonato.nombre_temporada` NULL (si es NULL, se muestra el año).
   - En la base la tabla se sigue llamando `campeonato`; solo cambia la pantalla.
2. Script + reversa. El script crea, para cada organizador con campeonatos, una
   liga «Mi liga», y para cada campeonato una categoría con su mismo nombre y
   modalidad, y los enlaza. Comprobación final: 0 campeonatos sin categoría.
3. Backend:
   - servicios y endpoints para listar, crear, editar y eliminar ligas y categorías
     (cada organizador ve solo lo suyo, igual que hoy con campeonatos; Admin ve todo);
   - no se puede eliminar una categoría con temporadas, ni una liga con categorías;
   - «Nueva temporada» en una categoría: crea la temporada copiando los equipos
     inscritos de la temporada anterior (opcional: vocales titulares);
   - «Mover temporada» a otra categoría y «Mover categoría» a otra liga (para juntar
     lo que hoy está suelto);
   - todos los endpoints actuales de campeonatos siguen funcionando igual.
4. Frontend:
   - menú «Ligas»: ligas → categorías → temporadas (la actual destacada);
   - ruta arriba: «Liga › Categoría · Modalidad › Temporada»;
   - la pantalla actual de detalle del campeonato se reutiliza como pantalla de la
     temporada (mismas pestañas);
   - la lista actual de Campeonatos sigue existiendo y lleva a lo mismo;
   - formularios de liga, categoría y «Nueva temporada».
   - Reportes: el selector de campeonato muestra «Categoría · Temporada».
5. Pruebas nuevas: crear liga y categoría, nueva temporada con equipos copiados,
   mover temporada, permisos entre dos organizadores, script y reversa en la base
   local (aplicar → probar → reversa → la app anterior sigue funcionando).
6. Pruebas de regresión completas. PROGRESO.md. Explícame qué probar.
Detente y espera.
```

---

## FASE 2 — Configuración de la temporada

```text
FASE 2 (sección B del diseño y plan punto 2). Rama: mejora/configuracion-temporada.

Objetivo: cada temporada tiene sus reglas y la app las usa.

1. Diseño de base (muéstramelo y espera mi OK):
   - en `modalidaddeportiva` y en `categoria` (valores por defecto) y en `campeonato`
     (valores de la temporada): jugadores_en_cancha, minutos_por_tiempo (5 a 60),
     num_tiempos, cambios_maximos (NULL = ilimitados), permite_reingreso,
     max_inscritos (NULL = sin límite), puntos_ganado/empate/perdido,
     clasifican_visto (0 = ninguno), amarillas_para_suspension,
     partidos_por_roja, partidos_por_doble_amarilla, partidos_por_acumulacion,
     arrastrar_suspensiones;
   - tabla `cambio_configuracion` (temporada, usuario, fecha, qué cambió: antes → después).
   - Todo NULL o con DEFAULT. Las temporadas existentes quedan EXACTAMENTE con las
     reglas de hoy: puntos 3·1·0, disciplina 5·2·1·1 (las de appsettings),
     cambios ilimitados, sin límite de inscritos, visto = 2 (como hoy; luego yo
     lo cambio donde quiera).
   - Valores por defecto de modalidades: Fútbol 11 jugadores, 2×45, 5 cambios,
     sin reingreso; Indor 6 jugadores, 2×20, 3 cambios, sin reingreso, máximo 12
     inscritos; disciplina igual en ambas. Solo se ofrecen Fútbol e Indor en
     temporadas nuevas; otras modalidades que existan siguen funcionando.
2. Script + reversa + comprobaciones.
3. Backend: leer las reglas de la temporada (si una columna es NULL, usar la regla
   actual de appsettings) en:
   - tabla de posiciones (puntos por resultado);
   - suspensiones (reglas de disciplina) — hoy son globales;
   - alineación (máximo de titulares = jugadores_en_cancha; máximo de cambios;
     reingreso);
   - inscripción de jugadores en equipos de la temporada (max_inscritos).
   Cambiar reglas con la temporada iniciada: permitido, se registra en
   cambio_configuracion y se recalcula lo que corresponda.
4. Frontend:
   - asistente al crear temporada: Datos → Reglas → Formato de la etapa 1
     (este último paso solo guarda la elección por ahora, la fase 3 lo usa);
   - «Editar → Configuración» en la temporada, con aviso de qué se recalcula;
   - Configuración → Modalidades (y reglas por defecto de cada categoría);
   - el reloj del modo en vivo arranca con minutos_por_tiempo de la temporada;
   - el visto ✓ usa clasifican_visto («Ninguno» = sin visto).
5. Pruebas nuevas: una temporada de Indor con 6 titulares y 3 cambios, una de fútbol
   a 2×30, cambiar la regla de amarillas y ver las suspensiones recalculadas,
   límite de 12 inscritos, temporada antigua sin cambios de comportamiento.
6. Regresión completa. PROGRESO.md. Explícame qué probar. Detente y espera.
```

---

## FASE 3 — Etapas y tabla de posiciones

```text
FASE 3 (secciones 1 y 4 del diseño, plan punto 3). Rama: mejora/etapas-tabla.

Objetivo: separar la temporada en etapas y que cada tabla cuente solo su etapa,
con el desempate nuevo.

1. ANTES DE TODO: revisa los triggers de posicion_grupo y explícame cómo
   convivirán con el cálculo por etapa. Espera mi OK.
2. Diseño de base (muéstramelo y espera mi OK):
   - usar la tabla existente fase_campeonato: agregar nombre, ida_y_vuelta,
     empate_global (PENALES/MEJOR_UBICADO), orden_desempate; id_instancia pasa a NULL;
   - jornada.id_fase y grupo.id_fase (NULL, FK);
   - script: cada temporada recibe su etapa «Fase regular» (respetando filas que ya
     existan en fase_campeonato) y todas sus jornadas y grupos pasan a ella.
3. Backend:
   - tabla de posiciones por etapa (con y sin grupos): solo partidos de esa etapa;
   - desempate por defecto: dentro del grupo → puntos, diferencia de goles, goles a
     favor, partidos ganados, partido entre ellos, fair play (amarilla 1, roja 3),
     sorteo; tabla general de clasificados → lo mismo sin «partido entre ellos»;
     el orden es configurable por etapa;
   - si quedan empatados hasta «sorteo», marcarlo para que la pantalla avise;
   - mover una jornada a otra etapa.
4. Frontend: selector de etapas en la pestaña Jornadas; tabla por etapa; Editar
   jornada → Etapa; aviso de empate sin resolver; Reportes → Posiciones con
   selector de etapa.
5. Pruebas: un caso armado a mano para CADA criterio de desempate (dos equipos que
   empatan en todo menos en ese criterio); tabla de un campeonato viejo con partidos
   de playoff cargados como jornadas normales → al moverlas a otra etapa dejan de sumar.
6. Regresión completa. PROGRESO.md. Avísame si alguna tabla real cambia de orden con
   el desempate nuevo (compárala antes y después en la base local).
Detente y espera.
```

---

## FASE 4 — «Iniciar siguiente etapa» con eliminatoria

```text
FASE 4 (secciones 2 y 5 del diseño, plan punto 4). Rama: mejora/eliminatorias.

1. Diseño de base (espera mi OK): tabla `cruce` (etapa, orden, equipo A = mejor
   ubicado, equipo B, posiciones, penales_a/b, ganador_manual, cruces de origen para
   «Ganador cruce N»); partido.id_cruce.
2. Backend:
   - lista de clasificados de una etapa (tabla general con su desempate), editable;
   - crear etapa eliminatoria: nombre, partido único o ida y vuelta, definición
     (global → penales | global → mejor ubicado);
   - armado por posición (1 vs N, 2 vs N-1…, cualquier cantidad par) o manual;
   - llave clásica para la ronda siguiente; el mejor ubicado juega la vuelta de local;
   - si una ronda queda impar: solo avisar y ofrecer pase directo a los mejores
     ubicados (sin imponer);
   - crear jornadas y partidos con fechas de ida y vuelta;
   - ganador del cruce: global por diferencia de goles; si persiste, penales (se
     piden al marcar jugado el último partido del cruce) o mejor ubicado; «Definir a
     mano» siempre manda;
   - «Deshacer etapa» si no se jugó ningún partido de ella;
   - siguientes rondas desde los ganadores.
3. Frontend: botón «Iniciar siguiente etapa» → clasificados → configuración → vista
   previa editable → confirmar; vista de cruces con global y penales; pedir penales
   al cerrar; «Definir a mano»; «Ganador cruce N».
4. Pruebas: 8 equipos 1v8…4v5 a ida y vuelta (global, empate → penales); 16 equipos
   hasta la final; 12 equipos (aviso de ronda impar); deshacer; suspensiones que
   pasan de la fase regular a la eliminatoria.
5. Regresión completa. PROGRESO.md. Detente y espera.
```

---

## FASE 5 — Liguilla (nueva fase de grupos)

```text
FASE 5 (sección 2 del diseño, plan punto 5). Rama: mejora/liguilla.

- Etapa de tipo Tabla creada desde los clasificados: número de grupos, una vuelta o
  ida y vuelta, clasifican por grupo, orden de desempate.
- Armado: serpentina por posición (ej. 8 en 2 grupos: A = 1,4,5,8 · B = 2,3,6,7),
  o manual (arrastrar cada equipo a su grupo).
- Luego «Generar calendario» como hoy, dentro de esa etapa.
- Vista previa editable y «Deshacer etapa».
- Pruebas: 8 en 2 grupos, 6 en 1 grupo (hexagonal), regresión completa.
- PROGRESO.md. Detente y espera.
```

---

## FASE 6 — Sorteo verificable

```text
FASE 6 (sección 3 del diseño, plan punto 6). Rama: mejora/sorteo.

1. Diseño de base (espera mi OK): tabla `sorteo` (etapa, usuario, fecha,
   configuración de bombos y restricciones, huella SHA-256 de la semilla, semilla,
   resultado en orden de salida, estado vigente/anulado, motivo).
2. Backend:
   - la semilla la genera el SERVIDOR con RandomNumberGenerator (nunca el navegador);
   - al iniciar se guarda y se muestra solo la huella (código de garantía);
   - el orden sale de un algoritmo determinista a partir de la semilla
     (Fisher-Yates con un generador derivado de la semilla, documentado), para que
     cualquiera pueda reproducirlo;
   - bombos opcionales y restricción opcional «no cruzar equipos del mismo grupo»;
   - «Sacar siguiente»: el servidor va revelando el resultado ya fijado, paso a paso;
   - al terminar se revela la semilla;
   - repetir un sorteo NO borra el anterior: lo marca «anulado» con motivo.
3. Frontend: configuración de bombos, pantalla de sorteo en vivo (para proyectar),
   historial de sorteos de la etapa, botón «Verificar» y acta del sorteo en PDF.
4. Pruebas: misma semilla → mismo resultado siempre; la huella coincide; la
   restricción se respeta; un sorteo repetido deja el anterior anulado y visible.
5. Regresión completa. PROGRESO.md. Detente y espera.
```

---

## FASE 7 — Reportes e historial

```text
FASE 7 (plan punto 7). Rama: mejora/reportes-etapas.

- Reportes filtrados por Liga › Categoría › Temporada y por etapa.
- Llave de la eliminatoria en pantalla y en PDF.
- Historial de la categoría: campeones por temporada, goleadores por temporada.
- Regresión completa. PROGRESO.md. Detente y espera.
```

---

## Al terminar cada fase: cómo subirla sin romper nada

Esto lo haces tú (Claude te guía, pero no lo hace solo):

1. Probaste todo en local y estás conforme.
2. Claude sube la rama y abre el PR (nunca a main directo).
3. **Base de datos de Railway:** ejecuta en Workbench el script de la fase (primero
   conviene un respaldo con mysqldump). Guarda a mano la reversa.
4. Fusiona el PR. Railway publica el servidor y Vercel las pantallas.
5. Revisa en producción las pruebas de regresión más importantes: entrar, ver un
   campeonato, la tabla, el modo en vivo.
6. Si algo sale mal: ejecuta la reversa y revierte el PR desde GitHub (botón
   «Revert»). El script siempre se diseña para que el servidor anterior siga
   funcionando, así que puedes volver atrás sin perder datos.
