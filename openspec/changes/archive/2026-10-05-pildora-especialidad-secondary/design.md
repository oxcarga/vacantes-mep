# Diseño

## Contexto

Ver la sección "Por qué" de `proposal.md`. En `/vacantes`, `FiltroActivo` pinta la especialidad con el tono `chart-1`: `bg-chart-1/10 text-chart-1` y hover `hover:bg-chart-1/15`. La regional sigue en `bg-primary/10 text-primary`. La prueba `9.15` exige esas clases.

En `globals.css`, `primary` y `chart-1` a `chart-5` son matiz 255. `secondary` es neutro: en claro `oklch(0.97 0 0)` con texto `oklch(0.205 0 0)`; en oscuro `oklch(0.269 0 0)` con texto `oklch(0.985 0 0)`. `palette.test.ts` ya fija esos valores. No hay que tocar la paleta.

Los deltas de `filtrar-varias-regionales` y `pildora-especialidad-chart-1` nombran `chart-5` y `chart-1` en el mismo requisito, y ninguno está archivado. Este delta repite el requisito entero y cambia solo el color.

## Objetivos / No objetivos

**Objetivos:**

- Sustituir el tono `chart-1` de la píldora de especialidad por `secondary`, en sólido.

**No objetivos:**

- Un componente de píldora compartido con los chips de la ficha.
- Revisar el contraste del resto de la paleta.

## Decisiones

### 1. `secondary` sólido, no un tinte al 10%

El tono `chart-1` de `filtroTones` pasa a `secondary`: `bg-secondary text-secondary-foreground` y hover de la X `hover:bg-foreground/10`. La píldora de especialidad usa `tone="secondary"`. Las de regional no se tocan.

`secondary` ya es una superficie casi blanca en claro y gris oscuro en oscuro. Un fondo `bg-secondary/10` desaparecería sobre la página. El texto `secondary-foreground` acompaña ese fondo en los dos modos. El hover usa `foreground` al 10% para oscurecer la X en claro y aclararla en oscuro.

*Alternativa:* otro `chart-*`. Se descarta porque todos son matiz 255, el mismo problema que `chart-1`. *Alternativa:* `destructive`. Se descarta porque se lee como error, y la píldora ya tiene una X. *Alternativa:* `muted` o `accent`. Se descartan porque en esta paleta coinciden con `secondary`.

### 2. La prueba nombra el token

`9.15` pasa a esperar `bg-secondary` y `text-secondary-foreground` en `vacantes-filtro-especialidad`, y sigue esperando `primary` en la píldora de regional. El título deja de decir `chart-1`.

## Riesgos / Trade-offs

- [Los chips de puesto y lecciones ya usan `bg-secondary text-secondary-foreground`] → Viven en la ficha, no en la barra de filtros. La regional sigue en azul, así que la especialidad se separa de ella.
- [Archivar `pildora-especialidad-chart-1` o `filtrar-varias-regionales` después de este cambio reescribe el requisito con `chart-1` o `chart-5`] → Archivar esos dos antes de sincronizar este. El delta de aquí ya trae el requisito completo con `secondary`.

## Plan de migración

No hay datos que migrar. Revertir el tono en `/vacantes` y la prueba `9.15` devuelve `chart-1`.
