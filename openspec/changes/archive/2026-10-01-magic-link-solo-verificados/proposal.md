# Proposal

## Resumen

«Enviar magic link» acepta cualquier correo. Firebase crea la cuenta al abrir el enlace, sin registro ni verificación. El enlace solo debe salir para una cuenta ya verificada. Si la cuenta existe y el correo sigue sin verificar, se envía el enlace de verificación y la pantalla lo dice. Si no hay cuenta, no se genera enlace.

## Why

El botón llama a `sendSignInLinkToEmail` sin mirar si el correo ya tiene cuenta. Al abrir el enlace, Firebase crea el usuario, lo marca verificado y lo deja entrar como docente, sin nombre, teléfono ni contraseña.

## Objetivos

- Enviar el magic link solo a una cuenta con el correo verificado.
- Si la cuenta existe y el correo no está verificado, enviar el enlace de verificación y avisar que primero hay que validar.
- Si no hay cuenta, no generar enlace y avisar que hay que registrarse.
- Tras abrir la verificación sin sesión, indicar que el correo quedó verificado y que puede volver a Entrar a pedir el magic link.

## Alcance

La pestaña Entrar de `gomep-vacantes`, en local y fuera de local. El servidor consulta la cuenta y envía el correo. El navegador no recibe la URL, salvo en local, donde el enlace se muestra bajo el botón. «Crear cuenta» sigue enviando su verificación como hoy.

## Fuera de alcance

- Una blocking function que rechace altas por enlace de correo contra la API de Auth.
- Activar la protección contra enumeración de correos.
- Borrar cuentas que un magic link ya haya creado en local.
- Limitar cuántas veces se reenvía la verificación.
- Cambiar el registro, la contraseña, el perfil o el texto del botón.

## What Changes

- Un correo sin cuenta no recibe enlace. La pantalla indica que hay que registrarse.
- Una cuenta sin verificar no recibe magic link. Recibe la verificación y el aviso de validar primero.
- Una cuenta verificada sigue recibiendo el magic link e iniciando sesión al abrirlo.
- En local, bajo el botón aparece el enlace que corresponda, o el aviso de que no hay cuenta.
- Fuera de local la URL no se muestra. Si el envío falla, se muestra el error.
- Abrir la verificación sin sesión confirma que el correo quedó verificado y devuelve a Entrar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `account-auth`: el magic link solo se genera para una cuenta verificada. Una cuenta sin verificar recibe el enlace de verificación y un aviso. Un correo sin cuenta no recibe enlace. Abrir la verificación sin sesión informa que ya puede pedir el magic link.

## Impact

- `auth-context.tsx`, la pestaña Entrar en `page.tsx` y `/auth/complete`.
- Una server action con el Admin SDK para distinguir cuenta ausente, sin verificar y verificada.
- Envío de la verificación con Resend desde la app (`RESEND_API_KEY`, `MAIL_FROM`). El registro sigue con la plantilla de Firebase.
- Pruebas Playwright de los tres resultados del botón.
