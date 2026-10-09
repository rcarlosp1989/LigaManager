# LigaManager — Propuesta de diseño: fases 7 y 8

**Fecha:** 9 de octubre de 2026. **Estado:** pendiente de aprobación de Roberto. No se ha escrito código ni se ha tocado la base de datos.

Base revisada: `main` en `8e0bc23` (fases 1 a 6 fusionadas).

---

## 1. Lo que hay hoy (verificado en el código)

| Pregunta del plan | Respuesta |
|---|---|
| ¿Cómo se guardan los roles? | Columna `usuario.rol`, un `ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR')`. En C# es `RolUsuario` y viaja en el token como `ClaimTypes.Role` («Organizador», «Admin»…). El registro abierto crea siempre un Organizador. |
| ¿Hay permisos por rol en el servidor? | No. Todos los controladores usan solo `[Authorize]`. Cada servicio filtra por `IdUsuarioCreador` (lo tuyo) y `Admin` ve todo. |
| ¿Qué implica agregar Vocal? | Un valor más en el `ENUM`, y que **ningún endpoint actual lo acepte**: hoy cualquier cuenta con sesión puede llamar a todos. |
| ¿«Cambios» es un tipo de evento? | No. Los cambios están en su propia tabla, `cambio_partido`. `eventopartido.tipo_evento` es `ENUM('GOL','TARJETA_AMARILLA','TARJETA_ROJA','GOL_EN_CONTRA') NOT NULL` y `minuto` es `NOT NULL`, como decían las notas. |
| ¿Triggers? | Los scripts del repositorio no crean ninguno. Antes de aplicar el script conviene correr `SHOW TRIGGERS;` en Railway para confirmar que la base tampoco tiene. |
| Mecanismo de cambios de esquema | Scripts SQL fechados en `backend/database/`, aplicados a mano. No hay migraciones de EF Core. |

### Hallazgo fuera de fase (importante)

**El Dashboard no filtra por organizador.** `DashboardService` cuenta todos los campeonatos, equipos y jugadores de la base y lista los próximos partidos y últimos resultados de **todos** los organizadores. Cualquier cuenta, incluida una recién registrada, ve nombres de equipos y partidos ajenos. Propuesta: corregirlo en la Fase 7, porque la regla «el vocal no puede ver otros campeonatos» depende de que el servidor no muestre datos ajenos.

---

## 2. Fase 7 — Rol Vocal

### 2.1 Base de datos (`backend/database/20261009_rol_vocal.sql` y su reversa)

```sql
-- 1) Rol nuevo. Los usuarios existentes no cambian.
ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR','VOCAL') NOT NULL DEFAULT 'ADMIN';

-- 2) Qué vocal está habilitado en qué campeonato.
CREATE TABLE IF NOT EXISTS campeonato_vocal (
    id_campeonato INT NOT NULL,
    id_usuario    INT NOT NULL,
    activo        TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_campeonato, id_usuario),
    CONSTRAINT fk_cv_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_cv_usuario    FOREIGN KEY (id_usuario)    REFERENCES usuario (id_usuario)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Invitaciones. Se guarda solo el hash del código, nunca el código.
CREATE TABLE IF NOT EXISTS invitacion_vocal (
    id_invitacion INT NOT NULL AUTO_INCREMENT,
    id_campeonato INT NOT NULL,
    token_hash    CHAR(64) NOT NULL,
    creada_por    INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vence_en      DATETIME NOT NULL,
    usada_por     INT NULL,
    usada_en      DATETIME NULL,
    revocada      TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_invitacion),
    UNIQUE KEY uq_invitacion_token (token_hash),
    CONSTRAINT fk_iv_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_iv_creada_por FOREIGN KEY (creada_por)    REFERENCES usuario (id_usuario),
    CONSTRAINT fk_iv_usada_por  FOREIGN KEY (usada_por)     REFERENCES usuario (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Reversa: borrar las dos tablas y volver el `ENUM` a su lista anterior (solo si no quedan usuarios `VOCAL`; el script lo comprueba antes).

Compatible con la versión publicada: dos tablas nuevas y un valor más en el `ENUM`. El servidor actual no las usa y sigue funcionando.

### 2.2 Cómo viaja la invitación

- **Enlace con código**, para mandarlo por WhatsApp: `https://…/invitacion/Xk3…` (32 caracteres aleatorios).
- **Vence a los 7 días** y **sirve una sola vez**. El organizador puede revocarla o generar otra.
- Al abrir el enlace, el vocal ve «Te invitaron a registrar partidos del campeonato *Senior Recuspro 2026* de *Ángel Reyes*» y:
  - si no tiene cuenta, la crea ahí mismo (nombre, correo y contraseña). La cuenta nace con rol **Vocal**;
  - si ya es vocal de otro campeonato, inicia sesión y el campeonato se suma a su lista.
