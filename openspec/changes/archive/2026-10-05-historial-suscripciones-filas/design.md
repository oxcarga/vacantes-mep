# Diseño

## Contexto

En `apps/gomep-vacantes/src/app/suscripciones/page.tsx`, `subs-active` y `subs-history` son dos `<ul>` con `grid list-none gap-4 p-0 sm:grid-cols-2`. Cada inactiva es un `Card` (`sub-inactive-<id>`) con especialidad, `MapPin` y la etiqueta de regional, la frase de `motivo` y, si el par no está en `activePairs`, el botón sólido "Agregar de nuevo" (`resubscribe-<id>`). El vacío sigue en `subs-empty-history`. No hay `components/ui/table.tsx`.

Las pruebas `6.2`, `10.4`, `10.5` y `10.7` leen textos y `data-testid`. No afirman clases de `Card` ni la cuadrícula.

Ver la sección "Por qué" de `proposal.md`. El comportamiento exigido está en `specs/subscriptions/spec.md`.

## Objetivos / No objetivos

**Objetivos:**

- Que `subs-history` sea una lista de una columna, y cada `li` una fila horizontal.
- Dejar `subs-active`, el formulario, la carga y los vacíos como están.

**No objetivos:**

- Agregar el componente Table de shadcn.
- Cambiar el orden (`endedAt` descendente, luego `id`) ni `createSubscription`.

## Decisiones

### 1. Filas en la lista que ya existe

`subs-history` pierde `grid` y `sm:grid-cols-2`. Queda un contenedor con borde y `divide-y`. Cada `li` es `flex flex-wrap items-center gap-x-4 gap-y-2 py-3`. La especialidad va en `font-medium`, la regional en texto `text-muted-foreground` con `MapPin`, el motivo a continuación y "Agregar de nuevo" alineado al final de la fila. No se usa `Card`, `CardHeader`, `CardContent` ni `CardFooter`.

En un viewport estrecho los datos de la fila pueden partirse en más de una línea. Siguen dentro del mismo `li`, con separador entre filas, sin el anillo, la sombra ni el borde izquierdo de la ficha activa.

*Alternativa:* una `<table>` o el Table de shadcn. Se descarta porque el componente no está en el proyecto y cuatro columnas fijas se salen de la pantalla estrecha. La lista de filas cumple "tabla o fila" y conserva el `<ul>`.

*Alternativa:* dejar el `Card` y solo quitar la cuadrícula. Se descarta porque cada entrada seguiría leyéndose como ficha.

### 2. Los contratos de la página no se mueven

Siguen `sub-inactive-<id>`, `resubscribe-<id>` y `subs-history`. La frase sale de `motivo`. El botón se pinta con la misma condición `canResubscribe`, sigue sólido y se deshabilita con `pendingId === row.id`. El orden de `inactive` no cambia. `subs-empty-history` y `EstadoVacio` no cambian: el historial vacío no es una tabla sin filas.

## Riesgos / Compromisos

- [En móvil la fila parte especialidad, regional, motivo y botón] → Siguen en el mismo `li`. La prueba de apilado se hace en viewport ancho, donde la distinción con la cuadrícula de fichas es visible.
- [Al archivar `redisenar-pagina-suscripciones` su delta vuelve a pedir ficha de historial] → Ese texto queda sustituido por este. No sincronizar el requisito de ficha del historial encima de estas filas.

## Plan de migración

Solo presentación. No hay datos que migrar ni paso de despliegue distinto del de la app.
