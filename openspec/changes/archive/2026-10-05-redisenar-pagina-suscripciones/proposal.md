# Propuesta

## Resumen

`/suscripciones` sigue en el formulario y las listas de texto de antes del rediseño de `/vacantes`. El docente ve el código de la regional (`57`), el motivo del historial en inglés (`removed`, `expired`) y la fecha de vencimiento cortada en UTC (`2026-01-31`). Este cambio pinta la página con el mismo lenguaje visual del directorio y agrega "Agregar de nuevo" en cada ficha del historial cuyo par no esté ya activo.

## Por qué

El docente arma sus avisos en esta pantalla justo después de mirar vacantes. Hoy las dos páginas no se parecen, y reabrir un par vencido obliga a volver a elegir los dos selects.

## Qué cambia

- Subtítulo bajo el título de la página.
- Panel de alta con los mismos selects nativos estilizados del directorio (icono y chevron), sin chips de filtro.
- Conteo de suscripciones activas.
- Fichas en cuadrícula: especialidad, etiqueta actual de la regional, fecha de vencimiento en el calendario de Costa Rica, y "Quitar" con borde.
- Historial en fichas: "La quitaste" o "Venció", y el botón "Agregar de nuevo" cuando ese par no tiene una activa.
- Esqueleto hasta el primer resultado de suscripciones y de regionales, y estados vacíos distintos para activas y para historial.
- Catálogos del formulario ordenados como en `/vacantes`.

## Alcance

La pantalla `/suscripciones` del docente verificado. Crear y quitar siguen en las server actions que ya existen. "Agregar de nuevo" llama a la misma alta, con el `regionalValue` y la especialidad guardados en la fila inactiva.

## Objetivos

- Leer la regional por su etiqueta del catálogo y el historial en español.
- Reabrir un par del historial en un clic, y ocultar ese clic cuando el par ya está activo.
- Usar la misma paleta y la misma gramática visual que `/vacantes`.
- Conservar los nombres "Agregar" y "Quitar", los selects nativos y los `data-testid` `subscribe-*`, `sub-active-*` y `sub-inactive-*`.

## Fuera de alcance

- Insignia de suscripción por vencer.
- Chips de filtro, "Limpiar filtros" o filtrar las listas.
- Extraer componentes compartidos con `/vacantes`, o volver a maquetar esa página y `AppShell`.
- Nuevos tokens de color, cambios a Firestore, reglas, esquema, correos o al plazo de 30 días.
- Rediseño de `/admin`.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `subscriptions`: la página del docente muestra fichas con la etiqueta de la regional, la fecha de vencimiento en America/Costa_Rica, el motivo del historial en español, un estado de carga y la acción "Agregar de nuevo" solo cuando el par no está activo.

## Impacto

`apps/gomep-vacantes/src/app/suscripciones/page.tsx` y pruebas nuevas en `e2e/app.spec.ts`. La prueba `6.2` debe seguir pasando. No hay dependencias nuevas.
