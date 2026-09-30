# Diseño

## Contexto

Ver `proposal.md` para el motivo del cambio. Hoy `gomep-vacantes` es una app Next.js solo en el cliente: popup de Google y un placeholder. `gomep-vacantes-scrapper` escribe en Firestore con el Admin SDK; **el código vigente** aún usa las colecciones `openings` y `scrape_runs`. Este diseño renombra el esquema a `**vacantes`** y `**corridas_scrape**` (y el resto en español). En `vacantes`, el campo `regional` es la etiqueta del dropdown, no el value de la opción. `main.js` ya pasa `byRegional` (value, label, filas) a `store.commit`, y el store de Firestore lo ignora. Las reglas permiten leer vacantes a cualquier usuario autenticado y deniegan el resto de lecturas y escrituras del cliente. No hay paquete de Cloud Functions ni envío de correo.

## Objetivos / Fuera de alcance

**Objetivos:**

- Mantener escritura de vacantes y correo en el job del scrape, que ya sabe qué filas se agregaron.
- Mantener cambios de rol y suscripción en el servidor para que el cliente no fije su propio rol o vencimiento.
- Permitir al navegador leer vacantes, catálogos y las suscripciones del usuario bajo reglas.

**Fuera de alcance:**

- Un segundo scheduler (cron) dedicado solo a recordatorios de vencimiento. Los envía el mismo job horario del scrape.
- Migrar cuentas Google existentes. El placeholder no tiene usuarios de producción que preservar.
- Elegir otro proveedor de correo distinto de la API HTTPS descrita abajo.

## Decisiones

### 1. Correo y contraseña en Firebase Auth; el perfil en Firestore

El registro usa `createUserWithEmailAndPassword` y luego `sendEmailVerification`. El inicio posterior usa `signInWithEmailAndPassword` o `sendSignInLinkToEmail` / `signInWithEmailLink`. Se quita Google de `auth-context.tsx`.

`usuarios/{uid}` guarda `name`, `email`, `phone`, `role` y `createdAt`. El cliente no puede escribir ese documento. Tras el registro, una server action verifica el ID token, crea el perfil si falta y asigna el custom claim `role`.

Alternativa: guardar el rol solo en Firestore y leerlo en reglas con `get()`. Cuesta una lectura extra en cada comprobación y se desalinea del token. El claim es lo que leen reglas e interfaz. La copia en el perfil permite listar admins sin listar usuarios de Auth.

### 2. El primer admin es una lista de correos; los cambios posteriores son una server action

`ADMIN_EMAILS` es una variable de entorno separada por comas en `gomep-vacantes`. La acción de arranque asigna `admin` si el correo del token está en la lista; si no, `docente`. `setUserRole` exige que quien llama sea `admin`, actualiza el claim y `usuarios/{uid}.role`, y rechaza el cambio si quedarían cero admins. El cliente llama `getIdToken(true)` tras un cambio de rol porque el claim queda obsoleto hasta refrescar.

Alternativa: función blocking de Auth. Requiere Identity Platform y otra superficie de despliegue. La app no la tiene hoy.

### 3. Catálogos, vacantes y suscripciones en colecciones en español

Definido en `@gomep/schema` (nombres de colección en Firestore):


