# Diseño

## Contexto

Ver la sección "Por qué" de `proposal.md`. En `/vacantes`, `FiltroActivo` recibe un tono. Regional usa `bg-primary/10 text-primary` y el hover de la X en `hover:bg-primary/15`. Especialidad usa el tono `chart-5`: `bg-chart-5/10 text-chart-5` y `hover:bg-chart-5/15`. La prueba `9.15` exige esas clases.

`chart-1` ya está en `globals.css` y en `src/lib/palette.test.ts`: en claro `oklch(0.55 0.14 255)`, en oscuro `oklch(0.70 0.12 255)`. El mismo matiz que `primary`, con más luz. No hay que tocar la paleta.

El requisito que nombra el color vive en el delta de `filtrar-varias-regionales`, que está completo y sin archivar. La spec principal todavía no menciona `chart-5`. Este delta repite ese requisito entero y cambia solo el color, para no perder al archivar las píldoras de varias regionales.

## Objetivos / No objetivos

**Objetivos:**

- Cambiar el tono de la píldora de especialidad a `chart-1` sin agregar tokens.

**No objetivos:**

- Un componente de píldora compartido.
- Revisar el contraste del resto de la paleta.

## Decisiones

### 1. Mismo patrón de tinte, otro token

El tono `chart-5` de `filtroTones` pasa a `chart-1`: `bg-chart-1/10 text-chart-1` y hover `hover:bg-chart-1/15`. La píldora de especialidad usa `tone="chart-1"`. Las de regional no se tocan.

El fondo al 10% y el texto en el token siguen el modo claro y el oscuro, porque `chart-1` ya cambia de luminosidad en `.dark`.

*Alternativa:* `chart-2` o `chart-4`. Se descartan porque en claro son demasiado claros para texto pequeño (`0.68` y `0.78`). *Alternativa:* `secondary`. Se descarta porque es gris y ya lo usan los chips de puesto y lecciones. *Alternativa:* `destructive`. Se descarta porque se lee como error, y la píldora ya tiene una X.

### 2. La prueba nombra el token

`9.15` pasa a esperar `bg-chart-1/10` y `text-chart-1` en `vacantes-filtro-especialidad`, y sigue esperando `primary` en la píldora de regional. El título de la prueba deja de decir `chart-5`.

## Riesgos / Trade-offs

- [`chart-1` y `primary` siguen siendo matiz 255] → Se distinguen por luminosidad (`0.55` frente a `0.42` en claro). No se agrega otro matiz.
- [Archivar `filtrar-varias-regionales` después de este cambio reescribe el requisito con `chart-5`] → Archivar ese cambio antes de sincronizar este. El delta de aquí ya trae el requisito completo con `chart-1`.
- [`chart-1` en claro es más claro que `chart-5` y el texto pequeño pierde contraste] → Es el token elegido. `chart-2` y `chart-4` perderían más.

## Plan de migración

No hay datos que migrar. Revertir el tono en `/vacantes` y la prueba `9.15` devuelve `chart-5`.
