# Design

## Context

Ver `proposal.md` para el motivo y `specs/account-auth/spec.md` para el comportamiento. Hoy `register` en `auth-context.tsx` crea la cuenta y llama a `sendEmailVerification` con continuación en `/verificar`. `requestMagicLink` llama a `sendSignInLinkToEmail` con continuación en `/auth/complete`. El SDK de cliente no devuelve el enlace. El emulador de Auth lo guarda y las pruebas ya lo leen en `e2e/helpers.ts` con `GET http://127.0.0.1:9099/emulator/v1/projects/{projectId}/oobCodes` (`email`, `oobCode`, `requestType`).

En `page.tsx`, un `user` distinto de null sustituye el formulario por la tarjeta de sesión, y un registro exitoso hace `router.push("/verificar")`. Solo `/auth/complete` aplica el código (`verifyEmailCode` o `signInWithEmailLink`). `/verificar` no lo aplica. Los emuladores se conectan si `NEXT_PUBLIC_USE_EMULATORS=1` (`firebase.ts`, `admin-app.ts`).

## Goals / Non-Goals

**Goals:**

- Leer del emulador el `oobCode` recién emitido y pintar un enlace que `/auth/complete` ya sabe cerrar.
- Mantener el formulario de registro montado en local aunque Auth ya tenga sesión.
- Negar la lectura y el render cuando la app no está en el emulador o el host no es de loopback.

**Non-Goals:**

- Cambiar la continuación que pide el SDK ni el texto de los botones.
- Mostrar el listado crudo de códigos del emulador.

## Decisions

### Local es emulador más host de loopback

`NEXT_PUBLIC_USE_EMULATORS === "1"` y `location.hostname` es `localhost` o `127.0.0.1`. Cubre `localhost:3000` y Playwright en `127.0.0.1:3100`.

Alternativa: solo el puerto 3000. Deja fuera a Playwright y a `127.0.0.1`. Alternativa: solo el flag. Un build con el flag encendido en un host público mostraría enlaces.

### El enlace se lee en el servidor

Una server action, activa solo con `NEXT_PUBLIC_USE_EMULATORS=1`, consulta el endpoint de `oobCodes` del emulador (host `FIREBASE_AUTH_EMULATOR_HOST` o `127.0.0.1:9099`, proyecto el de `admin-app.ts`). Filtra por el correo y por `VERIFY_EMAIL` o `EMAIL_SIGNIN`, toma el último y devuelve solo `{ href }`. Si el flag está apagado, devuelve null sin llamar al emulador. Espera unos segundos en intervalos cortos, como `waitForOob`, porque el código puede aparecer justo después del SDK.

Alternativa: `fetch` desde el navegador a `:9099`. Depende de CORS y metería la lista de códigos en el cliente. Alternativa: `generateEmailVerificationLink` / `generateSignInWithEmailLink` del Admin SDK. Crea un segundo código, distinto del que ya emitió el SDK.

### El href apunta a `/auth/complete`

Con el `oobCode`:

- verificación: `{origin}/auth/complete?mode=verifyEmail&oobCode={code}`
- magic link: `{origin}/auth/complete?mode=signIn&oobCode={code}&apiKey={apiKey}`

`signInWithEmailLink` rechaza el enlace si falta `apiKey` (`auth/argument-error`). La clave es `NEXT_PUBLIC_FIREBASE_API_KEY`, la misma del cliente. La verificación no la necesita: `/auth/complete` aplica el `oobCode` directo.

`completeEmailLink` ya trata `mode=signIn` como enlace, y el correo queda en `localStorage` antes de enviarlo. El enlace del log del emulador sigue a `/verificar` en el registro, y esa pantalla no aplica el código, así que abrirlo no cumple el spec.

### El formulario de registro no se desmonta

`createUserWithEmailAndPassword` pone `user` antes de que `register()` termine, y la página cambia a la tarjeta de sesión. En local, `onRegister` marca un estado de retención antes del `await` y no navega. La condición de render muestra las pestañas mientras ese estado esté activo. El enlace va en un `<a>` debajo de «Crear cuenta» (`data-testid="dev-verify-link"`). Si la lectura falla, un texto debajo del botón (`data-testid="dev-auth-link-error"`) y ningún href.

El magic link no inicia sesión, así que el formulario sigue. El `<a>` va debajo de «Enviar magic link» (`data-testid="dev-magic-link"`), con el mismo aviso si falta el código. El alert «Revise su correo…» se queda; no es el lugar del enlace.

Fuera de local no se llama la action, no hay `<a>` y el registro sigue con `router.push("/verificar")`.

## Risks / Trade-offs

- [El código tarda en aparecer en el emulador] → La action reintenta unos segundos y, si no hay coincidencia, la UI avisa sin inventar un href.
- [Hay varios códigos del mismo correo] → Se usa el último del `requestType` pedido. La respuesta no incluye el resto.
- [El flag queda en un host que no es loopback] → El cliente no pinta el enlace. La action tampoco corre sin el flag.
- [Las pruebas 5.1 y 5.2 esperan `unverified-message` justo después de «Crear cuenta»] → En local el formulario se queda. 5.1 afirma el enlace y que `/vacantes` sigue redirigiendo a la pantalla de correo sin verificar. 5.2 abre el href mostrado.
- [El magic link se abre en otro navegador] → Igual que hoy: sin el correo en `localStorage`, `/auth/complete` lo pide. El caso de la misma pestaña no cambia.

## Migration Plan

No hay datos que migrar. El despliegue es el de la app. En App Hosting el flag de emuladores no está, así que el comportamiento publicado no cambia. Revertir el cambio quita los enlaces de la pantalla local.
