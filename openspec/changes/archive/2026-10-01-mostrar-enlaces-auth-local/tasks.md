# Tasks

## 1. Lectura del código en el emulador

- [x] 1.1 Extrae `isLocalAuthDev` (flag de emuladores y host `localhost` o `127.0.0.1`) y el armado de `{origin}/auth/complete?mode=verifyEmail|signIn&oobCode=` en un módulo puro. Verifica con un test de node en `src/lib/*.test.ts` que un host de loopback con el flag encendido es local, que sin flag o con otro host no lo es, y que cada modo produce su href.
- [x] 1.2 Añade la función que elige el último `oobCode` del correo y del `requestType` (`VERIFY_EMAIL` o `EMAIL_SIGNIN`) y la server action que solo consulta el emulador con el flag encendido y devuelve `{ href }` o null. Verifica con un test de node que un listado con otro correo u otro tipo se ignora, que sin coincidencia el resultado es null, y que con el flag apagado no hay llamada al emulador.

## 2. Enlace bajo Crear cuenta

- [x] 2.1 Retén el formulario de registro en local antes de que la sesión lo sustituya, no navegues a `/verificar`, y muestra debajo de «Crear cuenta» el enlace `dev-verify-link` o el aviso `dev-auth-link-error` si la action devuelve null. Actualiza las pruebas Playwright 5.1 y 5.2: 5.1 ve el enlace, el formulario sigue visible y `/vacantes` acaba en correo sin verificar; 5.2 abre ese href y llega a la shell de docente. Verifica que 5.1 y 5.2 pasan. Fuera de local el `router.push("/verificar")` queda detrás de `isLocalAuthDev`, cubierto por el test de 1.1.

## 3. Enlace bajo Enviar magic link

- [x] 3.1 Muestra debajo de «Enviar magic link» el enlace `dev-magic-link`, o `dev-auth-link-error` si la action devuelve null, sin quitar el aviso de revisar el correo. Añade una prueba Playwright con un docente ya verificado: pide el magic link, el href aparece bajo el botón y abrirlo inicia sesión. Verifica que esa prueba pasa.
