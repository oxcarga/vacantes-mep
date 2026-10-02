# Design

## Context

Ver `proposal.md` para el motivo. Hoy `completeEmailLink` en `auth-context.tsx` arma el correo así: `localStorage` (`gomepEmailForSignIn`), luego `window.prompt("Confirme su correo")`, luego el parámetro `email` de la URL, luego `auth.currentUser?.email`. `requestMagicLink` guarda el correo antes de `sendSignInLinkToEmail`. `/auth/complete` llama a `completeEmailLink` en un efecto cuya dependencia es esa función. El `useMemo` del contexto la recrea cuando cambian `user` o `verified`, así que el efecto corre otra vez después del primer inicio, con el almacenamiento ya borrado, y ahí sale el prompt. El emulador rechaza un correo distinto al del código (`INVALID_EMAIL`). La pantalla igual redirige a `/vacantes` si ya hay usuario verificado.

## Goals / Non-Goals

**Goals:**

- Quitar el diálogo y dejar de llamarlo en cualquier reintento.
- Completar el enlace una sola vez por apertura.
- Conservar el inicio en el mismo navegador donde se pidió el enlace.

**Non-Goals:**

- Ver la propuesta. No hay formulario nuevo ni cambio de quién puede pedir el enlace.

## Decisions

### 1. El correo sale de tres fuentes, nunca de un prompt

Orden: valor guardado al pedir el enlace, parámetro `email` de la URL, correo de la sesión actual. Si los tres faltan, no se llama a `signInWithEmailLink`. Se rechaza con el error que `/auth/complete` ya muestra (`link-error`).

Alternativa: dejar el prompt solo cuando no hay sesión. Sigue interrumpiendo el caso de otro dispositivo, que es el que se quiere eliminar. Alternativa: un campo en la página. Quedó fuera de alcance.

### 2. El efecto de `/auth/complete` completa el enlace una vez

La dependencia no puede ser la identidad de `completeEmailLink`, porque esa identidad cambia al actualizar la sesión y dispara el prompt. El efecto debe intentar el `href` actual una sola vez. Un segundo pase, después de que esa apertura ya inició la sesión, no vuelve a consumir el código ni escribe `link-error`.

Alternativa: ignorar el error `INVALID_OOB_CODE` si ya hay usuario. Esconde también un enlace vencido abierto con sesión de otra cuenta. Acotar el silencio al segundo pase de la misma apertura evita eso.

### 3. La prueba existente cubre la ausencia del diálogo

`e2e/app.spec.ts`, prueba `3.1`, abre el magic link local y espera la shell. Hay que escuchar `dialog` y fallar si aparece. Playwright, si no se escucha, descarta el diálogo y la prueba seguiría en verde con el prompt presente.

## Risks / Trade-offs

- [El enlace se abre en otro navegador, sin `email` en la URL y sin sesión] → El inicio se rechaza con el aviso de enlace inválido. No hay forma de escribir el correo. Es el comportamiento pedido.
- [Sesión de otra cuenta y almacenamiento vacío] → Se usa el correo de esa sesión; el emulador rechaza el desajuste y la sesión anterior sigue. No se cambia de cuenta por un enlace ajeno.
- [El cambio `magic-link-solo-verificados` también toca `account-auth`] → Este delta solo modifica «Los accesos posteriores usan magic link por correo o la contraseña del registro». El otro no modifica ese requisito. Al archivar, no mezclar los textos.

## Migration Plan

1. Quitar el prompt y el segundo pase del efecto.
2. Actualizar la prueba `3.1`.
3. Rollback: volver a la cadena con `window.prompt`. No hay datos que migrar.
