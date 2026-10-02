# Proposal

## Resumen

Al completar un magic link, `completeEmailLink` muestra `window.prompt("Confirme su correo")` cuando `localStorage` no tiene el correo. En el flujo real ese cuadro sale después de que la sesión ya existe, y cancelarlo o escribir otro correo no cambia quién entra. Hay que quitarlo.

## Why

El prompt no confirma nada. La primera pasada inicia sesión con el correo guardado al pedir el enlace y luego borra esa clave. El efecto de `/auth/complete` vuelve a correr, el almacenamiento ya está vacío y aparece el cuadro. La sesión sigue y la pantalla redirige a vacantes.

## Objetivos

- Completar el magic link sin ningún diálogo del navegador.
- Seguir iniciando sesión en la cuenta del enlace cuando el correo está en `localStorage`, en el parámetro `email` de la URL o en la sesión actual.
- Si no hay correo por ninguna de esas vías, mostrar el error de enlace ya existente, sin pedir que se escriba.

## Alcance

`completeEmailLink` en `apps/gomep-vacantes` y la pantalla `/auth/complete`. El pedido del enlace sigue guardando el correo en `localStorage`.

## Fuera de alcance

- Un formulario que reemplace el prompt para quien abre el enlace en otro dispositivo.
- Cambiar quién puede pedir un magic link (eso vive en el cambio `magic-link-solo-verificados`).
- Cambiar la verificación de correo, la contraseña o el registro.

## What Changes

- Se elimina `window.prompt("Confirme su correo")`.
- El correo del enlace se toma de `localStorage`, del parámetro `email` o de la sesión actual, en ese orden.
- Sin ninguna de esas fuentes, el inicio falla con el aviso de enlace inválido y no hay diálogo.
- Una segunda ejecución después de iniciar sesión no vuelve a pedir el correo ni muestra un error falso por el código ya usado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `account-auth`: completar el magic link no pide el correo en un diálogo del navegador.

## Impact

`apps/gomep-vacantes/src/lib/auth-context.tsx` y `src/app/auth/complete/page.tsx`. La prueba Playwright `3.1` de `e2e/app.spec.ts` debe comprobar que no aparece un diálogo. El cambio en curso `magic-link-solo-verificados` no describe este prompt; este delta no modifica sus requisitos.
