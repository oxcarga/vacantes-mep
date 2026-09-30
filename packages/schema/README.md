# @gomep/schema

Nombres de colecciones y tipos TypeScript para documentos de Firestore compartidos
por `gomep-vacantes-scrapper` y `gomep-vacantes`.

## Colecciones (español)

| Colección en Firestore | Notas |
|---|---|
| `vacantes` | Una fila por vacante del MEP (`id` = número de Vacante). Incluye `regionalValue`. |
| `corridas_scrape` | Una fila por ejecución del scrape (éxito o fallo). |
| `regionales` | Catálogo del dropdown MEP (`id` = value de la opción). |
| `especialidades` | Catálogo de textos de especialidad (`id` = SHA-256 del texto exacto). |
| `suscripciones` | Suscripciones docente regional + especialidad. |
| `usuarios` | Perfil y rol en Firestore (`id` = uid de Auth). |

En `vacantes`, el campo `especialidad` está desnormalizado para consultas por par
regional/especialidad.
