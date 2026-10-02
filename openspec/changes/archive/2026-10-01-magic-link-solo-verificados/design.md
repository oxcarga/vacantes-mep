# Design

## Context

Ver `proposal.md` para el motivo y `specs/account-auth/spec.md` para el comportamiento. Hoy `requestMagicLink` en `auth-context.tsx` llama a `sendSignInLinkToEmail` para cualquier correo no vacío. Al abrir el enlace, Firebase crea la cuenta si no existía. El registro sí exige correo, contraseña, teléfono y nombre, y manda la verificación con `sendEmailVerification` mientras ya hay sesión, con continuación en `/verificar`.

`/verificar` redirige a `/` si no hay sesión. `/auth/complete` aplica el código y solo sigue a vacantes si hay sesión y el correo quedó verificado; si no, se queda en «Procesando el enlace…». En local, `readLocalAuthLink` lee el `oobCode` del emulador y arma un href a `/auth/complete`. Fuera de local esa action devuelve null y la pantalla no muestra la URL. El Admin SDK ya está en `admin-app.ts` y, con emuladores, apunta a `127.0.0.1:9099`. Resend vive en el scraper (`RESEND_API_KEY`, `MAIL_FROM`); la app web no envía correo.

## Goals / Non-Goals

**Goals:**

- Decidir en el servidor, antes de generar nada, si el correo no tiene cuenta, tiene cuenta sin verificar o tiene cuenta verificada.
- Mandar el enlace de verificación desde el servidor, sin devolver la URL al navegador fuera de local.
- Dejar el magic link de una cuenta verificada en el envío que ya usa Firebase.
- Un solo texto de llegada cuando la verificación se abre sin sesión.

**Non-Goals:**

- Cerrar el hueco de quien llama `sendSignInLinkToEmail` directo a la API de Auth.
- Encender la protección contra enumeración, borrar cuentas locales ya creadas o limitar reenvíos.
- Cambiar el correo de verificación que sale al pulsar «Crear cuenta».

## Decisions

### 1. El servidor clasifica; el cliente solo envía el magic link si la cuenta ya está verificada

Una server action recibe el correo (recortado y en minúsculas) y usa `getUserByEmail`.

- No existe: `{ kind: "missing" }`. No genera enlace.
- Existe y `emailVerified` es false: genera el enlace de verificación, lo envía, y responde `{ kind: "verify" }`.
- Existe y `emailVerified` es true: `{ kind: "magic" }`. No genera enlace. El cliente entonces llama a `sendSignInLinkToEmail`, como hoy, para que Firebase siga mandando ese correo y el emulador siga guardando el `oobCode` de `EMAIL_SIGNIN`.

Alternativa: generar también el magic link en el servidor y mandarlo con Resend. Duplica el correo que Firebase ya envía para las cuentas verificadas. Alternativa: consultar `fetchSignInMethodsForEmail` en el cliente. Con la protección contra enumeración esa lista vuelve vacía y una cuenta real se trataría como ausente.

### 2. La verificación de Entrar la envía la app con Resend

`sendEmailVerification` exige un usuario en sesión. En Entrar no la hay. El Admin SDK `generateEmailVerificationLink` devuelve la URL y no la envía. La action la manda con un envío pequeño en `gomep-vacantes`, las mismas variables `RESEND_API_KEY` y `MAIL_FROM` del scraper. El scraper no se importa: es otro paquete. Si faltan las variables o Resend responde mal, la action devuelve error. La pantalla muestra ese error y no el aviso de que el correo salió.

La continuación de este enlace es `/?verificado=1`, no `/verificar`. `/verificar` manda al inicio cuando no hay sesión y no explica qué pasó.

En local no se llama a Resend. El emulador no entrega correo. La action genera el enlace, el cliente lee el `oobCode` con `readLocalAuthLink` (`VERIFY_EMAIL`) y muestra el href a `/auth/complete` bajo el botón, igual que el magic link. La URL de producción no se devuelve al navegador.

Alternativa: una Cloud Function que genere y envíe. Hace el mismo trabajo y añade un despliegue que el proyecto no tiene.

### 3. Tres avisos en la pestaña Entrar

- `missing`: «No hay una cuenta con ese correo. Regístrese para crear una.»
- `verify`: «Primero valide su cuenta. Le enviamos el enlace de verificación.»
- `magic`: se conserva «Revise su correo para el enlace de acceso.»

`missing` y `verify` van en el aviso de información. El error de envío va en `auth-error`. Un correo vacío se rechaza en el cliente, antes de la action, con «Ingrese su correo.»

### 4. Verificar sin sesión llega a `/?verificado=1`

Ese texto, en el inicio y sin sustituir el formulario: «Su correo quedó verificado. Vuelva a Entrar y pida el magic link.»

En local, `/auth/complete` aplica el código. Si después no hay sesión, redirige a `/?verificado=1`. Si hay sesión y el correo quedó verificado, sigue a `/vacantes`, que es el caso de «Crear cuenta». Fuera de local, la página de Firebase procesa el enlace y continúa a `/?verificado=1`.

## Risks / Trade-offs

- [Alguien llama `sendSignInLinkToEmail` fuera de la pantalla] → La action no lo impide. Quedó fuera de alcance; haría falta una blocking function.
- [Los tres avisos revelan si el correo existe] → Es el texto acordado. El registro es abierto.
- [Resend caído o sin clave en el servicio web] → La persona ve el error y puede reintentar. El registro no depende de Resend.
- [El código del Admin no aparece en la lista del emulador] → La action, solo en local, arma el href de `/auth/complete` con el `oobCode` del enlace que acaba de generar, y no devuelve la URL de Firebase.
- [La página intermedia de Firebase sale en inglés] → El mensaje en español está en `/?verificado=1`, después de esa página. No se personaliza la plantilla de Firebase en este cambio.

## Migration Plan

1. Añadir `RESEND_API_KEY` y `MAIL_FROM` al servicio de `gomep-vacantes` antes de desplegar. En local no hacen falta: el enlace se muestra en la pantalla.
2. Desplegar la app. Las cuentas verificadas siguen entrando con magic link. Las que no lo están reciben la verificación.
3. Rollback: redesplegar la app anterior. Vuelve el magic link para cualquier correo. Las cuentas y los correos ya enviados se quedan.
