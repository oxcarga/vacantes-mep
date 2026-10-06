# Propuesta

## Resumen

En `/vacantes` la píldora de especialidad usa `chart-5` y las de regional usan `primary`. Los dos tokens son el mismo azul (matiz 255) y solo se separan por luminosidad, así que al lado se leen como el mismo color. Este cambio pasa la píldora de especialidad a `chart-1`, un paso más claro de la misma paleta, y deja las de regional en `primary`.

## Por qué

El docente distingue el filtro de especialidad del de regional por el color de la píldora. `chart-5` es el azul más oscuro de la paleta y, junto a `primary`, casi no se nota.

## Qué cambia

- La píldora de especialidad usa el color `chart-1`.
- Las píldoras de regional siguen en `primary`.
- No se agregan tokens ni se cambia el matiz 255 de la paleta.

## Alcance

La píldora `vacantes-filtro-especialidad` en `/vacantes`. El resto del filtro (varias regionales, una especialidad, quitar y limpiar) queda igual.

## Objetivos

- Separar a simple vista la píldora de especialidad de las de regional.
- Usar un token que ya existe y que se lee como texto sobre fondo claro.

## Fuera de alcance

- Tokens nuevos o un matiz distinto de 255.
- El tinte `primary` de las píldoras de regional.
- Los chips de puesto y lecciones, la insignia "Nueva", `/suscripciones` y `/admin`.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `vacancy-directory`: la píldora de especialidad usa `chart-1`; las de regional siguen en `primary`.

## Impacto

`apps/gomep-vacantes/src/app/vacantes/page.tsx` y la prueba `9.15` de `e2e/app.spec.ts`, que hoy exige `bg-chart-5/10` y `text-chart-5`. El cambio `filtrar-varias-regionales` está completo y sin archivar; su delta todavía dice `chart-5` en el mismo requisito. Hay que archivarlo antes de sincronizar este, para que la spec principal quede en `chart-1`.
