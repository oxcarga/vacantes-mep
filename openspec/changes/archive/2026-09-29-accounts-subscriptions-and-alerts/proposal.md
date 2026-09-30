# Propuesta

## Resumen

Convertir `gomep-vacantes` de un placeholder con inicio de sesión de Google en una app con cuentas. Un docente consulta vacantes abiertas del MEP y se suscribe a una regional y una especialidad. El scrape horario mantiene esos catálogos y envía correo cuando aparece una vacante nueva que coincide. Un admin supervisa usuarios, suscripciones y el historial completo de vacantes. Las colecciones de Firestore pasan a nombres en español (`vacantes`, `suscripciones`, `usuarios`, etc.).

## Por qué

El scraper ya guarda vacantes en Firestore (hoy en la colección `openings`), incluidas las que luego se cierran, pero nadie puede registrarse, suscribirse ni enterarse cuando abre una vacante que le interesa. La app Next.js solo comprueba el inicio de sesión con Google.

## Qué cambia

- **ROMPE COMPATIBILIDAD**: Sustituir Google por correo y contraseña, enlace de verificación por correo y, después, magic link por correo. La contraseña del registro sigue sirviendo para entrar.
- **ROMPE COMPATIBILIDAD**: Renombrar colecciones Firestore a español (`openings` → `vacantes`, `scrape_runs` → `corridas_scrape`, más `usuarios`, `suscripciones`, `regionales`, `especialidades`).
- Dos roles, `docente` y `admin`. El primer admin sale de una lista de correos en configuración. Los cambios de rol posteriores se hacen en la pantalla de admin, que no puede quitar al último admin.
- Persistir regionales y especialidades en catálogos propios en cada scrape exitoso, y conservar entradas aunque dejen de aparecer en la página del MEP.
- Permitir varias suscripciones por docente. Cada una dura 30 días, puede quitarse antes y queda como historial inactivo. Volver a agregar el mismo par abre un nuevo plazo de 30 días.
- Enviar un correo por cada vacante nueva que coincida, más cuatro recordatorios de vencimiento (7, 3, 2 y 0 días antes de `expiresAt`, America/Costa_Rica).
- El docente ve vacantes abiertas. El admin ve usuarios, suscripciones, vacantes abiertas y cerradas, y ambos catálogos.

## Alcance

`gomep-vacantes`, el job del scraper, el esquema compartido de Firestore y las reglas de seguridad. El job envía correo después de confirmar vacantes nuevas.

## Objetivos

- Un docente verificado puede ver vacantes abiertas y gestionar suscripciones.
- Una vacante nueva envía correo a cada suscriptor activo de esa regional y especialidad.
- Los catálogos y las vacantes cerradas sobreviven a scrapes posteriores.

## Fuera de alcance

- SMS, WhatsApp, notificaciones del navegador, ntfy y Telegram.
- Usar el teléfono como canal de login o de alertas. Solo se guarda en el perfil.
- Correos cuando una vacante abierta se edita o cierra, ni por vacantes ya abiertas al suscribirse.
- Borrar cuentas de Firebase desde el admin.
- Renovar automáticamente una suscripción.

## Capacidades

### Capacidades nuevas

- `account-auth`: Registro, verificación por correo, magic link y campos del perfil.
- `account-roles`: Docente y admin, lista inicial de admins, promoción y protección del último admin.
- `vacancy-catalogs`: Regionales y especialidades de larga vida mantenidas por el scrape.
- `subscriptions`: Pares, plazo de 30 días, baja, historial y recordatorios de vencimiento.
- `vacancy-alerts`: Un correo por vacante nueva que coincide con una suscripción activa.
- `vacancy-directory`: Quién puede leer vacantes abiertas y cerradas.

### Capacidades modificadas

Ninguna. Este repositorio aún no tiene specs principales.

## Impacto

`apps/gomep-vacantes`, `apps/gomep-vacantes-scrapper`, `packages/schema`, `firestore.rules` y `firestore.indexes.json`. El job de Cloud Run incorpora un envío transaccional de correo. Hoy las reglas permiten leer la colección legacy `openings` a cualquier usuario autenticado y bloquean el resto de lecturas y escrituras.
