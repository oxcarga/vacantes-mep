# Propuesta

## Resumen

En `/vacantes` el docente elige una sola regional y, al elegir otra, la primera se pierde. Este cambio deja elegir varias a la vez, muestra una píldora por cada una y distingue su color del de la especialidad. La especialidad sigue siendo una sola.

## Por qué

Quien sigue plazas en más de una regional tiene que alternar el filtro y no puede ver, juntas, las vacantes abiertas de esas regionales.

## Qué cambia

- El filtro de regional pasa a un dropdown de varias opciones, con el mismo aspecto cerrado del select actual. Cada regional elegida se ve marcada; pulsarla de nuevo la quita.
- Cerrado, sin elección dice "Todas las regionales"; con una, muestra esa etiqueta; con dos o más, "2 regionales", "3 regionales", y así.
- Una píldora por regional elegida, en el orden del catálogo, con el tinte `primary`. La de especialidad usa `chart-5`.
- La X de una píldora quita solo esa regional y la desmarca en el dropdown.
- "Todas las regionales" vacía solo las regionales. "Limpiar filtros" vacía regionales y especialidad.
- La lista es la unión de las regionales elegidas y, si hay especialidad, solo esa especialidad.
- Sin coincidencias, el mensaje nombra las regionales unidas por "o".

## Alcance

La pantalla `/vacantes` del docente verificado. El recorte sigue haciéndose en memoria sobre las vacantes abiertas ya cargadas. La especialidad permanece en un `<select>` de una opción.

## Objetivos

- Ver a la vez las vacantes abiertas de varias regionales.
- Quitar una regional desde su píldora o desde el dropdown, y que ambos sitios queden iguales.
- Distinguir la píldora de especialidad con `chart-5`, sin tokens nuevos.
- Conservar el filtro de una sola especialidad, "Limpiar filtros" y el orden por `firstSeen`.

## Fuera de alcance

- Elegir varias especialidades.
- El select de regional de `/suscripciones` y el de `/admin`.
- Guardar los filtros en la URL o en Firestore.
- Tokens de color nuevos, consultas nuevas a Firestore, o cambiar fichas, carga e insignia "Nueva".

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `vacancy-directory`: el filtro de regional acepta varias y la lista es su unión; cada regional elegida es una píldora `primary` y la de especialidad es `chart-5`; quitar una píldora desmarca esa regional.

## Impacto

`apps/gomep-vacantes/src/app/vacantes/page.tsx` y las pruebas de `e2e/app.spec.ts` que usan `selectOption` sobre `vacantes-regional` (`6.5`, `6.6`, `9.3`, `9.4`, `9.5`, `9.6`). `vacantes-especialidad` sigue siendo un `<select>`. No hay dependencias nuevas.
