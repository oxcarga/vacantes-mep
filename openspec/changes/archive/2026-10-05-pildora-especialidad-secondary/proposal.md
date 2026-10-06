# Propuesta

## Resumen

En `/vacantes` la píldora de especialidad usa `chart-1` y las de regional usan `primary`. Los dos son el mismo azul (matiz 255); `chart-1` solo es un poco más claro, y al lado se confunden. Este cambio pasa la píldora de especialidad a `secondary`, el gris neutro de la paleta, y deja las de regional en `primary`.

## Por qué

`chart-1`, `chart-2`, `chart-4` y `chart-5` comparten el matiz de `primary`. Cambiar de un azul a otro no separa la especialidad de la regional. `secondary` es el único token de la paleta que no es ese azul y que no significa error.

## Qué cambia

- La píldora de especialidad usa el color `secondary`: fondo `bg-secondary` y texto `text-secondary-foreground`.
- Las píldoras de regional siguen en `primary`.
- No se agregan tokens ni se cambia la paleta.

## Alcance

La píldora `vacantes-filtro-especialidad` en `/vacantes`. El resto del filtro queda igual.

## Objetivos

- Distinguir la especialidad de la regional por familia de color, no por un paso de luminosidad.
- Usar un token que ya existe y se lee en claro y en oscuro.

## Fuera de alcance

- Tokens nuevos o un matiz distinto de 255.
- El tinte `primary` de las píldoras de regional.
- Los chips de puesto y lecciones, la insignia "Nueva", `/suscripciones` y `/admin`.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `vacancy-directory`: la píldora de especialidad usa `secondary`; las de regional siguen en `primary`.

## Impacto

`apps/gomep-vacantes/src/app/vacantes/page.tsx` y la prueba `9.15` de `e2e/app.spec.ts`, que hoy exige `bg-chart-1/10` y `text-chart-1`. Los cambios `filtrar-varias-regionales` y `pildora-especialidad-chart-1` están completos y sin archivar; sus deltas todavía nombran `chart-5` y `chart-1` en el mismo requisito. Hay que archivarlos antes de sincronizar este, para que la spec principal quede en `secondary`.
