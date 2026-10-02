# Tasks

## 1. Completar el magic link sin diálogo

- [x] 1.1 Quita `window.prompt` de `completeEmailLink` en `apps/gomep-vacantes/src/lib/auth-context.tsx`. Resuelve el correo con el valor guardado al pedir el enlace, luego el parámetro `email` de la URL y luego el correo de la sesión actual. Si los tres faltan, rechaza el inicio sin llamar a `signInWithEmailLink`. Verifica que ese archivo ya no contiene `window.prompt`.
- [x] 1.2 Haz que el efecto de `/auth/complete` complete el href actual una sola vez. Un segundo pase de esa misma apertura no vuelve a consumir el código ni muestra `link-error` si la sesión de esa cuenta ya quedó abierta. En la prueba Playwright `3.1` de `e2e/app.spec.ts`, falla si aparece un diálogo y exige la shell de docente sin `link-error`. Verifica que `3.1` pasa.
- [x] 1.3 Añade una prueba Playwright que cierra la sesión, borra el correo guardado del enlace y abre `/auth/complete` con `mode=signIn` y sin parámetro `email`. Comprueba que se ve `link-error`, que no hay shell y que no aparece un diálogo. Verifica que esa prueba pasa.
