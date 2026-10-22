# LigaManager — Seguridad de cuentas

**Fecha:** 10 de octubre de 2026. **Estado (21 oct):** programado en la rama `mejora/seguridad-cuentas-v2` (PR). Funciona sin servicio de correo; los correos se activan al poner la clave en Railway. **Brevo bloqueado:** no llega el SMS de verificación del teléfono (ver abajo).

## Revisado

- **Clave secreta de las sesiones** (`JwtSettings__SecretKey`): Railway ya tiene una propia, distinta a la de `appsettings.json` → producción protegida. ✅
  - Pendiente en el código: quitar la clave de `appsettings.json` y del respaldo en `Program.cs`, y que el servidor no arranque en producción sin una clave propia.

## Decisiones de Roberto

| Tema | Decisión |
|---|---|
| Servicio de correo | **Brevo** (plan gratis, 300 correos/día). Railway bloquea SMTP fuera del plan Pro, por eso se usa su API por internet. |
| Sesión | Casilla **«Recordarme en este dispositivo»**: marcada, 7 días; sin marcar, se cierra al cerrar el navegador (máx. 12 h). Al abrir la app, si la sesión venció, va directo al login. |
| Confirmar correo | **Solo organizadores.** Los vocales entran con su código, como hoy. |

## Diseño

### A. Sesión (sin base de datos)
- `LoginRequest` con `Recordarme` opcional; el token dura 7 días o 12 horas.
- Frontend: con «Recordarme», la sesión va en `localStorage`; sin marcar, en `sessionStorage`. Se guarda `expira` y se revisa al abrir.

### B. Confirmar el correo (organizadores)
- Al registrarse ya no entra directo. Pantalla: «Te enviamos un correo a … Abre el enlace para activar tu cuenta», con el botón «Reenviar correo».
- El enlace vale 24 h y sirve una sola vez. Al abrirlo, la cuenta se activa y entra directo.
- Si intenta entrar sin confirmar: «Confirma tu correo para entrar», con la opción de reenviarlo.
- Los usuarios que ya existen quedan confirmados.

### C. Restablecer contraseña (todos)
- En el login, el enlace «¿Olvidaste tu contraseña?» lleva a una pantalla para escribir el correo.
- La respuesta es siempre igual: «Si el correo está registrado, te llegará un enlace».
- El enlace vale 1 hora y sirve una sola vez. Lleva a una pantalla para escribir la clave nueva dos veces.
- Al cambiar la clave se cierran todas las sesiones de esa cuenta: se guarda `clave_cambiada_en` y se compara con la fecha del token.
- Hay límite de intentos (reutiliza `LimiteIntentos`) en olvidé la clave, reenviar correo y restablecer.

### Base de datos (script + reversa; Roberto lo aplica en Railway)
- `usuario.email_verificado` TINYINT(1) NOT NULL DEFAULT 1. Por defecto 1, para que el servidor anterior siga funcionando; el nuevo pone 0 al registrar un organizador.
- `usuario.clave_cambiada_en` DATETIME NULL.
- Tabla `token_usuario`: `id_token`, `id_usuario` (FK), `tipo` ENUM('VERIFICAR_CORREO','RESTABLECER_CLAVE'), `token_hash` CHAR(64) UNIQUE (SHA-256), `vence_en`, `usado_en`, `creado_en`.

### Correo
- Interfaz `IEnvioCorreo` con dos versiones:
  - **Brevo**: `POST https://api.brevo.com/v3/smtp/email` con el encabezado `api-key`.
  - **De prueba**: escribe el enlace en la consola o en una carpeta, para localhost y para GitHub Actions.
- Variables en Railway: `Correo__BrevoApiKey`, `Correo__Remitente` (Gmail verificado), `Correo__NombreRemitente` (`LigaManager`), `App__UrlFrontend` (dirección de Vercel).

### Orden para publicar
1. Variables en Railway.
2. Script de la base de datos.
3. Fusionar el PR.

## Configuración de Brevo: dónde quedó

- [x] Cuenta creada; plan Gratis activo («Plan actual», 300/día).
- [ ] **A.** Verificar el celular: el SMS no llega (12 oct y otra vez el 21 oct, al intentar crear la clave de API: Brevo la exige). Es un problema conocido de Brevo. Roberto escribe al soporte; si no responden en unos días, probar Mailjet (gratis 200/día por API).
- [x] **B.** (12 oct) Remitente `LigaManager` + Gmail, verificado. Brevo avisó que, con Gmail, algunos correos pueden ir a Spam: la pantalla dirá «revisa Spam o Promociones»; más adelante, dominio propio. Antes: «Liga Manager ▾» → Remitentes, dominios e IP dedicadas → Añadir remitente (`LigaManager` + Gmail) → confirmar en Gmail.
- [ ] **C.** ← *bloqueado por A (21 oct)*. Clave de API (en Configuración → SMTP y API): «Liga Manager ▾» o ⚙ → SMTP y API → Claves API → Generar (`ligamanager-railway`). Guardarla aparte; no pegarla en el chat.
- [ ] **D.** «Liga Manager ▾» o ⚙ → Seguridad → IP autorizadas → desactivar el bloqueo.
- [x] Dirección de la app en Vercel: `https://liga-manager-sigma.vercel.app` (para `App__UrlFrontend`).

## Cómo quedó programado (21 oct)

- **Sin servicio de correo** (hoy): «Recordarme» y el cierre de sesiones funcionan; el registro entra directo como antes; no se muestra «¿Olvidaste tu contraseña?».
- **Con servicio de correo** (al poner `Correo__BrevoApiKey` en Railway): los organizadores nuevos confirman el correo y aparece «¿Olvidaste tu contraseña?».
- Envío de prueba (`Correo__Modo=Prueba`): no manda nada; escribe el correo en el registro del servidor (y en `Correo__CarpetaPrueba`). Lo usa GitHub Actions.
- Enlaces: confirmar 24 h, restablecer 1 h, un solo uso, solo el último vale; máximo 1 por minuto y 5 por día por cuenta.
- Las invitaciones de vocal y dirigente recuerdan la sesión 7 días.

### Variables en Railway (cuando haya clave)

| Variable | Valor |
|---|---|
| `Correo__BrevoApiKey` | la clave `xkeysib-…` (Roberto la pega; no va al chat) |
| `Correo__Remitente` | el Gmail verificado en Brevo |
| `Correo__NombreRemitente` | `LigaManager` |
| `App__UrlFrontend` | `https://liga-manager-sigma.vercel.app` |