- Una cuenta de **Organizador no puede aceptar** una invitación de vocal; la pantalla le pide usar otro correo. Así un organizador nunca queda con permisos mezclados.
- El registro abierto sigue creando Organizadores, como hoy.

### 2.3 Permisos en el servidor

1. **Política «Gestión»** en todos los controladores actuales, salvo `Auth`: rechaza (403) cualquier token con rol Vocal. Con eso todo lo de la columna «no puede» queda bloqueado de una vez: editar o eliminar partidos, cambiar equipos o fechas, tocar jugadores, ver otros campeonatos, reportes, mantenimiento y Dashboard.
2. **Controlador nuevo `/api/vocal`**, solo para rol Vocal. Cada llamada comprueba que el partido pertenece a un campeonato donde ese usuario está activo en `campeonato_vocal`:

| Endpoint | Para qué |
|---|---|
| `GET /api/vocal/partidos?dia=hoy` | Partidos de hoy de sus campeonatos, con la hora de Ecuador (el servidor de Railway está en UTC). |
| `GET /api/vocal/partidos/{id}` | Detalle del partido más los dos planteles con foto, en una sola llamada. |
| `POST /api/vocal/partidos/{id}/alineacion`, `DELETE /api/vocal/alineacion/{id}` | Pasar lista. |
| `POST`/`DELETE` de eventos y cambios | Goles, tarjetas y cambios. |
| `PUT /api/vocal/partidos/{id}/cerrar` | Cerrar el partido (observaciones y estado en la Fase 8). |

   Por dentro reutilizan la lógica que ya existe en `JornadaService`, así que las reglas (cancha y banca, desierto, reglamento, fechas del campeonato) son las mismas que para el organizador.
3. **Para el organizador**, en `/api/campeonatos/{id}/vocales`: crear invitación, ver vocales e invitaciones pendientes, quitar un vocal y revocar una invitación. Solo sobre sus campeonatos.
4. **Dashboard** filtrado por organizador (hallazgo de arriba).

### 2.4 Pantallas

- **Detalle del campeonato → pestaña «Vocales»**: botón «Invitar vocal» que genera el enlace con «Copiar» y «Compartir por WhatsApp»; lista de vocales con «Quitar» (con confirmación) e invitaciones pendientes con su vencimiento y «Revocar».
- **`/invitacion/{código}`**: crear cuenta o iniciar sesión, según el caso.
- **Inicio del vocal (`/vocal`)**: pantalla completa en alto contraste, sin el menú de administración. Lista de partidos de hoy con hora, cancha y un botón «Registrar» que abre el modo en vivo. Si no hay partidos hoy, lo dice. Las rutas de administración redirigen aquí si el usuario es Vocal.
- **Modo en vivo**: el mismo de la Fase 5. Con rol Vocal usa los endpoints `/api/vocal` y «Salir» vuelve a `/vocal`.

**Listo cuando** (del plan): un vocal invitado inicia sesión, ve solo los partidos de hoy de su campeonato, registra uno en el modo en vivo, y cada acción de la columna «no puede» devuelve 403 del servidor. Se probará con pruebas automáticas de servidor (en GitHub Actions con MySQL) además de las de pantalla.

---

## 3. Fase 8 — Cierre y registro

### 3.1 Base de datos (`backend/database/20261009_registro_en_vivo.sql` y su reversa)