| Colección                  | Id                                   | Campos                                                                                                                                                                     |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usuarios/{uid}`           | uid de Auth                          | `name`, `email`, `phone`, `role`, `createdAt`                                                                                                                              |
| `regionales/{value}`       | value del dropdown MEP               | `label`, `lastSeen`                                                                                                                                                        |
| `especialidades/{id}`      | SHA-256 del texto exacto de la celda | `name`, `lastSeen`                                                                                                                                                         |
| `suscripciones/{autoId}`   | auto                                 | `uid`, `regionalValue`, `especialidad`, `status` (`active` o `inactive`), `createdAt`, `expiresAt`, `endedAt`, `endReason` (`removed`, `expired` o null), mapa `reminders` |
| `vacantes/{vacanteId}`     | número de Vacante del MEP            | campos actuales más `regionalValue` junto a la etiqueta en `regional`                                                                                                      |
| `corridas_scrape/{autoId}` | auto                                 | `startedAt`, `finishedAt`, `ok`, `regional`, `rowCount`, `contentHash`, `error`, `newCount`, `goneCount`, `changedCount`                                                   |


El texto de especialidad puede llevar `/` (`Música/Música`), así que no puede ser id de documento. El hash es el id; `name` es el texto exacto.

Un `commit` exitoso hace upsert de cada grupo en `byRegional`, incluidos los de cero filas, y de cada `Especialidad` distinta en esas filas. Nunca borra documentos de catálogo. Las rutas de tabla vacía y de fallo retornan antes de `commit`, así que no tocan catálogos. `regionalValue` se escribe en cada documento de `vacantes` en ese mismo commit. `firstSeen` se comporta como hoy.

La implementación debe **renombrar** `openings` → `vacantes` y `scrape_runs` → `corridas_scrape` (o migrar datos en Firestore si ya hay producción).

### 4. Las suscripciones se escriben con server actions

`createSubscription` comprueba que quien llama sea un `docente` verificado, que ambos ids existan en catálogos y que no haya otra fila `active` para ese uid y par. Fija `expiresAt` a `createdAt` más 30 días. `removeSubscription` pone `status: inactive`, `endReason: removed` y `endedAt` solo si quien llama es dueño de una fila activa. Volver a agregar el par crea un documento nuevo y deja el inactivo.

Alternativa: escrituras del cliente con reglas. Las reglas no pueden fijar de forma fiable `expiresAt` a 30 días, y un cliente podría reactivar una fila.

### 5. El job del scrape envía correo tras un commit exitoso

Un puerto de correo pequeño en el scraper (`sendMail({to, subject, text, html})`) llama a la API HTTPS de Resend cuando existen `RESEND_API_KEY` y `MAIL_FROM`. Las pruebas usan un envío falso. Sin claves, el job registra lo que habría enviado y no falla el scrape.

Orden dentro de una corrida exitosa, después de confirmar vacantes y catálogos:

1. Cargar suscripciones `active`. Una fila cuenta como activa solo si `status == "active"` y `expiresAt` sigue en el futuro.
2. Por cada vacante en `added`, enviar correo a cada coincidencia por `regionalValue` y `especialidad` exacta. El cuerpo va en español e incluye número de vacante, especialidad, etiqueta de regional, institución y `fields.Aplicar`.
3. Para recordatorios, comparar fechas de calendario en `America/Costa_Rica`. Ventanas: 7, 3, 2 y 0 días antes del vencimiento. Enviar solo la ventana más urgente que corresponda y aún no esté `sent` o `skipped`. Marcar ventanas anteriores debidas pero no enviadas como `skipped`. El correo del día 0 sale antes de marcar la fila como vencida.
4. Luego poner `status: inactive` y `endReason: expired` en filas cuyo `expiresAt` ya pasó. No enviar recordatorios si `endReason: removed`.

El correo de vacante usa solo la lista `added` del diff existente. Ediciones y cierres no. Un docente que se suscribe con filas ya abiertas no recibe correos atrasados porque esas filas no están en `added`.

### 6. Las reglas reparten lectura por rol y verificación

Toda lectura exige `request.auth.token.email_verified == true`. Admin: `request.auth.token.role == "admin"`.

- `vacantes`: un docente solo lee documentos con `active == true` (las consultas deben filtrar `active == true`). Un admin lee cualquier vacante.
- `regionales`, `especialidades`: cualquier usuario verificado puede leer. Escritura del cliente denegada.
- `suscripciones`: un docente lee las suyas. Un admin lee todas. Escritura del cliente denegada.
- `usuarios`: cada usuario lee su documento. Un admin lee todos. Escritura del cliente denegada.
- `corridas_scrape`: solo lectura admin. Escritura del cliente denegada.

## Riesgos / Compromisos

- [Claim obsoleto tras promoción] → La pantalla de admin pide recargar al usuario afectado; las mutaciones llaman `getIdToken(true)`.
- [Resend caído o sin clave] → El scrape sigue confirmando vacantes. El correo no enviado queda en log. Una corrida posterior no reintenta correo de vacante porque la fila ya no está en `added`. Los recordatorios sí reintentan hasta `sent` o `skipped`.
- [El job horario pierde el día de vencimiento] → El job corre cada hora y la ventana de 0 días es todo el día calendario de Costa Rica antes de `expiresAt`. Perderla exige que el job esté caído todo ese día.
- [Vacantes cerradas escritas antes de `regionalValue`] → Las alertas solo emparejan filas nuevas en `added`, que llevan `regionalValue`. El listado admin sigue usando la etiqueta guardada.
- [Los ids hash ocultan la especialidad en consola] → El documento guarda `name` para lectura.
- [Renombrar colecciones en Firestore] → Si ya hay datos en `openings`, planificar copia o script de migración a `vacantes` antes de cortar el job.

## Plan de migración

1. Desplegar reglas e índices de Firestore (colecciones en español) antes de que la app consulte las colecciones nuevas.
2. Activar proveedores de correo/contraseña y enlace por correo en Firebase Auth. Fijar la URL de continuación del magic link al dominio de App Hosting.
3. Configurar `ADMIN_EMAILS` en la app y `RESEND_API_KEY` más `MAIL_FROM` en el job de Cloud Run.
4. Renombrar o migrar `openings` → `vacantes` y `scrape_runs` → `corridas_scrape` en código y, si aplica, en datos.
5. Desplegar la app y luego el job. El siguiente scrape exitoso llena catálogos y `regionalValue`.
6. Rollback: redesplegar imágenes anteriores de app y job. Las colecciones nuevas y vacantes inactivas pueden quedarse; las reglas del release anterior vuelven a denegar acceso del cliente.

## Preguntas abiertas

Ninguna. Proveedor de correo, instante de 30 días y calendario de Costa Rica para recordatorios quedan fijados arriba.