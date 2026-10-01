# Proposal

## Resumen

En local, con el emulador de Auth, el enlace de verificación del registro y el magic link de entrada solo aparecen en los logs del emulador. Hay que buscarlos, copiarlos y pegarlos. Este cambio los muestra en la pantalla, debajo del botón que los pidió.

## Why

Probar el registro y el magic link en `localhost:3000` obliga a salir de la app, abrir los logs del emulador y copiar el enlace. El enlace ya existe; falta enseñarlo donde se acaba de pedir.

## Objetivos

- Tras «Crear cuenta» en local, mostrar el enlace de verificación justo debajo de ese botón.
- Tras «Enviar magic link» en local, mostrar el magic link justo debajo de ese botón.
- Dejar el flujo de producción igual: sin enlace en pantalla y con la misma redirección tras registrarse.

## Alcance

Solo la pantalla de acceso de `gomep-vacantes` cuando la app usa el emulador de Auth (`NEXT_PUBLIC_USE_EMULATORS=1`) y el host es de loopback (`localhost` o `127.0.0.1`). Eso cubre `localhost:3000` y el servidor de Playwright en `127.0.0.1:3100`.

En ese modo, un registro exitoso no sale hacia `/verificar` ni cambia el formulario por la tarjeta de sesión: el formulario sigue visible para poder mostrar el enlace debajo de «Crear cuenta». Abrir ese enlace sigue verificando la cuenta. El magic link se muestra debajo de «Enviar magic link» y abrirlo sigue iniciando sesión. La cuenta no verificada sigue sin ver vacantes, suscripciones ni admin.

## Fuera de alcance

- Mostrar enlaces en App Hosting o contra Firebase de producción.
- Cambiar contraseña, Google, campos del registro o el texto de los botones.
- Mostrar el enlace en `/verificar`, en la tarjeta de sesión o en otra pantalla.
- Enviar correo de verdad o cambiar cómo el emulador genera el enlace.

## What Changes

- En local, el enlace de verificación del registro aparece como enlace clicable debajo de «Crear cuenta».
- En local, el magic link aparece como enlace clicable debajo de «Enviar magic link».
- En local, el registro exitoso permanece en el formulario de registro para que ese enlace siga a la vista.
- Fuera de local, no se muestra ningún enlace y «Crear cuenta» sigue yendo a `/verificar`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `account-auth`: en local, el enlace de verificación y el magic link se muestran debajo del botón que los generó. El registro local no abandona ese formulario al crear la cuenta.

## Impact

- `apps/gomep-vacantes/src/app/page.tsx` y el flujo de registro y magic link en `src/lib/auth-context.tsx`.
- Lectura del enlace recién generado en el emulador de Auth, solo con emuladores activos.
- Pruebas Playwright de registro (`5.1`, `5.2`) y una prueba nueva del magic link visible.
