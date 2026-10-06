# Tareas

## 1. Dropdown de regionales

- [x] 1.1 Reemplazar el `<select>` `vacantes-regional` por un botón con el mismo aspecto (`h-10`, `rounded-lg`, `border-input`, `ChevronDown`, `MapPin`), `aria-haspopup="listbox"` y `aria-expanded`, cuyo texto sea "Todas las regionales", la etiqueta de la única elegida o `${n} regionales`, y un listbox hermano del `Label` (`aria-multiselectable="true"`, `max-h` con scroll) con `vacantes-regional-todas` y `vacantes-regional-opcion-${id}` (`role="option"`, `aria-selected`, icono `Check`), guardar la elección en `regionalValues` sin duplicados, dejar la lista abierta al marcar o desmarcar, cerrarla con "Todas las regionales", un segundo clic en el botón, Escape o clic fuera, y filtrar la lista como la unión de esas regionales, y verificar con una prueba Playwright que el botón cerrado dice "Todas las regionales", que elegir `53` y luego `62` deja el listbox abierto, marca las dos, dice "2 regionales" y muestra `vacante-1001`, `vacante-1004` y `vacante-1003`, que volver a pulsar `62` la desmarca y el botón muestra "Regional Educación Perez Zeledon" sin `vacante-1003`, que Escape deja `aria-expanded="false"`, que "Todas las regionales" con Inglés ya elegido vacía solo las regionales y deja visible `vacante-1003`, que cambiar la especialidad de Español a Inglés deja solo Inglés, y que `vacantes-especialidad` sigue siendo `SELECT` mientras `vacantes-regional` es `BUTTON`
- [x] 1.2 Agregar en `e2e/helpers.ts` un helper que abre `vacantes-regional` solo si el listbox no está visible y pulsa `vacantes-regional-opcion-${id}`, reescribir los `selectOption` de `vacantes-regional` en las pruebas `6.5`, `6.6`, `9.3`, `9.5` y `9.6` para usar ese helper o `vacantes-regional-todas`, y verificar con Playwright que esas cinco pruebas pasan

## 2. Píldoras

- [x] 2.1 Mostrar una píldora `vacantes-filtro-regional-${id}` por cada regional elegida, en el orden del catálogo y antes de `vacantes-filtro-especialidad`, y al quitarla sacar solo ese id de `regionalValues`, y verificar con una prueba Playwright que, eligiendo primero `62` y después `53`, las píldoras aparecen "Regional Educación Perez Zeledon" y luego "Regional Educación Santa Cruz", que no hay píldora de especialidad, que quitar Perez Zeledon la desmarca (`aria-selected="false"`), deja la píldora de Santa Cruz, pone ese nombre en el botón cerrado y con Inglés muestra solo `vacante-1003`, y que sin filtros no hay píldoras ni `vacantes-limpiar`
- [x] 2.2 Pintar las píldoras de regional con `bg-primary/10 text-primary` y la de especialidad con `bg-chart-5/10 text-chart-5`, y verificar con una prueba Playwright que, con `53` e Inglés, `vacantes-filtro-regional-53` tiene esas clases de `primary` y `vacantes-filtro-especialidad` tiene las de `chart-5`

## 3. Mensaje sin coincidencias

- [x] 3.1 Armar el mensaje vacío con el texto actual cuando hay una sola regional, y con las etiquetas en orden de catálogo unidas `en ${a} o en ${b}` (o `en ${a}, en ${b} o en ${c}` si son tres o más) cuando hay varias, y verificar con una prueba Playwright que `62` y `99` con Español muestran exactamente "No hay vacantes abiertas de Español en Regional Educación Santa Cruz o en Regional sin vacantes.", que no aparece `vacantes-empty`, que `6.6` sigue esperando el texto de una sola regional y que `9.6` al usar "Limpiar filtros" vuelve a mostrar `vacante-1001`

## 4. Integración

- [x] 4.1 Correr `npm test`, `npm run lint -w gomep-vacantes`, `npm run build -w gomep-vacantes` y `npm run test:e2e`, verificar que todo pasa, y revisar a mano `/vacantes` a 390 px y a 1280 px para confirmar que el listbox no se sale de la pantalla y que las píldoras pasan a la línea siguiente
