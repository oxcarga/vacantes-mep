# Tareas

## 1. Control y filtro de regional

- [x] 1.1 Crear `DropdownSearchable` en `apps/gomep-vacantes/src/components/dropdown-searchable.tsx` con la API de `design.md` (`options`, `value`, `onChange`, `nombre`, `multiple`, `max`, `idPrefix`), resumen cerrado, panel con campo "Buscar", filtro sin mayúsculas ni tildes, fila de todas siempre visible, "Sin coincidencias", selección única que cierra y múltiple que no cierra, y usarlo en el filtro de regional de `/vacantes` (`multiple`, `max={5}`, `nombre="regionales"`, `idPrefix="vacantes-regional"`, valor = id de catálogo) quitando de la página el estado de abierto, y verificar con una prueba Playwright que al escribir un texto que solo coincide con una regional esa opción y `vacantes-regional-todas` siguen visibles, que las demás opciones no, que "Sin coincidencias" aparece si nada coincide, y que Escape cierra el panel, borra el texto y conserva la regional elegida
- [x] 1.2 Deshabilitar en el panel las regionales no elegidas al llegar a cinco, mostrar `vacantes-regional-maximo` con "Máximo 5 regionales", impedir el sexto clic y volver a permitir agregar al quitar una, y verificar con una prueba Playwright que cinco regionales dejan el botón en "5 regionales", que la sexta no se agrega y se ve deshabilitada, que el aviso está visible, y que quitar una lo oculta y permite elegir otra
- [x] 1.3 Mover el resalte con flechas sin sacar el foco del campo, activar con Enter la primera coincidencia cuando hay texto, ignorar Enter con el texto vacío, escribir la barra espaciadora en el campo y cerrar con Tab, y verificar con una prueba Playwright que abrir y pulsar Enter no cambia la selección, que escribir y pulsar Enter elige la primera regional coincidente, y que Escape devuelve el foco al botón `vacantes-regional`

## 2. Filtro de especialidad

- [x] 2.1 Sustituir el `<select>` `vacantes-especialidad` por `DropdownSearchable` en selección única con `nombre="especialidades"` y el texto exacto como valor, agregar en `e2e/helpers.ts` `elegirEspecialidad` y `todasLasEspecialidades`, y reescribir los `selectOption` y `toHaveValue` de `vacantes-especialidad` en `6.5`, `6.6`, `9.3`, `9.5`, `9.6`, `9.13`, `9.14`, `9.15` y `9.16`, y verificar con una prueba Playwright que buscar y elegir una especialidad deja su texto en el botón cerrado, conserva las regionales, que "Todas las especialidades" vacía solo la especialidad, que elegir otra reemplaza a la anterior, y que `9.4` y el final de `9.13` esperan `BUTTON` en los dos controles

## 3. Integración

- [x] 3.1 Correr `npm test`, `npm run lint -w gomep-vacantes`, `npm run build -w gomep-vacantes` y `npm run test:e2e`, y verificar que todo pasa
