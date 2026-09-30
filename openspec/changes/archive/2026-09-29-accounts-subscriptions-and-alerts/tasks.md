# Tareas

## 1. Esquema compartido y acceso a Firestore

- [x] 1.1 Renombrar en `@gomep/schema` `openings` → `vacantes` y `scrape_runs` → `corridas_scrape`, agregar `usuarios`, `regionales`, `especialidades` y `suscripciones`, más `regionalValue` en vacantes, y verificar que pase el typecheck de `packages/schema`
- [x] 1.2 Agregar índices compuestos para consultas de vacantes abiertas del docente y para suscripciones activas por par y por vencimiento, y verificar que `firestore.indexes.json` los liste con el nombre de colección `vacantes`
- [x] 1.3 Reescribir `firestore.rules` con colecciones en español: docentes verificados leen solo vacantes activas y sus propias suscripciones, admins leen todo lo del diseño, y el cliente no escribe usuarios, catálogos, suscripciones ni vacantes; verificar que las pruebas unitarias de reglas cubran esos casos

## 2. Catálogos en el scrape

- [x] 2.1 Hacer upsert de `regionales` y `especialidades` dentro de un `commit` exitoso de Firestore, usando el value del dropdown y un hash del texto exacto de especialidad, y verificar con una prueba de store que se conserve una regional vacía, un nombre que falte en un scrape posterior y que no se fusionen grafías distintas
- [x] 2.2 Escribir `regionalValue` en cada documento de `vacantes` en ese commit sin pisar `firstSeen`, y verificar con una prueba de store el value y el `firstSeen` preservado
- [x] 2.3 Comprobar que las rutas de tabla vacía y de fallo retornan antes de escribir catálogos, y verificar que las pruebas de store existentes siguen pasando

## 3. Correo de vacantes y recordatorios de suscripción

- [x] 3.1 Agregar un puerto de correo que llame a Resend cuando existan `RESEND_API_KEY` y `MAIL_FROM`, y registre en log sin lanzar error cuando falten, y verificar con una prueba unitaria ambos caminos
- [x] 3.2 Tras un commit exitoso, enviar un correo por cada suscriptor activo no vencido por cada vacante en `added`, con el cuerpo en español del diseño, y verificar con una prueba unitaria que no se envía nada por ediciones, cierres o suscripción inactiva
- [x] 3.3 En la misma corrida, enviar solo el recordatorio más urgente debido (7, 3, 2 o 0 días calendario de Costa Rica), omitir ventanas anteriores perdidas, y luego marcar inactivas las filas vencidas, y verificar con pruebas unitarias el calendario, ventanas colapsadas y suscripción quitada
- [x] 3.4 Documentar `RESEND_API_KEY` y `MAIL_FROM` en el ejemplo de env del scraper y en el README raíz, y verificar que los nombres coincidan con el código

## 4. Server actions de cuentas

- [x] 4.1 Agregar `firebase-admin` a `gomep-vacantes` y una server action que cree `usuarios/{uid}` y asigne el claim `role` según `ADMIN_EMAILS`, y verificar con una prueba unitaria que solo un correo en la lista recibe `admin`
- [x] 4.2 Agregar la server action `setUserRole` que actualice el claim y el perfil en `usuarios` y rechace degradar al último admin, y verificar con una prueba unitaria promoción, degradación y rechazo del último admin
- [x] 4.3 Agregar las server actions `createSubscription` y `removeSubscription` con plazo de 30 días, regla de un solo par activo y fila nueva si el par solo está en historial, y verificar con pruebas unitarias esos tres casos
- [x] 4.4 Documentar `ADMIN_EMAILS` en `apps/gomep-vacantes/.env.example` y en el README de la app, y verificar que el nombre coincida con la server action

## 5. Pantallas de inicio de sesión

- [x] 5.1 Sustituir Google por registro (correo, contraseña, teléfono, nombre), estado de espera de verificación, inicio con contraseña y magic link, y verificar con una prueba Playwright el registro hasta el bloqueo por no verificado
- [x] 5.2 Enviar el enlace de verificación y el magic link con Firebase Auth, y verificar con una prueba Playwright la shell del docente verificado tras un enlace válido y el rechazo de un enlace vencido

## 6. Vacantes y suscripciones del docente

- [x] 6.1 Mostrar todas las vacantes activas a un docente verificado y ocultar las cerradas, y verificar con una prueba Playwright que una fila abierta se ve y una cerrada no
- [x] 6.2 Permitir agregar un par del catálogo, ver suscripciones activas e inactivas y quitar una activa, y verificar con una prueba Playwright agregar, quitar y ver el par en historial

## 7. Pantallas de admin

- [x] 7.1 Listar cuentas, suscripciones activas e inactivas, vacantes abiertas y cerradas, regionales y especialidades para un admin, y verificar con una prueba Playwright una vacante cerrada y una suscripción inactiva
- [x] 7.2 Permitir promover y degradar otra cuenta, refrescar el ID token y mostrar el error del último admin, y verificar con una prueba Playwright la promoción de un docente y el bloqueo al degradar al único admin
- [x] 7.3 Ocultar acciones de crear y quitar suscripción al admin, y verificar con una prueba Playwright que no hay control de suscripción en sesión admin

## 8. Comprobación integral

- [x] 8.1 Ejecutar las pruebas unitarias del scraper y de la app, y verificar que ambos comandos terminan con código 0
- [x] 8.2 Ejecutar la suite Playwright de registro, listado docente, suscripciones y pantallas admin, y verificar que la suite termina con código 0
