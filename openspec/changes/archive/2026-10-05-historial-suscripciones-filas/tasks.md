# Tasks

## 1. Filas del historial

- [x] 1.1 Quitar `grid` y `sm:grid-cols-2` de `subs-history` en `apps/gomep-vacantes/src/app/suscripciones/page.tsx`, pintar cada inactiva como fila `flex` dentro de una lista de una columna con borde y `divide-y` (especialidad, `MapPin` y etiqueta de regional, frase de `motivo`, y "Agregar de nuevo" al final cuando `canResubscribe`), sin `Card`, y verificar con una prueba Playwright en viewport de 1280 px que dos inactivas quedan una debajo de la otra, que una activa sigue en `subs-active`, que la fila con `endReason` `removed` contiene "La quitaste" y no `removed`, que "Agregar de nuevo" sigue en `resubscribe-<id>`, y que `6.2`, `10.4`, `10.5` y `10.7` pasan
