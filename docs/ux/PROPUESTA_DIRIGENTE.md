# Propuesta: rol Dirigente (solo lectura) y protección de documentos

Estado: **pendiente de aprobación**. No se ha programado nada.
Fecha: 19 de octubre de 2026.

## Decisiones ya tomadas

- El dirigente representa a **un equipo** de **un campeonato**. Se le asocia al invitarlo.
- Ve el **documento completo solo de los jugadores de su equipo**. De los demás equipos ve nombre, dorsal, posición, edad y foto.
- Las **sanciones manuales** las ve, pero no las agrega ni las borra.
- Se aprovecha el mismo trabajo para proteger los documentos en el **modo en vivo del vocal** y en las **descargas PDF/Excel**.

## 1. Cómo entra el dirigente

- En el campeonato, una pestaña nueva **«Dirigentes»**, junto a «Vocales».
- **«Invitar dirigente»**: eliges el equipo y la app genera un enlace para mandar por WhatsApp o copiar.
  - El enlace sirve **una sola vez** y vence a los **7 días** si nadie lo usa.
  - Puede haber más de un dirigente por equipo (presidente, delegado, etc.).
- El dirigente abre el enlace y **crea su cuenta** (nombre, correo, contraseña). Si ya tiene cuenta de dirigente de otro campeonato, solo inicia sesión y el campeonato se suma a su lista.
- La pestaña muestra quién tiene acceso, de qué equipo y desde cuándo, con **«Quitar acceso»** y **«Anular invitación»**.
- El acceso dura mientras dure el campeonato. Al terminar, lo sigue viendo en modo consulta (historial).
- La invitación tiene el mismo **límite de intentos** que la del vocal.

## 2. Qué ve el dirigente

Una pantalla propia, sin el menú de administración:

- **Inicio**: su campeonato, su equipo destacado, el próximo partido de su equipo y los últimos resultados.
- **Jornadas**: partidos con fecha, hora, estadio y resultado, en solo lectura (sin planilla ni modo en vivo).
- **Reportes**: Posiciones, Nómina, Goleadores, Tarjetas y Suspensiones, con descarga en PDF y Excel.
  - La Nómina abre directo en **su equipo**.
  - Puede ver la nómina de los otros equipos **sin documento**.
- Si tiene varios campeonatos, un selector arriba.

Qué **no** puede hacer: crear, editar o borrar nada; agregar sanciones manuales; ver campeonatos donde no está habilitado; ver Equipos, Jugadores, Mantenimiento ni el Dashboard del organizador.

## 3. Protección de documentos (la hace el servidor)

Las descargas PDF/Excel se arman en el navegador con los datos que manda el servidor. Por eso la protección va **en el servidor**: lo que no llega, no puede aparecer en pantalla ni en un archivo.

| Quién | Documento de su equipo | Documento de otros equipos |
|---|---|---|
| Organizador / Admin | Completo | Completo |
| Dirigente | Completo | **No se envía** (aparece «—») |
| Vocal (modo en vivo) | **No se envía** | **No se envía** |

- **Vocal**: hoy recibe la cédula completa de los dos equipos, aunque la pantalla no la usa. Deja de recibirla. Para identificar al jugador tiene la foto, el nombre, el dorsal y la edad.
- **Fecha de nacimiento**: el dirigente y el vocal solo reciben la **edad**, no la fecha.

## 4. Permisos en el servidor

- Rol nuevo **Dirigente**. Igual que el vocal, todo lo que existe hoy lo rechaza por defecto (error 403).
- Rutas nuevas de solo lectura bajo `/api/dirigente/...`, que comprueban que esté habilitado en ese campeonato.
- Se prueba con dos dirigentes de equipos distintos y uno de otro campeonato: cada intento de ver o tocar algo ajeno debe ser rechazado.

## 5. Base de datos (script + reversa)

- `usuario.rol`: se agrega el valor `DIRIGENTE`.
- Tabla nueva `campeonato_dirigente`: campeonato, usuario, equipo, activo, quién lo invitó y fecha.
- Tabla nueva `invitacion_dirigente`: campeonato, equipo, código guardado cifrado (SHA-256), vencimiento, quién la usó y si fue anulada.
- No se modifica ni se borra nada de lo existente: los vocales, organizadores y datos actuales no cambian.

## 6. Cómo se va a probar

- En GitHub, con el servidor real y MySQL: invitar, aceptar, quitar acceso, enlace vencido o ya usado, límite de intentos, y que el dirigente reciba documentos solo de su equipo.
- Que el vocal ya no reciba documentos y que el modo en vivo siga funcionando.
- Repetir todas las pruebas anteriores (fases 7 y 8, permisos, seguridad).
- Pantallas a 390 y 1440 px, y las descargas PDF/Excel como dirigente.

## 7. Orden para publicar

1. Ejecutar el script en Railway (desde Workbench).
2. Fusionar el PR.

## Para después (mejora de privacidad aparte)

- Casilla de autorización del jugador o de su representante (menores de edad) y aviso de privacidad.
- «Anonimizar jugador»: borrar documento, fecha de nacimiento y foto, conservando sus estadísticas.
- Enlaces de fotos que vencen a las pocas horas.
