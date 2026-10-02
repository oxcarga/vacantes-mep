# Tasks

## 1. Clasificación y envío

- [x] 1.1 Extrae la clasificación del correo (ausente, sin verificar, verificado) a una función pura y cubre los tres resultados con un test de node en `src/lib/*.test.ts`. Verifica que `npm test -w gomep-vacantes` pasa.
- [x] 1.2 Añade en `gomep-vacantes` el envío con Resend (`RESEND_API_KEY`, `MAIL_FROM`), documenta esas variables en `.env.example` y cubre con un test de node el envío correcto, la respuesta fallida y la ausencia de clave. Verifica que `npm test -w gomep-vacantes` pasa.
- [x] 1.3 Añade la server action que consulta la cuenta, genera el enlace de verificación solo si falta verificar, lo envía con Resend fuera de local y responde `missing`, `verify`, `magic` o error sin incluir la URL de Firebase. Cubre esos cuatro resultados con un test de node usando Auth y envío falsos. Verifica que `npm test -w gomep-vacantes` pasa.

## 2. Pestaña Entrar

- [x] 2.1 Llama a `sendSignInLinkToEmail` solo cuando la action responde `magic`, conserva el aviso «Revise su correo para el enlace de acceso» y, en local, el enlace `dev-magic-link`. Ajusta la prueba Playwright 3.1 del docente ya verificado y verifica que pasa.
- [x] 2.2 Muestra «No hay una cuenta con ese correo. Regístrese para crear una.» cuando la action responde `missing`, sin enlace debajo del botón. Añade una prueba Playwright con un correo sin cuenta y verifica que pasa.
- [x] 2.3 Muestra «Primero valide su cuenta. Le enviamos el enlace de verificación.» cuando la action responde `verify`, y en local el enlace de verificación bajo «Enviar magic link» (`mode=verifyEmail`), sin magic link. Si el enlace no está disponible, muestra `dev-auth-link-error`. Añade una prueba Playwright con una cuenta recién registrada y sin verificar, y verifica que pasa.

## 3. Verificación sin sesión

- [x] 3.1 Tras aplicar un enlace de verificación sin sesión, lleva a `/?verificado=1` y muestra «Su correo quedó verificado. Vuelva a Entrar y pida el magic link.», sin vacantes ni navegación de la app. Si hay sesión, conserva el paso a la shell de docente. Añade una prueba Playwright que abre el enlace de verificación de la tarea 2.3 sin sesión y otra que confirma que la prueba 5.2 sigue llegando a la shell. Verifica que ambas pasan.
