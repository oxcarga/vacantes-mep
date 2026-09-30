# Tareas

## 1. Fichas del directorio

- [x] 1.1 Ampliar `seedCatalogsAndVacancies` con la regional `99` sin vacantes, la especialidad `Inglés`, la vacante abierta `1003` (regional distinta, `firstSeen` anterior a `1001`, institución, clase de puesto, lecciones y `Aplicar`) y la vacante abierta `1004` sin esos cuatro datos, y verificar en el helper que `1001` sigue abierta y `1002` cerrada
- [x] 1.2 Pintar cada vacante abierta como ficha en `/vacantes` con especialidad, número, etiqueta de catálogo, fecha `es-CR` de `firstSeen`, campos opcionales solo si existen y el enlace Aplicar solo si hay URL, y verificar con una prueba Playwright que `1003` muestra puesto, lecciones y Aplicar, que `1004` no muestra Aplicar, y que la prueba `6.1` sigue viendo `1001` y no `1002`

## 2. Orden y conteo

- [x] 2.1 Ordenar la lista visible por `firstSeen` descendente, desempatar por id descendente y mostrar el conteo en `vacantes-count`, y verificar con una prueba Playwright que `1001` aparece antes que `1003` y que el conteo inicial es el de las abiertas sembradas

## 3. Filtros

- [x] 3.1 Cargar `regionales` y `especialidades` en dos selects (`vacantes-regional`, `vacantes-especialidad`) con opción de todas, filtrar por `regionalValue` y por el texto exacto de especialidad, y verificar con una prueba Playwright la regional sola, la especialidad sola, la intersección y la regional `99` con lista vacía
- [x] 3.2 Mostrar `No hay vacantes abiertas.` en `vacantes-empty` cuando no hay abiertas, y los tres textos del diseño en `vacantes-empty-filter` cuando el recorte está vacío, y verificar con una prueba Playwright que la intersección vacía nombra regional y especialidad en `vacantes-empty-filter` y que, al quitar las abiertas y restaurarlas al final, `vacantes-empty` aparece y `vacantes-empty-filter` no