```sql
ALTER TABLE partido
    ADD COLUMN estado_registro   ENUM('SIN_INICIAR','EN_VIVO','CERRADO') NOT NULL DEFAULT 'SIN_INICIAR',
    ADD COLUMN iniciado_en       DATETIME NULL,
    ADD COLUMN cerrado_en        DATETIME NULL,
    ADD COLUMN id_usuario_cierre INT NULL,
    ADD CONSTRAINT fk_partido_usuario_cierre FOREIGN KEY (id_usuario_cierre) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE eventopartido
    ADD COLUMN id_usuario_registro INT NULL,
    ADD COLUMN id_cliente          CHAR(36) NULL,
    ADD UNIQUE KEY uq_evento_cliente (id_partido, id_cliente),
    ADD CONSTRAINT fk_evento_usuario FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE cambio_partido
    ADD COLUMN id_usuario_registro INT NULL,
    ADD COLUMN id_cliente          CHAR(36) NULL,
    ADD UNIQUE KEY uq_cambio_cliente (id_partido, id_cliente),
    ADD CONSTRAINT fk_cambio_usuario FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE alineacion_jugador
    ADD COLUMN id_usuario_registro INT NULL,
    ADD CONSTRAINT fk_alineacion_usuario FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;
```

Todo con valor por defecto o nulo: los partidos y eventos existentes quedan como «sin iniciar» y «sin autor», y el servidor publicado sigue funcionando. MySQL permite varios `NULL` en un índice único, así que los eventos viejos (sin `id_cliente`) no chocan.

### 3.2 Comportamiento

- **Estado del partido.** Pasa a «en vivo» con el primer registro desde el modo en vivo (o al tocar «Iniciar partido»), y a «cerrado» cuando el vocal cierra. Al cerrar también se marca como jugado, con sus observaciones.
- **Después del cierre**, los endpoints `/api/vocal` del partido responden 409 «El partido está cerrado». El organizador sigue corrigiendo desde la planilla, sin bloqueo, y tiene un botón **«Reabrir para el vocal»** por si hay que devolverlo.
- **Quién registró.** Cada evento, cambio y convocatoria guarda el usuario que lo hizo. En la planilla del organizador, cada evento muestra «registrado por Juan Pérez». La tarjeta del partido muestra el estado («Sin iniciar», «En vivo», «Cerrado por Juan Pérez, 18:42»).
- **Sin duplicados en el servidor.** La cola de la Fase 5 manda un `idCliente` por registro. Si llega dos veces, el servidor no lo vuelve a crear y devuelve el que ya existe. La revisión que hace hoy la cola se mantiene como segunda protección.
- **Observaciones.** El vocal las escribe en la pantalla de cierre. Desierto y perdido por reglamento siguen siendo del organizador.

### 3.3 ¿El reloj se guarda en el servidor?

**Propuesta: no.** El reloj sigue en el dispositivo, como en la Fase 5. Razones: el minuto se puede corregir en cada evento; guardar cada pausa exige señal constante, que es justo lo que falta en la cancha; y cambiar de celular a mitad de partido es raro. El servidor sí guarda `iniciado_en`, y si el vocal abre el partido en otro dispositivo, la pantalla le ofrece arrancar el reloj desde esa hora (sin contar pausas) o empezar de cero.

**Listo cuando** (del plan): un partido cerrado por el vocal no acepta más eventos suyos, el organizador ve el estado y el autor de cada evento, y puede corregirlo.

---

## 4. Entrega y despliegue

- **Una rama y un pull request por fase**: `ux/fase-7-vocal` y luego `ux/fase-8-registro`. La 8 empieza cuando la 7 esté fusionada.
- Cada fase entrega su script SQL y su script de reversa en `backend/database/`. **Nada se ejecuta contra producción**: tú aplicas el script en Railway.
- **Orden de despliegue en cada fase:**
  1. Aplicar el script en la base de Railway.
  2. Fusionar el pull request (Railway publica el servidor y Vercel el frontend).
  Si se fusiona sin aplicar el script, el servidor nuevo falla al leer columnas o tablas que no existen. Por eso el orden importa.
- Verificación: compilación y pruebas del servidor en GitHub Actions contra un MySQL temporal con los scripts aplicados, y pruebas de pantalla como en las fases anteriores.

## 5. Decisiones para Roberto

1. **Invitación por enlace que vence en 7 días y sirve una vez.** ¿De acuerdo, o prefieres otro plazo o un código corto para dictar?
2. **Corregir el Dashboard** para que cada organizador vea solo lo suyo, dentro de la Fase 7. ¿De acuerdo?
3. **Reloj solo en el dispositivo**, con la opción de retomarlo desde la hora de inicio guardada. ¿De acuerdo?
4. **El vocal puede deshacer o borrar** goles, tarjetas y cambios del partido mientras no esté cerrado (los suyos y los de otros vocales del mismo partido). ¿De acuerdo, o solo los suyos?
