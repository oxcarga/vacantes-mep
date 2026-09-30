# @gomep/schema

Nombres de colecciones y tipos TypeScript para documentos de Firestore compartidos
por `gomep-vacantes-scrapper` y `gomep-vacantes`.

## Colecciones (español)

| Colección en Firestore | Notas |
|---|---|
| `vacantes` | Una fila por vacante del MEP (`id` = número de Vacante). Hoy el código aún exporta la clave `openings` hasta completar la migración del cambio *accounts-subscriptions-and-alerts*. |
| `corridas_scrape` | Una fila por ejecución del scrape (éxito o fallo). Hoy la clave en código es `scrape_runs`. |
| `regionales` | Catálogo del dropdown MEP (pendiente de implementar). |
| `especialidades` | Catálogo de textos de especialidad (pendiente). |
| `suscripciones` | Suscripciones docente regional + especialidad (pendiente). |
| `usuarios` | Perfil y rol en Firestore (pendiente). |

En `vacantes`, el campo `especialidad` está desnormalizado para consultas por par
regional/especialidad sin otra migración.
