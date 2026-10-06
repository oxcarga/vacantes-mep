# Tareas

## 1. Panel de alta

- [x] 1.1 Pasar a `AppShell` el subtítulo "Avisos durante 30 días por un par de regional y especialidad.", estilizar el formulario como panel `bg-muted/50` con selects nativos (`appearance-none`, `h-10`, `ChevronDown`, `MapPin` y `GraduationCap`) y ordenar regionales por `label` y especialidades por `name` con `localeCompare(..., "es")`, y verificar con una prueba Playwright que `subscribe-regional` y `subscribe-especialidad` siguen siendo `select`, que las etiquetas de regional salen "Regional Educación Perez Zeledon", "Regional Educación Santa Cruz" y "Regional sin vacantes" en ese orden, que se ve el subtítulo, y que `6.2` pasa sin cambios

## 2. Fichas activas

- [x] 2.1 Mostrar cada activa en un `Card` dentro de `subs-active` (`sub-active-<id>`), con la especialidad, la etiqueta de la regional (`label` del catálogo, o el value si falta), "Vence el {fecha}" en America/Costa_Rica con el formato `es-CR` de día, mes corto y año, y "Quitar" en `variant="outline"` (`remove-sub-<id>`), y verificar con una prueba Playwright que una activa sembrada de Español en `57` con `expiresAt` `2026-01-31T00:00:00.000Z` contiene "Regional Educación Perez Zeledon" y "30 ene 2026" y no contiene el texto `57`, y que otra activa con `regionalValue` ausente del catálogo muestra ese value
- [x] 2.2 Mostrar el conteo en `subs-count` dentro de una frase con `aria-live="polite"` ("activa" solo cuando el número es 1), ordenar las activas por `createdAt` descendente y `id` descendente, y verificar con una prueba Playwright que con una activa `subs-count` tiene el texto `1` y la frase dice "activa", y que con dos activas de `createdAt` distinto la más reciente queda primero y la frase dice "activas"

## 3. Historial

- [x] 3.1 Mostrar cada inactiva en un `Card` dentro de `subs-history` (`sub-inactive-<id>`), con la misma etiqueta de regional y la frase "La quitaste" (`removed`), "Venció" (`expired`) o ninguna frase si el motivo falta u es otro, y verificar con una prueba Playwright que la inactiva sembrada de Español / `57` contiene "Venció" y "Regional Educación Perez Zeledon" y no contiene `expired`, y que una inactiva con `endReason` `removed` contiene "La quitaste" y no contiene `removed`
- [x] 3.2 Ofrecer "Agregar de nuevo" (`resubscribe-<id>`, botón sólido, `disabled` mientras su alta está en curso) solo en las fichas de historial cuyo par no tiene una activa, llamando a `createSubscription` con el par de esa fila, y verificar con una prueba Playwright que la inactiva sembrada muestra el botón, que al agregar Español / `57` desde el formulario el botón desaparece, que al pulsar "Quitar" vuelve, que al pulsarlo con el formulario en Inglés y la regional `78` aparece una activa nueva de "Regional Educación Perez Zeledon" y Español mientras la ficha inactiva sigue en el historial, y que `6.2` pasa sin cambios

## 4. Carga y estados vacíos

- [x] 4.1 Marcar `subsListas` y `regionalesListas` en el primer snapshot o en el error, mostrar dos fichas esqueleto en `subs-loading` (`aria-busy="true"`, fuera de las dos listas) hasta tener ambos, y en error quitar el esqueleto y mostrar `subscribe-error`, y verificar con una prueba Playwright, reteniendo con `page.route` el canal `Listen` como en la prueba de `vacantes-loading`, que se ve `subs-loading` y no `subs-empty-active`, y que al soltar las peticiones desaparece `subs-loading`
- [x] 4.2 Mostrar "No tienes suscripciones activas." en `subs-empty-active` y "Todavía no hay historial." en `subs-empty-history` como estados vacíos con icono en círculo `bg-primary/10`, solo después de cargar, y verificar con una prueba Playwright que el docente del semillero, sin activas, ve `subs-empty-active` y no `subs-empty-history`, y que un docente sin ninguna suscripción ve los dos mensajes

## 5. Integración

- [x] 5.1 Correr `npm test`, `npm run lint -w gomep-vacantes`, `npm run build -w gomep-vacantes` y `npm run test:e2e`, verificar que todo pasa, y revisar a mano `/suscripciones` a 390 px y a 1280 px para confirmar que las fichas no se desbordan y que "Quitar" y "Agregar de nuevo" siguen siendo pulsables
