# Propuesta

## Resumen

En `/suscripciones` las activas y el historial se pintan con la misma cuadrícula de fichas. El historial debe verse como filas, para que no se confunda con una suscripción en curso.

## Por qué

Las dos listas comparten `Card` y `sm:grid-cols-2`. Una fila inactiva parece otra ficha activa, y el docente no distingue de un vistazo qué avisos siguen vigentes.

## Qué cambia

- El historial deja de ser fichas y pasa a una lista de filas, una por suscripción inactiva.
- Cada fila conserva la especialidad, la etiqueta de la regional, "La quitaste" o "Venció", y "Agregar de nuevo" cuando el par no está activo.
- Las suscripciones activas siguen en fichas, con "Vence el" y "Quitar".
- El vacío del historial sigue diciendo "Todavía no hay historial."

## Alcance

Solo la sección Historial de `/suscripciones`. Los datos, el orden, las acciones y los `data-testid` `subs-history`, `sub-inactive-*` y `resubscribe-*` se mantienen.

El cambio `redisenar-pagina-suscripciones` está implementado y sin archivar. Su requisito "El historial explica el cierre en español" pide una ficha. Este cambio sustituye esa presentación por filas; al archivarlo, ese texto no debe volver a exigir fichas para el historial.

## Objetivos

- Distinguir el historial de las fichas activas por la forma, no solo por el título "Historial".
- Conservar motivo en español, etiqueta de regional y "Agregar de nuevo".
- Seguir pasando las pruebas que leen esos textos y esos `data-testid`.

## Fuera de alcance

- Maquetar de nuevo las fichas activas, el formulario, el conteo, la carga o los vacíos.
- Cambiar Firestore, el plazo de 30 días, el orden de las filas o la regla de "Agregar de nuevo".
- Extraer un componente de tabla compartido o rediseñar `/vacantes` y `/admin`.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `subscriptions`: cada suscripción inactiva se muestra como fila de historial, no como ficha. Sigue explicando el cierre en español y ofreciendo "Agregar de nuevo" cuando el par no está activo.

## Impacto

`apps/gomep-vacantes/src/app/suscripciones/page.tsx` y una prueba Playwright en `e2e/app.spec.ts`. Las pruebas `6.2`, `10.4`, `10.5` y `10.7` deben seguir pasando. No hay dependencias nuevas.
