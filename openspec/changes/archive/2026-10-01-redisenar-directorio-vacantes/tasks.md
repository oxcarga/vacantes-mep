# Tareas

## 1. Shell

- [x] 1.1 Agregar a `AppShell` el header fijo con marca, la prop opcional `description` y la navegación con `aria-current="page"` por `usePathname`, y verificar con una prueba Playwright que en `/vacantes` el enlace Vacantes tiene `aria-current="page"` y Suscripciones no, que en `/suscripciones` se invierte, y que las pruebas 5.x, 6.x y 7.x siguen pasando sin cambios
- [x] 1.2 Compactar la sesión del header (correo truncado y oculto bajo `sm`, rol como insignia con `capitalize`, "Cerrar sesión" solo con ícono en móvil y texto `sr-only`), y verificar con una prueba Playwright a 390 px de ancho que el botón con nombre "Cerrar sesión" es visible y que `session-role` tiene el texto `docente`

## 2. Insignia "Nueva"

- [x] 2.1 Crear `esVacanteNueva(firstSeen, ahora)` en `src/lib/vacante-nueva.ts` con claves de fecha en America/Costa_Rica, y verificar con `src/lib/vacante-nueva.test.ts` (`npm test`) los casos hoy, ayer a las 00:05, anteayer a las 23:55, fecha futura, `firstSeen` ausente y `firstSeen` inválido
- [x] 2.2 Mostrar la insignia "Nueva" en la cabecera de la ficha con `ahora` tomado una vez al montar, y verificar con una prueba Playwright que, al mover el `firstSeen` de `1001` a la hora actual (y restaurarlo en `finally`), `vacante-1001` contiene "Nueva", `vacante-1003` no la contiene y ambas siguen mostrando su fecha

## 3. Fichas y conteo

- [x] 3.1 Rediseñar la ficha (cuadrícula `sm:grid-cols-2`, borde izquierdo en hover, `#<id>` en mono, institución y regional con ícono, chips de puesto y `<n> lecciones`, pie con "Vista el …" y Aplicar con `ExternalLink`), y verificar con una prueba Playwright que `vacante-1003` contiene "30 lecciones" y que su enlace Aplicar abre en `_blank`, además de que `6.3` y `6.4` pasan sin cambios
- [x] 3.2 Mostrar el conteo como frase, con `vacantes-count` solo para el número, `aria-live="polite"` y singular o plural, y verificar con una prueba Playwright que sin filtros se lee "3 vacantes", que con Inglés y la regional `78` se lee "1 vacante", y que `vacantes-count` sigue teniendo el texto `3` y `1`

## 4. Filtros

- [x] 4.1 Estilizar el panel de filtros (`bg-muted/50`, selects nativos con `appearance-none`, `ChevronDown` superpuesto e íconos `MapPin` y `GraduationCap` en las etiquetas), y verificar que la prueba Playwright `6.5` pasa sin cambios y que una prueba nueva confirma que `vacantes-regional` y `vacantes-especialidad` siguen siendo elementos `select`
- [x] 4.2 Agregar los chips de filtros activos (`vacantes-filtro-regional` y `vacantes-filtro-especialidad`), su botón "Quitar filtro: <etiqueta>" y el botón "Limpiar filtros" (`vacantes-limpiar`), y verificar con una prueba Playwright que sin filtros no aparecen, que con regional `78` e Inglés aparecen ambos, que quitar la regional deja solo el chip de Inglés con el select de regional en todas, y que "Limpiar filtros" deja los dos selects en todas con el conteo en `3`
- [x] 4.3 Agregar "Limpiar filtros" (`vacantes-empty-filter-limpiar`) junto al mensaje de filtro sin coincidencias, y verificar con una prueba Playwright que con regional `78` y Español el botón aparece y, al usarlo, `vacantes-empty-filter` desaparece y vuelve a verse `vacante-1001`

## 5. Carga y estados vacíos

- [x] 5.1 Agregar las banderas de primer snapshot para vacantes y regionales, el manejador de error del catálogo de regionales y las fichas esqueleto en `vacantes-loading` (fuera de `vacantes-list`), y verificar con una prueba Playwright que, reteniendo con `page.route` las peticiones `Listen` al emulador, se ve `vacantes-loading` y no `vacantes-empty`, y que al liberarlas desaparece `vacantes-loading` y se ve `vacante-1001`
- [x] 5.2 Rediseñar los estados vacíos con ícono en círculo `bg-primary/10` y el enlace a `/suscripciones` ("Le avisamos cuando salga una") como hermano de `vacantes-empty`, y verificar con una prueba Playwright, siguiendo el patrón de `6.6` (borrar abiertas y restaurarlas en `finally`), que `vacantes-empty` conserva el texto exacto y que el enlace lleva a `/suscripciones`

## 6. Integración

- [x] 6.1 Correr `npm test`, `npm run lint -w gomep-vacantes`, `npm run build -w gomep-vacantes` y `npm run test:e2e`, verificar que todo pasa, y revisar a mano `/vacantes` a 390 px y a 1280 px, en claro y con la clase `dark`, para confirmar que no hay desbordes ni colores fuera de la paleta
